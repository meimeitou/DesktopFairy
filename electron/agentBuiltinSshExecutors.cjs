const fs = require('fs');
const path = require('path');
const snapshots = require('./agentSnapshotStore.cjs');
const { applyHashlinePatchAsync } = require('./hashlinePatch.cjs');
const {
  DEFAULT_READ_LIMIT,
  MAX_READ_BYTES,
  GREP_MAX_COLUMN,
  GREP_CONTEXT_BEFORE,
  GREP_CONTEXT_AFTER,
  GREP_FILE_PAGE,
  GREP_PER_FILE_MULTI,
  GREP_PER_FILE_SINGLE,
  GREP_TOTAL_CAP,
  GLOB_DEFAULT_LIMIT,
  GLOB_MAX_LIMIT,
  splitPathAndSel,
  mergeRanges,
  parseFindPattern,
  formatHashlineRead,
  formatAnchoredGrep,
  formatGroupedPaths,
  classifyBufferAsBinary,
  truncateTerminalOutput,
} = require('./agentBuiltinFsUtils.cjs');

const READ_DIR_DEPTH = 2;
const READ_DIR_PER_DIR = 12;

// electron is main-process-only; require lazily so node/vitest can load this module.
let _app = null;
function getApp() {
  if (_app === null) _app = require('electron').app;
  return _app;
}

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

function ok(data) {
  return JSON.stringify({ ok: true, ...data });
}

function fail(message) {
  return JSON.stringify({ ok: false, error: message });
}

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

function stripWriteContent(content) {
  let text = String(content ?? '');
  text = text
    .split('\n')
    .filter((l) => !/^\[[^\[\]\n]*#[0-9A-Fa-f]{4}\]\s*$/.test(l.trim()))
    .join('\n');
  text = text
    .split('\n')
    .map((l) => l.replace(/^\d{1,6}:/, ''))
    .join('\n');
  return text;
}

// ssh_exec：在已保存的 SSH 主机上一次性执行命令（连接 → exec → 断开，非交互）。
// ---------------------------------------------------------------------------
// ssh_hosts: 管理已保存 SSH 主机（add/update/delete/list）。
// 凭据严格只读：仅可引用已有 credentialId，禁止任何内联密码/私钥字段，
// 返回值只含凭据 name，绝不含 password/privateKeyPath。
// ---------------------------------------------------------------------------

const SSH_HOST_ALLOWED_FIELDS = [
  'name',
  'host',
  'port',
  'user',
  'authMethod',
  'credentialId',
  'group',
  'proxyJump',
  'proxyJumpAuthMethod',
  'proxyJumpCredentialId',
];
const SSH_HOST_FORBIDDEN_FIELDS = [
  'password',
  'privateKeyPath',
  'proxyJumpPassword',
  'proxyJumpPrivateKeyPath',
];

function sshHostProjection(h, credentialNameById) {
  return {
    id: h.id,
    name: h.name,
    host: h.host,
    port: h.port,
    user: h.user,
    authMethod: h.authMethod,
    credential: credentialNameById(h.credentialId),
    group: h.group ?? null,
    proxyJump: h.proxyJump ?? null,
  };
}

/** Shared field validation for ssh_hosts add/update (both contexts). */
function validateSshHostFields(fields, creds) {
  if (!fields || typeof fields !== 'object' || Array.isArray(fields)) {
    return { error: 'fields 必须是对象' };
  }
  const keys = Object.keys(fields);
  const forbidden = keys.filter((k) => SSH_HOST_FORBIDDEN_FIELDS.includes(k));
  if (forbidden.length > 0) {
    return {
      error: `不允许通过 agent 设置内联凭据（${forbidden.join(', ')}），请引用已存在凭据的 credentialId`,
    };
  }
  const unknown = keys.filter((k) => !SSH_HOST_ALLOWED_FIELDS.includes(k));
  if (unknown.length > 0) {
    return {
      error: `未知字段：${unknown.join(', ')}。可用字段：${SSH_HOST_ALLOWED_FIELDS.join(', ')}`,
    };
  }
  if ('name' in fields) {
    const name = String(fields.name || '').trim();
    if (!name) return { error: 'name 不能为空' };
    fields.name = name;
  }
  if ('host' in fields && !String(fields.host || '').trim()) {
    return { error: 'host 不能为空' };
  } else if ('host' in fields) {
    fields.host = String(fields.host).trim();
  }
  if ('user' in fields && !String(fields.user || '').trim()) {
    return { error: 'user 不能为空' };
  } else if ('user' in fields) {
    fields.user = String(fields.user).trim();
  }
  if ('port' in fields) {
    const port = Number(fields.port);
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      return { error: 'port 必须是 1–65535 的整数' };
    }
    fields.port = port;
  }
  if ('authMethod' in fields && !['auto', 'password', 'privateKey', 'agent'].includes(fields.authMethod)) {
    return { error: 'authMethod 必须是 auto / password / privateKey / agent 之一' };
  }
  for (const idField of ['credentialId', 'proxyJumpCredentialId']) {
    if (idField in fields && fields[idField] != null && !creds.some((c) => c && c.id === fields[idField])) {
      return {
        error: `credentialId "${fields[idField]}" 不存在。可用凭据：${creds.map((c) => c?.name).join('; ') || '（无）'}`,
      };
    }
  }
  if ('proxyJump' in fields && fields.proxyJump != null && typeof fields.proxyJump !== 'string') {
    return { error: 'proxyJump 必须是字符串（user@host 形式）' };
  }
  return { fields };
}

async function toolSshHosts(args, deps = {}) {
  const action = String(args?.action || '').trim();
  if (!['list', 'add', 'update', 'delete'].includes(action)) {
    return fail('action 必须是 list / add / update / delete 之一');
  }
  // 计划模式防御纵深：目录层不禁用本工具，由这里拦写操作。
  if (deps?.agentConfig?.chatMode === 'plan' && action !== 'list') {
    return fail('计划模式下仅支持 list 操作');
  }

  if (action === 'list') {
    const live = require('./settingsSnapshot.cjs').getSnapshot();
    if (live) {
      const hosts = Array.isArray(live.sshHosts) ? live.sshHosts : [];
      const creds = Array.isArray(live.sshCredentials) ? live.sshCredentials : [];
      return ok({
        action, hosts: hosts.map((h) => sshHostProjection(h, (id) => creds.find((c) => c?.id === id)?.name ?? null)),
        message: hosts.length === 0 ? '暂无已保存主机' : `共 ${hosts.length} 台主机`,
      });
    }
  }

  // —— host context：add/update/delete 委托 hostConversationService（含授权失效/级联删除）——
  // 放在读盘之前：host 路径完全走 settingsSnapshot，不依赖本地 settings 文件。
  if (deps.hostRuntime && action !== 'list') {
    const snapshotSettings = require('./settingsSnapshot.cjs').getSnapshot() || {};
    const snapshotCreds = Array.isArray(snapshotSettings.sshCredentials) ? snapshotSettings.sshCredentials : [];
    const v = validateSshHostFields(args?.fields ? { ...args.fields } : null, snapshotCreds);
    if (action !== 'add' && !String(args?.host || '').trim()) {
      return fail('update/delete 需要 host 参数（已保存主机的 name，精确匹配）');
    }
    if (action === 'add' && v.error) return fail(v.error);
    if (action === 'add' && (!('name' in (v.fields || {})) || !('host' in (v.fields || {})))) {
      return fail('add 需要在 fields 中提供 name 和 host');
    }
    if (action === 'update' && v.error) return fail(v.error);
    const result = typeof deps.hostRuntime.applyHostSettingsMutation === 'function'
      ? await deps.hostRuntime.applyHostSettingsMutation({ action, host: args?.host, fields: v.fields })
      : null;
    if (!result) return fail('主机设置变更服务不可用');
    if (!result.ok) return fail(result.error);
    const entry = result.hostEntry;
    return ok({
      action,
      host: entry?.name,
      message: action === 'add'
        ? `已新增主机 ${entry?.name}`
        : action === 'delete'
          ? `已删除主机 ${entry?.name}（其主机对话已一并删除）`
          : `已更新主机 ${entry?.name}`,
    });
  }

  const settingsPath = path.join(getApp().getPath('userData'), 'da_settings.json');
  let settings;
  try {
    settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
  } catch {
    return fail('Could not read settings');
  }
  if (!Array.isArray(settings.sshHosts)) settings.sshHosts = [];
  const hosts = settings.sshHosts;
  const creds = Array.isArray(settings.sshCredentials) ? settings.sshCredentials : [];
  const credentialNameById = (id) =>
    id ? (creds.find((c) => c && c.id === id)?.name ?? null) : null;

  const validateFields = (fields) => {
    if (!fields || typeof fields !== 'object' || Array.isArray(fields)) {
      return { error: 'fields 必须是对象' };
    }
    const keys = Object.keys(fields);
    const forbidden = keys.filter((k) => SSH_HOST_FORBIDDEN_FIELDS.includes(k));
    if (forbidden.length > 0) {
      return {
        error: `不允许通过 agent 设置内联凭据（${forbidden.join(', ')}），请引用已存在凭据的 credentialId`,
      };
    }
    const unknown = keys.filter((k) => !SSH_HOST_ALLOWED_FIELDS.includes(k));
    if (unknown.length > 0) {
      return {
        error: `未知字段：${unknown.join(', ')}。可用字段：${SSH_HOST_ALLOWED_FIELDS.join(', ')}`,
      };
    }
    if ('name' in fields) {
      const name = String(fields.name || '').trim();
      if (!name) return { error: 'name 不能为空' };
      fields.name = name;
    }
    if ('host' in fields && !String(fields.host || '').trim()) {
      return { error: 'host 不能为空' };
    } else if ('host' in fields) {
      fields.host = String(fields.host).trim();
    }
    if ('user' in fields && !String(fields.user || '').trim()) {
      return { error: 'user 不能为空' };
    } else if ('user' in fields) {
      fields.user = String(fields.user).trim();
    }
    if ('port' in fields) {
      const port = Number(fields.port);
      if (!Number.isInteger(port) || port < 1 || port > 65535) {
        return { error: 'port 必须是 1–65535 的整数' };
      }
      fields.port = port;
    }
    if ('authMethod' in fields && !['auto', 'password', 'privateKey', 'agent'].includes(fields.authMethod)) {
      return { error: 'authMethod 必须是 auto / password / privateKey / agent 之一' };
    }
    for (const idField of ['credentialId', 'proxyJumpCredentialId']) {
      if (idField in fields && fields[idField] != null && !creds.some((c) => c && c.id === fields[idField])) {
        return {
          error: `credentialId "${fields[idField]}" 不存在。可用凭据：${creds.map((c) => c?.name).join('; ') || '（无）'}`,
        };
      }
    }
    if ('proxyJump' in fields && fields.proxyJump != null && typeof fields.proxyJump !== 'string') {
      return { error: 'proxyJump 必须是字符串（user@host 形式）' };
    }
    return { fields };
  };

  const persist = () => {
    try {
      fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
    } catch {
      return false;
    }
    broadcastSettingsUpdated(settings, deps.getWindows);
    return true;
  };

  if (action === 'list') {
    return ok({
      action,
      hosts: hosts.map((h) => sshHostProjection(h, credentialNameById)),
      message: hosts.length === 0 ? '暂无已保存主机' : `共 ${hosts.length} 台主机`,
    });
  }

  const hostArg = String(args?.host || '').trim();
  const describe = (h) => `${h.name} (${h.user || '?'}@${h.host || '?'}:${h.port || 22})`;

  if (action === 'add') {
    const v = validateFields(args?.fields ? { ...args.fields } : null);
    if (v.error) return fail(v.error);
    const fields = v.fields;
    if (!('name' in fields) || !('host' in fields)) {
      return fail('add 需要在 fields 中提供 name 和 host');
    }
    if (hosts.some((h) => h && h.name === fields.name)) {
      return fail(`已存在名为 "${fields.name}" 的主机`);
    }
    const entry = {
      id: `ssh_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      port: 22,
      authMethod: 'auto',
      ...fields,
    };
    hosts.push(entry);
    if (!persist()) return fail('Could not write settings');
    return ok({
      action,
      host: entry.name,
      hostEntry: sshHostProjection(entry, credentialNameById),
      message: `已新增主机 ${entry.name}`,
    });
  }

  // update / delete：按 name 精确匹配
  if (!hostArg) return fail('update/delete 需要 host 参数（已保存主机的 name，精确匹配）');
  const matches = hosts.filter((h) => h && h.name === hostArg);
  if (matches.length === 0) {
    return fail(
      hosts.length === 0
        ? '暂无已保存主机'
        : `未找到名为 "${hostArg}" 的已保存主机。可用主机：${hosts.map((h) => h.name).join('; ')}`,
    );
  }
  if (matches.length > 1) {
    return fail(`主机名 "${hostArg}" 不唯一，请让用户确认目标：${matches.map(describe).join('; ')}`);
  }
  const target = matches[0];

  if (action === 'delete') {
    settings.sshHosts = hosts.filter((h) => h !== target);
    if (!persist()) return fail('Could not write settings');
    return ok({ action, host: target.name, message: `已删除主机 ${target.name}` });
  }

  // update
  const v = validateFields(args?.fields ? { ...args.fields } : null);
  if (v.error) return fail(v.error);
  const fields = v.fields;
  if (Object.keys(fields).length === 0) return fail('update 需要在 fields 中提供至少一个字段');
  if ('name' in fields && fields.name !== target.name && hosts.some((h) => h && h !== target && h.name === fields.name)) {
    return fail(`已存在名为 "${fields.name}" 的主机`);
  }
  for (const [key, value] of Object.entries(fields)) {
    if (value == null) delete target[key];
    else target[key] = value;
  }
  if (!persist()) return fail('Could not write settings');
  return ok({
    action,
    host: target.name,
    hostEntry: sshHostProjection(target, credentialNameById),
    message: `已更新主机 ${target.name}`,
  });
}

// ---------------------------------------------------------------------------
// ssh_* remote file tools (host conversations, SFTP-backed)
// ---------------------------------------------------------------------------

/** POSIX path join for remote paths (cwd may be null = login home default). */
function remoteJoin(cwd, p) {
  if (!p) return p;
  if (p.startsWith('/')) return p;
  // SFTP has no tilde expansion; relative paths already resolve against the
  // login home, so `~/x` is just `x`.
  if (p === '~') return '.';
  if (p.startsWith('~/')) return p.slice(2) || '.';
  if (!cwd) return p;
  return `${cwd.replace(/\/+$/, '')}/${p}`;
}

/** SFTP callback → Promise adapters. */
function sftpCall(sftp, method, ...args) {
  return new Promise((resolve, reject) => {
    sftp[method](...args, (err, result) => {
      if (err) {
        const e = new Error(String(err?.message || err));
        if (err.code) e.code = err.code;
        reject(e);
      } else {
        resolve(result);
      }
    });
  });
}

const sftpReadFile = (sftp, p) => sftpCall(sftp, 'readFile', p);
const sftpWriteFile = (sftp, p, data) => sftpCall(sftp, 'writeFile', p, data);
const sftpUnlink = (sftp, p) => sftpCall(sftp, 'unlink', p);
const sftpRename = (sftp, from, to) => sftpCall(sftp, 'rename', from, to);
const sftpMkdir = (sftp, p) => sftpCall(sftp, 'mkdir', p);
const sftpStat = (sftp, p) => sftpCall(sftp, 'stat', p);
const sftpReaddir = (sftp, p) => sftpCall(sftp, 'readdir', p);

/** Recursive remote mkdir (SFTP has no recursive mkdir). */
async function sftpMkdirp(sftp, dirPath) {
  if (!dirPath || dirPath === '/' || dirPath === '.') return;
  const segments = dirPath.split('/').filter(Boolean);
  let cur = dirPath.startsWith('/') ? '' : '.';
  for (const seg of segments) {
    cur = cur === '.' ? seg : `${cur}/${seg}`;
    try {
      await sftpMkdir(sftp, cur);
    } catch (e) {
      // SSH_FX_FAILURE (4) also covers permission denied — verify instead of
      // assuming it means "already exists".
      const st = await sftpStat(sftp, cur).catch(() => null);
      if (!st || !st.isDirectory()) throw e;
    }
  }
}

/** Glob pattern → RegExp. Covers * ** ? [...] {a,b}; no extglob — complex
 * patterns degrade to literal matching.
 * ponytail: no extglob/brace-nesting support; degrade to literal when unsure. */
function globToRegExp(glob) {
  let re = '';
  let i = 0;
  while (i < glob.length) {
    const c = glob[i];
    if (c === '*') {
      if (glob[i + 1] === '*') {
        // '**/' or trailing '**'
        if (glob[i + 2] === '/') { re += '(?:[^/]*(?:/|$))*'; i += 3; continue; }
        re += '.*'; i += 2; continue;
      }
      re += '[^/]*'; i += 1; continue;
    }
    if (c === '?') { re += '[^/]'; i += 1; continue; }
    if (c === '[') {
      const close = glob.indexOf(']', i + 1);
      if (close === -1) { re += '\\['; i += 1; continue; }
      let body = glob.slice(i + 1, close);
      if (body.startsWith('!')) body = `^${body.slice(1)}`;
      re += `[${body}]`; i = close + 1; continue;
    }
    if (c === '{') {
      const close = glob.indexOf('}', i + 1);
      if (close === -1) { re += '\\{'; i += 1; continue; }
      const alts = glob.slice(i + 1, close).split(',').map((a) => a.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
      re += `(?:${alts.join('|')})`; i = close + 1; continue;
    }
    re += c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    i += 1;
  }
  try {
    return new RegExp(`^${re}$`);
  } catch {
    // Malformed character class (e.g. [z-a]) — degrade to a literal match
    // instead of throwing out of the tool call.
    return new RegExp(`^${String(glob).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`);
  }
}

/** Built-in exclusion set for remote traversal (no remote .gitignore parsing). */
const SSH_EXCLUDE_DIRS = new Set(['.git', 'node_modules', 'dist', 'build', '__pycache__']);

/** Collect remote files under root (bounded DFS), filtered by matcher. */
async function sftpCollectFiles(sftp, root, { hidden, matcher, limit, signal }) {
  const results = [];
  const stack = [root];
  const visited = new Set();
  let truncated = false;
  while (stack.length > 0 && results.length < limit) {
    if (signal?.aborted) throw new Error('SSH 命令已取消');
    const dir = stack.pop();
    if (visited.has(dir)) continue;
    visited.add(dir);
    let entries;
    try {
      entries = await sftpReaddir(sftp, dir);
    } catch {
      continue; // unreadable dir — skip
    }
    entries = entries || [];
    for (let ei = 0; ei < entries.length; ei++) {
      const ent = entries[ei];
      if (signal?.aborted) throw new Error('SSH 命令已取消');
      const name = ent.filename || ent.name;
      if (!name || name === '.' || name === '..') continue;
      if (!hidden && name.startsWith('.')) continue;
      const full = dir === '/' ? `/${name}` : `${dir}/${name}`;
      const isDir = Boolean(ent.longname && ent.longname.startsWith('d'));
      if (isDir) {
        if (SSH_EXCLUDE_DIRS.has(name)) continue;
        stack.push(full);
        continue;
      }
      if (matcher && !matcher.test(full)) continue;
      let mtime = 0;
      try {
        const st = await sftpStat(sftp, full);
        mtime = (st.mtime || 0) * 1000;
      } catch { /* vanished */ }
      results.push({ path: full, mtime });
      if (results.length >= limit) {
        truncated = ei < entries.length - 1 || stack.length > 0;
        break;
      }
    }
  }
  return { files: results, truncated };
}

const GREP_PATTERN_MAX = 200;

/** Reject patterns that can catastrophically backtrack on the main thread. */
function compileUserRegex(pattern, flags) {
  if (pattern.length > GREP_PATTERN_MAX) {
    return { error: `正则过长（最多 ${GREP_PATTERN_MAX} 字符）` };
  }
  if (hasNestedQuantifier(pattern)) {
    return { error: '正则包含嵌套量词或可重复的分支，可能导致灾难性回溯，请改用更简单的表达式' };
  }
  try {
    return { regex: new RegExp(pattern, flags) };
  } catch {
    return { error: `Invalid regex: ${pattern}` };
  }
}

function isQuantifierAt(source, i) {
  const c = source[i];
  if (c === '*' || c === '+' || c === '?') return true;
  return c === '{';
}

function hasNestedQuantifier(source) {
  const groups = [];
  let inClass = false;
  for (let i = 0; i < source.length; i++) {
    const c = source[i];
    if (c === '\\') { i += 1; continue; }
    if (inClass) {
      if (c === ']') inClass = false;
      continue;
    }
    if (c === '[') { inClass = true; continue; }
    if (c === '(') {
      groups.push({ quant: false, alt: false });
      if (source[i + 1] === '?') {
        i += 1;
        const n = source[i + 1];
        if (n === ':' || n === '=' || n === '!') i += 1;
        else if (n === '<') {
          i += 1;
          if (source[i + 1] === '=' || source[i + 1] === '!') i += 1;
          else {
            while (i + 1 < source.length && source[i + 1] !== '>') i += 1;
            if (source[i + 1] === '>') i += 1;
          }
        }
      }
      continue;
    }
    if (c === '|') {
      if (groups.length > 0) groups[groups.length - 1].alt = true;
      continue;
    }
    if (c === ')') {
      const inner = groups.pop();
      if (!inner) continue;
      const repeated = isQuantifierAt(source, i + 1);
      if (repeated && (inner.quant || inner.alt)) return true;
      if ((repeated || inner.quant) && groups.length > 0) groups[groups.length - 1].quant = true;
      continue;
    }
    if (isQuantifierAt(source, i) && groups.length > 0) {
      groups[groups.length - 1].quant = true;
    }
  }
  return false;
}

/** Resolve the target host for an ssh_* tool call; enforces grants. */
function resolveHostTarget(args, deps) {
  const rt = deps.hostRuntime;
  if (!rt) return { error: '主机上下文不可用（hostRuntime missing）' };
  try {
    rt.assertValid?.();
    if (deps.hostOperation) rt.assertOperation(deps.hostOperation);
  } catch (e) { return { error: e.message }; }
  const hostId = typeof args?.hostId === 'string' && args.hostId.trim()
    ? args.hostId.trim()
    : rt.hostId;
  if (hostId === rt.defaultHostId && !hostId) return { error: '请明确指定已保存主机' };
  if (hostId !== rt.defaultHostId) {
    if (!rt.isGranted(hostId)) {
      return { error: `尚未授权在主机 ${hostId} 上执行操作，请先征得用户确认` };
    }
  }
  let connectParams;
  try {
    connectParams = rt.resolveConnectParams(hostId);
  } catch (e) {
    return { error: String(e?.message || e) };
  }
  if (deps.hostOperation && deps.hostOperation.hostId !== hostId) {
    return { error: 'SSH 操作目标与已确认主机不一致，请重新确认' };
  }
  const cwd = deps.hostOperation ? deps.hostOperation.cwd : rt.getCwd(rt.topicId, hostId);
  return { hostId, connectParams, cwd };
}

/**
 * 缺凭据时的用户补全：弹 AskUserQuestion 卡（列出已存凭据 + 手输密码）。
 * - 选已有凭据 → 通过 applyHostSettingsMutation 持久绑定 credentialId，返回新 connectParams。
 * - 手输密码 → 仅本次注入（passwordOverride），不落盘。
 * 复用 confirmSavedSshHost 同款 askUserInStream 交互通道。
 */
async function askForMissingCredential({ settings, hostId, deps }) {
  if (deps.agentConfig?.chatMode === 'full-auto') {
    return { error: 'full-auto 模式无法弹窗补全凭据，请先在终端设置中为主机配置凭据' };
  }
  const { askUserInStream } = require('./agentToolApproval.cjs');
  const rt = deps.hostRuntime;
  const hosts = Array.isArray(settings?.sshHosts) ? settings.sshHosts : [];
  const host = hosts.find((h) => h && h.id === hostId);
  if (!host) return { error: `未找到 id 为 "${hostId}" 的已保存主机` };
  const creds = Array.isArray(settings?.sshCredentials) ? settings.sshCredentials : [];
  const namedCreds = creds.filter((c) => c && (c.password || c.privateKeyPath));

  const question = `主机「${host.name}」缺少可用凭据。选择一个已保存的凭据，或手动输入密码（仅本次连接使用）：`;
  const questions = [{
    question,
    header: '凭据',
    // 选项 value 带 cred: 前缀：手输密码即使恰好等于凭据名也不会被误判为选择。
    options: namedCreds.map((c) => ({ label: `cred:${c.name || c.id}` })),
  }];
  const askToolCallId = `askcred_${hostId}_${Date.now()}`;
  const askResult = await askUserInStream({
    requestId: deps.requestId,
    safeSend: deps.safeSend,
    onApprovalWaitStart: deps.onApprovalWaitStart,
    signal: deps.signal,
    toolCallId: askToolCallId,
    questions,
  });
  // 终态事件：让卡片离开 awaiting_input，避免会话重载后残留可交互的失效卡。
  const closeAskCard = askResult.close;
  if (askResult.kind === 'aborted') {
    return { error: '已取消：用户未补全凭据' };
  }
  try { if (deps.hostOperation) rt?.assertOperation(deps.hostOperation); } catch (e) {
    closeAskCard('等待期间主机连接配置或凭据已变化');
    return { error: e.message };
  }
  const answer = String(askResult.answers?.[question] || Object.values(askResult.answers || {})[0] || '').trim();
  if (!answer) {
    closeAskCard('未选择凭据');
    return { error: '未选择凭据，已取消执行' };
  }

  const sshService = require('./sshService.cjs');
  if (answer.startsWith('cred:')) {
    const credName = answer.slice('cred:'.length);
    const pickedCred = namedCreds.find((c) => (c.name || c.id) === credName);
    if (!pickedCred) {
      closeAskCard('凭据不存在');
      return { error: `凭据「${credName}」已不存在，请重试` };
    }
    if (rt && typeof rt.applyHostSettingsMutation === 'function') {
      // host context：持久绑定 credentialId，绑定后重解析 —— 由绑定的凭据提供密码，
      // 不把凭据名当 passwordOverride。
      const mutation = await rt.applyHostSettingsMutation({
        action: 'update',
        host: host.name,
        fields: { credentialId: pickedCred.id },
      });
      if (!mutation.ok) {
        closeAskCard('绑定失败');
        return { error: `凭据绑定失败：${mutation.error}` };
      }
      closeAskCard(`已绑定凭据「${credName}」`);
      const refreshedSettings = require('./settingsSnapshot.cjs').getSnapshot() || settings;
      const resolved = sshService.resolveSshConnection(refreshedSettings, { hostId });
      return {
        ...resolved,
        ...(typeof rt.captureOperation === 'function'
          ? { hostOperation: rt.captureOperation(hostId, { cwd: deps.hostOperation?.cwd }) }
          : {}),
      };
    }
    // terminal context：无法持久化，注入该凭据内容（仅本次）。
    const refreshed = require('./settingsSnapshot.cjs').getSnapshot() || {};
    const freshCreds = Array.isArray(refreshed.sshCredentials) ? refreshed.sshCredentials : [];
    const fresh = freshCreds.find((c) => c && c.id === pickedCred.id) || pickedCred;
    closeAskCard(`本次连接使用凭据「${credName}」`);
    return sshService.resolveSshConnection({ ...settings, sshHosts: hosts.map((h) => (h.id === hostId ? { ...h, password: fresh.password, privateKeyPath: fresh.privateKeyPath } : h)) }, { hostId });
  }
  // 手输密码：passwordOverride 仅本次连接生效，不落盘。
  closeAskCard('已收到密码（仅本次连接使用）');
  const refreshedSettings = require('./settingsSnapshot.cjs').getSnapshot() || settings;
  return sshService.resolveSshConnection(refreshedSettings, { hostId, passwordOverride: answer });
}

/**
 * sudo 等提权密码询问：弹 secret 密文输入卡，返回用户输入的密码或 null（取消）。
 */
async function askSudoPassword({ deps, hostName, connectParams, attempt = 0, signal = deps.signal }) {
  const { askUserInStream } = require('./agentToolApproval.cjs');
  const hasConnectionPassword = typeof connectParams?.password === 'string' && connectParams.password.length > 0;
  const question = `${attempt > 0 ? '上次 sudo 密码认证失败，请重新选择或输入。' : ''}主机「${hostName}」需要 sudo 密码（通常为当前登录用户的密码）。验证成功后仅在当前会话内缓存 10 分钟：`;
  const questions = [{
    question, header: '提权', secret: true, options: [],
    ...(hasConnectionPassword ? { secretDefaultLabel: `使用当前连接用户 ${connectParams.user || ''} 的已保存密码` } : {}),
   }];
  const uniqueId = require('crypto').randomBytes(12).toString('hex');
   const askToolCallId = `asksudo_${uniqueId}`;
  const askResult = await askUserInStream({
    requestId: deps.requestId,
    safeSend: deps.safeSend,
    onApprovalWaitStart: deps.onApprovalWaitStart,
    signal,
    toolCallId: askToolCallId,
    questions,
  });
  if (askResult.kind === 'aborted') return null;
  const answer = String(askResult.answers?.[question] || '');
  let password = null;
  let error = null;
  if (hasConnectionPassword) {
    try {
      const choice = JSON.parse(answer);
      if (choice?.source === 'connection') password = connectParams.password;
      else if (choice?.source === 'manual' && typeof choice.password === 'string') password = choice.password;
      else error = '请选择密码来源或手动输入密码';
    } catch { error = '密码回答格式无效，请重新选择或输入'; }
  } else password = answer || null;
  // 终态只记录是否收讫，不回显密码或带密码的回答结构。
  askResult.close(error || (password ? '已收到密码' : '已取消'), !error && !!password);
  if (error) throw new Error(error);
  return password || null;
}

function sshSnapshotKey(topicId, hostId, absPath) {
  return `${topicId}:${hostId}:${absPath}`;
}

async function toolSshRead(args, deps = {}) {
  const rawPath = String(args?.path ?? '').trim();
  if (!rawPath) return fail('path required');
  const target = resolveHostTarget(args, deps);
  if (target.error) return fail(target.error);
  const { hostId, connectParams, cwd } = target;
  const sshService = require('./sshService.cjs');
  const absPath = remoteJoin(cwd, rawPath);
  const snapKey = (p) => sshSnapshotKey(deps.hostRuntime.topicId, hostId, p);

  try {
    return await sshService.withSftp(connectParams, async (sftp) => {
      const st = await sftpStat(sftp, absPath).catch(() => null);
      if (!st) return fail(`Path not found: ${rawPath}`);
      if (st.isDirectory()) {
        const tree = await sftpDirectoryTree(sftp, absPath, rawPath, 0);
        return ok({ file_path: absPath, content: tree.join('\n'), isDirectory: true });
      }
      if (st.size > MAX_READ_BYTES) {
        return fail(`File too large (max ${MAX_READ_BYTES} bytes)`);
      }

      const split = await splitPathAndSel(rawPath, {
        isFileAsync: async (p) => {
          try {
            const s = await sftpStat(sftp, remoteJoin(cwd, p));
            return Boolean(s && s.isFile());
          } catch {
            return false;
          }
        },
      });
      const isRaw = split.isRaw === true;

      const buf = await sftpReadFile(sftp, absPath);
      if (!isRaw && classifyBufferAsBinary(buf.subarray(0, 4096))) {
        return ok({ file_path: absPath, content: `[Cannot read binary file: ${rawPath}]` });
      }
      const content = buf.toString('utf8');
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

      let ranges;
      if (split.ranges.length === 0) {
        if (total === 0) return ok({ file_path: absPath, content: '(empty file)' });
        ranges = [{ start: 1, end: Math.min(DEFAULT_READ_LIMIT, total) }];
      } else {
        const resolved = split.ranges.map((r) => ({
          start: r.start,
          end: r.end === Infinity ? Math.min(r.start + DEFAULT_READ_LIMIT - 1, Math.max(total, r.start)) : r.end,
        }));
        ranges = mergeRanges(resolved);
        if (ranges.length === 0 || ranges[0].start > total) {
          return ok({ file_path: absPath, content: `Use :1 ... to read lines; file has ${total} lines` });
        }
        if (ranges.length === 1 && !isRaw) {
          const r = ranges[0];
          ranges = [{ start: Math.max(1, r.start - 1), end: Math.min(total, r.end + 3) }];
        }
      }
      const displayRanges = ranges
        .map((r) => ({ start: Math.max(1, r.start), end: Math.min(r.end, total) }))
        .filter((r) => r.start <= r.end);
      if (displayRanges.length === 0) {
        return ok({ file_path: absPath, content: `Use :1 ... to read lines; file has ${total} lines` });
      }

      let tag = null;
      if (!isRaw) {
        const seenRanges = displayRanges.map((r) => [r.start, Math.min(r.end, total)]);
        tag = snapshots.recordSnapshot(
          snapKey(absPath),
          trailingNewline ? lines.join('\n') + '\n' : lines.join('\n'),
          seenRanges,
        );
      }
      const text = formatHashlineRead(absPath, tag, lines, displayRanges, { isRaw });
      return ok({ file_path: absPath, content: text });
    }, { signal: deps.signal });
  } catch (e) {
    return fail(String(e?.message || e));
  }
}

/** Remote directory tree (2-level, mirrors readDirectoryTree rendering). */
async function sftpDirectoryTree(sftp, dirPath, relPath, depth) {
  const out = [];
  let entries;
  try {
    entries = await sftpReaddir(sftp, dirPath);
  } catch {
    return out;
  }
  const decorated = [];
  for (const e of entries || []) {
    const name = e.filename || e.name;
    if (!name || name === '.' || name === '..') continue;
    let mtime = 0;
    let size = 0;
    try {
      const st = await sftpStat(sftp, dirPath === '/' ? `/${name}` : `${dirPath}/${name}`);
      mtime = (st.mtime || 0) * 1000;
      size = st.size || 0;
    } catch { /* vanished */ }
    decorated.push({ name, isDir: Boolean(e.longname && e.longname.startsWith('d')), mtime, size });
  }
  decorated.sort((a, b) => (a.isDir === b.isDir ? b.mtime - a.mtime : a.isDir ? 1 : -1));
  const shown = decorated.slice(0, READ_DIR_PER_DIR);
  const label = relPath === '' ? '.' : relPath;
  if (depth === 0) {
    out.push(`${label}/ (${decorated.length} entries)`);
  } else {
    out.push(label.endsWith('/') ? label : label + '/');
  }
  for (const e of shown) {
    if (e.isDir) {
      if (depth + 1 < READ_DIR_DEPTH) {
        out.push('');
        out.push(...(await sftpDirectoryTree(sftp, `${dirPath === '/' ? '' : dirPath}/${e.name}`, `${relPath}/${e.name}/`, depth + 1)));
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

async function toolSshGlob(args, deps = {}) {
  const rawPath = String(args?.path ?? '').trim() || '.';
  const hidden = args?.hidden === true;
  let limit = GLOB_DEFAULT_LIMIT;
  if (args?.limit != null) {
    const n = Number(args.limit);
    if (Number.isFinite(n) && n > 0) limit = Math.min(Math.max(Math.floor(n), 1), GLOB_MAX_LIMIT);
  }
  const target = resolveHostTarget(args, deps);
  if (target.error) return fail(target.error);
  const { hostId, connectParams, cwd } = target;
  const sshService = require('./sshService.cjs');
  const { basePath, glob, hasGlob } = parseFindPattern(rawPath);
  const root = remoteJoin(cwd, basePath || '.');
  const matcher = hasGlob ? globToRegExp(glob) : null;

  try {
    return await sshService.withSftp(connectParams, async (sftp) => {
      const st = await sftpStat(sftp, root).catch(() => null);
      if (!st) return fail(`Path not found: ${rawPath}`);
      if (st.isFile()) {
        return ok({ output: root, matches: [root], fileCount: 1, truncated: false });
      }
      const collected = await sftpCollectFiles(sftp, root, { hidden, matcher, limit, signal: deps.signal });
      const files = collected.files;
      files.sort((a, b) => b.mtime - a.mtime);
      const limited = files.slice(0, limit);
      if (limited.length === 0) {
        return ok({ output: 'No files found matching pattern', matches: [], fileCount: 0, truncated: false });
      }
      return ok({
        output: formatGroupedPaths(limited.map((f) => f.path)),
        matches: limited.map((f) => f.path),
        fileCount: limited.length,
        truncated: collected.truncated,
      });
    }, { signal: deps.signal });
  } catch (e) {
    return fail(String(e?.message || e));
  }
}

async function toolSshGrep(args, deps = {}) {
  const pattern = String(args?.pattern ?? '');
  if (!pattern.trim()) return fail('Pattern must not be empty');
  const skip = Math.max(0, Math.floor(Number(args?.skip ?? 0) || 0));
  const caseSensitive = args?.case !== false;
  const rawPath = String(args?.path ?? '').trim() || '.';
  const target = resolveHostTarget(args, deps);
  if (target.error) return fail(target.error);
  const { hostId, connectParams, cwd } = target;
  const sshService = require('./sshService.cjs');
  const { basePath, glob, hasGlob } = parseFindPattern(rawPath);
  const root = remoteJoin(cwd, basePath || '.');
  const globMatcher = hasGlob ? globToRegExp(glob) : null;

  const compiled = compileUserRegex(pattern, caseSensitive ? '' : 'i');
  if (compiled.error) return fail(compiled.error);
  const regex = compiled.regex;

  try {
    return await sshService.withSftp(connectParams, async (sftp) => {
      const st = await sftpStat(sftp, root).catch(() => null);
      if (!st) return fail(`Path not found: ${rawPath}`);

      let files;
      if (st.isFile()) {
        files = [{ path: root, mtime: 0 }];
      } else {
        files = (await sftpCollectFiles(sftp, root, {
          hidden: false,
          matcher: globMatcher,
          limit: 500,
          signal: deps.signal,
        })).files;
      }

      const snapKey = (p) => sshSnapshotKey(deps.hostRuntime.topicId, hostId, p);
      const perFileCap = st.isFile() ? GREP_PER_FILE_SINGLE : GREP_PER_FILE_MULTI;
      const rendered = [];
      let totalMatchCount = 0;
      const filePageStart = st.isFile() ? 0 : skip * GREP_FILE_PAGE;
      const pageFiles = st.isFile() ? files : files.slice(filePageStart, filePageStart + GREP_FILE_PAGE);

      for (const f of pageFiles) {
        if (deps.signal?.aborted) throw new Error('SSH 命令已取消');
        let buf;
        try {
          const fst = await sftpStat(sftp, f.path);
          if (fst.size > 4 * 1024 * 1024) continue; // max-filesize 4M
          buf = await sftpReadFile(sftp, f.path);
        } catch {
          continue;
        }
        if (classifyBufferAsBinary(buf.subarray(0, 4096))) continue;
        const content = buf.toString('utf8').replace(/\r\n/g, '\n');
        const lines = content === '' ? [] : content.replace(/\n$/, '').split('\n');
        const lineMap = new Map();
        const noteLine = (lineNo, text, isMatch) => {
          const prev = lineMap.get(lineNo);
          if (prev && (prev.isMatch || !isMatch)) return;
          lineMap.set(lineNo, { line: lineNo, text, isMatch });
        };
        let matchCount = 0;
        for (let ln = 0; ln < lines.length && matchCount < perFileCap; ln++) {
          const line = lines[ln];
          if (line.length > GREP_MAX_COLUMN) continue;
          if (regex.test(line)) {
            noteLine(ln + 1, line, true);
            matchCount++;
            // context lines (deduped; a real match always wins over context)
            for (let c = Math.max(0, ln - GREP_CONTEXT_BEFORE); c < ln; c++) {
              noteLine(c + 1, lines[c], false);
            }
            for (let c = ln + 1; c <= Math.min(lines.length - 1, ln + GREP_CONTEXT_AFTER); c++) {
              noteLine(c + 1, lines[c], false);
            }
          }
        }
        if (matchCount === 0) continue;
        totalMatchCount += matchCount;
        const entries2 = [...lineMap.values()].sort((a, b) => a.line - b.line);
        let tag = null;
        if (Buffer.byteLength(content, 'utf8') <= snapshots.SNAPSHOT_MAX_BYTES) {
          const seenRanges = entries2.map((e) => [e.line, Math.min(e.line, lines.length)]);
          tag = snapshots.recordSnapshot(snapKey(f.path), content, seenRanges);
        }
        rendered.push({ relPath: f.path, tag, entries: entries2 });
        if (totalMatchCount >= GREP_TOTAL_CAP) break;
      }

      const moreFiles = !st.isFile() && filePageStart + GREP_FILE_PAGE < files.length;
      const nextPageSkip = moreFiles ? skip + 1 : undefined;
      const totalCapHit = totalMatchCount >= GREP_TOTAL_CAP;
      const pastEnd = !st.isFile() && skip > 0 && pageFiles.length === 0 && files.length > 0;
      const output = pastEnd
        ? `No more results (skip=${skip} is past the last file page; use skip=${skip - 1} to go back)`
        : formatAnchoredGrep(rendered, { truncated: totalCapHit, nextPageSkip });
      return ok({ output, matchCount: totalMatchCount, fileCount: pageFiles.length });
    }, { signal: deps.signal, timeoutMs: 60_000 });
  } catch (e) {
    return fail(String(e?.message || e));
  }
}

async function toolSshWrite(args, deps = {}) {
  const rawPath = String(args?.path ?? '').trim();
  if (!rawPath) return fail('path required');
  if (args?.content === undefined || args?.content === null) return fail('content required');
  const target = resolveHostTarget(args, deps);
  if (target.error) return fail(target.error);
  const { hostId, connectParams, cwd } = target;
  const sshService = require('./sshService.cjs');
  const absPath = remoteJoin(cwd, rawPath);
  const content = stripWriteContent(args.content);
  const snapKey = (p) => sshSnapshotKey(deps.hostRuntime.topicId, hostId, p);

  try {
    return await sshService.withSftp(connectParams, async (sftp) => {
      let isOverwrite = false;
      try {
        const st = await sftpStat(sftp, absPath);
        isOverwrite = Boolean(st && st.isFile());
      } catch { /* new file */ }
      // parent dirs
      const parent = absPath.slice(0, absPath.lastIndexOf('/')) || '/';
      await sftpMkdirp(sftp, parent);
      if (isOverwrite) {
        // In-place write keeps mode/owner and follows symlinks (rename would
        // replace the inode and break both).
        await sftpWriteFile(sftp, absPath, Buffer.from(content, 'utf8'));
      } else {
        // New file: tmp + rename so a failed upload never leaves a partial file.
        const tmpPath = `${absPath}.df-tmp-${Math.random().toString(36).slice(2, 10)}`;
        await sftpWriteFile(sftp, tmpPath, Buffer.from(content, 'utf8'));
        try {
          await sftpRename(sftp, tmpPath, absPath);
        } catch (e) {
          await sftpUnlink(sftp, tmpPath).catch(() => {});
          throw e;
        }
      }

      const normalized = content.replace(/\r\n/g, '\n');
      const lines = normalized === '' ? [] : normalized.replace(/\n$/, '').split('\n');
      const total = lines.length;
      const tag = snapshots.recordSnapshot(snapKey(absPath), content, total > 0 ? [[1, total]] : []);
      const header = tag ? `[${absPath}#${tag}]\n` : '';
      const action = isOverwrite ? 'Updated' : 'Created';
      return ok({
        file_path: absPath,
        message: `${action} file.\n\n${header}Successfully wrote ${content.length} bytes to ${absPath}`,
      });
    }, { signal: deps.signal });
  } catch (e) {
    return fail(String(e?.message || e));
  }
}

async function toolSshEdit(args, deps = {}) {
  const input = String(args?.input ?? '');
  if (!input.trim()) return fail('input required');
  const target = resolveHostTarget(args, deps);
  if (target.error) return fail(target.error);
  const { hostId, connectParams, cwd } = target;
  const sshService = require('./sshService.cjs');
  const snapKey = (p) => sshSnapshotKey(deps.hostRuntime.topicId, hostId, p);

  try {
    return await sshService.withSftp(connectParams, async (sftp) => {
      const reports = await applyHashlinePatchAsync(input, {
        resolvePath: (p) => remoteJoin(cwd, p),
        snapshotKey: snapKey,
        readFile: (p) => sftpReadFile(sftp, p).then((b) => b.toString('utf8')),
        // In place: the file must exist (plan-first read), and replacing the
        // inode would drop mode/owner and break symlinks.
        writeFile: (p, c) => sftpWriteFile(sftp, p, Buffer.from(c, 'utf8')),
        unlink: (p) => sftpUnlink(sftp, p),
        rename: (from, to) => sftpRename(sftp, from, to),
        mkdir: (p) => sftpMkdirp(sftp, p),
      });
      const parts = [];
      for (const r of reports) {
        if (r.rem) {
          parts.push(`Removed ${r.absPath}`);
          continue;
        }
        const header = r.tag ? `[${r.finalPath}#${r.tag}]` : `[${r.finalPath}]`;
        const lines = [header, `Applied ${r.opCount} op(s): ${(r.opSummary || []).join(', ')}`];
        if (r.mv) lines.push(`Moved to ${r.finalPath}`);
        if (r.warnings && r.warnings.length > 0) {
          lines.push('Warnings:');
          for (const w of r.warnings) lines.push(`- ${w}`);
        }
        parts.push(lines.join('\n'));
      }
      return ok({ message: parts.join('\n\n'), results: reports });
    }, { signal: deps.signal, timeoutMs: 60_000 });
  } catch (e) {
    return fail(String(e?.message || e));
  }
}

async function toolSshCwd(args, deps = {}) {
  const target = resolveHostTarget(args, deps);
  if (target.error) return fail(target.error);
  const { hostId, connectParams, cwd } = target;
  const rt = deps.hostRuntime;
  const sshService = require('./sshService.cjs');
  const rawPath = String(args?.path ?? '').trim();

  if (!rawPath) {
    return ok({
      cwd: cwd || null,
      message: cwd ? `当前工作目录：${cwd}` : '当前工作目录：默认（登录 home 目录）',
    });
  }

  const absPath = remoteJoin(cwd, rawPath);
  try {
    const { stdout, stderr, exitCode } = await sshService.execOnSavedHost(
      connectParams,
      `cd ${sshService.shellQuote(absPath)} && pwd`,
      30_000,
      deps.signal,
    );
    if (exitCode !== 0) {
      const errText = String(stderr || stdout || '').trim();
      return fail(`cannot cd to ${absPath}: ${errText || `exit code ${exitCode}`}`);
    }
    const canonical = String(stdout || '').trim().split('\n').pop() || absPath;
    const okSet = rt.setCwd(rt.topicId, hostId, canonical);
    if (!okSet) return fail('无法持久化工作目录（对话状态写入失败）');
    return ok({ cwd: canonical, message: `工作目录已切换：${canonical}` });
  } catch (e) {
    return fail(String(e?.message || e));
  }
}
// 主机按名称（terminal context）或 hostId/hostRuntime（host context）解析；凭据从 sshCredentials 解析。
async function toolSshExec(args, deps = {}) {
  const command = String(args?.command || '').trim();
  if (!command) return fail('command required');
  if (args?.sudo !== undefined && typeof args.sudo !== 'boolean') return fail('sudo must be a boolean');
  if (/(?:^|[;&|()\n])\s*sudo(?:\s|$)/.test(command)) return fail('请移除命令中的 sudo，使用 ssh_exec 的 sudo: true 参数');

  // 超时契约：默认 30s、5..600s；0（bash 语义"禁用"）对一次性远程执行无意义，按默认处理。
  const timeoutSec =
    args?.timeout === undefined
      ? 30
      : Math.min(Math.max(Math.round(Number(args.timeout) || 30), 5), 600);
  const timeoutMs = timeoutSec * 1000;

  let settings = null;
  try {
    settings = require('./settingsSnapshot.cjs').getSnapshot() || {};
  } catch {
    settings = {};
  }

  const sshService = require('./sshService.cjs');
  let hostOperation = deps.hostOperation || null;
  let target;
  try {
    if (deps.hostRuntime) {
      deps.hostRuntime.assertValid?.();
      // host context：host/hostId 都缺省 → 所属主机。`host` 名称必须解析成
      // hostId 再校验授权，否则会被静默忽略、在所属主机上执行。
      const hostName = String(args?.host || '').trim() || null;
      let hostId = String(args?.hostId || '').trim() || null;
      if (hostName) {
        const resolved = sshService.resolveSshConnection(settings, { hostName });
        if (hostId && resolved.hostId !== hostId) {
          return fail(`host（${hostName}）与 hostId（${hostId}）指向不同主机，请只提供其一`);
        }
        hostId = resolved.hostId;
      }
      if (!hostId) hostId = deps.hostRuntime.hostId;
      if (!hostId) return fail('请明确指定已保存主机');
      if (hostOperation) {
        deps.hostRuntime.assertOperation(hostOperation);
        if (hostOperation.hostId !== hostId) return fail('SSH 操作目标与已确认主机不一致，请重新确认');
      }
      if (hostId !== deps.hostRuntime.defaultHostId && !deps.hostRuntime.isGranted(hostId)) {
        return fail(`尚未授权在主机 ${hostId} 上执行操作，请先征得用户确认`);
      }
      target = sshService.resolveSshConnection(settings, { hostId });
    } else {
      const hostName = String(args?.host || '').trim();
      if (!hostName) return fail('host required');
      target = sshService.resolveSshConnection(settings, { hostName });
    }
  } catch (e) {
    // 缺凭据：弹卡让用户选已有凭据或手输密码（仅本次），补全后重试解析。
    if (e?.code === 'SSH_MISSING_CREDENTIAL' && e.hostId) {
      const resolvedCred = await askForMissingCredential({ settings, hostId: e.hostId, deps });
      if (resolvedCred.error) return fail(resolvedCred.error);
      if (resolvedCred.hostOperation) {
        hostOperation = resolvedCred.hostOperation;
        delete resolvedCred.hostOperation;
      }
      target = resolvedCred;
    } else {
      return fail(String(e?.message || e));
    }
  }

  try { if (hostOperation) deps.hostRuntime?.assertOperation(hostOperation); } catch (e) {
    return fail(String(e?.message || e));
  }

  if (args?.sudo === true && deps.approvedSudoTarget) {
    const approved = deps.approvedSudoTarget;
    const actual = target.connectParams;
    if (target.hostId !== approved.id || target.hostName !== approved.name ||
        actual.user !== approved.user || actual.host !== approved.host ||
        (actual.port || 22) !== approved.port || (actual.proxyJump || '') !== approved.proxyJump) {
      return fail('审批期间目标主机身份已变化，请重新确认');
    }
  }

  // 当前操作使用主机确认时捕获的 cwd；之后更新的 cwd 只影响后续操作。
  let fullCommand = command;
  if (deps.hostRuntime) {
    const cwd = hostOperation
      ? hostOperation.cwd
      : deps.hostRuntime.getCwd(deps.hostRuntime.topicId, target.hostId);
    if (cwd) {
      fullCommand = `cd ${sshService.shellQuote(cwd)} && ${command}`;
    }
  }

  try {
    const { stdout, stderr, exitCode, truncated } = await sshService.execOnSavedHost(
      target.connectParams,
      fullCommand,
      timeoutMs,
      deps.signal,
      {
        sudo: args?.sudo === true,
        sudoCache: { topicId: deps.topicId, hostId: target.hostId },
        onPasswordPrompt: async (signal, attempt) => {
          const password = await askSudoPassword({ deps, hostName: target.hostName, connectParams: target.connectParams, attempt, signal });
          if (hostOperation) deps.hostRuntime.assertOperation(hostOperation);
          return password;
        },
      },
    );
    return ok({
      host: target.hostName,
      command,
      output: truncateTerminalOutput(String(stdout || '') + (stderr ? '\n' + stderr : '') + (truncated ? '\n…[远程输出超限被截断]' : '')),
      exitCode,
    });
  } catch (e) {
    return fail(String(e?.message || e));
  }
}

function executeSshBuiltinTool(toolName, args, deps) {
  switch (toolName) {
    case 'ssh_exec':
      return toolSshExec(args, deps);
    case 'ssh_hosts':
      return toolSshHosts(args, deps);
    case 'ssh_read':
      return toolSshRead(args, deps);
    case 'ssh_glob':
      return toolSshGlob(args, deps);
    case 'ssh_grep':
      return toolSshGrep(args, deps);
    case 'ssh_write':
      return toolSshWrite(args, deps);
    case 'ssh_edit':
      return toolSshEdit(args, deps);
    case 'ssh_cwd':
      return toolSshCwd(args, deps);
    default:
      return null;
  }
}

module.exports = { executeSshBuiltinTool, compileUserRegex };
