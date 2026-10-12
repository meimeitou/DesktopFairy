import type { McpServer, McpServerType } from "../../../../shared/mcpServer";
import {
  formatArgsMultiline,
  formatEnvMultiline,
  parseArgsMultiline,
  parseEnvMultiline,
} from "../../../../shared/mcpServer";

export interface McpTestResult {
  ok: boolean;
  message: string;
  toolCount?: number;
  tools?: string[];
}

export interface McpFormValues {
  name: string;
  description: string;
  type: McpServerType;
  command: string;
  args: string;
  env: string;
  baseUrl: string;
  headers: string;
  timeout: string;
  longRunning: boolean;
}

export function toFormValues(server: McpServer): McpFormValues {
  return {
    name: server.name || "",
    description: server.description || "",
    type: server.type || "stdio",
    command: server.command || "",
    args: formatArgsMultiline(server.args),
    env: formatEnvMultiline(server.env),
    baseUrl: server.baseUrl || "",
    headers: formatEnvMultiline(server.headers),
    timeout: server.timeout != null ? String(server.timeout) : "",
    longRunning: Boolean(server.longRunning),
  };
}

/** 表单值 → McpServer 落库对象（对齐 cherry toMcpServerFields 语义）。 */
export function buildServerFromValues(
  server: McpServer,
  values: McpFormValues,
): McpServer {
  const next: McpServer = {
    ...server,
    name: values.name.trim(),
    description: values.description.trim(),
    type: values.type,
    isActive: server.isActive !== false,
  };
  const parsedTimeout = Number(values.timeout);
  if (Number.isFinite(parsedTimeout) && parsedTimeout > 0) {
    next.timeout = Math.round(parsedTimeout);
  } else {
    delete next.timeout;
  }
  next.longRunning = values.longRunning;
  if (values.type === "stdio") {
    next.command = values.command.trim();
    next.args = parseArgsMultiline(values.args);
    next.env = parseEnvMultiline(values.env);
    next.baseUrl = undefined;
    next.headers = undefined;
  } else {
    next.baseUrl = values.baseUrl.trim();
    next.headers = parseEnvMultiline(values.headers);
    next.command = undefined;
    next.args = undefined;
    next.env = undefined;
  }
  return next;
}
