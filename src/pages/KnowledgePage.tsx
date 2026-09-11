import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { KnowledgeBase, KnowledgeBaseKind, KnowledgeItem } from "../shared/knowledge";
import { knowledgeSettingsConfigured, semiDescriptionConfigured } from "../shared/knowledge";
import { getEmbeddingApiConfig, type AppSettings } from "../shared/settings";
import { setSettings, useSettings } from "../shared/settingsStore";
import ChatMarkdown from "../components/chat/ChatMarkdown";
import RecallTestModal from "../components/knowledge/RecallTestModal";
import KnowledgeSettingsSection from "../components/settings/KnowledgeSettingsSection";
import Checkbox from "../components/Checkbox";
import "./SettingsPage.css";
import "./KnowledgePage.css";

const api = window.electronAPI;

type FileCandidate = {
  path: string;
  name: string;
  size: number;
  allowed: boolean;
  error?: string | null;
  conflict?: boolean;
  existingItemId?: string | null;
  action?: "keep" | "replace";
};

const STATUS_LABEL: Record<string, string> = {
  pending: "排队",
  processing: "处理中",
  completed: "已完成",
  failed: "失败",
};

function formatItemTime(ts: number): string {
  if (!Number.isFinite(ts) || ts <= 0) return "—";
  const d = new Date(ts);
  const now = new Date();
  const pad = (n: number) => n.toString().padStart(2, "0");
  const hm = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  if (d.toDateString() === now.toDateString()) return `今天 ${hm}`;
  if (d.getFullYear() === now.getFullYear()) {
    return `${d.getMonth() + 1}/${d.getDate()} ${hm}`;
  }
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
}

function MoreIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <circle cx="12" cy="5" r="1.7" />
      <circle cx="12" cy="12" r="1.7" />
      <circle cx="12" cy="19" r="1.7" />
    </svg>
  );
}

function NoteAddIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  );
}

function FileAddIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
      <polyline points="13 2 13 9 20 9" />
    </svg>
  );
}

function DeleteIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  );
}

function EditIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
    </svg>
  );
}

function SettingsGearIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

export default function KnowledgePage({ isActive = true }: { isActive?: boolean }) {
  const settings = useSettings();
  const embeddingReady = Boolean(getEmbeddingApiConfig(settings))
    && knowledgeSettingsConfigured(settings.knowledge);
  const [bases, setBases] = useState<KnowledgeBase[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [creating, setCreating] = useState("");
  const [newKind, setNewKind] = useState<KnowledgeBaseKind>("vector");
  const [createOpen, setCreateOpen] = useState(false);
  const [descEditing, setDescEditing] = useState<{ item: KnowledgeItem; text: string; regenerating: boolean } | null>(null);
  const [noteTitle, setNoteTitle] = useState("");
  const [noteBody, setNoteBody] = useState("");
  const [notePreview, setNotePreview] = useState(false);
  const [editingNote, setEditingNote] = useState<KnowledgeItem | null>(null);
  const [conflicts, setConflicts] = useState<FileCandidate[] | null>(null);
  const [error, setError] = useState("");
  const [focusItemId, setFocusItemId] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [recallOpen, setRecallOpen] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameText, setRenameText] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [itemMenu, setItemMenu] = useState<{ id: string; top: number; left: number } | null>(null);
  const [preview, setPreview] = useState<{
    title: string;
    text: string;
    truncated: boolean;
    error?: string;
  } | "loading" | null>(null);
  const skipRenameCommit = useRef(false);

  const reload = useCallback(async () => {
    const rows = (await api.invoke("knowledge:list_bases")) as KnowledgeBase[];
    setBases(Array.isArray(rows) ? rows : []);
  }, []);

  useEffect(() => {
    void reload().catch((e) => setError(String(e?.message || e)));
  }, [reload]);

  useEffect(() => {
    if (!isActive) return;
    const t = window.setInterval(() => {
      void reload();
    }, 1500);
    return () => window.clearInterval(t);
  }, [isActive, reload]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (settingsOpen) setSettingsOpen(false);
      else if (preview) setPreview(null);
      else if (noteOpen) {
        setNoteOpen(false);
        setNoteTitle("");
        setNoteBody("");
        setEditingNote(null);
        setNotePreview(false);
      } else if (recallOpen) setRecallOpen(false);
      else if (addOpen) setAddOpen(false);
      else if (createOpen) setCreateOpen(false);
      else if (itemMenu) setItemMenu(null);
      else if (conflicts) setConflicts(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [settingsOpen, preview, noteOpen, recallOpen, addOpen, createOpen, itemMenu, conflicts]);

  useEffect(() => {
    const onReveal = (e: Event) => {
      const detail = (e as CustomEvent<{ baseId?: string; itemId?: string }>).detail;
      if (detail?.baseId) setActiveId(detail.baseId);
      if (detail?.itemId) setFocusItemId(detail.itemId);
    };
    window.addEventListener("knowledge:reveal", onReveal);
    return () => window.removeEventListener("knowledge:reveal", onReveal);
  }, []);

  const active = useMemo(
    () => bases.find((b) => b.id === activeId) || bases[0] || null,
    [bases, activeId],
  );
  const activeSemi = active?.kind === "semi_structured";
  const descReady = semiDescriptionConfigured(settings.knowledge);

  const items = active?.items || [];
  const selectedItems = items.filter((item) => selectedIds.includes(item.id));
  const allSelected = items.length > 0 && selectedItems.length === items.length;
  const someSelected = selectedItems.length > 0 && !allSelected;

  useEffect(() => {
    setSelectedIds([]);
    setItemMenu(null);
    setRecallOpen(false);
  }, [active?.id]);

  useEffect(() => {
    if (!itemMenu) return;
    const onDoc = () => setItemMenu(null);
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [itemMenu]);

  const resetNote = () => {
    setNoteTitle("");
    setNoteBody("");
    setEditingNote(null);
    setNotePreview(false);
    setNoteOpen(false);
  };

  const openCreateNote = () => {
    setAddOpen(false);
    setEditingNote(null);
    setNoteTitle("");
    setNoteBody("");
    setNotePreview(false);
    setNoteOpen(true);
  };

  const openEditNote = (item: KnowledgeItem) => {
    setEditingNote(item);
    setNoteTitle(item.sourceName);
    setNoteBody(item.noteContent || "");
    setNotePreview(false);
    setNoteOpen(true);
  };

  const openPreview = async (item: KnowledgeItem) => {
    if (!active) return;
    setItemMenu(null);
    setPreview("loading");
    try {
      if (item.type === "note" && item.noteContent) {
        setPreview({
          title: item.sourceName,
          text: item.noteContent,
          truncated: false,
        });
        return;
      }
      const result = (await api.invoke("knowledge:read_item", {
        baseId: active.id,
        itemId: item.id,
        maxChars: 50000,
      })) as { text?: string; truncated?: boolean };
      setPreview({
        title: item.sourceName,
        text: String(result?.text || ""),
        truncated: Boolean(result?.truncated),
      });
    } catch (e) {
      setPreview({
        title: item.sourceName,
        text: "",
        truncated: false,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  };

  const startRename = (base: KnowledgeBase) => {
    setRenamingId(base.id);
    setRenameText(base.name);
    setActiveId(base.id);
  };

  const commitRename = async () => {
    if (skipRenameCommit.current) {
      skipRenameCommit.current = false;
      return;
    }
    if (!renamingId) return;
    const name = renameText.trim() || "未命名知识库";
    setBases((prev) => prev.map((b) => (b.id === renamingId ? { ...b, name } : b)));
    setRenamingId(null);
    setRenameText("");
    await api.invoke("knowledge:update_base", {
      baseId: renamingId,
      patch: { name },
    });
  };

  const deleteBase = async (base: KnowledgeBase) => {
    if (!window.confirm(`删除知识库「${base.name}」？`)) return;
    await api.invoke("knowledge:delete_base", { baseId: base.id });
    if (activeId === base.id) setActiveId(null);
    await reload();
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const toggleSelectAll = () => {
    setSelectedIds(allSelected ? [] : items.map((item) => item.id));
  };

  const deleteItems = async (ids: string[]) => {
    if (!active || ids.length === 0) return;
    const first = items.find((item) => item.id === ids[0]);
    const ok = window.confirm(
      ids.length === 1
        ? `删除「${first?.sourceName || "该条目"}」？`
        : `删除选中的 ${ids.length} 条？`,
    );
    if (!ok) return;
    setItemMenu(null);
    for (const itemId of ids) {
      await api.invoke("knowledge:delete_item", { baseId: active.id, itemId });
    }
    setSelectedIds((prev) => prev.filter((id) => !ids.includes(id)));
    await reload();
  };

  const reindexItems = async (ids: string[]) => {
    if (!active || ids.length === 0) return;
    if (!activeSemi && !embeddingReady) {
      setItemMenu(null);
      setError("请先在左下角「设置」中配置 embedding 模型");
      setSettingsOpen(true);
      return;
    }
    setItemMenu(null);
    for (const itemId of ids) {
      const item = items.find((row) => row.id === itemId);
      if (item?.status === "processing") continue;
      await api.invoke("knowledge:reindex_item", { baseId: active.id, itemId });
    }
    await reload();
  };

  const openItemMenu = (itemId: string, el: HTMLElement) => {
    const rect = el.getBoundingClientRect();
    setItemMenu({ id: itemId, top: rect.bottom + 4, left: rect.right });
  };

  const openDescEditor = (item: KnowledgeItem) => {
    setItemMenu(null);
    setDescEditing({ item, text: item.description || "", regenerating: false });
  };

  const saveDescription = async () => {
    if (!descEditing || !active) return;
    const value = descEditing.text.trim();
    try {
      await api.invoke("knowledge:set_item_description", {
        baseId: active.id,
        itemId: descEditing.item.id,
        description: value,
      });
      setDescEditing(null);
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const regenerateDescription = async () => {
    if (!descEditing || !active) return;
    if (!descReady) {
      setError("请先在设置中选择「描述生成 LLM」");
      return;
    }
    setDescEditing({ ...descEditing, regenerating: true });
    try {
      const res = (await api.invoke("knowledge:describe_item", {
        baseId: active.id,
        itemId: descEditing.item.id,
      })) as { description?: string };
      setDescEditing((prev) =>
        prev ? { ...prev, text: String(res?.description || prev.text), regenerating: false } : null,
      );
      await reload();
    } catch (e) {
      setDescEditing((prev) => (prev ? { ...prev, regenerating: false } : null));
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const createBase = async () => {
    const name = creating.trim() || "未命名知识库";
    const created = (await api.invoke("knowledge:create_base", {
      name,
      kind: newKind,
    })) as KnowledgeBase;
    setCreating("");
    setNewKind("vector");
    setCreateOpen(false);
    await reload();
    setActiveId(created.id);
  };

  const addFiles = async () => {
    setAddOpen(false);
    if (!active) return;
    if (!activeSemi && !embeddingReady) {
      setError("请先在左下角「设置」中配置 embedding 模型");
      setSettingsOpen(true);
      return;
    }
    const picked = (await api.invoke("knowledge:select_files", {
      baseId: active.id,
    })) as FileCandidate[];
    if (!picked?.length) return;
    const blocked = picked.filter((f) => !f.allowed);
    if (blocked.length && blocked.length === picked.length) {
      setError(blocked[0].error || "文件不被接受");
      return;
    }
    const pending = picked.filter((f) => f.allowed);
    if (pending.some((f) => f.conflict)) {
      setConflicts(pending.map((f) => ({ ...f, action: "keep" })));
      return;
    }
    await api.invoke("knowledge:add_files", { baseId: active.id, decisions: pending });
    await reload();
  };

  const confirmConflicts = async () => {
    if (!active || !conflicts) return;
    await api.invoke("knowledge:add_files", { baseId: active.id, decisions: conflicts });
    setConflicts(null);
    await reload();
  };

  const saveNote = async () => {
    if (!active) return;
    if (!embeddingReady) {
      resetNote();
      setError("请先在左下角「设置」中配置 embedding 模型");
      setSettingsOpen(true);
      return;
    }
    if (editingNote) {
      await api.invoke("knowledge:update_note", {
        baseId: active.id,
        itemId: editingNote.id,
        title: noteTitle,
        content: noteBody,
      });
    } else {
      await api.invoke("knowledge:add_note", {
        baseId: active.id,
        title: noteTitle,
        content: noteBody,
      });
    }
    resetNote();
    await reload();
  };

  return (
    <div className="kb-page">
      {!embeddingReady && (
        <div className="kb-banner">
          <span>尚未配置全局 embedding 模型，请在左侧底部打开设置完成配置。</span>
          <button type="button" className="kb-banner-dismiss" onClick={() => setSettingsOpen(true)}>
            打开设置
          </button>
        </div>
      )}
      {error && (
        <div className="kb-banner kb-banner-error">
          <span>{error}</span>
          <button type="button" className="kb-banner-dismiss" onClick={() => setError("")}>
            关闭
          </button>
        </div>
      )}
      <div className="kb-layout">
        <aside className="kb-nav">
          <div className="kb-nav-add">
            <button
              type="button"
              className="btn-secondary"
              style={{ width: "100%" }}
              onClick={() => {
                setCreating("");
                setNewKind("vector");
                setCreateOpen(true);
              }}
            >
              + 新建知识库
            </button>
          </div>
          {bases.length === 0 ? (
            <p className="kb-nav-empty">还没有知识库</p>
          ) : (
            <ul className="kb-nav-list">
              {bases.map((base) => (
                <li
                  key={base.id}
                  className={`kb-nav-item${base.id === active?.id ? " active" : ""}`}
                >
                  {renamingId === base.id ? (
                    <input
                      className="kb-nav-rename"
                      value={renameText}
                      autoFocus
                      aria-label="知识库名称"
                      onChange={(e) => setRenameText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          void commitRename();
                        }
                        if (e.key === "Escape") {
                          e.preventDefault();
                          skipRenameCommit.current = true;
                          setRenamingId(null);
                          setRenameText("");
                        }
                      }}
                      onBlur={() => void commitRename()}
                    />
                  ) : (
                    <>
                      <button
                        type="button"
                        className="kb-nav-item-main"
                        onClick={() => setActiveId(base.id)}
                      >
                        <span className="kb-nav-item-name">{base.name}</span>
                        {base.kind === "semi_structured" && (
                          <span
                            className="kb-item-kind"
                            title="半结构化知识库"
                            style={{
                              marginLeft: 6,
                              fontSize: 10,
                              padding: "0 4px",
                              borderRadius: 3,
                              background: "rgba(120,140,200,0.2)",
                            }}
                          >
                            半
                          </span>
                        )}
                      </button>
                      <span className="kb-nav-item-count">{base.items?.length || 0}</span>
                      <div className="kb-nav-item-actions">
                        <button
                          type="button"
                          className="kb-nav-action"
                          title="重命名"
                          onClick={() => startRename(base)}
                        >
                          <EditIcon />
                        </button>
                        <button
                          type="button"
                          className="kb-nav-action danger"
                          title="删除"
                          onClick={() => void deleteBase(base)}
                        >
                          <DeleteIcon />
                        </button>
                      </div>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
          <div className="kb-nav-footer">
            <button
              type="button"
              className="kb-nav-settings"
              onClick={() => setSettingsOpen(true)}
            >
              <SettingsGearIcon />
              <span>设置</span>
            </button>
          </div>
        </aside>
        <section className="kb-detail">
          {!active ? (
            <div className="kb-empty-state">
              <p className="kb-empty-title">创建第一个知识库</p>
              <p className="kb-empty">在左侧输入名称后点「新建」，再加入文件或笔记。</p>
            </div>
          ) : (
            <>
              <div className="kb-detail-body">
                <div className="kb-list-head">
                  <h3>条目{items.length ? ` · ${items.length}` : ""}</h3>
                  {selectedItems.length > 0 && (
                    <div className="kb-bulk-actions">
                      <span>已选 {selectedItems.length}</span>
                      <button
                        type="button"
                        className="btn-ghost"
                        onClick={() => void reindexItems(selectedItems.map((item) => item.id))}
                      >
                        重建索引
                      </button>
                      <button
                        type="button"
                        className="btn-ghost kb-danger"
                        onClick={() => void deleteItems(selectedItems.map((item) => item.id))}
                      >
                        删除
                      </button>
                    </div>
                  )}
                  <span className="kb-modal-spacer" />
                  <button
                    type="button"
                    className="btn-ghost"
                    onClick={() => setRecallOpen(true)}
                  >
                    召回测试
                  </button>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => setAddOpen(true)}
                  >
                    添加数据
                  </button>
                </div>
                {items.length === 0 ? (
                  <div className="kb-empty-state kb-list-empty">
                    <p className="kb-empty-title">还没有条目</p>
                    <p className="kb-empty">点右上角「添加数据」，加入文件或笔记。</p>
                  </div>
                ) : (
                  <div className="kb-table-wrap">
                    <table className="kb-table">
                      <thead>
                        <tr>
                          <th className="kb-col-check">
                            <Checkbox
                              compact
                              checked={allSelected}
                              indeterminate={someSelected}
                              onChange={() => toggleSelectAll()}
                              ariaLabel="全选"
                            />
                          </th>
                          <th className="kb-col-name">名称</th>
                          <th className="kb-col-type">类型</th>
                          {activeSemi && <th className="kb-col-desc">描述</th>}
                          <th className="kb-col-status">状态</th>
                          <th className="kb-col-time">时间</th>
                          <th className="kb-col-action">操作</th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((item) => {
                          const selected = selectedIds.includes(item.id);
                          return (
                            <tr
                              key={item.id}
                              className={`${selected ? " selected" : ""}${focusItemId === item.id ? " kb-item-focus" : ""}`}
                            >
                              <td className="kb-col-check">
                                <Checkbox
                                  compact
                                  checked={selected}
                                  onChange={() => toggleSelect(item.id)}
                                  ariaLabel={`选择 ${item.sourceName}`}
                                />
                              </td>
                              <td className="kb-col-name">
                                {item.type === "note" ? (
                                  <button
                                    type="button"
                                    className="kb-item-name-btn"
                                    onClick={() => openEditNote(item)}
                                    title={item.sourceName}
                                  >
                                    {item.sourceName}
                                  </button>
                                ) : (
                                  <span className="kb-item-name" title={item.sourceName}>
                                    {item.sourceName}
                                  </span>
                                )}
                                {item.error && (
                                  <p className="kb-item-error">{item.error}</p>
                                )}
                              </td>
                              <td className="kb-col-type">
                                <span className={`kb-type kb-type-${item.type}`}>
                                  {item.type === "note" ? "笔记" : "文件"}
                                </span>
                              </td>
                              {activeSemi && (
                                <td className="kb-col-desc">
                                  {item.description ? (
                                    <button
                                      type="button"
                                      className="kb-item-name-btn"
                                      onClick={() => openDescEditor(item)}
                                      title={item.description}
                                      style={{
                                        textAlign: "left",
                                        maxWidth: 280,
                                        overflow: "hidden",
                                        textOverflow: "ellipsis",
                                        whiteSpace: "nowrap",
                                      }}
                                    >
                                      {item.description}
                                    </button>
                                  ) : item.descriptionStatus === "generating" ? (
                                    <span className="kb-empty">生成中…</span>
                                  ) : (
                                    <button
                                      type="button"
                                      className="btn-ghost"
                                      onClick={() => openDescEditor(item)}
                                    >
                                      未设置，去添加
                                    </button>
                                  )}
                                </td>
                              )}
                              <td className="kb-col-status">
                                <span className={`kb-status kb-status-${item.status}`}>
                                  {STATUS_LABEL[item.status] || item.status}
                                </span>
                              </td>
                              <td className="kb-col-time">
                                {formatItemTime(item.updatedAt || item.createdAt)}
                              </td>
                              <td className="kb-col-action">
                                <button
                                  type="button"
                                  className="kb-row-more"
                                  title="操作"
                                  onMouseDown={(e) => e.stopPropagation()}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (itemMenu?.id === item.id) {
                                      setItemMenu(null);
                                      return;
                                    }
                                    openItemMenu(item.id, e.currentTarget);
                                  }}
                                >
                                  <MoreIcon />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </section>
      </div>
      {itemMenu && (() => {
        const menuItem = items.find((item) => item.id === itemMenu.id);
        if (!menuItem) return null;
        const reindexDisabled = menuItem.status === "processing";
        return (
          <div
            className="kb-row-menu"
            style={{ top: itemMenu.top, left: itemMenu.left }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => void openPreview(menuItem)}
            >
              预览
            </button>
            {menuItem.type === "note" && (
              <button
                type="button"
                onClick={() => {
                  setItemMenu(null);
                  openEditNote(menuItem);
                }}
              >
                编辑
              </button>
            )}
            {activeSemi && menuItem.type === "file" && (
              <button
                type="button"
                onClick={() => openDescEditor(menuItem)}
              >
                编辑描述
              </button>
            )}
            <button
              type="button"
              disabled={reindexDisabled}
              onClick={() => void reindexItems([menuItem.id])}
            >
              重建索引
            </button>
            <button
              type="button"
              className="danger"
              onClick={() => void deleteItems([menuItem.id])}
            >
              删除
            </button>
          </div>
        );
      })()}
      {preview && (
        <div className="kb-modal" onClick={() => setPreview(null)}>
          <div
            className="kb-modal-card kb-preview-modal-card"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="kb-settings-modal-header">
              <div>
                <h3>预览</h3>
                <p className="field-hint">
                  {preview === "loading" ? "读取中…" : preview.title}
                </p>
              </div>
              <button
                type="button"
                className="btn-ghost kb-settings-close"
                onClick={() => setPreview(null)}
                aria-label="关闭"
              >
                关闭
              </button>
            </header>
            {preview === "loading" ? (
              <p className="kb-empty">正在读取内容…</p>
            ) : preview.error ? (
              <p className="kb-item-error">{preview.error}</p>
            ) : (
              <>
                <div className="kb-preview-body">
                  {preview.text.trim()
                    ? <ChatMarkdown content={preview.text} />
                    : <p className="kb-empty">没有可预览的内容</p>}
                </div>
                {preview.truncated && (
                  <p className="field-hint">内容过长，仅显示前面部分。</p>
                )}
              </>
            )}
          </div>
        </div>
      )}
      {recallOpen && active && (
        <RecallTestModal
          baseId={active.id}
          baseName={active.name}
          defaultTopK={settings.knowledge.topK}
          defaultScoreThreshold={settings.knowledge.scoreThreshold}
          embeddingReady={embeddingReady}
          completedCount={items.filter((item) => item.status === "completed").length}
          onClose={() => setRecallOpen(false)}
          onOpenItem={(itemId, sourceName) => {
            const item = items.find((row) => row.id === itemId);
            setRecallOpen(false);
            if (item) void openPreview(item);
            else {
              setPreview({
                title: sourceName,
                text: "",
                truncated: false,
                error: "条目不存在或已被删除",
              });
            }
          }}
        />
      )}
      {addOpen && (
        <div className="kb-modal" onClick={() => setAddOpen(false)}>
          <div className="kb-modal-card kb-add-modal-card" onClick={(e) => e.stopPropagation()}>
            <h3>添加数据</h3>
            <p className="field-hint">
              {activeSemi
                ? "半结构化库仅支持纯文本文件（md / txt / json / yaml），按文件描述整体注入。"
                : "选择要加入当前知识库的类型。"}
            </p>
            <div className="kb-add-choices">
              <button
                type="button"
                className="kb-add-choice"
                onClick={() => void addFiles()}
              >
                <FileAddIcon />
                <span className="kb-add-choice-title">文件</span>
                <span className="kb-add-choice-desc">
                  {activeSemi ? "md / txt / json / yaml" : "txt / md / docx / pdf"}
                </span>
              </button>
              {!activeSemi && (
                <button
                  type="button"
                  className="kb-add-choice"
                  onClick={openCreateNote}
                >
                  <NoteAddIcon />
                  <span className="kb-add-choice-title">笔记</span>
                  <span className="kb-add-choice-desc">标题 + Markdown 正文</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      {noteOpen && (
        <div className="kb-modal" onClick={resetNote}>
          <div
            className="kb-modal-card kb-note-modal-card"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="kb-settings-modal-header">
              <h3>{editingNote ? "编辑笔记" : "新建笔记"}</h3>
              <button
                type="button"
                className="btn-ghost kb-settings-close"
                onClick={resetNote}
                aria-label="关闭"
              >
                关闭
              </button>
            </header>
            <div className="field">
              <label>标题</label>
              <input
                type="text"
                value={noteTitle}
                placeholder="笔记标题"
                onChange={(e) => setNoteTitle(e.target.value)}
              />
            </div>
            <div className="field">
              <label>正文</label>
              {notePreview ? (
                <div className="kb-note-preview">
                  {noteBody.trim()
                    ? <ChatMarkdown content={noteBody} />
                    : <p className="kb-empty">没有可预览的内容</p>}
                </div>
              ) : (
                <textarea
                  rows={10}
                  value={noteBody}
                  placeholder="Markdown 正文"
                  onChange={(e) => setNoteBody(e.target.value)}
                />
              )}
            </div>
            <div className="kb-note-tools">
              <button type="button" className="btn-ghost" onClick={() => setNotePreview((v) => !v)}>
                {notePreview ? "编辑" : "预览"}
              </button>
              <span className="kb-modal-spacer" />
              <button type="button" className="btn-ghost" onClick={resetNote}>
                取消
              </button>
              <button type="button" className="btn-secondary" onClick={() => void saveNote()}>
                {editingNote ? "保存" : "添加"}
              </button>
            </div>
          </div>
        </div>
      )}
      {createOpen && (
        <div className="kb-modal" onClick={() => setCreateOpen(false)}>
          <div
            className="kb-modal-card kb-note-modal-card"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="kb-settings-modal-header">
              <h3>新建知识库</h3>
              <button
                type="button"
                className="btn-ghost kb-settings-close"
                onClick={() => setCreateOpen(false)}
                aria-label="关闭"
              >
                关闭
              </button>
            </header>
            <div className="field">
              <label>名称</label>
              <input
                type="text"
                autoFocus
                value={creating}
                placeholder="例如：产品文档 / 角色设定"
                onChange={(e) => setCreating(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void createBase();
                }}
              />
            </div>
            <div className="field">
              <label>类型</label>
              <label
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 8,
                  padding: "8px 10px",
                  border: "1px solid var(--border-color, rgba(120,140,200,0.3))",
                  borderRadius: 6,
                  marginBottom: 6,
                  cursor: "pointer",
                  background:
                    newKind === "vector" ? "rgba(120,140,200,0.08)" : "transparent",
                }}
              >
                <input
                  type="radio"
                  name="kb-create-kind"
                  checked={newKind === "vector"}
                  onChange={() => setNewKind("vector")}
                  style={{ marginTop: 3 }}
                />
                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <span style={{ fontWeight: 500 }}>结构化（向量检索）</span>
                  <span style={{ fontSize: 12, opacity: 0.7 }}>
                    支持 txt / md / pdf / docx；分块后用 embedding 做相似度检索，适合大段文档、跨文件查资料。
                  </span>
                </div>
              </label>
              <label
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 8,
                  padding: "8px 10px",
                  border: "1px solid var(--border-color, rgba(120,140,200,0.3))",
                  borderRadius: 6,
                  cursor: "pointer",
                  background:
                    newKind === "semi_structured"
                      ? "rgba(120,140,200,0.08)"
                      : "transparent",
                }}
              >
                <input
                  type="radio"
                  name="kb-create-kind"
                  checked={newKind === "semi_structured"}
                  onChange={() => setNewKind("semi_structured")}
                  style={{ marginTop: 3 }}
                />
                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <span style={{ fontWeight: 500 }}>半结构化（按描述挑文件）</span>
                  <span style={{ fontSize: 12, opacity: 0.7 }}>
                    仅支持 md / txt / json / yaml；每个文件带一段描述，对话时由 LLM 按描述挑相关文件整篇注入上下文。
                  </span>
                </div>
              </label>
            </div>
            <div className="kb-note-tools">
              <span className="kb-modal-spacer" />
              <button
                type="button"
                className="btn-ghost"
                onClick={() => setCreateOpen(false)}
              >
                取消
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => void createBase()}
              >
                创建
              </button>
            </div>
          </div>
        </div>
      )}
      {descEditing && (
        <div className="kb-modal" onClick={() => setDescEditing(null)}>
          <div
            className="kb-modal-card kb-note-modal-card"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="kb-settings-modal-header">
              <div>
                <h3>编辑描述</h3>
                <p className="field-hint">{descEditing.item.sourceName}</p>
              </div>
              <button
                type="button"
                className="btn-ghost kb-settings-close"
                onClick={() => setDescEditing(null)}
                aria-label="关闭"
              >
                关闭
              </button>
            </header>
            <div className="field">
              <label>描述（LLM 将根据它筛选文件，200-500 字为佳）</label>
              <textarea
                rows={6}
                value={descEditing.text}
                maxLength={500}
                placeholder="用一段话说明这个文件的主题、涵盖的知识点或用途…"
                onChange={(e) =>
                  setDescEditing((prev) => (prev ? { ...prev, text: e.target.value } : null))
                }
              />
              <p className="field-hint">
                当前 {descEditing.text.length} 字（上限 500）
              </p>
            </div>
            <div className="kb-note-tools">
              <button
                type="button"
                className="btn-ghost"
                disabled={!descReady || descEditing.regenerating}
                onClick={() => void regenerateDescription()}
                title={descReady ? "" : "需在设置中选择描述生成 LLM"}
              >
                {descEditing.regenerating ? "生成中…" : "AI 重新生成"}
              </button>
              <span className="kb-modal-spacer" />
              <button
                type="button"
                className="btn-ghost"
                onClick={() => setDescEditing(null)}
              >
                取消
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => void saveDescription()}
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}
      {settingsOpen && (
        <div className="kb-modal" onClick={() => setSettingsOpen(false)}>
          <div
            className="kb-modal-card kb-settings-modal-card"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="kb-settings-modal-header">
              <div>
                <h3>知识库设置</h3>
                <p className="field-hint">全局 embedding、分块与召回条数</p>
              </div>
              <button
                type="button"
                className="btn-ghost kb-settings-close"
                onClick={() => setSettingsOpen(false)}
                aria-label="关闭"
              >
                关闭
              </button>
            </header>
            <KnowledgeSettingsSection
              settings={settings}
              onChange={(patch: Partial<AppSettings>) =>
                setSettings((prev) => ({ ...prev, ...patch }))
              }
            />
          </div>
        </div>
      )}
      {conflicts && (
        <div className="kb-modal" onClick={() => setConflicts(null)}>
          <div className="kb-modal-card" onClick={(e) => e.stopPropagation()}>
            <h3>文件名冲突</h3>
            <p className="field-hint">同名文件已在库中。为每一条选择保留两者或替换已有。</p>
            {conflicts.map((file, idx) => (
              <label key={file.path} className="kb-conflict-row">
                <span className="kb-conflict-name">{file.name}</span>
                <select
                  value={file.action}
                  onChange={(e) => {
                    const action = e.target.value as "keep" | "replace";
                    setConflicts((prev) =>
                      prev?.map((row, i) => (i === idx ? { ...row, action } : row)) || null,
                    );
                  }}
                >
                  <option value="keep">保留两者</option>
                  <option value="replace">替换已有</option>
                </select>
              </label>
            ))}
            <div className="kb-modal-actions">
              <button
                type="button"
                className="btn-ghost"
                onClick={() =>
                  setConflicts((prev) => prev?.map((row) => ({ ...row, action: "keep" })) || null)
                }
              >
                全部保留
              </button>
              <button
                type="button"
                className="btn-ghost"
                onClick={() =>
                  setConflicts((prev) => prev?.map((row) => ({ ...row, action: "replace" })) || null)
                }
              >
                全部替换
              </button>
              <span className="kb-modal-spacer" />
              <button type="button" className="btn-ghost" onClick={() => setConflicts(null)}>
                取消
              </button>
              <button type="button" className="btn-secondary" onClick={() => void confirmConflicts()}>
                确定
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
