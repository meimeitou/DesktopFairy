import {
  DEFAULT_SEARCH_ENGINE,
  DEFAULT_SELECTION_ACTIONS,
  mergeSelectionActions,
  type SelectionActionItem,
} from "./selectionActions";
import {
  cloneProviders,
  mergeSystemProviders,
  SYSTEM_PROVIDERS,
  type LlmProvider,
} from "./providers";

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

function finalizeSettings(settings: AppSettings): AppSettings {
  return {
    ...settings,
    selectionMaxLength: normalizeSelectionMaxLength(settings.selectionMaxLength),
    selectionTriggerMode:
      settings.selectionTriggerMode === "auto" ? "auto" : "shortcut",
    selectionActions: mergeSelectionActions(settings.selectionActions),
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
      providers: mergeSystemProviders(parsed.providers),
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
    providers: mergeSystemProviders(providers),
    activeProviderId: target.id,
    modelName: parsed.modelName || target.models[0] || DEFAULT_SETTINGS.modelName,
  });
}

export function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS, providers: cloneProviders(SYSTEM_PROVIDERS) };
    const parsed = JSON.parse(raw) as Partial<AppSettings> & LegacySettings;
    return migrateFromLegacy(parsed);
  } catch {
    return { ...DEFAULT_SETTINGS, providers: cloneProviders(SYSTEM_PROVIDERS) };
  }
}

export function saveSettings(settings: AppSettings): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
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

export type { SelectionActionItem, LlmProvider };
