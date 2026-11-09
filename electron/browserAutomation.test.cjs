const { EventEmitter } = require('node:events');
const { BrowserAutomation } = require('./browserAutomation.cjs');
const { getEnabledOpenAiToolDefinitions, shouldPromptForTool } = require('./agentBuiltinCatalog.cjs');

function session(topicId = 'chat-1', requestId = 'request-1') {
  const controller = new AbortController();
  return { context: 'local', topicId, requestId, signal: controller.signal, controller, agentConfig: {} };
}
function guest() {
  const wc = new EventEmitter();
  wc.isDestroyed = () => false;
  wc.getURL = () => 'https://example.com/';
  wc.getTitle = () => 'Example';
  wc.loadURL = async () => {};
  wc.executeJavaScriptInIsolatedWorld = async (_world, scripts) => {
    const match = scripts[0].code.match(/\)\((\{.*\})\); \} catch/s);
    const command = JSON.parse(match[1]);
    return command.kind === 'snapshot' ? { snapshotId: command.newSnapshotId, elements: [] } : { performed: command.action };
  };
  return wc;
}
function setup(options = {}) {
  const browser = new BrowserAutomation(options);
  const id = browser.add('https://example.com');
  const wc = guest();
  browser.register(id, wc);
  return { browser, id, wc };
}

describe('browser control lifecycle', () => {
  it('deduplicates the same action id and rejects conflicting reuse', async () => {
    const { browser, id, wc } = setup();
    const a = session();
    const snap = await browser.execute('browser_snapshot', { tabId: id }, a);
    let calls = 0;
    wc.executeJavaScriptInIsolatedWorld = async () => { calls++; return { performed: 'click', outcome: 'applied' }; };
    const args = { tabId: id, snapshotId: snap.snapshotId, elementId: '1', action: 'click', action_id: 'once' };
    const [first, replay] = await Promise.all([browser.execute('browser_act', args, a), browser.execute('browser_act', args, a)]);
    expect(first.outcome).toBe('applied'); expect(first.action_id).toBe('once');
    expect(replay.replayed).toBe(true); expect(calls).toBe(1);
    expect((await browser.execute('browser_act', { ...args, elementId: '2' }, a)).error).toBe('action_id_conflict');
    browser.release(a.topicId, a.requestId);
  });
  it('reports pre-dispatch failures separately from uncertain dispatched calls', async () => {
    const { browser, id, wc } = setup({ timeoutMs: 20 });
    const a = session();
    const snap = await browser.execute('browser_snapshot', { tabId: id }, a);
    const stale = await browser.execute('browser_act', { tabId: id, snapshotId: 'old', elementId: '1', action: 'click' }, a);
    expect(stale.outcome).toBe('not_applied'); expect(stale.action_id).toBeTruthy();
    let settle;
    wc.executeJavaScriptInIsolatedWorld = () => new Promise((r) => { settle = r; });
    const args = { tabId: id, snapshotId: snap.snapshotId, elementId: '1', action: 'click', action_id: 'timeout-once' };
    const unknown = await browser.execute('browser_act', args, a);
    expect(unknown.outcome).toBe('unknown');
    expect((await browser.execute('browser_act', args, a)).replayed).toBe(true);
    settle({ performed: 'click' }); await new Promise((r) => setImmediate(r));
    browser.release(a.topicId, a.requestId);
  });
  it('returns explicit recovery metadata for stale browser instances and generations', async () => {
    const { browser, id, wc } = setup();
    const a = session();
    const snapshot = await browser.execute('browser_snapshot', { tabId: id }, a);
    browser.disconnect(id, wc, 'crash');
    const reset = await browser.execute('browser_act', { tabId: id, generation: 1, snapshotId: snapshot.snapshotId, action: 'click', elementId: '1' }, a);
    expect(reset.error).toBe('session_restarted'); expect(reset.outcome).toBe('not_applied'); expect(reset.tabs[0].id).toBe(id);
    const other = await browser.execute('browser_tabs', { action: 'list', instanceId: 'previous-app' }, a);
    expect(other.error).toBe('session_restarted'); expect(other.instanceId).toBe(browser.instanceId);
    browser.release(a.topicId, a.requestId);
  });
  it('does not let completion from a lost guest unlock an operation in its replacement', async () => {
    const a = session();
    const { browser, id, wc } = setup({ abort: () => a.controller.abort() });
    const first = await browser.execute('browser_snapshot', { tabId: id }, a);
    let oldSettles;
    wc.executeJavaScriptInIsolatedWorld = () => new Promise((r) => { oldSettles = r; });
    const oldCall = browser.execute('browser_act', { tabId: id, action: 'click', elementId: '1', snapshotId: first.snapshotId }, a);
    while (!oldSettles) await new Promise((r) => setImmediate(r));
    browser.disconnect(id, wc, 'crash');
    expect((await oldCall).outcome).toBe('unknown');
    const replacement = guest(); browser.register(id, replacement);
    const b = session('chat-2', 'replacement');
    const next = await browser.execute('browser_snapshot', { tabId: id }, b);
    let newSettles;
    replacement.executeJavaScriptInIsolatedWorld = () => new Promise((r) => { newSettles = r; });
    const newCall = browser.execute('browser_act', { tabId: id, action: 'click', elementId: '1', snapshotId: next.snapshotId }, b);
    while (!newSettles) await new Promise((r) => setImmediate(r));
    oldSettles({ performed: 'click' }); await new Promise((r) => setImmediate(r));
    expect(browser.tabs.get(id).pending).toBe(true);
    expect((await browser.execute('browser_snapshot', { tabId: id }, b)).error).toContain('tab_busy');
    newSettles({ performed: 'click' }); expect((await newCall).ok).toBe(true);
    browser.release(b.topicId, b.requestId);
  });
  it('holds a tab through the request and releases it on abort, with no stale release of a newer request', async () => {
    const { browser, id } = setup();
    const a = session();
    expect((await browser.execute('browser_snapshot', { tabId: id }, a)).ok).toBe(true);
    expect((await browser.execute('browser_snapshot', { tabId: id }, session('chat-2'))).error).toContain('tab_busy');
    a.controller.abort();
    const b = session('chat-2', 'request-2');
    expect((await browser.execute('browser_snapshot', { tabId: id }, b)).ok).toBe(true);
    browser.release(a.topicId, a.requestId);
    expect(browser.state().tabs[0].control.topicId).toBe('chat-2');
    browser.release(b.topicId, b.requestId);
    expect(browser.state().tabs[0].control).toBe(null);
  });
  it('serializes calls from the same request, including time spent waiting for registration', async () => {
    const browser = new BrowserAutomation();
    const id = browser.add('https://example.com');
    const a = session();
    const waiting = browser.execute('browser_snapshot', { tabId: id }, a);
    expect((await browser.execute('browser_snapshot', { tabId: id }, a)).error).toContain('tab_busy');
    browser.register(id, guest());
    expect((await waiting).ok).toBe(true);
    browser.release(a.topicId, a.requestId);
  });
  it('invalidates snapshots after navigation while retaining handles for unchanged elements', async () => {
    const { browser, id, wc } = setup();
    const a = session();
    const first = await browser.execute('browser_snapshot', { tabId: id }, a);
    wc.emit('did-navigate-in-page');
    expect((await browser.execute('browser_act', { tabId: id, snapshotId: first.snapshotId, action: 'click', elementId: '1' }, a)).error).toContain('snapshot_expired');
    const second = await browser.execute('browser_snapshot', { tabId: id }, a);
    expect((await browser.execute('browser_act', { tabId: id, snapshotId: second.snapshotId, action: 'click', elementId: '1' }, a)).ok).toBe(true);
    expect((await browser.execute('browser_act', { tabId: id, snapshotId: second.snapshotId, action: 'click', elementId: '1' }, a)).ok).toBe(true);
    browser.release(a.topicId, a.requestId);
  });
  it('does not retry or allow overtaking an uncertain timed-out submission', async () => {
    const { browser, id, wc } = setup({ timeoutMs: 20 });
    const a = session();
    const snapshot = await browser.execute('browser_snapshot', { tabId: id }, a);
    let settle;
    let calls = 0;
    wc.executeJavaScriptInIsolatedWorld = () => { calls++; return new Promise((resolve) => { settle = resolve; }); };
    const result = await browser.execute('browser_act', { tabId: id, snapshotId: snapshot.snapshotId, action: 'click', elementId: '1' }, a);
    expect(result.error).toContain('browser_timeout');
    expect((await browser.execute('browser_snapshot', { tabId: id }, a)).error).toContain('tab_busy');
    expect(calls).toBe(1);
    settle({ performed: 'click' });
    await Promise.resolve(); await Promise.resolve();
    browser.release(a.topicId, a.requestId);
  });
  it('stops a timed-out navigation and permits observing the page again', async () => {
    const { browser, id, wc } = setup({ timeoutMs: 20 });
    const a = session();
    let rejectLoad;
    let stops = 0;
    wc.loadURL = () => new Promise((_, reject) => { rejectLoad = reject; });
    wc.stop = () => { stops++; rejectLoad(new Error('ERR_ABORTED')); };
    const result = await browser.execute('browser_navigate', { tabId: id, action: 'open', url: 'https://example.com/slow' }, a);
    expect(result.error).toContain('browser_timeout');
    await new Promise((resolve) => setImmediate(resolve));
    expect(stops).toBe(1);
    expect(browser.tabs.get(id).pending).toBe(false);
    expect((await browser.execute('browser_snapshot', { tabId: id }, a)).ok).toBe(true);
    browser.release(a.topicId, a.requestId);
  });
  it('stops navigation on abort and releases control for another request', async () => {
    const { browser, id, wc } = setup();
    const a = session();
    let started;
    const loading = new Promise((resolve) => { started = resolve; });
    let rejectLoad;
    let stops = 0;
    wc.loadURL = () => new Promise((_, reject) => { rejectLoad = reject; started(); });
    wc.stop = () => { stops++; rejectLoad(new Error('ERR_ABORTED')); };
    const call = browser.execute('browser_navigate', { tabId: id, action: 'open', url: 'https://example.com/slow' }, a);
    await loading;
    a.controller.abort();
    expect((await call).error).toBe('aborted');
    await new Promise((resolve) => setImmediate(resolve));
    expect(stops).toBe(1);
    expect(browser.tabs.get(id).pending).toBe(false);
    const b = session('other', 'other-request');
    expect((await browser.execute('browser_snapshot', { tabId: id }, b)).ok).toBe(true);
    browser.release(b.topicId, b.requestId);
  });
  it('lets the user close an unsettled page after takeover without allowing commands to overtake it', async () => {
    const a = session();
    const closed = [];
    const { browser, id, wc } = setup({ abort: () => a.controller.abort(), close: (id) => closed.push(id) });
    const snapshot = await browser.execute('browser_snapshot', { tabId: id }, a);
    let started;
    const executing = new Promise((resolve) => { started = resolve; });
    let settle;
    wc.executeJavaScriptInIsolatedWorld = () => new Promise((resolve) => { settle = resolve; started(); });
    const call = browser.execute('browser_act', { tabId: id, snapshotId: snapshot.snapshotId, action: 'click', elementId: '1' }, a);
    await executing;
    expect(() => browser.closeForUser(id)).toThrow('请先暂停并接管');
    browser.pause(id);
    expect((await call).error).toBe('aborted');
    expect(browser.tabs.get(id).pending).toBe(true);
    expect((await browser.execute('browser_snapshot', { tabId: id }, session('other'))).error).toContain('tab_busy');
    browser.closeForUser(id);
    expect(closed).toEqual([id]);
    expect(browser.state().tabs).toHaveLength(0);
    settle({ performed: 'click' });
    await new Promise((resolve) => setImmediate(resolve));
  });
  it('rejects an oversized snapshot at the transport boundary as defense in depth', async () => {
    const { browser, id, wc } = setup();
    const a = session();
    wc.executeJavaScriptInIsolatedWorld = async () => ({ text: '大'.repeat(50000) });
    const result = await browser.execute('browser_snapshot', { tabId: id }, a);
    expect(result.ok).toBe(false);
    expect(result.error).toContain('snapshot_too_large');
    expect(result.text).toBeUndefined();
    browser.release(a.topicId, a.requestId);
  });
  it('pause aborts the whole request and records a continuation without retaining the lock', async () => {
    const a = session();
    const { browser, id } = setup({ abort: () => a.controller.abort() });
    await browser.execute('browser_snapshot', { tabId: id }, a);
    browser.pause(id);
    expect(a.signal.aborted).toBe(true);
    expect(browser.state().tabs[0].control).toBe(null);
    expect(browser.state().paused).toEqual([{ topicId: a.topicId, requestId: a.requestId, tabId: id }]);
    expect((await browser.execute('browser_act', { tabId: id }, a)).error).toContain('aborted');
    const resumed = session(a.topicId, 'resumed');
    expect((await browser.execute('browser_snapshot', { tabId: id }, resumed)).ok).toBe(true);
    expect(browser.state().paused).toHaveLength(0);
    browser.release(resumed.topicId, resumed.requestId);
  });
  it('guest loss aborts the request and preserves the tab manifest for reconnection', async () => {
    const a = session();
    const { browser, id, wc } = setup({ abort: () => a.controller.abort() });
    await browser.execute('browser_snapshot', { tabId: id }, a);
    wc.emit('destroyed');
    expect(a.signal.aborted).toBe(true);
    expect(browser.state().tabs).toHaveLength(1);
    expect(browser.state().tabs[0].ready).toBe(false);
    expect(browser.state().tabs[0].generation).toBe(2);
  });
  it('rejects unsupported schemes, invalid pagination and arbitrary keys', async () => {
    const { browser, id } = setup();
    const a = session();
    expect((await browser.execute('browser_tabs', { action: 'open', url: 'file:///etc/passwd' }, a)).error).toContain('invalid_url');
    expect((await browser.execute('browser_snapshot', { tabId: id, textOffset: -1 }, a)).error).toContain('invalid_offset');
    const snapshot = await browser.execute('browser_snapshot', { tabId: id }, a);
    expect((await browser.execute('browser_act', { tabId: id, snapshotId: snapshot.snapshotId, action: 'press', elementId: '1', key: 'Meta' }, a)).error).toContain('unsupported_key');
    browser.release(a.topicId, a.requestId);
  });
});

describe('browser tools policy', () => {
  const names = ['browser_tabs', 'browser_navigate', 'browser_snapshot', 'browser_act'];
  it('enables browser tools by default and executes them without approval in every execution mode', () => {
    expect(getEnabledOpenAiToolDefinitions({}, 'local').map((t) => t.function.name)).toEqual(expect.arrayContaining(names));
    for (const name of names) for (const mode of ['confirm', 'acceptEdits', 'bypass']) expect(shouldPromptForTool(name, mode)).toBe(false);
    expect(getEnabledOpenAiToolDefinitions({ toolOverrides: { browser_act: false } }, 'local').map((t) => t.function.name)).not.toContain('browser_act');
  });
  it('blocks browser tools in terminal and host environments, even with overrides', async () => {
    for (const context of ['terminal', 'terminal-ssh', 'host']) {
      expect(getEnabledOpenAiToolDefinitions({ toolOverrides: Object.fromEntries(names.map((name) => [name, true])) }, context).map((t) => t.function.name).filter((name) => names.includes(name))).toEqual([]);
      expect((await setup().browser.execute('browser_tabs', { action: 'list' }, { ...session(), context })).error).toContain('browser_not_available');
    }
  });
  it('enforces plan mode per action, retaining only list and snapshots', async () => {
    const { browser, id } = setup();
    const a = { ...session(), agentConfig: { chatMode: 'plan' } };
    expect((await browser.execute('browser_tabs', { action: 'list' }, a)).ok).toBe(true);
    expect((await browser.execute('browser_snapshot', { tabId: id }, a)).ok).toBe(true);
    for (const action of ['open', 'activate', 'close']) expect((await browser.execute('browser_tabs', { tabId: id, action, url: 'https://example.com' }, a)).error).toBe('plan_mode_read_only');
    for (const name of ['browser_navigate', 'browser_act']) expect((await browser.execute(name, { tabId: id }, a)).error).toBe('plan_mode_read_only');
    browser.release(a.topicId, a.requestId);
  });
});
