import { CircleHelp } from "lucide-react";
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import "./HintTip.css";

interface HintTipProps {
  tip: string;
  placement?: "top" | "bottom";
}

/** Lucide help icon; tooltip portals to <body> so it never gets
 *  clipped by card overflow:hidden or buried by sibling stacking contexts. */
export default function HintTip({ tip, placement = "bottom" }: HintTipProps) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const popId = useId();
  const place = useCallback(() => {
    const btn = btnRef.current;
    const pop = popRef.current;
    if (!btn || !pop) return;
    const r = btn.getBoundingClientRect();
    const half = pop.offsetWidth / 2;
    const left = Math.min(Math.max(r.left + r.width / 2, half + 8), window.innerWidth - half - 8);
    const top =
      placement === "top" ? r.top - 8 - pop.offsetHeight : r.bottom + 8;
    setPos((p) => (p && p.left === left && p.top === top ? p : { left, top }));
  }, [placement]);

  useLayoutEffect(() => {
    if (open) place();
  }); // no deps: re-measure after every render while open (pop width known post-mount)

  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    window.addEventListener("keydown", close);
    return () => {
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
      window.removeEventListener("keydown", close);
    };
  }, [open, place]);

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        className="hint-tip"
        aria-label={tip}
        aria-expanded={open}
        aria-controls={popId}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
      >
        <CircleHelp size={13} aria-hidden="true" />
      </button>
      {open &&
        createPortal(
          <div
            ref={popRef}
            id={popId}
            role="tooltip"
            className={`hint-tip-popover ${placement}`}
            style={pos ?? undefined}
          >
            {tip}
          </div>,
          document.body,
        )}
    </>
  );
}

interface FieldHeadProps {
  htmlFor?: string;
  hint?: string;
  placement?: "top" | "bottom";
  children: ReactNode;
}

/** Label + optional ? tip. Do not wrap the control — clicking ? must not focus the input. */
export function FieldHead({
  htmlFor,
  hint,
  placement,
  children,
}: FieldHeadProps) {
  return (
    <div className="field-head">
      {htmlFor ? (
        <label htmlFor={htmlFor}>{children}</label>
      ) : (
        <span>{children}</span>
      )}
      {hint ? <HintTip tip={hint} placement={placement} /> : null}
    </div>
  );
}
