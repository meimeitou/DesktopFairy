import { memo, useEffect, useRef, useState, type KeyboardEvent } from "react";
import type { ChatMsg } from "../../shared/chatMessages";
import { formatMsgTime } from "../../shared/time";
import ChatMarkdown from "./ChatMarkdown";
import ThinkingBlock from "./ThinkingBlock";
import { KnowledgeCitations } from "../knowledge/KnowledgePicker";
import type { KnowledgeCitation } from "../../shared/knowledge";

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

function CloseIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

export interface MessageBubbleProps {
  msg: ChatMsg;
  isStreamingTarget: boolean;
  invalidAttachmentPaths: Set<string>;
  isEditing?: boolean;
  onRetry?: (msgId: string) => void;
  onStartEdit?: (msgId: string) => void;
  onConfirmEdit?: (msgId: string, newText: string) => void;
  onCancelEdit?: () => void;
  onDelete?: (msgId: string) => void;
  onOpenCitation?: (citation: KnowledgeCitation) => void;
}

function MessageBubble({
  msg,
  isStreamingTarget,
  invalidAttachmentPaths,
  isEditing = false,
  onRetry,
  onStartEdit,
  onConfirmEdit,
  onCancelEdit,
  onDelete,
  onOpenCitation,
}: MessageBubbleProps) {
  const [copied, setCopied] = useState(false);
  const [editDraft, setEditDraft] = useState(msg.content);
  const editTextareaRef = useRef<HTMLTextAreaElement>(null);

  const isStreamingAssistant =
    isStreamingTarget &&
    msg.role === "assistant" &&
    msg.type !== "tool" &&
    !msg.error;
  const isUser = msg.role === "user";
  const isError = msg.error;
  const hasAttachments = (msg.attachments?.length ?? 0) > 0;
  const canConfirmEdit =
    editDraft.trim().length > 0 || hasAttachments;

  const beginEdit = () => {
    setEditDraft(msg.content);
    onStartEdit?.(msg.id);
  };

  useEffect(() => {
    if (!isEditing) return;
    const el = editTextareaRef.current;
    if (!el) return;
    el.focus();
    el.setSelectionRange(el.value.length, el.value.length);
  }, [isEditing]);

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

  const handleEditKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Escape") {
      e.preventDefault();
      onCancelEdit?.();
      return;
    }
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      if (canConfirmEdit) onConfirmEdit?.(msg.id, editDraft);
    }
  };

  const showTyping =
    isStreamingAssistant && !msg.content && !msg.reasoning && !msg.error;
  const showThinking =
    !isUser && !isError && !!msg.reasoning && msg.reasoning.trim().length > 0;
  const showUserActions =
    isUser && !isError && !showTyping && (msg.content || hasAttachments);
  const showAssistantActions =
    !isUser && !isError && !showTyping && !!msg.content;

  return (
    <div className={`msg msg-${msg.role}${isError ? " msg-error" : ""}${isEditing ? " msg-editing" : ""}`}>
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
        {showThinking && (
          <ThinkingBlock msg={msg} isStreaming={isStreamingAssistant} />
        )}
        {isError ? (
          <span className="msg-plain">{msg.content}</span>
        ) : showTyping ? (
          <span className="msg-typing">
            <span />
            <span />
            <span />
          </span>
        ) : isEditing ? (
          <textarea
            ref={editTextareaRef}
            className="msg-edit-textarea"
            value={editDraft}
            onChange={(e) => setEditDraft(e.target.value)}
            onKeyDown={handleEditKeyDown}
            rows={3}
          />
        ) : isUser ? (
          <span className="msg-plain">{msg.content}</span>
        ) : (
          <ChatMarkdown
            content={msg.content}
            streaming={isStreamingAssistant}
          />
        )}
        {!isUser && !isEditing && (
          <KnowledgeCitations
            citations={msg.knowledgeCitations}
            onOpen={onOpenCitation}
          />
        )}
        {isEditing ? (
          <div className="msg-actions msg-actions-visible">
            <button
              type="button"
              className="msg-action-btn msg-action-confirm"
              onClick={() => onConfirmEdit?.(msg.id, editDraft)}
              disabled={!canConfirmEdit}
              title="确认"
            >
              <CheckIcon size={13} />
            </button>
            <button
              type="button"
              className="msg-action-btn"
              onClick={() => onCancelEdit?.()}
              title="取消"
            >
              <CloseIcon size={13} />
            </button>
          </div>
        ) : (showUserActions || showAssistantActions) ? (
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
            {isUser && onStartEdit && (
              <button
                type="button"
                className="msg-action-btn"
                onClick={beginEdit}
                title="重新编辑"
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
        ) : null}
      </div>
    </div>
  );
}

export default memo(MessageBubble);
