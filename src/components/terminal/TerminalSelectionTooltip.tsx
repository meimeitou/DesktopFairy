import { Button, Icon } from "animal-island-ui";
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
      <Button
        type="text"
        className="terminal-selection-tooltip-btn primary"
        onClick={onAddToChat}
        title="发送到 AI 助手输入框"
      >
        <Icon name="Chat" size={13} />
        <span>Add to chat</span>
      </Button>
      <div className="terminal-selection-tooltip-divider" />
      <Button
        type="text"
        className="terminal-selection-tooltip-btn"
        onClick={handleCopy}
        title="复制到剪贴板"
      >
        <Icon name="File" size={13} />
        <span>Copy</span>
      </Button>
    </div>
  );
}
