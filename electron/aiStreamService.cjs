const inputRuntime = require('./ai/agentInputRuntime.cjs');
const { toCoreMessages } = require('./ai/messages.cjs');
const { manager } = require('./ai/streamManager/AiStreamManager.cjs');
const { createChunkBridge } = require('./ai/chunkBridge.cjs');
const { broadcastToTopic, sendToWebContents } = require('./ai/topicBroadcast.cjs');
const {
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

  ipcMain.handle('ai:terminal:clear_sudo', (_event, { tabId } = {}) => {
    if (typeof tabId === 'string') {
      const topicId = `terminal:${tabId}`;
      manager.abort(topicId);
      inputRuntime.queue.clear(topicId);
      require('./sudoPasswordCache.cjs').clearTopic(topicId);
    }
  });

  const publishInputs = (topicId, sender) => {
    const payload = { topicId, items: inputRuntime.queue.snapshot(topicId) };
    // Queue snapshots are authoritative; don't add them to the stream's replay buffer.
    const recipients = new Set([
      ...(manager.activeStreams.get(topicId)?.listeners || []),
      ...(manager.pendingListeners?.get(topicId) || []),
    ]);
    if (sender) recipients.add(sender);
    for (const listener of recipients) sendToWebContents(listener, 'agent:input:updated', payload);
    return payload;
  };
  ipcMain.handle('ai:stream_enqueue', (event, { topicId, requestId, input } = {}) => {
    if (typeof topicId !== 'string' || !topicId) throw new Error('Invalid topicId');
    const entry = manager.activeStreams.get(topicId);
    if (!entry || entry.requestId !== requestId || entry.status !== 'streaming' ||
        entry.controller.signal.aborted || entry.acceptingInput === false) return { mode: 'inactive' };
    toCoreMessages([input?.apiMessage]);
    inputRuntime.queue.enqueue(topicId, input);
    return { mode: 'queued', ...publishInputs(topicId, event.sender) };
  });
  ipcMain.handle('ai:stream_withdraw', (event, { topicId, messageId } = {}) => {
    if (typeof topicId !== 'string' || !topicId) throw new Error('Invalid topicId');
    const message = inputRuntime.queue.withdraw(topicId, messageId);
    publishInputs(topicId, event.sender);
    return { message };
  });
  ipcMain.handle('ai:stream_inputs', (_event, { topicId } = {}) => {
    if (typeof topicId !== 'string' || !topicId) throw new Error('Invalid topicId');
    return { topicId, items: inputRuntime.queue.snapshot(topicId) };
  });
  ipcMain.handle('ai:stream_inputs_clear', (event, { topicId } = {}) => {
    if (typeof topicId !== 'string' || !topicId) throw new Error('Invalid topicId');
    if (manager.isTopicStreaming(topicId)) throw new Error('请先停止当前执行');
    inputRuntime.queue.clear(topicId);
    publishInputs(topicId, event.sender);
  });

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

    const existing = manager.activeStreams?.get(topicId);
    if (existing?.status === 'streaming') return { mode: 'blocked', requestId: existing.requestId };

    // Authoritative resolve from main snapshot — ignore stale renderer apiConfig/model.
    const resolved = settingsSnapshot.resolveForSend({
      agentConfig: payload?.agentConfig,
      apiConfig: payload?.apiConfig,
    });
    if (!resolved.ok || !resolved.apiConfig || !resolved.agentConfig) {
      throw new Error(resolved.error || 'ai:stream_open invalid apiConfig');
    }
    const apiConfig = resolved.apiConfig;
    const selected = require('./hostSelection.cjs').validateSelectedHosts(payload?.selectedHosts, settingsSnapshot.getSnapshot()?.sshHosts || []);
    if (selected.hosts.length) {
      const topic = deps.hostConversationService?.getTopic(topicId);
      if (!String(topicId).startsWith('terminal:') && !topic?.host && topic?.origin !== 'terminal') {
        selected.errors.selection = '此聊天入口不支持选择机器，请使用终端页。';
      }
    }
    if (Object.keys(selected.errors).length) {
      return { mode: 'invalid_hosts', requestId, hostErrors: selected.errors };
    }
    const selectedSkills = require('./agentSkillService.cjs').loadSelectedSkills(payload?.selectedSkillIds);
    if (Object.keys(selectedSkills.errors).length) {
      return { mode: 'invalid_skills', requestId, skillErrors: selectedSkills.errors };
    }
    const agentConfig = {
      ...resolved.agentConfig,
      enabledSkillIds: [...new Set([...(resolved.agentConfig.enabledSkillIds || []), ...selectedSkills.ids])],
    };
    assertHttpUrl(apiConfig.apiHost);

    const sender = event.sender;
    const parentWindow = getParentWindow?.() || null;
    const legacySend = (channel, data) => {
      broadcastToTopic(manager, topicId, sender, channel, data);
    };

    const knowledgeBaseIds = require('./knowledge/vaultService.cjs').validIds(
      Array.isArray(rawKnowledgeBaseIds) ? rawKnowledgeBaseIds : agentConfig.knowledgeBaseIds,
    );
    const apiMessages = (messages || []).filter((m) => m.role !== 'system');

    const maxTurns = Math.max(1, Number(agentConfig.maxTurns) || 30);
    const bridge = createChunkBridge({ requestId, safeSend: legacySend });
    // A new manual send joins existing pending inputs in FIFO order.
    // Hoist the candidate message BEFORE calling enqueue so the duplicate-ID
    // guard can run before the pop — a stale ID in the queue must not cause the
    // user's latest message to be silently dropped from both apiMessages and the queue.
    const lastApiMsg = apiMessages.at(-1);
    if (inputRuntime.queue.pending(topicId).length && payload.userMessage && lastApiMsg?.role === 'user' &&
        !inputRuntime.queue.pending(topicId).some((r) => r.message.id === payload.userMessage.id)) {
      apiMessages.pop();
      inputRuntime.queue.enqueue(topicId, { message: payload.userMessage, apiMessage: lastApiMsg });
      publishInputs(topicId, sender);
    }
    const streamCtx = {
      compact: payload.compact === true,
      manager,
      topicId,
      requestId,
      terminalSessionId,
      sender,
      agentConfig,
      selectedSkillsPrompt: selectedSkills.prompt,
      selectedHosts: selected.hosts,
      apiConfig,
      apiMessages,
      knowledgeBaseIds,
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

    streamCtx.inputs = {
      hasPending: () => inputRuntime.queue.pending(topicId).length > 0,
      consume: () => {
        const items = inputRuntime.queue.consume(topicId, requestId, { selectedHosts: selected.hosts, selectedSkillIds: selectedSkills.ids });
        if (items.length) publishInputs(topicId, sender);
        return { items: items.map((row) => row.message), messages: toCoreMessages(items.map((row) => row.apiMessage)) };
      },
      seal: () => {
        const entry = manager.activeStreams?.get(topicId);
        if (entry?.requestId === requestId) entry.acceptingInput = false;
      },
    };
    topicAgentState.set(topicId, { bypassApproval: false });
    const startResult = manager.startStream({
      topicId,
      requestId,
      createStream: createAgentTextStream(streamCtx),
      onChunk: (chunk) => {
        if (chunk.type === 'agent-input') {
          legacySend('agent:stream:input', { requestId, items: chunk.items });
        } else bridge.handleChunk(chunk);
      },
      onDone: (donePayload) => {
        legacySend('chat:stream:done', {
          requestId,
          isCompact: streamCtx.compact,
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
            isCompact: streamCtx.compact,
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
    return { ...manager.attach(topicId, event.sender), inputs: inputRuntime.queue.snapshot(topicId) };
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
