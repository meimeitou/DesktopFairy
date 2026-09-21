import { Button, Icon, Input, Notification, Switch } from "animal-island-ui";
import { useConfirm } from "../../hooks/useConfirm";
import { useEffect, useMemo, useState } from "react";
import ManageModelsPanel from "../ManageModelsPanel";
import HintTip, { FieldHead } from "../HintTip";
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
import { updateProviderInSettings } from "../../shared/settings";
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
  const { confirm, dialog: confirmDialog } = useConfirm();

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
    onChange({ ...settings, activeProviderId: provider.id });
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

  const handleRemoveProvider = async (provider: LlmProvider) => {
    if (!(await confirm({ title: "删除服务商", content: `确定删除服务商「${provider.name}」吗？` }))) return;
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
      Notification.warning(`模型「${id}」已在${MODEL_KIND_LABELS[existingKind]}列表中`);
      return;
    }
    patchProvider(selected.id, addModelToLists(selected, id, kind));
    setShowAddModel(false);
  };

  const handleRemoveModel = (modelId: string) => {
    if (!selected) return;
    patchProvider(selected.id, removeModelFromLists(selected, modelId));
  };

  useEffect(() => {
    setCheckStatus("idle");
    setCheckMessage("");
  }, [selected?.id, selected?.apiHost, selected?.apiKey, selected?.type]);

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

    setCheckStatus("checking");
    setCheckMessage("");
    try {
      const result = (await api.invoke("chat:check", {
        apiHost: selected.apiHost,
        apiKey: selected.apiKey,
        providerType: selected.type,
      })) as { ok: boolean; latencyMs: number; models: number };
      setCheckStatus("success");
      setCheckMessage(
        `连接成功 · ${result.models} 个可用模型 · ${result.latencyMs}ms`,
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

  const endpointPreview = getEndpointPreview(selected.apiHost, selected.type);

  return (
    <section className="settings-section provider-settings">
      <div className="provider-settings-layout">
        <aside className="provider-list-pane">
          <div className="provider-list-toolbar">
            <Input
            shadow
            placeholder="搜索…" value={search} onChange={(e) => setSearch(e.target.value)}
            aria-label="搜索服务商" />
            <Button
              type="default"
              size="small"
              className="provider-add-btn"
              onClick={() => setShowAddProvider(true)}
            >
              添加
            </Button>
          </div>
          <div className="provider-list">
            {filteredProviders.length === 0 ? (
              <p className="provider-empty">无匹配的服务商</p>
            ) : (
              filteredProviders.map((p) => (
                <div
                  key={p.id}
                  className={`provider-list-item${selected.id === p.id ? " active" : ""}${!p.enabled ? " disabled" : ""}`}
                  onClick={() => selectProvider(p)}
                >
                  <div className="provider-item-info">
                    <span className="provider-list-name">{p.name}</span>
                    <span className="provider-list-meta">
                      {getProviderTypeLabel(p.type)}
                      {!p.enabled ? " 停用" : ""}
                    </span>
                  </div>
                  <Button
                    type="default"
                    size="small"
                    danger
                    className="provider-item-del"
                    icon={<Icon name="Trash" size={12} />}
                    title={`删除 ${p.name}`}
                    aria-label={`删除 ${p.name}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      void handleRemoveProvider(p);
                    }}
                  />
                </div>
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
                <>
                  <FieldHead
                    htmlFor="provider-name"
                    hint="显示在服务商列表和模型选择器里。"
                  >
                    服务商名称
                  </FieldHead>
                  <Input
                  className="provider-name-input"
                  type="text"
                  shadow value={selected.name} onChange={(e) =>
                    patchProvider(selected.id, { name: e.target.value })
                  }
                  aria-label="服务商名称" />
                </>
              )}
              <span className="provider-detail-type">
                {getProviderTypeLabel(selected.type)}
              </span>
            </div>
            <div className="provider-detail-actions">
              <div className="provider-enable">
                <span>启用</span>
                <HintTip tip="关闭后不会出现在模型选择器里。" />
                <Switch
                  checked={selected.enabled}
                  onChange={(checked) =>
                    patchProvider(selected.id, { enabled: checked })
                  }
                  aria-label="启用此服务商"
                />
              </div>
            </div>
          </div>

          <div className="field">
            <FieldHead
              htmlFor="provider-api-host"
              hint="填写服务根地址。实际请求会拼在 Host 后面。"
            >
              API Host
            </FieldHead>
            <Input
            type="text"
            shadow value={selected.apiHost} onChange={(e) =>
              patchProvider(selected.id, { apiHost: e.target.value })
            }
            placeholder={
              selected.type === "ollama"
                ? "http://localhost:11434"
                : selected.type === "anthropic"
                  ? "https://api.anthropic.com/v1"
                  : "https://api.openai.com/v1"
            } />
            {endpointPreview ? (
              <p className="provider-endpoint">{endpointPreview}</p>
            ) : null}
          </div>

          {providerNeedsApiKey(selected) && (
            <div className="field">
              <FieldHead
                htmlFor="provider-api-key"
                hint="密钥只保存在本机。检测会探测模型列表接口，不消耗 tokens。"
              >
                API Key
              </FieldHead>
              <div className="provider-api-key-row">
                <Input
                  id="provider-api-key"
                  type="password"
                  shadow
                  onChange={(e) =>
                    patchProvider(selected.id, { apiKey: e.target.value })
                  }
                  placeholder="sk-..."
                />
                <Button
                  type="default"
                  size="small"
                  className={`provider-check-btn${checkStatus === "success" ? " success" : ""}${checkStatus === "failed" ? " failed" : ""}`}
                  onClick={() => void handleCheckConnection()}
                  disabled={checkStatus === "checking"}
                >
                  {checkStatus === "checking" ? "检测中…" : "检测"}
                </Button>
              </div>
            </div>
          )}

          {!providerNeedsApiKey(selected) && (
            <div className="field">
              <FieldHead hint="探测模型列表接口，确认 Host 与网络可达，不消耗 tokens。">
                连接
              </FieldHead>
              <div className="provider-check-row">
                <Button
                  type="default"
                  size="small"
                  className={`provider-check-btn${checkStatus === "success" ? " success" : ""}${checkStatus === "failed" ? " failed" : ""}`}
                  onClick={() => void handleCheckConnection()}
                  disabled={checkStatus === "checking"}
                >
                  {checkStatus === "checking" ? "检测中…" : "检测连接"}
                </Button>

              </div>
            </div>
          )}

          {checkMessage && (
            <p className={`provider-check-status ${checkStatus}`}>
              {checkMessage}
            </p>
          )}

          <div className="field">
            <FieldHead hint="拉取或手动添加要启用的对话 / Embedding / Rerank 模型。">
              模型
            </FieldHead>
            <div className="provider-model-actions">
              <ManageModelsPanel
                provider={selected}
                onChange={(lists) =>
                  onChange(updateProviderInSettings(settings, selected.id, lists))
                }
              />
              <Button
                type="default"
                size="small"
                onClick={() => setShowAddModel(true)}
              >
                手动添加
              </Button>
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
                    <Button
                      type="text"
                      onClick={() => handleRemoveModel(m.id)}
                      title="移除"
                    >
                      ×
                    </Button>
                  </span>
                ))}
              </div>
            </div>
          )}
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
      {confirmDialog}
    </section>
  );
}
