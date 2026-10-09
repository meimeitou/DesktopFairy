// vitest globals (globals: true) provide describe/it/expect in CJS tests
const utils = require('./agentBuiltinFsUtils.cjs');
const fs = require('fs');
const os = require('os');
const path = require('path');

let dir;
const F = (p) => path.join(dir, p);

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fsutils-'));
});

afterEach(() => {
  fs.rmSync(dir, { recursive: true, force: true });
});

describe('splitPathAndSel', () => {
  it('parses :N as open-ended from line N (pi semantics)', async () => {
    fs.writeFileSync(F('x.txt'), '1\n2\n3\n');
    const r = await utils.splitPathAndSel(F('x.txt') + ':3');
    expect(r.ranges).toEqual([{ start: 3, end: Infinity }]);
  });

  it('parses :A-B inclusive range', async () => {
    const r = await utils.splitPathAndSel('/tmp/f.txt:50-100');
    expect(r.ranges).toEqual([{ start: 50, end: 100 }]);
  });

  it('parses :A..B alias', async () => {
    const r = await utils.splitPathAndSel('/tmp/f.txt:5..9');
    expect(r.ranges).toEqual([{ start: 5, end: 9 }]);
  });

  it('parses :N- open-ended', async () => {
    const r = await utils.splitPathAndSel('/tmp/f.txt:7-');
    expect(r.ranges[0].start).toBe(7);
    expect(r.ranges[0].end).toBe(Infinity);
  });

  it('parses :A+C count form', async () => {
    const r = await utils.splitPathAndSel('/tmp/f.txt:50+20');
    expect(r.ranges).toEqual([{ start: 50, end: 69 }]);
  });

  it('parses multi ranges sorted+merged', async () => {
    const r = await utils.splitPathAndSel('/tmp/f.txt:960-973,5-16');
    expect(r.ranges).toEqual([{ start: 5, end: 16 }, { start: 960, end: 973 }]);
  });

  it('merges adjacent ranges', async () => {
    const r = await utils.splitPathAndSel('/tmp/f.txt:1-2,3-4');
    expect(r.ranges).toEqual([{ start: 1, end: 4 }]);
  });

  it('parses :raw with no ranges', async () => {
    const r = await utils.splitPathAndSel('/tmp/f.txt:raw');
    expect(r.isRaw).toBe(true);
    expect(r.ranges).toEqual([]);
  });

  it('parses :range:raw combined', async () => {
    const r = await utils.splitPathAndSel('/tmp/f.txt:50-100:raw');
    expect(r.isRaw).toBe(true);
    expect(r.ranges).toEqual([{ start: 50, end: 100 }]);
  });

  it('parses :raw:range combined', async () => {
    const r = await utils.splitPathAndSel('/tmp/f.txt:raw:50-100');
    expect(r.isRaw).toBe(true);
    expect(r.ranges).toEqual([{ start: 50, end: 100 }]);
  });

  it('literal path wins over selector-looking suffix', async () => {
    const weird = F('weird:50-100');
    fs.writeFileSync(weird, 'colon\n');
    const r = await utils.splitPathAndSel(weird);
    expect(r.ranges).toEqual([]);
    expect(r.filePath).toBe(weird);
  });

  it('unrecognized trailing :... stays part of the path', async () => {
    const r = await utils.splitPathAndSel('/tmp/archive.zip:inner/file');
    expect(r.ranges).toEqual([]);
    expect(r.filePath).toContain('archive.zip:inner/file');
  });

  it('rejects :0 with pi error text', async () => {
    await expect(utils.splitPathAndSel('/tmp/f.txt:0')).rejects.toThrow(
      'Line selector 0 is invalid; lines are 1-indexed. Use :1.'
    );
  });

  it('rejects +count < 1', async () => {
    await expect(utils.splitPathAndSel('/tmp/f.txt:5+0')).rejects.toThrow(/\+count/);
  });

  it('rejects reversed range', async () => {
    await expect(utils.splitPathAndSel('/tmp/f.txt:9-3')).rejects.toThrow(/Range end 3 before start 9/);
  });
});

describe('parseFindPattern', () => {
  it('no glob chars → the path itself', () => {
    expect(utils.parseFindPattern('src')).toEqual({ basePath: 'src', glob: '', hasGlob: false });
  });

  it('glob in first segment → base . with recursive prefix', () => {
    expect(utils.parseFindPattern('*.ts')).toEqual({ basePath: '.', glob: '**/*.ts', hasGlob: true });
  });

  it('explicit recursion preserved', () => {
    expect(utils.parseFindPattern('src/**/*.ts')).toEqual({ basePath: 'src', glob: '**/*.ts', hasGlob: true });
  });

  it('glob later in path splits at first glob segment', () => {
    expect(utils.parseFindPattern('src/*.ts')).toEqual({ basePath: 'src', glob: '*.ts', hasGlob: true });
  });

  it('deep path with mid glob', () => {
    expect(utils.parseFindPattern('a/b/*.md')).toEqual({ basePath: 'a/b', glob: '*.md', hasGlob: true });
  });
});

describe('formatGroupedPaths', () => {
  it('folds single-child chains and prefixes levels with #', () => {
    const out = utils.formatGroupedPaths([
      'src/a/one.ts',
      'src/a/two.ts',
      'src/b/three.ts',
      'README.md',
    ]);
    const lines = out.split('\n');
    expect(lines).toContain('README.md');
    expect(lines).toContain('# src/');
    expect(lines).toContain('## a/');
    expect(lines).toContain('## b/');
    expect(lines).toContain('one.ts');
    expect(lines).toContain('three.ts');
    // root file listed without header group
    expect(lines[0]).toBe('README.md');
  });

  it('deep single chain folds into one header', () => {
    const out = utils.formatGroupedPaths(['a/b/c/only.txt']);
    expect(out).toBe('# a/b/c/\nonly.txt');
  });

  it('empty input yields empty string', () => {
    expect(utils.formatGroupedPaths([])).toBe('');
  });
});

describe('formatHashlineRead', () => {
  it('emits header and LINE:TEXT rows', () => {
    const out = utils.formatHashlineRead('x.ts', 'AB12', ['a', 'b', 'c'], [{ start: 1, end: 2 }]);
    expect(out).toBe('[x.ts#AB12]\n1:a\n2:b');
  });

  it('omits header when tag is null', () => {
    const out = utils.formatHashlineRead('x.ts', null, ['a'], [{ start: 1, end: 1 }]);
    expect(out).toBe('1:a');
  });

  it('raw mode emits bare text without line prefixes', () => {
    const out = utils.formatHashlineRead('x.ts', null, ['a', 'b'], [{ start: 1, end: 2 }], { isRaw: true });
    expect(out).toBe('a\nb');
  });

  it('truncates lines beyond MAX_LINE_LENGTH', () => {
    const long = 'x'.repeat(2500);
    const out = utils.formatHashlineRead('x.ts', 'AB12', [long], [{ start: 1, end: 1 }]);
    expect(out.split('\n')[1].length).toBeLessThanOrEqual(utils.MAX_LINE_LENGTH + String(1).length + 1);
  });
});

describe('formatAnchoredGrep', () => {
  it('renders match/context markers under file headers', () => {
    const out = utils.formatAnchoredGrep([
      { relPath: 'a.ts', tag: 'C1D2', entries: [
        { line: 4, text: 'const x = 1;', isMatch: true },
        { line: 5, text: '// ctx', isMatch: false },
      ] },
    ]);
    expect(out).toBe('[a.ts#C1D2]\n*4:const x = 1;\n 5:// ctx');
  });

  it('no matches message', () => {
    expect(utils.formatAnchoredGrep([], {})).toBe('No matches found');
  });

  it('empty page with skip shows No more results', () => {
    const out = utils.formatAnchoredGrep([], { nextPageSkip: 3 });
    expect(out).toContain('No more results');
  });

  it('next-page hint appears after rendered files', () => {
    const out = utils.formatAnchoredGrep([
      { relPath: 'a.ts', tag: null, entries: [{ line: 1, text: 'x', isMatch: true }] },
    ], { nextPageSkip: 2 });
    expect(out).toContain('Use skip=2 for the next page');
  });

  it('truncates lines beyond GREP_MAX_COLUMN with ellipsis', () => {
    const long = 'y'.repeat(600);
    const out = utils.formatAnchoredGrep([
      { relPath: 'a.ts', tag: null, entries: [{ line: 1, text: long, isMatch: true }] },
    ]);
    expect(out).toContain('…');
  });
});
