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
import ModelSelector from "../ModelSelector";
import Tooltip from "../Tooltip";
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
import KnowledgePicker from "../knowledge/KnowledgePicker";
import ComposerBusyHalo from "./ComposerBusyHalo";
import "./ChatInputBar.css";

const api = window.electronAPI;
const MAX_INPUT_HEIGHT = 160;
const UNSUPPORTED_FILES_HINT =
  "部分文件格式不支持，仅支持文本文件与常见图片格式。";

function CameraIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  );
}

function PaperclipIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
    </svg>
  );
}

function EraserIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M20 20H7L3 16c-.8-.8-.8-2 0-2.8L14.6 1.6c.8-.8 2-.8 2.8 0l5 5c.8.8.8 2 0 2.8L11 20" />
      <path d="M6 11l7 7" />
    </svg>
  );
}

function ClearIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M19 6l-1 14H6L5 6" />
    </svg>
  );
}

function CompactIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="4" y1="4" x2="20" y2="4" />
      <line x1="4" y1="20" x2="20" y2="20" />
      <polyline points="9 9 12 12 15 9" />
      <polyline points="9 15 12 12 15 15" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M22 2L11 13" />
      <path d="M22 2l-7 20-4-9-9-4 20-7z" />
    </svg>
  );
}

function StopIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
    >
      <rect x="6" y="6" width="12" height="12" rx="2" />
    </svg>
  );
}

interface Props {
  input: string;
  onInputChange: (value: string) => void;
  attachments: ChatAttachment[];
  onAttachmentsChange: (files: ChatAttachment[]) => void;
  streaming: boolean;
  hasMessages: boolean;
  models: string[];
  modelName: string;
  onModelChange: (model: string) => void;
  modelLabels?: Record<string, string>;
  chatMode: ChatMode;
  onChatModeChange: (mode: ChatMode) => void;
  showModeSelector?: boolean;
  reasoningEffort: ReasoningEffort;
  onReasoningEffortChange: (value: ReasoningEffort) => void;
  onSend: () => void;
  onStop: () => void;
  onClearContext: () => void;
  onClearMessages: () => void;
  onCompact: () => void;
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
  models,
  modelName,
  onModelChange,
  modelLabels,
  chatMode,
  onChatModeChange,
  showModeSelector = true,
  reasoningEffort,
  onReasoningEffortChange,
  onSend,
  onStop,
  onClearContext,
  onClearMessages,
  onCompact,
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
      if (files.length === 0) return;
      const supported = files.filter((f) => f.kind !== "other");
      if (supported.length < files.length) {
        alert(UNSUPPORTED_FILES_HINT);
      }
      if (supported.length === 0) return;
      const existing = new Set(attachments.map((f) => f.path));
      const next = [...attachments];
      for (const f of supported) {
        if (!existing.has(f.path)) next.push(f);
      }
      onAttachmentsChange(next);
    },
    [attachments, onAttachmentsChange],
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
      alert(UNSUPPORTED_FILES_HINT);
      return [];
    }
    if (attachable.length < files.length) {
      alert(UNSUPPORTED_FILES_HINT);
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
        | ChatAttachment[]
        | null;
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
        alert(err instanceof Error ? err.message : "无法读取粘贴的文件");
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
    if (composerDisabled || !dataTransferHasFiles(e.dataTransfer?.types)) return;
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
    if (composerDisabled || !dataTransferHasFiles(e.dataTransfer?.types)) return;
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
        alert(err instanceof Error ? err.message : "无法读取拖拽的文件");
      }
    },
    [addAttachments, attachmentsFromFiles, composerDisabled],
  );

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (showSlashMenu) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Enter" || e.key === "Escape" || e.key === "Tab") {
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
          files={attachments}
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
            <Tooltip tip={"上传文件"}>
              <button
                type="button"
                className="chat-tool-btn"
                onClick={handleSelectFiles}
                disabled={composerDisabled}
              >
                <PaperclipIcon />
              </button>
            </Tooltip>
            <Tooltip tip={"区域截图"}>
              <button
                type="button"
                className="chat-tool-btn"
                onClick={handleScreenshot}
                disabled={composerDisabled}
              >
                <CameraIcon />
              </button>
            </Tooltip>
            {onKnowledgeBaseIdsChange && (
              <KnowledgePicker
                selectedIds={knowledgeBaseIds || []}
                onChange={onKnowledgeBaseIdsChange}
                disabled={composerDisabled}
              />
            )}
            <Tooltip tip={"清除上下文"}>
              <button
                type="button"
                className="chat-tool-btn"
                onClick={onClearContext}
                disabled={composerDisabled || !hasMessages}
              >
                <EraserIcon />
              </button>
            </Tooltip>
            <Tooltip tip={"压缩上下文"}>
              <button
                type="button"
                className="chat-tool-btn"
                onClick={onCompact}
                disabled={composerDisabled || !hasMessages}
              >
                <CompactIcon />
              </button>
            </Tooltip>
            <Tooltip tip={"清空消息"}>
              <button
                type="button"
                className="chat-tool-btn chat-tool-btn-danger"
                onClick={onClearMessages}
                disabled={composerDisabled || !hasMessages}
              >
                <ClearIcon />
              </button>
            </Tooltip>
            {showModeSelector && (
              <ChatModeSelector
                mode={chatMode}
                onChange={onChatModeChange}
                disabled={composerDisabled}
              />
            )}
            {showModeSelector && (
              <ReasoningEffortSelector
                value={reasoningEffort}
                onChange={onReasoningEffortChange}
                disabled={composerDisabled}
              />
            )}
          </div>

          <div className="chat-input-toolbar-right">
            {contextUsage && (
              <ContextUsageMeter
                usage={contextUsage}
                disabled={composerDisabled}
              />
            )}
            <div className="chat-input-model">
              <ModelSelector
                models={models}
                value={modelName}
                onChange={onModelChange}
                allowCustom={false}
                modelLabels={modelLabels}
                disabled={composerDisabled}
              />
            </div>
            {streaming ? (
              <Tooltip tip="停止生成" placement="top">
                <button
                  type="button"
                  className="chat-send-btn chat-stop-btn"
                  onClick={onStop}
                  aria-label="停止生成"
                >
                  <StopIcon />
                </button>
              </Tooltip>
            ) : (
              <Tooltip tip="发送消息 (Enter)" placement="top">
                <button
                  type="button"
                  className="chat-send-btn"
                  onClick={onSend}
                  disabled={!canSend}
                  aria-label="发送消息"
                >
                  <SendIcon />
                </button>
              </Tooltip>
            )}
          </div>
      </div>
    </div>
  );
}

export default memo(ChatInputBar);
