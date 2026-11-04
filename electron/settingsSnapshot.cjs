'use strict';

/**
 * Main-process settings snapshot + send-time API/agent resolution.
 * Source of truth for ai:stream_open after settings:sync.
 */

const AGENT_BACKEND_KEY = 'agent';

/** @type {object | null} */
let snapshot = null;
let revision = 0;

function isAgentBackend(backend) {
  return backend === AGENT_BACKEND_KEY;
}


function getAgentProvider(settings, agent) {
  return (settings?.providers || []).find(
    (p) => p.id === agent.providerId && p.enabled,
  );
}

function resolveAgentModelName(settings, agent) {
  const provider = getAgentProvider(settings, agent);
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

function getAgentBackendGuidance(settings, agent) {
  const enabledProviders = (settings?.providers || []).filter((p) => p.enabled);
  if (enabledProviders.length === 0) {
    return '智能体尚未配置可用模型。请到「设置 → AI 模型」与「智能体弹窗 → 基础设置」完成配置。';
  }
  const provider = getAgentProvider(settings, agent);
  if (!provider) {
    return '智能体未选择有效的后端 Provider。请到「智能体弹窗 → 基础设置」选择后端模型。';
  }
  if (!String(provider.apiHost || '').trim()) {
    return `智能体所用 Provider「${provider.name}」尚未填写 API Host。`;
  }
  const modelName =
    typeof agent.modelName === 'string' ? agent.modelName.trim() : '';
  if (!modelName) {
    return '智能体尚未选择模型。请到「智能体弹窗 → 基础设置」选择后端模型。';
  }
  if (provider.models.length > 0 && !provider.models.includes(modelName)) {
    return `智能体所选模型「${modelName}」不在 Provider「${provider.name}」的可用列表中。`;
  }
  if (provider.models.length === 0) {
    return `Provider「${provider.name}」尚未添加模型。`;
  }
  return null;
}

function getAgentApiConfig(settings, agent) {
  if (getAgentBackendGuidance(settings, agent)) return null;
  const provider = getAgentProvider(settings, agent);
  const modelName = resolveAgentModelName(settings, agent);
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

function setSnapshot(settings) {
  snapshot = settings && typeof settings === 'object' ? settings : null;
  revision += 1;
  return revision;
}

function getSnapshot() {
  return snapshot;
}

/**
 * Resolve authoritative apiConfig (+ merged agentConfig) for agent streams.
 * @param {{ agentConfig?: object, apiConfig?: object }} payload
 */
function resolveForSend(payload = {}) {
  const settings = snapshot;
  if (!settings) {
    return {
      ok: false,
      error: '设置尚未加载，请稍后重试',
      apiConfig: null,
      agentConfig: payload.agentConfig || null,
      backend: AGENT_BACKEND_KEY,
    };
  }

  const lookupId =
    payload.agentConfig?.id || payload.agentConfig?.agentId || null;
  const diskAgent = (settings.agents || []).find(
    (a) => a && typeof a === 'object' && a.id === lookupId,
  );
  if (!diskAgent) {
    return {
      ok: false,
      error: '智能体配置不存在或已删除',
      apiConfig: null,
      agentConfig: null,
      backend: AGENT_BACKEND_KEY,
    };
  }

  const guidance = getAgentBackendGuidance(settings, diskAgent);
  if (guidance) {
    return {
      ok: false,
      error: guidance,
      apiConfig: null,
      agentConfig: diskAgent,
      backend: AGENT_BACKEND_KEY,
    };
  }
  const apiConfig = getAgentApiConfig(settings, diskAgent);
  if (!apiConfig) {
    return {
      ok: false,
      error: '请先在智能体设置中配置后端 Provider 与模型。',
      apiConfig: null,
      agentConfig: diskAgent,
      backend: AGENT_BACKEND_KEY,
    };
  }
  const incoming = payload.agentConfig || {};
  // Disk owns identity/provider/model; payload may override session chatMode / tools.
  const agentConfig = {
    ...diskAgent,
    ...incoming,
    id: diskAgent.id,
    builtinRole: diskAgent.builtinRole,
    providerId: diskAgent.providerId,
    modelName: diskAgent.modelName,
    disabledToolIds: diskAgent.disabledToolIds,
    toolOverrides: diskAgent.toolOverrides,
  };
  return {
    ok: true,
    error: null,
    apiConfig,
    agentConfig,
    backend: AGENT_BACKEND_KEY,
  };
}

module.exports = {
  AGENT_BACKEND_KEY,
  isAgentBackend,
  setSnapshot,
  getSnapshot,
  resolveForSend,
};
