const { findResultPassages } = require('./ai/resultSearch.cjs');
const { parse } = require('parse5');
const { textPrefix } = require('./ai/contextTokens.cjs');

const SKIP = new Set(['script', 'style', 'noscript', 'template', 'svg', 'nav', 'footer', 'header']);
const BLOCK = new Set(['p', 'div', 'section', 'article', 'main', 'li', 'tr', 'h1', 'h2', 'h3', 'h4', 'pre', 'br']);

function extractWebText(text, contentType = '') {
  if (!/html/i.test(contentType) && !/^\s*(?:<!doctype html|<html\b)/i.test(text)) return { title: '', content: text };
  const document = parse(text);
  let main, article, title = '';
  function find(node) {
    if (node.tagName === 'main' && !main) main = node;
    if (node.tagName === 'article' && !article) article = node;
    if (node.tagName === 'title') title = (node.childNodes || []).map(n => n.value || '').join('');
    for (const child of node.childNodes || []) find(child);
  }
  find(document);
  function visit(node) {
    if (SKIP.has(node.tagName)) return '';
    if (node.nodeName === '#text') return node.value;
    const children = (node.childNodes || []).map(visit).join('');
    return BLOCK.has(node.tagName) ? `\n${children}\n` : children;
  }
  return { title: title.trim(), content: visit(main || article || document).replace(/[\t \f]+/g, ' ').replace(/ *\n */g, '\n').replace(/\n{3,}/g, '\n\n').trim() };
}

/** Bound downloads before decoding/HTML parsing; never read an unlimited body. */
async function readWebResponse(response, maxBytes = 4 * 1024 * 1024) {
  const reader = response.body?.getReader();
  if (!reader) return '';
  const chunks = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) throw new Error(`网页响应超过 ${maxBytes} bytes，请使用支持分页的抓取工具。`);
      chunks.push(value);
    }
  } finally { await reader.cancel(); reader.releaseLock(); }
  return new TextDecoder().decode(Buffer.concat(chunks));
}

async function webResultPreview({ text, url, contentType = '', store, maxTokens = 2000, prompt = '' }) {
  const { title: pageTitle, content } = extractWebText(text, contentType);
  const title = textPrefix(pageTitle, 80) || url;
  const resultId = await store.put(content);
  const rawResultId = content === text ? resultId : await store.put(text);
  const passages = prompt ? findResultPassages(content, prompt, maxTokens) : [];
  if (passages.length) return { title, url, resultId, rawResultId,
    totalChars: content.length, passages, truncated: true };
  const preview = textPrefix(content, maxTokens);
  return { title, url, resultId, rawResultId, totalChars: content.length,
    ...(prompt ? { matchedPrompt: false } : {}), truncated: preview.length < content.length, nextOffset: preview.length < content.length ? preview.length : null, content: preview };
}

module.exports = { extractWebText, readWebResponse, webResultPreview };
