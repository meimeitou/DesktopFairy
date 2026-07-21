import { useCallback, useEffect, useRef } from "react";

// Pin-to-bottom only while the user is already near the bottom. While the user
// scrolls up to read history, streaming output must not yank the view back down.
// Threshold tolerates 1-2 lines of margin plus sub-pixel jitter from streaming.
const BOTTOM_THRESHOLD = 48;

/**
 * @param stickKey Prefer a primitive (e.g. last message id + length) so the
 * effect does not re-run on unrelated array identity churn.
 */
export function useStickToBottom(stickKey: unknown) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isAtBottomRef = useRef(true);

  const handleScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    isAtBottomRef.current =
      el.scrollTop + el.clientHeight >= el.scrollHeight - BOTTOM_THRESHOLD;
  }, []);

  const scrollToBottom = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
    isAtBottomRef.current = true;
  }, []);

  // Follow streaming output only when already at the bottom.
  useEffect(() => {
    if (!isAtBottomRef.current) return;
    const el = containerRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [stickKey]);

  return { containerRef, handleScroll, scrollToBottom, isAtBottomRef };
}
