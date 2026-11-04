import { Button, Icon } from "animal-island-ui";
import { CopyIcon, ForkIcon } from "../icons/naivePatch";
import { memo, useEffect, useRef, useState, type KeyboardEvent } from "react";
import type { ChatMsg } from "../../shared/chatMessages";
import { formatMsgTime } from "../../shared/time";
import ChatMarkdown from "./ChatMarkdown";
import ThinkingBlock from "./ThinkingBlock";
import { KnowledgeCitations } from "../knowledge/KnowledgeCitations";
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
                  <Icon name="Flame" size={12} />
                ) : (
                  <Icon name="File" size={12} />
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
                  background: "rgba(245, 195, 28, 0.15)",
                  color: "var(--amber)",
                }}
                title={msg.knowledgeWarning}
              >
                <Icon name="Flame" size={13} /> {msg.knowledgeWarning}
              </div>
            )}
            <KnowledgeCitations
              citations={msg.knowledgeCitations}
              onOpen={onOpenCitation}
            />
          </>
        )}
        {isEditing ? (
          <div className="msg-actions msg-actions-visible">
            <Button
              type="text"
              size="small"
              className="msg-action-btn msg-action-confirm"
              icon={<Icon name="Check" size={13} />}
              onClick={() => onConfirmEdit?.(msg.id, editDraft)}
              disabled={!canConfirmEdit}
              title="确认"
            />
            <Button
              type="text"
              size="small"
              className="msg-action-btn"
              icon={<Icon name="Close" size={13} />}
              onClick={() => onCancelEdit?.()}
              title="取消"
            />
          </div>
        ) : (showUserActions || showAssistantActions) ? (
          <div className="msg-actions">
            <Button
              type="text"
              size="small"
              className="msg-action-btn"
              icon={copied ? <Icon name="Check" size={13} /> : <Icon icon={CopyIcon} size={13} />}
              onClick={handleCopy}
              title="复制"
            />
            {onFork && (
              <Button
                type="text"
                size="small"
                className="msg-action-btn"
                icon={<Icon icon={ForkIcon} size={13} />}
                onClick={() => onFork(msg.id)}
                title="从此处分叉新对话"
              />
            )}
            {isUser && onRetry && (
            <Button
              type="text"
              size="small"
              className="msg-action-btn"
              icon={<Icon name="Refresh" size={13} />}
              onClick={() => onRetry(msg.id)}
              title="重试"
            />
            )}
            {isUser && onStartEdit && (
              <Button
                type="text"
                size="small"
                className="msg-action-btn"
                icon={<Icon name="Edit" size={13} />}
                onClick={beginEdit}
                title="重新编辑"
              />
            )}
            {onDelete && (
              <Button
                type="default"
                size="small"
                danger
                className="msg-action-btn msg-action-delete"
                icon={<Icon name="Trash" size={13} />}
                onClick={() => onDelete(msg.id)}
                title="删除"
              />
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default memo(MessageBubble);
