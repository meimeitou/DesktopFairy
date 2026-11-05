import { Search, Share2 } from "lucide-react";

import { useEffect, useRef, useState } from "react";
import type { SshCredential } from "../../shared/settings";

interface Props {
  x: number;
  y: number;
  credentials: SshCredential[];
  onSearch: () => void;
  onFillPassword: (cred: SshCredential) => void;
  onClose: () => void;
}

const MENU_WIDTH = 168;
const MENU_ITEM_HEIGHT = 30;
const MARGIN = 6;

export default function TerminalContextMenu({
  x,
  y,
  credentials,
  onSearch,
  onFillPassword,
  onClose,
}: Props) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ left: x, top: y });
  const [submenuSide, setSubmenuSide] = useState<"right" | "left">("right");

  useEffect(() => {
    let left = x;
    let top = y;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    // 两个顶级条目 + 内边距，估算菜单高度以做边界翻转。
    const estMenuHeight = MENU_ITEM_HEIGHT * 2 + 12;
    if (left + MENU_WIDTH > vw - MARGIN) {
      left = vw - MENU_WIDTH - MARGIN;
    }
    if (left < MARGIN) left = MARGIN;
    if (top + estMenuHeight > vh - MARGIN) {
      top = vh - estMenuHeight - MARGIN;
    }
    if (top < MARGIN) top = MARGIN;
    setPos({ left, top });
    // 子菜单宽度与主菜单相当，靠近右边缘时翻转到左侧。
    setSubmenuSide(left + MENU_WIDTH + MENU_WIDTH > vw - MARGIN ? "left" : "right");
  }, [x, y]);

  useEffect(() => {
    const handleScroll = () => onClose();
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const handleOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (menuRef.current && !menuRef.current.contains(target)) {
        onClose();
      }
    };
    window.addEventListener("scroll", handleScroll, true);
    window.addEventListener("keydown", handleKey);
    document.addEventListener("mousedown", handleOutside);
    return () => {
      window.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("keydown", handleKey);
      document.removeEventListener("mousedown", handleOutside);
    };
  }, [onClose]);

  const fillable = credentials.filter((c) => c.password);

  return (
    <div
      ref={menuRef}
      className="terminal-context-menu"
      style={{ left: pos.left, top: pos.top }}
    >
      <button
        type="button"
        className="terminal-context-menu-item"
        onClick={() => {
          onSearch();
          onClose();
        }}
      >
        <Search size={13} />
        <span>搜索</span>
      </button>
      <div className="terminal-context-menu-divider" />
      <div className="terminal-context-menu-item terminal-context-menu-item--has-sub">
        <Share2 size={13} />
        <span>密码凭证</span>
        <span className="terminal-context-menu-arrow">▸</span>
        <div className={`terminal-context-submenu terminal-context-submenu--${submenuSide}`}>
          {fillable.length === 0 ? (
            <div className="terminal-context-menu-item terminal-context-menu-disabled">
              <span>暂无凭证</span>
            </div>
          ) : (
            fillable.map((cred) => (
              <button
                key={cred.id}
                type="button"
                className="terminal-context-menu-item"
                title={cred.note || cred.name}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onFillPassword(cred);
                  onClose();
                }}
              >
                <span className="terminal-context-menu-cred-name">{cred.name}</span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
