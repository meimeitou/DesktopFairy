const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFile } = require('child_process');
const { promisify } = require('util');
const { glob } = require('fs/promises');
const { app } = require('electron');

const execFileAsync = promisify(execFile);

const MAX_READ_BYTES = 512 * 1024;
const MAX_FETCH_BYTES = 512 * 1024;
const todosByRequest = new Map();

function ok(data) {
  return JSON.stringify({ ok: true, ...data });
}

function fail(message) {
  return JSON.stringify({ ok: false, error: message });
}

function expandPath(filePath) {
  const raw = String(filePath || '').trim();
  if (!raw) return '';
  if (raw.startsWith('~/')) return path.join(os.homedir(), raw.slice(2));
  if (raw === '~') return os.homedir();
  return raw;
}

function readTextSlice(content, offset, limit) {
  const lines = content.split('\n');
  const start = Math.max(0, (Number(offset) || 1) - 1);
  const end = limit ? start + Number(limit) : lines.length;
  return lines.slice(start, end).join('\n');
}

async function toolRead(args) {
  const filePath = expandPath(args?.file_path);
  if (!filePath || !fs.existsSync(filePath)) return fail('File not found');
  const stat = fs.statSync(filePath);
  if (stat.size > MAX_READ_BYTES) return fail(`File too large (max ${MAX_READ_BYTES} bytes)`);
  const content = await fs.promises.readFile(filePath, 'utf8');
  const text = readTextSlice(content, args?.offset, args?.limit);
  return ok({ file_path: filePath, content: text });
}

async function toolWrite(args) {
  const filePath = expandPath(args?.file_path);
  if (!filePath) return fail('file_path required');
  const content = String(args?.content ?? '');
  await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
  await fs.promises.writeFile(filePath, content, 'utf8');
  return ok({ file_path: filePath, bytes: Buffer.byteLength(content, 'utf8') });
}

async function applyEdit(filePath, oldString, newString, replaceAll) {
  const content = await fs.promises.readFile(filePath, 'utf8');
  if (!content.includes(oldString)) {
    throw new Error('old_string not found in file');
  }
  const next = replaceAll
    ? content.split(oldString).join(newString)
    : content.replace(oldString, newString);
  await fs.promises.writeFile(filePath, next, 'utf8');
  return next.length;
}

async function toolEdit(args) {
  const filePath = expandPath(args?.file_path);
  if (!filePath || !fs.existsSync(filePath)) return fail('File not found');
  try {
    await applyEdit(
      filePath,
      String(args?.old_string ?? ''),
      String(args?.new_string ?? ''),
      !!args?.replace_all
    );
    return ok({ file_path: filePath });
  } catch (e) {
    return fail(String(e?.message || e));
  }
}

async function toolMultiEdit(args) {
  const filePath = expandPath(args?.file_path);
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
    return ok({ file_path: filePath, edits: edits.length });
  } catch (e) {
    return fail(String(e?.message || e));
  }
}

async function toolBash(args, envVars = {}) {
  const command = String(args?.command || '').trim();
  if (!command) return fail('Empty command');
  if (args?.run_in_background) {
    return fail('Background shell is not supported in DesktopFairy yet');
  }
  const timeout = Math.min(Number(args?.timeout) || 60_000, 600_000);
  const shell = process.env.SHELL || '/bin/zsh';
  try {
    const { stdout, stderr } = await execFileAsync(shell, ['-lc', command], {
      env: { ...process.env, ...envVars },
      timeout,
      maxBuffer: 1024 * 1024,
      cwd: os.homedir(),
    });
    return ok({
      stdout: String(stdout || ''),
      stderr: String(stderr || ''),
    });
  } catch (e) {
    return ok({
      stdout: String(e?.stdout || ''),
      stderr: String(e?.stderr || e?.message || e),
      exitCode: e?.code ?? 1,
    });
  }
}

async function toolGlob(args) {
  const pattern = String(args?.pattern || '').trim();
  if (!pattern) return fail('pattern required');
  const cwd = expandPath(args?.path) || os.homedir();
  try {
    const matches = await glob(pattern, { cwd, nodir: true });
    return ok({ matches: matches.slice(0, 500), cwd });
  } catch (e) {
    return fail(String(e?.message || e));
  }
}

async function toolGrep(args) {
  const pattern = String(args?.pattern || '').trim();
  if (!pattern) return fail('pattern required');
  const searchPath = expandPath(args?.path) || os.homedir();
  const outputMode = args?.output_mode || 'content';
  const rgArgs = ['--no-messages'];
  if (args?.['-i']) rgArgs.push('-i');
  if (args?.glob) rgArgs.push('--glob', String(args.glob));
  if (outputMode === 'files_with_matches') rgArgs.push('-l');
  if (outputMode === 'count') rgArgs.push('-c');
  if (args?.head_limit) rgArgs.push('--max-count', String(args.head_limit));
  rgArgs.push(pattern, searchPath);

  try {
    const { stdout } = await execFileAsync('rg', rgArgs, {
      maxBuffer: 1024 * 1024,
      timeout: 30_000,
    });
    return ok({ output: String(stdout || '') });
  } catch (e) {
    if (e?.code === 1) return ok({ output: '' });
    try {
      const grepArgs = ['-r', '-n', pattern, searchPath];
      const { stdout } = await execFileAsync('grep', grepArgs, {
        maxBuffer: 1024 * 1024,
        timeout: 30_000,
      });
      return ok({ output: String(stdout || '') });
    } catch (grepErr) {
      if (grepErr?.code === 1) return ok({ output: '' });
      return fail(String(grepErr?.message || grepErr));
    }
  }
}

async function toolWebFetch(args) {
  const url = String(args?.url || '').trim();
  if (!url) return fail('url required');
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'DesktopFairy/0.2' },
      signal: AbortSignal.timeout(30_000),
    });
    const text = await res.text();
    const content = text.slice(0, MAX_FETCH_BYTES);
    return ok({
      url,
      status: res.status,
      content,
      prompt: String(args?.prompt || ''),
    });
  } catch (e) {
    return fail(String(e?.message || e));
  }
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
    return ok({ query, results });
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
  const notebookPath = expandPath(args?.notebook_path);
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
  const notebookPath = expandPath(args?.notebook_path);
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
      return toolBash(args, deps.envVars);
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
    default:
      return fail(`Unknown builtin tool: ${toolName}`);
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
