import { memo, useLayoutEffect, useRef, useState } from "react";
import type { ChatMsg } from "../../shared/chatMessages";
import {
  formatThinkingLabel,
  syncThinkingClock,
} from "../../shared/thinkingElapsed";
import { thinkingPreviewTail } from "../../shared/thinkingPreview";
import ChatMarkdown from "./ChatMarkdown";
import "./ThinkingBlock.css";

interface Props {
  msg: ChatMsg;
  /** Topic-level stream. Reasoning sits on the first assistant, not always the last. */
  isStreaming: boolean;
  /** Tick the timer only while reasoning is the current work (not tools / later answer). */
  clockLive?: boolean;
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
  msgId,
  isThinking,
  clockLive,
}: {
  msgId: string;
  isThinking: boolean;
  clockLive: boolean;
}) {
  const spanRef = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const el = spanRef.current;
    if (!el) return;

    const paint = () => {
      el.textContent = formatThinkingLabel(
        isThinking,
        syncThinkingClock(msgId, clockLive),
      );
    };

    if (!clockLive) {
      paint();
      return;
    }

    let raf = 0;
    const tick = () => {
      paint();
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [clockLive, isThinking, msgId]);

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

function ThinkingBlock({ msg, isStreaming, clockLive }: Props) {
  const content = msg.reasoning ?? "";
  // Agent turns put answer text on a later assistant after tools; this bubble
  // often has reasoning only. Use topic streaming, not last-assistant streaming.
  const isThinking = isStreaming && !msg.content;
  const tickClock = clockLive ?? isThinking;
  // Three-level display: "half" shows a clipped latest-suffix preview,
  // "full" shows the whole body, "collapsed" hides the body entirely.
  type FoldState = "collapsed" | "half" | "full";
  const [fold, setFold] = useState<FoldState>("half");
  const [copied, setCopied] = useState(false);
  // Half-fold only paints a suffix: full-doc markdown + CSS mask + scrollTop
  // on every chunk is what flickered once reasoning overflowed the preview.
  const bodyContent = fold === "half" ? thinkingPreviewTail(content) : content;

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
        <ThinkingElapsedLabel
          msgId={msg.id}
          isThinking={isThinking}
          clockLive={tickClock}
        />
        <ChevronIcon />
      </button>
      {showBody && (
        <div className={`thinking-body${fold === "half" ? " thinking-body-half" : ""}`}>
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
          <ThinkingMarkdownBody content={bodyContent} isThinking={isThinking} />
        </div>
      )}
    </div>
  );
}

export default memo(ThinkingBlock);
