import { useEffect, useRef, useCallback } from "react";
import "./OmpConvNav.css";

interface NavMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
}

interface OmpConvNavProps {
  messages: NavMessage[];
  containerRef: React.RefObject<HTMLDivElement | null>;
  onScrollBadgeChange?: (show: boolean) => void;
}

export default function OmpConvNav({
  messages,
  containerRef,
  onScrollBadgeChange,
}: OmpConvNavProps) {
  const railRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const waveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Only render message pair dots (user followed by assistant)
  const pairs: {
    userMsg: NavMessage;
    assistantMsg: NavMessage | null;
    idx: number;
  }[] = [];
  let i = 0;
  while (i < messages.length) {
    if (messages[i].role === "user") {
      const user = messages[i];
      const next = messages[i + 1];
      pairs.push({
        userMsg: user,
        assistantMsg: next?.role === "assistant" ? next : null,
        idx: pairs.length,
      });
      i += next?.role === "assistant" ? 2 : 1;
    } else {
      i++;
    }
  }

  const scrollToMsg = useCallback(
    (msgId: string) => {
      const el = document.getElementById(`omp-msg-${msgId}`);
      if (!el || !containerRef.current) return;
      const container = containerRef.current;
      const elTop = el.offsetTop - container.offsetTop;
      container.scrollTo({ top: elTop - 16, behavior: "smooth" });
      // flash highlight
      el.classList.add("omp-msg-jump-highlight");
      setTimeout(() => el.classList.remove("omp-msg-jump-highlight"), 800);
    },
    [containerRef],
  );

  // Gaussian wave on dot hover
  const applyWave = useCallback((centerIdx: number) => {
    if (!railRef.current) return;
    const dots =
      railRef.current.querySelectorAll<HTMLButtonElement>(".omp-conv-dot");
    const sigma2 = 9; // σ² = 9
    dots.forEach((dot, idx) => {
      const dist = idx - centerIdx;
      const w = 10 + 20 * Math.exp((-0.5 * dist * dist) / sigma2);
      dot.style.setProperty("--dot-w", `${w}px`);
    });
  }, []);

  const clearWave = useCallback(() => {
    if (!railRef.current) return;
    const dots =
      railRef.current.querySelectorAll<HTMLButtonElement>(".omp-conv-dot");
    dots.forEach((dot) => dot.style.removeProperty("--dot-w"));
  }, []);

  const showTooltip = useCallback(
    (dot: HTMLButtonElement, pair: (typeof pairs)[0]) => {
      const tooltip = tooltipRef.current;
      if (!tooltip) return;
      const q =
        pair.userMsg.text.slice(0, 80) +
        (pair.userMsg.text.length > 80 ? "…" : "");
      const a = pair.assistantMsg
        ? pair.assistantMsg.text.slice(0, 80) +
          (pair.assistantMsg.text.length > 80 ? "…" : "")
        : "";

      tooltip.querySelector(".ocn-tooltip-q")!.textContent = q;
      const sep = tooltip.querySelector<HTMLElement>(".ocn-tooltip-sep")!;
      const aEl = tooltip.querySelector<HTMLElement>(".ocn-tooltip-a")!;
      if (a) {
        sep.style.display = "";
        aEl.style.display = "";
        aEl.textContent = a;
      } else {
        sep.style.display = "none";
        aEl.style.display = "none";
      }

      const rect = dot.getBoundingClientRect();
      tooltip.style.top = `${rect.top + rect.height / 2}px`;
      tooltip.style.display = "block";
    },
    [],
  );

  const hideTooltip = useCallback(() => {
    if (tooltipRef.current) tooltipRef.current.style.display = "none";
  }, []);

  // Track scroll position to notify parent about scroll badge
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !onScrollBadgeChange) return;
    const handle = () => {
      const atBottom =
        container.scrollHeight - container.scrollTop - container.clientHeight <
        60;
      onScrollBadgeChange(!atBottom);
    };
    container.addEventListener("scroll", handle, { passive: true });
    return () => container.removeEventListener("scroll", handle);
  }, [containerRef, onScrollBadgeChange]);

  if (pairs.length === 0) return null;

  return (
    <>
      <div ref={railRef} className="omp-conv-nav">
        {pairs.map((pair, idx) => (
          <button
            key={pair.userMsg.id}
            type="button"
            className="omp-conv-dot"
            onClick={() => scrollToMsg(pair.userMsg.id)}
            onMouseEnter={(e) => {
              if (waveTimerRef.current) clearTimeout(waveTimerRef.current);
              applyWave(idx);
              showTooltip(e.currentTarget, pair);
            }}
            onMouseLeave={() => {
              waveTimerRef.current = setTimeout(() => {
                clearWave();
                hideTooltip();
              }, 80);
            }}
            aria-label={`跳转到消息 ${idx + 1}`}
          />
        ))}
      </div>
      <div
        ref={tooltipRef}
        className="omp-conv-tooltip"
        style={{ display: "none" }}
      >
        <div className="ocn-tooltip-q" />
        <div className="ocn-tooltip-sep" />
        <div className="ocn-tooltip-a" />
      </div>
    </>
  );
}
