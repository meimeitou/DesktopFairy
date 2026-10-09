const fs = require('fs/promises');
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');

// ---------------------------------------------------------------------------
// Constants (pi read/grep/glob contract)
// ---------------------------------------------------------------------------
const MAX_LINE_LENGTH = 2000;      // read line truncation
const DEFAULT_READ_LIMIT = 300;    // read default page
const MAX_READ_LINES = 3000;       // read hard clamp
const MAX_READ_BYTES = 256 * 1024 * 1024; // in-memory guard only

const GREP_MAX_COLUMN = 512;
const GREP_CONTEXT_BEFORE = 1;
const GREP_CONTEXT_AFTER = 3;
const GREP_FILE_PAGE = 20;         // files per page
const GREP_PER_FILE_MULTI = 20;    // matches per file (multi-file scope)
const GREP_PER_FILE_SINGLE = 200;  // matches for single-file scope
const GREP_TOTAL_CAP = 2000;

const GLOB_TIMEOUT_MS = 5000;
const GREP_TIMEOUT_MS = 30000;
const GLOB_DEFAULT_LIMIT = 200;
const GLOB_MAX_LIMIT = 200;

// ---------------------------------------------------------------------------
// Path helpers
// ---------------------------------------------------------------------------

function expandPath(filePath) {
  const raw = String(filePath || '').trim();
  if (!raw) return '';
  if (raw.startsWith('~/')) return path.join(os.homedir(), raw.slice(2));
  if (raw === '~') return os.homedir();
  return raw;
}

function resolveAgentPath(filePath, baseDir) {
  const expanded = expandPath(filePath);
  const root = expandPath(baseDir || os.homedir());
  return path.isAbsolute(expanded) ? path.resolve(expanded) : path.resolve(root, expanded);
}
// ---------------------------------------------------------------------------

function parseLineRangeChunk(chunk) {
  // returns { start, end } inclusive 1-indexed, or throws
  const s = String(chunk || '').trim();
  let m;
  if ((m = s.match(/^(\d+)(?:\.\.|-|–)(\d+)$/))) {
    const start = Number(m[1]);
    const end = Number(m[2]);
    if (start === 0 || end === 0) {
      throw new Error(`Line selector 0 is invalid; lines are 1-indexed. Use :1.`);
    }
    if (end < start) {
      throw new Error(`Range end ${end} before start ${start} is invalid`);
    }
    return { start, end };
  }
  if ((m = s.match(/^(\d+)(?:\.\.|-|–)$/))) {
    const start = Number(m[1]);
    if (start === 0) {
      throw new Error(`Line selector 0 is invalid; lines are 1-indexed. Use :1.`);
    }
    return { start, end: Infinity }; // open-ended
  }
  if ((m = s.match(/^(\d+)\+(\d+)$/))) {
    const start = Number(m[1]);
    const count = Number(m[2]);
    if (start === 0) {
      throw new Error(`Line selector 0 is invalid; lines are 1-indexed. Use :1.`);
    }
    if (count < 1) {
      throw new Error(`+count must be >= 1`);
    }
    return { start, end: start + count - 1 };
  }
  if ((m = s.match(/^(\d+)$/))) {
    const start = Number(m[1]);
    if (start === 0) {
      throw new Error(`Line selector 0 is invalid; lines are 1-indexed. Use :1.`);
    }
    return { start, end: Infinity }; // open-ended from line N (pi :N)
  }
  return null; // not a line-range chunk
}

/**
 * Split `pathStr` into { filePath, ranges, raw }.
 * Recognizes trailing selectors: :raw, :N, :N-/ :N.., :A-B/:A..B, :A+C,
 * :R1,R2,..., and :range:raw / :raw:range.
 * Literal-path precedence: the whole string (with colon suffix) wins when it
 * exists as a file. Unrecognized trailing ':...' stays part of the path.
 */
async function splitPathAndSel(pathStr) {
  const raw = String(pathStr || '').trim();
  if (!raw) return { filePath: '', ranges: [], raw: '' };

  // literal-path precedence: full string exists as file
  const literal = expandPath(raw);
  try {
    const st = await fs.stat(literal);
    if (st.isFile()) return { filePath: literal, ranges: [], raw };
  } catch { /* not literal */ }

  // split into leading path and trailing selector segments after last '/'
  // selector segments: the text after the final ':' sequence at the end.
  const lastColon = raw.lastIndexOf(':');
  if (lastColon === -1) return { filePath: expandPath(raw), ranges: [], raw };
  if (lastColon === 0) return { filePath: expandPath(raw), ranges: [], raw };

  const before = raw.slice(0, lastColon);
  const after = raw.slice(lastColon + 1);

  // try to parse 'after' (and possibly another preceding ':raw') as selectors
  let ranges = [];
  let raw2 = false;
  const tryParse = (sel) => {
    const parts = sel.split(',').map((p) => p.trim()).filter(Boolean);
    if (parts.length === 0) return false;
    const parsed = [];
    for (const p of parts) {
      if (p === 'raw') { raw2 = true; continue; }
      const r = parseLineRangeChunk(p);
      if (!r) return false;
      parsed.push(r);
    }
    if (parsed.length === 0 && !raw2) return false;
    ranges = parsed;
    return true;
  };

  // combined form: 'range:raw' or 'raw:range' — two colon-separated chunks
  const beforeLastColon = before.lastIndexOf(':');
  if (beforeLastColon > 0) {
    const maybePath = before.slice(0, beforeLastColon);
    const mid = before.slice(beforeLastColon + 1);
    const combinedRanges = [];
    let combinedRaw = false;
    const tryCombined = (sel) => {
      const parts = sel.split(',').map((p) => p.trim()).filter(Boolean);
      if (parts.length === 0) return false;
      for (const p of parts) {
        if (p === 'raw') { combinedRaw = true; continue; }
        const r = parseLineRangeChunk(p);
        if (!r) return false;
        combinedRanges.push(r);
      }
      return true;
    };
    if (tryCombined(after) && tryCombined(mid)) {
      return {
        filePath: expandPath(maybePath),
        ranges: combinedRanges.length ? mergeRanges(combinedRanges) : [],
        isRaw: combinedRaw,
        raw,
      };
    }
  }

  if (tryParse(after)) {
    return { filePath: expandPath(before), ranges: mergeRanges(ranges), raw, isRaw: raw2 };
  }

  // unrecognized ':...' — fall through as part of the path (pi semantics)
  return { filePath: expandPath(raw), ranges: [], raw };
}

function mergeRanges(ranges) {
  const sorted = ranges
    .map((r) => ({ start: r.start, end: r.end }))
    .sort((a, b) => a.start - b.start);
  const merged = [];
  for (const r of sorted) {
    const last = merged[merged.length - 1];
    if (last && r.start <= last.end + 1) {
      if (r.end > last.end) last.end = r.end;
    } else {
      merged.push({ start: r.start, end: r.end });
    }
  }
  return merged;
}

// ---------------------------------------------------------------------------
// find-pattern parsing (pi path-utils parseFindPattern)
// ---------------------------------------------------------------------------

const GLOB_CHARS = /[*?[{]/;

/**
 * Split a find/grep path into { basePath, glob, hasGlob }:
 * - glob in the first segment => base '.' plus a recursive prefix unless present
 */
function parseFindPattern(entry) {
  const input = String(entry || '').trim();
  if (!input) return { basePath: '', glob: '', hasGlob: false };
  const normalized = input.replace(/\\/g, '/');
  const segments = normalized.split('/');
  const firstGlobIdx = segments.findIndex((s) => GLOB_CHARS.test(s));
  if (firstGlobIdx === -1) {
    return { basePath: input, glob: '', hasGlob: false };
  }
  if (firstGlobIdx === 0) {
    let glob = normalized;
    if (!glob.startsWith('**/')) glob = '**/' + glob;
    return { basePath: '.', glob, hasGlob: true };
  }
  const base = segments.slice(0, firstGlobIdx).join('/');
  const glob = segments.slice(firstGlobIdx).join('/');
  return { basePath: base, glob, hasGlob: true };
}

// ---------------------------------------------------------------------------
// Output formatting
// ---------------------------------------------------------------------------

function truncateLine(line, max) {
  if (line.length <= max) return line;
  return line.slice(0, max);
}

/**
 * Format hashline read output: `[relPath#TAG]` header + `LINE:TEXT` rows.
 * ranges: merged 1-indexed inclusive ranges actually shown (after context
 * expansion for bounded single-range non-raw reads).
 */
function formatHashlineRead(relPath, tag, lines, ranges, opts = {}) {
  const out = [];
  if (tag) out.push(`[${relPath}#${tag}]`);
  const shown = new Set();
  for (const r of ranges) {
    for (let i = r.start; i <= Math.min(r.end, lines.length); i++) shown.add(i);
  }
  const sortedNums = [...shown].sort((a, b) => a - b);
  for (const n of sortedNums) {
    const text = lines[n - 1] ?? '';
    const t = opts.isRaw
      ? text
      : text.length > MAX_LINE_LENGTH ? text.slice(0, MAX_LINE_LENGTH) : text;
    out.push(opts.isRaw ? t : `${n}:${t}`);
  }
  return out.join('\n');
}

/**
 * Format anchored grep output: per-file `[relPath#TAG]` header with
 * `*LINE:content` matches and ` LINE:content` context rows.
 * files: [{ relPath, tag, entries: [{ line, text, isMatch }] }]
 */
function formatAnchoredGrep(files, { truncated, nextPageSkip } = {}) {
  if (!files || files.length === 0) {
    return typeof nextPageSkip === 'number'
      ? `No more results (use skip=${nextPageSkip - 1 < 0 ? 0 : nextPageSkip - 1} to go back a page)`
      : 'No matches found';
  }
  const out = [];
  for (const f of files) {
    if (f.tag) out.push(`[${f.relPath}#${f.tag}]`);
    else out.push(f.relPath);
    for (const e of f.entries) {
      const lineText = e.text.length > GREP_MAX_COLUMN
        ? e.text.slice(0, GREP_MAX_COLUMN) + '…'
        : e.text;
      out.push(`${e.isMatch ? '*' : ' '}${e.line}:${lineText}`);
    }
  }
  if (typeof nextPageSkip === 'number') {
    out.push('');
    out.push(`Use skip=${nextPageSkip} for the next page`);
  }
  if (truncated) {
    out.push('');
    out.push('(Results truncated — narrow the pattern or path)');
  }
  return out.join('\n');
}

/**
 * Format grouped path tree (pi formatGroupedPaths):
 * - one '#' per nesting level; single-child chains fold: '# a/b/c/'
 * - files listed bare under the deepest owning header
 * - root-level matches listed without header; directories end with '/'
 */
function formatGroupedPaths(displayPaths) {
  if (!displayPaths || displayPaths.length === 0) return '';
  const roots = [];
  // Build a trie
  const trie = { children: new Map(), isFile: false };
  for (const p of displayPaths) {
    const parts = p.replace(/\\/g, '/').split('/').filter(Boolean);
    let node = trie;
    for (let i = 0; i < parts.length; i++) {
      const seg = parts[i];
      if (!node.children.has(seg)) {
        node.children.set(seg, { children: new Map(), isFile: false });
      }
      node = node.children.get(seg);
      if (i === parts.length - 1) node.isFile = true;
    }
  }

  const lines = [];

  const emitDir = (node, prefix, pathSoFar, isRoot) => {
    const children = [...node.children.entries()]
      .map(([name, child]) => ({ name, child }))
      .sort((a, b) => (a.child.isFile === b.child.isFile ? a.name.localeCompare(b.name) : a.child.isFile ? -1 : 1));
    for (const { name, child } of children) {
      if (child.isFile && child.children.size === 0) {
        lines.push(name);
      } else if (child.isFile && child.children.size > 0) {
        // path is both a file and has children (unlikely) — print as file
        lines.push(name);
      } else {
        // directory: fold single chains
        let chain = [name];
        let cur = child;
        while (cur.children.size === 1) {
          const [nextName, next] = [...cur.children.entries()][0];
          if (next.isFile && next.children.size === 0) break; // next is a file, stop folding
          chain.push(nextName);
          cur = next;
        }
        const level = isRoot ? '' : '# '.repeat(depthOf(pathSoFar) + 1).trim() + ' ';
        // '# ' repeated by nesting depth
        const depth = pathSoFar.length;
        lines.push(`${'#'.repeat(depth + 1)} ${chain.join('/')}/`);
        emitDir(cur, prefix, [...pathSoFar, ...chain], false);
      }
    }
  };

  const depthOf = (arr) => arr.length;

  emitDir(trie, '', [], true);
  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Binary file detection (unchanged)
// ---------------------------------------------------------------------------

async function isBinaryFile(filePath) {
  try {
    const buffer = Buffer.alloc(4096);
    const fd = await fs.open(filePath, 'r');
    const { bytesRead } = await fd.read(buffer, 0, buffer.length, 0);
    await fd.close();

    if (bytesRead === 0) return false;

    const view = buffer.subarray(0, bytesRead);

    let zeroBytes = 0;
    let evenZeros = 0;
    let oddZeros = 0;
    let nonPrintable = 0;

    for (let i = 0; i < view.length; i++) {
      const b = view[i];

      if (b === 0) {
        zeroBytes++;
        if (i % 2 === 0) evenZeros++;
        else oddZeros++;
        continue;
      }
      if (b === 9 || b === 10 || b === 13) continue;
      if (b >= 32 && b <= 126) continue;
      if (b >= 128) continue;
      nonPrintable++;
    }

    if (zeroBytes > 0) {
      const evenSlots = Math.ceil(view.length / 2);
      const oddSlots = Math.floor(view.length / 2);
      const evenZeroRatio = evenSlots > 0 ? evenZeros / evenSlots : 0;
      const oddZeroRatio = oddSlots > 0 ? oddZeros / oddSlots : 0;
      if (evenZeroRatio > 0.7 || oddZeroRatio > 0.7) return false;
      if (zeroBytes / view.length > 0.05) return true;
    }

    return nonPrintable / view.length > 0.3;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Ripgrep runner (with per-call timeout)
// ---------------------------------------------------------------------------

async function runRipgrep(args, { signal, timeoutMs } = {}) {
  const ripgrepBinaryPath = 'rg';
  const effectiveTimeout = Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : 60000;

  return new Promise((resolve) => {
    const child = spawn(ripgrepBinaryPath, args, {
      cwd: process.cwd(),
      env: { ...process.env },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';
    let settled = false;

    const finish = (result) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      signal?.removeEventListener('abort', onAbort);
      resolve(result);
    };

    const killChild = () => {
      try { child.kill('SIGKILL'); } catch { /* gone */ }
    };

    const onAbort = () => {
      killChild();
      finish({ ok: false, stdout: '', stderr: '', exitCode: null, aborted: true });
    };

    const timer = setTimeout(() => {
      killChild();
      finish({ ok: false, stdout: '', stderr: '', exitCode: null, timedOut: true });
    }, effectiveTimeout);

    if (signal) {
      if (signal.aborted) { onAbort(); return; }
      signal.addEventListener('abort', onAbort, { once: true });
    }

    child.stdout?.on('data', (chunk) => {
      stdout += chunk.toString('utf-8');
    });
    child.stderr?.on('data', (chunk) => {
      stderr += chunk.toString('utf-8');
    });

    child.on('error', () => {
      finish({ ok: false, stdout: '', stderr: '', exitCode: null });
    });

    child.on('close', (code) => {
      finish({ ok: true, stdout, stderr, exitCode: code });
    });
  });
}

// Directory exclusions kept: base is often homedir (non-repo), where
// .gitignore does not cover node_modules etc.
const RG_EXCLUDE_GLOBS = [
  '--glob', '!.git/**',
  '--glob', '!node_modules/**',
  '--glob', '!dist/**',
  '--glob', '!build/**',
  '--glob', '!__pycache__/**',
];

module.exports = {
  MAX_LINE_LENGTH,
  DEFAULT_READ_LIMIT,
  MAX_READ_LINES,
  MAX_READ_BYTES,
  GREP_MAX_COLUMN,
  GREP_CONTEXT_BEFORE,
  GREP_CONTEXT_AFTER,
  GREP_FILE_PAGE,
  GREP_PER_FILE_MULTI,
  GREP_PER_FILE_SINGLE,
  GREP_TOTAL_CAP,
  GLOB_TIMEOUT_MS,
  GREP_TIMEOUT_MS,
  GLOB_DEFAULT_LIMIT,
  GLOB_MAX_LIMIT,
  RG_EXCLUDE_GLOBS,
  expandPath,
  resolveAgentPath,
  splitPathAndSel,
  parseLineRangeChunk,
  mergeRanges,
  parseFindPattern,
  formatHashlineRead,
  formatAnchoredGrep,
  formatGroupedPaths,
  isBinaryFile,
  runRipgrep,
};
