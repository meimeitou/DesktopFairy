import { useEffect, useMemo, useState } from "react";
import ManageModelsPanel from "../ManageModelsPanel";
import HintTip, { FieldHead } from "../HintTip";
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
  getSelectableModels,
  resolveModelNameForProvider,
  updateProviderInSettings,
} from "../../shared/settings";
import {
  addModelToLists,
  enabledModelCount,
  enabledModelsWithKind,
  findEnabledModelKind,
  MODEL_KIND_LABELS,
  removeModelFromLists,
  type CuratedModelKind,
} from "../../shared/modelKind";
import "./ProviderSettingsSection.css";

const api = window.electronAPI;

type CheckStatus = "idle" | "checking" | "success" | "failed";

interface Props {
  settings: AppSettings;
  onChange: (next: AppSettings) => void;
}

export default function ProviderSettingsSection({ settings, onChange }: Props) {
  const [selectedId, setSelectedId] = useState(
    () => settings.activeProviderId || settings.providers[0]?.id,
  );
  const [search, setSearch] = useState("");
  const [showAddProvider, setShowAddProvider] = useState(false);
  const [showAddModel, setShowAddModel] = useState(false);
  const [checkStatus, setCheckStatus] = useState<CheckStatus>("idle");
  const [checkMessage, setCheckMessage] = useState("");

  const selected = useMemo(
    () =>
      settings.providers.find((p) => p.id === selectedId) ??
      settings.providers[0],
    [settings.providers, selectedId],
  );

  const filteredProviders = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return settings.providers;
    return settings.providers.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.type.toLowerCase().includes(q) ||
        p.apiHost.toLowerCase().includes(q),
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
    if (!window.confirm(`确定删除服务商「${provider.name}」吗？`)) return;
    const nextProviders = settings.providers.filter(
      (p) => p.id !== provider.id,
    );
    const nextActive =
      settings.activeProviderId === provider.id
        ? nextProviders.find((p) => p.enabled)?.id ||
          nextProviders[0]?.id ||
          "openai"
        : settings.activeProviderId;
    const nextDeletedIds = provider.isSystem
      ? [
          ...new Set([
            ...(settings.deletedSystemProviderIds ?? []),
            provider.id,
          ]),
        ]
      : (settings.deletedSystemProviderIds ?? []);
    onChange({
      ...settings,
      providers: nextProviders,
      activeProviderId: nextActive,
      deletedSystemProviderIds: nextDeletedIds,
    });
    if (selectedId === provider.id) {
      setSelectedId(nextActive);
    }
  };

  const handleAddModel = (modelId: string, kind: CuratedModelKind) => {
    if (!selected) return;
    const id = modelId.trim();
    if (!id) return;
    const existingKind = findEnabledModelKind(selected, id);
    if (existingKind) {
      alert(`模型「${id}」已在${MODEL_KIND_LABELS[existingKind]}列表中`);
      return;
    }
    patchProvider(selected.id, addModelToLists(selected, id, kind));
    setShowAddModel(false);
  };

  const handleRemoveModel = (modelId: string) => {
    if (!selected) return;
    patchProvider(selected.id, removeModelFromLists(selected, modelId));
  };

  const defaultModelValue = useMemo(() => {
    if (!selected) return "";
    // When editing the active provider, keep the raw modelName so custom IDs work.
    if (settings.activeProviderId === selected.id) {
      return settings.modelName;
    }
    return resolveModelNameForProvider(
      { ...settings, activeProviderId: selected.id },
      selected,
    );
  }, [selected, settings]);

  const modelToCheck = defaultModelValue;

  useEffect(() => {
    setCheckStatus("idle");
    setCheckMessage("");
  }, [
    selected?.id,
    selected?.apiHost,
    selected?.apiKey,
    selected?.type,
    modelToCheck,
  ]);

  const handleCheckConnection = async () => {
    if (!selected) return;
    if (!selected.apiHost.trim()) {
      setCheckStatus("failed");
      setCheckMessage("请填写 API Host");
      return;
    }
    if (providerNeedsApiKey(selected) && !selected.apiKey.trim()) {
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
        providerId: selected.id,
        model: modelToCheck,
      })) as { ok: boolean; latencyMs: number; model: string };
      setCheckStatus("success");
      setCheckMessage(
        `连接成功 · 模型 ${result.model} · ${result.latencyMs}ms`,
      );
    } catch (e) {
      setCheckStatus("failed");
      setCheckMessage(e instanceof Error ? e.message : "连接失败");
    }
  };

  if (!selected) {
    return (
      <section className="settings-section provider-settings">
        <p className="provider-empty">暂无服务商。点左侧「添加」接入一个 API。</p>
      </section>
    );
  }

  const selectable = getSelectableModels({
    ...settings,
    activeProviderId: selected.id,
  });
  const endpointPreview = getEndpointPreview(selected.apiHost, selected.type);

  return (
    <section className="settings-section provider-settings">
      <div className="provider-settings-layout">
        <aside className="provider-list-pane">
          <div className="provider-list-toolbar">
            <input
              type="search"
              placeholder="搜索…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="搜索服务商"
            />
            <button
              type="button"
              className="btn-ghost provider-add-btn"
              onClick={() => setShowAddProvider(true)}
            >
              添加
            </button>
          </div>
          <div className="provider-list">
            {filteredProviders.length === 0 ? (
              <p className="provider-empty">无匹配的服务商</p>
            ) : (
              filteredProviders.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className={`provider-list-item${selected.id === p.id ? " active" : ""}${!p.enabled ? " disabled" : ""}`}
                  onClick={() => selectProvider(p)}
                >
                  <span className="provider-list-name">{p.name}</span>
                  <span className="provider-list-meta">
                    {getProviderTypeLabel(p.type)}
                    {!p.enabled ? " 停用" : ""}
                  </span>
                </button>
              ))
            )}
          </div>
        </aside>

        <div className="provider-detail-pane">
          <div className="provider-detail-header">
            <div className="provider-detail-id">
              {selected.isSystem ? (
                <h4>{selected.name}</h4>
              ) : (
                <input
                  className="provider-name-input"
                  type="text"
                  value={selected.name}
                  onChange={(e) =>
                    patchProvider(selected.id, { name: e.target.value })
                  }
                  aria-label="服务商名称"
                />
              )}
              <span className="provider-detail-type">
                {getProviderTypeLabel(selected.type)}
              </span>
            </div>
            <div className="provider-detail-actions">
              <div className="provider-enable">
                <span>启用</span>
                <HintTip tip="关闭后不会出现在模型选择器里。" />
                <label className="toggle" title={selected.enabled ? "停用" : "启用"}>
                  <input
                    type="checkbox"
                    checked={selected.enabled}
                    onChange={(e) =>
                      patchProvider(selected.id, { enabled: e.target.checked })
                    }
                    aria-label="启用此服务商"
                  />
                  <span className="toggle-track" />
                </label>
              </div>
              <button
                type="button"
                className="provider-delete-btn"
                onClick={() => handleRemoveProvider(selected)}
              >
                删除
              </button>
            </div>
          </div>

          <div className="field">
            <FieldHead
              htmlFor="provider-api-host"
              hint="填写服务根地址。实际请求会拼在 Host 后面。"
            >
              API Host
            </FieldHead>
            <input
              id="provider-api-host"
              type="text"
              value={selected.apiHost}
              onChange={(e) =>
                patchProvider(selected.id, { apiHost: e.target.value })
              }
              placeholder={
                selected.type === "ollama"
                  ? "http://localhost:11434"
                  : selected.type === "anthropic"
                    ? "https://api.anthropic.com/v1"
                    : "https://api.openai.com/v1"
              }
            />
            {endpointPreview ? (
              <p className="provider-endpoint">{endpointPreview}</p>
            ) : null}
          </div>

          {providerNeedsApiKey(selected) && (
            <div className="field">
              <FieldHead
                htmlFor="provider-api-key"
                hint="密钥只保存在本机。检测会用当前默认模型发一次请求。"
              >
                API Key
              </FieldHead>
              <div className="provider-api-key-row">
                <input
                  id="provider-api-key"
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

          {!providerNeedsApiKey(selected) && (
            <div className="field">
              <FieldHead hint="用当前默认模型发一次请求，确认 Host 可用。">
                连接
              </FieldHead>
              <div className="provider-check-row">
                <button
                  type="button"
                  className={`provider-check-btn${checkStatus === "success" ? " success" : ""}${checkStatus === "failed" ? " failed" : ""}`}
                  onClick={() => void handleCheckConnection()}
                  disabled={checkStatus === "checking"}
                >
                  {checkStatus === "checking" ? "检测中…" : "检测连接"}
                </button>
                {modelToCheck ? (
                  <span className="provider-check-model">{modelToCheck}</span>
                ) : null}
              </div>
            </div>
          )}

          {checkMessage && (
            <p className={`provider-check-status ${checkStatus}`}>
              {checkMessage}
            </p>
          )}

          <div className="field">
            <FieldHead hint="普通对话使用的模型。智能体在「智能体 → 基础」里另选。">
              默认模型
            </FieldHead>
            <ModelSelector
              models={selectable}
              value={defaultModelValue}
              onChange={(modelName) =>
                onChange({
                  ...settings,
                  modelName,
                  activeProviderId: selected.id,
                })
              }
            />
            <div className="provider-model-actions">
              <ManageModelsPanel
                provider={selected}
                onChange={(lists) => {
                  let next = updateProviderInSettings(settings, selected.id, lists);
                  if (
                    settings.activeProviderId === selected.id &&
                    settings.modelName &&
                    selected.models.includes(settings.modelName) &&
                    !lists.models.includes(settings.modelName)
                  ) {
                    next = {
                      ...next,
                      modelName: lists.models[0] ?? settings.modelName,
                    };
                  }
                  onChange(next);
                }}
              />
              <button
                type="button"
                className="btn-ghost"
                onClick={() => setShowAddModel(true)}
              >
                手动添加
              </button>
            </div>
          </div>

          {enabledModelCount(selected) > 0 && (
            <div className="field">
              <FieldHead hint="已启用的对话 / Embedding / Rerank 模型。可从列表移除。">
                已启用
              </FieldHead>
              <div className="provider-model-tags">
                {enabledModelsWithKind(selected).map((m) => (
                  <span key={`${m.kind}:${m.id}`} className="provider-model-tag">
                    <span className={`provider-model-kind kind-${m.kind}`}>
                      {MODEL_KIND_LABELS[m.kind]}
                    </span>
                    {m.id}
                    <button
                      type="button"
                      onClick={() => handleRemoveModel(m.id)}
                      title="移除"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="provider-tts">
        <div className="provider-tts-row">
          <span>语音播报</span>
          <HintTip tip="打开后，可以用系统语音朗读 AI 回复。" />
          <label className="toggle" title="启用语音播报">
            <input
              type="checkbox"
              checked={settings.ttsEnabled}
              onChange={(e) =>
                onChange({ ...settings, ttsEnabled: e.target.checked })
              }
              aria-label="启用语音播报"
            />
            <span className="toggle-track" />
          </label>
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
