import { useEffect, useRef, useState } from "react";
import type { ChatMsg } from "../../shared/chatMessages";
import ChatMarkdown from "./ChatMarkdown";
import "./ThinkingBlock.css";

interface Props {
  msg: ChatMsg;
  /** True while this assistant message is still streaming. */
  isStreaming: boolean;
}

function BulbIcon({ size = 15 }: { size?: number }) {
  const s = size;
  return (
    <svg
      className="thinking-bulb"
      width={s}
      height={s}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M9 18h6" />
      <path d="M10 22h4" />
      <path d="M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.2 1 2v.3h6V17c0-.8.4-1.5 1-2A7 7 0 0 0 12 2Z" />
    </svg>
  );
}

function ChevronIcon({ size = 14 }: { size?: number }) {
  const s = size;
  return (
    <svg
      className="thinking-chevron"
      width={s}
      height={s}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="9 6 15 12 9 18" />
    </svg>
  );
}

function CopyIcon({ size = 13 }: { size?: number }) {
  const s = size;
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function CheckIcon({ size = 13 }: { size?: number }) {
  const s = size;
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

export default function ThinkingBlock({ msg, isStreaming }: Props) {
  const content = msg.reasoning ?? "";
  // Reasoning is "active" while streaming and no answer text has arrived yet
  // (reasoning_content streams before content for typical reasoning models).
  const isThinking = isStreaming && !msg.content;
  // Three-level display: "half" shows a capped preview with a fade mask,
  // "full" shows the whole body, "collapsed" hides the body entirely.
  // Default to "half" so the thinking content is previewed without dominating the bubble,
  // mirroring cherry-studio's half-folded affordance (but also applied to completed blocks).
  type FoldState = "collapsed" | "half" | "full";
  const [fold, setFold] = useState<FoldState>("half");
  const [elapsedMs, setElapsedMs] = useState(0);
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const bodyRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll the half-folded body to the bottom whenever reasoning
  // content changes, so the latest thinking text stays visible (mirrors
  // cherry-studio's half-folded preview behavior). Also runs on mount /
  // when switching back to "half" so completed blocks show their ending.
  useEffect(() => {
    if (fold !== "half") return;
    const el = bodyRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [fold, content]);

  // Live count-up while thinking; freeze the value when done.
  useEffect(() => {
    if (isThinking) {
      if (!timerRef.current) {
        timerRef.current = setInterval(() => {
          setElapsedMs((prev) => prev + 100);
        }, 100);
      }
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isThinking]);

  const handleCopy = async () => {
    if (!content) return;
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  };

  const seconds = (Math.max(elapsedMs, 100) / 1000).toFixed(1);
  const label = isThinking
    ? `思考中（用时 ${seconds} 秒）`
    : elapsedMs > 0
      ? `已深度思考（用时 ${seconds} 秒）`
      : "已深度思考";

  // Click cycles: half -> full -> collapsed -> half.
  const onHeaderClick = () => {
    setFold((prev) => (prev === "half" ? "full" : prev === "full" ? "collapsed" : "half"));
  };

  const showBody = fold === "half" || fold === "full";
  const expanded = fold === "full";
  const cls = `thinking-block${isThinking ? " thinking-active" : ""}${fold === "full" ? " thinking-expanded" : ""}${fold === "half" ? " thinking-half" : ""}`;

  return (
    <div className={cls}>
      <button
        type="button"
        className="thinking-header"
        onClick={onHeaderClick}
        aria-expanded={expanded}
      >
        <BulbIcon />
        <span className="thinking-label">{label}</span>
        <ChevronIcon />
      </button>
      {showBody && (
        <div
          ref={fold === "half" ? bodyRef : undefined}
          className={`thinking-body${fold === "half" ? " thinking-body-half" : ""}`}
        >
          {!isThinking && fold === "full" && (
            <button
              type="button"
              className="thinking-copy"
              onClick={handleCopy}
              title="复制"
            >
              {copied ? <CheckIcon /> : <CopyIcon />}
            </button>
          )}
          <ChatMarkdown content={content} streaming={isThinking} />
        </div>
      )}
    </div>
  );
}
