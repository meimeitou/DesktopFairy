/**
 * Per-tool abort registry: renderer can cancel a single in-flight tool call
 * (header 取消按钮) without aborting the whole agent stream.
 *
 * buildToolSet registers an AbortController per toolCallId here; the
 * `agent:tool:cancel` IPC aborts it. The merged signal passed to executors
 * (buildToolSet) fires, executors return an aborted result, and buildToolSet
 * throws a normal tool error ("工具调用已被用户取消") so the model sees a
 * cancelled tool call and the loop continues. Whole-stream aborts stay
 * AbortError in buildToolSet (checked via streamSignal.aborted).
 */

const activeToolCalls = new Map();

/** @returns {AbortController | null} controller for this tool call, if in flight */
function registerToolAbort(toolCallId) {
  if (!toolCallId) return null;
  const controller = new AbortController();
  activeToolCalls.set(toolCallId, controller);
  return controller;
}

function unregisterToolAbort(toolCallId) {
  activeToolCalls.delete(toolCallId);
}

/** Abort one tool call. @returns {boolean} whether a live call was cancelled */
function cancelToolAbort(toolCallId) {
  const controller = activeToolCalls.get(toolCallId);
  if (!controller) return false;
  activeToolCalls.delete(toolCallId);
  controller.abort();
  return true;
}

function registerToolAbortHandlers(ipcMain) {
  ipcMain.handle('agent:tool:cancel', async (_event, payload) => {
    const toolCallId = payload?.toolCallId;
    let ok = cancelToolAbort(toolCallId);
    // MCP tools run through wrapMcpToolExecute, which listens only to the
    // stream signal — the merged signal from buildToolSet never reaches the
    // MCP client call. So always try the MCP runtime abort too (registry hit
    // above does not kill the underlying client request).
    try {
      const { abortTool } = require('./mcpRuntimeService.cjs');
      if (abortTool(toolCallId)) ok = true;
    } catch {
      /* runtime service optional */
    }
    return { ok };
  });
}

function clearAllToolAborts() {
  for (const controller of activeToolCalls.values()) {
    controller.abort();
  }
  activeToolCalls.clear();
}

module.exports = {
  registerToolAbort,
  unregisterToolAbort,
  cancelToolAbort,
  registerToolAbortHandlers,
  clearAllToolAborts,
};
