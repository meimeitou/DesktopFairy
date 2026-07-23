'use strict';

/**
 * Main-process settings snapshot + send-time API/agent resolution.
 * Source of truth for ai:stream_open / chat:send after settings:sync.
 */

const AGENT_BACKEND_KEY = 'agent';

/** @type {object | null} */
let snapshot = null;
let revision = 0;

function isAgentBackend(backend) {
  return backend === AGENT_BACKEND_KEY;
}

function parseModelCompound(compound, fallbackProviderId) {
  const sep = String(compound || '').indexOf('::');
  if (sep === -1) {
    return { providerId: fallbackProviderId, modelName: String(compound || '') };
  }
  return {
    providerId: compound.slice(0, sep),
    modelName: compound.slice(sep + 2),
  };
}

function getAgentProvider(settings) {
  const agent = settings?.agent || {};
  return (settings?.providers || []).find(
    (p) => p.id === agent.providerId && p.enabled,
  );
}

function resolveAgentModelName(settings) {
  const provider = getAgentProvider(settings);
  const agent = settings?.agent || {};
  if (!provider) return '';
  const named =
    typeof agent.modelName === 'string' ? agent.modelName.trim() : '';
  if (
    named &&
    (provider.models.length === 0 || provider.models.includes(named))
  ) {
    return named;
  }
  return '';
}

function getAgentBackendGuidance(settings) {
  const enabledProviders = (settings?.providers || []).filter((p) => p.enabled);
  if (enabledProviders.length === 0) {
    return '智能体尚未配置可用模型。请到「设置 → AI 模型」与「智能体 → 基础设置」完成配置。';
  }
  const agent = settings?.agent || {};
  const provider = getAgentProvider(settings);
  if (!provider) {
    return '智能体未选择有效的后端 Provider。请到「设置 → 智能体 → 基础设置」选择后端模型。';
  }
  if (!String(provider.apiHost || '').trim()) {
    return `智能体所用 Provider「${provider.name}」尚未填写 API Host。`;
  }
  const modelName =
    typeof agent.modelName === 'string' ? agent.modelName.trim() : '';
  if (!modelName) {
    return '智能体尚未选择模型。请到「设置 → 智能体 → 基础设置」选择后端模型。';
  }
  if (provider.models.length > 0 && !provider.models.includes(modelName)) {
    return `智能体所选模型「${modelName}」不在 Provider「${provider.name}」的可用列表中。`;
  }
  if (provider.models.length === 0) {
    return `Provider「${provider.name}」尚未添加模型。`;
  }
  return null;
}

function getAgentApiConfig(settings) {
  if (getAgentBackendGuidance(settings)) return null;
  const provider = getAgentProvider(settings);
  const modelName = resolveAgentModelName(settings);
  if (!provider || !modelName || !String(provider.apiHost || '').trim()) {
    return null;
  }
  return {
    apiHost: provider.apiHost,
    apiKey: provider.apiKey,
    providerType: provider.type,
    modelName,
    providerId: provider.id,
  };
}

function getActiveChatBackend(settings) {
  const chatBackend = settings?.chatBackend;
  if (isAgentBackend(chatBackend)) return AGENT_BACKEND_KEY;
  if (typeof chatBackend === 'string' && chatBackend.includes('::')) {
    const { providerId, modelName } = parseModelCompound(
      chatBackend,
      settings?.activeProviderId || '',
    );
    const provider = (settings?.providers || []).find(
      (p) => p.id === providerId && p.enabled,
    );
    if (provider && modelName) return chatBackend;
  }
  return AGENT_BACKEND_KEY;
}

function getChatApiConfig(settings) {
  const backend = getActiveChatBackend(settings);
  if (isAgentBackend(backend)) {
    return getAgentApiConfig(settings);
  }
  const { providerId, modelName } = parseModelCompound(
    backend,
    settings?.activeProviderId || '',
  );
  const provider = (settings?.providers || []).find(
    (p) => p.id === providerId && p.enabled,
  );
  if (!provider || !modelName) return null;
  return {
    apiHost: provider.apiHost,
    apiKey: provider.apiKey,
    providerType: provider.type,
    modelName,
    providerId,
  };
}

function setSnapshot(settings) {
  snapshot = settings && typeof settings === 'object' ? settings : null;
  revision += 1;
  return revision;
}

function getSnapshot() {
  return snapshot;
}

function getRevision() {
  return revision;
}

/**
 * Resolve authoritative apiConfig (+ merged agentConfig) for a stream/send.
 * @param {{ agentConfig?: object, apiConfig?: object, forceAgent?: boolean }} payload
 */
function resolveForSend(payload = {}) {
  const settings = snapshot;
  if (!settings) {
    return {
      ok: false,
      error: '设置尚未加载，请稍后重试',
      apiConfig: null,
      agentConfig: payload.agentConfig || null,
      backend: null,
    };
  }

  const forceAgent = Boolean(payload.forceAgent);
  const backend = forceAgent
    ? AGENT_BACKEND_KEY
    : getActiveChatBackend(settings);
  const agentMode = isAgentBackend(backend);

  if (agentMode) {
    const guidance = getAgentBackendGuidance(settings);
    if (guidance) {
      return {
        ok: false,
        error: guidance,
        apiConfig: null,
        agentConfig: payload.agentConfig || settings.agent,
        backend,
      };
    }
    const apiConfig = getAgentApiConfig(settings);
    if (!apiConfig) {
      return {
        ok: false,
        error: '请先在智能体设置中配置后端 Provider 与模型。',
        apiConfig: null,
        agentConfig: payload.agentConfig || settings.agent,
        backend,
      };
    }
    const diskAgent = settings.agent || {};
    const incoming = payload.agentConfig || {};
    // Disk owns provider/model; payload may override session chatMode / tools.
    const agentConfig = {
      ...diskAgent,
      ...incoming,
      providerId: diskAgent.providerId,
      modelName: diskAgent.modelName,
    };
    return { ok: true, error: null, apiConfig, agentConfig, backend };
  }

  const apiConfig = getChatApiConfig(settings);
  if (!apiConfig?.apiHost || !apiConfig?.modelName) {
    return {
      ok: false,
      error: '请先在设置中配置服务商 API Host 和模型。',
      apiConfig: null,
      agentConfig: payload.agentConfig || null,
      backend,
    };
  }
  return {
    ok: true,
    error: null,
    apiConfig,
    agentConfig: payload.agentConfig || null,
    backend,
  };
}

module.exports = {
  AGENT_BACKEND_KEY,
  isAgentBackend,
  setSnapshot,
  getSnapshot,
  getRevision,
  getChatApiConfig,
  getAgentApiConfig,
  getAgentBackendGuidance,
  getActiveChatBackend,
  resolveForSend,
};
