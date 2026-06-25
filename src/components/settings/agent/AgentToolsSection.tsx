import { useCallback, useEffect, useMemo, useState } from "react";
import {
  getBuiltinToolCatalog,
  type AgentConfig,
  type AgentSkillDescriptor,
} from "../../../shared/agent";
import type {
  McpServer,
  McpRuntimeState,
  McpRuntimeStatus,
} from "../../../shared/mcpServer";
import { buildMcpCommandString } from "../../../shared/mcpServer";
import AgentCatalogToggleList from "./AgentCatalogToggleList";
import AgentMcpEditor from "./AgentMcpEditor";

const api = window.electronAPI;

type ToolTab = "builtin" | "mcp" | "skills";

interface McpPreset {
  id: string;
  name: string;
  description?: string;
  shouldConfig?: boolean;
  reference?: string;
}

interface Props {
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
  agent,
  onAgentChange,
}: Props) {
  const [tab, setTab] = useState<ToolTab>("builtin");
  const [search, setSearch] = useState("");
  const [mcpServers, setMcpServers] = useState<McpServer[]>([]);
  const [mcpPresets, setMcpPresets] = useState<McpPreset[]>([]);
  const [skills, setSkills] = useState<AgentSkillDescriptor[]>([]);
  const [loadingMcp, setLoadingMcp] = useState(true);
  const [loadingSkills, setLoadingSkills] = useState(true);
  const [addingMcp, setAddingMcp] = useState(false);
  const [editingMcp, setEditingMcp] = useState<McpServer | null>(null);
  const [mcpStatuses, setMcpStatuses] = useState<Record<string, McpRuntimeStatus>>({});
  const [loadingServerOps, setLoadingServerOps] = useState<Set<string>>(new Set());

  const catalog = useMemo(
    () => getBuiltinToolCatalog(agent.toolApprovalMode),
    [agent.toolApprovalMode]
  );

  const disabledTools = useMemo(
    () => new Set(agent.disabledToolIds),
    [agent.disabledToolIds]
  );

  const enabledToolIds = useMemo(() => {
    const ids = new Set<string>();
    for (const tool of catalog) {
      if (!disabledTools.has(tool.id)) ids.add(tool.id);
    }
    return ids;
  }, [catalog, disabledTools]);

  const boundMcpIds = useMemo(
    () => new Set(agent.mcpServerIds),
    [agent.mcpServerIds]
  );

  const enabledSkillIds = useMemo(
    () => new Set(agent.enabledSkillIds),
    [agent.enabledSkillIds]
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

  const loadSkills = useCallback(async () => {
    setLoadingSkills(true);
    try {
      const list = (await api.invoke("agent:skills:scan")) as AgentSkillDescriptor[];
      setSkills(Array.isArray(list) ? list : []);
    } catch {
      setSkills([]);
    } finally {
      setLoadingSkills(false);
    }
  }, []);

  useEffect(() => {
    void loadMcp();
    void loadSkills();
  }, [loadMcp, loadSkills]);

  useEffect(() => {
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
  }, []);

  const toggleBuiltinTool = (id: string, enabled: boolean) => {
    if (enabled) {
      onAgentChange({
        disabledToolIds: agent.disabledToolIds.filter((x) => x !== id),
      });
    } else if (!agent.disabledToolIds.includes(id)) {
      onAgentChange({ disabledToolIds: [...agent.disabledToolIds, id] });
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

  const toggleSkill = (id: string, enabled: boolean) => {
    if (enabled) {
      if (agent.enabledSkillIds.includes(id)) return;
      onAgentChange({ enabledSkillIds: [...agent.enabledSkillIds, id] });
    } else {
      onAgentChange({
        enabledSkillIds: agent.enabledSkillIds.filter((x) => x !== id),
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
    } finally {
      setLoadingServerOps((prev) => {
        const next = new Set(prev);
        next.delete(server.id);
        return next;
      });
      void loadMcp();
    }
  };

  const handleRestartServer = async (id: string) => {
    setLoadingServerOps((prev) => new Set(prev).add(id));
    try {
      await api.invoke("mcp:servers:restart", { id });
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
    } finally {
      setLoadingServerOps((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const installBuiltinMcp = async (id: string) => {
    const saved = (await api.invoke("mcp:servers:install_builtin", { id })) as McpServer;
    if (!agent.mcpServerIds.includes(id)) {
      onAgentChange({ mcpServerIds: [...agent.mcpServerIds, id] });
    }
    await loadMcp();
    const preset = mcpPresets.find((p) => p.id === id);
    if (preset?.shouldConfig || saved?.shouldConfig) {
      setEditingMcp(saved);
      setAddingMcp(false);
    }
  };

  const saveMcpServer = async (server: McpServer) => {
    await api.invoke("mcp:servers:save", server);
    setEditingMcp(null);
    setAddingMcp(false);
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
    type: "stdio",
    command: "npx",
    args: ["-y"],
    isActive: true,
    installSource: "manual",
  });

  const deleteMcp = async (id: string) => {
    await api.invoke("mcp:servers:delete", { id });
    onAgentChange({
      mcpServerIds: agent.mcpServerIds.filter((x) => x !== id),
    });
    if (editingMcp?.id === id) setEditingMcp(null);
    void loadMcp();
  };

  const openSkillsDir = async () => {
    await api.invoke("agent:skills:open_dir");
    void loadSkills();
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

  const skillItems = skills.map((s) => ({
    id: s.id,
    name: s.name,
    description: s.description || s.folderName,
    badge: s.isBuiltin ? "内置" : undefined,
  }));

  const inactivePresets = mcpPresets.filter((preset) => {
    const server = mcpServers.find((s) => s.id === preset.id);
    return !server || server.isActive === false;
  });

  return (
    <section className="settings-section agent-subsection">
      <h4>工具</h4>
      <p className="field-hint">
        内置工具、MCP 与技能均只能启用/禁用。MCP 编辑参考 Cherry Studio：参数每行一个、环境变量 KEY=value；保存前可「测试连接」。技能通过 `Skill` / `Skills` 按需加载与管理。
      </p>

      <div className="agent-tool-tabs">
        <button
          type="button"
          className={`agent-tool-tab${tab === "builtin" ? " active" : ""}`}
          onClick={() => setTab("builtin")}
        >
          内置工具
        </button>
        <button
          type="button"
          className={`agent-tool-tab${tab === "mcp" ? " active" : ""}`}
          onClick={() => setTab("mcp")}
        >
          MCP
        </button>
        <button
          type="button"
          className={`agent-tool-tab${tab === "skills" ? " active" : ""}`}
          onClick={() => setTab("skills")}
        >
          技能
        </button>
      </div>

      {(tab === "builtin" || tab === "skills") && (
        <div className="field agent-tool-search">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索…"
          />
        </div>
      )}

      {tab === "builtin" && (
        <AgentCatalogToggleList
          items={builtinCatalogItems}
          enabledIds={enabledToolIds}
          onToggle={toggleBuiltinTool}
          search={search}
          emptyLabel="无匹配的内置工具"
        />
      )}

      {tab === "mcp" && (
        <div className="agent-mcp-panel">
          {loadingMcp ? (
            <p className="field-hint">正在加载 MCP 服务器…</p>
          ) : (
            <>
              <div className="agent-catalog-block">
                <div className="agent-catalog-head">
                  <span>绑定到智能体</span>
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
                    <span>内置 MCP 预设</span>
                  </div>
                  <ul className="agent-toggle-list">
                    {inactivePresets.map((preset) => (
                      <li key={preset.id} className="agent-toggle-item">
                        <div className="agent-toggle-main">
                          <strong>{preset.name}</strong>
                          {preset.description && <p>{preset.description}</p>}
                          {preset.shouldConfig && (
                            <p className="field-hint">安装后可在下方编辑启动参数（如目录路径）。</p>
                          )}
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
                  <span>管理 MCP 服务器</span>
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

      {tab === "skills" && (
        <>
          <div className="agent-skills-toolbar">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => void openSkillsDir()}
            >
              打开技能目录
            </button>
            <button
              type="button"
              className="btn-ghost"
              onClick={() => void loadSkills()}
            >
              刷新
            </button>
          </div>
          {loadingSkills ? (
            <p className="field-hint">正在扫描技能…</p>
          ) : (
            <AgentCatalogToggleList
              items={skillItems}
              enabledIds={enabledSkillIds}
              onToggle={toggleSkill}
              search={search}
              emptyLabel="暂无技能。可在用户目录 agent-skills/ 下添加 SKILL.md。"
            />
          )}
        </>
      )}
    </section>
  );
}
