const fs = require('fs');
const path = require('path');
const { hostFingerprint } = require('./chatSessionService.cjs');

const HOST_ASSISTANT_ID = 'host-assistant';

/** Tools whose cross-host invocation requires a user grant. */
const CROSS_HOST_TOOL_NAMES = new Set([
  'ssh_exec',
  'ssh_read',
  'ssh_glob',
  'ssh_grep',
  'ssh_write',
  'ssh_edit',
  'ssh_cwd',
]);

/**
 * Host-conversation runtime: per-topic host binding, cross-host grants,
 * per-host cwd, and host settings mutations (add/update/delete) with
 * grant/cwd invalidation + topic cascade.
 */
function createHostConversationService({
  topicStore,
  settingsSnapshot,
  manager,
  abortRequestApprovals,
  getWindows,
  settingsPath,
}) {
  const getSettings = () => settingsSnapshot.getSnapshot() || {};
  const getHosts = () => {
    const s = getSettings();
    return Array.isArray(s.sshHosts) ? s.sshHosts : [];
  };
  const findHost = (hostId) => getHosts().find((h) => h && h.id === hostId) || null;

  function fingerprintOf(hostId) {
    const host = findHost(hostId);
    return host ? hostFingerprint(host) : null;
  }

  /** connectParams for a hostId, or throw with a user-readable message. */
  function resolveConnectParams(hostId) {
    const host = findHost(hostId);
    if (!host) {
      const names = getHosts().map((h) => h?.name).filter(Boolean).join('; ');
      throw new Error(`主机已不存在（id: ${hostId}）。${names ? `当前可用主机：${names}` : '请先在终端设置中添加主机'}`);
    }
    const { resolveSshConnection } = require('./sshService.cjs');
    return resolveSshConnection(getSettings(), { hostId }).connectParams;
  }

  /**
   * Per-stream host runtime. Throws when the topic is not a valid host
   * conversation — the stream must end with an error, never degrade silently.
   */
  function resolveHostRuntime(topicId) {
    const topic = topicStore.getTopic(topicId);
    if (!topic) throw new Error('对话不存在或已被删除');
    if (topic.agentId !== HOST_ASSISTANT_ID) {
      throw new Error('该对话未绑定主机助手，无法使用主机工具');
    }
    if (!topic.host || typeof topic.host.hostId !== 'string' || !topic.host.hostId) {
      throw new Error('该对话缺少主机绑定信息');
    }
    const hostId = topic.host.hostId;
    const host = findHost(hostId);
    if (!host) {
      throw new Error(`对话所属主机「${host?.name || hostId}」已从设置中删除，无法继续操作`);
    }

    /**
     * Grant check reads the live topic store (not the stream-start snapshot),
     * so an approval granted mid-turn takes effect immediately.
     */
    const isGranted = (targetHostId) => {
      const fp = fingerprintOf(targetHostId);
      if (!fp) return false;
      const live = topicStore.getTopic(topicId);
      return live?.host?.grants?.[targetHostId] === fp;
    };

    const rt = {
      topicId,
      defaultHostId: hostId,
      hostId,
      hostName: host.name,
      fingerprint: hostFingerprint(host),
      grants: { ...(topic.host.grants || {}) },
      cwdByHost: { ...(topic.host.cwdByHost || {}) },
      forceApproval,
      ensureGrant,
      isGranted,
      getCwd,
      setCwd,
      fingerprintOf,
      resolveConnectParams,
      resolveHostIdByName,
      applyHostSettingsMutation,
    };
    return rt;
  }

  /** cwd for hostId, or null (= login home default, no cd prefix). */
  function getCwd(topicId, hostId) {
    const topic = topicStore.getTopic(topicId);
    const entry = topic?.host?.cwdByHost?.[hostId];
    if (!entry) return null;
    const fp = fingerprintOf(hostId);
    if (!fp || entry.identity !== fp) return null; // host identity changed → stale
    return entry.path;
  }
  function setCwd(topicId, hostId, cwdPath) {
    const fp = fingerprintOf(hostId);
    if (!fp) return false;
    return topicStore.updateHostState(topicId, (host) => ({
      ...host,
      cwdByHost: { ...host.cwdByHost, [hostId]: { identity: fp, path: cwdPath } },
    }));
  }

  /** Only called from the tool-execution path after an approval was accepted. */
  function ensureGrant(topicId, hostId) {
    const fp = fingerprintOf(hostId);
    if (!fp) return false;
    return topicStore.updateHostState(topicId, (host) => ({
      ...host,
      grants: { ...host.grants, [hostId]: fp },
    }));
  }

  /**
   * Force-approval rules (cannot be bypassed by full-auto / "always allow"):
   * - ssh_hosts write actions, always;
   * - cross-host ssh_* calls without a matching grant.
   */
  function forceApproval(name, args, rt) {
    if (name === 'ssh_hosts' && args?.action !== 'list') return true;
    if (
      CROSS_HOST_TOOL_NAMES.has(name) &&
      args?.hostId &&
      args.hostId !== rt.defaultHostId &&
      !rt.isGranted(args.hostId)
    ) {
      return true;
    }
    return false;
  }

  function persistSettings(settings) {
    try {
      fs.writeFileSync(settingsPath(), JSON.stringify(settings, null, 2));
    } catch (e) {
      return { ok: false, error: String(e?.message || e) };
    }
    let revision;
    try {
      revision = settingsSnapshot.setSnapshot(settings);
    } catch { /* optional */ }
    const payload = typeof revision === 'number' ? { settings, revision } : settings;
    for (const win of getWindows?.() || []) {
      try {
        if (win && !win.isDestroyed()) win.webContents.send('settings:updated', payload);
      } catch { /* destroyed */ }
    }
    return { ok: true };
  }

  /**
   * Converged ssh_hosts add/update/delete for host conversations.
   * Validation is shared with the terminal/local path (field whitelist,
   * name uniqueness, credential existence) via the executors' validator.
   */
  async function applyHostSettingsMutation({ action, host, fields }) {
    // Work on a deep copy: the snapshot object is shared with main-process
    // readers, so a failed disk write must not leave memory mutated.
    const raw = settingsSnapshot.getSnapshot();
    if (!raw || typeof raw !== 'object') {
      return { ok: false, error: '设置尚未加载，请稍后重试' };
    }
    const settings = JSON.parse(JSON.stringify(raw));
    if (!Array.isArray(settings.sshHosts)) settings.sshHosts = [];
    const hosts = settings.sshHosts;

    if (action === 'add') {
      if (hosts.some((h) => h && h.name === fields.name)) {
        return { ok: false, error: `已存在名为 "${fields.name}" 的主机` };
      }
      const entry = {
        id: `ssh_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        port: 22,
        authMethod: 'auto',
        ...fields,
      };
      hosts.push(entry);
      const persisted = persistSettings(settings);
      if (!persisted.ok) return { ok: false, error: 'Could not write settings' };
      return { ok: true, hostEntry: entry };
    }

    const hostName = String(host || '').trim();
    const matches = hosts.filter((h) => h && h.name === hostName);
    if (matches.length === 0) {
      return { ok: false, error: `未找到名为 "${hostName}" 的已保存主机` };
    }
    if (matches.length > 1) {
      return { ok: false, error: `主机名 "${hostName}" 不唯一，请让用户确认目标` };
    }
    const target = matches[0];

    if (action === 'delete') {
      // Order: abort streams → delete topic files → remove from settings.
      deleteTopicsByHost(target.id);
      settings.sshHosts = hosts.filter((h) => h !== target);
      const persisted = persistSettings(settings);
      if (!persisted.ok) return { ok: false, error: 'Could not write settings' };
      return { ok: true, hostEntry: target };
    }

    // update
    if (!fields || Object.keys(fields).length === 0) {
      return { ok: false, error: 'update 需要至少一个字段' };
    }
    if (
      'name' in fields &&
      fields.name !== target.name &&
      hosts.some((h) => h && h !== target && h.name === fields.name)
    ) {
      return { ok: false, error: `已存在名为 "${fields.name}" 的主机` };
    }
    const before = hostFingerprint(target);
    for (const [key, value] of Object.entries(fields)) {
      if (value == null) delete target[key];
      else target[key] = value;
    }
    const after = hostFingerprint(target);
    if (before !== after) {
      // Identity changed → grants and cwd for this host are void across all topics.
      const store = topicStore.readStore();
      let changed = false;
      for (const topic of store.topics || []) {
        if (!topic?.host || topic.host.hostId !== target.id) continue;
        if (topic.host.grants && target.id in topic.host.grants) {
          delete topic.host.grants[target.id];
          changed = true;
        }
        if (topic.host.cwdByHost && target.id in topic.host.cwdByHost) {
          delete topic.host.cwdByHost[target.id];
          changed = true;
        }
      }
      if (changed) topicStore.writeStore(store);
    }
    const persisted = persistSettings(settings);
    if (!persisted.ok) return { ok: false, error: 'Could not write settings' };
    return { ok: true, hostEntry: target };
  }

  /** Delete every host conversation bound to hostId (abort streams first). */
  function deleteTopicsByHost(hostId) {
    return topicStore.deleteTopicsByHost(hostId);
  }

  /** Unique saved-host id for an exact name, or null (missing / ambiguous). */
  function resolveHostIdByName(hostName) {
    const matches = getHosts().filter((h) => h && h.name === hostName);
    return matches.length === 1 ? matches[0].id : null;
  }

  return {
    resolveHostRuntime,
    fingerprintOf,
    resolveConnectParams,
    getCwd,
    setCwd,
    ensureGrant,
    forceApproval,
    resolveHostIdByName,
    applyHostSettingsMutation,
    deleteTopicsByHost,
  };
}

module.exports = {
  createHostConversationService,
  hostFingerprint,
  CROSS_HOST_TOOL_NAMES,
};
