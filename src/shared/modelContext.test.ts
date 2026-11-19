import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, finalizeSettings, getAgentApiConfig } from './settings';
import { createPersonalAssistantDefaults } from './agent';
import { resolveContextWindow } from './contextUsage';
import { normalizeProvider } from './providers';
import { buildAgentApiMessages } from './chatMessages';

const require = createRequire(import.meta.url);
const snapshot = require('../../electron/settingsSnapshot.cjs');

describe('provider model context policies', () => {
  it('preserves custom model capacity through settings normalization and both send paths', () => {
    const agent = createPersonalAssistantDefaults({ providerId: 'openai', modelName: 'gateway-alias' });
    const provider = { ...DEFAULT_SETTINGS.providers[0], id: 'openai', enabled: true, apiHost: 'https://example.test', models: ['gateway-alias'], modelContextWindows: { 'gateway-alias': 1000000, invalid: -10 } };
    const settings = finalizeSettings({ ...DEFAULT_SETTINGS, providers: [provider], agents: [agent] });
    expect(normalizeProvider(provider).modelContextWindows).toEqual({ 'gateway-alias': 1000000 });
    const config = getAgentApiConfig(settings, agent);
    expect(config.contextWindow).toBe(1000000);
    expect(resolveContextWindow(config.modelName, config.contextWindow)).toBe(1000000);
    const previous = snapshot.getSnapshot();
    try {
      snapshot.setSnapshot(settings);
      const send = snapshot.resolveForSend({ agentConfig: agent });
      expect(send.ok).toBe(true);
      expect(send.apiConfig.contextWindow).toBe(1000000);
    } finally { snapshot.setSnapshot(previous); }
  });

  it('keeps resource ids in next-turn model history even when a stored tool preview is truncated', () => {
    const resultId = `context-${'a'.repeat(64)}`;
    const messages = buildAgentApiMessages([{ id: 't', role: 'assistant', type: 'tool', toolCallId: 'fetch', toolName: 'WebFetch', toolStatus: 'done', content: '', toolArgs: '{}',
      toolResultPreview: `{"ok":true,"resultId":"${resultId}","results":[{"content":"${'x'.repeat(1000)}`,
    }], '继续查原文', { textFiles: [], images: [] });
    expect(messages.find(m => m.role === 'tool').content).toContain(resultId);
    expect(messages.find(m => m.role === 'tool').content).toContain('read_tool_result');
  });
});
