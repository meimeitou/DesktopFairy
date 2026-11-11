/** Public target snapshot. Authentication material must never enter this shape. */
export interface SelectedHost {
  id: string;
  name: string;
  host: string;
  port: number;
  user: string;
  proxyJump: string;
  group?: string;
}

export function projectHostSelection(host: Partial<SelectedHost> & { id: string }): SelectedHost {
  return {
    id: host.id,
    name: typeof host.name === "string" ? host.name : "",
    host: typeof host.host === "string" ? host.host : "",
    port: Number(host.port) || 22,
    user: typeof host.user === "string" ? host.user : "",
    proxyJump: typeof host.proxyJump === "string" ? host.proxyJump : "",
    group: typeof host.group === "string" ? host.group : "",
  };
}

export function normalizeSelectedHosts(value: unknown): SelectedHost[] {
  if (!Array.isArray(value)) return [];
  const hosts = new Map<string, SelectedHost>();
  for (const item of value) {
    if (item && typeof item === "object" && typeof item.id === "string" && !hosts.has(item.id)) {
      hosts.set(item.id, projectHostSelection(item));
    }
  }
  return [...hosts.values()];
}

export function selectedHostLabel(host: SelectedHost) {
  return `${host.name} (${host.user}@${host.host}:${host.port})`;
}

/** Continue only the latest user task, never targets from an older task or before /clear. */
export function hostsForContinuation(messages: Array<{ role: string; type?: string; selectedHosts?: SelectedHost[] }>) {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].type === "clear") return [];
    if (messages[i].role === "user" && !messages[i].type) return messages[i].selectedHosts || [];
  }
  return [];
}
