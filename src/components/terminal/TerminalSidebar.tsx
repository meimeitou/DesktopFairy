import { Button } from "@cherrystudio/ui";
import { NamedIcon } from "../NamedIcon";
import { Bot, ChevronRight, MessageSquare, PanelLeftClose, PanelLeftOpen, Pencil, Plus, Settings, SquareTerminal, Trash2 } from "lucide-react";

import { useEffect, useRef, useState } from "react";
import type { SidebarGroup, SidebarItem } from "./terminalSidebarGroups";

export interface TerminalSidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  groups: SidebarGroup[];
  activeTabId: string;
  settingsActive: boolean;
  topicStatus: Record<string, { streaming: boolean; awaiting: boolean }>;
  onSelectItem: (item: SidebarItem) => void;
  /** host-chat 删除对话；terminal/ssh 关闭标签 */
  onDeleteItem: (item: SidebarItem) => void;
  onCreateTerminal: (anchor: HTMLElement) => void;
  onCreateConversation: (anchor: HTMLElement) => void;
  onNewTerminalForGroup: (group: SidebarGroup) => void;
  onNewConversationForGroup: (group: SidebarGroup) => void;
  /** 仅已保存主机有可编辑记录 */
  onEditHost: (hostId: string) => void;
  onOpenSettings: () => void;
  /** 打开终端助手设置弹窗 */
  onOpenAgentSettings: () => void;
}

/** 分组菜单的最小宽度（含 padding 与边框），用于右边界收敛。 */
const MENU_WIDTH = 168;
/** 两项菜单的高度（2×30 + padding 4×2 + 边框），用于下边界收敛。 */
const MENU_HEIGHT = 68;

export default function TerminalSidebar({
  collapsed,
  onToggleCollapse,
  groups,
  activeTabId,
  settingsActive,
  topicStatus,
  onSelectItem,
  onDeleteItem,
  onCreateTerminal,
  onCreateConversation,
  onNewTerminalForGroup,
  onNewConversationForGroup,
  onEditHost,
  onOpenSettings,
  onOpenAgentSettings,
}: TerminalSidebarProps) {
  const [addMenu, setAddMenu] = useState<{
    group: SidebarGroup;
    top: number;
    left: number;
  } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const groupsRef = useRef<HTMLDivElement>(null);
  // 折叠状态按分组 key 记忆；数据刷新（新建/删除会话）不会把它冲掉。
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(
    () => new Set(),
  );

  const toggleGroup = (key: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handlePlusClick = (group: SidebarGroup, btn: HTMLElement) => {
    // 快速连接没有可选的「终端 / 对话」，直接重连同一地址。
    if (group.kind === "quick") {
      onNewTerminalForGroup(group);
      return;
    }
    // 再点同一个 + 收起菜单（pointerdown 不在这里关闭，见下方 effect）。
    if (addMenu?.group.key === group.key) {
      setAddMenu(null);
      return;
    }
    const rect = btn.getBoundingClientRect();
    // 底部放不下就翻到按钮上方：分组列表可滚动，末尾分组的菜单会越出窗口。
    const below = rect.bottom + 4;
    const top =
      below + MENU_HEIGHT > window.innerHeight
        ? Math.max(8, rect.top - MENU_HEIGHT - 4)
        : below;
    setAddMenu({
      group,
      top,
      left: Math.max(8, Math.min(rect.left, window.innerWidth - MENU_WIDTH)),
    });
  };

  useEffect(() => {
    if (!addMenu) return;
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Element | null;
      if (target && menuRef.current?.contains(target)) return;
      // 触发按钮自己处理开关，否则「按下去关闭、点击后又打开」.
      if (target?.closest?.(".terminal-sidebar-group-btn")) return;
      setAddMenu(null);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAddMenu(null);
    };
    const onScroll = () => setAddMenu(null);
    const groupsEl = groupsRef.current;
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    groupsEl?.addEventListener("scroll", onScroll);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
      groupsEl?.removeEventListener("scroll", onScroll);
    };
  }, [addMenu]);

  return (
    <>
      <aside className={`terminal-sidebar${collapsed ? " collapsed" : ""}`}>
        <div className="terminal-sidebar-head">
          {!collapsed && <span className="terminal-sidebar-title">会话</span>}
          <Button variant="ghost" size="sm" className="terminal-sidebar-collapse" title={collapsed ? "展开侧边栏" : "收起侧边栏"} onClick={onToggleCollapse}>{collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}</Button>
        </div>

        <div className="terminal-sidebar-actions">
          <Button variant="ghost" size="sm" className="terminal-sidebar-action" title="新建终端" onClick={(e) => onCreateTerminal(e.currentTarget as HTMLElement)}><Plus size={16} />
            {!collapsed && "新建终端"}
          </Button>
          <Button variant="ghost" size="sm" className="terminal-sidebar-action" title="新建对话" onClick={(e) => onCreateConversation(e.currentTarget as HTMLElement)}><MessageSquare size={16} />
            {!collapsed && "新建对话"}
          </Button>
        </div>

        <div className="terminal-sidebar-groups" ref={groupsRef}>
          {groups.map((group) => (
            <div key={group.key} className="terminal-sidebar-group">
              {!collapsed && (
                <div
                  className={`terminal-sidebar-group-head${
                    collapsedGroups.has(group.key) ? "" : " expanded"
                  }`}
                  title={group.meta || group.label}
                  role="button"
                  tabIndex={0}
                  aria-expanded={!collapsedGroups.has(group.key)}
                  onClick={() => toggleGroup(group.key)}
                  onKeyDown={(e) => {
                    // 分组内的按钮自己处理 Enter：事件冒泡上来会顺手折叠分组，
                    // 还会被 preventDefault 吃掉按钮的默认 click。
                    if (e.target !== e.currentTarget) return;
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      toggleGroup(group.key);
                    }
                  }}
                >
                  <span className="terminal-sidebar-group-caret">
                    <ChevronRight size={11} />
                  </span>
                  <span className="terminal-sidebar-group-icon">
                    <NamedIcon name={group.kind === "local"
                          ? "Home"
                          : group.kind === "quick"
                            ? "Cloud"
                            : "Globe"} size={12} />
                  </span>
                  <span className="terminal-sidebar-group-label">{group.label}</span>
                  {collapsedGroups.has(group.key) && group.items.length > 0 && (
                    <span className="terminal-sidebar-group-count">
                      {group.items.length}
                    </span>
                  )}
                  <span className="terminal-sidebar-group-actions">
                    <button
                      type="button"
                      className="terminal-sidebar-group-btn"
                      title="新建"
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePlusClick(group, e.currentTarget);
                      }}
                    >
                      <Plus size={13} />
                    </button>
                    {group.kind === "host" && group.hostId && (
                      <button
                        type="button"
                        className="terminal-sidebar-group-btn"
                        title="编辑 SSH 连接"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEditHost(group.hostId!);
                        }}
                      >
                        <Pencil size={13} />
                      </button>
                    )}
                  </span>
                </div>
              )}
              {!collapsedGroups.has(group.key) &&
                group.items.map((item) => {
                const status = item.tabId && item.topicId ? topicStatus[item.topicId] : undefined;
                const awaiting = Boolean(status?.awaiting);
                const streaming = Boolean(status?.streaming);
                const active = Boolean(item.tabId && item.tabId === activeTabId);
                return (
                  <div
                    key={item.key}
                    className={`terminal-sidebar-item${active ? " active" : ""}${item.tabId ? "" : " history"}`}
                    role="button"
                    tabIndex={0}
                    title={item.title}
                    onClick={() => onSelectItem(item)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") onSelectItem(item);
                    }}
                  >
                    <span className="terminal-sidebar-item-icon">
                      <NamedIcon name={item.kind === "host-chat" ? "Chat" : "Code"} size={14} />
                    </span>
                    {!collapsed && (
                      <>
                        <span className="terminal-sidebar-item-label">
                          {item.title}
                        </span>
                        {(streaming || awaiting) && (
                          <span
                            className={`terminal-sidebar-item-dot${awaiting ? " awaiting" : ""}`}
                            title={awaiting ? "等待审批" : "运行中"}
                          />
                        )}
                        <span
                          className="terminal-sidebar-item-close"
                          role="button"
                          tabIndex={-1}
                          aria-label={item.kind === "host-chat" ? "删除对话" : "关闭会话"}
                          title={item.kind === "host-chat" ? "删除对话" : "关闭会话"}
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteItem(item);
                          }}
                        >
                          {item.kind === "host-chat" ? (
                            <Trash2 size={12} />
                          ) : (
                            "×"
                          )}
                        </span>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        <div className="terminal-sidebar-foot">
          <Button variant="ghost" size="sm" className={`terminal-sidebar-settings${settingsActive ? " active" : ""}`} title="终端设置" onClick={onOpenSettings}><Settings size={14} />
          </Button>
          <Button variant="ghost" size="sm" className="terminal-sidebar-settings" title="助手设置" onClick={onOpenAgentSettings}><Bot size={14} />
          </Button>
        </div>
      </aside>

      {addMenu && (
        <div
          ref={menuRef}
          className="terminal-group-menu"
          style={{ top: addMenu.top, left: addMenu.left }}
          role="menu"
        >
          <button
            type="button"
            className="terminal-group-menu-item"
            onClick={() => {
              const { group } = addMenu;
              setAddMenu(null);
              onNewTerminalForGroup(group);
            }}
          >
            <SquareTerminal size={13} />
            <span>新建终端</span>
          </button>
          <button
            type="button"
            className="terminal-group-menu-item"
            onClick={() => {
              const { group } = addMenu;
              setAddMenu(null);
              onNewConversationForGroup(group);
            }}
          >
            <MessageSquare size={13} />
            <span>新建对话</span>
          </button>
        </div>
      )}
    </>
  );
}
