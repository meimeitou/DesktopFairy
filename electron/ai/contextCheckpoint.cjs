// Keep the accepted persisted shape aligned with src/shared/contextCheckpoint.ts.
function normalizeContextCheckpoint(value) {
  if (!value || value.version !== 1 || typeof value.id !== 'string' || !value.id ||
      typeof value.summary !== 'string' || !value.summary.trim() ||
      !['manual', 'auto', 'overflow'].includes(value.reason) ||
      !Array.isArray(value.messages) || !value.messages.length ||
      !value.messages.every((m) => m && ['user', 'assistant', 'tool'].includes(m.role) &&
        (typeof m.content === 'string' || Array.isArray(m.content))) ||
      ![value.createdAt, value.coveredMessageCount, value.retainedMessageCount, value.beforeTokens, value.afterTokens]
        .every((n) => Number.isFinite(n) && n >= 0)) return undefined;
  return value;
}
module.exports = { normalizeContextCheckpoint };
