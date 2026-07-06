export type CursorStyle = "block" | "beam" | "underline";
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
  password?: string;
  privateKeyPath?: string;
  group?: string;
  proxyJump?: string;
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
      password: typeof s.password === "string" ? s.password : undefined,
      privateKeyPath:
        typeof s.privateKeyPath === "string" ? s.privateKeyPath : undefined,
      group: typeof s.group === "string" ? s.group.trim() || undefined : undefined,
      proxyJump: typeof s.proxyJump === "string" ? s.proxyJump.trim() || undefined : undefined,
    }))
    .filter((s) => s.name && s.host && s.user);
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
