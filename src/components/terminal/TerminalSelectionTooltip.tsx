import { Button } from "@cherrystudio/ui";
import { Copy, MessageSquare } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";

interface Props {
  text: string;
  x: number;
  y: number;
  onAddToChat: () => void;
  onClose: () => void;
}

const MARGIN = 8;

export default function TerminalSelectionTooltip({
  text,
  x,
  y,
  onAddToChat,
  onClose,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ left: x, top: y + MARGIN });

  useLayoutEffect(() => {
    const tooltip = ref.current;
    const container = tooltip?.offsetParent;
    if (!tooltip || !(container instanceof HTMLElement)) return;

    const updatePosition = () => {
      // The terminal shrinks when its assistant opens or is resized. Keep the
      // whole menu inside that clipping boundary, using its rendered size.
      const maxLeft = Math.max(MARGIN, container.clientWidth - tooltip.offsetWidth - MARGIN);
      const maxTop = Math.max(MARGIN, container.clientHeight - tooltip.offsetHeight - MARGIN);
      const left = Math.max(MARGIN, Math.min(x, maxLeft));
      const below = y + MARGIN;
      const top = Math.max(
        MARGIN,
        Math.min(below > maxTop ? y - tooltip.offsetHeight - MARGIN : below, maxTop),
      );
      setPos((prev) => prev.left === left && prev.top === top ? prev : { left, top });
    };

    updatePosition();
    const observer = new ResizeObserver(updatePosition);
    observer.observe(container);
    observer.observe(tooltip);
    return () => observer.disconnect();
  }, [x, y]);

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
      <Button variant="ghost" className="terminal-selection-tooltip-btn primary" onClick={onAddToChat} title="发送到 AI 助手输入框">
        <MessageSquare size={13} />
        <span>Add to chat</span>
      </Button>
      <div className="terminal-selection-tooltip-divider" />
      <Button variant="ghost" className="terminal-selection-tooltip-btn" onClick={handleCopy} title="复制到剪贴板">
        <Copy size={16} />
        <span>Copy</span>
      </Button>
    </div>
  );
}
