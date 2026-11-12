const { randomUUID } = require('node:crypto');
const { pageScript, MAX_SNAPSHOT_BYTES } = require('./browserPage.cjs');
const TOOL_NAMES = ['browser_tabs', 'browser_navigate', 'browser_snapshot', 'browser_act'];
const ACTION_LABELS = { browser_tabs: { open: '打开标签页', activate: '切换标签页', close: '关闭标签页' }, browser_navigate: { open: '打开网页', back: '返回上一页', forward: '前往下一页', reload: '刷新页面' }, browser_snapshot: { read: '读取页面' }, browser_act: { click: '点击元素', fill: '填写信息', select: '选择选项', scroll: '滚动页面', press: '按键操作', hover: '悬停元素', upload: '上传文件', wait_for: '等待页面条件', dialog: '处理对话框' } };
const { BrowserCdp } = require('./browserCdp.cjs');

function httpUrl(raw) {
  const url = new URL(String(raw));
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('invalid_url: 仅支持 http/https');
  return url.href;
}

class BrowserAutomation {
  constructor({ emit = () => {}, create = () => {}, activate = () => {}, close = () => {}, abort = () => {}, describeTopic = (id) => id, timeoutMs = 15000 } = {}) {
    Object.assign(this, { emit, create, activate, close, abort, describeTopic, timeoutMs });
    this.instanceId = randomUUID();
    this.revision = 0;
    this.lastReset = null;
    this.actions = new Map();
    this.tabs = new Map();
    this.paused = new Map();
    this.requests = new Map();
    this.activeTabId = null;
  }

  state() {
    return { instanceId: this.instanceId, revision: this.revision, lastReset: this.lastReset, tabs: [...this.tabs.values()].map((t) => ({ id: t.id, generation: t.generation, resetReason: t.resetReason, dialog: t.cdp?.dialog || null, downloads: t.downloads || [], title: t.wc && !t.wc.isDestroyed() ? t.wc.getTitle() : t.title, url: t.wc && !t.wc.isDestroyed() ? t.wc.getURL() : t.url, ready: Boolean(t.wc), pending: t.pending, control: t.control ? { topicId: t.control.topicId, requestId: t.control.requestId, topicName: this.describeTopic(t.control.topicId), action: t.action } : null })), activeTabId: this.activeTabId, paused: [...this.paused.values()] };
  }
  changed() { this.revision++; this.emit(this.state()); }
  add(url = 'about:blank', id = randomUUID()) {
    if (url !== 'about:blank') url = httpUrl(url);
    this.tabs.set(id, { id, title: url === 'about:blank' ? '新标签页' : url, url, wc: null, control: null, pending: false, snapshotId: null, cancelNavigation: null, generation: 1, downloads: [] });
    this.activeTabId = id;
    this.changed();
    this.create(id, url);
    return id;
  }
  register(id, wc) {
    const tab = this.tabs.get(id);
    if (!tab) throw new Error('tab_not_found');
    if (tab.wc === wc) return;
    if (tab.wc && !tab.wc.isDestroyed()) throw new Error('tab_already_registered');
    tab.wc = wc;
    wc.setBackgroundThrottling?.(false);
    const invalidate = () => { tab.snapshotId = null; tab.url = wc.getURL(); tab.title = wc.getTitle(); this.changed(); };
    wc.on('did-navigate', invalidate);
    wc.on('did-navigate-in-page', invalidate);
    wc.on('page-title-updated', () => this.changed());
    wc.on('render-process-gone', () => this.disconnect(id, wc, 'guest_process_gone'));
    wc.once('destroyed', () => this.disconnect(id, wc, 'guest_destroyed'));
    this.changed();
  }
  disconnect(id, wc, reason) {
    const tab = this.tabs.get(id);
    if (!tab || tab.wc !== wc) return;
    try { tab.url = wc.getURL() || tab.url; tab.title = wc.getTitle() || tab.title; } catch { /* disposed guest */ }
    tab.invalidatedSnapshotId = tab.snapshotId;
    tab.snapshotId = null;
    tab.wc = null;
    tab.cdp = null;
    tab.pending = false;
    tab.generation++;
    tab.resetReason = reason;
    if (tab.control) this.abort(tab.control.topicId, tab.control.requestId);
    tab.control = null;
    this.lastReset = { reason, tabId: id, at: Date.now() };
    this.changed();
  }
  resetOwner(reason) {
    for (const tab of this.tabs.values()) if (tab.wc) this.disconnect(tab.id, tab.wc, reason);
    this.lastReset = { reason, at: Date.now() };
    this.changed();
  }
  remove(id) {
    const tab = this.tabs.get(id);
    if (!tab) return;
    tab.cancelNavigation?.();
    if (tab.control) this.abort(tab.control.topicId, tab.control.requestId);
    this.tabs.delete(id);
    if (this.activeTabId === id) this.activeTabId = [...this.tabs.keys()].at(-1) || null;
    this.changed();
  }
  closeForUser(id) {
    const tab = this.tabs.get(id);
    if (tab?.control) throw new Error('请先暂停并接管');
    // Removing the row unmounts its webview, cancelling a stuck page script too.
    this.remove(id);
    this.close(id);
  }
  clear() {
    for (const id of [...this.tabs.keys()]) this.remove(id);
    this.paused.clear();
    this.changed();
  }
  disposeCdp(tab) {
    if (!tab.cdp || tab.cleaning || tab.pending || tab.dialogOperation) return;
    const cdp = tab.cdp;
    tab.cleaning = true;
    tab.pending = true;
    void cdp.dispose().catch(() => {}).finally(() => {
      if (tab.cdp === cdp) tab.cdp = null;
      tab.cleaning = false;
      tab.pending = false;
      this.changed();
    });
  }
  release(topicId, requestId) {
    const key = `${topicId}:${requestId}`;
    this.requests.get(key)?.cleanup();
    this.requests.delete(key);
    for (const tab of this.tabs.values()) {
      if (tab.control?.topicId === topicId && tab.control?.requestId === requestId) { tab.cancelNavigation?.(); if (tab.cdp?.dialog) void tab.cdp.answer(false).catch(() => {}); tab.control = null; tab.action = null; this.disposeCdp(tab); }
    }
    this.changed();
  }
  pause(tabId) {
    const tab = this.tabs.get(tabId);
    if (!tab?.control) throw new Error('not_controlled');
    const { topicId, requestId } = tab.control;
    this.paused.set(topicId, { topicId, requestId, tabId });
    this.abort(topicId, requestId);
    this.release(topicId, requestId);
  }
  discardTopic(topicId) { this.paused.delete(topicId); this.changed(); }
  lease(tab, deps, action) {
    if (!deps.topicId || !deps.requestId || !deps.signal) throw new Error('invalid_session');
    if (deps.signal.aborted) throw new Error('aborted');
    if (tab.pending) throw new Error('tab_busy: 上一次调用仍在结束，请稍后重新读取页面');
    if (tab.control && (tab.control.topicId !== deps.topicId || tab.control.requestId !== deps.requestId)) throw new Error('tab_busy: 标签页正由其他会话控制');
    const key = `${deps.topicId}:${deps.requestId}`;
    if (!this.requests.has(key)) {
      const onAbort = () => this.release(deps.topicId, deps.requestId);
      deps.signal.addEventListener('abort', onAbort, { once: true });
      this.requests.set(key, { cleanup: () => deps.signal.removeEventListener('abort', onAbort) });
    }
    this.paused.delete(deps.topicId);
    tab.pending = true;
    tab.control = { topicId: deps.topicId, requestId: deps.requestId };
    tab.action = action;
    this.activeTabId = tab.id;
    this.changed();
  }
  async bounded(work, signal, onTimeout = () => {}, timeoutMs = this.timeoutMs) {
    let timer;
    let cancel;
    try {
      return await Promise.race([Promise.resolve().then(() => { if (signal?.aborted) throw new Error('aborted'); return work(); }), new Promise((_, reject) => {
        cancel = () => reject(new Error('aborted'));
        signal?.addEventListener('abort', cancel, { once: true });
        timer = setTimeout(() => { reject(new Error('browser_timeout: 操作结果未知，先重新读取页面，勿重复提交')); onTimeout(); }, timeoutMs);
      })]);
    } finally { clearTimeout(timer); signal?.removeEventListener('abort', cancel); }
  }
  async ready(tab, signal, deadline) {
    await new Promise((resolve, reject) => {
      let tick;
      let timer;
      const finish = (error) => {
        clearInterval(tick); clearTimeout(timer);
        signal?.removeEventListener('abort', aborted);
        if (error) reject(error); else resolve();
      };
      const aborted = () => finish(new Error('aborted'));
      const check = () => {
        if (signal?.aborted) aborted();
        else if (!this.tabs.has(tab.id)) finish(new Error('tab_closed'));
        else if (tab.wc && !tab.wc.isDestroyed()) finish();
      };
      tick = setInterval(check, 25);
      timer = setTimeout(() => finish(new Error('tab_not_ready')), Math.max(1, deadline - Date.now()));
      signal?.addEventListener('abort', aborted, { once: true });
      check();
    });
  }
  async page(wc, command, userGesture = false) {
    const result = await wc.executeJavaScriptInIsolatedWorld(998, [{ code: pageScript(command) }], userGesture);
    if (result?.browserError) throw Object.assign(new Error(result.browserError), { outcome: result.outcome || 'unknown' });
    return result;
  }
  async execute(name, args, deps) {
    const mutation = name !== 'browser_snapshot' && !(name === 'browser_tabs' && args.action === 'list') && !(name === 'browser_act' && args.action === 'wait_for');
    const actionId = mutation ? args.action_id ?? deps.toolCallId ?? randomUUID() : undefined;
    const resultMeta = (result) => ({ ...result, ...(result.error ? { error_code: result.error.split(':')[0] } : {}), instanceId: this.instanceId, revision: this.revision, ...(actionId ? { action_id: actionId, outcome: result.outcome || (result.ok ? 'applied' : 'not_applied'), verified: false } : {}) });
    if (typeof actionId !== 'undefined' && (typeof actionId !== 'string' || !actionId.length || actionId.length > 160)) return resultMeta({ ok: false, error: 'invalid_action_id' });
    if (args.instanceId && args.instanceId !== this.instanceId) return resultMeta({ ok: false, error: 'session_restarted', ...this.state() });
    try { deps.assertEnvironment?.(); } catch (e) { return resultMeta({ ok: false, error: e.message }); }
    if (deps.signal?.aborted) return resultMeta({ ok: false, error: 'aborted' });
    const key = actionId && `${deps.topicId}:${actionId}`;
    const fingerprint = JSON.stringify([name, args]);
    if (key && this.actions.has(key)) {
      const previous = this.actions.get(key);
      if (previous.fingerprint !== fingerprint) return resultMeta({ ok: false, error: 'action_id_conflict' });
      return { ...await previous.result, replayed: true };
    }
    // Never evict an id and silently execute it again. Start a fresh app session if full.
    if (key && this.actions.size >= 10000) return resultMeta({ ok: false, error: 'action_history_full' });
    const result = this.executeOnce(name, args, deps).then(resultMeta);
    if (key) this.actions.set(key, { fingerprint, result });
    return result;
  }
  async executeOnce(name, args, deps) {
    let reserved;
    let dispatched = false;
    let effectPossible = false;
    const deadline = Date.now() + (args.action === 'wait_for' ? Math.min(30000, Math.max(1, args.timeoutMs || 10000)) : this.timeoutMs);
    try {
      if (deps.signal?.aborted) throw new Error('aborted');
      if (deps.agentConfig?.chatMode === 'plan' && !(name === 'browser_snapshot' || name === 'browser_tabs' && args.action === 'list')) throw new Error('plan_mode_read_only');
      if (name === 'browser_tabs' && args.action === 'list') return { ok: true, ...this.state() };
      if (name === 'browser_tabs' && args.action === 'open') {
        if (!deps.topicId || !deps.requestId || !deps.signal) throw new Error('invalid_session');
        const url = httpUrl(args.url);
        effectPossible = true;
        const id = this.add(url);
        const tab = this.tabs.get(id);
        this.lease(tab, deps, '打开标签页');
        reserved = tab;
        await this.ready(tab, deps.signal, deadline);
        return { ok: true, tabId: id, ...this.info(tab) };
      }
      const tab = this.tabs.get(args.tabId);
      if (!tab) throw new Error('tab_not_found');
      if (args.generation && args.generation !== tab.generation || args.snapshotId && args.snapshotId === tab.invalidatedSnapshotId) return { ok: false, error: 'session_restarted', ...this.state() };
      if (name === 'browser_act' && args.action === 'dialog') {
        if (!tab.control || tab.control.topicId !== deps.topicId || tab.control.requestId !== deps.requestId) throw new Error('tab_busy');
        if (typeof args.accept !== 'boolean' || !tab.cdp?.dialog) throw new Error('invalid_dialog_decision');
        effectPossible = true;
        await tab.cdp.answer(args.accept, args.promptText || '');
        if (tab.dialogOperation) await this.bounded(() => tab.dialogOperation, deps.signal);
        return { ok: true, tabId: tab.id, ...this.info(tab), outcome: 'applied', verify: '先重新读取页面确认结果；不要自动重试提交。' };
      }
      if (tab.cdp?.dialog) return { ok: false, error: 'dialog_pending', dialog: tab.cdp.dialog };
      this.lease(tab, deps, ACTION_LABELS[name]?.[args.action || 'read'] || '操作页面');
      reserved = tab;
      if (name === 'browser_tabs') {
        if (!['activate', 'close'].includes(args.action)) throw new Error('invalid_action');
        effectPossible = true;
        if (args.action === 'activate') { this.activeTabId = tab.id; this.activate(tab.id); this.changed(); }
        else if (args.action === 'close') { tab.control = null; this.remove(tab.id); this.close(tab.id); }
        else throw new Error('invalid_action');
        return { ok: true, tabId: tab.id };
      }
      await this.ready(tab, deps.signal, deadline);
      deps.assertEnvironment?.();
      const wc = tab.wc;
      if (!wc || wc.isDestroyed()) throw new Error('tab_closed');
      // No following command may overtake a timed-out/aborted Electron call.
      tab.pending = true;
      const operation = async () => {
        if (deps.signal.aborted || !this.tabs.has(tab.id)) throw new Error('aborted');
        if (name === 'browser_navigate') {
          if (!['open', 'back', 'forward', 'reload'].includes(args.action)) throw new Error('invalid_action');
          if (args.action === 'open') httpUrl(args.url);
          if (args.action === 'back' && !wc.navigationHistory.canGoBack() || args.action === 'forward' && !wc.navigationHistory.canGoForward()) throw new Error('navigation_unavailable');
          effectPossible = true;
          tab.snapshotId = null;
          if (args.action === 'open') {
            const url = httpUrl(args.url);
            tab.cancelNavigation = () => {
              try { if (!wc.isDestroyed()) wc.stop(); } catch { /* Guest already disposed. */ }
            };
            await wc.loadURL(url);
          }
          else if (args.action === 'back' && wc.navigationHistory.canGoBack()) wc.navigationHistory.goBack();
          else if (args.action === 'forward' && wc.navigationHistory.canGoForward()) wc.navigationHistory.goForward();
          else if (args.action === 'reload') wc.reload();
          else throw new Error('navigation_unavailable');
          return {};
        }
        if (name === 'browser_snapshot') {
          if (args.snapshotId && args.snapshotId !== tab.snapshotId) throw new Error('snapshot_expired');
          for (const offset of [args.textOffset, args.elementOffset]) if (offset !== undefined && (!Number.isInteger(offset) || offset < 0)) throw new Error('invalid_offset');
          if (!args.snapshotId && (args.textOffset || args.elementOffset)) throw new Error('snapshotId_required_for_pagination');
          const snapshotId = args.snapshotId || randomUUID();
          const result = await this.page(wc, { kind: 'snapshot', snapshotId: args.snapshotId, newSnapshotId: snapshotId, textOffset: args.textOffset, elementOffset: args.elementOffset });
          if (!deps.signal.aborted) tab.snapshotId = snapshotId;
          if (args.screenshot) {
            const fs = require('node:fs'); const path = require('node:path');
            const folder = path.join(require('electron').app.getPath('userData'), 'browser-captures');
            fs.mkdirSync(folder, { recursive: true });
            const file = path.join(folder, `${randomUUID()}.png`);
            fs.writeFileSync(file, (await wc.capturePage()).toPNG());
            result.screenshot = file;
          }
          return { ...result, generation: tab.generation };
        }
        if (name === 'browser_act') {
          if (args.action === 'wait_for') {
            if (!args.locator && !args.text) throw new Error('invalid_wait_condition');
            while (true) {
              if (Date.now() >= deadline) throw new Error('wait_timeout');
              if (deps.signal.aborted) throw new Error('aborted');
              const probe = await this.page(wc, { kind: 'wait', locator: args.locator, text: args.text, state: args.state || 'visible' });
              if (probe.matched) return { matched: true };
              if (Date.now() >= deadline) throw new Error('wait_timeout');
              await new Promise((resolve) => setTimeout(resolve, 80));
            }
          }
          if (!args.snapshotId || tab.snapshotId !== args.snapshotId) throw new Error('snapshot_expired: 请重新读取页面');
          if (!['click', 'fill', 'select', 'scroll', 'press', 'hover', 'upload'].includes(args.action)) throw new Error('invalid_action');
          if (args.action !== 'scroll' && typeof args.elementId !== 'string' && !args.locator) throw new Error('elementId_or_locator_required');
          if (['fill', 'select'].includes(args.action) && (typeof args.value !== 'string' || args.value.length > 20000)) throw new Error('invalid_value');
          if (args.action === 'press') BrowserCdp.key(args.key);
          if (args.action === 'upload') {
            if (!Array.isArray(args.files) || args.files.length > 20) throw new Error('invalid_files');
            for (const f of args.files) {
              if (typeof f !== 'string' || !require('node:path').isAbsolute(f)) throw new Error('invalid_files: 必须提供绝对路径');
              try { if (!require('node:fs').statSync(f).isFile()) throw new Error('invalid_files: 路径不是文件'); }
              catch (e) { if (e.message.startsWith('invalid_files')) throw e; throw new Error('invalid_files: 文件不存在或无法访问'); }
            }
          }
          if (args.action === 'scroll' && !['up', 'down', 'left', 'right'].includes(args.direction)) throw new Error('invalid_direction');
          if (!tab.cdp && wc.debugger) { tab.cdp = new BrowserCdp(wc, () => this.changed()); await tab.cdp.ready(); }
          const command = { kind: 'act', snapshotId: args.snapshotId, action: args.action, elementId: args.elementId, locator: args.locator, value: args.value, direction: args.direction, key: args.key };
          const run = async () => {
            if (['press', 'hover', 'upload', 'fill'].includes(args.action) && tab.cdp) return BrowserCdp.input(async () => {
              if (deps.signal.aborted || Date.now() >= deadline) throw Object.assign(new Error('aborted_before_dispatch'), { outcome: 'not_applied' });
              await this.page(wc, { ...command, action: 'validate', forAction: args.action });
              const token = randomUUID();
              // Preparation can run page focus/scroll handlers too. A timeout
              // after this boundary is uncertain even before the key is sent.
              effectPossible = true;
              await tab.cdp.focus();
              try {
              const point = await this.page(wc, { ...command, action: 'prepare', forAction: args.action, token }, true);
              if (args.action === 'fill' && point.nativeFill === false) return this.page(wc, command, true);
              effectPossible = true;
              if (args.action === 'fill') await tab.cdp.fill(args.value);
              if (args.action === 'press') await tab.cdp.press(args.key);
              if (args.action === 'hover') await tab.cdp.hover(point);
              if (args.action === 'upload') await tab.cdp.upload(token, args.files);
              return { performed: args.action, outcome: 'applied' };
              } finally { await tab.cdp.restoreFocus(); }
            });
            effectPossible = true;
            return this.page(wc, command, true);
          };
          if (!tab.cdp) return run();
          const observed = await tab.cdp.observe(run);
          if (observed.dialog) {
            tab.dialogOperation = observed.operation;
            observed.operation.finally(() => { if (tab.wc !== wc) return; tab.dialogOperation = null; tab.pending = Boolean(tab.cleaning); if (!tab.control) this.disposeCdp(tab); this.changed(); }).catch(() => {});
            if (args.dialog && typeof args.dialog.accept === 'boolean') { await tab.cdp.answer(args.dialog.accept, args.dialog.promptText || ''); return observed.operation; }
            return { outcome: 'unknown', dialog: observed.dialog, verify: '原生对话框等待决定；使用 browser_act action=dialog 明确 accept/dismiss，不要重复原动作。' };
          }
          return observed.value;
        }
        throw new Error('unknown_browser_tool');
      };
      dispatched = true;
      const pending = Promise.resolve().then(operation).finally(() => { if (tab.wc !== wc) return; tab.cancelNavigation = null; tab.pending = Boolean(tab.dialogOperation || tab.cleaning); if (!tab.control) this.disposeCdp(tab); this.changed(); });
      const result = await this.bounded(() => pending, deps.signal, () => { tab.snapshotId = null; tab.cancelNavigation?.(); }, Math.max(1, deadline - Date.now()));
      const response = { ok: true, tabId: tab.id, ...this.info(tab), ...result, verify: result.verify || (name === 'browser_snapshot' ? undefined : '先重新读取页面确认结果；不要自动重试提交。') };
      if (name === 'browser_snapshot' && Buffer.byteLength(JSON.stringify(response), 'utf8') > MAX_SNAPSHOT_BYTES) return { ok: false, error: 'snapshot_too_large: 页面输出超过大小上限，请人工接管' };
      return response;
    } catch (e) { return { ok: false, error: String(e.message || e), outcome: e.outcome || (effectPossible ? 'unknown' : 'not_applied'), ...(e.outcome === 'unknown' ? { verify: '可能已产生副作用；先读取页面核对，禁止自动重复提交。' } : {}) }; }
    finally { if (reserved && !dispatched) { reserved.pending = Boolean(reserved.cleaning); this.changed(); } }
  }
  info(tab) {
    return { url: String(tab.wc && !tab.wc.isDestroyed() ? tab.wc.getURL() : tab.url).slice(0, 2048), title: String(tab.wc && !tab.wc.isDestroyed() ? tab.wc.getTitle() : tab.title).slice(0, 240), downloads: tab.downloads || [], dialog: tab.cdp?.dialog || null, generation: tab.generation, loading: Boolean(tab.wc?.isLoadingMainFrame?.()) };
  }
}
module.exports = { BrowserAutomation, TOOL_NAMES, httpUrl };
