// Keep this explicit projection aligned with src/shared/hostSelection.ts.
function projectHostSelection(host) {
  return {
    id: host.id,
    name: typeof host.name === 'string' ? host.name : '',
    host: typeof host.host === 'string' ? host.host : '',
    port: Number(host.port) || 22,
    user: typeof host.user === 'string' ? host.user : '',
    proxyJump: typeof host.proxyJump === 'string' ? host.proxyJump : '',
    group: typeof host.group === 'string' ? host.group : '',
  };
}
function normalizeSelectedHosts(value) {
  if (!Array.isArray(value)) return [];
  const hosts = new Map();
  for (const item of value) {
    if (item && typeof item === 'object' && typeof item.id === 'string' && !hosts.has(item.id)) {
      hosts.set(item.id, projectHostSelection(item));
    }
  }
  return [...hosts.values()];
}
function targetIdentity(host) {
  return JSON.stringify([host.host, Number(host.port) || 22, host.user, host.proxyJump || '']);
}
function validateSelectedHosts(raw, savedHosts) {
  const errors = Object.create(null);
  const hosts = [];
  if (raw === undefined) return { hosts, errors };
  if (!Array.isArray(raw)) return { hosts, errors: { selection: '机器选择格式无效，请重新选择。' } };
  const seen = new Map();
  for (const item of raw) {
    if (!item || typeof item.id !== 'string' || !item.id ||
        typeof item.host !== 'string' || !item.host || typeof item.user !== 'string' || !item.user ||
        !Number.isInteger(item.port) || item.port < 1 || item.port > 65535 || typeof item.proxyJump !== 'string') {
      errors[item?.id || 'selection'] = '机器身份快照不完整，请移除后重新选择。';
      continue;
    }
    const actual = savedHosts.find((h) => h.id === item.id);
    if (!actual || targetIdentity(actual) !== targetIdentity(item)) {
      errors[item.id] = actual ? `机器「${actual.name}」的连接目标已变化，请重新选择。` : `机器「${item.name || item.id}」已被删除，请移除后重试。`;
      continue;
    }
    if (!seen.has(item.id)) {
      const host = projectHostSelection(actual);
      hosts.push(host);
      seen.set(item.id, targetIdentity(item));
    }
  }
  return { hosts, errors };
}
function buildSelectedHostsPrompt(hosts) {
  if (!hosts?.length) return '';
  return '## 用户通过 @ 明确选择的本轮机器\n\n' +
    '下列机器由主进程核验，是真实 hostId 与目标身份；已完成本轮目标确认，无需为这些明确选择重复查询 ssh_hosts 或询问目标。该规则仅针对本名单，未选机器仍须按原有目标确认流程处理。\n' +
    hosts.map((h) => JSON.stringify({ hostId: h.id, name: h.name, host: h.host, port: h.port, user: h.user, group: h.group })).join('\n') + '\n\n' +
    (hosts.length === 1 ? '本轮唯一默认目标为上述机器。' : '本轮有多台目标，所有 ssh_* 操作必须明确传 hostId；不得默认选第一台。') +
    '按用户正文分配任务；不清楚每台机器应做什么时再澄清，不自动对全部机器执行相同操作。所有命令和文件操作通过 ssh_* 执行，结果显示在工具卡片中，不使用 Terminal 或本机工具，不改变当前终端连接。此选择不表示长期授权，命令审批和计划模式限制仍然生效。';
}
module.exports = { projectHostSelection, normalizeSelectedHosts, validateSelectedHosts, buildSelectedHostsPrompt, targetIdentity };
