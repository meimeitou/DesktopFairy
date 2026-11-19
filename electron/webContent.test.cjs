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
