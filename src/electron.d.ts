export {};

import type { ChatAttachment } from "./shared/chatAttachments";
import type { SpeechBubblePayload } from "./shared/speechBubble";
import type { McpRuntimeStatus, McpServerLogEntry } from "./shared/mcpServer";

declare global {
  interface Window {
    electronAPI: {
      invoke: (channel: string, ...args: unknown[]) => Promise<unknown>;
      windowGetSize: () => Promise<{ width: number; height: number } | null>;
      windowSetSize: (width: number, height: number) => Promise<void>;
      windowGetPosition: () => Promise<{ x: number; y: number } | null>;
      windowSetPosition: (x: number, y: number) => Promise<void>;
      screenGetCursorPoint: () => Promise<{ x: number; y: number }>;
      onChatPrefill: (
        callback: (payload: {
          text?: string;
          autoSend?: boolean;
          attachments?: ChatAttachment[];
        }) => void
      ) => void;
      onChatNavigate: (
        callback: (view: "chat" | "settings" | "terminal") => void
      ) => () => void;
      onSettingsUpdated: (
        callback: (settings: Record<string, unknown>) => void
      ) => () => void;
      onMainWindowLayoutChanged: (callback: () => void) => () => void;
      onChatWindowFullscreenChanged: (callback: (isFullscreen: boolean) => void) => () => void;
      onChatWindowMaximizedChanged: (callback: (isMaximized: boolean) => void) => () => void;
      getShortcut: () => Promise<string>;
      setShortcut: (shortcut: string) => Promise<boolean>;
      loadSettingsFromDisk: () => string | null;
      onLive2DCommand: (callback: (cmd: string) => void) => () => void;
      onLive2DBubble: (
        callback: (payload: SpeechBubblePayload | string) => void
      ) => () => void;
      onSelectionTipText: (
        callback: (payload: { text?: string }) => void
      ) => () => void;
      onSwitchModel: (callback: (modelPath: string) => void) => () => void;
      onChatStreamChunk: (
        callback: (payload: { requestId: string; delta?: string; reasoning?: string }) => void
      ) => () => void;
      onChatStreamDone: (
        callback: (payload: { requestId: string; aborted?: boolean }) => void
      ) => () => void;
      onChatStreamError: (
        callback: (payload: { requestId: string; message: string }) => void
      ) => () => void;
      onAgentStreamTool: (
        callback: (payload: {
          requestId: string;
          toolCallId?: string;
          toolName: string;
          toolArgs?: string;
          approvalId?: string;
          status:
            | "streaming"
            | "awaiting_approval"
            | "running"
            | "done"
            | "error"
            | "denied";
          message?: string;
          resultPreview?: string;
        }) => void
      ) => () => void;
      onMcpStatusChanged: (
        callback: (payload: { serverId: string } & McpRuntimeStatus) => void
      ) => () => void;
      onMcpLog: (
        callback: (payload: { serverId: string } & McpServerLogEntry) => void
      ) => () => void;
      onMcpToolsChanged: (callback: (payload: { serverId: string }) => void) => () => void;
      onMcpToolProgress: (
        callback: (payload: { callId: string; progress: number }) => void
      ) => () => void;
      onPtyOutput: (
        callback: (payload: { sessionId: string; data: string }) => void
      ) => () => void;
      onPtyExit: (
        callback: (payload: { sessionId: string; exitCode: number }) => void
      ) => () => void;
    };
  }
}
