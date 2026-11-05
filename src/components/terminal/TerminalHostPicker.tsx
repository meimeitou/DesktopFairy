import { Button } from "@cherrystudio/ui";
import { Globe, Play, Search, SquareTerminal } from "lucide-react";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { SshHost } from "../../shared/terminalSettings";
import { parseQuickConnect } from "../../shared/sshQuickConnect";

const UNGROUPED = "未分组";

function describeHost(h: { user: string; host: string; port: number }): string {
  return h.port === 22 ? `${h.user}@${h.host}` : `${h.user}@${h.host}:${h.port}`;
}

interface Props {
  mode: "terminal" | "conversation";
  style?: React.CSSProperties;
  sshHosts: SshHost[];
  onPickLocal: () => void;
  onPickHost: (hostId: string) => void;
  onQuickConnect: (host: SshHost) => void;
  onNewConversation: (hostId: string) => void;
  /** 对话模式下的「本机」项：新建无主机的普通对话 */
  onNewLocalConversation: () => void;
  onClose: () => void;
}

type Item =
  | { kind: "local" }
  | { kind: "host"; host: SshHost; group: string }
  | { kind: "quick"; query: string };

export default function TerminalHostPicker({
  mode,
  style,
  sshHosts,
  onPickLocal,
  onPickHost,
  onQuickConnect,
  onNewConversation,
  onNewLocalConversation,
  onClose,
}: Props) {
  const [query, setQuery] = useState("");
  const [selectedIdx, setSelectedIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // 只把焦点给搜索框：外层容器再 focus 一次会把它抢走，用户必须先点一下才能打字。
  // 键盘事件从 input 冒泡到容器上的 onKeyDown，不需要容器持有焦点。
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    setSelectedIdx(0);
  }, [query]);

  const q = query.trim().toLowerCase();

  const savedGroups = useMemo(() => {
    const groups = new Map<string, SshHost[]>();
    for (const host of sshHosts) {
      const key = host.group || UNGROUPED;
      const list = groups.get(key);
      if (list) list.push(host);
      else groups.set(key, [host]);
    }
    return groups;
  }, [sshHosts]);

  const items: Item[] = useMemo(() => {
    const result: Item[] = [];
    const match = (h: SshHost) =>
      [h.name, h.host, h.user, h.group ?? ""].some((f) =>
        f.toLowerCase().includes(q),
      );

    // 两种模式都有「本机」：终端建本地 shell，对话建无主机的普通对话。
    result.push({ kind: "local" });
    for (const [g, hosts] of savedGroups) {
      for (const h of hosts) {
        if (q && !match(h)) continue;
        result.push({ kind: "host", host: h, group: g });
      }
    }
    if (mode === "terminal") {
      const parsed = parseQuickConnect(query);
      if (parsed) {
        result.push({
          kind: "quick",
          query: `${parsed.user}@${parsed.host}:${parsed.port}`,
        });
      }
    }
    return result;
  }, [mode, savedGroups, q, query]);

  const selectItem = useCallback(
    (idx: number) => {
      const item = items[idx];
      if (!item) return;
      switch (item.kind) {
        case "local":
          if (mode === "conversation") onNewLocalConversation();
          else onPickLocal();
          onClose();
          return;
        case "host":
          // 对话模式：选主机即新建对话，历史对话在左侧栏里点。
          if (mode === "conversation") onNewConversation(item.host.id);
          else onPickHost(item.host.id);
          onClose();
          return;
        case "quick": {
          const parsed = parseQuickConnect(query);
          if (!parsed) return;
          onQuickConnect({
            id: `ssh_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            name: `${parsed.user}@${parsed.host}`,
            host: parsed.host,
            port: parsed.port,
            user: parsed.user,
            authMethod: "auto",
          });
          onClose();
          return;
        }
      }
    },
    [
      items,
      mode,
      onClose,
      onNewConversation,
      onNewLocalConversation,
      onPickHost,
      onPickLocal,
      onQuickConnect,
      query,
    ],
  );

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

  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(
      `[data-idx="${selectedIdx}"]`,
    );
    el?.scrollIntoView({ block: "nearest" });
  }, [selectedIdx]);

  // 列表变短后索引可能越界，导致 Enter 静默无响应。
  useEffect(() => {
    setSelectedIdx((i) => Math.min(i, Math.max(0, items.length - 1)));
  }, [items.length]);

  const renderItems = () => {
    const nodes: React.ReactNode[] = [];
    let lastGroup = "";
    items.forEach((item, idx) => {
      const active = idx === selectedIdx;
      if (item.kind === "host" && item.group !== lastGroup) {
        lastGroup = item.group;
        nodes.push(
          <div key={`g-${idx}`} className="ssh-picker-section">
            {item.group}
          </div>,
        );
      }
      if (item.kind === "local") {
        nodes.push(
          <Button variant="ghost" key="local" className={`ssh-picker-item${active ? " active" : ""}`} data-idx={idx} onClick={() => selectItem(idx)}>
            <span className="ssh-picker-item-icon">
              <SquareTerminal size={13} />
            </span>
            <span className="ssh-picker-item-main">
              <span className="ssh-picker-item-name">本机</span>
              <span className="ssh-picker-item-detail">
                {mode === "conversation" ? "本机对话" : "本地终端"}
              </span>
            </span>
          </Button>,
        );
      } else if (item.kind === "host") {
        nodes.push(
          <Button variant="ghost" key={`h-${idx}`} className={`ssh-picker-item${active ? " active" : ""}`} data-idx={idx} onClick={() => selectItem(idx)}>
            <span className="ssh-picker-item-icon">
              <Globe size={13} />
            </span>
            <span className="ssh-picker-item-main">
              <span className="ssh-picker-item-name">{item.host.name}</span>
              <span className="ssh-picker-item-detail">
                {describeHost(item.host)}
              </span>
            </span>
          </Button>,
        );
      } else {
        nodes.push(
          <div key="q-sep" className="ssh-picker-section">
            快速连接
          </div>,
          <Button variant="ghost" key="quick" className={`ssh-picker-item quick${active ? " active" : ""}`} data-idx={idx} onClick={() => selectItem(idx)}>
            <span className="ssh-picker-item-icon">
              <Play size={13} />
            </span>
            <span className="ssh-picker-item-main">
              <span className="ssh-picker-item-name">
                快速连接 {item.query}
              </span>
            </span>
          </Button>,
        );
      }
    });
    return nodes;
  };

  return (
    <>
      <div className="ssh-picker-backdrop" onMouseDown={onClose} />
      <div
        className="ssh-picker"
        style={style}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
      >
        <div className="ssh-picker-search-wrap">
          <Search size={13} className={"ssh-picker-search-icon"} />
          <input
            ref={inputRef}
            className="ssh-picker-search"
            type="text"
            placeholder={
              mode === "terminal"
                ? "搜索主机或输入 user@host:port 快速连接"
                : "搜索主机，选中即新建对话"
            }
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            spellCheck={false}
          />
        </div>
        <div className="ssh-picker-list" ref={listRef}>
          {items.length > 0 ? (
            renderItems()
          ) : (
            <div className="ssh-picker-empty">
              {q
                ? `无匹配 "${query}"`
                : mode === "conversation"
                  ? "暂无 SSH 主机，请先在终端设置中添加"
                  : "暂无 SSH 主机，点击下方管理添加"}
            </div>
          )}
        </div>
      </div>
    </>
  );
}