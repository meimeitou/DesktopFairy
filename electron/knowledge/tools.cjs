'use strict';

const { searchKnowledge, readKnowledgeItem } = require('./search.cjs');
const catalog = require('./catalog.cjs');

function knowledgeToolDefinitions() {
  return [
    {
      type: 'function',
      function: {
        name: 'kb_search',
        description:
          'Search the user-selected knowledge bases. Use this when the question may be answered by uploaded files or notes. Returns snippets with itemId for follow-up kb_read.',
        parameters: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Search query' },
          },
          required: ['query'],
        },
      },
      _approval: 'auto',
    },
    {
      type: 'function',
      function: {
        name: 'kb_read',
        description:
          'Read the preprocessed full text of a knowledge item by itemId returned from kb_search.',
        parameters: {
          type: 'object',
          properties: {
            itemId: { type: 'string', description: 'Knowledge item id from kb_search' },
            baseId: { type: 'string', description: 'Knowledge base id if known' },
          },
          required: ['itemId'],
        },
      },
      _approval: 'auto',
    },
  ];
}

function resolveItemBase(itemId, allowedBaseIds) {
  for (const base of catalog.listBases()) {
    if (allowedBaseIds.length && !allowedBaseIds.includes(base.id)) continue;
    if ((base.items || []).some((item) => item.id === itemId)) return base;
  }
  return null;
}

async function executeKnowledgeTool(toolName, args, deps = {}) {
  const allowed = Array.isArray(deps.knowledgeBaseIds)
    ? deps.knowledgeBaseIds.filter(Boolean)
    : [];
  if (allowed.length === 0) {
    return JSON.stringify({ ok: false, error: '未选择知识库' });
  }
  if (toolName === 'kb_search') {
    const query = String(args?.query || '').trim();
    if (!query) return JSON.stringify({ ok: false, error: 'query required' });
    const hits = await searchKnowledge({ query, baseIds: allowed });
    return JSON.stringify({
      ok: true,
      hits: hits.map((hit) => ({
        itemId: hit.itemId,
        baseId: hit.baseId,
        baseName: hit.baseName,
        sourceName: hit.sourceName,
        score: Number(hit.score.toFixed(4)),
        text: hit.text,
      })),
    });
  }
  if (toolName === 'kb_read') {
    const itemId = String(args?.itemId || '').trim();
    if (!itemId) return JSON.stringify({ ok: false, error: 'itemId required' });
    const base = args?.baseId
      ? catalog.getBase(args.baseId)
      : resolveItemBase(itemId, allowed);
    if (!base || (allowed.length && !allowed.includes(base.id))) {
      return JSON.stringify({ ok: false, error: '条目不在当前检索范围内' });
    }
    const result = readKnowledgeItem(base.id, itemId);
    return JSON.stringify({
      ok: true,
      itemId,
      baseId: base.id,
      sourceName: result.item.sourceName,
      truncated: result.truncated,
      text: result.text,
    });
  }
  return JSON.stringify({ ok: false, error: `unknown knowledge tool ${toolName}` });
}

module.exports = {
  knowledgeToolDefinitions,
  executeKnowledgeTool,
};
