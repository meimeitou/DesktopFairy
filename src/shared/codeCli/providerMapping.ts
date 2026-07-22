import type { LlmProvider, ProviderType } from "../providers";
import {
  formatAnthropicHost,
  formatOllamaHost,
  formatOpenAIHost,
  providerNeedsApiKey,
  withoutTrailingSlash,
} from "../providers";
import type { CodeCliId } from "./types";

/** Use provider apiHost as configured in settings (trim trailing slashes only). */
export function resolveProviderApiHost(provider: LlmProvider): string {
  return withoutTrailingSlash(provider.apiHost.trim());
}

/** Anthropic Messages base URL (no /v1/messages suffix). */
export function resolveClaudeBaseUrl(provider: LlmProvider): string {
  const host = resolveProviderApiHost(provider);
  if (!host) return "";
  if (host.endsWith("/v1")) return host.slice(0, -3);
  return host;
}

function hasApiVersion(host: string): boolean {
  return /\/v\d+[a-z]*(?:\/|$)/i.test(host);
}

/**
 * Hosts that only expose Chat Completions. Codex requires Responses API
 * (`wire_api = "responses"` → `{base_url}/responses`) and cannot use these.
 */
const CODEX_CHAT_ONLY_HOST_PATTERNS: RegExp[] = [
  /api\.deepseek\.com/i,
  /api\.z\.ai/i,
  /open\.bigmodel\.cn/i,
];

export function providerSupportsCodex(provider: LlmProvider): boolean {
  const host = resolveProviderApiHost(provider);
  if (!host) return false;
  return !CODEX_CHAT_ONLY_HOST_PATTERNS.some((re) => re.test(host));
}

/**
 * OpenCode `provider.*.npm` package for the DesktopFairy provider type.
 * Chat Completions → openai-compatible; Responses → @ai-sdk/openai;
 * Anthropic Messages → @ai-sdk/anthropic.
 */
export function resolveOpenCodeNpmPackage(type: ProviderType): string {
  switch (type) {
    case "anthropic":
      return "@ai-sdk/anthropic";
    case "openai-response":
      return "@ai-sdk/openai";
    case "ollama":
    case "openai":
    default:
      return "@ai-sdk/openai-compatible";
  }
}

/**
 * Base URL for OpenCode provider options, shaped for the npm package above.
 * - openai: settings host as-is (user-configured OpenAI-compatible root)
 * - openai-response / ollama: ensure `/v1` for AI SDK chat/responses clients
 * - anthropic: Anthropic SDK host including `/v1`
 */
export function resolveOpenCodeBaseUrl(provider: LlmProvider): string {
  const host = resolveProviderApiHost(provider);
  if (!host) return "";
  if (provider.type === "anthropic") return formatAnthropicHost(host);
  if (provider.type === "ollama") {
    const base = formatOllamaHost(host);
    return base ? `${base}/v1` : "";
  }
  if (provider.type === "openai-response") return formatOpenAIHost(host);
  return host;
}

/**
 * Codex base URL for config.toml. Codex calls `{base_url}/responses`, so hosts
 * like `https://api.openai.com` need a `/v1` root → `.../v1/responses`.
 */
export function resolveCodexBaseUrl(provider: LlmProvider): string {
  if (!providerSupportsCodex(provider)) return "";
  const host = resolveProviderApiHost(provider);
  if (host.endsWith("/v1") || hasApiVersion(host)) return host;
  return `${host}/v1`;
}

export function filterProvidersForCliTool(
  toolId: CodeCliId,
  providers: LlmProvider[],
): LlmProvider[] {
  return providers.filter((p) => {
    if (!p.enabled) return false;
    if (providerNeedsApiKey(p) && !p.apiKey?.trim()) return false;
    if (toolId === "claude-code") {
      return Boolean(resolveClaudeBaseUrl(p));
    }
    if (toolId === "openai-codex") {
      return Boolean(resolveCodexBaseUrl(p));
    }
    if (toolId === "opencode") {
      return Boolean(resolveOpenCodeBaseUrl(p));
    }
    return false;
  });
}
