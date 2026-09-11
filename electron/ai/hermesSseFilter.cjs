/**
 * Line-buffered filter for Hermes tool-status SSE events.
 * Those events have `tool`/`toolCallId` but no OpenAI `choices`/`error`.
 */

function isHermesToolStatusData(data) {
  const trimmed = String(data || '').trim();
  if (!trimmed || trimmed === '[DONE]') return false;
  try {
    const obj = JSON.parse(trimmed);
    return Boolean(
      obj &&
        typeof obj === 'object' &&
        'tool' in obj &&
        !('choices' in obj) &&
        !('error' in obj),
    );
  } catch {
    return false;
  }
}

function keepSseLine(line) {
  if (!line.startsWith('data: ')) return true;
  return !isHermesToolStatusData(line.slice(6));
}

/**
 * @param {string} text
 * @param {string} [carry]
 * @returns {{ out: string, carry: string }}
 */
function filterHermesSseChunk(text, carry = '') {
  const combined = String(carry || '') + String(text || '');
  const lines = combined.split('\n');
  const nextCarry = lines.pop() ?? '';
  const kept = lines.filter(keepSseLine);
  return {
    out: kept.length > 0 ? `${kept.join('\n')}\n` : '',
    carry: nextCarry,
  };
}

function flushHermesSseCarry(carry) {
  if (!carry) return '';
  return keepSseLine(carry) ? carry : '';
}

module.exports = {
  isHermesToolStatusData,
  filterHermesSseChunk,
  flushHermesSseCarry,
};
