export interface BrowserTab {
  id: string;
  generation?: number;
  resetReason?: string;
  url: string;
  title: string;
  ready: boolean;
  pending: boolean;
  control: { topicId: string; requestId: string; topicName: string; action: string } | null;
}
export interface BrowserPausedTask {
  topicId: string;
  requestId: string;
  tabId: string;
}
export interface BrowserState {
  instanceId?: string;
  revision?: number;
  lastReset?: { reason: string; at: number; tabId?: string } | null;
  tabs: BrowserTab[];
  activeTabId: string | null;
  paused: BrowserPausedTask[];
}
