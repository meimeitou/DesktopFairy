import { Button, Icon } from "animal-island-ui";
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
      <Button
        type="text"
        className="thinking-header"
        onClick={onHeaderClick}
        aria-expanded={expanded}
      >
        <Icon name="Bulb" />
        <ThinkingElapsedLabel
          msgId={msg.id}
          isThinking={isThinking}
          clockLive={tickClock}
        />
        <Icon name="Play" />
      </Button>
      {showBody && (
        <div className={`thinking-body${fold === "half" ? " thinking-body-half" : ""}`}>
          {!isThinking && fold === "full" && (
            <Button
              type="text"
              size="small"
              className="thinking-copy"
              onClick={handleCopy}
              title="复制"
              icon={copied ? <Icon name="Check" size={13} /> : <Icon name="File" size={13} />}
            />
          )}
          <ThinkingMarkdownBody content={bodyContent} isThinking={isThinking} />
        </div>
      )}
    </div>
  );
}

export default memo(ThinkingBlock);
