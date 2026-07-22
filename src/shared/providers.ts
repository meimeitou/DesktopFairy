export type ProviderType =
  | "openai"
  | "ollama"
  | "openai-response"
  | "anthropic";

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

function defaultApiHostForType(type: ProviderType): string {
  if (type === "ollama") return "http://localhost:11434";
  if (type === "openai-response") return "https://api.openai.com/v1";
  if (type === "anthropic") return "https://api.anthropic.com/v1";
  return "";
}

export function createCustomProvider(
  name: string,
  type: ProviderType
): LlmProvider {
  return {
    id: createProviderId(),
    name: name.trim(),
    type,
    apiHost: defaultApiHostForType(type),
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

/** Anthropic SDK baseURL must include /v1 (SDK appends /messages only). */
export function formatAnthropicHost(apiHost: string): string {
  const trimmed = withoutTrailingSlash(apiHost.trim());
  if (!trimmed) return "";
  if (trimmed.endsWith("/v1")) return trimmed;
  return `${trimmed}/v1`;
}

/**
 * Preview / legacy Completions URL. Not used as the live chat request entry
 * (all inference goes through the AI SDK).
 */
export function getChatCompletionsUrl(
  apiHost: string,
  type: ProviderType
): string {
  return getEndpointPreview(apiHost, type);
}

export function getEndpointPreview(
  apiHost: string,
  type: ProviderType
): string {
  if (type === "ollama") {
    // Native Ollama chat (matches createOllama baseURL …/api)
    return `${formatOllamaHost(apiHost)}/api/chat`;
  }
  if (type === "openai-response") {
    return `${formatOpenAIHost(apiHost)}/responses`;
  }
  if (type === "anthropic") {
    return `${formatAnthropicHost(apiHost)}/messages`;
  }
  return `${formatOpenAIHost(apiHost)}/chat/completions`;
}

/** Catalog endpoint label for Manage Models UI (matches chat:list_models). */
export function getModelsListEndpointLabel(type: ProviderType): string {
  switch (type) {
    case "ollama":
      return "Ollama /api/tags";
    case "anthropic":
      return "Anthropic /v1/models";
    case "openai-response":
      return "OpenAI /v1/models（Responses）";
    default:
      return "OpenAI /v1/models";
  }
}

/** Ollama and local Hermes typically accept empty keys. */
export function providerNeedsApiKey(
  typeOrProvider: ProviderType | Pick<LlmProvider, "type" | "id">
): boolean {
  if (typeof typeOrProvider === "string") {
    return typeOrProvider !== "ollama";
  }
  if (typeOrProvider.type === "ollama") return false;
  if (typeOrProvider.id === "hermes") return false;
  return true;
}

export function getProviderTypeLabel(type: ProviderType): string {
  switch (type) {
    case "ollama":
      return "Ollama";
    case "openai-response":
      return "OpenAI Responses";
    case "anthropic":
      return "Anthropic";
    default:
      return "OpenAI 兼容";
  }
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
