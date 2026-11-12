import type { Tab } from '../components/terminal/terminalSidebarGroups';
import type { AgentSessionState } from './agentSession';
import { emptyAgentSessionState } from './agentSession';
import { buildChatSession, normalizeChatSession, trimSessionForStorage, type ChatSession } from './chatSession';

const KEY = 'df_terminal_agent_recovery';
export interface TerminalAgentRecovery { tab: Tab; session: ChatSession }
export function readTerminalAgentRecovery(): TerminalAgentRecovery[] {
  try {
    const rows = JSON.parse(localStorage.getItem(KEY) || '[]');
    return Array.isArray(rows) ? rows.filter((r) => r?.tab && typeof r.tab.id === 'string' &&
      (r.tab.kind === 'terminal' || r.tab.kind === 'ssh')).map((r) => ({ tab: safeTab(r.tab), session: normalizeChatSession(r.session) })) : [];
  } catch { return []; }
}
function safeTab(tab: Tab): Tab {
  const h = tab.sshHost;
  // Never replay launch commands or retain credentials when rebuilding a terminal.
  return { id: tab.id, title: tab.title, kind: tab.kind, cwd: tab.cwd, sshHostId: tab.sshHostId,
    ...(h ? { sshHost: { id: h.id, name: h.name, host: h.host, user: h.user, port: h.port, authMethod: h.authMethod || "password", credentialId: h.credentialId, privateKeyPath: h.privateKeyPath,
      proxyJumpAuthMethod: h.proxyJumpAuthMethod, proxyJumpCredentialId: h.proxyJumpCredentialId, proxyJumpPrivateKeyPath: h.proxyJumpPrivateKeyPath, group: h.group, proxyJump: h.proxyJump } } : {}),
  };
}
export function rememberTerminalAgent(tab: Tab, state: AgentSessionState) {
  const rows = readTerminalAgentRecovery().filter((r) => r.tab.id !== tab.id);
  rows.push({ tab: safeTab(tab), session: trimSessionForStorage(buildChatSession(state.messages, state.input, [], undefined, state.selectedSkillIds, state.selectedHosts)) });
  localStorage.setItem(KEY, JSON.stringify(rows));
}
export function forgetTerminalAgent(tabId: string) {
  localStorage.setItem(KEY, JSON.stringify(readTerminalAgentRecovery().filter((r) => r.tab.id !== tabId)));
}
export function restoreTerminalAgent(tabId: string): AgentSessionState {
  const row = readTerminalAgentRecovery().find((r) => r.tab.id === tabId);
  return { ...emptyAgentSessionState(), sessionReady: true, ...(row ? {
    messages: row.session.messages, input: row.session.draftInput || '', selectedSkillIds: row.session.draftSelectedSkillIds,
    selectedHosts: row.session.draftSelectedHosts,
  } : {}) };
}
