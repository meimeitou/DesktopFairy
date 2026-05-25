import { useEffect, useMemo, useState } from "react";
import ManageModelsPanel from "../ManageModelsPanel";
import ModelSelector from "../ModelSelector";
import AddModelModal from "./AddModelModal";
import AddProviderModal from "./AddProviderModal";
import {
  createCustomProvider,
  getEndpointPreview,
  getProviderTypeLabel,
  providerNeedsApiKey,
  type LlmProvider,
  type ProviderType,
} from "../../shared/providers";
import type { AppSettings } from "../../shared/settings";
import {
  getActiveProvider,
  getSelectableModels,
  updateProviderInSettings,
} from "../../shared/settings";
import "./ProviderSettingsSection.css";

const api = window.electronAPI;

type CheckStatus = "idle" | "checking" | "success" | "failed";

interface Props {
  settings: AppSettings;
  onChange: (next: AppSettings) => void;
}

export default function ProviderSettingsSection({ settings, onChange }: Props) {
  const [selectedId, setSelectedId] = useState(
    () => settings.activeProviderId || settings.providers[0]?.id
  );
  const [search, setSearch] = useState("");
  const [showAddProvider, setShowAddProvider] = useState(false);
  const [showAddModel, setShowAddModel] = useState(false);
  const [checkStatus, setCheckStatus] = useState<CheckStatus>("idle");
  const [checkMessage, setCheckMessage] = useState("");

  const selected = useMemo(
    () => settings.providers.find((p) => p.id === selectedId) ?? settings.providers[0],
    [settings.providers, selectedId]
  );

  const filteredProviders = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return settings.providers;
    return settings.providers.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.type.toLowerCase().includes(q) ||
        p.apiHost.toLowerCase().includes(q)
    );
  }, [settings.providers, search]);

  const patchProvider = (providerId: string, patch: Partial<LlmProvider>) => {
    onChange(updateProviderInSettings(settings, providerId, patch));
  };

  const selectProvider = (provider: LlmProvider) => {
    setSelectedId(provider.id);
    onChange({
      ...settings,
      activeProviderId: provider.id,
      modelName:
        provider.models.includes(settings.modelName) && settings.modelName
          ? settings.modelName
          : provider.models[0] || settings.modelName,
    });
  };

  const handleAddProvider = (name: string, type: ProviderType) => {
    const provider = createCustomProvider(name, type);
    onChange({
      ...settings,
      providers: [...settings.providers, provider],
      activeProviderId: provider.id,
    });
    setSelectedId(provider.id);
    setShowAddProvider(false);
  };

  const handleRemoveProvider = (provider: LlmProvider) => {
    if (provider.isSystem) return;
    if (!window.confirm(`确定删除服务商「${provider.name}」吗？`)) return;
    const nextProviders = settings.providers.filter((p) => p.id !== provider.id);
    const nextActive =
      settings.activeProviderId === provider.id
        ? nextProviders.find((p) => p.enabled)?.id || nextProviders[0]?.id || "openai"
        : settings.activeProviderId;
    onChange({
      ...settings,
      providers: nextProviders,
      activeProviderId: nextActive,
    });
    if (selectedId === provider.id) {
      setSelectedId(nextActive);
    }
  };

  const handleAddModel = (modelId: string) => {
    if (!selected) return;
    const ids = modelId
      .split(/[,，]/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (ids.length === 0) return;
    const merged = [...new Set([...selected.models, ...ids])].sort();
    patchProvider(selected.id, { models: merged });
    setShowAddModel(false);
  };

  const handleRemoveModel = (modelId: string) => {
    if (!selected) return;
    patchProvider(selected.id, {
      models: selected.models.filter((m) => m !== modelId),
    });
  };

  const modelToCheck = useMemo(() => {
    if (!selected) return settings.modelName || "";
    if (
      settings.activeProviderId === selected.id &&
      settings.modelName &&
      (selected.models.length === 0 || selected.models.includes(settings.modelName))
    ) {
      return settings.modelName;
    }
    return selected.models[0] || settings.modelName || "";
  }, [selected, settings.activeProviderId, settings.modelName]);

  useEffect(() => {
    setCheckStatus("idle");
    setCheckMessage("");
  }, [selected?.id, selected?.apiHost, selected?.apiKey, selected?.type, modelToCheck]);

  const handleCheckConnection = async () => {
    if (!selected) return;
    if (!selected.apiHost.trim()) {
      setCheckStatus("failed");
      setCheckMessage("请填写 API Host");
      return;
    }
    if (providerNeedsApiKey(selected.type) && !selected.apiKey.trim()) {
      setCheckStatus("failed");
      setCheckMessage("请填写 API Key");
      return;
    }
    if (!modelToCheck) {
      setCheckStatus("failed");
      setCheckMessage("请先选择或添加模型");
      return;
    }

    setCheckStatus("checking");
    setCheckMessage("");
    try {
      const result = (await api.invoke("chat:check", {
        apiHost: selected.apiHost,
        apiKey: selected.apiKey,
        providerType: selected.type,
        model: modelToCheck,
      })) as { ok: boolean; latencyMs: number; model: string };
      setCheckStatus("success");
      setCheckMessage(
        `连接成功 · 模型 ${result.model} · ${result.latencyMs}ms`
      );
    } catch (e) {
      setCheckStatus("failed");
      setCheckMessage(e instanceof Error ? e.message : "连接失败");
    }
  };

  if (!selected) {
    return (
      <section className="settings-section">
        <h3>模型服务商</h3>
        <p className="provider-empty">暂无服务商，请添加。</p>
      </section>
    );
  }

  const selectable = getSelectableModels({
    ...settings,
    activeProviderId: selected.id,
  });
  const endpointPreview = getEndpointPreview(selected.apiHost, selected.type);
  const active = getActiveProvider(settings);

  return (
    <section className="settings-section provider-settings">
      <h3>模型服务商</h3>
      <p className="provider-settings-desc">
        左侧选择服务商，右侧配置 API 与模型列表。当前对话使用：
        <strong> {active.name}</strong>
      </p>

      <div className="provider-settings-layout">
        <aside className="provider-list-pane">
          <div className="provider-list-toolbar">
            <input
              type="search"
              placeholder="搜索服务商…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <button
              type="button"
              className="provider-add-btn"
              onClick={() => setShowAddProvider(true)}
            >
              + 添加
            </button>
          </div>
          <div className="provider-list">
            {filteredProviders.map((p) => (
              <button
                key={p.id}
                type="button"
                className={`provider-list-item${selected.id === p.id ? " active" : ""}${!p.enabled ? " disabled" : ""}`}
                onClick={() => selectProvider(p)}
              >
                <span className="provider-list-name">{p.name}</span>
                <span className="provider-list-meta">
                  {getProviderTypeLabel(p.type)}
                  {!p.enabled && " · 已禁用"}
                </span>
              </button>
            ))}
          </div>
        </aside>

        <div className="provider-detail-pane">
          <div className="provider-detail-header">
            <div>
              <h4>{selected.name}</h4>
              <span className="provider-type-badge">
                {getProviderTypeLabel(selected.type)}
              </span>
            </div>
            <div className="provider-detail-actions">
              <label className="provider-enable-toggle">
                <input
                  type="checkbox"
                  checked={selected.enabled}
                  onChange={(e) =>
                    patchProvider(selected.id, { enabled: e.target.checked })
                  }
                />
                <span>启用</span>
              </label>
              {!selected.isSystem && (
                <button
                  type="button"
                  className="provider-delete-btn"
                  onClick={() => handleRemoveProvider(selected)}
                >
                  删除
                </button>
              )}
            </div>
          </div>

          {!selected.isSystem && (
            <div className="field">
              <label>名称</label>
              <input
                type="text"
                value={selected.name}
                onChange={(e) =>
                  patchProvider(selected.id, { name: e.target.value })
                }
              />
            </div>
          )}

          <div className="field">
            <label>API Host</label>
            <input
              type="text"
              value={selected.apiHost}
              onChange={(e) =>
                patchProvider(selected.id, { apiHost: e.target.value })
              }
              placeholder={
                selected.type === "ollama"
                  ? "http://localhost:11434"
                  : "https://api.openai.com/v1"
              }
            />
            <p className="field-hint">
              请求地址预览：<code>{endpointPreview || "—"}</code>
            </p>
          </div>

          {providerNeedsApiKey(selected.type) && (
            <div className="field">
              <label>API Key</label>
              <div className="provider-api-key-row">
                <input
                  type="password"
                  value={selected.apiKey}
                  onChange={(e) =>
                    patchProvider(selected.id, { apiKey: e.target.value })
                  }
                  placeholder="sk-..."
                />
                <button
                  type="button"
                  className={`provider-check-btn${checkStatus === "success" ? " success" : ""}${checkStatus === "failed" ? " failed" : ""}`}
                  onClick={() => void handleCheckConnection()}
                  disabled={checkStatus === "checking"}
                >
                  {checkStatus === "checking" ? "检测中…" : "检测"}
                </button>
              </div>
            </div>
          )}

          {!providerNeedsApiKey(selected.type) && (
            <div className="field">
              <label>连接检测</label>
              <div className="provider-check-row">
                <button
                  type="button"
                  className={`provider-check-btn${checkStatus === "success" ? " success" : ""}${checkStatus === "failed" ? " failed" : ""}`}
                  onClick={() => void handleCheckConnection()}
                  disabled={checkStatus === "checking"}
                >
                  {checkStatus === "checking" ? "检测中…" : "检测连接"}
                </button>
                {modelToCheck && (
                  <span className="provider-check-model">模型：{modelToCheck}</span>
                )}
              </div>
            </div>
          )}

          {checkMessage && (
            <p className={`provider-check-status ${checkStatus}`}>{checkMessage}</p>
          )}

          <div className="field">
            <label>默认模型</label>
            <ModelSelector
              models={selectable}
              value={
                selected.models.includes(settings.modelName)
                  ? settings.modelName
                  : selected.models[0] || settings.modelName
              }
              onChange={(modelName) =>
                onChange({ ...settings, modelName, activeProviderId: selected.id })
              }
            />
            <div className="provider-model-actions">
              <ManageModelsPanel
                provider={selected}
                onChange={(models) => {
                  let next = updateProviderInSettings(settings, selected.id, {
                    models,
                  });
                  if (
                    models.length > 0 &&
                    !models.includes(settings.modelName) &&
                    settings.activeProviderId === selected.id
                  ) {
                    next = { ...next, modelName: models[0] };
                  }
                  onChange(next);
                }}
              />
              <button
                type="button"
                className="provider-add-model-btn"
                onClick={() => setShowAddModel(true)}
              >
                手动添加模型
              </button>
            </div>
          </div>

          {selected.models.length > 0 && (
            <div className="field">
              <label>已添加模型 ({selected.models.length})</label>
              <div className="provider-model-tags">
                {selected.models.map((m) => (
                  <span key={m} className="provider-model-tag">
                    {m}
                    <button
                      type="button"
                      onClick={() => handleRemoveModel(m)}
                      title="移除"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="field">
            <label>Temperature</label>
            <div className="slider-row">
              <input
                type="range"
                min={0}
                max={2}
                step={0.1}
                value={settings.temperature}
                onChange={(e) =>
                  onChange({ ...settings, temperature: Number(e.target.value) })
                }
              />
              <span className="slider-value">
                {settings.temperature.toFixed(1)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {showAddProvider && (
        <AddProviderModal
          onClose={() => setShowAddProvider(false)}
          onConfirm={handleAddProvider}
        />
      )}
      {showAddModel && (
        <AddModelModal
          providerName={selected.name}
          onClose={() => setShowAddModel(false)}
          onConfirm={handleAddModel}
        />
      )}
    </section>
  );
}
