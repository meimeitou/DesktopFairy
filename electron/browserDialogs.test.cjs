const { EventEmitter } = require('node:events');
const { BrowserAutomation } = require('./browserAutomation.cjs');

/** Model Chromium's native onload modal: navigation waits, CDP events require Page.enable. */
function dialogGuest(initialURL = 'https://example.com/onload-confirm') {
  let currentURL = initialURL;
  const wc = new EventEmitter();
  const protocol = new EventEmitter();
  let attached = false;
  let pageEnabled = false;
  let resolveLoad;
  let rejectLoad;
  wc.isDestroyed = () => false;
  wc.getURL = () => currentURL;
  wc.getTitle = () => 'Onload confirm';
  wc.debugger = protocol;
  protocol.isAttached = () => attached;
  protocol.attach = () => { attached = true; };
  protocol.detach = () => { attached = false; protocol.emit('detach'); };
  protocol.sendCommand = async (method) => {
    if (method === 'Page.enable') pageEnabled = true;
    if (method === 'Page.handleJavaScriptDialog') {
      protocol.emit('message', {}, 'Page.javascriptDialogClosed', {});
      resolveLoad?.();
    }
    return { identifier: 'shim', result: { value: {} } };
  };
  wc.loadURL = (url) => new Promise((resolve, reject) => {
    currentURL = url;
    resolveLoad = resolve;
    rejectLoad = reject;
    if (attached && pageEnabled) protocol.emit('message', {}, 'Page.javascriptDialogOpening', {
      type: 'confirm', message: 'Are you sure?', defaultPrompt: '',
    });
  });
  wc.stop = () => rejectLoad?.(new Error('ERR_ABORTED'));
  wc.executeJavaScriptInIsolatedWorld = async (_world, scripts) => {
    const match = scripts[0].code.match(/\)\((\{.*\})\); \} catch/s);
    const command = JSON.parse(match[1]);
    return { snapshotId: command.newSnapshotId, elements: [], text: 'loaded' };
  };
  return wc;
}
function session() { return { context: 'local', topicId: 'dialog-topic', requestId: 'dialog-request', signal: new AbortController().signal, agentConfig: {} }; }

it('exposes and resolves an onload native dialog while navigation is waiting, then releases tab_busy', async () => {
  const browser = new BrowserAutomation({ timeoutMs: 40 });
  const id = browser.add('https://example.com/');
  const wc = dialogGuest();
  browser.register(id, wc);
  const deps = session();
  try {
    const result = await browser.execute('browser_navigate', { tabId: id, action: 'open', url: 'https://example.com/onload-confirm' }, deps);
    expect(result.dialog).toMatchObject({ type: 'confirm', message: 'Are you sure?' });
    expect((await browser.execute('browser_tabs', { action: 'list' }, deps)).tabs[0].dialog).toMatchObject({ type: 'confirm' });
    const answer = await browser.execute('browser_act', { tabId: id, action: 'dialog', accept: true }, deps);
    expect(answer.ok).toBe(true);
    expect(browser.tabs.get(id).pending).toBe(false);
    expect((await browser.execute('browser_snapshot', { tabId: id }, deps)).ok).toBe(true);
  } finally {
    wc.stop();
    browser.release(deps.topicId, deps.requestId);
    await new Promise((resolve) => setImmediate(resolve));
  }
});

it('monitors an inherited popup before its first real navigation instead of missing its onload dialog', async () => {
  const browser = new BrowserAutomation({ timeoutMs: 40 });
  const id = browser.add('https://example.com/onload-confirm');
  const deps = session();
  browser.tabs.get(id).control = { topicId: deps.topicId, requestId: deps.requestId };
  const wc = dialogGuest('about:blank');
  browser.register(id, wc);
  try {
    const result = await browser.execute('browser_snapshot', { tabId: id }, deps);
    expect(result.dialog).toMatchObject({ type: 'confirm', message: 'Are you sure?' });
    expect((await browser.execute('browser_act', { tabId: id, action: 'dialog', accept: false }, deps)).ok).toBe(true);
    expect((await browser.execute('browser_snapshot', { tabId: id }, deps)).ok).toBe(true);
  } finally {
    wc.stop();
    browser.release(deps.topicId, deps.requestId);
    await new Promise((resolve) => setImmediate(resolve));
  }
});

describe('dialog protocol recovery', () => {
  const { BrowserCdp } = require('./browserCdp.cjs');
  it('keeps the current decision available if the close command fails', async () => {
    const wc = dialogGuest();
    const cdp = new BrowserCdp(wc);
    await cdp.ready();
    cdp.dialog = { type: 'confirm', message: 'retry me' };
    const send = wc.debugger.sendCommand;
    wc.debugger.sendCommand = async (method, ...args) => {
      if (method === 'Page.handleJavaScriptDialog') throw new Error('protocol unavailable');
      return send(method, ...args);
    };
    await expect(cdp.answer(true)).rejects.toThrow('protocol unavailable');
    expect(cdp.dialog?.message).toBe('retry me');
    wc.debugger.sendCommand = send;
    await cdp.answer(false);
    expect(cdp.dialog).toBeNull();
    await cdp.dispose();
  });
  it('retains a second dialog that opens before the first answer acknowledgement', async () => {
    const wc = dialogGuest();
    const cdp = new BrowserCdp(wc);
    await cdp.ready();
    cdp.dialog = { type: 'confirm', message: 'first' };
    const send = wc.debugger.sendCommand;
    wc.debugger.sendCommand = async (method, ...args) => {
      if (method === 'Page.handleJavaScriptDialog') {
        wc.debugger.emit('message', {}, 'Page.javascriptDialogClosed', {});
        wc.debugger.emit('message', {}, 'Page.javascriptDialogOpening', { type: 'confirm', message: 'second' });
        return {};
      }
      return send(method, ...args);
    };
    await cdp.answer(true);
    expect(cdp.dialog?.message).toBe('second');
    wc.debugger.sendCommand = send;
    await cdp.dispose();
  });
  it('does not dispatch a new action into an existing modal and preserves its pending original operation', async () => {
    const wc = dialogGuest();
    const cdp = new BrowserCdp(wc);
    await cdp.ready();
    cdp.dialog = { type: 'confirm', message: 'first' };
    let finish;
    const original = new Promise((resolve) => { finish = resolve; });
    const work = vi.fn();
    const observed = await cdp.observe(work, original);
    expect(work).not.toHaveBeenCalled();
    expect(observed.operation).toBe(original);
    finish({});
    await cdp.dispose();
  });
});

it('waits for old CDP cleanup on a reattached guest without unlocking the new request', async () => {
  const browser = new BrowserAutomation({ timeoutMs: 100 });
  const id = browser.add('https://example.com/');
  const wc = dialogGuest();
  browser.register(id, wc);
  const first = session();
  expect((await browser.execute('browser_snapshot', { tabId: id }, first)).ok).toBe(true);
  let releaseCleanup;
  const cleanup = new Promise((resolve) => { releaseCleanup = resolve; });
  const send = wc.debugger.sendCommand;
  wc.debugger.sendCommand = async (method, ...args) => {
    if (method === 'Page.removeScriptToEvaluateOnNewDocument') await cleanup;
    return send(method, ...args);
  };
  browser.release(first.topicId, first.requestId);
  browser.disconnect(id, wc, 'reattach');
  browser.register(id, wc);
  const next = { ...session(), requestId: 'new-request' };
  let began;
  const started = new Promise((resolve) => { began = resolve; });
  let finish;
  wc.executeJavaScriptInIsolatedWorld = () => new Promise((resolve) => { finish = resolve; began(); });
  const reading = browser.execute('browser_snapshot', { tabId: id }, next);
  releaseCleanup();
  await started;
  expect(browser.tabs.get(id).pending).toBe(true);
  expect((await browser.execute('browser_snapshot', { tabId: id }, next)).error).toContain('tab_busy');
  finish({ elements: [] });
  expect((await reading).ok).toBe(true);
  browser.release(next.topicId, next.requestId);
  await new Promise((resolve) => setImmediate(resolve));
});

it('does not let a late operation from the old generation unlock a reattached identical guest', async () => {
  const controller = new AbortController();
  const browser = new BrowserAutomation({ timeoutMs: 200, abort: () => controller.abort() });
  const id = browser.add('https://example.com/');
  const wc = dialogGuest();
  browser.register(id, wc);
  const oldSession = { ...session(), signal: controller.signal };
  const snapshot = await browser.execute('browser_snapshot', { tabId: id }, oldSession);
  let finishOld;
  wc.executeJavaScriptInIsolatedWorld = () => new Promise((resolve) => { finishOld = resolve; });
  const oldCall = browser.execute('browser_act', { tabId: id, action: 'click', snapshotId: snapshot.snapshotId, elementId: '1' }, oldSession);
  for (let n = 0; n < 20 && !finishOld; n++) await new Promise((resolve) => setImmediate(resolve));
  expect(finishOld).toBeTypeOf("function");
  browser.disconnect(id, wc, 'reloaded');
  expect((await oldCall).error).toBe('aborted');
  browser.register(id, wc);
  let started;
  const starting = new Promise((resolve) => { started = resolve; });
  let finishNew;
  wc.executeJavaScriptInIsolatedWorld = () => new Promise((resolve) => { finishNew = resolve; started(); });
  const next = { ...session(), requestId: 'new-generation' };
  const newCall = browser.execute('browser_snapshot', { tabId: id }, next);
  await starting;
  finishOld({ performed: 'click' });
  await new Promise((resolve) => setImmediate(resolve));
  try {
    expect(browser.tabs.get(id).pending).toBe(true);
  } finally {
    finishNew({ elements: [] });
    await newCall;
    browser.release(next.topicId, next.requestId);
    await new Promise((resolve) => setImmediate(resolve));
  }
});
