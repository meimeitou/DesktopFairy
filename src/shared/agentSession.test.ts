import { describe, expect, it } from "vitest";
import {
  applyChunks,
  applyCitations,
  applyDone,
  applyError,
  applyKnowledgeError,
  applySendFail,
  applyToolEvent,
  beginContinue,
  beginSend,
  clearMessages,
  emptyAgentSessionState,
  toggleClearMarker,
  type AgentSessionState,
} from "./agentSession";
import type { ChatMsg } from "./chatMessages";

function userMsg(content: string): ChatMsg {
  return { id: `u_${content}`, role: "user", content, timestamp: 1 };
}

function assistantMsg(content: string, overrides: Partial<ChatMsg> = {}): ChatMsg {
  return { id: `a_${content}`, role: "assistant", content, timestamp: 2, ...overrides };
}

function seeded(messages: ChatMsg[]): AgentSessionState {
  return { ...emptyAgentSessionState(), messages, sessionReady: true };
}

describe("beginSend", () => {
  it("appends user message + empty assistant placeholder and enters streaming", () => {
    const next = beginSend(emptyAgentSessionState(), {
      requestId: "r1",
      userText: "你好",
    });
    expect(next.streaming).toBe(true);
    expect(next.requestId).toBe("r1");
    expect(next.messages.map((m) => m.role)).toEqual(["user", "assistant"]);
    expect(next.messages[1].content).toBe("");
    expect(next.input).toBe("");
  });

  it("compact send skips the user bubble", () => {
    const next = beginSend(emptyAgentSessionState(), {
      requestId: "r1",
      userText: "压缩",
      isCompact: true,
    });
    expect(next.messages.map((m) => m.role)).toEqual(["assistant"]);
  });

  it("resend keeps the input draft", () => {
    const state = { ...emptyAgentSessionState(), input: "草稿" };
    const next = beginSend(state, {
      requestId: "r1",
      userText: "重发",
      keepInput: true,
    });
    expect(next.input).toBe("草稿");
  });
});

describe("applyChunks reasoning routing", () => {
  it("reasoning lands on the FIRST assistant reply (tool-turn alignment)", () => {
    const state = seeded([
      userMsg("q"),
      assistantMsg("turn1"),
      assistantMsg("turn2"),
    ]);
    const next = applyChunks(state, [], "思考中");
    expect(next.messages[1].reasoning).toBe("思考中");
    expect(next.messages[2].reasoning).toBeUndefined();
  });

  it("reasoning accumulates across chunk flushes", () => {
    const state = seeded([userMsg("q"), assistantMsg("")]);
    const once = applyChunks(state, [], "a");
    const twice = applyChunks(once, [], "b");
    expect(twice.messages[1].reasoning).toBe("ab");
  });

  it("text deltas apply via part identity", () => {
    const state = seeded([userMsg("q"), assistantMsg("")]);
    const next = applyChunks(state, [{ partId: "p1", text: "he" }], "");
    const next2 = applyChunks(next, [{ partId: "p1", text: "llo" }], "");
    expect(next2.messages[1].content).toBe("hello");
  });
});

describe("applyDone", () => {
  it("clears streaming and records usage", () => {
    const state = beginSend(emptyAgentSessionState(), {
      requestId: "r1",
      userText: "q",
    });
    const { state: next, meta } = applyDone(
      { ...state, messages: [...state.messages.slice(0, -1), assistantMsg("answer")] },
      { requestId: "r1", usage: { promptTokens: 10, completionTokens: 5 } },
    );
    expect(next.streaming).toBe(false);
    expect(next.requestId).toBeNull();
    expect(next.lastPromptTokens).toBe(10);
    expect(next.lastUsageMessageCount).toBe(2);
    expect(meta.persist).toBe(true);
    expect(meta.maxTurnsReached).toBe(false);
  });

  it("compact done appends clear marker + summary and wipes usage", () => {
    const state = beginSend(emptyAgentSessionState(), {
      requestId: "r1",
      userText: "q",
      isCompact: true,
    });
    const withAnswer = {
      ...state,
      messages: [...state.messages.slice(0, -1), assistantMsg("摘要正文")],
      lastPromptTokens: 99,
    };
    const { state: next, meta } = applyDone(
      withAnswer,
      { requestId: "r1" },
      { isCompact: true },
    );
    const tail = next.messages.slice(-2);
    expect(tail[0].type).toBe("clear");
    expect(tail[1].content).toContain("[上下文摘要]");
    expect(tail[1].content).toContain("摘要正文");
    expect(next.lastPromptTokens).toBeUndefined();
    expect(meta.compact).toBe(true);
  });

  it("compact done with empty summary does not insert markers", () => {
    const state = beginSend(emptyAgentSessionState(), {
      requestId: "r1",
      userText: "q",
      isCompact: true,
    });
    const { state: next } = applyDone(state, { requestId: "r1" }, { isCompact: true });
    expect(next.messages.some((m) => m.type === "clear")).toBe(false);
  });

  it("aborted done keeps messages, flags persist + compact meta", () => {
    const state = beginSend(emptyAgentSessionState(), {
      requestId: "r1",
      userText: "q",
    });
    const { state: next, meta } = applyDone(
      state,
      { requestId: "r1", aborted: true },
      { isCompact: true },
    );
    expect(next.streaming).toBe(false);
    expect(meta.persist).toBe(true);
    expect(meta.compact).toBe(true);
  });

  it("maxTurnsReached surfaces in meta", () => {
    const state = beginSend(emptyAgentSessionState(), {
      requestId: "r1",
      userText: "q",
    });
    const { meta } = applyDone(state, { requestId: "r1", maxTurnsReached: true });
    expect(meta.maxTurnsReached).toBe(true);
  });
});

describe("applyError", () => {
  it("marks the last assistant reply as failed", () => {
    const state = seeded([userMsg("q"), assistantMsg("")]);
    const { state: next, meta } = applyError(state, {
      requestId: "r1",
      message: "boom",
    });
    expect(next.messages[1].error).toBe(true);
    expect(next.messages[1].content).toBe("请求失败：boom");
    expect(next.streaming).toBe(false);
    expect(meta.persist).toBe(true);
  });

  it("keeps existing content when erroring", () => {
    const state = seeded([userMsg("q"), assistantMsg("部分回复")]);
    const { state: next } = applyError(state, {
      requestId: "r1",
      message: "boom",
    });
    expect(next.messages[1].content).toBe("部分回复");
    expect(next.messages[1].error).toBe(true);
  });
});

describe("applyToolEvent", () => {
  it("inserts a tool row before the trailing placeholder", () => {
    const state = beginSend(emptyAgentSessionState(), {
      requestId: "r1",
      userText: "q",
    });
    const next = applyToolEvent(state, {
      requestId: "r1",
      toolCallId: "tc1",
      toolName: "bash",
      status: "running",
    });
    const toolRows = next.messages.filter((m) => m.type === "tool");
    expect(toolRows).toHaveLength(1);
    expect(toolRows[0].toolName).toBe("bash");
    // 工具行插在占位气泡之前，占位保留给后续文字。
    expect(next.messages.map((m) => m.role)).toEqual(["user", "assistant", "assistant"]);
    expect(next.messages[1].type).toBe("tool");
  });
});

describe("applyCitations / applyKnowledgeError", () => {
  it("citations attach to the last assistant reply", () => {
    const state = seeded([userMsg("q"), assistantMsg("a")]);
    const next = applyCitations(state, {
      requestId: "r1",
      citations: [
        { baseId: "b", itemId: "i", baseName: "库", sourceName: "条目", text: "" },
      ],
    });
    expect(next.messages[1].knowledgeCitations).toHaveLength(1);
  });

  it("knowledge errors accumulate as warnings", () => {
    const state = seeded([userMsg("q"), assistantMsg("a")]);
    const once = applyKnowledgeError(state, {
      requestId: "r1",
      errors: [{ kind: "vector", message: "x" }],
    });
    const twice = applyKnowledgeError(once, {
      requestId: "r1",
      errors: [{ kind: "unknown", message: "y" }],
    });
    expect(twice.messages[1].knowledgeWarning).toContain("向量库检索失败：x");
    expect(twice.messages[1].knowledgeWarning).toContain("知识库预注入失败：y");
  });
});

describe("applySendFail", () => {
  it("owner request: marks error and stops streaming", () => {
    const state = beginSend(emptyAgentSessionState(), {
      requestId: "r1",
      userText: "q",
    });
    const next = applySendFail(state, "r1", "该话题已有进行中的会话");
    expect(next.streaming).toBe(false);
    expect(next.requestId).toBeNull();
    expect(next.messages.at(-1)?.error).toBe(true);
  });

  it("non-owner request: only appends the error bubble", () => {
    const state = beginSend(emptyAgentSessionState(), {
      requestId: "r2",
      userText: "q",
    });
    const next = applySendFail(state, "r1", "blocked");
    expect(next.streaming).toBe(true);
    expect(next.requestId).toBe("r2");
  });
});

describe("toggleClearMarker / clearMessages / beginContinue", () => {
  it("clear marker toggles on and off, wiping usage", () => {
    const state = seeded([userMsg("q"), assistantMsg("a")]);
    const withUsage = {
      ...state,
      lastPromptTokens: 5,
      lastUsageMessageCount: 2,
    };
    const marked = toggleClearMarker(withUsage);
    expect(marked.messages.at(-1)?.type).toBe("clear");
    expect(marked.lastPromptTokens).toBeUndefined();
    const unmarked = toggleClearMarker(marked);
    expect(unmarked.messages.some((m) => m.type === "clear")).toBe(false);
  });

  it("clearMessages resets but keeps sessionReady", () => {
    const next = clearMessages({ ...seeded([userMsg("q")]), input: "x" });
    expect(next.messages).toEqual([]);
    expect(next.input).toBe("");
    expect(next.sessionReady).toBe(true);
  });

  it("beginContinue appends only an assistant placeholder", () => {
    const state = seeded([userMsg("q"), assistantMsg("a")]);
    const next = beginContinue(state, "r9");
    expect(next.messages).toHaveLength(3);
    expect(next.messages.at(-1)?.role).toBe("assistant");
    expect(next.messages.at(-1)?.content).toBe("");
    expect(next.streaming).toBe(true);
  });
});
