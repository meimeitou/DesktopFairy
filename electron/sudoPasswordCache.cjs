// Ephemeral sudo credentials, scoped to the topic and the actual SSH endpoint.
const entries = new Map();
const TTL = 10 * 60 * 1000;
function key(topicId, hostId, params) {
  return JSON.stringify([topicId, hostId, params.host, params.port || 22, params.user, params.proxyJump || '']);
}
function get(topicId, hostId, params) {
  if (!topicId) return null;
  const id = key(topicId, hostId, params);
  const entry = entries.get(id);
  if (!entry) return null;
  if (Date.now() >= entry.expires) { clearTimeout(entry.timer); entries.delete(id); return null; }
  return entry.password;
}
function remove(topicId, hostId, params) {
  const id = key(topicId, hostId, params);
  const entry = entries.get(id);
  if (entry) clearTimeout(entry.timer);
  entries.delete(id);
}
function put(topicId, hostId, params, password) {
  if (!topicId) return;
  remove(topicId, hostId, params);
  const id = key(topicId, hostId, params);
  const entry = { password, expires: Date.now() + TTL, timer: null };
  entry.timer = setTimeout(() => { if (entries.get(id) === entry) entries.delete(id); }, TTL);
  entry.timer.unref?.();
  entries.set(id, entry);
}
function clearTopic(topicId) {
  for (const [id, entry] of entries) {
    if (JSON.parse(id)[0] === topicId) { clearTimeout(entry.timer); entries.delete(id); }
  }
}
module.exports = { get, put, remove, clearTopic };
