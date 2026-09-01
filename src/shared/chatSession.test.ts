import { describe, it, expect } from "vitest";
import {
  buildChatSession,
  normalizeChatSession,
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
