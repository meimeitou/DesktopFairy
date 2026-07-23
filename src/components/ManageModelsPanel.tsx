import { useMemo, useState } from "react";
import {
  getModelsListEndpointLabel,
  type LlmProvider,
} from "../shared/providers";
import "./ManageModelsPanel.css";

const api = window.electronAPI;

interface Props {
  provider: LlmProvider;
  onChange: (models: string[]) => void;
}

export default function ManageModelsPanel({ provider, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [remoteModels, setRemoteModels] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState<Set<string>>(new Set());

  const cachedModels = provider.models;

  const openPanel = () => {
    setDraft(new Set(cachedModels));
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
      })) as string[];
      setRemoteModels(list);
      if (list.length === 0) alert("未返回任何模型");
    } catch (e) {
      alert(`拉取失败：${(e as Error).message || e}`);
    } finally {
      setLoading(false);
    }
  };

  const allModels = useMemo(() => {
    const set = new Set([...remoteModels, ...cachedModels, ...Array.from(draft)]);
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [remoteModels, cachedModels, draft]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return allModels;
    return allModels.filter((m) => m.toLowerCase().includes(q));
  }, [allModels, search]);

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
    onChange([...draft].sort((a, b) => a.localeCompare(b)));
    setOpen(false);
  };

  if (!open) {
    return (
      <div className="manage-models-trigger">
        <button type="button" className="manage-models-open-btn" onClick={openPanel}>
          管理模型
          {cachedModels.length > 0 && (
            <span className="manage-models-count">{cachedModels.length}</span>
          )}
        </button>
      </div>
    );
  }

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
          拉取列表，勾选要在下拉框中显示的模型
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
        <div className="manage-models-list">
          {filtered.length === 0 ? (
            <p className="manage-models-empty">点击「拉取模型」获取列表</p>
          ) : (
            filtered.map((m) => (
              <label key={m} className="manage-models-item">
                <input
                  type="checkbox"
                  checked={draft.has(m)}
                  onChange={() => toggle(m)}
                />
                <span>{m}</span>
              </label>
            ))
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
