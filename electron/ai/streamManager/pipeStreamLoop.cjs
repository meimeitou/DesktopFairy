/**
 * Pipe UIMessageChunk stream — adapted from Cherry Studio pipeStreamLoop.ts
 */
async function pipeStreamLoop(stream, signal, { onChunk }) {
  const reader = stream.getReader();
  const onAbort = () => {
    void reader.cancel(signal.reason).catch(() => {});
  };
  if (signal.aborted) onAbort();
  else signal.addEventListener('abort', onAbort, { once: true });

  let streamErrorText;
  let threw;
  let lastFinishReason;
  const broadcastCompletedAt = { value: 0 };

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value?.type === 'error') streamErrorText ??= value.errorText;
      // UIMessageChunk 的 finish-step 不带 finishReason（toUIMessageStream 会丢掉）。
      // 整轮结束原因在 type==='finish' 上；fullStream 的 finish-step 仍可能自带。
      // 'tool-calls' 表示模型还要调工具，但 stopWhen（最大轮次）已经截断。
      if (
        (value?.type === 'finish' || value?.type === 'finish-step') &&
        value.finishReason
      ) {
        lastFinishReason = value.finishReason;
      }
      onChunk(value);
    }
    broadcastCompletedAt.value = Date.now();
  } catch (err) {
    threw = err;
    broadcastCompletedAt.value = Date.now();
  } finally {
    signal.removeEventListener('abort', onAbort);
    reader.releaseLock();
  }

  return { streamErrorText, threw, broadcastCompletedAt: broadcastCompletedAt.value, lastFinishReason };
}

module.exports = { pipeStreamLoop };
