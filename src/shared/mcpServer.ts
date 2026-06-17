export type McpServerType = "stdio" | "sse" | "streamableHttp";

export type McpInstallSource = "builtin" | "manual";

export interface McpServer {
  id: string;
  name: string;
  type: McpServerType;
  description?: string;
  /** Documentation / marketplace link (Cherry-style reference) */
  reference?: string;
  baseUrl?: string;
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  headers?: Record<string, string>;
  isActive: boolean;
  installSource?: McpInstallSource;
  shouldConfig?: boolean;
}

/** One argument per line (Cherry Studio args textarea). */
export function parseArgsMultiline(text: string): string[] {
  return String(text || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

export function formatArgsMultiline(args?: string[]): string {
  return (args || []).join("\n");
}

/** KEY=value per line (Cherry Studio env textarea). */
export function parseEnvMultiline(text: string): Record<string, string> {
  const env: Record<string, string> = {};
  for (const line of String(text || "").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx <= 0) continue;
    const key = trimmed.slice(0, idx).trim();
    let value = trimmed.slice(idx + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (key) env[key] = value;
  }
  return env;
}

export function formatEnvMultiline(env?: Record<string, string>): string {
  return Object.entries(env || {})
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");
}

export function buildMcpCommandString(server: McpServer): string {
  if (server.type === "stdio" && server.command) {
    const parts = [server.command, ...(server.args || [])];
    return parts.join(" ");
  }
  if (server.baseUrl) return server.baseUrl;
  return server.command || "";
}

export function getMcpCommandPreview(server: McpServer): string {
  if (server.type !== "stdio") {
    return server.baseUrl || "(未设置 URL)";
  }
  const envKeys = Object.keys(server.env || {});
  const cmd = buildMcpCommandString(server);
  if (envKeys.length === 0) return cmd;
  return `${cmd}\nenv: ${envKeys.join(", ")}`;
}

export function isStdioMcpServer(server: McpServer): boolean {
  return server.type === "stdio" || (!server.type && !!server.command);
}
