import { Icon } from "animal-island-ui";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import MessageList, {
  type MessageListHandle,
} from "../chat/MessageList";
import ChatInputBar from "../chat/ChatInputBar";
import { ToolCancelContext } from "../chat/agentTools/ToolCancelContext";
import { useToolApproval } from "../../hooks/useToolApproval";
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
import { findAgentById } from "../../shared/agent";
import {
  buildTrimOptions,
  estimateAgentSystemPromptTokens,
  estimateContextUsage,
  resolveActiveModelName,
  resolveContextWindow,
} from "../../shared/contextUsage";
import { getSettingsSnapshot, setSettings, useSettings } from "../../shared/settingsStore";
import type { SshHost } from "../../shared/terminalSettings";

import type { ChatMode } from "../../shared/chatMode";
import type { ReasoningEffort } from "../../shared/reasoningEffort";
import type { ToolTerminalState } from "../../shared/ai/stream";
import "./HostChatPanel.css";

const api = window.electronAPI;

type PageState = {
  messages: ChatMsg[];
  input: string;
  streaming: boolean;
  requestId: string | null;
  sessionReady: boolean;
  /** 服务端上报的上一轮 token 用量，用于上下文占用的精确值 */
  lastPromptTokens?: number;
  lastCompletionTokens?: number;
  lastUsageMessageCount?: number;
};

function emptyState(): PageState {
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
  topicId,
  topic,
  host,
  isActive,
  onStatusChange,
  onTopicRenamed,
}: {
  topicId: string;
  topic: ChatTopic;
  host: SshHost | null;
  isActive: boolean;
  onStatusChange: (topicId: string, status: { streaming: boolean; awaiting: boolean }) => void;
  onTopicRenamed: (topicId: string, name: string) => void;
}) {
  const settings = useSettings();
  const stateRef = useRef<PageState>(emptyState());
  const [state, setState] = useState<PageState>(stateRef.current);
  const [chatMode, setChatMode] = useState<ChatMode>(topic.chatMode);
  // 记住上次从 prop 采纳的值：本地切换后 prop 还是旧的，不能直接回灌。
  const propChatModeRef = useRef<ChatMode>(topic.chatMode);
  const requestIdRef = useRef<string>("");
  const messageListRef = useRef<MessageListHandle>(null);
  const chatMessagesRef = useRef<ChatMsg[]>([]);
  const legacyStreamHandlersRef = useRef<LegacyStreamHandlers | null>(null);
  const sendLockRef = useRef(false);

  const { messages, input, streaming, sessionReady } = state;
  chatMessagesRef.current = messages;

  // 主机对话用 host-assistant，本机对话用 personal-assistant —— 都以 topic 为准。
  const agent = findAgentById(settings.agents, topic.agentId) ?? null;

  const contextUsage = useMemo(() => {
    if (!agent) return null;
    return estimateContextUsage({
      messages: filterForAgentHistory(messages),
      input,
      systemTokens: estimateAgentSystemPromptTokens(agent),
      contextWindow: resolveContextWindow(resolveActiveModelName(agent)),
      lastPromptTokens: state.lastPromptTokens,
      lastCompletionTokens: state.lastCompletionTokens,
      lastUsageMessageCount: state.lastUsageMessageCount,
    });
  }, [
    agent,
    messages,
    input,
    state.lastPromptTokens,
    state.lastCompletionTokens,
    state.lastUsageMessageCount,
  ]);

  const scrollToBottom = useCallback(() => {
    messageListRef.current?.scrollToBottom();
  }, []);

  const patchState = useCallback((updater: (prev: PageState) => PageState) => {
    const prev = stateRef.current;
    const next = updater(prev);
    if (next === prev) return;
    stateRef.current = next;
    setState(next);
  }, []);

  const persistSession = useCallback(async () => {
    const s = stateRef.current;
    if (!s.sessionReady) return;
    const session = trimSessionForStorage(
      buildChatSession(s.messages, s.input, []),
    );
    await api.invoke("chat:session:save", { topicId, session });
  }, [topicId]);

  // Hydrate from disk, THEN attach to the live stream. The order matters:
  // replayLegacyStreamEvents 会把「标签关闭期间」积压的事件打回 state，
  // 若先回放后被磁盘快照覆盖，积压内容与 streaming 标记都会丢；反过来先
  // 覆盖再回放，则持久化的历史会丢。因此串行：先落后磁盘，再叠回放。
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const raw = (await api.invoke("chat:session:load", topicId)) as unknown;
        if (cancelled) return;
        const session = normalizeChatSession(raw);
        const hydrated: PageState = {
          ...emptyState(),
          messages: session.messages ?? [],
          input: session.draftInput ?? "",
          sessionReady: true,
        };
        // 用户在读盘完成前就动了输入框/发了消息：磁盘快照是旧的，整体覆盖会吞掉
        // 刚敲的草稿、用户消息和 streaming 标记。保留内存态，只补上 sessionReady。
        const current = stateRef.current;
        if (
          current.streaming ||
          current.sessionReady ||
          current.input ||
          current.messages.length > 0
        ) {
          patchState((s) => (s.sessionReady ? s : { ...s, sessionReady: true }));
        } else {
          stateRef.current = hydrated;
          setState(hydrated);
          messageListRef.current?.scrollToBottom();
        }
      } catch {
        // 读盘失败不能连带掐断流挂接；sessionReady 保持 false，
        // 避免后续把空会话回写、覆盖磁盘上的历史。
      }

      const result = await attachTopicStream(topicId);
      if (cancelled) return;
      // requestIdRef 是 chunk/done 的路由判据，必须在回放之前就位，
      // 否则关标签期间产生的事件会被全部丢弃。
      if (result.requestId) requestIdRef.current = result.requestId;
      replayLegacyStreamEvents(
        result.legacyEvents,
        legacyStreamHandlersRef.current,
      );
      if (result.attached && result.status === "streaming" && result.requestId) {
        patchState((s) => ({ ...s, streaming: true, requestId: result.requestId! }));
      }
    })();
    return () => {
      cancelled = true;
      detachTopicStream(topicId);
    };
  }, [topicId, patchState]);

  // Stream event routing (chunk/done/error/tool).
  useEffect(() => {
    const applyChunk = (
      parts: { partId?: string; text: string }[],
      reasoning: string,
    ) => {
      if (parts.length === 0 && !reasoning) return;
      patchState((s) => {
        let msgs = s.messages;
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
        return { ...s, messages: msgs };
      });
    };

    const chunkBuffer = createStreamChunkBuffer((_requestId, parts, reasoning) =>
      applyChunk(parts, reasoning),
    );

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
      if (requestId !== requestIdRef.current) return;
      chunkBuffer.push(requestId, partId, delta, reasoning);
    };

    const handleChatDone = ({
      requestId,
      aborted,
      tools,
      usage,
    }: {
      requestId: string;
      aborted?: boolean;
      tools?: ToolTerminalState[];
      usage?: { promptTokens?: number; completionTokens?: number };
    }) => {
      if (requestId !== requestIdRef.current) return;
      chunkBuffer.flushRequest(requestId);
      patchState((s) => {
        const messages = pruneEmptyAssistantMessages(
          reconcileToolMessages(s.messages, tools, Boolean(aborted)),
        );
        return {
          ...s,
          streaming: false,
          requestId: null,
          messages,
          ...(usage?.promptTokens != null && usage.promptTokens > 0
            ? {
                lastPromptTokens: usage.promptTokens,
                lastCompletionTokens: usage.completionTokens,
                lastUsageMessageCount: filterForAgentHistory(messages).length,
              }
            : {}),
        };
      });
      void persistSession();
    };

    const handleChatError = ({
      requestId,
      message,
    }: {
      requestId: string;
      message: string;
    }) => {
      if (requestId !== requestIdRef.current) return;
      chunkBuffer.flushRequest(requestId);
      patchState((s) => {
        const reconciled = reconcileToolMessages(s.messages, undefined, false);
        const idx = findLastAssistantReplyIndex(reconciled);
        if (idx < 0) {
          return { ...s, streaming: false, requestId: null, messages: reconciled };
        }
        const next = reconciled.slice();
        const target = next[idx];
        next[idx] = {
          ...target,
          content: target.content || `请求失败：${message}`,
          error: true,
        };
        return { ...s, streaming: false, requestId: null, messages: next };
      });
      void persistSession();
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
      if (requestId !== requestIdRef.current) return;
      chunkBuffer.flushRequest(requestId);
      patchState((s) => ({
        ...s,
        messages: upsertAgentToolMessage(s.messages, {
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
      void persistSession();
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
  }, [patchState, persistSession]);

  // topic.chatMode 被外部改动（设置页 / 其他窗口）时回灌到面板；
  // 本地切换过的值已经写回 ref，父级刷新回同值时不会触发。
  useEffect(() => {
    if (propChatModeRef.current === topic.chatMode) return;
    propChatModeRef.current = topic.chatMode;
    setChatMode(topic.chatMode);
  }, [topic.chatMode]);

  const handleChatModeChange = useCallback(
    (mode: ChatMode) => {
      propChatModeRef.current = mode;
      setChatMode(mode);
      void api.invoke("chat:topics:updateMeta", {
        topicId,
        chatMode: mode,
      });
    },
    [topicId],
  );

  const topicIdRef = useRef<string | null>(topicId);
  topicIdRef.current = topicId;

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
    topicIdRef,
  );

  const handleCancelTool = useCallback(() => {
    const s = stateRef.current;
    if (s.requestId) abortTopicStream(topicId, s.requestId);
  }, [topicId]);

  const handleStop = useCallback(() => {
    const s = stateRef.current;
    if (s.requestId) abortTopicStream(topicId, s.requestId);
  }, [topicId]);

  const handleReasoningEffortChange = useCallback((value: ReasoningEffort) => {
    // 智能体配置按 topic.agentId 共享：同一智能体的所有对话改一处即全部生效。
    const current = getSettingsSnapshot();
    setSettings(updateAgentInSettings(current, topic.agentId, { reasoningEffort: value }));
  }, [topic.agentId]);

  // 与 ChatPage 一致：末尾插入 clear 标记；再点一次撤销。
  const handleClearContext = useCallback(() => {
    const s = stateRef.current;
    if (s.streaming || s.messages.length === 0) return;
    const last = s.messages[s.messages.length - 1];
    const messages =
      last.type === "clear"
        ? s.messages.slice(0, -1)
        : [
            ...s.messages,
            {
              id: genId(),
              role: "user" as const,
              type: "clear" as const,
              content: "",
              timestamp: Date.now(),
            } as ChatMsg,
          ];
    patchState((prev) => ({
      ...prev,
      messages,
      lastPromptTokens: undefined,
      lastCompletionTokens: undefined,
      lastUsageMessageCount: undefined,
    }));
    void persistSession();
    scrollToBottom();
  }, [patchState, persistSession, scrollToBottom]);

  const failAgentOpen = useCallback(
    (requestId: string, message: string) => {
      if (requestId !== requestIdRef.current) return;
      const s = stateRef.current;
      const owns = s.requestId === requestId;
      const idx = findLastAssistantReplyIndex(s.messages);
      const nextMsgs = s.messages.slice();
      if (idx >= 0) {
        nextMsgs[idx] = { ...nextMsgs[idx], content: message, error: true };
      }
      patchState((prev) => ({
        ...prev,
        messages: nextMsgs,
        streaming: owns ? false : prev.streaming,
        requestId: owns ? null : prev.requestId,
      }));
      // 用户消息 + 错误气泡也要落盘，否则硬退出会丢这一轮。
      void persistSession();
    },
    [patchState, persistSession],
  );

  const handleSend = useCallback(async () => {
    const s = stateRef.current;
    if (s.streaming || sendLockRef.current) return;

    const text = s.input.trim();
    if (!text) return;

    sendLockRef.current = true;
    try {
      const currentSettings = getSettingsSnapshot();
      const agent = findAgentById(currentSettings.agents, topic.agentId);
      if (!agent) return;
      const apiConfig = getChatApiConfig(currentSettings, agent);
      if (!apiConfig?.apiHost || !apiConfig.modelName) return;

      const trimOpts = buildTrimOptions({
        contextWindow: resolveContextWindow(resolveActiveModelName(agent)),
        systemTokens: estimateAgentSystemPromptTokens(agent),
      });
      const history = trimMessagesForApi(
        filterForAgentHistory(s.messages),
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

      const now = Date.now();
      patchState((prev) => ({
        ...prev,
        input: "",
        messages: [
          ...prev.messages,
          { id: genId(), role: "user", content: text, timestamp: now },
          { id: genId(), role: "assistant", content: "", timestamp: now },
        ],
        streaming: true,
        requestId,
      }));
      scrollToBottom();

      // First user message → derive topic title.
      if (!topic.name) {
        onTopicRenamed(topicId, generateTopicTitle(text));
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
          chatMode: chatMode ?? agent.chatMode,
        },
      })
        .then((result) => {
          if (!result || typeof result !== "object") return;
          if ((result as { mode?: string }).mode !== "blocked") return;
          failAgentOpen(requestId, "该话题已有进行中的会话，请等待完成或先停止。");
        })
        .catch((e: Error) => {
          failAgentOpen(requestId, `请求失败：${e.message || e}`);
        });
    } finally {
      sendLockRef.current = false;
    }
  }, [chatMode, failAgentOpen, onTopicRenamed, patchState, scrollToBottom, topic.agentId, topic.name, topicId]);

  const setInput = useCallback(
    (value: string) => {
      patchState((s) => ({ ...s, input: value }));
    },
    [patchState],
  );

  // Persist the draft when this tab unmounts (tab closed).
  useEffect(() => {
    return () => {
      void persistSession();
    };
  }, [persistSession]);

  const awaiting = messages.some((m) => m.toolStatus === "awaiting_approval");

  useEffect(() => {
    onStatusChange(topicId, { streaming, awaiting });
  }, [topicId, streaming, awaiting, onStatusChange]);

  return (
    <div className={`host-chat-panel${isActive ? " active" : ""}`}>
      <div className="host-chat-main">
        <header className="host-chat-header">
          <span className="host-chat-header-title">
            <Icon name={host ? "Video" : "Home"} size={14} />
            {host ? `${host.name} · ${host.user}@${host.host}` : (agent?.name || "小雅")}
          </span>
          <span className="host-chat-header-topic">
            {topic.name || "新对话"}
          </span>
        </header>
        <ToolCancelContext.Provider value={handleCancelTool}>
          <MessageList
            ref={messageListRef}
            messages={messages}
            streaming={streaming}
            invalidAttachmentPaths={new Set()}
            emptyContent={
              sessionReady ? (
                <div className="host-chat-empty">
                  <Icon name={host ? "Video" : "Home"} size={44} />
                  <p>和 {agent?.name || "智能体"} 开始对话</p>
                  <small>
                    {host
                      ? "可以让它在这台主机上执行命令"
                      : "输入消息开始对话"}
                  </small>
                </div>
              ) : null
            }
            onApprove={handleApproveTool}
            onDeny={handleDenyTool}
            onAlwaysAllow={handleAlwaysAllowTool}
            onAnswer={submitToolAnswer}
            submittingApprovalId={submittingApprovalId}
          />
        </ToolCancelContext.Provider>
        <ChatInputBar
          input={input}
          onInputChange={setInput}
          attachments={[]}
          onAttachmentsChange={() => {}}
          attachmentsEnabled={false}
          streaming={streaming}
          hasMessages={messages.length > 0}
          chatMode={chatMode}
          onChatModeChange={handleChatModeChange}
          showModeSelector
          contextUsage={contextUsage}
          reasoningEffort={agent?.reasoningEffort ?? "default"}
          onReasoningEffortChange={handleReasoningEffortChange}
          onSend={() => void handleSend()}
          onStop={handleStop}
          onClearContext={handleClearContext}
        />
      </div>
    </div>
  );
}