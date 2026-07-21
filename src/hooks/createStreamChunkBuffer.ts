/** Coalesce high-frequency stream deltas into one flush per animation frame. */
export type StreamChunkFlush = (
  requestId: string,
  delta: string,
  reasoning: string,
) => void;

type PendingChunk = { delta: string; reasoning: string };

export function createStreamChunkBuffer(flush: StreamChunkFlush) {
  const pending = new Map<string, PendingChunk>();
  let rafId: number | null = null;

  const runFlush = () => {
    rafId = null;
    if (pending.size === 0) return;
    const entries = [...pending.entries()];
    pending.clear();
    for (const [requestId, chunk] of entries) {
      if (!chunk.delta && !chunk.reasoning) continue;
      flush(requestId, chunk.delta, chunk.reasoning);
    }
  };

  const schedule = () => {
    if (rafId != null) return;
    rafId = requestAnimationFrame(runFlush);
  };

  return {
    push(requestId: string, delta?: string, reasoning?: string) {
      const cur = pending.get(requestId) ?? { delta: "", reasoning: "" };
      if (typeof delta === "string" && delta) cur.delta += delta;
      if (typeof reasoning === "string" && reasoning) cur.reasoning += reasoning;
      pending.set(requestId, cur);
      schedule();
    },
    /** Flush one request immediately (before done/error). */
    flushRequest(requestId: string) {
      if (rafId != null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      const chunk = pending.get(requestId);
      pending.delete(requestId);
      if (chunk && (chunk.delta || chunk.reasoning)) {
        flush(requestId, chunk.delta, chunk.reasoning);
      }
      // Re-schedule remaining pending requests if any.
      if (pending.size > 0) schedule();
    },
    dispose() {
      if (rafId != null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      pending.clear();
    },
  };
}
