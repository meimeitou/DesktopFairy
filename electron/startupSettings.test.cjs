const fs = require('fs');
const os = require('os');
const path = require('path');
const { initializeStartupSettings, guardSessionIpc } = require('./startupSettings.cjs');

let dir;
beforeEach(() => { dir = fs.mkdtempSync(path.join(os.tmpdir(), 'df-startup-settings-')); });
afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));

it('keeps startup alive and originals untouched when topic JSON is damaged', () => {
  const settingsFile = path.join(dir, 'settings.json');
  const topicsFile = path.join(dir, 'topics.json');
  const settings = '{"agents":[{"id":"terminal-assistant","soul":"custom"}]}';
  fs.writeFileSync(settingsFile, settings);
  fs.writeFileSync(topicsFile, '{"topics":[');
  const result = initializeStartupSettings(settingsFile, topicsFile);
  expect(result.migrationError).toBeInstanceOf(SyntaxError);
  expect(result.settings.agents.find((a) => a.id === 'terminal-assistant').soul).toBe('custom');
  expect(fs.readFileSync(settingsFile, 'utf8')).toBe(settings);
  expect(fs.readFileSync(topicsFile, 'utf8')).toBe('{"topics":[');
});

it('keeps startup alive when migration backup fails', () => {
  const settingsFile = path.join(dir, 'settings.json');
  const topicsFile = path.join(dir, 'topics.json');
  const original = '{"agents":[{"id":"host-assistant"}]}';
  fs.writeFileSync(settingsFile, original);
  fs.writeFileSync(path.join(dir, 'terminal-assistant-migration-v1'), 'not a directory');
  const result = initializeStartupSettings(settingsFile, topicsFile);
  expect(result.migrationError).toBeTruthy();
  expect(result.settings.agents.some((a) => a.id === 'terminal-assistant')).toBe(true);
  expect(fs.readFileSync(settingsFile, 'utf8')).toBe(original);
});

it('migrates normally when files are healthy', () => {
  const settingsFile = path.join(dir, 'settings.json');
  const topicsFile = path.join(dir, 'topics.json');
  fs.writeFileSync(settingsFile, '{"agents":[{"id":"host-assistant"}]}');
  fs.writeFileSync(topicsFile, '{"topics":[{"id":"one","agentId":"host-assistant"}]}');
  const result = initializeStartupSettings(settingsFile, topicsFile);
  expect(result.migrationError).toBeNull();
  expect(JSON.parse(fs.readFileSync(topicsFile)).topics[0].agentId).toBe('terminal-assistant');
});

it('blocks the real topic-list fallback from overwriting corrupt data until recovery', async () => {
  const { registerChatSessionHandlers } = require('./chatSessionService.cjs');
  const topicsFile = path.join(dir, 'topics.json');
  fs.writeFileSync(topicsFile, '{"topics":[');
  let error = new Error('migration failed');
  const handlers = {};
  registerChatSessionHandlers({
    ipcMain: guardSessionIpc({ handle: (channel, handler) => { handlers[channel] = handler; } }, () => error),
    sessionPath: () => path.join(dir, 'session.json'),
    topicsIndexPath: () => topicsFile,
    sessionsDir: () => path.join(dir, 'sessions'),
    toolResultsDir: () => path.join(dir, 'results'),
  });
  expect(() => handlers['chat:topics:list']({})).toThrow('会话访问已暂停');
  expect(fs.readFileSync(topicsFile, 'utf8')).toBe('{"topics":[');
  fs.writeFileSync(topicsFile, '{"topics":[]}');
  error = null;
  const result = await handlers['chat:topics:list']({});
  expect(result.topics.length).toBeGreaterThan(0);
});
