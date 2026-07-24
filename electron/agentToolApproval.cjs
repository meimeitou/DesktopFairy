const pending = new Map();
const pendingAnswers = new Map();

function makeApprovalId(requestId, toolCallId) {
  return `${requestId}::${toolCallId}`;
}

const makeAnswerId = makeApprovalId;

function registerToolApprovalHandlers(ipcMain) {
  ipcMain.handle('agent:tool:approve', async (_event, payload) => {
    const { approvalId, approved } = payload || {};
    if (!approvalId) throw new Error('approvalId required');
    return dispatchToolApproval(String(approvalId), approved !== false);
  });

  ipcMain.handle('agent:tool:answer', async (_event, payload) => {
    const { answerId, answers } = payload || {};
    if (!answerId) throw new Error('answerId required');
    if (!answers || typeof answers !== 'object' || Array.isArray(answers)) {
      throw new Error('answers object required');
    }
    return dispatchUserAnswer(String(answerId), answers);
  });
}

/** @returns {'approved' | 'denied' | 'aborted'} */
function waitForToolApproval({ approvalId, signal }) {
  return new Promise((resolve) => {
    if (signal?.aborted) {
      resolve('aborted');
      return;
    }

    const entry = {
      resolve: (result) => {
        pending.delete(approvalId);
        resolve(result);
      },
    };

    pending.set(approvalId, entry);

    if (signal) {
      const onAbort = () => {
        if (pending.has(approvalId)) {
          pending.delete(approvalId);
          resolve('aborted');
        }
      };
      signal.addEventListener('abort', onAbort, { once: true });
    }
  });
}

/**
 * @returns {Promise<{ kind: 'answered', answers: Record<string, string> } | { kind: 'aborted' }>}
 */
function waitForUserAnswer({ answerId, signal }) {
  return new Promise((resolve) => {
    if (signal?.aborted) {
      resolve({ kind: 'aborted' });
      return;
    }

    const entry = {
      resolve: (result) => {
        pendingAnswers.delete(answerId);
        resolve(result);
      },
    };

    pendingAnswers.set(answerId, entry);

    if (signal) {
      const onAbort = () => {
        if (pendingAnswers.has(answerId)) {
          pendingAnswers.delete(answerId);
          resolve({ kind: 'aborted' });
        }
      };
      signal.addEventListener('abort', onAbort, { once: true });
    }
  });
}

function dispatchToolApproval(approvalId, approved) {
  const entry = pending.get(approvalId);
  if (!entry) return false;
  entry.resolve(approved ? 'approved' : 'denied');
  return true;
}

function dispatchUserAnswer(answerId, answers) {
  const entry = pendingAnswers.get(answerId);
  if (!entry) return false;
  const normalized = {};
  for (const [key, value] of Object.entries(answers)) {
    normalized[String(key)] = String(value ?? '');
  }
  entry.resolve({ kind: 'answered', answers: normalized });
  return true;
}

/**
 * Approve every tool still waiting on this request.
 * Used by "始终允许"/bypass so parallel tools that already entered
 * waitForToolApproval (UI may still show 准备中) are not left hanging.
 * Does not touch AskUserQuestion answer waits.
 */
function approveRequestApprovals(requestId) {
  if (!requestId) return 0;
  const prefix = `${requestId}::`;
  let count = 0;
  for (const [id, entry] of [...pending.entries()]) {
    if (!id.startsWith(prefix)) continue;
    entry.resolve('approved');
    count += 1;
  }
  return count;
}

function abortRequestApprovals(requestId) {
  const prefix = `${requestId}::`;
  let count = 0;
  for (const [id, entry] of pending.entries()) {
    if (!id.startsWith(prefix)) continue;
    pending.delete(id);
    entry.resolve('aborted');
    count += 1;
  }
  for (const [id, entry] of pendingAnswers.entries()) {
    if (!id.startsWith(prefix)) continue;
    pendingAnswers.delete(id);
    entry.resolve({ kind: 'aborted' });
    count += 1;
  }
  return count;
}

function clearAllToolApprovals() {
  for (const [, entry] of pending.entries()) {
    entry.resolve('aborted');
  }
  pending.clear();
  for (const [, entry] of pendingAnswers.entries()) {
    entry.resolve({ kind: 'aborted' });
  }
  pendingAnswers.clear();
}

module.exports = {
  makeApprovalId,
  makeAnswerId,
  registerToolApprovalHandlers,
  waitForToolApproval,
  waitForUserAnswer,
  dispatchToolApproval,
  dispatchUserAnswer,
  approveRequestApprovals,
  abortRequestApprovals,
  clearAllToolApprovals,
};
