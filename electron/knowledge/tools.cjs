'use strict';
const TOOL_NAMES = new Set(['kb_search', 'kb_read', 'kb_resolve_link']);
function knowledgeToolDefinitions() {
  const def = (name, description, properties, required) => ({ type: 'function', function: { name, description, parameters: { type: 'object', properties, required } } });
  const baseId = { type: 'string', description: 'Vault id returned by kb_search' };
  const filePath = { type: 'string', description: 'Vault-relative Markdown file path' };
  return [
    def('kb_search', 'Search selected local Obsidian vaults by keywords (Chinese supported). Returns current source snippets and line numbers. Try alternative keywords when no matches. Never assume this is semantic search.', {
      query: { type: 'string' }, baseIds: { type: 'array', items: { type: 'string' }, description: 'Optional subset of selected vault ids' }, limit: { type: 'integer', minimum: 1, maximum: 50 },
    }, ['query']),
    def('kb_read', 'Read current Markdown source in a selected vault. Returns line numbers and nextLine for continuation. Cite vault name, relative path and lines in your answer. Vaults are read-only.', {
      baseId, path: filePath, startLine: { type: 'integer', minimum: 1 }, endLine: { type: 'integer', minimum: 1 },
    }, ['baseId', 'path']),
    def('kb_resolve_link', 'Resolve a Wiki or Markdown internal link from a source note in the same selected vault, including heading anchors. If ambiguous, choose among returned candidates before kb_read. Does not expand embeds or run plugins.', {
      baseId, sourcePath: filePath, link: { type: 'string' },
    }, ['baseId', 'sourcePath', 'link']),
  ];
}
async function executeKnowledgeTool(name, args, deps = {}) {
  const service = require('./vaultService.cjs');
  const allowed = service.validIds(deps.knowledgeBaseIds);
  if (!allowed.length) return JSON.stringify({ ok: false, error: '未选择可用 vault' });
  let input = { ...args };
  if (name === 'kb_search') {
    if (!String(input.query || '').trim()) return JSON.stringify({ ok: false, error: 'query required' });
    if (input.baseIds !== undefined && (!Array.isArray(input.baseIds) || input.baseIds.some((id) => !allowed.includes(id)))) {
      return JSON.stringify({ ok: false, error: 'vault 不在当前检索范围内' });
    }
    input.baseIds = input.baseIds ?? allowed;
  } else if (!allowed.includes(input.baseId)) return JSON.stringify({ ok: false, error: 'vault 不在当前检索范围内' });
  try {
    const method = { kb_search: 'search', kb_read: 'read', kb_resolve_link: 'resolve' }[name];
    if (!method) throw new Error('未知知识库工具');
    const result = await service.query(method, input, deps.signal);
    return JSON.stringify({ ok: true, ...result });
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    return JSON.stringify({ ok: false, error: error.message });
  }
}
module.exports = { TOOL_NAMES, knowledgeToolDefinitions, executeKnowledgeTool };
