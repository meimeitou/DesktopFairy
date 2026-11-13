const { EventEmitter } = require('node:events');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');

function setup() {
  const owner = new EventEmitter();
  let destroyed = false;
  let frameThrows = false;
  const frame = { isDestroyed: () => false };
  owner.id = 42;
  owner.isDestroyed = () => destroyed;
  owner.setWindowOpenHandler = () => {};
  owner.send = vi.fn();
  const getFrame = vi.fn(() => {
    if (destroyed || frameThrows) throw new TypeError('Object has been destroyed');
    return frame;
  });
  Object.defineProperty(owner, 'mainFrame', { get: getFrame });
  const win = { isDestroyed: () => false, webContents: owner };
  const app = new EventEmitter();
  app.getPath = () => '/unused-browser-service-test';
  const filename = path.join(__dirname, 'browserService.cjs');
  const localRequire = createRequire(filename);
  const mod = { exports: {} };
  vm.runInNewContext(fs.readFileSync(filename, 'utf8'), {
    module: mod,
    require: (name) => {
      if (name === 'electron') return { app, session: { fromPartition: () => new EventEmitter() } };
      if (name === 'node:fs') return { readFileSync: () => { throw new Error('no saved tabs'); } };
      return localRequire(name);
    },
    setTimeout: () => 1,
    clearTimeout: () => {},
    console,
  }, { filename });
  const service = mod.exports;
  service.registerBrowserHandlers({ handle: () => {} }, { getChatWindow: () => win });
  service.attachWindowOpenHandler(owner);
  service.browser.ownerId = owner.id;
  return { ...service, owner, frame, getFrame, destroy: () => { destroyed = true; }, breakFrame: () => { frameThrows = true; } };
}

describe('browser state broadcasts during window teardown', () => {
  it('resets the owner without accessing its destroyed WebContents mainFrame', () => {
    const { browser, owner, destroy, getFrame } = setup();
    destroy();
    expect(() => owner.emit('destroyed')).not.toThrow();
    expect(browser.lastReset.reason).toBe('owner_destroyed');
    expect(getFrame).not.toHaveBeenCalled();
    expect(owner.send).not.toHaveBeenCalled();
  });

  it('tolerates mainFrame throwing during renderer teardown', () => {
    const { browser, owner, breakFrame } = setup();
    breakFrame();
    expect(() => owner.emit('render-process-gone')).not.toThrow();
    expect(browser.lastReset.reason).toBe('owner_process_gone');
    expect(owner.send).not.toHaveBeenCalled();
  });

  it('skips a destroyed renderer frame', () => {
    const { browser, owner, frame } = setup();
    frame.isDestroyed = () => true;
    expect(() => browser.changed()).not.toThrow();
    expect(owner.send).not.toHaveBeenCalled();
  });

  it('continues sending state to a live renderer', () => {
    const { browser, owner } = setup();
    browser.changed();
    expect(owner.send).toHaveBeenCalledWith('browser:state', expect.objectContaining({ revision: 1 }));
  });
});
