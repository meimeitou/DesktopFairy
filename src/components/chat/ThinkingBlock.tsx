import { memo, useEffect, useRef, useState } from "react";
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

/** Updates label via DOM so the markdown body is not re-rendered every 100ms. */
function ThinkingElapsedLabel({
  isThinking,
  startedAt,
}: {
  isThinking: boolean;
  startedAt: number;
}) {
  const spanRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = spanRef.current;
    if (!el) return;

    if (!isThinking) {
      const ms = Math.max(Date.now() - startedAt, 100);
      el.textContent = `已深度思考（用时 ${(ms / 1000).toFixed(1)} 秒）`;
      return;
    }

    let raf = 0;
    const tick = () => {
      const ms = Math.max(Date.now() - startedAt, 100);
      el.textContent = `思考中（用时 ${(ms / 1000).toFixed(1)} 秒）`;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [isThinking, startedAt]);

  return (
    <span className="thinking-label" ref={spanRef}>
      {isThinking ? "思考中…" : "已深度思考"}
    </span>
  );
}

const ThinkingMarkdownBody = memo(function ThinkingMarkdownBody({
  content,
  isThinking,
}: {
  content: string;
  isThinking: boolean;
}) {
  return <ChatMarkdown content={content} streaming={isThinking} />;
});

function ThinkingBlock({ msg, isStreaming }: Props) {
  const content = msg.reasoning ?? "";
  // Reasoning is "active" while streaming and no answer text has arrived yet
  // (reasoning_content streams before content for typical reasoning models).
  const isThinking = isStreaming && !msg.content;
  // Three-level display: "half" shows a capped preview with a fade mask,
  // "full" shows the whole body, "collapsed" hides the body entirely.
  type FoldState = "collapsed" | "half" | "full";
  const [fold, setFold] = useState<FoldState>("half");
  const [copied, setCopied] = useState(false);
  const startedAtRef = useRef(0);
  const [startedAt, setStartedAt] = useState(0);
  const bodyRef = useRef<HTMLDivElement | null>(null);
  const wasThinkingRef = useRef(false);

  useEffect(() => {
    if (isThinking && !wasThinkingRef.current) {
      const now = Date.now();
      startedAtRef.current = now;
      setStartedAt(now);
    }
    wasThinkingRef.current = isThinking;
  }, [isThinking]);

  // Auto-scroll the half-folded body to the bottom whenever reasoning
  // content changes, so the latest thinking text stays visible.
  useEffect(() => {
    if (fold !== "half") return;
    const el = bodyRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [fold, content]);

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
        <ThinkingElapsedLabel isThinking={isThinking} startedAt={startedAt} />
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
          <ThinkingMarkdownBody content={content} isThinking={isThinking} />
        </div>
      )}
    </div>
  );
}

export default memo(ThinkingBlock);
