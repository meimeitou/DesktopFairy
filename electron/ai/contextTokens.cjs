/** Same approximation in renderer contextUsage.ts; not a provider tokenizer. */
function estimateTokens(text) {
  let tokens = 0, ascii = 0;
  for (const ch of String(text || '')) {
    if (/[\u3000-\u9fff\uf900-\ufaff\uac00-\ud7af]/.test(ch)) {
      tokens += Math.ceil(ascii / 4) + 1;
      ascii = 0;
    } else ascii++;
  }
  return tokens + Math.ceil(ascii / 4);
}

function textPrefix(text, budget) {
  let lo = 0, hi = Math.min(text.length, budget * 4);
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (estimateTokens(text.slice(0, mid)) <= budget) lo = mid;
    else hi = mid - 1;
  }
  // Never split a UTF-16 surrogate pair; offsets are JS string indices.
  if (lo && /[\uD800-\uDBFF]/.test(text[lo - 1])) lo--;
  return text.slice(0, lo);
}

module.exports = { estimateTokens, textPrefix };
