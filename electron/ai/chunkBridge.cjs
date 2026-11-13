/**
 * Bridge AI SDK UIMessageChunk stream to DesktopFairy IPC events.
 * Maintains a tool ledger for terminal reconciliation on stream:done.
 */
/** Builtin tools return `{ ok: false, error }` as a normal tool output. That is a failure, not a completed call. */
function failureFromToolOutput(output) {
  let obj = output;
  if (typeof output === 'string') {
    const trimmed = output.trim();
    if (!trimmed.startsWith('{')) return null;
    try {
      obj = JSON.parse(trimmed);
    } catch {
      return null;
    }
  }
  if (!obj || typeof obj !== 'object' || obj.ok !== false) return null;
  return typeof obj.error === 'string' && obj.error ? obj.error : 'Tool error';
}

function createChunkBridge({ requestId, safeSend, onToolEvent }) {
  const toolLedger = new Map();
  const toolArgsAcc = new Map();
  const executionArgs = new Map();
  const deniedIds = new Set();

  const updateLedger = (toolCallId, patch) => {
    if (!toolCallId) return;
    const prev = toolLedger.get(toolCallId) || { toolCallId };
    toolLedger.set(toolCallId, { ...prev, ...patch });
  };

  const handleChunk = (chunk) => {
    if (!chunk || !chunk.type) return;

    switch (chunk.type) {
      case 'context-checkpoint':
        safeSend('chat:stream:chunk', { requestId, checkpoint: chunk.checkpoint });
        break;
      case 'text-delta':
        if (chunk.delta) {
          safeSend('chat:stream:chunk', { requestId, delta: chunk.delta, partId: chunk.id });
        }
        break;

      case 'reasoning-delta':
        if (chunk.delta) {
          safeSend('chat:stream:chunk', { requestId, reasoning: chunk.delta });
        }
        break;

      case 'tool-input-start':
        updateLedger(chunk.toolCallId, {
          toolName: chunk.toolName,
          status: 'streaming',
          toolArgs: '',
        });
        safeSend('agent:stream:tool', {
          requestId,
          toolCallId: chunk.toolCallId,
          toolName: chunk.toolName,
          toolArgs: '',
          status: 'streaming',
        });
        onToolEvent?.(chunk);
        break;

      case 'tool-input-delta': {
        if (executionArgs.has(chunk.toolCallId)) break;
        const acc = (toolArgsAcc.get(chunk.toolCallId) || '') + (chunk.inputTextDelta || '');
        toolArgsAcc.set(chunk.toolCallId, acc);
        updateLedger(chunk.toolCallId, { toolArgs: acc, status: 'streaming' });
        safeSend('agent:stream:tool', {
          requestId,
          toolCallId: chunk.toolCallId,
          toolName: chunk.toolName,
          toolArgs: acc,
          status: 'streaming',
        });
        break;
      }

      case 'tool-input-available': {
        // Args are ready but execute() (incl. user approval) has not started yet.
        // Do NOT emit "running" here — it can race ahead of awaiting_approval and
        // hide the permission card while the backend blocks on approval.
        const argsJson = executionArgs.get(chunk.toolCallId) || JSON.stringify(chunk.input ?? {});
        toolArgsAcc.set(chunk.toolCallId, argsJson);
        updateLedger(chunk.toolCallId, {
          toolName: chunk.toolName,
          toolArgs: argsJson,
          status: 'streaming',
        });
        safeSend('agent:stream:tool', {
          requestId,
          toolCallId: chunk.toolCallId,
          toolName: chunk.toolName,
          toolArgs: argsJson,
          status: 'streaming',
        });
        break;
      }

      case 'tool-output-available': {
        if (deniedIds.has(chunk.toolCallId)) break;
        const preview = typeof chunk.output === 'string'
          ? chunk.output
          : JSON.stringify(chunk.output ?? {});
        const errorMessage = failureFromToolOutput(chunk.output);
        const status = errorMessage ? 'error' : 'done';
        updateLedger(chunk.toolCallId, {
          status,
          resultPreview: preview,
          ...(errorMessage ? { message: errorMessage } : {}),
        });
        safeSend('agent:stream:tool', {
          requestId,
          toolCallId: chunk.toolCallId,
          toolName: chunk.toolName,
          toolArgs: toolArgsAcc.get(chunk.toolCallId) || '',
          status,
          resultPreview: preview,
          ...(errorMessage ? { message: errorMessage } : {}),
        });
        break;
      }

      case 'tool-output-error': {
        const message = chunk.errorText || 'Tool error';
        updateLedger(chunk.toolCallId, {
          status: 'error',
          message,
        });
        safeSend('agent:stream:tool', {
          requestId,
          toolCallId: chunk.toolCallId,
          toolName: chunk.toolName,
          toolArgs: toolArgsAcc.get(chunk.toolCallId) || '',
          status: 'error',
          message,
        });
        break;
      }

      case 'error':
        safeSend('chat:stream:error', {
          requestId,
          message: chunk.errorText || 'Stream error',
        });
        break;

      default:
        break;
    }
  };

  const getToolSnapshot = () => [...toolLedger.values()];
  const markDenied = (toolCallId) => deniedIds.add(toolCallId);

  const setToolArgs = (toolCallId, toolName, toolArgs) => {
    executionArgs.set(toolCallId, toolArgs);
    toolArgsAcc.set(toolCallId, toolArgs);
    updateLedger(toolCallId, { toolName, toolArgs });
  };
  return { handleChunk, getToolSnapshot, toolLedger, markDenied, setToolArgs };
}

module.exports = { createChunkBridge };
