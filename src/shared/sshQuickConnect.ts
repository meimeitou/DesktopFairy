/** 解析快速连接输入：user@host:port / host:port / [v6]:port / host，默认用户 root、端口 22 */
export function parseQuickConnect(
  input: string,
): { user: string; host: string; port: number } | null {
  const s = input.trim();
  if (!s) return null;
  let rest = s;
  let user = "";
  const atIdx = rest.lastIndexOf("@");
  if (atIdx > 0) {
    user = rest.slice(0, atIdx).trim();
    rest = rest.slice(atIdx + 1).trim();
  }
  if (!rest) return null;
  let port = 22;
  // [host]:port — IPv6 防御
  if (rest.startsWith("[")) {
    const close = rest.indexOf("]");
    if (close < 0) return null;
    const hostPart = rest.slice(1, close);
    const after = rest.slice(close + 1);
    if (after.startsWith(":")) {
      const p = Number(after.slice(1));
      if (!Number.isFinite(p) || p <= 0 || p > 65535) return null;
      port = p;
    } else if (after.length > 0) {
      return null;
    }
    if (!hostPart) return null;
    return { user: user || "root", host: hostPart, port };
  }
  // 末尾 :port
  const colon = rest.lastIndexOf(":");
  if (colon > 0) {
    const maybePort = Number(rest.slice(colon + 1));
    if (Number.isFinite(maybePort)) {
      // 非法端口直接拒绝：否则 "host:99999" 会被当成主机名去连接。
      if (maybePort <= 0 || maybePort > 65535) return null;
      port = maybePort;
      rest = rest.slice(0, colon);
    }
  }
  if (!rest) return null;
  // 简单校验：包含空格则拒绝
  if (/\s/.test(rest)) return null;
  return { user: user || "root", host: rest, port };
}
