import { Button, Icon, Notification } from "animal-island-ui";
import { SidebarCollapseIcon, SidebarExpandIcon } from "../components/icons/naivePatch";
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
import {
  createStreamChunkBuffer,
  type StreamTextPart,
} from "../hooks/createStreamChunkBuffer";
import type { ToolTerminalState } from "../shared/ai/stream";
import type { ChatAttachment } from "../shared/chatAttachments";
import MaxTurnsCard from "../components/chat/MaxTurnsCard";
import {
  type ChatMsg,
  buildAgentApiMessages,
  buildAgentHistoryMessages,
  applyStreamTextPart,
  filterForAgentHistory,
  findLastAssistantReplyIndex,
  findFirstAssistantReplyIndex,
  pruneEmptyAssistantMessages,
  reconcileToolMessages,
  upsertAgentToolMessage,
  trimMessagesForApi,
} from "../shared/chatMessages";
import {
  buildTrimOptions,
  estimateAgentSystemPromptTokens,
  estimateContextUsage,
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
import type { KnowledgeCitation } from "../shared/knowledge";
import { notifyLive2DScene } from "../shared/live2dReactions";
import type { ChatMode } from "../shared/chatMode";
import type { ReasoningEffort } from "../shared/reasoningEffort";
import type { AgentSkillDescriptor } from "../shared/agent";
import {
  type SlashCommand,
  getBuiltinCommands,
  buildSkillCommands,
  parseSlashCommand,
  applySkillSlashCommand,
  withEnabledSkillId,
  COMPACT_PROMPT,
} from "../shared/slashCommands";
import {
  attachTopicStream,
  detachTopicStream,
  abortTopicStream,
  openAgentStream,
  replayLegacyStreamEvents,
  type LegacyStreamHandlers,
} from "../services/aiTransport/IpcChatTransport";
import { mergeRefTopicStates } from "../shared/topicStateSync";

type SendResendOptions = {
  resendAttachments?: ChatAttachment[];
};

const api = window.electronAPI;
const SESSION_SAVE_DEBOUNCE_MS = 400;

type TopicPageState = {
  messages: ChatMsg[];
  input: string;
  attachments: ChatAttachment[];
  streaming: boolean;
  requestId: string | null;
  requestBackend: string | null;
  sessionReady: boolean;
  invalidAttachmentPaths: Set<string>;
  lastPromptTokens?: number;
  lastCompletionTokens?: number;
  lastUsageMessageCount?: number;
};

function emptyTopicState(): TopicPageState {
  return {
    messages: [],
    input: "",
    attachments: [],
    streaming: false,
    requestId: null,
    requestBackend: null,
    sessionReady: false,
    invalidAttachmentPaths: new Set(),
  };
}

function genId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `req-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
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
  clearRef,
  onMetaChange,
}: {
  embedded?: boolean;
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
  const legacyStreamHandlersRef = useRef<LegacyStreamHandlers>({});

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

  const contextMessages = useMemo(
    () => filterForAgentHistory(messages),
    [messages],
  );

  const contextUsage = useMemo(() => {
    if (!topicAgent) return null;
    const contextWindow = resolveContextWindow(
      resolveActiveModelName(topicAgent),
    );
    const systemTokens = estimateAgentSystemPromptTokens(topicAgent);
    return estimateContextUsage({
      messages: contextMessages,
      input,
      attachments,
      systemTokens,
      contextWindow,
      lastPromptTokens: activeState.lastPromptTokens,
      lastCompletionTokens: activeState.lastCompletionTokens,
      lastUsageMessageCount: activeState.lastUsageMessageCount,
    });
  }, [
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
      const sorted = [...(store.topics || [])].sort(
        (a, b) => b.orderKey - a.orderKey,
      );
      setTopics(sorted);
      const activeId = store.activeId || sorted[0]?.id || null;
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
      const topic = (await api.invoke("chat:topics:create", {
        name: "",
        agentId: agent.id,
        chatMode: agent.chatMode,
        ...(agent.knowledgeBaseIds.length > 0
          ? { knowledgeBaseIds: agent.knowledgeBaseIds }
          : {}),
      })) as ChatTopic;
      setTopics((prev) => [...prev, topic]);
      setTopicStates((prev) => ({
        ...prev,
        [topic.id]: { ...emptyTopicState(), sessionReady: true },
      }));
      setActiveTopicId(topic.id);
    } catch (e) {
      console.warn("Failed to create topic:", e);
    }
  }, [flushSessionSave]);

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
  }, [activeTopicId, syncStreamingFlag, patchTopicState]);

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

  useEffect(() => {
    const applyChunk = (
      requestId: string,
      parts: StreamTextPart[],
      reasoning: string,
    ) => {
      const topicId = requestIdToTopicIdRef.current.get(requestId);
      if (!topicId) return;
      if (parts.length === 0 && !reasoning) return;
      patchTopicState(topicId, (state) => {
        let messages = state.messages;
        for (const part of parts) {
          messages = applyStreamTextPart(messages, part.partId, part.text);
        }
        if (reasoning) {
          const ri = Math.max(0, findFirstAssistantReplyIndex(messages));
          const next = messages.slice();
          next[ri] = {
            ...next[ri],
            reasoning: (next[ri].reasoning ?? "") + reasoning,
          };
          messages = next;
        }
        return { ...state, messages };
      });
      // Do not persist on every chunk — flush on done/error/tool events.
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
      maxTurnsReached,
      tools,
      usage,
    }: {
      requestId: string;
      aborted?: boolean;
      maxTurnsReached?: boolean;
      tools?: ToolTerminalState[];
      usage?: { promptTokens?: number; completionTokens?: number };
    }) => {
      chunkBuffer.flushRequest(requestId);
      const topicId = requestIdToTopicIdRef.current.get(requestId);
      if (!topicId) return;

      setTimeout(() => {
        requestIdToTopicIdRef.current.delete(requestId);
      }, 0);

      patchTopicState(
        topicId,
        (state) => {
          const messages = pruneEmptyAssistantMessages(
            reconcileToolMessages(state.messages, tools, Boolean(aborted)),
          );
          return {
            ...state,
            streaming: false,
            requestId: null,
            requestBackend: null,
            messages,
            ...(usage?.promptTokens != null && usage.promptTokens > 0
              ? {
                  lastPromptTokens: usage.promptTokens,
                  lastCompletionTokens: usage.completionTokens,
                  lastUsageMessageCount: filterForAgentHistory(messages).length,
                }
              : {}),
          };
        },
        { forceReact: true },
      );

      const isActive = topicId === activeTopicIdRef.current;

      if (aborted) {
        compactRequestIdRef.current = null;
        if (isActive) notifyLive2DScene("replyError");
        flushSessionSave(topicId);
        return;
      }

      const isCompact = compactRequestIdRef.current === requestId;
      compactRequestIdRef.current = null;

      if (isCompact) {
        patchTopicState(
          topicId,
          (state) => {
            const assistantIdx = findLastAssistantReplyIndex(state.messages);
            const summary =
              assistantIdx >= 0 && !state.messages[assistantIdx].error
                ? state.messages[assistantIdx].content
                : "";
            if (!summary.trim()) return state;
            return {
              ...state,
              lastPromptTokens: undefined,
              lastCompletionTokens: undefined,
              lastUsageMessageCount: undefined,
              messages: [
                ...state.messages,
                {
                  id: genId(),
                  role: "user" as const,
                  type: "clear" as const,
                  content: "",
                  timestamp: Date.now(),
                },
                {
                  id: genId(),
                  role: "user" as const,
                  content: `[上下文摘要]\n\n${summary.trim()}`,
                  timestamp: Date.now(),
                },
              ],
            };
          },
          { forceReact: true },
        );
        if (isActive) notifyLive2DScene("replyDone");
        flushSessionSave(topicId);
        return;
      }

      if (maxTurnsReached) {
        setMaxTurnsPendingTopics((prev) => new Set([...prev, topicId]));
      }

      if (isActive) {
        const list = topicStatesRef.current[topicId]?.messages ?? [];
        const assistantIdx = findLastAssistantReplyIndex(list);
        const assistantText =
          assistantIdx >= 0 && !list[assistantIdx].error
            ? list[assistantIdx].content
            : undefined;
        notifyLive2DScene("replyDone", assistantText);
      }
      flushSessionSave(topicId);
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

      patchTopicState(
        topicId,
        (state) => {
          const reconciled = reconcileToolMessages(
            state.messages,
            undefined,
            false,
          );
          const idx = findLastAssistantReplyIndex(reconciled);
          if (idx < 0) {
            return {
              ...state,
              streaming: false,
              requestId: null,
              requestBackend: null,
              messages: reconciled,
            };
          }
          const next = reconciled.slice();
          const target = next[idx];
          next[idx] = {
            ...target,
            content: target.content || `请求失败：${message}`,
            error: true,
          };
          return {
            ...state,
            streaming: false,
            requestId: null,
            requestBackend: null,
            messages: next,
          };
        },
        { forceReact: true },
      );

      const isActive = topicId === activeTopicIdRef.current;
      if (isActive) notifyLive2DScene("replyError");
      flushSessionSave(topicId);
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
    }: {
      requestId: string;
      toolCallId?: string;
      toolName?: string;
      toolArgs?: string;
      approvalId?: string;
      status?: ChatMsg["toolStatus"];
      message?: string;
      resultPreview?: string;
    }) => {
      // Land buffered text on the pre-tool bubble before the tool row is inserted.
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
        }),
      }));
      scheduleTopicSave(topicId);
      const isActive = topicId === activeTopicIdRef.current;
      if (status === "running" && isActive) notifyLive2DScene("toolRunning");
    };

    const handleCitations = ({
      requestId,
      citations,
    }: {
      requestId: string;
      citations?: KnowledgeCitation[];
    }) => {
      const topicId = requestIdToTopicIdRef.current.get(requestId);
      if (!topicId || !citations?.length) return;
      patchTopicState(topicId, (state) => {
        const idx = findLastAssistantReplyIndex(state.messages);
        if (idx < 0) return state;
        const next = state.messages.slice();
        next[idx] = { ...next[idx], knowledgeCitations: citations };
        return { ...state, messages: next };
      });
    };

    const handleKnowledgeError = ({
      requestId,
      errors,
    }: {
      requestId: string;
      errors?: Array<{ kind: string; message: string }>;
    }) => {
      if (!errors?.length) return;
      const topicId = requestIdToTopicIdRef.current.get(requestId);
      if (!topicId) return;
      const summary = errors
        .map((e) => {
          const label =
            e.kind === "vector"
              ? "向量库检索"
              : e.kind === "semi_structured"
                ? "半结构化筛选"
                : "知识库预注入";
          return `${label}失败：${e.message}`;
        })
        .join("；");
      // Surface as a non-blocking system notice attached to the last assistant reply.
      patchTopicState(topicId, (state) => {
        const idx = findLastAssistantReplyIndex(state.messages);
        if (idx < 0) return state;
        const next = state.messages.slice();
        const prev = next[idx];
        const existing = String(prev.knowledgeWarning || "");
        next[idx] = {
          ...prev,
          knowledgeWarning: existing ? `${existing}；${summary}` : summary,
        };
        return { ...state, messages: next };
      });
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
    const offCitations = api.onChatStreamCitations?.(handleCitations);
    const offKbError = api.onChatStreamKnowledgeError?.(handleKnowledgeError);

    return () => {
      chunkBuffer.dispose();
      offChunk?.();
      offDone?.();
      offError?.();
      offTool?.();
      offCitations?.();
      offKbError?.();
    };
  }, [flushSessionSave, scheduleTopicSave, patchTopicState]);

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
    setSettings((prev: AppSettings) => ({
      ...prev,
      activeChatAgentId: agentId,
    }));
    // Jump to that agent's most recent topic; with none, drop the active
    // topic so the message area doesn't keep showing the previous agent's
    // conversation under the new agent's highlight.
    const latest = [...topicsRef.current]
      .filter((t) => t.agentId === agentId)
      .sort((a, b) => b.orderKey - a.orderKey)[0];
    if (latest) {
      handleSelectTopic(latest.id);
    } else {
      const oldTopicId = activeTopicIdRef.current;
      if (oldTopicId) flushSessionSave(oldTopicId);
      setActiveTopicId(null);
      setEditingMsgId(null);
    }
  }, [handleSelectTopic, flushSessionSave]);

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
    () => [...getBuiltinCommands(), ...buildSkillCommands(skills)],
    [skills],
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
      const owns = s.requestId === requestId;
      const idx = findLastAssistantReplyIndex(s.messages);
      const nextMsgs = s.messages.slice();
      if (idx >= 0) {
        nextMsgs[idx] = {
          ...nextMsgs[idx],
          content: message,
          error: true,
        };
      }
      const next = {
        ...s,
        messages: nextMsgs,
        streaming: owns ? false : s.streaming,
        requestId: owns ? null : s.requestId,
        requestBackend: owns ? null : s.requestBackend,
      };
      topicStatesRef.current = { ...topicStatesRef.current, [topicId]: next };
      setTopicStates((prev) => ({ ...prev, [topicId]: next }));
      if (owns) {
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

        const requestId = genId();
        requestIdToTopicIdRef.current.set(requestId, topicId);

        const now = Date.now();
        const s = topicStatesRef.current[topicId] ?? emptyTopicState();
        const nextTopic = {
          ...s,
          messages: [
            ...s.messages,
            {
              id: genId(),
              role: "assistant" as const,
              content: "",
              timestamp: now,
            },
          ],
          streaming: true,
          requestId,
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

      let finalText = text;
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
        let invokedSkillId: string | undefined;
        if (!isCompactRequest && !overrideText) {
          const applied = applySkillSlashCommand(
            text,
            skills.map((s) => s.id),
          );
          if (applied) {
            finalText = applied.text;
            invokedSkillId = applied.skillId;
          }
        }

        {
          const guidance = getAgentBackendGuidance(settings, agent);
          if (guidance) {
            const now = Date.now();
            const userMsg: ChatMsg = {
              id: genId(),
              role: "user",
              content: finalText,
              attachments:
                sendAttachments.length > 0 ? [...sendAttachments] : undefined,
              timestamp: now,
            };
            setTopicStates((prev) => {
              const s = prev[topicId] ?? emptyTopicState();
              return {
                ...prev,
                [topicId]: {
                  ...s,
                  messages: [
                    ...s.messages,
                    userMsg,
                    {
                      id: genId(),
                      role: "assistant",
                      content: guidance,
                      error: true,
                      timestamp: now,
                    },
                  ],
                  input: isResend ? s.input : "",
                  attachments: isResend ? s.attachments : [],
                  streaming: false,
                  requestId: null,
                  requestBackend: null,
                },
              };
            });
            scrollToBottom();
            scheduleTopicSave(topicId);
            return;
          }
        }

        if (!apiConfig?.apiHost || !apiConfig.modelName) {
          Notification.warning("请先在智能体设置中配置后端 Provider 与模型。");
          return;
        }

        const sendAgent = invokedSkillId
          ? {
              ...agent,
              enabledSkillIds: withEnabledSkillId(
                agent.enabledSkillIds,
                invokedSkillId,
              ),
            }
          : agent;

        let attachmentPayloads = {
          textFiles: [] as { name: string; text: string }[],
          images: [] as { name: string; dataUrl: string }[],
        };
        try {
          if (sendAttachments.length > 0) {
            attachmentPayloads = await loadAttachmentPayloads(sendAttachments);
          }
        } catch (e) {
          Notification.error(e instanceof Error ? e.message : "读取附件失败");
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
          filterForAgentHistory(state.messages),
          trimOpts,
        );
        const payloadMessages = buildAgentApiMessages(
          agentHistory,
          finalText,
          attachmentPayloads,
          sendAgent.soul,
        );

        const now = Date.now();
        const userMsg: ChatMsg = {
          id: genId(),
          role: "user",
          content: finalText,
          attachments:
            sendAttachments.length > 0 ? [...sendAttachments] : undefined,
          timestamp: now,
        };

        const requestId = genId();
        requestIdToTopicIdRef.current.set(requestId, topicId);
        if (isCompactRequest) {
          compactRequestIdRef.current = requestId;
        }

        const shouldAutoTitle = state.messages.length === 0;

        const live = topicStatesRef.current[topicId] ?? emptyTopicState();
        const nextTopic = {
          ...live,
          messages: [
            ...live.messages,
            userMsg,
            {
              id: genId(),
              role: "assistant" as const,
              content: "",
              timestamp: now,
            },
          ],
          input: isResend ? live.input : "",
          attachments: isResend ? live.attachments : [],
          streaming: true,
          requestId,
          requestBackend: AGENT_BACKEND_KEY,
        };
        topicStatesRef.current = {
          ...topicStatesRef.current,
          [topicId]: nextTopic,
        };
        setTopicStates((prev) => ({ ...prev, [topicId]: nextTopic }));
        syncStreamingFlag(topicId, true);
        scrollToBottom();

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

        notifyLive2DScene("userSend");
        const invokePromise = openAgentStream({
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
        invokePromise
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
    [
      skills,
      loadAttachmentPayloads,
      failAgentOpen,
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

    const last = state.messages[state.messages.length - 1];
    const nextMessages =
      last.type === "clear"
        ? state.messages.slice(0, -1)
        : [
            ...state.messages,
            {
              id: genId(),
              role: "user" as const,
              type: "clear" as const,
              content: "",
              timestamp: Date.now(),
            } as ChatMsg,
          ];

    setTopicStates((prev) => {
      const s = prev[topicId] ?? emptyTopicState();
      return {
        ...prev,
        [topicId]: {
          ...s,
          messages: nextMessages,
          lastPromptTokens: undefined,
          lastCompletionTokens: undefined,
          lastUsageMessageCount: undefined,
        },
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
      if (cmd.group === "skill" && cmd.insertText) {
        setActiveInput(cmd.insertText);
        return;
      }
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
        messages: [],
        input: "",
        attachments: [],
        invalidAttachmentPaths: new Set(),
        lastPromptTokens: undefined,
        lastCompletionTokens: undefined,
        lastUsageMessageCount: undefined,
      },
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
      const kept = state.messages.slice(0, idx);
      setEditingMsgId(null);
      setTopicStates((prev) => ({
        ...prev,
        [topicId]: { ...(prev[topicId] ?? emptyTopicState()), messages: kept },
      }));
      setTimeout(
        () => handleSendRef.current(trimmed, { resendAttachments }),
        0,
      );
    },
    [],
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
          onToggleCollapse={() => setSidebarCollapsed((v) => !v)}
        />
      )}
      <div className="chat-main-area">
        {topicsLoaded && (
          <header className="chat-agent-header">
            <Button
              type="text"
              size="small"
              className="chat-sidebar-toggle"
              icon={<Icon icon={sidebarCollapsed ? SidebarExpandIcon : SidebarCollapseIcon} size={16} />}
              title={sidebarCollapsed ? "展开侧边栏" : "收起侧边栏"}
              onClick={() => setSidebarCollapsed((v) => !v)}
            />
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
                <Button
                  type="text"
                  size="small"
                  className="chat-agent-header-settings"
                  icon={<Icon name="Settings" size={14} />}
                  title="智能体设置"
                  onClick={() => setEditingAgentId(topicAgent.id)}
                />
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
            onApprove={handleApproveTool}
            onDeny={handleDenyTool}
            onAlwaysAllow={handleAlwaysAllowTool}
            onAnswer={submitToolAnswer}
            submittingApprovalId={submittingApprovalId}
            onRetry={streaming ? undefined : handleRetry}
            onStartEdit={streaming ? undefined : handleStartEdit}
            onConfirmEdit={handleConfirmEdit}
            onCancelEdit={handleCancelEdit}
            editingMsgId={editingMsgId}
            onDelete={handleDeleteMessage}
            onOpenCitation={(citation) => {
              window.dispatchEvent(
                new CustomEvent("knowledge:reveal", {
                  detail: { baseId: citation.baseId, itemId: citation.itemId },
                }),
              );
            }}
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

        <ChatInputBar
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
