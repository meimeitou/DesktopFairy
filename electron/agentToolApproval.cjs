const pending = new Map();

function makeApprovalId(requestId, toolCallId) {
  return `${requestId}::${toolCallId}`;
}

function registerToolApprovalHandlers(ipcMain) {
  ipcMain.handle('agent:tool:approve', async (_event, payload) => {
    const { approvalId, approved } = payload || {};
    if (!approvalId) throw new Error('approvalId required');
    return dispatchToolApproval(String(approvalId), approved !== false);
  });
}

function waitForToolApproval({ approvalId, signal }) {
  return new Promise((resolve) => {
    if (signal?.aborted) {
      resolve(false);
      return;
    }

    const entry = {
      resolve: (approved) => {
        pending.delete(approvalId);
        resolve(approved);
      },
    };

    pending.set(approvalId, entry);

    if (signal) {
      const onAbort = () => {
        if (pending.has(approvalId)) {
          pending.delete(approvalId);
          resolve(false);
        }
      };
      signal.addEventListener('abort', onAbort, { once: true });
    }
  });
}

function dispatchToolApproval(approvalId, approved) {
  const entry = pending.get(approvalId);
  if (!entry) return false;
  entry.resolve(!!approved);
  return true;
}

function abortRequestApprovals(requestId) {
  const prefix = `${requestId}::`;
  let count = 0;
  for (const [id, entry] of pending.entries()) {
    if (!id.startsWith(prefix)) continue;
    pending.delete(id);
    entry.resolve(false);
    count += 1;
  }
  return count;
}

function clearAllToolApprovals() {
  for (const [, entry] of pending.entries()) {
    entry.resolve(false);
  }
  pending.clear();
}

module.exports = {
  makeApprovalId,
  registerToolApprovalHandlers,
  waitForToolApproval,
  dispatchToolApproval,
  abortRequestApprovals,
  clearAllToolApprovals,
};
