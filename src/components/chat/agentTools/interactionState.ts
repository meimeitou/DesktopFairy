import type { ChatMsg } from "../../../shared/chatMessages";
import { type QuestionItem } from "./askUserQuestionParse";

/**
 * Messages that need user input right now.
 * Intentionally excludes AskUserQuestion in `streaming`/`running` state: those
 * are still preparing — there is nothing actionable yet, so they must not lock
 * the composer or appear in the interaction panel before the question is ready.
 */
export function getPendingInteractions(messages: ChatMsg[]): ChatMsg[] {
  return messages.filter((msg) => msg.type === "tool" && (
    msg.toolStatus === "awaiting_approval" || msg.toolStatus === "awaiting_input"
  ));
}

export interface QuestionDraft {
  page: number;
  selected: Record<string, string[]>;
  otherSelected: Record<string, boolean>;
  otherText: Record<string, string>;
}

export function emptyQuestionDraft(): QuestionDraft {
  return { page: 0, selected: {}, otherSelected: {}, otherText: {} };
}

// Renderer memory only. Keyed by surface/session/message, surviving keyed composers.
// Passwords and their source choices are deliberately kept out of this cache.
const drafts = new Map<string, Map<string, QuestionDraft>>();

export function readQuestionDraft(sessionId: string, messageId: string): QuestionDraft {
  return drafts.get(sessionId)?.get(messageId) ?? emptyQuestionDraft();
}

export function saveQuestionDraft(sessionId: string, messageId: string, draft: QuestionDraft) {
  if (!drafts.has(sessionId)) drafts.set(sessionId, new Map());
  drafts.get(sessionId)!.set(messageId, draft);
}

// Module-level completed-interaction markers so the AgentInteractionPanel does
// not re-show an item the user already responded to even if it remounts before
// the backend confirms the status change.
const completedInteractions = new Map<string, Set<string>>();

export function markInteractionCompleted(sessionId: string, messageId: string): void {
  if (!completedInteractions.has(sessionId)) completedInteractions.set(sessionId, new Set());
  completedInteractions.get(sessionId)!.add(messageId);
}

export function isInteractionCompleted(sessionId: string, messageId: string): boolean {
  return completedInteractions.get(sessionId)?.has(messageId) ?? false;
}

/**
 * Remove drafts and completed-interaction markers for messages that have left
 * the pending queue (confirmed by the backend as done/error/denied).
 * Pass the current `getPendingInteractions` IDs for the session.
 */
export function pruneQuestionDrafts(sessionId: string, pendingIds: Set<string>) {
  const session = drafts.get(sessionId);
  if (session) {
    for (const id of session.keys()) {
      if (!pendingIds.has(id)) session.delete(id);
    }
    if (!session.size) drafts.delete(sessionId);
  }
  const done = completedInteractions.get(sessionId);
  if (done) {
    for (const id of done.keys()) {
      if (!pendingIds.has(id)) done.delete(id);
    }
    if (!done.size) completedInteractions.delete(sessionId);
  }
}

export function isQuestionAnswered(q: QuestionItem, draft: QuestionDraft): boolean {
  const other = (draft.otherText[q.question] || "").trim();
  if (!q.options.length) return !!other;
  if (draft.otherSelected[q.question]) return !!other;
  return (draft.selected[q.question]?.length ?? 0) > 0;
}
