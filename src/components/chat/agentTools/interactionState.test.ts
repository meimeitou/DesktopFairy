import { describe, expect, it } from "vitest";
import type { ChatMsg } from "../../../shared/chatMessages";
import {
  emptyQuestionDraft, getPendingInteractions, isInteractionCompleted, isQuestionAnswered,
  markInteractionCompleted, pruneQuestionDrafts, readQuestionDraft, saveQuestionDraft,
} from "./interactionState";

const tool: ChatMsg = { id: "tool", role: "assistant", type: "tool", content: "", timestamp: 1, toolName: "bash" };

describe("composer interaction queue", () => {
  it("only includes awaiting_approval and awaiting_input; excludes preparing questions and terminal history", () => {
    const messages: ChatMsg[] = [
      { ...tool, id: "done", toolStatus: "done" },
      { ...tool, id: "ask-preparing", toolName: "AskUserQuestion", toolStatus: "streaming" },
      { ...tool, id: "approval", toolStatus: "awaiting_approval", toolApprovalId: "a" },
      { ...tool, id: "ask", toolName: "AskUserQuestion", toolStatus: "awaiting_input", toolApprovalId: "b" },
      { ...tool, id: "cancelled", toolName: "AskUserQuestion", toolStatus: "error" },
      { ...tool, id: "denied", toolStatus: "denied" },
      { ...tool, id: "running", toolStatus: "running" },
      { ...tool, id: "not-tool", type: undefined, toolStatus: "awaiting_approval" },
    ];
    // Streaming AskUserQuestion ("ask-preparing") is intentionally excluded:
    // it has no approvalId yet, so blocking the composer for it would be premature.
    expect(getPendingInteractions(messages).map((msg) => msg.id)).toEqual(["approval", "ask"]);
    expect(getPendingInteractions(messages.map((msg) => ({ ...msg, toolStatus: "done" })))).toEqual([]);
  });

  it("restores ordinary answers and page per session and drops completed drafts", () => {
    const draft = { ...emptyQuestionDraft(), page: 1, otherText: { 目标: "本地" } };
    saveQuestionDraft("session-a", "ask-a", draft);
    saveQuestionDraft("session-a", "ask-b", { ...emptyQuestionDraft(), page: 2 });
    expect(readQuestionDraft("session-a", "ask-a")).toEqual(draft);
    expect(readQuestionDraft("session-b", "ask-a")).toEqual(emptyQuestionDraft());
    pruneQuestionDrafts("session-a", new Set(["ask-a"]));
    expect(readQuestionDraft("session-a", "ask-a")).toEqual(draft);
    expect(readQuestionDraft("session-a", "ask-b")).toEqual(emptyQuestionDraft());
    pruneQuestionDrafts("session-a", new Set());
    expect(readQuestionDraft("session-a", "ask-a")).toEqual(emptyQuestionDraft());
  });

  it("module-level completed markers survive prune until item leaves pending", () => {
    const SID = "session-completed-test";
    // Mark as completed while still pending (backend round-trip in progress).
    markInteractionCompleted(SID, "msg-1");
    expect(isInteractionCompleted(SID, "msg-1")).toBe(true);
    expect(isInteractionCompleted(SID, "msg-2")).toBe(false);
    // msg-1 still pending — marker is preserved.
    pruneQuestionDrafts(SID, new Set(["msg-1"]));
    expect(isInteractionCompleted(SID, "msg-1")).toBe(true);
    // msg-1 has left pending (backend confirmed) — marker is pruned.
    pruneQuestionDrafts(SID, new Set());
    expect(isInteractionCompleted(SID, "msg-1")).toBe(false);
  });

  it("requires a non-empty free answer, a selection, or valid other text", () => {
    const question = { question: "目标", options: [{ label: "本地" }] };
    expect(isQuestionAnswered(question, emptyQuestionDraft())).toBe(false);
    const draft = { ...emptyQuestionDraft(), selected: { 目标: ["本地"] } };
    expect(isQuestionAnswered(question, draft)).toBe(true);
    const other = { ...draft, otherSelected: { 目标: true }, otherText: { 目标: "  " } };
    expect(isQuestionAnswered(question, other)).toBe(false);
    expect(isQuestionAnswered(question, { ...other, otherText: { 目标: "远程" } })).toBe(true);
    expect(isQuestionAnswered({ ...question, options: [] }, draft)).toBe(false);
    expect(isQuestionAnswered({ ...question, options: [] }, { ...draft, otherText: { 目标: "本地" } })).toBe(true);
  });
});
