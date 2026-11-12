import AgentInteractionPanel from "../components/chat/AgentInteractionPanel";
import { getPendingInteractions } from "../components/chat/agentTools/interactionState";
import { hasReferenceTask, retainedReferences } from "../shared/composerReferences";
import { Button, error, warning } from "@cherrystudio/ui";
import { PanelLeftClose, PanelLeftOpen, Settings } from "lucide-react";

import "../pages/ChatPage.css";
import { useConfirm } from "../hooks/useConfirm";
import {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
  type MutableRefObject,
} from "react";
import ChatInputBar from "../components/chat/ChatInputBar";
import AgentChatSidebar from "../components/chat/AgentChatSidebar";
import AgentSettingsModal from "../components/agents/AgentSettingsModal";
import MessageList, {
  type MessageListHandle,
} from "../components/chat/MessageList";
import { ToolCancelContext } from "../components/chat/agentTools/ToolCancelContext";
import { useToolApproval } from "../hooks/useToolApproval";
import { useAgentChatSession } from "../hooks/useAgentChatSession";
import type { ChatAttachment } from "../shared/chatAttachments";
import MaxTurnsCard from "../components/chat/MaxTurnsCard";
import {
  type ChatMsg,
  buildAgentApiMessages,
  buildAgentHistoryMessages,
  classifyStreamError,
  filterForAgentHistory,
  findLastAssistantReplyIndex,
  trimMessagesForApi,
} from "../shared/chatMessages";
import {
  applySendFail,
  beginContinue,
  beginSend,
  acceptSendDraft,
  clearMessages as clearSessionMessages,
  emptyAgentSessionState,
  genSessionId,
  toggleClearMarker,
  type AgentSessionState,
} from "../shared/agentSession";
import {
  buildTrimOptions,
  estimateAgentSystemPromptTokens,
  estimateContextUsage,
  type ContextUsageResult,
  resolveActiveModelName,
  resolveContextWindow,
} from "../shared/contextUsage";
import {
  buildChatSession,
  normalizeChatSession,
  trimSessionForStorage,
  generateTopicTitle,
  type ChatTopic,
} from "../shared/chatSession";
import {
  getChatApiConfig,
  getAgentBackendGuidance,
  updateAgentInSettings,
  appendAgentToSettings,
  removeAgentFromSettings,
  AGENT_BACKEND_KEY,
  type AppSettings,
} from "../shared/settings";
import { findAgentById, type AgentConfig } from "../shared/agent";
import AgentAvatar from "../components/AgentAvatar";
import {
  getSettingsSnapshot,
  setSettings,
  useSettings,
  flushSettingsSave,
} from "../shared/settingsStore";
import { stashKnowledgeReveal } from "../shared/panelHandoff";
import { notifyLive2DScene } from "../shared/live2dReactions";
import type { ChatMode } from "../shared/chatMode";
import type { ReasoningEffort } from "../shared/reasoningEffort";
import type { AgentSkillDescriptor } from "../shared/agent";
import {
  type SlashCommand,
  getBuiltinCommands,
  buildSkillCommands,
  parseSlashCommand,
  COMPACT_PROMPT,
} from "../shared/slashCommands";
import {
  detachTopicStream,
  abortTopicStream,
  openAgentStream,
  agentStreamRejection,
} from "../services/aiTransport/IpcChatTransport";
import { mergeRefTopicStates } from "../shared/topicStateSync";

import { prepareSkillInvocation, type SkillResendOptions } from "../shared/skillInvocation";

type SendResendOptions = SkillResendOptions & {
  resendAttachments?: ChatAttachment[];
};

const api = window.electronAPI;
const SESSION_SAVE_DEBOUNCE_MS = 400;

type TopicPageState = AgentSessionState & {
  attachments: ChatAttachment[];
  requestBackend: string | null;
  invalidAttachmentPaths: Set<string>;
};

function emptyTopicState(): TopicPageState {
  return {
    ...emptyAgentSessionState(),
    attachments: [],
    requestBackend: null,
    invalidAttachmentPaths: new Set(),
  };
}

async function collectInvalidAttachmentPaths(
  messages: ChatMsg[],
): Promise<Set<string>> {
  const paths = new Set<string>();
  for (const msg of messages) {
    for (const attachment of msg.attachments ?? []) {
      paths.add(attachment.path);
    }
  }
  const invalid = new Set<string>();
  await Promise.all(
    [...paths].map(async (filePath) => {
      try {
        // file:stat_path 在文件不存在时抛错；成功返回即视为存在。
        await api.invoke("file:stat_path", filePath);
      } catch {
        invalid.add(filePath);
      }
    }),
  );
  return invalid;
}

// Persist settings and alert the user if the on-disk write failed — otherwise
// the renderer would silently assume success (data loss on restart).
function persistSettingsWithAlert(settings: AppSettings): void {
  setSettings(settings);
}

export default function ChatPage({
  embedded = false,
  isActive = true,
  clearRef,
  onMetaChange,
}: {
  embedded?: boolean;
  isActive?: boolean;
  clearRef?: MutableRefObject<(() => void) | null>;
  onMetaChange?: (meta: { streaming: boolean; hasMessages: boolean }) => void;
}) {
  const [topicStates, setTopicStates] = useState<
    Record<string, TopicPageState>
  >({});
  const { confirm, dialog: confirmDialog } = useConfirm();
  const [activeTopicId, setActiveTopicId] = useState<string | null>(null);
  const [topics, setTopics] = useState<ChatTopic[]>([]);
  const topicsRef = useRef<ChatTopic[]>([]);
  const [topicsLoaded, setTopicsLoaded] = useState(false);
  const [skills, setSkills] = useState<AgentSkillDescriptor[]>([]);
  const chatSettings = useSettings();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [editingAgentId, setEditingAgentId] = useState<string | null>(null);
  const [creatingAgent, setCreatingAgent] = useState(false);
  const [inputFocusSignal, setInputFocusSignal] = useState(0);
  const [editingMsgId, setEditingMsgId] = useState<string | null>(null);
  const [browserResume, setBrowserResume] = useState<{ topicId: string; tabId: string } | null>(null);

  const activeState = topicStates[activeTopicId ?? ""] ?? emptyTopicState();
  const { messages, input, attachments, streaming, invalidAttachmentPaths } =
    activeState;

  const messageListRef = useRef<MessageListHandle>(null);
  const scrollToBottom = useCallback(() => {
    messageListRef.current?.scrollToBottom();
  }, []);
  const chatMessagesRef = useRef<ChatMsg[]>([]);
  const requestIdRef = useRef<string>("");
  const activeTopicIdRef = useRef<string | null>(null);
  const topicStatesRef = useRef(topicStates);
  const requestIdToTopicIdRef = useRef<Map<string, string>>(new Map());
  const saveTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map(),
  );
  const handleSendRef = useRef<
    (text?: string, options?: SendResendOptions) => void
  >(() => {});
  const handleClearContextRef = useRef<() => void>(() => {});
  const compactRequestIdRef = useRef<string | null>(null);
  const agentSendLockRef = useRef(new Set<string>());
  /**
   * Frozen snapshots of contextMessages / contextUsage while streaming.
   * Token estimation is O(n) over all messages; recomputing every RAF frame
   * during streaming is wasteful — the bar only needs to update once per turn.
   */
  const frozenContextMessagesRef = useRef<ChatMsg[] | null>(null);
  const frozenContextUsageRef = useRef<ContextUsageResult | null>(null);

  useEffect(() => {
    // Keep ref in sync without clobbering live stream progress.
    // Stream patches are ref-first (ref leads, React state catches up), so a
    // streaming topic's ref entry is always the accumulation truth — never
    // roll it back to committed state, or chunks landed between render and
    // this effect would be permanently dropped.
    const merged = mergeRefTopicStates(topicStatesRef.current, topicStates);
    if (merged !== topicStatesRef.current) {
      topicStatesRef.current = merged;
    }
  }, [topicStates]);

  useEffect(() => {
    topicsRef.current = topics;
  }, [topics]);

  useEffect(() => {
    activeTopicIdRef.current = activeTopicId;
  }, [activeTopicId]);

  useEffect(() => {
    chatMessagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    requestIdRef.current = activeState.requestId ?? "";
  }, [activeState.requestId]);

  const [streamingTopicIds, setStreamingTopicIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [maxTurnsPendingTopics, setMaxTurnsPendingTopics] = useState<
    Set<string>
  >(() => new Set());

  const syncStreamingFlag = useCallback(
    (topicId: string, streaming: boolean) => {
      setStreamingTopicIds((prev) => {
        const has = prev.has(topicId);
        if (streaming === has) return prev;
        const next = new Set(prev);
        if (streaming) next.add(topicId);
        else next.delete(topicId);
        return next;
      });
    },
    [],
  );

  /** Patch topic state; background streams update the ref only (no React re-render). */
  const patchTopicState = useCallback(
    (
      topicId: string,
      updater: (state: TopicPageState) => TopicPageState,
      opts?: { forceReact?: boolean },
    ) => {
      const prev = topicStatesRef.current[topicId];
      if (!prev) return;
      const next = updater(prev);
      if (next === prev) return;
      topicStatesRef.current = { ...topicStatesRef.current, [topicId]: next };
      if (prev.streaming !== next.streaming) {
        syncStreamingFlag(topicId, next.streaming);
      }
      if (topicId === activeTopicIdRef.current || opts?.forceReact) {
        setTopicStates((s) => ({ ...s, [topicId]: next }));
      } else if (prev.streaming !== next.streaming) {
        // done/error 翻转 streaming 时后台 topic 也写一次 React（活页要反映终态）。
        setTopicStates((s) => ({ ...s, [topicId]: next }));
      }
    },
    [syncStreamingFlag],
  );

  /** Active chat agent (falls back to first non-terminal agent). */
  const activeAgent =
    findAgentById(chatSettings.agents, chatSettings.activeChatAgentId) ?? null;
  const fallbackAgent = chatSettings.agents.find(
    (a) => a.id !== chatSettings.terminalAgentId,
  );
  const currentAgent: AgentConfig | null = activeAgent ?? fallbackAgent ?? null;
  /** Topic owning agent: the active topic's agentId, else active agent. */
  const activeTopic = topics.find((t) => t.id === activeTopicId) ?? null;
  const topicAgent =
    (activeTopic
      ? findAgentById(chatSettings.agents, activeTopic.agentId)
      : undefined) ?? currentAgent;
  /** Session-level chat mode for the active topic. */
  const activeChatMode: ChatMode =
    activeTopic?.chatMode ?? currentAgent?.chatMode ?? "normal";

  const contextMessages = useMemo(() => {
    // During streaming every chunk produces a new messages array; re-filtering
    // the full list each frame is O(n) work for a bar that doesn't need 60 fps.
    // Freeze the snapshot at stream-start and recompute once streaming ends.
    if (streaming && frozenContextMessagesRef.current !== null) {
      return frozenContextMessagesRef.current;
    }
    const result = filterForAgentHistory(messages);
    frozenContextMessagesRef.current = result;
    return result;
  }, [messages, streaming]);

  const contextUsage = useMemo(() => {
    if (streaming && frozenContextUsageRef.current !== null) {
      return frozenContextUsageRef.current;
    }
    if (!topicAgent) { frozenContextUsageRef.current = null; return null; }
    const contextWindow = resolveContextWindow(
      resolveActiveModelName(topicAgent),
    );
    const systemTokens = estimateAgentSystemPromptTokens(topicAgent);
    const result = estimateContextUsage({
      messages: contextMessages,
      input,
      attachments,
      systemTokens,
      contextWindow,
      lastPromptTokens: activeState.lastPromptTokens,
      lastCompletionTokens: activeState.lastCompletionTokens,
      lastUsageMessageCount: activeState.lastUsageMessageCount,
    });
    frozenContextUsageRef.current = result;
    return result;
  }, [
    streaming,
    topicAgent,
    contextMessages,
    input,
    attachments,
    activeState.lastPromptTokens,
    activeState.lastCompletionTokens,
    activeState.lastUsageMessageCount,
  ]);

  const persistSession = useCallback(async (topicId?: string) => {
    const tid = topicId ?? activeTopicIdRef.current;
    if (!tid) return;
    const state = topicStatesRef.current[tid];
    if (!state?.sessionReady) return;
    const session = trimSessionForStorage(
      buildChatSession(
        state.messages,
        state.input,
        state.attachments,
        state.lastPromptTokens != null &&
          state.lastPromptTokens > 0 &&
          state.lastUsageMessageCount != null
          ? {
              promptTokens: state.lastPromptTokens,
              completionTokens: state.lastCompletionTokens,
              messageCount: state.lastUsageMessageCount,
            }
          : undefined,
        state.selectedSkillIds,
      ),
    );
    await api.invoke("chat:session:save", { topicId: tid, session });
  }, []);

  const scheduleTopicSave = useCallback(
    (topicId: string) => {
      const state = topicStatesRef.current[topicId];
      if (!state?.sessionReady) return;
      const timers = saveTimersRef.current;
      const existing = timers.get(topicId);
      if (existing) clearTimeout(existing);
      timers.set(
        topicId,
        setTimeout(() => {
          timers.delete(topicId);
          void persistSession(topicId);
        }, SESSION_SAVE_DEBOUNCE_MS),
      );
    },
    [persistSession],
  );

  const flushSessionSave = useCallback(
    (topicId?: string) => {
      const tid = topicId ?? activeTopicIdRef.current;
      if (!tid) return;
      const timers = saveTimersRef.current;
      const existing = timers.get(tid);
      if (existing) {
        clearTimeout(existing);
        timers.delete(tid);
      }
      void persistSession(tid);
    },
    [persistSession],
  );

  const flushAllSessionSaves = useCallback(() => {
    const timers = saveTimersRef.current;
    for (const [topicId, timer] of timers) {
      clearTimeout(timer);
      void persistSession(topicId);
    }
    timers.clear();
  }, [persistSession]);

  const loadSessionForTopic = useCallback(async (topicId: string) => {
    setTopicStates((prev) => ({
      ...prev,
      [topicId]: {
        ...(prev[topicId] ?? emptyTopicState()),
        sessionReady: false,
      },
    }));
    try {
      const raw = (await api.invoke("chat:session:load", topicId)) as unknown;
      const session = normalizeChatSession(raw);
      const invalid = await collectInvalidAttachmentPaths(session.messages);
      setTopicStates((prev) => ({
        ...prev,
        [topicId]: {
          messages: session.messages,
          input: session.draftInput ?? "",
          selectedSkillIds: session.draftSelectedSkillIds ?? [],
          attachments: session.draftAttachments ?? [],
          streaming: false,
          requestId: null,
          requestBackend: null,
          sessionReady: true,
          invalidAttachmentPaths: invalid,
          lastPromptTokens: session.lastServerUsage?.promptTokens,
          lastCompletionTokens: session.lastServerUsage?.completionTokens,
          lastUsageMessageCount: session.lastServerUsage?.messageCount,
        },
      }));
    } catch {
      setTopicStates((prev) => ({
        ...prev,
        [topicId]: { ...emptyTopicState(), sessionReady: true },
      }));
    }
  }, []);

  const loadTopics = useCallback(async () => {
    try {
      const store = (await api.invoke("chat:topics:list")) as {
        activeId: string | null;
        topics: ChatTopic[];
      };
      // 终端页「本机」分组创建的会话只在终端侧栏出现。
      const sorted = [...(store.topics || [])]
        .filter((t) => t.origin !== "terminal")
        .sort((a, b) => b.orderKey - a.orderKey);
      setTopics(sorted);
      const activeId = sorted.some((t) => t.id === store.activeId)
        ? store.activeId
        : (sorted[0]?.id ?? null);
      setActiveTopicId(activeId);
      if (activeId) {
        await loadSessionForTopic(activeId);
      }
      setTopicsLoaded(true);
    } catch {
      setTopicsLoaded(true);
    }
  }, [loadSessionForTopic]);

  useEffect(() => {
    void loadTopics();
  }, [loadTopics]);

  // 终端页与聊天页各挂一份 topic 列表（两页都 keep-alive），任一侧增删后互相通知。
  const refreshTopicList = useCallback(async () => {
    try {
      const store = (await api.invoke("chat:topics:list")) as {
        activeId: string | null;
        topics: ChatTopic[];
      };
      const sorted = [...(store.topics || [])]
        .filter((t) => t.origin !== "terminal")
        .sort((a, b) => b.orderKey - a.orderKey);
      setTopics(sorted);
      const current = activeTopicIdRef.current;
      // 当前话题还在 → 不动会话与输入（避免打断正在输入/流式的内容）。
      if (current && sorted.some((t) => t.id === current)) return;
      const nextId = sorted.some((t) => t.id === store.activeId)
        ? store.activeId
        : (sorted[0]?.id ?? null);
      setActiveTopicId(nextId);
      if (nextId && !topicStatesRef.current[nextId]) await loadSessionForTopic(nextId);
    } catch {
      // 读失败时保持现状：清空列表会把当前会话也一起切走。
    }
  }, [loadSessionForTopic]);

  useEffect(() => {
    const onChanged = () => {
      void refreshTopicList();
    };
    window.addEventListener("chat:topics-changed", onChanged);
    return () => window.removeEventListener("chat:topics-changed", onChanged);
  }, [refreshTopicList]);

  const handleSelectTopic = useCallback(
    (topicId: string) => {
      if (topicId === activeTopicIdRef.current) return;
      const oldTopicId = activeTopicIdRef.current;
      if (oldTopicId) {
        flushSessionSave(oldTopicId);
      }
      setActiveTopicId(topicId);
      setEditingMsgId(null);
      const latest = topicStatesRef.current[topicId];
      if (latest) {
        // Hydrate React state from ref (may be ahead after background streaming).
        setTopicStates((prev) => ({ ...prev, [topicId]: latest }));
      } else {
        void loadSessionForTopic(topicId);
      }
    },
    [flushSessionSave, loadSessionForTopic],
  );

  const handleCreateTopic = useCallback(async (agentId?: string) => {
    const currentActive = activeTopicIdRef.current;
    if (currentActive) {
      flushSessionSave(currentActive);
    }
    const settings = getSettingsSnapshot();
    const agent = agentId
      ? findAgentById(settings.agents, agentId)
      : findAgentById(settings.agents, settings.activeChatAgentId) ??
        settings.agents.find((a) => a.id !== settings.terminalAgentId);
    if (!agent) return;
    // 给非当前 agent 建会话：切换选中，让新会话立即可见高亮
    if (agent.id !== settings.activeChatAgentId) {
      setSettings((prev: AppSettings) => ({
        ...prev,
        activeChatAgentId: agent.id,
      }));
    }
    try {
      const result = (await api.invoke("chat:topics:create", {
        name: "",
        agentId: agent.id,
        chatMode: agent.chatMode,
        ...(agent.knowledgeBaseIds.length > 0
          ? { knowledgeBaseIds: agent.knowledgeBaseIds }
          : {}),
      })) as { ok?: boolean; topic?: ChatTopic; error?: string };
      if (!result?.ok || !result.topic) {
        console.warn("Failed to create topic:", result?.error);
        return;
      }
      const topic = result.topic;
      setTopics((prev) => [...prev, topic]);
      setTopicStates((prev) => ({
        ...prev,
        [topic.id]: { ...emptyTopicState(), sessionReady: true },
      }));
      setActiveTopicId(topic.id);
      window.dispatchEvent(new CustomEvent("chat:topics-changed"));
    } catch (e) {
      console.warn("Failed to create topic:", e);
    }
  }, [flushSessionSave]);

  const handleFork = useCallback(async (msgId: string) => {
    const topicId = activeTopicIdRef.current;
    const state = topicId ? topicStatesRef.current[topicId] : null;
    if (!topicId || !state?.sessionReady) {
      console.warn("Fork skipped: active topic not ready");
      return;
    }
    const idx = state.messages.findIndex((m) => m.id === msgId);
    if (idx === -1) {
      console.warn("Fork skipped: message not found");
      return;
    }
    const forkMessages = state.messages.slice(0, idx + 1);
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
      const topic = result.topic;
      setTopics((prev) => [...prev, topic]);
      // 不直接灌内存 forkMessages：主进程已把 toolResultRef 改写为新话题前缀，
      // 从磁盘读回才能拿到改写后的消息；否则首次 persistSession 会把源前缀
      // ref 写回磁盘，删源话题后 fork 丢失完整工具结果。
      await loadSessionForTopic(topic.id);
      setActiveTopicId(topic.id);
      setEditingMsgId(null);
      window.dispatchEvent(new CustomEvent("chat:topics-changed"));
    } catch (e) {
      console.warn("Failed to fork topic:", e);
    }
  }, [loadSessionForTopic]);

  const handleDeleteTopic = useCallback(
    async (topicId: string) => {
      const state = topicStatesRef.current[topicId];
      if (state?.requestId) {
        abortTopicStream(topicId, state.requestId);
        void api.invoke("agent:abort", { requestId: state.requestId });
      }

      const result = (await api.invoke("chat:topics:delete", topicId)) as {
        ok: boolean;
        activeId: string | null;
        autoCreated?: ChatTopic | null;
      };
      if (!result.ok) return;
      void api.invoke("browser:ui", { action: "discard", topicId });

      setTopicStates((prev) => {
        const next = { ...prev };
        delete next[topicId];
        return next;
      });

      const replacement = result.autoCreated;
      setTopics((prev) => {
        const filtered = prev.filter((t) => t.id !== topicId);
        return replacement ? [...filtered, replacement] : filtered;
      });

      const nextActiveId = result.activeId;
      if (nextActiveId) {
        if (nextActiveId !== activeTopicIdRef.current) {
          setActiveTopicId(nextActiveId);
          if (!topicStatesRef.current[nextActiveId]) {
            await loadSessionForTopic(nextActiveId);
          }
        }
      } else {
        setActiveTopicId(null);
      }
      window.dispatchEvent(new CustomEvent("chat:topics-changed"));
    },
    [loadSessionForTopic],
  );

  useEffect(() => {
    const onBeforeUnload = () => {
      flushAllSessionSaves();
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      flushAllSessionSaves();
    };
  }, [flushAllSessionSaves]);

  useEffect(() => {
    notifyLive2DScene("chatOpen");
  }, []);

  const setActiveInput = useCallback(
    (value: string) => {
      const topicId = activeTopicIdRef.current;
      if (!topicId) return;
      setTopicStates((prev) => ({
        ...prev,
        [topicId]: { ...(prev[topicId] ?? emptyTopicState()), input: value },
      }));
      scheduleTopicSave(topicId);
    },
    [scheduleTopicSave],
  );

  const setActiveAttachments = useCallback(
    (value: ChatAttachment[]) => {
      const topicId = activeTopicIdRef.current;
      if (!topicId) return;
      setTopicStates((prev) => ({
        ...prev,
        [topicId]: {
          ...(prev[topicId] ?? emptyTopicState()),
          attachments: value,
        },
      }));
      scheduleTopicSave(topicId);
    },
    [scheduleTopicSave],
  );

  useEffect(() => {
    return api.onChatPrefill((payload) => {
      const topicId = activeTopicIdRef.current;
      if (!topicId) return;
      const p =
        typeof payload === "string"
          ? { text: payload, autoSend: false }
          : payload;
      setTopicStates((prev) => {
        const state = prev[topicId] ?? emptyTopicState();
        const next = {
          ...state,
          input: typeof p.text === "string" ? p.text : state.input,
          attachments: p.attachments?.length
            ? p.attachments
            : state.attachments,
        };
        // Mirror into the ref: prefill can arrive mid-stream, and stream
        // patches rebuild React state from the ref — a state-only write
        // would be dropped on the next patch.
        topicStatesRef.current = {
          ...topicStatesRef.current,
          [topicId]: next,
        };
        return { ...prev, [topicId]: next };
      });
      if (p.autoSend && p.text?.trim()) {
        setTimeout(() => handleSendRef.current(p.text), 0);
      } else if (typeof p.text === "string" && p.text.trim()) {
        setInputFocusSignal((n) => n + 1);
      }
    });
  }, []);

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

  // 智能体会话：流事件路由 / chunk 合帧 / 工具行 upsert / citations 全部走共享 hook。
  // ChatPage 特有的 requestBackend 字段在 patchTopicState 的 updater 里补写。
  const { attachManually } = useAgentChatSession({
    resolveKey: (requestId) =>
      requestIdToTopicIdRef.current.get(requestId) ?? null,
    patchState: (topicId, updater) =>
      patchTopicState(topicId, (state): TopicPageState => ({
        ...state,
        ...updater(state),
        requestBackend: null,
      })),
    isCompactRequest: (requestId) => compactRequestIdRef.current === requestId,
    settleCompactRequest: () => {
      compactRequestIdRef.current = null;
    },
    forgetRequest: (requestId) => {
      requestIdToTopicIdRef.current.delete(requestId);
    },
    events: {
      onPersist: (topicId) => flushSessionSave(topicId),
      onToolEvent: (topicId) => scheduleTopicSave(topicId),
      onMaxTurnsReached: (topicId) =>
        setMaxTurnsPendingTopics((prev) => new Set([...prev, topicId])),
      onAborted: (topicId) => {
        if (topicId === activeTopicIdRef.current)
          notifyLive2DScene("replyError");
      },
      onCompactSettled: (topicId, aborted) => {
        if (!aborted && topicId === activeTopicIdRef.current)
          notifyLive2DScene("replyDone");
      },
      onDone: (topicId) => {
        if (topicId !== activeTopicIdRef.current) return;
        const list = topicStatesRef.current[topicId]?.messages ?? [];
        const assistantIdx = findLastAssistantReplyIndex(list);
        const assistantText =
          assistantIdx >= 0 && !list[assistantIdx].error
            ? list[assistantIdx].content
            : undefined;
        notifyLive2DScene("replyDone", assistantText);
      },
      onError: (topicId) => {
        if (topicId === activeTopicIdRef.current)
          notifyLive2DScene("replyError");
      },
      onToolRunning: (topicId) => {
        if (topicId === activeTopicIdRef.current)
          notifyLive2DScene("toolRunning");
      },
    },
  });

  useEffect(() => {
    if (!activeTopicId) return;

    void (async () => {
      const result = await attachManually(activeTopicId);
      if (result.requestId) {
        requestIdToTopicIdRef.current.set(result.requestId, activeTopicId);
      }
      if (
        result.attached &&
        result.status === "streaming" &&
        result.requestId
      ) {
        patchTopicState(
          activeTopicId,
          (state) => ({
            ...state,
            streaming: true,
            requestId: result.requestId!,
            requestBackend: AGENT_BACKEND_KEY,
          }),
          { forceReact: true },
        );
        syncStreamingFlag(activeTopicId, true);
      }
    })();

    return () => {
      detachTopicStream(activeTopicId);
    };
    // attachManually / patchTopicState / syncStreamingFlag 恒稳定。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTopicId]);

  // Switching topics returns to that conversation's bottom.
  useEffect(() => {
    scrollToBottom();
  }, [activeTopicId, scrollToBottom]);

  /** Session-level chat mode: persisted on the topic. */
  const handleChatModeChange = useCallback((mode: ChatMode) => {
    const topicId = activeTopicIdRef.current;
    if (!topicId) return;
    setTopics((prev) =>
      prev.map((t) => (t.id === topicId ? { ...t, chatMode: mode } : t)),
    );
    void api.invoke("chat:topics:updateMeta", {
      topicId,
      chatMode: mode,
    });
  }, []);

  const handleReasoningEffortChange = useCallback((value: ReasoningEffort) => {
    const current = getSettingsSnapshot();
    const agentId =
      topicsRef.current.find((t) => t.id === activeTopicIdRef.current)
        ?.agentId ?? current.activeChatAgentId;
    persistSettingsWithAlert(
      updateAgentInSettings(current, agentId, { reasoningEffort: value }),
    );
  }, []);

  const handleSelectAgent = useCallback((agentId: string) => {
    // 没有会话时不要切走：空白话题页没有可输入的会话。组头仍会展开，
    // 当前对话页保持跳转前的话题。
    const latest = [...topicsRef.current]
      .filter((t) => t.agentId === agentId)
      .sort((a, b) => b.orderKey - a.orderKey)[0];
    if (!latest) return;
    setSettings((prev: AppSettings) => ({
      ...prev,
      activeChatAgentId: agentId,
    }));
    handleSelectTopic(latest.id);
  }, [handleSelectTopic]);

  const handleDuplicateAgent = useCallback((agent: AgentConfig) => {
    const current = getSettingsSnapshot();
    const copy: AgentConfig = {
      ...agent,
      id:
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `agent-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
      builtinRole: undefined,
      name: `${agent.name}副本`,
    };
    persistSettingsWithAlert(appendAgentToSettings(current, copy));
    setEditingAgentId(copy.id);
  }, []);

  const handleDeleteAgent = useCallback(
    async (agent: AgentConfig) => {
      const doomed = topicsRef.current.filter((t) => t.agentId === agent.id);
      for (const t of doomed) {
        await handleDeleteTopic(t.id);
      }
      const current = getSettingsSnapshot();
      persistSettingsWithAlert(removeAgentFromSettings(current, agent.id));
    },
    [handleDeleteTopic],
  );

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

  const slashCommands = useMemo(
    () => [...getBuiltinCommands(), ...buildSkillCommands(skills, topicAgent?.enabledSkillIds)],
    [skills, topicAgent?.enabledSkillIds],
  );

  const loadAttachmentPayloads = useCallback(
    async (files: ChatAttachment[]) => {
      const textFiles: { name: string; text: string }[] = [];
      const images: { name: string; dataUrl: string }[] = [];

      for (const file of files) {
        const data = (await api.invoke("file:read", file)) as {
          kind: string;
          text?: string;
          dataUrl?: string;
          name: string;
        };
        if (data.kind === "image" && data.dataUrl) {
          images.push({ name: data.name, dataUrl: data.dataUrl });
        } else if (data.kind === "text" && data.text != null) {
          textFiles.push({ name: data.name, text: data.text });
        } else {
          throw new Error(`不支持的文件类型：${file.name}`);
        }
      }

      return { textFiles, images };
    },
    [],
  );

  const failAgentOpen = useCallback(
    (topicId: string, requestId: string, message: string) => {
      if (requestIdToTopicIdRef.current.get(requestId) !== topicId) return;
      requestIdToTopicIdRef.current.delete(requestId);
      const s = topicStatesRef.current[topicId];
      if (!s) return;
      const next: TopicPageState = {
        ...s,
        ...applySendFail(s, requestId, message, classifyStreamError(message) ?? undefined),
        requestBackend: s.requestId === requestId ? null : s.requestBackend,
      };
      topicStatesRef.current = { ...topicStatesRef.current, [topicId]: next };
      setTopicStates((prev) => ({ ...prev, [topicId]: next }));
      if (s.requestId === requestId) {
        syncStreamingFlag(topicId, false);
        notifyLive2DScene("replyError");
        flushSessionSave(topicId);
      }
    },
    [syncStreamingFlag, flushSessionSave],
  );

  const handleContinue = useCallback(
    async (topicId: string) => {
      setMaxTurnsPendingTopics((prev) => {
        const next = new Set(prev);
        next.delete(topicId);
        return next;
      });

      const state = topicStatesRef.current[topicId];
      if (!state || state.streaming) return;
      if (agentSendLockRef.current.has(topicId)) return;
      agentSendLockRef.current.add(topicId);

      try {
        await flushSettingsSave();
        const settings = getSettingsSnapshot();
        const topic = topicsRef.current.find((t) => t.id === topicId);
        const agent =
          (topic ? findAgentById(settings.agents, topic.agentId) : null) ??
          findAgentById(settings.agents, settings.activeChatAgentId);
        if (!agent) return;
        const apiConfig = getChatApiConfig(settings, agent);
        if (!apiConfig?.apiHost || !apiConfig.modelName) return;

        const trimOpts = buildTrimOptions({
          contextWindow: resolveContextWindow(resolveActiveModelName(agent)),
          systemTokens: estimateAgentSystemPromptTokens(agent),
        });

        const agentHistory = trimMessagesForApi(
          filterForAgentHistory(state.messages),
          trimOpts,
        );
        const payloadMessages = buildAgentHistoryMessages(agentHistory);

        const requestId = genSessionId();
        requestIdToTopicIdRef.current.set(requestId, topicId);

        const s = topicStatesRef.current[topicId] ?? emptyTopicState();
        const nextTopic: TopicPageState = {
          ...s,
          ...beginContinue(s, requestId),
          requestBackend: AGENT_BACKEND_KEY,
        };
        topicStatesRef.current = {
          ...topicStatesRef.current,
          [topicId]: nextTopic,
        };
        setTopicStates((prev) => ({ ...prev, [topicId]: nextTopic }));
        syncStreamingFlag(topicId, true);
        scrollToBottom();
        notifyLive2DScene("thinking");
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
            chatMode: topic?.chatMode ?? agent.chatMode,
          },
          knowledgeBaseIds:
            topicsRef.current.find((t) => t.id === topicId)?.knowledgeBaseIds ||
            [],
        })
          .then((result) => {
            if (!result || typeof result !== "object") return;
            if ((result as { mode?: string }).mode !== "blocked") return;
            failAgentOpen(
              topicId,
              requestId,
              "该话题已有进行中的会话，请等待完成或先停止。",
            );
          })
          .catch((e: Error) => {
            failAgentOpen(topicId, requestId, `请求失败：${e.message || e}`);
          });
      } finally {
        agentSendLockRef.current.delete(topicId);
      }
    },
    [failAgentOpen, scrollToBottom, syncStreamingFlag],
  );

  const handleSend = useCallback(
    async (overrideText?: string, options?: SendResendOptions) => {
      const topicId = activeTopicIdRef.current;
      if (!topicId) return;
      const state = topicStatesRef.current[topicId];
      if (!state || state.streaming) return;
      if (agentSendLockRef.current.has(topicId)) return;

      const isResend = overrideText !== undefined;
      const sendAttachments = isResend
        ? (options?.resendAttachments ?? [])
        : state.attachments;

      const text = (overrideText ?? state.input).trim();
      if (!text && sendAttachments.length === 0) return;

      const isCompactRequest = overrideText === COMPACT_PROMPT;

      const invocation = prepareSkillInvocation(text,
        isResend ? (options?.selectedSkillIds || []) : (state.selectedSkillIds || []),
        skills.map((s) => s.id));
      if (!isCompactRequest && invocation.selectedSkillIds.length && !hasReferenceTask(invocation.rawText, invocation.selectedSkillIds)) {
        warning("请输入要使用技能完成的任务。");
        return;
      }
      const finalText = invocation.text;
      const sendMessages = options?.resendMessageId
        ? state.messages.slice(0, state.messages.findIndex((m) => m.id === options.resendMessageId))
        : state.messages;
      if (!isCompactRequest && !overrideText) {
        const parsed = parseSlashCommand(text);
        if (parsed?.command === "clear") {
          handleClearContextRef.current();
          const tid = activeTopicIdRef.current;
          if (tid) {
            setTopicStates((prev) => ({
              ...prev,
              [tid]: { ...(prev[tid] ?? emptyTopicState()), input: "" },
            }));
          }
          return;
        }
      }

      agentSendLockRef.current.add(topicId);
      try {
        // Always resolve from the latest store snapshot.
        await flushSettingsSave();
        const settings = getSettingsSnapshot();
        const topic = topicsRef.current.find((t) => t.id === topicId);
        const agent =
          (topic ? findAgentById(settings.agents, topic.agentId) : null) ??
          findAgentById(settings.agents, settings.activeChatAgentId);
        if (!agent) return;
        const apiConfig = getChatApiConfig(settings, agent);

        {
          const guidance = getAgentBackendGuidance(settings, agent);
          if (!guidance && (!apiConfig?.apiHost || !apiConfig.modelName)) {
            // apiConfig missing falls through to same inline error path
          }
          const configError = guidance ?? (!apiConfig?.apiHost || !apiConfig.modelName
            ? "智能体尚未配置后端 Provider 或模型，请在智能体设置中完成配置。"
            : null);
          if (configError) {
            // Inject the error directly into the conversation so the user
            // can see it in context and click "修改模型设置".
            const errorMsgId = genSessionId();
            patchTopicState(topicId, (s) => ({
              ...s,
              messages: [
                ...s.messages,
                {
                  id: errorMsgId,
                  role: "assistant" as const,
                  content: configError,
                  error: true,
                  errorKind: "model_config" as const,
                  timestamp: Date.now(),
                },
              ],
            }));
            return;
          }
        }

        if (!apiConfig?.apiHost || !apiConfig.modelName) {
          // already handled above — this branch is dead but keeps type-safety
          return;
        }

        const sendAgent = agent;

        let attachmentPayloads = {
          textFiles: [] as { name: string; text: string }[],
          images: [] as { name: string; dataUrl: string }[],
        };
        try {
          if (sendAttachments.length > 0) {
            attachmentPayloads = await loadAttachmentPayloads(sendAttachments);
          }
        } catch (e) {
          error(e instanceof Error ? e.message : "读取附件失败");
          return;
        }

        const trimOpts = buildTrimOptions({
          contextWindow: resolveContextWindow(
            resolveActiveModelName(sendAgent),
          ),
          systemTokens: estimateAgentSystemPromptTokens(sendAgent),
          draftInput: finalText,
          draftAttachments: sendAttachments,
        });

        const agentHistory = trimMessagesForApi(
          filterForAgentHistory(sendMessages),
          trimOpts,
        );
        const payloadMessages = buildAgentApiMessages(
          agentHistory,
          finalText,
          attachmentPayloads,
          sendAgent.soul,
        );

        const requestId = genSessionId();
        requestIdToTopicIdRef.current.set(requestId, topicId);
        if (isCompactRequest) {
          compactRequestIdRef.current = requestId;
        }

        const shouldAutoTitle = state.messages.length === 0;

        const live = topicStatesRef.current[topicId] ?? emptyTopicState();
        const nextTopic: TopicPageState = {
          ...live,
          ...beginSend({ ...live, messages: sendMessages }, {
            requestId,
            userText: finalText,
            selectedSkillIds: invocation.selectedSkillIds,
            rawText: invocation.rawText,
            isCompact: isCompactRequest,
            keepInput: true,
            attachments:
              sendAttachments.length > 0 ? [...sendAttachments] : undefined,
          }),
          attachments: live.attachments,
          requestBackend: AGENT_BACKEND_KEY,
        };
        topicStatesRef.current = {
          ...topicStatesRef.current,
          [topicId]: nextTopic,
        };
        setTopicStates((prev) => ({ ...prev, [topicId]: nextTopic }));
        syncStreamingFlag(topicId, true);
        scrollToBottom();

        notifyLive2DScene("userSend");
        const restoreDraft = (message: string, skillErrors?: Record<string, string>) => {
          requestIdToTopicIdRef.current.delete(requestId);
          compactRequestIdRef.current = null;
          const restored = { ...live, skillErrors };
          topicStatesRef.current = { ...topicStatesRef.current, [topicId]: restored };
          setTopicStates((prev) => ({ ...prev, [topicId]: restored }));
          syncStreamingFlag(topicId, false);
          warning(message);
          scheduleTopicSave(topicId);
        };
        try {
          const result = await openAgentStream({
            selectedSkillIds: invocation.selectedSkillIds,
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
              chatMode: topic?.chatMode ?? sendAgent.chatMode,
            },
            knowledgeBaseIds:
              topicsRef.current.find((t) => t.id === topicId)?.knowledgeBaseIds ||
              [],
          });
          const rejection = agentStreamRejection(result);
          if (rejection) {
            restoreDraft(rejection, result.skillErrors);
            return;
          }
          const accepted = topicStatesRef.current[topicId] ?? nextTopic;
          const draft = acceptSendDraft(accepted, isResend || accepted.attachments !== state.attachments, state);
          const cleared = { ...draft, attachments: draft === accepted ? accepted.attachments : [] };
          topicStatesRef.current = { ...topicStatesRef.current, [topicId]: cleared };
          setTopicStates((prev) => ({ ...prev, [topicId]: cleared }));
          if (shouldAutoTitle) {
            const autoTitle = generateTopicTitle(text);
            void api
              .invoke("chat:topics:rename", {
                topicId,
                name: autoTitle,
              })
              .then(() => {
                setTopics((prev) =>
                  prev.map((t) =>
                    t.id === topicId
                      ? { ...t, name: autoTitle, updatedAt: Date.now() }
                      : t,
                  ),
                );
              });
          }

          scheduleTopicSave(topicId);
          setSidebarCollapsed(false);
        } catch (e) {
          restoreDraft(`请求失败：${e instanceof Error ? e.message : String(e)}`);
        }
      } finally {
        agentSendLockRef.current.delete(topicId);
      }
    },
    [
      skills,
      loadAttachmentPayloads,
      scheduleTopicSave,
      scrollToBottom,
      syncStreamingFlag,
    ],
  );

  useEffect(() => {
    handleSendRef.current = (text?: string, options?: SendResendOptions) => {
      void handleSend(text, options);
    };
  }, [handleSend]);

  useEffect(() => api.onBrowserResume?.((task) => {
    if (!topicsRef.current.some((topic) => topic.id === task.topicId)) return;
    void (async () => {
      if (!topicStatesRef.current[task.topicId]?.sessionReady) await loadSessionForTopic(task.topicId);
      setActiveTopicId(task.topicId);
      setBrowserResume(task);
    })();
  }), [loadSessionForTopic]);

  useEffect(() => {
    if (!browserResume || activeTopicId !== browserResume.topicId || !activeState.sessionReady || streaming) return;
    let cancelled = false;
    void Promise.resolve().then(() => {
      if (cancelled) return;
      setBrowserResume(null);
      void api.invoke("browser:ui", { action: "discard", topicId: browserResume.topicId });
      handleSendRef.current(`继续之前的浏览器任务。用户已手动接管过页面，请先用 browser_tabs 确认标签页，再重新读取标签页 ${browserResume.tabId} 的快照，根据当前页面继续；不要重放之前的提交动作。`);
    });
    return () => { cancelled = true; };
  }, [browserResume, activeTopicId, activeState.sessionReady, streaming]);

  const handleStop = useCallback(() => {
    const topicId = activeTopicIdRef.current;
    if (!topicId) return;
    const state = topicStatesRef.current[topicId];
    if (!state?.requestId) return;
    abortTopicStream(topicId, state.requestId);
    void api.invoke("agent:abort", { requestId: state.requestId });
  }, []);

  const handleCancelTool = useCallback((toolCallId: string) => {
    void api.invoke("agent:tool:cancel", { toolCallId });
  }, []);

  const handleClearContext = useCallback(() => {
    const topicId = activeTopicIdRef.current;
    if (!topicId) return;
    const state = topicStatesRef.current[topicId];
    if (!state || state.streaming || state.messages.length === 0) return;

    setTopicStates((prev) => {
      const s = prev[topicId] ?? emptyTopicState();
      return {
        ...prev,
        [topicId]: { ...s, ...toggleClearMarker(s) },
      };
    });
    scheduleTopicSave(topicId);
    scrollToBottom();
  }, [scheduleTopicSave, scrollToBottom]);

  useEffect(() => {
    handleClearContextRef.current = handleClearContext;
  }, [handleClearContext]);

  const handleSlashCommand = useCallback(
    (cmd: SlashCommand) => {
      if (cmd.group === "builtin" && cmd.id === "clear") {
        setActiveInput("");
        handleClearContext();
        return;
      }
      if (cmd.group === "builtin" && cmd.id === "compact") {
        setActiveInput("");
        void handleSend(COMPACT_PROMPT);
        return;
      }
    },
    [handleSend, setActiveInput, handleClearContext],
  );

  const handleClearMessages = useCallback(async () => {
    const topicId = activeTopicIdRef.current;
    if (!topicId) return;
    const state = topicStatesRef.current[topicId];
    if (!state || state.streaming || state.messages.length === 0) return;
    const ok = await confirm({
      title: "清空消息",
      okText: "清空",
      content: "确定清空所有消息吗？",
    });
    if (!ok) return;
    setTopicStates((prev) => ({
      ...prev,
      [topicId]: {
        ...(prev[topicId] ?? emptyTopicState()),
        ...clearSessionMessages(prev[topicId] ?? emptyTopicState()),
        attachments: [],
        invalidAttachmentPaths: new Set(),
      } as TopicPageState,
    }));
    flushSessionSave(topicId);
  }, [flushSessionSave, confirm]);

  const resendFromUserMessage = useCallback(
    (msgId: string, newText: string) => {
      const topicId = activeTopicIdRef.current;
      if (!topicId) return;
      const state = topicStatesRef.current[topicId];
      if (!state || state.streaming) return;
      const idx = state.messages.findIndex((m) => m.id === msgId);
      if (idx === -1) return;
      const target = state.messages[idx];
      if (target.role !== "user") return;
      const trimmed = newText.trim();
      const resendAttachments = target.attachments ?? [];
      if (!trimmed && resendAttachments.length === 0) return;
      setEditingMsgId(null);
      const references = retainedReferences(trimmed, target.selectedSkillIds);
      void handleSend(trimmed, { resendAttachments, selectedSkillIds: references.skillIds, resendMessageId: msgId });
    },
    [handleSend],
  );

  // 重试用户消息：删除该消息及其后所有消息，用原始文本重新发送
  const handleRetry = useCallback(
    (msgId: string) => {
      const topicId = activeTopicIdRef.current;
      if (!topicId) return;
      const state = topicStatesRef.current[topicId];
      if (!state || state.streaming) return;
      const idx = state.messages.findIndex((m) => m.id === msgId);
      if (idx === -1) return;
      const target = state.messages[idx];
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

  // 删除消息：删除该消息；若是用户消息，同时删除紧跟其后的助手回复
  const handleDeleteMessage = useCallback(
    (msgId: string) => {
      const topicId = activeTopicIdRef.current;
      if (!topicId) return;
      const state = topicStatesRef.current[topicId];
      if (!state || state.streaming) return;
      const idx = state.messages.findIndex((m) => m.id === msgId);
      if (idx === -1) return;
      const target = state.messages[idx];
      let end = idx + 1;
      if (target.role === "user") {
        while (
          end < state.messages.length &&
          state.messages[end].role !== "user"
        ) {
          end++;
        }
      } else if (target.role === "assistant") {
        while (
          end < state.messages.length &&
          state.messages[end].type === "tool"
        ) {
          end++;
        }
      }
      const nextMessages = state.messages
        .slice(0, idx)
        .concat(state.messages.slice(end));
      setTopicStates((prev) => ({
        ...prev,
        [topicId]: {
          ...(prev[topicId] ?? emptyTopicState()),
          messages: nextMessages,
        },
      }));
      scheduleTopicSave(topicId);
    },
    [scheduleTopicSave],
  );

  useEffect(() => {
    onMetaChange?.({
      streaming: activeState.streaming,
      hasMessages: activeState.messages.length > 0,
    });
  }, [activeState.streaming, activeState.messages.length, onMetaChange]);

  useEffect(() => {
    if (!clearRef) return;
    clearRef.current = handleClearMessages;
    return () => {
      clearRef.current = null;
    };
  }, [clearRef, handleClearMessages]);

  const loadingTopicIds = streamingTopicIds;

  const emptyContent = useMemo(
    () => (
      <div className="chat-empty">
        <AgentAvatar
          avatar={currentAgent?.avatar || ""}
          className="chat-empty-icon"
        />
        <p>和 {currentAgent?.name || "智能体"} 开始对话</p>
        <small>输入消息，或用 / 唤起命令、⌘V 粘贴图片、拖入文件</small>
      </div>
    ),
    [currentAgent],
  );

  const handleSendClick = useCallback(() => {
    void handleSend();
  }, [handleSend]);

  const handleCompactClick = useCallback(() => {
    void handleSend(COMPACT_PROMPT);
  }, [handleSend]);

  return (
    <div className={`chat-page${embedded ? " chat-page-embedded" : ""}`}>
      {topicsLoaded && (
        <AgentChatSidebar
          settings={chatSettings}
          topics={topics}
          activeTopicId={activeTopicId}
          onSelectTopic={handleSelectTopic}
          onCreateTopic={handleCreateTopic}
          onDeleteTopic={handleDeleteTopic}
          onEditAgent={setEditingAgentId}
          onCreateAgent={() => setCreatingAgent(true)}
          onDuplicateAgent={handleDuplicateAgent}
          onDeleteAgent={handleDeleteAgent}
          onSelectAgent={handleSelectAgent}
          loadingTopicIds={loadingTopicIds}
          collapsed={sidebarCollapsed}
        />
      )}
      <div className="chat-main-area">
        {topicsLoaded && (
          <header className="chat-agent-header">
            <Button variant="ghost" size="sm" className="chat-sidebar-toggle" title={sidebarCollapsed ? "展开侧边栏" : "收起侧边栏"} onClick={() => setSidebarCollapsed((v) => !v)}>{sidebarCollapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}</Button>
            {topicAgent && (
              <>
                <AgentAvatar
                  avatar={topicAgent.avatar}
                  className="chat-agent-header-avatar"
                />
                <div className="chat-agent-header-main">
                  <strong>{topicAgent.name}</strong>
                  {topicAgent.description && (
                    <small>{topicAgent.description}</small>
                  )}
                </div>
                <Button variant="ghost" size="sm" className="chat-agent-header-settings" title="智能体设置" onClick={() => setEditingAgentId(topicAgent.id)}><Settings size={14} /></Button>
              </>
            )}
          </header>
        )}
        <ToolCancelContext.Provider value={handleCancelTool}>
          <MessageList
            ref={messageListRef}
            messages={messages}
            streaming={streaming}
            invalidAttachmentPaths={invalidAttachmentPaths}
            onRetry={streaming ? undefined : handleRetry}
            onStartEdit={streaming ? undefined : handleStartEdit}
            onFork={streaming ? undefined : handleFork}
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
            onEditAgent={topicAgent ? () => setEditingAgentId(topicAgent.id) : undefined}
            emptyContent={emptyContent}
          />
        </ToolCancelContext.Provider>

        {activeTopicId &&
          maxTurnsPendingTopics.has(activeTopicId) &&
          !streaming && (
            <MaxTurnsCard
              maxTurns={topicAgent?.maxTurns ?? 30}
              onContinue={() => void handleContinue(activeTopicId)}
              onCancel={() =>
                setMaxTurnsPendingTopics((prev) => {
                  const next = new Set(prev);
                  next.delete(activeTopicId);
                  return next;
                })
              }
            />
          )}

        <ChatInputBar key={activeTopicId}
          awaitingInteraction={getPendingInteractions(messages).length > 0}
          interactionPanel={<AgentInteractionPanel sessionId={`chat:${activeTopicId}`} messages={messages} active={isActive}
            submittingApprovalId={submittingApprovalId} onApprove={handleApproveTool}
            onDeny={handleDenyTool} onAlwaysAllow={handleAlwaysAllowTool} onAnswer={submitToolAnswer} />}
          selectedSkillIds={activeState.selectedSkillIds} skillErrors={activeState.skillErrors}
          onSelectedSkillIdsChange={(ids) => {
            if (!activeTopicId) return;
            setTopicStates((prev) => ({ ...prev, [activeTopicId]: { ...(prev[activeTopicId] ?? emptyTopicState()), selectedSkillIds: ids, skillErrors: undefined } }));
            scheduleTopicSave(activeTopicId);
          }}
          input={input}
          onInputChange={setActiveInput}
          attachments={attachments}
          onAttachmentsChange={setActiveAttachments}
          streaming={streaming}
          editingMessage={!!editingMsgId}
          hasMessages={messages.length > 0}
          focusSignal={inputFocusSignal}
          chatMode={activeChatMode}
          onChatModeChange={handleChatModeChange}
          showModeSelector={true}
          reasoningEffort={topicAgent?.reasoningEffort ?? "default"}
          onReasoningEffortChange={handleReasoningEffortChange}
          onSend={handleSendClick}
          onStop={handleStop}
          onNewConversation={() => void handleCreateTopic(topicAgent?.id)}
          onClearContext={handleClearContext}
          onClearMessages={handleClearMessages}
          onCompact={handleCompactClick}
          slashCommands={slashCommands}
          onSlashCommand={handleSlashCommand}
          contextUsage={contextUsage}
          knowledgeBaseIds={
            topics.find((t) => t.id === activeTopicId)?.knowledgeBaseIds || []
          }
          onKnowledgeBaseIdsChange={(ids) => {
            if (!activeTopicId) return;
            setTopics((prev) =>
              prev.map((t) =>
                t.id === activeTopicId ? { ...t, knowledgeBaseIds: ids } : t,
              ),
            );
            void api.invoke("chat:topics:updateMeta", {
              topicId: activeTopicId,
              knowledgeBaseIds: ids,
            });
          }}
        />
      </div>
      <AgentSettingsModal
        open={!!editingAgentId || creatingAgent}
        agentId={editingAgentId}
        creating={creatingAgent ? {} : undefined}
        onClose={() => {
          setEditingAgentId(null);
          setCreatingAgent(false);
        }}
      />
      {confirmDialog}
    </div>
  );
}
