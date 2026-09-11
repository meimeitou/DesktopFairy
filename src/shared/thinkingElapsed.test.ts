import { afterEach, describe, expect, it } from "vitest";
import {
  clampThinkingElapsed,
  formatThinkingLabel,
  isThinkingClockLive,
  resetThinkingClocks,
  syncThinkingClock,
  thinkingClockCount,
} from "./thinkingElapsed";

afterEach(() => {
  resetThinkingClocks();
});

describe("clampThinkingElapsed", () => {
  it("rejects Date.now()-0 unix-timestamp durations (screenshot 1788837301.8s)", () => {
    const now = 1_788_837_301_800;
    expect(clampThinkingElapsed(now - 0)).toBeNull();
    expect(formatThinkingLabel(false, clampThinkingElapsed(now))).not.toContain(
      "1788837301.8",
    );
  });

  it("accepts short elapsed and floors to 0.1s", () => {
    expect(clampThinkingElapsed(50)).toBe(100);
    expect(clampThinkingElapsed(2500)).toBe(2500);
  });
});

describe("syncThinkingClock", () => {
  it("does not invent a start time for completed historical messages", () => {
    const now = 1_788_837_301_800;
    expect(syncThinkingClock("hist", false, now)).toBeNull();
    expect(formatThinkingLabel(false, syncThinkingClock("hist", false, now))).toBe(
      "已深度思考",
    );
  });

  it("freezes elapsed when thinking ends and ignores later now", () => {
    const t0 = 1_000_000;
    expect(syncThinkingClock("m", true, t0)).toBe(100);
    const elapsed = syncThinkingClock("m", false, t0 + 2500);
    expect(elapsed).toBe(2500);
    expect(syncThinkingClock("m", false, t0 + 999_999)).toBe(2500);
    expect(formatThinkingLabel(false, elapsed)).toBe(
      "已深度思考（用时 2.5 秒）",
    );
  });

  it("keeps a live clock across remount-style re-reads", () => {
    const t0 = 5_000_000;
    syncThinkingClock("live", true, t0);
    expect(syncThinkingClock("live", true, t0 + 1200)).toBe(1200);
  });

  it("pauses during a gap and resumes without counting the gap", () => {
    const t0 = 10_000;
    expect(syncThinkingClock("m", true, t0)).toBe(100);
    expect(syncThinkingClock("m", false, t0 + 1000)).toBe(1000);
    expect(syncThinkingClock("m", true, t0 + 8000)).toBe(1000);
    expect(syncThinkingClock("m", true, t0 + 8500)).toBe(1500);
    expect(syncThinkingClock("m", false, t0 + 8500)).toBe(1500);
  });

  it("evicts oldest clocks past the cap", () => {
    for (let i = 0; i < 70; i++) {
      syncThinkingClock(`c${i}`, true, 1_000 + i);
      syncThinkingClock(`c${i}`, false, 1_100 + i);
    }
    expect(thinkingClockCount()).toBeLessThanOrEqual(64);
    expect(syncThinkingClock("c0", false, 9_000)).toBeNull();
    expect(syncThinkingClock("c69", false, 9_000)).toBe(100);
  });
});

describe("isThinkingClockLive", () => {
  const think = { id: "a1", content: "" };

  it("is live while streaming reasoning with no follow-up", () => {
    expect(isThinkingClockLive(true, think, [think])).toBe(true);
  });

  it("pauses while a later tool is in flight", () => {
    expect(
      isThinkingClockLive(true, think, [
        think,
        { id: "t1", type: "tool", toolStatus: "running" },
      ]),
    ).toBe(false);
  });

  it("resumes after the tool is done if no answer yet", () => {
    expect(
      isThinkingClockLive(true, think, [
        think,
        { id: "t1", type: "tool", toolStatus: "done" },
      ]),
    ).toBe(true);
  });

  it("pauses once a later assistant starts answering", () => {
    expect(
      isThinkingClockLive(true, think, [
        think,
        { id: "a2", role: "assistant", content: "答案" },
      ]),
    ).toBe(false);
  });
});
