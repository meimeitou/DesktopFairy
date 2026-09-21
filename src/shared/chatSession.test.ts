import { describe, it, expect } from "vitest";
import {
  buildChatSession,
  normalizeChatSession,
  normalizeSessionModel,
} from "./chatSession";

describe("chatSession lastServerUsage", () => {
  it("round-trips server usage through build and normalize", () => {
    const session = buildChatSession([], "", [], {
      promptTokens: 104_000,
      completionTokens: 512,
      messageCount: 12,
    });
    const restored = normalizeChatSession(session);
    expect(restored.lastServerUsage).toEqual({
      promptTokens: 104_000,
      completionTokens: 512,
      messageCount: 12,
    });
  });

  it("ignores invalid lastServerUsage", () => {
    const restored = normalizeChatSession({
      version: 2,
      messages: [],
      lastServerUsage: { promptTokens: 0, messageCount: 1 },
    });
    expect(restored.lastServerUsage).toBeUndefined();
  });
});

describe("chatSession sessionModel", () => {
  it("round-trips a session-locked model through build and normalize", () => {
    const session = buildChatSession(
      [],
      "",
      [],
      undefined,
      "openai::gpt-4o-mini",
    );
    const restored = normalizeChatSession(session);
    expect(restored.sessionModel).toBe("openai::gpt-4o-mini");
  });

  it("omits sessionModel when absent (legacy v2 files)", () => {
    const restored = normalizeChatSession({ version: 2, messages: [] });
    expect(restored.sessionModel).toBeUndefined();
  });

  it("drops malformed sessionModel", () => {
    const restored = normalizeChatSession({
      version: 2,
      messages: [],
      sessionModel: "garbage-no-separator",
    });
    expect(restored.sessionModel).toBeUndefined();
  });
});

describe("normalizeSessionModel", () => {
  it("accepts compound keys and rejects everything else", () => {
    expect(normalizeSessionModel("p::m")).toBe("p::m");
    expect(normalizeSessionModel("  p::m  ")).toBe("p::m");
    expect(normalizeSessionModel("")).toBe("");
    expect(normalizeSessionModel(undefined)).toBe("");
    expect(normalizeSessionModel("just-model")).toBe("");
    expect(normalizeSessionModel(42)).toBe("");
  });
});
