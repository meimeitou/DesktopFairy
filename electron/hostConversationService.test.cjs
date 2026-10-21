// vitest globals (globals: true) provide describe/it/expect in CJS tests
const fs = require('fs');
const os = require('os');
const path = require('path');
const {
  registerChatSessionHandlers,
  hostFingerprint,
} = require('./chatSessionService.cjs');
const {
  createHostConversationService,
} = require('./hostConversationService.cjs');

function makeHarness() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'hostconv-test-'));
  const handlers = {};
  const ipc = { handle: (ch, fn) => { handlers[ch] = fn; } };
  const calls = { abort: [] };
  let settings = {
    sshHosts: [
      { id: 'h1', name: 'alpha', user: 'root', host: '1.2.3.4', port: 22 },
      { id: 'h2', name: 'beta', user: 'ubuntu', host: '5.6.7.8', port: 2222 },
    ],
    sshCredentials: [],
  };
  const snapshot = {
    getSnapshot: () => settings,
    setSnapshot: (s) => {
      settings = s;
      return 1;
    },
  };
  const topicStore = registerChatSessionHandlers({
    ipcMain: ipc,
    sessionPath: () => path.join(tmp, 'session.json'),
    topicsIndexPath: () => path.join(tmp, 'topics.json'),
    sessionsDir: () => path.join(tmp, 'sessions'),
    toolResultsDir: () => path.join(tmp, 'toolresults'),
    chatLogsDir: () => path.join(tmp, 'logs'),
    getAbortHandler: (topicId) => () => calls.abort.push(topicId),
    getSshHosts: () => settings.sshHosts,
  });
  const svc = createHostConversationService({
    topicStore,
    settingsSnapshot: snapshot,
    manager: { abort: (tid) => calls.abort.push(tid) },
    abortRequestApprovals: () => {},
    getWindows: () => [],
    settingsPath: () => path.join(tmp, 'da_settings.json'),
  });
  // `settings` is reassigned by setSnapshot — expose it as a live getter.
  return {
    tmp,
    handlers,
    calls,
    get settings() {
      return settings;
    },
    snapshot,
    topicStore,
    svc,
  };
}

async function createHostTopic(h, hostId) {
  const r = await h.handlers['chat:topics:create']({}, {
    agentId: 'host-assistant',
    hostId,
  });
  expect(r.ok).toBe(true);
  return r.topic;
}

describe('hostFingerprint', () => {
  it('is stable and covers user/host/port/jump', () => {
    expect(hostFingerprint({ user: 'u', host: 'h', port: 22 })).toBe('u@h:22');
    expect(hostFingerprint({ user: 'u', host: 'h' })).toBe('u@h:22');
    expect(
      hostFingerprint({ user: 'u', host: 'h', port: 2222, proxyJump: 'j' }),
    ).toBe('u@h:2222?jump=j');
  });
});

describe('hostConversationService', () => {
  it('resolveHostRuntime throws for non-host topics and missing hosts', async () => {
    const h = makeHarness();
    const r = await h.handlers['chat:topics:create']({}, {
      agentId: 'personal-assistant',
    });
    expect(() => h.svc.resolveHostRuntime(r.topic.id)).toThrow(/未绑定主机助手/);
    expect(() => h.svc.resolveHostRuntime('nonexistent')).toThrow(/不存在/);
  });

  it('default host is granted at creation; cross-host grant via ensureGrant', async () => {
    const h = makeHarness();
    const topic = await createHostTopic(h, 'h1');
    const rt = h.svc.resolveHostRuntime(topic.id);
    expect(rt.grants['h1']).toBe(rt.fingerprint);
    // cross-host ungranted → force
    expect(rt.forceApproval('ssh_read', { hostId: 'h2' }, rt)).toBe(true);
    h.svc.ensureGrant(topic.id, 'h2');
    const rt2 = h.svc.resolveHostRuntime(topic.id);
    expect(rt2.forceApproval('ssh_read', { hostId: 'h2' }, rt2)).toBe(false);
    expect(rt2.grants['h2']).toBe(rt2.fingerprintOf('h2'));
  });

  it('forceApproval: ssh_hosts write always forces; list does not', () => {
    const h = makeHarness();
    const rt = { defaultHostId: 'h1', grants: {}, fingerprintOf: () => 'fp' };
    expect(h.svc.forceApproval('ssh_hosts', { action: 'delete' }, rt)).toBe(true);
    expect(h.svc.forceApproval('ssh_hosts', { action: 'list' }, rt)).toBe(false);
    expect(h.svc.forceApproval('ssh_hosts', {}, rt)).toBe(true);
  });

  it('update with identity change clears grants and cwd for affected topics', async () => {
    const h = makeHarness();
    const topic = await createHostTopic(h, 'h1');
    h.svc.setCwd(topic.id, 'h1', '/var/log');
    expect(h.svc.getCwd(topic.id, 'h1')).toBe('/var/log');

    const result = await h.svc.applyHostSettingsMutation({
      action: 'update',
      host: 'alpha',
      fields: { port: 2222 },
    });
    expect(result.ok).toBe(true);
    expect(h.settings.sshHosts[0].port).toBe(2222);

    const t = h.topicStore.getTopic(topic.id);
    expect(Object.keys(t.host.grants)).toHaveLength(0);
    expect(Object.keys(t.host.cwdByHost)).toHaveLength(0);
    expect(h.svc.getCwd(topic.id, 'h1')).toBe(null);
  });

  it('deleteTopicsByHost aborts streams before deleting topic files', async () => {
    const h = makeHarness();
    const topic = await createHostTopic(h, 'h1');
    // session file exists → deletion must follow abort
    const sessionFile = path.join(h.tmp, 'sessions', `${topic.id}.json`);
    fs.mkdirSync(path.dirname(sessionFile), { recursive: true });
    fs.writeFileSync(sessionFile, '{"version":2}');

    const order = [];
    const origAbort = h.calls.abort.push.bind(h.calls.abort);
    h.calls.abort.push = (tid) => { order.push('abort'); origAbort(tid); };

    const removed = h.topicStore.deleteTopicsByHost('h1');
    expect(removed).toBe(1);
    expect(order[0]).toBe('abort');
    expect(fs.existsSync(sessionFile)).toBe(false);
    expect(h.topicStore.getTopic(topic.id)).toBe(null);
  });

  it('delete via applyHostSettingsMutation removes topics and settings entry', async () => {
    const h = makeHarness();
    const topic = await createHostTopic(h, 'h1');
    const result = await h.svc.applyHostSettingsMutation({
      action: 'delete',
      host: 'alpha',
    });
    expect(result.ok).toBe(true);
    expect(h.topicStore.getTopic(topic.id)).toBe(null);
    expect(h.settings.sshHosts.some((x) => x.id === 'h1')).toBe(false);
    expect(h.calls.abort).toContain(topic.id);
  });

  it('getCwd treats identity mismatch as stale (null)', async () => {
    const h = makeHarness();
    const topic = await createHostTopic(h, 'h1');
    h.svc.setCwd(topic.id, 'h1', '/data');
    // change host identity behind the service's back
    h.settings.sshHosts[0].port = 2200;
    expect(h.svc.getCwd(topic.id, 'h1')).toBe(null);
  });

  it('update rejects a duplicate name and an empty field set', async () => {
    const h = makeHarness();
    const dup = await h.svc.applyHostSettingsMutation({
      action: 'update',
      host: 'alpha',
      fields: { name: 'beta' },
    });
    expect(dup.ok).toBe(false);
    expect(h.settings.sshHosts.find((x) => x.id === 'h1').name).toBe('alpha');

    const empty = await h.svc.applyHostSettingsMutation({
      action: 'update',
      host: 'alpha',
      fields: {},
    });
    expect(empty.ok).toBe(false);
  });

  it('does not mutate the live snapshot when the settings write fails', async () => {
    const h = makeHarness();
    const before = JSON.stringify(h.settings);
    // Point the settings path at an un-writable location.
    const svc = createHostConversationService({
      topicStore: h.topicStore,
      settingsSnapshot: h.snapshot,
      manager: { abort: () => {} },
      abortRequestApprovals: () => {},
      getWindows: () => [],
      settingsPath: () => path.join(h.tmp, 'missing-dir', 'da_settings.json'),
    });
    const result = await svc.applyHostSettingsMutation({
      action: 'add',
      fields: { name: 'gamma', host: '9.9.9.9', user: 'root' },
    });
    expect(result.ok).toBe(false);
    expect(JSON.stringify(h.settings)).toBe(before);
  });

  it('resolveHostIdByName returns the id only for a unique exact name', async () => {
    const h = makeHarness();
    expect(h.svc.resolveHostIdByName('alpha')).toBe('h1');
    expect(h.svc.resolveHostIdByName('nope')).toBe(null);
    h.settings.sshHosts.push({ id: 'h3', name: 'alpha', user: 'r', host: 'x' });
    h.snapshot.setSnapshot(h.settings);
    expect(h.svc.resolveHostIdByName('alpha')).toBe(null);
  });
});
