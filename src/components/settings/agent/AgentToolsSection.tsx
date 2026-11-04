import Select from "../../Select";
import { Input } from "animal-island-ui";
import { useCallback, useEffect, useId, useMemo, useState } from "react";
import HintTip from "../../HintTip";
import {
  getBuiltinToolCatalog,
  getEffectiveToolApprovalMode,
  getEnabledAgentBuiltinTools,
  type AgentConfig,
  type AgentEnvironment,
  AGENT_ENVIRONMENT_POLICY,
  ALWAYS_ENABLED_TOOL_IDS,
} from "../../../shared/agent";
import type { McpServer } from "../../../shared/mcpServer";
import { buildMcpCommandString, agentHasBoundMcpFetch } from "../../../shared/mcpServer";
import AgentCatalogToggleList from "./AgentCatalogToggleList";

const api = window.electronAPI;

type ToolPanel = "builtin" | "mcp";

interface Props {
  panel: ToolPanel;
  agent: AgentConfig;
  onAgentChange: (patch: Partial<AgentConfig>) => void;
  /** Which context this panel edits; required for the builtin panel. */
  context?: AgentEnvironment;
}

export default function AgentToolsSection({
  panel,
  agent,
  onAgentChange,
  context: initialContext = "local",
}: Props) {
  const environmentLabelId = useId();
  const [previewContext, setPreviewContext] = useState<AgentEnvironment>(initialContext);
  const unified = !!agent.toolOverrides;
  const context = unified ? previewContext : initialContext;
  const [search, setSearch] = useState("");
  const [mcpServers, setMcpServers] = useState<McpServer[]>([]);
  const [loadingMcp, setLoadingMcp] = useState(true);
  const [mcpLoaded, setMcpLoaded] = useState(false);
  const approvalMode = getEffectiveToolApprovalMode(agent);
  const catalog = useMemo(
    () => getBuiltinToolCatalog(approvalMode),
    [approvalMode]
  );

  const hideWebFetch = useMemo(
    () => agentHasBoundMcpFetch(agent.mcpServerIds, mcpServers),
    [agent.mcpServerIds, mcpServers]
  );

  const contextEnabledIds = useMemo(
    () =>
      new Set(
        getEnabledAgentBuiltinTools(agent, context, { hideWebFetch }).map(
          (t) => t.id
        )
      ),
    [agent, context, hideWebFetch]
  );

  const defaultEnabledIds = useMemo(() => new Set(
    getEnabledAgentBuiltinTools({ ...agent, disabledToolIds: [], toolOverrides: {} }, context, { hideWebFetch }).map((t) => t.id),
  ), [agent, context, hideWebFetch]);

  const boundMcpIds = useMemo(
    () => new Set(agent.mcpServerIds),
    [agent.mcpServerIds]
  );


  const loadMcp = useCallback(async () => {
    setLoadingMcp(true);
    try {
      const servers = (await api.invoke("mcp:servers:list")) as McpServer[];
      const next = Array.isArray(servers) ? servers : [];
      setMcpServers(next);
      setMcpLoaded(true);
    } catch {
      setMcpServers([]);
      setMcpLoaded(false);
    } finally {
      setLoadingMcp(false);
    }
  }, []);

  useEffect(() => {
    void loadMcp();
  }, [loadMcp]);

  // Dangling-reference cleanup: drop ids pointing at removed servers.
  const boundIds = agent.mcpServerIds;
  useEffect(() => {
    if (!mcpLoaded) return;
    const ids = new Set(mcpServers.map((s) => s.id));
    if (boundIds.some((id) => !ids.has(id))) {
      onAgentChange({
        mcpServerIds: boundIds.filter((id) => ids.has(id)),
      });
    }
  }, [mcpServers, mcpLoaded, boundIds, onAgentChange]);
  const toggleTool = (id: string, enabled: boolean) => {
    if (AGENT_ENVIRONMENT_POLICY[context].blocked.includes(id)) return;
    if (id === "AskUserQuestion" || (id === "WebFetch" && hideWebFetch)) return;
    if (unified) {
      onAgentChange({ toolOverrides: { ...agent.toolOverrides, [id]: enabled } });
      return;
    }
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

  return (
    <section className="settings-section agent-subsection">
      {panel === "builtin" && (
        <>
          {unified && (
            <div className="field agent-environment-preview">
              <label id={environmentLabelId}>环境预览</label>
              <Select aria-labelledby={environmentLabelId} value={context}
                onChange={(value) => setPreviewContext(value as AgentEnvironment)}
                options={[
                  { key: "local", label: "本机对话" },
                  { key: "terminal", label: "终端 / 快速连接" },
                  { key: "terminal-ssh", label: "已保存 SSH 主机终端" },
                  { key: "host", label: "主机对话" },
                ]}
              />
              <p>工具偏好在各环境共用；SSH 文件工具始终作用于绑定主机和配置账号。</p>
            </div>
          )}
          <div className="agent-tool-search-row">
            <div className="field agent-tool-search">
              <Input shadow type="search" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="搜索…"
              aria-label="搜索内置工具" />
            </div>
            <HintTip
              tip={
                hideWebFetch
                  ? `当前场景（${context.startsWith("terminal") ? "终端" : context === "host" ? "主机" : "本地"}）下强制与默认规则已体现。已绑定 MCP Fetch，内置 WebFetch 已隐藏以免重复。`
                  : context === "host"
                  ? "主机场景强制禁用本地文件与命令工具；ssh_* 远程工具默认可用，MCP 与 McpManager 同本地智能体。"
                  : context === "terminal-ssh"
                  ? "Terminal 操作当前交互会话；SSH 文件工具操作原绑定主机。二次 SSH、sudo 或进入容器不会改变文件工具目标。"
                  : context === "terminal"
                  ? "终端场景强制禁用 bash；Terminal、ssh_exec 与 ssh_hosts 默认可用。"
                    : "本地场景强制禁用 Terminal、ssh_exec 与 ssh_hosts；bash 需手动启用。"
              }
            />
          </div>
          <AgentCatalogToggleList
            layout="card"
            items={builtinCatalogItems}
            enabledIds={contextEnabledIds}
            forcedDisabledIds={new Set([
              ...AGENT_ENVIRONMENT_POLICY[context].blocked,
              // ALWAYS_ENABLED 工具偏好锁不住，直接按「场景强制」展示。
              ...ALWAYS_ENABLED_TOOL_IDS,
              ...(hideWebFetch ? ["WebFetch"] : []),
            ])}
            search={search}
            defaultEnabledIds={defaultEnabledIds}
            toolOverrides={agent.toolOverrides}
            onPreference={unified ? (id, value) => {
              // AskUserQuestion 是 ALWAYS_ENABLED（偏好覆盖不了），与 toggleTool 的 guard 对齐。
              if (id === "AskUserQuestion") return;
              const overrides = { ...agent.toolOverrides };
              if (value === "default") delete overrides[id]; else overrides[id] = value === "on";
              onAgentChange({ toolOverrides: overrides });
            } : undefined}
            onToggle={toggleTool}
            emptyLabel="无匹配的内置工具"
          />
        </>
      )}

      {panel === "mcp" && (
        <div className="agent-mcp-panel">
          {loadingMcp ? (
            <p className="agent-status-line">正在加载 MCP 服务器…</p>
          ) : (
            <div className="agent-catalog-block">
              <div className="agent-catalog-head">
                <span className="agent-catalog-head-label">
                  绑定到智能体
                  <HintTip tip="仅已启用的 MCP 会出现在这里。服务器的添加与全局启停请在「设置 → 工具」中操作。" />
                </span>
              </div>
              <div className="agent-catalog-body">
                {mcpBindItems.length === 0 ? (
                  <p className="agent-catalog-empty">
                    暂无可用 MCP。请先在「设置 → 工具」中添加并启用服务器。
                  </p>
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
          )}
        </div>
      )}
    </section>
  );
}
