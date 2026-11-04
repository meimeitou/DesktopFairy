const fs = require('fs');
const os = require('os');
const path = require('path');
const { migrateTerminalSettings, migrateTerminalTopics, migrateTerminalFiles } = require('./terminalAssistantMigration.cjs');
const { backfillBuiltinAgents } = require('./settingsBackfill.cjs');
const policy = require('./agentEnvironmentPolicy.json');

const dirs = [];
afterEach(() => { for (const dir of dirs.splice(0)) fs.rmSync(dir, { recursive: true, force: true }); });

describe('terminal assistant migration', () => {
  it('upgrades known SOUL defaults even after tool migration, preserving custom SOUL and USER', () => {
    for (const soul of [policy.legacyTerminalSoul, ...policy.previousTerminalSouls]) {
      const input = { agents: [{ id: 'terminal-assistant', soul, user: '我的工作习惯', toolOverrides: { WebSearch: false } }] };
      const next = migrateTerminalSettings(input);
      expect(next.agents[0]).toMatchObject({ soul: policy.terminalSoul, user: '我的工作习惯', toolOverrides: { WebSearch: false } });
      expect(input.agents[0].soul).toBe(soul);
      expect(migrateTerminalSettings(next)).toEqual(next);
    }
    const custom = { agents: [{ id: 'terminal-assistant', soul: '自定义人格', user: '', toolOverrides: {} }] };
    expect(migrateTerminalSettings(custom).agents[0]).toEqual(custom.agents[0]);
    expect(policy.legacyTerminalSoul).not.toContain('export const');
  });

  it('keeps terminal configuration and explicit preferences, removes role defaults, and is idempotent', () => {
    const input = { terminalAgentId: 'terminal-assistant', agents: [
      { id: 'terminal-assistant', modelName: 'custom-model', soul: '自定义人格', mcpServerIds: ['a'], disabledToolIds: ['Bash', 'Read', 'WebSearch'] },
      { id: 'host-assistant', soul: 'old host', modelName: 'other' },
    ] };
    const next = migrateTerminalSettings(input);
    expect(next.agents).toHaveLength(1);
    expect(next.agents[0]).toMatchObject({ modelName: 'custom-model', soul: '自定义人格', mcpServerIds: ['a'], disabledToolIds: [], toolOverrides: { WebSearch: false } });
    expect(migrateTerminalSettings(next)).toEqual(next);
    expect(input.agents).toHaveLength(2);
    const defaults = migrateTerminalSettings({ agents: [{ id: 'terminal-assistant', soul: policy.legacyTerminalSoul }] });
    expect(defaults.agents[0].soul).toBe(policy.terminalSoul);
    expect(backfillBuiltinAgents(next).agents.some((a) => a.id === 'host-assistant')).toBe(false);
  });

  it('migrates terminal-page topics only, retaining host grants, cwd, IDs and topic settings', () => {
    const host = { hostId: 'h1', grants: { h1: 'root@host:22' }, cwdByHost: { h1: { path: '/srv', identity: 'root@host:22' } } };
    const store = { activeId: 'desktop', activeHostId: 'remote', topics: [
      { id: 'desktop', agentId: 'personal-assistant', chatMode: 'normal' },
      { id: 'local', agentId: 'personal-assistant', origin: 'terminal', knowledgeBaseIds: ['kb'] },
      { id: 'local2', agentId: 'other-agent', origin: 'terminal' },
      { id: 'remote', agentId: 'host-assistant', host, chatMode: 'plan' },
    ] };
    const next = migrateTerminalTopics(store);
    expect(next.topics[0]).toEqual(store.topics[0]);
    // origin=terminal 且指派了非 host-assistant 的话题保留原绑定（用户显式选择）。
    expect(next.topics[1]).toEqual(store.topics[1]);
    expect(next.topics[2]).toEqual(store.topics[2]);
    expect(next.topics[3]).toEqual({ ...store.topics[3], agentId: 'terminal-assistant' });
    expect(next.activeHostId).toBe('remote');
    expect(migrateTerminalTopics(next)).toBe(next);
  });

  it('backs up both originals before writes and does not overwrite backups on retry', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'terminal-migrate-')); dirs.push(dir);
    const settingsFile = path.join(dir, 'da_settings.json'); const topicsFile = path.join(dir, 'topics.json');
    const settings = JSON.stringify({ agents: [{ id: 'terminal-assistant' }, { id: 'host-assistant' }] });
    const topics = JSON.stringify({ topics: [{ id: 'a', agentId: 'host-assistant', host: { hostId: 'h' } }] });
    fs.writeFileSync(settingsFile, settings); fs.writeFileSync(topicsFile, topics);
    migrateTerminalFiles(settingsFile, topicsFile);
    migrateTerminalFiles(settingsFile, topicsFile);
    expect(fs.readFileSync(path.join(dir, 'terminal-assistant-migration-v1', 'da_settings.json'), 'utf8')).toBe(settings);
    expect(fs.readFileSync(path.join(dir, 'terminal-assistant-migration-v1', 'topics.json'), 'utf8')).toBe(topics);
    expect(JSON.parse(fs.readFileSync(topicsFile)).topics[0].agentId).toBe('terminal-assistant');
  });

  it('leaves both files untouched when backup fails', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'terminal-migrate-fail-')); dirs.push(dir);
    const settingsFile = path.join(dir, 'settings.json'); const topicsFile = path.join(dir, 'topics.json');
    const settings = '{"agents":[{"id":"host-assistant"}]}'; const topics = '{"topics":[{"id":"a","agentId":"host-assistant"}]}';
    fs.writeFileSync(settingsFile, settings); fs.writeFileSync(topicsFile, topics);
    fs.writeFileSync(path.join(dir, 'terminal-assistant-migration-v1'), 'block directory');
    expect(() => migrateTerminalFiles(settingsFile, topicsFile)).toThrow();
    expect(fs.readFileSync(settingsFile, 'utf8')).toBe(settings);
    expect(fs.readFileSync(topicsFile, 'utf8')).toBe(topics);
  });
});
