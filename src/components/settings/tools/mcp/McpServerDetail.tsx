import { Button, Switch } from "@cherrystudio/ui";

import { useCallback, useEffect, useState } from "react";
import type {
  McpServer,
  McpRuntimeStatus,
  McpServerLogEntry,
} from "../../../../shared/mcpServer";
import { buildMcpCommandString } from "../../../../shared/mcpServer";
import McpStatusDot from "./McpStatusDot";
import McpServerEditModal from "./McpServerEditModal";
import type { McpTestResult } from "./mcpServerForm";

const api = window.electronAPI;

type DetailTab = "general" | "tools" | "prompts" | "resources" | "logs";

const TABS: { id: DetailTab; label: string }[] = [
  { id: "general", label: "通用" },
  { id: "tools", label: "工具" },
  { id: "prompts", label: "提示" },
  { id: "resources", label: "资源" },
  { id: "logs", label: "日志" },
];

interface McpToolInfo {
  name: string;
  description?: string;
  inputSchema?: unknown;
}

interface McpPromptInfo {
  name: string;
  description?: string;
  arguments?: { name: string; description?: string; required?: boolean }[];
}

interface McpResourceInfo {
  uri: string;
  name?: string;
  mimeType?: string;
}

interface Props {
  server: McpServer;
  status?: McpRuntimeStatus;
  onBack: () => void;
}

export default function McpServerDetail({ server, status, onBack }: Props) {
  const [tab, setTab] = useState<DetailTab>("general");
  const [disabledToolNames, setDisabledToolNames] = useState<string[]>(
    server.disabledToolNames || [],
  );
  const [tools, setTools] = useState<McpToolInfo[] | null>(null);
  const [toolsError, setToolsError] = useState<string | null>(null);
  const [prompts, setPrompts] = useState<McpPromptInfo[] | null>(null);
  const [promptsError, setPromptsError] = useState<string | null>(null);
  const [resources, setResources] = useState<McpResourceInfo[] | null>(null);
  const [resourcesError, setResourcesError] = useState<string | null>(null);
  const [logs, setLogs] = useState<McpServerLogEntry[]>([]);
  const [editing, setEditing] = useState(false);
  const [testResult, setTestResult] = useState<McpTestResult | null>(null);
  const [testing, setTesting] = useState(false);

  const loadTools = useCallback(async () => {
    setToolsError(null);
    try {
      const list = (await api.invoke("mcp:servers:tools", {
        id: server.id,
      })) as McpToolInfo[];
      setTools(Array.isArray(list) ? list : []);
    } catch (e) {
      setTools(null);
      setToolsError(e instanceof Error ? e.message : String(e));
    }
  }, [server.id]);

  const loadPrompts = useCallback(async () => {
    setPromptsError(null);
    try {
      const list = (await api.invoke("mcp:servers:prompts", {
        id: server.id,
      })) as McpPromptInfo[];
      setPrompts(Array.isArray(list) ? list : []);
    } catch (e) {
      setPrompts(null);
      setPromptsError(e instanceof Error ? e.message : String(e));
    }
  }, [server.id]);

  const loadResources = useCallback(async () => {
    setResourcesError(null);
    try {
      const list = (await api.invoke("mcp:servers:resources", {
        id: server.id,
      })) as McpResourceInfo[];
      setResources(Array.isArray(list) ? list : []);
    } catch (e) {
      setResources(null);
      setResourcesError(e instanceof Error ? e.message : String(e));
    }
  }, [server.id]);

  const loadLogs = useCallback(async () => {
    try {
      const list = (await api.invoke("mcp:servers:logs", {
        id: server.id,
      })) as McpServerLogEntry[];
      setLogs(Array.isArray(list) ? list : []);
    } catch {
      setLogs([]);
    }
  }, [server.id]);

  useEffect(() => {
    if (tab === "tools") void loadTools();
    if (tab === "prompts") void loadPrompts();
    if (tab === "resources") void loadResources();
    if (tab === "logs") void loadLogs();
  }, [tab, loadTools, loadPrompts, loadResources, loadLogs]);

  useEffect(() => {
    const off = api.onMcpLog?.((payload) => {
      if (payload.serverId !== server.id) return;
      setLogs((prev) => {
        const next = [...prev, payload];
        return next.length > 200 ? next.slice(next.length - 200) : next;
      });
    });
    return () => off?.();
  }, [server.id]);

  const toggleTool = async (toolName: string, enabled: boolean) => {
    const next = enabled
      ? disabledToolNames.filter((n) => n !== toolName)
      : [...disabledToolNames, toolName];
    setDisabledToolNames(next); // update local state immediately so consecutive toggles don't clobber each other
    await api.invoke("mcp:servers:save", {
      ...server,
      disabledToolNames: next.length ? next : undefined,
    });
    void loadTools();
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const result = (await api.invoke("mcp:servers:test", server)) as McpTestResult;
      setTestResult(result);
    } catch (e) {
      setTestResult({
        ok: false,
        message: e instanceof Error ? e.message : String(e),
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <section className="settings-section agent-subsection">
      <div className="tools-mcp-detail-head">
        <Button variant="ghost" size="sm" onClick={onBack}>
          ← 返回列表
        </Button>
        <div className="agent-toggle-title-row">
          <McpStatusDot
            state={status?.state || "disabled"}
            title={status?.lastError}
          />
          <strong>{server.name}</strong>
        </div>
        <div className="agent-catalog-actions">
          <Button variant="outline" size="sm" disabled={testing} onClick={() => void handleTest()}>
            {testing ? "测试中…" : "测试连接"}
          </Button>
        </div>
      </div>
      {testResult && (
        <p className={`agent-mcp-test-result${testResult.ok ? " ok" : " err"}`}>
          {testResult.message}
          {testResult.ok && testResult.tools?.length ? (
            <>
              {" "}
              · {testResult.toolCount} 个工具
            </>
          ) : null}
        </p>
      )}

      <nav className="agent-section-nav" aria-label="MCP 服务器详情">
        {TABS.map((t) => (
          <Button variant="ghost" key={t.id} className={`agent-section-nav-item${tab === t.id ? " active" : ""}`} aria-current={tab === t.id ? "page" : undefined} onClick={() => setTab(t.id)}>
            {t.label}
          </Button>
        ))}
      </nav>

      {tab === "general" && (
        <div className="tools-mcp-general-card">
          <div className="tools-mcp-general-fields">
            <div className="tools-mcp-general-field">
              <span className="tools-mcp-general-label">名称</span>
              <span>{server.name}</span>
            </div>
            <div className="tools-mcp-general-field">
              <span className="tools-mcp-general-label">描述</span>
              <span>{server.description || "—"}</span>
            </div>
            <div className="tools-mcp-general-field">
              <span className="tools-mcp-general-label">传输类型</span>
              <span>
                {server.type === "stdio"
                  ? "stdio（本地进程）"
                  : server.type === "sse"
                    ? "SSE（远程）"
                    : "Streamable HTTP（远程）"}
              </span>
            </div>
            {server.type === "stdio" ? (
              <>
                <div className="tools-mcp-general-field">
                  <span className="tools-mcp-general-label">命令</span>
                  <span className="tools-mcp-general-mono">
                    {buildMcpCommandString(server)}
                  </span>
                </div>
                {Object.keys(server.env || {}).length > 0 && (
                  <div className="tools-mcp-general-field">
                    <span className="tools-mcp-general-label">环境变量</span>
                    <span className="tools-mcp-general-mono">
                      {Object.entries(server.env || {})
                        .map(([k, v]) => `${k}=${v}`)
                        .join("\n")}
                    </span>
                  </div>
                )}
              </>
            ) : (
              <div className="tools-mcp-general-field">
                <span className="tools-mcp-general-label">URL</span>
                <span className="tools-mcp-general-mono">
                  {server.baseUrl || "—"}
                </span>
              </div>
            )}
            <div className="tools-mcp-general-field">
              <span className="tools-mcp-general-label">超时</span>
              <span>{server.timeout != null ? `${server.timeout} 秒` : "60 秒（默认）"}</span>
            </div>
            <div className="tools-mcp-general-field">
              <span className="tools-mcp-general-label">长时间运行</span>
              <span>{server.longRunning ? "开启" : "关闭"}</span>
            </div>
          </div>
          <Button variant="default" size="sm" onClick={() => setEditing(true)}>
            编辑服务器信息
          </Button>
        </div>
      )}

      {editing && (
        <McpServerEditModal
          open
          server={server}
          title={`编辑 - ${server.name}`}
          onClose={() => setEditing(false)}
          onSave={async (next) => {
            await api.invoke("mcp:servers:save", next);
            // Config changed on a live server: reconcile the runtime connection.
            if (next.isActive !== false) {
              await api.invoke("mcp:servers:restart", { id: server.id });
            }
            setEditing(false);
            onBack();
          }}
        />
      )}

      {tab === "tools" && (
        <div className="tools-mcp-tab-body">
          {toolsError ? (
            <p className="field-hint field-hint--after warn">
              服务器未连接：{toolsError}
            </p>
          ) : tools === null ? (
            <p className="agent-status-line">正在加载工具…</p>
          ) : tools.length === 0 ? (
            <p className="agent-catalog-empty">未发现工具或服务器未连接。</p>
          ) : (
            <ul className="agent-toggle-list">
              {tools.map((tool) => {
                const disabled = disabledToolNames.includes(tool.name);
                return (
                  <li key={tool.name} className="agent-toggle-item">
                    <div className="agent-toggle-main">
                      <div className="agent-toggle-title-row">
                        <strong>{tool.name}</strong>
                      </div>
                      {tool.description && <p>{tool.description}</p>}
                      {tool.inputSchema &&
                        Object.keys(
                          (tool.inputSchema as { properties?: object })
                            .properties || {},
                        ).length > 0 && (
                          <details className="tools-mcp-schema">
                            <summary>参数 schema</summary>
                            <pre>
                              {JSON.stringify(tool.inputSchema, null, 2)}
                            </pre>
                          </details>
                        )}
                    </div>
                    <Switch
                      checked={!disabled}
                      onCheckedChange={(checked) => void toggleTool(tool.name, checked)}
                      aria-label={disabled ? "启用工具" : "禁用工具"}
                    />
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      {tab === "prompts" && (
        <div className="tools-mcp-tab-body">
          {promptsError ? (
            <p className="field-hint field-hint--after warn">
              服务器未连接：{promptsError}
            </p>
          ) : prompts === null ? (
            <p className="agent-status-line">正在加载提示…</p>
          ) : prompts.length === 0 ? (
            <p className="agent-catalog-empty">该服务器未提供提示。</p>
          ) : (
            <ul className="agent-toggle-list">
              {prompts.map((p) => (
                <li key={p.name} className="agent-toggle-item">
                  <div className="agent-toggle-main">
                    <div className="agent-toggle-title-row">
                      <strong>{p.name}</strong>
                    </div>
                    {p.description && <p>{p.description}</p>}
                    {p.arguments?.length ? (
                      <p className="agent-mcp-command">
                        参数：{p.arguments.map((a) => a.name).join("、")}
                      </p>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {tab === "resources" && (
        <div className="tools-mcp-tab-body">
          {resourcesError ? (
            <p className="field-hint field-hint--after warn">
              服务器未连接：{resourcesError}
            </p>
          ) : resources === null ? (
            <p className="agent-status-line">正在加载资源…</p>
          ) : resources.length === 0 ? (
            <p className="agent-catalog-empty">该服务器未提供资源。</p>
          ) : (
            <ul className="agent-toggle-list">
              {resources.map((r) => (
                <li key={r.uri} className="agent-toggle-item">
                  <div className="agent-toggle-main">
                    <div className="agent-toggle-title-row">
                      <strong>{r.name || r.uri}</strong>
                    </div>
                    <p className="agent-mcp-command">
                      {r.uri}
                      {r.mimeType ? ` · ${r.mimeType}` : ""}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {tab === "logs" && (
        <div className="tools-mcp-tab-body">
          {logs.length === 0 ? (
            <p className="agent-catalog-empty">暂无日志。</p>
          ) : (
            <div className="tools-mcp-logs">
              {[...logs].reverse().map((entry, i) => (
                <div key={`${entry.timestamp}-${i}`} className="tools-mcp-log-line">
                  <span className="tools-mcp-log-time">
                    {new Date(entry.timestamp).toLocaleTimeString()}
                  </span>
                  <span className={`tools-mcp-log-level ${entry.level}`}>
                    {entry.level}
                  </span>
                  <span className="tools-mcp-log-source">{entry.source}</span>
                  <span className="tools-mcp-log-msg">{entry.message}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
