const { estimateTokens, textPrefix } = require('./contextTokens.cjs');

const segmenter = new Intl.Segmenter(undefined, { granularity: 'word' });

function findResultPassages(text, query, maxTokens) {
  const phrase = query.trim().toLowerCase().slice(0, 512);
  const terms = [...new Set(Array.from(segmenter.segment(phrase))
    .filter(({ segment, isWordLike }) => isWordLike && (segment.length > 1 || /[^\x00-\x7f]/.test(segment)))
    .map(({ segment }) => segment))].slice(0, 32);
  if (!phrase || maxTokens < 1) return [];

  const candidates = [];
  // Keep offsets in the original text and bound the size of individual passages,
  // including long lines from compact JSON and plain text endpoints.
  for (const paragraph of text.matchAll(/[^\n]+/g)) {
    const line = paragraph[0];
    for (let start = 0; start < line.length;) {
      const window = textPrefix(line.slice(start, start + 1200), 300);
      if (!window) break;
      const lower = window.toLowerCase();
      const matches = terms.filter((term) => lower.includes(term));
      const score = matches.length + (lower.includes(phrase) ? terms.length + 2 : 0);
      if (score) {
        const offset = paragraph.index + start;
        candidates.push({ offset, endOffset: offset + window.length, score });
      }
      // Overlap long lines so terms near a window boundary remain searchable.
      const advance = window.length > 240 && start + window.length < line.length
        ? window.length - 80 : window.length;
      start += advance;
      if (/[\uDC00-\uDFFF]/.test(line[start] || '')) start++;
    }
  }

  const passages = [];
  let remaining = maxTokens;
  for (const { offset, endOffset } of candidates.sort((a, b) => b.score - a.score || a.offset - b.offset)) {
    if (remaining < 24 || passages.length >= 5) break;
    if (passages.some((passage) => offset < passage.endOffset && endOffset > passage.offset)) continue;
    // Center small excerpts around a matching term.
    const window = text.slice(offset, endOffset);
    const lower = window.toLowerCase();
    const phraseOffset = lower.indexOf(phrase);
    const hits = terms.map((term) => lower.indexOf(term)).filter((index) => index >= 0);
    const matchOffset = phraseOffset >= 0 ? phraseOffset : Math.min(...hits);
    const excerptOffset = Math.max(offset, offset + matchOffset - Math.min(160, remaining));
    const safeOffset = /[\uDC00-\uDFFF]/.test(text[excerptOffset] || '') ? excerptOffset - 1 : excerptOffset;
    const content = textPrefix(text.slice(safeOffset, endOffset + 200), Math.min(450, remaining));
    passages.push({ offset: safeOffset, endOffset: safeOffset + content.length, content });
    remaining -= estimateTokens(content);
  }
  return passages.sort((a, b) => a.offset - b.offset);
}

module.exports = { findResultPassages };
