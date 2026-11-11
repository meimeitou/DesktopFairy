import type { ChatMsg } from "../../shared/chatMessages";

export type MessageListItem =
  | { kind: "clear"; id: string }
  | { kind: "tool"; id: string; msg: ChatMsg }
  | { kind: "message"; id: string; msg: ChatMsg };

export function buildMessageListItems(messages: ChatMsg[]): MessageListItem[] {
  return messages.map((msg) =>
    msg.type === "clear"
      ? { kind: "clear", id: msg.id }
      : { kind: msg.type === "tool" ? "tool" : "message", id: msg.id, msg },
  );
}

/**
 * Reuse previous list-item object refs when underlying ChatMsg refs are unchanged.
 * Keeps unchanged tool rows stable during text-stream updates.
 *
 * Streaming almost always changes only the last item. Scanning from the tail
 * terminates in O(1) for that case instead of walking the full list forward.
 */
export function reuseStableMessageListItems(
  next: MessageListItem[],
  prev: MessageListItem[] | null,
): MessageListItem[] {
  if (!prev || prev.length === 0) return next;

  const sameLength = next.length === prev.length;

  if (!sameLength) {
    // Messages were added or removed. Reuse any stable prefix, then accept
    // new items from the first structural difference onward.
    const minLen = Math.min(next.length, prev.length);
    let firstDiff = minLen;
    for (let i = 0; i < minLen; i++) {
      const item = next[i], old = prev[i];
      if (old.kind !== item.kind || old.id !== item.id) { firstDiff = i; break; }
      if (item.kind !== "clear" && old.kind !== "clear" && old.msg !== item.msg) { firstDiff = i; break; }
    }
    if (firstDiff === minLen && next.length === prev.length) return prev;
    const out = next.slice();
    for (let i = 0; i < firstDiff; i++) out[i] = prev[i];
    return out;
  }

  // Same length: scan from the tail — streaming typically changes only the
  // last item, so the loop exits on the first iteration.
  let lastChanged = -1;
  for (let i = next.length - 1; i >= 0; i--) {
    const item = next[i], old = prev[i];
    if (old.kind !== item.kind || old.id !== item.id) { lastChanged = i; break; }
    if (item.kind !== "clear" && old.kind !== "clear" && old.msg !== item.msg) { lastChanged = i; break; }
  }
  if (lastChanged === -1) return prev; // nothing changed

  const out = prev.slice(); // start from prev so unchanged items keep their refs
  for (let i = lastChanged; i < next.length; i++) out[i] = next[i];
  return out;
}

export function messageListStickKey(messages: ChatMsg[]): string {
  const last = messages[messages.length - 1];
  if (!last) return "empty";
  // Tool status changes drive expand/collapse height even when the trailing
  // assistant placeholder text is still empty — include a short tool signature.
  let toolSig = "";
  const from = Math.max(0, messages.length - 12);
  for (let i = from; i < messages.length; i++) {
    const m = messages[i];
    if (m.type !== "tool") continue;
    toolSig += `${m.id}:${m.toolStatus ?? ""};`;
  }
  // Final reply may sit above a trailing tool row; follow that text too.
  let replySig = "";
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m.role !== "assistant" || m.type === "tool" || m.type === "clear") {
      continue;
    }
    replySig = `${m.id}:${m.content.length}:${(m.reasoning ?? "").length}`;
    break;
  }
  return `${last.id}:${last.content.length}:${(last.reasoning ?? "").length}:${messages.length}:${replySig}:${toolSig}`;
}
