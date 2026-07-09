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
  const broadcastCompletedAt = { value: 0 };

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value?.type === 'error') streamErrorText ??= value.errorText;
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

  return { streamErrorText, threw, broadcastCompletedAt: broadcastCompletedAt.value };
}

module.exports = { pipeStreamLoop };
