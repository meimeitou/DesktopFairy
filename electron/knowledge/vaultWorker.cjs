'use strict';
const { parentPort, workerData } = require('worker_threads');
const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const { allowedPath, assertRoot, resolveFile, readFile, textTokens, matchQuery, parseNote, lineChunks, readLines, listDirectories } = require('./vaultFiles.cjs');
const dbs = new Map();
const cancelled = new Set();
const active = new Set();
const scanning = new Map();
const yieldTurn = () => new Promise((resolve) => setImmediate(resolve));
function check(id) { if (cancelled.has(id)) throw new Error('操作已取消'); }
function open(vault) {
  let db = dbs.get(vault.id);
  if (db) return db;
  fs.mkdirSync(workerData.indexDir, { recursive: true });
  db = new Database(path.join(workerData.indexDir, vault.id + '.sqlite'));
  db.pragma('journal_mode = WAL');
  db.exec(`CREATE TABLE IF NOT EXISTS files(path TEXT PRIMARY KEY, mtime REAL, size INTEGER, title TEXT, aliases TEXT, tags TEXT);
    CREATE TABLE IF NOT EXISTS chunks(id INTEGER PRIMARY KEY, path TEXT, start_line INTEGER, end_line INTEGER, text TEXT);
    CREATE INDEX IF NOT EXISTS chunks_path ON chunks(path);
    CREATE VIRTUAL TABLE IF NOT EXISTS search USING fts5(title, aliases, tags, path, body, tokenize='unicode61');`);
  dbs.set(vault.id, db);
  return db;
}
function removeFile(db, file) {
  db.prepare('DELETE FROM search WHERE rowid IN (SELECT id FROM chunks WHERE path=?)').run(file);
  db.prepare('DELETE FROM chunks WHERE path=?').run(file);
  db.prepare('DELETE FROM files WHERE path=?').run(file);
}
function indexFile(db, vault, relative) {
  const { text, stat } = readFile(vault, relative);
  const note = parseNote(text, relative);
  db.transaction(() => {
    removeFile(db, relative);
    db.prepare('INSERT INTO files VALUES(?,?,?,?,?,?)').run(relative, stat.mtimeMs, stat.size, note.title, JSON.stringify(note.aliases), JSON.stringify(note.tags));
    const chunkStmt = db.prepare('INSERT INTO chunks(path,start_line,end_line,text) VALUES(?,?,?,?)');
    const searchStmt = db.prepare('INSERT INTO search(rowid,title,aliases,tags,path,body) VALUES(?,?,?,?,?,?)');
    for (const chunk of lineChunks(text)) {
      const row = chunkStmt.run(relative, chunk.startLine, chunk.endLine, chunk.text);
      searchStmt.run(row.lastInsertRowid, textTokens(note.title), textTokens(note.aliases.join(' ')), textTokens(note.tags.join(' ')), textTokens(relative), textTokens(chunk.text));
    }
  })();
  return note.warning;
}
async function scan(vault, rebuild, id) {
  // Serialize scans per vault, including rebuild requests arriving during an ordinary scan.
  const previous = scanning.get(vault.id) || Promise.resolve();
  const task = previous.catch(() => {}).then(async () => {
    const root = assertRoot(vault);
    if (rebuild) {
      dbs.get(vault.id)?.close(); dbs.delete(vault.id);
      for (const suffix of ['', '-wal', '-shm']) fs.rmSync(path.join(workerData.indexDir, vault.id + '.sqlite' + suffix), { force: true });
    }
    const db = open(vault);
    const seen = new Set();
    const errors = [];
    let processed = 0, discovered = 0;
    const report = () => parentPort.postMessage({ status: { baseId: vault.id, state: 'indexing', processed, discovered, fileCount: db.prepare('SELECT count(*) n FROM files').get().n, errors: [...errors] } });
    report();
    async function walk(dir, prefix = '') {
      check(id);
      const entries = await fs.promises.readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        check(id);
        const relative = prefix + entry.name;
        if (entry.isSymbolicLink() || !allowedPath(relative, vault.excludes, entry.isDirectory())) continue;
        if (entry.isDirectory()) { await walk(path.join(dir, entry.name), relative + '/'); continue; }
        if (!entry.isFile()) continue;
        seen.add(relative); discovered++;
        try {
          const stat = fs.statSync(resolveFile(vault, relative));
          const old = db.prepare('SELECT mtime,size FROM files WHERE path=?').get(relative);
          if (rebuild || !old || old.mtime !== stat.mtimeMs || old.size !== stat.size) {
            const warning = indexFile(db, vault, relative);
            if (warning && errors.length < 20) errors.push(relative + ': ' + warning);
          }
        } catch (error) {
          db.transaction(() => removeFile(db, relative))();
          if (errors.length < 20) errors.push(relative + ': ' + error.message);
        }
        processed++;
        if (processed % 100 === 0) { report(); await yieldTurn(); }
      }
    }
    await walk(root);
    check(id);
    db.transaction(() => {
      for (const row of db.prepare('SELECT path FROM files').all()) if (!seen.has(row.path)) removeFile(db, row.path);
    })();
    const status = { baseId: vault.id, state: 'ready', processed, discovered, fileCount: db.prepare('SELECT count(*) n FROM files').get().n, errors, updatedAt: Date.now() };
    parentPort.postMessage({ status });
    return status;
  });
  scanning.set(vault.id, task);
  try { return await task; } finally { if (scanning.get(vault.id) === task) scanning.delete(vault.id); }
}
function search(vaults, args, id) {
  const query = matchQuery(String(args.query || '').slice(0, 1000));
  if (!query) return { hits: [], errors: [] };
  const terms = query.split(' AND ');
  const limit = Math.max(1, Math.min(50, Math.floor(Number(args.limit) || 10)));
  const hits = [], errors = [];
  for (const vault of vaults) {
    check(id);
    try {
      assertRoot(vault);
      const db = open(vault);
      // Match each query term independently, then intersect at file level. A
      // phrase may span chunks, so requiring the full AND expression on one
      // FTS row incorrectly discarded otherwise matching notes.
      const termCtes = terms.map((_, index) =>
        `SELECT search.rowid chunk_id, ${index} term_index, bm25(search,8,6,5,3,1) rank FROM search WHERE search MATCH ?`,
      ).join(' UNION ALL ');
      const rows = db.prepare(`WITH term_hits AS MATERIALIZED (${termCtes}),
        file_hits AS (
          SELECT c.path, count(DISTINCT th.term_index) matched_terms, sum(th.rank) rank
          FROM term_hits th JOIN chunks c ON c.id=th.chunk_id
          GROUP BY c.path HAVING matched_terms=?
        ),
        best_chunk AS (
          SELECT c.path,c.start_line,c.end_line,
            row_number() OVER (PARTITION BY c.path ORDER BY th.rank ASC) row_num
          FROM term_hits th JOIN chunks c ON c.id=th.chunk_id
        )
        SELECT fh.path,bc.start_line,bc.end_line,f.title,f.aliases,f.tags,fh.rank
        FROM file_hits fh JOIN best_chunk bc ON bc.path=fh.path AND bc.row_num=1
        JOIN files f ON f.path=fh.path ORDER BY fh.rank LIMIT ?`).all(...terms, terms.length, limit * 3);
      const paths = new Set();
      for (const row of rows) {
        if (paths.has(row.path)) continue;
        try {
          // Search snippets always come from the current source, never offline cached text.
          const source = readLines(vault, { path: row.path, startLine: row.start_line, endLine: row.end_line });
          paths.add(row.path);
          const terms = query.split(' AND ').map((term) => term.slice(1, -1));
          const matches = (value) => terms.some((term) => textTokens(value).includes(term));
          const matchedBy = [
            matches(row.title) && '标题', matches(JSON.parse(row.aliases).join(' ')) && '别名',
            matches(JSON.parse(row.tags).join(' ')) && '标签', matches(row.path) && '路径',
          ].filter(Boolean);
          const lines = source.text.split('\n');
          let bodyStart = 0;
          if (source.startLine === 1 && lines[0] === '---') {
            const frontEnd = lines.findIndex((line, index) => index > 0 && /^(---|\.\.\.)\s*$/.test(line));
            if (frontEnd >= 0) bodyStart = frontEnd + 1;
          }
          let matchLine = lines.findIndex((line, index) => index >= bodyStart && matches(line));
          if (matchLine >= 0) matchedBy.push('正文');
          else matchLine = bodyStart;
          const snippetStart = Math.max(bodyStart, matchLine - 2);
          const snippet = lines.slice(snippetStart, Math.min(lines.length, matchLine + 5)).join('\n').slice(0, 4000);
          const startLine = source.startLine + snippetStart;
          hits.push({ baseId: vault.id, baseName: vault.name, path: row.path, title: row.title,
            text: snippet, startLine, endLine: startLine + snippet.split('\n').length - 1,
            matchedBy, score: -row.rank });
        } catch { /* Deleted, excluded, moved or inaccessible since indexing. */ }
      }
    } catch (error) { errors.push({ baseId: vault.id, message: error.message }); }
  }
  return { hits: hits.sort((a, b) => b.score - a.score || a.path.localeCompare(b.path)).slice(0, limit), errors };
}
function resolveLink(vault, args) {
  resolveFile(vault, args.sourcePath);
  let link = String(args.link || '').trim().replace(/^!?(?:\[\[)/, '').replace(/\]\]$/, '').split('|')[0];
  const markdown = link.match(/^\[[^\]]*\]\((.*)\)$/);
  if (markdown) link = markdown[1];
  try { link = decodeURIComponent(link); } catch { throw new Error('链接编码无效'); }
  if (/^[\w+.-]+:/.test(link) || link.startsWith('/') || link.includes('\\')) throw new Error('仅支持 vault 内部链接');
  const hash = link.indexOf('#');
  const anchor = hash >= 0 ? link.slice(hash + 1) : '';
  const target = hash >= 0 ? link.slice(0, hash) : link;
  const db = open(vault);
  let candidates = [];
  const tryPath = (p) => {
    for (const name of /\.(md|markdown)$/i.test(p) ? [p] : [p + '.md', p + '.markdown']) {
      try { resolveFile(vault, name); return [{ path: name }]; } catch { /* try next */ }
    }
    return [];
  };
  if (!target) candidates = [{ path: args.sourcePath }];
  else {
    candidates = tryPath(path.posix.normalize(path.posix.join(path.posix.dirname(args.sourcePath), target)));
    if (!candidates.length) candidates = tryPath(path.posix.normalize(target));
    if (!candidates.length && !target.includes('/')) {
      const name = target.replace(/\.(md|markdown)$/i, '').normalize('NFKC').toLowerCase();
      candidates = db.prepare('SELECT path,title,aliases FROM files').all().filter((row) =>
        [path.posix.basename(row.path).replace(/\.(md|markdown)$/i, ''), ...JSON.parse(row.aliases)].some((s) => s.normalize('NFKC').toLowerCase() === name));
    }
  }
  candidates = candidates.filter((row) => { try { resolveFile(vault, row.path); return true; } catch { return false; } });
  if (candidates.length !== 1) return { baseId: vault.id, candidates: candidates.slice(0, 50).map(({ path, title }) => ({ path, title })), ambiguous: candidates.length > 1 };
  const relative = candidates[0].path;
  let startLine = 1;
  if (anchor) {
    const { text } = readFile(vault, relative);
    const normalize = (s) => s.replace(/\s+/g, '-').toLowerCase();
    const index = text.split('\n').findIndex((line) => {
      const heading = line.match(/^#{1,6}\s+(.+?)\s*#*\s*$/)?.[1];
      return heading && (heading === anchor || normalize(heading) === normalize(anchor));
    });
    if (index < 0) throw new Error('未找到标题锚点');
    startLine = index + 1;
  }
  return { baseId: vault.id, path: relative, startLine, anchor, ambiguous: false };
}
parentPort.on('message', async ({ id, method, vaults = [], args = {} }) => {
  if (method === 'cancel') { if (active.has(id)) cancelled.add(id); return; }
  active.add(id);
  try {
    check(id);
    let result;
    if (method === 'scan') result = await scan(vaults[0], args.rebuild, id);
    else if (method === 'search') result = search(vaults, args, id);
    else if (method === 'directories') result = await listDirectories(vaults[0], args);
    else if (method === 'read') result = readLines(vaults[0], args);
    else if (method === 'resolve') result = resolveLink(vaults[0], args);
    else if (method === 'drop') {
      await scanning.get(vaults[0].id)?.catch(() => {});
      const db = dbs.get(vaults[0].id); db?.close(); dbs.delete(vaults[0].id);
      for (const suffix of ['', '-wal', '-shm']) fs.rmSync(path.join(workerData.indexDir, vaults[0].id + '.sqlite' + suffix), { force: true });
      result = { ok: true };
    } else throw new Error('未知知识库操作');
    check(id);
    parentPort.postMessage({ id, result });
  } catch (error) { parentPort.postMessage({ id, error: error.message }); }
  finally { cancelled.delete(id); active.delete(id); }
});
