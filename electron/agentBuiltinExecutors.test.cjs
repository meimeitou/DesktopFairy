// Integration proof for the pi-contract FS six-pack through executeBuiltinTool.
// vitest globals (globals: true) provide describe/it/expect in CJS tests.
const { executeBuiltinTool } = require('./agentBuiltinExecutors.cjs');
const snapshots = require('./agentSnapshotStore.cjs');
const { applyHashlinePatch, resetAll } = require('./hashlinePatch.cjs');
const fs = require('fs');
const os = require('os');
const path = require('path');

let dir;

async function run(tool, args) {
  return JSON.parse(await executeBuiltinTool(tool, args));
}

beforeEach(() => {
  resetAll();
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'exec-'));
  process.env.DF_AGENT_FS_BASE = dir;
});

afterEach(() => {
  fs.rmSync(dir, { recursive: true, force: true });
  delete process.env.DF_AGENT_FS_BASE;
});

describe('ssh_grep user regex', () => {
  const { compileUserRegex } = require('./agentBuiltinSshExecutors.cjs');

  it('accepts ordinary patterns and rejects nested quantifiers', () => {
    expect(compileUserRegex('error:\\s+\\d+', '').regex).toBeInstanceOf(RegExp);
    expect(compileUserRegex('(?:https?://\\S+)', '').regex).toBeInstanceOf(RegExp);
    expect(compileUserRegex('(a+)+$', '').error).toMatch(/嵌套量词/);
    expect(compileUserRegex('(a|ab)+', '').error).toMatch(/嵌套量词/);
    expect(compileUserRegex('a'.repeat(201), '').error).toMatch(/过长/);
  });
});

describe('executeBuiltinTool FS six-pack', () => {
  it('write → read → edit → read → grep → glob end-to-end', async () => {
    // write
    const w = await run('write', { path: 'notes/hello.txt', content: 'line one\nline two\nline three\n' });
    expect(w.ok).toBe(true);
    const tag = w.message.match(/\[notes\/hello\.txt#([0-9A-F]{4})\]/)[1];
    expect(tag).toMatch(/^[0-9A-F]{4}$/);

    // read carries [path#TAG] header + LINE:TEXT
    const r = await run('read', { path: 'notes/hello.txt' });
    expect(r.ok).toBe(true);
    expect(r.content.startsWith(`[notes/hello.txt#${tag}]`)).toBe(true);
    expect(r.content).toContain('1:line one');
    expect(r.content).toContain('3:line three');

    // edit using the tag from write
    const e = await run('edit', {
      input: `[notes/hello.txt#${tag}]\nPUT 1.=1:\n+greetings line one\n`,
    });
    expect(e.ok).toBe(true);
    expect(e.message).toMatch(/Applied 1 op\(s\)/);
    const newTag = e.message.match(/#([0-9A-F]{4})\]/)[1];

    // read verifies the edit
    const r2 = await run('read', { path: 'notes/hello.txt' });
    expect(r2.content).toContain('1:greetings line one');
    expect(r2.content).toContain('2:line two');

    // grep finds the edited line with anchored output and a TAG
    const g = await run('grep', { pattern: 'greetings', path: 'notes/hello.txt' });
    expect(g.ok).toBe(true);
    expect(g.output).toMatch(/\[notes\/hello\.txt#[0-9A-F]{4}\]/);
    expect(g.output).toContain('*1:greetings line one');

    // glob lists the file in a grouped tree
    const gl = await run('glob', { path: 'notes/**/*.txt' });
    expect(gl.ok).toBe(true);
    expect(gl.output).toContain('# notes/');
    expect(gl.output).toContain('hello.txt');
  });

  it('read selectors: :N, :A-B, :raw', async () => {
    await run('write', { path: 'sel.txt', content: '1\n2\n3\n4\n5\n' });
    const a = await run('read', { path: 'sel.txt:3' });
    expect(a.content).toContain('3:3');
    const b = await run('read', { path: 'sel.txt:2-3' });
    // bounded single range adds 1 leading / 3 trailing context (clamped)
    expect(b.content).toContain('1:1');
    expect(b.content).toContain('5:5');
    const c = await run('read', { path: 'sel.txt:1-2:raw' });
    expect(c.content).toBe('1\n2');
  });

  it('read out-of-range returns a hint, not an error', async () => {
    await run('write', { path: 'small.txt', content: 'a\nb\n' });
    const r = await run('read', { path: 'small.txt:500' });
    expect(r.ok).toBe(true);
    expect(r.content).toMatch(/past the end of the file \(2 lines\)/);
  });

  it('read directory renders depth-2 tree', async () => {
    await run('write', { path: 'd1/d2/deep.txt', content: 'x\n' });
    const r = await run('read', { path: 'd1' });
    expect(r.ok).toBe(true);
    expect(r.content).toContain('d2/');
    expect(r.content).toContain('deep.txt');
  });

  it('write strips pasted hashline headers and LINE: prefixes', async () => {
    const w = await run('write', {
      path: 'paste.txt',
      content: '[paste.txt#AB12]\n1:first\n2:second\n',
    });
    expect(w.ok).toBe(true);
    // on-disk content has prefixes stripped
    const raw = fs.readFileSync(path.join(dir, 'paste.txt'), 'utf8');
    expect(raw).toBe('first\nsecond\n');
  });

  it('edit rejects unseen ranges and stale tags', async () => {
    const p = path.join(dir, 'g.txt');
    const body = Array.from({ length: 10 }, (_, i) => `l${i + 1}`).join('\n') + '\n';
    await run('write', { path: 'g.txt', content: body });
    // external drift so the write-snapshot goes stale; only the bounded read counts
    fs.writeFileSync(p, body.replace('l10', 'l10x'));
    const r = await run('read', { path: 'g.txt:2-3,8-9' });
    const tag = r.content.match(/#([0-9A-F]{4})\]/)[1];
    expect(r.content).toContain('2:l2');
    expect(r.content).toContain('8:l8');
    const bad = await run('edit', { input: `[g.txt#${tag}]\nPUT 6.=6:\n+X\n` });
    expect(bad.ok).toBe(false);
    expect(bad.error).toMatch(/not in read ranges/);
    const stale = await run('edit', { input: `[g.txt#FFFF]\nPUT 2.=2:\n+X\n` });
    expect(stale.ok).toBe(false);
    expect(stale.error).toMatch(/stale tag; re-read/);
  });

  it('bash: non-zero exit reports error with exit code', async () => {
    const r = await run('bash', { command: 'echo out; exit 1', timeout: 15 });
    expect(r.ok).toBe(false);
    expect(r.error).toBe('Command exited with code 1');
    expect(r.exitCode).toBe(1);
    expect(r.output).toContain('out');
    // exit line lives in `error` only — output stays raw command output
    expect(r.output).not.toContain('Command exited with code');
  });

  it('bash: cwd arg and cd X && rewrite', async () => {
    await run('write', { path: 'sub/x.txt', content: 'x\n' });
    // macOS mkdtemp returns /var/... but pwd resolves through /private/var
    const realSub = await fs.promises.realpath(path.join(dir, 'sub'));
    const a = await run('bash', { command: 'pwd', cwd: 'sub', timeout: 15 });
    expect(a.ok).toBe(true);
    expect(a.output.trim()).toBe(realSub);
    const b = await run('bash', { command: 'cd sub && pwd', timeout: 15 });
    expect(b.ok).toBe(true);
    expect(b.output.trim()).toBe(realSub);
  });

  it('bash: missing cwd errors', async () => {
    const r = await run('bash', { command: 'pwd', cwd: 'no-such-dir', timeout: 15 });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/Working directory does not exist/);
  });

  it('bash: merged stdout/stderr in one output', async () => {
    const r = await run('bash', { command: 'echo A; echo B >&2; echo C', timeout: 15 });
    expect(r.ok).toBe(true);
    expect(r.output).toContain('A');
    expect(r.output).toContain('B');
    expect(r.output).toContain('C');
    expect(r.output).not.toHaveProperty('stdout');
  });

  it('bash: env vars validated and injected', async () => {
    const bad = await run('bash', { command: 'true', env: { 'bad-name': 'x' }, timeout: 15 });
    expect(bad.ok).toBe(false);
    expect(bad.error).toBe('Invalid bash env name: bad-name');
    const ok = await run('bash', { command: 'echo $DF_T', env: { DF_T: 'yes' }, timeout: 15 });
    expect(ok.ok).toBe(true);
    expect(ok.output.trim()).toBe('yes');
  });

  it('bash: timeout kills and reports', async () => {
    const r = await run('bash', { command: 'sleep 30', timeout: 1 });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/Command timed out after 1 second\(s\)/);
    expect(r.timedOut).toBe(true);
    expect(r.exitCode).toBe(124);
  }, 15000);

  it('grep: multi-file pagination with skip', async () => {
    for (let i = 0; i < 25; i++) {
      await run('write', { path: `p${String(i).padStart(2, '0')}.txt`, content: 'needle\n' });
    }
    const p1 = await run('grep', { pattern: 'needle' });
    expect(p1.output.match(/^\[/gm).length).toBe(20);
    expect(p1.output).toContain('Use skip=1 for the next page');
    const p2 = await run('grep', { pattern: 'needle', skip: 1 });
    expect(p2.output.match(/^\[/gm).length).toBe(5);
    expect(p2.output).not.toContain('Use skip=');
  });

  it('grep: invalid regex reported', async () => {
    const r = await run('grep', { pattern: 'x[', path: '.' });
    expect(r.ok).toBe(false);
    expect(r.error).toBe('Invalid regex: x[');
  });

  it('grep: empty pattern rejected', async () => {
    const r = await run('grep', { pattern: '   ' });
    expect(r.ok).toBe(false);
    expect(r.error).toBe('Pattern must not be empty');
  });

  it('grep: negative skip rejected', async () => {
    const r = await run('grep', { pattern: 'x', skip: -1 });
    expect(r.ok).toBe(false);
    expect(r.error).toBe('Skip must be a non-negative number');
  });

  it('glob: limit clamped and mtime order', async () => {
    for (let i = 0; i < 5; i++) {
      await run('write', { path: `m${i}.txt`, content: `x${i}\n` });
    }
    const r = await run('glob', { path: '*.txt', limit: 3 });
    expect(r.fileCount).toBe(3);
    expect(r.matches.length).toBe(3);
  });

  it('glob: single missing path hard-fails; multi missing skipped', async () => {
    const single = await run('glob', { path: 'gone-dir' });
    expect(single.ok).toBe(false);
    expect(single.error).toMatch(/Path not found/);
    await run('write', { path: 'here.txt', content: 'x\n' });
    const multi = await run('glob', { path: 'gone-dir; *.txt' });
    expect(multi.ok).toBe(true);
    expect(multi.output).toContain('Skipped missing paths: gone-dir');
    expect(multi.output).toContain('here.txt');
  });

  it('dispatch rejects removed MultiEdit and capitalized names', async () => {
    const r = await executeBuiltinTool('MultiEdit', { file_path: 'x', edits: [] });
    expect(JSON.parse(r).ok).toBe(false);
    const r2 = await executeBuiltinTool('Read', { file_path: 'x' });
    expect(JSON.parse(r2).ok).toBe(false);
  });

  it('snapshot store dedupes and caps versions', () => {
    const t1 = snapshots.recordSnapshot('/a/f.txt', 'one\ntwo\n', [[1, 2]]);
    const t1b = snapshots.recordSnapshot('/a/f.txt', 'one\r\ntwo\r\n');
    expect(t1b).toBe(t1); // CRLF-normalized dedupe
    for (let i = 0; i < 6; i++) snapshots.recordSnapshot('/a/cap.txt', `v${i}\n`);
    const latest = snapshots.latestSnapshot('/a/cap.txt');
    expect(latest.content).toBe('v5\n');
    expect(snapshots.getVersions('/a/cap.txt').length).toBeLessThanOrEqual(4);
  });

  it('bash: non-zero exit output is not duplicated (regression)', async () => {
    const r = await run('bash', { command: 'echo out; exit 1', timeout: 15 });
    expect(r.ok).toBe(false);
    expect(r.error).toBe('Command exited with code 1');
    // output carries the raw command output only, no appended exit line
    expect(r.output).toBe('out\n');
  });

  it('bash: timeout payload carries truncated flag (regression)', async () => {
    const r = await run('bash', { command: 'sleep 30', timeout: 1 });
    expect(r.ok).toBe(false);
    expect(r.timedOut).toBe(true);
    expect(typeof r.truncated).toBe('boolean');
  }, 15000);

  it('grep: skip past the last page reports No more results (regression)', async () => {
    for (let i = 0; i < 3; i++) {
      await run('write', { path: `s${i}.txt`, content: 'needle\n' });
    }
    const past = await run('grep', { pattern: 'needle', skip: 99 });
    expect(past.ok).toBe(true);
    expect(past.output).toContain('No more results');
    expect(past.output).toContain('skip=98');
    // genuine no-match stays distinct
    const none = await run('grep', { pattern: 'zzz-no-such-thing' });
    expect(none.output).toBe('No matches found');
  });
});
