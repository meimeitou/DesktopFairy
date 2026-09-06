import { describe, it, expect } from "vitest";
import {
  estimateTokens,
  resolveContextWindow,
  sendTokenBudget,
  estimateContextUsage,
  trimMessagesForTokenBudget,
  estimateMessageTokens,
} from "./contextUsage";
import { trimMessagesForApi, type ChatMsg } from "./chatMessages";

function makeMsg(
  role: "user" | "assistant",
  content: string,
  overrides: Partial<ChatMsg> = {},
): ChatMsg {
  return {
    id: `msg_${Math.random().toString(36).slice(2)}`,
    role,
    content,
    ...overrides,
  };
}

describe("contextUsage", () => {
  describe("estimateTokens", () => {
    it("counts CJK roughly 1 char per token", () => {
      expect(estimateTokens("你好世界")).toBe(4);
    });

    it("counts ASCII roughly 4 chars per token", () => {
      expect(estimateTokens("hello world")).toBe(3);
    });

    it("mixes CJK and ASCII", () => {
      expect(estimateTokens("hi你好")).toBe(3);
    });
  });

  describe("resolveContextWindow", () => {
    it("returns known model window", () => {
      expect(resolveContextWindow("gpt-4o-mini")).toBe(128_000);
    });

    it("defaults unknown models to 128k", () => {
      expect(resolveContextWindow("unknown-model-xyz")).toBe(128_000);
    });
  });

  describe("sendTokenBudget", () => {
    it("uses 80% of window", () => {
      expect(sendTokenBudget(100_000)).toBe(80_000);
    });
  });

  describe("trimMessagesForTokenBudget", () => {
    it("keeps at least one message", () => {
      const msgs = [makeMsg("user", "x".repeat(10_000))];
      const { kept } = trimMessagesForTokenBudget(msgs, { maxTokens: 10 });
      expect(kept).toHaveLength(1);
    });

    it("discards oldest when over budget", () => {
      const msgs = [
        makeMsg("user", "old message here"),
        makeMsg("assistant", "reply"),
        makeMsg("user", "new message here"),
      ];
      const { kept, discardedCount } = trimMessagesForTokenBudget(msgs, {
        maxTokens: estimateMessageTokens(msgs[1]) + estimateMessageTokens(msgs[2]) + 2,
      });
      expect(discardedCount).toBeGreaterThanOrEqual(1);
      expect(kept[0].content).not.toBe("old message here");
    });
  });

  describe("estimateContextUsage", () => {
    it("computes percent against full window", () => {
      const result = estimateContextUsage({
        messages: [makeMsg("user", "hello")],
        input: "draft",
        contextWindow: 1000,
        systemTokens: 100,
      });
      expect(result.percent).toBeGreaterThan(0);
      expect(result.percent).toBeLessThan(100);
      expect(result.isEstimate).toBe(true);
    });

    it("uses server prompt tokens when available", () => {
      const msgs = [
        makeMsg("user", "first"),
        makeMsg("assistant", "answer"),
      ];
      const baseline = estimateContextUsage({
        messages: [msgs[0]],
        input: "first",
        contextWindow: 128_000,
      });
      const calibrated = estimateContextUsage({
        messages: msgs,
        contextWindow: 128_000,
        lastPromptTokens: baseline.used,
        lastCompletionTokens: 40,
        lastUsageMessageCount: 1,
      });
      expect(calibrated.lastServerPromptTokens).toBe(baseline.used);
      expect(calibrated.used).toBeGreaterThanOrEqual(baseline.used + 40);
    });

    it("ignores stale server usage after context clear", () => {
      const afterClear = [makeMsg("user", "new question")];
      const result = estimateContextUsage({
        messages: afterClear,
        contextWindow: 128_000,
        systemTokens: 2_000,
        lastPromptTokens: 80_000,
        lastCompletionTokens: 1_200,
        lastUsageMessageCount: 40,
      });
      expect(result.lastServerPromptTokens).toBeUndefined();
      expect(result.used).toBeLessThan(10_000);
      expect(result.breakdown.history).toBe(estimateMessageTokens(afterClear[0]));
    });

    it("does not count messages above a clear separator", () => {
      const msgs = [
        makeMsg("user", "old conversation ".repeat(80)),
        makeMsg("assistant", "old reply ".repeat(80)),
        makeMsg("user", "", { type: "clear" }),
        makeMsg("user", "hello after clear"),
      ];
      const result = estimateContextUsage({
        messages: msgs,
        contextWindow: 128_000,
        systemTokens: 2_000,
        lastPromptTokens: 80_000,
        lastUsageMessageCount: 2,
      });
      expect(result.breakdown.history).toBe(
        estimateMessageTokens(msgs[3]),
      );
      expect(result.used).toBe(2_000 + estimateMessageTokens(msgs[3]));
      expect(result.lastServerPromptTokens).toBeUndefined();
    });

    it("ignores server usage when current history is empty", () => {
      const result = estimateContextUsage({
        messages: [],
        contextWindow: 128_000,
        systemTokens: 2_000,
        lastPromptTokens: 80_000,
        lastUsageMessageCount: 0,
      });
      expect(result.lastServerPromptTokens).toBeUndefined();
      expect(result.used).toBe(2_000);
      expect(result.breakdown.history).toBe(0);
    });
  });
});

describe("trimMessagesForApi", () => {
  it("returns all messages when under token budget", () => {
    const msgs = [makeMsg("user", "hello"), makeMsg("assistant", "hi")];
    expect(
      trimMessagesForApi(msgs, { maxTokens: 10_000 }),
    ).toHaveLength(2);
  });

  it("trims oldest messages when over token budget", () => {
    const msgs: ChatMsg[] = [];
    for (let i = 0; i < 20; i++) {
      msgs.push(makeMsg("user", `message number ${i} `.repeat(50)));
    }
    const result = trimMessagesForApi(msgs, { maxTokens: 500 });
    expect(result.length).toBeLessThan(msgs.length);
    expect(result[result.length - 1].content).toContain("19");
  });

  it("always keeps at least one message", () => {
    const msgs = [makeMsg("user", "x".repeat(50_000))];
    const result = trimMessagesForApi(msgs, { maxTokens: 10 });
    expect(result).toHaveLength(1);
  });

  it("respects reserve tokens for draft content", () => {
    const msgs = [
      makeMsg("user", "old"),
      makeMsg("user", "recent"),
    ];
    const full = trimMessagesForApi(msgs, { maxTokens: 500 });
    const reserved = trimMessagesForApi(msgs, {
      maxTokens: 500,
      reserveTokens: 400,
    });
    expect(reserved.length).toBeLessThanOrEqual(full.length);
  });

  it("handles empty array", () => {
    expect(trimMessagesForApi([], { maxTokens: 1000 })).toHaveLength(0);
  });
});
