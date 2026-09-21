import { Button, Icon, Input } from "animal-island-ui";
import { useState } from "react";
import type { ChatTopic } from "../../shared/chatSession";
import "./TopicSidebar.css";

interface Props {
  topics: ChatTopic[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onCreate: () => void;
  onDelete: (id: string) => void;
  onRename: (id: string, name: string) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  loadingTopicIds: Set<string>;
}

function LoadingIcon({ className = "" }: { className?: string }) {
  return <Icon name="Refresh" size={14} className={className} />;
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
        <Button
          type="primary"
          size="small"
          className="topic-new-btn"
          block={!collapsed}
          onClick={onCreate}
          title="新建对话"
          icon={<Icon name="Plus" size={collapsed ? 16 : 20} />}
        >
          {!collapsed && <span>新对话</span>}
        </Button>
      </div>

      <div className="topic-sidebar-toolbar">
        {!collapsed && (
          <div className="topic-search">
            <Icon name="Search" />
            <Input
              type="text"
              placeholder="搜索会话"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        )}
        <Button
          type="text"
          size="small"
          className="topic-collapse-btn"
          onClick={onToggleCollapse}
          title={collapsed ? "展开侧边栏" : "收起侧边栏"}
          icon={<Icon name="Play" />}
        />
      </div>

      {!collapsed && (
        <>
      <div className="topic-list">
        {sorted.length === 0 ? (
          <div className="topic-empty">
            <span>暂无会话</span>
          </div>
        ) : (
          sorted.map((topic, index) => (
            <div
              key={topic.id}
              className={`topic-item${activeId === topic.id ? " active" : ""}`}
              style={{ "--topic-index": index } as React.CSSProperties}
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
                <Input
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
                        <Icon name="Chat" />
                      )}
                    </span>
                    <span className="topic-item-name">
                      {topic.name || "新对话"}
                    </span>
                    <div className="topic-item-actions">
                      <Button
                        type="text"
                        size="small"
                        className="topic-item-action-btn"
                        icon={<Icon name="Edit" size={12} />}
                        onClick={(e) => { e.stopPropagation(); startRename(topic); }}
                        title="重命名"
                      />
                      <Button
                        type="default"
                        size="small"
                        danger
                        className="topic-item-action-btn topic-item-action-btn-danger"
                        icon={<Icon name="Trash" size={12} />}
                        onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(topic.id); }}
                        title="删除"
                      />
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
                    <Button
                      type="default"
                      size="small"
                      onClick={() => setConfirmDeleteId(null)}
                    >
                      取消
                    </Button>
                    <Button
                      type="primary"
                      size="small"
                      danger
                      onClick={() => handleDelete(topic.id)}
                    >
                      删除
                    </Button>
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
