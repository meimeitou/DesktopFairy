const fs = require('fs');
const path = require('path');
const { app } = require('electron');
const { buildSkillsPrompt, getSkillsDir, executeSkillTool, executeSkillsTool } = require('./agentSkillService.cjs');
const { executeAgentTool } = require('./agentTools.cjs');
const { testWebSearchConfig, clearRequestTodos } = require('./agentBuiltinExecutors.cjs');
const { abortRequestApprovals } = require('./agentToolApproval.cjs');
const { loadMcpToolDefinitions } = require('./agentMcpClient.cjs');
const { getServersByIds } = require('./mcpServerService.cjs');
const { getEnabledOpenAiToolDefinitions, getChatModeSuffix, resolveToolApprovalMode } = require('./agentBuiltinCatalog.cjs');
const { normalizeWebSearchConfig } = require('./webSearchProviders.cjs');

const { appendChatLog } = require('./chatSessionLog.cjs');

const inflightAgents = new Map();

function getCurrentWebSearchConfig() {
  try {
    const settingsPath = path.join(app.getPath('userData'), 'da_settings.json');
    const raw = fs.readFileSync(settingsPath, 'utf8');
    const parsed = JSON.parse(raw);
    return normalizeWebSearchConfig(parsed?.webSearch);
  } catch {
    return normalizeWebSearchConfig(null);
  }
}

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

function getBuiltinTools(agentConfig, context) {
  return getEnabledOpenAiToolDefinitions(agentConfig, context).map(({ type, function: fn }) => ({
    type,
    function: fn,
  }));
}

function buildAgentSystemPrompt(agentConfig, context = 'local') {
  const parts = [];
  if (agentConfig?.soul?.trim()) {
    parts.push(agentConfig.soul.trim());
  }
  if (agentConfig?.user?.trim()) {
    parts.push('# 用户档案\n\n' + agentConfig.user.trim());
  }
  const skillsBlock = buildSkillsPrompt(agentConfig?.enabledSkillIds);
  if (skillsBlock) parts.push(skillsBlock);
  const toolList = context === 'terminal'
    ? 'Read/Write/Edit/Terminal/Glob/Grep/WebSearch/WebFetch/Skill/Skills'
    : 'Read/Write/Edit/Bash/Glob/Grep/WebSearch/WebFetch/Skill/Skills';
  parts.push(
    `你可以使用 ${toolList} 等工具完成任务。执行前先理解用户意图，工具失败时向用户说明原因。只能使用系统提供的工具列表中的工具；如果缺少你需要的工具，请直接告知用户，不要虚构或声称使用了不存在的工具。`
  );
  parts.push(
    '## 记忆持久化\n\n你可以使用 UpdateProfile 工具将用户偏好和习惯写入持久存储：\n- 用户透露偏好、习惯、身份信息时 → UpdateProfile(field="user", action="append", content="...")\n- 需要调整自己的人格或执行规则时 → UpdateProfile(field="soul", action="replace", content="...")\n- 追加内容应简短原子（一条信息一行），不要重复已有内容。替换时需提供完整的新内容。'
  );
  parts.push(
    '## MCP 服务器管理\n\n你可以使用 `McpManager` 工具探查与管理本应用的 MCP 服务器（外部工具服务）：\n- `list` — 列出全部服务器及其运行时状态、是否绑定当前会话\n- `status` — 查看单个服务器的状态、最近错误与日志（需 `serverId`）\n- `tools` — 列出某服务器暴露的工具名与入参 schema（需 `serverId`）\n- `enable` / `disable` — 启用或停用服务器（停用会立即断开子进程/连接）\n- `restart` / `stop` — 重启或停止已运行的服务器\n- `add` / `edit` / `remove` — 新增、修改、删除服务器配置（`add`/`edit` 传入 `server` 对象；`remove` 传入 `serverId`）\n\n使用前先 `list` 探查现状；需要某服务器工具细节时用 `tools`。状态切换与配置变更会向用户请求确认。新增的服务器 `installSource` 固定为 `manual`；内置预设的 `command` 不可改写。'
  );
  parts.push(
    '## 工具输出展示\n\n工具执行的原始证据（搜索结果、文件内容、命令输出等）会在界面的「工具调用」历史中展示给用户。你的回复只需给出结论、分析与必要引用；**禁止**在回复末尾重复粘贴完整搜索结果列表、文件原文或大段命令输出。若需指向某条证据，用简短说明即可（如「见上方 WebSearch 结果 #2」）。'
  );
  if (context === 'terminal') {
    parts.push(
      '## 终端操作\n\n你可以使用 Terminal 工具将 shell 命令发送到用户当前可见的终端执行，命令输出会实时显示在用户终端中，同时返回给你用于判断下一步操作。在当前终端会话中，所有 shell 命令都必须通过 Terminal 工具执行；发送命令前确保意图明确，命令执行结果（包括 exit code）会返回给你。过长的输出会被截断，如需完整输出请缩小命令范围。'
    );
  }
  const modeSuffix = getChatModeSuffix(agentConfig?.chatMode);
  if (modeSuffix) parts.push(modeSuffix.trim());
  return parts.join('\n\n');
}

function mergeSystemMessage(messages, systemPrompt) {
  const rest = (messages || []).filter((m) => m.role !== 'system');
  if (!systemPrompt?.trim()) return rest;
  return [{ role: 'system', content: systemPrompt.trim() }, ...rest];
}

async function readSseResponse(res, onDelta, onToolDelta, onReasoning) {
  if (!res.body) throw new Error('Empty response body');
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = '';
  let assistantMessage = { role: 'assistant', content: '', reasoning: '', tool_calls: [] };
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
        const reasoningChunk = delta?.reasoning_content ?? delta?.reasoning;
        if (reasoningChunk) {
          assistantMessage.reasoning = (assistantMessage.reasoning || '') + reasoningChunk;
          onReasoning?.(reasoningChunk);
        }
        if (Array.isArray(delta?.tool_calls)) {
          for (const tc of delta.tool_calls) ingestToolCall(tc);
        }
        if (Array.isArray(message?.tool_calls)) {
          for (let i = 0; i < message.tool_calls.length; i += 1) {
            ingestToolCall(message.tool_calls[i], i);
          }
        }
        const msgReasoning = message?.reasoning_content ?? message?.reasoning;
        if (msgReasoning) {
          assistantMessage.reasoning = (assistantMessage.reasoning || '') + msgReasoning;
          onReasoning?.(msgReasoning);
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
  if (!assistantMessage.reasoning) delete assistantMessage.reasoning;
  return assistantMessage;
}

function registerAgentHandlers(ipcMain, deps) {
  const { getChatCompletionsUrl, getWindows, getParentWindow, chatLogsDir } = deps;

  ipcMain.handle('agent:run', async (event, payload) => {
    const {
      requestId,
      messages,
      agentConfig,
      apiConfig,
      chatUrl,
      temperature,
      terminalSessionId,
      topicId,
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
    const agentState = { controller, bypassApproval: false };
    inflightAgents.set(requestId, agentState);
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
      const context = terminalSessionId ? 'terminal' : 'local';
      const builtinTools = getBuiltinTools(agentConfig, context);
      const tools = [...builtinTools, ...(mcpRuntime.definitions || [])];
      const systemPrompt = buildAgentSystemPrompt(agentConfig, context);
      let conversation = mergeSystemMessage(messages, systemPrompt);
      const maxTurns = Math.max(1, Number(agentConfig.maxTurns) || 10);
      const reasoningEffort = agentConfig.reasoningEffort;
      const sendReasoningEffort =
        reasoningEffort && reasoningEffort !== 'default' ? reasoningEffort : null;
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
        if (sendReasoningEffort) {
          body.reasoning_effort = sendReasoningEffort;
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
          },
          (reasoning) => safeSend('chat:stream:chunk', { requestId, reasoning }),
        );

        // Reasoning is display-only; strip it so it is not replayed to the model on later turns.
        const apiAssistantMessage = { ...assistantMessage };
        delete apiAssistantMessage.reasoning;
        conversation = conversation.concat(apiAssistantMessage);

        const toolCalls = assistantMessage.tool_calls;
        if (!toolCalls || toolCalls.length === 0) break;

        for (const toolCall of toolCalls) {
          if (controller.signal.aborted) break;

          const toolName = toolCall.function?.name || 'unknown';
          const toolCallId = toolCall.id || `call_${toolName}_${turn}`;
          const toolArgs = toolCall.function?.arguments || '';

          let resultText = '';
          let denied = false;
          let toolAborted = false;
          try {
            const toolResult = await executeAgentTool(toolCall, {
              getWindows,
              parentWindow,
              sender,
              agentConfig,
              toolApprovalMode: resolveToolApprovalMode(agentConfig),
              bypassApproval: agentState.bypassApproval,
              envVars: skillEnvVars,
              enabledSkillIds: agentConfig.enabledSkillIds || [],
              sessionEnabledSkillIds,
              persistEnabledSkillId: (skillId) => persistEnabledSkillId(skillId, getWindows),
              executeMcpTool: mcpRuntime?.executeMcpTool,
              safeSend,
              requestId,
              signal: controller.signal,
              webSearchConfig: getCurrentWebSearchConfig(),
              terminalSessionId,
            });
            resultText = toolResult.resultText;
            if (toolResult.aborted) {
              toolAborted = true;
            } else {
              denied = toolResult.denied === true;
              if (!denied) {
                safeSend('agent:stream:tool', {
                  requestId,
                  toolCallId,
                  toolName,
                  toolArgs,
                  status: 'done',
                  resultPreview: resultText,
                });
              }
              if (topicId && chatLogsDir && resultText) {
                appendChatLog(chatLogsDir, topicId, {
                  type: 'tool',
                  toolCallId,
                  toolName,
                  toolArgs,
                  resultText,
                });
              }
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
              resultPreview: resultText,
            });
            if (topicId && chatLogsDir && resultText) {
              appendChatLog(chatLogsDir, topicId, {
                type: 'tool',
                toolCallId,
                toolName,
                toolArgs,
                resultText,
              });
            }
          }

          if (toolAborted) break;

          conversation.push({
            role: 'tool',
            tool_call_id: toolCallId,
            content: resultText,
          });
        }
        if (controller.signal.aborted) break;
      }

      // Last turn may have executed tools without a follow-up LLM response.
      const lastMsg = conversation[conversation.length - 1];
      if (!controller.signal.aborted && lastMsg?.role === 'tool') {
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(apiConfig.apiKey ? { Authorization: `Bearer ${apiConfig.apiKey}` } : {}),
          },
          body: JSON.stringify({
            model: apiConfig.modelName,
            messages: conversation,
            stream: true,
            tools,
            tool_choice: 'auto',
            ...(typeof temperature === 'number' ? { temperature } : {}),
            ...(sendReasoningEffort ? { reasoning_effort: sendReasoningEffort } : {}),
          }),
          signal: controller.signal,
        });
        if (res.ok) {
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
            },
            (reasoning) => safeSend('chat:stream:chunk', { requestId, reasoning }),
          );
          const apiAssistantMessage = { ...assistantMessage };
          delete apiAssistantMessage.reasoning;
          conversation = conversation.concat(apiAssistantMessage);
        }
      }

      safeSend('chat:stream:done', {
        requestId,
        ...(controller.signal.aborted ? { aborted: true } : {}),
      });
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
      clearRequestTodos(requestId);
      mcpRuntime?.dispose?.();
    }
  });

  ipcMain.handle('agent:abort', async (_event, payload) => {
    const requestId = payload?.requestId;
    const agentState = requestId ? inflightAgents.get(requestId) : null;
    if (agentState) agentState.controller.abort();
  });

  ipcMain.handle('agent:tool:bypass_approval', async (_event, payload) => {
    const requestId = payload?.requestId;
    const agentState = requestId ? inflightAgents.get(requestId) : null;
    if (agentState) {
      agentState.bypassApproval = true;
      return true;
    }
    return false;
  });

  ipcMain.handle('websearch:test', async (_event, config) => {
    const cfg = normalizeWebSearchConfig(config);
    return testWebSearchConfig(cfg);
  });
}

function abortAllAgentRuns() {
  for (const agentState of inflightAgents.values()) {
    agentState.controller.abort();
  }
  inflightAgents.clear();
}

module.exports = { registerAgentHandlers, abortAllAgentRuns, buildAgentSystemPrompt };
