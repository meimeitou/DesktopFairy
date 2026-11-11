import { Server } from "lucide-react";
import { Button } from "@cherrystudio/ui";
import { useLayoutEffect, useRef } from "react";
import type { SlashCommand } from "../../shared/slashCommands";
import "./SlashCommandMenu.css";

interface Props {
  title: string;
  commands: SlashCommand[];
  activeIndex: number;
  menuId: string;
  /** Pointer hover must not scroll rows underneath the pointer. */
  scrollActiveIntoView?: boolean;
  onActiveIndexChange: (index: number) => void;
  onSelect: (cmd: SlashCommand) => void;
}

export default function SlashCommandMenu({ title, commands, activeIndex, menuId, scrollActiveIntoView = true, onActiveIndexChange, onSelect }: Props) {
  const listRef = useRef<HTMLUListElement>(null);
  const active = commands[activeIndex];
  useLayoutEffect(() => {
    if (!scrollActiveIntoView) return;
    const list = listRef.current;
    const row = list?.querySelector<HTMLElement>(`[data-idx="${activeIndex}"]`);
    if (!list || !row) return;
    // Keep keyboard navigation local to the list. scrollIntoView also scrolls
    // ancestors, which can move the floating menu and its composer.
    const viewport = list.getBoundingClientRect();
    const bounds = row.getBoundingClientRect();
    const top = viewport.top + list.clientTop;
    const bottom = top + list.clientHeight;
    if (bounds.top < top) list.scrollTop += bounds.top - top;
    else if (bounds.bottom > bottom) list.scrollTop += bounds.bottom - bottom;
  }, [activeIndex, commands, scrollActiveIntoView]);

  return (
    <div className="slash-menu slash-menu-up">
      <div className="slash-menu-header"><span>{title}</span><span>↑↓ 切换 · Enter 选择 · Esc 关闭</span></div>
      <ul className="slash-menu-list" ref={listRef} id={menuId} role="listbox" aria-label={title}>
        {commands.length === 0 ? <li className="slash-menu-empty" role="presentation">无匹配项，可继续输入或按 Esc 关闭。</li> : commands.map((cmd, i) => (
          <li key={`${cmd.group}-${cmd.id}`} role="presentation">
            {(i === 0 || commands[i - 1].group !== cmd.group) && (
              <div className="slash-menu-group-label">{cmd.group === "builtin" ? "快捷指令" : cmd.group === "host" ? "机器" : "技能"}</div>
            )}
            <Button variant="ghost" role="option" tabIndex={-1} id={`${menuId}-${i}`} aria-selected={i === activeIndex}
              data-idx={i} className={`slash-menu-item${i === activeIndex ? " active" : ""}`}
              onMouseMove={() => { if (i !== activeIndex) onActiveIndexChange(i); }} onMouseDown={(e) => { e.preventDefault(); onSelect(cmd); }}>
              <span className="slash-menu-item-heading"><span className="slash-menu-item-label">{cmd.group === "host" && <Server size={12} aria-hidden="true" />} {cmd.name || cmd.label}</span>
                {cmd.group === "skill" && <span className="slash-menu-item-id">{cmd.id}</span>}</span>
              <span className="slash-menu-item-desc">{cmd.description}</span>
            </Button>
          </li>
        ))}
      </ul>
      {active && (
        <div className="slash-menu-detail">
          <strong>{active.name || active.label}</strong>
          {active.group === "skill" && <span className="slash-menu-detail-meta">{active.isBuiltin ? "内置技能" : "本地技能"} · {active.enabled ? "已开启自动发现" : "未开启自动发现，可本轮使用"}</span>}
          {active.host && <span className="slash-menu-detail-meta">{active.host.group || "未分组"} · 本轮操作目标</span>}
          <p>{active.description || "暂无简介"}</p>
        </div>
      )}
    </div>
  );
}
