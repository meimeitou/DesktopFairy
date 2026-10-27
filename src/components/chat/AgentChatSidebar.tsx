import { Button, Icon } from "animal-island-ui";
import { useMemo, useState } from "react";
import { ChevronDown } from "../icons/naivePatch";
import type { AppSettings } from "../../shared/settings";
import { getChatAgents } from "../../shared/settings";
import type { AgentConfig } from "../../shared/agent";
import AgentAvatar from "../AgentAvatar";
import type { ChatTopic } from "../../shared/chatSession";
import AgentContextMenu from "./AgentContextMenu";
import { formatTime } from "../../shared/formatTime";
import "./AgentChatSidebar.css";

interface Props {
  settings: AppSettings;
  topics: ChatTopic[];
  activeTopicId: string | null;
  onSelectTopic: (id: string) => void;
  onCreateTopic: (agentId: string) => void;
  onDeleteTopic: (id: string) => void;
  onEditAgent: (agentId: string) => void;
  onCreateAgent: () => void;
  onDuplicateAgent: (agent: AgentConfig) => void;
  onDeleteAgent: (agent: AgentConfig) => void;
  onSelectAgent: (agentId: string) => void;
  loadingTopicIds: Set<string>;
  collapsed: boolean;
}

export default function AgentChatSidebar({
  settings,
  topics,
  activeTopicId,
  onSelectTopic,
  onCreateTopic,
  onDeleteTopic,
  onEditAgent,
  onCreateAgent,
  onDuplicateAgent,
  onDeleteAgent,
  onSelectAgent,
  loadingTopicIds,
  collapsed,
}: Props) {
  const [collapsedAgents, setCollapsedAgents] = useState<Set<string>>(new Set());
  const [agentMenu, setAgentMenu] = useState<{ id: string; x: number; y: number } | null>(null);
  const [confirmDeleteTopic, setConfirmDeleteTopic] = useState<{ id: string; x: number; y: number } | null>(null);
  const [confirmDeleteAgentId, setConfirmDeleteAgentId] = useState<string | null>(null);

  const agents = getChatAgents(settings);
  const activeAgentId = settings.activeChatAgentId;

  const groups = useMemo(() => {
    return agents.map((agent) => {
      const all = topics
        .filter((t) => t.agentId === agent.id)
        .sort((a, b) => b.orderKey - a.orderKey);
      return { agent, topics: all, total: all.length };
    });
  }, [agents, topics]);

  const confirmAgent = agents.find((a) => a.id === confirmDeleteAgentId);
  const confirmAgentTopics = confirmAgent
    ? topics.filter((t) => t.agentId === confirmAgent.id)
    : [];

  const toggleAgent = (agentId: string) => {
    setCollapsedAgents((prev) => {
      const next = new Set(prev);
      if (next.has(agentId)) next.delete(agentId);
      else next.add(agentId);
      return next;
    });
  };

  const isGroupActive = (agent: AgentConfig) => {
    const topic = topics.find((t) => t.id === activeTopicId);
    return topic ? topic.agentId === agent.id : activeAgentId === agent.id;
  };

  return (
    <aside className={`agent-chat-sidebar${collapsed ? " collapsed" : ""}`} aria-hidden={collapsed} {...(collapsed ? { inert: true } : {})}>
      <div className="agent-chat-sidebar-head">
        <button
          type="button"
          className="agent-group-add"
          onClick={onCreateAgent}
          title="新建智能体"
        >
          <Icon name="Plus" size={14} />
          <span>新建智能体</span>
        </button>
      </div>

      <div className="agent-groups">
        {groups.map(({ agent, topics: agentTopics, total }) => {
          const isCollapsed = collapsedAgents.has(agent.id);
          return (
            <section key={agent.id} className="agent-group">
              <header
                className={`agent-group-head${isGroupActive(agent) ? " active" : ""}`}
                onClick={() => {
                  if (isGroupActive(agent)) {
                    toggleAgent(agent.id);
                  } else {
                    // 选中即展开：切换 agent 同时清掉它的折叠态，一次点击直接看到会话列表
                    setCollapsedAgents((prev) => {
                      if (!prev.has(agent.id)) return prev;
                      const next = new Set(prev);
                      next.delete(agent.id);
                      return next;
                    });
                    onSelectAgent(agent.id);
                  }
                }}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setAgentMenu({ id: agent.id, x: e.clientX + 2, y: e.clientY });
                }}
              >
                <AgentAvatar avatar={agent.avatar} className="agent-list-avatar" />
                <span className="agent-group-name" title={agent.name}>{agent.name}</span>
                <span className="agent-group-count">{total}</span>
                <div
                  className="agent-group-actions"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    className="agent-group-action"
                    title="新对话"
                    onClick={() => onCreateTopic(agent.id)}
                  >
                    <Icon name="Chat" size={13} />
                  </button>
                  <button
                    type="button"
                    className="agent-group-action"
                    title="操作"
                    onClick={(e) => {
                      if (agentMenu?.id === agent.id) { setAgentMenu(null); return; }
                      const r = e.currentTarget.getBoundingClientRect();
                      setAgentMenu({ id: agent.id, x: r.right + 4, y: r.top });
                    }}
                  >
                    <Icon name="Edit" size={13} />
                  </button>
                </div>
                <span className={`agent-group-chevron${isCollapsed ? " folded" : ""}`}>
                  <Icon icon={ChevronDown} size={12} />
                </span>
              </header>

              {!isCollapsed && (
                <div className="agent-group-topics">
                  <button
                    type="button"
                    className="topic-new-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      onCreateTopic(agent.id);
                    }}
                  >
                    <Icon name="Plus" size={13} />
                    <span>新增会话</span>
                  </button>
                  {agentTopics.length === 0 ? (
                    <div className="topic-empty">
                      <span>暂无会话</span>
                    </div>
                  ) : (
                    <>
                      {agentTopics.map((topic, index) => (
                      <div
                        key={topic.id}
                        className={`topic-item${activeTopicId === topic.id ? " active" : ""}`}
                        style={{ "--topic-index": index } as React.CSSProperties}
                        onClick={() => onSelectTopic(topic.id)}
                        onContextMenu={(e) => {
                          e.preventDefault();
                        }}
                      >
                        <div className="topic-item-main">
                          <span className="topic-item-icon">
                            {loadingTopicIds.has(topic.id) ? (
                              <Icon name="Refresh" size={14} className="topic-loading-icon" />
                            ) : (
                              <Icon name="Chat" />
                            )}
                          </span>
                          <span className="topic-item-name">
                            {topic.name || "新对话"}
                          </span>
                          <div className="topic-item-actions">
                            <Button
                              type="default"
                              size="small"
                              danger
                              className="topic-item-action-btn topic-item-action-btn-danger"
                              icon={<Icon name="Trash" size={12} />}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (confirmDeleteTopic?.id === topic.id) { setConfirmDeleteTopic(null); return; }
                                const r = e.currentTarget.getBoundingClientRect();
                                setConfirmDeleteTopic({ id: topic.id, x: r.right + 4, y: r.top });
                              }}
                              title="删除"
                            />
                          </div>
                        </div>
                        <div className="topic-item-time">
                          {formatTime(topic.updatedAt)}
                        </div>
                      </div>
                    ))}
                    </>
                  )}
                </div>
              )}
            </section>
          );
        })}
      </div>

      {agentMenu && (
        <>
          <div
            className="topic-menu-backdrop"
            onClick={() => setAgentMenu(null)}
          />
          <AgentContextMenu
            agent={agents.find((a) => a.id === agentMenu.id)}
            x={agentMenu.x}
            y={agentMenu.y}
            onEdit={(id) => {
              setAgentMenu(null);
              onEditAgent(id);
            }}
            onDuplicate={(agent) => {
              setAgentMenu(null);
              onDuplicateAgent(agent);
            }}
            onRequestDelete={(id) => {
              setAgentMenu(null);
              setConfirmDeleteAgentId(id);
            }}
          />
        </>
      )}

      {confirmDeleteTopic && (
        <div
          className="topic-confirm-anchor"
          style={{ left: confirmDeleteTopic.x, top: confirmDeleteTopic.y }}
        >
          <div
            className="topic-menu-backdrop"
            onClick={() => setConfirmDeleteTopic(null)}
          />
          <div
            className="topic-confirm-delete"
            onClick={(e) => e.stopPropagation()}
          >
            <span>确定删除此会话？</span>
            <div className="topic-confirm-actions">
              <Button
                type="default"
                size="small"
                onClick={() => setConfirmDeleteTopic(null)}
              >
                取消
              </Button>
              <Button
                type="primary"
                size="small"
                danger
                onClick={() => {
                  const id = confirmDeleteTopic.id;
                  setConfirmDeleteTopic(null);
                  onDeleteTopic(id);
                }}
              >
                删除
              </Button>
            </div>
          </div>
        </div>
      )}

      {confirmAgent && (
        <div
          className="topic-menu-backdrop"
          onClick={() => setConfirmDeleteAgentId(null)}
        >
          <div
            className="agent-confirm-delete"
            onClick={(e) => e.stopPropagation()}
          >
            <span>
              删除「{confirmAgent.name}」？将同时删除其{" "}
              {confirmAgentTopics.length} 个会话。
            </span>
            <div className="topic-confirm-actions">
              <Button
                type="default"
                size="small"
                onClick={() => setConfirmDeleteAgentId(null)}
              >
                取消
              </Button>
              <Button
                type="primary"
                size="small"
                danger
                onClick={() => {
                  onDeleteAgent(confirmAgent);
                  setConfirmDeleteAgentId(null);
                }}
              >
                删除
              </Button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
