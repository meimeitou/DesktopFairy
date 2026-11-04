const { manager } = require('./ai/streamManager/AiStreamManager.cjs');
const { createChunkBridge } = require('./ai/chunkBridge.cjs');
const { broadcastToTopic } = require('./ai/topicBroadcast.cjs');
const {
  buildKnowledgeSystemSuffix,
  createAgentTextStream,
} = require('./ai/prepareAgentStream.cjs');
const settingsSnapshot = require('./settingsSnapshot.cjs');

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
      terminalSessionId,
      knowledgeBaseIds: rawKnowledgeBaseIds,
    } = payload || {};

    if (!topicId || !requestId || !Array.isArray(messages)) {
      throw new Error('ai:stream_open invalid payload');
    }

    // Authoritative resolve from main snapshot — ignore stale renderer apiConfig/model.
    const resolved = settingsSnapshot.resolveForSend({
      agentConfig: payload?.agentConfig,
      apiConfig: payload?.apiConfig,
    });
    if (!resolved.ok || !resolved.apiConfig || !resolved.agentConfig) {
      throw new Error(resolved.error || 'ai:stream_open invalid apiConfig');
    }
    const apiConfig = resolved.apiConfig;
    const agentConfig = resolved.agentConfig;
    assertHttpUrl(apiConfig.apiHost);

    const sender = event.sender;
    const parentWindow = getParentWindow?.() || null;
    const legacySend = (channel, data) => {
      broadcastToTopic(manager, topicId, sender, channel, data);
    };

    const knowledgeBaseIds = Array.isArray(rawKnowledgeBaseIds)
      ? rawKnowledgeBaseIds.filter((id) => typeof id === 'string' && id)
      : [];
    const apiMessages = (messages || []).filter((m) => m.role !== 'system');
    const knowledgeSystemSuffix = await buildKnowledgeSystemSuffix({
      apiMessages,
      knowledgeBaseIds,
      apiConfig,
      requestId,
      legacySend,
    });

    const maxTurns = Math.max(1, Number(agentConfig.maxTurns) || 30);
    const bridge = createChunkBridge({ requestId, safeSend: legacySend });
    const streamCtx = {
      manager,
      topicId,
      requestId,
      terminalSessionId,
      sender,
      agentConfig,
      apiConfig,
      apiMessages,
      knowledgeSystemSuffix,
      maxTurns,
      bridge,
      legacySend,
      topicAgentState,
      getWindows,
      parentWindow,
      hostConversationService: deps.hostConversationService,
      protectedDir: deps.protectedDir,
      mcpRuntime: null,
    };

    topicAgentState.set(topicId, { bypassApproval: false });
    const startResult = manager.startStream({
      topicId,
      requestId,
      createStream: createAgentTextStream(streamCtx),
      onChunk: (chunk) => bridge.handleChunk(chunk),
      onDone: (donePayload) => {
        legacySend('chat:stream:done', {
          requestId,
          maxTurnsReached: donePayload.maxTurnsReached || undefined,
          tools: bridge.getToolSnapshot(),
          usage: donePayload.usage || undefined,
        });
        topicAgentState.delete(topicId);
        streamCtx.mcpRuntime?.dispose?.();
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
        streamCtx.mcpRuntime?.dispose?.();
      },
    });

    if (startResult.mode === 'blocked') {
      topicAgentState.delete(topicId);
      return startResult;
    }

    manager.attach(topicId, sender);
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
    // Only bypass when this topic already has agent state (active/recent stream).
    if (!topicAgentState.has(topicId)) return false;
    return setTopicBypassApproval(topicId);
  });
}

function setTopicBypassApproval(topicId) {
  if (!topicId) return false;
  const state = topicAgentState.get(topicId) || { bypassApproval: false };
  state.bypassApproval = true;
  topicAgentState.set(topicId, state);
  const entry = manager.activeStreams.get(topicId);
  if (entry?.requestId) {
    try {
      const { approveRequestApprovals } = require('./agentToolApproval.cjs');
      approveRequestApprovals(entry.requestId);
    } catch {
      /* optional */
    }
  }
  return true;
}

function setBypassApprovalByRequestId(requestId) {
  if (!requestId) return false;
  for (const [topicId, entry] of manager.activeStreams.entries()) {
    if (entry.requestId === requestId) {
      return setTopicBypassApproval(topicId);
    }
  }
  // No active stream row — still flush any hung approvals for this request.
  try {
    const { approveRequestApprovals } = require('./agentToolApproval.cjs');
    if (approveRequestApprovals(requestId) > 0) return true;
  } catch {
    /* optional */
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
