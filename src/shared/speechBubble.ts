export type SpeechBubbleSource = "ai" | "system" | "manual";

export interface SpeechBubblePayload {
  text: string;
  source?: SpeechBubbleSource;
}

export const SPEECH_BUBBLE_LINE_MAX_WIDTH_PX = 320;
export const SPEECH_BUBBLE_MAX_LINES = 8;
export const SPEECH_BUBBLE_AUTO_HIDE_MS = 4500;
export const SPEECH_BUBBLE_LEAVE_ANIM_MS = 220;

export function truncateBubbleText(text: string, maxChars: number): string {
  const trimmed = text.replace(/\s+/g, " ").trim();
  if (!trimmed) return "";
  if (trimmed.length <= maxChars) return trimmed;
  return `${trimmed.slice(0, maxChars)}…`;
}

export function normalizeSpeechBubblePayload(
  input: string | SpeechBubblePayload
): SpeechBubblePayload {
  if (typeof input === "string") {
    return { text: input, source: "manual" };
  }
  return {
    text: String(input.text ?? ""),
    source: input.source ?? "manual",
  };
}

/** Push speech bubble to the main Live2D window (from any renderer or main). */
export function notifyLive2DSpeechBubble(
  text: string,
  source: SpeechBubbleSource = "manual"
): void {
  const trimmed = text.trim();
  if (!trimmed) return;
  window.electronAPI
    .invoke("live2d:bubble", { text: trimmed, source })
    .catch(() => {});
}
