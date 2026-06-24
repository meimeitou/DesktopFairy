import { useMemo, useState } from "react";
import {
  WEB_SEARCH_PROVIDERS,
  getWebSearchProviderMeta,
  type WebSearchConfig,
  type WebSearchProviderId,
} from "../../shared/webSearch";
import type { AppSettings } from "../../shared/settings";

const RESET_ICON = (
  <svg
    width="12"
    height="12"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="1 4 1 10 7 10" />
    <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
  </svg>
);

const TEST_ICON = (
  <svg
    width="12"
    height="12"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);

type TestResult =
  | { status: "idle" }
  | { status: "loading" }
  | {
      status: "success";
      provider: string;
      count: number;
      sample: { title: string; url: string } | null;
    }
  | { status: "error"; error: string };

const api = (window as any).electronAPI;

export default function WebSearchSettingsSection({
  settings,
  onChange,
}: Props) {
  const cfg = settings.webSearch;
  const meta = useMemo(
    () => getWebSearchProviderMeta(cfg.provider),
    [cfg.provider]
  );
  const [testResult, setTestResult] = useState<TestResult>({ status: "idle" });

  const updateCfg = (patch: Partial<WebSearchConfig>) => {
    onChange({ webSearch: { ...cfg, ...patch } });
  };

  const isTestable = meta.requiresApiKey
    ? !!(cfg[getApiKeyFieldName(cfg.provider)] || "").trim()
    : true;

  const handleTest = async () => {
    setTestResult({ status: "loading" });
    try {
      const result = await api.invoke("websearch:test", cfg);
      if (result?.ok) {
        setTestResult({
          status: "success",
          provider: result.provider,
          count: result.count || 0,
          sample: result.sample || null,
        });
      } else {
        setTestResult({
          status: "error",
          error: String(result?.error || "未知错误"),
        });
      }
    } catch (e: any) {
      setTestResult({
        status: "error",
        error: String(e?.message || e || "调用失败"),
      });
    }
  };

  return (
    <section className="settings-section">
      <h4>网络搜索</h4>
      <p className="field-hint">
        选择智能体调用 WebSearch 工具时使用的网络搜索服务。当前选择：
        <strong> {meta.label}</strong>
      </p>

      <div className="field">
        <label>提供商</label>
        <select
          value={cfg.provider}
          onChange={(e) => {
            updateCfg({
              provider: e.target.value as WebSearchProviderId,
            });
            setTestResult({ status: "idle" });
          }}
        >
          {WEB_SEARCH_PROVIDERS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
        <p className="field-hint">{meta.description}</p>
      </div>

      {meta.requiresApiKey && meta.apiKeyLabel && (
        <div className="field">
          <label>{meta.apiKeyLabel}</label>
          <div style={{ display: "flex", gap: 8, alignItems: "stretch" }}>
            <input
              type="password"
              value={cfg[getApiKeyFieldName(cfg.provider)] || ""}
              onChange={(e) =>
                updateCfg({
                  [getApiKeyFieldName(cfg.provider)]: e.target.value,
                } as Partial<WebSearchConfig>)
              }
              placeholder={meta.apiKeyPlaceholder}
              autoComplete="off"
            />
            <button
              type="button"
              onClick={handleTest}
              disabled={!isTestable || testResult.status === "loading"}
              title="检测 API Key 是否可用"
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 4,
                padding: "0 12px",
                minWidth: 72,
                height: 32,
                border: "1px solid var(--border, #e5e5e5)",
                borderRadius: 7,
                background:
                  testResult.status === "success"
                    ? "rgba(16, 185, 129, 0.12)"
                    : testResult.status === "error"
                    ? "rgba(239, 68, 68, 0.12)"
                    : "rgba(120, 100, 255, 0.1)",
                color:
                  testResult.status === "success"
                    ? "#10b981"
                    : testResult.status === "error"
                    ? "#ef4444"
                    : "var(--fg, #333)",
                cursor:
                  !isTestable || testResult.status === "loading"
                    ? "not-allowed"
                    : "pointer",
                fontSize: 12,
                fontWeight: 500,
                whiteSpace: "nowrap",
              }}
            >
              {TEST_ICON}
              {testResult.status === "loading"
                ? "检测中..."
                : "检测"}
            </button>
          </div>
          {testResult.status === "success" && (
            <div
              className="field-hint"
              style={{ color: "#10b981", marginTop: 6 }}
            >
              ✓ 检测通过，搜索到 {testResult.count} 条结果
              {testResult.sample && (
                <>
                  <br />
                  示例：
                  <a
                    href={testResult.sample.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: "inherit", textDecoration: "underline" }}
                  >
                    {testResult.sample.title.slice(0, 60)}
                  </a>
                </>
              )}
            </div>
          )}
          {testResult.status === "error" && (
            <div
              className="field-hint"
              style={{ color: "#ef4444", marginTop: 6 }}
            >
              ✗ 检测失败：{testResult.error}
            </div>
          )}
          <p className="field-hint" style={{ marginTop: 4 }}>
            仅存储在本地，不会上传到任何服务器。
          </p>
        </div>
      )}

      {cfg.provider === "searxng" ? (
        <ApiUrlField
          label="实例 URL"
          value={cfg.searxngUrl || ""}
          defaultValue={meta.defaultApiUrl}
          placeholder={meta.apiUrlPlaceholder}
          onChange={(v) => updateCfg({ searxngUrl: v })}
          onReset={() => updateCfg({ searxngUrl: meta.defaultApiUrl })}
        />
      ) : (
        <ApiUrlField
          label={meta.apiUrlLabel}
          value={cfg[getApiUrlFieldName(cfg.provider)] || ""}
          defaultValue={meta.defaultApiUrl}
          placeholder={meta.apiUrlPlaceholder}
          onChange={(v) => {
            if (cfg.provider === "duckduckgo") {
              updateCfg({ duckduckgoApiUrl: v });
            } else {
              updateCfg({
                [getApiUrlFieldName(cfg.provider)]: v,
              } as Partial<WebSearchConfig>);
            }
          }}
          onReset={() => {
            if (cfg.provider === "duckduckgo") {
              updateCfg({ duckduckgoApiUrl: meta.defaultApiUrl });
            } else {
              updateCfg({
                [getApiUrlFieldName(cfg.provider)]: meta.defaultApiUrl,
              } as Partial<WebSearchConfig>);
            }
          }}
        />
      )}
    </section>
  );
}

interface Props {
  settings: AppSettings;
  onChange: (patch: Partial<AppSettings>) => void;
}

interface ApiUrlFieldProps {
  label: string;
  value: string;
  defaultValue: string;
  placeholder: string;
  onChange: (v: string) => void;
  onReset: () => void;
}

function ApiUrlField({ label, value, defaultValue, placeholder, onChange, onReset }: ApiUrlFieldProps) {
  const normalizedValue = (value || "").trim();
  const normalizedDefault = (defaultValue || "").trim();
  const isCustom =
    !!normalizedValue && normalizedValue !== normalizedDefault;
  return (
    <div className="field">
      <label>
        {label}
        {isCustom && (
          <span
            className="field-hint"
            style={{ marginLeft: 8, color: "#faad14", fontWeight: 400 }}
          >
            （已自定义）
          </span>
        )}
      </label>
      <div style={{ display: "flex", gap: 8, alignItems: "stretch" }}>
        <input
          type="url"
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
        />
        <button
          type="button"
          onClick={onReset}
          title={`恢复默认值 ${defaultValue}`}
          disabled={!isCustom}
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 32,
            height: 32,
            padding: 0,
            border: "1px solid var(--border, #e5e5e5)",
            borderRadius: 6,
            background: "transparent",
            color: isCustom ? "var(--fg, #333)" : "var(--fg-muted, #bbb)",
            cursor: isCustom ? "pointer" : "not-allowed",
          }}
        >
          {RESET_ICON}
        </button>
      </div>
      <p className="field-hint">
        默认：<code>{defaultValue}</code>
      </p>
    </div>
  );
}

function getApiKeyFieldName(id: WebSearchProviderId): keyof WebSearchConfig {
  switch (id) {
    case "tavily":
      return "tavilyApiKey";
    case "serpapi":
      return "serpapiApiKey";
    case "brave":
      return "braveApiKey";
    case "zhipu":
      return "zhipuApiKey";
    default:
      return "tavilyApiKey";
  }
}

function getApiUrlFieldName(id: WebSearchProviderId): keyof WebSearchConfig {
  switch (id) {
    case "tavily":
      return "tavilyApiUrl";
    case "serpapi":
      return "serpapiApiUrl";
    case "brave":
      return "braveApiUrl";
    case "zhipu":
      return "zhipuApiUrl";
    default:
      return "tavilyApiUrl";
  }
}
