import type { ProviderType } from "../providers";
import { CHERRY_PROVIDER_PREFIX, OPENCODE_SCHEMA } from "./managedKeys";
import {
  CLAUDE_MANAGED_ENV_KEYS,
  CLAUDE_MANAGED_TOP_LEVEL_KEYS,
  CODEX_MANAGED_TOP_LEVEL_KEYS,
  OPEN_CODE_MANAGED_TOP_LEVEL_KEYS,
} from "./managedKeys";
import { resolveOpenCodeNpmPackage } from "./providerMapping";
import {
  asRecord,
  cliProviderKeyName,
  normalizeUrl,
  omitKeysByPrefix,
} from "./values";

const CODEX_MANAGED_KEY_SET = new Set<string>(CODEX_MANAGED_TOP_LEVEL_KEYS);

export function buildClaudeConfig(
  existing: Record<string, unknown>,
  userBlob: Record<string, unknown>,
  resolved: { apiKey: string; baseUrl: string; model: string },
): Record<string, unknown> {
  const configEnv = { ...asRecord(userBlob.env) };
  const envBlock: Record<string, unknown> = { ...configEnv };
  if (resolved.baseUrl) envBlock.ANTHROPIC_BASE_URL = resolved.baseUrl;
  if (resolved.apiKey) envBlock.ANTHROPIC_AUTH_TOKEN = resolved.apiKey;
  if (resolved.model) envBlock.ANTHROPIC_MODEL = resolved.model;

  const existingEnv =
    existing.env && typeof existing.env === "object"
      ? { ...(existing.env as Record<string, unknown>) }
      : null;
  if (existingEnv) {
    for (const key of CLAUDE_MANAGED_ENV_KEYS) {
      if (!(key in envBlock)) delete existingEnv[key];
    }
  }

  const merged: Record<string, unknown> = { ...existing, ...userBlob };
  for (const key of CLAUDE_MANAGED_TOP_LEVEL_KEYS) {
    if (!(key in userBlob)) delete merged[key];
  }
  merged.env = existingEnv ? { ...existingEnv, ...envBlock } : { ...envBlock };
  return merged;
}

function resolveCodexProviderDisplayName(providerName: string): string {
  return providerName === "OpenAI" ? "OpenAI (DesktopFairy)" : providerName;
}

export function buildCodexConfig(
  existingToml: Record<string, unknown>,
  resolved: { baseUrl: string; providerName: string; model: string },
): Record<string, unknown> {
  const providerKey = `${CHERRY_PROVIDER_PREFIX}${resolved.providerName.replace(/\./g, "-")}`;
  const preservedProviders = omitKeysByPrefix(
    asRecord(existingToml.model_providers),
    CHERRY_PROVIDER_PREFIX,
  );
  const cleaned: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(existingToml)) {
    if (!CODEX_MANAGED_KEY_SET.has(key)) cleaned[key] = value;
  }

  return {
    ...cleaned,
    model: resolved.model,
    model_provider: providerKey,
    model_providers: {
      ...preservedProviders,
      [providerKey]: {
        name: resolveCodexProviderDisplayName(resolved.providerName),
        base_url: normalizeUrl(resolved.baseUrl),
        // Codex 0.144+ rejects wire_api="chat" at startup; responses is mandatory.
        // base_url still comes from the provider settings (OpenAI-compatible root).
        wire_api: "responses",
        requires_openai_auth: true,
      },
    },
  };
}

export function buildCodexAuthConfig(
  existingAuth: Record<string, unknown>,
  apiKey: string,
): Record<string, unknown> {
  return { ...existingAuth, OPENAI_API_KEY: apiKey };
}

export function buildOpenCodeConfig(
  existing: Record<string, unknown>,
  provider: { id: string; name: string; type: ProviderType },
  resolved: { apiKey: string; baseUrl: string; model: string },
): Record<string, unknown> {
  const providerName = cliProviderKeyName(provider);
  const providerKey = `${CHERRY_PROVIDER_PREFIX}${providerName}`;
  const preservedProviders = omitKeysByPrefix(
    asRecord(existing.provider),
    CHERRY_PROVIDER_PREFIX,
  );
  const cleaned: Record<string, unknown> = { ...existing };
  for (const key of OPEN_CODE_MANAGED_TOP_LEVEL_KEYS) delete cleaned[key];

  const options: Record<string, unknown> = {
    baseURL: resolved.baseUrl,
  };
  if (resolved.apiKey) options.apiKey = resolved.apiKey;

  return {
    $schema: OPENCODE_SCHEMA,
    ...cleaned,
    model: `${providerKey}/${resolved.model}`,
    provider: {
      ...preservedProviders,
      [providerKey]: {
        npm: resolveOpenCodeNpmPackage(provider.type),
        name: providerKey,
        options,
        models: {
          [resolved.model]: { name: resolved.model },
        },
      },
    },
  };
}
