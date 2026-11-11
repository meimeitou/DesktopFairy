const Module = require('module');
const fs = require('fs');
const os = require('os');
const path = require('path');
const skillService = require('./agentSkillService.cjs');
const realLoad = skillService.loadSelectedSkills;

let root;
let handlers;
let contexts;
let starts;
let configs;
let snapshot;
let restore;
beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-stream-'));
  handlers = {};
  contexts = [];
  starts = [];
  configs = [];
  snapshot = { sshHosts: [] };
  const diskConfig = { id: 'agent', enabledSkillIds: ['automatic'], maxTurns: 4 };
  const originalLoad = Module._load;
  const entry = require.resolve('./aiStreamService.cjs');
  const oldEntry = require.cache[entry];
  const stubs = {
    './ai/streamManager/AiStreamManager.cjs': { manager: {
      startStream: (args) => { starts.push(args); return { mode: 'started', requestId: args.requestId }; },
      attach: () => {},
    } },
    './ai/chunkBridge.cjs': { createChunkBridge: () => ({}) },
    './ai/topicBroadcast.cjs': { broadcastToTopic: () => {} },
    './ai/prepareAgentStream.cjs': { createAgentTextStream: (ctx) => { contexts.push(ctx); return () => {}; } },
    './settingsSnapshot.cjs': { getSnapshot: () => snapshot, resolveForSend: () => {
      configs.push(diskConfig);
      return { ok: true, agentConfig: diskConfig, apiConfig: { apiHost: 'https://example.com', modelName: 'test' } };
    } },
    './knowledge/vaultService.cjs': { validIds: () => [] },
  };
  Module._load = function(request, parent, isMain) {
    if (parent?.filename === entry && stubs[request]) return stubs[request];
    return originalLoad.call(this, request, parent, isMain);
  };
  skillService.loadSelectedSkills = (ids) => realLoad(ids, root);
  delete require.cache[entry];
  try {
    const { registerAiStreamHandlers } = require(entry);
    registerAiStreamHandlers({ handle: (channel, fn) => { handlers[channel] = fn; } }, { getWindows: () => [] });
  } catch (e) {
    Module._load = originalLoad;
    throw e;
  }
  restore = () => {
    Module._load = originalLoad;
    skillService.loadSelectedSkills = realLoad;
    delete require.cache[entry];
    if (oldEntry) require.cache[entry] = oldEntry;
  };
});
afterEach(() => { restore(); fs.rmSync(root, { recursive: true, force: true }); });
function send(ids, selectedHosts, topicId = "terminal:preview") {
  return handlers['ai:stream_open']({ sender: {} }, {
    topicId, selectedHosts, requestId: `r${configs.length}`, messages: [{ role: 'user', content: 'Do work' }], selectedSkillIds: ids,
    selectedSkillsPrompt: 'Renderer content must be ignored',
  });
}
it('fails preflight before starting a stream and returns the failed skill ids', async () => {
  const result = await send(['missing']);
  expect(result.mode).toBe('invalid_skills');
  expect(result.skillErrors.missing).toContain('文件已不存在');
  expect(starts).toHaveLength(0);
  expect(contexts).toHaveLength(0);
});
it('passes authoritative bodies to this run, without changing settings or the next run', async () => {
  fs.mkdirSync(path.join(root, 'manual'));
  fs.writeFileSync(path.join(root, 'manual', 'SKILL.md'), 'Authoritative instructions');
  expect((await send(['manual'])).mode).toBe('started');
  expect(contexts[0].selectedSkillsPrompt).toContain('Authoritative instructions');
  expect(contexts[0].selectedSkillsPrompt).not.toContain('Renderer content');
  expect(contexts[0].agentConfig.enabledSkillIds).toEqual(['automatic', 'manual']);
  expect(configs[0].enabledSkillIds).toEqual(['automatic']);
  await send(undefined);
  expect(contexts[1].selectedSkillsPrompt).toBe('');
  expect(contexts[1].agentConfig.enabledSkillIds).toEqual(['automatic']);
});

it('rejects invalid host selection before starting model or tools', async () => {
  const host = { id: 'a', name: 'A', host: '10.0.0.1', user: 'ops', port: 22, proxyJump: '' };
  snapshot.sshHosts = [host];
  expect((await send(undefined, [{ ...host, host: 'changed' }])).mode).toBe('invalid_hosts');
  expect(starts).toHaveLength(0);
  const accepted = await send(undefined, [{ ...host, password: 'secret', name: 'forged' }]);
  expect(accepted.mode).toBe('started');
  expect(contexts[0].selectedHosts).toEqual([{ ...host, group: '' }]);
  await send(undefined);
  expect(contexts[1].selectedHosts).toEqual([]);
  expect((await send(undefined, [host], 'ordinary-chat')).mode).toBe('invalid_hosts');
  expect(starts).toHaveLength(2);
});
