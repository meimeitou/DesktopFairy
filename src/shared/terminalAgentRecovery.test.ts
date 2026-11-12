import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { emptyAgentSessionState } from './agentSession';
import { forgetTerminalAgent, readTerminalAgentRecovery, rememberTerminalAgent, restoreTerminalAgent } from './terminalAgentRecovery';

beforeEach(() => {
  const data = new Map<string, string>();
  vi.stubGlobal('localStorage', { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => data.set(key, value) });
});
afterEach(() => vi.unstubAllGlobals());
it('restores terminal context as idle without replaying launch commands or retaining credentials', () => {
  rememberTerminalAgent({ id: 'tab', title: 'SSH', kind: 'ssh', launchCommand: 'dangerous-command', sshHost: {
    id: 'h', name: 'H', host: 'example.com', user: 'me', port: 22, authMethod: 'password', password: 'secret',
  } }, { ...emptyAgentSessionState(), messages: [{ id: 'm', role: 'user', content: 'task' }], streaming: true, requestId: 'old' });
  const saved = readTerminalAgentRecovery()[0];
  expect(saved.tab.launchCommand).toBeUndefined();
  expect(JSON.stringify(saved)).not.toContain('secret');
  const restored = restoreTerminalAgent('tab');
  expect(restored.streaming).toBe(false);
  expect(restored.requestId).toBeNull();
  expect(restored.messages[0].content).toBe('task');
  forgetTerminalAgent('tab');
  expect(readTerminalAgentRecovery()).toEqual([]);
});
