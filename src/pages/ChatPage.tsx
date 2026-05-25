import { useState, useEffect, useRef, useCallback, type MutableRefObject } from "react";
import ChatMarkdown from "../components/chat/ChatMarkdown";
import ChatInputBar from "../components/chat/ChatInputBar";
import type { ChatAttachment } from "../shared/chatAttachments";
import {
  type ChatMsg,
  buildApiMessages,
  filterForApi,
} from "../shared/chatMessages";
import {
  loadSettings,
  saveSettings,
  getSelectableModels,
  getActiveApiConfig,
  resolveModelNameForProvider,
  getActiveModelName,
  type AppSettings,
} from "../shared/settings";
import { getChatCompletionsUrl } from "../shared/providers";
import { notifyLive2DIfReactive } from "../shared/live2dReactions";
import "./ChatPage.css";

const api = window.electronAPI;

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
}: {
  msg: ChatMsg;
  streaming: boolean;
  isLast: boolean;
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
              <span key={a.id} className="msg-attachment-tag">
                📎 {a.name}
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
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const chatMessagesRef = useRef<ChatMsg[]>([]);
  const requestIdRef = useRef<string>("");
  const handleSendRef = useRef<(text?: string) => void>(() => {});

  const selectableModels = getSelectableModels(chatSettings);
  const activeModelName = getActiveModelName(chatSettings);

  useEffect(() => {
    chatMessagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    notifyLive2DIfReactive(loadSettings().live2dReactive, "chatOpen");
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
      notifyLive2DIfReactive(
        loadSettings().live2dReactive,
        "replyDone",
        assistantText
      );
    });

    const offError = api.onChatStreamError(({ requestId, message }) => {
      if (requestId !== requestIdRef.current) return;
      requestIdRef.current = "";
      setStreaming(false);
      notifyLive2DIfReactive(loadSettings().live2dReactive, "replyError");
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
    });

    return () => {
      offChunk?.();
      offDone?.();
      offError?.();
    };
  }, []);

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

      const history = filterForApi(messages);
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

      const reactive = loadSettings().live2dReactive;
      notifyLive2DIfReactive(reactive, "userSend");
      notifyLive2DIfReactive(reactive, "thinking");

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
          notifyLive2DIfReactive(loadSettings().live2dReactive, "replyError");
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
        });
    },
    [input, streaming, messages, attachments, loadAttachmentPayloads]
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
