import { Button } from "@cherrystudio/ui";
import { Plus } from "lucide-react";
import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

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

/**
 * 输入栏「+」聚合菜单。Cherry QuickPanel 同款定位：面板绝对定位在
 * 输入框（.chat-input-dock，position:absolute）上方，横向铺满输入框宽度，
 * 不跟随触发按钮。菜单项视觉与 DropdownMenuItem 一致。
 */
export default function ComposerQuickMenu({
  actions,
  knowledge,
  disabled = false,
}: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

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

  const count = knowledge?.selectedIds.length ?? 0;
  // 没有可收进菜单的操作、也没有知识库 → 不渲染触发按钮
  if (actions.length === 0 && !knowledge) return null;

  return (
    <div className="composer-quick" ref={rootRef}>
      <Button
        variant="ghost"
        size="sm"
        className={`chat-tool-btn composer-quick-trigger${open ? " active" : ""}`}
        onClick={() => !disabled && setOpen((v) => !v)}
        disabled={disabled}
        aria-label="更多操作"
        aria-expanded={open}
        aria-haspopup="menu"
        title="更多操作"
      >
        <Plus size={16} />
        {count > 0 && <span className="composer-quick-count">{count}</span>}
      </Button>
      {open && (
        <div className="composer-quick-panel" role="menu" aria-label="更多操作">
          <div className="composer-quick-panel-body">
            {actions.map((action) => (
              <button
                type="button"
                role="menuitem"
                key={action.key}
                className={`composer-quick-row${action.danger ? " danger" : ""}`}
                disabled={action.disabled}
                onClick={() => {
                  setOpen(false);
                  action.onSelect();
                }}
              >
                {action.icon}
                {action.label}
              </button>
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
        </div>
      )}
    </div>
  );
}
