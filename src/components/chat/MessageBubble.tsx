import { useState } from "react";
import type { ChatMsg } from "../../shared/chatMessages";
import ChatMarkdown from "./ChatMarkdown";

export function formatMsgTime(ts?: number): string {
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

export interface MessageBubbleProps {
  msg: ChatMsg;
  streaming: boolean;
  isStreamingTarget: boolean;
  invalidAttachmentPaths: Set<string>;
  onRetry?: (msgId: string) => void;
  onDelete?: (msgId: string) => void;
  onEditResend?: (msgId: string, newContent: string) => void;
}

export default function MessageBubble({
  msg,
  streaming,
  isStreamingTarget,
  invalidAttachmentPaths,
  onRetry,
  onDelete,
  onEditResend,
}: MessageBubbleProps) {
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState("");
  const isStreamingAssistant =
    streaming &&
    isStreamingTarget &&
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
        ) : isUser ? (
          <span className="msg-plain">{msg.content}</span>
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
