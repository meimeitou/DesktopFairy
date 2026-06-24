import { useState, useRef, useEffect } from "react";
import type { ChatMode, ChatModeCard } from "../../shared/chatMode";
import { CHAT_MODE_CARDS, getChatModeCard } from "../../shared/chatMode";
import "./ChatModeSelector.css";

interface Props {
  mode: ChatMode;
  onChange: (mode: ChatMode) => void;
  disabled?: boolean;
}

function ModeIcon({ card, size = 16 }: { card: ChatModeCard; size?: number }) {
  const s = size;
  return (
    <svg
      className="chat-mode-icon"
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
      {card.mode === "normal" && <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="3" fill="currentColor" /></>}
      {card.mode === "plan" && <><path d="M9 6h10" /><path d="M9 12h10" /><path d="M9 18h6" /><circle cx="5" cy="6" r="1.5" fill="currentColor" /><circle cx="5" cy="12" r="1.5" fill="currentColor" /><circle cx="5" cy="18" r="1.5" fill="currentColor" /></>}
      {card.mode === "auto-edit" && <><path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4Z" /></>}
      {card.mode === "full-auto" && <><path d="M21 12a9 9 0 1 1-3-6.7" /><polyline points="21 3 21 9 15 9" /></>}
    </svg>
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
    onChange(next);
    setOpen(false);
  };

  return (
    <div className="chat-mode-selector chat-mode-selector-icon" ref={hostRef}>
      <button
        type="button"
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
      </button>
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
                  <button
                    type="button"
                    role="menuitemradio"
                    aria-checked={active}
                    className={`chat-mode-item${active ? " active" : ""}`}
                    style={{
                      borderColor: active ? card.accent : "transparent",
                      background: active ? `${card.accent}14` : "transparent",
                    }}
                    onClick={() => handleSelect(card.mode)}
                  >
                    <span
                      className="chat-mode-item-icon"
                      style={{ color: card.accent }}
                    >
                      <ModeIcon card={card} />
                    </span>
                    <span className="chat-mode-item-body">
                      <span className="chat-mode-item-title" style={{ color: card.accent }}>
                        {card.title}
                      </span>
                      <span className="chat-mode-item-desc">{card.description}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
