const fs = require('fs');
const path = require('path');
const policy = require('./agentEnvironmentPolicy.json');

function migrateTerminalSettings(settings) {
  const next = { ...settings };
  const agents = Array.isArray(settings.agents) ? settings.agents : [];
  const terminalId = agents.some((a) => a?.id === next.terminalAgentId && a.id !== 'host-assistant' && a.builtinRole !== 'host-assistant')
    ? next.terminalAgentId : 'terminal-assistant';
  next.terminalAgentId = terminalId;
  next.agents = agents.filter((a) => a && a.id !== 'host-assistant' && a.builtinRole !== 'host-assistant').map((a) => {
    if (a.id !== terminalId && a.id !== 'terminal-assistant') return a;
    if (typeof a.soul === 'string' && [policy.legacyTerminalSoul, ...policy.previousTerminalSouls].some((soul) => soul.trim() === a.soul.trim())) {
      a = { ...a, soul: policy.terminalSoul };
    }
    if (a.toolOverrides) return a;
    const legacyIds = { Bash: 'bash', Read: 'read', Write: 'write', Edit: 'edit', MultiEdit: 'edit', Glob: 'glob', Grep: 'grep' };
    const disabled = (Array.isArray(a.disabledToolIds) ? a.disabledToolIds : []).map((id) => legacyIds[id] || id);
    return {
      ...a,
      disabledToolIds: [],
      toolOverrides: Object.fromEntries(disabled.filter((id) => !policy.legacyTerminalDisabled.includes(id)).map((id) => [id, false])),
    };
  });
  if (next.activeChatAgentId === 'host-assistant') {
    next.activeChatAgentId = next.agents.find((a) => a.id !== terminalId && a.id !== 'terminal-assistant')?.id;
  }
  delete next.terminalAssistantMigrationSource;
  next.terminalAssistantVersion = 1;
  return next;
}

function migrateTerminalTopics(store, terminalId = 'terminal-assistant') {
  let changed = false;
  const topics = (store.topics || []).map((topic) => {
    // 只改绑 host-assistant 的旧话题；origin==='terminal' 但用户显式指派了
    // 其他智能体的话题保留原绑定（改绑 = 覆盖用户显式选择）。
    if (topic && topic.agentId === 'host-assistant' && topic.agentId !== terminalId) {
      changed = true;
      return { ...topic, agentId: terminalId };
    }
    return topic;
  });
  return changed ? { ...store, topics } : store;
}

function backupFile(file) {
  if (!fs.existsSync(file)) return;
  const dir = path.join(path.dirname(file), 'terminal-assistant-migration-v1');
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  const target = path.join(dir, path.basename(file));
  if (!fs.existsSync(target)) {
    // 原子备份：先写临时名再 rename。copyFileSync 中途崩溃留下的部分文件
    // 不会占用最终名，重试仍能重备。
    const tmp = `${target}.tmp`;
    fs.copyFileSync(file, tmp);
    fs.renameSync(tmp, target);
  }
  fs.chmodSync(target, 0o600);
}

function backupRendererSettings(settingsFile, original) {
  const dir = path.join(path.dirname(settingsFile), 'terminal-assistant-migration-v1');
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  const target = path.join(dir, 'renderer-settings.json');
  if (!fs.existsSync(target)) fs.writeFileSync(target, JSON.stringify(original, null, 2), { flag: 'wx', mode: 0o600 });
}

function atomicWrite(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temp = `${file}.terminal-migration.tmp`;
  const fd = fs.openSync(temp, 'w', 0o600);
  try {
    fs.writeFileSync(fd, JSON.stringify(value, null, 2));
    fs.fsyncSync(fd); // rename 前落盘，断电不留下空/半写的目标文件
  } finally {
    fs.closeSync(fd);
  }
  fs.renameSync(temp, file);
}

/** Backup both originals before either write. Safe to retry after interruption. */
function migrateTerminalFiles(settingsFile, topicsFile) {
  const settings = fs.existsSync(settingsFile) ? JSON.parse(fs.readFileSync(settingsFile, 'utf8')) : null;
  const store = fs.existsSync(topicsFile) ? JSON.parse(fs.readFileSync(topicsFile, 'utf8')) : null;
  const nextSettings = settings && migrateTerminalSettings(settings);
  const nextStore = store && migrateTerminalTopics(store, nextSettings?.terminalAgentId);
  const settingsChanged = settings && JSON.stringify(settings) !== JSON.stringify(nextSettings);
  if (!settingsChanged && store === nextStore) return;
  backupFile(settingsFile);
  backupFile(topicsFile);
  if (store !== nextStore) atomicWrite(topicsFile, nextStore);
  if (settingsChanged) atomicWrite(settingsFile, nextSettings);
}

module.exports = { migrateTerminalSettings, migrateTerminalTopics, migrateTerminalFiles, backupFile, backupRendererSettings, atomicWrite };
