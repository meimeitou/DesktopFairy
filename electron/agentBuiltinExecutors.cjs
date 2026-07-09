const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');
const { execFile } = require('child_process');
const { promisify } = require('util');
const { app } = require('electron');
const { runCommandInRenderer } = require('./terminalAgentService.cjs');
const {
  resolveBashTimeoutMs,
  formatTimeoutLabel,
} = require('./bashTimeout.cjs');
const {
  DEFAULT_READ_LIMIT,
  MAX_FILES_LIMIT,
  MAX_GREP_MATCHES,
  MAX_LINE_LENGTH,
  MAX_READ_BYTES,
  expandPath,
  resolveAgentPath,
  isBinaryFile,
  replaceWithFuzzyMatch,
  runRipgrep,
  formatReadOutput,
  formatGrepMatches,
} = require('./agentBuiltinFsUtils.cjs');

const execFileAsync = promisify(execFile);
const MAX_FETCH_BYTES = 512 * 1024;
const todosByRequest = new Map();
const AGENT_FS_BASE = () => os.homedir();

function ok(data) {
  return JSON.stringify({ ok: true, ...data });
}

function fail(message) {
  return JSON.stringify({ ok: false, error: message });
}

async function toolRead(args) {
  const filePath = resolveAgentPath(args?.file_path, AGENT_FS_BASE());
  if (!filePath) return fail('file_path required');
  try {
    const stat = await fs.promises.stat(filePath);
    if (!stat.isFile()) return fail(`Path is not a file: ${args?.file_path}`);
    if (stat.size > MAX_READ_BYTES) return fail(`File too large (max ${MAX_READ_BYTES} bytes)`);
    if (await isBinaryFile(filePath)) return fail(`Cannot read binary file: ${args?.file_path}`);
    const content = await fs.promises.readFile(filePath, 'utf8');
    const lines = content.split('\n');
    const offset = Math.max(0, (Number(args?.offset) || 1) - 1);
    const limit = Number(args?.limit) || DEFAULT_READ_LIMIT;
    if (offset >= lines.length) {
      return fail(`Invalid offset: ${offset + 1}. File has ${lines.length} lines.`);
    }
    const text = formatReadOutput(filePath, AGENT_FS_BASE(), lines, offset, limit);
    return ok({ file_path: filePath, content: text });
  } catch (e) {
    if (e?.code === 'ENOENT') return fail(`File not found: ${args?.file_path}`);
    return fail(String(e?.message || e));
  }
}

async function toolWrite(args) {
  const filePath = resolveAgentPath(args?.file_path, AGENT_FS_BASE());
  if (!filePath) return fail('file_path required');
  const content = String(args?.content ?? '');
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
    const relativePath = path.relative(AGENT_FS_BASE(), filePath);
    const action = isOverwrite ? 'Updated' : 'Created';
    const lineCount = content.split('\n').length;
    return ok({
      file_path: filePath,
      message: `${action} file: ${relativePath}\nSize: ${content.length} bytes\nLines: ${lineCount}`,
    });
  } catch (e) {
    return fail(String(e?.message || e));
  }
}

async function applyEdit(filePath, oldString, newString, replaceAll) {
  if (oldString === newString) {
    throw new Error('old_string and new_string must be different');
  }
  if (oldString === '') {
    await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
    await fs.promises.writeFile(filePath, newString, 'utf8');
    return { created: true, content: newString };
  }
  const content = await fs.promises.readFile(filePath, 'utf8');
  const next = replaceWithFuzzyMatch(content, oldString, newString, replaceAll);
  await fs.promises.writeFile(filePath, next, 'utf8');
  return { created: false, content: next, previous: content };
}

async function toolEdit(args) {
  const filePath = resolveAgentPath(args?.file_path, AGENT_FS_BASE());
  if (!filePath) return fail('file_path required');
  const oldString = String(args?.old_string ?? '');
  const newString = String(args?.new_string ?? '');
  try {
    if (oldString !== '' && !fs.existsSync(filePath)) {
      return fail(`File not found: ${args?.file_path}`);
    }
    const result = await applyEdit(filePath, oldString, newString, !!args?.replace_all);
    const relativePath = path.relative(AGENT_FS_BASE(), filePath);
    if (result.created) {
      return ok({
        file_path: filePath,
        message: `Created new file: ${relativePath}\nLines: ${newString.split('\n').length}`,
      });
    }
    const oldLines = result.previous.split('\n').length;
    const newLines = result.content.split('\n').length;
    const lineDiff = newLines - oldLines;
    let message = `Edited: ${relativePath}`;
    if (lineDiff > 0) message += `\n+${lineDiff} lines`;
    else if (lineDiff < 0) message += `\n${lineDiff} lines`;
    return ok({ file_path: filePath, message });
  } catch (e) {
    return fail(String(e?.message || e));
  }
}

async function toolMultiEdit(args) {
  const filePath = resolveAgentPath(args?.file_path, AGENT_FS_BASE());
  if (!filePath || !fs.existsSync(filePath)) return fail('File not found');
  const edits = Array.isArray(args?.edits) ? args.edits : [];
  try {
    for (const edit of edits) {
      await applyEdit(
        filePath,
        String(edit?.old_string ?? ''),
        String(edit?.new_string ?? ''),
        !!edit?.replace_all
      );
    }
    const relativePath = path.relative(AGENT_FS_BASE(), filePath);
    return ok({ file_path: filePath, message: `Edited: ${relativePath} (${edits.length} edits)` });
  } catch (e) {
    return fail(String(e?.message || e));
  }
}

async function toolBash(args, envVars = {}, deps = {}) {
  const command = String(args?.command || '').trim();
  if (!command) return fail('Empty command');
  if (args?.run_in_background) {
    return fail('Background shell is not supported in DesktopFairy yet');
  }
  const timeoutMs = resolveBashTimeoutMs(args?.timeout);
  const shell = process.env.SHELL || '/bin/zsh';
  const signal = deps?.signal;

  return new Promise((resolve) => {
    let stdout = '';
    let stderr = '';
    let settled = false;
    let killTimer = null;

    const finish = (payload) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (killTimer) clearTimeout(killTimer);
      if (signal && onAbort) signal.removeEventListener('abort', onAbort);
      resolve(payload);
    };

    const child = spawn(shell, ['-lc', command], {
      env: { ...process.env, ...envVars },
      cwd: os.homedir(),
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

    const timer = setTimeout(() => {
      killProcessTree('SIGTERM');
      killTimer = setTimeout(() => killProcessTree('SIGKILL'), 5000);
      const label = formatTimeoutLabel(timeoutMs);
      finish(ok({
        stdout,
        stderr: stderr || `Command timed out after ${label}`,
        exitCode: 124,
        timedOut: true,
        timeoutMs,
      }));
    }, timeoutMs);

    const onAbort = () => {
      killProcessTree('SIGTERM');
      killTimer = setTimeout(() => killProcessTree('SIGKILL'), 2000);
      finish(ok({ stdout, stderr: stderr || 'Aborted', exitCode: 130, aborted: true }));
    };

    if (signal) {
      if (signal.aborted) onAbort();
      else signal.addEventListener('abort', onAbort, { once: true });
    }

    child.stdout?.on('data', (chunk) => { stdout += String(chunk); });
    child.stderr?.on('data', (chunk) => { stderr += String(chunk); });
    child.on('error', (e) => {
      finish(ok({ stdout, stderr: String(e?.message || e), exitCode: 1 }));
    });
    child.on('close', (code) => {
      finish(ok({ stdout: String(stdout || ''), stderr: String(stderr || ''), exitCode: code ?? 0 }));
    });
  });
}

async function toolGlob(args) {
  const pattern = String(args?.pattern || '').trim();
  if (!pattern) return fail('pattern required');
  const searchPath = resolveAgentPath(args?.path || AGENT_FS_BASE(), AGENT_FS_BASE());
  try {
    const stat = await fs.promises.stat(searchPath);
    if (!stat.isDirectory()) return fail(`Path is not a directory: ${args?.path || searchPath}`);
  } catch (e) {
    if (e?.code === 'ENOENT') return fail(`Directory not found: ${searchPath}`);
    return fail(String(e?.message || e));
  }

  const rgArgs = [
    '--files',
    '--follow',
    '--hidden',
    `--glob=${pattern}`,
    '--glob=!.git/*',
    '--glob=!node_modules/*',
    '--glob=!dist/*',
    '--glob=!build/*',
    '--glob=!__pycache__/*',
    searchPath,
  ];

  const files = [];
  let truncated = false;
  const rgResult = await runRipgrep(rgArgs);
  if (rgResult.ok && rgResult.stdout.length > 0) {
    for (const line of rgResult.stdout.split('\n').filter(Boolean)) {
      if (files.length >= MAX_FILES_LIMIT) {
        truncated = true;
        break;
      }
      const filePath = line.trim();
      if (!filePath) continue;
      const absolutePath = path.isAbsolute(filePath) ? filePath : path.resolve(searchPath, filePath);
      try {
        const stats = await fs.promises.stat(absolutePath);
        files.push({ path: absolutePath, modified: stats.mtime });
      } catch {
        /* skip */
      }
    }
  }

  files.sort((a, b) => (b.modified?.getTime() || 0) - (a.modified?.getTime() || 0));
  const output = [];
  if (files.length === 0) {
    output.push(`No files found matching pattern "${pattern}" in ${searchPath}`);
  } else {
    output.push(...files.map((f) => f.path));
    if (truncated) {
      output.push('');
      output.push(`(Results truncated to ${MAX_FILES_LIMIT} files. Consider using a more specific pattern.)`);
    }
  }
  return ok({ matches: files.map((f) => f.path), output: output.join('\n'), cwd: searchPath });
}

async function toolGrep(args) {
  const pattern = String(args?.pattern || '').trim();
  if (!pattern) return fail('pattern required');
  const searchPath = resolveAgentPath(args?.path || AGENT_FS_BASE(), AGENT_FS_BASE());
  const outputMode = args?.output_mode || 'content';

  const rgArgs = [
    '--no-heading',
    '--line-number',
    '--color',
    'never',
    '--glob',
    '!.git/**',
    '--glob',
    '!node_modules/**',
    '--glob',
    '!dist/**',
    '--glob',
    '!build/**',
    '--glob',
    '!__pycache__/**',
  ];
  if (args?.['-i']) rgArgs.push('--ignore-case');
  if (args?.glob) rgArgs.push('--glob', String(args.glob));
  if (outputMode === 'files_with_matches') rgArgs.push('-l');
  if (outputMode === 'count') rgArgs.push('-c');
  if (args?.head_limit) rgArgs.push('--max-count', String(args.head_limit));
  rgArgs.push('--', pattern, searchPath);

  const matches = [];
  let truncated = false;

  const rgResult = await runRipgrep(rgArgs);
  if (rgResult.ok && rgResult.exitCode !== null && rgResult.exitCode !== 2) {
    for (const line of rgResult.stdout.split('\n').filter(Boolean)) {
      if (matches.length >= MAX_GREP_MATCHES) {
        truncated = true;
        break;
      }
      const firstColon = line.indexOf(':');
      const secondColon = line.indexOf(':', firstColon + 1);
      if (firstColon === -1 || secondColon === -1) continue;
      const filePart = line.slice(0, firstColon);
      const linePart = line.slice(firstColon + 1, secondColon);
      const contentPart = line.slice(secondColon + 1);
      const lineNum = Number.parseInt(linePart, 10);
      if (!Number.isFinite(lineNum)) continue;
      const absoluteFilePath = path.isAbsolute(filePart) ? filePart : path.resolve(searchPath, filePart);
      const truncatedLine =
        contentPart.length > MAX_LINE_LENGTH ? contentPart.substring(0, MAX_LINE_LENGTH) + '...' : contentPart;
      matches.push({ file: absoluteFilePath, line: lineNum, content: truncatedLine.trim() });
    }
  }

  if (outputMode === 'files_with_matches') {
    const unique = [...new Set(matches.map((m) => m.file))];
    return ok({ output: unique.join('\n') || '' });
  }
  if (outputMode === 'count') {
    return ok({ output: String(matches.length) });
  }

  const output = formatGrepMatches(matches, truncated);
  return ok({ output, matchCount: matches.length });
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

  const settingsPath = path.join(app.getPath('userData'), 'da_settings.json');
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

  for (const win of deps.getWindows?.() || []) {
    try {
      if (win && !win.isDestroyed()) {
        win.webContents.send('settings:updated', settings);
      }
    } catch {
      /* window gone */
    }
  }

  const label = field === 'soul' ? 'SOUL.md' : 'USER.md';
  const verb = action === 'replace' ? '已替换' : '已追加到';
  return ok({ message: `${verb} ${label}`, field, action });
}

async function toolNotebookRead(args) {
  const notebookPath = resolveAgentPath(args?.notebook_path, AGENT_FS_BASE());
  if (!notebookPath || !fs.existsSync(notebookPath)) return fail('Notebook not found');
  try {
    const raw = await fs.promises.readFile(notebookPath, 'utf8');
    const nb = JSON.parse(raw);
    const cells = (nb?.cells || []).map((cell, index) => ({
      index,
      id: cell?.id || String(index),
      cell_type: cell?.cell_type,
      source: Array.isArray(cell?.source) ? cell.source.join('') : String(cell?.source || ''),
    }));
    return ok({ notebook_path: notebookPath, cells });
  } catch (e) {
    return fail(String(e?.message || e));
  }
}

async function toolNotebookEdit(args) {
  const notebookPath = resolveAgentPath(args?.notebook_path, AGENT_FS_BASE());
  if (!notebookPath || !fs.existsSync(notebookPath)) return fail('Notebook not found');
  const editMode = args?.edit_mode || 'replace';
  try {
    const raw = await fs.promises.readFile(notebookPath, 'utf8');
    const nb = JSON.parse(raw);
    if (!Array.isArray(nb.cells)) nb.cells = [];
    const cellType = args?.cell_type || 'code';
    const newSource = String(args?.new_source ?? '');

    if (editMode === 'insert') {
      nb.cells.push({ cell_type: cellType, source: newSource, metadata: {} });
    } else if (editMode === 'delete') {
      const idx = nb.cells.findIndex((c, i) => String(c?.id || i) === String(args?.cell_id ?? ''));
      if (idx >= 0) nb.cells.splice(idx, 1);
      else return fail('cell not found');
    } else {
      const idx = nb.cells.findIndex((c, i) => String(c?.id || i) === String(args?.cell_id ?? '0'));
      const target = idx >= 0 ? nb.cells[idx] : nb.cells[0];
      if (!target) return fail('cell not found');
      target.source = newSource;
      if (args?.cell_type) target.cell_type = cellType;
    }

    await fs.promises.writeFile(notebookPath, `${JSON.stringify(nb, null, 2)}\n`, 'utf8');
    return ok({ notebook_path: notebookPath });
  } catch (e) {
    return fail(String(e?.message || e));
  }
}

function unbindMcpServerFromAgent(serverId, deps) {
  const settingsPath = path.join(app.getPath('userData'), 'da_settings.json');
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
  for (const win of deps.getWindows?.() || []) {
    try {
      if (win && !win.isDestroyed()) {
        win.webContents.send('settings:updated', settings);
      }
    } catch {
      /* window gone */
    }
  }
}

function bindMcpServerToAgent(serverId, deps) {
  const settingsPath = path.join(app.getPath('userData'), 'da_settings.json');
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
  for (const win of deps.getWindows?.() || []) {
    try {
      if (win && !win.isDestroyed()) {
        win.webContents.send('settings:updated', settings);
      }
    } catch {
      /* window gone */
    }
  }
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

  function summarize(server) {
    if (!server) return null;
    const status = getStatus(server.id) || { state: 'disabled' };
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
      bound: boundIds.has(server.id),
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
    try {
      const client = await getOrCreateClient(server);
      const { tools } = await client.listTools();
      return ok({
        serverId: server.id,
        serverName: server.name,
        tools: (tools || []).map((t) => ({
          name: t.name,
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
  const timeoutMs = resolveBashTimeoutMs(args?.timeout);
  // SSH 会话的命令必须在远程执行 —— 即便会话已死也不降级到本机 shell，
  // 因为那是完全不同的机器，本地执行毫无意义且会产生误导性结果。
  const isSshSession = !!deps.terminalSessionId && deps.terminalSessionId.startsWith('ssh_');

  // 尝试在绑定的终端会话中执行（输出可见于终端 UI）
  if (deps.terminalSessionId) {
    try {
      const result = await runCommandInRenderer(deps.sender, {
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
    case 'Read':
      return toolRead(args);
    case 'Write':
      return toolWrite(args);
    case 'Edit':
      return toolEdit(args);
    case 'MultiEdit':
      return toolMultiEdit(args);
    case 'Bash':
      return toolBash(args, deps.envVars, deps);
    case 'Glob':
      return toolGlob(args);
    case 'Grep':
      return toolGrep(args);
    case 'WebFetch':
      return toolWebFetch(args);
    case 'WebSearch':
      return toolWebSearch(args, deps.webSearchConfig);
    case 'TodoWrite':
      return toolTodoWrite(args, deps.requestId);
    case 'Task':
      return toolTask(args);
    case 'NotebookRead':
      return toolNotebookRead(args);
    case 'NotebookEdit':
      return toolNotebookEdit(args);
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
