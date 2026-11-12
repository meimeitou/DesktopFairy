// Local, isolated Chromium regressions: electron scripts/test-browser-dialogs-electron.cjs
const { app, BrowserWindow, ipcMain, webContents } = require('electron');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { BrowserAutomation } = require('../electron/browserAutomation.cjs');
const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'df-browser-dialogs-'));
app.setPath('userData', directory);
app.on('window-all-closed', () => {});
app.whenReady().then(async () => {
  app.dock?.hide();
  const windows = [];
  const server = http.createServer((req, res) => {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    if (req.url === '/opener') return res.end('<title>Opener</title><a id="new" href="/confirm" target="_blank">Open popup</a>');
    if (req.url === '/confirm') return res.end('<title>Confirm</title><body onload="window.choice=confirm(\'Are you sure?\');window.finished=true">confirm fixture</body>');
    if (req.url === '/two-prompts') return res.end('<body onload="window.choices=[prompt(\'First?\'),prompt(\'Second?\')];window.finished=true">two prompts</body>');
    if (req.url === '/mixed') return res.end('<body onload="window.choices=[prompt(\'First?\'),confirm(\'Second?\')];window.finished=true">mixed dialogs</body>');
    if (req.url === '/two') return res.end('<title>Two confirms</title><body onload="window.choices=[confirm(\'First?\'),confirm(\'Second?\')];window.finished=true">two fixture</body>');
    if (req.url === '/alert') return res.end('<title>Alert</title><body onload="alert(\'Onload alert\');window.finished=true">alert fixture</body>');
    if (req.url === '/prompt') return res.end('<title>Prompt</title><body onload="window.choice=prompt(\'Your name?\',\'default\');window.finished=true">prompt fixture</body>');
    if (req.url === '/nested') return res.end('<title>Nested</title><iframe src="/confirm"></iframe>');
    res.end('<title>Empty</title><body>empty fixture</body>');
  });
  let browser;
  const cleanup = (code) => {
    for (const win of windows) if (!win.isDestroyed()) win.destroy();
    server.closeAllConnections();
    server.close();
    fs.rmSync(directory, { force: true, recursive: true });
    app.exit(code);
  };
  const watchdog = setTimeout(() => { console.error('FAIL: native dialog blocked the browser regression'); cleanup(1); }, 15000);
  try {
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const base = `http://127.0.0.1:${server.address().port}`;
    browser = new BrowserAutomation({ timeoutMs: 2000 });
    const deps = { context: 'local', topicId: 'dialogs', requestId: '1', signal: new AbortController().signal, agentConfig: {} };
    const win = new BrowserWindow({ show: false, webPreferences: { contextIsolation: true, nodeIntegration: false } });
    windows.push(win);
    await win.loadURL(`${base}/empty`);
    const tabId = browser.add(`${base}/empty`);
    await browser.register(tabId, win.webContents);
    const call = (name, args) => browser.execute(name, { tabId, ...args }, deps);
    for (const [route, type, accept, promptText] of [
      ['/confirm', 'confirm', true], ['/alert', 'alert', true], ['/nested', 'confirm', false], ['/prompt', 'prompt', true, 'tester'],
    ]) {
      const result = await call('browser_navigate', { action: 'open', url: base + route });
      assert.equal(result.dialog?.type, type, JSON.stringify(result));
      assert.equal(browser.state().tabs[0].dialog?.type, type);
      const answer = await call('browser_act', { action: 'dialog', accept, promptText });
      assert.equal(answer.ok, true, JSON.stringify(answer));
      assert.equal(browser.tabs.get(tabId).pending, false);
      const snapshot = await call('browser_snapshot', {});
      assert.equal(snapshot.ok, true, JSON.stringify(snapshot));
      if (route === '/confirm') assert.equal(await win.webContents.executeJavaScript('window.choice'), true);
      if (route === '/prompt') assert.equal(await win.webContents.executeJavaScript('window.choice'), 'tester');
      console.log(`PASS navigation ${route}: observed ${type}, answered, snapshot resumed`);
    }
    for (const [route, decision1, decision2, expected] of [
      ['/two', { accept: true }, { accept: false }, [true, false]],
      ['/two-prompts', { accept: true, promptText: 'one' }, { accept: true, promptText: 'two' }, ['one', 'two']],
      ['/mixed', { accept: true, promptText: 'one' }, { accept: false }, ['one', false]],
    ]) {
      const first = await call('browser_navigate', { action: 'open', url: base + route });
      assert.equal(first.dialog?.message, 'First?');
      const second = await call('browser_act', { action: 'dialog', ...decision1 });
      assert.equal(second.dialog?.message, 'Second?', JSON.stringify(second));
      const final = await call('browser_act', { action: 'dialog', ...decision2 });
      assert.equal(final.ok, true, JSON.stringify(final));
      assert.deepEqual(await win.webContents.executeJavaScript('window.choices'), expected);
      assert.equal(browser.tabs.get(tabId).pending, false);
      console.log(`PASS consecutive ${route}: every decision is independently addressable`);
    }
    // Reproduce a target=_blank child inheriting its parent's request at registration.
    const child = new BrowserWindow({ show: false, webPreferences: { contextIsolation: true, nodeIntegration: false } });
    windows.push(child);
    await child.loadURL('about:blank');
    const childId = browser.add(`${base}/confirm`);
    browser.tabs.get(childId).control = { topicId: deps.topicId, requestId: deps.requestId };
    await browser.register(childId, child.webContents);
    const observed = await browser.execute('browser_snapshot', { tabId: childId }, deps);
    assert.equal(observed.dialog?.type, 'confirm', JSON.stringify(observed));
    const dismissed = await browser.execute('browser_act', { tabId: childId, action: 'dialog', accept: false }, deps);
    assert.equal(dismissed.ok, true, JSON.stringify(dismissed));
    assert.equal(await child.webContents.executeJavaScript('window.choice'), false);
    assert.equal((await browser.execute('browser_snapshot', { tabId: childId }, deps)).ok, true);
    console.log('PASS initial popup onload: debugger armed before first real navigation');
    const host = new BrowserWindow({ show: false, webPreferences: { webviewTag: true, contextIsolation: false, nodeIntegration: true } });
    windows.push(host);
    await host.loadURL('data:text/html,<title>Webview fixture</title><body></body>');
    const embedded = new BrowserAutomation({ timeoutMs: 5000, create: (id) => {
      void host.webContents.executeJavaScript(`{
        const view = document.createElement('webview');
        view.setAttribute('allowpopups', 'true');
        view.style.cssText = 'display:flex;width:800px;height:600px';
        let connected = false;
        let registering = false;
        const register = () => {
          if (connected || registering) return;
          let webContentsId;
          try { webContentsId = view.getWebContentsId(); } catch { return; }
          if (!webContentsId) return;
          registering = true;
          require('electron').ipcRenderer.invoke('fixture:browser:register', {
            tabId: ${JSON.stringify(id)}, webContentsId,
          }).then(() => { connected = true; clearInterval(poll); })
            .catch((error) => console.error(error)).finally(() => { registering = false; });
        };
        const poll = setInterval(register, 50);
        view.addEventListener('did-attach', register);
        view.addEventListener('dom-ready', register);
        view.src = 'about:blank';
        document.body.append(view);
        register();
      }`).catch((error) => console.error(error));
    } });
    ipcMain.handle('fixture:browser:register', async (_event, payload) => {
      await embedded.register(payload.tabId, webContents.fromId(payload.webContentsId));
    });
    host.webContents.on('did-attach-webview', (_event, guest) => {
      guest.setWindowOpenHandler(({ url }) => {
        const parent = [...embedded.tabs.values()].find((t) => t.wc === guest);
        const id = embedded.add(url);
        embedded.tabs.get(id).control = { ...parent.control };
        return { action: 'deny' };
      });
    });
    const parentId = embedded.add(`${base}/opener`);
    const parentSnapshot = await embedded.execute('browser_snapshot', { tabId: parentId }, deps);
    assert.equal(parentSnapshot.ok, true, JSON.stringify(parentSnapshot));
    const opened = await embedded.execute('browser_act', {
      tabId: parentId, snapshotId: parentSnapshot.snapshotId, action: 'click', locator: { css: '#new' },
    }, deps);
    assert.equal(opened.ok, true, JSON.stringify(opened));
    assert.equal(embedded.tabs.size, 2);
    const popupId = [...embedded.tabs.keys()].find((id) => id !== parentId);
    const popup = await embedded.execute('browser_snapshot', { tabId: popupId }, deps);
    assert.equal(popup.dialog?.message, 'Are you sure?', JSON.stringify(popup));
    const popupAnswer = await embedded.execute('browser_act', { tabId: popupId, action: 'dialog', accept: true }, deps);
    assert.equal(popupAnswer.ok, true, JSON.stringify(popupAnswer));
    assert.equal((await embedded.execute('browser_snapshot', { tabId: popupId }, deps)).ok, true);
    assert.equal(await embedded.tabs.get(popupId).wc.executeJavaScript('window.choice'), true);
    embedded.release(deps.topicId, deps.requestId);
    ipcMain.removeHandler('fixture:browser:register');
    console.log('PASS real webview target=_blank: onload confirm registered, accepted, tab unlocked');
    browser.release(deps.topicId, deps.requestId);
    clearTimeout(watchdog);
    cleanup(0);
  } catch (error) {
    console.error(error);
    clearTimeout(watchdog);
    cleanup(1);
  }
});
