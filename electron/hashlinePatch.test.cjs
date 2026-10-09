// vitest globals (globals: true) provide describe/it/expect/beforeEach in CJS tests
const hp = require('./hashlinePatch.cjs');
const snapshots = require('./agentSnapshotStore.cjs');
const fs = require('fs');
const os = require('os');
const path = require('path');

let dir;
const R = (p) => path.join(dir, p);

function write(p, content) {
  fs.writeFileSync(R(p), content);
  const lines = content.replace(/\n$/, '').split('\n');
  const n = lines.length === 1 && lines[0] === '' ? 0 : lines.length;
  return snapshots.recordSnapshot(R(p), content, [[1, Math.max(1, n)]]);
}

function apply(input) {
  return hp.applyHashlinePatch(input, { resolvePath: R });
}

beforeEach(() => {
  hp.resetAll();
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hl-test-'));
});

describe('hashlinePatch', () => {
  it('PUT N.=M replaces lines and preserves trailing newline', () => {
    const tag = write('a.txt', 'one\ntwo\nthree\n');
    apply(`[a.txt#${tag}]\nPUT 2.=2:\n+TWO\n`);
    expect(fs.readFileSync(R('a.txt'), 'utf8')).toBe('one\nTWO\nthree\n');
  });

  it('PUT >$ appends at tail', () => {
    const tag = write('a.txt', 'a\nb\n');
    apply(`[a.txt#${tag}]\nPUT >$:\n+c\n`);
    expect(fs.readFileSync(R('a.txt'), 'utf8')).toBe('a\nb\nc\n');
  });

  it('PUT <1 inserts at head', () => {
    const tag = write('a.txt', 'a\n');
    apply(`[a.txt#${tag}]\nPUT <1:\n+zero\n`);
    expect(fs.readFileSync(R('a.txt'), 'utf8')).toBe('zero\na\n');
  });

  it('PUT <N / PUT >N insert around line N', () => {
    const tag = write('a.txt', '1\n2\n3\n');
    apply(`[a.txt#${tag}]\nPUT <2:\n+before\nPUT >2:\n+after\n`);
    expect(fs.readFileSync(R('a.txt'), 'utf8')).toBe('1\nbefore\n2\nafter\n3\n');
  });

  it('envelope is optional; content after End Patch ignored', () => {
    const tag = write('a.txt', 'x\ny\n');
    apply(`*** Begin Patch\n[a.txt#${tag}]\nPUT 1.=1:\n+X\n*** End Patch\nignored junk\n`);
    expect(fs.readFileSync(R('a.txt'), 'utf8')).toBe('X\ny\n');
  });

  it('literal +- and ++ body escapes', () => {
    const tag = write('l.txt', 'old\n');
    apply(`[l.txt#${tag}]\nPUT 1.=1:\n+- item\n++ item\n`);
    expect(fs.readFileSync(R('l.txt'), 'utf8')).toBe('- item\n+ item\n');
  });

  it('+ alone inserts a blank line', () => {
    const tag = write('b.txt', 'a\n');
    apply(`[b.txt#${tag}]\nPUT >1:\n+\n`);
    expect(fs.readFileSync(R('b.txt'), 'utf8')).toBe('a\n\n');
  });

  it('CUT deletes; anonymous register paste works in the same call', () => {
    const t1 = write('src.txt', 'keep\ncut me\nkeep2\n');
    const t2 = write('dst.txt', 'dst line\n');
    apply(`[src.txt#${t1}]\nCUT 2.=2\n[dst.txt#${t2}]\nPUT >1\n`);
    expect(fs.readFileSync(R('src.txt'), 'utf8')).toBe('keep\nkeep2\n');
    expect(fs.readFileSync(R('dst.txt'), 'utf8')).toBe('dst line\ncut me\n');
  });

  it('named registers persist across calls', () => {
    const t1 = write('n1.txt', 'payload\nx\n');
    apply(`[n1.txt#${t1}]\nCUT 1.=1 @keep\n`);
    expect(fs.readFileSync(R('n1.txt'), 'utf8')).toBe('x\n');
    const t2 = write('n2.txt', 'base\n');
    apply(`[n2.txt#${t2}]\nPUT >1 @keep\n`);
    expect(fs.readFileSync(R('n2.txt'), 'utf8')).toBe('base\npayload\n');
  });

  it('anonymous paste before any CUT fails', () => {
    const tag = write('p.txt', 'x\n');
    expect(() => apply(`[p.txt#${tag}]\nPUT >1\n`)).toThrow(/anonymous paste/);
    expect(fs.readFileSync(R('p.txt'), 'utf8')).toBe('x\n');
  });

  it('PUT N.=M @name replaces a range with a named register', () => {
    const t1 = write('r1.txt', 'a\nb\nc\n');
    apply(`[r1.txt#${t1}]\nCUT 1.=1 @seg\n`);
    const t2 = write('r2.txt', '1\n2\n3\n');
    apply(`[r2.txt#${t2}]\nPUT 2.=3 @seg\n`);
    expect(fs.readFileSync(R('r2.txt'), 'utf8')).toBe('1\na\n');
  });

  it('block anchor resolves braces (JS)', () => {
    const tag = write('s.js', 'function a() {\n  return 1;\n}\ntail();\n');
    apply(`[s.js#${tag}]\nPUT 1*:\n+function a() {\n+  return 2;\n+}\n`);
    expect(fs.readFileSync(R('s.js'), 'utf8')).toBe('function a() {\n  return 2;\n}\ntail();\n');
  });

  it('block anchor resolves markdown headings with subsections', () => {
    const tag = write('m.md', '# A\nintro\n## B\nbody\n# C\n');
    apply(`[m.md#${tag}]\nPUT 1*:\n+# A2\n+new\n`);
    expect(fs.readFileSync(R('m.md'), 'utf8')).toBe('# A2\nnew\n# C\n');
  });

  it('block anchor resolves python decorator + def', () => {
    const tag = write('d.py', '@cache\ndef g():\n    return 1\n\nprint(1)\n');
    apply(`[d.py#${tag}]\nPUT 1*:\n+@memo\n+def g():\n+    return 2\n`);
    expect(fs.readFileSync(R('d.py'), 'utf8')).toBe('@memo\ndef g():\n    return 2\n\nprint(1)\n');
  });

  it('single-line block anchor errors with guidance', () => {
    const tag = write('sl.js', 'const a = 1;\n');
    expect(() => apply(`[sl.js#${tag}]\nPUT 1*:\n+x\n`)).toThrow(/cannot resolve block anchor.*use explicit line range/s);
  });

  it('decorator line merges the next bracket block (TS)', () => {
    const tag = write('c.ts', '@Component({\n  sel: "x",\n})\nexport class A {\n  m() { return 1; }\n}\n');
    apply(`[c.ts#${tag}]\nPUT 1*:\n+@Injectable()\n+export class B {\n+  m() { return 2; }\n+}\n`);
    expect(fs.readFileSync(R('c.ts'), 'utf8')).toBe('@Injectable()\nexport class B {\n  m() { return 2; }\n}\n');
  });

  it('PUT >N* inserts after the resolved block', () => {
    const tag = write('ab.js', 'function a() {\n  return 1;\n}\nfunction b() {\n  return 2;\n}\n');
    apply(`[ab.js#${tag}]\nPUT >1*:\n+// between\n`);
    expect(fs.readFileSync(R('ab.js'), 'utf8')).toContain('}\n// between\nfunction b()');
  });

  it('PUT >N* falls back to >N with a warning for unresolvable blocks', () => {
    const tag = write('w.txt', 'plain\nanother\n');
    const rep = apply(`[w.txt#${tag}]\nPUT >1*:\n+inserted\n`);
    expect(rep[0].warnings.length).toBe(1);
    expect(fs.readFileSync(R('w.txt'), 'utf8')).toBe('plain\ninserted\nanother\n');
  });

  it('REM deletes the file', () => {
    const tag = write('r.txt', 'x\n');
    apply(`[r.txt#${tag}]\nREM\n`);
    expect(fs.existsSync(R('r.txt'))).toBe(false);
  });

  it('MV renames after edits (quoted dest)', () => {
    const tag = write('mv.txt', 'a\nb\n');
    apply(`[mv.txt#${tag}]\nPUT 1.=1:\n+A\nMV "renamed file.txt"\n`);
    expect(fs.existsSync(R('mv.txt'))).toBe(false);
    expect(fs.readFileSync(R('renamed file.txt'), 'utf8')).toBe('A\nb\n');
  });

  it('no-change edit fails', () => {
    const tag = write('n.txt', 'same\n');
    expect(() => apply(`[n.txt#${tag}]\nPUT 1.=1:\n+same\n`)).toThrow(/no change/);
    expect(fs.readFileSync(R('n.txt'), 'utf8')).toBe('same\n');
  });

  it('stale tag on unknown tag id fails', () => {
    write('s.txt', 'x\n');
    expect(() => apply(`[s.txt#FFFF]\nPUT 1.=1:\n+y\n`)).toThrow(/stale tag; re-read/);
  });

  it('stale tag recovers when file matches an older recorded version', () => {
    const t1 = write('st.txt', 'v1\n');
    apply(`[st.txt#${t1}]\nPUT 1.=1:\n+V1X\n`); // now v2 recorded
    const tLatest = snapshots.latestSnapshot(R('st.txt')).tag;
    fs.writeFileSync(R('st.txt'), 'v1\n'); // drift back to v1
    // tLatest is stale; t1 matches the current content -> recovery
    apply(`[st.txt#${t1}]\nPUT 1.=1:\n+V1Y\n`);
    expect(fs.readFileSync(R('st.txt'), 'utf8')).toBe('V1Y\n');
  });

  it('edits outside seen ranges are rejected', () => {
    fs.writeFileSync(R('u.txt'), '1\n2\n3\n4\n5\n');
    const tag = snapshots.recordSnapshot(R('u.txt'), '1\n2\n3\n4\n5\n', [[1, 2]]);
    expect(() => apply(`[u.txt#${tag}]\nPUT 4.=4:\n+X\n`)).toThrow(/not in read ranges/);
  });

  it('overlapping ranges are rejected', () => {
    const tag = write('o.txt', '1\n2\n3\n4\n5\n');
    expect(() => apply(`[o.txt#${tag}]\nPUT 2.=3:\n+x\nPUT 3.=4:\n+y\n`)).toThrow(/overlapping ranges/);
  });

  it('reversed range is rejected', () => {
    const tag = write('rv.txt', '1\n2\n3\n');
    expect(() => apply(`[rv.txt#${tag}]\nPUT 3.=1:\n+x\n`)).toThrow(/reversed range/);
  });

  it('multi-section call is atomic: second section failure aborts the first', () => {
    const t1 = write('p1.txt', 'one\n');
    const t2 = write('p2.txt', 'two\n');
    expect(() =>
      apply(`[p1.txt#${t1}]\nPUT 1.=1:\n+ONE\n[p2.txt#${t2}]\nPUT 9.=9:\n+X\n`)
    ).toThrow(/outside file/);
    expect(fs.readFileSync(R('p1.txt'), 'utf8')).toBe('one\n');
    expect(fs.readFileSync(R('p2.txt'), 'utf8')).toBe('two\n');
  });

  it('same-path sections merge: anchors refer to the original snapshot', () => {
    const tag = write('m.txt', '1\n2\n3\n');
    apply(`[m.txt#${tag}]\nPUT 1.=1:\n+A\n[m.txt#${tag}]\nPUT 3.=3:\n+C\n`);
    expect(fs.readFileSync(R('m.txt'), 'utf8')).toBe('A\n2\nC\n');
  });

  it('empty body is an error', () => {
    const tag = write('e.txt', 'x\n');
    expect(() => apply(`[e.txt#${tag}]\nPUT 1.=1:\n`)).toThrow(/empty body/);
  });

  it('body rows under bodyless ops are an error', () => {
    const tag = write('bb.txt', 'x\ny\n');
    expect(() => apply(`[bb.txt#${tag}]\nCUT 1.=1\n+stray\n`)).toThrow(/cannot parse operation/);
  });

  it('unified-diff -old rows are rejected', () => {
    const tag = write('ud.txt', 'x\n');
    expect(() => apply(`[ud.txt#${tag}]\nPUT 1.=1:\n-old\n+new\n`)).toThrow();
  });

  it('missing file errors with not found', () => {
    const tag = write('here.txt', 'x\n');
    expect(() => apply(`[gone.txt#${tag}]\nPUT 1.=1:\n+y\n`)).toThrow(/no snapshot for gone.txt/);
  });

  it('report carries fresh tag and op summary', () => {
    const tag = write('rep.txt', 'l1\nl2\nl3\n');
    const rep = apply(`[rep.txt#${tag}]\nPUT 2.=2:\n+L2\nPUT >3:\n+L4\n`);
    expect(rep).toHaveLength(1);
    expect(rep[0].tag).not.toBe(tag);
    expect(rep[0].tag).toMatch(/^[0-9A-F]{4}$/);
    expect(rep[0].opCount).toBe(2);
    expect(rep[0].opSummary).toEqual(['2.=2:', '>3:']);
  });

  it('adjacent gap-insert and replace compose correctly (regression: insert was consumed by replace)', () => {
    const tag = write('adj.txt', '1\n2\n3\n4\n5\n');
    apply(`[adj.txt#${tag}]\nPUT >2:\n+INS\nPUT 3.=4:\n+R\n`);
    expect(fs.readFileSync(R('adj.txt'), 'utf8')).toBe('1\n2\nINS\nR\n5\n');
  });

  it('gap insert strictly inside a replaced/cut range is rejected, file untouched', () => {
    const tag = write('int.txt', '1\n2\n3\n4\n5\n');
    expect(() => apply(`[int.txt#${tag}]\nPUT >3:\n+X\nPUT 3.=5:\n+R\n`)).toThrow(
      /insertion point lands inside a replaced\/cut range/
    );
    expect(fs.readFileSync(R('int.txt'), 'utf8')).toBe('1\n2\n3\n4\n5\n');
  });

  it('same-anchor inserts keep document order (regression: reversed)', () => {
    const tag = write('ord.txt', '1\n2\n3\n');
    apply(`[ord.txt#${tag}]\nPUT >2:\n+A\nPUT >2:\n+B\n`);
    expect(fs.readFileSync(R('ord.txt'), 'utf8')).toBe('1\n2\nA\nB\n3\n');
  });

  it('insert before a replaced range lands before the replacement body', () => {
    const tag = write('pre.txt', '1\n2\n3\n4\n5\n');
    apply(`[pre.txt#${tag}]\nPUT <3:\n+PRE\nPUT 3.=4:\n+R\n`);
    expect(fs.readFileSync(R('pre.txt'), 'utf8')).toBe('1\n2\nPRE\nR\n5\n');
  });

  it('insert after a CUT range lands after the cut boundary', () => {
    const tag = write('cutb.txt', '1\n2\n3\n4\n5\n');
    apply(`[cutb.txt#${tag}]\nCUT 2.=3\nPUT >3:\n+AFTER\n`);
    expect(fs.readFileSync(R('cutb.txt'), 'utf8')).toBe('1\nAFTER\n4\n5\n');
  });

  it('MV-only section renames without edits', () => {
    const tag = write('old.txt', 'data\n');
    const rep = apply(`[old.txt#${tag}]\nMV new.txt\n`);
    expect(fs.existsSync(R('old.txt'))).toBe(false);
    expect(fs.readFileSync(R('new.txt'), 'utf8')).toBe('data\n');
    expect(rep[0].mv).toBe('new.txt');
  });
});
