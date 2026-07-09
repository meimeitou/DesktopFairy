import { useMemo, useState } from "react";
import type { McpServer, McpServerType } from "../../../shared/mcpServer";
import {
  formatArgsMultiline,
  formatEnvMultiline,
  getMcpCommandPreview,
  parseArgsMultiline,
  parseEnvMultiline,
} from "../../../shared/mcpServer";

const api = window.electronAPI;

export interface McpTestResult {
  ok: boolean;
  message: string;
  toolCount?: number;
  tools?: string[];
}

interface Props {
  server: McpServer;
  title?: string;
  onSave: (server: McpServer) => void | Promise<void>;
  onCancel: () => void;
}

export default function AgentMcpEditor({
  server,
  title,
  onSave,
  onCancel,
}: Props) {
  const [name, setName] = useState(server.name);
  const [description, setDescription] = useState(server.description || "");
  const [type, setType] = useState<McpServerType>(server.type || "stdio");
  const [command, setCommand] = useState(server.command || "npx");
  const [argsText, setArgsText] = useState(formatArgsMultiline(server.args));
  const [envText, setEnvText] = useState(formatEnvMultiline(server.env));
  const [baseUrl, setBaseUrl] = useState(server.baseUrl || "");
  const [headersText, setHeadersText] = useState(formatEnvMultiline(server.headers));
  const [timeoutSec, setTimeoutSec] = useState(String(server.timeout ?? ""));
  const [longRunning, setLongRunning] = useState(Boolean(server.longRunning));
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<McpTestResult | null>(null);

  const preview = useMemo(
    () =>
      getMcpCommandPreview({
        ...server,
        type,
        command,
        args: parseArgsMultiline(argsText),
        env: parseEnvMultiline(envText),
        baseUrl,
        headers: parseEnvMultiline(headersText),
      }),
    [server, type, command, argsText, envText, baseUrl, headersText],
  );

  const buildPayload = (): McpServer => {
    const next: McpServer = {
      ...server,
      name: name.trim() || server.name,
      description: description.trim(),
      type,
      isActive: server.isActive !== false,
    };
    const parsedTimeout = Number(timeoutSec);
    if (Number.isFinite(parsedTimeout) && parsedTimeout > 0) {
      next.timeout = Math.round(parsedTimeout);
    } else {
      delete next.timeout;
    }
    next.longRunning = longRunning;
    if (type === "stdio") {
      next.command = command.trim();
      next.args = parseArgsMultiline(argsText);
      next.env = parseEnvMultiline(envText);
      next.baseUrl = undefined;
      next.headers = undefined;
    } else {
      next.baseUrl = baseUrl.trim();
      next.headers = parseEnvMultiline(headersText);
      next.command = undefined;
      next.args = undefined;
      next.env = undefined;
    }
    return next;
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    if (type === "stdio" && !command.trim()) return;
    if (type !== "stdio" && !baseUrl.trim()) return;
    setSaving(true);
    try {
      await onSave(buildPayload());
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const result = (await api.invoke("mcp:servers:test", buildPayload())) as McpTestResult;
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

  const pickDirectoryForArgs = async () => {
    const dir = (await api.invoke("mcp:servers:pick_directory")) as string | null;
    if (!dir) return;
    const lines = parseArgsMultiline(argsText);
    if (lines.length === 0) {
      setArgsText(dir);
      return;
    }
    lines[lines.length - 1] = dir;
    setArgsText(lines.join("\n"));
  };

  return (
    <div className="agent-mcp-editor">
      <div className="agent-mcp-editor-head">
        <strong>{title || `编辑 ${server.name}`}</strong>
        {server.reference && (
          <a
            className="agent-mcp-reference"
            href={server.reference}
            target="_blank"
            rel="noreferrer"
          >
            文档
          </a>
        )}
      </div>

      <div className="field">
        <label>名称</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={server.installSource === "builtin"}
        />
      </div>

      <div className="field">
        <label>描述</label>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="可选"
        />
      </div>

      <div className="field">
        <label>传输类型</label>
        <select
          value={type}
          onChange={(e) => setType(e.target.value as McpServerType)}
        >
          <option value="stdio">stdio（本地进程）</option>
          <option value="sse">SSE（远程）</option>
          <option value="streamableHttp">Streamable HTTP（远程）</option>
        </select>
        {type !== "stdio" && (
          <p className="field-hint">远程 MCP 暂不支持智能体运行时，请先使用 stdio。</p>
        )}
      </div>

      {type === "stdio" ? (
        <>
          <div className="field">
            <label>命令</label>
            <input
              type="text"
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              placeholder="npx"
            />
          </div>
          <div className="field">
            <label>参数（每行一个）</label>
            <textarea
              className="agent-mcp-textarea"
              value={argsText}
              onChange={(e) => setArgsText(e.target.value)}
              rows={4}
              placeholder={"-y\n@modelcontextprotocol/server-fetch"}
            />
            {server.shouldConfig && (
              <button
                type="button"
                className="btn-ghost agent-mcp-pick-dir"
                onClick={() => void pickDirectoryForArgs()}
              >
                选择目录（写入最后一行参数）
              </button>
            )}
          </div>
          <div className="field">
            <label>环境变量（每行 KEY=value）</label>
            <textarea
              className="agent-mcp-textarea"
              value={envText}
              onChange={(e) => setEnvText(e.target.value)}
              rows={3}
              placeholder={"MEMORY_FILE_PATH=/path/to/memory.json"}
            />
          </div>
        </>
      ) : (
        <>
          <div className="field">
            <label>Base URL</label>
            <input
              type="text"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="https://example.com/mcp"
            />
          </div>
          <div className="field">
            <label>Headers（每行 KEY=value）</label>
            <textarea
              className="agent-mcp-textarea"
              value={headersText}
              onChange={(e) => setHeadersText(e.target.value)}
              rows={3}
              placeholder={"Authorization=Bearer token"}
            />
          </div>
        </>
      )}

      <div className="field">
        <label>工具超时（秒）</label>
        <input
          type="number"
          min={1}
          value={timeoutSec}
          onChange={(e) => setTimeoutSec(e.target.value)}
          placeholder="默认 60"
        />
      </div>

      <div className="field">
        <label>
          <input
            type="checkbox"
            checked={longRunning}
            onChange={(e) => setLongRunning(e.target.checked)}
          />{" "}
          长时间运行模式（收到 MCP 进度时重置超时，最长 10 分钟）
        </label>
      </div>

      <div className="agent-mcp-preview">
        <span className="agent-mcp-preview-label">预览</span>
        <pre>{preview}</pre>
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

      <div className="agent-mcp-form-actions">
        <button
          type="button"
          className="btn-secondary"
          disabled={saving}
          onClick={() => void handleSave()}
        >
          {saving ? "保存中…" : "保存"}
        </button>
        <button
          type="button"
          className="btn-ghost"
          disabled={testing || type !== "stdio"}
          onClick={() => void handleTest()}
        >
          {testing ? "测试中…" : "测试连接"}
        </button>
        <button type="button" className="btn-ghost" onClick={onCancel}>
          取消
        </button>
      </div>
    </div>
  );
}
