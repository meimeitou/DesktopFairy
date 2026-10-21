/**
 * Hashline patch language — pi edit tool contract port.
 * Parses and applies line-anchored `[PATH#TAG]` patches against the
 * process snapshot store (agentSnapshotStore.cjs).
 *
 * Grammar (all line numbers refer to the ORIGINAL tagged snapshot):
 *   [PATH#TAG]               section header; same-path sections merge
 *   PUT N.=M:  + body rows   replace inclusive N..M with +TEXT rows
 *   PUT N*:    + body rows   replace syntactic block starting at N
 *   PUT <N: / PUT >N:        insert body before/after line N
 *   PUT >$:                  append body at tail
 *   PUT >N*:                 insert after block N (falls back to >N: + warning)
 *   CUT N.=M / CUT N*        delete; optional @name writes a named register,
 *                            otherwise the anonymous (batch-local) register
 *   PUT <N [@name] / PUT >N [@name] / PUT >$ [@name]
 *                            paste register into gap; no @name = anonymous
 *   PUT N.=M @name / PUT N* @name
 *                            replace range/block with named register
 *   REM                      delete the section file
 *   MV DEST                  rename after section edits (quote paths w/ spaces)
 * Body rows: `+TEXT`; `+` alone = blank; literal leading -/+ as `+-`/`++`.
 *
 * Everything is parsed and validated before any write; a failure anywhere
 * fails the whole call with nothing on disk changed.
 */
const fs = require('fs');
const path = require('path');
const snapshots = require('./agentSnapshotStore.cjs');
const SECTION_RE = /^\[([^\[\]\n]+)#([0-9A-Fa-f]{4})\]\s*$/;

function err(message) {
  return new Error(message);
}

// ---------------------------------------------------------------------------
// Parser
// ---------------------------------------------------------------------------

function parsePatch(input) {
  let text = String(input || '');
  const trimmed = text.trim();
  if (!trimmed) throw err('input required');

  if (trimmed.startsWith('*** Begin Patch')) {
    text = trimmed.slice('*** Begin Patch'.length);
  }
  const endIdx = text.indexOf('*** End Patch');
  if (endIdx !== -1) text = text.slice(0, endIdx);

  const lines = text.split('\n');
  const sections = [];
  let current = null;

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const stripped = raw.trim();
    if (!stripped) continue;

    const secMatch = stripped.match(SECTION_RE);
    if (secMatch) {
      current = {
        headerLine: i + 1,
        rawPath: secMatch[1].trim(),
        tag: secMatch[2].toUpperCase(),
        ops: [],
        rem: false,
        mv: null,
      };
      sections.push(current);
      continue;
    }

    if (!current) {
      if (stripped.startsWith('***')) continue; // stray envelope noise
      throw err(`line ${i + 1}: expected [PATH#TAG] section header, got: ${stripped.slice(0, 80)}`);
    }

    if (stripped === 'REM') {
      current.rem = true;
      continue;
    }

    if (stripped.startsWith('MV ')) {
      current.mv = parseMvDest(stripped.slice(3).trim());
      continue;
    }

    const op = parseOp(stripped, i + 1);

    if (op.body !== undefined) {
      // collect + body rows
      const body = [];
      let j = i + 1;
      for (; j < lines.length; j++) {
        const row = lines[j];
        if (row === '+' || row.startsWith('+')) {
          body.push(row === '+' ? '' : row.slice(1));
          continue;
        }
        break; // first non-'+' row ends the body
      }
      if (body.length === 0) {
        throw err(`line ${i + 1}: PUT ${op.targetText} has empty body`);
      }
      op.body = body;
      i = j - 1;
    }

    current.ops.push(op);
  }

  if (sections.length === 0) throw err('no [PATH#TAG] sections found in input');
  return sections;
}

function parseMvDest(dest) {
  const m = dest.match(/^"([^"]+)"$/) || dest.match(/^'([^']+)'$/);
  if (m) return m[1];
  if (/\s/.test(dest)) {
    throw err(`MV destination contains spaces; quote it: MV "path with spaces"`);
  }
  return dest;
}

function parseOp(stripped, lineNo) {
  let m;

  // Body-backed gap inserts: PUT <N: / PUT >N: / PUT >$: / PUT >N*:
  m = stripped.match(/^PUT\s+([<>])(\$|\d+)(\*?):\s*$/);
  if (m) {
    return {
      kind: 'put', pos: 'gap', side: m[1] === '<' ? 'before' : 'after',
      at: m[2] === '$' ? 'tail' : Number(m[2]),
      block: m[3] === '*',
      body: [], lineNo, targetText: `${m[1]}${m[2]}${m[3]}:`,
    };
  }

  // Register paste into a gap (no colon): PUT <N [@name] etc.
  m = stripped.match(/^PUT\s+([<>])(\$|\d+)(?:\s+@([A-Za-z0-9_-]+))?\s*$/);
  if (m) {
    return {
      kind: 'paste', pos: 'gap', side: m[1] === '<' ? 'before' : 'after',
      at: m[2] === '$' ? 'tail' : Number(m[2]),
      register: m[3] || null, lineNo,
      targetText: `${m[1]}${m[2]}${m[3] ? ` @${m[3]}` : ''}`,
    };
  }

  // PUT N.=M: body replace
  m = stripped.match(/^PUT\s+(\d+)\.=(\d+):\s*$/);
  if (m) {
    return {
      kind: 'put', pos: 'range', start: Number(m[1]), end: Number(m[2]),
      body: [], lineNo, targetText: `${m[1]}.=${m[2]}:`,
    };
  }

  // PUT N.=M @name register replace
  m = stripped.match(/^PUT\s+(\d+)\.=(\d+)\s+@([A-Za-z0-9_-]+)\s*$/);
  if (m) {
    return {
      kind: 'paste', pos: 'range', start: Number(m[1]), end: Number(m[2]),
      register: m[3], lineNo, targetText: `${m[1]}.=${m[2]} @${m[3]}`,
    };
  }

  // PUT N*: block body replace
  m = stripped.match(/^PUT\s+(\d+)\*:\s*$/);
  if (m) {
    return {
      kind: 'put', pos: 'block', start: Number(m[1]),
      body: [], lineNo, targetText: `${m[1]}*:`,
    };
  }

  // PUT N* @name register block replace
  m = stripped.match(/^PUT\s+(\d+)\*\s+@([A-Za-z0-9_-]+)\s*$/);
  if (m) {
    return {
      kind: 'paste', pos: 'block', start: Number(m[1]),
      register: m[2], lineNo, targetText: `${m[1]}* @${m[2]}`,
    };
  }

  // CUT N.=M [@name]
  m = stripped.match(/^CUT\s+(\d+)\.=(\d+)(?:\s+@([A-Za-z0-9_-]+))?\s*$/);
  if (m) {
    return {
      kind: 'cut', pos: 'range', start: Number(m[1]), end: Number(m[2]),
      register: m[3] || null, lineNo,
    };
  }

  // CUT N* [@name]
  m = stripped.match(/^CUT\s+(\d+)\*(?:\s+@([A-Za-z0-9_-]+))?\s*$/);
  if (m) {
    return {
      kind: 'cut', pos: 'block', start: Number(m[1]),
      register: m[2] || null, lineNo,
    };
  }

  throw err(`line ${lineNo}: cannot parse operation: ${stripped.slice(0, 80)}`);
}

// ---------------------------------------------------------------------------
// Block resolution (no tree-sitter: markdown headings / python indent / brackets)
// ---------------------------------------------------------------------------

const MD_RE = /\.(md|markdown)$/i;
const PY_RE = /\.pyw?$/i;

/**
 * Resolve the syntactic block starting at 1-indexed line N.
 * Returns { start, end } (inclusive, 1-indexed) or null when unresolvable.
 */
function resolveBlock(lines, N, filePath) {
  const idx = N - 1;
  if (idx < 0 || idx >= lines.length) return null;
  const startLine = lines[idx];

  if (MD_RE.test(filePath)) {
    const m = startLine.match(/^(#{1,6})\s/);
    if (!m) return null;
    const level = m[1].length;
    let end = lines.length;
    for (let i = idx + 1; i < lines.length; i++) {
      const h = lines[i].match(/^(#{1,6})\s/);
      if (h && h[1].length <= level) { end = i; break; }
    }
    return { start: N, end };
  }

  if (PY_RE.test(filePath)) {
    if (startLine.trim() === '') return null;
    // decorator lines: merge the decorated def/class block
    let idx2 = idx;
    if (/^\s*@/.test(startLine)) {
      let j = idx + 1;
      while (j < lines.length && (lines[j].trim() === '' || /^\s*@/.test(lines[j]))) j++;
      if (j >= lines.length || !/^\s*(def|class|async\s+def)\b/.test(lines[j])) return null;
      idx2 = j;
    }
    const indent = lines[idx2].match(/^\s*/)[0].length;
    let i = idx2 + 1;
    for (; i < lines.length; i++) {
      const l = lines[i];
      if (l.trim() === '') continue;
      if (l.match(/^\s*/)[0].length <= indent) break;
    }
    // end at the last non-blank indented line (tree-sitter node end)
    let end = i;
    while (end > idx2 + 1 && lines[end - 1].trim() === '') end--;
    if (end === idx2 + 1) return null; // single-line def/class
    return { start: N, end };
  }

  // Bracket languages (default): scan braces/brackets/parens with strings+comments
  const state = { depth: 0, inStr: null, blockComment: false, sawOpen: false };
  const scanLine = (line) => {
    let opens = 0;
    for (let k = 0; k < line.length; k++) {
      const c = line[k];
      if (state.blockComment) {
        if (c === '*' && line[k + 1] === '/') { state.blockComment = false; k++; }
        continue;
      }
      if (state.inStr) {
        if (c === '\\') { k++; continue; }
        if (c === state.inStr) state.inStr = null;
        continue;
      }
      if (c === '/' && line[k + 1] === '/') break;
      if (c === '/' && line[k + 1] === '*') { state.blockComment = true; k++; continue; }
      if (c === "'" || c === '"' || c === '`') { state.inStr = c; continue; }
      if (c === '{' || c === '[' || c === '(') { opens++; state.depth++; state.sawOpen = true; }
      else if (c === '}' || c === ']' || c === ')') { state.depth--; }
    }
    return opens;
  };
  scanLine(startLine);
  // Decorator line (starts with @, brackets may balance out on the same
  // line, e.g. `@Component({...})`): merge the next line's block.
  const isDecoratorLine = /^\s*@/.test(startLine);
  if (!state.sawOpen || isDecoratorLine) {
    // decorator/attribute line (possibly with balanced brackets): merge the
    // next non-empty line's block when it directly follows
    let j = idx + 1;
    while (j < lines.length && lines[j].trim() === '') j++;
    if (j > idx + 1) return null; // blank between decorator and block — no sweep
    if (j < lines.length) {
      const sub = resolveBlock(lines, j + 1, filePath);
      if (sub) return { start: N, end: sub.end };
    }
    return null;
  }
  if (state.depth <= 0) return null; // single-line open+close
  for (let i = idx + 1; i < lines.length; i++) {
    scanLine(lines[i]);
    if (state.depth <= 0) return { start: N, end: i + 1 };
  }
  return null; // unbalanced
}

// ---------------------------------------------------------------------------
// Planning + application
// ---------------------------------------------------------------------------

function splitContent(content) {
  const text = String(content).replace(/\r\n/g, '\n');
  if (text === '') return { lines: [], trailingNewline: false };
  if (text.endsWith('\n')) return { lines: text.slice(0, -1).split('\n'), trailingNewline: true };
  return { lines: text.split('\n'), trailingNewline: false };
}

function joinContent(lines, trailingNewline) {
  if (lines.length === 0) return '';
  const base = lines.join('\n');
  return trailingNewline ? base + '\n' : base;
}

function planSection(merged, absPath, ctx) {
  const snap = ctx.snapshotFor(absPath, merged.tag, merged.rawPath);
  const { lines, trailingNewline } = splitContent(snap.content);
  const lastLine = lines.length;
  const seen = snap.seenRanges || [];

  const rangeSeen = (n, m) => seen.some(([s, e]) => n >= s && m <= e);
  const lineSeen = (n) => seen.some(([s, e]) => n >= s && n <= e);

  const ops = [];
  for (const op of merged.ops) {
    if (op.pos === 'range' || op.pos === 'block') {
      let start;
      let end;
      if (op.pos === 'range') {
        if (op.end < op.start) {
          throw err(`line ${op.lineNo}: reversed range ${op.start}.=${op.end}`);
        }
        start = op.start;
        end = op.end;
      } else {
        start = op.start;
        const block = resolveBlock(lines, start, absPath);
        if (!block) {
          throw err(
            `line ${op.lineNo}: cannot resolve block anchor at line ${start}; use explicit line range`
          );
        }
        end = block.end;
      }
      if (start < 1 || end > lastLine) {
        throw err(`line ${op.lineNo}: range ${start}-${end} outside file (1..${lastLine})`);
      }
      if (!rangeSeen(start, end)) {
        throw err(
          `line ${op.lineNo}: lines ${start}-${end} not in read ranges; re-read ${merged.rawPath}`
        );
      }
      ops.push({ ...op, resolved: { start, end } });
    } else {
      // gap op: PUT <N / >N / >$ / >N* / paste
      if (op.at !== 'tail') {
        const beforeOk = op.side === 'before' && op.at === 1;
        const anchorOk = op.at >= 1 && op.at <= lastLine && lineSeen(op.at);
        const tailOk = op.side === 'after' && op.at === lastLine && lineSeen(lastLine);
        if (!beforeOk && !anchorOk && !tailOk) {
          throw err(
            `line ${op.lineNo}: anchor ${op.at} not in read ranges (file has ${lastLine} lines)`
          );
        }
      }
      ops.push({ ...op, resolved: null });
    }
  }

  // ranges must be ordered and non-overlapping
  const consumed = ops
    .filter((o) => o.resolved)
    .map((o) => ({ ...o.resolved, lineNo: o.lineNo }))
    .sort((a, b) => a.start - b.start);
  for (let i = 1; i < consumed.length; i++) {
    if (consumed[i].start <= consumed[i - 1].end) {
      throw err(
        `line ${consumed[i].lineNo}: overlapping ranges ` +
        `${consumed[i - 1].start}-${consumed[i - 1].end} and ${consumed[i].start}-${consumed[i].end}`
      );
    }
  }

  return { section: merged, snap, lines, trailingNewline, lastLine, ops };
}

/** Compute gap insertion point (0-indexed array position for splice). */
function gapInsertIndex(plan, op, absPath, warnings) {
  if (op.at === 'tail') return plan.lines.length;
  if (op.block) {
    const block = resolveBlock(plan.lines, op.at, absPath);
    if (block) return block.end; // after block end (1-indexed) == array index
    warnings.push(`block anchor >${op.at}* unresolved; inserted after line ${op.at} instead`);
    return op.at;
  }
  return op.side === 'before' ? op.at - 1 : op.at;
}

/** Apply planned ops; returns { outLines, touched, warnings }. */
function applyOps(plan, absPath, ctx) {
  const { ops, lines } = plan;
  const warnings = [];

  // Consumed original-line ranges (replace/cut). A gap insert whose insertion
  // point falls strictly inside one of these is ambiguous (before or after the
  // replacement?) — reject instead of guessing.
  const consumed = ops.filter((o) => o.resolved).map((o) => o.resolved);
  const interiorInsert = (index) =>
    consumed.some(({ start, end }) => start <= index && index <= end - 1);

  // First pass in original order so CUT fills registers before later pastes.
  const events = [];
  for (const op of ops) {
    if (op.kind === 'cut') {
      const { start, end } = op.resolved;
      const captured = lines.slice(start - 1, end);
      ctx.setRegister(op.register, captured, op.lineNo);
      events.push({ kind: 'cut', start, end, seq: events.length });
    } else if (op.kind === 'paste') {
      const reg = ctx.getRegister(op.register, op.lineNo);
      if (op.pos === 'gap') {
        const idx = gapInsertIndex(plan, op, absPath, warnings);
        if (interiorInsert(idx)) {
          throw err(`line ${op.lineNo}: insertion point lands inside a replaced/cut range; use a boundary line`);
        }
        events.push({ kind: 'insert', index: idx, lines: reg.slice(), seq: events.length });
      } else {
        const { start, end } = op.resolved;
        events.push({ kind: 'replace', start, end, lines: reg.slice(), seq: events.length });
      }
    } else if (op.kind === 'put') {
      if (op.pos === 'gap') {
        const idx = gapInsertIndex(plan, op, absPath, warnings);
        if (interiorInsert(idx)) {
          throw err(`line ${op.lineNo}: insertion point lands inside a replaced/cut range; use a boundary line`);
        }
        events.push({ kind: 'insert', index: idx, lines: op.body.slice(), seq: events.length });
      } else {
        const { start, end } = op.resolved;
        events.push({ kind: 'replace', start, end, lines: op.body.slice(), seq: events.length });
      }
    }
  }

  // Apply bottom-up by original anchor (descending). Ties at the same anchor:
  // replace/cut first — a gap insert at a range boundary (after line start-1 /
  // before line start) belongs before the replacement body; among inserts,
  // reverse document order so same-anchor inserts keep their written order.
  const sorted = events.slice().sort((a, b) => {
    const ka = a.kind === 'insert' ? a.index + 1 : a.start;
    const kb = b.kind === 'insert' ? b.index + 1 : b.start;
    if (ka !== kb) return kb - ka;
    const ra = a.kind === 'insert' ? 1 : 0;
    const rb = b.kind === 'insert' ? 1 : 0;
    if (ra !== rb) return ra - rb;
    return b.seq - a.seq;
  });
  const out = lines.slice();
  for (const ev of sorted) {
    if (ev.kind === 'insert') {
      out.splice(ev.index, 0, ...ev.lines);
    } else if (ev.kind === 'cut') {
      out.splice(ev.start - 1, ev.end - ev.start + 1);
    } else {
      out.splice(ev.start - 1, ev.end - ev.start + 1, ...ev.lines);
    }
  }

  return {
    outLines: out,
    touched: events.map((ev) =>
      ev.kind === 'insert' ? [Math.max(1, ev.index), Math.max(1, ev.index)] : [ev.start, ev.end]
    ),
    warnings,
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

// process-level named registers (pi session semantics); anonymous is batch-local
const namedRegisters = new Map();
/**
 * Remote (`ssh_edit`) registers live in their own map so a local `CUT @a`
 * can never be pasted into a remote file (and vice versa). They still persist
 * across remote calls, matching the sync semantics.
 */
const asyncNamedRegisters = new Map();

function applyHashlinePatch(input, { resolvePath, snapshotKey } = {}) {
  if (typeof resolvePath !== 'function') {
    throw err('resolvePath callback required');
  }
  const skey = typeof snapshotKey === 'function' ? snapshotKey : (p) => p;
  const sections = parsePatch(input);

  // merge same-path sections (original anchors apply together)
  const byPath = new Map();
  const order = [];
  for (const sec of sections) {
    const absPath = resolvePath(sec.rawPath);
    if (!byPath.has(absPath)) {
      byPath.set(absPath, {
        absPath, rawPath: sec.rawPath, tag: sec.tag, ops: [],
        rem: false, mv: null, headerLine: sec.headerLine,
      });
      order.push(absPath);
    }
    const merged = byPath.get(absPath);
    merged.ops.push(...sec.ops);
    if (sec.rem) merged.rem = true;
    if (sec.mv) merged.mv = sec.mv;
  }

  let anonymous = null;
  const stagedNamed = new Map();
  const ctx = {
    snapshotFor(absPath, tag, rawPath) {
      const key = skey(absPath);
      const snap = snapshots.getSnapshot(key, tag);
      if (snap) return snap;
      if (!snapshots.latestSnapshot(key)) {
        throw err(`no snapshot for ${rawPath}; read it first`);
      }
      throw err(`stale tag; re-read ${rawPath}`);
    },
    getRegister(name, lineNo) {
      if (name === null) {
        if (anonymous === null) {
          throw err(`line ${lineNo}: anonymous paste before any CUT in this call`);
        }
        return anonymous;
      }
      const staged = stagedNamed.get(name);
      if (staged) return staged;
      if (namedRegisters.has(name)) return namedRegisters.get(name);
      throw err(`line ${lineNo}: unknown register @${name}`);
    },
    setRegister(name, captured) {
      if (name === null) anonymous = captured;
      else stagedNamed.set(name, captured);
    },
  };

  // Plan everything first — any failure throws before a single write.
  const plans = order.map((absPath) => planSection(byPath.get(absPath), absPath, ctx));

  // Stale check: current on-disk content must equal the snapshotted version,
  // OR the tagged snapshot's content must equal current content (recovery).
  for (const plan of plans) {
    const absPath = plan.section.absPath;
    let current;
    try {
      current = fs.readFileSync(absPath, 'utf8');
    } catch (e) {
      const reason = e.code === 'ENOENT' ? 'file not found' : String(e.message || e);
      throw err(`cannot read ${plan.section.rawPath}: ${reason}`);
    }
    const currentNorm = current.replace(/\r\n/g, '\n');
    if (plan.snap.content !== currentNorm) {
      // stale recovery: some other recorded version matches the current file
      const matching = snapshots
        .getVersions(skey(absPath))
        .find((v) => v.content === currentNorm);
      if (!matching) throw err(`stale tag; re-read ${plan.section.rawPath}`);
      // re-anchor onto the matching version for application
      plan.snap = matching;
      const split = splitContent(matching.content);
      plan.lines = split.lines;
      plan.trailingNewline = split.trailingNewline;
      plan.lastLine = split.lines.length;
    }
  }

  // Compute all results; verify at least one section changes.
  const results = plans.map((plan) => {
    const absPath = plan.section.absPath;
    const { outLines, touched, warnings } = applyOps(plan, absPath, ctx);
    const before = joinContent(plan.lines, plan.trailingNewline);
    const after = joinContent(outLines, plan.trailingNewline);
    return { plan, outLines, touched, warnings, changed: before !== after };
  });
  if (results.every((r) => !r.changed && !r.plan.section.rem && !r.plan.section.mv)) {
    throw err('no change');
  }

  // Write out in order.
  const reports = [];
  for (const r of results) {
    const { plan, outLines, touched, warnings, changed } = r;
    const section = plan.section;
    const absPath = section.absPath;

    if (section.rem) {
      fs.unlinkSync(absPath);
      snapshots.dropSnapshot(skey(absPath));
      reports.push({
        rawPath: section.rawPath, absPath, finalPath: absPath,
        rem: true, opCount: section.ops.length, warnings,
      });
      continue;
    }

    if (changed) fs.writeFileSync(absPath, joinContent(outLines, plan.trailingNewline), 'utf8');

    // New snapshot; seen = touched ±3 clamped to file bounds.
    const total = outLines.length;
    let seen = [];
    for (const [s, e] of touched) {
      const cs = Math.max(1, s - 3);
      const ce = Math.min(Math.max(1, total), e + 3);
      if (cs > ce) continue;
      seen = snapshots.mergeRange(seen, cs, ce);
    }
    const newContent = joinContent(outLines, plan.trailingNewline);
    const tag = snapshots.recordSnapshot(skey(absPath), newContent, seen);

    let finalPath = absPath;
    if (section.mv) {
      const destAbs = resolvePath(section.mv);
      fs.mkdirSync(path.dirname(destAbs), { recursive: true });
      fs.renameSync(absPath, destAbs);
      snapshots.moveSnapshot(skey(absPath), skey(destAbs));
      finalPath = destAbs;
    }

    reports.push({
      rawPath: section.rawPath, absPath, finalPath, tag,
      opCount: section.ops.length,
      opSummary: section.ops.map((o) => o.targetText || o.kind),
      warnings, mv: section.mv || null, changed,
    });
  }

  // Publish staged named registers now that writes landed.
  for (const [name, value] of stagedNamed) namedRegisters.set(name, value);

  return reports;
}

/**
 * Async variant with injected I/O (SFTP adapters for ssh_edit). Shares
 * parsePatch/planSection/applyOps with the sync entry; plan-first semantics
 * are identical — any section failing leaves the target untouched.
 */
async function applyHashlinePatchAsync(
  input,
  {
    resolvePath,
    snapshotKey,
    readFile,
    writeFile,
    unlink,
    rename,
    mkdir,
  } = {},
) {
  if (typeof resolvePath !== 'function') throw err('resolvePath callback required');
  if (typeof readFile !== 'function' || typeof writeFile !== 'function') {
    throw err('readFile/writeFile callbacks required');
  }
  const skey = typeof snapshotKey === 'function' ? snapshotKey : (p) => p;
  const unlinkFn = typeof unlink === 'function'
    ? unlink
    : async (p) => { fs.unlinkSync(p); };
  const renameFn = typeof rename === 'function'
    ? rename
    : (from, to) => { fs.renameSync(from, to); };
  const mkdirFn = typeof mkdir === 'function'
    ? mkdir
    : async (p) => { fs.mkdirSync(p, { recursive: true }); };

  const sections = parsePatch(input);

  const byPath = new Map();
  const order = [];
  for (const sec of sections) {
    const absPath = resolvePath(sec.rawPath);
    if (!byPath.has(absPath)) {
      byPath.set(absPath, {
        absPath, rawPath: sec.rawPath, tag: sec.tag, ops: [],
        rem: false, mv: null, headerLine: sec.headerLine,
      });
      order.push(absPath);
    }
    const merged = byPath.get(absPath);
    merged.ops.push(...sec.ops);
    if (sec.rem) merged.rem = true;
    if (sec.mv) merged.mv = sec.mv;
  }

  let anonymous = null;
  const stagedNamed = new Map();
  const ctx = {
    snapshotFor(absPath, tag, rawPath) {
      const key = skey(absPath);
      const snap = snapshots.getSnapshot(key, tag);
      if (snap) return snap;
      if (!snapshots.latestSnapshot(key)) {
        throw err(`no snapshot for ${rawPath}; read it first`);
      }
      throw err(`stale tag; re-read ${rawPath}`);
    },
    getRegister(name, lineNo) {
      if (name === null) {
        if (anonymous === null) {
          throw err(`line ${lineNo}: anonymous paste before any CUT in this call`);
        }
        return anonymous;
      }
      const staged = stagedNamed.get(name);
      if (staged) return staged;
      if (asyncNamedRegisters.has(name)) return asyncNamedRegisters.get(name);
      throw err(`line ${lineNo}: unknown register @${name}`);
    },
    setRegister(name, captured) {
      if (name === null) anonymous = captured;
      else stagedNamed.set(name, captured);
    },
  };

  const plans = order.map((absPath) => planSection(byPath.get(absPath), absPath, ctx));

  for (const plan of plans) {
    const absPath = plan.section.absPath;
    let current;
    try {
      current = await readFile(absPath);
    } catch (e) {
      const reason = e?.code === 'ENOENT' ? 'file not found' : String(e?.message || e);
      throw err(`cannot read ${plan.section.rawPath}: ${reason}`);
    }
    const currentNorm = String(current).replace(/\r\n/g, '\n');
    if (plan.snap.content !== currentNorm) {
      const matching = snapshots
        .getVersions(skey(absPath))
        .find((v) => v.content === currentNorm);
      if (!matching) throw err(`stale tag; re-read ${plan.section.rawPath}`);
      plan.snap = matching;
      const split = splitContent(matching.content);
      plan.lines = split.lines;
      plan.trailingNewline = split.trailingNewline;
      plan.lastLine = split.lines.length;
    }
  }

  const results = plans.map((plan) => {
    const absPath = plan.section.absPath;
    const { outLines, touched, warnings } = applyOps(plan, absPath, ctx);
    const before = joinContent(plan.lines, plan.trailingNewline);
    const after = joinContent(outLines, plan.trailingNewline);
    return { plan, outLines, touched, warnings, changed: before !== after };
  });
  if (results.every((r) => !r.changed && !r.plan.section.rem && !r.plan.section.mv)) {
    throw err('no change');
  }

  const reports = [];
  for (const r of results) {
    const { plan, outLines, touched, warnings, changed } = r;
    const section = plan.section;
    const absPath = section.absPath;

    if (section.rem) {
      await unlinkFn(absPath);
      snapshots.dropSnapshot(skey(absPath));
      reports.push({
        rawPath: section.rawPath, absPath, finalPath: absPath,
        rem: true, opCount: section.ops.length, warnings,
      });
      continue;
    }

    if (changed) await writeFile(absPath, joinContent(outLines, plan.trailingNewline));

    const total = outLines.length;
    let seen = [];
    for (const [s, e] of touched) {
      const cs = Math.max(1, s - 3);
      const ce = Math.min(Math.max(1, total), e + 3);
      if (cs > ce) continue;
      seen = snapshots.mergeRange(seen, cs, ce);
    }
    const newContent = joinContent(outLines, plan.trailingNewline);
    const tag = snapshots.recordSnapshot(skey(absPath), newContent, seen);

    let finalPath = absPath;
    if (section.mv) {
      const destAbs = resolvePath(section.mv);
      await mkdirFn(path.dirname(destAbs));
      await renameFn(absPath, destAbs);
      snapshots.moveSnapshot(skey(absPath), skey(destAbs));
      finalPath = destAbs;
    }

    reports.push({
      rawPath: section.rawPath, absPath, finalPath, tag,
      opCount: section.ops.length,
      opSummary: section.ops.map((o) => o.targetText || o.kind),
      warnings, mv: section.mv || null, changed,
    });
  }

  for (const [name, value] of stagedNamed) asyncNamedRegisters.set(name, value);

  return reports;
}

function clearRegisters() {
  namedRegisters.clear();
}

/** Reset all state (tests). */
function resetAll() {
  namedRegisters.clear();
  snapshots.clearSnapshots();
}

module.exports = {
  parsePatch,
  resolveBlock,
  applyHashlinePatch,
  applyHashlinePatchAsync,
  clearRegisters,
  clearRegisters,
  resetAll,
};
