import {
  forwardRef,
  memo,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import type { ChatMsg } from "../../shared/chatMessages";
import { findLastAssistantReplyIndex } from "../../shared/chatMessages";
import MessageBubble from "./MessageBubble";
import ToolCallBubble, { ToolCallGroup } from "./ToolCallBubble";
import {
  buildMessageListItems,
  messageListStickKey,
  reuseStableMessageListItems,
  type MessageListItem,
} from "./messageListItems";

const BOTTOM_THRESHOLD = 48;
const EMPTY_SET = new Set<string>();

function ContextClearDivider() {
  return (
    <div className="msg-context-clear" role="separator">
      <span>上下文已清除</span>
    </div>
  );
}

export type MessageListHandle = {
  scrollToBottom: () => void;
  getContainer: () => HTMLDivElement | null;
};

export interface MessageListProps {
  messages: ChatMsg[];
  streaming: boolean;
  invalidAttachmentPaths?: Set<string>;
  emptyContent?: ReactNode;
  className?: string;
  alwaysAllowLabel?: string;
  onApprove?: (approvalId: string) => void;
  onDeny?: (approvalId: string) => void;
  onAlwaysAllow?: (approvalId: string) => void;
  submittingApprovalId?: string | null;
  onRetry?: (msgId: string) => void;
  onDelete?: (msgId: string) => void;
}

const MessageList = forwardRef<MessageListHandle, MessageListProps>(
  function MessageList(
    {
      messages,
      streaming,
      invalidAttachmentPaths = EMPTY_SET,
      emptyContent,
      className = "chat-messages",
      alwaysAllowLabel,
      onApprove,
      onDeny,
      onAlwaysAllow,
      submittingApprovalId,
      onRetry,
      onDelete,
    },
    ref,
  ) {
    const parentRef = useRef<HTMLDivElement>(null);
    const isAtBottomRef = useRef(true);
    const lastApprovalKeyRef = useRef<string | null>(null);
    const prevItemsRef = useRef<MessageListItem[] | null>(null);

    const items = useMemo(() => {
      const built = buildMessageListItems(messages);
      const stable = reuseStableMessageListItems(built, prevItemsRef.current);
      prevItemsRef.current = stable;
      return stable;
    }, [messages]);

    // Include streaming so plain→markdown height change after stream end re-pins bottom.
    const stickKey = `${messageListStickKey(messages)}:${streaming ? 1 : 0}`;

    const streamingAssistantId = useMemo(() => {
      if (!streaming) return null;
      const idx = findLastAssistantReplyIndex(messages);
      return idx >= 0 ? messages[idx].id : null;
    }, [messages, streaming]);

    // Narrow approval key so the effect does not re-run every stream frame.
    const approvalInfo = useMemo(() => {
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.kind !== "tools") continue;
        const waiting = item.tools.filter(
          (t) => t.toolStatus === "awaiting_approval" && t.toolApprovalId,
        );
        if (waiting.length > 0) {
          return {
            index: i,
            key: waiting.map((t) => t.toolApprovalId).join(","),
          };
        }
      }
      return null;
    }, [items]);

    const virtualizer = useVirtualizer({
      count: items.length,
      getScrollElement: () => parentRef.current,
      estimateSize: (index) => {
        const item = items[index];
        if (!item) return 72;
        if (item.kind === "clear") return 36;
        if (item.kind === "tools") return 88 + item.tools.length * 48;
        return 72;
      },
      overscan: 6,
      getItemKey: (index) => items[index]?.id ?? index,
    });

    const pinToBottom = useCallback(() => {
      const el = parentRef.current;
      if (!el || items.length === 0) return;
      virtualizer.scrollToIndex(items.length - 1, { align: "end" });
      // Estimate may be short; pin again after layout/measure.
      requestAnimationFrame(() => {
        const node = parentRef.current;
        if (node) node.scrollTop = node.scrollHeight;
      });
    }, [items.length, virtualizer]);

    const scrollToBottom = useCallback(() => {
      isAtBottomRef.current = true;
      const el = parentRef.current;
      if (!el) return;
      if (items.length === 0) {
        el.scrollTop = el.scrollHeight;
        return;
      }
      pinToBottom();
    }, [items.length, pinToBottom]);

    useImperativeHandle(
      ref,
      () => ({
        scrollToBottom,
        getContainer: () => parentRef.current,
      }),
      [scrollToBottom],
    );

    const handleScroll = useCallback(() => {
      const el = parentRef.current;
      if (!el) return;
      isAtBottomRef.current =
        el.scrollTop + el.clientHeight >= el.scrollHeight - BOTTOM_THRESHOLD;
    }, []);

    useEffect(() => {
      if (!isAtBottomRef.current || items.length === 0) return;
      pinToBottom();
    }, [stickKey, items.length, pinToBottom]);

    // Scroll awaiting-approval cards into view (virtual rows must be scrolled first).
    useEffect(() => {
      if (!approvalInfo) {
        lastApprovalKeyRef.current = null;
        return;
      }
      if (lastApprovalKeyRef.current === approvalInfo.key) return;
      lastApprovalKeyRef.current = approvalInfo.key;
      isAtBottomRef.current = false;
      virtualizer.scrollToIndex(approvalInfo.index, { align: "center" });
      // Large tool groups: ensure the permission card itself is centered, not just the row.
      requestAnimationFrame(() => {
        const card = parentRef.current?.querySelector<HTMLElement>(
          "[data-tool-approval-id]",
        );
        card?.scrollIntoView({ block: "center", behavior: "smooth" });
      });
    }, [approvalInfo, virtualizer]);

    if (messages.length === 0) {
      return (
        <div className={className} ref={parentRef} onScroll={handleScroll}>
          {emptyContent}
        </div>
      );
    }

    const virtualItems = virtualizer.getVirtualItems();

    return (
      <div className={className} ref={parentRef} onScroll={handleScroll}>
        <div
          className="chat-messages-virtual-inner"
          style={{
            height: virtualizer.getTotalSize(),
            width: "100%",
            position: "relative",
          }}
        >
          {virtualItems.map((virtualRow) => {
            const item = items[virtualRow.index];
            if (!item) return null;
            return (
              <div
                key={virtualRow.key}
                data-index={virtualRow.index}
                ref={virtualizer.measureElement}
                className="chat-messages-virtual-row"
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                {item.kind === "clear" ? (
                  <ContextClearDivider />
                ) : item.kind === "tools" ? (
                  item.tools.length > 1 ? (
                    <ToolCallGroup
                      tools={item.tools}
                      onApprove={onApprove}
                      onDeny={onDeny}
                      onAlwaysAllow={onAlwaysAllow}
                      submittingApprovalId={submittingApprovalId}
                      alwaysAllowLabel={alwaysAllowLabel}
                    />
                  ) : (
                    <ToolCallBubble
                      msg={item.tools[0]}
                      onApprove={onApprove}
                      onDeny={onDeny}
                      onAlwaysAllow={onAlwaysAllow}
                      submittingApprovalId={submittingApprovalId}
                      alwaysAllowLabel={alwaysAllowLabel}
                    />
                  )
                ) : (
                  <MessageBubble
                    msg={item.msg}
                    isStreamingTarget={item.msg.id === streamingAssistantId}
                    invalidAttachmentPaths={invalidAttachmentPaths}
                    onRetry={
                      item.msg.role === "user" ? onRetry : undefined
                    }
                    onDelete={onDelete}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  },
);

export default memo(MessageList);
