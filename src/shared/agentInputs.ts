import type { ChatMsg, ApiMessage } from './chatMessages';
export interface AgentInputItem {
  message: ChatMsg;
  status: 'pending' | 'injected';
  requestId?: string;
}
export interface AgentInputSnapshot { topicId: string; items: AgentInputItem[] }
export interface AgentInputEvent { requestId: string; items: ChatMsg[] }
export interface AgentInputPayload { message: ChatMsg; apiMessage: ApiMessage }
