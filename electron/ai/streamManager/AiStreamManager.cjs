const { abortTool } = require('../../mcpRuntimeService.cjs');
const { pipeStreamLoop } = require('./pipeStreamLoop.cjs');

const GRACE_MS = 30_000;
const DEFAULT_IDLE_MS = 30 * 60 * 1000;
const APPROVAL_IDLE_MS = 2 * 60 * 60 * 1000;

class IdleTimeoutController {
  constructor(timeoutMs) {
    this.timeoutMs = timeoutMs;
    this.controller = new AbortController();
    this.timer = null;
    this.reset();
  }

  get signal() {
    return this.controller.signal;
  }

  reset(durationMs) {
    if (this.timer) clearTimeout(this.timer);
    const ms = durationMs ?? this.timeoutMs;
    this.timer = setTimeout(() => {
      if (!this.controller.signal.aborted) {
        this.controller.abort(new DOMException('Stream idle timeout exceeded', 'TimeoutError'));
      }
    }, ms);
  }

  cleanup() {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }
}

function withIdleTimeout(source, controller, timeoutMs) {
  const idle = new IdleTimeoutController(timeoutMs);
  const onIdleAbort = () => {
    if (!controller.signal.aborted) {
      controller.abort(new DOMException('Stream idle timeout exceeded', 'TimeoutError'));
    }
  };
  idle.signal.addEventListener('abort', onIdleAbort, { once: true });

  const cleanup = () => {
    idle.cleanup();
    idle.signal.removeEventListener('abort', onIdleAbort);
  };

  const reader = source.getReader();
  const stream = new ReadableStream({
    async pull(dest) {
      try {
        const { done, value } = await reader.read();
        if (done) {
          cleanup();
          dest.close();
          return;
        }
        idle.reset();
        dest.enqueue(value);
      } catch (err) {
        cleanup();
        dest.error(err);
      }
    },
    cancel(reason) {
      cleanup();
      return reader.cancel(reason);
    },
  });

  return { stream, idle };
}

/**
 * Simplified AiStreamManager — Cherry Studio pattern for DesktopFairy.
 */
class AiStreamManager {
  constructor() {
    /** @type {Map<string, object>} */
    this.activeStreams = new Map();
    /** @type {Map<string, Set<import('electron').WebContents>>} */
    this.pendingListeners = new Map();
  }

  _adoptPendingListeners(topicId, entry) {
    const pending = this.pendingListeners.get(topicId);
    if (!pending) return;
    for (const listener of pending) entry.listeners.add(listener);
    this.pendingListeners.delete(topicId);
  }

  /**
   * @param {object} input
   * @param {string} input.topicId
   * @param {() => Promise<ReadableStream>} input.createStream
   * @param {(chunk: object) => void} input.onChunk
   * @param {(result: object) => void} input.onDone
   * @param {(err: Error) => void} input.onError
   */
  startStream({
    topicId,
    requestId,
    createStream,
    onChunk,
    onDone,
    onError,
    idleTimeoutMs = DEFAULT_IDLE_MS,
    mcpCallIds = [],
  }) {
    const existing = this.activeStreams.get(topicId);
    if (existing?.status === 'streaming') {
      return { mode: 'blocked', requestId: existing.requestId };
    }

    const controller = new AbortController();
    const entry = {
      topicId,
      requestId,
      controller,
      status: 'streaming',
      buffer: [],
      legacyBuffer: [],
      listeners: new Set(),
      graceTimer: null,
      mcpCallIds: new Set(mcpCallIds),
      startedAt: Date.now(),
      idle: null,
    };
    this._adoptPendingListeners(topicId, entry);
    this.activeStreams.set(topicId, entry);

    void this._executeStream(entry, {
      createStream,
      onChunk,
      onDone,
      onError,
      idleTimeoutMs,
    });

    return { mode: 'started', requestId };
  }

  async _executeStream(entry, { createStream, onChunk, onDone, onError, idleTimeoutMs }) {
    const { topicId, requestId, controller } = entry;

    const broadcast = (channel, payload) => {
      for (const listener of entry.listeners) {
        try {
          if (!listener.isDestroyed()) listener.send(channel, payload);
        } catch {
          /* gone */
        }
      }
    };

    const safeOnChunk = (chunk) => {
      entry.buffer.push(chunk);
      if (entry.buffer.length > 10_000) entry.buffer.shift();
      onChunk?.(chunk);
      broadcast('ai:stream:chunk', { topicId, requestId, chunk });
    };

    try {
      const rawStream = await createStream();
      const { stream: idleStream, idle } = withIdleTimeout(rawStream, controller, idleTimeoutMs);
      entry.idle = idle;

      const { streamErrorText, threw } = await pipeStreamLoop(idleStream, controller.signal, {
        onChunk: safeOnChunk,
      });

      if (threw && threw.name !== 'AbortError') throw threw;
      if (streamErrorText) throw new Error(streamErrorText);

      entry.status = controller.signal.aborted ? 'aborted' : 'done';
      const donePayload = {
        topicId,
        requestId,
        status: entry.status === 'aborted' ? 'aborted' : 'success',
        isTopicDone: true,
      };
      onDone?.(donePayload);
      broadcast('ai:stream:done', donePayload);
    } catch (err) {
      entry.status = controller.signal.aborted ? 'aborted' : 'error';
      const errorPayload = {
        topicId,
        requestId,
        isTopicDone: true,
        message: String(err?.message || err),
        aborted: controller.signal.aborted,
      };
      onError?.(errorPayload);
      broadcast('ai:stream:error', errorPayload);
      if (!controller.signal.aborted) {
        broadcast('ai:stream:done', {
          topicId,
          requestId,
          status: 'error',
          isTopicDone: true,
        });
      }
    } finally {
      for (const callId of entry.mcpCallIds) abortTool(callId);
      this.scheduleGrace(topicId);
    }
  }

  scheduleGrace(topicId) {
    const entry = this.activeStreams.get(topicId);
    if (!entry) return;
    if (entry.graceTimer) clearTimeout(entry.graceTimer);
    entry.graceTimer = setTimeout(() => {
      this.activeStreams.delete(topicId);
    }, GRACE_MS);
  }

  attach(topicId, webContents) {
    const entry = this.activeStreams.get(topicId);
    if (!entry) {
      if (!this.pendingListeners.has(topicId)) {
        this.pendingListeners.set(topicId, new Set());
      }
      this.pendingListeners.get(topicId).add(webContents);
      return { attached: false, chunks: [], legacyEvents: [] };
    }

    entry.listeners.add(webContents);
    if (entry.graceTimer) {
      clearTimeout(entry.graceTimer);
      entry.graceTimer = null;
    }
    return {
      attached: true,
      chunks: [...entry.buffer],
      legacyEvents: [...entry.legacyBuffer],
      status: entry.status,
      requestId: entry.requestId,
    };
  }

  detach(topicId, webContents) {
    const entry = this.activeStreams.get(topicId);
    if (entry) {
      entry.listeners.delete(webContents);
      if (entry.listeners.size === 0) this.scheduleGrace(topicId);
      return;
    }

    const pending = this.pendingListeners.get(topicId);
    if (pending) pending.delete(webContents);
  }

  abort(topicId) {
    const entry = this.activeStreams.get(topicId);
    if (!entry) return false;
    entry.controller.abort();
    for (const callId of entry.mcpCallIds) abortTool(callId);
    return true;
  }

  registerMcpCall(topicId, callId) {
    const entry = this.activeStreams.get(topicId);
    if (entry && callId) entry.mcpCallIds.add(callId);
  }

  extendIdleForApproval(topicId, idle) {
    if (idle?.reset) idle.reset(APPROVAL_IDLE_MS);
  }

  isTopicStreaming(topicId) {
    return this.activeStreams.get(topicId)?.status === 'streaming';
  }
}

const manager = new AiStreamManager();

module.exports = {
  AiStreamManager,
  manager,
  withIdleTimeout,
  IdleTimeoutController,
  DEFAULT_IDLE_MS,
  APPROVAL_IDLE_MS,
};
