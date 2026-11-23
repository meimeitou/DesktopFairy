const fs = require('node:fs/promises');
const path = require('node:path');
const { createHash, randomUUID } = require('node:crypto');
const { findResultPassages } = require('./resultSearch.cjs');
const { estimateTokens, textPrefix } = require('./contextTokens.cjs');

/** Resources share the topic's existing tool-result lifecycle (delete/fork). */
function createToolResultStore({ topicId = randomUUID(), baseDir } = {}) {
  if (!/^[\w:-]+$/.test(topicId)) throw new Error('Invalid tool-result topic');
  const directory = () => path.join(baseDir ? baseDir() : path.join(require('electron').app.getPath('userData'), 'chat_tool_results'), topicId);
  async function load(resultId) {
    if (!/^context-[a-f0-9]{64}$/.test(resultId)) throw new Error('Invalid tool-result id');
    return JSON.parse(await fs.readFile(path.join(directory(), `${resultId}.json`), 'utf8')).text;
  }
  return {
    async search(resultId, { query, maxTokens = 2000 }) {
      const text = await load(resultId);
      return { resultId, passages: findResultPassages(text, query, maxTokens) };
    },
    async put(text) {
      const resultId = `context-${createHash('sha256').update(text).digest('hex')}`;
      await fs.mkdir(directory(), { recursive: true });
      const file = path.join(directory(), `${resultId}.json`);
      // Publish a complete immutable file atomically, also for parallel calls
      // producing identical content. Readers never see partially written JSON.
      const temporary = `${file}.${randomUUID()}.tmp`;
      try {
        await fs.writeFile(temporary, JSON.stringify({ text }), { mode: 0o600 });
        try { await fs.link(temporary, file); }
        catch (error) { if (error.code !== 'EEXIST') throw error; }
      } finally { await fs.rm(temporary, { force: true }); }
      return resultId;
    },
    async read(resultId, { offset = 0, maxTokens = 2000, maxSerializedTokens = Infinity } = {}) {
      if (!Number.isSafeInteger(offset) || offset < 0) throw new Error('offset must be a non-negative integer');
      const text = await load(resultId);
      if (offset > 0 && /[\uDC00-\uDFFF]/.test(text[offset] || '')) offset--;
      let budget = Number.isFinite(maxTokens) ? Math.max(1, Math.min(4000, Math.floor(maxTokens))) : 2000;
      while (true) {
        const content = textPrefix(text.slice(offset, offset + budget * 4), budget);
        const nextOffset = offset + content.length;
        const result = { resultId, content, offset, totalChars: text.length, truncated: nextOffset < text.length,
          nextOffset: nextOffset < text.length ? nextOffset : null };
        if (estimateTokens(JSON.stringify(result)) <= maxSerializedTokens || budget <= 1) return result;
        budget = Math.max(1, Math.floor(budget * 0.75));
      }
    },
  };
}

async function boundToolOutput(value, store, maxTokens = 8000) {
  const text = typeof value === 'string' ? value : JSON.stringify(value ?? null);
  if (estimateTokens(text) <= maxTokens) return value;
  // Commit the original before replacing anything; persistence failure is fatal.
  const resultId = await store.put(text);
  const failure = value && typeof value === 'object' && value.ok === false;
  const metadata = {
    ok: !failure, ...(failure ? { error: textPrefix(String(value.error || 'Tool error'), 100) } : {}),
    resultId, totalChars: text.length, truncated: true,
    ...(Number.isInteger(value?.exitCode) ? { exitCode: value.exitCode } : {}),
    note: '可按 resultId 检索或分页补读。',
  };
  if (Array.isArray(value?.results) && value.results.every((item) => typeof item?.url === 'string')
      && /^context-[a-f0-9]{64}$/.test(value.resultId)) {
    // Preserve the ordered list of web sources whenever it fits.
    const sources = value.results.map(({ id, title, url, resultId: sourceId, date }) => ({
      id, title, url, resultId: sourceId, date,
    }));
    for (const snippetLimit of [160, 60, 0]) {
      const results = sources.map((source, index) => {
        const item = value.results[index];
        const remaining = textPrefix(item.content || '', snippetLimit);
        const passages = Array.isArray(item.passages) ? item.passages.slice(0, 1).map(({ offset, content }) => {
          const excerpt = textPrefix(content, snippetLimit);
          return { offset, endOffset: offset + excerpt.length, content: excerpt };
        }) : [];
        return { ...source, ...(remaining ? { content: remaining } : {}), ...(snippetLimit && passages?.length ? { passages } : {}) };
      });
      const output = { ...metadata, results };
      if (estimateTokens(JSON.stringify(output)) <= maxTokens) return output;
    }
  }
  return previewWithinBudget(text, metadata, maxTokens);
}

function previewWithinBudget(text, metadata, maxTokens) {
  let budget = Math.max(0, maxTokens - estimateTokens(JSON.stringify(metadata)) - 80);
  while (true) {
    const head = textPrefix(text, Math.floor(budget * 0.7));
    const tail = budget ? [...textPrefix([...text.slice(-budget * 4)].reverse().join(''), Math.floor(budget * 0.2))].reverse().join('') : '';
    const result = { ...metadata, content: head, nextOffset: head.length, tail, tailOffset: text.length - tail.length };
    // Escaped quotes/newlines in a serialized preview also consume input.
    if (estimateTokens(JSON.stringify(result)) <= maxTokens) return result;
    if (budget === 0) {
      const { ok, resultId, error, exitCode } = metadata;
      return { ok, resultId, truncated: true, ...(error ? { error: textPrefix(error, 24) } : {}), exitCode };
    }
    budget = Math.floor(budget * 0.75);
  }
}

/** Only model-facing tool result text is replaced, never calls or user inputs. */
async function pruneToolResults(messages, store, maxTokens = 2000, select = () => true) {
  let changed = false;
  const replacement = [];
  for (const message of messages) {
    if (!select(message) || message.role !== 'tool' || !Array.isArray(message.content)) { replacement.push(message); continue; }
    const content = [];
    for (const part of message.content) {
      if (part.type !== 'tool-result' || !['json', 'text', 'error-json', 'error-text'].includes(part.output?.type)) { content.push(part); continue; }
      const value = part.output.value;
      // Existing bounded results already have a stable original resource.
      const bounded = /^context-[a-f0-9]{64}$/.test(value?.resultId) && value.truncated && Number.isInteger(value.tailOffset)
        ? (estimateTokens(JSON.stringify(value)) > maxTokens
          ? { ...previewWithinBudget(value.content || '', { ok: value.ok, resultId: value.resultId, totalChars: value.totalChars, truncated: true, note: value.note, ...(Number.isInteger(value.exitCode) ? { exitCode: value.exitCode } : {}), ...(value.error ? { error: value.error } : {}) }, maxTokens), tail: '', tailOffset: value.totalChars } : value)
        : await boundToolOutput(value, store, maxTokens);
      if (bounded === value) content.push(part);
      else { changed = true; content.push({ ...part, output: { type: part.output.type.startsWith('error-') ? 'error-json' : 'json', value: bounded } }); }
    }
    replacement.push({ ...message, content });
  }
  return changed ? replacement : null;
}

module.exports = { createToolResultStore, boundToolOutput, pruneToolResults };
