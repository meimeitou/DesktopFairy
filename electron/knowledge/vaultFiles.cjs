'use strict';
const fs = require('fs');
const path = require('path');
const YAML = require('yaml');

function normalizeExcludes(values = []) {
  if (!Array.isArray(values)) throw new Error('排除目录必须是列表');
  return [...new Set(values.map((value) => {
    const dir = String(value).trim().replace(/\\/g, '/').replace(/\/$/, '');
    if (!dir || path.posix.isAbsolute(dir) || dir.split('/').some((p) => !p || p === '..' || p === '.')) {
      throw new Error('请使用相对目录，例如 日记/私人');
    }
    return dir;
  }))];
}

function allowedPath(relative, excludes = [], directory = false) {
  if (typeof relative !== 'string' || !relative || path.isAbsolute(relative) || relative.includes('\\')) return false;
  const parts = relative.split('/');
  if (parts.some((part) => !part || part.startsWith('.'))) return false;
  // macOS and Windows normally use case-insensitive filesystems. Compare
  // exclusions with those filesystem semantics so alternate casing cannot
  // bypass a privacy boundary. NFC also covers decomposed macOS filenames.
  const normalizeForFilesystem = (value) => {
    const normalized = value.normalize('NFC');
    return process.platform === 'darwin' || process.platform === 'win32'
      ? normalized.toLocaleLowerCase('en-US')
      : normalized;
  };
  const candidate = normalizeForFilesystem(relative);
  if (excludes.some((dir) => {
    const excluded = normalizeForFilesystem(dir);
    return candidate === excluded || candidate.startsWith(excluded + '/');
  })) return false;
  return directory || /\.(md|markdown)$/i.test(relative);
}

function assertRoot(vault) {
  const root = fs.realpathSync(vault.path);
  if (root !== vault.path || !fs.statSync(root).isDirectory()) throw new Error('目录不可用或位置已变化，请重新挂载');
  return root;
}

function resolveFile(vault, relative) {
  if (!allowedPath(relative, vault.excludes)) throw new Error('文件不在允许读取的 Markdown 范围内');
  const root = assertRoot(vault);
  let current = root;
  for (const part of relative.split('/')) {
    current = path.join(current, part);
    if (fs.lstatSync(current).isSymbolicLink()) throw new Error('不读取符号链接');
  }
  if (fs.realpathSync(current) !== current || !fs.statSync(current).isFile()) throw new Error('文件不可用');
  return current;
}

/** Directory names for the settings picker, including currently excluded directories. */
async function listDirectories(vault, { query = '', offset = 0, limit = 100 } = {}) {
  const root = assertRoot(vault);
  const needle = String(query).normalize('NFC').toLocaleLowerCase().trim();
  const skip = Math.max(0, Math.floor(Number(offset) || 0));
  const count = Math.max(1, Math.min(100, Math.floor(Number(limit) || 100)));
  const directories = [];
  let matched = 0;
  async function walk(directory, prefix = '') {
    const entries = await fs.promises.readdir(directory, { withFileTypes: true });
    entries.sort((a, b) => a.name.localeCompare(b.name));
    for (const entry of entries) {
      const relative = prefix + entry.name;
      if (!entry.isDirectory() || entry.isSymbolicLink() || !allowedPath(relative, [], true)) continue;
      const absolute = path.join(root, relative);
      try {
        if ((await fs.promises.lstat(absolute)).isSymbolicLink() || await fs.promises.realpath(absolute) !== absolute) continue;
      } catch { continue; }
      if (relative.normalize('NFC').toLocaleLowerCase().includes(needle)) {
        if (matched++ >= skip) directories.push(relative);
        if (directories.length > count) return true;
      }
      try { if (await walk(absolute, relative + '/')) return true; }
      catch (error) { if (!['ENOENT', 'EACCES', 'EPERM'].includes(error.code)) throw error; }
    }
    return false;
  }
  await walk(root);
  return { directories: directories.slice(0, count), hasMore: directories.length > count };
}

function readFile(vault, relative) {
  const file = resolveFile(vault, relative);
  const fd = fs.openSync(file, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW);
  try {
    const stat = fs.fstatSync(fd);
    // Bound pathological single files without restricting the total vault size.
    if (stat.size > 16 * 1024 * 1024) throw new Error('笔记超过 16 MB，请拆分后重试');
    return { text: fs.readFileSync(fd, 'utf8').replace(/\r\n?/g, '\n'), stat };
  } finally { fs.closeSync(fd); }
}

function textTokens(value) {
  return (String(value).normalize('NFKC').toLowerCase().replace(/([\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}])/gu, ' $1 ').match(/[\p{L}\p{N}_]+/gu) || []).join(' ');
}

function matchQuery(value) {
  // Treat user input as text, never as raw FTS operators. CJK characters form a phrase.
  const parts = String(value).normalize('NFKC').toLowerCase().replace(/([\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]+)/gu, ' $1 ').match(/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]+|[\p{L}\p{N}_]+/gu) || [];
  return parts.slice(0, 32).map((part) => '"' + textTokens(part) + '"').join(' AND ');
}

function parseNote(text, relative) {
  let data = {};
  let warning = '';
  const front = text.match(/^\uFEFF?---\n([\s\S]*?)\n(?:---|\.\.\.)\s*(?:\n|$)/);
  if (front) {
    try {
      data = YAML.parse(front[1], { maxAliasCount: 20 }) || {};
      if (typeof data !== 'object' || Array.isArray(data)) data = {};
    } catch { warning = 'frontmatter 解析失败，已按原文索引'; }
  }
  const strings = (value) => (Array.isArray(value) ? value : value == null ? [] : [value])
    .filter((v) => typeof v === 'string' || typeof v === 'number').map(String);
  const body = front ? text.slice(front[0].length) : text;
  const heading = body.match(/^#\s+(.+)$/m)?.[1]?.trim();
  return {
    title: typeof data.title === 'string' ? data.title : heading || path.posix.basename(relative).replace(/\.(md|markdown)$/i, ''),
    aliases: strings(data.aliases ?? data.alias),
    tags: [...new Set([...strings(data.tags).flatMap((s) => s.split(/[,\s]+/)),
      ...(body.match(/(?:^|\s)#[\p{L}\p{N}_/-]+/gu) || []).map((s) => s.trim().slice(1))])].filter(Boolean),
    warning,
  };
}

function lineChunks(text, maxLines = 80) {
  const lines = text.split('\n');
  const chunks = [];
  let start = 0;
  let bytes = 0;
  for (let i = 0; i < lines.length; i++) {
    bytes += Buffer.byteLength(lines[i], 'utf8');
    if (i - start + 1 >= maxLines || bytes >= 12000 || i === lines.length - 1) {
      chunks.push({ startLine: start + 1, endLine: i + 1, text: lines.slice(start, i + 1).join('\n') });
      start = i + 1; bytes = 0;
    }
  }
  return chunks;
}

function readLines(vault, args) {
  const { text } = readFile(vault, args.path);
  const lines = text.split('\n');
  const startLine = Math.max(1, Math.floor(Number(args.startLine) || 1));
  const requestedEnd = Math.floor(Number(args.endLine) || startLine + 199);
  if (startLine > lines.length || requestedEnd < startLine) throw new Error('行号超出文件范围');
  let endLine = Math.min(lines.length, requestedEnd, startLine + 499);
  // Find the last line that fits in 32 KB by accumulating byte sizes (O(n) one pass).
  let total = 0;
  let cutIdx = 0;
  for (let i = startLine - 1; i < endLine; i++) {
    const lineBytes = Buffer.byteLength(lines[i], 'utf8') + 1; // +1 for '\n'
    if (total + lineBytes > 32768) break;
    total += lineBytes; cutIdx = i - (startLine - 1) + 1;
  }
  // Always include at least one line; byteTruncated handles sub-line truncation below.
  if (cutIdx < endLine - (startLine - 1)) endLine = startLine - 1 + Math.max(1, cutIdx);
  let content = lines.slice(startLine - 1, endLine).join('\n');
  const buffer = Buffer.from(content);
  const byteTruncated = buffer.length > 32768;
  if (byteTruncated) content = buffer.subarray(0, 32768).toString('utf8').replace(/\uFFFD$/, '');
  return { baseId: vault.id, path: args.path, text: content, startLine, endLine, totalLines: lines.length,
    truncated: endLine < lines.length || byteTruncated, nextLine: endLine < lines.length ? endLine + 1 : null,
    ...(byteTruncated ? { warning: '单行超过 32 KB，返回内容已截断' } : {}) };
}

module.exports = { normalizeExcludes, allowedPath, assertRoot, resolveFile, readFile, textTokens, matchQuery, parseNote, lineChunks, readLines, listDirectories };
