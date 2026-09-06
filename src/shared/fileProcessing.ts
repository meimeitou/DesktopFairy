export type FileProcessorId = "mineru" | "open-mineru";

export const MINERU_DEFAULT_HOST = "https://mineru.net";
export const OPEN_MINERU_DEFAULT_HOST = "http://127.0.0.1:8000";

export interface FileProcessorConfig {
  apiKey: string;
  apiHost: string;
}

export interface FileProcessingSettings {
  processorId: FileProcessorId;
  mineru: FileProcessorConfig;
  openMineru: FileProcessorConfig;
}

export const DEFAULT_FILE_PROCESSING_SETTINGS: FileProcessingSettings = {
  processorId: "mineru",
  mineru: { apiKey: "", apiHost: MINERU_DEFAULT_HOST },
  openMineru: { apiKey: "", apiHost: OPEN_MINERU_DEFAULT_HOST },
};

export const FILE_PROCESSOR_LABELS: Record<FileProcessorId, string> = {
  mineru: "MinerU 官方 API",
  "open-mineru": "Open MinerU（自托管）",
};

export const PROCESSOR_UNCONFIGURED_ERROR =
  "未配置文档处理器，请到设置 → 文档处理完成配置";

function normalizeHost(value: unknown, fallback: string): string {
  const text = typeof value === "string" ? value.trim() : "";
  return text || fallback;
}

export function normalizeProcessorId(raw: unknown): FileProcessorId {
  return raw === "open-mineru" ? "open-mineru" : "mineru";
}

export function normalizeFileProcessingSettings(raw: unknown): FileProcessingSettings {
  const data = raw && typeof raw === "object" ? (raw as Partial<FileProcessingSettings>) : {};
  const mineru: Partial<FileProcessorConfig> =
    data.mineru && typeof data.mineru === "object" ? data.mineru : {};
  const openMineru: Partial<FileProcessorConfig> =
    data.openMineru && typeof data.openMineru === "object" ? data.openMineru : {};
  return {
    processorId: normalizeProcessorId(data.processorId),
    mineru: {
      apiKey: typeof mineru.apiKey === "string" ? mineru.apiKey : "",
      apiHost: normalizeHost(mineru.apiHost, MINERU_DEFAULT_HOST),
    },
    openMineru: {
      apiKey: typeof openMineru.apiKey === "string" ? openMineru.apiKey : "",
      apiHost: normalizeHost(openMineru.apiHost, OPEN_MINERU_DEFAULT_HOST),
    },
  };
}

export function processorConfigured(
  settings: FileProcessingSettings,
  id: FileProcessorId | null = settings.processorId,
): boolean {
  if (id === "mineru") return Boolean(settings.mineru.apiKey.trim());
  if (id === "open-mineru") return Boolean(settings.openMineru.apiHost.trim());
  return false;
}
