import {
  DEFAULT_SEARCH_ENGINE,
  DEFAULT_SELECTION_ACTIONS,
  mergeSelectionActions,
  type SelectionActionItem,
} from "./selectionActions";
import {
  AGENT_BACKEND_KEY,
  createPersonalAssistantDefaults,
  createTerminalAssistantDefaults,
  upgradeDefaultPersonalSoul,
  upgradeDefaultTerminalSoul,
  TERMINAL_DEFAULT_DISABLED_TOOL_IDS,
  findAgentById,
  isAgentBackend,
  normalizeAgentConfig,
  PERSONAL_ASSISTANT_ID,
  TERMINAL_ASSISTANT_ID,
  HOST_ASSISTANT_ID,
  type AgentConfig,
} from "./agent";

import {
  cloneProviders,
  mergeSystemProviders,
  normalizeProvider,
  SYSTEM_PROVIDERS,
  type LlmProvider,
} from "./providers";
import {
  normalizeChatMode,
} from "./chatMode";
import {
  DEFAULT_WEB_SEARCH_CONFIG,
  normalizeWebSearchConfig,
  type WebSearchConfig,
} from "./webSearch";
import {
  DEFAULT_TERMINAL_SETTINGS,
  normalizeTerminalSettings,
  normalizeSshHosts,
  normalizeSshGroups,
  normalizeSshRecent,
  normalizeSshCredentials,
  migrateInlineCredentials,
  type TerminalSettings,
  type SshHost,
  type SshRecentEntry,
  type SshCredential,
} from "./terminalSettings";
import {
  DEFAULT_KNOWLEDGE_SETTINGS,
  normalizeKnowledgeSettings,
  type KnowledgeSettings,
} from "./knowledge";
import {
  DEFAULT_FILE_PROCESSING_SETTINGS,
  normalizeFileProcessingSettings,
  type FileProcessingSettings,
} from "./fileProcessing";

export type SelectionTriggerMode = "shortcut" | "auto";

export interface CustomLive2DModel {
  name: string;
  path: string;
}

export interface AppSettings {
  terminalAssistantVersion?: number;
  terminalAssistantMigrationSource?: Record<string, unknown>;
  activeProviderId: string;
  providers: LlmProvider[];

  systemPrompt: string;
  selectionEnabled: boolean;
  selectionTriggerMode: SelectionTriggerMode;
  selectionShortcut: string;
  /** Global shortcut that opens the chat window (same as the Live2D "开始聊天" button). */
  chatShortcut: string;
  selectionAutoSend: boolean;
  selectionMaxLength: number;
  searchEngine: string;
  selectionActions: SelectionActionItem[];
  modelPath: string;
  windowWidth: number;
  windowHeight: number;
  modelScale: number;
  /** Live2D model offset from window center in CSS pixels */
  modelOffsetX: number;
  modelOffsetY: number;
  /** Chat-driven expressions instead of random idle expressions */
  live2dReactive: boolean;
  /** Show speech bubble above the model */
  live2dSpeechBubble: boolean;
  /** Max characters shown in the speech bubble */
  live2dSpeechBubbleMaxChars: number;
  /** User-picked local Live2D models (absolute paths; soft-unlist only, never deletes files) */
  customModels: CustomLive2DModel[];
  /** IDs of system providers the user has deliberately deleted */
  deletedSystemProviderIds: string[];
  /** All agents; first two builtin slots are protected by id. */
  agents: AgentConfig[];
  /** The agent bound to the terminal page (builtin terminal assistant). */
  terminalAgentId: string;
  /** Currently selected agent on the chat page. */
  activeChatAgentId: string;
  /** WebSearch tool provider configuration */
  webSearch: WebSearchConfig;
  /** Terminal appearance and behavior settings */
  terminal: TerminalSettings;
  /** Saved SSH host configurations */
  sshHosts: SshHost[];
  /** Empty SSH groups (persisted independently; groups with hosts are derived from sshHosts) */
  sshGroups: string[];
  /** SSH credential library (passwords / private key paths), referenced by SshHost.credentialId */
  sshCredentials: SshCredential[];
  /** Recent SSH connection history (max 5, newest first) */
  sshRecent: SshRecentEntry[];
  /** Global knowledge retrieval config (embedding / chunk / topK / score threshold) */
  knowledge: KnowledgeSettings;
  /** Active PDF processor plus MinerU / Open MinerU credentials */
  fileProcessing: FileProcessingSettings;
}

export const DEFAULT_SETTINGS: AppSettings = {
  activeProviderId: "openai",
  providers: cloneProviders(SYSTEM_PROVIDERS),

  systemPrompt: "你是一位可爱的桌面伙伴，回答简洁、自然、有温度。",
  selectionEnabled: true,
  selectionTriggerMode: "shortcut",
  selectionShortcut: "Command+Shift+C",
  chatShortcut: "Command+R",
  selectionAutoSend: false,
  selectionMaxLength: 500,
  searchEngine: DEFAULT_SEARCH_ENGINE,
  selectionActions: DEFAULT_SELECTION_ACTIONS.map((a) => ({ ...a })),
  modelPath: "/models/Hiyori/Hiyori.model3.json",
  windowWidth: 200,
  windowHeight: 400,
  modelScale: 1.0,
  modelOffsetX: 0,
  modelOffsetY: 0,
  live2dReactive: true,
  live2dSpeechBubble: true,
  live2dSpeechBubbleMaxChars: 50,
  customModels: [],
  deletedSystemProviderIds: [],
  agents: [
    createPersonalAssistantDefaults(),
    createTerminalAssistantDefaults(),
  ],
  terminalAgentId: TERMINAL_ASSISTANT_ID,
  activeChatAgentId: PERSONAL_ASSISTANT_ID,
  webSearch: { ...DEFAULT_WEB_SEARCH_CONFIG },
  terminal: { ...DEFAULT_TERMINAL_SETTINGS },
  sshHosts: [],
  sshGroups: [],
  sshCredentials: [],
  sshRecent: [],
  knowledge: { ...DEFAULT_KNOWLEDGE_SETTINGS },
  fileProcessing: {
    processorId: DEFAULT_FILE_PROCESSING_SETTINGS.processorId,
    mineru: { ...DEFAULT_FILE_PROCESSING_SETTINGS.mineru },
    openMineru: { ...DEFAULT_FILE_PROCESSING_SETTINGS.openMineru },
  },
};

const STORAGE_KEY = "da_settings";

/**
 * After any in-session local write, prefer localStorage over disk for the rest
 * of the session. Cold start still prefers disk (survives force-kill better).
 */
let preferLocalSettingsCache = false;

/** Write settings to localStorage without syncing to disk / broadcasting. */
export function cacheSettingsLocally(settings: AppSettings): void {
  preferLocalSettingsCache = true;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

function readSettingsFromLocalStorage(): AppSettings | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<AppSettings> & LegacySettings;
    return migrateFromLegacy(parsed);
  } catch {
    return null;
  }
}

const MIN_SELECTION_MAX_LENGTH = 50;
const MAX_SELECTION_MAX_LENGTH = 5000;
const MIN_SPEECH_BUBBLE_MAX_CHARS = 20;
const MAX_SPEECH_BUBBLE_MAX_CHARS = 120;

export function normalizeSelectionMaxLength(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return DEFAULT_SETTINGS.selectionMaxLength;
  return Math.min(
    MAX_SELECTION_MAX_LENGTH,
    Math.max(MIN_SELECTION_MAX_LENGTH, Math.round(n)),
  );
}

export function normalizeSpeechBubbleMaxChars(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return DEFAULT_SETTINGS.live2dSpeechBubbleMaxChars;
  return Math.min(
    MAX_SPEECH_BUBBLE_MAX_CHARS,
    Math.max(MIN_SPEECH_BUBBLE_MAX_CHARS, Math.round(n)),
  );
}

interface LegacySettings {
  providerId?: string;
  apiBaseUrl?: string;
  apiKey?: string;
  cachedModels?: string[];
}

function normalizeCustomModels(value: unknown): CustomLive2DModel[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (item): item is CustomLive2DModel =>
        !!item &&
        typeof item === "object" &&
        typeof (item as CustomLive2DModel).name === "string" &&
        typeof (item as CustomLive2DModel).path === "string" &&
        (item as CustomLive2DModel).path.trim().length > 0,
    )
    .map((item) => ({
      name: item.name.trim(),
      path: item.path.trim(),
    }));
}


function migrateLegacyAgentSettings(
  settings: Omit<AppSettings, "agents"> & Partial<Pick<AppSettings, "agents">>,
): {
  agents: AgentConfig[];
  terminalAgentId: string;
  activeChatAgentId: string;
} {
  const legacy = settings as AppSettings & {
    agent?: unknown;
    chatMode?: unknown;
  };
  const oldAgent =
    legacy.agent && typeof legacy.agent === "object"
      ? (legacy.agent as Record<string, unknown>)
      : undefined;
  const oldChatMode = normalizeChatMode(legacy.chatMode);

  const oldSoul =
    typeof oldAgent?.soul === "string" && oldAgent.soul.trim()
      ? oldAgent.soul
      : typeof settings.systemPrompt === "string" &&
          settings.systemPrompt.trim()
        ? settings.systemPrompt
        : undefined;
  const oldProviderId =
    (typeof oldAgent?.providerId === "string" && oldAgent.providerId.trim()) ||
    settings.activeProviderId ||
    "openai";
  const oldModelName =
    typeof oldAgent?.modelName === "string" ? oldAgent.modelName : undefined;
  const oldUser = typeof oldAgent?.user === "string" ? oldAgent.user : "";
  const oldDisabled = Array.isArray(oldAgent?.disabledToolIds)
    ? oldAgent.disabledToolIds.filter(
        (id): id is string => typeof id === "string",
      )
    : undefined;
  const oldTerminalDisabled = Array.isArray(oldAgent?.terminalDisabledToolIds)
    ? oldAgent.terminalDisabledToolIds.filter(
        (id): id is string => typeof id === "string",
      )
    : undefined;
  const oldMcpServerIds = Array.isArray(oldAgent?.mcpServerIds)
    ? oldAgent.mcpServerIds.filter(
        (id): id is string => typeof id === "string",
      )
    : [];
  const oldEnabledSkillIds = Array.isArray(oldAgent?.enabledSkillIds)
    ? oldAgent.enabledSkillIds.filter(
        (id): id is string => typeof id === "string",
      )
    : [];
  const oldMaxTurns =
    typeof oldAgent?.maxTurns === "number" && Number.isFinite(oldAgent.maxTurns)
      ? oldAgent.maxTurns
      : undefined;
  const oldEnvVars =
    oldAgent?.envVars && typeof oldAgent.envVars === "object" &&
    !Array.isArray(oldAgent.envVars)
      ? Object.fromEntries(
          Object.entries(oldAgent.envVars as Record<string, unknown>).filter(
            ([k, v]) => typeof k === "string" && typeof v === "string",
          ) as [string, string][],
        )
      : undefined;
  const oldReasoningEffort =
    typeof oldAgent?.reasoningEffort === "string"
      ? oldAgent.reasoningEffort
      : undefined;
  const oldAgentChatMode =
    typeof oldAgent?.chatMode === "string" ? oldAgent.chatMode : undefined;

  const personal = createPersonalAssistantDefaults({
    soul: oldSoul,
    user: oldUser,
    providerId: oldProviderId,
    modelName: oldModelName,
    disabledToolIds: oldDisabled,
    mcpServerIds: oldMcpServerIds,
    enabledSkillIds: oldEnabledSkillIds,
    maxTurns: oldMaxTurns,
    envVars: oldEnvVars,
    chatMode: normalizeChatMode(oldAgentChatMode ?? oldChatMode),
    reasoningEffort: oldReasoningEffort as AgentConfig["reasoningEffort"],
  });
  const terminal = createTerminalAssistantDefaults({
    user: oldUser,
    providerId: oldProviderId,
    modelName: oldModelName,
    disabledToolIds: oldTerminalDisabled,
  });

  return {
    agents: [personal, terminal],
    terminalAgentId: TERMINAL_ASSISTANT_ID,
    activeChatAgentId: PERSONAL_ASSISTANT_ID,
  };
}

export function finalizeSettings(
  settings: Omit<AppSettings, "agents"> & Partial<Pick<AppSettings, "agents">>,
): AppSettings {
  const legacyAgent = settings as AppSettings & { agent?: unknown };
  const needsMigration =
    !Array.isArray(settings.agents) || settings.agents.length === 0;
  const migrated = needsMigration ? migrateLegacyAgentSettings(settings) : null;

  const sourceAgents = migrated
    ? migrated.agents
    : Array.isArray(settings.agents)
      ? settings.agents
      : [];

  // Normalize + dedupe by id, preserving order.
  const normalized: AgentConfig[] = [];
  const seenIds = new Set<string>();
  for (const raw of sourceAgents) {
    // Pass the raw agent as fallback so pre-normalized fields (e.g. migrated
    // soul) survive instead of being replaced by builtin defaults.
    if (raw && (raw.id === HOST_ASSISTANT_ID || raw.builtinRole === "host-assistant")) continue;
    let agent = normalizeAgentConfig(raw, raw);
    if ((agent.id === settings.terminalAgentId || agent.id === TERMINAL_ASSISTANT_ID) && !agent.toolOverrides) {
      agent = {
        ...agent,
        disabledToolIds: [],
        toolOverrides: Object.fromEntries(agent.disabledToolIds
          .filter((id) => !TERMINAL_DEFAULT_DISABLED_TOOL_IDS.includes(id))
          .map((id) => [id, false])),
      };
    }
    if (agent.id === settings.terminalAgentId || agent.id === TERMINAL_ASSISTANT_ID) {
      agent = { ...agent, soul: upgradeDefaultTerminalSoul(agent.soul) };
    }
    if (agent.id === PERSONAL_ASSISTANT_ID) {
      agent = { ...agent, soul: upgradeDefaultPersonalSoul(agent.soul) };
    }
    if (seenIds.has(agent.id)) continue;
    seenIds.add(agent.id);
    normalized.push(agent);
  }

  // Invariant: the terminal assistant always exists (terminal page depends on
  // it). The personal assistant is deletable; if every chat agent was removed,
  // fall activeChatAgentId back to the first non-terminal agent.
  if (!findAgentById(normalized, TERMINAL_ASSISTANT_ID)) {
    normalized.push(createTerminalAssistantDefaults());
  }

  const terminalAgentId = findAgentById(normalized, settings.terminalAgentId)
    ? settings.terminalAgentId
    : (migrated?.terminalAgentId ??
      (findAgentById(normalized, TERMINAL_ASSISTANT_ID)
        ? TERMINAL_ASSISTANT_ID
        : normalized[0].id));
  const activeChatAgentId = findAgentById(
    normalized,
    migrated?.activeChatAgentId ?? settings.activeChatAgentId,
  )
    ? (migrated?.activeChatAgentId ?? settings.activeChatAgentId)
    : undefined;
  const activeChatAgentIdFinal =
    activeChatAgentId === terminalAgentId ||
    activeChatAgentId === HOST_ASSISTANT_ID
      ? (normalized.find(
          (a) => a.id !== terminalAgentId && a.builtinRole !== "host-assistant",
        )?.id ?? terminalAgentId)
      : (activeChatAgentId ??
        (normalized.find(
          (a) => a.id !== terminalAgentId && a.builtinRole !== "host-assistant",
        )?.id ?? terminalAgentId));

  const next: AppSettings = {
    ...settings,
    providers: Array.isArray(settings.providers)
      ? settings.providers.map((p) => normalizeProvider(p))
      : cloneProviders(SYSTEM_PROVIDERS),

    selectionMaxLength: normalizeSelectionMaxLength(
      settings.selectionMaxLength,
    ),
    selectionTriggerMode:
      settings.selectionTriggerMode === "auto" ? "auto" : "shortcut",
    selectionActions: mergeSelectionActions(settings.selectionActions),
    chatShortcut:
      typeof settings.chatShortcut === "string" && settings.chatShortcut.trim()
        ? settings.chatShortcut.trim()
        : DEFAULT_SETTINGS.chatShortcut,
    modelOffsetX: Number.isFinite(Number(settings.modelOffsetX))
      ? Number(settings.modelOffsetX)
      : 0,
    modelOffsetY: Number.isFinite(Number(settings.modelOffsetY))
      ? Number(settings.modelOffsetY)
      : 0,
    live2dReactive:
      typeof settings.live2dReactive === "boolean"
        ? settings.live2dReactive
        : DEFAULT_SETTINGS.live2dReactive,
    live2dSpeechBubble:
      typeof settings.live2dSpeechBubble === "boolean"
        ? settings.live2dSpeechBubble
        : DEFAULT_SETTINGS.live2dSpeechBubble,
    live2dSpeechBubbleMaxChars: normalizeSpeechBubbleMaxChars(
      settings.live2dSpeechBubbleMaxChars,
    ),
    customModels: normalizeCustomModels(settings.customModels),
    agents: normalized,
    terminalAssistantVersion: 1,
    terminalAgentId,
    activeChatAgentId: activeChatAgentIdFinal,
    webSearch: normalizeWebSearchConfig(settings.webSearch),
    terminal: normalizeTerminalSettings(settings.terminal),
    knowledge: normalizeKnowledgeSettings(settings.knowledge),
    fileProcessing: normalizeFileProcessingSettings(settings.fileProcessing),
    // 先 normalize 再迁移：把残留的内联凭据(password/privateKeyPath 等)提取为
    // 独立的 SshCredential 并改存 credentialId 引用。幂等。
    ...((): Pick<
      AppSettings,
      "sshHosts" | "sshGroups" | "sshRecent" | "sshCredentials"
    > => {
      const migratedSsh = migrateInlineCredentials(
        normalizeSshHosts(settings.sshHosts),
        normalizeSshRecent(settings.sshRecent),
        normalizeSshCredentials(settings.sshCredentials),
      );
      return {
        sshHosts: migratedSsh.sshHosts,
        sshGroups: normalizeSshGroups(settings.sshGroups),
        sshRecent: migratedSsh.sshRecent,
        sshCredentials: migratedSsh.sshCredentials,
      };
    })(),
  };
  // Drop legacy fields if present in saved settings.
  const legacy = next as AppSettings & {
    temperature?: number;
    ttsEnabled?: boolean;
    modelName?: string;
    mcpServers?: unknown[];
    agent?: unknown;
    chatMode?: unknown;
  };
  delete legacy.temperature;
  delete legacy.ttsEnabled;
  delete legacy.modelName;
  delete legacy.mcpServers;
  delete legacy.agent;
  delete legacy.chatMode;
  void legacyAgent;
  return next;
}

function migrateFromLegacy(
  parsed: Partial<AppSettings> & LegacySettings,
): AppSettings {
  // DEFAULT_SETTINGS.agents is stripped: legacy disk data has no `agents`,
  // and finalizeSettings only migrates when agents is absent/empty.
  const { agents: _defaultAgents, ...defaults } = DEFAULT_SETTINGS;
  void _defaultAgents;
  const base = {
    ...defaults,
    ...parsed,
    ...(parsed.terminalAssistantVersion !== 1
      ? { terminalAssistantMigrationSource: parsed as Record<string, unknown> }
      : {}),
  };
  if (Array.isArray(parsed.providers) && parsed.providers.length > 0) {
    return finalizeSettings({
      ...base,
      providers: mergeSystemProviders(
        parsed.providers,
        parsed.deletedSystemProviderIds,
      ),
      activeProviderId:
        parsed.activeProviderId ||
        parsed.providers.find((p) => p.enabled)?.id ||
        "openai",
    });
  }

  const providers = cloneProviders(SYSTEM_PROVIDERS);
  const legacyId = parsed.providerId || "openai";
  const target =
    providers.find((p) => p.id === legacyId) ||
    providers.find((p) => p.type === "ollama" && legacyId === "ollama") ||
    providers[0];

  if (parsed.apiBaseUrl) target.apiHost = parsed.apiBaseUrl;
  if (parsed.apiKey) target.apiKey = parsed.apiKey;
  if (Array.isArray(parsed.cachedModels) && parsed.cachedModels.length > 0) {
    target.models = parsed.cachedModels;
  }
  target.enabled = true;

  return finalizeSettings({
    ...base,
    providers: mergeSystemProviders(providers, parsed.deletedSystemProviderIds),
    activeProviderId: target.id,
  });
}

export function loadSettings(): AppSettings {
  // In-session: localStorage is updated synchronously on edit (ahead of disk IPC).
  // Cold start: prefer disk — localStorage may be stale after a force-kill.
  if (preferLocalSettingsCache) {
    const local = readSettingsFromLocalStorage();
    if (local) return local;
  }

  try {
    const api = (window as Window & typeof globalThis).electronAPI;
    const diskRaw = api?.loadSettingsFromDisk?.();
    if (diskRaw) {
      const parsed = JSON.parse(diskRaw) as Partial<AppSettings> &
        LegacySettings;
      const settings = migrateFromLegacy(parsed);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
      return settings;
    }
  } catch {
    // No Electron API or file unreadable — fall through to localStorage
  }

  const local = readSettingsFromLocalStorage();
  if (local) return local;

  return { ...DEFAULT_SETTINGS, providers: cloneProviders(SYSTEM_PROVIDERS) };
}

export interface SettingsSyncResult {
  persisted: boolean;
  error?: string;
}

/** In-flight saveSettings calls — used to ignore stale settings:updated echoes. */
let pendingSettingsSaves = 0;

export function hasPendingSettingsSave(): boolean {
  return pendingSettingsSaves > 0;
}

export async function saveSettings(
  settings: AppSettings,
): Promise<SettingsSyncResult> {
  cacheSettingsLocally(settings);
  const api = (window as Window & typeof globalThis).electronAPI;
  if (!api?.invoke) {
    // Non-Electron (web) context: localStorage is the only store.
    return { persisted: true };
  }
  pendingSettingsSaves += 1;
  try {
    const result = (await api.invoke("settings:sync", settings)) as
      SettingsSyncResult | undefined;
    if (result && typeof result === "object" && "persisted" in result) {
      return result;
    }
    return { persisted: true };
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    return { persisted: false, error };
  } finally {
    pendingSettingsSaves = Math.max(0, pendingSettingsSaves - 1);
  }
}

export function getActiveProvider(settings: AppSettings): LlmProvider {
  const enabled = settings.providers.filter((p) => p.enabled);
  const found =
    enabled.find((p) => p.id === settings.activeProviderId) ||
    enabled[0] ||
    settings.providers[0] ||
    SYSTEM_PROVIDERS[0];
  return found;
}

export function listEmbeddingModelItems(settings: AppSettings): ModelItem[] {
  const items: ModelItem[] = [];
  for (const provider of settings.providers) {
    if (!provider.enabled) continue;
    for (const modelName of provider.embeddingModels || []) {
      items.push({
        value: `${provider.id}::${modelName}`,
        label: `${provider.name} · ${modelName}`,
        providerId: provider.id,
        modelName,
      });
    }
  }
  return items;
}

export function getEmbeddingApiConfig(settings: AppSettings): {
  apiHost: string;
  apiKey: string;
  providerType: LlmProvider["type"];
  modelName: string;
  providerId: string;
} | null {
  const knowledge = settings.knowledge;
  if (!knowledge?.embeddingProviderId || !knowledge.embeddingModel) return null;
  const provider = settings.providers.find(
    (p) => p.id === knowledge.embeddingProviderId && p.enabled,
  );
  if (!provider || !provider.apiHost) return null;
  if (
    (provider.embeddingModels || []).length > 0 &&
    !provider.embeddingModels.includes(knowledge.embeddingModel)
  ) {
    return null;
  }
  return {
    apiHost: provider.apiHost,
    apiKey: provider.apiKey,
    providerType: provider.type,
    modelName: knowledge.embeddingModel,
    providerId: provider.id,
  };
}

/** Chat-completion config used to auto-describe semi-structured KB files. */
export function getDescriptionApiConfig(settings: AppSettings): {
  apiHost: string;
  apiKey: string;
  providerType: LlmProvider["type"];
  modelName: string;
  providerId: string;
} | null {
  const knowledge = settings.knowledge;
  if (!knowledge?.descriptionProviderId || !knowledge.descriptionModel)
    return null;
  const provider = settings.providers.find(
    (p) => p.id === knowledge.descriptionProviderId && p.enabled,
  );
  if (!provider || !provider.apiHost) return null;
  if (
    (provider.models || []).length > 0 &&
    !provider.models.includes(knowledge.descriptionModel)
  ) {
    return null;
  }
  return {
    apiHost: provider.apiHost,
    apiKey: provider.apiKey,
    providerType: provider.type,
    modelName: knowledge.descriptionModel,
    providerId: provider.id,
  };
}

export function updateProviderInSettings(
  settings: AppSettings,
  providerId: string,
  patch: Partial<LlmProvider>,
): AppSettings {
  return {
    ...settings,
    providers: settings.providers.map((p) =>
      p.id === providerId ? { ...p, ...patch } : p,
    ),
  };
}

/** A selectable model item combining provider and model, for the chat model picker. */
export interface ModelItem {
  /** Stable compound key: `${providerId}::${modelName}` */
  value: string;
  /** Display label: `${providerName}/${modelName}` */
  label: string;
  providerId: string;
  modelName: string;
}

export function getAgentProvider(
  settings: AppSettings,
  agent: AgentConfig,
): LlmProvider | undefined {
  return settings.providers.find(
    (p) => p.id === agent.providerId && p.enabled,
  );
}

export function resolveAgentModelName(
  settings: AppSettings,
  agent: AgentConfig,
): string {
  const provider = getAgentProvider(settings, agent);
  if (!provider) return "";
  const named =
    typeof agent.modelName === "string" ? agent.modelName.trim() : "";
  if (
    named &&
    (provider.models.length === 0 || provider.models.includes(named))
  ) {
    return named;
  }
  return "";
}

/**
 * Returns setup guidance when the agent backend model is not ready; null when OK.
 */
export function getAgentBackendGuidance(
  settings: AppSettings,
  agent: AgentConfig,
): string | null {
  const enabledProviders = settings.providers.filter((p) => p.enabled);
  if (enabledProviders.length === 0) {
    return [
      "智能体尚未配置可用模型。",
      "1. 打开「设置 → AI 模型」，启用 Provider 并填写 API Host / Key，添加至少一个模型；",
      "2. 再到「智能体弹窗 → 基础设置」选择后端模型。",
    ].join("\n");
  }

  const provider = getAgentProvider(settings, agent);
  if (!provider) {
    return [
      "智能体未选择有效的后端 Provider（可能尚未配置，或对应 Provider 已禁用）。",
      "请到「智能体弹窗 → 基础设置」选择后端模型。",
    ].join("\n");
  }

  if (!String(provider.apiHost || "").trim()) {
    return [
      `智能体所用 Provider「${provider.name}」尚未填写 API Host。`,
      "请到「设置 → AI 模型」完成配置，再回到「智能体弹窗 → 基础设置」确认模型。",
    ].join("\n");
  }

  const modelName =
    typeof agent.modelName === "string" ? agent.modelName.trim() : "";
  if (!modelName) {
    return [
      "智能体尚未选择模型。",
      "请到「智能体弹窗 → 基础设置」选择后端模型。",
    ].join("\n");
  }

  if (provider.models.length > 0 && !provider.models.includes(modelName)) {
    return [
      `智能体所选模型「${modelName}」不在 Provider「${provider.name}」的可用列表中。`,
      "请到「智能体弹窗 → 基础设置」重新选择后端模型。",
    ].join("\n");
  }

  if (provider.models.length === 0) {
    return [
      `Provider「${provider.name}」尚未添加模型。`,
      "请到「设置 → AI 模型」为该 Provider 添加模型，再到「智能体弹窗 → 基础设置」选择。",
    ].join("\n");
  }

  return null;
}

export function getAgentApiConfig(
  settings: AppSettings,
  agent: AgentConfig,
): {
  apiHost: string;
  apiKey: string;
  providerType: LlmProvider["type"];
  modelName: string;
  providerId: string;
} | null {
  if (getAgentBackendGuidance(settings, agent)) return null;
  const provider = getAgentProvider(settings, agent);
  const modelName = resolveAgentModelName(settings, agent);
  if (!provider || !modelName || !String(provider.apiHost || "").trim())
    return null;
  return {
    apiHost: provider.apiHost,
    apiKey: provider.apiKey,
    providerType: provider.type,
    modelName,
    providerId: provider.id,
  };
}

export function getChatApiConfig(
  settings: AppSettings,
  agent: AgentConfig,
): {
  apiHost: string;
  apiKey: string;
  providerType: LlmProvider["type"];
  modelName: string;
  providerId: string;
} | null {
  return getAgentApiConfig(settings, agent);
}

/** Agents selectable on the chat page (excludes terminal/host-bound ones). */
export function getChatAgents(settings: AppSettings): AgentConfig[] {
  return settings.agents.filter(
    (a) => a.id !== settings.terminalAgentId && a.builtinRole !== "host-assistant",
  );
}

export function updateAgentInSettings(
  settings: AppSettings,
  agentId: string,
  patch: Partial<AgentConfig>,
): AppSettings {
  return {
    ...settings,
    agents: settings.agents.map((a) =>
      a.id === agentId ? { ...a, ...patch, id: a.id } : a,
    ),
  };
}

export function appendAgentToSettings(
  settings: AppSettings,
  agent: AgentConfig,
): AppSettings {
  return { ...settings, agents: [...settings.agents, agent] };
}

export function removeAgentFromSettings(
  settings: AppSettings,
  agentId: string,
): AppSettings {
  const agents = settings.agents.filter((a) => a.id !== agentId);
  const activeChatAgentId =
    settings.activeChatAgentId === agentId
      ? (agents.find(
          (a) =>
            a.id !== settings.terminalAgentId && a.builtinRole !== "host-assistant",
        )?.id ?? "")
      : settings.activeChatAgentId;
  return { ...settings, agents, activeChatAgentId };
}

/** Returns all models from enabled providers, labeled as "服务商/模型名". */
export function getSelectableModelItems(settings: AppSettings): ModelItem[] {
  const items: ModelItem[] = [];
  for (const provider of settings.providers) {
    if (!provider.enabled) continue;
    for (const modelName of provider.models) {
      items.push({
        value: `${provider.id}::${modelName}`,
        label: `${provider.name} · ${modelName}`,
        providerId: provider.id,
        modelName,
      });
    }
  }
  return items;
}

/** Parses a compound key back to { providerId, modelName }. */
export function parseModelCompound(
  compound: string,
  fallbackProviderId: string,
): { providerId: string; modelName: string } {
  const sep = compound.indexOf("::");
  if (sep === -1)
    return { providerId: fallbackProviderId, modelName: compound };
  return {
    providerId: compound.slice(0, sep),
    modelName: compound.slice(sep + 2),
  };
}

export { isAgentBackend, AGENT_BACKEND_KEY };
export type {
  SelectionActionItem,
  LlmProvider,
  AgentConfig,
  TerminalSettings,
  SshHost,
  SshCredential,
};
