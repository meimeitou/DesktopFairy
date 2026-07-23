import {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
  type MutableRefObject,
} from "react";
import ChatInputBar from "../components/chat/ChatInputBar";
import TopicSidebar from "../components/chat/TopicSidebar";
import MessageList, {
  type MessageListHandle,
} from "../components/chat/MessageList";
import { useToolApproval } from "../hooks/useToolApproval";
import { createStreamChunkBuffer } from "../hooks/createStreamChunkBuffer";
import type { ToolTerminalState } from "../shared/ai/stream";
import type { ChatAttachment } from "../shared/chatAttachments";
import {
  type ChatMsg,
  buildApiMessages,
  buildAgentApiMessages,
  filterAfterContextClear,
  filterForApi,
  findLastAssistantReplyIndex,
  reconcileToolMessages,
  shouldApplyToolStatus,
  trimMessagesForApi,
} from "../shared/chatMessages";
import {
  buildChatSession,
  normalizeChatSession,
  trimSessionForStorage,
  generateTopicTitle,
  type ChatTopic,
} from "../shared/chatSession";
import {
  getChatBackendItems,
  getActiveChatBackend,
  isAgentBackend,
  getChatApiConfig,
  getAgentBackendGuidance,
  type AppSettings,
} from "../shared/settings";
import {
  getSettingsSnapshot,
  setSettings,
  useSettings,
  flushSettingsSave,
} from "../shared/settingsStore";
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
  attachTopicStream,
  detachTopicStream,
  abortTopicStream,
  openAgentStream,
  replayLegacyStreamEvents,
  type LegacyStreamHandlers,
} from "../services/aiTransport/IpcChatTransport";

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
  const [topicStates, setTopicStates] = useState<Record<string, TopicPageState>>({});
  const [activeTopicId, setActiveTopicId] = useState<string | null>(null);
  const [topics, setTopics] = useState<ChatTopic[]>([]);
  const [topicsLoaded, setTopicsLoaded] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [skills, setSkills] = useState<AgentSkillDescriptor[]>([]);
  const chatSettings = useSettings();
  // 递增信号：划词预填文本后通知 ChatInputBar 把焦点收回输入框
  const [inputFocusSignal, setInputFocusSignal] = useState(0);

  const activeState = topicStates[activeTopicId ?? ""] ?? emptyTopicState();
  const { messages, input, attachments, streaming, invalidAttachmentPaths } = activeState;

  const messageListRef = useRef<MessageListHandle>(null);
  const scrollToBottom = useCallback(() => {
    messageListRef.current?.scrollToBottom();
  }, []);
  const chatMessagesRef = useRef<ChatMsg[]>([]);
  const requestIdRef = useRef<string>("");
  const activeTopicIdRef = useRef<string | null>(null);
  const topicStatesRef = useRef(topicStates);
  const requestIdToTopicIdRef = useRef<Map<string, string>>(new Map());
  const saveTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const handleSendRef = useRef<(text?: string) => void>(() => {});
  const handleClearContextRef = useRef<() => void>(() => {});
  const compactRequestIdRef = useRef<string | null>(null);
  const legacyStreamHandlersRef = useRef<LegacyStreamHandlers>({});

  useEffect(() => {
    // Keep ref in sync without clobbering live background-stream progress.
    const active = activeTopicId;
    const next = { ...topicStatesRef.current };
    for (const [id, state] of Object.entries(topicStates)) {
      const existing = next[id];
      if (id === active) {
        next[id] = state;
      } else if (!existing || !existing.streaming) {
        next[id] = state;
      }
      // else: background topic is streaming — ref already has fresher messages
    }
    for (const id of Object.keys(next)) {
      if (!(id in topicStates)) delete next[id];
    }
    topicStatesRef.current = next;
  }, [topicStates, activeTopicId]);

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

  const syncStreamingFlag = useCallback((topicId: string, streaming: boolean) => {
    setStreamingTopicIds((prev) => {
      const has = prev.has(topicId);
      if (streaming === has) return prev;
      const next = new Set(prev);
      if (streaming) next.add(topicId);
      else next.delete(topicId);
      return next;
    });
  }, []);

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

  const selectableModels = useMemo(
    () => getChatBackendItems(chatSettings).map((i) => i.value),
    [chatSettings],
  );
  const modelLabels = useMemo(
    () =>
      Object.fromEntries(
        getChatBackendItems(chatSettings).map((i) => [i.value, i.label]),
      ),
    [chatSettings],
  );
  const activeBackend = getActiveChatBackend(chatSettings);
  const usingAgent = isAgentBackend(activeBackend);

  const persistSession = useCallback(async (topicId?: string) => {
    const tid = topicId ?? activeTopicIdRef.current;
    if (!tid) return;
    const state = topicStatesRef.current[tid];
    if (!state?.sessionReady) return;
    const session = trimSessionForStorage(
      buildChatSession(state.messages, state.input, state.attachments),
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
      [topicId]: { ...(prev[topicId] ?? emptyTopicState()), sessionReady: false },
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

  const handleCreateTopic = useCallback(async () => {
    const currentActive = activeTopicIdRef.current;
    if (currentActive) {
      flushSessionSave(currentActive);
    }
    try {
      const topic = (await api.invoke("chat:topics:create", {
        name: "",
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
      if (state?.requestId && state.requestBackend) {
        if (isAgentBackend(state.requestBackend)) {
          abortTopicStream(topicId, state.requestId);
          void api.invoke("agent:abort", { requestId: state.requestId });
        } else {
          void api.invoke("chat:abort", { requestId: state.requestId });
        }
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

  const handleRenameTopic = useCallback(
    async (topicId: string, name: string) => {
      await api.invoke("chat:topics:rename", { topicId, name });
      setTopics((prev) =>
        prev.map((t) =>
          t.id === topicId ? { ...t, name, updatedAt: Date.now() } : t,
        ),
      );
    },
    [],
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
      replayLegacyStreamEvents(result.legacyEvents, legacyStreamHandlersRef.current);
      if (result.attached && result.status === "streaming" && result.requestId) {
        const requestBackend = getActiveChatBackend(getSettingsSnapshot());
        setTopicStates((prev) => {
          const state = prev[activeTopicId];
          if (!state) return prev;
          return {
            ...prev,
            [activeTopicId]: {
              ...state,
              streaming: true,
              requestId: result.requestId!,
              requestBackend,
            },
          };
        });
        syncStreamingFlag(activeTopicId, true);
      }
    })();

    return () => {
      detachTopicStream(activeTopicId);
    };
  }, [activeTopicId, syncStreamingFlag]);

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
        [topicId]: { ...(prev[topicId] ?? emptyTopicState()), attachments: value },
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
        return {
          ...prev,
          [topicId]: {
            ...state,
            input: typeof p.text === "string" ? p.text : state.input,
            attachments: p.attachments?.length ? p.attachments : state.attachments,
          },
        };
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
      delta: string,
      reasoning: string,
    ) => {
      const topicId = requestIdToTopicIdRef.current.get(requestId);
      if (!topicId) return;
      patchTopicState(topicId, (state) => {
        const idx = findLastAssistantReplyIndex(state.messages);
        if (idx < 0) return state;
        const next = state.messages.slice();
        const target = next[idx];
        next[idx] = {
          ...target,
          ...(delta ? { content: target.content + delta } : {}),
          ...(reasoning
            ? { reasoning: (target.reasoning ?? "") + reasoning }
            : {}),
        };
        return { ...state, messages: next };
      });
      // Do not persist on every chunk — flush on done/error/tool events.
    };

    const chunkBuffer = createStreamChunkBuffer(applyChunk);

    const handleChatChunk = ({
      requestId,
      delta,
      reasoning,
    }: {
      requestId: string;
      delta?: string;
      reasoning?: string;
    }) => {
      const topicId = requestIdToTopicIdRef.current.get(requestId);
      if (!topicId) return;
      chunkBuffer.push(requestId, delta, reasoning);
    };

    const handleChatDone = ({ requestId, aborted, tools }: {
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

      patchTopicState(
        topicId,
        (state) => ({
          ...state,
          streaming: false,
          requestId: null,
          requestBackend: null,
          messages: reconcileToolMessages(
            state.messages,
            tools,
            Boolean(aborted),
          ),
        }),
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

    const handleChatError = ({ requestId, message }: { requestId: string; message: string }) => {
      chunkBuffer.flushRequest(requestId);
      const topicId = requestIdToTopicIdRef.current.get(requestId);
      if (!topicId) return;
      requestIdToTopicIdRef.current.delete(requestId);

      patchTopicState(
        topicId,
        (state) => {
          const idx = findLastAssistantReplyIndex(state.messages);
          if (idx < 0) {
            return {
              ...state,
              streaming: false,
              requestId: null,
              requestBackend: null,
            };
          }
          const next = state.messages.slice();
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
      const topicId = requestIdToTopicIdRef.current.get(requestId);
      if (!topicId) return;
      patchTopicState(topicId, (state) => {
        const msgs = state.messages;
        const existingIdx = toolCallId
          ? msgs.findIndex(
              (m) => m.type === "tool" && m.toolCallId === toolCallId,
            )
          : msgs.findIndex(
              (m) =>
                m.type === "tool" &&
                m.toolName === toolName &&
                (m.toolStatus === "running" ||
                  m.toolStatus === "streaming" ||
                  m.toolStatus === "awaiting_input"),
            );
        const prevTool = existingIdx >= 0 ? msgs[existingIdx] : null;
        const nextStatus = shouldApplyToolStatus(prevTool?.toolStatus, status)
          ? status
          : prevTool?.toolStatus;
        const toolMsg: ChatMsg = {
          id: prevTool?.id || genId(),
          role: "assistant",
          type: "tool",
          content: "",
          toolCallId: toolCallId || prevTool?.toolCallId,
          toolName,
          toolArgs: toolArgs ?? prevTool?.toolArgs,
          toolApprovalId: approvalId ?? prevTool?.toolApprovalId,
          toolStatus: nextStatus,
          toolMessage: message ?? prevTool?.toolMessage,
          toolResultPreview: resultPreview ?? prevTool?.toolResultPreview,
          timestamp: prevTool?.timestamp || Date.now(),
        };
        let nextMessages: ChatMsg[];
        if (existingIdx >= 0) {
          nextMessages = msgs.slice();
          nextMessages[existingIdx] = toolMsg;
        } else {
          const assistantIdx = findLastAssistantReplyIndex(msgs);
          if (assistantIdx < 0) {
            nextMessages = [...msgs, toolMsg];
          } else {
            const assistant = msgs[assistantIdx];
            nextMessages = msgs.slice();
            if (assistant.content && !assistant.error) {
              nextMessages.splice(assistantIdx + 1, 0, toolMsg);
              nextMessages.push({
                id: genId(),
                role: "assistant",
                content: "",
                timestamp: Date.now(),
              });
            } else {
              nextMessages.splice(assistantIdx, 0, toolMsg);
            }
          }
        }
        return { ...state, messages: nextMessages };
      });
      scheduleTopicSave(topicId);
      const isActive = topicId === activeTopicIdRef.current;
      if (status === "running" && isActive) notifyLive2DScene("toolRunning");
    };

    legacyStreamHandlersRef.current = {
      onChatChunk: handleChatChunk,
      onChatDone: handleChatDone,
      onChatError: handleChatError,
      onAgentTool: (data) => handleAgentTool(data as Parameters<typeof handleAgentTool>[0]),
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
  }, [flushSessionSave, scheduleTopicSave, patchTopicState]);

  // Switching topics returns to that conversation's bottom.
  useEffect(() => {
    scrollToBottom();
  }, [activeTopicId, scrollToBottom]);

  const handleBackendChange = useCallback((backend: string) => {
    persistSettingsWithAlert({ ...getSettingsSnapshot(), chatBackend: backend });
  }, []);

  const handleChatModeChange = useCallback((mode: ChatMode) => {
    const current = getSettingsSnapshot();
    persistSettingsWithAlert({
      ...current,
      chatMode: mode,
      agent: { ...current.agent, chatMode: mode },
    });
  }, []);

  const handleReasoningEffortChange = useCallback((value: ReasoningEffort) => {
    const current = getSettingsSnapshot();
    persistSettingsWithAlert({
      ...current,
      agent: { ...current.agent, reasoningEffort: value },
    });
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

  const handleSend = useCallback(
    async (overrideText?: string) => {
      const topicId = activeTopicIdRef.current;
      if (!topicId) return;
      const state = topicStatesRef.current[topicId];
      if (!state || state.streaming) return;

      const text = (overrideText ?? state.input).trim();
      if (!text && state.attachments.length === 0) return;

      const isCompactRequest = overrideText === COMPACT_PROMPT;

      let finalText = text;
      if (!isCompactRequest && !overrideText) {
        const parsed = parseSlashCommand(text);
        if (parsed && skills.some((s) => s.id === parsed.command)) {
          const skillId = parsed.command;
          const userMsg = parsed.rest;
          finalText = userMsg
            ? `请使用 Skill 工具加载并执行技能「${skillId}」，然后根据以下要求完成任务：\n\n${userMsg}`
            : `请使用 Skill 工具加载并执行技能「${skillId}」，然后根据用户的后续要求完成任务。`;
        } else if (parsed?.command === "clear") {
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

      // Always resolve from the latest store snapshot.
      await flushSettingsSave();
      const settings = getSettingsSnapshot();
      const requestBackend = getActiveChatBackend(settings);
      const agentMode = isAgentBackend(requestBackend);
      const apiConfig = getChatApiConfig(settings);

      if (agentMode) {
        const guidance = getAgentBackendGuidance(settings);
        if (guidance) {
          const now = Date.now();
          const userMsg: ChatMsg = {
            id: genId(),
            role: "user",
            content: finalText,
            attachments:
              state.attachments.length > 0 ? [...state.attachments] : undefined,
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
                input: "",
                attachments: [],
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
      } else if (!apiConfig?.apiHost || !apiConfig.modelName) {
        alert("请先在设置中配置服务商 API Host 和模型。");
        return;
      }

      if (!apiConfig?.apiHost || !apiConfig.modelName) {
        alert(
          agentMode
            ? "请先在智能体设置中配置后端 Provider 与模型。"
            : "请先在设置中配置服务商 API Host 和模型。",
        );
        return;
      }

      const agent = settings.agent;

      let attachmentPayloads = {
        textFiles: [] as { name: string; text: string }[],
        images: [] as { name: string; dataUrl: string }[],
      };
      try {
        if (state.attachments.length > 0) {
          attachmentPayloads = await loadAttachmentPayloads(state.attachments);
        }
      } catch (e) {
        alert(e instanceof Error ? e.message : "读取附件失败");
        return;
      }

      const agentHistory = trimMessagesForApi(
        filterAfterContextClear(state.messages).filter(
          (m) =>
            m.type !== "clear" &&
            !m.error &&
            (m.type === "tool" ||
              !(m.role === "assistant" && !m.content?.trim())),
        ),
      );
      const history = trimMessagesForApi(filterForApi(state.messages));
      const systemPrompt = agentMode ? agent.soul : undefined;
      const payloadMessages = agentMode
        ? buildAgentApiMessages(agentHistory, finalText, attachmentPayloads, systemPrompt)
        : buildApiMessages(history, finalText, attachmentPayloads, systemPrompt);

      const now = Date.now();
      const userMsg: ChatMsg = {
        id: genId(),
        role: "user",
        content: finalText,
        attachments: state.attachments.length > 0 ? [...state.attachments] : undefined,
        timestamp: now,
      };

      const requestId = genId();
      requestIdToTopicIdRef.current.set(requestId, topicId);
      if (isCompactRequest) {
        compactRequestIdRef.current = requestId;
      }

      const shouldAutoTitle = state.messages.length === 0;

      setTopicStates((prev) => {
        const s = prev[topicId] ?? emptyTopicState();
        return {
          ...prev,
          [topicId]: {
            ...s,
            messages: [...s.messages, userMsg, { id: genId(), role: "assistant", content: "", timestamp: now }],
            input: "",
            attachments: [],
            streaming: true,
            requestId,
            requestBackend,
          },
        };
      });
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
      setSidebarCollapsed(true);

      notifyLive2DScene("userSend");
      notifyLive2DScene("thinking");

      const invokePromise = agentMode
        ? openAgentStream({
            topicId,
            requestId,
            messages: payloadMessages,
            apiConfig: {
              apiHost: apiConfig.apiHost,
              apiKey: apiConfig.apiKey,
              providerType: apiConfig.providerType,
              modelName: apiConfig.modelName,
            },
            agentConfig: agent,
          })
        : api.invoke("chat:send", {
            requestId,
            messages: payloadMessages,
            apiConfig: {
              apiHost: apiConfig.apiHost,
              apiKey: apiConfig.apiKey,
              providerType: apiConfig.providerType,
              modelName: apiConfig.modelName,
            },
          });

      invokePromise
        .then((result) => {
          if (!agentMode || !result || typeof result !== "object") return;
          if ((result as { mode?: string }).mode !== "blocked") return;
          if (requestIdToTopicIdRef.current.get(requestId) !== topicId) return;
          requestIdToTopicIdRef.current.delete(requestId);
          setTopicStates((prev) => {
            const s = prev[topicId];
            if (!s) return prev;
            const idx = findLastAssistantReplyIndex(s.messages);
            const next = s.messages.slice();
            if (idx >= 0) {
              next[idx] = {
                ...next[idx],
                content: "该话题已有进行中的会话，请等待完成或先停止。",
                error: true,
              };
            }
            return {
              ...prev,
              [topicId]: {
                ...s,
                messages: next,
                streaming: false,
                requestId: null,
                requestBackend: null,
              },
            };
          });
          syncStreamingFlag(topicId, false);
          notifyLive2DScene("replyError");
          flushSessionSave(topicId);
        })
        .catch((e: Error) => {
        if (requestIdToTopicIdRef.current.get(requestId) !== topicId) return;
        requestIdToTopicIdRef.current.delete(requestId);
        setTopicStates((prev) => {
          const s = prev[topicId];
          if (!s) return prev;
          return {
            ...prev,
            [topicId]: {
              ...s,
              streaming: false,
              requestId: null,
              requestBackend: null,
            },
          };
        });
        syncStreamingFlag(topicId, false);
        notifyLive2DScene("replyError");
        setTopicStates((prev) => {
          const s = prev[topicId];
          if (!s) return prev;
          const idx = findLastAssistantReplyIndex(s.messages);
          if (idx < 0) return prev;
          const next = s.messages.slice();
          next[idx] = {
            ...next[idx],
            content: `请求失败：${e.message || e}`,
            error: true,
          };
          return { ...prev, [topicId]: { ...s, messages: next } };
        });
        flushSessionSave(topicId);
      });
    },
    [skills, loadAttachmentPayloads, flushSessionSave, scheduleTopicSave, scrollToBottom, syncStreamingFlag],
  );

  useEffect(() => {
    handleSendRef.current = (text?: string) => {
      void handleSend(text);
    };
  }, [handleSend]);

  const handleStop = useCallback(() => {
    const topicId = activeTopicIdRef.current;
    if (!topicId) return;
    const state = topicStatesRef.current[topicId];
    if (!state?.requestId || !state.requestBackend) return;
    if (isAgentBackend(state.requestBackend)) {
      abortTopicStream(topicId, state.requestId);
      void api.invoke("agent:abort", { requestId: state.requestId });
    } else {
      void api.invoke("chat:abort", { requestId: state.requestId });
    }
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
      return { ...prev, [topicId]: { ...s, messages: nextMessages } };
    });
    scheduleTopicSave(topicId);
  }, [scheduleTopicSave]);

  useEffect(() => {
    handleClearContextRef.current = handleClearContext;
  }, [handleClearContext]);

  const handleSlashCommand = useCallback(
    (cmd: SlashCommand | null) => {
      if (!cmd) {
        setActiveInput("");
        return;
      }
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

  const handleClearMessages = useCallback(() => {
    const topicId = activeTopicIdRef.current;
    if (!topicId) return;
    const state = topicStatesRef.current[topicId];
    if (!state || state.streaming || state.messages.length === 0) return;
    if (!window.confirm("确定清空所有消息吗？")) return;
    setTopicStates((prev) => ({
      ...prev,
      [topicId]: {
        ...(prev[topicId] ?? emptyTopicState()),
        messages: [],
        input: "",
        attachments: [],
        invalidAttachmentPaths: new Set(),
      },
    }));
    flushSessionSave(topicId);
  }, [flushSessionSave]);

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
      const text = target.content;
      const kept = state.messages.slice(0, idx);
      setTopicStates((prev) => ({
        ...prev,
        [topicId]: { ...(prev[topicId] ?? emptyTopicState()), messages: kept },
      }));
      // 在下一帧用截断后的消息重新发送
      setTimeout(() => handleSendRef.current(text), 0);
    },
    [],
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
        while (end < state.messages.length && state.messages[end].role !== "user") {
          end++;
        }
      } else if (target.role === "assistant") {
        while (end < state.messages.length && state.messages[end].type === "tool") {
          end++;
        }
      }
      const nextMessages = state.messages
        .slice(0, idx)
        .concat(state.messages.slice(end));
      setTopicStates((prev) => ({
        ...prev,
        [topicId]: { ...(prev[topicId] ?? emptyTopicState()), messages: nextMessages },
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
        <span className="chat-empty-icon">🧚‍♀️</span>
        <p>开始聊天</p>
      </div>
    ),
    [],
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
        <TopicSidebar
          topics={topics}
          activeId={activeTopicId}
          onSelect={handleSelectTopic}
          onCreate={handleCreateTopic}
          onDelete={handleDeleteTopic}
          onRename={handleRenameTopic}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed((v) => !v)}
          loadingTopicIds={loadingTopicIds}
        />
      )}
      <div className="chat-main-area">
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
          onRetry={handleRetry}
          onDelete={handleDeleteMessage}
          emptyContent={emptyContent}
        />

        <ChatInputBar
          input={input}
          onInputChange={setActiveInput}
          attachments={attachments}
          onAttachmentsChange={setActiveAttachments}
          streaming={streaming}
          hasMessages={messages.length > 0}
          focusSignal={inputFocusSignal}
          models={selectableModels}
          modelName={activeBackend}
          modelLabels={modelLabels}
          onModelChange={handleBackendChange}
          chatMode={chatSettings.chatMode}
          onChatModeChange={handleChatModeChange}
          showModeSelector={usingAgent}
          reasoningEffort={chatSettings.agent.reasoningEffort}
          onReasoningEffortChange={handleReasoningEffortChange}
          onSend={handleSendClick}
          onStop={handleStop}
          onClearContext={handleClearContext}
          onClearMessages={handleClearMessages}
          onCompact={handleCompactClick}
          slashCommands={slashCommands}
          onSlashCommand={handleSlashCommand}
        />
      </div>
    </div>
  );
}
