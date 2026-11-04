import { createRequire } from 'node:module';
import { describe, expect, it, vi } from 'vitest';

const require = createRequire(import.meta.url);
const { sendToWebContents, broadcastToTopic } = require('../../electron/ai/topicBroadcast.cjs');
const { AiStreamManager } = require('../../electron/ai/streamManager/AiStreamManager.cjs');

// Electron 35 logs inside WebFrameMain.send rather than throwing to its caller.
function recipient(disposed = false) {
  const errors: string[] = [];
  const frame = {
    isDestroyed: () => disposed,
    send: vi.fn(() => {
      if (disposed) errors.push('Render frame was disposed before WebFrameMain could be accessed');
    }),
  };
  const wc = {
    isDestroyed: () => false,
    mainFrame: frame,
    send: vi.fn(() => frame.send()),
  };
  return { wc, frame, errors };
}

describe('stream broadcasts during renderer disposal', () => {
  it('skips a disposed frame even while its WebContents is alive', () => {
    const { wc, errors } = recipient(true);
    expect(sendToWebContents(wc, 'chunk', {})).toBe(false);
    expect(errors).toEqual([]);
  });

  it('retains undelivered legacy events for replay, including the fallback sender', () => {
    const { wc, errors } = recipient(true);
    const entry = { listeners: new Set([wc]) };
    const manager = { activeStreams: new Map([['topic', entry]]) };
    broadcastToTopic(manager, 'topic', wc, 'chat:stream:chunk', { text: 'hello' });
    expect(errors).toEqual([]);
    expect(manager.activeStreams.get('topic')).toMatchObject({
      legacyBuffer: [{ channel: 'chat:stream:chunk', data: { text: 'hello' } }],
    });
    const { unseenLegacyEvents } = require('../../electron/ai/streamManager/legacyReplay.cjs');
    expect(unseenLegacyEvents(entry, wc)).toHaveLength(1);
  });

  it('continues streaming to live listeners and buffers while another frame is disposed', async () => {
    const dead = recipient(true);
    const live = recipient();
    const manager = new AiStreamManager();
    const entry = {
      topicId: 'topic', requestId: 'request', controller: new AbortController(),
      listeners: new Set([dead.wc, live.wc]), buffer: [], mcpCallIds: new Set(),
    };
    await manager._executeStream(entry, {
      createStream: async () => new ReadableStream({
        start(controller) { controller.enqueue({ type: 'text-delta', delta: 'hello' }); controller.close(); },
      }),
      idleTimeoutMs: 1000,
    });
    expect(dead.errors).toEqual([]);
    expect(live.frame.send).toHaveBeenCalledTimes(2);
    expect(entry.buffer).toHaveLength(1);
    expect(entry).toMatchObject({ status: 'done' });
  });

  it('treats inaccessible or destroyed WebContents as unavailable', () => {
    expect(sendToWebContents(null, 'chunk', {})).toBe(false);
    expect(sendToWebContents({ isDestroyed: () => true }, 'chunk', {})).toBe(false);
    expect(sendToWebContents({
      isDestroyed: () => false,
      get mainFrame() { throw new Error('disposed'); },
    }, 'chunk', {})).toBe(false);
  });

  it('resumes delivery when the same WebContents gets a new live frame', () => {
    const dead = recipient(true);
    const live = recipient();
    expect(sendToWebContents(dead.wc, 'chunk', {})).toBe(false);
    dead.wc.mainFrame = live.frame;
    const payload = { text: 'resumed' };
    expect(sendToWebContents(dead.wc, 'chunk', payload)).toBe(true);
    expect(live.frame.send).toHaveBeenCalledWith('chunk', payload);
    expect(dead.errors).toEqual([]);
  });
});
