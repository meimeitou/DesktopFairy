export type ProviderType = "openai" | "ollama";

export interface LlmProvider {
  id: string;
  name: string;
  type: ProviderType;
  apiHost: string;
  apiKey: string;
  enabled: boolean;
  isSystem: boolean;
  /** Curated model ids shown in selectors */
  models: string[];
}

export const SYSTEM_PROVIDERS: LlmProvider[] = [
  {
    id: "openai",
    name: "OpenAI",
    type: "openai",
    apiHost: "https://api.openai.com/v1",
    apiKey: "",
    enabled: false,
    isSystem: true,
    models: ["gpt-4o-mini"],
  },
  {
    id: "ollama",
    name: "Ollama",
    type: "ollama",
    apiHost: "http://localhost:11434",
    apiKey: "",
    enabled: false,
    isSystem: true,
    models: [],
  },
  {
    id: "hermes",
    name: "Hermes Agent",
    type: "openai",
    apiHost: "http://127.0.0.1:8642/v1",
    apiKey: "",
    enabled: false,
    isSystem: true,
    models: ["hermes-agent"],
  },
];

export function createProviderId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `provider-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createCustomProvider(
  name: string,
  type: ProviderType
): LlmProvider {
  return {
    id: createProviderId(),
    name: name.trim(),
    type,
    apiHost: type === "ollama" ? "http://localhost:11434" : "",
    apiKey: "",
    enabled: true,
    isSystem: false,
    models: [],
  };
}

export function withoutTrailingSlash(url: string): string {
  return url.replace(/\/+$/, "");
}

/** Normalize host for OpenAI-compatible /models and /chat/completions */
export function formatOpenAIHost(apiHost: string): string {
  const trimmed = withoutTrailingSlash(apiHost.trim());
  if (!trimmed) return "";
  if (trimmed.endsWith("/v1")) return trimmed;
  return `${trimmed}/v1`;
}

/** Ollama native base (no /v1 suffix) */
export function formatOllamaHost(apiHost: string): string {
  return withoutTrailingSlash(apiHost.trim())
    .replace(/\/v1$/, "")
    .replace(/\/api$/, "");
}

export function getChatCompletionsUrl(
  apiHost: string,
  type: ProviderType
): string {
  if (type === "ollama") {
    return `${formatOllamaHost(apiHost)}/v1/chat/completions`;
  }
  return `${formatOpenAIHost(apiHost)}/chat/completions`;
}

export function getEndpointPreview(
  apiHost: string,
  type: ProviderType
): string {
  if (type === "ollama") {
    return `${formatOllamaHost(apiHost)}/v1/chat/completions`;
  }
  return `${formatOpenAIHost(apiHost)}/chat/completions`;
}

export function providerNeedsApiKey(type: ProviderType): boolean {
  return type === "openai";
}

export function getProviderTypeLabel(type: ProviderType): string {
  return type === "ollama" ? "Ollama" : "OpenAI 兼容";
}

export function cloneProviders(providers: LlmProvider[]): LlmProvider[] {
  return providers.map((p) => ({ ...p, models: [...p.models] }));
}

export function mergeSystemProviders(
  providers: LlmProvider[],
  deletedIds?: string[]
): LlmProvider[] {
  const deleted = new Set(deletedIds ?? []);
  const byId = new Map(providers.map((p) => [p.id, p]));
  const merged: LlmProvider[] = [];
  for (const sys of SYSTEM_PROVIDERS) {
    if (deleted.has(sys.id)) continue;
    const existing = byId.get(sys.id);
    if (!existing) {
      merged.push({ ...sys, models: [...sys.models] });
    } else {
      merged.push({
        ...sys,
        ...existing,
        isSystem: true,
        models: existing.models.length > 0 ? existing.models : [...sys.models],
      });
    }
  }
  for (const p of providers) {
    if (!p.isSystem && !merged.some((m) => m.id === p.id)) {
      merged.push({ ...p, models: [...p.models] });
    }
  }
  return merged;
}
