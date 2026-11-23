const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { executeBuiltinTool } = require('./agentBuiltinExecutors.cjs');
const { createToolResultStore, boundToolOutput } = require('./ai/toolResultStore.cjs');
const { estimateTokens } = require('./ai/contextTokens.cjs');
const { extractWebText, readWebResponse } = require('./webContent.cjs');
let root, originalFetch;
beforeEach(() => { root = fs.mkdtempSync(path.join(os.tmpdir(), 'web-content-')); originalFetch = global.fetch; });
afterEach(() => { global.fetch = originalFetch; fs.rmSync(root, { recursive: true, force: true }); });

it('extracts main content, decodes entities, and discards navigation and scripts', () => {
  const html = '<title>Example &amp; Docs</title><nav>noise</nav><main><h1>Guide</h1><script>danger()</script><p>A &lt; B &amp; C</p></main><footer>noise</footer>';
  expect(extractWebText(html, 'text/html')).toEqual({ title: 'Example & Docs', content: 'Guide\n\nA < B & C' });
  expect(extractWebText('const x = "<div>";', 'text/plain').content).toBe('const x = "<div>";');
});

it('budgets an entire batch, saves complete page and raw response, and returns stable read-back ids', async () => {
  const html = '<html><main><p>' + '证据'.repeat(30000) + 'IMPORTANT-END</p></main><script>noise</script></html>';
  global.fetch = async () => new Response(html, { headers: { 'content-type': 'text/html' } });
  const store = createToolResultStore({ topicId: 't', baseDir: () => root });
  const output = JSON.parse(await executeBuiltinTool('WebFetch', { urls: Array.from({ length: 20 }, (_, i) => `https://example.test/${i}`) }, { resultStore: store }));
  expect(output.results).toHaveLength(20);
  expect(output.results.reduce((n, r) => n + estimateTokens(r.content), 0)).toBeLessThanOrEqual(6000);
  const first = output.results[0];
  expect(first.truncated).toBe(true);
  const page = await store.read(first.resultId, { offset: 59000 });
  expect(page.content).toContain('IMPORTANT-END');
  expect((await store.read(first.rawResultId)).content).toContain('<html>');
  expect(output.results[0].content).not.toContain('noise');
  const modelOutput = await boundToolOutput(output, store, 6400);
  expect(modelOutput.results).toHaveLength(20);
  expect(estimateTokens(JSON.stringify(modelOutput))).toBeLessThanOrEqual(6400);
});

it('rejects oversized downloads before parsing and cancels the response stream', async () => {
  await expect(readWebResponse(new Response('x'.repeat(200)), 100)).rejects.toThrow('超过');
});

it('does not turn a cancelled fetch into a successful tool result', async () => {
  const controller = new AbortController();
  global.fetch = async () => { controller.abort(); throw new DOMException('Aborted', 'AbortError'); };
  await expect(executeBuiltinTool('WebFetch', { url: 'https://example.test' }, { signal: controller.signal })).rejects.toMatchObject({ name: 'AbortError' });
});

it('fetches evidence from the middle of a long page and can find it again by its exact offset', async () => {
  const evidence = '基准测试显示吞吐量提升 42%，主要来自批量写入。';
  const html = '<main><p>' + '介绍。'.repeat(9000) + '</p><h2>基准测试</h2><p>' +
    evidence + '</p><p>' + '附录。'.repeat(9000) + '</p></main>';
  global.fetch = async () => new Response(html, { headers: { 'content-type': 'text/html' } });
  const resultStore = createToolResultStore({ topicId: 't', baseDir: () => root });
  const output = JSON.parse(await executeBuiltinTool('WebFetch', {
    url: 'https://example.test/report', prompt: '基准测试的吞吐量结论',
  }, { resultStore }));
  const [{ passages, resultId }] = output.results;
  const passage = passages.find((item) => item.content.includes(evidence));
  expect(passage.offset).toBeGreaterThan(20000);
  const page = await resultStore.read(resultId, { offset: passage.offset, maxTokens: 500 });
  expect(page.content.startsWith(passage.content)).toBe(true);
  const restarted = createToolResultStore({ topicId: 't', baseDir: () => root });
  const found = await restarted.search(resultId, { query: '吞吐量提升 42%' });
  expect(found.passages.some((item) => item.content.includes(evidence))).toBe(true);
});

it('deduplicates search URLs while preserving individual sources and provider data', async () => {
  const providerData = { results: [
    { title: 'Original', url: 'https://example.test/doc', content: '相关内容'.repeat(1000), score: 0.8 },
    { title: 'Duplicate', url: 'https://example.test/doc#top', content: 'duplicate' },
    { title: 'Other', url: 'https://example.test/other', content: 'other', published_date: '2026-01-01' },
  ] };
  global.fetch = async () => Response.json(providerData);
  const resultStore = createToolResultStore({ topicId: 't', baseDir: () => root });
  const output = JSON.parse(await executeBuiltinTool('WebSearch', { query: 'query' }, {
    resultStore, webSearchConfig: { provider: 'tavily', tavilyApiKey: 'test' },
  }));
  expect(output.results.map(({ title }) => title)).toEqual(['Original', 'Other']);
  expect(output.results[1].date).toBe('2026-01-01');
  expect((await resultStore.read(output.resultId, { offset: 7500 })).content).toContain('"score":0.8');
  expect((await resultStore.read(output.results[0].resultId, { maxTokens: 4000 })).content).toContain(providerData.results[0].content.slice(0, 3000));
});
