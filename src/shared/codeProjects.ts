import type { CodeCliId } from "./codeCli/types";

export interface CodeProject {
  id: string;
  name: string;
  path: string;
  description?: string;
  createdAt: number;
  updatedAt: number;
  lastOpenedAt?: number;
}

export interface CodeCliProviderConfig {
  providerId: string;
  modelId: string;
  config?: Record<string, unknown>;
}

export interface CodeCliToolState {
  providers: Record<string, CodeCliProviderConfig>;
  current: string | null;
  /** Single model selection (providerId::modelId format) */
  selectedModel?: string;
  /** Custom environment variables written into CLI config */
  envVars?: Record<string, string>;
}

export interface CodeProjectsStore {
  version: 1;
  activeProjectId: string | null;
  projects: CodeProject[];
  cliConfigs: Partial<Record<CodeCliId, CodeCliToolState>>;
}

export function emptyCodeProjectsStore(): CodeProjectsStore {
  return {
    version: 1,
    activeProjectId: null,
    projects: [],
    cliConfigs: {},
  };
}

export function createProjectId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `project-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function normalizeCodeProjectsStore(raw: unknown): CodeProjectsStore {
  const base = emptyCodeProjectsStore();
  if (!raw || typeof raw !== "object") return base;
  const o = raw as Partial<CodeProjectsStore>;
  return {
    version: 1,
    activeProjectId:
      typeof o.activeProjectId === "string" ? o.activeProjectId : null,
    projects: Array.isArray(o.projects)
      ? o.projects.filter(
          (p): p is CodeProject =>
            !!p &&
            typeof p === "object" &&
            typeof (p as CodeProject).id === "string" &&
            typeof (p as CodeProject).name === "string" &&
            typeof (p as CodeProject).path === "string",
        )
      : [],
    cliConfigs:
      o.cliConfigs && typeof o.cliConfigs === "object"
        ? (o.cliConfigs as CodeProjectsStore["cliConfigs"])
        : {},
  };
}
