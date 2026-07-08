// SSH config 文件解析器
// 解析标准 ~/.ssh/config 格式，提取 Host 块为 SshHost 数组。
// 仅识别 Host/HostName/User/Port/IdentityFile/ProxyJump 六个关键字（大小写不敏感）。
// 通配符 Host（含 * 或 ?）跳过。多跳 ProxyJump 取第一个。
//
// 两遍解析：第一遍收集所有 Host 块（含 User/IdentityFile/HostName/Port）建立索引，
// 第二遍产出 SshHost 时，对带 ProxyJump 的 Host 查跳板机别名，回填其 User/IdentityFile
// 到 proxyJump 串与 proxyJumpPrivateKeyPath，模拟系统 ssh CLI 的行为。
const path = require('path');

function genId(group, name) {
  const g = (group || '').replace(/[^a-zA-Z0-9]/g, '').slice(0, 16);
  const n = (name || '').replace(/[^a-zA-Z0-9]/g, '').slice(0, 16);
  return `cfg_${g}_${n}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

function parseProxyJumpValue(raw) {
  if (!raw) return undefined;
  // 多跳用逗号分隔，取第一个
  const first = raw.split(',')[0].trim();
  return first || undefined;
}

function normalizePath(p) {
  if (!p) return undefined;
  // ~/foo → 不展开（ssh2 不自动展开 ~），保留原样由用户/调用方处理
  const trimmed = p.trim().replace(/^"|"$/g, '');
  return trimmed || undefined;
}

// 解析一行 ssh config：返回 { key, value } 或 null
function parseLine(line) {
  line = line.trim();
  if (!line || line.startsWith('#')) return null;
  const eqIdx = line.indexOf('=');
  const spIdx = line.search(/\s/);
  let key, value;
  if (eqIdx > 0 && (spIdx < 0 || eqIdx < spIdx)) {
    key = line.slice(0, eqIdx).trim();
    value = line.slice(eqIdx + 1).trim();
  } else {
    const m = line.match(/^(\S+)\s+(.*)$/);
    if (!m) return null;
    key = m[1];
    value = m[2].trim();
  }
  return { key: key.toLowerCase(), value };
}

// 第一遍：扫描整个文件，收集所有非通配符 Host 块到索引。
// 返回 Map<alias, { user, identityFile, hostName, port }>。
function buildHostIndex(content) {
  const index = new Map();
  if (typeof content !== 'string') return index;
  const lines = content.split(/\r?\n/);
  let current = null; // { name, user, identityFile, hostName, port }

  const finalize = () => {
    if (current && current.name && !/[*?]/.test(current.name)) {
      // 首个别名作 key（与第二遍产出逻辑一致）
      index.set(current.name, current);
    }
    current = null;
  };

  for (const line of lines) {
    const parsed = parseLine(line);
    if (!parsed) continue;
    const { key, value } = parsed;

    if (key === 'host') {
      finalize();
      const aliases = value.split(/\s+/).filter(Boolean);
      const first = aliases[0];
      if (!first || /[*?]/.test(first)) {
        // 通配符 Host：开空块但不入索引
        current = { name: '', user: '', identityFile: undefined, hostName: '', port: 0 };
      } else {
        current = { name: first, user: '', identityFile: undefined, hostName: '', port: 0 };
      }
    } else if (!current) {
      continue;
    } else if (key === 'hostname') {
      current.hostName = value;
    } else if (key === 'user') {
      current.user = value;
    } else if (key === 'port') {
      const p = Number(value);
      if (Number.isFinite(p)) current.port = p;
    } else if (key === 'identityfile') {
      // 多次出现取最后一个（与 ssh config 语义一致）
      current.identityFile = normalizePath(value);
    }
  }
  finalize();
  return index;
}

// 查跳板机别名，回填 proxyJump 串的 user 与跳板私钥路径。
// jumpRaw: "[user@]host[:port]" 原始串
// hostIndex: 第一遍建的索引
// fallbackUser: 目标主机 user，作为跳板用户名缺省回退
// 返回 { proxyJump, proxyJumpPrivateKeyPath }
function resolveJumpCredentials(jumpRaw, hostIndex, fallbackUser) {
  if (!jumpRaw) return {};
  // 先拆出 host 部分（去掉 user@ 和 :port）
  let s = jumpRaw;
  let userInStr;
  const atIdx = s.lastIndexOf('@');
  if (atIdx > 0) {
    userInStr = s.slice(0, atIdx);
    s = s.slice(atIdx + 1);
  }
  let portInStr;
  const colonIdx = s.lastIndexOf(':');
  if (colonIdx > 0) {
    const p = Number(s.slice(colonIdx + 1));
    if (Number.isFinite(p) && p > 0 && p < 65536) {
      portInStr = p;
      s = s.slice(0, colonIdx);
    }
  }
  const jumpHostAlias = s;
  if (!jumpHostAlias) return { proxyJump: jumpRaw };

  // 查索引：别名命中才回填；裸 hostname（非 config 别名）跳过，交给运行时 auto + 默认私钥
  const jumpEntry = hostIndex.get(jumpHostAlias);
  if (!jumpEntry) return { proxyJump: jumpRaw };

  const user = userInStr || jumpEntry.user || fallbackUser;
  const port = portInStr || jumpEntry.port || 22;
  // 重新拼装规范化的 proxyJump 串
  const proxyJump = `${user ? `${user}@` : ''}${jumpHostAlias}:${port}`;
  const proxyJumpPrivateKeyPath = jumpEntry.identityFile;
  return { proxyJump, proxyJumpPrivateKeyPath };
}

/**
 * @param {string} content - SSH config 文件内容
 * @param {string} groupName - 分组名（通常为文件 basename）
 * @returns {Array} SshHost[]
 */
function parseSshConfig(content, groupName) {
  if (typeof content !== 'string') return [];
  const hostIndex = buildHostIndex(content);

  const lines = content.split(/\r?\n/);
  const hosts = [];
  let current = null;

  const finalize = () => {
    if (!current) return;
    // name 由 Host 别名提供；host 由 HostName 提供，缺省则用 Host 名
    const host = current.hostName || current.name;
    if (current.name && host && current.user) {
      // 解析跳板：若 ProxyJump 指向 config 内的别名，回填其 User/IdentityFile
      const jumpResolved = current.proxyJump
        ? resolveJumpCredentials(current.proxyJump, hostIndex, current.user)
        : {};
      hosts.push({
        id: genId(groupName, current.name),
        name: current.name,
        host,
        port: current.port || 22,
        user: current.user,
        // 导入的主机默认 'auto'：同时尝试 agent + 私钥，由 ssh2 按服务端允许的方法依次尝试
        authMethod: 'auto',
        password: undefined,
        privateKeyPath: current.identityFile,
        group: groupName || undefined,
        proxyJump: jumpResolved.proxyJump || current.proxyJump,
        // 跳板机认证：导入时默认 auto（agent + 私钥），由 ssh2 按服务端允许的方法依次尝试
        proxyJumpAuthMethod: jumpResolved.proxyJumpPrivateKeyPath ? 'auto' : undefined,
        proxyJumpPassword: undefined,
        proxyJumpPrivateKeyPath: jumpResolved.proxyJumpPrivateKeyPath,
      });
    }
    current = null;
  };

  for (const line of lines) {
    const parsed = parseLine(line);
    if (!parsed) continue;
    const { key, value } = parsed;

    if (key === 'host') {
      finalize();
      const aliases = value.split(/\s+/).filter(Boolean);
      const first = aliases[0];
      if (!first || /[*?]/.test(first)) {
        // 通配符 Host，开始一个空块但不产出（finalize 时 name 会是通配符被跳过）
        current = { name: first || '', hostName: '', user: '', port: 0, identityFile: undefined, proxyJump: undefined };
        continue;
      }
      current = { name: first, hostName: '', user: '', port: 0, identityFile: undefined, proxyJump: undefined };
    } else if (!current) {
      continue; // 块外的指令忽略
    } else if (key === 'hostname') {
      current.hostName = value;
    } else if (key === 'user') {
      current.user = value;
    } else if (key === 'port') {
      const p = Number(value);
      if (Number.isFinite(p)) current.port = p;
    } else if (key === 'identityfile') {
      current.identityFile = normalizePath(value);
    } else if (key === 'proxyjump') {
      current.proxyJump = parseProxyJumpValue(value);
    }
  }
  finalize();
  return hosts;
}

module.exports = { parseSshConfig };
