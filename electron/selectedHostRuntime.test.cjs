const { createHostConversationService } = require('./hostConversationService.cjs');
const { projectHostSelection, validateSelectedHosts, buildSelectedHostsPrompt } = require('./hostSelection.cjs');
const { resolveAgentEnvironment } = require('./agentEnvironment.cjs');
const { executeAgentTool } = require('./agentTools.cjs');
const { getEnabledOpenAiToolDefinitions } = require('./agentBuiltinCatalog.cjs');
const globalSnapshot = require('./settingsSnapshot.cjs');
const approval = require('./agentToolApproval.cjs');
let settings, svc, topic, previous;
beforeEach(() => {
  previous = globalSnapshot.getSnapshot();
  settings = { sshHosts: ['a','b','c'].map((id, i) => ({ id, name: id.toUpperCase(), host: `10.0.0.${i + 1}`, user: 'ops', port: 22, authMethod: 'auto' })), sshCredentials: [] };
  globalSnapshot.setSnapshot(settings);
  topic = { id: 'topic', origin: 'terminal', host: { hostId: 'a', grants: {}, cwdByHost: {} } };
  svc = createHostConversationService({ topicStore: { getTopic: () => topic }, settingsSnapshot: globalSnapshot });
});
afterEach(() => { globalSnapshot.setSnapshot(previous); approval.clearAllToolApprovals(); });
const pick = (id) => projectHostSelection(settings.sshHosts.find((h) => h.id === id));
async function tool(rt, args, answer) {
  const events = [];
  const result = await executeAgentTool({ id: 'call-test', function: { name: 'ssh_cwd', arguments: JSON.stringify(args) } }, {
    requestId: 'selected-host-test', context: 'host', hostRuntime: rt, assertEnvironment: rt.assertValid,
    agentConfig: { chatMode: 'full-auto' }, bypassApproval: true, allowedToolNames: new Set(['ssh_cwd']),
    safeSend: (_channel, event) => {
      events.push(event);
      if (answer && event.status === 'awaiting_input') queueMicrotask(() => {
        const question = JSON.parse(event.toolArgs).questions[0];
        approval.dispatchUserAnswer(event.approvalId, { [question.question]: answer });
      });
    },
  });
  return { data: JSON.parse(result.resultText), events };
}
it('validates all target identities, uses authoritative names and excludes secrets', () => {
  const selected = { ...pick('b'), name: 'forged-name', password: 'secret', privateKeyPath: '/secret' };
  const result = validateSelectedHosts([selected, selected], settings.sshHosts);
  expect(result.errors).toEqual({});
  expect(result.hosts).toEqual([pick('b')]);
  const prompt = buildSelectedHostsPrompt(result.hosts);
  expect(prompt).toContain('"hostId":"b"');
  expect(prompt).not.toContain('secret');
  expect(prompt).not.toContain('forged-name');
  expect(validateSelectedHosts([{ ...selected, host: 'changed' }, pick('c')], settings.sshHosts).errors.b).toBeTruthy();
  for (const field of ['port','user','proxyJump']) {
    expect(validateSelectedHosts([{ ...pick('b'), [field]: field === 'port' ? 2222 : 'changed' }], settings.sshHosts).errors.b).toBeTruthy();
  }
  expect(validateSelectedHosts(null, settings.sshHosts).errors.selection).toBeTruthy();
});
it('selecting B ignores the visible terminal A, even when A is disconnected', async () => {
  const getSessionService = () => { throw new Error('must not inspect A'); };
  for (const terminalSessionId of ['ssh_a', undefined]) {
    const env = resolveAgentEnvironment({ topicId: 'terminal:tab', terminalSessionId, selectedHosts: [pick('b')], hostConversationService: svc, getSessionService });
    expect(env.context).toBe('host');
    expect(env.hostRuntime.defaultHostId).toBe('b');
    const names = getEnabledOpenAiToolDefinitions({ toolOverrides: { Terminal: true, bash: true } }, env.context).map((t) => t.function.name);
    expect(names).not.toContain('Terminal');
    expect(names).not.toContain('bash');
    env.hostRuntime.setCwd(env.hostRuntime.topicId, 'b', '/b-only');
    const result = await tool(env.hostRuntime, {});
    expect(result.data).toMatchObject({ ok: true, cwd: '/b-only' });
    expect(result.events.some((e) => e.status === 'awaiting_input')).toBe(false);
  }
});
it('requires explicit hostId for multi-host operations and does not choose the first host', async () => {
  const rt = svc.resolveSelectedHostsRuntime('terminal:tab', [pick('a'), pick('b')]);
  expect(rt.defaultHostId).toBeNull();
  expect((await tool(rt, {})).data.error).toContain('hostId');
  expect((await tool(rt, { host: 'B' })).data.error).toContain('hostId');
  rt.setCwd(rt.topicId, 'b', '/b');
  expect((await tool(rt, { hostId: 'b' })).data.cwd).toBe('/b');
});
it('keeps all grants request-local and requires normal confirmation for an unselected host', async () => {
  const rt = svc.resolveSelectedHostsRuntime('topic', [pick('b')]);
  expect(rt.isGranted('b')).toBe(true);
  expect(rt.isGranted('c')).toBe(false);
  const result = await tool(rt, { hostId: 'c' }, 'C');
  expect(result.data.ok).toBe(true);
  expect(result.events.some((e) => e.status === 'awaiting_input')).toBe(true);
  expect(rt.isGranted('c')).toBe(true);
  expect(topic.host.grants).toEqual({});
  const next = svc.resolveSelectedHostsRuntime('topic', [pick('a')]);
  expect(next.isGranted('b')).toBe(false);
  expect(next.isGranted('c')).toBe(false);
});
it('rechecks identities during execution and preserves existing approval-time checks', () => {
  const rt = svc.resolveSelectedHostsRuntime('topic', [pick('b')]);
  const operation = rt.captureOperation('b');
  settings.sshHosts[1].credentialId = 'new';
  expect(() => rt.assertOperation(operation)).toThrow('凭据已变化');
  settings.sshHosts[1].host = 'other';
  expect(() => rt.assertValid()).toThrow('连接目标已变化');
  expect(() => svc.resolveSelectedHostsRuntime('topic', [operation])).toThrow();
});
it('fails deleted targets and deleted topics instead of falling back to the bound host', () => {
  const selected = pick('b');
  const rt = svc.resolveSelectedHostsRuntime('topic', [selected]);
  settings.sshHosts = settings.sshHosts.filter((h) => h.id !== 'b');
  expect(validateSelectedHosts([selected], settings.sshHosts).errors.b).toContain('删除');
  expect(() => rt.assertValid()).toThrow('删除');
  topic = null;
  expect(() => rt.assertValid()).toThrow('对话已被删除');
});

it('uses the exact selected id even when another machine has that id as its display name', async () => {
  settings.sshHosts[2].name = 'b';
  const rt = svc.resolveSelectedHostsRuntime('topic', [pick('b')]);
  const result = await tool(rt, { hostId: 'b' });
  expect(result.data.ok).toBe(true);
  expect(result.events.some((e) => e.status === 'awaiting_input')).toBe(false);
});
