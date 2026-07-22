/** Tool terminal state included in chat:stream:done for reconciliation. */
import type { ProviderType } from "../providers";

export interface ToolTerminalState {
  toolCallId: string;
  toolName?: string;
  toolArgs?: string;
  status: "streaming" | "running" | "done" | "error" | "awaiting_approval" | "awaiting_input";
  resultPreview?: string;
  message?: string;
}

export interface AiStreamOpenRequest {
  topicId: string;
  requestId: string;
  messages: Array<Record<string, unknown>>;
  agentConfig: Record<string, unknown>;
  apiConfig: {
    apiHost: string;
    apiKey?: string;
    providerType?: ProviderType;
    modelName: string;
  };
  terminalSessionId?: string;
}
