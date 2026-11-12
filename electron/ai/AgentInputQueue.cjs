const fs = require('fs');
const path = require('path');
const { createHash } = require('crypto');

/** Main-owned durable input ledger. Synchronous mutations are the topic's linearization point. */
class AgentInputQueue {
  constructor(directory = null) {
    this.directory = directory;
    this.topics = new Map();
  }
  file(topicId) {
    return this.directory && path.join(this.directory, createHash('sha256').update(topicId).digest('hex') + '.json');
  }
  rows(topicId) {
    if (!this.topics.has(topicId)) {
      let rows = [];
      const file = this.file(topicId);
      if (file && fs.existsSync(file)) {
        try {
          const data = JSON.parse(fs.readFileSync(file, 'utf8'));
          if (data.topicId !== topicId || !Array.isArray(data.rows)) throw new Error('invalid');
          rows = data.rows;
        } catch {
          // Corrupted or mismatched file — delete it so the topic starts clean
          // rather than silently failing on every subsequent restart.
          fs.rmSync(file, { force: true });
        }
      }
      this.topics.set(topicId, rows);
    }
    return this.topics.get(topicId);
  }
  commit(topicId, rows) {
    const file = this.file(topicId);
    if (file) {
      fs.mkdirSync(this.directory, { recursive: true });
      fs.writeFileSync(file + '.tmp', JSON.stringify({ topicId, rows }));
      fs.renameSync(file + '.tmp', file);
    }
    this.topics.set(topicId, rows);
  }
  enqueue(topicId, input) {
    const rows = this.rows(topicId);
    if (!input?.message || typeof input.message.id !== 'string' || !input.message.id ||
        typeof input.message.content !== 'string' || input.apiMessage?.role !== 'user' ||
        !(typeof input.apiMessage.content === 'string' || Array.isArray(input.apiMessage.content))) {
      throw new Error('补充消息格式无效');
    }
    if (rows.some((row) => row.message.id === input.message.id)) return;
    const message = {
      id: input.message.id, role: 'user', content: input.message.content,
      attachments: input.message.attachments, agentInputContent: input.apiMessage.content, timestamp: Date.now(),
    };
    this.commit(topicId, [...rows, { message, apiMessage: { role: 'user', content: input.apiMessage.content }, status: 'pending' }]);
  }
  pending(topicId) { return this.rows(topicId).filter((row) => row.status === 'pending'); }
  consume(topicId, requestId, metadata = {}) {
    const pending = this.pending(topicId);
    if (!pending.length) return [];
    const next = this.rows(topicId).map((row) => row.status === 'pending' ? { ...row, message: { ...row.message, ...metadata }, status: 'injected', requestId } : row);
    this.commit(topicId, next);
    const ids = new Set(pending.map((r) => r.message.id));
    return next.filter((r) => ids.has(r.message.id));
  }
  withdraw(topicId, id) {
    const rows = this.rows(topicId);
    const row = rows.find((r) => r.message.id === id && r.status === 'pending');
    if (!row) return null;
    this.commit(topicId, rows.filter((r) => r !== row));
    return row.message;
  }
  acknowledge(topicId, messageIds) {
    const ids = new Set(messageIds);
    const rows = this.rows(topicId);
    if (rows.some((r) => r.status === 'injected' && !r.saved && ids.has(r.message.id))) {
      this.commit(topicId, rows.map((r) => r.status === 'injected' && ids.has(r.message.id) ? { ...r, saved: true } : r));
    }
  }
  snapshot(topicId) {
    return this.rows(topicId).map(({ message, status, requestId, saved }) => ({ message, status, requestId, saved }));
  }
  clear(topicId) {
    const file = this.file(topicId);
    if (file) fs.rmSync(file, { force: true });
    this.topics.delete(topicId);
  }
}
module.exports = { AgentInputQueue };
