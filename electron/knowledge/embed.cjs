'use strict';

const { formatOpenAIHost, formatOllamaHost } = require('../ai/providerModel.cjs');
const settingsSnapshot = require('../settingsSnapshot.cjs');
const { EMBED_BATCH } = require('./lib.cjs');

function getEmbeddingApiConfig(settings) {
  const knowledge = settings?.knowledge || {};
  if (!knowledge.embeddingProviderId || !knowledge.embeddingModel) return null;
  const provider = (settings.providers || []).find(
    (p) => p.id === knowledge.embeddingProviderId && p.enabled,
  );
  if (!provider || !String(provider.apiHost || '').trim()) return null;
  if (
    Array.isArray(provider.embeddingModels) &&
    provider.embeddingModels.length > 0 &&
    !provider.embeddingModels.includes(knowledge.embeddingModel)
  ) {
    return null;
  }
  return {
    apiHost: provider.apiHost,
    apiKey: provider.apiKey || '',
    providerType: provider.type,
    modelName: knowledge.embeddingModel,
    providerId: provider.id,
  };
}

function currentEmbeddingConfig() {
  return getEmbeddingApiConfig(settingsSnapshot.getSnapshot() || {});
}

async function embedOllama(apiConfig, inputs) {
  const base = formatOllamaHost(apiConfig.apiHost);
  const res = await fetch(`${base}/api/embed`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(apiConfig.apiKey ? { Authorization: `Bearer ${apiConfig.apiKey}` } : {}),
    },
    body: JSON.stringify({ model: apiConfig.modelName, input: inputs }),
  });
  if (!res.ok) {
    throw new Error(`Embedding 失败 HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }
  const json = await res.json();
  const vectors = json.embeddings || json.data?.map((row) => row.embedding);
  if (!Array.isArray(vectors) || vectors.length !== inputs.length) {
    throw new Error('Embedding 返回数量与输入不一致');
  }
  return vectors;
}

async function embedOpenAICompatible(apiConfig, inputs) {
  const base = formatOpenAIHost(apiConfig.apiHost);
  const res = await fetch(`${base}/embeddings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(apiConfig.apiKey ? { Authorization: `Bearer ${apiConfig.apiKey}` } : {}),
    },
    body: JSON.stringify({ model: apiConfig.modelName, input: inputs }),
  });
  if (!res.ok) {
    throw new Error(`Embedding 失败 HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }
  const json = await res.json();
  const data = Array.isArray(json.data) ? json.data : [];
  data.sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
  const vectors = data.map((row) => row.embedding);
  if (vectors.length !== inputs.length) {
    throw new Error('Embedding 返回数量与输入不一致');
  }
  return vectors;
}

async function embedTexts(texts, apiConfig = currentEmbeddingConfig()) {
  if (!apiConfig) throw new Error('未配置全局 embedding 模型，请到知识库页面左下角设置完成配置');
  const inputs = texts.map((t) => String(t || ''));
  if (inputs.length === 0) return [];
  const out = [];
  for (let i = 0; i < inputs.length; i += EMBED_BATCH) {
    const batch = inputs.slice(i, i + EMBED_BATCH);
    const vectors = apiConfig.providerType === 'ollama'
      ? await embedOllama(apiConfig, batch)
      : await embedOpenAICompatible(apiConfig, batch);
    out.push(...vectors);
  }
  return out;
}

module.exports = {
  getEmbeddingApiConfig,
  currentEmbeddingConfig,
  embedTexts,
};
