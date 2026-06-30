import {
  DEFAULT_SEARCH_ENGINE,
  DEFAULT_SELECTION_ACTIONS,
  mergeSelectionActions,
  type SelectionActionItem,
} from "./selectionActions";
import {
  AGENT_BACKEND_KEY,
  DEFAULT_AGENT_CONFIG,
  getAgentBackendLabel,
  isAgentBackend,
  normalizeAgentConfig,
  type AgentConfig,
} from "./agent";
import { type McpServer } from "./mcpServer";
import {
  cloneProviders,
  mergeSystemProviders,
  SYSTEM_PROVIDERS,
  type LlmProvider,
} from "./providers";
import {
  DEFAULT_CHAT_MODE,
  normalizeChatMode,
  type ChatMode,
} from "./chatMode";
import {
  DEFAULT_WEB_SEARCH_CONFIG,
  normalizeWebSearchConfig,
  type WebSearchConfig,
} from "./webSearch";

export type SelectionTriggerMode = "shortcut" | "auto";

export interface CustomLive2DModel {
  name: string;
  path: string;
}

export interface AppSettings {
  activeProviderId: string;
  providers: LlmProvider[];
  modelName: string;
  systemPrompt: string;
  temperature: number;
  selectionEnabled: boolean;
  selectionTriggerMode: SelectionTriggerMode;
  selectionShortcut: string;
  /** Global shortcut that opens the chat window (same as the Live2D "开始聊天" button). */
  chatShortcut: string;
  selectionAutoSend: boolean;
  selectionMaxLength: number;
  searchEngine: string;
  selectionActions: SelectionActionItem[];
  ttsEnabled: boolean;
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
  /** Single desktop agent configuration */
  agent: AgentConfig;
  /** Chat backend: "agent" or `${providerId}::${modelName}` */
  chatBackend: string;
  /** Active conversation mode. Mirrors agent.chatMode but stored at app level for quick UI access. */
  chatMode: ChatMode;
  /** Global MCP server registry (Cherry Studio style) */
  mcpServers: McpServer[];
  /** WebSearch tool provider configuration */
  webSearch: WebSearchConfig;
}

export const DEFAULT_SETTINGS: AppSettings = {
  activeProviderId: "openai",
  providers: cloneProviders(SYSTEM_PROVIDERS),
  modelName: "gpt-4o-mini",
  systemPrompt: "你是一位可爱的桌面伙伴，回答简洁、自然、有温度。",
  temperature: 0.7,
  selectionEnabled: true,
  selectionTriggerMode: "shortcut",
  selectionShortcut: "Command+Shift+C",
  chatShortcut: "Command+R",
  selectionAutoSend: false,
  selectionMaxLength: 500,
  searchEngine: DEFAULT_SEARCH_ENGINE,
  selectionActions: DEFAULT_SELECTION_ACTIONS.map((a) => ({ ...a })),
  ttsEnabled: false,
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
  agent: { ...DEFAULT_AGENT_CONFIG },
  chatBackend: AGENT_BACKEND_KEY,
  chatMode: DEFAULT_CHAT_MODE,
  mcpServers: [],
  webSearch: { ...DEFAULT_WEB_SEARCH_CONFIG },
};

const STORAGE_KEY = "da_settings";

const MIN_SELECTION_MAX_LENGTH = 50;
const MAX_SELECTION_MAX_LENGTH = 5000;
const MIN_SPEECH_BUBBLE_MAX_CHARS = 20;
const MAX_SPEECH_BUBBLE_MAX_CHARS = 120;

export function normalizeSelectionMaxLength(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return DEFAULT_SETTINGS.selectionMaxLength;
  return Math.min(
    MAX_SELECTION_MAX_LENGTH,
    Math.max(MIN_SELECTION_MAX_LENGTH, Math.round(n))
  );
}

export function normalizeSpeechBubbleMaxChars(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return DEFAULT_SETTINGS.live2dSpeechBubbleMaxChars;
  return Math.min(
    MAX_SPEECH_BUBBLE_MAX_CHARS,
    Math.max(MIN_SPEECH_BUBBLE_MAX_CHARS, Math.round(n))
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
        (item as CustomLive2DModel).path.trim().length > 0
    )
    .map((item) => ({
      name: item.name.trim(),
      path: item.path.trim(),
    }));
}

function normalizeMcpServers(value: unknown): McpServer[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (s): s is McpServer =>
        !!s &&
        typeof s === "object" &&
        typeof (s as McpServer).id === "string" &&
        typeof (s as McpServer).name === "string"
    )
    .map((s) => ({
      id: s.id,
      name: s.name.trim(),
      type:
        s.type === "sse" || s.type === "streamableHttp" ? s.type : "stdio",
      description: typeof s.description === "string" ? s.description : undefined,
      baseUrl: typeof s.baseUrl === "string" ? s.baseUrl : undefined,
      command: typeof s.command === "string" ? s.command : undefined,
      args: Array.isArray(s.args)
        ? s.args.filter((a): a is string => typeof a === "string")
        : undefined,
      env:
        s.env && typeof s.env === "object" && !Array.isArray(s.env)
          ? Object.fromEntries(
              Object.entries(s.env).filter(
                ([k, v]) => typeof k === "string" && typeof v === "string"
              )
            )
          : undefined,
      headers:
        s.headers && typeof s.headers === "object" && !Array.isArray(s.headers)
          ? Object.fromEntries(
              Object.entries(s.headers).filter(
                ([k, v]) => typeof k === "string" && typeof v === "string"
              )
            )
          : undefined,
      isActive: s.isActive !== false,
      installSource:
        s.installSource === "builtin" || s.installSource === "manual"
          ? s.installSource
          : "manual",
      shouldConfig: !!s.shouldConfig,
    }));
}

function migrateLegacyAgentMcp(
  settings: AppSettings
): Pick<AppSettings, "mcpServers" | "agent"> {
  const agent = settings.agent;
  const legacy = (agent as AgentConfig & { mcpServers?: { id: string; name: string; command: string; enabled?: boolean }[] }).mcpServers;
  if (!Array.isArray(legacy) || legacy.length === 0) {
    return { mcpServers: settings.mcpServers, agent };
  }
  const existing = new Map(settings.mcpServers.map((s) => [s.id, s]));
  const ids: string[] = [...agent.mcpServerIds];
  for (const item of legacy) {
    if (!item?.id || !item.name) continue;
    if (!existing.has(item.id)) {
      existing.set(item.id, {
        id: item.id,
        name: item.name,
        type: "stdio",
        command: item.command?.split(/\s+/)[0] || "npx",
        args: item.command?.split(/\s+/).slice(1) || [],
        isActive: item.enabled !== false,
        installSource: "manual",
      });
    }
    if (item.enabled !== false && !ids.includes(item.id)) ids.push(item.id);
  }
  return {
    mcpServers: [...existing.values()],
    agent: { ...agent, mcpServerIds: ids },
  };
}

function finalizeSettings(settings: AppSettings): AppSettings {
  const migratedMcp = migrateLegacyAgentMcp({
    ...settings,
    mcpServers: normalizeMcpServers(settings.mcpServers),
  });
  return {
    ...settings,
    ...migratedMcp,
    selectionMaxLength: normalizeSelectionMaxLength(settings.selectionMaxLength),
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
      settings.live2dSpeechBubbleMaxChars
    ),
    customModels: normalizeCustomModels(settings.customModels),
    agent: normalizeAgentConfig(migratedMcp.agent, {
      soul:
        typeof settings.systemPrompt === "string" && settings.systemPrompt.trim()
          ? settings.systemPrompt
          : DEFAULT_AGENT_CONFIG.soul,
      providerId: settings.activeProviderId || DEFAULT_AGENT_CONFIG.providerId,
      modelName: settings.modelName || DEFAULT_AGENT_CONFIG.modelName,
      chatMode: normalizeChatMode(settings.chatMode ?? settings.agent?.chatMode),
    }),
    chatBackend:
      typeof settings.chatBackend === "string" && settings.chatBackend.trim()
        ? settings.chatBackend.trim()
        : AGENT_BACKEND_KEY,
    chatMode: normalizeChatMode(settings.chatMode ?? settings.agent?.chatMode),
    mcpServers: migratedMcp.mcpServers,
    webSearch: normalizeWebSearchConfig(settings.webSearch),
    modelName: (() => {
      const provider = getActiveProvider(settings);
      if (provider.models.length === 0) return settings.modelName;
      return resolveModelNameForProvider(settings, provider);
    })(),
  };
}

function migrateFromLegacy(parsed: Partial<AppSettings> & LegacySettings): AppSettings {
  const base = { ...DEFAULT_SETTINGS, ...parsed };
  if (Array.isArray(parsed.providers) && parsed.providers.length > 0) {
    return finalizeSettings({
      ...base,
      providers: mergeSystemProviders(parsed.providers, parsed.deletedSystemProviderIds),
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
    modelName: parsed.modelName || target.models[0] || DEFAULT_SETTINGS.modelName,
  });
}

export function loadSettings(): AppSettings {
  // Prefer the disk file (da_settings.json) over localStorage.
  // settings:sync writes to disk synchronously on every change, so disk is
  // always up-to-date. localStorage can be stale when the process is
  // force-killed (e.g. concurrently --kill-others in make dev) before
  // Chromium's LevelDB has a chance to flush.
  try {
    const api = (window as Window & typeof globalThis).electronAPI;
    const diskRaw = api?.loadSettingsFromDisk?.();
    if (diskRaw) {
      const parsed = JSON.parse(diskRaw) as Partial<AppSettings> & LegacySettings;
      const settings = migrateFromLegacy(parsed);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
      return settings;
    }
  } catch {
    // No Electron API or file unreadable — fall through to localStorage
  }

  // Fallback: localStorage (browser / web context, or disk unavailable).
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<AppSettings> & LegacySettings;
      return migrateFromLegacy(parsed);
    }
  } catch {
    // localStorage also unreadable
  }

  return { ...DEFAULT_SETTINGS, providers: cloneProviders(SYSTEM_PROVIDERS) };
}

export function saveSettings(settings: AppSettings): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  try {
    const api = (window as Window & typeof globalThis).electronAPI;
    api?.invoke?.("settings:sync", settings)?.catch?.(() => {});
  } catch {
    // no-op in non-Electron context
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

/** Model name from the active provider's curated list (empty if none configured). */
export function resolveModelNameForProvider(
  settings: AppSettings,
  provider?: LlmProvider
): string {
  const p = provider ?? getActiveProvider(settings);
  const models = p.models;
  if (models.length === 0) return "";
  if (settings.modelName && models.includes(settings.modelName)) {
    return settings.modelName;
  }
  return models[0] ?? "";
}

/** Model used for chat API calls and the chat model selector. */
export function getActiveModelName(settings: AppSettings): string {
  const provider = getActiveProvider(settings);
  if (provider.models.length > 0) {
    return resolveModelNameForProvider(settings, provider);
  }
  return settings.modelName;
}

export function getSelectableModels(settings: AppSettings): string[] {
  return getActiveProvider(settings).models;
}

export function getActiveApiConfig(settings: AppSettings): {
  apiHost: string;
  apiKey: string;
  providerType: LlmProvider["type"];
  modelName: string;
  providerId: string;
} {
  const provider = getActiveProvider(settings);
  return {
    apiHost: provider.apiHost,
    apiKey: provider.apiKey,
    providerType: provider.type,
    modelName: getActiveModelName(settings),
    providerId: provider.id,
  };
}

export function updateProviderInSettings(
  settings: AppSettings,
  providerId: string,
  patch: Partial<LlmProvider>
): AppSettings {
  return {
    ...settings,
    providers: settings.providers.map((p) =>
      p.id === providerId ? { ...p, ...patch } : p
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

export function getAgentProvider(settings: AppSettings): LlmProvider | undefined {
  const agent = settings.agent;
  return (
    settings.providers.find((p) => p.id === agent.providerId && p.enabled) ||
    settings.providers.find((p) => p.enabled)
  );
}

export function resolveAgentModelName(settings: AppSettings): string {
  const provider = getAgentProvider(settings);
  const agent = settings.agent;
  if (!provider) return agent.modelName;
  if (provider.models.length === 0) return agent.modelName;
  if (agent.modelName && provider.models.includes(agent.modelName)) {
    return agent.modelName;
  }
  return provider.models[0] ?? agent.modelName;
}

export function getAgentApiConfig(settings: AppSettings): {
  apiHost: string;
  apiKey: string;
  providerType: LlmProvider["type"];
  modelName: string;
  providerId: string;
} | null {
  const provider = getAgentProvider(settings);
  if (!provider) return null;
  return {
    apiHost: provider.apiHost,
    apiKey: provider.apiKey,
    providerType: provider.type,
    modelName: resolveAgentModelName(settings),
    providerId: provider.id,
  };
}

export function getChatApiConfig(settings: AppSettings): {
  apiHost: string;
  apiKey: string;
  providerType: LlmProvider["type"];
  modelName: string;
  providerId: string;
} | null {
  const backend = getActiveChatBackend(settings);
  if (isAgentBackend(backend)) {
    const cfg = getAgentApiConfig(settings);
    return cfg;
  }
  const { providerId, modelName } = parseModelCompound(
    backend,
    settings.activeProviderId
  );
  const provider = settings.providers.find((p) => p.id === providerId && p.enabled);
  if (!provider || !modelName) return null;
  return {
    apiHost: provider.apiHost,
    apiKey: provider.apiKey,
    providerType: provider.type,
    modelName,
    providerId,
  };
}

/** Returns all models from enabled providers, labeled as "服务商/模型名". */
export function getSelectableModelItems(settings: AppSettings): ModelItem[] {
  const items: ModelItem[] = [];
  for (const provider of settings.providers) {
    if (!provider.enabled) continue;
    for (const modelName of provider.models) {
      items.push({
        value: `${provider.id}::${modelName}`,
        label: `${provider.name}/${modelName}`,
        providerId: provider.id,
        modelName,
      });
    }
  }
  return items;
}

export interface ChatBackendItem {
  value: string;
  label: string;
  isAgent?: boolean;
}

/** Agent entry + all enabled provider models for the chat picker. */
export function getChatBackendItems(settings: AppSettings): ChatBackendItem[] {
  const items: ChatBackendItem[] = [];
  if (settings.agent.enabled !== false) {
    items.push({
      value: AGENT_BACKEND_KEY,
      label: getAgentBackendLabel(settings.agent),
      isAgent: true,
    });
  }
  for (const model of getSelectableModelItems(settings)) {
    items.push({ value: model.value, label: model.label });
  }
  return items;
}

export function getActiveChatBackend(settings: AppSettings): string {
  const items = getChatBackendItems(settings);
  if (items.some((item) => item.value === settings.chatBackend)) {
    return settings.chatBackend;
  }
  return items[0]?.value ?? AGENT_BACKEND_KEY;
}

/** Returns the compound key `${providerId}::${modelName}` for the current selection. */
export function getActiveModelCompound(settings: AppSettings): string {
  const provider = getActiveProvider(settings);
  const modelName = getActiveModelName(settings);
  if (!modelName) return "";
  return `${provider.id}::${modelName}`;
}

/** Parses a compound key back to { providerId, modelName }. */
export function parseModelCompound(
  compound: string,
  fallbackProviderId: string
): { providerId: string; modelName: string } {
  const sep = compound.indexOf("::");
  if (sep === -1) return { providerId: fallbackProviderId, modelName: compound };
  return { providerId: compound.slice(0, sep), modelName: compound.slice(sep + 2) };
}

export { isAgentBackend, AGENT_BACKEND_KEY };
export type { SelectionActionItem, LlmProvider, AgentConfig, McpServer };
