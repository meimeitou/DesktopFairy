import { describe, expect, it } from "vitest";
import {
  buildMessageListItems,
  messageListStickKey,
  reuseStableMessageListItems,
} from "./messageListItems";
import type { ChatMsg } from "../../shared/chatMessages";

describe("buildMessageListItems", () => {
  it("batches consecutive tool messages", () => {
    const messages: ChatMsg[] = [
      { id: "u1", role: "user", content: "hi", timestamp: 1 },
      {
        id: "t1",
        role: "assistant",
        type: "tool",
        content: "",
        toolName: "Bash",
        timestamp: 2,
      },
      {
        id: "t2",
        role: "assistant",
        type: "tool",
        content: "",
        toolName: "Read",
        timestamp: 3,
      },
      { id: "a1", role: "assistant", content: "done", timestamp: 4 },
    ];
    const items = buildMessageListItems(messages);
    expect(items).toHaveLength(3);
    expect(items[0]).toMatchObject({ kind: "message", id: "u1" });
    expect(items[1]).toMatchObject({ kind: "tools", id: "t1" });
    if (items[1].kind === "tools") {
      expect(items[1].tools).toHaveLength(2);
    }
    expect(items[2]).toMatchObject({ kind: "message", id: "a1" });
  });

  it("isolates AskUserQuestion into its own batch", () => {
    const ask: ChatMsg = {
      id: "t0",
      role: "assistant",
      type: "tool",
      content: "",
      toolName: "AskUserQuestion",
      timestamp: 1,
    };
    const bash: ChatMsg = {
      id: "t1",
      role: "assistant",
      type: "tool",
      content: "",
      toolName: "Bash",
      timestamp: 2,
    };
    const items = buildMessageListItems([ask, bash]);
    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({ kind: "tools", id: "t0" });
    if (items[0].kind === "tools") expect(items[0].tools).toHaveLength(1);
    expect(items[1]).toMatchObject({ kind: "tools", id: "t1" });
  });

  it("builds a stable stick key from last message", () => {
    const messages: ChatMsg[] = [
      { id: "a1", role: "assistant", content: "hello", timestamp: 1 },
    ];
    expect(messageListStickKey(messages)).toBe("a1:5:0:1");
    expect(messageListStickKey([])).toBe("empty");
  });
});

describe("reuseStableMessageListItems", () => {
  it("reuses tools item when ChatMsg refs are unchanged", () => {
    const t1: ChatMsg = {
      id: "t1",
      role: "assistant",
      type: "tool",
      content: "",
      toolName: "Bash",
      timestamp: 1,
    };
    const t2: ChatMsg = {
      id: "t2",
      role: "assistant",
      type: "tool",
      content: "",
      toolName: "Read",
      timestamp: 2,
    };
    const a1: ChatMsg = {
      id: "a1",
      role: "assistant",
      content: "hi",
      timestamp: 3,
    };
    const prev = buildMessageListItems([t1, t2, a1]);
    const nextBuilt = buildMessageListItems([
      t1,
      t2,
      { ...a1, content: "hi!" },
    ]);
    const stable = reuseStableMessageListItems(nextBuilt, prev);
    expect(stable[0]).toBe(prev[0]);
    expect(stable[1]).not.toBe(prev[1]);
  });
});
