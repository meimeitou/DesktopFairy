/**
 * Broadcast IPC events to all webContents attached to a topic stream.
 */

const { pushLegacyEvent, markLegacyCursor } = require('./streamManager/legacyReplay.cjs');

function sendToWebContents(webContents, channel, data) {
  try {
    if (webContents && !webContents.isDestroyed()) {
      webContents.send(channel, data);
      return true;
    }
  } catch {
    /* gone */
  }
  return false;
}

/**
 * @param {import('./streamManager/AiStreamManager.cjs').AiStreamManager} manager
 * @param {string} topicId
 * @param {import('electron').WebContents | null | undefined} fallbackSender
 */
function broadcastToTopic(manager, topicId, fallbackSender, channel, data) {
  const entry = manager.activeStreams.get(topicId);
  let delivered = false;
  const recipients = [];

  if (entry?.listeners?.size) {
    for (const listener of entry.listeners) {
      if (sendToWebContents(listener, channel, data)) {
        delivered = true;
        recipients.push(listener);
      }
    }
  }

  if (!delivered && fallbackSender) {
    if (sendToWebContents(fallbackSender, channel, data)) {
      recipients.push(fallbackSender);
    }
  }

  if (entry) {
    pushLegacyEvent(entry, { channel, data });
    for (const wc of recipients) markLegacyCursor(entry, wc);
  }
}

/**
 * Wrap MCP execute so Stop/abort kills the in-flight MCP call.
 * @param {object} mcpRuntime
 * @param {object} ctx
 * @param {string} [ctx.topicId]
 * @param {AbortSignal} [ctx.signal]
 * @param {(topicId: string, callId: string) => void} [ctx.registerMcpCall]
 */
function wrapMcpToolExecute(mcpRuntime, ctx = {}) {
  const baseExecute = mcpRuntime?.executeMcpTool;
  if (!baseExecute) return undefined;

  const { abortTool } = require('../mcpRuntimeService.cjs');
  const { topicId, signal, registerMcpCall } = ctx;

  return async (openAiName, args, callId) => {
    const toolCallId = callId || `mcp_${Date.now()}`;
    if (topicId && registerMcpCall) registerMcpCall(topicId, toolCallId);

    const onAbort = () => abortTool(toolCallId);
    if (signal) {
      if (signal.aborted) onAbort();
      signal.addEventListener('abort', onAbort, { once: true });
    }

    try {
      return await baseExecute(openAiName, args, toolCallId);
    } finally {
      signal?.removeEventListener('abort', onAbort);
    }
  };
}

module.exports = {
  broadcastToTopic,
  sendToWebContents,
  wrapMcpToolExecute,
};
