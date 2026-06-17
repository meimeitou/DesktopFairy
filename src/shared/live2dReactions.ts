import { loadSettings, type AppSettings } from "./settings";
import { notifyLive2DSpeechBubble } from "./speechBubble";

export type Live2DReaction =
  | "userSend"
  | "thinking"
  | "replyDone"
  | "replyError"
  | "chatOpen"
  | "toolRunning";

/** Preferred expression names per reaction (first match on current model wins). */
export const REACTION_EXPRESSIONS: Record<Live2DReaction, string[]> = {
  userSend: ["呆呆", "麦克风"],
  thinking: ["麦克风", "麦克风小熊"],
  replyDone: ["星星", "爱心", "脸红"],
  replyError: ["哭哭", "问号"],
  chatOpen: ["星星"],
  toolRunning: ["麦克风", "麦克风小熊"],
};

const REPLY_DONE_KEYWORD_EXPRESSIONS: { pattern: RegExp; names: string[] }[] = [
  { pattern: /谢谢|感谢|太好了|开心|高兴/, names: ["爱心", "星星", "脸红"] },
  { pattern: /抱歉|对不起|遗憾|可惜/, names: ["哭哭", "问号"] },
  { pattern: /\?|？/, names: ["问号", "呆呆"] },
];

/** Fixed bubble copy for reactions without assistant text. */
export const REACTION_BUBBLE_TEXT: Partial<Record<Live2DReaction, string>> = {
  thinking: "思考中…",
  replyError: "出错了",
  toolRunning: "帮忙中…",
};

export function parseBubbleCommand(cmd: string): string | null {
  if (!cmd.startsWith("bubble:")) return null;
  const payload = cmd.slice("bubble:".length);
  if (!payload) return "";
  try {
    return decodeURIComponent(payload);
  } catch {
    return payload;
  }
}

export function getBubbleTextForReaction(
  reaction: Live2DReaction,
  assistantText?: string
): string | null {
  if (reaction === "replyDone" && assistantText?.trim()) {
    return assistantText.trim();
  }
  return REACTION_BUBBLE_TEXT[reaction] ?? null;
}

export function parseReactionCommand(
  cmd: string
): { reaction: Live2DReaction; assistantText?: string } | null {
  if (!cmd.startsWith("react:")) return null;
  const rest = cmd.slice("react:".length);
  const sep = rest.indexOf(":");
  if (sep === -1) {
    const reaction = rest as Live2DReaction;
    if (reaction in REACTION_EXPRESSIONS) return { reaction };
    return null;
  }
  const reaction = rest.slice(0, sep) as Live2DReaction;
  if (!(reaction in REACTION_EXPRESSIONS)) return null;
  try {
    const assistantText = decodeURIComponent(rest.slice(sep + 1));
    return { reaction, assistantText };
  } catch {
    return { reaction };
  }
}

export function resolveExpressionForReaction(
  reaction: Live2DReaction,
  availableNames: string[],
  assistantText?: string
): string | null {
  const available = new Set(availableNames);
  let candidates = REACTION_EXPRESSIONS[reaction];

  if (reaction === "replyDone" && assistantText?.trim()) {
    for (const { pattern, names } of REPLY_DONE_KEYWORD_EXPRESSIONS) {
      if (pattern.test(assistantText)) {
        const hit = names.find((n) => available.has(n));
        if (hit) return hit;
      }
    }
  }

  return candidates.find((n) => available.has(n)) ?? null;
}

export function notifyLive2D(
  reaction: Live2DReaction,
  assistantText?: string
): void {
  let cmd = `react:${reaction}`;
  if (reaction === "replyDone" && assistantText?.trim()) {
    cmd += `:${encodeURIComponent(assistantText.slice(0, 300))}`;
  }
  window.electronAPI.invoke("live2d:command", cmd).catch(() => {});
}

/** @deprecated Use notifyLive2DScene — reactive only, no bubble. */
export function notifyLive2DIfReactive(
  reactive: boolean,
  reaction: Live2DReaction,
  assistantText?: string
): void {
  if (!reactive) return;
  notifyLive2D(reaction, assistantText);
}

export function notifyLive2DScene(
  reaction: Live2DReaction,
  assistantText?: string,
  settings: Pick<AppSettings, "live2dReactive" | "live2dSpeechBubble"> = loadSettings()
): void {
  if (settings.live2dReactive !== false) {
    notifyLive2D(reaction, assistantText);
  }
  if (settings.live2dSpeechBubble !== false) {
    const text = getBubbleTextForReaction(reaction, assistantText);
    if (text) notifyLive2DSpeechBubble(text, "ai");
  }
}
