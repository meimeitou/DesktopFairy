import { useMemo, useState } from "react";
import { Button, Icon, Input, Radio } from "animal-island-ui";
import {
  WEB_SEARCH_PROVIDERS,
  getWebSearchProviderMeta,
  type WebSearchConfig,
  type WebSearchProviderId,
} from "../../shared/webSearch";
import type { AppSettings } from "../../shared/settings";

const RESET_ICON = <Icon name="Refresh" size={12} />;

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

interface WebSearchTestResponse {
  ok: boolean;
  provider?: string;
  count?: number;
  sample?: { title: string; url: string } | null;
  error?: string;
}

const api = window.electronAPI;

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
      const result = (await api.invoke("websearch:test", cfg)) as WebSearchTestResponse;
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
    } catch (e) {
      setTestResult({
        status: "error",
        error: String(
          (e && typeof e === "object" && "message" in e
            ? (e as { message?: unknown }).message
            : e) || "调用失败",
        ),
      });
    }
  };

  return (
    <section className="settings-section">
      <p className="field-hint">
        智能体调用 WebSearch 工具时使用的网络搜索服务。
      </p>

      <div className="field">
        <label>提供商</label>
        <Radio
          value={cfg.provider}
          direction="vertical"
          onChange={(value) => {
            updateCfg({ provider: value as WebSearchProviderId });
            setTestResult({ status: "idle" });
          }}
          options={WEB_SEARCH_PROVIDERS.map((p) => ({
            value: p.id,
            label: (
              <span className="radio-option-label">
                {p.label}
                <small className="radio-desc">{p.description}</small>
              </span>
            ),
          }))}
        />
      </div>

      {meta.requiresApiKey && meta.apiKeyLabel && (
        <div className="field">
          <label>{meta.apiKeyLabel}</label>
          <div className="field-with-action">
            <Input shadow type="password" value={cfg[getApiKeyFieldName(cfg.provider)] || ""} onChange={(e) =>
              updateCfg({
                [getApiKeyFieldName(cfg.provider)]: e.target.value,
              } as Partial<WebSearchConfig>)
            }
            placeholder={meta.apiKeyPlaceholder}
            autoComplete="off" />
            <Button
              type="default"
              size="small"
              className={`settings-check-btn${testResult.status === "success" ? " success" : ""}${testResult.status === "error" ? " failed" : ""}`}
              onClick={() => void handleTest()}
              disabled={!isTestable || testResult.status === "loading"}
              title="检测 API Key 是否可用"
            >
              {testResult.status === "loading" ? "检测中…" : "检测"}
            </Button>
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
              style={{ color: "#e05a5a", marginTop: 6 }}
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
      <div className="field-with-action">
        <Input shadow type="url" value={value || ""} onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder} />
        <Button
          type="text"
          size="small"
          className="field-icon-btn"
          icon={RESET_ICON}
          onClick={onReset}
          title={`恢复默认值 ${defaultValue}`}
          disabled={!isCustom}
          aria-label="恢复默认 URL"
        />
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
