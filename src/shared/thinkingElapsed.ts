/** Cap so Date.now()-0 (unix epoch) cannot be shown as "thinking time". */
const MAX_ELAPSED_MS = 24 * 60 * 60 * 1000;
const MIN_ELAPSED_MS = 100;
/** ponytail: 64 live/frozen clocks; persist elapsed on ChatMsg to drop the Map. */
const MAX_CLOCKS = 64;

const IN_FLIGHT_TOOL = new Set([
  "streaming",
  "running",
  "awaiting_approval",
  "awaiting_input",
]);

type ThinkingClock = { startedAt: number | null; accumulatedMs: number };

type ClockMsg = {
  id: string;
  role?: string;
  type?: string;
  content?: string;
  toolStatus?: string;
};

const clocks = new Map<string, ThinkingClock>();

export function clampThinkingElapsed(ms: number): number | null {
  if (!Number.isFinite(ms) || ms < 0 || ms > MAX_ELAPSED_MS) return null;
  return Math.max(ms, MIN_ELAPSED_MS);
}

function remember(msgId: string, clock: ThinkingClock): void {
  clocks.delete(msgId);
  clocks.set(msgId, clock);
  while (clocks.size > MAX_CLOCKS) {
    const oldest = clocks.keys().next().value;
    if (oldest == null || oldest === msgId) break;
    clocks.delete(oldest);
  }
}

/**
 * Per-message thinking timer. `live` starts or resumes; `false` pauses
 * (keeps accumulated so a later resume excludes the paused gap).
 * Missing clock + not live → null (historical / remounted bubbles must not use epoch).
 */
export function syncThinkingClock(
  msgId: string,
  live: boolean,
  now = Date.now(),
): number | null {
  let clock = clocks.get(msgId);
  if (live) {
    if (!clock) clock = { startedAt: now, accumulatedMs: 0 };
    else if (clock.startedAt == null) clock.startedAt = now;
    remember(msgId, clock);
    return clampThinkingElapsed(clock.accumulatedMs + (now - clock.startedAt));
  }
  if (!clock) return null;
  if (clock.startedAt != null) {
    clock.accumulatedMs += now - clock.startedAt;
    clock.startedAt = null;
  }
  const ms = clampThinkingElapsed(clock.accumulatedMs);
  if (ms == null) {
    clocks.delete(msgId);
    return null;
  }
  clock.accumulatedMs = ms;
  remember(msgId, clock);
  return ms;
}

/**
 * Tick only while this bubble is the live reasoning host.
 * In-flight tools or a later assistant answer must not add to thinking time.
 */
export function isThinkingClockLive(
  streaming: boolean,
  msg: Pick<ClockMsg, "id" | "content">,
  messages: ClockMsg[],
): boolean {
  if (!streaming || !!msg.content) return false;
  const start = messages.findIndex((m) => m.id === msg.id);
  if (start < 0) return true;
  for (let i = start + 1; i < messages.length; i++) {
    const m = messages[i];
    if (m.type === "tool" && m.toolStatus && IN_FLIGHT_TOOL.has(m.toolStatus)) {
      return false;
    }
    if (m.role === "assistant" && m.type !== "tool" && m.content) return false;
  }
  return true;
}

export function formatThinkingLabel(
  isThinking: boolean,
  elapsedMs: number | null,
): string {
  if (elapsedMs == null) return isThinking ? "思考中…" : "已深度思考";
  const sec = (elapsedMs / 1000).toFixed(1);
  return isThinking
    ? `思考中（用时 ${sec} 秒）`
    : `已深度思考（用时 ${sec} 秒）`;
}

/** Test-only. */
export function resetThinkingClocks(): void {
  clocks.clear();
}

/** Test-only. */
export function thinkingClockCount(): number {
  return clocks.size;
}
