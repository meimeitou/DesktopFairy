// Deterministic reproductions of the external agent's browser report.
// node_modules/.bin/electron scripts/test-browser-report-electron.cjs
const { app, BrowserWindow } = require('electron');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'df-browser-report-'));
app.setPath('userData', temp);
const { BrowserAutomation } = require('../electron/browserAutomation.cjs');
app.on('window-all-closed', () => {});
app.whenReady().then(async () => {
  let win;
  const server = http.createServer((req, res) => {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    if (req.url === '/frame') return res.end('<label>Frame input<input></label><button>Duplicate</button>');
    res.end(`<!doctype html><title>Report regressions</title>
      <label>Todo<input id="todo"></label><ul id="todos"></ul>
      <label>Trusted input<input id="trusted" oninput="window.trustedInput=event.isTrusted"></label>
      <a id="hover" onmouseover="this.textContent='Hovered'">Hover target</a>
      <div id="shadow"></div><div id="later"></div>
      <button id="confirm" onclick="window.choice=confirm('Delete item?')">Confirm</button>
      <button id="prompt" onclick="window.answer=prompt('Your name?')">Prompt</button>
      <input type="file" aria-label="Upload" id="upload">
      <button>Duplicate</button><iframe src="/frame" title="Same origin"></iframe><iframe src="data:text/html,cross-origin" title="Cross origin"></iframe>
      <div style="height:80px;overflow:auto" id="scroller"><div style="height:1000px">Scrollable</div></div>
      <script>
      document.querySelector('#todo').onkeydown=e=>{if(e.key==='Enter'){document.querySelector('#todos').append(Object.assign(document.createElement('li'),{textContent:e.target.value}));e.target.value=''}};
      document.querySelector('#shadow').attachShadow({mode:'open'}).innerHTML='<label>Shadow input<input></label><button>Shadow button</button>';
      setTimeout(()=>document.querySelector('#later').innerHTML='<button>Delayed button</button>',400);
      </script>`);
  });
  try {
    await new Promise((r) => server.listen(0, '127.0.0.1', r));
    win = new BrowserWindow({ show: false, webPreferences: { contextIsolation: true, nodeIntegration: false } });
    const browser = new BrowserAutomation();
    const tabId = browser.add(`http://127.0.0.1:${server.address().port}`);
    await win.loadURL(browser.tabs.get(tabId).url);
    while (win.webContents.isLoadingMainFrame()) await new Promise((r) => setTimeout(r, 10));
    browser.register(tabId, win.webContents);
    const deps = { context: 'local', topicId: 'report', requestId: '1', signal: new AbortController().signal, agentConfig: {} };
    const call = (name, args) => browser.execute(name, { tabId, ...args }, deps);
    const snapshot = () => call('browser_snapshot', {});
    let lastArgs;
    const act = async (label, action, extra = {}) => {
      const snap = await snapshot(); assert(snap.ok, JSON.stringify(snap));
      const element = snap.elements.find((el) => el.label === label); assert(element, 'Missing: ' + label);
      lastArgs = { snapshotId: snap.snapshotId, elementId: element.id, action, ...extra };
      return call('browser_act', lastArgs);
    };
    assert((await act('Todo', 'fill', { value: 'exactly once' })).ok);
    const entered = await act('Todo', 'press', { key: 'Enter', action_id: 'todo-once' });
    assert.equal(entered.ok, true, 'Enter must not fail after a key handler committed: ' + JSON.stringify(entered));
    assert.equal(await win.webContents.executeJavaScript('document.querySelectorAll("#todos li").length'), 1);
    assert.equal(entered.outcome, 'applied');
    assert.equal((await call('browser_act', lastArgs)).replayed, true);
    assert.equal(await win.webContents.executeJavaScript('document.querySelectorAll("#todos li").length'), 1, 'A replay cannot submit twice');
    console.log('PASS Todo Enter: no false failure after side effect');
    assert((await act('Trusted input', 'fill', { value: 'native text' })).ok);
    assert.equal(await win.webContents.executeJavaScript('window.trustedInput'), true);
    assert((await act('Trusted input', 'press', { key: 'Meta+a' })).ok);
    assert((await act('Trusted input', 'press', { key: 'Backspace' })).ok);
    assert.equal(await win.webContents.executeJavaScript('document.querySelector("#trusted").value'), '');
    assert((await act('Trusted input', 'press', { key: 'Tab' })).ok);
    assert.notEqual(await win.webContents.executeJavaScript('document.activeElement.id'), 'trusted');
    let snap = await snapshot();
    assert(snap.elements.some((el) => el.label === 'Shadow input' && el.shadowPath.length));
    assert(snap.elements.some((el) => el.label === 'Frame input' && el.framePath.length));
    assert(snap.frames.some((f) => !f.accessible && f.title === 'Cross origin'));
    const missing = await call('browser_act', { snapshotId: snap.snapshotId, elementId: '9999', action: 'click' });
    assert.equal(missing.outcome, 'not_applied'); assert.match(missing.error, /element_not_found/);
    const ambiguous = await call('browser_act', { snapshotId: snap.snapshotId, action: 'click', locator: { role: 'button', name: 'Duplicate' } });
    assert.equal(ambiguous.outcome, 'not_applied'); assert.match(ambiguous.error, /ambiguous_locator/);
    const frameClick = await call('browser_act', { snapshotId: snap.snapshotId, action: 'click', locator: { role: 'button', name: 'Duplicate', framePath: [0] } });
    assert(frameClick.ok, JSON.stringify(frameClick));
    const shadowFill = await act('Shadow input', 'fill', { value: 'shadow works' }); assert(shadowFill.ok, JSON.stringify(shadowFill));
    const hover = await act('Hover target', 'hover'); assert(hover.ok, JSON.stringify(hover));
    assert.equal(await win.webContents.executeJavaScript('document.querySelector("#hover").textContent'), 'Hovered');
    const wait = await call('browser_act', { action: 'wait_for', locator: { css: '#later button' }, timeoutMs: 3000 }); assert(wait.ok, JSON.stringify(wait));
    console.log('PASS shadow, frame attribution, cross-origin placeholders, ambiguity, hover and wait');
    snap = await snapshot();
    const scroll = await call('browser_act', { snapshotId: snap.snapshotId, action: 'scroll', locator: { css: '#scroller' }, direction: 'down' });
    assert(scroll.ok, JSON.stringify(scroll));
    assert(await win.webContents.executeJavaScript('document.querySelector("#scroller").scrollTop > 0'));
    const pending = await act('Confirm', 'click');
    assert.equal(pending.dialog?.message, 'Delete item?'); assert.equal(pending.outcome, 'unknown');
    const dismiss = await call('browser_act', { action: 'dialog', accept: false }); assert(dismiss.ok, JSON.stringify(dismiss));
    assert.equal(await win.webContents.executeJavaScript('window.choice'), false);
    const prompted = await act('Prompt', 'click', { dialog: { accept: true, promptText: 'tester' } }); assert(prompted.ok, JSON.stringify(prompted));
    assert.equal(await win.webContents.executeJavaScript('window.answer'), 'tester');
    const file = path.join(temp, 'upload.txt'); fs.writeFileSync(file, 'fixture');
    const uploaded = await act('Upload', 'upload', { files: [file] }); assert(uploaded.ok, JSON.stringify(uploaded));
    assert.equal(await win.webContents.executeJavaScript('document.querySelector("#upload").files[0]?.name'), 'upload.txt');
    const capture = await call('browser_snapshot', { screenshot: true }); assert(capture.ok, JSON.stringify(capture)); assert(fs.statSync(capture.screenshot).size > 0);
    console.log('PASS explicit confirm/prompt, file upload, screenshot');
    if (process.env.BROWSER_REPORT_LIVE === '1') {
      async function load(url) {
        const navigation = win.loadURL(url);
        let timer;
        try { await Promise.race([navigation, new Promise((resolve) => { timer = setTimeout(() => { win.webContents.stop(); resolve(); }, 15000); })]); }
        catch (error) { if (error.code !== -3) throw error; }
        finally { clearTimeout(timer); }
      }
      async function byCss(css, action, extra = {}) {
        const s = await snapshot(); assert(s.ok, JSON.stringify(s));
        const r = await call('browser_act', { action, snapshotId: s.snapshotId, locator: { css }, ...extra });
        assert(r.ok, JSON.stringify(r)); return r;
      }
      await load('https://practice.expandtesting.com/form-validation');
      await byCss('[name="ContactName"]', 'fill', { value: 'DesktopFairy regression' });
      await byCss('[name="contactnumber"]', 'fill', { value: '012-3456789' });
      await byCss('[name="pickupdate"]', 'fill', { value: '2026-11-10' });
      await byCss('[name="payment"]', 'select', { value: 'card' });
      assert.equal(await win.webContents.executeJavaScript('document.querySelector("form.needs-validation").checkValidity()'), true);
      console.log('PASS live ExpandTesting: all fields satisfy native form validation (no external submission)');
      await load('https://todomvc.com/examples/react/dist/');
      await byCss('input.new-todo', 'fill', { value: 'DesktopFairy exactly once' });
      const s = await snapshot();
      const args = { action: 'press', key: 'Enter', snapshotId: s.snapshotId, locator: { css: 'input.new-todo' }, action_id: 'live-todo-once' };
      assert((await call('browser_act', args)).ok);
      assert((await call('browser_act', args)).replayed);
      assert.equal(await win.webContents.executeJavaScript('document.querySelectorAll(".todo-list li").length'), 1);
      console.log('PASS live TodoMVC: Enter + replay creates exactly one item');
    }
    browser.release(deps.topicId, deps.requestId);
    const instance = browser.instanceId;
    browser.disconnect(tabId, win.webContents, 'test_crash');
    assert.equal(browser.tabs.size, 1); assert.equal(browser.tabs.get(tabId).wc, null);
    const oldGeneration = await call('browser_act', { generation: 1, action: 'click', snapshotId: capture.snapshotId, elementId: '1' });
    assert.equal(oldGeneration.error, 'session_restarted');
    assert.equal(browser.instanceId, instance);
    browser.register(tabId, win.webContents);
    assert((await snapshot()).ok);
    console.log('PASS session generation and preserved handles after disconnect');
    win.destroy(); server.closeAllConnections(); server.close(); app.exit(0);
  } catch (e) { console.error(e); win?.destroy(); server.closeAllConnections(); server.close(); app.exit(1); }
});
