import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
import { createTerminalAssistantDefaults, getEnabledAgentBuiltinTools, type AgentEnvironment } from './agent';
import { finalizeSettings, DEFAULT_SETTINGS } from './settings';
import environmentPolicy from '../../electron/agentEnvironmentPolicy.json';

const require = createRequire(import.meta.url);
const { getEnabledOpenAiToolDefinitions } = require('../../electron/agentBuiltinCatalog.cjs');
const { migrateTerminalSettings } = require('../../electron/terminalAssistantMigration.cjs');
const { resolveAgentEnvironment } = require('../../electron/agentEnvironment.cjs');
const { executeAgentTool } = require('../../electron/agentTools.cjs');
const { createChunkBridge } = require('../../electron/ai/chunkBridge.cjs');

describe('environment capabilities', () => {
  it('upgrades defaults consistently in renderer and main, without changing USER or custom SOUL', () => {
    for (const soul of [environmentPolicy.legacyTerminalSoul, ...environmentPolicy.previousTerminalSouls, '我的自定义 SOUL']) {
      const input = { ...DEFAULT_SETTINGS, agents: [createTerminalAssistantDefaults({ soul, user: '保留我的档案' })] };
      const ui = finalizeSettings(input);
      const main = migrateTerminalSettings(input);
      expect(ui.agents[0].soul).toBe(main.agents[0].soul);
      expect(ui.agents[0].soul).toBe(soul === '我的自定义 SOUL' ? soul : environmentPolicy.terminalSoul);
      expect(ui.agents[0].user).toBe('保留我的档案');
      expect(finalizeSettings(ui)).toEqual(ui);
    }
    expect(createTerminalAssistantDefaults().user).toBe('');
  });

  const contexts: AgentEnvironment[] = ['local', 'terminal', 'terminal-ssh', 'host'];
  for (const context of contexts) {
    for (const chatMode of ['normal', 'plan', 'auto-edit', 'full-auto'] as const) {
      it(`${context}/${chatMode}: UI and main expose the same tools including preference overrides`, () => {
        const agent = createTerminalAssistantDefaults({ chatMode, toolOverrides: { bash: true, Terminal: true, ssh_read: true, WebSearch: false, AskUserQuestion: false } });
        const ui = getEnabledAgentBuiltinTools(agent, context).map((t) => t.id).sort();
        const main = getEnabledOpenAiToolDefinitions(agent, context).map((t) => t.function.name).sort();
        expect(main).toEqual(ui);
        expect(main).not.toContain('WebSearch');
        if (context !== 'local') expect(main).not.toContain('bash');
        if (context === 'host') expect(main).not.toContain('Terminal');
        if (chatMode === 'plan') expect(main).not.toContain('Terminal');
      });
    }
  }

  it('local files are usable by default; bash requires opt-in; SSH files require a bound saved host', () => {
    const agent = createTerminalAssistantDefaults();
    const ids = (context: AgentEnvironment) => getEnabledAgentBuiltinTools(agent, context).map((t) => t.id);
    expect(ids('local')).toContain('read'); expect(ids('local')).toContain('write'); expect(ids('local')).not.toContain('bash');
    expect(ids('terminal')).toContain('Terminal'); expect(ids('terminal')).toContain('ssh_read'); expect(ids('terminal')).toContain('ssh_write'); expect(ids('terminal')).not.toContain('read');
    expect(ids('terminal-ssh')).toContain('ssh_read'); expect(ids('terminal-ssh')).toContain('Terminal');
  });

  it('renderer and main migrate the same custom terminal preferences without recreating host assistant', () => {
    const old = { ...DEFAULT_SETTINGS, agents: [{ ...createTerminalAssistantDefaults(), toolOverrides: undefined, disabledToolIds: ['read', 'bash', 'WebSearch'], soul: 'my soul' }, { id: 'host-assistant', builtinRole: 'host-assistant' }] };
    const main = migrateTerminalSettings(old);
    const ui = finalizeSettings(old as never);
    expect(ui.agents[0].toolOverrides).toEqual(main.agents[0].toolOverrides);
    expect(ui.agents[0].soul).toBe('my soul');
    expect(ui.agents.some((a) => a.id === 'host-assistant')).toBe(false);
    expect(finalizeSettings(ui)).toEqual(ui);
  });
});

describe('runtime bindings and execution boundary', () => {
  it('uses topic host binding independently of role; missing topic/session never falls back to local', () => {
    const runtime = { assertValid: () => {} };
    const service = { getTopic: (id: string) => id === 'host-topic' ? { agentId: 'terminal-assistant', host: { hostId: 'h' } } : null, resolveHostRuntime: () => runtime };
    expect(resolveAgentEnvironment({ topicId: 'host-topic', hostConversationService: service }).context).toBe('host');
    expect(() => resolveAgentEnvironment({ topicId: 'deleted', hostConversationService: service })).toThrow(/不存在/);
    expect(() => resolveAgentEnvironment({ topicId: 'terminal:a', hostConversationService: service })).toThrow(/断开/);
  });

  it('validates terminal ownership and rechecks liveness before each tool', async () => {
    const sender = {}; let alive = true;
    const session = { savedHostId: 'h1' };
    const getSessionService = () => ({ getOwnedSession: (_id: string, owner: unknown) => { if (!alive || owner !== sender) throw new Error('会话不可用'); return session; } });
    const hostConversationService = { resolveTerminalRuntime: () => ({ assertValid: () => {} }) };
    const env = resolveAgentEnvironment({ topicId: 'terminal:a', terminalSessionId: 'ssh_test', sender, hostConversationService, getSessionService });
    expect(env.context).toBe('terminal-ssh');
    expect(() => resolveAgentEnvironment({ topicId: 'terminal:a', terminalSessionId: 'ssh_test', sender: {}, hostConversationService, getSessionService })).toThrow();
    alive = false;
    const result = await executeAgentTool({ id: 'blocked', function: { name: 'Terminal', arguments: '{"command":"touch /tmp/should-never-run"}' } }, { assertEnvironment: env.assertValid, allowedToolNames: new Set(['Terminal']) });
    expect(JSON.parse(result.resultText)).toMatchObject({ ok: false, error: '会话不可用' });
  });

  it('rejects a disabled tool at execution even in full-auto', async () => {
    const result = await executeAgentTool({ id: 'denied', function: { name: 'bash', arguments: '{"command":"touch /tmp/should-never-run"}' } }, { agentConfig: { chatMode: 'full-auto' }, allowedToolNames: new Set(['ssh_read']) });
    expect(result.denied).toBe(true); expect(JSON.parse(result.resultText).error).toContain('未开放');
  });

  it('retains resolved host/account labels in completion snapshots and replay events', () => {
    const events: unknown[] = [];
    const bridge = createChunkBridge({ requestId: 'r', safeSend: (_ch: string, e: unknown) => events.push(e) });
    const toolArgs = JSON.stringify({ hostId: 'h', path: '/srv', targetLabel: 'prod (root@host:22)' });
    bridge.setToolArgs('call', 'ssh_read', toolArgs);
    bridge.handleChunk({ type: 'tool-input-available', toolCallId: 'call', toolName: 'ssh_read', input: { path: '/srv' } });
    bridge.handleChunk({ type: 'tool-output-available', toolCallId: 'call', output: { ok: true } });
    expect(bridge.getToolSnapshot()[0].toolArgs).toBe(toolArgs);
    expect(events.at(-1)).toMatchObject({ toolArgs, status: 'done' });
  });

  it('marks builtin {ok:false} tool output as an error, not done', () => {
    const events: unknown[] = [];
    const bridge = createChunkBridge({ requestId: 'r', safeSend: (_ch: string, e: unknown) => events.push(e) });
    bridge.handleChunk({
      type: 'tool-output-available',
      toolCallId: 'call',
      toolName: 'ssh_read',
      output: { ok: false, error: 'MAX_READ_BYTES is not defined' },
    });
    expect(events.at(-1)).toMatchObject({
      status: 'error',
      message: 'MAX_READ_BYTES is not defined',
    });
    expect(bridge.getToolSnapshot()[0]).toMatchObject({ status: 'error' });
  });
});
