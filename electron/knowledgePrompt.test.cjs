const { buildAgentSystemPrompt } = require('./agentService.cjs');
const { knowledgeToolDefinitions } = require('./knowledge/tools.cjs');

it('actively directs knowledge-backed answers to search the selected vaults first', () => {
  const prompt = buildAgentSystemPrompt({ enabledSkillIds: [] }, 'terminal-local', null,
    ['kb_search', 'kb_read', 'kb_resolve_link'], [], null,
    [{ id: 'ops', name: '运维手册', path: '/private/notes' }]);
  expect(prompt).toContain('运维手册');
  expect(prompt).toContain('主动调用 kb_search');
  expect(prompt).toContain('不要等待用户提醒');
  expect(prompt).toContain('优先于凭模型记忆直接回答');
  expect(prompt).toContain('kb_read');
  expect(prompt).not.toContain('/private/notes');
});

it('does not claim a vault is mounted when knowledge tools are unavailable', () => {
  const prompt = buildAgentSystemPrompt({ enabledSkillIds: [] }, 'local', null,
    ['read'], [], null, [{ id: 'ops', name: '运维手册' }]);
  expect(prompt).not.toContain('## 本地知识库');
  expect(prompt).not.toContain('运维手册');
});

it('reinforces proactive retrieval in the actual search tool description', () => {
  const search = knowledgeToolDefinitions().find((tool) => tool.function.name === 'kb_search');
  expect(search.function.description).toContain('Proactively');
});

it('keeps source-based answers and reasonable retrieval boundaries in the prompt', () => {
  const prompt = buildAgentSystemPrompt({}, 'local', null, ['kb_search', 'kb_read']);
  expect(prompt).toContain('按行读取相关原文');
  expect(prompt).toContain('无命中时尝试不同关键词');
  expect(prompt).toContain('不得编造');
  expect(prompt).toContain('问候、闲聊、纯文本改写');
  expect(prompt).toContain('用户明确要求不查知识库时遵从');
});
