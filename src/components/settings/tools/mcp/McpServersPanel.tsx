import { Button, Switch } from "animal-island-ui";
import { useCallback, useEffect, useState } from "react";
import HintTip from "../../../HintTip";
import type { AppSettings } from "../../../../shared/settings";
import type { AgentConfig } from "../../../../shared/agent";
import type {
  McpServer,
  McpRuntimeStatus,
} from "../../../../shared/mcpServer";
import { buildMcpCommandString } from "../../../../shared/mcpServer";
import McpStatusDot from "./McpStatusDot";
import McpServerEditor from "./McpServerEditor";
import McpServerDetail from "./McpServerDetail";

const api = window.electronAPI;

interface Props {
  settings: AppSettings;
  onAgentChange: (patch: Partial<AgentConfig>) => void;
}

function newMcpId() {
  return `mcp_${Date.now().toString(36)}`;
}

export default function McpServersPanel({ settings, onAgentChange }: Props) {
  const [servers, setServers] = useState<McpServer[]>([]);
  const [statuses, setStatuses] = useState<Record<string, McpRuntimeStatus>>({});
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [adding, setAdding] = useState(false);
  const [showJsonImport, setShowJsonImport] = useState(false);
  const [jsonText, setJsonText] = useState("");
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [serverOps, setServerOps] = useState<Set<string>>(new Set());


  const loadMcp = useCallback(async () => {
    setLoading(true);
    try {
      const list = (await api.invoke("mcp:servers:list")) as McpServer[];
      const next = Array.isArray(list) ? list : [];
      setServers(next);
      setLoaded(true);
      try {
        const st = (await api.invoke("mcp:servers:status", {})) as Record<
          string,
          McpRuntimeStatus
        >;
        setStatuses(typeof st === "object" && st ? st : {});
      } catch {
        setStatuses({});
      }
    } catch {
      setServers([]);
      setStatuses({});
      setLoaded(false);
    } finally {
      setLoading(false);
    }
  }, [onAgentChange]);

  useEffect(() => {
    void loadMcp();
  }, [loadMcp]);

  // Dangling-reference cleanup: drop agent.mcpServerIds pointing at removed servers.
  const boundIds = settings.agent.mcpServerIds;
  useEffect(() => {
    if (!loaded) return;
    const ids = new Set(servers.map((s) => s.id));
    if (boundIds.some((id) => !ids.has(id))) {
      onAgentChange({ mcpServerIds: boundIds.filter((id) => ids.has(id)) });
    }
  }, [servers, loaded, boundIds, onAgentChange]);

  useEffect(() => {
    const off = api.onMcpStatusChanged?.((payload) => {
      setStatuses((prev) => ({
        ...prev,
        [payload.serverId]: {
          state: payload.state,
          lastError: payload.lastError,
          checkedAt: payload.checkedAt,
        },
      }));
    });
    return () => off?.();
  }, []);

  const toggleActive = async (server: McpServer, active: boolean) => {
    setServerOps((prev) => new Set(prev).add(server.id));
    try {
      await api.invoke("mcp:servers:save", { ...server, isActive: active });
      if (active) {
        await api.invoke("mcp:servers:restart", { id: server.id });
      } else {
        await api.invoke("mcp:servers:stop", { id: server.id });
      }
      void loadMcp();
    } finally {
      setServerOps((prev) => {
        const next = new Set(prev);
        next.delete(server.id);
        return next;
      });
    }
  };

  const removeServer = async (id: string) => {
    if (!window.confirm("确定删除该 MCP 服务器？")) return;
    await api.invoke("mcp:servers:delete", { id });
    onAgentChange({
      mcpServerIds: settings.agent.mcpServerIds.filter((x) => x !== id),
    });
    void loadMcp();
  };

  const importJson = async () => {
    setJsonError(null);
    try {
      const result = (await api.invoke("mcp:servers:import_json", {
        json: jsonText,
      })) as { imported: number };
      setJsonText("");
      setShowJsonImport(false);
      void loadMcp();
      return result;
    } catch (e) {
      setJsonError(e instanceof Error ? e.message : String(e));
      return null;
    }
  };

  if (selectedId) {
    const server = servers.find((s) => s.id === selectedId);
    if (server) {
      return (
        <McpServerDetail
          server={server}
          status={statuses[server.id]}
          onBack={() => {
            setSelectedId(null);
            void loadMcp();
          }}
        />
      );
    }
  }

  return (
    <section className="settings-section agent-subsection">
      <div className="agent-skills-toolbar">
        <div className="agent-skills-toolbar-actions">
          <Button
            type="primary"
            size="small"
            onClick={() => {
              setAdding((v) => !v);
              setShowJsonImport(false);
            }}
          >
            {adding ? "收起手动创建" : "+ 手动创建"}
          </Button>
          <Button
            type="default"
            size="small"
            onClick={() => {
              setShowJsonImport((v) => !v);
              setAdding(false);
            }}
          >
            {showJsonImport ? "收起 JSON 导入" : "JSON 导入"}
          </Button>
          <Button type="default" size="small" onClick={() => void loadMcp()}>
            刷新
          </Button>
        </div>
        <HintTip tip="MCP 服务器全局管理。绑定到智能体请在「智能体 → MCP 绑定」中设置。" />
      </div>

      {adding && (
        <McpServerEditor
          server={{
            id: newMcpId(),
            name: "",
            description: "",
            type: "stdio",
            command: "",
            args: [],
            env: {},
            isActive: true,
            installSource: "custom",
          }}
          onSave={async (server) => {
            await api.invoke("mcp:servers:save", server);
            setAdding(false);
            void loadMcp();
          }}
          onCancel={() => setAdding(false)}
        />
      )}

      {showJsonImport && (
        <div className="tools-mcp-json-import">
          <p className="field-hint">
            粘贴 Claude Desktop / Cursor 风格配置（{"{"}"mcpServers": {"{"}…{"}"}{"}"}），顶层服务器 map 也可。
          </p>
          <textarea
            className="agent-mcp-textarea"
            value={jsonText}
            onChange={(e) => setJsonText(e.target.value)}
            rows={8}
            placeholder={'{"mcpServers":{"everything":{"command":"npx","args":["-y","@modelcontextprotocol/server-everything"]}}}'}
            aria-label="MCP JSON 配置"
          />
          {jsonError && (
            <p className="field-hint field-hint--after warn">{jsonError}</p>
          )}
          <Button
            type="primary"
            size="small"
            disabled={!jsonText.trim()}
            onClick={() => void importJson()}
          >
            解析并导入
          </Button>
        </div>
      )}

      {loading ? (
        <p className="agent-status-line">正在加载 MCP 服务器…</p>
      ) : servers.length === 0 ? (
        <p className="agent-catalog-empty">
          暂无 MCP 服务器。手动创建或从 JSON 导入。
        </p>
      ) : (
        <ul className="agent-toggle-list">
          {servers.map((server) => (
            <li key={server.id} className="agent-toggle-item">
              <div
                className="agent-toggle-main tools-mcp-list-main"
                role="button"
                tabIndex={0}
                onClick={() => setSelectedId(server.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") setSelectedId(server.id);
                }}
              >
                <div className="agent-toggle-title-row">
                  <McpStatusDot
                    state={statuses[server.id]?.state || "disabled"}
                    title={statuses[server.id]?.lastError}
                  />
                  <strong>{server.name}</strong>
                </div>
                {server.description && <p>{server.description}</p>}
                <p className="agent-mcp-command">
                  {buildMcpCommandString(server)}
                </p>
              </div>
              <div className="agent-catalog-actions">
                <Switch
                  checked={server.isActive !== false}
                  onChange={(checked) => void toggleActive(server, checked)}
                  disabled={serverOps.has(server.id)}
                  aria-label={
                    server.isActive !== false ? "全局启用" : "全局禁用"
                  }
                />
                <Button
                  type="default"
                  size="small"
                  danger
                  className="agent-catalog-remove"
                  onClick={() => void removeServer(server.id)}
                >
                  删除
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
