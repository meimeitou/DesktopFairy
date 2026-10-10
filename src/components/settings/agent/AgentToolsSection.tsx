import { Input } from "animal-island-ui";
import { useCallback, useEffect, useMemo, useState } from "react";
import HintTip from "../../HintTip";
import {
  getBuiltinToolCatalog,
  getEnabledAgentBuiltinTools,
  type AgentConfig,
} from "../../../shared/agent";
import type { McpServer } from "../../../shared/mcpServer";
import { buildMcpCommandString, agentHasBoundMcpFetch } from "../../../shared/mcpServer";
import AgentCatalogToggleList from "./AgentCatalogToggleList";
import AgentContextualToolList from "./AgentContextualToolList";

const api = window.electronAPI;

type ToolPanel = "builtin" | "mcp";

interface Props {
  panel: ToolPanel;
  agent: AgentConfig;
  onAgentChange: (patch: Partial<AgentConfig>) => void;
}

export default function AgentToolsSection({
  panel,
  agent,
  onAgentChange,
}: Props) {
  const [search, setSearch] = useState("");
  const [mcpServers, setMcpServers] = useState<McpServer[]>([]);
  const [loadingMcp, setLoadingMcp] = useState(true);
  const [mcpLoaded, setMcpLoaded] = useState(false);

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
    if (id === "bash") return; // bash is never available in the terminal context.
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
                ]),
                // Always on at the config level; full-auto gates it at runtime.
                forcedOnIds: new Set(
                  agent.chatMode === "full-auto" ? ["AskUserQuestion"] : [],
                ),
                onToggle: toggleLocalTool,
              },
              {
                key: "terminal",
                label: "终端",
                enabledIds: terminalEnabledIds,
                forcedOffIds: new Set([
                  "bash",
                  ...(hideWebFetch ? ["WebFetch"] : []),
                ]),
                forcedOnIds: new Set(
                  agent.chatMode === "full-auto" ? ["AskUserQuestion"] : [],
                ),
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
