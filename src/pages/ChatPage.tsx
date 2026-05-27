import { useState, useEffect, useRef, useCallback, type MutableRefObject } from "react";
import ChatMarkdown from "../components/chat/ChatMarkdown";
import ChatInputBar from "../components/chat/ChatInputBar";
import type { ChatAttachment } from "../shared/chatAttachments";
import {
  type ChatMsg,
  buildApiMessages,
  filterForApi,
  trimMessagesForApi,
} from "../shared/chatMessages";
import {
  buildChatSession,
  normalizeChatSession,
  trimSessionForStorage,
  type ChatSession,
} from "../shared/chatSession";
import {
  loadSettings,
  saveSettings,
  getSelectableModels,
  getActiveApiConfig,
  getActiveModelName,
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

function MessageBubble({
  msg,
  streaming,
  isLast,
  invalidAttachmentPaths,
}: {
  msg: ChatMsg;
  streaming: boolean;
  isLast: boolean;
  invalidAttachmentPaths: Set<string>;
}) {
  const [copied, setCopied] = useState(false);
  const isStreamingAssistant =
    streaming && isLast && msg.role === "assistant" && !msg.error;

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

  const showTyping =
    isStreamingAssistant && !msg.content && !msg.error;

  return (
    <div className={`msg msg-${msg.role}${msg.error ? " msg-error" : ""}`}>
      <div className="msg-bubble">
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
        {msg.error ? (
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
        {!showTyping && msg.content && !msg.error && (
          <div className="msg-actions">
            <button
              type="button"
              className="msg-action-btn"
              onClick={handleCopy}
              title="复制消息"
            >
              {copied ? "已复制" : "复制"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

async function collectInvalidAttachmentPaths(
  messages: ChatMsg[]
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
    })
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
    () => new Set<string>()
  );
  const [sessionReady, setSessionReady] = useState(false);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const chatMessagesRef = useRef<ChatMsg[]>([]);
  const inputRef = useRef("");
  const attachmentsRef = useRef<ChatAttachment[]>([]);
  const requestIdRef = useRef<string>("");
  const handleSendRef = useRef<(text?: string) => void>(() => {});
  const sessionLoadedRef = useRef(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const selectableModels = getSelectableModels(chatSettings);
  const activeModelName = getActiveModelName(chatSettings);

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
        attachmentsRef.current
      )
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
        if (prev.length === 0) return prev;
        const next = prev.slice();
        const last = next[next.length - 1];
        if (last.role !== "assistant") return prev;
        next[next.length - 1] = { ...last, content: last.content + delta };
        return next;
      });
    });

    const offDone = api.onChatStreamDone(({ requestId }) => {
      if (requestId !== requestIdRef.current) return;
      requestIdRef.current = "";
      setStreaming(false);
      const list = chatMessagesRef.current;
      const last = list[list.length - 1];
      const assistantText =
        last?.role === "assistant" && !last.error ? last.content : undefined;
      notifyLive2DScene("replyDone", assistantText);
      flushSessionSave();
    });

    const offError = api.onChatStreamError(({ requestId, message }) => {
      if (requestId !== requestIdRef.current) return;
      requestIdRef.current = "";
      setStreaming(false);
      notifyLive2DScene("replyError");
      setMessages((prev) => {
        if (prev.length === 0) return prev;
        const next = prev.slice();
        const last = next[next.length - 1];
        if (last.role !== "assistant") return prev;
        next[next.length - 1] = {
          ...last,
          content: last.content || `请求失败：${message}`,
          error: true,
        };
        return next;
      });
      flushSessionSave();
    });

    return () => {
      offChunk?.();
      offDone?.();
      offError?.();
    };
  }, [flushSessionSave]);

  useEffect(() => {
    const el = messagesContainerRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages]);

  const handleModelChange = useCallback((modelName: string) => {
    const next = { ...loadSettings(), modelName };
    saveSettings(next);
    setChatSettings(next);
  }, []);

  const loadAttachmentPayloads = useCallback(async (files: ChatAttachment[]) => {
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
  }, []);

  const handleSend = useCallback(
    async (overrideText?: string) => {
      if (streaming) return;
      const text = (overrideText ?? input).trim();
      if (!text && attachments.length === 0) return;

      const settings = loadSettings();
      setChatSettings(settings);
      const apiConfig = getActiveApiConfig(settings);
      if (!apiConfig.apiHost || !apiConfig.modelName) {
        alert("请先在设置中配置服务商 API Host 和模型。");
        return;
      }

      let attachmentPayloads = { textFiles: [] as { name: string; text: string }[], images: [] as { name: string; dataUrl: string }[] };
      try {
        if (attachments.length > 0) {
          attachmentPayloads = await loadAttachmentPayloads(attachments);
        }
      } catch (e) {
        alert(e instanceof Error ? e.message : "读取附件失败");
        return;
      }

      const history = trimMessagesForApi(filterForApi(messages));
      const payloadMessages = buildApiMessages(
        history,
        text,
        attachmentPayloads,
        settings.systemPrompt
      );

      const userMsg: ChatMsg = {
        id: genId(),
        role: "user",
        content: text,
        attachments: attachments.length > 0 ? [...attachments] : undefined,
      };

      const requestId = genId();
      requestIdRef.current = requestId;
      setMessages([
        ...messages,
        userMsg,
        { id: genId(), role: "assistant", content: "" },
      ]);
      setInput("");
      setAttachments([]);
      setStreaming(true);

      notifyLive2DScene("userSend");
      notifyLive2DScene("thinking");

      api
        .invoke("chat:send", {
          requestId,
          messages: payloadMessages,
          chatUrl: getChatCompletionsUrl(apiConfig.apiHost, apiConfig.providerType),
          apiKey: apiConfig.apiKey,
          model: apiConfig.modelName,
          temperature: settings.temperature,
        })
        .catch((e: Error) => {
          if (requestIdRef.current !== requestId) return;
          requestIdRef.current = "";
          setStreaming(false);
          notifyLive2DScene("replyError");
          setMessages((prev) => {
            const next = prev.slice();
            const last = next[next.length - 1];
            if (!last || last.role !== "assistant") return prev;
            next[next.length - 1] = {
              ...last,
              content: `请求失败：${e.message || e}`,
              error: true,
            };
            return next;
          });
          flushSessionSave();
        });
    },
    [input, streaming, messages, attachments, loadAttachmentPayloads, flushSessionSave]
  );

  useEffect(() => {
    handleSendRef.current = (text?: string) => {
      void handleSend(text);
    };
  }, [handleSend]);

  const handleStop = useCallback(() => {
    const id = requestIdRef.current;
    if (!id) return;
    api.invoke("chat:abort", { requestId: id });
  }, []);

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
      { id: genId(), role: "user", type: "clear", content: "" },
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
      trimSessionForStorage(buildChatSession([], "", []))
    );
  }, [streaming, messages.length]);

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
          messages.map((m, i) =>
            m.type === "clear" ? (
              <ContextClearDivider key={m.id} />
            ) : (
              <MessageBubble
                key={m.id}
                msg={m}
                streaming={streaming}
                isLast={i === messages.length - 1}
                invalidAttachmentPaths={invalidAttachmentPaths}
              />
            )
          )
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
        modelName={activeModelName}
        onModelChange={handleModelChange}
        onSend={() => void handleSend()}
        onStop={handleStop}
        onClearContext={handleClearContext}
        onClearMessages={handleClearMessages}
      />
    </div>
  );
}
