import { useEffect, useRef, useState } from "react";

interface Props {
  text: string;
  x: number;
  y: number;
  containerWidth: number;
  containerHeight: number;
  onAddToChat: () => void;
  onClose: () => void;
}

const TOOLTIP_WIDTH = 160;
const TOOLTIP_HEIGHT = 40;
const MARGIN = 8;

export default function TerminalSelectionTooltip({
  text,
  x,
  y,
  containerWidth,
  containerHeight,
  onAddToChat,
  onClose,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ left: x, top: y + MARGIN });

  useEffect(() => {
    let left = x;
    let top = y + MARGIN;

    if (left + TOOLTIP_WIDTH > containerWidth - MARGIN) {
      left = containerWidth - TOOLTIP_WIDTH - MARGIN;
    }
    if (left < MARGIN) left = MARGIN;

    if (top + TOOLTIP_HEIGHT > containerHeight - MARGIN) {
      top = y - TOOLTIP_HEIGHT - MARGIN;
    }
    if (top < MARGIN) top = MARGIN;

    setPos({ left, top });
  }, [x, y, containerWidth, containerHeight]);

  useEffect(() => {
    const handleScroll = () => onClose();
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("scroll", handleScroll, true);
    window.addEventListener("keydown", handleKey);
    return () => {
      window.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("keydown", handleKey);
    };
  }, [onClose]);

  const handleCopy = () => {
    void navigator.clipboard.writeText(text);
    onClose();
  };

  return (
    <div
      ref={ref}
      className="terminal-selection-tooltip"
      style={{ left: pos.left, top: pos.top }}
    >
      <button
        type="button"
        className="terminal-selection-tooltip-btn primary"
        onClick={onAddToChat}
        title="发送到 AI 助手输入框"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
        </svg>
        <span>Add to chat</span>
      </button>
      <div className="terminal-selection-tooltip-divider" />
      <button
        type="button"
        className="terminal-selection-tooltip-btn"
        onClick={handleCopy}
        title="复制到剪贴板"
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </svg>
        <span>Copy</span>
      </button>
    </div>
  );
}
