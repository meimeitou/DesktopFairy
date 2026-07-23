const fs = require('fs');
const path = require('path');
const { app } = require('electron');
const { buildSkillsPrompt } = require('./agentSkillService.cjs');
const { testWebSearchConfig, clearRequestTodos } = require('./agentBuiltinExecutors.cjs');
const { abortRequestApprovals } = require('./agentToolApproval.cjs');
const { loadMcpToolDefinitions } = require('./agentMcpClient.cjs');
const { runAgentStream } = require('./ai/runAgentStream.cjs');
const { getServersByIds } = require('./mcpServerService.cjs');
const { getChatModeSuffix } = require('./agentBuiltinCatalog.cjs');
const { getBuiltinTools, buildAgentToolDeps } = require('./ai/agentStreamShared.cjs');
const { normalizeWebSearchConfig } = require('./webSearchProviders.cjs');
const { getTerminalForeground } = require('./ptyService.cjs');

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
  let revision;
  try {
    const { setSnapshot } = require('./settingsSnapshot.cjs');
    revision = setSnapshot(settings);
  } catch {
    /* optional */
  }
  const payload =
    typeof revision === 'number' ? { settings, revision } : settings;
  for (const win of getWindows?.() || []) {
    try {
      if (win && !win.isDestroyed()) {
        win.webContents.send('settings:updated', payload);
      }
    } catch {
      /* window gone */
    }
  }
}

function buildTerminalEnvSection(terminalState) {
  let envLine = '当前终端前台为本地 shell。';
  if (terminalState && terminalState.kind === 'remote') {
    envLine = '⚠️ 当前终端处于 SSH 远程会话' +
      (terminalState.remoteHost ? '（' + terminalState.remoteHost + '）' : '') +
      '。通过 Terminal 工具执行的命令将在远程主机上运行，请注意目标环境（路径、操作系统、已安装工具可能与本地不同）。';
  }
  let section = '## 当前终端环境\n\n' + envLine;
  // cwd comes from OSC 7 (zsh/bash shell integration) or OSC 1337 (iTerm2).
  // Null when the shell hasn't reported it (e.g. non-integrated shell, or
  // SSH remote whose shell hasn't been configured to emit OSC 7). In remote
  // sessions the path is the remote path — still useful context for the agent.
  if (terminalState && terminalState.cwd) {
    section += '\n\n当前工作目录：`' + terminalState.cwd + '`';
  }
  section += '\n若终端前台不是 shell（如 vim/less/python 等交互式程序），Terminal 工具会拒绝执行以避免命令被误输入到该程序——此时请引导用户先退出该程序（如 :q / exit / Ctrl-D）。';
  return section;
}

const TOOLS_WITH_OWN_SECTION = new Set(['UpdateProfile', 'McpManager']);

function buildToolListPrompt(enabledToolNames, context) {
  let names = enabledToolNames;
  if (!Array.isArray(names) || names.length === 0) {
    names = (context === 'terminal'
      ? 'Read/Write/Edit/Terminal/Glob/Grep/WebSearch/WebFetch/Skill/Skills'
      : 'Read/Write/Edit/Bash/Glob/Grep/WebSearch/WebFetch/Skill/Skills'
    ).split('/');
  }
  const visible = names.filter((n) => !TOOLS_WITH_OWN_SECTION.has(n));
  return visible.length > 0 ? visible.join('/') : '';
}

function buildAgentSystemPrompt(agentConfig, context = 'local', terminalState = null, enabledToolNames = []) {
  const parts = [];
  if (agentConfig?.soul?.trim()) {
    parts.push(agentConfig.soul.trim());
  }
  if (agentConfig?.user?.trim()) {
    parts.push('# 用户档案\n\n' + agentConfig.user.trim());
  }
  const skillsBlock = buildSkillsPrompt(agentConfig?.enabledSkillIds);
  if (skillsBlock) parts.push(skillsBlock);
  const toolList = buildToolListPrompt(enabledToolNames, context);
  if (toolList) {
    parts.push(
      `你可以使用 ${toolList} 等工具完成任务。执行前先理解用户意图，工具失败时向用户说明原因。只能使用系统提供的工具列表中的工具；如果缺少你需要的工具，请直接告知用户，不要虚构或声称使用了不存在的工具。`
    );
  } else {
    parts.push(
      '执行前先理解用户意图，工具失败时向用户说明原因。只能使用系统提供的工具列表中的工具；如果缺少你需要的工具，请直接告知用户，不要虚构或声称使用了不存在的工具。'
    );
  }
  parts.push(
    '## 记忆持久化\n\n你可以使用 UpdateProfile 工具将用户偏好和习惯写入持久存储：\n- 用户透露偏好、习惯、身份信息时 → UpdateProfile(field="user", action="append", content="...")\n- 需要调整自己的人格或执行规则时 → UpdateProfile(field="soul", action="replace", content="...")\n- 追加内容应简短原子（一条信息一行），不要重复已有内容。替换时需提供完整的新内容。'
  );
  parts.push(
    '## MCP 服务器管理\n\n你可以使用 `McpManager` 工具探查与管理本应用的 MCP 服务器（外部工具服务）：\n- `list` — 列出全部服务器及其运行时状态、是否绑定当前会话\n- `status` — 查看单个服务器的状态、最近错误与日志（需 `serverId`）\n- `tools` — 列出某服务器暴露的工具名与入参 schema（需 `serverId`）\n- `enable` / `disable` — 启用或停用服务器（停用会立即断开子进程/连接）\n- `restart` / `stop` — 重启或停止已运行的服务器\n- `add` / `edit` / `remove` — 新增、修改、删除服务器配置（`add`/`edit` 传入 `server` 对象；`remove` 传入 `serverId`）\n\n使用前先 `list` 探查现状；需要某服务器工具细节时用 `tools`。状态切换与配置变更会向用户请求确认。新增的服务器 `installSource` 固定为 `manual`；内置预设的 `command` 不可改写。'
  );
  parts.push(
    '## 工具输出展示\n\n工具执行的原始证据（搜索结果、文件内容、命令输出等）会在界面的「工具调用」历史中展示给用户。你的回复只需给出结论、分析与必要引用；**禁止**在回复末尾重复粘贴完整搜索结果列表、文件原文或大段命令输出。若需指向某条证据，用简短说明即可（如「见上方 WebSearch 结果 #2」）。'
  );
  if (enabledToolNames.includes('AskUserQuestion')) {
    parts.push(
      '## 向用户确认（AskUserQuestion）\n\n' +
        '**何时调用**：缺少关键偏好/约束且无法从文件、设置或对话推断；用户指令存在多种合理理解且会显著改变方案；执行前被阻塞、必须选定方向才能继续。\n\n' +
        '**何时不要调用**：Read/Grep/设置/历史能自行确定；仅为礼貌性确认（「可以吗？」）——直接执行或说明假设；答案不会改变下一步动作；每步都问——每轮最多 1–2 个阻塞性问题。\n\n' +
        '**参数**：`questions` 1–4 题；每题 `question` + `options`（0–4 个，可为 `{label, description?}` 或字符串）。界面始终有「其他」供自由输入，不要在 options 里重复。需要多选时设 `multiSelect: true`。'
    );
  }
  if (context === 'terminal') {
    parts.push(
      '## 终端操作\n\n你可以使用 Terminal 工具将 shell 命令发送到用户当前可见的终端执行，命令输出会实时显示在用户终端中，同时返回给你用于判断下一步操作。在当前终端会话中，所有 shell 命令都必须通过 Terminal 工具执行；发送命令前确保意图明确，命令执行结果（包括 exit code）会返回给你。过长的输出会被截断，如需完整输出请缩小命令范围。'
    );
    parts.push(buildTerminalEnvSection(terminalState));
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

function registerAgentHandlers(ipcMain, deps) {
  const { getWindows, getParentWindow, chatLogsDir } = deps;

  // Legacy IPC — prefer ai:stream_open for new callers. Shares tool/MCP wiring via agentStreamShared.
  ipcMain.handle('agent:run', async (event, payload) => {
    const {
      requestId,
      messages,
      terminalSessionId,
      topicId,
    } = payload || {};

    if (!requestId || !Array.isArray(messages)) {
      throw new Error('agent:run invalid payload');
    }

    const settingsSnapshot = require('./settingsSnapshot.cjs');
    const resolved = settingsSnapshot.resolveForSend({
      agentConfig: payload?.agentConfig,
      apiConfig: payload?.apiConfig,
      forceAgent: true,
    });
    if (!resolved.ok || !resolved.apiConfig || !resolved.agentConfig) {
      throw new Error(resolved.error || 'agent:run missing API config');
    }
    const apiConfig = resolved.apiConfig;
    const agentConfig = resolved.agentConfig;

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
      const terminalState = context === 'terminal' ? await getTerminalForeground(terminalSessionId) : null;
      const enabledToolNames = builtinTools.map((t) => t.function.name);
      const systemPrompt = buildAgentSystemPrompt(agentConfig, context, terminalState, enabledToolNames);
      const apiMessages = (messages || []).filter((m) => m.role !== 'system');
      const maxTurns = Math.max(1, Number(agentConfig.maxTurns) || 10);
      const reasoningEffort = agentConfig.reasoningEffort;
      const legacyTopicId = topicId || `legacy:${requestId}`;

      const toolDeps = buildAgentToolDeps({
        topicId: legacyTopicId,
        requestId,
        agentConfig,
        mcpRuntime,
        signal: controller.signal,
        registerMcpCall: (_tid, callId) => {
          try {
            const { manager } = require('./aiStreamService.cjs');
            manager.registerMcpCall(legacyTopicId, callId);
          } catch {
            /* stream manager optional */
          }
        },
        getWindows,
        parentWindow,
        sender,
        safeSend,
        getBypassApproval: () => agentState.bypassApproval === true,
        webSearchConfig: getCurrentWebSearchConfig(),
        terminalSessionId,
        suppressToolDoneEvent: true,
      });
      toolDeps.persistEnabledSkillId = (skillId) => persistEnabledSkillId(skillId, getWindows);

      const { toolSnapshot, aborted } = await runAgentStream({
        requestId,
        messages: apiMessages,
        systemPrompt,
        apiConfig,
        toolDefinitions: tools,
        toolDeps,
        maxTurns,
        reasoningEffort,
        signal: controller.signal,
        safeSend,
      });

      safeSend('chat:stream:done', {
        requestId,
        ...(aborted || controller.signal.aborted ? { aborted: true } : {}),
        tools: toolSnapshot,
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
    try {
      const { manager } = require('./aiStreamService.cjs');
      for (const [, entry] of manager.activeStreams.entries()) {
        if (entry.requestId === requestId) {
          manager.abort(entry.topicId);
          break;
        }
      }
    } catch {
      /* stream manager optional */
    }
  });

  ipcMain.handle('agent:tool:bypass_approval', async (_event, payload) => {
    const requestId = payload?.requestId;
    const topicId = payload?.topicId;
    let ok = false;

    const agentState = requestId ? inflightAgents.get(requestId) : null;
    if (agentState) {
      agentState.bypassApproval = true;
      ok = true;
    }

    try {
      const { setTopicBypassApproval, setBypassApprovalByRequestId } = require('./aiStreamService.cjs');
      if (topicId && setTopicBypassApproval(topicId)) ok = true;
      if (requestId && setBypassApprovalByRequestId(requestId)) ok = true;
    } catch {
      /* stream manager optional */
    }

    return ok;
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

module.exports = {
  registerAgentHandlers,
  abortAllAgentRuns,
  buildAgentSystemPrompt,
  getCurrentWebSearchConfig,
  persistEnabledSkillId,
};
