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

describe("normalizeChatTopicsStore host state", () => {
  it("preserves host state and activeHostId on host topics", () => {
    const store = normalizeChatTopicsStore({
      activeId: "t1",
      activeHostId: "h-topic-1",
      topics: [
        { id: "t1", name: "chat", createdAt: 1 },
        {
          id: "h-topic-1",
          name: "host",
          createdAt: 2,
          host: {
            hostId: "h1",
            grants: { h1: "root@1.2.3.4:22", h2: 42 },
            cwdByHost: {
              h1: { identity: "root@1.2.3.4:22", path: "/var/log" },
              bad: "not-an-object",
            },
          },
        },
      ],
    });
    expect(store.activeHostId).toBe("h-topic-1");
    const hostTopic = store.topics.find((t) => t.id === "h-topic-1");
    expect(hostTopic?.host?.hostId).toBe("h1");
    expect(hostTopic?.host?.grants).toEqual({ h1: "root@1.2.3.4:22" });
    expect(hostTopic?.host?.cwdByHost).toEqual({
      h1: { identity: "root@1.2.3.4:22", path: "/var/log" },
    });
  });

  it("drops malformed host state entirely and nulls invalid activeHostId", () => {
    const store = normalizeChatTopicsStore({
      activeHostId: "not-a-topic",
      topics: [
        { id: "t1", name: "a", createdAt: 1 },
        { id: "t2", name: "b", createdAt: 2, host: { hostId: "" } },
        { id: "t3", name: "c", createdAt: 3, host: "garbage" },
      ],
    });
    expect(store.activeHostId).toBeNull();
    expect(store.topics[1].host).toBeUndefined();
    expect(store.topics[2].host).toBeUndefined();
  });
});
