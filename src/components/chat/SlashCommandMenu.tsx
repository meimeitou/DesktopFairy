import { useEffect, useRef, useState } from "react";
import type { SlashCommand } from "../../shared/slashCommands";
import "./SlashCommandMenu.css";

interface Props {
  commands: SlashCommand[];
  query: string;
  onSelect: (cmd: SlashCommand) => void;
  onClose: () => void;
}

const GROUP_LABELS: Record<string, string> = {
  builtin: "快捷指令",
  skill: "技能",
};

export default function SlashCommandMenu({ commands, query, onSelect, onClose }: Props) {
  const [activeIndex, setActiveIndex] = useState(0);
  const listRef = useRef<HTMLUListElement>(null);

  const q = query.toLowerCase();
  const filtered = q
    ? commands.filter(
        (c) =>
          c.id.toLowerCase().includes(q) ||
          c.label.toLowerCase().includes(q) ||
          c.description.toLowerCase().includes(q),
      )
    : commands;

  const safeActiveIndex = Math.min(activeIndex, Math.max(filtered.length - 1, 0));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((i) => (i + 1) % Math.max(filtered.length, 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((i) => (i - 1 + filtered.length) % Math.max(filtered.length, 1));
      } else if (e.key === "Enter") {
        e.preventDefault();
        e.stopPropagation();
        const cmd = filtered[safeActiveIndex];
        if (cmd) onSelect(cmd);
      } else if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      } else if (e.key === "Tab") {
        e.preventDefault();
        e.stopPropagation();
        const cmd = filtered[safeActiveIndex];
        if (cmd) onSelect(cmd);
      }
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [filtered, safeActiveIndex, onSelect, onClose]);

  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(
      `[data-idx="${safeActiveIndex}"]`,
    );
    el?.scrollIntoView({ block: "nearest" });
  }, [safeActiveIndex]);

  if (filtered.length === 0) {
    return (
      <div className="slash-menu slash-menu-up" role="menu">
        <div className="slash-menu-header">
          <span>无匹配的指令</span>
        </div>
      </div>
    );
  }

  const groupedItems: { cmd: SlashCommand; showGroup: boolean }[] = filtered.map(
    (cmd, i) => ({
      cmd,
      showGroup: i === 0 || filtered[i - 1].group !== cmd.group,
    }),
  );

  return (
    <div className="slash-menu slash-menu-up" role="menu">
      <ul className="slash-menu-list" ref={listRef}>
        {groupedItems.map(({ cmd, showGroup }, i) => (
          <li key={`${cmd.group}-${cmd.id}`}>
            {showGroup && (
              <div className="slash-menu-group-label">
                {GROUP_LABELS[cmd.group]}
              </div>
            )}
            <button
              type="button"
              role="menuitem"
              data-idx={i}
              className={`slash-menu-item${i === safeActiveIndex ? " active" : ""}`}
              onMouseEnter={() => setActiveIndex(i)}
              onMouseDown={(e) => {
                e.preventDefault();
                onSelect(cmd);
              }}
            >
              <span className="slash-menu-item-label">{cmd.label}</span>
              <span className="slash-menu-item-desc">{cmd.description}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
