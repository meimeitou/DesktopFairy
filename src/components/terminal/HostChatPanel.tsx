import { Button, Icon } from "animal-island-ui";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import MessageList, {
  type MessageListHandle,
} from "../chat/MessageList";
import ChatInputBar from "../chat/ChatInputBar";
import { ToolCancelContext } from "../chat/agentTools/ToolCancelContext";
import { useToolApproval } from "../../hooks/useToolApproval";
import { useConfirm } from "../../hooks/useConfirm";
import {
  attachTopicStream,
  detachTopicStream,
  abortTopicStream,
  openAgentStream,
  replayLegacyStreamEvents,
  type LegacyStreamHandlers,
} from "../../services/aiTransport/IpcChatTransport";
import { createStreamChunkBuffer } from "../../hooks/createStreamChunkBuffer";
import {
  type ChatMsg,
  applyStreamTextPart,
  filterForAgentHistory,
  findLastAssistantReplyIndex,
  pruneEmptyAssistantMessages,
  reconcileToolMessages,
  upsertAgentToolMessage,
  trimMessagesForApi,
  buildAgentHistoryMessages,
} from "../../shared/chatMessages";
import {
  normalizeChatSession,
  buildChatSession,
  trimSessionForStorage,
  generateTopicTitle,
  type ChatTopic,
} from "../../shared/chatSession";
import {
  getChatApiConfig,
  updateAgentInSettings,
} from "../../shared/settings";
import { HOST_ASSISTANT_ID, findAgentById } from "../../shared/agent";
import {
  buildTrimOptions,
  estimateAgentSystemPromptTokens,
  resolveActiveModelName,
  resolveContextWindow,
} from "../../shared/contextUsage";
import { mergeRefTopicStates } from "../../shared/topicStateSync";
import { getSettingsSnapshot, setSettings, useSettings } from "../../shared/settingsStore";

import type { ChatMode } from "../../shared/chatMode";
import type { ReasoningEffort } from "../../shared/reasoningEffort";
import type { ToolTerminalState } from "../../shared/ai/stream";
import "./HostChatPanel.css";

const api = window.electronAPI;

type TopicPageState = {
  messages: ChatMsg[];
  input: string;
  streaming: boolean;
  requestId: string | null;
  sessionReady: boolean;
};

function emptyTopicState(): TopicPageState {
  return {
    messages: [],
    input: "",
    streaming: false,
    requestId: null,
    sessionReady: false,
  };
}

function genId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `req-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export default function HostChatPanel({
  isActive,
  onOpenSshSettings,
}: {
  isActive: boolean;
  onOpenSshSettings: () => void;
}) {
  const settings = useSettings();
  const { confirm, dialog: confirmDialog } = useConfirm();
  const [topics, setTopics] = useState<ChatTopic[]>([]);
  const topicsRef = useRef<ChatTopic[]>([]);
  const [activeTopicId, setActiveTopicId] = useState<string | null>(null);
  const [topicStates, setTopicStates] = useState<Record<string, TopicPageState>>({});
  const topicStatesRef = useRef(topicStates);
  const [streamingTopics, setStreamingTopics] = useState<Set<string>>(new Set());
  const [awaitingApprovalTopics, setAwaitingApprovalTopics] = useState<Set<string>>(new Set());
  const [hostPickerOpen, setHostPickerOpen] = useState(false);

  const activeTopicIdRef = useRef(activeTopicId);
  activeTopicIdRef.current = activeTopicId;
  const requestIdToTopicIdRef = useRef<Map<string, string>>(new Map());
  const agentSendLockRef = useRef<Set<string>>(new Set());
  const legacyStreamHandlersRef = useRef<LegacyStreamHandlers | null>(null);
  const messageListRef = useRef<MessageListHandle>(null);
  const chatMessagesRef = useRef<ChatMsg[]>([]);
  const requestIdRef = useRef<string>("");

  const hostAgent =
    findAgentById(settings.agents, HOST_ASSISTANT_ID) ?? null;
  const activeTopic = topics.find((t) => t.id === activeTopicId) ?? null;
  const activeState = topicStates[activeTopicId ?? ""] ?? emptyTopicState();
  const { messages, input, streaming } = activeState;
  chatMessagesRef.current = messages;
  topicStatesRef.current = mergeRefTopicStates(topicStatesRef.current, topicStates);
  // `topics` is also written by rename / chatMode updates, not only by
  // refreshTopics() — keep the ref in sync so handleSend sees the new mode.
  topicsRef.current = topics;

  const hostById = useCallback(
    (hostId: string) => settings.sshHosts.find((h) => h.id === hostId) ?? null,
    [settings.sshHosts],
  );

  const scrollToBottom = useCallback(() => {
    messageListRef.current?.scrollToBottom();
  }, []);

  /** Load host topics (scope:host) + activeHostId. */
  const refreshTopics = useCallback(async () => {
    const store = (await api.invoke("chat:topics:list", { scope: "host" })) as {
      topics: ChatTopic[];
      activeHostId: string | null;
    };
    const list = Array.isArray(store.topics) ? store.topics : [];
    setTopics(list);
    topicsRef.current = list;
    return { list, activeHostId: store.activeHostId ?? null };
  }, []);

  /** Hydrate a topic's session from disk. */
  const hydrateSession = useCallback(async (topicId: string) => {
    if (topicStatesRef.current[topicId]?.sessionReady) return;
    const raw = (await api.invoke("chat:session:load", topicId)) as unknown;
    const session = normalizeChatSession(raw);
    const next: TopicPageState = {
      ...emptyTopicState(),
      messages: session.messages ?? [],
      input: session.draftInput ?? "",
      sessionReady: true,
    };
    topicStatesRef.current = { ...topicStatesRef.current, [topicId]: next };
    setTopicStates((prev) => ({ ...prev, [topicId]: next }));
  }, []);

  // Load host topics → active topic → hydrate. Also re-runs when the saved
  // hosts change (main cascades topic deletion when a host is removed), in
  // which case the selection must fall back instead of pointing at a ghost.
  const sshHostsKey = settings.sshHosts.map((h) => h.id).join(",");
  useEffect(() => {
    void (async () => {
      const { list, activeHostId } = await refreshTopics();
      const current = activeTopicIdRef.current;
      if (current && list.some((t) => t.id === current)) return;
      const target =
        (activeHostId && list.some((t) => t.id === activeHostId)
          ? activeHostId
          : null) ?? list[0]?.id ?? null;
      setActiveTopicId(target);
      if (target) await hydrateSession(target);
    })();
  }, [sshHostsKey, refreshTopics, hydrateSession]);

  const persistSession = useCallback(async (topicId?: string) => {
    const tid = topicId ?? activeTopicIdRef.current;
    if (!tid) return;
    const state = topicStatesRef.current[tid];
    if (!state?.sessionReady) return;
    const session = trimSessionForStorage(
      buildChatSession(state.messages, state.input, []),
    );
    await api.invoke("chat:session:save", { topicId: tid, session });
  }, []);

  const syncStreamingFlag = useCallback((topicId: string, streaming: boolean) => {
    setStreamingTopics((prev) => {
      const next = new Set(prev);
      if (streaming) next.add(topicId);
      else next.delete(topicId);
      return next;
    });
  }, []);

  const patchTopicState = useCallback(
    (topicId: string, updater: (state: TopicPageState) => TopicPageState) => {
      const prev = topicStatesRef.current[topicId];
      if (!prev) return;
      const next = updater(prev);
      if (next === prev) return;
      topicStatesRef.current = { ...topicStatesRef.current, [topicId]: next };
      if (prev.streaming !== next.streaming) {
        syncStreamingFlag(topicId, next.streaming);
      }
      if (topicId === activeTopicIdRef.current) {
        setTopicStates((s) => ({ ...s, [topicId]: next }));
      }
    },
    [syncStreamingFlag],
  );

  // Attach to the active topic's live stream (background streams keep running).
  useEffect(() => {
    if (!activeTopicId) return;
    void (async () => {
      const result = await attachTopicStream(activeTopicId);
      if (result.requestId) {
        requestIdToTopicIdRef.current.set(result.requestId, activeTopicId);
      }
      replayLegacyStreamEvents(
        result.legacyEvents,
        legacyStreamHandlersRef.current,
      );
      if (result.attached && result.status === "streaming" && result.requestId) {
        patchTopicState(activeTopicId, (state) => ({
          ...state,
          streaming: true,
          requestId: result.requestId!,
        }));
        syncStreamingFlag(activeTopicId, true);
      }
    })();
    return () => {
      detachTopicStream(activeTopicId);
    };
  }, [activeTopicId, patchTopicState, syncStreamingFlag]);

  // Stream event routing (chunk/done/error/tool) — same shape as ChatPage.
  useEffect(() => {
    const applyChunk = (
      requestId: string,
      parts: { partId: string; text: string }[],
      reasoning: string,
    ) => {
      const topicId = requestIdToTopicIdRef.current.get(requestId);
      if (!topicId) return;
      if (parts.length === 0 && !reasoning) return;
      patchTopicState(topicId, (state) => {
        let msgs = state.messages;
        for (const part of parts) {
          msgs = applyStreamTextPart(msgs, part.partId, part.text);
        }
        if (reasoning) {
          const ri = Math.max(0, findLastAssistantReplyIndex(msgs));
          const next = msgs.slice();
          next[ri] = {
            ...next[ri],
            reasoning: (next[ri].reasoning ?? "") + reasoning,
          };
          msgs = next;
        }
        return { ...state, messages: msgs };
      });
    };

    const chunkBuffer = createStreamChunkBuffer(applyChunk);

    const handleChatChunk = ({
      requestId,
      partId,
      delta,
      reasoning,
    }: {
      requestId: string;
      partId?: string;
      delta?: string;
      reasoning?: string;
    }) => {
      const topicId = requestIdToTopicIdRef.current.get(requestId);
      if (!topicId) return;
      chunkBuffer.push(requestId, partId, delta, reasoning);
    };

    const handleChatDone = ({
      requestId,
      aborted,
      tools,
    }: {
      requestId: string;
      aborted?: boolean;
      tools?: ToolTerminalState[];
    }) => {
      chunkBuffer.flushRequest(requestId);
      const topicId = requestIdToTopicIdRef.current.get(requestId);
      if (!topicId) return;
      setTimeout(() => {
        requestIdToTopicIdRef.current.delete(requestId);
      }, 0);
      patchTopicState(topicId, (state) => ({
        ...state,
        streaming: false,
        requestId: null,
        messages: pruneEmptyAssistantMessages(
          reconcileToolMessages(state.messages, tools, Boolean(aborted)),
        ),
      }));
      setAwaitingApprovalTopics((prev) => {
        const next = new Set(prev);
        next.delete(topicId);
        return next;
      });
      void persistSession(topicId);
    };

    const handleChatError = ({
      requestId,
      message,
    }: {
      requestId: string;
      message: string;
    }) => {
      chunkBuffer.flushRequest(requestId);
      const topicId = requestIdToTopicIdRef.current.get(requestId);
      if (!topicId) return;
      requestIdToTopicIdRef.current.delete(requestId);
      patchTopicState(topicId, (state) => {
        const reconciled = reconcileToolMessages(state.messages, undefined, false);
        const idx = findLastAssistantReplyIndex(reconciled);
        if (idx < 0) {
          return { ...state, streaming: false, requestId: null, messages: reconciled };
        }
        const next = reconciled.slice();
        const target = next[idx];
        next[idx] = {
          ...target,
          content: target.content || `请求失败：${message}`,
          error: true,
        };
        return { ...state, streaming: false, requestId: null, messages: next };
      });
      setAwaitingApprovalTopics((prev) => {
        const next = new Set(prev);
        next.delete(topicId);
        return next;
      });
      void persistSession(topicId);
    };

    const handleAgentTool = ({
      requestId,
      toolCallId,
      toolName,
      toolArgs,
      approvalId,
      status,
      message,
      resultPreview,
      force,
    }: {
      requestId: string;
      toolCallId?: string;
      toolName?: string;
      toolArgs?: string;
      approvalId?: string;
      status?: ChatMsg["toolStatus"];
      message?: string;
      resultPreview?: string;
      force?: boolean;
    }) => {
      chunkBuffer.flushRequest(requestId);
      const topicId = requestIdToTopicIdRef.current.get(requestId);
      if (!topicId) return;
      patchTopicState(topicId, (state) => ({
        ...state,
        messages: upsertAgentToolMessage(state.messages, {
          toolCallId,
          toolName,
          toolArgs,
          toolApprovalId: approvalId,
          toolStatus: status,
          toolMessage: message,
          toolResultPreview: resultPreview,
          toolForce: force,
        }),
      }));
      if (status === "awaiting_approval") {
        setAwaitingApprovalTopics((prev) => new Set([...prev, topicId]));
      }
      void persistSession(topicId);
    };

    legacyStreamHandlersRef.current = {
      onChatChunk: handleChatChunk,
      onChatDone: handleChatDone,
      onChatError: handleChatError,
      onAgentTool: (data) =>
        handleAgentTool(data as Parameters<typeof handleAgentTool>[0]),
    };

    const offChunk = api.onChatStreamChunk(handleChatChunk);
    const offDone = api.onChatStreamDone(handleChatDone);
    const offError = api.onChatStreamError(handleChatError);
    const offTool = api.onAgentStreamTool?.(handleAgentTool);

    return () => {
      chunkBuffer.dispose();
      offChunk?.();
      offDone?.();
      offError?.();
      offTool?.();
    };
  }, [patchTopicState, persistSession]);

  const handleChatModeChange = useCallback((mode: ChatMode) => {
    const topicId = activeTopicIdRef.current;
    if (!topicId) return;
    setTopics((prev) =>
      prev.map((t) => (t.id === topicId ? { ...t, chatMode: mode } : t)),
    );
    void api.invoke("chat:topics:updateMeta", { topicId, chatMode: mode });
  }, []);

  const {
    submittingApprovalId,
    handleApproveTool,
    handleDenyTool,
    handleAlwaysAllowTool,
    submitToolAnswer,
  } = useToolApproval(
    chatMessagesRef,
    () => handleChatModeChange("full-auto"),
    requestIdRef,
    activeTopicIdRef,
  );

  const handleCancelTool = useCallback(() => {
    const topicId = activeTopicIdRef.current;
    if (!topicId) return;
    const state = topicStatesRef.current[topicId];
    if (state?.requestId) {
      abortTopicStream(topicId, state.requestId);
    }
  }, []);

  const handleStop = useCallback(() => {
    const topicId = activeTopicIdRef.current;
    if (!topicId) return;
    const state = topicStatesRef.current[topicId];
    if (state?.requestId) {
      abortTopicStream(topicId, state.requestId);
    }
  }, []);

  const handleReasoningEffortChange = useCallback((value: ReasoningEffort) => {
    // Host assistant config is shared across all host conversations.
    const current = getSettingsSnapshot();
    setSettings(updateAgentInSettings(current, HOST_ASSISTANT_ID, { reasoningEffort: value }));
  }, []);

  const handleSelectTopic = useCallback(
    async (topicId: string) => {
      const old = activeTopicIdRef.current;
      if (old && old !== topicId) await persistSession(old);
      setActiveTopicId(topicId);
      const latest = topicStatesRef.current[topicId];
      if (latest?.sessionReady) {
        // The ref may be ahead after background streaming — hydrate React
        // state from it instead of leaving the stale committed snapshot.
        setTopicStates((prev) => ({ ...prev, [topicId]: latest }));
      } else {
        await hydrateSession(topicId);
      }
      void api.invoke("chat:topics:setActive", { topicId, scope: "host" });
      scrollToBottom();
    },
    [hydrateSession, persistSession, scrollToBottom],
  );

  const handleCreateTopic = useCallback(
    async (hostId: string) => {
      const result = (await api.invoke("chat:topics:create", {
        agentId: HOST_ASSISTANT_ID,
        hostId,
      })) as { ok?: boolean; topic?: ChatTopic; error?: string };
      if (!result?.ok || !result.topic) return;
      await refreshTopics();
      const tid = result.topic.id;
      topicStatesRef.current = { ...topicStatesRef.current, [tid]: emptyTopicState() };
      setTopicStates((prev) => ({ ...prev, [tid]: emptyTopicState() }));
      setActiveTopicId(tid);
      setHostPickerOpen(false);
      scrollToBottom();
    },
    [refreshTopics, scrollToBottom],
  );

  const handleDeleteTopic = useCallback(
    async (topicId: string) => {
      const topic = topicsRef.current.find((t) => t.id === topicId);
      const host = topic?.host ? hostById(topic.host.hostId) : null;
      const confirmed = await confirm({
        title: "删除主机对话",
        content: `确定删除「${topic?.name || host?.name || "该对话"}」？对话历史将一并删除。`,
        okText: "删除",
        danger: true,
      });
      if (!confirmed) return;
      await api.invoke("chat:topics:delete", topicId);
      const { list, activeHostId } = await refreshTopics();
      if (activeTopicIdRef.current === topicId) {
        const next =
          (activeHostId && list.some((t) => t.id === activeHostId)
            ? activeHostId
            : null) ?? list[0]?.id ?? null;
        setActiveTopicId(next);
        if (next) await hydrateSession(next);
      }
    },
    [confirm, hostById, hydrateSession, refreshTopics],
  );

  const failAgentOpen = useCallback(
    (topicId: string, requestId: string, message: string) => {
      if (requestIdToTopicIdRef.current.get(requestId) !== topicId) return;
      requestIdToTopicIdRef.current.delete(requestId);
      const s = topicStatesRef.current[topicId];
      if (!s) return;
      const owns = s.requestId === requestId;
      const idx = findLastAssistantReplyIndex(s.messages);
      const nextMsgs = s.messages.slice();
      if (idx >= 0) {
        nextMsgs[idx] = { ...nextMsgs[idx], content: message, error: true };
      }
      const next = {
        ...s,
        messages: nextMsgs,
        streaming: owns ? false : s.streaming,
        requestId: owns ? null : s.requestId,
      };
      topicStatesRef.current = { ...topicStatesRef.current, [topicId]: next };
      setTopicStates((prev) => ({ ...prev, [topicId]: next }));
      if (owns) syncStreamingFlag(topicId, false);
    },
    [syncStreamingFlag],
  );

  const handleSend = useCallback(async () => {
    const topicId = activeTopicIdRef.current;
    if (!topicId) return;
    const state = topicStatesRef.current[topicId];
    if (!state || state.streaming) return;
    if (agentSendLockRef.current.has(topicId)) return;

    const text = state.input.trim();
    if (!text) return;

    agentSendLockRef.current.add(topicId);
    try {
      const currentSettings = getSettingsSnapshot();
      const agent = findAgentById(currentSettings.agents, HOST_ASSISTANT_ID);
      const topic = topicsRef.current.find((t) => t.id === topicId);
      if (!agent || !topic) return;
      const apiConfig = getChatApiConfig(currentSettings, agent);
      if (!apiConfig?.apiHost || !apiConfig.modelName) return;

      const trimOpts = buildTrimOptions({
        contextWindow: resolveContextWindow(resolveActiveModelName(agent)),
        systemTokens: estimateAgentSystemPromptTokens(agent),
      });
      const history = trimMessagesForApi(
        filterForAgentHistory(state.messages),
        trimOpts,
      );
      const payloadMessages = buildAgentHistoryMessages([
        ...history,
        {
          id: genId(),
          role: "user" as const,
          content: text,
          timestamp: Date.now(),
        },
      ]);

      const requestId = genId();
      requestIdRef.current = requestId;
      requestIdToTopicIdRef.current.set(requestId, topicId);

      const now = Date.now();
      const next: TopicPageState = {
        ...state,
        input: "",
        messages: [
          ...state.messages,
          { id: genId(), role: "user", content: text, timestamp: now },
          { id: genId(), role: "assistant", content: "", timestamp: now },
        ],
        streaming: true,
        requestId,
      };
      topicStatesRef.current = { ...topicStatesRef.current, [topicId]: next };
      setTopicStates((prev) => ({ ...prev, [topicId]: next }));
      syncStreamingFlag(topicId, true);
      scrollToBottom();

      // First user message → derive topic title.
      if (!topic.name) {
        const title = generateTopicTitle(text);
        setTopics((prev) =>
          prev.map((t) => (t.id === topicId ? { ...t, name: title } : t)),
        );
        void api.invoke("chat:topics:rename", { topicId, name: title });
      }

      openAgentStream({
        topicId,
        requestId,
        messages: payloadMessages,
        apiConfig: {
          apiHost: apiConfig.apiHost,
          apiKey: apiConfig.apiKey,
          providerType: apiConfig.providerType,
          modelName: apiConfig.modelName,
        },
        agentConfig: {
          ...agent,
          chatMode: topic.chatMode ?? agent.chatMode,
        },
      })
        .then((result) => {
          if (!result || typeof result !== "object") return;
          if ((result as { mode?: string }).mode !== "blocked") return;
          failAgentOpen(topicId, requestId, "该话题已有进行中的会话，请等待完成或先停止。");
        })
        .catch((e: Error) => {
          failAgentOpen(topicId, requestId, `请求失败：${e.message || e}`);
        });
    } finally {
      agentSendLockRef.current.delete(topicId);
    }
  }, [failAgentOpen, scrollToBottom, syncStreamingFlag]);

  const setActiveInput = useCallback((value: string) => {
    const topicId = activeTopicIdRef.current;
    if (!topicId) return;
    setTopicStates((prev) => ({
      ...prev,
      [topicId]: { ...(prev[topicId] ?? emptyTopicState()), input: value },
    }));
  }, []);

  // Group topics by host.
  const groups = useMemo(() => {
    const m = new Map<string, ChatTopic[]>();
    for (const t of topics) {
      const hostId = t.host?.hostId ?? "";
      if (!m.has(hostId)) m.set(hostId, []);
      m.get(hostId)!.push(t);
    }
    return m;
  }, [topics]);

  const activeHost = activeTopic?.host ? hostById(activeTopic.host.hostId) : null;
  const activeChatMode: ChatMode = activeTopic?.chatMode ?? hostAgent?.chatMode ?? "normal";

  const renderSidebar = () => (
    <div className="host-chat-sidebar">
      <div className="host-chat-sidebar-head">
        <span>主机对话</span>
        <Button
          type="text"
          size="small"
          icon={<Icon name="Plus" size={14} />}
          title="新建主机对话"
          onClick={() => setHostPickerOpen((v) => !v)}
        />
      </div>
      <div className="host-chat-sidebar-body">
        {settings.sshHosts.length === 0 ? (
          <div className="host-chat-sidebar-empty">
            <p>还没有已保存的 SSH 主机</p>
            <Button type="default" size="small" onClick={onOpenSshSettings}>
              去添加主机
            </Button>
          </div>
        ) : groups.size === 0 ? (
          // 有主机、无对话：直接列主机，点选即建新对话。
          settings.sshHosts.map((h) => (
            <div key={h.id} className="host-chat-group">
              <div className="host-chat-group-head">
                <span className="host-chat-group-name">{h.name}</span>
                <span className="host-chat-group-meta">
                  {`${h.user}@${h.host}:${h.port || 22}`}
                </span>
                <Button
                  type="text"
                  size="small"
                  className="host-chat-group-new"
                  icon={<Icon name="Plus" size={12} />}
                  title={`在 ${h.name} 新建对话`}
                  onClick={() => void handleCreateTopic(h.id)}
                />
              </div>
            </div>
          ))
        ) : (
          [...groups.entries()].map(([hostId, list]) => {
            const host = hostById(hostId);
            return (
              <div key={hostId} className="host-chat-group">
                <div className="host-chat-group-head">
                  <span className="host-chat-group-name">
                    {host?.name || "未知主机"}
                  </span>
                  <span className="host-chat-group-meta">
                    {host ? `${host.user}@${host.host}` : ""}
                  </span>
                  <Button
                    type="text"
                    size="small"
                    className="host-chat-group-new"
                    icon={<Icon name="Plus" size={12} />}
                    title={`在 ${host?.name || "该主机"} 新建对话`}
                    onClick={() => void handleCreateTopic(hostId)}
                  />
                </div>
                {list.map((t) => (
                  <div
                    key={t.id}
                    className={`host-chat-topic${t.id === activeTopicId ? " active" : ""}`}
                    onClick={() => void handleSelectTopic(t.id)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") void handleSelectTopic(t.id);
                    }}
                  >
                    <span className="host-chat-topic-name">
                      {t.name || "新对话"}
                    </span>
                    {(streamingTopics.has(t.id) || awaitingApprovalTopics.has(t.id)) && (
                      <span
                        className={`host-chat-topic-dot${awaitingApprovalTopics.has(t.id) ? " awaiting" : ""}`}
                        title={awaitingApprovalTopics.has(t.id) ? "等待审批" : "运行中"}
                      />
                    )}
                    <span
                      className="host-chat-topic-delete"
                      role="button"
                      tabIndex={-1}
                      aria-label="删除对话"
                      onClick={(e) => {
                        e.stopPropagation();
                        void handleDeleteTopic(t.id);
                      }}
                    >
                      ×
                    </span>
                  </div>
                ))}
              </div>
            );
          })
        )}
      </div>
      {hostPickerOpen && settings.sshHosts.length > 0 && (
        <div className="host-chat-host-picker">
          {settings.sshHosts.map((h) => (
            <button
              key={h.id}
              type="button"
              className="host-chat-host-option"
              onClick={() => void handleCreateTopic(h.id)}
            >
              <strong>{h.name}</strong>
              <span>{`${h.user}@${h.host}:${h.port || 22}`}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );


  const emptyContent = !activeTopic
    ? settings.sshHosts.length === 0
      ? undefined
      : (
        <div className="host-chat-empty">
          <p>选择左侧主机开始对话，或新建一个。</p>
        </div>
      )
    : undefined;

  return (
    <div className={`host-chat-panel${isActive ? " active" : ""}`}>
      {renderSidebar()}
      <div className="host-chat-main">
        {activeTopic && (
          <header className="host-chat-header">
            <span className="host-chat-header-title">
              <Icon name="Video" size={14} />
              {activeHost?.name || "未知主机"}
              {activeHost ? ` · ${activeHost.user}@${activeHost.host}` : ""}
            </span>
            <span className="host-chat-header-topic">
              {activeTopic.name || "新对话"}
            </span>
          </header>
        )}
        <ToolCancelContext.Provider value={handleCancelTool}>
          <MessageList
            ref={messageListRef}
            messages={messages}
            streaming={streaming}
            invalidAttachmentPaths={new Set()}
            onApprove={handleApproveTool}
            onDeny={handleDenyTool}
            onAlwaysAllow={handleAlwaysAllowTool}
            onAnswer={submitToolAnswer}
            submittingApprovalId={submittingApprovalId}
            emptyContent={emptyContent}
          />
        </ToolCancelContext.Provider>
        <ChatInputBar
          input={input}
          onInputChange={setActiveInput}
          attachments={[]}
          onAttachmentsChange={() => {}}
          attachmentsEnabled={false}
          streaming={streaming}
          hasMessages={messages.length > 0}
          chatMode={activeChatMode}
          onChatModeChange={handleChatModeChange}
          showModeSelector
          reasoningEffort={hostAgent?.reasoningEffort ?? "default"}
          onReasoningEffortChange={handleReasoningEffortChange}
          onSend={() => void handleSend()}
          onStop={handleStop}
        />
      </div>
      {confirmDialog}
    </div>
  );
}
