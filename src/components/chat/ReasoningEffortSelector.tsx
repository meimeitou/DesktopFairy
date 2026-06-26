import { useState, useRef, useEffect } from "react";
import type { ReasoningEffort, ReasoningEffortCard } from "../../shared/reasoningEffort";
import {
  REASONING_EFFORT_CARDS,
  getReasoningEffortCard,
} from "../../shared/reasoningEffort";
import "./ReasoningEffortSelector.css";

interface Props {
  value: ReasoningEffort;
  onChange: (value: ReasoningEffort) => void;
  disabled?: boolean;
}

function EffortIcon({ size = 16 }: { size?: number }) {
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
      <path d="M9 18h6" />
      <path d="M10 22h4" />
      <path d="M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.2 1 2v.3h6V17c0-.8.4-1.5 1-2A7 7 0 0 0 12 2Z" />
    </svg>
  );
}

export default function ReasoningEffortSelector({
  value,
  onChange,
  disabled = false,
}: Props) {
  const [open, setOpen] = useState(false);
  const hostRef = useRef<HTMLDivElement>(null);
  const current = getReasoningEffortCard(value);

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

  const handleSelect = (next: ReasoningEffort) => {
    if (disabled) return;
    if (next === value) {
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
        title={`思维链长度：${current.title}`}
      >
        <EffortIcon />
      </button>
      {open && (
        <div className="chat-mode-popover chat-mode-popover-up" role="menu">
          <div className="chat-mode-popover-header">
            <span>思维链长度</span>
          </div>
          <ul className="chat-mode-list">
            {REASONING_EFFORT_CARDS.map((card: ReasoningEffortCard) => {
              const active = card.value === value;
              return (
                <li key={card.value}>
                  <button
                    type="button"
                    role="menuitemradio"
                    aria-checked={active}
                    className={`chat-mode-item${active ? " active" : ""}`}
                    style={{
                      borderColor: active ? card.accent : "transparent",
                      background: active ? `${card.accent}14` : "transparent",
                    }}
                    onClick={() => handleSelect(card.value)}
                  >
                    <span
                      className="chat-mode-item-icon"
                      style={{ color: card.accent }}
                    >
                      <EffortIcon />
                    </span>
                    <span className="chat-mode-item-body">
                      <span
                        className="chat-mode-item-title"
                        style={{ color: card.accent }}
                      >
                        {card.title}
                      </span>
                      <span className="chat-mode-item-desc">
                        {card.description}
                      </span>
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
