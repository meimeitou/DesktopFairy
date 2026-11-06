import { Button } from "@cherrystudio/ui";
import { Check, Copy, File, Flame, GitFork, Pencil, RefreshCw, Trash2, X } from "lucide-react";
import { memo, useEffect, useRef, useState, type KeyboardEvent } from "react";
import type { ChatMsg } from "../../shared/chatMessages";
import { formatMsgTime } from "../../shared/time";
import ChatMarkdown from "./ChatMarkdown";
import ThinkingBlock from "./ThinkingBlock";
import { KnowledgeCitations } from "../knowledge/KnowledgeCitations";
import { WebCitations } from "./WebCitations";
import type { KnowledgeCitation } from "../../shared/knowledge";

export interface MessageBubbleProps {
  msg: ChatMsg;
  isStreamingTarget: boolean;
  /** Topic-level stream; reasoning lives on the first assistant, not always the last. */
  streaming?: boolean;
  /** False while tools run or a later assistant is answering. */
  thinkingClockLive?: boolean;
  invalidAttachmentPaths: Set<string>;
  isEditing?: boolean;
  onRetry?: (msgId: string) => void;
  onStartEdit?: (msgId: string) => void;
  onFork?: (msgId: string) => void;
  onConfirmEdit?: (msgId: string, newText: string) => void;
  onCancelEdit?: () => void;
  onDelete?: (msgId: string) => void;
  onOpenCitation?: (citation: KnowledgeCitation) => void;
}

function MessageBubble({
  msg,
  isStreamingTarget,
  streaming = false,
  thinkingClockLive,
  invalidAttachmentPaths,
  isEditing = false,
  onRetry,
  onStartEdit,
  onConfirmEdit,
  onCancelEdit,
  onDelete,
  onFork,
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
                {invalidAttachmentPaths.has(a.path) ? (
                  <Flame size={12} />
                ) : (
                  <File size={12} />
                )}{" "}
                {a.name}
              </span>
            ))}
          </div>
        )}
        {showThinking && (
          <ThinkingBlock
            msg={msg}
            isStreaming={streaming}
            clockLive={thinkingClockLive}
          />
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
            citations={msg.webCitations}
          />
        )}
        {!isUser && !isEditing && (
          <>
            {msg.knowledgeWarning && (
              <div
                className="msg-knowledge-warning"
                style={{
                  fontSize: 11,
                  marginTop: 4,
                  padding: "2px 6px",
                  borderRadius: 4,
                  background: "var(--amber-soft)",
                  color: "var(--amber)",
                }}
                title={msg.knowledgeWarning}
              >
                <Flame size={13} /> {msg.knowledgeWarning}
              </div>
            )}
            <KnowledgeCitations
              citations={msg.knowledgeCitations}
              onOpen={onOpenCitation}
            />
            <WebCitations citations={msg.webCitations} />
          </>
        )}
        {isEditing ? (
          <div className="msg-actions msg-actions-visible">
            <Button variant="ghost" size="sm" className="msg-action-btn msg-action-confirm" onClick={() => onConfirmEdit?.(msg.id, editDraft)} disabled={!canConfirmEdit} title="确认"><Check size={13} /></Button>
            <Button variant="ghost" size="sm" className="msg-action-btn" onClick={() => onCancelEdit?.()} title="取消"><X size={13} /></Button>
          </div>
        ) : (showUserActions || showAssistantActions) ? (
          <div className="msg-actions">
            <Button variant="ghost" size="sm" className="msg-action-btn" onClick={handleCopy} title="复制">{copied ? <Check size={16} /> : <Copy size={16} />}</Button>
            {onFork && (
              <Button variant="ghost" size="sm" className="msg-action-btn" onClick={() => onFork(msg.id)} title="从此处分叉新对话"><GitFork size={16} /></Button>
            )}
            {isUser && onRetry && (
            <Button variant="ghost" size="sm" className="msg-action-btn" onClick={() => onRetry(msg.id)} title="重试"><RefreshCw size={13} /></Button>
            )}
            {isUser && onStartEdit && (
              <Button variant="ghost" size="sm" className="msg-action-btn" onClick={beginEdit} title="重新编辑"><Pencil size={13} /></Button>
            )}
            {onDelete && (
              <Button variant="outline" size="sm" className="msg-action-btn msg-action-delete" onClick={() => onDelete(msg.id)} title="删除"><Trash2 size={13} /></Button>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default memo(MessageBubble);
