import { useCallback, useEffect, useMemo, useState } from "react";
import HintTip from "../../HintTip";
import {
  getBuiltinToolCatalog,
  getEnabledAgentBuiltinTools,
  type AgentConfig,
} from "../../../shared/agent";
import type {
  McpServer,
  McpRuntimeState,
  McpRuntimeStatus,
} from "../../../shared/mcpServer";
import { buildMcpCommandString, agentHasBoundMcpFetch } from "../../../shared/mcpServer";
import AgentCatalogToggleList from "./AgentCatalogToggleList";
import AgentContextualToolList from "./AgentContextualToolList";
import AgentMcpEditor from "./AgentMcpEditor";

const api = window.electronAPI;

type ToolPanel = "builtin" | "mcp";

interface McpPreset {
  id: string;
  name: string;
  description?: string;
  shouldConfig?: boolean;
  reference?: string;
}

interface Props {
  panel: ToolPanel;
  agent: AgentConfig;
  onAgentChange: (patch: Partial<AgentConfig>) => void;
}

function newMcpId() {
  return `mcp_${Date.now().toString(36)}`;
}

const MCP_STATUS_COLOR: Record<McpRuntimeState, string> = {
  connected: "#4ade80",
  connecting: "#facc15",
  error: "#f87171",
  disabled: "#6b7280",
};

function McpStatusDot({ state, title }: { state: McpRuntimeState; title?: string }) {
  return (
    <span
      className={`mcp-status-dot mcp-status-${state}`}
      title={title || state}
      style={{ backgroundColor: MCP_STATUS_COLOR[state] || "#6b7280" }}
    />
  );
}

export default function AgentToolsSection({
  panel,
  agent,
  onAgentChange,
}: Props) {
  const [search, setSearch] = useState("");
  const [mcpServers, setMcpServers] = useState<McpServer[]>([]);
  const [mcpPresets, setMcpPresets] = useState<McpPreset[]>([]);
  const [loadingMcp, setLoadingMcp] = useState(true);
  const [addingMcp, setAddingMcp] = useState(false);
  const [editingMcp, setEditingMcp] = useState<McpServer | null>(null);
  const [mcpStatuses, setMcpStatuses] = useState<Record<string, McpRuntimeStatus>>({});
  const [loadingServerOps, setLoadingServerOps] = useState<Set<string>>(new Set());

  const catalog = useMemo(
    () => getBuiltinToolCatalog(agent.toolApprovalMode),
    [agent.toolApprovalMode]
  );

  const hideWebFetch = useMemo(
    () => agentHasBoundMcpFetch(agent.mcpServerIds, mcpServers),
    [agent.mcpServerIds, mcpServers]
  );

  const localEnabledIds = useMemo(
    () =>
      new Set(
        getEnabledAgentBuiltinTools(agent, "local", { hideWebFetch }).map(
          (t) => t.id
        )
      ),
    [agent, hideWebFetch]
  );

  const terminalEnabledIds = useMemo(
    () =>
      new Set(
        getEnabledAgentBuiltinTools(agent, "terminal", { hideWebFetch }).map(
          (t) => t.id
        )
      ),
    [agent, hideWebFetch]
  );

  const boundMcpIds = useMemo(
    () => new Set(agent.mcpServerIds),
    [agent.mcpServerIds]
  );

  const loadMcp = useCallback(async () => {
    setLoadingMcp(true);
    try {
      const [servers, presets] = await Promise.all([
        api.invoke("mcp:servers:list") as Promise<McpServer[]>,
        api.invoke("mcp:servers:builtin_presets") as Promise<McpPreset[]>,
      ]);
      setMcpServers(Array.isArray(servers) ? servers : []);
      setMcpPresets(Array.isArray(presets) ? presets : []);

      try {
        const statuses = (await api.invoke("mcp:servers:status", {})) as Record<string, McpRuntimeStatus>;
        setMcpStatuses(typeof statuses === "object" && statuses ? statuses : {});
      } catch {
        setMcpStatuses({});
      }
    } catch {
      setMcpServers([]);
      setMcpPresets([]);
      setMcpStatuses({});
    } finally {
      setLoadingMcp(false);
    }
  }, []);

  useEffect(() => {
    void loadMcp();
  }, [loadMcp]);

  useEffect(() => {
    if (panel !== "mcp") return;
    const off = api.onMcpStatusChanged?.((payload) => {
      setMcpStatuses((prev) => ({
        ...prev,
        [payload.serverId]: {
          state: payload.state,
          lastError: payload.lastError,
          checkedAt: payload.checkedAt,
        },
      }));
    });
    return () => off?.();
  }, [panel]);

  const toggleLocalTool = (id: string, enabled: boolean) => {
    if (id === "Terminal") return; // Terminal is never available in the local context.
    if (id === "AskUserQuestion") return; // Always on except full-auto (mode-gated at runtime).
    if (id === "WebFetch" && hideWebFetch) return;
    if (enabled) {
      onAgentChange({
        disabledToolIds: agent.disabledToolIds.filter((x) => x !== id),
      });
    } else if (!agent.disabledToolIds.includes(id)) {
      onAgentChange({ disabledToolIds: [...agent.disabledToolIds, id] });
    }
  };

  const toggleTerminalTool = (id: string, enabled: boolean) => {
    if (id === "Bash") return; // Bash is never available in the terminal context.
    if (id === "AskUserQuestion") return;
    if (id === "WebFetch" && hideWebFetch) return;
    if (enabled) {
      onAgentChange({
        terminalDisabledToolIds: agent.terminalDisabledToolIds.filter(
          (x) => x !== id
        ),
      });
    } else if (!agent.terminalDisabledToolIds.includes(id)) {
      onAgentChange({
        terminalDisabledToolIds: [...agent.terminalDisabledToolIds, id],
      });
    }
  };

  const toggleMcpBinding = (id: string, enabled: boolean) => {
    if (enabled) {
      if (agent.mcpServerIds.includes(id)) return;
      onAgentChange({ mcpServerIds: [...agent.mcpServerIds, id] });
    } else {
      onAgentChange({
        mcpServerIds: agent.mcpServerIds.filter((x) => x !== id),
      });
    }
  };

  const toggleMcpActive = async (server: McpServer, active: boolean) => {
    setLoadingServerOps((prev) => new Set(prev).add(server.id));
    try {
      await api.invoke("mcp:servers:save", { ...server, isActive: active });
      // Fix: previously only saved config, leaving the child process alive after
      // disabling and not preconnecting after enabling. Now reconcile runtime.
      if (active) {
        await api.invoke("mcp:servers:restart", { id: server.id });
      } else {
        await api.invoke("mcp:servers:stop", { id: server.id });
      }
      try {
        const statuses = (await api.invoke("mcp:servers:status", {})) as Record<string, McpRuntimeStatus>;
        setMcpStatuses(typeof statuses === "object" && statuses ? statuses : {});
      } catch {
        /* ignore */
      }
      void loadMcp();
    } finally {
      setLoadingServerOps((prev) => {
        const next = new Set(prev);
        next.delete(server.id);
        return next;
      });
    }
  };

  const installBuiltinMcp = async (presetId: string) => {
    await api.invoke("mcp:servers:install_builtin", { id: presetId });
    void loadMcp();
  };

  const startAddMcp = () => {
    setAddingMcp(true);
    setEditingMcp(null);
  };

  const startEditMcp = (server: McpServer) => {
    setEditingMcp(server);
    setAddingMcp(false);
  };

  const cancelMcpEditor = () => {
    setEditingMcp(null);
    setAddingMcp(false);
  };

  const newMcpTemplate = (): McpServer => ({
    id: newMcpId(),
    name: "",
    description: "",
    type: "stdio",
    command: "",
    args: [],
    env: {},
    isActive: true,
    installSource: "custom",
  });

  const saveMcpServer = async (server: McpServer) => {
    await api.invoke("mcp:servers:save", server);
    setAddingMcp(false);
    setEditingMcp(null);
    void loadMcp();
  };

  const deleteMcp = async (id: string) => {
    await api.invoke("mcp:servers:delete", { id });
    onAgentChange({
      mcpServerIds: agent.mcpServerIds.filter((x) => x !== id),
    });
    if (editingMcp?.id === id) setEditingMcp(null);
    void loadMcp();
  };

  const handleRestartServer = async (id: string) => {
    setLoadingServerOps((prev) => new Set(prev).add(id));
    try {
      await api.invoke("mcp:servers:restart", { id });
      const statuses = (await api.invoke("mcp:servers:status", {})) as Record<string, McpRuntimeStatus>;
      setMcpStatuses(typeof statuses === "object" && statuses ? statuses : {});
    } finally {
      setLoadingServerOps((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const handleStopServer = async (id: string) => {
    setLoadingServerOps((prev) => new Set(prev).add(id));
    try {
      await api.invoke("mcp:servers:stop", { id });
      const statuses = (await api.invoke("mcp:servers:status", {})) as Record<string, McpRuntimeStatus>;
      setMcpStatuses(typeof statuses === "object" && statuses ? statuses : {});
    } finally {
      setLoadingServerOps((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const builtinCatalogItems = catalog.map((tool) => ({
    id: tool.id,
    name: tool.name,
    description: tool.description,
    badge: tool.approval === "auto" ? "自动批准" : undefined,
  }));

  const mcpBindItems = mcpServers
    .filter((s) => s.isActive !== false)
    .map((s) => ({
      id: s.id,
      name: s.name,
      description: s.description || buildMcpCommandString(s),
    }));

  const inactivePresets = mcpPresets.filter((preset) => {
    const server = mcpServers.find((s) => s.id === preset.id);
    return !server || server.isActive === false;
  });

  return (
    <section className="settings-section agent-subsection">
      {panel === "builtin" && (
        <>
          <div className="agent-tool-search-row">
            <div className="field agent-tool-search">
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="搜索…"
                aria-label="搜索内置工具"
              />
            </div>
            <HintTip
              tip={
                hideWebFetch
                  ? "按本地对话与终端分别开关。已绑定 MCP Fetch，内置 WebFetch 已隐藏以免重复。"
                  : "按本地对话与终端分别开关。Terminal 仅终端可用，Bash 仅本地可用。"
              }
            />
          </div>
          <AgentContextualToolList
            items={builtinCatalogItems}
            contexts={[
              {
                key: "local",
                label: "本地",
                enabledIds: localEnabledIds,
                forcedOffIds: new Set([
                  "Terminal",
                  ...(hideWebFetch ? ["WebFetch"] : []),
                  ...(agent.chatMode === "full-auto" ? ["AskUserQuestion"] : []),
                ]),
                onToggle: toggleLocalTool,
              },
              {
                key: "terminal",
                label: "终端",
                enabledIds: terminalEnabledIds,
                forcedOffIds: new Set([
                  "Bash",
                  ...(hideWebFetch ? ["WebFetch"] : []),
                  ...(agent.chatMode === "full-auto" ? ["AskUserQuestion"] : []),
                ]),
                onToggle: toggleTerminalTool,
              },
            ]}
            search={search}
            emptyLabel="无匹配的内置工具"
          />
        </>
      )}

      {panel === "mcp" && (
        <div className="agent-mcp-panel">
          {loadingMcp ? (
            <p className="agent-status-line">正在加载 MCP 服务器…</p>
          ) : (
            <>
              <div className="agent-catalog-block">
                <div className="agent-catalog-head">
                  <span className="agent-catalog-head-label">
                    绑定到智能体
                    <HintTip tip="仅已启用的 MCP 会出现在这里。打开开关后，智能体即可调用该服务器的工具。" />
                  </span>
                </div>
                <div className="agent-catalog-body">
                  {mcpBindItems.length === 0 ? (
                    <p className="agent-catalog-empty">暂无可用 MCP，请先安装或添加。</p>
                  ) : (
                    <AgentCatalogToggleList
                      items={mcpBindItems}
                      enabledIds={boundMcpIds}
                      onToggle={toggleMcpBinding}
                      emptyLabel="暂无 MCP"
                    />
                  )}
                </div>
              </div>

              {inactivePresets.length > 0 && (
                <div className="agent-catalog-block">
                  <div className="agent-catalog-head">
                    <span className="agent-catalog-head-label">
                      内置预设
                      <HintTip tip="安装后可在下方编辑启动参数，例如目录路径。" />
                    </span>
                  </div>
                  <ul className="agent-toggle-list">
                    {inactivePresets.map((preset) => (
                      <li key={preset.id} className="agent-toggle-item">
                        <div className="agent-toggle-main">
                          <strong>{preset.name}</strong>
                          {preset.description && <p>{preset.description}</p>}
                        </div>
                        <button
                          type="button"
                          className="agent-catalog-add-btn"
                          onClick={() => void installBuiltinMcp(preset.id)}
                        >
                          安装
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="agent-catalog-block">
                <div className="agent-catalog-head">
                  <span className="agent-catalog-head-label">
                    服务器
                    <HintTip tip="全局启停 MCP 进程。绑定到智能体与此处开关相互独立。" />
                  </span>
                  <button
                    type="button"
                    className="agent-catalog-add-btn"
                    onClick={() => startAddMcp()}
                  >
                    + 自定义
                  </button>
                </div>
                <ul className="agent-toggle-list">
                  {mcpServers
                    .filter((s) => s.installSource !== "builtin" || s.isActive !== false)
                    .map((server) => (
                      <li key={server.id} className="agent-toggle-item">
                        <div className="agent-toggle-main">
                          <div className="agent-toggle-title-row">
                            <McpStatusDot
                              state={mcpStatuses[server.id]?.state || "disabled"}
                              title={mcpStatuses[server.id]?.lastError}
                            />
                            <strong>{server.name}</strong>
                            {server.installSource === "builtin" && (
                              <span className="agent-tool-auto-badge">内置</span>
                            )}
                          </div>
                          {server.description && (
                            <p>{server.description}</p>
                          )}
                          <p className="agent-mcp-command">
                            {buildMcpCommandString(server)}
                          </p>
                        </div>
                        <div className="agent-catalog-actions">
                          <button
                            type="button"
                            className="agent-catalog-add-btn small"
                            onClick={() => startEditMcp(server)}
                          >
                            编辑
                          </button>
                          {server.isActive !== false && (
                            <>
                              <button
                                type="button"
                                className="agent-mcp-action-btn"
                                disabled={loadingServerOps.has(server.id)}
                                onClick={() => void handleRestartServer(server.id)}
                              >
                                重启
                              </button>
                              <button
                                type="button"
                                className="agent-mcp-action-btn"
                                disabled={loadingServerOps.has(server.id)}
                                onClick={() => void handleStopServer(server.id)}
                              >
                                停止
                              </button>
                            </>
                          )}
                          <label
                            className="toggle agent-toggle-switch"
                            title={server.isActive !== false ? "全局启用" : "全局禁用"}
                          >
                            <input
                              type="checkbox"
                              checked={server.isActive !== false}
                              onChange={(e) =>
                                void toggleMcpActive(server, e.target.checked)
                              }
                            />
                            <span className="toggle-track" />
                          </label>
                          {server.installSource !== "builtin" && (
                            <button
                              type="button"
                              className="agent-catalog-remove"
                              onClick={() => void deleteMcp(server.id)}
                            >
                              删除
                            </button>
                          )}
                        </div>
                      </li>
                    ))}
                </ul>
              </div>

              {(editingMcp || addingMcp) && (
                <AgentMcpEditor
                  server={editingMcp || newMcpTemplate()}
                  title={addingMcp ? "添加 MCP 服务器" : undefined}
                  onSave={async (server) => {
                    const isNew = addingMcp;
                    await saveMcpServer(server);
                    if (isNew && !agent.mcpServerIds.includes(server.id)) {
                      onAgentChange({
                        mcpServerIds: [...agent.mcpServerIds, server.id],
                      });
                    }
                  }}
                  onCancel={cancelMcpEditor}
                />
              )}
            </>
          )}
        </div>
      )}
    </section>
  );
}
