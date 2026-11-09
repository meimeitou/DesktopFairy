// Real Electron/webview/IPC smoke test, isolated from the user's profile.
// Run after build: node_modules/.bin/electron scripts/smoke-browser-electron.cjs
// Or against Vite: BROWSER_SMOKE_DEV_URL=http://localhost:5173 node_modules/.bin/electron scripts/smoke-browser-electron.cjs
const { app, BrowserWindow, ipcMain } = require('electron');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'df-browser-smoke-'));
const captures = path.join(temp, 'captures');
fs.mkdirSync(captures);
app.setPath('userData', path.join(temp, 'profile'));
app.on('window-all-closed', () => {});
const root = path.resolve(__dirname, '..');
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function until(check, label) {
  const end = Date.now() + 15000;
  while (Date.now() < end) { if (await check()) return; await sleep(50); }
  throw new Error('Timed out: ' + label);
}
let win;
let server;
app.whenReady().then(async () => {
  try {
    server = http.createServer((req, res) => {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      if (req.url === '/download') { res.setHeader('Content-Disposition', 'attachment; filename=fixture.txt'); return res.end('download fixture'); }
      if (req.url === '/frame') return res.end('<label>同源框架输入<input id="frame-input"></label>');
      if (req.url === '/stall') { res.write('<html><body>Loading without end'); return; }
      if (req.url === '/regression') return res.end(`<!doctype html><meta charset="utf-8"><title>DOM regression</title>
<label>勾选状态<input id="reg-check" type="checkbox"></label><label>单选状态<input type="radio" checked></label>
<div role="checkbox" aria-checked="mixed">ARIA 勾选</div>
<fieldset disabled><legend><label>可填写的图例<input id="reg-legend" value="allowed"></label></legend><label>禁用输入<input id="reg-blocked" value="original"></label></fieldset>
<label>禁用选项组<select id="reg-group"><optgroup disabled><option value="blocked">不可选</option></optgroup><option selected value="allowed">可选</option></select></label>
<select id="reg-huge" style="width:200px"><option value="${'x'.repeat(200000)}">${'y'.repeat(200000)}</option></select>
${Array.from({ length: 140 }, (_, i) => `<button>分页按钮 ${i}</button>`).join('')}
<script>document.querySelector('#reg-check').indeterminate=true;window.fieldWrites=0;window.optionWrites=0;document.querySelector('#reg-blocked').oninput=()=>window.fieldWrites++;document.querySelector('#reg-group').onchange=()=>window.optionWrites++;</script>`);

      res.end(`<!doctype html><html lang="zh"><meta charset="utf-8"><title>浏览器控制验收</title>
<style>body{font:16px system-ui;padding:30px;color:#493c2a;background:#fcfaf5}input,select,button,textarea{font:inherit;padding:8px;margin:8px}label{display:block}h1{font-size:25px}iframe{height:100px;width:95%}#result{padding:12px;background:#edf5e5}</style>
<h1>浏览器控制验收</h1><p>这是本地测试页面，无外部提交。</p>
<form id="form"><label>搜索<input id="query" type="search"></label><button>搜索资料</button></form>
<p id="search-result"></p><label>姓名<input id="name"></label><label>分类<select id="category"><option value="a">文章</option><option value="b">报告</option></select></label>
<label><input id="check" type="checkbox">已检查内容</label><label>密码<input type="password" value="secret-not-for-model"></label>
<button id="submit">提交信息</button><button id="rename">修改提交按钮</button><input type="file" aria-label="上传文件">
<a href="/download" download>下载测试文件</a><a href="/second" target="_blank">打开相关资料</a><iframe src="/frame"></iframe><iframe src="data:text/html,cross-origin"></iframe>
<p id="result">等待提交</p><details><summary>长文正文</summary>${'测试长文段落，供分页读取。'.repeat(900)}</details>
<script>let submits=0;document.querySelector('#form').onsubmit=e=>{e.preventDefault();document.querySelector('#search-result').textContent='找到资料：'+document.querySelector('#query').value};document.querySelector('#submit').onclick=()=>{document.querySelector('#result').textContent='提交成功 '+(++submits)+'：'+document.querySelector('#name').value+' / '+document.querySelector('#category').value};document.querySelector('#rename').onclick=()=>document.querySelector('#submit').textContent='按钮已改变';</script>`);
    });
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const url = `http://127.0.0.1:${server.address().port}/`;
    const service = require('../electron/browserService.cjs');
    ipcMain.on('settings:load:sync', (event) => { event.returnValue = null; });
    // Unrelated application surfaces mount alongside the browser in ChatApp.
    for (const channel of ['chat:topics:list', 'agent:skills:scan', 'mcp:servers:list', 'knowledge:list_bases', 'agent:skills:list', 'live2d:list_models']) ipcMain.handle(channel, () => []);
    for (const channel of ['live2d:command', 'settings:sync', 'chat:topics:ensure_default']) ipcMain.handle(channel, () => null);

    service.registerBrowserHandlers(ipcMain, { getChatWindow: () => win, openExternal: () => { throw new Error('Unexpected external browser'); } });
    app.on('web-contents-created', (_event, contents) => {
      service.attachWindowOpenHandler(contents);
      contents.on('will-attach-webview', (event, prefs, params) => {
        delete prefs.preload; prefs.nodeIntegration = false; prefs.contextIsolation = true;
        if (params.partition !== 'persist:browser') event.preventDefault();
      });
    });
    win = new BrowserWindow({ width: 1280, height: 850, show: false, webPreferences: { preload: path.join(root, 'electron/preload.cjs'), contextIsolation: true, nodeIntegration: false, webviewTag: true } });
    if (process.env.BROWSER_SMOKE_DEV_URL) await win.loadURL(new URL('/?window=chat', process.env.BROWSER_SMOKE_DEV_URL).href);
    else await win.loadFile(path.join(root, 'dist/index.html'), { query: { window: 'chat' } });
    await until(() => win.webContents.executeJavaScript('!!document.querySelector(".chat-browser-pane")'), 'browser UI');
    await win.webContents.executeJavaScript(`window.electronAPI.invoke('browser:ui',{action:'open',url:${JSON.stringify(url + 'stall')}})`);
    const initialLoadingTab = [...service.browser.tabs.values()][0];
    await until(() => Boolean(initialLoadingTab.wc), 'register first page before dom-ready');
    assert(initialLoadingTab.wc, 'A loading first page must register before dom-ready so the address bar can navigate away');
    const recoverInitialLoad = await win.webContents.executeJavaScript(`window.electronAPI.invoke('browser:ui',{action:'navigate',tabId:${JSON.stringify(initialLoadingTab.id)},url:${JSON.stringify(url + 'recovered')}})`);
    assert.equal(recoverInitialLoad.ok, true, JSON.stringify(recoverInitialLoad));
    await until(() => initialLoadingTab.wc.getURL() === url + 'recovered', 'recover stalled first page');
    await win.webContents.executeJavaScript(`window.electronAPI.invoke('browser:ui',{action:'close',tabId:${JSON.stringify(initialLoadingTab.id)}})`);
    // Drive the actual React input and Enter handler, including the no-tab case.
    await win.webContents.executeJavaScript('document.querySelector(".chat-tab[title=浏览器]").click();document.querySelector(".browser-url-input").focus()');
    assert.equal(await win.webContents.executeJavaScript('document.querySelector(".browser-url-input").readOnly'), false, 'Address bar must accept typing');
    async function typeAddress(value) {
      await win.webContents.executeJavaScript(`{ const input = document.querySelector('.browser-url-input'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, ${JSON.stringify(value)}); input.dispatchEvent(new Event('input', { bubbles: true })); }`);
    }
    await typeAddress(url + 'manual');
    await until(() => win.webContents.executeJavaScript(`document.querySelector('.browser-url-input').value === ${JSON.stringify(url + 'manual')}`), 'typed address');
    await win.webContents.executeJavaScript('document.querySelector(".browser-url-input").dispatchEvent(new KeyboardEvent("keydown",{key:"Enter",bubbles:true}))');
    await until(() => [...service.browser.tabs.values()].some((t) => t.wc?.getURL() === url + 'manual'), 'address Enter navigation');
    const manualTab = [...service.browser.tabs.values()][0];
    const invalidAddress = await win.webContents.executeJavaScript(`window.electronAPI.invoke('browser:ui',{action:'navigate',tabId:${JSON.stringify(manualTab.id)},url:'javascript:alert(1)'})`);
    assert.equal(invalidAddress.ok, false);
    const nextAddress = await win.webContents.executeJavaScript(`window.electronAPI.invoke('browser:ui',{action:'navigate',tabId:${JSON.stringify(manualTab.id)},url:${JSON.stringify(url + 'manual-next')}})`);
    assert.equal(nextAddress.ok, true, JSON.stringify(nextAddress));
    await until(() => manualTab.wc.getURL() === url + 'manual-next', 'navigate existing tab');
    await win.webContents.executeJavaScript(`window.electronAPI.invoke('browser:ui',{action:'close',tabId:${JSON.stringify(manualTab.id)}})`);
    const { executeAgentTool } = require('../electron/agentTools.cjs');
    const { manager } = require('../electron/ai/streamManager/AiStreamManager.cjs');
    const controller = new AbortController();
    let requestId = 'browser-smoke-1';
    const topicId = 'browser-smoke';
    const deps = { context: 'local', sender: win.webContents, topicId, requestId, signal: controller.signal, agentConfig: { chatMode: 'normal', enabledSkillIds: [] }, safeSend: () => {}, allowedToolNames: new Set(require('../electron/browserAutomation.cjs').TOOL_NAMES) };
    manager.activeStreams.set(topicId, { requestId, controller, mcpCallIds: new Set(), status: 'streaming' });
    let callNumber = 0;
    async function tool(name, args, sessionDeps = deps) {
      const result = await executeAgentTool({ id: `call-${++callNumber}`, function: { name, arguments: JSON.stringify(args) } }, sessionDeps);
      assert.equal(result.denied, false);
      return JSON.parse(result.resultText);
    }
    const opened = await tool('browser_tabs', { action: 'open', url });
    assert.equal(opened.ok, true, JSON.stringify(opened));
    const tabId = opened.tabId;
    const blockedNavigation = await win.webContents.executeJavaScript(`window.electronAPI.invoke('browser:ui',{action:'navigate',tabId:${JSON.stringify(tabId)},url:${JSON.stringify(url + 'blocked')}})`);
    assert.equal(blockedNavigation.ok, false);
    const wc = service.browser.tabs.get(tabId).wc;
    await until(() => !wc.isLoadingMainFrame(), 'fixture load');
    const snapshot = async () => { const result = await tool('browser_snapshot', { tabId }); assert.equal(result.ok, true, JSON.stringify(result)); return result; };
    async function act(label, action, value) {
      const snap = await snapshot();
      const el = snap.elements.find((e) => e.label === label);
      assert(el, 'Missing element: ' + label);
      const result = await tool('browser_act', { tabId, snapshotId: snap.snapshotId, elementId: el.id, action, ...(value === undefined ? {} : { value }) });
      assert.equal(result.ok, true, JSON.stringify(result));
    }
    let snap = await snapshot();
    assert(snap.text.includes('浏览器控制验收'));
    assert(!JSON.stringify(snap).includes('secret-not-for-model'));
    assert(snap.elements.some((e) => e.label === '同源框架输入'));
    assert(snap.unsupportedFrames >= 1);
    await act('搜索', 'fill', '内置浏览器');
    await act('搜索资料', 'click');
    assert((await snapshot()).text.includes('找到资料：内置浏览器'));
    await act('搜索', 'fill', '后台按键');
    snap = await snapshot();
    const query = snap.elements.find((el) => el.label === '搜索');
    assert.equal((await tool('browser_act', { tabId, snapshotId: snap.snapshotId, elementId: query.id, action: 'press', key: 'Enter' })).ok, true);
    assert((await snapshot()).text.includes('找到资料：后台按键'));

    await act('姓名', 'fill', '桌面助手');
    await act('分类', 'select', 'b');
    await act('已检查内容', 'click');
    await act('同源框架输入', 'fill', '同源支持');
    await act('提交信息', 'click');
    assert((await snapshot()).text.includes('提交成功 1：桌面助手 / b'));
    snap = await snapshot();
    const submit = snap.elements.find((el) => el.label === '提交信息');
    await wc.executeJavaScript("document.querySelector('#submit').textContent='已更新提交按钮'");
    const stale = await tool('browser_act', { tabId, snapshotId: snap.snapshotId, elementId: submit.id, action: 'click' });
    assert.equal(stale.ok, false); assert.match(stale.error, /element_stale/);
    snap = await snapshot();
    const upload = snap.elements.find((el) => el.type === 'file');
    assert.equal((await tool('browser_act', { tabId, snapshotId: snap.snapshotId, elementId: upload.id, action: 'click' })).ok, false);
    await wc.executeJavaScript('document.querySelector("details").open=true');
    snap = await snapshot(); assert(snap.nextTextOffset);
    const page2 = await tool('browser_snapshot', { tabId, snapshotId: snap.snapshotId, textOffset: snap.nextTextOffset });
    assert.equal(page2.ok, true); assert(page2.text.length > 0);
    // Real UI shields the controlled guest and exposes pause. No visible window is required.
    await until(() => win.webContents.executeJavaScript('!!document.querySelector(".browser-input-shield")'), 'input shield');
    assert.equal(await win.webContents.executeJavaScript('document.querySelector(".chat-browser-pane").classList.contains("collapsed")'), false);
    assert.equal(await win.webContents.executeJavaScript('document.querySelector(".browser-input-shield").tabIndex'), -1);
    assert.equal(await win.webContents.executeJavaScript('document.querySelector("webview").tabIndex'), -1);
    fs.writeFileSync(path.join(captures, 'controlled.png'), (await win.webContents.capturePage()).toPNG());
    await win.webContents.executeJavaScript('[...document.querySelectorAll(".browser-control-bar button")].find(b=>b.textContent.includes("暂停并接管")).click()');
    await until(() => controller.signal.aborted, 'pause abort');
    assert.equal(service.browser.state().tabs[0].control, null);
    manager.activeStreams.get(topicId).status = 'aborted';
    await until(() => !service.browser.tabs.get(tabId).pending, 'pause releases debugger');
    await until(() => win.webContents.executeJavaScript('document.querySelector(".browser-control-bar")?.textContent.includes("已暂停")'), 'paused UI');
    assert.equal(await win.webContents.executeJavaScript('!!document.querySelector(".chat-browser-pane > .chat-input-busy-halo")'), false, 'Pause removes the browser control animation');
    assert.equal(await win.webContents.executeJavaScript('document.querySelector(".browser-url-input").readOnly'), false, 'Paused browser address bar must accept typing');
    await win.webContents.executeJavaScript('document.querySelector(".browser-url-input").focus()');
    await typeAddress('https://draft.example');
    await win.webContents.executeJavaScript('document.querySelector(".browser-url-input").dispatchEvent(new KeyboardEvent("keydown",{key:"Escape",bubbles:true}))');
    assert.equal(await win.webContents.executeJavaScript('document.querySelector(".browser-url-input").value'), wc.getURL());
    await sleep(100); // Let the compositor catch up with the paused React state.
    fs.writeFileSync(path.join(captures, 'paused.png'), (await win.webContents.capturePage()).toPNG());
    await win.webContents.executeJavaScript('window.__resumeCount=0;window.electronAPI.onBrowserResume(()=>window.__resumeCount++);void 0');
    await win.webContents.executeJavaScript('[...document.querySelectorAll(".browser-control-bar button")].find(b=>b.textContent.includes("继续")).click()');
    await until(() => win.webContents.executeJavaScript('window.__resumeCount===1'), 'resume event');
    const resumed = new AbortController(); deps.signal = resumed.signal; deps.requestId = 'browser-smoke-2';
    await win.webContents.executeJavaScript('window.electronAPI.invoke("browser:ui",{action:"activate",tabId:' + JSON.stringify(tabId) + '})');
    await wc.executeJavaScript("document.querySelector('#name').value='人工修改'");
    assert((await snapshot()).elements.some((el) => el.value === '人工修改'));
    await win.webContents.executeJavaScript('document.querySelector(".browser-pane-action[title=关闭面板]").click()');
    win.hide();
    await act('已更新提交按钮', 'click');
    assert((await snapshot()).text.includes('提交成功 2：人工修改 / b'));
    assert.equal(await win.webContents.executeJavaScript('document.querySelector(".chat-browser-pane").classList.contains("collapsed")'), true);
    await act('下载测试文件', 'click');
    await until(() => service.browser.tabs.get(tabId).downloads.some((d) => d.status === 'completed'), 'agent download');
    assert(fs.readFileSync(service.browser.tabs.get(tabId).downloads[0].path, 'utf8').includes('download fixture'));
    // Popup stays embedded and inherits the control lock.
    await act('打开相关资料', 'click');
    await until(() => service.browser.tabs.size === 2, 'embedded popup');
    assert([...service.browser.tabs.values()].every((t) => t.control?.topicId === topicId));
    // Sender validation rejects a main application's own WebContents as a guest.
    const badGuest = await win.webContents.executeJavaScript('window.electronAPI.invoke("browser:register",{tabId:' + JSON.stringify(tabId) + ',webContentsId:' + win.webContents.id + '}).then(()=>false,()=>true)');
    assert(badGuest);
    service.browser.release(topicId, deps.requestId);
    await win.webContents.executeJavaScript('document.querySelector(".chat-tab[title=浏览器]").click()');
    win.setSize(820, 720);
    await win.webContents.executeJavaScript('document.querySelector(".browser-pane-action[title=最大化]").click()');
    await sleep(150);
    fs.writeFileSync(path.join(captures, 'compact.png'), (await win.webContents.capturePage()).toPNG());
    assert.equal(await win.webContents.executeJavaScript('document.documentElement.scrollWidth>innerWidth'), false);
    // Regression coverage for snapshot budgets, state and inherited HTML disabledness.
    const reg = await tool('browser_tabs', { action: 'open', url: url + 'regression' });
    assert(reg.ok);
    const regId = reg.tabId;
    const regWc = service.browser.tabs.get(regId).wc;
    await until(() => !regWc.isLoadingMainFrame(), 'regression fixture');
    async function regSnapshot() {
      const response = await tool('browser_snapshot', { tabId: regId });
      assert(response.ok, JSON.stringify(response));
      assert(Buffer.byteLength(JSON.stringify(response), 'utf8') <= 48 * 1024);
      return response;
    }
    let regSnap = await regSnapshot();
    const allElements = [...regSnap.elements];
    let nextElementOffset = regSnap.nextElementOffset;
    while (nextElementOffset !== null) {
      const response = await tool('browser_snapshot', { tabId: regId, snapshotId: regSnap.snapshotId, elementOffset: nextElementOffset });
      assert(response.ok);
      assert(Buffer.byteLength(JSON.stringify(response), 'utf8') <= 48 * 1024);
      allElements.push(...response.elements);
      assert(response.nextElementOffset === null || response.nextElementOffset > nextElementOffset);
      nextElementOffset = response.nextElementOffset;
    }
    assert.equal(allElements.filter((el) => el.label.startsWith('分页按钮 ')).length, 140);
    assert.equal(new Set(allElements.map((el) => el.id)).size, allElements.length);
    const huge = allElements.find((el) => el.options?.some((o) => o.valueTruncated));
    assert(huge);
    assert.equal(huge.options[0].value.length, 240);
    assert.equal(huge.options[0].label.length, 240);
    assert.equal(huge.options[0].labelTruncated, true);
    assert.equal(regSnap.captureTruncated, true);
    assert.equal(allElements.find((el) => el.label === '勾选状态').checked, false);
    assert.equal(allElements.find((el) => el.label === '勾选状态').indeterminate, true);
    assert.equal(allElements.find((el) => el.label === '单选状态').checked, true);
    assert.equal(allElements.find((el) => el.label === 'ARIA 勾选').ariaChecked, 'mixed');
    const check = allElements.find((el) => el.label === '勾选状态');
    assert((await tool('browser_act', { tabId: regId, snapshotId: regSnap.snapshotId, elementId: check.id, action: 'click' })).ok);
    regSnap = await regSnapshot();
    assert.equal(regSnap.elements.find((el) => el.label === '勾选状态').checked, true);
    assert.equal(regSnap.elements.find((el) => el.label === '勾选状态').indeterminate, false);
    const blocked = regSnap.elements.find((el) => el.label === '禁用输入');
    assert.equal(blocked.disabled, true);
    const blockedFill = await tool('browser_act', { tabId: regId, snapshotId: regSnap.snapshotId, elementId: blocked.id, action: 'fill', value: 'changed' });
    assert.equal(blockedFill.ok, false);
    assert.match(blockedFill.error, /element_unavailable/);
    assert.deepEqual(await regWc.executeJavaScript('({value:document.querySelector("#reg-blocked").value,writes:window.fieldWrites})'), { value: 'original', writes: 0 });
    regSnap = await regSnapshot();
    const group = regSnap.elements.find((el) => el.label === '禁用选项组');
    assert.equal(group.options.find((o) => o.value === 'blocked').disabled, true);
    const blockedSelect = await tool('browser_act', { tabId: regId, snapshotId: regSnap.snapshotId, elementId: group.id, action: 'select', value: 'blocked' });
    assert.equal(blockedSelect.ok, false);
    assert.deepEqual(await regWc.executeJavaScript('({value:document.querySelector("#reg-group").value,writes:window.optionWrites})'), { value: 'allowed', writes: 0 });
    // The first legend is exempt from inherited fieldset disabledness.
    regSnap = await regSnapshot();
    const legend = regSnap.elements.find((el) => el.label === '可填写的图例');
    assert.equal(legend.disabled, false);
    assert((await tool('browser_act', { tabId: regId, snapshotId: regSnap.snapshotId, elementId: legend.id, action: 'fill', value: 'changed' })).ok);
    service.browser.release(topicId, deps.requestId);
    await until(() => !service.browser.tabs.get(regId).pending, 'debugger cleanup before new navigation owner');

    // A response that never ends must be stoppable after timeout and cancellation.
    const navTopic = 'browser-navigation-regression';
    const navController = new AbortController();
    const navDeps = { ...deps, topicId: navTopic, requestId: 'nav-timeout', signal: navController.signal };
    manager.activeStreams.set(navTopic, { requestId: navDeps.requestId, controller: navController, mcpCallIds: new Set(), status: 'streaming' });
    const originalTimeout = service.browser.timeoutMs;
    service.browser.timeoutMs = 100;
    const timedOut = await tool('browser_navigate', { tabId: regId, action: 'open', url: url + 'stall' }, navDeps);
    service.browser.timeoutMs = originalTimeout;
    assert.equal(timedOut.ok, false);
    assert.match(timedOut.error, /browser_timeout/);
    await until(() => !service.browser.tabs.get(regId).pending && !regWc.isLoadingMainFrame(), 'timeout stops the real navigation');
    const pause = await win.webContents.executeJavaScript('window.electronAPI.invoke("browser:ui",{action:"pause",tabId:' + JSON.stringify(regId) + '})');
    assert(pause.ok);
    const closed = await win.webContents.executeJavaScript('window.electronAPI.invoke("browser:ui",{action:"close",tabId:' + JSON.stringify(regId) + '})');
    assert(closed.ok);
    assert(!service.browser.tabs.has(regId));

    const abortController = new AbortController();
    const abortDeps = { ...navDeps, requestId: 'nav-abort', signal: abortController.signal };
    manager.activeStreams.set(navTopic, { requestId: abortDeps.requestId, controller: abortController, mcpCallIds: new Set(), status: 'streaming' });
    const abortTab = await tool('browser_tabs', { action: 'open', url }, abortDeps);
    assert(abortTab.ok);
    const abortWc = service.browser.tabs.get(abortTab.tabId).wc;
    await until(() => !abortWc.isLoadingMainFrame(), 'abort fixture');
    const aborting = service.executeBrowserTool('browser_navigate', { tabId: abortTab.tabId, action: 'open', url: url + 'stall' }, abortDeps);
    await until(() => Boolean(service.browser.tabs.get(abortTab.tabId).cancelNavigation) && abortWc.isLoadingMainFrame(), 'navigation begins before pause');
    const abortedPause = await win.webContents.executeJavaScript('window.electronAPI.invoke("browser:ui",{action:"pause",tabId:' + JSON.stringify(abortTab.tabId) + '})');
    assert(abortedPause.ok);
    assert.equal((await aborting).ok, false);
    assert(abortController.signal.aborted);
    await until(() => !service.browser.tabs.get(abortTab.tabId).pending, 'cancel stops the real navigation');
    const abortedClose = await win.webContents.executeJavaScript('window.electronAPI.invoke("browser:ui",{action:"close",tabId:' + JSON.stringify(abortTab.tabId) + '})');
    assert(abortedClose.ok);
    assert(!service.browser.tabs.has(abortTab.tabId));
    console.log('PASS regressions: 48 KiB budget, truncated options, lossless element pagination, checked/indeterminate/ARIA state, inherited disabled controls and optgroups, first-legend exception, real timeout/abort navigation recovery.');
    while (service.browser.tabs.size < 14) service.browser.add('about:blank');
    await until(() => [...service.browser.tabs.values()].every((t) => t.wc), '14 tabs registered');
    const savedIds = [...service.browser.tabs.keys()];
    win.destroy(); win = null;
    await until(() => [...service.browser.tabs.values()].every((t) => !t.wc), 'window disconnect');
    assert.deepEqual([...service.browser.tabs.keys()], savedIds, 'Window loss must preserve all 14 tab ids');
    win = new BrowserWindow({ width: 1280, height: 850, show: false, webPreferences: { preload: path.join(root, 'electron/preload.cjs'), contextIsolation: true, nodeIntegration: false, webviewTag: true } });
    if (process.env.BROWSER_SMOKE_DEV_URL) await win.loadURL(new URL('/?window=chat', process.env.BROWSER_SMOKE_DEV_URL).href);
    else await win.loadFile(path.join(root, 'dist/index.html'), { query: { window: 'chat' } });
    await until(() => [...service.browser.tabs.values()].every((t) => t.wc), '14 tabs reconnected');
    assert.deepEqual([...service.browser.tabs.keys()], savedIds);
    console.log('PASS 14-tab recovery: stable ids, explicit generations, complete reconnection');
    service.browser.clear();
    win.destroy(); win = null;
    console.log('PASS: real webview registration, dispatcher, search, forms, submit, stale elements, redaction, same-origin frames, pagination, pause/resume IPC, hidden execution, popup, sender validation, cleanup.');
    console.log('UI captures:', captures);
    manager.activeStreams.clear();
    server.closeAllConnections();
    server.close();
    app.exit(0);
  } catch (e) { console.error(e); if (server) server.close(); app.exit(1); }
});
