import { useEffect, useMemo, useRef, useState } from "react";
import type { SshHost, SshRecentEntry } from "../../shared/terminalSettings";

interface Props {
  sshHosts: SshHost[];
  sshRecent: SshRecentEntry[];
  onConnect: (hostId: string) => void;
  onQuickConnect: (host: SshHost) => void;
  onOpenSettings: () => void;
  onClose: () => void;
  style?: React.CSSProperties;
}

interface FlatItem {
  kind: "host";
  host: SshHost;
  savedId?: string;
  group: string;
  recentAt?: number;
}

interface QuickItem {
  kind: "quick";
  query: string;
}

type Item = FlatItem | QuickItem;

const UNGROUPED = "未分组";

function describeHost(h: { user: string; host: string; port: number }): string {
  return h.port === 22 ? `${h.user}@${h.host}` : `${h.user}@${h.host}:${h.port}`;
}

/** 解析快速连接输入：user@host:port / host:port / host，默认端口 22 */
function parseQuickConnect(input: string): { user: string; host: string; port: number } | null {
  const s = input.trim();
  if (!s) return null;
  let rest = s;
  let user = "";
  const atIdx = rest.lastIndexOf("@");
  if (atIdx > 0) {
    user = rest.slice(0, atIdx).trim();
    rest = rest.slice(atIdx + 1).trim();
  }
  if (!rest) return null;
  let port = 22;
  // [host]:port — IPv6 防御
  if (rest.startsWith("[")) {
    const close = rest.indexOf("]");
    if (close < 0) return null;
    const hostPart = rest.slice(1, close);
    const after = rest.slice(close + 1);
    if (after.startsWith(":")) {
      const p = Number(after.slice(1));
      if (!Number.isFinite(p) || p <= 0) return null;
      port = p;
    } else if (after.length > 0) {
      return null;
    }
    if (!hostPart) return null;
    return { user: user || "root", host: hostPart, port };
  }
  // 末尾 :port
  const colon = rest.lastIndexOf(":");
  if (colon > 0) {
    const maybePort = Number(rest.slice(colon + 1));
    if (Number.isFinite(maybePort) && maybePort > 0 && maybePort <= 65535) {
      port = maybePort;
      rest = rest.slice(0, colon);
    }
  }
  if (!rest) return null;
  // 简单校验：包含空格则拒绝
  if (/\s/.test(rest)) return null;
  return { user: user || "root", host: rest, port };
}

export default function SshConnectionPicker({
  sshHosts,
  sshRecent,
  onConnect,
  onQuickConnect,
  onOpenSettings,
  onClose,
  style,
}: Props) {
  const [query, setQuery] = useState("");
  const [selectedIdx, setSelectedIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const q = query.trim().toLowerCase();

  // 已保存主机：按 group 聚合
  const savedGroups = useMemo(() => {
    const map = new Map<string, SshHost[]>();
    for (const h of sshHosts) {
      const g = h.group?.trim() || UNGROUPED;
      if (!map.has(g)) map.set(g, []);
      map.get(g)!.push(h);
    }
    return Array.from(map.entries());
  }, [sshHosts]);

  // 最近连接（去重：如果已在 savedHosts 中按 user@host:port 命中则不重复显示）
  const recentHosts = useMemo(() => {
    const savedKeys = new Set(sshHosts.map((h) => `${h.user}@${h.host}:${h.port}`));
    return sshRecent
      .map((e) => e.host)
      .filter((h) => !savedKeys.has(`${h.user}@${h.host}:${h.port}`));
  }, [sshRecent, sshHosts]);

  // 构建扁平列表（带分组标记）
  const items: Item[] = useMemo(() => {
    const result: Item[] = [];

    if (!q) {
      // 最近（仅空搜索时显示）
      for (const h of recentHosts) {
        result.push({ kind: "host", host: h, group: "最近" });
      }
      // 已保存
      for (const [g, hosts] of savedGroups) {
        for (const h of hosts) {
          result.push({ kind: "host", host: h, savedId: h.id, group: g });
        }
      }
      return result;
    }

    // 搜索：子串匹配 name/host/user/group
    const match = (h: SshHost) =>
      [h.name, h.host, h.user, h.group ?? ""].some((f) => f.toLowerCase().includes(q));

    const recents: FlatItem[] = recentHosts
      .filter(match)
      .map((h) => ({ kind: "host" as const, host: h, group: "最近" }));
    const saved: FlatItem[] = [];
    for (const [g, hosts] of savedGroups) {
      for (const h of hosts) {
        if (match(h)) saved.push({ kind: "host", host: h, savedId: h.id, group: g });
      }
    }
    result.push(...recents, ...saved);

    // 快速连接（始终追加，即使有匹配）
    const parsed = parseQuickConnect(query);
    if (parsed) {
      result.push({ kind: "quick", query: `${parsed.user}@${parsed.host}:${parsed.port}` });
    }
    return result;
  }, [q, query, recentHosts, savedGroups]);

  // 分组表头：相邻 group 不同时渲染
  const renderItems: React.ReactNode[] = useMemo(() => {
    const nodes: React.ReactNode[] = [];
    let lastGroup = "";
    items.forEach((item, idx) => {
      if (item.kind === "host") {
        if (item.group !== lastGroup) {
          lastGroup = item.group;
          nodes.push(
            <div key={`g-${idx}`} className="ssh-picker-section">
              {item.group}
            </div>,
          );
        }
        nodes.push(
          <button
            key={`h-${idx}`}
            type="button"
            className={`ssh-picker-item${idx === selectedIdx ? " active" : ""}`}
            data-idx={idx}
            onClick={() => selectItem(idx)}
          >
            <span className="ssh-picker-item-icon">🖥</span>
            <span className="ssh-picker-item-main">
              <span className="ssh-picker-item-name">{item.host.name}</span>
              <span className="ssh-picker-item-detail">{describeHost(item.host)}</span>
            </span>
          </button>,
        );
      } else {
        nodes.push(
          <div key="q-sep" className="ssh-picker-section">快速连接</div>,
        );
        nodes.push(
          <button
            key="quick"
            type="button"
            className={`ssh-picker-item quick${idx === selectedIdx ? " active" : ""}`}
            data-idx={idx}
            onClick={() => selectItem(idx)}
          >
            <span className="ssh-picker-item-icon">→</span>
            <span className="ssh-picker-item-main">
              <span className="ssh-picker-item-name">连接到 "{item.query}"</span>
            </span>
          </button>,
        );
      }
    });
    return nodes;
  }, [items, selectedIdx]);

  const selectItem = (idx: number) => {
    const item = items[idx];
    if (!item) return;
    if (item.kind === "host" && item.savedId) {
      onConnect(item.savedId);
    } else if (item.kind === "host") {
      onQuickConnect(item.host);
    } else if (item.kind === "quick") {
      const parsed = parseQuickConnect(query);
      if (!parsed) return;
      const tempHost: SshHost = {
        id: `ssh_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        name: `${parsed.user}@${parsed.host}`,
        host: parsed.host,
        port: parsed.port,
        user: parsed.user,
        authMethod: "auto",
      };
      onQuickConnect(tempHost);
    }
    onClose();
  };

  // 键盘导航
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIdx((i) => Math.min(i + 1, items.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      selectItem(selectedIdx);
    } else if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    }
  };

  // 选中项滚入视野
  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLButtonElement>(
      `[data-idx="${selectedIdx}"]`,
    );
    el?.scrollIntoView({ block: "nearest" });
  }, [selectedIdx]);

  // 搜索变化时重置选中
  useEffect(() => {
    setSelectedIdx(0);
  }, [query]);

  const hasAny = items.length > 0;

  return (
    <div className="ssh-picker" style={style} onKeyDown={handleKeyDown}>
      <div className="ssh-picker-search-wrap">
        <svg className="ssh-picker-search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          ref={inputRef}
          className="ssh-picker-search"
          type="text"
          placeholder="搜索主机或输入 user@host:port 快速连接"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          spellCheck={false}
        />
      </div>
      <div className="ssh-picker-list" ref={listRef}>
        {hasAny ? (
          renderItems
        ) : (
          <div className="ssh-picker-empty">
            {q ? `无匹配 "${query}"` : "暂无 SSH 主机，点击下方管理添加"}
          </div>
        )}
      </div>
      <button
        type="button"
        className="ssh-picker-footer"
        onClick={() => {
          onOpenSettings();
          onClose();
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
        <span>管理 SSH 主机</span>
      </button>
    </div>
  );
}
