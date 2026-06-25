import { useState } from "react";
import type { ChatTopic } from "../../shared/chatSession";
import "./TopicSidebar.css";

const api = window.electronAPI;

interface Props {
  topics: ChatTopic[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onCreate: () => void;
  onDelete: (id: string) => void;
  onRename: (id: string, name: string) => void;
  onRefresh: () => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  loadingTopicIds: Set<string>;
}

function ChevronLeftIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

function NewChatIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function ChatIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <path d="M21 21l-4.35-4.35" />
    </svg>
  );
}

function LoadingIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 2v4" />
      <path d="M12 18v4" />
      <path d="M4.93 4.93l2.83 2.83" />
      <path d="M16.24 16.24l2.83 2.83" />
      <path d="M2 12h4" />
      <path d="M18 12h4" />
      <path d="M4.93 19.07l2.83-2.83" />
      <path d="M16.24 7.76l2.83-2.83" />
    </svg>
  );
}

function DeleteIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  );
}

function EditIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
    </svg>
  );
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  const diff = now.getTime() - ts;
  const oneDay = 86400000;

  if (diff < 60000) return "刚刚";
  if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`;
  if (diff < oneDay) return `${Math.floor(diff / 3600000)} 小时前`;
  if (d.toDateString() === now.toDateString()) {
    const h = d.getHours().toString().padStart(2, "0");
    const m = d.getMinutes().toString().padStart(2, "0");
    return `今天 ${h}:${m}`;
  }
  if (diff < oneDay * 2) return "昨天";
  if (diff < oneDay * 7) return `${Math.floor(diff / oneDay)} 天前`;
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export default function TopicSidebar({
  topics,
  activeId,
  onSelect,
  onCreate,
  onDelete,
  onRename,
  onRefresh,
  collapsed,
  onToggleCollapse,
  loadingTopicIds,
}: Props) {
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [menuId, setMenuId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const filtered = search.trim()
    ? topics.filter((t) => {
        const q = search.trim().toLowerCase();
        return (
          t.name.toLowerCase().includes(q) ||
          formatTime(t.updatedAt).includes(q)
        );
      })
    : topics;

  const sorted = [...filtered].sort((a, b) => b.orderKey - a.orderKey);

  const startRename = (topic: ChatTopic) => {
    setEditingId(topic.id);
    setEditText(topic.name || "");
    setMenuId(null);
  };

  const confirmRename = () => {
    if (editingId && editText.trim()) {
      onRename(editingId, editText.trim());
    }
    setEditingId(null);
    setEditText("");
  };

  const cancelRename = () => {
    setEditingId(null);
    setEditText("");
  };

  const handleDelete = async (topicId: string) => {
    setMenuId(null);
    setConfirmDeleteId(null);
    onDelete(topicId);
  };

  return (
    <aside className={`topic-sidebar${collapsed ? " collapsed" : ""}`}>
      <div className="topic-sidebar-header">
        <button
          type="button"
          className="topic-new-btn"
          onClick={onCreate}
          title="新建对话"
        >
          <NewChatIcon />
          {!collapsed && <span>新对话</span>}
        </button>
      </div>

      <div className="topic-sidebar-toolbar">
        {!collapsed && (
          <div className="topic-search">
            <SearchIcon />
            <input
              type="text"
              placeholder="搜索会话"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        )}
        <button
          type="button"
          className="topic-collapse-btn"
          onClick={onToggleCollapse}
          title={collapsed ? "展开侧边栏" : "收起侧边栏"}
        >
          {collapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
        </button>
      </div>

      {!collapsed && (
        <>
      <div className="topic-list">
        {sorted.length === 0 ? (
          <div className="topic-empty">
            <span>暂无会话</span>
          </div>
        ) : (
          sorted.map((topic) => (
            <div
              key={topic.id}
              className={`topic-item${activeId === topic.id ? " active" : ""}`}
              onClick={() => {
                if (editingId === topic.id) return;
                onSelect(topic.id);
              }}
              onContextMenu={(e) => {
                e.preventDefault();
                setMenuId(menuId === topic.id ? null : topic.id);
              }}
            >
              {editingId === topic.id ? (
                <input
                  className="topic-rename-input"
                  value={editText}
                  autoFocus
                  onChange={(e) => setEditText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      confirmRename();
                    }
                    if (e.key === "Escape") {
                      e.preventDefault();
                      cancelRename();
                    }
                  }}
                  onBlur={confirmRename}
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <>
                  <div className="topic-item-main">
                    <span className="topic-item-icon">
                      {loadingTopicIds.has(topic.id) ? (
                        <LoadingIcon className="topic-loading-icon" />
                      ) : (
                        <ChatIcon />
                      )}
                    </span>
                    <span className="topic-item-name">
                      {topic.name || "新对话"}
                    </span>
                    <div className="topic-item-actions">
                      <button
                        type="button"
                        className="topic-item-action-btn"
                        onClick={(e) => { e.stopPropagation(); startRename(topic); }}
                        title="重命名"
                      >
                        <EditIcon />
                      </button>
                      <button
                        type="button"
                        className="topic-item-action-btn danger"
                        onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(topic.id); }}
                        title="删除"
                      >
                        <DeleteIcon />
                      </button>
                    </div>
                  </div>
                  <div className="topic-item-time">
                    {formatTime(topic.updatedAt)}
                  </div>
                </>
              )}

              {confirmDeleteId === topic.id && (
                <div
                  className="topic-confirm-delete"
                  onClick={(e) => e.stopPropagation()}
                >
                  <span>确定删除此会话？</span>
                  <div className="topic-confirm-actions">
                    <button
                      type="button"
                      className="topic-cancel-btn"
                      onClick={() => setConfirmDeleteId(null)}
                    >
                      取消
                    </button>
                    <button
                      type="button"
                      className="topic-delete-btn"
                      onClick={() => handleDelete(topic.id)}
                    >
                      删除
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
        </>
      )}

      {menuId && (
        <div
          className="topic-menu-backdrop"
          onClick={() => setMenuId(null)}
        />
      )}
    </aside>
  );
}
