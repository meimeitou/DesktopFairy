import { useMemo, useState } from "react";
import {
  getModelsListEndpointLabel,
  type LlmProvider,
} from "../shared/providers";
import {
  displayModelKind,
  enabledModelCount,
  MODEL_KIND_FILTERS,
  MODEL_KIND_LABELS,
  partitionDraftToArrays,
  type CatalogModel,
  type CuratedModelKind,
  type ProviderModelLists,
} from "../shared/modelKind";
import "./ManageModelsPanel.css";

const api = window.electronAPI;

interface Props {
  provider: LlmProvider;
  onChange: (lists: ProviderModelLists) => void;
}

export default function ManageModelsPanel({ provider, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [remoteModels, setRemoteModels] = useState<CatalogModel[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [kindFilter, setKindFilter] = useState<"all" | CuratedModelKind>("all");
  const [draft, setDraft] = useState<Set<string>>(new Set());

  const originalLists: ProviderModelLists = useMemo(
    () => ({
      models: provider.models ?? [],
      embeddingModels: provider.embeddingModels ?? [],
      rerankModels: provider.rerankModels ?? [],
    }),
    [provider.models, provider.embeddingModels, provider.rerankModels]
  );

  const enabledCount = enabledModelCount(originalLists);

  const openPanel = () => {
    setDraft(
      new Set([
        ...(provider.models ?? []),
        ...(provider.embeddingModels ?? []),
        ...(provider.rerankModels ?? []),
      ])
    );
    setKindFilter("all");
    setSearch("");
    setOpen(true);
  };

  const fetchRemote = async () => {
    if (!provider.apiHost) {
      alert("请先填写 API Host");
      return;
    }
    setLoading(true);
    try {
      const list = (await api.invoke("chat:list_models", {
        apiHost: provider.apiHost,
        apiKey: provider.apiKey,
        providerType: provider.type,
      })) as CatalogModel[];
      const catalog = Array.isArray(list)
        ? list.filter(
            (m): m is CatalogModel =>
              !!m &&
              typeof m.id === "string" &&
              (m.kind === "chat" ||
                m.kind === "embedding" ||
                m.kind === "rerank")
          )
        : [];
      setRemoteModels(catalog);
      if (catalog.length === 0) {
        alert("未返回可用的对话 / Embedding / Rerank 模型");
      }
    } catch (e) {
      alert(`拉取失败：${(e as Error).message || e}`);
    } finally {
      setLoading(false);
    }
  };

  const remoteKind = useMemo(() => {
    const map = new Map<string, CuratedModelKind>();
    for (const m of remoteModels) map.set(m.id, m.kind);
    return map;
  }, [remoteModels]);

  const allModels = useMemo(() => {
    const ids = new Set([
      ...remoteModels.map((m) => m.id),
      ...originalLists.models,
      ...originalLists.embeddingModels,
      ...originalLists.rerankModels,
      ...Array.from(draft),
    ]);
    return [...ids].sort((a, b) => a.localeCompare(b));
  }, [remoteModels, originalLists, draft]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allModels.filter((id) => {
      const kind = displayModelKind(id, originalLists, remoteKind);
      if (kindFilter !== "all" && kind !== kindFilter) return false;
      if (q && !id.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [allModels, search, kindFilter, originalLists, remoteKind]);

  const toggle = (id: string) => {
    setDraft((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () =>
    setDraft((prev) => {
      const next = new Set(prev);
      for (const m of filtered) next.add(m);
      return next;
    });
  const selectNone = () => {
    setDraft((prev) => {
      const next = new Set(prev);
      for (const m of filtered) next.delete(m);
      return next;
    });
  };

  const save = () => {
    onChange(partitionDraftToArrays(draft, originalLists, remoteKind));
    setOpen(false);
  };

  if (!open) {
    return (
      <div className="manage-models-trigger">
        <button type="button" className="manage-models-open-btn" onClick={openPanel}>
          管理模型
          {enabledCount > 0 && (
            <span className="manage-models-count">{enabledCount}</span>
          )}
        </button>
      </div>
    );
  }

  const emptyMessage =
    allModels.length === 0
      ? "点击「拉取模型」获取列表"
      : "没有符合筛选的模型";

  return (
    <div className="manage-models-overlay" onClick={() => setOpen(false)}>
      <div className="manage-models-panel" onClick={(e) => e.stopPropagation()}>
        <div className="manage-models-header">
          <h4>管理模型 - {provider.name}</h4>
          <button type="button" className="manage-models-close" onClick={() => setOpen(false)}>
            ×
          </button>
        </div>
        <p className="manage-models-desc">
          从 {getModelsListEndpointLabel(provider.type)}{" "}
          拉取列表，点选要启用的模型。对话模型会出现在下拉框中，Embedding / Rerank
          供后续知识库使用
        </p>
        <div className="manage-models-toolbar">
          <input
            type="search"
            placeholder="搜索模型…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button type="button" onClick={fetchRemote} disabled={loading}>
            {loading ? "拉取中…" : "拉取模型"}
          </button>
          <button type="button" onClick={selectAll}>
            全选
          </button>
          <button type="button" onClick={selectNone}>
            取消
          </button>
        </div>
        <div className="manage-models-filters" role="tablist" aria-label="按类型筛选">
          {MODEL_KIND_FILTERS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={kindFilter === tab.id}
              className={kindFilter === tab.id ? "active" : ""}
              onClick={() => setKindFilter(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="manage-models-list" role="listbox" aria-multiselectable="true" aria-label="模型列表">
          {filtered.length === 0 ? (
            <p className="manage-models-empty">{emptyMessage}</p>
          ) : (
            filtered.map((id) => {
              const kind = displayModelKind(id, originalLists, remoteKind);
              const selected = draft.has(id);
              return (
                <button
                  key={id}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  className={`manage-models-item${selected ? " selected" : ""}`}
                  onClick={() => toggle(id)}
                >
                  <span className="manage-models-id">{id}</span>
                  <span className={`manage-models-kind kind-${kind}`}>
                    {MODEL_KIND_LABELS[kind]}
                  </span>
                </button>
              );
            })
          )}
        </div>
        <div className="manage-models-footer">
          <span className="manage-models-selected">已选 {draft.size} 个</span>
          <button type="button" className="manage-models-save" onClick={save}>
            保存
          </button>
        </div>
      </div>
    </div>
  );
}
