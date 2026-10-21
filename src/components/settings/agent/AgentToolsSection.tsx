import { Input } from "animal-island-ui";
import { useCallback, useEffect, useMemo, useState } from "react";
import HintTip from "../../HintTip";
import {
  getBuiltinToolCatalog,
  getEffectiveToolApprovalMode,
  getEnabledAgentBuiltinTools,
  type AgentConfig,
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
  context?: "local" | "terminal";
}

export default function AgentToolsSection({
  panel,
  agent,
  onAgentChange,
  context = "local",
}: Props) {
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
    // Context-forced tools are not user-configurable per context anymore.
    if (id === "Terminal" && context === "local") return;
    if (id === "ssh_exec" && context === "local") return;
    if (id === "ssh_hosts" && context === "local") return;
    if (id === "bash" && context === "terminal") return;
    if (id === "AskUserQuestion") return;
    if (id === "WebFetch" && hideWebFetch) return;
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
          <div className="agent-tool-search-row">
            <div className="field agent-tool-search">
              <Input shadow type="search" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="搜索…"
              aria-label="搜索内置工具" />
            </div>
            <HintTip
              tip={
                hideWebFetch
                  ? `当前场景（${context === "terminal" ? "终端" : "本地"}）下强制与默认规则已体现。已绑定 MCP Fetch，内置 WebFetch 已隐藏以免重复。`
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
              ...(context === "local" ? ["Terminal", "ssh_exec", "ssh_hosts"] : ["bash"]),
              ...(hideWebFetch ? ["WebFetch"] : []),
            ])}
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
