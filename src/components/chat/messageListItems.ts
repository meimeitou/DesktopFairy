import type { ChatMsg } from "../../shared/chatMessages";

export type MessageListItem =
  | { kind: "clear"; id: string }
  | { kind: "tools"; id: string; tools: ChatMsg[] }
  | { kind: "message"; id: string; msg: ChatMsg };

export function buildMessageListItems(messages: ChatMsg[]): MessageListItem[] {
  const items: MessageListItem[] = [];
  let i = 0;
  while (i < messages.length) {
    const m = messages[i];
    if (m.type === "clear") {
      items.push({ kind: "clear", id: m.id });
      i += 1;
      continue;
    }
    if (m.type === "tool") {
      if (m.toolName === "AskUserQuestion") {
        items.push({ kind: "tools", id: m.id, tools: [m] });
        i += 1;
        continue;
      }
      const batch: ChatMsg[] = [];
      while (i < messages.length && messages[i].type === "tool") {
        batch.push(messages[i]);
        i += 1;
      }
      items.push({ kind: "tools", id: batch[0].id, tools: batch });
      continue;
    }
    items.push({ kind: "message", id: m.id, msg: m });
    i += 1;
  }
  return items;
}

function toolsShallowEqual(a: ChatMsg[], b: ChatMsg[]): boolean {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

/**
 * Reuse previous list-item object refs when underlying ChatMsg refs are unchanged.
 * Prevents ToolCallGroup memo from breaking on every text-stream frame.
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
    if (item.kind === "message" && old.kind === "message") {
      if (old.msg === item.msg) return old;
      reusedAll = false;
      return item;
    }
    if (item.kind === "tools" && old.kind === "tools") {
      if (toolsShallowEqual(old.tools, item.tools)) return old;
      reusedAll = false;
      return item;
    }
    reusedAll = false;
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
  return `${last.id}:${last.content.length}:${(last.reasoning ?? "").length}:${messages.length}:${toolSig}`;
}
