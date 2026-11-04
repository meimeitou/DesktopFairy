import {
  memo,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ClipboardEvent,
  type DragEvent,
  type KeyboardEvent,
} from "react";
import { useSlashCommandMenu } from "../../hooks/useSlashCommandMenu";
import { useComposerOverlay } from "../../hooks/useComposerOverlay";
import { Button, Icon, Notification, Tooltip } from "animal-island-ui";
import { CompactIcon, EraserIcon, SendIcon, StopIcon, UploadIcon } from "../icons/naivePatch";
import AttachmentPreview from "./AttachmentPreview";
import ChatModeSelector from "./ChatModeSelector";
import ContextUsageMeter from "./ContextUsageMeter";
import ReasoningEffortSelector from "./ReasoningEffortSelector";
import SlashCommandMenu from "./SlashCommandMenu";
import {
  collectDataTransferFiles,
  dataTransferHasFiles,
  guessAttachmentFileName,
  type ChatAttachment,
} from "../../shared/chatAttachments";
import type { ChatMode } from "../../shared/chatMode";
import type { ReasoningEffort } from "../../shared/reasoningEffort";
import type { SlashCommand } from "../../shared/slashCommands";
import { isSupportedFileName } from "../../shared/chatMessages";
import type { ContextUsageResult } from "../../shared/contextUsage";
import ComposerQuickMenu from "./ComposerQuickMenu";
import ComposerBusyHalo from "./ComposerBusyHalo";
import "./ChatInputBar.css";

const api = window.electronAPI;
const MAX_INPUT_HEIGHT = 160;
const UNSUPPORTED_FILES_HINT =
  "部分文件格式不支持，仅支持文本文件与常见图片格式。";

interface Props {
  input: string;
  onInputChange: (value: string) => void;
  attachments: ChatAttachment[];
  onAttachmentsChange: (files: ChatAttachment[]) => void;
  streaming: boolean;
  hasMessages: boolean;
  chatMode: ChatMode;
  onChatModeChange: (mode: ChatMode) => void;
  showModeSelector?: boolean;
  reasoningEffort: ReasoningEffort;
  onReasoningEffortChange: (value: ReasoningEffort) => void;
  onSend: () => void;
  onStop: () => void;
  /** 基于当前智能体新建对话；终端侧不传 */
  onNewConversation?: () => void;
  onClearContext?: () => void;
  onClearMessages?: () => void;
  onCompact?: () => void;
  /** Hide upload/screenshot/preview (conversations with no local file semantics). */
  attachmentsEnabled?: boolean;
  slashCommands?: SlashCommand[];
  onSlashCommand?: (cmd: SlashCommand) => void;
  /** 递增时把焦点收回输入框（划词预填后使用） */
  focusSignal?: number;
  /** 正在编辑上方用户消息时锁定输入栏 */
  editingMessage?: boolean;
  /** Context window usage for the meter left of model selector */
  contextUsage?: ContextUsageResult | null;
  knowledgeBaseIds?: string[];
  onKnowledgeBaseIdsChange?: (ids: string[]) => void;
}

function ChatInputBar({
  input,
  onInputChange,
  attachments,
  onAttachmentsChange,
  streaming,
  hasMessages,
  chatMode,
  onChatModeChange,
  showModeSelector = true,
  reasoningEffort,
  onReasoningEffortChange,
  onSend,
  onStop,
  onNewConversation,
  onClearContext,
  onClearMessages,
  onCompact,
  attachmentsEnabled = true,
  slashCommands,
  onSlashCommand,
  focusSignal,
  editingMessage = false,
  contextUsage,
  knowledgeBaseIds,
  onKnowledgeBaseIdsChange,
}: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dockRef = useRef<HTMLDivElement>(null);
  const selectingRef = useRef(false);
  const capturingRef = useRef(false);
  const dragDepthRef = useRef(0);
  const [dragOver, setDragOver] = useState(false);

  useComposerOverlay(dockRef);

  const composerDisabled = streaming || editingMessage;
  const {
    open: showSlashMenu,
    query: slashQuery,
    hostRef: slashHostRef,
    close: closeSlashMenu,
  } = useSlashCommandMenu(
    input,
    composerDisabled || !onSlashCommand,
    slashCommands,
  );

  const adjustHeight = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, MAX_INPUT_HEIGHT)}px`;
  }, []);

  useEffect(() => {
    adjustHeight();
  }, [input, attachments.length, adjustHeight]);

  // 划词预填后收回焦点到输入框（autoFocus 只在首次挂载生效，已挂载窗口需手动聚焦）
  useEffect(() => {
    if (!focusSignal) return;
    const el = textareaRef.current;
    if (!el) return;
    const t = setTimeout(() => {
      el.focus();
      const len = el.value.length;
      el.setSelectionRange(len, len);
    }, 0);
    return () => clearTimeout(t);
  }, [focusSignal]);

  const addAttachments = useCallback(
    (files: ChatAttachment[]) => {
      if (!attachmentsEnabled || files.length === 0) return;
      const supported = files.filter((f) => f.kind !== "other");
      if (supported.length < files.length) {
        Notification.warning(UNSUPPORTED_FILES_HINT);
      }
      if (supported.length === 0) return;
      const existing = new Set(attachments.map((f) => f.path));
      const next = [...attachments];
      for (const f of supported) {
        if (!existing.has(f.path)) next.push(f);
      }
      onAttachmentsChange(next);
    },
    [attachments, attachmentsEnabled, onAttachmentsChange],
  );

  const resolvePathForFile = (file: File): string => {
    try {
      const fromApi = api.getPathForFile?.(file);
      if (fromApi) return fromApi;
    } catch {
      /* Electron <32 fallback below */
    }
    return (file as File & { path?: string }).path || "";
  };

  const attachmentsFromFiles = useCallback(async (files: File[]) => {
    const attachable = files.filter((file) =>
      isSupportedFileName(guessAttachmentFileName(file)),
    );
    if (files.length > 0 && attachable.length === 0) {
      Notification.warning(UNSUPPORTED_FILES_HINT);
      return [];
    }
    if (attachable.length < files.length) {
      Notification.warning(UNSUPPORTED_FILES_HINT);
    }

    return Promise.all(
      attachable.map(async (file) => {
        const displayName = guessAttachmentFileName(file);
        const filePath = resolvePathForFile(file);
        if (filePath) {
          const meta = (await api.invoke(
            "file:stat_path",
            filePath,
          )) as ChatAttachment;
          return {
            ...meta,
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          };
        }
        const bytes = new Uint8Array(await file.arrayBuffer());
        return (await api.invoke("file:save_temp", {
          name: displayName,
          bytes,
        })) as ChatAttachment;
      }),
    );
  }, []);

  const handleSelectFiles = useCallback(async () => {
    if (selectingRef.current || composerDisabled) return;
    selectingRef.current = true;
    try {
      const picked = (await api.invoke("file:select")) as
        ChatAttachment[] | null;
      if (picked?.length) addAttachments(picked);
    } catch (e) {
      console.error(e);
    } finally {
      selectingRef.current = false;
    }
  }, [addAttachments, composerDisabled]);

  const handleScreenshot = useCallback(async () => {
    if (capturingRef.current || composerDisabled) return;
    capturingRef.current = true;
    try {
      await api.invoke("screenshot:capture_to_chat");
    } catch (e) {
      console.error(e);
    } finally {
      capturingRef.current = false;
    }
  }, [composerDisabled]);

  const handlePaste = useCallback(
    async (e: ClipboardEvent<HTMLTextAreaElement>) => {
      if (composerDisabled) return;
      const files = collectDataTransferFiles(e.clipboardData);
      if (files.length === 0) return;
      e.preventDefault();
      try {
        const loaded = await attachmentsFromFiles(files);
        addAttachments(loaded);
      } catch (err) {
        Notification.error(
          err instanceof Error ? err.message : "无法读取粘贴的文件",
        );
      }
    },
    [addAttachments, attachmentsFromFiles, composerDisabled],
  );

  const clearDragOver = () => {
    dragDepthRef.current = 0;
    setDragOver(false);
  };

  const handleDragEnter = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (composerDisabled || !dataTransferHasFiles(e.dataTransfer?.types))
      return;
    dragDepthRef.current += 1;
    setDragOver(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
    if (dragDepthRef.current === 0) setDragOver(false);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (composerDisabled || !dataTransferHasFiles(e.dataTransfer?.types))
      return;
    e.dataTransfer.dropEffect = "copy";
  };

  const handleDrop = useCallback(
    async (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      clearDragOver();
      if (composerDisabled) return;

      const files = collectDataTransferFiles(e.dataTransfer);
      if (files.length === 0) return;

      try {
        const loaded = await attachmentsFromFiles(files);
        addAttachments(loaded);
      } catch (err) {
        Notification.error(
          err instanceof Error ? err.message : "无法读取拖拽的文件",
        );
      }
    },
    [addAttachments, attachmentsFromFiles, composerDisabled],
  );

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (showSlashMenu) {
      if (
        e.key === "ArrowDown" ||
        e.key === "ArrowUp" ||
        e.key === "Enter" ||
        e.key === "Escape" ||
        e.key === "Tab"
      ) {
        e.preventDefault();
      }
      return;
    }
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      if (!composerDisabled) onSend();
    }
  };

  const canSend =
    !composerDisabled && (input.trim().length > 0 || attachments.length > 0);

  const placeholder = editingMessage
    ? "正在编辑上方消息…"
    : streaming
      ? "生成中…"
      : "输入消息，可拖拽或粘贴文件…";

  return (
    <div
      ref={dockRef}
      className={`chat-input-dock${streaming ? " is-busy" : ""}${dragOver ? " is-drop-target" : ""}`}
      aria-busy={streaming}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
    >
      <ComposerBusyHalo />
      {dragOver && (
        <div className="chat-input-drop-mask" aria-hidden>
          松开以添加文件
        </div>
      )}
      <AttachmentPreview
        files={attachmentsEnabled ? attachments : []}
        onRemove={(id) =>
          onAttachmentsChange(attachments.filter((f) => f.id !== id))
        }
      />

      <div className="chat-input-editor" ref={slashHostRef}>
        {showSlashMenu && slashCommands && onSlashCommand && (
          <SlashCommandMenu
            commands={slashCommands}
            query={slashQuery}
            onSelect={onSlashCommand}
            onClose={closeSlashMenu}
          />
        )}
        <textarea
          ref={textareaRef}
          rows={1}
          placeholder={placeholder}
          value={input}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          disabled={composerDisabled}
          autoFocus
        />
      </div>

      <div className="chat-input-toolbar">
        <div className="chat-input-tools-left">
          {onNewConversation && (
            <Tooltip title="新建对话">
              <Button
                type="text"
                size="small"
                className="chat-tool-btn"
                icon={<Icon name="Chat" size={16} />}
                onClick={onNewConversation}
                disabled={composerDisabled}
                aria-label="新建对话"
              />
            </Tooltip>
          )}
          {onClearContext && (
            <Tooltip title={"清除上下文"}>
              <Button
                type="text"
                size="small"
                className="chat-tool-btn"
                icon={<Icon icon={EraserIcon} size={16} />}
                onClick={onClearContext}
                disabled={composerDisabled || !hasMessages}
              />
            </Tooltip>
          )}
          {showModeSelector && (
            <ChatModeSelector
              mode={chatMode}
              onChange={onChatModeChange}
              disabled={composerDisabled}
            />
          )}
          <ComposerQuickMenu
            disabled={composerDisabled}
            actions={[
              ...(attachmentsEnabled
                ? [
                    {
                      key: "upload",
                      label: "上传文件",
                      icon: <Icon icon={UploadIcon} size={16} />,
                      disabled: composerDisabled,
                      onSelect: () => void handleSelectFiles(),
                    },
                    {
                      key: "screenshot",
                      label: "区域截图",
                      icon: <Icon name="Camera" size={16} />,
                      disabled: composerDisabled,
                      onSelect: () => void handleScreenshot(),
                    },
                  ]
                : []),
              ...(onCompact
                ? [
                    {
                      key: "compact",
                      label: "压缩上下文",
                      icon: <Icon icon={CompactIcon} size={16} />,
                      disabled: composerDisabled || !hasMessages,
                      onSelect: onCompact,
                    },
                  ]
                : []),
              ...(onClearMessages
                ? [
                    {
                      key: "clear",
                      label: "清空消息",
                      icon: <Icon name="Trash" size={16} />,
                      disabled: composerDisabled || !hasMessages,
                      danger: true,
                      onSelect: onClearMessages,
                    },
                  ]
                : []),
            ]}
            knowledge={
              onKnowledgeBaseIdsChange
                ? {
                    selectedIds: knowledgeBaseIds || [],
                    onChange: onKnowledgeBaseIdsChange,
                  }
                : undefined
            }
          />
        </div>

        <div className="chat-input-toolbar-right">
          {showModeSelector && (
            <ReasoningEffortSelector
              value={reasoningEffort}
              onChange={onReasoningEffortChange}
              disabled={composerDisabled}
            />
          )}
          {contextUsage && (
            <ContextUsageMeter
              usage={contextUsage}
              disabled={composerDisabled}
            />
          )}
          {streaming ? (
            <Tooltip title="停止生成" placement="top">
              <Button
                type="text"
                className="chat-send-btn chat-stop-btn"
                icon={<Icon icon={StopIcon} size={16} />}
                onClick={onStop}
                aria-label="停止生成"
              />
            </Tooltip>
          ) : (
            <Tooltip title="发送消息 (Enter)" placement="top">
              <Button
                type="text"
                className="chat-send-btn"
                icon={<Icon icon={SendIcon} size={16} />}
                onClick={onSend}
                disabled={!canSend}
                aria-label="发送消息"
              />
            </Tooltip>
          )}
        </div>
      </div>
    </div>
  );
}

export default memo(ChatInputBar);
