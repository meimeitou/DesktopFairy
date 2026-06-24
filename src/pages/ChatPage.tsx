import {
  useState,
  useEffect,
  useRef,
  useCallback,
  type MutableRefObject,
  type ReactNode,
} from "react";
import ChatInputBar from "../components/chat/ChatInputBar";
import TopicSidebar from "../components/chat/TopicSidebar";
import ToolCallBubble, { ToolCallGroup } from "../components/chat/ToolCallBubble";
import MessageBubble from "../components/chat/MessageBubble";
import { useToolApproval } from "../hooks/useToolApproval";
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
  getActiveApiConfig,
  type AppSettings,
} from "../shared/settings";
import { getChatCompletionsUrl } from "../shared/providers";
import { notifyLive2DScene } from "../shared/live2dReactions";
import type { ChatMode } from "../shared/chatMode";
import "./ChatPage.css";

const api = window.electronAPI;
const SESSION_SAVE_DEBOUNCE_MS = 400;

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
  const [input, setInput] = useState("");
  const [attachments, setAttachments] = useState<ChatAttachment[]>([]);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [chatSettings, setChatSettings] = useState<AppSettings>(loadSettings);
  const [invalidAttachmentPaths, setInvalidAttachmentPaths] = useState(
    () => new Set<string>(),
  );
  const [sessionReady, setSessionReady] = useState(false);

  const [topics, setTopics] = useState<ChatTopic[]>([]);
  const [activeTopicId, setActiveTopicId] = useState<string | null>(null);
  const [topicsLoaded, setTopicsLoaded] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const chatMessagesRef = useRef<ChatMsg[]>([]);
  const inputRef = useRef("");
  const attachmentsRef = useRef<ChatAttachment[]>([]);
  const requestIdRef = useRef<string>("");
  const activeRequestBackendRef = useRef<string | null>(null);
  const handleSendRef = useRef<(text?: string) => void>(() => {});
  const sessionLoadedRef = useRef(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeTopicIdRef = useRef<string | null>(null);
  const initializedTopicIdRef = useRef<string | null>(null);

  activeTopicIdRef.current = activeTopicId;

  const backendItems = getChatBackendItems(chatSettings);
  const selectableModels = backendItems.map((i) => i.value);
  const modelLabels = Object.fromEntries(
    backendItems.map((i) => [i.value, i.label]),
  );
  const activeBackend = getActiveChatBackend(chatSettings);
  const usingAgent = isAgentBackend(activeBackend);

  const abortActiveRun = useCallback(() => {
    const id = requestIdRef.current;
    if (!id) return;
    const backend = activeRequestBackendRef.current;
    if (isAgentBackend(backend ?? "")) {
      void api.invoke("agent:abort", { requestId: id });
    } else {
      void api.invoke("chat:abort", { requestId: id });
    }
  }, []);

  useEffect(() => {
    chatMessagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    inputRef.current = input;
  }, [input]);

  useEffect(() => {
    attachmentsRef.current = attachments;
  }, [attachments]);

  const persistSession = useCallback(async (topicIdOverride?: string) => {
    const tid = topicIdOverride ?? activeTopicIdRef.current;
    if (!tid) return;
    const session = trimSessionForStorage(
      buildChatSession(
        chatMessagesRef.current,
        inputRef.current,
        attachmentsRef.current,
      ),
    );
    await api.invoke("chat:session:save", { topicId: tid, session });
  }, []);

  const scheduleSessionSave = useCallback(() => {
    if (!sessionLoadedRef.current) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      saveTimerRef.current = null;
      void persistSession();
    }, SESSION_SAVE_DEBOUNCE_MS);
  }, [persistSession]);

  const flushSessionSave = useCallback(() => {
    if (!sessionLoadedRef.current) return;
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    void persistSession();
  }, [persistSession]);

  const loadSessionForTopic = useCallback(async (topicId: string) => {
    sessionLoadedRef.current = false;
    setSessionReady(false);
    try {
      const raw = (await api.invoke("chat:session:load", topicId)) as unknown;
      const session = normalizeChatSession(raw);
      setMessages(session.messages);
      setInput(session.draftInput ?? "");
      setAttachments(session.draftAttachments ?? []);
      const invalid = await collectInvalidAttachmentPaths(session.messages);
      setInvalidAttachmentPaths(invalid);
      requestIdRef.current = "";
      setStreaming(false);
    } catch {
      setMessages([]);
      setInput("");
      setAttachments([]);
    } finally {
      sessionLoadedRef.current = true;
      initializedTopicIdRef.current = topicId;
      setSessionReady(true);
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
      if (activeId) {
        setActiveTopicId(activeId);
        await loadSessionForTopic(activeId);
      } else {
        setActiveTopicId(null);
        setMessages([]);
        setInput("");
        setAttachments([]);
        setSessionReady(true);
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
      if (topicId === activeTopicId) return;
      if (streaming) abortActiveRun();
      void persistSession();
      setActiveTopicId(topicId);
      void loadSessionForTopic(topicId);
    },
    [activeTopicId, persistSession, loadSessionForTopic, streaming, abortActiveRun],
  );

  const handleCreateTopic = useCallback(async () => {
    try {
      await persistSession();
      const topic = (await api.invoke("chat:topics:create", { name: "" })) as ChatTopic;
      setTopics((prev) => [...prev, topic]);
      setActiveTopicId(topic.id);
      await loadSessionForTopic(topic.id);
    } catch (e) {
      console.warn("Failed to create topic:", e);
    }
  }, [persistSession, loadSessionForTopic]);

  const handleDeleteTopic = useCallback(
    async (topicId: string) => {
      const result = (await api.invoke("chat:topics:delete", topicId)) as {
        ok: boolean;
        activeId: string | null;
        autoCreated?: ChatTopic | null;
      };
      if (!result.ok) return;

      const replacement = result.autoCreated;
      setTopics((prev) => {
        const filtered = prev.filter((t) => t.id !== topicId);
        return replacement ? [...filtered, replacement] : filtered;
      });

      const nextActiveId = result.activeId;
      if (nextActiveId) {
        if (nextActiveId !== activeTopicId) {
          setActiveTopicId(nextActiveId);
          await loadSessionForTopic(nextActiveId);
        }
      } else {
        setActiveTopicId(null);
        setMessages([]);
        setInput("");
        setAttachments([]);
        setSessionReady(true);
      }
    },
    [activeTopicId, loadSessionForTopic],
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
    if (!sessionReady) return;
    scheduleSessionSave();
  }, [messages, input, attachments, sessionReady, scheduleSessionSave]);

  useEffect(() => {
    const onBeforeUnload = () => {
      flushSessionSave();
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      flushSessionSave();
    };
  }, [flushSessionSave]);

  useEffect(() => {
    notifyLive2DScene("chatOpen");
  }, []);

  useEffect(() => {
    const off = api.onSettingsUpdated?.(() => {
      setChatSettings(loadSettings());
    });
    return () => off?.();
  }, []);

  useEffect(() => {
    api.onChatPrefill((payload) => {
      const p =
        typeof payload === "string"
          ? { text: payload, autoSend: false }
          : payload;
      if (typeof p.text === "string") setInput(p.text);
      if (p.attachments?.length) setAttachments(p.attachments);
      if (p.autoSend && p.text?.trim()) {
        setTimeout(() => handleSendRef.current(p.text), 0);
      }
    });
  }, []);

  useEffect(() => {
    const offChunk = api.onChatStreamChunk(({ requestId, delta }) => {
      if (requestId !== requestIdRef.current) return;
      setMessages((prev) => {
        const idx = findLastAssistantReplyIndex(prev);
        if (idx < 0) return prev;
        const next = prev.slice();
        const target = next[idx];
        next[idx] = { ...target, content: target.content + delta };
        return next;
      });
    });

    const offDone = api.onChatStreamDone(({ requestId, aborted }) => {
      if (requestId !== requestIdRef.current) return;
      requestIdRef.current = "";
      activeRequestBackendRef.current = null;
      setStreaming(false);
      if (aborted) {
        setMessages((prev) =>
          prev.map((m) =>
            m.type === "tool" &&
            (m.toolStatus === "streaming" ||
              m.toolStatus === "running" ||
              m.toolStatus === "awaiting_approval")
              ? { ...m, toolStatus: "error" as const, toolMessage: "已取消" }
              : m,
          ),
        );
        notifyLive2DScene("replyError");
        flushSessionSave();
        return;
      }
      const list = chatMessagesRef.current;
      const assistantIdx = findLastAssistantReplyIndex(list);
      const assistantText =
        assistantIdx >= 0 && !list[assistantIdx].error
          ? list[assistantIdx].content
          : undefined;
      notifyLive2DScene("replyDone", assistantText);
      flushSessionSave();
    });

    const offError = api.onChatStreamError(({ requestId, message }) => {
      if (requestId !== requestIdRef.current) return;
      requestIdRef.current = "";
      activeRequestBackendRef.current = null;
      setStreaming(false);
      notifyLive2DScene("replyError");
      setMessages((prev) => {
        const idx = findLastAssistantReplyIndex(prev);
        if (idx < 0) return prev;
        const next = prev.slice();
        const target = next[idx];
        next[idx] = {
          ...target,
          content: target.content || `请求失败：${message}`,
          error: true,
        };
        return next;
      });
      flushSessionSave();
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
        if (requestId !== requestIdRef.current) return;
        setMessages((prev) => {
          const existingIdx = toolCallId
            ? prev.findIndex(
                (m) => m.type === "tool" && m.toolCallId === toolCallId,
              )
            : prev.findIndex(
                (m) =>
                  m.type === "tool" &&
                  m.toolName === toolName &&
                  (m.toolStatus === "running" || m.toolStatus === "streaming"),
              );
          const prevTool = existingIdx >= 0 ? prev[existingIdx] : null;
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
          if (existingIdx >= 0) {
            const next = prev.slice();
            next[existingIdx] = toolMsg;
            return next;
          }
          const assistantIdx = findLastAssistantReplyIndex(prev);
          if (assistantIdx < 0) return [...prev, toolMsg];

          const assistant = prev[assistantIdx];
          const next = prev.slice();
          if (assistant.content && !assistant.error) {
            next.splice(assistantIdx + 1, 0, toolMsg);
            next.push({
              id: genId(),
              role: "assistant",
              content: "",
              timestamp: Date.now(),
            });
          } else {
            next.splice(assistantIdx, 0, toolMsg);
          }
          return next;
        });
        if (status === "running") notifyLive2DScene("toolRunning");
      },
    );

    return () => {
      offChunk?.();
      offDone?.();
      offError?.();
      offTool?.();
    };
  }, [flushSessionSave]);

  useEffect(() => {
    const el = messagesContainerRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages]);

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

  const {
    submittingApprovalId,
    handleApproveTool,
    handleDenyTool,
    handleAlwaysAllowTool,
  } = useToolApproval(chatMessagesRef, handleChatModeChange);

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
      if (streaming) return;
      const text = (overrideText ?? input).trim();
      if (!text && attachments.length === 0) return;

      const settings = chatSettings;
      const agentMode = isAgentBackend(getActiveChatBackend(settings));
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
        if (attachments.length > 0) {
          attachmentPayloads = await loadAttachmentPayloads(attachments);
        }
      } catch (e) {
        alert(e instanceof Error ? e.message : "读取附件失败");
        return;
      }

      const agentHistory = trimMessagesForApi(
        filterAfterContextClear(messages).filter(
          (m) =>
            m.type !== "clear" &&
            !m.error &&
            (m.type === "tool" ||
              !(m.role === "assistant" && !m.content?.trim())),
        ),
      );
      const history = trimMessagesForApi(filterForApi(messages));
      const systemPrompt = agentMode ? agent.soul : undefined;
      const payloadMessages = agentMode
        ? buildAgentApiMessages(agentHistory, text, attachmentPayloads, systemPrompt)
        : buildApiMessages(history, text, attachmentPayloads, systemPrompt);

      const now = Date.now();
      const userMsg: ChatMsg = {
        id: genId(),
        role: "user",
        content: text,
        attachments: attachments.length > 0 ? [...attachments] : undefined,
        timestamp: now,
      };

      const requestId = genId();
      requestIdRef.current = requestId;
      activeRequestBackendRef.current = getActiveChatBackend(settings);
      setMessages([
        ...messages,
        userMsg,
        { id: genId(), role: "assistant", content: "", timestamp: now },
      ]);

      if (activeTopicId && messages.length === 0) {
        const autoTitle = generateTopicTitle(text);
        void api
          .invoke("chat:topics:rename", {
            topicId: activeTopicId,
            name: autoTitle,
          })
          .then(() => {
            setTopics((prev) =>
              prev.map((t) =>
                t.id === activeTopicId
                  ? { ...t, name: autoTitle, updatedAt: Date.now() }
                  : t,
              ),
            );
          });
      }
      setInput("");
      setAttachments([]);
      setStreaming(true);

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

      invokePromise
        .catch((e: Error) => {
          if (requestIdRef.current !== requestId) return;
          requestIdRef.current = "";
          activeRequestBackendRef.current = null;
          setStreaming(false);
          notifyLive2DScene("replyError");
          setMessages((prev) => {
            const idx = findLastAssistantReplyIndex(prev);
            if (idx < 0) return prev;
            const next = prev.slice();
            next[idx] = {
              ...next[idx],
              content: `请求失败：${e.message || e}`,
              error: true,
            };
            return next;
          });
          flushSessionSave();
        });
    },
    [
      input,
      streaming,
      messages,
      attachments,
      chatSettings,
      loadAttachmentPayloads,
      flushSessionSave,
    ],
  );

  useEffect(() => {
    handleSendRef.current = (text?: string) => {
      void handleSend(text);
    };
  }, [handleSend]);

  const handleStop = useCallback(() => {
    abortActiveRun();
  }, [abortActiveRun]);

  const handleClearContext = useCallback(() => {
    if (streaming) return;
    if (messages.length === 0) return;

    const last = messages[messages.length - 1];
    if (last.type === "clear") {
      setMessages(messages.slice(0, -1));
      return;
    }

    setMessages([
      ...messages,
      {
        id: genId(),
        role: "user",
        type: "clear",
        content: "",
        timestamp: Date.now(),
      },
    ]);
  }, [streaming, messages]);

  const handleClearMessages = useCallback(() => {
    if (streaming) return;
    if (messages.length === 0) return;
    if (!window.confirm("确定清空所有消息吗？")) return;
    setMessages([]);
    setInput("");
    setAttachments([]);
    setInvalidAttachmentPaths(new Set());
    void persistSession();
  }, [streaming, messages.length, persistSession]);

  // 重试用户消息：删除该消息及其后所有消息，用原始文本重新发送
  const handleRetry = useCallback(
    (msgId: string) => {
      if (streaming) return;
      const idx = messages.findIndex((m) => m.id === msgId);
      if (idx === -1) return;
      const target = messages[idx];
      if (target.role !== "user") return;
      const text = target.content;
      const kept = messages.slice(0, idx);
      setMessages(kept);
      // 在下一帧用截断后的消息重新发送
      setTimeout(() => handleSendRef.current(text), 0);
    },
    [streaming, messages],
  );

  // 删除消息：删除该消息；若是用户消息，同时删除紧跟其后的助手回复
  const handleDeleteMessage = useCallback(
    (msgId: string) => {
      if (streaming) return;
      const idx = messages.findIndex((m) => m.id === msgId);
      if (idx === -1) return;
      const target = messages[idx];
      let end = idx + 1;
      if (target.role === "user") {
        while (end < messages.length && messages[end].role !== "user") {
          end++;
        }
      } else if (target.role === "assistant") {
        while (end < messages.length && messages[end].type === "tool") {
          end++;
        }
      }
      setMessages(messages.slice(0, idx).concat(messages.slice(end)));
    },
    [streaming, messages],
  );

  // 编辑并重新发送：删除该消息及其后所有消息，用新文本发送
  const handleEditResend = useCallback(
    (msgId: string, newContent: string) => {
      if (streaming) return;
      const idx = messages.findIndex((m) => m.id === msgId);
      if (idx === -1) return;
      const kept = messages.slice(0, idx);
      setMessages(kept);
      setTimeout(() => handleSendRef.current(newContent), 0);
    },
    [streaming, messages],
  );

  useEffect(() => {
    onMetaChange?.({ streaming, hasMessages: messages.length > 0 });
  }, [streaming, messages.length, onMetaChange]);

  useEffect(() => {
    if (!clearRef) return;
    clearRef.current = handleClearMessages;
    return () => {
      clearRef.current = null;
    };
  }, [clearRef, handleClearMessages]);

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
          onRefresh={() => {}}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed((v) => !v)}
        />
      )}
      <div className="chat-main-area">
        <div className="chat-messages" ref={messagesContainerRef}>
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
                  onEditResend={m.role === "user" ? handleEditResend : undefined}
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
        onInputChange={setInput}
        attachments={attachments}
        onAttachmentsChange={setAttachments}
        streaming={streaming}
        hasMessages={messages.length > 0}
        models={selectableModels}
        modelName={activeBackend}
        modelLabels={modelLabels}
        onModelChange={handleBackendChange}
        chatMode={chatSettings.chatMode}
        onChatModeChange={handleChatModeChange}
        showModeSelector={usingAgent}
        onSend={() => void handleSend()}
        onStop={handleStop}
        onClearContext={handleClearContext}
        onClearMessages={handleClearMessages}
      />
      </div>
    </div>
  );
}
