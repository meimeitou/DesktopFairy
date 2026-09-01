/**
 * Normalize AI SDK usage objects to legacy IPC shape.
 */
async function resolveStreamUsage(result) {
  if (!result) return null;
  try {
    const usage = await (result.totalUsage ?? result.usage);
    if (!usage || typeof usage !== 'object') return null;
    const promptTokens = Number(
      usage.promptTokens ?? usage.inputTokens ?? 0,
    );
    const completionTokens = Number(
      usage.completionTokens ?? usage.outputTokens ?? 0,
    );
    if (!promptTokens && !completionTokens) return null;
    return { promptTokens, completionTokens };
  } catch {
    return null;
  }
}

module.exports = { resolveStreamUsage };
