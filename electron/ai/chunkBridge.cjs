/**
 * Bridge AI SDK UIMessageChunk stream to DesktopFairy IPC events.
 * Maintains a tool ledger for terminal reconciliation on stream:done.
 */
function createChunkBridge({ requestId, safeSend, onToolEvent }) {
  const toolLedger = new Map();
  const toolArgsAcc = new Map();

  const updateLedger = (toolCallId, patch) => {
    if (!toolCallId) return;
    const prev = toolLedger.get(toolCallId) || { toolCallId };
    toolLedger.set(toolCallId, { ...prev, ...patch });
  };

  const handleChunk = (chunk) => {
    if (!chunk || !chunk.type) return;

    switch (chunk.type) {
      case 'text-delta':
        if (chunk.delta) {
          safeSend('chat:stream:chunk', { requestId, delta: chunk.delta });
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
        const argsJson = JSON.stringify(chunk.input ?? {});
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
        const preview = typeof chunk.output === 'string'
          ? chunk.output
          : JSON.stringify(chunk.output ?? {});
        updateLedger(chunk.toolCallId, {
          status: 'done',
          resultPreview: preview,
        });
        safeSend('agent:stream:tool', {
          requestId,
          toolCallId: chunk.toolCallId,
          toolName: chunk.toolName,
          toolArgs: toolArgsAcc.get(chunk.toolCallId) || '',
          status: 'done',
          resultPreview: preview,
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

  return { handleChunk, getToolSnapshot, toolLedger };
}

module.exports = { createChunkBridge };
