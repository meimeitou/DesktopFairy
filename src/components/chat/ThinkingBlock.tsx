import { Button } from "@cherrystudio/ui";
import { Check, ChevronDown, Copy, Lightbulb } from "lucide-react";
import { memo, useLayoutEffect, useRef, useState } from "react";
import type { ChatMsg } from "../../shared/chatMessages";
import {
  formatThinkingLabel,
  syncThinkingClock,
} from "../../shared/thinkingElapsed";
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
  const isThinking = clockLive ?? (isStreaming && !msg.content);
  const tickClock = clockLive ?? isThinking;
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

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

  const cls = `thinking-block${isThinking ? " thinking-active" : ""}${expanded ? " thinking-expanded" : ""}`;

  return (
    <div className={cls}>
      <Button variant="ghost" className="thinking-header" onClick={() => setExpanded((value) => !value)} aria-expanded={expanded}>
        <Lightbulb />
        <ThinkingElapsedLabel
          msgId={msg.id}
          isThinking={isThinking}
          clockLive={tickClock}
        />
        <ChevronDown className={"thinking-chevron"} />
      </Button>
      {expanded && (
        <div className="thinking-body">
          {!isThinking && (
            <Button variant="ghost" size="sm" className="thinking-copy" onClick={handleCopy} title="复制">{copied ? <Check size={16} /> : <Copy size={16} />}</Button>
          )}
          <ThinkingMarkdownBody content={content} isThinking={isThinking} />
        </div>
      )}
    </div>
  );
}

export default memo(ThinkingBlock);
