import {
  useCallback,
  useEffect,
  useRef,
  type ClipboardEvent,
  type DragEvent,
  type KeyboardEvent,
} from "react";
import ModelSelector from "../ModelSelector";
import Tooltip from "../Tooltip";
import AttachmentPreview from "./AttachmentPreview";
import ChatModeSelector from "./ChatModeSelector";
import SlashCommandMenu from "./SlashCommandMenu";
import type { ChatAttachment } from "../../shared/chatAttachments";
import type { ChatMode } from "../../shared/chatMode";
import type { SlashCommand } from "../../shared/slashCommands";
import {
  fileExtFromName,
  formatFileSize,
  isImageExt,
} from "../../shared/chatAttachments";
import { isSupportedFileName } from "../../shared/chatMessages";
import "./ChatInputBar.css";

const api = window.electronAPI;
const MAX_INPUT_HEIGHT = 160;

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
  onSend: () => void;
  onStop: () => void;
  onClearContext: () => void;
  onClearMessages: () => void;
  onCompact: () => void;
  slashCommands?: SlashCommand[];
  onSlashCommand?: (cmd: SlashCommand) => void;
}

export default function ChatInputBar({
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
  onSend,
  onStop,
  onClearContext,
  onClearMessages,
  onCompact,
  slashCommands,
  onSlashCommand,
}: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const selectingRef = useRef(false);
  const capturingRef = useRef(false);
  const slashHostRef = useRef<HTMLDivElement>(null);

  const showSlashMenu =
    !streaming &&
    input.trimStart().startsWith("/") &&
    !input.includes("\n") &&
    !!slashCommands?.length;

  const slashQuery = showSlashMenu ? input.trimStart().slice(1) : "";

  useEffect(() => {
    if (!showSlashMenu) return;
    const onDocClick = (e: MouseEvent) => {
      if (slashHostRef.current && !slashHostRef.current.contains(e.target as Node)) {
        onSlashCommand?.(null as unknown as SlashCommand);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [showSlashMenu, onSlashCommand]);

  const adjustHeight = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, MAX_INPUT_HEIGHT)}px`;
  }, []);

  useEffect(() => {
    adjustHeight();
  }, [input, attachments.length, adjustHeight]);

  const addAttachments = useCallback(
    (files: ChatAttachment[]) => {
      if (files.length === 0) return;
      const supported = files.filter((f) => f.kind !== "other");
      if (supported.length < files.length) {
        alert("部分文件格式不支持，仅支持文本文件与常见图片格式。");
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

  const handleSelectFiles = useCallback(async () => {
    if (selectingRef.current || streaming) return;
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
  }, [addAttachments, streaming]);

  const handleScreenshot = useCallback(async () => {
    if (capturingRef.current || streaming) return;
    capturingRef.current = true;
    try {
      await api.invoke("screenshot:capture_to_chat");
    } catch (e) {
      console.error(e);
    } finally {
      capturingRef.current = false;
    }
  }, [streaming]);

  const pathFromFile = (file: File): string | null => {
    const f = file as File & { path?: string };
    return f.path || null;
  };

  const handlePaste = useCallback(
    async (e: ClipboardEvent<HTMLTextAreaElement>) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      const filePaths: string[] = [];
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.kind !== "file") continue;
        const file = item.getAsFile();
        if (!file) continue;
        const filePath = pathFromFile(file);
        if (filePath) {
          if (isSupportedFileName(file.name)) {
            filePaths.push(filePath);
          }
          continue;
        }
        if (isImageExt(fileExtFromName(file.name))) {
          e.preventDefault();
          alert("请使用「附加文件」选择本地图片，或拖拽文件到输入框。");
          return;
        }
      }

      if (filePaths.length === 0) return;
      e.preventDefault();
      try {
        const loaded = await Promise.all(
          filePaths.map(async (filePath) => {
            const meta = (await api.invoke(
              "file:stat_path",
              filePath,
            )) as ChatAttachment;
            return {
              ...meta,
              id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            };
          }),
        );
        addAttachments(loaded);
      } catch (err) {
        alert(err instanceof Error ? err.message : "无法读取粘贴的文件");
      }
    },
    [addAttachments],
  );

  const handleDrop = useCallback(
    async (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      if (streaming) return;

      const paths: string[] = [];
      if (e.dataTransfer.files?.length) {
        for (const file of Array.from(e.dataTransfer.files)) {
          const filePath = pathFromFile(file);
          if (filePath && isSupportedFileName(file.name)) {
            paths.push(filePath);
          }
        }
      }

      if (paths.length === 0) return;

      try {
        const loaded = await Promise.all(
          paths.map(async (filePath) => {
            const meta = (await api.invoke(
              "file:stat_path",
              filePath,
            )) as ChatAttachment;
            return {
              ...meta,
              id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            };
          }),
        );
        addAttachments(loaded);
      } catch (err) {
        alert(err instanceof Error ? err.message : "无法读取拖拽的文件");
      }
    },
    [addAttachments, streaming],
  );

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (showSlashMenu) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Enter" || e.key === "Escape" || e.key === "Tab") {
        e.preventDefault();
      }
      return;
    }
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      if (!streaming) onSend();
    }
  };

  const canSend =
    !streaming && (input.trim().length > 0 || attachments.length > 0);

  return (
    <div
      className="chat-input-shell"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
    >
      <AttachmentPreview
        files={attachments}
        onRemove={(id) =>
          onAttachmentsChange(attachments.filter((f) => f.id !== id))
        }
      />

      <div className="chat-input-toolbar">
        <div className="chat-input-tools-left">
          <Tooltip tip={"上传文件"}>
            <button
              type="button"
              className="chat-tool-btn"
              onClick={handleSelectFiles}
              disabled={streaming}
            >
              <PaperclipIcon />
            </button>
          </Tooltip>
          <Tooltip tip={"区域截图\nEsc 取消"}>
            <button
              type="button"
              className="chat-tool-btn"
              onClick={handleScreenshot}
              disabled={streaming}
            >
              <CameraIcon />
            </button>
          </Tooltip>
          <Tooltip tip={"清除上下文\n后续消息不再引用此前对话"}>
            <button
              type="button"
              className="chat-tool-btn"
              onClick={onClearContext}
              disabled={streaming || !hasMessages}
            >
              <EraserIcon />
            </button>
          </Tooltip>
          <Tooltip tip={"压缩上下文\nAI 总结摘要后自动清除旧对话"}>
            <button
              type="button"
              className="chat-tool-btn"
              onClick={onCompact}
              disabled={streaming || !hasMessages}
            >
              <CompactIcon />
            </button>
          </Tooltip>
          <Tooltip tip={"清空消息\n删除当前会话全部消息"}>
            <button
              type="button"
              className="chat-tool-btn chat-tool-btn-danger"
              onClick={onClearMessages}
              disabled={streaming || !hasMessages}
            >
              <ClearIcon />
            </button>
          </Tooltip>
          {showModeSelector && (
            <ChatModeSelector
              mode={chatMode}
              onChange={onChatModeChange}
              disabled={streaming}
            />
          )}
        </div>

        <div className="chat-input-model">
          <ModelSelector
            models={models}
            value={modelName}
            onChange={onModelChange}
            allowCustom={false}
            modelLabels={modelLabels}
            disabled={streaming}
          />
        </div>
      </div>

      <div className="chat-input-row" ref={slashHostRef} style={{ position: "relative" }}>
        {showSlashMenu && slashCommands && onSlashCommand && (
          <SlashCommandMenu
            commands={slashCommands}
            query={slashQuery}
            onSelect={onSlashCommand}
            onClose={() => onSlashCommand(null as unknown as SlashCommand)}
          />
        )}
        <textarea
          ref={textareaRef}
          rows={1}
          placeholder={streaming ? "生成中…" : "输入消息，可拖拽或粘贴文件…"}
          value={input}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          disabled={streaming}
          autoFocus
        />
        {streaming ? (
          <Tooltip tip="停止生成" placement="bottom">
            <button
              type="button"
              className="chat-send-btn chat-stop-btn"
              onClick={onStop}
            >
              停止
            </button>
          </Tooltip>
        ) : (
          <Tooltip tip="发送消息 (Enter)" placement="bottom">
            <button
              type="button"
              className="chat-send-btn"
              onClick={onSend}
              disabled={!canSend}
            >
              发送
            </button>
          </Tooltip>
        )}
      </div>

      <p className="chat-input-hint">
        Enter 发送 · Shift+Enter 换行 · 输入 / 唤出快捷指令 · 支持拖拽/粘贴文件
        {attachments.length > 0 &&
          ` · 已附加 ${attachments.length} 个文件 (${formatFileSize(attachments.reduce((s, f) => s + f.size, 0))})`}
      </p>
    </div>
  );
}
