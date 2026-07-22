import { useCallback, useEffect, useMemo, useState } from "react";
import ModelSelector from "../ModelSelector";
import {
  buildCliConfigFiles,
  buildCliLaunchEnv,
  CLI_INSTALL_HINTS,
  CLI_TOOL_LABELS,
  CODE_CLI_IDS,
  filterProvidersForCliTool,
  type CliBinaryStatus,
  type CodeCliId,
} from "../../shared/codeCli";
import type { CodeCliToolState, CodeProject } from "../../shared/codeProjects";
import { loadSettings, type LlmProvider } from "../../shared/settings";
import "./CodeCliPanel.css";

const api = window.electronAPI;

interface Props {
  project: CodeProject | null;
  cliTool: CodeCliId;
  onCliToolChange: (tool: CodeCliId) => void;
  toolState?: CodeCliToolState;
  onToolStateChange: (toolId: CodeCliId, state: CodeCliToolState) => void;
}

interface ModelOption {
  providerId: string;
  providerName: string;
  modelId: string;
  label: string;
}

function buildModelOptions(providers: LlmProvider[]): ModelOption[] {
  const options: ModelOption[] = [];
  for (const p of providers) {
    for (const m of p.models) {
      options.push({
        providerId: p.id,
        providerName: p.name,
        modelId: m,
        label: `${p.name} / ${m}`,
      });
    }
  }
  return options;
}

function encodeModelKey(providerId: string, modelId: string): string {
  return `${providerId}::${modelId}`;
}

function decodeModelKey(key: string): { providerId: string; modelId: string } | null {
  const idx = key.indexOf("::");
  if (idx < 0) return null;
  return { providerId: key.slice(0, idx), modelId: key.slice(idx + 2) };
}

function cleanEnvVars(envVars: Record<string, string>): Record<string, string> {
  const cleanEnv: Record<string, string> = {};
  for (const [k, v] of Object.entries(envVars)) {
    if (k.trim() && v.trim()) cleanEnv[k.trim()] = v.trim();
  }
  return cleanEnv;
}

const ENV_HINT: Partial<Record<CodeCliId, string[]>> = {
  "claude-code": [
    "ANTHROPIC_BASE_URL",
    "ANTHROPIC_MODEL",
    "ENABLE_TOOL_SEARCH",
    "DISABLE_AUTOUPDATER",
    "DISABLE_COMPACT",
    "CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC",
    "CLAUDE_CODE_MAX_OUTPUT_TOKENS",
  ],
  "openai-codex": [],
  opencode: [],
};

export default function CodeCliPanel({
  project,
  cliTool,
  onCliToolChange,
  toolState,
  onToolStateChange,
}: Props) {
  const [binaryStatus, setBinaryStatus] = useState<CliBinaryStatus>({ installed: false });
  const [checkingBinary, setCheckingBinary] = useState(false);
  const [launching, setLaunching] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [installLog, setInstallLog] = useState("");
  const [error, setError] = useState("");
  const [selectedModel, setSelectedModel] = useState<string>(toolState?.selectedModel ?? "");
  const [envVars, setEnvVars] = useState<Record<string, string>>(toolState?.envVars ?? {});
  const [newEnvKey, setNewEnvKey] = useState("");
  const [newEnvValue, setNewEnvValue] = useState("");
  const [settings, setSettings] = useState(() => loadSettings());

  useEffect(() => {
    const off = api.onSettingsUpdated?.(() => {
      setSettings(loadSettings());
    });
    return () => off?.();
  }, []);

  const providers = useMemo(
    () => filterProvidersForCliTool(cliTool, settings.providers),
    [cliTool, settings.providers],
  );

  const modelOptions = useMemo(() => buildModelOptions(providers), [providers]);

  const modelKeys = useMemo(
    () => modelOptions.map((opt) => encodeModelKey(opt.providerId, opt.modelId)),
    [modelOptions],
  );

  const modelLabels = useMemo(() => {
    const labels: Record<string, string> = {};
    for (const opt of modelOptions) {
      labels[encodeModelKey(opt.providerId, opt.modelId)] = opt.label;
    }
    return labels;
  }, [modelOptions]);

  useEffect(() => {
    setSelectedModel(toolState?.selectedModel ?? "");
    setEnvVars(toolState?.envVars ?? {});
  }, [cliTool, toolState?.selectedModel, toolState?.envVars]);

  const refreshBinary = useCallback(async () => {
    setCheckingBinary(true);
    try {
      const result = (await api.invoke("code_cli:check_binary", { cliTool })) as {
        ok?: boolean;
        installed?: boolean;
        version?: string;
        path?: string;
      };
      setBinaryStatus({
        installed: Boolean(result?.installed),
        version: result?.version,
        path: result?.path,
      });
    } finally {
      setCheckingBinary(false);
    }
  }, [cliTool]);

  useEffect(() => {
    void refreshBinary();
  }, [refreshBinary]);

  const resolvedModel = useMemo(() => {
    if (!selectedModel) return null;
    return decodeModelKey(selectedModel);
  }, [selectedModel]);

  const resolvedProvider = useMemo(() => {
    if (!resolvedModel) return null;
    return providers.find((p) => p.id === resolvedModel.providerId) ?? null;
  }, [resolvedModel, providers]);

  const syncCliConfig = async (): Promise<boolean> => {
    if (!resolvedProvider || !resolvedModel) {
      setError("请先选择模型");
      return false;
    }
    const cleanEnv = cleanEnvVars(envVars);
    const readResult = (await api.invoke("code_cli:read_config_files", { cliTool })) as {
      ok?: boolean; files?: Record<string, string>;
    };
    let files;
    try {
      files = buildCliConfigFiles({
        cliTool,
        provider: resolvedProvider,
        modelId: resolvedModel.modelId,
        configBlob: { env: cleanEnv },
        existingFiles: readResult?.files,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      return false;
    }
    const writeResult = (await api.invoke("code_cli:write_config", { cliTool, files })) as {
      ok?: boolean; error?: string;
    };
    if (!writeResult?.ok) {
      setError(writeResult?.error || "写入 CLI 配置失败");
      return false;
    }
    onToolStateChange(cliTool, {
      providers: {
        ...(toolState?.providers ?? {}),
        [resolvedProvider.id]: { providerId: resolvedProvider.id, modelId: resolvedModel.modelId },
      },
      current: resolvedProvider.id,
      selectedModel,
      envVars: Object.keys(cleanEnv).length > 0 ? cleanEnv : undefined,
    });
    return true;
  };

  const ensureInstalled = async (): Promise<boolean> => {
    if (binaryStatus.installed) return true;
    setInstalling(true);
    setInstallLog(`正在安装 ${CLI_TOOL_LABELS[cliTool]}…`);
    setError("");
    try {
      const result = (await api.invoke("code_cli:install", { cliTool })) as {
        ok?: boolean;
        installed?: boolean;
        version?: string;
        path?: string;
        error?: string;
      };
      if (!result?.ok) {
        setError(result?.error || `安装 ${CLI_TOOL_LABELS[cliTool]} 失败`);
        setInstallLog("");
        return false;
      }
      setBinaryStatus({
        installed: Boolean(result.installed),
        version: result.version,
        path: result.path,
      });
      if (!result.installed) {
        setError(`安装命令已执行，但未检测到 CLI。请手动检查 PATH。`);
        setInstallLog("");
        return false;
      }
      setInstallLog("");
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setInstallLog("");
      return false;
    } finally {
      setInstalling(false);
    }
  };

  const handleLaunch = async () => {
    if (!project) { setError("请先选择项目"); return; }
    if (!resolvedModel) { setError("请先选择模型"); return; }
    if (!resolvedProvider) { setError("无法解析 Provider"); return; }
    setLaunching(true);
    setError("");
    try {
      if (!binaryStatus.installed) {
        const ok = await ensureInstalled();
        if (!ok) return;
      }
      const configOk = await syncCliConfig();
      if (!configOk) return;

      const cleanEnv = cleanEnvVars(envVars);
      const providerEnv = buildCliLaunchEnv(cliTool, resolvedProvider, resolvedModel.modelId);
      const cmdResult = (await api.invoke("code_cli:build_launch_command", {
        cliTool,
        model: resolvedModel.modelId,
        cwd: project.path,
        envVars: cleanEnv,
        providerEnv,
      })) as { ok?: boolean; command?: string; error?: string };
      if (!cmdResult?.ok || !cmdResult.command) {
        setError(cmdResult?.error || "无法构建启动命令");
        return;
      }
      window.dispatchEvent(
        new CustomEvent("terminal:launch-cli", {
          detail: {
            cwd: project.path,
            command: cmdResult.command,
            title: `${project.name} · ${CLI_TOOL_LABELS[cliTool]}`,
          },
        }),
      );
    } finally {
      setLaunching(false);
    }
  };

  const addEnvVar = () => {
    const k = newEnvKey.trim();
    if (!k) return;
    setEnvVars((prev) => ({ ...prev, [k]: newEnvValue }));
    setNewEnvKey("");
    setNewEnvValue("");
  };

  const removeEnvVar = (key: string) => {
    setEnvVars((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const updateEnvValue = (key: string, value: string) => {
    setEnvVars((prev) => ({ ...prev, [key]: value }));
  };

  const canLaunch = Boolean(project && resolvedModel);
  const hints = ENV_HINT[cliTool] ?? [];
  const launchLabel = binaryStatus.installed
    ? "在终端启动"
    : installing
      ? "安装中…"
      : "安装命令并启动";

  return (
    <div className="code-cli-panel">
      <div className="code-cli-tool-tabs">
        {CODE_CLI_IDS.map((id) => (
          <button
            key={id}
            type="button"
            className={cliTool === id ? "active" : ""}
            onClick={() => onCliToolChange(id)}
          >
            {CLI_TOOL_LABELS[id]}
          </button>
        ))}
      </div>

      <div className="code-cli-status-card">
        <div>
          <strong>{CLI_TOOL_LABELS[cliTool]}</strong>
          <p>
            {checkingBinary
              ? "检测安装状态…"
              : binaryStatus.installed
                ? `已安装${binaryStatus.version ? ` · ${binaryStatus.version}` : ""}`
                : `未检测到 CLI · ${CLI_INSTALL_HINTS[cliTool]}`}
          </p>
        </div>
        <button
          type="button"
          className={`code-cli-launch-btn${binaryStatus.installed ? "" : " install-mode"}`}
          disabled={!canLaunch || launching || installing}
          onClick={() => void handleLaunch()}
        >
          {launching ? "启动中…" : installing ? "安装中…" : launchLabel}
        </button>
      </div>

      {installLog ? <p className="code-cli-hint">{installLog}</p> : null}

      {!project ? (
        <p className="code-cli-hint">请从左侧选择一个项目，CLI 将在该项目目录下启动。</p>
      ) : null}

      {/* Model Selection */}
      <section className="code-cli-section">
        <h3>模型</h3>
        <div className="code-cli-model-selector">
          <ModelSelector
            models={modelKeys}
            modelLabels={modelLabels}
            value={selectedModel}
            onChange={setSelectedModel}
            placeholder="选择模型…"
            allowCustom={false}
            disabled={modelKeys.length === 0}
          />
          {resolvedProvider ? (
            <span className="code-cli-provider-badge">{resolvedProvider.apiHost}</span>
          ) : null}
        </div>
        {modelOptions.length === 0 ? (
          <p className="code-cli-hint">
            {cliTool === "openai-codex"
              ? "Codex 需要支持 OpenAI Responses API 的 Provider（如 OpenAI、OpenRouter）。DeepSeek / Z.ai 等请改用 OpenCode。"
              : cliTool === "claude-code"
                ? "没有可用的 Provider。请在设置中配置 API Key 和 Anthropic 兼容 API 地址。"
                : "没有可用的 Provider。请在设置中配置 API Key 和 OpenAI 兼容 API 地址。"}
          </p>
        ) : null}
      </section>

      {/* Env Vars */}
      <section className="code-cli-section">
        <h3>环境变量</h3>
        <p className="code-cli-hint">自定义环境变量会写入 CLI 配置文件（如 Claude 的 settings.json env 块），启动终端时自动同步。</p>
        <div className="code-cli-env-list">
          {Object.entries(envVars).map(([key, value]) => (
            <div key={key} className="code-cli-env-row">
              <input
                className="code-cli-env-key"
                value={key}
                readOnly
              />
              <input
                className="code-cli-env-value"
                value={value}
                onChange={(e) => updateEnvValue(key, e.target.value)}
                placeholder="值"
              />
              <button type="button" className="code-cli-env-remove" onClick={() => removeEnvVar(key)}>×</button>
            </div>
          ))}
          <div className="code-cli-env-row code-cli-env-add">
            <input
              className="code-cli-env-key"
              value={newEnvKey}
              onChange={(e) => setNewEnvKey(e.target.value)}
              placeholder="KEY"
              onKeyDown={(e) => { if (e.key === "Enter") addEnvVar(); }}
              list={`env-hints-${cliTool}`}
            />
            <input
              className="code-cli-env-value"
              value={newEnvValue}
              onChange={(e) => setNewEnvValue(e.target.value)}
              placeholder="VALUE"
              onKeyDown={(e) => { if (e.key === "Enter") addEnvVar(); }}
            />
            <button type="button" className="code-cli-env-add-btn" onClick={addEnvVar} disabled={!newEnvKey.trim()}>+</button>
          </div>
          {hints.length > 0 ? (
            <datalist id={`env-hints-${cliTool}`}>
              {hints.filter((h) => !(h in envVars)).map((h) => <option key={h} value={h} />)}
            </datalist>
          ) : null}
        </div>
      </section>

      {error ? <p className="code-cli-error">{error}</p> : null}
    </div>
  );
}
