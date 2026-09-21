import { Button, Input, Modal, Notification } from "animal-island-ui";
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
      Notification.warning("请先填写 API Host");
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
        Notification.warning("未返回可用的对话 / Embedding / Rerank 模型");
      }
    } catch (e) {
      Notification.error(`拉取失败：${(e as Error).message || e}`);
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
        <Button type="default" size="small" onClick={openPanel}>
          管理模型
          {enabledCount > 0 && (
            <span className="manage-models-count">{enabledCount}</span>
          )}
        </Button>
      </div>
    );
  }

  const emptyMessage =
    allModels.length === 0
      ? "点击「拉取模型」获取列表"
      : "没有符合筛选的模型";

  return (
    <Modal
      open
      title={`管理模型 - ${provider.name}`}
      onClose={() => setOpen(false)}
      width={520}
      className="manage-models-modal"
      typewriter={false}
      footer={
        <>
          <Button type="primary" onClick={() => setOpen(false)}>
            取消
          </Button>
          <Button type="primary" onClick={save}>
            保存
          </Button>
        </>
      }
    >
      <p className="manage-models-desc">
        从 {getModelsListEndpointLabel(provider.type)}{" "}
        拉取列表，点选要启用的模型。
      </p>
      <div className="manage-models-toolbar">
        <Input
          type="search"
          shadow
          placeholder="搜索模型…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Button type="primary" size="small" onClick={fetchRemote} disabled={loading}>
          {loading ? "拉取中…" : "拉取模型"}
        </Button>
      </div>
      <div className="manage-models-filters" role="tablist" aria-label="按类型筛选">
        {MODEL_KIND_FILTERS.map((tab) => (
          <Button
            key={tab.id}
            type="text"
            role="tab"
            aria-selected={kindFilter === tab.id}
            className={kindFilter === tab.id ? "active" : ""}
            onClick={() => setKindFilter(tab.id)}
          >
            {tab.label}
          </Button>
        ))}
      </div>
      <div className="manage-models-list" role="listbox" aria-multiselectable="true" aria-label="模型列表">
        <div className="manage-models-cols" aria-hidden="true">
          <span>模型</span>
          <span>类型</span>
        </div>
        {filtered.length === 0 ? (
          <p className="manage-models-empty">{emptyMessage}</p>
        ) : (
          filtered.map((id) => {
            const kind = displayModelKind(id, originalLists, remoteKind);
            const selected = draft.has(id);
            return (
              <Button
                key={id}
                type="text"
                role="option"
                aria-selected={selected}
                className={`manage-models-item${selected ? " selected" : ""}`}
                onClick={() => toggle(id)}
              >
                <span className="manage-models-id">{id}</span>
                <span className={`manage-models-kind kind-${kind}`}>
                  {MODEL_KIND_LABELS[kind]}
                </span>
              </Button>
            );
          })
        )}
      </div>
      <div className="manage-models-footer">
        <span className="manage-models-selected">已选 {draft.size} 个</span>
        <span className="manage-models-bulk">
          <Button type="text" size="small" onClick={selectAll}>
            全选
          </Button>
          <Button type="text" size="small" onClick={selectNone}>
            取消
          </Button>
        </span>
      </div>
    </Modal>
  );
}
