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
 * Filter Hermes tool-status SSE events that aren't valid OpenAI completion chunks.
 * Hermes streams `{"tool":…,"toolCallId":…,"status":…}` alongside regular chunks;
 * the AI SDK's schema validator rejects them with "Type validation failed".
 */
function createHermesFilterFetch() {
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  return async function hermesFetch(url, options) {
    const resp = await globalThis.fetch(url, options);
    if (!resp.body) return resp;
    const ct = resp.headers.get('content-type') || '';
    if (!ct.includes('event-stream')) return resp;

    const reader = resp.body.getReader();
    const filtered = new ReadableStream({
      async pull(controller) {
        const { done, value } = await reader.read();
        if (done) { controller.close(); return; }
        const text = decoder.decode(value, { stream: true });
        const kept = text
          .split('\n')
          .filter((line) => {
            if (!line.startsWith('data: ')) return true;
            const data = line.slice(6).trim();
            if (data === '[DONE]') return true;
            try {
              const obj = JSON.parse(data);
              // Hermes tool events have `tool`/`toolCallId` but no OpenAI `choices`/`error`.
              if (obj && typeof obj === 'object' && 'tool' in obj && !('choices' in obj) && !('error' in obj)) {
                return false;
              }
            } catch { /* not JSON, keep */ }
            return true;
          })
          .join('\n');
        controller.enqueue(encoder.encode(kept));
      },
      cancel() { reader.cancel(); },
    });
    return new Response(filtered, {
      status: resp.status,
      statusText: resp.statusText,
      headers: resp.headers,
    });
  };
}

/**
 * Resolve an AI SDK language model from DesktopFairy apiConfig.
 * @param {{ apiHost: string, apiKey?: string, providerType?: string, providerId?: string, modelName: string }} apiConfig
 */
function resolveProviderModel(apiConfig) {
  const { apiHost, apiKey, providerType, providerId, modelName } = apiConfig || {};
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
    ...(providerId === 'hermes' ? { fetch: createHermesFilterFetch() } : {}),
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
