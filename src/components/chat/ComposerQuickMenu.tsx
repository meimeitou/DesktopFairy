import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from "react";
import { Button, Icon } from "animal-island-ui";
import KnowledgeBaseList from "../knowledge/KnowledgeBaseList";
import "./ComposerQuickMenu.css";

export interface ComposerQuickAction {
  key: string;
  label: string;
  icon: ReactNode;
  disabled?: boolean;
  danger?: boolean;
  onSelect: () => void;
}

interface Props {
  actions: ComposerQuickAction[];
  /** 传入则菜单底部追加「知识库」可勾选列表 */
  knowledge?: {
    selectedIds: string[];
    onChange: (ids: string[]) => void;
  };
  disabled?: boolean;
}

/** 输入栏「+」聚合菜单：收拢其余快捷操作，避免工具栏无限增长。 */
export default function ComposerQuickMenu({
  actions,
  knowledge,
  disabled = false,
}: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // 抽屉/聊天窗可能很窄：菜单贴左弹出后会越界，按窗口边缘微量偏移拉回。
  // 用 ResizeObserver 而不是只测一次：知识库列表是异步加载的，回来后宽度会变。
  useLayoutEffect(() => {
    if (!open) return;
    const el = menuRef.current;
    if (!el) return;
    const clamp = () => {
      el.style.marginLeft = "0px";
      const r = el.getBoundingClientRect();
      const margin = 8;
      let shift = 0;
      if (r.right > window.innerWidth - margin) {
        shift = window.innerWidth - margin - r.right;
      }
      if (r.left + shift < margin) shift = margin - r.left;
      el.style.marginLeft = `${shift}px`;
    };
    clamp();
    // 打开后把焦点送进菜单（role=menu 的键盘可达性）。
    el.querySelector<HTMLElement>('[role^="menuitem"]')?.focus();
    const ro = new ResizeObserver(clamp);
    ro.observe(el);
    return () => ro.disconnect();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        rootRef.current
          ?.querySelector<HTMLElement>(".composer-quick-trigger")
          ?.focus();
      }
    };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // ↑/↓/Home/End 在菜单项之间移动焦点（WAI-ARIA menu button 模式）。
  const handleMenuKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    const keys = ["ArrowDown", "ArrowUp", "Home", "End"];
    if (!keys.includes(e.key)) return;
    const items = [
      ...(e.currentTarget.querySelectorAll<HTMLElement>('[role^="menuitem"]') ??
        []),
    ].filter((el) => !el.hasAttribute("disabled"));
    if (items.length === 0) return;
    e.preventDefault();
    const current = items.indexOf(document.activeElement as HTMLElement);
    const next =
      e.key === "Home"
        ? 0
        : e.key === "End"
          ? items.length - 1
          : e.key === "ArrowDown"
            ? (current + 1) % items.length
            : current <= 0
              ? items.length - 1
              : current - 1;
    items[next].focus();
  };

  const count = knowledge?.selectedIds.length ?? 0;
  // 没有可收进菜单的操作、也没有知识库 → 不渲染触发按钮
  if (actions.length === 0 && !knowledge) return null;

  return (
    <div className="composer-quick" ref={rootRef}>
      <Button
        type="text"
        size="small"
        className={`chat-tool-btn composer-quick-trigger${open ? " active" : ""}`}
        icon={<Icon name="Plus" size={16} />}
        onClick={() => !disabled && setOpen((v) => !v)}
        disabled={disabled}
        aria-label="更多操作"
        aria-expanded={open}
        title="更多操作"
      >
        {count > 0 && <span className="composer-quick-count">{count}</span>}
      </Button>
      {open && (
        <div
          className="composer-quick-menu"
          role="menu"
          aria-label="更多操作"
          ref={menuRef}
          onKeyDown={handleMenuKeyDown}
        >
          {actions.map((action) => (
            <Button
              key={action.key}
              type="text"
              role="menuitem"
              className={`composer-quick-row${action.danger ? " danger" : ""}`}
              icon={action.icon}
              disabled={action.disabled}
              onClick={() => {
                if (action.disabled) return;
                setOpen(false);
                action.onSelect();
              }}
            >
              {action.label}
            </Button>
          ))}
          {knowledge && (
            <>
              {actions.length > 0 && <div className="composer-quick-sep" />}
              <div className="composer-quick-label">知识库</div>
              <KnowledgeBaseList
                selectedIds={knowledge.selectedIds}
                onChange={knowledge.onChange}
                disabled={disabled}
              />
            </>
          )}
        </div>
      )}
    </div>
  );
}
