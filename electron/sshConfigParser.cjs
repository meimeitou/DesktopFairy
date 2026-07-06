// SSH config 文件解析器
// 解析标准 ~/.ssh/config 格式，提取 Host 块为 SshHost 数组。
// 仅识别 Host/HostName/User/Port/IdentityFile/ProxyJump 六个关键字（大小写不敏感）。
// 通配符 Host（含 * 或 ?）跳过。多跳 ProxyJump 取第一个。
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

/**
 * @param {string} content - SSH config 文件内容
 * @param {string} groupName - 分组名（通常为文件 basename）
 * @returns {Array} SshHost[]
 */
function parseSshConfig(content, groupName) {
  if (typeof content !== 'string') return [];
  const lines = content.split(/\r?\n/);
  const hosts = [];
  let current = null;

  const finalize = () => {
    if (!current) return;
    // name 由 Host 别名提供；host 由 HostName 提供，缺省则用 Host 名
    const host = current.hostName || current.name;
    if (current.name && host && current.user) {
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
        proxyJump: current.proxyJump,
      });
    }
    current = null;
  };

  for (let line of lines) {
    line = line.trim();
    if (!line || line.startsWith('#')) continue;
    // 拆分关键字与值（支持 key=value 或 key value）
    const eqIdx = line.indexOf('=');
    const spIdx = line.search(/\s/);
    let key, value;
    if (eqIdx > 0 && (spIdx < 0 || eqIdx < spIdx)) {
      key = line.slice(0, eqIdx).trim();
      value = line.slice(eqIdx + 1).trim();
    } else {
      const m = line.match(/^(\S+)\s+(.*)$/);
      if (!m) continue;
      key = m[1];
      value = m[2].trim();
    }
    const lk = key.toLowerCase();

    if (lk === 'host') {
      finalize();
      // Host 可跟多个别名，取第一个；跳过通配符
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
    } else if (lk === 'hostname') {
      current.hostName = value;
    } else if (lk === 'user') {
      current.user = value;
    } else if (lk === 'port') {
      const p = Number(value);
      if (Number.isFinite(p)) current.port = p;
    } else if (lk === 'identityfile') {
      current.identityFile = normalizePath(value);
    } else if (lk === 'proxyjump') {
      current.proxyJump = parseProxyJumpValue(value);
    }
  }
  finalize();
  return hosts;
}

module.exports = { parseSshConfig };
