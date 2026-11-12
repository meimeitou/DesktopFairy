import type { SelectedHost } from "../../shared/hostSelection";
import { Button, NormalTooltip, error, warning } from "@cherrystudio/ui";
import { Camera, CircleStop, Eraser, FoldVertical, MessageSquare, Send, Trash2, Upload } from "lucide-react";
import {
  memo,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ClipboardEvent,
  type DragEvent,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { useComposerOverlay } from "../../hooks/useComposerOverlay";

import AttachmentPreview from "./AttachmentPreview";
import ChatModeSelector from "./ChatModeSelector";
import ContextUsageMeter from "./ContextUsageMeter";
import ReasoningEffortSelector from "./ReasoningEffortSelector";
import SkillComposerEditor from "./SkillComposerEditor";
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
  awaitingInteraction?: boolean;
  interactionPanel?: ReactNode;
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
  selectedSkillIds?: string[];
  onSelectedSkillIdsChange?: (ids: string[]) => void;
  skillErrors?: Record<string, string>;
  selectedHosts?: SelectedHost[];
  onSelectedHostsChange?: (hosts: SelectedHost[]) => void;
  hostErrors?: Record<string, string>;
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
  awaitingInteraction = false,
  interactionPanel,
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
  selectedSkillIds,
  onSelectedSkillIdsChange,
  skillErrors,
  selectedHosts,
  onSelectedHostsChange,
  hostErrors,
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

  const composerDisabled = streaming || awaitingInteraction || editingMessage;
  const draftDisabled = editingMessage;
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
        warning(UNSUPPORTED_FILES_HINT);
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
      warning(UNSUPPORTED_FILES_HINT);
      return [];
    }
    if (attachable.length < files.length) {
      warning(UNSUPPORTED_FILES_HINT);
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
    if (selectingRef.current || draftDisabled) return;
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
  }, [addAttachments, draftDisabled]);

  const handleScreenshot = useCallback(async () => {
    if (capturingRef.current || draftDisabled) return;
    capturingRef.current = true;
    try {
      await api.invoke("screenshot:capture_to_chat");
    } catch (e) {
      console.error(e);
    } finally {
      capturingRef.current = false;
    }
  }, [draftDisabled]);

  const handlePaste = useCallback(
    async (e: ClipboardEvent<HTMLTextAreaElement>) => {
      if (draftDisabled) return;
      const files = collectDataTransferFiles(e.clipboardData);
      if (files.length === 0) return;
      e.preventDefault();
      try {
        const loaded = await attachmentsFromFiles(files);
        addAttachments(loaded);
      } catch (err) {
        error(
          err instanceof Error ? err.message : "无法读取粘贴的文件",
        );
      }
    },
    [addAttachments, attachmentsFromFiles, draftDisabled],
  );

  const clearDragOver = () => {
    dragDepthRef.current = 0;
    setDragOver(false);
  };

  const handleDragEnter = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (draftDisabled || !dataTransferHasFiles(e.dataTransfer?.types))
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
    if (draftDisabled || !dataTransferHasFiles(e.dataTransfer?.types))
      return;
    e.dataTransfer.dropEffect = "copy";
  };

  const handleDrop = useCallback(
    async (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      clearDragOver();
      if (draftDisabled) return;

      const files = collectDataTransferFiles(e.dataTransfer);
      if (files.length === 0) return;

      try {
        const loaded = await attachmentsFromFiles(files);
        addAttachments(loaded);
      } catch (err) {
        error(
          err instanceof Error ? err.message : "无法读取拖拽的文件",
        );
      }
    },
    [addAttachments, attachmentsFromFiles, draftDisabled],
  );

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      if (!draftDisabled) onSend();
    }
  };

  const canSend =
    !draftDisabled && (input.trim().length > 0 || (attachments.length > 0 && !selectedSkillIds?.length && !selectedHosts?.length));

  const placeholder = editingMessage
    ? "正在编辑上方消息…"
    : streaming
      ? "输入补充，下一步生效…"
      : awaitingInteraction
        ? "请先处理上方请求…"
        : "输入消息，@ 选择技能，可拖拽文件…";

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
      {interactionPanel}
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

      <div className="chat-input-editor">
        <SkillComposerEditor
          textareaRef={textareaRef} rows={1} placeholder={placeholder}
          input={input} onInputChange={onInputChange}
          commands={streaming ? [] : awaitingInteraction ? slashCommands?.filter((cmd) => cmd.group === "skill" || cmd.group === "host") : slashCommands} onCommand={onSlashCommand}
          selectedSkillIds={selectedSkillIds} onSelectedSkillIdsChange={onSelectedSkillIdsChange}
          selectedHosts={selectedHosts} onSelectedHostsChange={onSelectedHostsChange} hostErrors={hostErrors}
          skillErrors={skillErrors} onKeyDown={handleKeyDown} onPaste={handlePaste}
          disabled={draftDisabled} autoFocus
        />
      </div>

      <div className="chat-input-toolbar">
        <div className="chat-input-tools-left">
          {onNewConversation && (
            <NormalTooltip content="新建对话">
              <Button variant="ghost" size="sm" className="chat-tool-btn" onClick={onNewConversation} disabled={composerDisabled} aria-label="新建对话"><MessageSquare size={16} /></Button>
            </NormalTooltip>
          )}
          {onClearContext && (
            <NormalTooltip content="清除上下文">
              <Button variant="ghost" size="sm" className="chat-tool-btn" onClick={onClearContext} disabled={composerDisabled || !hasMessages}><Eraser size={16} /></Button>
            </NormalTooltip>
          )}
          {showModeSelector && (
            <ChatModeSelector
              mode={chatMode}
              onChange={onChatModeChange}
              disabled={composerDisabled}
            />
          )}
          <ComposerQuickMenu
            disabled={draftDisabled}
            actions={[
              ...(attachmentsEnabled
                ? [
                    {
                      key: "upload",
                      label: "上传文件",
                      icon: <Upload size={16} />,
                      disabled: draftDisabled,
                      onSelect: () => void handleSelectFiles(),
                    },
                    {
                      key: "screenshot",
                      label: "区域截图",
                      icon: <Camera size={16} />,
                      disabled: draftDisabled,
                      onSelect: () => void handleScreenshot(),
                    },
                  ]
                : []),
              ...(onCompact
                ? [
                    {
                      key: "compact",
                      label: "压缩上下文",
                      icon: <FoldVertical size={16} />,
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
                      icon: <Trash2 size={16} />,
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
          {streaming && <NormalTooltip content="发送补充 (Enter)" side="top">
            <Button variant="ghost" className="chat-send-btn" onClick={onSend} disabled={!canSend} aria-label="发送补充"><Send size={16} /></Button>
          </NormalTooltip>}
          {streaming ? (
            <NormalTooltip content="停止生成" side="top">
              <Button variant="ghost" className="chat-send-btn chat-stop-btn" onClick={onStop} aria-label="停止生成"><CircleStop size={16} /></Button>
            </NormalTooltip>
          ) : (
            <NormalTooltip content="发送消息 (Enter)" side="top">
              <Button variant="ghost" className="chat-send-btn" onClick={onSend} disabled={!canSend} aria-label="发送消息"><Send size={16} /></Button>
            </NormalTooltip>
          )}
        </div>
      </div>
    </div>
  );
}

export default memo(ChatInputBar);
