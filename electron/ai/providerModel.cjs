const { createOpenAI } = require('@ai-sdk/openai');
const { createOpenAICompatible } = require('@ai-sdk/openai-compatible');
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
 * Uses chat/completions — not the Responses API (unsupported by most proxies).
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

  const baseURL = formatOpenAIHost(apiHost);
  const key = apiKey || 'no-key';

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

module.exports = { resolveProviderModel, formatOpenAIHost, formatOllamaHost, isOfficialOpenAIHost };
