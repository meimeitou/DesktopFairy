const fs = require('fs');
const os = require('os');
const path = require('path');
const { registerChatSessionHandlers } = require('./chatSessionService.cjs');

it('round-trips skill selection and original text through main-process session persistence', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-session-'));
  const handlers = {};
  try {
    registerChatSessionHandlers({
      ipcMain: { handle: (channel, fn) => { handlers[channel] = fn; } },
      sessionPath: () => path.join(root, 'legacy.json'),
      topicsIndexPath: () => path.join(root, 'topics.json'),
      sessionsDir: () => path.join(root, 'sessions'),
      toolResultsDir: () => path.join(root, 'results'),
      chatLogsDir: () => path.join(root, 'logs'),
    });
    const host = { id: 'a', name: '机器 A', host: '10.0.0.1', port: 22, user: 'ops', proxyJump: '', group: '生产' };
    const message = { id: 'user', role: 'user', content: '@review @docs\n检查代码', rawText: '检查代码', selectedSkillIds: ['review', 'docs'], selectedHosts: [host] };
    const result = await handlers['chat:session:save']({}, {
      topicId: 'skill-test', session: { version: 2, messages: [message], draftInput: '下个任务', draftSelectedSkillIds: ['docs'], draftSelectedHosts: [{ ...host, password: 'must-be-stripped' }] },
    });
    expect(result.ok).toBe(true);
    const restored = await handlers['chat:session:load']({}, 'skill-test');
    expect(restored.messages[0]).toMatchObject(message);
    expect(restored.draftSelectedSkillIds).toEqual(['docs']);
    expect(restored.draftInput).toBe('下个任务');
    expect(restored.draftSelectedHosts).toEqual([host]);
    expect(JSON.stringify(restored)).not.toContain('must-be-stripped');
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
