const fs = require('node:fs');
const path = require('node:path');
// Electron replaces window.prompt with an unsupported stub. Suspend this fixed
// compatibility function at its debugger statement until the agent answers.
const promptShim = 'if(!Object.prototype.hasOwnProperty.call(window,"__dfOriginalPrompt")) window.__dfOriginalPrompt=window.prompt; window.prompt = function __desktopFairyPrompt(message="", defaultValue="") { let answer = null; debugger; return answer; };';
let inputQueue = Promise.resolve();

// Only fixed protocol commands are exposed. Never accept JavaScript from the model.
class BrowserCdp {
  static input(work) {
    const result = inputQueue.then(work);
    inputQueue = result.catch(() => {});
    return result;
  }
  constructor(wc, onDialog = () => {}) {
    this.wc = wc;
    this.dialog = null;
    this.waiters = new Set();
    this.onDialog = onDialog;
    this.contexts = new Set();
  }
  async ready() {
    if (!this.initializing) this.initializing = (async () => {
      if (this.wc.debugger.isAttached()) throw new Error('debugger_busy: 请关闭此网页的 DevTools 后重试');
      this.wc.debugger.attach('1.3');
      this.ownsDebugger = true;
      this.handleMessage = (_event, method, params) => { void (async () => {
        if (method === 'Runtime.executionContextCreated' && params.context?.auxData?.isDefault) {
          this.contexts.add(params.context.id);
          await this.send('Runtime.evaluate', { expression: promptShim, contextId: params.context.id }).catch(() => {});
          return;
        }
        if (method === 'Debugger.paused') {
          const frame = params.callFrames?.[0];
          if (frame?.functionName !== '__desktopFairyPrompt') { await this.send('Debugger.resume').catch(() => {}); return; }
          const info = await this.send('Debugger.evaluateOnCallFrame', { callFrameId: frame.callFrameId, expression: '({message:String(message).slice(0,5000),defaultPrompt:String(defaultValue).slice(0,5000)})', returnByValue: true });
          this.promptFrame = frame.callFrameId;
          this.dialog = { type: 'prompt', ...info.result.value };
          this.onDialog(this.dialog);
          for (const resolve of this.waiters) resolve(this.dialog);
          this.waiters.clear();
          return;
        }
        if (method === 'Page.javascriptDialogOpening') {
          this.dialog = { type: params.type, message: params.message, defaultPrompt: params.defaultPrompt || '' };
          this.onDialog(this.dialog);
          for (const resolve of this.waiters) resolve(this.dialog);
          this.waiters.clear();
        } else if (method === 'Page.javascriptDialogClosed') { this.dialog = null; this.onDialog(null); }
      })().catch((error) => { this.protocolError = error.message; void this.send('Debugger.resume').catch(() => {}); }); };
      this.handleDetach = () => {
        this.initializing = null;
        this.ownsDebugger = false;
        this.wc.debugger.removeListener('message', this.handleMessage);
        this.wc.debugger.removeListener('detach', this.handleDetach);
      };
      this.wc.debugger.on('message', this.handleMessage);
      this.wc.debugger.on('detach', this.handleDetach);
      await this.send('Page.enable');
      await this.send('Runtime.enable');
      await this.send('Debugger.enable');
      this.promptScript = (await this.send('Page.addScriptToEvaluateOnNewDocument', { source: promptShim })).identifier;
      await this.send('Runtime.evaluate', { expression: promptShim });
    })();
    return this.initializing;
  }
  async dispose() {
    if (!this.ownsDebugger || !this.wc.debugger.isAttached()) return;
    if (this.dialog) await this.answer(false).catch(() => {});
    if (this.promptScript) await this.send('Page.removeScriptToEvaluateOnNewDocument', { identifier: this.promptScript }).catch(() => {});
    const expression = 'if(window.prompt?.name==="__desktopFairyPrompt"){window.prompt=window.__dfOriginalPrompt;delete window.__dfOriginalPrompt}';
    for (const contextId of this.contexts) await this.send('Runtime.evaluate', { expression, contextId }).catch(() => {});
    await this.send('Runtime.evaluate', { expression }).catch(() => {});
    if (this.wc.debugger.isAttached()) this.wc.debugger.detach();
  }
  send(method, args = {}) { return this.wc.debugger.sendCommand(method, args); }
  async focus() {
    if (this.wc.hostWebContents) {
      await this.wc.hostWebContents.executeJavaScript(`{for(const el of document.querySelectorAll('webview')){try{if(el.getWebContentsId()===${this.wc.id}){globalThis.__dfBrowserPriorFocus={guest:el,previous:document.activeElement};el.focus();break}}catch{}}}`);
    }
    this.wc.focus();
    await this.send('Emulation.setFocusEmulationEnabled', { enabled: true });
  }
  async restoreFocus() {
    await this.send('Emulation.setFocusEmulationEnabled', { enabled: false }).catch(() => {});
    if (this.wc.hostWebContents && !this.wc.hostWebContents.isDestroyed()) {
      await this.wc.hostWebContents.executeJavaScript('{const state=globalThis.__dfBrowserPriorFocus;delete globalThis.__dfBrowserPriorFocus;if(state?.guest===document.activeElement&&state.previous?.isConnected)state.previous.focus()}').catch(() => {});
    }
  }
  async observe(work) {
    await this.ready();
    let resolveDialog;
    const dialog = new Promise((resolve) => { resolveDialog = resolve; this.waiters.add(resolve); });
    const operation = Promise.resolve().then(work);
    try {
      const result = await Promise.race([operation.then((value) => ({ value })), dialog.then((value) => ({ dialog: value }))]);
      return { ...result, operation };
    } finally { this.waiters.delete(resolveDialog); }
  }
  async answer(accept, promptText = '') {
    await this.ready();
    if (!this.dialog) throw new Error('dialog_not_found');
    if (this.promptFrame) {
      await this.send('Debugger.evaluateOnCallFrame', { callFrameId: this.promptFrame, expression: `answer = ${JSON.stringify(accept ? promptText : null)}` });
      this.promptFrame = null;
      this.dialog = null;
      this.onDialog(null);
      await this.send('Debugger.resume');
      return;
    }
    this.dialog = null;
    this.onDialog(null);
    await this.send('Page.handleJavaScriptDialog', { accept, promptText });
  }
  static key(raw) {
    if (typeof raw !== 'string') throw new Error('unsupported_key');
    const parts = raw === '+' ? ['+'] : raw.endsWith('++') ? [...raw.slice(0, -2).split('+').filter(Boolean), '+'] : raw.split('+');
    const main = parts.pop();
    let modifiers = 0;
    for (const mod of parts) {
      const bit = { Alt: 1, Control: 2, Ctrl: 2, Meta: 4, Shift: 8 }[mod];
      if (!bit) throw new Error('unsupported_key: 无效组合键');
      modifiers |= bit;
    }
    const special = { Enter: ['Enter', 13], Tab: ['Tab', 9], Escape: ['Escape', 27], Space: [' ', 32], Backspace: ['Backspace', 8], Delete: ['Delete', 46], ArrowLeft: ['ArrowLeft', 37], ArrowUp: ['ArrowUp', 38], ArrowRight: ['ArrowRight', 39], ArrowDown: ['ArrowDown', 40], Home: ['Home', 36], End: ['End', 35], PageUp: ['PageUp', 33], PageDown: ['PageDown', 34] };
    const pair = special[main] || (/^F(?:[1-9]|1[0-2])$/.test(main) ? [main, 111 + Number(main.slice(1))] : null);
    if (!pair && !/^[\x20-\x7e]$/.test(main)) throw new Error('unsupported_key: 支持可打印 ASCII、导航键、F1-F12 和 Ctrl/Meta/Alt/Shift 组合');
    const key = pair?.[0] || main;
    const code = special[main] ? main : /^[a-z]$/i.test(main) ? `Key${main.toUpperCase()}` : /^\d$/.test(main) ? `Digit${main}` : main;
    return { key, code, modifiers, windowsVirtualKeyCode: pair?.[1] || main.toUpperCase().charCodeAt(0), text: modifiers & 7 ? undefined : main === 'Enter' ? '\r' : main === 'Space' ? ' ' : main.length === 1 ? main : undefined };
  }
  async press(raw) {
    const key = BrowserCdp.key(raw);
    await this.ready();
    {
      const { text, ...base } = key;
      const editModifier = process.platform === 'darwin' ? 4 : 2;
      const command = key.modifiers & editModifier ? { a: 'selectAll', c: 'copy', x: 'cut', v: 'paste', z: key.modifiers & 8 ? 'redo' : 'undo', y: 'redo' }[key.key.toLowerCase()] : null;
      await this.send('Input.dispatchKeyEvent', { type: 'keyDown', ...base, ...(text ? { text, unmodifiedText: text } : {}), ...(command ? { commands: [command] } : {}) });
      await this.send('Input.dispatchKeyEvent', { type: 'keyUp', ...base });
    }
  }
  async fill(value) {
    await this.ready();
    {
      if (value) await this.send('Input.insertText', { text: value });
      else {
        await this.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Backspace', code: 'Backspace', windowsVirtualKeyCode: 8 });
        await this.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Backspace', code: 'Backspace', windowsVirtualKeyCode: 8 });
      }
    }
  }
  async hover(point) {
    await this.ready();
    await this.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: point.x, y: point.y });
  }
  async upload(token, files) {
    await this.ready();
    for (const file of files) if (!path.isAbsolute(file) || !fs.statSync(file).isFile()) throw new Error('invalid_file: 必须提供存在的绝对文件路径');
    const expression = `(()=>{function find(root){for(const el of root.querySelectorAll('*')){if(el.getAttribute('data-df-upload')===${JSON.stringify(token)})return el;if(el.shadowRoot){const r=find(el.shadowRoot);if(r)return r}try{if(el.contentDocument){const r=find(el.contentDocument);if(r)return r}}catch{}}}return find(document)})()`;
    const result = await this.send('Runtime.evaluate', { expression });
    const objectId = result.result?.objectId;
    if (!objectId) throw new Error('element_not_found');
    try { await this.send('DOM.setFileInputFiles', { objectId, files }); }
    finally {
      await this.send('Runtime.callFunctionOn', { objectId, functionDeclaration: 'function(){this.removeAttribute("data-df-upload")}' }).catch(() => {});
      await this.send('Runtime.releaseObject', { objectId }).catch(() => {});
    }
  }
}
module.exports = { BrowserCdp };
