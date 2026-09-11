/** Half-fold viewport is ~4 lines; keep a short suffix so markdown is not re-parsed unbounded. */
export const THINKING_HALF_TAIL_CHARS = 1000;

/**
 * Latest thinking text for the half-fold preview.
 * Must stay a suffix of `content` — never rewrite earlier reasoning.
 */
export function thinkingPreviewTail(
  content: string,
  maxChars = THINKING_HALF_TAIL_CHARS,
): string {
  if (content.length <= maxChars) return content;
  const from = content.length - maxChars;
  const nl = content.indexOf("\n", from);
  if (nl >= 0 && nl + 1 < content.length) return content.slice(nl + 1);
  return content.slice(from);
}
