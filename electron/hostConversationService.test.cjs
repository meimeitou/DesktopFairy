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
    expect(() => h.svc.resolveHostRuntime(r.topic.id)).toThrow(/未绑定主机运行环境/);
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

  it('searchSavedHosts ranks exact names ahead of partial address matches', () => {
    const h = makeHarness();
    h.settings.sshHosts.push({ id: 'h3', name: 'alpha-backup', user: 'r', host: '10.1.1.8' });
    h.snapshot.setSnapshot(h.settings);
    expect(h.svc.searchSavedHosts('alpha').map((x) => x.id)).toEqual(['h1', 'h3']);
    expect(h.svc.searchSavedHosts('5.6.7.8').map((x) => x.id)).toEqual(['h2']);
    expect(h.svc.searchSavedHosts('no-such')).toEqual([]);
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

describe('terminal host runtime', () => {
  it('shares grants/cwd across turns of one session, isolates sessions, and rejects changed identities', () => {
    const h = makeHarness();
    const session = { savedHostId: 'h1', savedHostFingerprint: hostFingerprint(h.settings.sshHosts[0]) };
    let alive = true;
    const check = () => { if (!alive) throw new Error('closed'); };
    const rt = h.svc.resolveTerminalRuntime(session, 'ssh_1', check);
    expect(rt.defaultHostId).toBe('h1');
    expect(rt.forceApproval('ssh_read', { hostId: 'h2' }, rt)).toBe(true);
    rt.ensureGrant(rt.topicId, 'h2');
    rt.setCwd(rt.topicId, 'h1', '/srv');
    const nextTurn = h.svc.resolveTerminalRuntime(session, 'ssh_1', check);
    expect(nextTurn.isGranted('h2')).toBe(true);
    expect(nextTurn.getCwd(nextTurn.topicId, 'h1')).toBe('/srv');
    const other = h.svc.resolveTerminalRuntime({ savedHostId: 'h1', savedHostFingerprint: session.savedHostFingerprint }, 'ssh_2', check);
    expect(other.isGranted('h2')).toBe(false);
    expect(other.getCwd(other.topicId, 'h1')).toBeNull();
    h.snapshot.setSnapshot({ ...h.settings, sshHosts: h.settings.sshHosts.map((host) => host.id === 'h2' ? { ...host, user: 'changed' } : host) });
    expect(nextTurn.isGranted('h2')).toBe(false);
    h.snapshot.setSnapshot({ ...h.settings, sshHosts: h.settings.sshHosts.filter((host) => host.id !== 'h1') });
    expect(() => nextTurn.assertValid()).toThrow(/删除|变化/);
    alive = false;
    expect(() => rt.assertValid()).toThrow('closed');
  });

  it('keeps unbound terminals ungranted and requires explicit saved-host targets', () => {
    const h = makeHarness();
    const rt = h.svc.resolveTerminalRuntime({}, 'pty_1', () => {});
    expect(rt.defaultHostId).toBeNull();
    expect(rt.isGranted('h1')).toBe(false);
    expect(rt.forceApproval('ssh_exec', { hostId: 'h1' }, rt)).toBe(true);
  });

  it('cross-host calls force per-card approval even with full-auto and bypass enabled; denial grants nothing', async () => {
    const h = makeHarness();
    const rt = h.svc.resolveTerminalRuntime({ savedHostId: 'h1', savedHostFingerprint: hostFingerprint(h.settings.sshHosts[0]) }, 'ssh_1', () => {});
    const { executeAgentTool } = require('./agentTools.cjs');
    const { dispatchUserAnswer, clearAllToolApprovals } = require('./agentToolApproval.cjs');
    const events = [];
    const result = await executeAgentTool({ id: 'forced', function: { name: 'ssh_read', arguments: JSON.stringify({ path: '/etc/hostname', hostId: 'h2' }) } }, {
      requestId: 'cross-host-force-test', context: 'terminal-ssh', hostRuntime: rt,
      agentConfig: { chatMode: 'full-auto' }, bypassApproval: true, allowedToolNames: new Set(['ssh_read']),
      safeSend: (_ch, event) => {
        events.push(event);
        if (event.status === 'awaiting_input') queueMicrotask(() => {
          dispatchUserAnswer(event.approvalId, { unused: '不执行' });
        });
      },
    });
    expect(JSON.parse(result.resultText).error).toMatch(/没有确认/);
    expect(events.some((event) => event.status === 'awaiting_input' && event.toolName === 'AskUserQuestion')).toBe(true);
    expect(events.some((event) => event.status === 'awaiting_approval')).toBe(false);
    expect(rt.isGranted('h2')).toBe(false);
    clearAllToolApprovals();
  });
});

describe('approval target identity', () => {
  it('does not grant a different host identity if the target changed while its approval card was open', async () => {
    const h = makeHarness();
    const rt = h.svc.resolveTerminalRuntime({ savedHostId: 'h1', savedHostFingerprint: hostFingerprint(h.settings.sshHosts[0]) }, 'ssh_1', () => {});
    const { executeAgentTool } = require('./agentTools.cjs');
    const { dispatchUserAnswer, clearAllToolApprovals } = require('./agentToolApproval.cjs');
    const result = await executeAgentTool({ id: 'changed-target', function: { name: 'ssh_read', arguments: JSON.stringify({ path: '/srv/config', host: 'beta' }) } }, {
      requestId: 'changed-target-request', context: 'terminal-ssh', hostRuntime: rt,
      agentConfig: { chatMode: 'full-auto' }, allowedToolNames: new Set(['ssh_read']),
      safeSend: (_ch, event) => {
        if (event.status !== 'awaiting_input') return;
        queueMicrotask(() => {
          h.snapshot.setSnapshot({ ...h.settings, sshHosts: h.settings.sshHosts.map((host) => host.id === 'h2' ? { ...host, host: '9.9.9.9' } : host) });
          const questions = JSON.parse(event.toolArgs).questions;
          dispatchUserAnswer(event.approvalId, { [questions[0].question]: questions[0].options[0].label });
        });
      },
    });
    expect(JSON.parse(result.resultText).error).toContain('身份已变化');
    expect(rt.isGranted('h2')).toBe(false);
    clearAllToolApprovals();
  });
});

describe('saved host discovery before operating', () => {
  async function requestTarget(h, args, answer) {
    const snapshot = require('./settingsSnapshot.cjs');
    const previous = snapshot.getSnapshot();
    for (const host of h.settings.sshHosts) host.authMethod = 'agent';
    snapshot.setSnapshot(h.settings);
    const rt = h.svc.resolveTerminalRuntime({}, 'local-session', () => {});
    // Mark alpha granted to catch accidental reuse of a fuzzy match.
    rt.ensureGrant(rt.topicId, 'h1');
    const events = [];
    const { executeAgentTool } = require('./agentTools.cjs');
    const approval = require('./agentToolApproval.cjs');
    try {
      const result = await executeAgentTool({ id: 'discover', function: { name: 'ssh_cwd', arguments: JSON.stringify(args) } }, {
        requestId: 'host-discovery-test', context: 'terminal', hostRuntime: rt,
        agentConfig: { chatMode: 'full-auto' }, bypassApproval: true, allowedToolNames: new Set(['ssh_cwd']),
        safeSend: (_channel, event) => {
          events.push(event);
          if (event.status === 'awaiting_input') queueMicrotask(() => {
            const question = JSON.parse(event.toolArgs).questions[0];
            approval.dispatchUserAnswer(event.approvalId, { [question.question]: typeof answer === 'function' ? answer(question) : answer });
          });
        },
      });
      return { result: JSON.parse(result.resultText), events, rt };
    } finally { approval.clearAllToolApprovals(); snapshot.setSnapshot(previous); }
  }

  it('asks about a missing match and offers the current saved list without granting anything', async () => {
    const h = makeHarness();
    const { result, events, rt } = await requestTarget(h, { host: 'unknown-machine' }, '都不是，请先确认新机器配置');
    const event = events.find((e) => e.status === 'awaiting_input');
    const question = JSON.parse(event.toolArgs).questions[0];
    expect(question.question).toContain('没有与「unknown-machine」匹配');
    expect(question.options).toHaveLength(2);
    expect(result.ok).toBe(false);
    expect(result.hostClarification).toContain('新机器配置');
    expect(rt.isGranted('h2')).toBe(false);
    expect(events.some((e) => e.status === 'done')).toBe(true);
  });

  it('asks again for a fuzzy match even when that host was already granted', async () => {
    const h = makeHarness();
    const { result, events } = await requestTarget(h, { host: 'alp' }, (q) => q.options[0].label);
    expect(events.some((e) => e.status === 'awaiting_input')).toBe(true);
    expect(result.ok).toBe(true);
  });

  it('asks for a target when no host is bound and none was specified', async () => {
    const h = makeHarness();
    const { result, events, rt } = await requestTarget(h, {}, (q) => q.options[1].label);
    expect(JSON.parse(events.find((e) => e.status === 'awaiting_input').toolArgs).questions[0].question).toContain('未指定');
    expect(rt.isGranted('h2')).toBe(true);
    expect(result.ok).toBe(true);
  });

  it('does not silently pick a duplicate name from a user answer', async () => {
    const h = makeHarness();
    h.settings.sshHosts[1].name = 'alpha';
    const { result, events, rt } = await requestTarget(h, { host: 'alpha' }, 'alpha');
    expect(events.some((e) => e.status === 'awaiting_input')).toBe(true);
    expect(result.ok).toBe(false);
    expect(rt.isGranted('h2')).toBe(false);
  });

  it('asks rather than guessing a connection when the saved list is empty', async () => {
    const h = makeHarness();
    h.settings.sshHosts.splice(0);
    const { result, events } = await requestTarget(h, { host: 'production' }, '需要新增主机');
    const question = JSON.parse(events.find((e) => e.status === 'awaiting_input').toolArgs).questions[0];
    expect(question.options).toEqual([]);
    expect(result.ok).toBe(false);
  });

  it('allows an exact already-confirmed target without asking again', async () => {
    const h = makeHarness();
    const { result, events } = await requestTarget(h, { host: 'alpha' }, '');
    expect(result.ok).toBe(true);
    expect(events.some((e) => e.status === 'awaiting_input')).toBe(false);
  });

  it('asks when a supplied name and hostId disagree even if the named host was granted', async () => {
    const h = makeHarness();
    const { result, events } = await requestTarget(h, { host: 'alpha', hostId: 'h2' }, (q) => q.options[1].label);
    const question = JSON.parse(events.find((e) => e.status === 'awaiting_input').toolArgs).questions[0];
    expect(question.question).toContain('名称与 hostId');
    expect(question.options).toHaveLength(2);
    expect(result.ok).toBe(true);
  });

  it('lists the live settings snapshot without returning credentials', async () => {
    const snapshot = require('./settingsSnapshot.cjs');
    const previous = snapshot.getSnapshot();
    snapshot.setSnapshot({ sshHosts: [{ id: 'new-host', name: 'latest', host: 'example', user: 'u', password: 'do-not-expose' }] });
    try {
      const result = JSON.parse(await require('./agentBuiltinSshExecutors.cjs').executeSshBuiltinTool('ssh_hosts', { action: 'list' }, {}));
      expect(result.hosts[0].name).toBe('latest');
      expect(JSON.stringify(result)).not.toContain('do-not-expose');
    } finally { snapshot.setSnapshot(previous); }
  });

  it('requires listing and resolving uncertainty in the main-process prompt', () => {
    const { buildAgentSystemPrompt } = require('./agentService.cjs');
    const prompt = buildAgentSystemPrompt({ enabledSkillIds: [] }, 'terminal', null, ['ssh_hosts', 'ssh_exec', 'AskUserQuestion'], []);
    expect(prompt).toContain('必须先调用 ssh_hosts(action="list")');
    expect(prompt).toContain('先通过 AskUserQuestion 澄清目标');
    expect(prompt).toContain('用户口中的“机器 id”只是目标线索');
    expect(prompt).toContain('即使只有一台');
    expect(prompt).toContain('确认后只使用列表返回的真实 hostId');
    expect(prompt).not.toContain('模糊描述可原样传给');
    expect(prompt).not.toContain('不要自己再调用 AskUserQuestion');
  });
});
