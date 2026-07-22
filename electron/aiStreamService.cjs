const { manager } = require('./ai/streamManager/AiStreamManager.cjs');
const { streamText } = require('./ai/AiService.cjs');
const { createChunkBridge } = require('./ai/chunkBridge.cjs');
const { broadcastToTopic } = require('./ai/topicBroadcast.cjs');
const { getBuiltinTools, buildAgentToolDeps } = require('./ai/agentStreamShared.cjs');
const {
  buildAgentSystemPrompt,
  getCurrentWebSearchConfig,
  persistEnabledSkillId,
} = require('./agentService.cjs');
const { loadMcpToolDefinitions } = require('./agentMcpClient.cjs');
const { getServersByIds } = require('./mcpServerService.cjs');
const { getTerminalForeground } = require('./ptyService.cjs');

/** @type {Map<string, { bypassApproval: boolean }>} */
const topicAgentState = new Map();

function registerAiStreamHandlers(ipcMain, deps) {
  const { getWindows, getParentWindow } = deps;

  function assertHttpUrl(raw) {
    let u;
    try {
      u = new URL(String(raw));
    } catch {
      throw new Error('URL 无效');
    }
    if (u.protocol !== 'http:' && u.protocol !== 'https:') {
      throw new Error(`不支持的协议: ${u.protocol}（仅允许 http/https）`);
    }
    return u.href;
  }

  ipcMain.handle('ai:stream_open', async (event, payload) => {
    const {
      topicId,
      requestId,
      messages,
      agentConfig,
      apiConfig,
      terminalSessionId,
    } = payload || {};

    if (!topicId || !requestId || !Array.isArray(messages) || !agentConfig || !apiConfig) {
      throw new Error('ai:stream_open invalid payload');
    }
    if (!apiConfig.apiHost || !apiConfig.modelName) {
      throw new Error('ai:stream_open invalid apiConfig');
    }
    assertHttpUrl(apiConfig.apiHost);

    if (manager.isTopicStreaming(topicId)) {
      const existing = manager.activeStreams.get(topicId);
      return { mode: 'blocked', requestId: existing?.requestId || requestId };
    }

    const sender = event.sender;
    const parentWindow = getParentWindow?.() || null;
    const legacySend = (channel, data) => {
      broadcastToTopic(manager, topicId, sender, channel, data);
    };

    topicAgentState.set(topicId, { bypassApproval: false });
    manager.attach(topicId, sender);

    const mcpRuntime = await loadMcpToolDefinitions(getServersByIds(agentConfig.mcpServerIds));
    const context = terminalSessionId ? 'terminal' : 'local';
    const builtinTools = getBuiltinTools(agentConfig, context);
    const toolDefinitions = [...builtinTools, ...(mcpRuntime.definitions || [])];
    const terminalState = context === 'terminal' ? await getTerminalForeground(terminalSessionId) : null;
    const enabledToolNames = builtinTools.map((t) => t.function.name);
    const systemPrompt = buildAgentSystemPrompt(agentConfig, context, terminalState, enabledToolNames);
    const apiMessages = (messages || []).filter((m) => m.role !== 'system');
    const maxTurns = Math.max(1, Number(agentConfig.maxTurns) || 10);

    const bridge = createChunkBridge({ requestId, safeSend: legacySend });

    const startResult = manager.startStream({
      topicId,
      requestId,
      createStream: async () => {
        const entry = manager.activeStreams.get(topicId);
        const signal = entry?.controller?.signal;

        const toolDeps = buildAgentToolDeps({
          topicId,
          requestId,
          agentConfig,
          mcpRuntime,
          signal,
          registerMcpCall: (tid, callId) => manager.registerMcpCall(tid, callId),
          getWindows,
          parentWindow,
          sender,
          safeSend: legacySend,
          getBypassApproval: () => topicAgentState.get(topicId)?.bypassApproval === true,
          onApprovalWaitStart: () => {
            const entry = manager.activeStreams.get(topicId);
            if (entry?.idle) manager.extendIdleForApproval(topicId, entry.idle);
          },
          webSearchConfig: getCurrentWebSearchConfig(),
          terminalSessionId,
          suppressToolDoneEvent: true,
        });
        toolDeps.persistEnabledSkillId = (skillId) => persistEnabledSkillId(skillId, getWindows);

        return streamText({
          messages: apiMessages,
          systemPrompt,
          apiConfig,
          toolDefinitions,
          toolDeps,
          maxTurns,
          reasoningEffort: agentConfig.reasoningEffort,
          signal,
        });
      },
      onChunk: (chunk) => bridge.handleChunk(chunk),
      onDone: () => {
        legacySend('chat:stream:done', {
          requestId,
          tools: bridge.getToolSnapshot(),
        });
        topicAgentState.delete(topicId);
        mcpRuntime?.dispose?.();
      },
      onError: (errPayload) => {
        if (errPayload.aborted) {
          legacySend('chat:stream:done', {
            requestId,
            aborted: true,
            tools: bridge.getToolSnapshot(),
          });
        } else {
          legacySend('chat:stream:error', { requestId, message: errPayload.message });
        }
        topicAgentState.delete(topicId);
        mcpRuntime?.dispose?.();
      },
    });

    if (startResult.mode === 'blocked') {
      topicAgentState.delete(topicId);
      mcpRuntime?.dispose?.();
      return startResult;
    }

    return startResult;
  });

  ipcMain.handle('ai:stream_attach', async (event, payload) => {
    const { topicId } = payload || {};
    if (!topicId) return { attached: false, chunks: [], legacyEvents: [] };
    return manager.attach(topicId, event.sender);
  });

  ipcMain.handle('ai:stream_detach', async (event, payload) => {
    const { topicId } = payload || {};
    if (!topicId) return;
    manager.detach(topicId, event.sender);
  });

  ipcMain.handle('ai:stream_abort', async (_event, payload) => {
    const { topicId, requestId } = payload || {};
    if (topicId) return manager.abort(topicId);
    if (requestId) {
      for (const [tid, entry] of manager.activeStreams.entries()) {
        if (entry.requestId === requestId) return manager.abort(tid);
      }
    }
    return false;
  });

  ipcMain.handle('ai:tool:bypass_approval', async (_event, payload) => {
    const { topicId } = payload || {};
    if (!topicId) return false;
    const state = topicAgentState.get(topicId);
    if (state) {
      state.bypassApproval = true;
      return true;
    }
    return false;
  });
}

function setTopicBypassApproval(topicId) {
  if (!topicId) return false;
  const state = topicAgentState.get(topicId) || { bypassApproval: false };
  state.bypassApproval = true;
  topicAgentState.set(topicId, state);
  return true;
}

function setBypassApprovalByRequestId(requestId) {
  if (!requestId) return false;
  for (const [topicId, entry] of manager.activeStreams.entries()) {
    if (entry.requestId === requestId) {
      return setTopicBypassApproval(topicId);
    }
  }
  return false;
}
function abortAllAiStreams() {
  for (const topicId of manager.activeStreams.keys()) {
    manager.abort(topicId);
  }
  topicAgentState.clear();
}

module.exports = {
  registerAiStreamHandlers,
  manager,
  abortAllAiStreams,
  setTopicBypassApproval,
  setBypassApprovalByRequestId,
};
