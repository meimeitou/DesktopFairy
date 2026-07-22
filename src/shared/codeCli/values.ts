export function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export function normalizeUrl(url: string): string {
  return url.replace(/\/+$/, "");
}

export function omitKeysByPrefix(
  obj: Record<string, unknown>,
  prefix: string,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (!key.startsWith(prefix)) out[key] = value;
  }
  return out;
}

export function cliProviderKeyName(provider: { id: string; name: string }): string {
  const base = provider.name.trim() || provider.id;
  return base.replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/^-+|-+$/g, "") || provider.id;
}

export function renderJsonFile(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

export function parseJsonOrEmpty(content: string): Record<string, unknown> {
  const trimmed = content.trim();
  if (!trimmed) return {};
  return JSON.parse(trimmed) as Record<string, unknown>;
}
