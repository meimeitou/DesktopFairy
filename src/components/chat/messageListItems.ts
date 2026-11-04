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
 */
export function reuseStableMessageListItems(
  next: MessageListItem[],
  prev: MessageListItem[] | null,
): MessageListItem[] {
  if (!prev || prev.length === 0) return next;
  let reusedAll = next.length === prev.length;
  const out = next.map((item, i) => {
    const old = prev[i];
    if (!old || old.kind !== item.kind || old.id !== item.id) {
      reusedAll = false;
      return item;
    }
    if (item.kind === "clear" && old.kind === "clear") return old;
    if (item.kind !== "clear" && old.kind !== "clear") {
      if (old.msg === item.msg) return old;
      reusedAll = false;
      return item;
    }

    return item;
  });
  return reusedAll ? prev : out;
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
