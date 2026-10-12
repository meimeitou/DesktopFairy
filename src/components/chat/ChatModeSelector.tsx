import { Button, Icon } from "animal-island-ui";
import { useEffect, useRef, useState } from "react";
import type { IconName } from "animal-island-ui";
import type { ChatMode, ChatModeCard } from "../../shared/chatMode";
import { CHAT_MODE_CARDS, getChatModeCard } from "../../shared/chatMode";
import "./ChatModeSelector.css";

interface Props {
  mode: ChatMode;
  onChange: (mode: ChatMode) => void;
  disabled?: boolean;
}

const MODE_ICON: Record<ChatMode, IconName> = {
  normal: "Thermometer",
  plan: "Book",
  "auto-edit": "Edit",
  "full-auto": "Play",
};

function ModeIcon({ card, size = 16 }: { card: ChatModeCard; size?: number }) {
  return (
    <Icon
      className="chat-mode-icon"
      name={MODE_ICON[card.mode] ?? "Thermometer"}
      size={size}
    />
  );
}

export default function ChatModeSelector({ mode, onChange, disabled = false }: Props) {
  const [open, setOpen] = useState(false);
  const hostRef = useRef<HTMLDivElement>(null);
  const current = getChatModeCard(mode);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (hostRef.current && !hostRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  const handleSelect = (next: ChatMode) => {
    if (disabled) return;
    if (next === mode) {
      setOpen(false);
      return;
    }
    if (next === "full-auto" && mode !== "full-auto") {
      const ok = window.confirm(
        "全自动模式将跳过所有工具审批（文件编辑、命令执行、网络请求均不再确认）。\n继续开启？"
      );
      if (!ok) {
        setOpen(false);
        return;
      }
    }
    onChange(next);
    setOpen(false);
  };

  return (
    <div className="chat-mode-selector chat-mode-selector-icon" ref={hostRef}>
      <Button
        type="text"
        className={`chat-mode-trigger chat-tool-btn${open ? " active" : ""}`}
        style={{
          color: current.accent,
          borderColor: open ? current.accent : "transparent",
          background: open ? `${current.accent}1a` : "transparent",
          boxShadow: open ? `0 0 0 1px ${current.accent}55 inset` : "none",
        }}
        onClick={() => !disabled && setOpen((v) => !v)}
        disabled={disabled}
        title={`当前模式：${current.title}`}
      >
        <ModeIcon card={current} />
      </Button>
      {open && (
        <div className="chat-mode-popover chat-mode-popover-up" role="menu">
          <div className="chat-mode-popover-header">
            <span>选择对话模式</span>
          </div>
          <ul className="chat-mode-list">
            {CHAT_MODE_CARDS.map((card) => {
              const active = card.mode === mode;
              return (
                <li key={card.mode}>
                  <Button
                    type="text"
                    role="menuitemradio"
                    aria-checked={active}
                    className={`chat-mode-item${active ? " active" : ""}`}
                    onClick={() => handleSelect(card.mode)}
                  >
                    <span
                      className="chat-mode-item-icon"
                      style={{ color: active ? "#fff" : card.accent }}
                    >
                      <ModeIcon card={card} />
                    </span>
                    <span className="chat-mode-item-body">
                      <span
                        className="chat-mode-item-title"
                        style={{ color: active ? "#fff" : card.accent }}
                      >
                        {card.title}
                      </span>
                      <span className="chat-mode-item-desc">{card.description}</span>
                    </span>
                  </Button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
