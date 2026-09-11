/**
 * Per-webContents cursor over the topic legacy event buffer.
 * Live delivery (listeners or fallback) advances the cursor so attach
 * replay does not re-apply chunks the window already consumed.
 */

const MAX_LEGACY_EVENTS = 10_000;

function ensureLegacyReplay(entry) {
  if (!entry.legacyBuffer) entry.legacyBuffer = [];
  if (entry.legacyBase == null) entry.legacyBase = 0;
  if (!entry.legacyCursors) entry.legacyCursors = new WeakMap();
}

function pushLegacyEvent(entry, event) {
  if (!entry) return;
  ensureLegacyReplay(entry);
  entry.legacyBuffer.push(event);
  if (entry.legacyBuffer.length > MAX_LEGACY_EVENTS) {
    entry.legacyBuffer.shift();
    entry.legacyBase += 1;
  }
}

function markLegacyCursor(entry, webContents) {
  if (!entry || !webContents) return;
  ensureLegacyReplay(entry);
  entry.legacyCursors.set(
    webContents,
    entry.legacyBase + entry.legacyBuffer.length,
  );
}

function unseenLegacyEvents(entry, webContents) {
  if (!entry) return [];
  ensureLegacyReplay(entry);
  const cursor = entry.legacyCursors.get(webContents);
  const fromAbs = cursor == null ? entry.legacyBase : cursor;
  const start = Math.max(0, fromAbs - entry.legacyBase);
  return entry.legacyBuffer.slice(start);
}

module.exports = {
  MAX_LEGACY_EVENTS,
  pushLegacyEvent,
  markLegacyCursor,
  unseenLegacyEvents,
};
