import { describe, it, expect } from "vitest";
import {
  buildChatSession,
  normalizeChatSession,
  normalizeChatTopicsStore,
  createChatTopic,
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

describe("normalizeChatTopicsStore", () => {
  it("backfills agentId with default and chatMode with normal", () => {
    const store = normalizeChatTopicsStore({
      topics: [{ id: "t1", name: "旧会话", createdAt: 1, orderKey: 1 }],
    });
    expect(store.topics[0].agentId).toBe("personal-assistant");
    expect(store.topics[0].chatMode).toBe("normal");
  });

  it("keeps existing agentId/chatMode and honors custom defaultAgentId", () => {
    const store = normalizeChatTopicsStore(
      {
        topics: [
          { id: "t1", name: "a", createdAt: 1, agentId: "custom", chatMode: "plan" },
          { id: "t2", name: "b", createdAt: 2 },
        ],
      },
      "terminal-assistant",
    );
    expect(store.topics[0].agentId).toBe("custom");
    expect(store.topics[0].chatMode).toBe("plan");
    expect(store.topics[1].agentId).toBe("terminal-assistant");
  });

  it("drops invalid chatMode values", () => {
    const store = normalizeChatTopicsStore({
      topics: [{ id: "t1", name: "a", createdAt: 1, chatMode: "bogus" }],
    });
    expect(store.topics[0].chatMode).toBe("normal");
  });
});

describe("createChatTopic", () => {
  it("assigns agentId and chatMode defaults", () => {
    const topic = createChatTopic();
    expect(topic.agentId).toBe("personal-assistant");
    expect(topic.chatMode).toBe("normal");
    expect(topic.id).toBeTruthy();
  });

  it("accepts explicit agentId", () => {
    const topic = createChatTopic("t-1", "工作", "terminal-assistant");
    expect(topic.id).toBe("t-1");
    expect(topic.name).toBe("工作");
    expect(topic.agentId).toBe("terminal-assistant");
  });
});
