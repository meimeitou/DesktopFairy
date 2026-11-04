import { Icon } from "animal-island-ui";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import MessageList, {
  type MessageListHandle,
} from "../chat/MessageList";
import ChatInputBar from "../chat/ChatInputBar";
import MaxTurnsCard from "../chat/MaxTurnsCard";
import { ToolCancelContext } from "../chat/agentTools/ToolCancelContext";
import { useToolApproval } from "../../hooks/useToolApproval";
import { useConfirm } from "../../hooks/useConfirm";
import { useAgentChatSession } from "../../hooks/useAgentChatSession";
import {
  abortTopicStream,
  detachTopicStream,
  openAgentStream,
} from "../../services/aiTransport/IpcChatTransport";
import {
  type ChatMsg,
  filterForAgentHistory,
  trimMessagesForApi,
  buildAgentHistoryMessages,
} from "../../shared/chatMessages";
import {
  applySendFail,
  beginContinue,
  beginSend,
  clearMessages as clearSessionMessages,
  emptyAgentSessionState,
  genSessionId,
  toggleClearMarker,
  type AgentSessionState,
} from "../../shared/agentSession";
import {
  normalizeChatSession,
  buildChatSession,
  trimSessionForStorage,
  generateTopicTitle,
  type ChatTopic,
} from "../../shared/chatSession";
import {
  getAgentBackendGuidance,
  getChatApiConfig,
  updateAgentInSettings,
} from "../../shared/settings";
import { findAgentById, type AgentSkillDescriptor } from "../../shared/agent";
import {
  COMPACT_PROMPT,
  applySkillSlashCommand,
  buildSkillCommands,
  getBuiltinCommands,
  parseSlashCommand,
  type SlashCommand,
} from "../../shared/slashCommands";
import {
  buildTrimOptions,
  estimateAgentSystemPromptTokens,
  estimateContextUsage,
  resolveActiveModelName,
  resolveContextWindow,
} from "../../shared/contextUsage";
import { getSettingsSnapshot, setSettings, useSettings } from "../../shared/settingsStore";
import { stashKnowledgeReveal } from "../../shared/panelHandoff";
import type { SshHost } from "../../shared/terminalSettings";

import type { ChatMode } from "../../shared/chatMode";
import type { ReasoningEffort } from "../../shared/reasoningEffort";
import "../../pages/ChatPage.css";
import "./HostChatPanel.css";

const api = window.electronAPI;


export default function HostChatPanel({
  topicId,
  topic,
  host,
  isActive,
  onStatusChange,
  onTopicRenamed,
  onTopicForked,
}: {
  topicId: string;
  topic: ChatTopic;
  host: SshHost | null;
  isActive: boolean;
  onStatusChange: (topicId: string, status: { streaming: boolean; awaiting: boolean }) => void;
  onTopicRenamed: (topicId: string, name: string) => void;
  onTopicForked?: (topic: ChatTopic) => void;
}) {
  const settings = useSettings();
  const stateRef = useRef<AgentSessionState>(emptyAgentSessionState());
  const [state, setState] = useState<AgentSessionState>(stateRef.current);
  const [chatMode, setChatMode] = useState<ChatMode>(topic.chatMode);
  // 记住上次从 prop 采纳的值：本地切换后 prop 还是旧的，不能直接回灌。
  const propChatModeRef = useRef<ChatMode>(topic.chatMode);
  const requestIdRef = useRef<string>("");
  const messageListRef = useRef<MessageListHandle>(null);
  const chatMessagesRef = useRef<ChatMsg[]>([]);
  const sendLockRef = useRef(false);
  const handleSendRef = useRef<(text?: string) => void>(() => {});
  const [editingMsgId, setEditingMsgId] = useState<string | null>(null);
  const [maxTurnsPending, setMaxTurnsPending] = useState(false);
  const [skills, setSkills] = useState<AgentSkillDescriptor[]>([]);
  // topic prop 由 TerminalPage 持有，updateMeta 只落盘不回灌；
  // 本地 override 保证选择器与发送用同一份最新值。
  const [kbIdsOverride, setKbIdsOverride] = useState<string[] | null>(null);
  const compactRequestIdRef = useRef<string | null>(null);
  const { confirm, dialog: confirmDialog } = useConfirm();

  // 与 ChatPage 一致：技能列表供斜杠命令菜单使用。
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const list = (await api.invoke(
          "agent:skills:scan",
        )) as AgentSkillDescriptor[];
        if (!cancelled) setSkills(list);
      } catch {
        /* no skills */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const slashCommands = useMemo(
    () => [...getBuiltinCommands(), ...buildSkillCommands(skills)],
    [skills],
  );
  const effectiveKbIds = useMemo(
    () => kbIdsOverride ?? (topic.knowledgeBaseIds || []),
    [kbIdsOverride, topic.knowledgeBaseIds],
  );
  const { messages, input, streaming, sessionReady } = state;
  chatMessagesRef.current = messages;

  // 终端页的本机与主机对话统一使用终端助手，以迁移后的 topic 为准。
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

  const patchState = useCallback((updater: (prev: AgentSessionState) => AgentSessionState) => {
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

  const { attachManually } = useAgentChatSession({
    // 单会话面：一切 requestId 都归当前 topic。
    resolveKey: () => topicId,
    patchState: (_key, updater) => patchState(updater),
    isCompactRequest: (requestId) => compactRequestIdRef.current === requestId,
    settleCompactRequest: () => {
      compactRequestIdRef.current = null;
    },
    // 单 topic 面：路由不经 map，但 requestIdRef 仍要清（stale 引用会误导 useToolApproval）。
    forgetRequest: (requestId) => {
      if (requestIdRef.current === requestId) requestIdRef.current = "";
    },
    events: {
      onPersist: () => void persistSession(),
      onMaxTurnsReached: () => setMaxTurnsPending(true),
    },
  });

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
        const hydrated: AgentSessionState = {
          ...emptyAgentSessionState(),
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

      const result = await attachManually(topicId);
      if (cancelled) return;
      // requestIdRef 是 chunk/done 的路由判据，必须在回放之前就位，
      // 否则关标签期间产生的事件会被全部丢弃。
      if (result.requestId) requestIdRef.current = result.requestId;
      if (result.attached && result.status === "streaming" && result.requestId) {
        patchState((s) => ({ ...s, streaming: true, requestId: result.requestId! }));
      }
    })();
    return () => {
      cancelled = true;
      detachTopicStream(topicId);
    };
    // attachManually 与 patchState 恒稳定。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topicId]);


  // topic.chatMode 被外部改动（设置页 / 其他窗口）时回灌到面板；
  // 本地切换过的值已经写回 ref，父级刷新回同值时不会触发。
  useEffect(() => {
    if (propChatModeRef.current === topic.chatMode) return;
    propChatModeRef.current = topic.chatMode;
    setChatMode(topic.chatMode);
  }, [topic.chatMode]);

  // topic prop 被外部刷新（如 topics 重载）且回灌值与本地 override 一致时，
  // 丢弃 override，回到跟随 prop；不一致时保留本地最新选择。
  useEffect(() => {
    const propIds = topic.knowledgeBaseIds || [];
    if (
      kbIdsOverride &&
      kbIdsOverride.length === propIds.length &&
      kbIdsOverride.every((v, i) => v === propIds[i])
    ) {
      setKbIdsOverride(null);
    }
  }, [topic.knowledgeBaseIds, kbIdsOverride]);
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

  const handleCancelTool = useCallback((toolCallId: string) => {
    void api.invoke("agent:tool:cancel", { toolCallId });
  }, []);

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
    patchState(toggleClearMarker);
    void persistSession();
    scrollToBottom();
  }, [patchState, persistSession, scrollToBottom]);

  const failAgentOpen = useCallback(
    (requestId: string, message: string) => {
      if (requestId !== requestIdRef.current) return;
      patchState((prev) => applySendFail(prev, requestId, message));
      // 用户消息 + 错误气泡也要落盘，否则硬退出会丢这一轮。
      void persistSession();
    },
    [patchState, persistSession],
  );

  const handleSend = useCallback(async (overrideText?: string) => {
    const s = stateRef.current;
    if (s.streaming || sendLockRef.current) return;

    const isResend = overrideText !== undefined;
    const text = (overrideText ?? s.input).trim();
    if (!text) return;
    const isCompactRequest = overrideText === COMPACT_PROMPT;

    // 与 ChatPage 一致：/clear 在发送前本地处理。
    if (!isCompactRequest && !overrideText) {
      const parsed = parseSlashCommand(text);
      if (parsed?.command === "clear") {
        handleClearContext();
        patchState((prev) => ({ ...prev, input: "" }));
        return;
      }
    }

    sendLockRef.current = true;
    try {
      const currentSettings = getSettingsSnapshot();
      const agent = findAgentById(currentSettings.agents, topic.agentId);
      if (!agent) return;

      let finalText = text;
      let invokedSkillId: string | undefined;
      if (!isCompactRequest && !overrideText) {
        const applied = applySkillSlashCommand(
          text,
          skills.map((sk) => sk.id),
        );
        if (applied) {
          finalText = applied.text;
          invokedSkillId = applied.skillId;
        }
      }

      // 与 ChatPage 一致：后端未配置时给出可操作的引导而不是静默失败。
      const guidance = getAgentBackendGuidance(currentSettings, agent);
      if (guidance) {
        patchState((prev) =>
          beginSend(prev, {
            requestId: "",
            userText: finalText,
            keepInput: isResend,
          }),
        );
        // beginSend 的占位气泡替换为引导错误气泡。
        patchState((prev) => {
          const idx = prev.messages.length - 1;
          const next = prev.messages.slice();
          next[idx] = { ...next[idx], content: guidance, error: true };
          return { ...prev, streaming: false, requestId: null, messages: next };
        });
        scrollToBottom();
        void persistSession();
        return;
      }
      const apiConfig = getChatApiConfig(currentSettings, agent);
      if (!apiConfig?.apiHost || !apiConfig.modelName) return;

      const sendAgent = invokedSkillId
        ? {
            ...agent,
            enabledSkillIds: agent.enabledSkillIds.includes(invokedSkillId)
              ? agent.enabledSkillIds
              : [...agent.enabledSkillIds, invokedSkillId],
          }
        : agent;

      const trimOpts = buildTrimOptions({
        contextWindow: resolveContextWindow(resolveActiveModelName(sendAgent)),
        systemTokens: estimateAgentSystemPromptTokens(sendAgent),
      });
      const history = trimMessagesForApi(
        filterForAgentHistory(s.messages),
        trimOpts,
      );
      const payloadMessages = buildAgentHistoryMessages([
        ...history,
        {
          id: genSessionId(),
          role: "user" as const,
          content: finalText,
          timestamp: Date.now(),
        },
      ]);

      const requestId = genSessionId();
      requestIdRef.current = requestId;
      if (isCompactRequest) compactRequestIdRef.current = requestId;

      patchState((prev) =>
        beginSend(prev, {
          requestId,
          userText: finalText,
          isCompact: isCompactRequest,
          keepInput: isResend,
        }),
      );
      scrollToBottom();


      // First user message → derive topic title.
      if (!topic.name) {
        onTopicRenamed(topicId, generateTopicTitle(finalText));
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
          ...sendAgent,
          chatMode: chatMode ?? sendAgent.chatMode,
        },
        knowledgeBaseIds: effectiveKbIds,
      })
        .then((result) => {
          if (!result) return;
          if (result.mode !== "blocked") return;
          failAgentOpen(requestId, "该话题已有进行中的会话，请等待完成或先停止。");
        })
        .catch((e: Error) => {
          failAgentOpen(requestId, `请求失败：${e.message || e}`);
        });
    } finally {
      sendLockRef.current = false;
    }
  }, [chatMode, effectiveKbIds, failAgentOpen, handleClearContext, onTopicRenamed, patchState, persistSession, scrollToBottom, skills, topic.agentId, topic.name, topicId]);

  useEffect(() => {
    handleSendRef.current = (text?: string) => {
      void handleSend(text);
    };
  }, [handleSend]);

  // 与 ChatPage 一致：截断到被重发消息之前，再以新文本发送。
  const resendFromUserMessage = useCallback((msgId: string, newText: string) => {
    const s = stateRef.current;
    if (s.streaming) return;
    const idx = s.messages.findIndex((m) => m.id === msgId);
    if (idx === -1) return;
    const target = s.messages[idx];
    if (target.role !== "user") return;
    const trimmed = newText.trim();
    if (!trimmed) return;
    const kept = s.messages.slice(0, idx);
    setEditingMsgId(null);
    patchState((prev) => ({ ...prev, messages: kept }));
    setTimeout(() => handleSendRef.current(trimmed), 0);
  }, [patchState]);

  const handleRetry = useCallback(
    (msgId: string) => {
      const s = stateRef.current;
      if (s.streaming) return;
      const idx = s.messages.findIndex((m) => m.id === msgId);
      if (idx === -1) return;
      const target = s.messages[idx];
      if (target.role !== "user") return;
      resendFromUserMessage(msgId, target.content);
    },
    [resendFromUserMessage],
  );

  const handleStartEdit = useCallback((msgId: string) => {
    setEditingMsgId(msgId);
  }, []);

  const handleCancelEdit = useCallback(() => {
    setEditingMsgId(null);
  }, []);

  const handleConfirmEdit = useCallback(
    (msgId: string, newText: string) => {
      resendFromUserMessage(msgId, newText);
    },
    [resendFromUserMessage],
  );

  // 删除消息：与 ChatPage 同规则（用户消息连带其后助手回复）。
  const handleDeleteMessage = useCallback(
    (msgId: string) => {
      const s = stateRef.current;
      if (s.streaming) return;
      const idx = s.messages.findIndex((m) => m.id === msgId);
      if (idx === -1) return;
      const target = s.messages[idx];
      let end = idx + 1;
      if (target.role === "user") {
        while (
          end < s.messages.length &&
          s.messages[end].role !== "user"
        ) {
          end++;
        }
      } else if (target.role === "assistant") {
        while (
          end < s.messages.length &&
          s.messages[end].type === "tool"
        ) {
          end++;
        }
      }
      const messages = s.messages.slice(0, idx).concat(s.messages.slice(end));
      patchState((prev) => ({ ...prev, messages }));
      void persistSession();
    },
    [patchState, persistSession],
  );

  const handleFork = useCallback(async (msgId: string) => {
    const s = stateRef.current;
    if (!s.sessionReady) {
      console.warn("Fork skipped: session not ready");
      return;
    }
    const idx = s.messages.findIndex((m) => m.id === msgId);
    if (idx === -1) {
      console.warn("Fork skipped: message not found");
      return;
    }
    const forkMessages = s.messages.slice(0, idx + 1);
    try {
      const result = (await api.invoke("chat:topics:fork", {
        sourceTopicId: topicId,
        uptoMessageId: msgId,
        messages: forkMessages,
      })) as { ok?: boolean; topic?: ChatTopic; error?: string };
      if (!result?.ok || !result.topic) {
        console.warn("Failed to fork topic:", result?.error);
        return;
      }
      // 源会话保持原样；开 tab 责任交给 TerminalPage（refreshTopics 后 openConversationTab）。
      onTopicForked?.(result.topic);
    } catch (e) {
      console.warn("Failed to fork topic:", e);
    }
  }, [topicId, onTopicForked]);

  const handleClearMessages = useCallback(async () => {
    const s = stateRef.current;
    if (s.streaming || s.messages.length === 0) return;
    const ok = await confirm({
      title: "清空消息",
      okText: "清空",
      content: "确定清空所有消息吗？",
    });
    if (!ok) return;
    patchState(clearSessionMessages);
    void persistSession();
  }, [confirm, patchState, persistSession]);

  const handleCompact = useCallback(() => {
    const s = stateRef.current;
    if (s.streaming || s.messages.length === 0) return;
    void handleSend(COMPACT_PROMPT);
  }, [handleSend]);

  const handleSlashCommand = useCallback(
    (cmd: SlashCommand) => {
      if (cmd.group === "skill" && cmd.insertText) {
        patchState((s) => ({ ...s, input: cmd.insertText }));
        return;
      }
      if (cmd.group === "builtin" && cmd.id === "clear") {
        patchState((s) => ({ ...s, input: "" }));
        handleClearContext();
        return;
      }
      if (cmd.group === "builtin" && cmd.id === "compact") {
        patchState((s) => ({ ...s, input: "" }));
        void handleSend(COMPACT_PROMPT);
      }
    },
    [handleClearContext, handleSend, patchState],
  );

  // 续跑（maxTurns 到顶后）：与 ChatPage 一致，从现有 history 续流，
  // 只追加空 assistant 气泡，不插入用户消息。
  const handleContinue = useCallback(() => {
    setMaxTurnsPending(false);
    const s = stateRef.current;
    if (s.streaming || sendLockRef.current) return;
    sendLockRef.current = true;
    void (async () => {
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
        const payloadMessages = buildAgentHistoryMessages(history);

        const requestId = genSessionId();
        requestIdRef.current = requestId;

        patchState((prev) => beginContinue(prev, requestId));
        scrollToBottom();

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
          knowledgeBaseIds: effectiveKbIds,
        })
          .then((result) => {
            if (!result) return;
            if (result.mode !== "blocked") return;
            failAgentOpen(requestId, "该话题已有进行中的会话，请等待完成或先停止。");
          })
          .catch((e: Error) => {
            failAgentOpen(requestId, `请求失败：${e.message || e}`);
          });
      } finally {
        sendLockRef.current = false;
      }
    })();
  }, [chatMode, effectiveKbIds, failAgentOpen, patchState, scrollToBottom, topic.agentId, topicId]);

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
            onRetry={streaming ? undefined : handleRetry}
            onFork={streaming ? undefined : handleFork}
            onStartEdit={streaming ? undefined : handleStartEdit}
            onConfirmEdit={handleConfirmEdit}
            onCancelEdit={handleCancelEdit}
            editingMsgId={editingMsgId}
            onDelete={handleDeleteMessage}
            onOpenCitation={(citation) => {
              stashKnowledgeReveal({
                baseId: citation.baseId,
                itemId: citation.itemId,
              });
              window.dispatchEvent(new CustomEvent("knowledge:reveal"));
            }}
          />
        </ToolCancelContext.Provider>
        {maxTurnsPending && !streaming && (
          <MaxTurnsCard
            maxTurns={agent?.maxTurns ?? 30}
            onContinue={handleContinue}
            onCancel={() => setMaxTurnsPending(false)}
          />
        )}
        <ChatInputBar
          input={input}
          onInputChange={setInput}
          attachments={[]}
          onAttachmentsChange={() => {}}
          attachmentsEnabled={false}
          streaming={streaming}
          editingMessage={!!editingMsgId}
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
          onClearMessages={handleClearMessages}
          onCompact={handleCompact}
          slashCommands={slashCommands}
          onSlashCommand={handleSlashCommand}
          knowledgeBaseIds={effectiveKbIds}
          onKnowledgeBaseIdsChange={(ids) => {
            setKbIdsOverride(ids);
            void api.invoke("chat:topics:updateMeta", {
              topicId,
              knowledgeBaseIds: ids,
            });
          }}
        />
      </div>
      {confirmDialog}
    </div>
  );
}