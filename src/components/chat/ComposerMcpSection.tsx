import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { ChevronDown, ChevronRight, Plug } from "lucide-react";
import { Button, Input } from "@cherrystudio/ui";
import type { McpRuntimeStatus, McpServer } from "../../shared/mcpServer";
import { mcpSelectionStore } from "../../services/mcpSelectionStore";
import { openMcpSettings } from "../../shared/mcpSettingsNavigation";
import "./ComposerMcpSection.css";

export interface ComposerMcpSelection {
  topicId: string;
  defaultServerIds: string[];
  streaming: boolean;
}
const stateLabels = { connected: "已连接", connecting: "连接中", error: "连接失败", disabled: "已停用" };

export default function ComposerMcpSection({ topicId, defaultServerIds, streaming, onOpenSettings }: ComposerMcpSelection & { onOpenSettings?: () => void }) {
  const snapshot = useSyncExternalStore(mcpSelectionStore.subscribe,
    () => mcpSelectionStore.get(topicId), () => mcpSelectionStore.get(topicId));
  const [expanded, setExpanded] = useState(false);
  const [servers, setServers] = useState<McpServer[]>([]);
  const [statuses, setStatuses] = useState<Record<string, McpRuntimeStatus>>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [search, setSearch] = useState("");
  const load = useCallback(() => Promise.allSettled([
      window.electronAPI.invoke("mcp:servers:list"),
      window.electronAPI.invoke("mcp:servers:status", {}),
      mcpSelectionStore.load(topicId, true),
    ]), [topicId]);
  const applyResult = useCallback(([list, status]: PromiseSettledResult<unknown>[]) => {
    if (list.status === "fulfilled" && Array.isArray(list.value)) {
      setServers(list.value as McpServer[]);
      setLoadError(false);
    }
    else setLoadError(true);
    if (status.status === "fulfilled") setStatuses((status.value || {}) as Record<string, McpRuntimeStatus>);
    setLoading(false);
  }, []);
  useEffect(() => {
    let active = true;
    void load().then((results) => { if (active) applyResult(results); });
    return () => { active = false; };
  }, [load, applyResult]);
  useEffect(() => window.electronAPI.onMcpStatusChanged?.((event) => {
    setStatuses((previous) => ({ ...previous, [event.serverId]: event }));
  }), []);
  const selectedIds = snapshot.override ?? defaultServerIds;
  const selected = new Set(selectedIds);
  const count = servers.filter((server) => server.isActive !== false && selected.has(server.id)).length;
  const visible = servers.filter((server) => server.name.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()));
  const update = (ids: string[] | undefined) => { void mcpSelectionStore.set(topicId, ids).catch(() => {}); };
  const unavailable = loading || loadError || !snapshot.loaded;

  return <div className="composer-mcp">
    <button type="button" role="menuitem" className="composer-quick-row composer-mcp-heading"
      aria-expanded={expanded} onClick={() => setExpanded((value) => !value)}>
      <Plug size={16} /><span>MCP · {loading ? "加载中" : `已选 ${count}`}</span>
      {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
    </button>
    {expanded && <div className="composer-mcp-content" role="group" aria-label="会话 MCP 服务器">
      <div className="composer-mcp-description">
        <span>{snapshot.override === undefined ? "跟随智能体默认" : "当前会话自定义"}</span>
        <span aria-live="polite">{snapshot.saving ? "保存中…" : streaming ? "下次新请求生效" : "下条消息生效"}</span>
      </div>
      <Input aria-label="搜索 MCP 服务器" placeholder="搜索 MCP 服务器" value={search} onChange={(event) => setSearch(event.target.value)} />
      {loading && <p role="status">正在加载 MCP…</p>}
      {(loadError || snapshot.error) && <div className="composer-mcp-error" role="alert">
        <span>{snapshot.error || "无法加载 MCP 服务器。"}</span>
        <Button size="sm" variant="ghost" onClick={() => { setLoading(true); void load().then(applyResult); }}>重试</Button>
      </div>}
      {!loading && !loadError && <div className="composer-mcp-list">
        {visible.map((server) => <label className="composer-mcp-server" key={server.id}>
          <input type="checkbox" checked={selected.has(server.id)} disabled={unavailable || server.isActive === false}
            onChange={(event) => update(event.target.checked ? [...selectedIds, server.id] : selectedIds.filter((id) => id !== server.id))} />
          <span className="composer-mcp-name">{server.name}</span>
          <span className="composer-mcp-status" title={statuses[server.id]?.lastError}>
            {server.isActive === false ? "已停用 · 请到设置启用" : stateLabels[statuses[server.id]?.state] || "发送时连接"}
          </span>
        </label>)}
        {visible.length === 0 && <p>{servers.length ? "没有匹配的服务器" : "尚未配置 MCP 服务器"}</p>}
      </div>}
      <div className="composer-mcp-actions">
        <Button size="sm" variant="ghost" disabled={unavailable || snapshot.override === undefined} onClick={() => update(undefined)}>恢复智能体默认</Button>
        <Button size="sm" variant="ghost" disabled={unavailable} onClick={() => update([])}>全部取消</Button>
        <Button size="sm" variant="ghost" onClick={() => { onOpenSettings?.(); openMcpSettings(); }}>MCP 设置</Button>
      </div>
    </div>}
  </div>;
}
