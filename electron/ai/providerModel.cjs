const { createOpenAI } = require('@ai-sdk/openai');
const { createOpenAICompatible } = require('@ai-sdk/openai-compatible');
const { createAnthropic } = require('@ai-sdk/anthropic');
const { createOllama } = require('ollama-ai-provider-v2');

function withoutTrailingSlash(url) {
  return String(url || '').trim().replace(/\/+$/, '');
}

function formatOpenAIHost(apiHost) {
  const trimmed = withoutTrailingSlash(apiHost);
  if (!trimmed) return '';
  if (trimmed.endsWith('/v1')) return trimmed;
  return `${trimmed}/v1`;
}

function formatOllamaHost(apiHost) {
  return withoutTrailingSlash(apiHost).replace(/\/v1$/, '').replace(/\/api$/, '');
}

/** Anthropic SDK baseURL must include /v1 (SDK appends /messages only). */
function formatAnthropicHost(apiHost) {
  const trimmed = withoutTrailingSlash(apiHost);
  if (!trimmed) return '';
  if (trimmed.endsWith('/v1')) return trimmed;
  return `${trimmed}/v1`;
}

function isOfficialOpenAIHost(apiHost) {
  try {
    const url = new URL(formatOpenAIHost(apiHost));
    return url.hostname === 'api.openai.com';
  } catch {
    return false;
  }
}

/**
 * Resolve an AI SDK language model from DesktopFairy apiConfig.
 * @param {{ apiHost: string, apiKey?: string, providerType?: string, modelName: string }} apiConfig
 */
function resolveProviderModel(apiConfig) {
  const { apiHost, apiKey, providerType, modelName } = apiConfig || {};
  if (!apiHost || !modelName) {
    throw new Error('resolveProviderModel: missing apiHost or modelName');
  }

  if (providerType === 'ollama') {
    const baseURL = `${formatOllamaHost(apiHost)}/api`;
    const ollama = createOllama({ baseURL });
    return ollama(modelName);
  }

  if (providerType === 'anthropic') {
    const baseURL = formatAnthropicHost(apiHost);
    const anthropic = createAnthropic({
      apiKey: apiKey || 'no-key',
      baseURL: baseURL || undefined,
    });
    return anthropic(modelName);
  }

  const baseURL = formatOpenAIHost(apiHost);
  const key = apiKey || 'no-key';

  if (providerType === 'openai-response') {
    const openai = createOpenAI({ apiKey: key, baseURL });
    return openai.responses(modelName);
  }

  // providerType === 'openai' (Chat Completions)
  // @ai-sdk/openai default callable uses Responses API; third-party hosts need chat.
  if (isOfficialOpenAIHost(apiHost)) {
    const openai = createOpenAI({ apiKey: key, baseURL });
    return openai.chat(modelName);
  }

  const compatible = createOpenAICompatible({
    name: 'desktop-fairy',
    apiKey: key,
    baseURL,
  });
  return compatible(modelName);
}

module.exports = {
  resolveProviderModel,
  formatOpenAIHost,
  formatOllamaHost,
  formatAnthropicHost,
  isOfficialOpenAIHost,
};
