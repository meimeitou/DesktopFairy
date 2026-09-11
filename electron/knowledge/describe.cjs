'use strict';

const fs = require('fs');
const path = require('path');
const { generateText } = require('ai');
const catalog = require('./catalog.cjs');
const { normalizeDescription, SEMI_DESCRIPTION_MAX } = require('./lib.cjs');
const { resolveProviderModel } = require('../ai/providerModel.cjs');
const settingsSnapshot = require('../settingsSnapshot.cjs');

const inflight = new Set();

function getDescriptionApiConfig(settings) {
  const knowledge = settings?.knowledge || {};
  if (!knowledge.descriptionProviderId || !knowledge.descriptionModel) return null;
  const provider = (settings.providers || []).find(
    (p) => p.id === knowledge.descriptionProviderId && p.enabled,
  );
  if (!provider || !String(provider.apiHost || '').trim()) return null;
  if (
    Array.isArray(provider.models) &&
    provider.models.length > 0 &&
    !provider.models.includes(knowledge.descriptionModel)
  ) {
    return null;
  }
  return {
    apiHost: provider.apiHost,
    apiKey: provider.apiKey || '',
    providerType: provider.type,
    modelName: knowledge.descriptionModel,
    providerId: provider.id,
  };
}

function currentDescriptionConfig() {
  return getDescriptionApiConfig(settingsSnapshot.getSnapshot() || {});
}

function readItemSourceText(baseId, item) {
  if (item.type === 'note') return String(item.noteContent || '');
  if (!item.relativePath) return '';
  const abs = path.join(catalog.rawDir(baseId), item.relativePath);
  try {
    return fs.readFileSync(abs, 'utf8');
  } catch {
    return '';
  }
}

function key(baseId, itemId) {
  return `${baseId}::${itemId}`;
}

async function generateDescription({ baseId, itemId } = {}) {
  const item = catalog.getItem(baseId, itemId);
  if (!item) throw new Error('条目不存在');
  const cfg = currentDescriptionConfig();
  if (!cfg) throw new Error('未配置描述生成 LLM，请在知识库设置中选择');
  const source = readItemSourceText(baseId, item);
  if (!source.trim()) throw new Error('文件内容为空或读取失败');

  const trimmed = source.length > 8000 ? `${source.slice(0, 8000)}\n\n（后文省略）` : source;
  const prompt = [
    '你是知识库文件描述生成器。请阅读下方文件内容，用中文写一段简短描述，说明该文件的主题、覆盖的知识点或用途，方便后续通过描述选择相关文件。',
    `严格控制在 200-${SEMI_DESCRIPTION_MAX} 字之间，只输出描述本身，不要加标题、标签或引号。`,
    `文件名：${item.sourceName}`,
    '文件内容：',
    trimmed,
  ].join('\n');

  const k = key(baseId, itemId);
  if (inflight.has(k)) throw new Error('描述生成已在进行中');
  inflight.add(k);
  catalog.upsertItem(baseId, {
    ...item,
    descriptionStatus: 'generating',
    descriptionError: undefined,
    updatedAt: Date.now(),
  });
  try {
    const model = resolveProviderModel(cfg);
    const result = await generateText({ model, prompt, maxOutputTokens: 600 });
    const raw = String(result?.text || '').trim();
    const description = normalizeDescription(raw);
    if (!description) throw new Error('模型未返回有效描述');
    const now = Date.now();
    const updated = catalog.getItem(baseId, itemId);
    if (!updated) throw new Error('条目已被删除');
    catalog.upsertItem(baseId, {
      ...updated,
      description,
      descriptionUpdatedAt: now,
      descriptionStatus: 'idle',
      descriptionError: undefined,
      updatedAt: now,
    });
    return description;
  } catch (e) {
    const current = catalog.getItem(baseId, itemId);
    if (current) {
      catalog.upsertItem(baseId, {
        ...current,
        descriptionStatus: 'failed',
        descriptionError: String(e?.message || e),
        updatedAt: Date.now(),
      });
    }
    throw e;
  } finally {
    inflight.delete(k);
  }
}

function setDescriptionManual(baseId, itemId, description) {
  const item = catalog.getItem(baseId, itemId);
  if (!item) throw new Error('条目不存在');
  const normalized = normalizeDescription(description);
  const now = Date.now();
  catalog.upsertItem(baseId, {
    ...item,
    description: normalized || undefined,
    descriptionUpdatedAt: normalized ? now : item.descriptionUpdatedAt,
    descriptionStatus: 'idle',
    descriptionError: undefined,
    updatedAt: now,
  });
  return normalized;
}

/** Fire-and-forget best-effort auto description; swallows errors. */
function scheduleAutoDescribe(baseId, itemId) {
  setImmediate(() => {
    generateDescription({ baseId, itemId }).catch((e) => {
      console.warn('[knowledge] auto describe failed:', e?.message || e);
    });
  });
}

module.exports = {
  currentDescriptionConfig,
  generateDescription,
  setDescriptionManual,
  scheduleAutoDescribe,
};
