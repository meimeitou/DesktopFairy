/** Coalesce high-frequency stream deltas into one flush per animation frame. */
export type StreamTextPart = { partId?: string; text: string };

export type StreamChunkFlush = (
  requestId: string,
  parts: StreamTextPart[],
  reasoning: string,
) => void;

type PendingChunk = { parts: StreamTextPart[]; reasoning: string };

export function createStreamChunkBuffer(flush: StreamChunkFlush) {
  const pending = new Map<string, PendingChunk>();
  let rafId: number | null = null;

  const emit = (requestId: string, chunk: PendingChunk) => {
    if (chunk.parts.length === 0 && !chunk.reasoning) return;
    flush(requestId, chunk.parts, chunk.reasoning);
  };

  const runFlush = () => {
    rafId = null;
    if (pending.size === 0) return;
    const entries = [...pending.entries()];
    pending.clear();
    for (const [requestId, chunk] of entries) emit(requestId, chunk);
  };

  const schedule = () => {
    if (rafId != null) return;
    rafId = requestAnimationFrame(runFlush);
  };

  return {
    push(
      requestId: string,
      partId?: string,
      delta?: string,
      reasoning?: string,
    ) {
      const cur = pending.get(requestId) ?? { parts: [], reasoning: "" };
      if (typeof delta === "string" && delta) {
        const lastPart = cur.parts[cur.parts.length - 1];
        if (lastPart && lastPart.partId === partId) {
          lastPart.text += delta;
        } else {
          cur.parts.push({ partId, text: delta });
        }
      }
      if (typeof reasoning === "string" && reasoning) cur.reasoning += reasoning;
      pending.set(requestId, cur);
      schedule();
    },
    /** Flush one request immediately (before done/error/tool events). */
    flushRequest(requestId: string) {
      if (rafId != null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      const chunk = pending.get(requestId);
      pending.delete(requestId);
      if (chunk) emit(requestId, chunk);
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
