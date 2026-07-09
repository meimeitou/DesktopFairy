export const SSH_UNGROUPED_LABEL = "未分组";

// 'auto' = 同时尝试所有可用方式（agent + privateKey + password），由 ssh2 按服务端允许的方法依次尝试。
// 参考 tabby 的 Auto 认证模式。
export type SshAuthMethod = "auto" | "password" | "privateKey" | "agent";

export interface TerminalSettings {
  /** xterm.js font size in pixels */
  fontSize: number;
  /** CSS font-family string for xterm.js */
  fontFamily: string;
  /** Scrollback buffer length in lines */
  scrollback: number;
  /** Cursor shape */
  cursorStyle: CursorStyle;
}

export interface SshHost {
  id: string;
  name: string;
  host: string;
  port: number;
  user: string;
  authMethod: SshAuthMethod;
  /** 引用 SshCredential.id。连接时由 renderer 解析为 password/privateKeyPath。 */
  credentialId?: string;
  // —— 以下内联凭据字段仅用于向后兼容迁移；迁移完成后应恒为 undefined。
  password?: string;
  privateKeyPath?: string;
  group?: string;
  proxyJump?: string;
  // 跳板机专用凭据。缺省 'auto'（agent + ~/.ssh 默认私钥 + 密码），与 ssh CLI 一致。
  // proxyJump 串的 user@ 部分作为跳板用户名；未提供时回退到目标主机 user。
  proxyJumpAuthMethod?: SshAuthMethod;
  /** 跳板机引用的 SshCredential.id。 */
  proxyJumpCredentialId?: string;
  proxyJumpPassword?: string;
  proxyJumpPrivateKeyPath?: string;
}

/**
 * SSH 凭据实体。一个凭据可同时持有密码与私钥路径（适配 auto 模式：ssh2 依次尝试）。
 * 被 SshHost.credentialId / proxyJumpCredentialId 引用，集中管理。
 */
export interface SshCredential {
  id: string;
  name: string;
  password?: string;
  privateKeyPath?: string;
  note?: string;
}

/** 最近连接历史记录。保存完整 SshHost 快照，即使原主机被删除仍可快速重连。 */
export interface SshRecentEntry {
  host: SshHost;
  connectedAt: number;
}

export const DEFAULT_TERMINAL_SETTINGS: TerminalSettings = {
  fontSize: 13,
  fontFamily: 'Menlo, Monaco, "Courier New", monospace',
  scrollback: 10000,
  cursorStyle: "block",
};

const MIN_FONT_SIZE = 8;
const MAX_FONT_SIZE = 32;
const MIN_SCROLLBACK = 1000;
const MAX_SCROLLBACK = 100000;
const VALID_CURSOR_STYLES: CursorStyle[] = ["block", "beam", "underline"];

export function normalizeTerminalSettings(value: unknown): TerminalSettings {
  const v = (value ?? {}) as Partial<TerminalSettings>;
  const fontSize = Number(v.fontSize);
  const scrollback = Number(v.scrollback);
  return {
    fontSize: Number.isFinite(fontSize)
      ? Math.min(MAX_FONT_SIZE, Math.max(MIN_FONT_SIZE, Math.round(fontSize)))
      : DEFAULT_TERMINAL_SETTINGS.fontSize,
    fontFamily:
      typeof v.fontFamily === "string" && v.fontFamily.trim()
        ? v.fontFamily.trim()
        : DEFAULT_TERMINAL_SETTINGS.fontFamily,
    scrollback: Number.isFinite(scrollback)
      ? Math.min(MAX_SCROLLBACK, Math.max(MIN_SCROLLBACK, Math.round(scrollback)))
      : DEFAULT_TERMINAL_SETTINGS.scrollback,
    cursorStyle: VALID_CURSOR_STYLES.includes(v.cursorStyle as CursorStyle)
      ? (v.cursorStyle as CursorStyle)
      : DEFAULT_TERMINAL_SETTINGS.cursorStyle,
  };
}

const VALID_AUTH_METHODS: SshAuthMethod[] = ["auto", "password", "privateKey", "agent"];

function genId(): string {
  return `ssh_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function normalizeSshGroups(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const result: string[] = [];
  for (const item of value) {
    if (typeof item !== "string") continue;
    const trimmed = item.trim();
    if (!trimmed || trimmed === SSH_UNGROUPED_LABEL) continue;
    if (seen.has(trimmed)) continue;
    seen.add(trimmed);
    result.push(trimmed);
  }
  return result;
}

export function normalizeSshHosts(value: unknown): SshHost[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((s): s is Record<string, unknown> => !!s && typeof s === "object")
    .map((s) => ({
      id: typeof s.id === "string" ? s.id : genId(),
      name: typeof s.name === "string" ? s.name.trim() : "",
      host: typeof s.host === "string" ? s.host.trim() : "",
      port: Number.isFinite(Number(s.port)) ? Number(s.port) : 22,
      user: typeof s.user === "string" ? s.user.trim() : "",
      authMethod: VALID_AUTH_METHODS.includes(s.authMethod as SshAuthMethod)
        ? (s.authMethod as SshAuthMethod)
        : "auto",
      credentialId: typeof s.credentialId === "string" ? s.credentialId : undefined,
      password: typeof s.password === "string" ? s.password : undefined,
      privateKeyPath:
        typeof s.privateKeyPath === "string" ? s.privateKeyPath : undefined,
      group: typeof s.group === "string" ? s.group.trim() || undefined : undefined,
      proxyJump: typeof s.proxyJump === "string" ? s.proxyJump.trim() || undefined : undefined,
      proxyJumpAuthMethod: VALID_AUTH_METHODS.includes(s.proxyJumpAuthMethod as SshAuthMethod)
        ? (s.proxyJumpAuthMethod as SshAuthMethod)
        : undefined,
      proxyJumpCredentialId: typeof s.proxyJumpCredentialId === "string" ? s.proxyJumpCredentialId : undefined,
      proxyJumpPassword: typeof s.proxyJumpPassword === "string" ? s.proxyJumpPassword : undefined,
      proxyJumpPrivateKeyPath:
        typeof s.proxyJumpPrivateKeyPath === "string" ? s.proxyJumpPrivateKeyPath : undefined,
    }))
    .filter((s) => s.name && s.host && s.user);
}

/** 规范化凭据列表：类型校验 + 去除空字段 + 去重(按 id) + 过滤无效项(密码与私钥至少一个非空)。 */
export function normalizeSshCredentials(value: unknown): SshCredential[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const result: SshCredential[] = [];
  for (const c of value) {
    if (!c || typeof c !== "object") continue;
    const r = c as Record<string, unknown>;
    const password = typeof r.password === "string" && r.password ? r.password : undefined;
    const privateKeyPath = typeof r.privateKeyPath === "string" && r.privateKeyPath.trim()
      ? r.privateKeyPath.trim() : undefined;
    // 密码与私钥至少一个非空，否则丢弃该凭据
    if (!password && !privateKeyPath) continue;
    const id = typeof r.id === "string" ? r.id : genCredId();
    if (seen.has(id)) continue;
    seen.add(id);
    const name = typeof r.name === "string" ? r.name.trim() : "";
    result.push({
      id,
      name: name || "未命名凭据",
      password,
      privateKeyPath,
      note: typeof r.note === "string" ? r.note.trim() || undefined : undefined,
    });
  }
  return result;
}

function genCredId(): string {
  return `cred_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * 一次性迁移：把 SshHost / SshRecentEntry 中的内联凭据(password/privateKeyPath 等)
 * 提取为独立的 SshCredential，并在主机上改存 credentialId 引用。
 * 幂等：迁移后内联字段被清空，再次调用不会重复创建凭据。
 *
 * 去重策略：按 (password, privateKeyPath) 元组复用同一凭据 —— 多台主机共用一把私钥时
 * 只创建一条凭据记录。
 */
export function migrateInlineCredentials(
  sshHosts: SshHost[],
  sshRecent: SshRecentEntry[],
  sshCredentials: SshCredential[],
): { sshHosts: SshHost[]; sshRecent: SshRecentEntry[]; sshCredentials: SshCredential[] } {
  // (password, privateKeyPath) → credentialId
  const tupleToId = new Map<string, string>();
  const creds = [...sshCredentials];
  for (const c of creds) {
    tupleToId.set(tupleKey(c.password, c.privateKeyPath), c.id);
  }

  const ensureCredential = (password: string | undefined, privateKeyPath: string | undefined, fallbackName: string): string | undefined => {
    if (!password && !privateKeyPath) return undefined;
    const tk = tupleKey(password, privateKeyPath);
    const existing = tupleToId.get(tk);
    if (existing) return existing;
    const id = genCredId();
    creds.push({
      id,
      name: fallbackName,
      password,
      privateKeyPath,
    });
    tupleToId.set(tk, id);
    return id;
  };

  const migrateHost = (h: SshHost, idx: number, label: string): SshHost => {
    if (h.credentialId || (!h.password && !h.privateKeyPath)) {
      // 已引用或无内联凭据 —— 仅清空残留内联字段
      return { ...h, password: undefined, privateKeyPath: undefined };
    }
    const credId = ensureCredential(h.password, h.privateKeyPath, `${label} 的凭据`);
    return { ...h, credentialId: credId, password: undefined, privateKeyPath: undefined };
  };

  const migrateProxyJump = (h: SshHost, label: string): SshHost => {
    if (h.proxyJumpCredentialId || (!h.proxyJumpPassword && !h.proxyJumpPrivateKeyPath)) {
      return { ...h, proxyJumpPassword: undefined, proxyJumpPrivateKeyPath: undefined };
    }
    const credId = ensureCredential(h.proxyJumpPassword, h.proxyJumpPrivateKeyPath, `${label} 跳板机凭据`);
    return { ...h, proxyJumpCredentialId: credId, proxyJumpPassword: undefined, proxyJumpPrivateKeyPath: undefined };
  };

  const newHosts = sshHosts.map((h, i) => migrateProxyJump(migrateHost(h, i, h.name), h.name));
  const newRecent = sshRecent.map((e, i) => {
    const migrated = migrateProxyJump(migrateHost(e.host, i, e.host.name), e.host.name);
    return { host: migrated, connectedAt: e.connectedAt };
  });

  return { sshHosts: newHosts, sshRecent: newRecent, sshCredentials: creds };
}

function tupleKey(password: string | undefined, privateKeyPath: string | undefined): string {
  return `${password ?? ""}\u0000${privateKeyPath ?? ""}`;
}

const MAX_SSH_RECENT = 5;

/** 生成去重 key：host + user + port 唯一标识一个连接目标 */
export function sshRecentKey(h: { host: string; user: string; port: number }): string {
  return `${h.user}@${h.host}:${h.port}`;
}

/** 规范化最近连接历史：去重（按 user@host:port）、cap 5 条、过滤无效条目 */
export function normalizeSshRecent(value: unknown): SshRecentEntry[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const entries: SshRecentEntry[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const e = item as Partial<SshRecentEntry>;
    const host = normalizeSshHosts([e.host])[0];
    const connectedAt = Number(e.connectedAt);
    if (!host || !Number.isFinite(connectedAt)) continue;
    const key = sshRecentKey(host);
    if (seen.has(key)) continue;
    seen.add(key);
    entries.push({ host, connectedAt });
  }
  return entries.slice(0, MAX_SSH_RECENT);
}

/** 追加一条最近连接记录（去重 + cap），返回新数组 */
export function appendSshRecent(
  recent: SshRecentEntry[],
  host: SshHost,
): SshRecentEntry[] {
  const key = sshRecentKey(host);
  const filtered = recent.filter((e) => sshRecentKey(e.host) !== key);
  return [{ host, connectedAt: Date.now() }, ...filtered].slice(0, MAX_SSH_RECENT);
}
