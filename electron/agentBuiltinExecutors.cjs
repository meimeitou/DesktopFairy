const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');
const { execFile } = require('child_process');
const { promisify } = require('util');
// electron + terminalAgentService are main-process-only; require lazily so
// node/vitest can load this module for FS tool tests.
let _app = null;
function getApp() {
  if (_app === null) _app = require('electron').app;
  return _app;
}
let _runCommandInRenderer = null;
function getRunCommandInRenderer() {
  if (_runCommandInRenderer === null) {
    _runCommandInRenderer = require('./terminalAgentService.cjs').runCommandInRenderer;
  }
  return _runCommandInRenderer;
}
const {
  resolveBashTimeoutSec,
  formatTimeoutLabel,
} = require('./bashTimeout.cjs');
const {
  DEFAULT_READ_LIMIT,
  MAX_READ_LINES,
  MAX_READ_BYTES,
  MAX_LINE_LENGTH,
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
  mergeRanges,
  parseFindPattern,
  formatHashlineRead,
  formatAnchoredGrep,
  formatGroupedPaths,
  isBinaryFile,
  runRipgrep,
} = require('./agentBuiltinFsUtils.cjs');
const snapshots = require('./agentSnapshotStore.cjs');
const { applyHashlinePatch } = require('./hashlinePatch.cjs');

const execFileAsync = promisify(execFile);
const MAX_FETCH_BYTES = 512 * 1024;
const todosByRequest = new Map();

function broadcastSettingsUpdated(settings, getWindows) {
  let revision;
  try {
    const { setSnapshot } = require('./settingsSnapshot.cjs');
    revision = setSnapshot(settings);
  } catch {
    /* optional */
  }
  const payload =
    typeof revision === 'number' ? { settings, revision } : settings;
  for (const win of getWindows?.() || []) {
    try {
      if (win && !win.isDestroyed()) {
        win.webContents.send('settings:updated', payload);
      }
    } catch {
      /* window gone */
    }
  }
}
const AGENT_FS_BASE = () => process.env.DF_AGENT_FS_BASE || os.homedir();

function ok(data) {
  return JSON.stringify({ ok: true, ...data });
}

function fail(message) {
  return JSON.stringify({ ok: false, error: message });
}

// ---------------------------------------------------------------------------
// FS six-pack (pi contract): read / write / edit / bash / glob / grep
// ---------------------------------------------------------------------------

const READ_DIR_DEPTH = 2;
const READ_DIR_PER_DIR = 12;

function formatRelativeTime(mtimeMs) {
  const diff = Date.now() - mtimeMs;
  if (diff < 60_000) return 'just now';
  if (diff < 3_600_000) return `${Math.round(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.round(diff / 3_600_000)}h ago`;
  if (diff < 30 * 86_400_000) return `${Math.round(diff / 86_400_000)}d ago`;
  return `${Math.round(diff / (30 * 86_400_000))}mo ago`;
}

function formatBytes(n) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

async function readDirectoryTree(dirPath, relPath, depth) {
  const out = [];
  let entries;
  try {
    entries = await fs.promises.readdir(dirPath, { withFileTypes: true });
  } catch {
    return out;
  }
  const decorated = [];
  for (const e of entries) {
    let mtime = 0;
    let size = 0;
    try {
      const st = await fs.promises.stat(path.join(dirPath, e.name));
      mtime = st.mtimeMs;
      size = st.size;
    } catch { /* vanished */ }
    decorated.push({ name: e.name, isDir: e.isDirectory(), mtime, size });
  }
  decorated.sort((a, b) => (a.isDir === b.isDir ? b.mtime - a.mtime : a.isDir ? 1 : -1));
  const shown = decorated.slice(0, READ_DIR_PER_DIR);
  const label = relPath === '' ? '.' : relPath;
  if (depth === 0) {
    out.push(`${label}/ (${entries.length} entries)`);
  } else {
    out.push(label.endsWith('/') ? label : label + '/');
  }
  for (const e of shown) {
    if (e.isDir) {
      if (depth + 1 < READ_DIR_DEPTH) {
        out.push('');
        out.push(...(await readDirectoryTree(path.join(dirPath, e.name), path.join(relPath, e.name) + '/', depth + 1)));
      } else {
        out.push(`${e.name}/`);
      }
    } else {
      const size = e.size > 0 ? ` (${formatBytes(e.size)}, ${formatRelativeTime(e.mtime)})` : '';
      out.push(`${e.name}${size}`);
    }
  }
  if (decorated.length > shown.length) {
    out.push(`… ${decorated.length - shown.length} more entries not shown`);
  }
  return out;
}


async function toolRead(args) {
  const rawPath = String(args?.path ?? '').trim();
  if (!rawPath) return fail('path required');

  let split;
  try {
    split = await splitPathAndSel(rawPath);
  } catch (e) {
    return fail(String(e?.message || e));
  }
  const filePath = resolveAgentPath(split.filePath, AGENT_FS_BASE());
  if (!filePath || split.filePath === '') return fail('path required');

  const relPath = (() => {
    const rel = path.relative(AGENT_FS_BASE(), filePath);
    return rel.startsWith('..') ? filePath : rel;
  })();

  try {
    const stat = await fs.promises.stat(filePath);

    if (stat.isDirectory()) {
      if (split.ranges.length > 0) {
        return fail('Line selectors are not supported for directory reads');
      }
      const tree = await readDirectoryTree(filePath, relPath, 0);
      return ok({ file_path: filePath, content: tree.join('\n'), isDirectory: true });
    }

    if (!stat.isFile()) return fail(`Path is not a file: ${rawPath}`);
    if (stat.size > MAX_READ_BYTES) {
      return fail(`File too large (max ${MAX_READ_BYTES} bytes)`);
    }

    const isRaw = split.isRaw === true;
    if (!isRaw && (await isBinaryFile(filePath))) {
      return ok({
        file_path: filePath,
        content: `[Cannot read binary file: ${rawPath}]`,
      });
    }

    const content = await fs.promises.readFile(filePath, 'utf8');
    const normalized = content.replace(/\r\n/g, '\n');
    let lines;
    let trailingNewline = false;
    if (normalized === '') {
      lines = [];
    } else if (normalized.endsWith('\n')) {
      lines = normalized.slice(0, -1).split('\n');
      trailingNewline = true;
    } else {
      lines = normalized.split('\n');
    }

    const total = lines.length;

    // Determine the displayed ranges
    let ranges;
    if (split.ranges.length === 0) {
      // default first page
      if (total === 0) {
        return ok({ file_path: filePath, content: '(empty file)' });
      }
      const limit = Math.min(DEFAULT_READ_LIMIT, MAX_READ_LINES);
      if (1 > total) {
        return ok({ file_path: filePath, content: `Use :1 ... to read lines; file has ${total} lines` });
      }
      ranges = [{ start: 1, end: Math.min(limit, total) }];
    } else {
      const resolved = [];
      let openEnded = false;
      for (const r of split.ranges) {
        if (r.end === Infinity) { openEnded = true; }
        const end = r.end === Infinity ? Math.min(r.start + DEFAULT_READ_LIMIT - 1, Math.max(total, r.start)) : r.end;
        resolved.push({ start: r.start, end });
      }
      ranges = mergeRanges(resolved);
      if (ranges.length === 0) {
        return ok({ file_path: filePath, content: `Use :1 ... to read lines; file has ${total} lines` });
      }
      // out-of-range entirely: hint, not error
      if (ranges[0].start > total) {
        return ok({
          file_path: filePath,
          content: `Line ${ranges[0].start} is past the end of the file (${total} lines). Use :1-${total} ... or :${Math.max(1, total)} ...`,
        });
      }
      if (openEnded) {
        // clamp open-ended range to DEFAULT_READ_LIMIT lines from its start
        const first = ranges[0];
        const limit = Math.min(first.start + DEFAULT_READ_LIMIT - 1, Math.max(first.end, total));
        ranges = [{ start: first.start, end: Math.max(first.start, Math.min(limit, Math.max(first.end, total))) }];
        if (ranges[0].start > total) {
          return ok({
            file_path: filePath,
            content: `Line ${ranges[0].start} is past the end of the file (${total} lines). Use :${Math.max(1, total)} ...`,
          });
        }
      }
      // context expansion for bounded single range
      if (ranges.length === 1 && ranges[0].end !== Infinity && !isRaw) {
        const r = ranges[0];
        const start = Math.max(1, r.start - 1);
        const end = Math.min(total, r.end + 3);
        ranges = [{ start, end: Math.max(start, end) }];
      }
    }

    // truncate displayed line count
    let displayRanges = ranges
      .map((r) => ({ start: Math.max(1, r.start), end: Math.min(r.end, total) }))
      .filter((r) => r.start <= r.end);
    if (displayRanges.length === 0) {
      return ok({ file_path: filePath, content: `Use :1 ... to read lines; file has ${total} lines` });
    }

    // record snapshot for non-raw reads
    let tag = null;
    if (!isRaw) {
      const seenRanges = displayRanges.map((r) => [r.start, Math.min(r.end, total)]);
      tag = snapshots.recordSnapshot(filePath, trailingNewline ? lines.join('\n') + '\n' : lines.join('\n'), seenRanges);
    }

    const text = formatHashlineRead(relPath, tag, lines, displayRanges, { isRaw });
    return ok({ file_path: filePath, content: text });
  } catch (e) {
    if (e?.code === 'ENOENT') return fail(`Path not found: ${rawPath}`);
    return fail(String(e?.message || e));
  }
}

function stripWriteContent(content) {
  let text = String(content ?? '');
  // strip pasted [path#TAG] header lines
  text = text
    .split('\n')
    .filter((l) => !/^\[[^\[\]\n]*#[0-9A-Fa-f]{4}\]\s*$/.test(l.trim()))
    .join('\n');
  // strip pasted LINE: prefixes (1-6 digit line numbers)
  text = text
    .split('\n')
    .map((l) => l.replace(/^\d{1,6}:/, ''))
    .join('\n');
  return text;
}

async function toolWrite(args) {
  const rawPath = String(args?.path ?? '').trim();
  if (!rawPath) return fail('path required');
  if (args?.content === undefined || args?.content === null) {
    return fail('content required');
  }
  const filePath = resolveAgentPath(rawPath, AGENT_FS_BASE());
  const content = stripWriteContent(args.content);
  try {
    await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
    let isOverwrite = false;
    try {
      await fs.promises.stat(filePath);
      isOverwrite = true;
    } catch {
      /* new file */
    }
    await fs.promises.writeFile(filePath, content, 'utf8');
    const relPath = (() => {
      const rel = path.relative(AGENT_FS_BASE(), filePath);
      return rel.startsWith('..') ? filePath : rel;
    })();
    const action = isOverwrite ? 'Updated' : 'Created';
    const normalized = content.replace(/\r\n/g, '\n');
    const lines = normalized === '' ? [] : normalized.replace(/\n$/, '').split('\n');
    const total = lines.length;
    const tag = snapshots.recordSnapshot(
      filePath,
      content,
      total > 0 ? [[1, total]] : []
    );
    const header = tag ? `[${relPath}#${tag}]\n` : '';
    return ok({
      file_path: filePath,
      message: `${action} file.\n\n${header}Successfully wrote ${content.length} bytes to ${relPath}`,
    });
  } catch (e) {
    return fail(String(e?.message || e));
  }
}

async function toolEdit(args) {
  const input = String(args?.input ?? '');
  if (!input.trim()) return fail('input required');
  try {
    const reports = applyHashlinePatch(input, {
      resolvePath: (p) => resolveAgentPath(p, AGENT_FS_BASE()),
    });
    const parts = [];
    for (const r of reports) {
      const relPath = (() => {
        const rel = path.relative(AGENT_FS_BASE(), r.finalPath);
        return rel.startsWith('..') ? r.finalPath : rel;
      })();
      if (r.rem) {
        parts.push(`Removed ${relPath}`);
        continue;
      }
      const header = r.tag ? `[${relPath}#${r.tag}]` : `[${relPath}]`;
      const lines = [header, `Applied ${r.opCount} op(s): ${(r.opSummary || []).join(', ')}`];
      if (r.mv) lines.push(`Moved to ${relPath}`);
      if (r.warnings && r.warnings.length > 0) {
        lines.push('Warnings:');
        for (const w of r.warnings) lines.push(`- ${w}`);
      }
      parts.push(lines.join('\n'));
    }
    return ok({ message: parts.join('\n\n'), results: reports });
  } catch (e) {
    return fail(String(e?.message || e));
  }
}

const CD_PREFIX_RE = /^cd\s+(?:"([^"]+)"|'([^']+)'|(\S+))\s*&&\s*([\s\S]+)$/;
const ENV_NAME_RE = /^[A-Za-z_][A-Za-z0-9_]*$/;

async function toolBash(args, envVars = {}, deps = {}) {
  let command = String(args?.command || '').trim();
  if (!command) return fail('Empty command');
  const signal = deps?.signal;

  // env validation + merge
  const extraEnv = {};
  if (args?.env != null && typeof args.env === 'object' && !Array.isArray(args.env)) {
    for (const [k, v] of Object.entries(args.env)) {
      if (!ENV_NAME_RE.test(k)) return fail(`Invalid bash env name: ${k}`);
      extraEnv[k] = String(v);
    }
  }
  const mergedEnv = { ...process.env, ...envVars, ...extraEnv };

  // cwd: explicit arg wins; otherwise rewrite leading 'cd X &&'
  let cwd;
  if (args?.cwd != null && String(args.cwd).trim() !== '') {
    cwd = resolveAgentPath(String(args.cwd), AGENT_FS_BASE());
  } else {
    const m = command.match(CD_PREFIX_RE);
    if (m) {
      cwd = resolveAgentPath(m[1] || m[2] || m[3], AGENT_FS_BASE());
      command = m[4];
    }
  }
  if (cwd) {
    try {
      const st = await fs.promises.stat(cwd);
      if (!st.isDirectory()) {
        return fail(`Working directory is not a directory: ${cwd}`);
      }
    } catch (e) {
      return fail(`Working directory does not exist: ${cwd}`);
    }
  } else {
    cwd = os.homedir();
  }

  const timeoutSec = resolveBashTimeoutSec(args?.timeout);
  const shell = process.env.SHELL || '/bin/zsh';
  const outputCap = 50 * 1024;

  return new Promise((resolve) => {
    let settled = false;
    let killTimer = null;
    let buffer = '';
    let truncated = false;

    const finish = (payload) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (killTimer) clearTimeout(killTimer);
      if (signal && onAbort) signal.removeEventListener('abort', onAbort);
      resolve(payload);
    };

    const child = spawn(shell, ['-lc', command], {
      env: mergedEnv,
      cwd,
      detached: process.platform !== 'win32',
    });

    const killProcessTree = (sig) => {
      try {
        if (process.platform !== 'win32' && child.pid) {
          process.kill(-child.pid, sig);
        } else {
          child.kill(sig);
        }
      } catch {
        try { child.kill(sig); } catch { /* ignore */ }
      }
    };

    const appendOutput = (chunk) => {
      const text = String(chunk);
      buffer += text;
      if (buffer.length > outputCap) {
        buffer = buffer.slice(buffer.length - outputCap);
        truncated = true;
      }
    };

    const timer = timeoutSec > 0
      ? setTimeout(() => {
          killProcessTree('SIGTERM');
          killTimer = setTimeout(() => killProcessTree('SIGKILL'), 5000);
          const label = formatTimeoutLabel(timeoutSec);
          const output = (truncated ? '[...output truncated...]\n' : '') + (buffer || '');
          finish(JSON.stringify({
            ok: false,
            output,
            exitCode: 124,
            timedOut: true,
            truncated,
            error: `Command timed out after ${label}`,
          }));
        }, timeoutSec * 1000)
      : null;

    const onAbort = () => {
      killProcessTree('SIGTERM');
      killTimer = setTimeout(() => killProcessTree('SIGKILL'), 2000);
      finish(ok({
        output: (truncated ? '[...output truncated...]\n' : '') + (buffer || ''),
        exitCode: 130,
        aborted: true,
      }));
    };

    if (signal) {
      if (signal.aborted) onAbort();
      else signal.addEventListener('abort', onAbort, { once: true });
    }

    child.stdout?.on('data', appendOutput);
    child.stderr?.on('data', appendOutput);
    child.on('error', (e) => {
      finish(fail(String(e?.message || e)));
    });
    child.on('close', (code) => {
      const exitCode = code ?? 0;
      const output = (truncated ? '[...output truncated...]\n' : '') + (buffer || '');
      if (exitCode !== 0) {
        finish(JSON.stringify({
          ok: false,
          error: `Command exited with code ${exitCode}`,
          output,
          exitCode,
          truncated,
        }));
        return;
      }
      finish(ok({
        output: output || '(no output)',
        exitCode,
        truncated,
      }));
    });
  });
}

function splitMultiPath(pathStr) {
  return String(pathStr || '')
    .split(';')
    .map((p) => p.trim())
    .filter(Boolean);
}

async function toolGlob(args, signal) {
  const rawPath = String(args?.path ?? '').trim() || '.';
  const hidden = args?.hidden !== false;
  const useGitignore = args?.gitignore !== false;

  let limit = GLOB_DEFAULT_LIMIT;
  if (args?.limit != null) {
    const n = Number(args.limit);
    if (Number.isFinite(n) && n > 0) {
      limit = Math.min(Math.max(Math.floor(n), 1), GLOB_MAX_LIMIT);
    }
  }

  const entries = splitMultiPath(rawPath);
  if (entries.length === 0) return fail('`path` must contain non-empty globs or paths');

  const missing = [];
  const targets = [];
  for (const entry of entries) {
    const { basePath, glob, hasGlob } = parseFindPattern(entry);
    const absBase = resolveAgentPath(basePath, AGENT_FS_BASE());
    if (!hasGlob) {
      try {
        const st = await fs.promises.stat(absBase);
        if (st.isFile()) {
          targets.push({ searchPath: absBase, glob: null, exact: true });
          continue;
        }
        if (!st.isDirectory()) {
          missing.push(entry);
          continue;
        }
        targets.push({ searchPath: absBase, glob: '**/*', exact: false });
        continue;
      } catch {
        if (entries.length === 1) return fail(`Path not found: ${entry}`);
        missing.push(entry);
        continue;
      }
    }
    targets.push({ searchPath: absBase, glob, exact: false });
  }

  if (targets.length === 0) {
    return fail(`Path not found: ${entries.join(', ')}`);
  }

  const files = [];
  let timedOut = false;
  for (const t of targets) {
    if (t.exact) {
      files.push({ path: t.searchPath, mtime: (await statMtime(t.searchPath)) });
      continue;
    }
    const rgArgs = [
      '--files',
      '--follow',
      `--glob=${t.glob}`,
      ...RG_EXCLUDE_GLOBS,
    ];
    // In ripgrep, an explicit --glob overrides the hidden-file filter, so
    // hidden:false must ALSO exclude dotfiles via globs.
    if (hidden) {
      rgArgs.push('--hidden');
    } else {
      rgArgs.push('--no-hidden');
      rgArgs.push('--glob=!.*', '--glob=!**/.*', '--glob=!**/.*/**');
    }
    if (!useGitignore) rgArgs.push('--no-ignore');
    rgArgs.push(t.searchPath);

    const rgResult = await runRipgrep(rgArgs, { signal, timeoutMs: GLOB_TIMEOUT_MS });
    if (rgResult.aborted) return fail('Glob cancelled');
    if (rgResult.timedOut) {
      timedOut = true;
      continue;
    }
    if (rgResult.ok && rgResult.exitCode !== null && rgResult.exitCode !== 2) {
      for (const line of rgResult.stdout.split('\n').filter(Boolean)) {
        const p = line.trim();
        if (!p) continue;
        const abs = path.isAbsolute(p) ? p : path.resolve(t.searchPath, p);
        const mtime = await statMtime(abs);
        if (mtime === null) continue;
        files.push({ path: abs, mtime });
        if (files.length >= limit) break;
      }
    }
    if (files.length >= limit) break;
  }

  // dedupe by path, mtime desc
  const seen = new Set();
  const unique = [];
  for (const f of files) {
    if (seen.has(f.path)) continue;
    seen.add(f.path);
    unique.push(f);
  }
  unique.sort((a, b) => b.mtime - a.mtime);
  const limited = unique.slice(0, limit);

  const base = AGENT_FS_BASE();
  const displayPaths = limited.map((f) => {
    const rel = path.relative(base, f.path);
    return rel.startsWith('..') ? f.path : rel;
  });

  const out = [];
  if (limited.length === 0) {
    out.push('No files found matching pattern');
  } else {
    out.push(formatGroupedPaths(displayPaths));
  }
  if (timedOut) {
    out.push('');
    out.push(`glob timed out after 5s; returning ${limited.length} partial matches — narrow the pattern`);
  }
  if (missing.length > 0) {
    out.push('');
    out.push(`Skipped missing paths: ${missing.join(', ')}`);
  }

  return ok({
    output: out.join('\n'),
    matches: displayPaths,
    fileCount: limited.length,
    truncated: timedOut,
    missingPaths: missing,
  });
}

async function statMtime(absPath) {
  try {
    const st = await fs.promises.stat(absPath);
    return st.mtimeMs;
  } catch {
    return null;
  }
}

function parseRipgrepContentLine(line) {
  // 'path:line:content' match or 'path-line-content' context
  const isContext = /^(\S+)-(\d+)-(.*)$/.test(line);
  const sep = isContext ? '-' : ':';
  const firstSep = line.indexOf(sep);
  if (firstSep === -1) return null;
  const filePart = line.slice(0, firstSep);
  const rest = line.slice(firstSep + 1);
  const secondSep = rest.indexOf(sep);
  if (secondSep === -1) return null;
  const linePart = rest.slice(0, secondSep);
  const contentPart = rest.slice(secondSep + 1);
  const lineNum = Number.parseInt(linePart, 10);
  if (!Number.isFinite(lineNum) || lineNum <= 0) return null;
  return { file: filePart, line: lineNum, text: contentPart, isMatch: !isContext };
}

async function toolGrep(args, signal) {
  const pattern = String(args?.pattern ?? '');
  if (!pattern.trim()) return fail('Pattern must not be empty');
  if (String(args?.skip ?? 0) !== '' && args?.skip != null) {
    const skipNum = Number(args.skip);
    if (!Number.isFinite(skipNum) || skipNum < 0) {
      return fail('Skip must be a non-negative number');
    }
  }
  const skip = Math.max(0, Math.floor(Number(args?.skip ?? 0) || 0));
  const caseSensitive = args?.case !== false;
  const useGitignore = args?.gitignore !== false;

  const rawPath = String(args?.path ?? '').trim() || '.';
  const entries = splitMultiPath(rawPath);
  if (entries.length === 0) return fail('Search scope entries must be non-empty paths or globs');

  // resolve entries
  const scopes = [];
  const missing = [];
  for (const entry of entries) {
    const { basePath, glob, hasGlob } = parseFindPattern(entry);
    const absBase = resolveAgentPath(basePath, AGENT_FS_BASE());
    let isFile = false;
    let isDir = false;
    try {
      const st = await fs.promises.stat(absBase);
      isFile = st.isFile();
      isDir = st.isDirectory();
    } catch {
      if (entries.length === 1) return fail(`Path not found: ${entry}`);
      missing.push(entry);
      continue;
    }
    if (!isFile && !isDir) {
      if (entries.length === 1) return fail(`Path not found: ${entry}`);
      missing.push(entry);
      continue;
    }
    scopes.push({ absBase, glob: hasGlob ? glob : null, isFile, isDir });
  }
  if (scopes.length === 0) return fail(`Path not found: ${entries.join(', ')}`);

  // single scope = single-file semantics; multiple scopes = multi-file
  const singleFile = scopes.length === 1 && scopes[0].isFile && !scopes[0].glob;

  const rgArgs = [
    '--no-heading',
    '--line-number',
    '--color', 'never',
    `-B${GREP_CONTEXT_BEFORE}`,
    `-A${GREP_CONTEXT_AFTER}`,
    `--max-columns=${GREP_MAX_COLUMN}`,
    '--max-filesize', '4M',
    `--max-count=${singleFile ? GREP_PER_FILE_SINGLE + 1 : GREP_PER_FILE_MULTI + 1}`,
    ...RG_EXCLUDE_GLOBS,
  ];
  if (singleFile) rgArgs.push('--with-filename');
  if (!caseSensitive) rgArgs.push('-i');
  for (const s of scopes) {
    if (s.glob) rgArgs.push(`--glob=${s.glob}`);
  }
  rgArgs.push(pattern);
  for (const s of scopes) rgArgs.push(s.absBase);

  const rgResult = await runRipgrep(rgArgs, { signal, timeoutMs: GREP_TIMEOUT_MS });
  if (rgResult.aborted) return fail('Grep cancelled');
  if (rgResult.timedOut) {
    return fail('Grep timed out after 30s; narrow paths or pattern, or scope with `glob` first');
  }
  if (rgResult.exitCode === 2) {
    return fail(`Invalid regex: ${pattern}`);
  }

  // parse rg output into per-file entries
  const perFile = new Map(); // absPath -> [{line, text, isMatch}]
  const fileOrder = [];
  const separator = rgResult.ok ? rgResult.stdout.split('\n') : [];
  for (const line of separator) {
    if (!line.trim()) continue;
    if (line.trim() === '--') continue;
    const parsed = parseRipgrepContentLine(line);
    if (!parsed) continue;
    const abs = path.isAbsolute(parsed.file) ? parsed.file : path.resolve(AGENT_FS_BASE(), parsed.file);
    if (!perFile.has(abs)) {
      perFile.set(abs, []);
      fileOrder.push(abs);
    }
    perFile.get(abs).push({ line: parsed.line, text: parsed.text, isMatch: parsed.isMatch });
  }

  // JS caps
  const perFileCap = singleFile ? GREP_PER_FILE_SINGLE : GREP_PER_FILE_MULTI;
  const filePageStart = singleFile ? 0 : skip * GREP_FILE_PAGE;
  const pageFiles = singleFile ? fileOrder : fileOrder.slice(filePageStart, filePageStart + GREP_FILE_PAGE);
  let totalMatchCount = 0;

  const base = AGENT_FS_BASE();
  const rendered = [];
  for (const abs of pageFiles) {
    let entries2 = perFile.get(abs);
    // per-file match cap: count matches; trim context lines beyond cap
    const matches = entries2.filter((e) => e.isMatch);
    if (matches.length > perFileCap) {
      // keep first perFileCap matches plus all context lines
      const kept = [];
      let seen = 0;
      for (const e of entries2) {
        if (e.isMatch) {
          seen++;
          if (seen <= perFileCap) kept.push(e);
        } else {
          kept.push(e);
        }
      }
      entries2 = kept;
      totalMatchCount += perFileCap;
    } else {
      totalMatchCount += matches.length;
    }

    const rel = path.relative(base, abs);
    const relPath = rel.startsWith('..') ? abs : rel;

    let tag = null;
    try {
      const content = await fs.promises.readFile(abs, 'utf8');
      const normalized = content.replace(/\r\n/g, '\n');
      if (Buffer.byteLength(normalized, 'utf8') <= snapshots.SNAPSHOT_MAX_BYTES) {
        const lines = normalized === '' ? [] : normalized.replace(/\n$/, '').split('\n');
        const seenRanges = entries2.map((e) => [e.line, Math.min(e.line, lines.length)]);
        tag = snapshots.recordSnapshot(abs, normalized, seenRanges);
      }
    } catch { /* unreadable — no tag */ }

    rendered.push({ relPath, tag, entries: entries2 });
  }

  const moreFiles = !singleFile && filePageStart + GREP_FILE_PAGE < fileOrder.length;
  const nextPageSkip = moreFiles ? skip + 1 : undefined;
  const totalCapHit = totalMatchCount >= GREP_TOTAL_CAP;
  // skip past the last page: distinguish from a genuine no-match (pi parity)
  const pastEnd = !singleFile && skip > 0 && pageFiles.length === 0 && fileOrder.length > 0;

  const output = pastEnd
    ? `No more results (skip=${skip} is past the last file page; use skip=${skip - 1} to go back)`
    : formatAnchoredGrep(rendered, {
        truncated: totalCapHit,
        nextPageSkip,
      });
  const note = missing.length > 0 ? output + `\n\nSkipped missing paths: ${missing.join(', ')}` : output;
  return ok({ output: note, matchCount: totalMatchCount, fileCount: pageFiles.length });
}
async function toolWebFetch(args) {
  const urlList = [];
  if (Array.isArray(args?.urls)) {
    for (const u of args.urls) {
      const trimmed = String(u || '').trim();
      if (trimmed) urlList.push(trimmed);
    }
  }
  const singleUrl = String(args?.url || '').trim();
  if (singleUrl) urlList.push(singleUrl);
  if (urlList.length === 0) return fail('url or urls required');
  if (urlList.length > 20) return fail('Fetch at most 20 URLs per call');

  const results = [];
  for (let i = 0; i < urlList.length; i++) {
    const url = urlList[i];
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'DesktopFairy/0.2' },
        signal: AbortSignal.timeout(30_000),
      });
      const text = await res.text();
      const content = text.slice(0, MAX_FETCH_BYTES);
      results.push({
        id: i + 1,
        title: url,
        url,
        content,
      });
    } catch (e) {
      results.push({
        id: i + 1,
        title: url,
        url,
        content: `Error: ${String(e?.message || e)}`,
      });
    }
  }
  return ok({
    results,
    prompt: String(args?.prompt || ''),
  });
}

async function webSearchDuckDuckGo(query, config) {
  const base = String(config?.duckduckgoApiUrl || "https://api.duckduckgo.com").replace(/\/$/, "");
  const res = await fetch(
    `${base}/?q=${encodeURIComponent(query)}&format=json&no_redirect=1`,
    { signal: AbortSignal.timeout(15_000) }
  );
  if (!res.ok) throw new Error(`DuckDuckGo HTTP ${res.status}`);
  const data = await res.json();
  const results = [];
  if (data?.AbstractText) {
    results.push({
      title: data.Heading || query,
      url: data.AbstractURL || '',
      content: data.AbstractText,
    });
  }
  for (const topic of data?.RelatedTopics || []) {
    if (topic?.Text && topic?.FirstURL) {
      results.push({ title: topic.Text, url: topic.FirstURL, content: topic.Text });
    } else if (Array.isArray(topic?.Topics)) {
      for (const sub of topic.Topics) {
        if (sub?.Text && sub?.FirstURL) {
          results.push({ title: sub.Text, url: sub.FirstURL, content: sub.Text });
        }
      }
    }
    if (results.length >= 8) break;
  }
  return results;
}

async function webSearchTavily(query, config) {
  if (!config?.tavilyApiKey) throw new Error("Tavily API Key not configured");
  const base = String(config?.tavilyApiUrl || "https://api.tavily.com").replace(/\/$/, "");
  const res = await fetch(`${base}/search`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.tavilyApiKey}`,
    },
    body: JSON.stringify({
      query,
      max_results: 8,
    }),
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) throw new Error(`Tavily HTTP ${res.status}: ${await res.text().catch(() => "")}`);
  const data = await res.json();
  return (data?.results || [])
    .slice(0, 8)
    .map((item) => ({
      title: String(item?.title || "").trim(),
      url: String(item?.url || ""),
      content: String(item?.content || "").trim(),
    }));
}

async function webSearchSerpAPI(query, config) {
  if (!config?.serpapiApiKey) throw new Error("SerpAPI Key not configured");
  const base = String(config?.serpapiApiUrl || "https://serpapi.com").replace(/\/$/, "");
  const params = new URLSearchParams({
    api_key: String(config.serpapiApiKey),
    engine: "google",
    q: query,
    location: "China",
    google_domain: "google.com",
    gl: "cn",
    hl: "zh-cn",
    num: "8",
  });
  const url = `${base}/search?${params.toString()}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(20_000) });
  if (!res.ok) throw new Error(`SerpAPI HTTP ${res.status}: ${await res.text().catch(() => "")}`);
  const data = await res.json();
  const organic = data?.organic_results || [];
  return organic.slice(0, 8).map((item) => ({
    title: String(item?.title || ""),
    url: String(item?.link || ""),
    content: String(item?.snippet || ""),
  }));
}

async function webSearchBrave(query, config) {
  if (!config?.braveApiKey) throw new Error("Brave Search API Key not configured");
  const base = String(config?.braveApiUrl || "https://api.search.brave.com").replace(/\/$/, "");
  const url =
    `${base}/res/v1/web/search?q=${encodeURIComponent(query)}&count=8`;
  const res = await fetch(url, {
    headers: {
      Accept: "application/json",
      "Accept-Encoding": "gzip",
      "X-Subscription-Token": config.braveApiKey,
    },
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) throw new Error(`Brave HTTP ${res.status}`);
  const data = await res.json();
  const web = data?.web?.results || [];
  return web.slice(0, 8).map((item) => ({
    title: String(item?.title || ""),
    url: String(item?.url || ""),
    content: String(item?.description || ""),
  }));
}

async function webSearchSearXNG(query, config) {
  const base = String(config?.searxngUrl || "https://searx.be").replace(/\/$/, "");
  const url = `${base}/search?q=${encodeURIComponent(query)}&format=json&categories=general`;
  const res = await fetch(url, { signal: AbortSignal.timeout(20_000) });
  if (!res.ok) throw new Error(`SearXNG HTTP ${res.status}`);
  const data = await res.json();
  return (data?.results || []).slice(0, 8).map((item) => ({
    title: String(item?.title || ""),
    url: String(item?.url || ""),
    content: String(item?.content || ""),
  }));
}

async function webSearchZhipu(query, config) {
  if (!config?.zhipuApiKey) throw new Error("Zhipu API Key not configured");
  const base = String(config?.zhipuApiUrl || "https://open.bigmodel.cn").replace(/\/$/, "");
  const url = `${base}/api/paas/v4/web_search`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.zhipuApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      search_query: query,
      search_engine: "search_std",
      search_intent: false,
      count: 10,
      search_recency_filter: "noLimit",
    }),
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) throw new Error(`Zhipu HTTP ${res.status}: ${await res.text().catch(() => "")}`);
  const data = await res.json();
  const results = data?.search_result || [];
  return results.slice(0, 8).map((item) => ({
    title: String(item?.title || "").trim(),
    url: String(item?.link || ""),
    content: String(item?.content || "").trim(),
  }));
}

async function toolWebSearch(args, config) {
  const query = String(args?.query || "").trim();
  if (!query) return fail("query required");
  const cfg = config || { provider: "duckduckgo" };
  try {
    let results = [];
    switch (cfg.provider) {
      case "tavily":
        results = await webSearchTavily(query, cfg);
        break;
      case "serpapi":
        results = await webSearchSerpAPI(query, cfg);
        break;
      case "brave":
        results = await webSearchBrave(query, cfg);
        break;
      case "searxng":
        results = await webSearchSearXNG(query, cfg);
        break;
      case "zhipu":
        results = await webSearchZhipu(query, cfg);
        break;
      case "duckduckgo":
      default:
        results = await webSearchDuckDuckGo(query, cfg);
        break;
    }
    return ok({
      query,
      results: results.map((item, index) => ({
        id: index + 1,
        title: item.title,
        url: item.url,
        content: item.content,
      })),
    });
  } catch (e) {
    return fail(String(e?.message || e));
  }
}

function toolTodoWrite(args, requestId) {
  const todos = Array.isArray(args?.todos) ? args.todos : [];
  if (requestId) {
    todosByRequest.set(requestId, todos);
  }
  return ok({ todos });
}

function clearRequestTodos(requestId) {
  if (requestId) todosByRequest.delete(requestId);
}

function toolTask(args) {
  return fail(
    `Task/subagent is not supported in DesktopFairy. Request: ${String(args?.description || '')}`
  );
}

function toolUpdateProfile(args, deps) {
  const field = args?.field;
  const action = args?.action;
  const content = String(args?.content ?? '').trim();

  if (field !== 'soul' && field !== 'user') return fail('field must be "soul" or "user"');
  if (action !== 'replace' && action !== 'append') return fail('action must be "replace" or "append"');
  if (!content) return fail('content must not be empty');

  const settingsPath = path.join(getApp().getPath('userData'), 'da_settings.json');
  let settings;
  try {
    settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
  } catch {
    return fail('Could not read settings');
  }

  const agent = settings.agent && typeof settings.agent === 'object' ? settings.agent : {};
  if (action === 'replace') {
    agent[field] = content;
  } else {
    const existing = typeof agent[field] === 'string' ? agent[field] : '';
    agent[field] = existing ? existing.trimEnd() + '\n\n' + content : content;
  }
  settings.agent = agent;

  try {
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
  } catch {
    return fail('Could not write settings');
  }

  broadcastSettingsUpdated(settings, deps.getWindows);

  const label = field === 'soul' ? 'SOUL.md' : 'USER.md';
  const verb = action === 'replace' ? '已替换' : '已追加到';
  return ok({ message: `${verb} ${label}`, field, action });
}


function unbindMcpServerFromAgent(serverId, deps) {
  const settingsPath = path.join(getApp().getPath('userData'), 'da_settings.json');
  let settings;
  try {
    settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
  } catch {
    return;
  }
  const agent = settings.agent && typeof settings.agent === 'object' ? settings.agent : {};
  const ids = Array.isArray(agent.mcpServerIds) ? agent.mcpServerIds : [];
  agent.mcpServerIds = ids.filter((id) => id !== serverId);
  settings.agent = agent;
  try {
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
  } catch {
    return;
  }
  broadcastSettingsUpdated(settings, deps.getWindows);
}

function bindMcpServerToAgent(serverId, deps) {
  const settingsPath = path.join(getApp().getPath('userData'), 'da_settings.json');
  let settings;
  try {
    settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
  } catch {
    return;
  }
  const agent = settings.agent && typeof settings.agent === 'object' ? settings.agent : {};
  const ids = Array.isArray(agent.mcpServerIds) ? agent.mcpServerIds : [];
  if (ids.includes(serverId)) return;
  agent.mcpServerIds = [...ids, serverId];
  settings.agent = agent;
  try {
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
  } catch {
    return;
  }
  broadcastSettingsUpdated(settings, deps.getWindows);
}

async function toolMcpManager(args, deps = {}) {
  const action = String(args?.action || '').trim();
  if (!action) return fail('action required');

  const { listServers, getServerById, upsertServer, deleteServer } = require('./mcpServerService.cjs');
  const {
    getOrCreateClient,
    stopServer,
    restartServer,
    removeServer,
    closeClientsForServerId,
    checkConnectivity,
    getStatus,
    getServerLogs,
  } = require('./mcpRuntimeService.cjs');

  const agentConfig = deps.agentConfig || {};
  const boundIds = new Set(agentConfig.mcpServerIds || []);
  const connectedIds = deps.mcpConnectedServerIds || null;

  function summarize(server) {
    if (!server) return null;
    const status = getStatus(server.id) || { state: 'disabled' };
    const isBound = boundIds.has(server.id);
    return {
      id: server.id,
      name: server.name,
      type: server.type || (server.command ? 'stdio' : 'sse'),
      isActive: server.isActive !== false,
      installSource: server.installSource || 'manual',
      command: server.command || '',
      args: server.args || [],
      baseUrl: server.baseUrl || '',
      description: server.description || '',
      reference: server.reference || '',
      bound: isBound,
      // Whether tools from this server can be called in the current session.
      sessionAvailable: connectedIds ? (isBound && connectedIds.has(server.id)) : undefined,
      status: status.state,
      lastError: status.lastError || undefined,
    };
  }

  if (action === 'list') {
    const servers = listServers();
    return ok({ servers: servers.map(summarize) });
  }

  if (action === 'status') {
    const serverId = String(args?.serverId || '').trim();
    if (!serverId) return fail('serverId required');
    const server = getServerById(serverId);
    if (!server) return fail(`MCP server ${serverId} not found`);
    const status = getStatus(server.id) || { state: 'disabled' };
    let logs = [];
    try {
      logs = (await getServerLogs(server.id)).slice(-10);
    } catch {
      /* ignore */
    }
    return ok({ server: summarize(server), status, logs });
  }

  if (action === 'tools') {
    const serverId = String(args?.serverId || '').trim();
    if (!serverId) return fail('serverId required');
    const server = getServerById(serverId);
    if (!server) return fail(`MCP server ${serverId} not found`);
    if (server.isActive === false) return fail(`MCP server ${server.name} is disabled`);
    // Whether this server's tools are registered in the current agent session.
    const sessionAvailable = deps.mcpConnectedServerIds
      ? deps.mcpConnectedServerIds.has(serverId)
      : undefined;
    try {
      const client = await getOrCreateClient(server);
      const { tools } = await client.listTools();
      return ok({
        serverId: server.id,
        serverName: server.name,
        sessionAvailable,
        ...(sessionAvailable === false && {
          sessionNote:
            `Server connected now but was unavailable at session start — tools like mcp__${serverId}__<name> are NOT callable this turn. Use McpManager restart then retry your request.`,
        }),
        tools: (tools || []).map((t) => ({
          name: t.name,
          fullToolName: `mcp__${serverId}__${t.name}`,
          description: t.description || '',
          inputSchema: t.inputSchema || { type: 'object', properties: {} },
        })),
      });
    } catch (e) {
      return fail(`Failed to list tools: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  if (action === 'enable') {
    const serverId = String(args?.serverId || '').trim();
    if (!serverId) return fail('serverId required');
    const server = getServerById(serverId);
    if (!server) return fail(`MCP server ${serverId} not found`);
    upsertServer({ ...server, isActive: true });
    try {
      await checkConnectivity(server.id);
    } catch {
      /* status reflects error */
    }
    return ok({ server: summarize(getServerById(server.id)), message: 'enabled' });
  }

  if (action === 'disable') {
    const serverId = String(args?.serverId || '').trim();
    if (!serverId) return fail('serverId required');
    const server = getServerById(serverId);
    if (!server) return fail(`MCP server ${serverId} not found`);
    upsertServer({ ...server, isActive: false });
    await stopServer(server.id);
    return ok({ server: summarize(getServerById(server.id)), message: 'disabled' });
  }

  if (action === 'restart') {
    const serverId = String(args?.serverId || '').trim();
    if (!serverId) return fail('serverId required');
    const server = getServerById(serverId);
    if (!server) return fail(`MCP server ${serverId} not found`);
    if (server.isActive === false) return fail(`MCP server ${server.name} is disabled; enable it first`);
    try {
      await restartServer(server.id);
    } catch (e) {
      return fail(`Restart failed: ${e instanceof Error ? e.message : String(e)}`);
    }
    return ok({ server: summarize(getServerById(server.id)), message: 'restarted' });
  }

  if (action === 'stop') {
    const serverId = String(args?.serverId || '').trim();
    if (!serverId) return fail('serverId required');
    const server = getServerById(serverId);
    if (!server) return fail(`MCP server ${serverId} not found`);
    await stopServer(server.id);
    return ok({ server: summarize(getServerById(server.id)), message: 'stopped' });
  }

  if (action === 'add') {
    const server = args?.server && typeof args.server === 'object' ? args.server : null;
    if (!server) return fail('server object required');
    const name = String(server.name || args?.name || '').trim();
    if (!name) return fail('server.name required');
    if (!server.command?.trim() && !server.baseUrl?.trim()) {
      return fail('server.command (stdio) or server.baseUrl (sse/streamableHttp) required');
    }
    const id = String(server.id || `mcp_${Date.now().toString(36)}`);
    const next = {
      ...server,
      id,
      name,
      installSource: 'manual',
      isActive: server.isActive !== false,
    };
    upsertServer(next);
    if (next.isActive) {
      try {
        await checkConnectivity(id);
      } catch {
        /* status reflects error */
      }
    }
    try {
      bindMcpServerToAgent(id, deps);
    } catch {
      /* non-fatal */
    }
    return ok({ server: summarize(getServerById(id)), message: 'added' });
  }

  if (action === 'edit') {
    const serverId = String(args?.serverId || '').trim();
    if (!serverId) return fail('serverId required');
    const existing = getServerById(serverId);
    if (!existing) return fail(`MCP server ${serverId} not found`);
    const patch = args?.server && typeof args.server === 'object' ? args.server : {};
    const isBuiltin = existing.installSource === 'builtin';
    const merged = {
      ...existing,
      ...patch,
      id: existing.id,
      installSource: existing.installSource || 'manual',
      command: isBuiltin ? existing.command : (patch.command ?? existing.command),
      args: Array.isArray(patch.args) ? patch.args : (patch.args ?? existing.args),
    };
    upsertServer(merged);
    await closeClientsForServerId(existing.id);
    if (merged.isActive !== false) {
      try {
        await checkConnectivity(existing.id);
      } catch {
        /* status reflects error */
      }
    }
    return ok({ server: summarize(getServerById(existing.id)), message: 'edited' });
  }

  if (action === 'remove') {
    const serverId = String(args?.serverId || '').trim();
    if (!serverId) return fail('serverId required');
    const existing = getServerById(serverId);
    if (!existing) return fail(`MCP server ${serverId} not found`);
    await removeServer(serverId);
    deleteServer(serverId);
    try {
      unbindMcpServerFromAgent(serverId, deps);
    } catch {
      /* non-fatal */
    }
    return ok({ serverId, message: 'removed' });
  }

  return fail(`Unknown action: ${action}`);
}

const MAX_TERMINAL_OUTPUT = 20000;
const TERMINAL_OUTPUT_HEAD = 18000;
const TERMINAL_OUTPUT_TAIL = 2000;

function truncateTerminalOutput(text) {
  const str = String(text || '');
  if (str.length <= MAX_TERMINAL_OUTPUT) return str;
  return (
    str.slice(0, TERMINAL_OUTPUT_HEAD) +
    `\n…[输出已截断，共 ${str.length} 字符]…\n` +
    str.slice(str.length - TERMINAL_OUTPUT_TAIL)
  );
}

async function toolTerminal(args, deps = {}) {
  const command = String(args?.command || '').trim();
  if (!command) return fail('command required');
  // Terminal tool keeps its own ms-based timeout contract (out of pi-port scope):
  // resolve seconds then convert; 0-second timeout disables (use a large default).
  const timeoutSec = resolveBashTimeoutSec(args?.timeout);
  const timeoutMs = timeoutSec === 0 ? 600_000 : timeoutSec * 1000;
  // SSH 会话的命令必须在远程执行 —— 即便会话已死也不降级到本机 shell，
  // 因为那是完全不同的机器，本地执行毫无意义且会产生误导性结果。
  const isSshSession = !!deps.terminalSessionId && deps.terminalSessionId.startsWith('ssh_');

  // 尝试在绑定的终端会话中执行（输出可见于终端 UI）
  if (deps.terminalSessionId) {
    try {
      const result = await getRunCommandInRenderer()(deps.sender, {
        sessionId: deps.terminalSessionId,
        command,
        timeout: timeoutMs,
        signal: deps.signal,
      });
      return JSON.stringify({
        ok: true,
        command,
        output: truncateTerminalOutput(result.output),
        exitCode: result.exitCode,
        remote: result.remote === true,
        remoteNote: result.remoteNote || null,
      });
    } catch (e) {
      const msg = String(e?.message || e);
      // 本地 PTY 会话已死 → 降级到独立 shell（同一台机器，降级安全）。
      // SSH 会话死掉 → 不降级，直接报错（不同机器，降级会误导）。
      if (
        !isSshSession &&
        (msg.includes('终端会话不存在或已关闭') ||
          msg.includes('终端会话已被终止') ||
          msg.includes('终端进程已退出'))
      ) {
        return runInStandaloneShell(command, args, deps, timeoutMs);
      }
      return fail(msg);
    }
  }

  // 无绑定的终端会话 → 本地命令用独立 shell 执行；SSH 上下文不能降级
  if (isSshSession) {
    return fail('SSH 终端会话未绑定，无法在远程执行命令。请重新连接 SSH 后再试。');
  }
  return runInStandaloneShell(command, args, deps, timeoutMs);
}

// 降级路径：用独立 shell（非交互 zsh -lc）执行命令，输出不可见于终端 UI。
// 复用 toolBash 的执行逻辑，但包装成 toolTerminal 的返回格式。
async function runInStandaloneShell(command, args, deps, timeoutMs) {
  const shell = process.env.SHELL || '/bin/zsh';
  const env = { ...process.env, ...(deps.envVars || {}) };
  try {
    const { stdout, stderr } = await execFileAsync(shell, ['-lc', command], {
      env,
      timeout: timeoutMs,
      maxBuffer: 1024 * 1024,
      cwd: os.homedir(),
    });
    const combined = String(stdout || '') + (stderr ? '\n' + stderr : '');
    return JSON.stringify({
      ok: true,
      command,
      output: truncateTerminalOutput(combined),
      exitCode: 0,
      remote: false,
      remoteNote: '⚠️ 终端会话不可用，命令已在独立 shell 中执行（输出未显示在终端中）。建议打开新终端后重试以获得交互式输出。',
    });
  } catch (e) {
    const stdout = String(e?.stdout || '');
    const stderr = String(e?.stderr || e?.message || e);
    const combined = stdout + (stderr ? '\n' + stderr : '');
    // 命令执行失败（非零退出码）也算 ok —— agent 需要看到输出和退出码
    if (combined.trim()) {
      return JSON.stringify({
        ok: true,
        command,
        output: truncateTerminalOutput(combined),
        exitCode: typeof e?.code === 'number' ? e.code : 1,
        remote: false,
        remoteNote: '⚠️ 终端会话不可用，命令已在独立 shell 中执行（输出未显示在终端中）。',
      });
    }
    return fail('终端会话不可用且独立 shell 执行失败: ' + stderr);
  }
}

async function executeBuiltinTool(toolName, args, deps = {}) {
  switch (toolName) {
    case 'read':
      return toolRead(args);
    case 'write':
      return toolWrite(args);
    case 'edit':
      return toolEdit(args);
    case 'bash':
      return toolBash(args, deps.envVars, deps);
    case 'glob':
      return toolGlob(args, deps.signal);
    case 'grep':
      return toolGrep(args, deps.signal);
    case 'WebFetch':
      return toolWebFetch(args);
    case 'WebSearch':
      return toolWebSearch(args, deps.webSearchConfig);
    case 'TodoWrite':
      return toolTodoWrite(args, deps.requestId);
    case 'Task':
      return toolTask(args);
    case 'UpdateProfile':
      return toolUpdateProfile(args, deps);
    case 'McpManager':
      return toolMcpManager(args, deps);
    case 'Terminal':
      return toolTerminal(args, deps);
    default:
      return fail(`工具 "${toolName}" 不在可用工具列表中。请只使用系统提供的工具，不要虚构不存在的工具。`);
  }
}

async function testWebSearchConfig(config) {
  const cfg = config || { provider: "duckduckgo" };
  const sampleQueries = {
    duckduckgo: "hello world",
    tavily: "hello world",
    serpapi: "Coffee",
    brave: "hello world",
    searxng: "hello",
    zhipu: "人工智能",
  };
  const query = sampleQueries[cfg.provider] || "hello";
  try {
    let results = [];
    switch (cfg.provider) {
      case "tavily":
        results = await webSearchTavily(query, cfg);
        break;
      case "serpapi":
        results = await webSearchSerpAPI(query, cfg);
        break;
      case "brave":
        results = await webSearchBrave(query, cfg);
        break;
      case "searxng":
        results = await webSearchSearXNG(query, cfg);
        break;
      case "zhipu":
        results = await webSearchZhipu(query, cfg);
        break;
      case "duckduckgo":
      default:
        results = await webSearchDuckDuckGo(query, cfg);
        break;
    }
    return {
      ok: true,
      provider: cfg.provider,
      query,
      count: Array.isArray(results) ? results.length : 0,
      sample: Array.isArray(results) && results[0]
        ? {
            title: String(results[0].title || "").slice(0, 80),
            url: String(results[0].url || "").slice(0, 120),
          }
        : null,
    };
  } catch (e) {
    return {
      ok: false,
      provider: cfg.provider,
      error: String(e?.message || e),
    };
  }
}

module.exports = { executeBuiltinTool, testWebSearchConfig, clearRequestTodos };
