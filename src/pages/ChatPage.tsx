import {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
  type MutableRefObject,
  type ReactNode,
} from "react";
import ChatInputBar from "../components/chat/ChatInputBar";
import TopicSidebar from "../components/chat/TopicSidebar";
import ToolCallBubble, { ToolCallGroup } from "../components/chat/ToolCallBubble";
import MessageBubble from "../components/chat/MessageBubble";
import { useToolApproval } from "../hooks/useToolApproval";
import { useStickToBottom } from "../hooks/useStickToBottom";
import type { ChatAttachment } from "../shared/chatAttachments";
import {
  type ChatMsg,
  buildApiMessages,
  buildAgentApiMessages,
  filterAfterContextClear,
  filterForApi,
  findLastAssistantReplyIndex,
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
  loadSettings,
  saveSettings,
  getChatBackendItems,
  getActiveChatBackend,
  isAgentBackend,
  getChatApiConfig,
  type AppSettings,
} from "../shared/settings";
import { getChatCompletionsUrl } from "../shared/providers";
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
import "./ChatPage.css";

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

function ContextClearDivider() {
  return (
    <div className="msg-context-clear" role="separator">
      <span>上下文已清除</span>
    </div>
  );
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
        const stat = (await api.invoke("file:stat_path", filePath)) as {
          exists?: boolean;
        };
        if (!stat?.exists) invalid.add(filePath);
      } catch {
        invalid.add(filePath);
      }
    }),
  );
  return invalid;
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
  const [chatSettings, setChatSettings] = useState<AppSettings>(loadSettings);

  const activeState = topicStates[activeTopicId ?? ""] ?? emptyTopicState();
  const { messages, input, attachments, streaming, invalidAttachmentPaths } = activeState;

  const { containerRef: messagesContainerRef, handleScroll, scrollToBottom } =
    useStickToBottom(messages);
  const chatMessagesRef = useRef<ChatMsg[]>([]);
  const requestIdRef = useRef<string>("");
  const activeTopicIdRef = useRef<string | null>(null);
  const topicStatesRef = useRef(topicStates);
  const requestIdToTopicIdRef = useRef<Map<string, string>>(new Map());
  const saveTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const handleSendRef = useRef<(text?: string) => void>(() => {});
  const handleClearContextRef = useRef<() => void>(() => {});
  const compactRequestIdRef = useRef<string | null>(null);

  useEffect(() => {
    topicStatesRef.current = topicStates;
  }, [topicStates]);

  useEffect(() => {
    activeTopicIdRef.current = activeTopicId;
  }, [activeTopicId]);

  useEffect(() => {
    chatMessagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    requestIdRef.current = activeState.requestId ?? "";
  }, [activeState.requestId]);

  const backendItems = getChatBackendItems(chatSettings);
  const selectableModels = backendItems.map((i) => i.value);
  const modelLabels = Object.fromEntries(
    backendItems.map((i) => [i.value, i.label]),
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
      if (!topicStatesRef.current[topicId]) {
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
    const off = api.onSettingsUpdated?.(() => {
      setChatSettings(loadSettings());
    });
    return () => off?.();
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
        [topicId]: { ...(prev[topicId] ?? emptyTopicState()), attachments: value },
      }));
      scheduleTopicSave(topicId);
    },
    [scheduleTopicSave],
  );

  useEffect(() => {
    api.onChatPrefill((payload) => {
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
    const offChunk = api.onChatStreamChunk(({ requestId, delta, reasoning }) => {
      const topicId = requestIdToTopicIdRef.current.get(requestId);
      if (!topicId) return;
      setTopicStates((prev) => {
        const state = prev[topicId];
        if (!state) return prev;
        const idx = findLastAssistantReplyIndex(state.messages);
        if (idx < 0) return prev;
        const next = state.messages.slice();
        const target = next[idx];
        next[idx] = {
          ...target,
          ...(typeof delta === "string" ? { content: target.content + delta } : {}),
          ...(typeof reasoning === "string"
            ? { reasoning: (target.reasoning ?? "") + reasoning }
            : {}),
        };
        return { ...prev, [topicId]: { ...state, messages: next } };
      });
      scheduleTopicSave(topicId);
    });

    const offDone = api.onChatStreamDone(({ requestId, aborted }) => {
      const topicId = requestIdToTopicIdRef.current.get(requestId);
      if (!topicId) return;
      requestIdToTopicIdRef.current.delete(requestId);

      setTopicStates((prev) => {
        const state = prev[topicId];
        if (!state) return prev;
        return {
          ...prev,
          [topicId]: {
            ...state,
            streaming: false,
            requestId: null,
            requestBackend: null,
          },
        };
      });

      const isActive = topicId === activeTopicIdRef.current;

      if (aborted) {
        compactRequestIdRef.current = null;
        setTopicStates((prev) => {
          const state = prev[topicId];
          if (!state) return prev;
          return {
            ...prev,
            [topicId]: {
              ...state,
              messages: state.messages.map((m) =>
                m.type === "tool" &&
                (m.toolStatus === "streaming" ||
                  m.toolStatus === "running" ||
                  m.toolStatus === "awaiting_approval")
                  ? { ...m, toolStatus: "error" as const, toolMessage: "已取消" }
                  : m,
              ),
            },
          };
        });
        if (isActive) notifyLive2DScene("replyError");
        flushSessionSave(topicId);
        return;
      }

      const isCompact = compactRequestIdRef.current === requestId;
      compactRequestIdRef.current = null;

      if (isCompact) {
        setTopicStates((prev) => {
          const state = prev[topicId];
          if (!state) return prev;
          const assistantIdx = findLastAssistantReplyIndex(state.messages);
          const summary =
            assistantIdx >= 0 && !state.messages[assistantIdx].error
              ? state.messages[assistantIdx].content
              : "";
          if (!summary.trim()) return prev;
          return {
            ...prev,
            [topicId]: {
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
            },
          };
        });
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
    });

    const offError = api.onChatStreamError(({ requestId, message }) => {
      const topicId = requestIdToTopicIdRef.current.get(requestId);
      if (!topicId) return;
      requestIdToTopicIdRef.current.delete(requestId);

      setTopicStates((prev) => {
        const state = prev[topicId];
        if (!state) return prev;
        return {
          ...prev,
          [topicId]: {
            ...state,
            streaming: false,
            requestId: null,
            requestBackend: null,
          },
        };
      });

      const isActive = topicId === activeTopicIdRef.current;
      if (isActive) notifyLive2DScene("replyError");

      setTopicStates((prev) => {
        const state = prev[topicId];
        if (!state) return prev;
        const idx = findLastAssistantReplyIndex(state.messages);
        if (idx < 0) return prev;
        const next = state.messages.slice();
        const target = next[idx];
        next[idx] = {
          ...target,
          content: target.content || `请求失败：${message}`,
          error: true,
        };
        return { ...prev, [topicId]: { ...state, messages: next } };
      });
      flushSessionSave(topicId);
    });

    const offTool = api.onAgentStreamTool?.(
      ({
        requestId,
        toolCallId,
        toolName,
        toolArgs,
        approvalId,
        status,
        message,
        resultPreview,
      }) => {
        const topicId = requestIdToTopicIdRef.current.get(requestId);
        if (!topicId) return;
        setTopicStates((prev) => {
          const state = prev[topicId];
          if (!state) return prev;
          const msgs = state.messages;
          const existingIdx = toolCallId
            ? msgs.findIndex(
                (m) => m.type === "tool" && m.toolCallId === toolCallId,
              )
            : msgs.findIndex(
                (m) =>
                  m.type === "tool" &&
                  m.toolName === toolName &&
                  (m.toolStatus === "running" || m.toolStatus === "streaming"),
              );
          const prevTool = existingIdx >= 0 ? msgs[existingIdx] : null;
          const toolMsg: ChatMsg = {
            id: prevTool?.id || genId(),
            role: "assistant",
            type: "tool",
            content: "",
            toolCallId: toolCallId || prevTool?.toolCallId,
            toolName,
            toolArgs: toolArgs ?? prevTool?.toolArgs,
            toolApprovalId: approvalId ?? prevTool?.toolApprovalId,
            toolStatus: status,
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
          return { ...prev, [topicId]: { ...state, messages: nextMessages } };
        });
        scheduleTopicSave(topicId);
        const isActive = topicId === activeTopicIdRef.current;
        if (status === "running" && isActive) notifyLive2DScene("toolRunning");
      },
    );

    return () => {
      offChunk?.();
      offDone?.();
      offError?.();
      offTool?.();
    };
  }, [flushSessionSave, scheduleTopicSave]);

  // Center an awaiting-approval tool card in the viewport so the user notices it.
  useEffect(() => {
    const el = messagesContainerRef.current;
    if (!el) return;
    const card = el.querySelector<HTMLElement>("[data-tool-approval-id]");
    if (!card) return;
    card.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [messages]);

  // Switching topics returns to that conversation's bottom.
  useEffect(() => {
    scrollToBottom();
  }, [activeTopicId, scrollToBottom]);

  const handleBackendChange = useCallback(
    (backend: string) => {
      const next = { ...chatSettings, chatBackend: backend };
      saveSettings(next);
      setChatSettings(next);
    },
    [chatSettings],
  );

  const handleChatModeChange = useCallback(
    (mode: ChatMode) => {
      const next = {
        ...chatSettings,
        chatMode: mode,
        agent: { ...chatSettings.agent, chatMode: mode },
      };
      saveSettings(next);
      setChatSettings(next);
    },
    [chatSettings],
  );

  const handleReasoningEffortChange = useCallback(
    (value: ReasoningEffort) => {
      const next = {
        ...chatSettings,
        agent: { ...chatSettings.agent, reasoningEffort: value },
      };
      saveSettings(next);
      setChatSettings(next);
    },
    [chatSettings],
  );

  const {
    submittingApprovalId,
    handleApproveTool,
    handleDenyTool,
    handleAlwaysAllowTool,
  } = useToolApproval(chatMessagesRef, () => handleChatModeChange("full-auto"), requestIdRef);

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

      const settings = chatSettings;
      const requestBackend = getActiveChatBackend(settings);
      const agentMode = isAgentBackend(requestBackend);
      const apiConfig = getChatApiConfig(settings);

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

      const chatUrl = getChatCompletionsUrl(
        apiConfig.apiHost,
        apiConfig.providerType,
      );

      const invokePromise = agentMode
        ? api.invoke("agent:run", {
            requestId,
            messages: payloadMessages,
            chatUrl,
            apiKey: apiConfig.apiKey,
            apiConfig: {
              apiHost: apiConfig.apiHost,
              apiKey: apiConfig.apiKey,
              providerType: apiConfig.providerType,
              modelName: apiConfig.modelName,
            },
            agentConfig: agent,
            temperature: settings.temperature,
          })
        : api.invoke("chat:send", {
            requestId,
            messages: payloadMessages,
            chatUrl,
            apiKey: apiConfig.apiKey,
            model: apiConfig.modelName,
            temperature: settings.temperature,
          });

      invokePromise.catch((e: Error) => {
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
    [chatSettings, skills, loadAttachmentPayloads, flushSessionSave, scheduleTopicSave, scrollToBottom],
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

  const loadingTopicIds = useMemo(() => {
    const set = new Set<string>();
    for (const [id, state] of Object.entries(topicStates)) {
      if (state.streaming) set.add(id);
    }
    return set;
  }, [topicStates]);

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
        <div className="chat-messages" ref={messagesContainerRef} onScroll={handleScroll}>
          {messages.length === 0 ? (
            <div className="chat-empty">
              <span className="chat-empty-icon">🧚‍♀️</span>
              <p>开始聊天</p>
            </div>
          ) : (
            (() => {
              const nodes: ReactNode[] = [];
              let i = 0;
              const streamingAssistantIdx = streaming
                ? findLastAssistantReplyIndex(messages)
                : -1;
              const streamingAssistantId =
                streamingAssistantIdx >= 0 ? messages[streamingAssistantIdx].id : null;
              while (i < messages.length) {
                const m = messages[i];
                if (m.type === "clear") {
                  nodes.push(<ContextClearDivider key={m.id} />);
                  i += 1;
                  continue;
                }
                if (m.type === "tool") {
                  const batch: ChatMsg[] = [];
                  while (i < messages.length && messages[i].type === "tool") {
                    batch.push(messages[i]);
                    i += 1;
                  }
                  nodes.push(
                    batch.length > 1 ? (
                      <ToolCallGroup
                        key={batch[0].id}
                        tools={batch}
                        onApprove={handleApproveTool}
                        onDeny={handleDenyTool}
                        onAlwaysAllow={handleAlwaysAllowTool}
                        submittingApprovalId={submittingApprovalId}
                      />
                    ) : (
                      <ToolCallBubble
                        key={batch[0].id}
                        msg={batch[0]}
                        onApprove={handleApproveTool}
                        onDeny={handleDenyTool}
                        onAlwaysAllow={handleAlwaysAllowTool}
                        submittingApprovalId={submittingApprovalId}
                      />
                    ),
                  );
                  continue;
                }
                nodes.push(
                  <MessageBubble
                    key={m.id}
                    msg={m}
                    streaming={streaming}
                    isStreamingTarget={m.id === streamingAssistantId}
                    invalidAttachmentPaths={invalidAttachmentPaths}
                    onRetry={m.role === "user" ? handleRetry : undefined}
                    onDelete={handleDeleteMessage}
                  />,
                );
                i += 1;
              }
              return nodes;
            })()
          )}
        </div>

        <ChatInputBar
          input={input}
          onInputChange={setActiveInput}
          attachments={attachments}
          onAttachmentsChange={setActiveAttachments}
          streaming={streaming}
          hasMessages={messages.length > 0}
          models={selectableModels}
          modelName={activeBackend}
          modelLabels={modelLabels}
          onModelChange={handleBackendChange}
          chatMode={chatSettings.chatMode}
          onChatModeChange={handleChatModeChange}
          showModeSelector={usingAgent}
          reasoningEffort={chatSettings.agent.reasoningEffort}
          onReasoningEffortChange={handleReasoningEffortChange}
          onSend={() => void handleSend()}
          onStop={handleStop}
          onClearContext={handleClearContext}
          onClearMessages={handleClearMessages}
          onCompact={() => void handleSend(COMPACT_PROMPT)}
          slashCommands={slashCommands}
          onSlashCommand={handleSlashCommand}
        />
      </div>
    </div>
  );
}
