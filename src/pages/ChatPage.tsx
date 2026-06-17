import {
  useState,
  useEffect,
  useRef,
  useCallback,
  type MutableRefObject,
  type ReactNode,
} from "react";
import ChatMarkdown from "../components/chat/ChatMarkdown";
import ChatInputBar from "../components/chat/ChatInputBar";
import ToolCallBubble, { ToolCallGroup } from "../components/chat/ToolCallBubble";
import type { ChatAttachment } from "../shared/chatAttachments";
import {
  type ChatMsg,
  buildApiMessages,
  filterForApi,
  findLastAssistantReplyIndex,
  trimMessagesForApi,
} from "../shared/chatMessages";
import {
  buildChatSession,
  normalizeChatSession,
  trimSessionForStorage,
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

function formatMsgTime(ts?: number): string {
  if (!ts) return "";
  const d = new Date(ts);
  const h = d.getHours().toString().padStart(2, "0");
  const m = d.getMinutes().toString().padStart(2, "0");
  return `${h}:${m}`;
}

function CopyIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function RetryIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="1 4 1 10 7 10" />
      <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
    </svg>
  );
}

function EditIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

function DeleteIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  );
}

function CheckIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function MessageBubble({
  msg,
  streaming,
  isLast,
  invalidAttachmentPaths,
  onRetry,
  onDelete,
  onEditResend,
}: {
  msg: ChatMsg;
  streaming: boolean;
  isLast: boolean;
  invalidAttachmentPaths: Set<string>;
  onRetry?: (msgId: string) => void;
  onDelete?: (msgId: string) => void;
  onEditResend?: (msgId: string, newContent: string) => void;
}) {
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState("");
  const isStreamingAssistant =
    streaming &&
    isLast &&
    msg.role === "assistant" &&
    msg.type !== "tool" &&
    !msg.error;
  const isUser = msg.role === "user";
  const isError = msg.error;

  const handleCopy = async () => {
    if (!msg.content) return;
    try {
      await navigator.clipboard.writeText(msg.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  };

  const startEdit = () => {
    setEditText(msg.content);
    setEditing(true);
  };

  const cancelEdit = () => {
    setEditing(false);
    setEditText("");
  };

  const confirmEdit = () => {
    const trimmed = editText.trim();
    if (!trimmed) return;
    if (trimmed === msg.content) {
      cancelEdit();
      return;
    }
    onEditResend?.(msg.id, trimmed);
    setEditing(false);
    setEditText("");
  };

  const showTyping = isStreamingAssistant && !msg.content && !msg.error;

  return (
    <div className={`msg msg-${msg.role}${isError ? " msg-error" : ""}`}>
      <div className="msg-bubble">
        <div className="msg-header">
          <span className="msg-header-time">{formatMsgTime(msg.timestamp)}</span>
        </div>
        {msg.attachments && msg.attachments.length > 0 && (
          <div className="msg-attachments">
            {msg.attachments.map((a) => (
              <span
                key={a.id}
                className={`msg-attachment-tag${invalidAttachmentPaths.has(a.path) ? " msg-attachment-missing" : ""}`}
              >
                {invalidAttachmentPaths.has(a.path) ? "⚠" : "📎"} {a.name}
                {invalidAttachmentPaths.has(a.path) ? "（附件已失效）" : ""}
              </span>
            ))}
          </div>
        )}
        {editing ? (
          <div className="msg-edit-area">
            <textarea
              className="msg-edit-textarea"
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  confirmEdit();
                }
                if (e.key === "Escape") {
                  cancelEdit();
                }
              }}
              autoFocus
            />
            <div className="msg-edit-actions">
              <button
                type="button"
                className="msg-edit-btn msg-edit-cancel"
                onClick={cancelEdit}
              >
                取消
              </button>
              <button
                type="button"
                className="msg-edit-btn msg-edit-save"
                onClick={confirmEdit}
              >
                保存并发送
              </button>
            </div>
          </div>
        ) : isError ? (
          <span className="msg-plain">{msg.content}</span>
        ) : showTyping ? (
          <span className="msg-typing">
            <span />
            <span />
            <span />
          </span>
        ) : (
          <ChatMarkdown
            content={msg.content}
            streaming={isStreamingAssistant}
          />
        )}
        {!showTyping && msg.content && !isError && !editing && (
          <div className="msg-actions">
            <button
              type="button"
              className="msg-action-btn"
              onClick={handleCopy}
              title="复制"
            >
              {copied ? <CheckIcon size={13} /> : <CopyIcon size={13} />}
            </button>
            {isUser && onRetry && (
              <button
                type="button"
                className="msg-action-btn"
                onClick={() => onRetry(msg.id)}
                title="重试"
              >
                <RetryIcon size={13} />
              </button>
            )}
            {isUser && onEditResend && (
              <button
                type="button"
                className="msg-action-btn"
                onClick={startEdit}
                title="编辑"
              >
                <EditIcon size={13} />
              </button>
            )}
            {onDelete && (
              <button
                type="button"
                className="msg-action-btn msg-action-delete"
                onClick={() => onDelete(msg.id)}
                title="删除"
              >
                <DeleteIcon size={13} />
              </button>
            )}
          </div>
        )}
      </div>
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
  const [submittingApprovalId, setSubmittingApprovalId] = useState<string | null>(
    null,
  );
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const chatMessagesRef = useRef<ChatMsg[]>([]);
  const inputRef = useRef("");
  const attachmentsRef = useRef<ChatAttachment[]>([]);
  const requestIdRef = useRef<string>("");
  const handleSendRef = useRef<(text?: string) => void>(() => {});
  const sessionLoadedRef = useRef(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const backendItems = getChatBackendItems(chatSettings);
  const selectableModels = backendItems.map((i) => i.value);
  const modelLabels = Object.fromEntries(
    backendItems.map((i) => [i.value, i.label]),
  );
  const activeBackend = getActiveChatBackend(chatSettings);
  const usingAgent = isAgentBackend(activeBackend);

  const respondToolApproval = useCallback(
    async (approvalId: string, approved: boolean) => {
      setSubmittingApprovalId(approvalId);
      try {
        await api.invoke("agent:tool:approve", { approvalId, approved });
      } finally {
        setSubmittingApprovalId(null);
      }
    },
    [],
  );

  const handleApproveTool = useCallback(
    (approvalId: string) => {
      void respondToolApproval(approvalId, true);
    },
    [respondToolApproval],
  );

  const handleDenyTool = useCallback(
    (approvalId: string) => {
      void respondToolApproval(approvalId, false);
    },
    [respondToolApproval],
  );

  useEffect(() => {
    chatMessagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    inputRef.current = input;
  }, [input]);

  useEffect(() => {
    attachmentsRef.current = attachments;
  }, [attachments]);

  const persistSession = useCallback(async () => {
    if (!sessionLoadedRef.current) return;
    const session = trimSessionForStorage(
      buildChatSession(
        chatMessagesRef.current,
        inputRef.current,
        attachmentsRef.current,
      ),
    );
    await api.invoke("chat:session:save", session);
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

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const raw = (await api.invoke("chat:session:load")) as unknown;
        if (cancelled) return;
        const session = normalizeChatSession(raw);
        setMessages(session.messages);
        setInput(session.draftInput ?? "");
        setAttachments(session.draftAttachments ?? []);
        const invalid = await collectInvalidAttachmentPaths(session.messages);
        if (!cancelled) setInvalidAttachmentPaths(invalid);
      } catch {
        if (!cancelled) setMessages([]);
      } finally {
        if (!cancelled) {
          sessionLoadedRef.current = true;
          setSessionReady(true);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

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

    const offDone = api.onChatStreamDone(({ requestId }) => {
      if (requestId !== requestIdRef.current) return;
      requestIdRef.current = "";
      setStreaming(false);
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
                  m.toolStatus === "running",
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
            return next;
          }
          next.splice(assistantIdx, 0, toolMsg);
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

      const history = trimMessagesForApi(filterForApi(messages));
      const systemPrompt = agentMode ? agent.instructions : undefined;
      const payloadMessages = buildApiMessages(
        history,
        text,
        attachmentPayloads,
        systemPrompt,
      );

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
      setMessages([
        ...messages,
        userMsg,
        { id: genId(), role: "assistant", content: "", timestamp: now },
      ]);
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
    const id = requestIdRef.current;
    if (!id) return;
    if (usingAgent) {
      api.invoke("agent:abort", { requestId: id });
    } else {
      api.invoke("chat:abort", { requestId: id });
    }
  }, [usingAgent]);

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
    void api.invoke(
      "chat:session:save",
      trimSessionForStorage(buildChatSession([], "", [])),
    );
  }, [streaming, messages.length]);

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
        // 同时删除紧跟其后的助手回复
        if (end < messages.length && messages[end].role === "assistant") {
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
                      submittingApprovalId={submittingApprovalId}
                    />
                  ) : (
                    <ToolCallBubble
                      key={batch[0].id}
                      msg={batch[0]}
                      onApprove={handleApproveTool}
                      onDeny={handleDenyTool}
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
                  isLast={i === messages.length - 1}
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
        onSend={() => void handleSend()}
        onStop={handleStop}
        onClearContext={handleClearContext}
        onClearMessages={handleClearMessages}
      />
    </div>
  );
}
