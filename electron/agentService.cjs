const fs = require('fs');
const path = require('path');
const { app } = require('electron');
const { buildSkillsPrompt, getSkillsDir, executeSkillTool, executeSkillsTool } = require('./agentSkillService.cjs');
const { executeAgentTool } = require('./agentTools.cjs');
const { abortRequestApprovals } = require('./agentToolApproval.cjs');
const { loadMcpToolDefinitions } = require('./agentMcpClient.cjs');
const { getServersByIds } = require('./mcpServerService.cjs');
const { getEnabledOpenAiToolDefinitions } = require('./agentBuiltinCatalog.cjs');

const inflightAgents = new Map();

function persistEnabledSkillId(skillId, getWindows) {
  const settingsPath = path.join(app.getPath('userData'), 'da_settings.json');
  let settings;
  try {
    settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
  } catch {
    return;
  }
  const agent = settings.agent && typeof settings.agent === 'object' ? settings.agent : {};
  const ids = Array.isArray(agent.enabledSkillIds) ? agent.enabledSkillIds : [];
  if (ids.includes(skillId)) return;
  agent.enabledSkillIds = [...ids, skillId];
  settings.agent = agent;
  try {
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
  } catch {
    return;
  }
  for (const win of getWindows?.() || []) {
    try {
      if (win && !win.isDestroyed()) {
        win.webContents.send('settings:updated', settings);
      }
    } catch {
      /* window gone */
    }
  }
}

function getBuiltinTools(agentConfig) {
  return getEnabledOpenAiToolDefinitions(agentConfig).map(({ type, function: fn }) => ({
    type,
    function: fn,
  }));
}

function buildAgentSystemPrompt(agentConfig) {
  const parts = [];
  if (agentConfig?.instructions?.trim()) {
    parts.push(agentConfig.instructions.trim());
  }
  const skillsBlock = buildSkillsPrompt(agentConfig?.enabledSkillIds);
  if (skillsBlock) parts.push(skillsBlock);
  parts.push(
    '你可以使用 Read/Write/Edit/Bash/Glob/Grep/WebSearch/WebFetch/Skill/Skills 等工具完成任务。执行前先理解用户意图，工具失败时向用户说明原因。'
  );
  return parts.join('\n\n');
}

function mergeSystemMessage(messages, systemPrompt) {
  const rest = (messages || []).filter((m) => m.role !== 'system');
  if (!systemPrompt?.trim()) return rest;
  return [{ role: 'system', content: systemPrompt.trim() }, ...rest];
}

async function readSseResponse(res, onDelta, onToolDelta) {
  if (!res.body) throw new Error('Empty response body');
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = '';
  let assistantMessage = { role: 'assistant', content: '', tool_calls: [] };
  const toolCallAcc = new Map();

  const syncToolCall = (index) => {
    const acc = toolCallAcc.get(index);
    if (!acc) return;
    assistantMessage.tool_calls[index] = {
      id: acc.id || `call_${index}`,
      type: 'function',
      function: { name: acc.name || '', arguments: acc.arguments || '' },
    };
  };

  const ingestToolCall = (tc, fallbackIndex = 0) => {
    const index = tc?.index ?? fallbackIndex;
    if (!toolCallAcc.has(index)) {
      toolCallAcc.set(index, { id: '', name: '', arguments: '' });
    }
    const acc = toolCallAcc.get(index);
    if (tc?.id) acc.id = tc.id;
    if (tc?.function?.name) acc.name = tc.function.name;
    if (tc?.function?.arguments != null && tc?.function?.arguments !== '') {
      const chunk = tc.function.arguments;
      if (typeof chunk === 'string') {
        acc.arguments += chunk;
      } else if (typeof chunk === 'object') {
        acc.arguments = JSON.stringify(chunk);
      }
    }
    syncToolCall(index);
    onToolDelta?.({ index, name: acc.name, id: acc.id, arguments: acc.arguments });
  };

  streamLoop: while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    let nlIdx;
    while ((nlIdx = buf.indexOf('\n')) >= 0) {
      let line = buf.slice(0, nlIdx);
      buf = buf.slice(nlIdx + 1);
      if (line.endsWith('\r')) line = line.slice(0, -1);
      if (!line.startsWith('data:')) continue;
      const data = line.slice(5).trim();
      if (!data) continue;
      if (data === '[DONE]') break streamLoop;
      try {
        const json = JSON.parse(data);
        const choice = json?.choices?.[0];
        const delta = choice?.delta;
        const message = choice?.message;
        if (delta?.content) {
          assistantMessage.content += delta.content;
          onDelta?.(delta.content);
        }
        if (Array.isArray(delta?.tool_calls)) {
          for (const tc of delta.tool_calls) ingestToolCall(tc);
        }
        if (Array.isArray(message?.tool_calls)) {
          for (let i = 0; i < message.tool_calls.length; i += 1) {
            ingestToolCall(message.tool_calls[i], i);
          }
        }
      } catch {
        /* ignore malformed JSON */
      }
    }
  }

  for (const index of toolCallAcc.keys()) syncToolCall(index);
  assistantMessage.tool_calls = [...toolCallAcc.entries()]
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([index, acc]) => ({
      id: acc.id || `call_${index}`,
      type: 'function',
      function: { name: acc.name || '', arguments: acc.arguments || '' },
    }));
  if (assistantMessage.tool_calls.length === 0) delete assistantMessage.tool_calls;
  else if (!assistantMessage.content) assistantMessage.content = null;
  return assistantMessage;
}

function registerAgentHandlers(ipcMain, deps) {
  const { getChatCompletionsUrl, getWindows, getParentWindow } = deps;

  ipcMain.handle('agent:run', async (event, payload) => {
    const {
      requestId,
      messages,
      agentConfig,
      apiConfig,
      chatUrl,
      temperature,
    } = payload || {};

    if (!requestId || !Array.isArray(messages) || !agentConfig || !apiConfig) {
      throw new Error('agent:run invalid payload');
    }

    const url =
      chatUrl ||
      (apiConfig.apiHost
        ? getChatCompletionsUrl(apiConfig.apiHost, apiConfig.providerType)
        : '');
    if (!url || !apiConfig.modelName) {
      throw new Error('agent:run missing API config');
    }

    const controller = new AbortController();
    inflightAgents.set(requestId, controller);
    const sender = event.sender;
    const parentWindow = getParentWindow?.() || null;

    const safeSend = (channel, data) => {
      try {
        if (!sender.isDestroyed()) sender.send(channel, data);
      } catch {
        /* receiver gone */
      }
    };

    let mcpRuntime = null;
    try {
      mcpRuntime = await loadMcpToolDefinitions(
        getServersByIds(agentConfig.mcpServerIds)
      );
      const builtinTools = getBuiltinTools(agentConfig);
      const tools = [...builtinTools, ...(mcpRuntime.definitions || [])];
      const systemPrompt = buildAgentSystemPrompt(agentConfig);
      let conversation = mergeSystemMessage(messages, systemPrompt);
      const maxTurns = Math.max(1, Number(agentConfig.maxTurns) || 10);
      const sessionEnabledSkillIds = new Set(agentConfig?.enabledSkillIds || []);
      const skillEnvVars = {
        ...(agentConfig.envVars || {}),
        DESKTOP_FAIRY_SKILLS_DIR: getSkillsDir(),
      };

      for (let turn = 0; turn < maxTurns; turn += 1) {
        if (controller.signal.aborted) break;

        const body = {
          model: apiConfig.modelName,
          messages: conversation,
          stream: true,
          tools,
          tool_choice: 'auto',
        };
        if (typeof temperature === 'number') {
          body.temperature = temperature;
        }

        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(apiConfig.apiKey ? { Authorization: `Bearer ${apiConfig.apiKey}` } : {}),
          },
          body: JSON.stringify(body),
          signal: controller.signal,
        });

        if (!res.ok) {
          const text = await res.text().catch(() => '');
          throw new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`);
        }

        const assistantMessage = await readSseResponse(
          res,
          (delta) => safeSend('chat:stream:chunk', { requestId, delta }),
          ({ name, id, arguments: toolArgs }) => {
            if (name && id) {
              safeSend('agent:stream:tool', {
                requestId,
                toolCallId: id,
                toolName: name,
                toolArgs: toolArgs || '',
                status: 'streaming',
              });
            }
          }
        );

        conversation = conversation.concat(assistantMessage);

        const toolCalls = assistantMessage.tool_calls;
        if (!toolCalls || toolCalls.length === 0) break;

        for (const toolCall of toolCalls) {
          const toolName = toolCall.function?.name || 'unknown';
          const toolCallId = toolCall.id || `call_${toolName}_${turn}`;
          const toolArgs = toolCall.function?.arguments || '';

          let resultText = '';
          let denied = false;
          try {
            const toolResult = await executeAgentTool(toolCall, {
              getWindows,
              parentWindow,
              toolApprovalMode: agentConfig.toolApprovalMode || 'confirm',
              envVars: skillEnvVars,
              enabledSkillIds: agentConfig.enabledSkillIds || [],
              sessionEnabledSkillIds,
              persistEnabledSkillId: (skillId) => persistEnabledSkillId(skillId, getWindows),
              executeMcpTool: mcpRuntime?.executeMcpTool,
              safeSend,
              requestId,
              signal: controller.signal,
            });
            resultText = toolResult.resultText;
            denied = toolResult.denied === true;
            if (!denied) {
              safeSend('agent:stream:tool', {
                requestId,
                toolCallId,
                toolName,
                toolArgs,
                status: 'done',
                resultPreview: resultText.slice(0, 400),
              });
            }
          } catch (err) {
            resultText = JSON.stringify({
              ok: false,
              error: String(err?.message || err),
            });
            safeSend('agent:stream:tool', {
              requestId,
              toolCallId,
              toolName,
              toolArgs,
              status: 'error',
              message: String(err?.message || err),
              resultPreview: resultText.slice(0, 400),
            });
          }

          conversation.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: resultText,
          });
        }
      }

      safeSend('chat:stream:done', { requestId });
    } catch (e) {
      if (e && e.name === 'AbortError') {
        safeSend('chat:stream:done', { requestId, aborted: true });
      } else {
        safeSend('chat:stream:error', {
          requestId,
          message: String(e?.message || e),
        });
      }
    } finally {
      inflightAgents.delete(requestId);
      abortRequestApprovals(requestId);
      mcpRuntime?.dispose?.();
    }
  });

  ipcMain.handle('agent:abort', async (_event, payload) => {
    const requestId = payload?.requestId;
    const controller = requestId ? inflightAgents.get(requestId) : null;
    if (controller) controller.abort();
  });
}

function abortAllAgentRuns() {
  for (const controller of inflightAgents.values()) {
    controller.abort();
  }
  inflightAgents.clear();
}

module.exports = { registerAgentHandlers, abortAllAgentRuns, buildAgentSystemPrompt };
