import { useEffect, type RefObject } from "react";

/** Keep message-list padding in sync with the floating composer height. */
export function useComposerOverlay(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const host = el.closest(
      ".chat-main-area, .terminal-agent-drawer-content",
    ) as HTMLElement | null;
    if (!host) return;
    const apply = () => {
      host.style.setProperty("--chat-composer-height", `${el.offsetHeight}px`);
    };
    apply();
    const observer = new ResizeObserver(apply);
    observer.observe(el);
    return () => {
      observer.disconnect();
      host.style.removeProperty("--chat-composer-height");
    };
  }, [ref]);
}
