import {
  getBuiltinToolCatalog,
  getEnabledBuiltinTools,
  normalizeDisabledToolIds,
  type AgentBuiltinTool,
} from "./agentBuiltinTools";
import { DEFAULT_AGENT_AVATAR, isImageAvatar, toAvatarDisplay } from "./agentAvatar";

export type ToolApprovalMode = "auto" | "confirm";

export interface AgentConfig {
  name: string;
  /** Default emoji, or `img:relativePath` for uploaded image */
  avatar: string;
  description: string;
  enabled: boolean;
  providerId: string;
  modelName: string;
  instructions: string;
  /** Opt-out: disabled builtin tool ids */
  disabledToolIds: string[];
  /** Bound global MCP server ids */
  mcpServerIds: string[];
  /** Enabled skill folder ids */
  enabledSkillIds: string[];
  maxTurns: number;
  toolApprovalMode: ToolApprovalMode;
  envVars: Record<string, string>;
}

export type AgentToolDescriptor = AgentBuiltinTool;

export type { AgentBuiltinTool, ToolApproval } from "./agentBuiltinTools";
export {
  CLAUDE_CODE_BUILTIN_TOOLS,
  getBuiltinToolCatalog,
  getEnabledBuiltinTools,
  buildOpenAiToolDefinitions,
} from "./agentBuiltinTools";

export interface AgentSkillDescriptor {
  id: string;
  name: string;
  description: string;
  folderName: string;
  isBuiltin?: boolean;
}

export const AGENT_BACKEND_KEY = "agent";

export const BUILTIN_SKILL_IDS = ["find-skills", "skill-creator"] as const;

export const DEFAULT_AGENT_INSTRUCTIONS =
  "你是一位能帮忙干活的桌面伙伴，回答简洁、自然、有温度。可使用 Read/Write/Edit/Bash/Glob/Grep 等工具完成文件与系统任务。";

export const BUILTIN_AGENT_TOOLS = getBuiltinToolCatalog("confirm");

export const DEFAULT_AGENT_CONFIG: AgentConfig = {
  name: "桌面精灵",
  avatar: DEFAULT_AGENT_AVATAR,
  description: "Live2D 桌面智能体",
  enabled: true,
  providerId: "openai",
  modelName: "gpt-4o-mini",
  instructions: DEFAULT_AGENT_INSTRUCTIONS,
  disabledToolIds: [],
  mcpServerIds: [],
  enabledSkillIds: ["find-skills", "skill-creator"],
  maxTurns: 10,
  toolApprovalMode: "confirm",
  envVars: {},
};

export function isAgentBackend(backend: string): boolean {
  return backend === AGENT_BACKEND_KEY;
}

export function getAgentBackendLabel(agent: AgentConfig): string {
  const avatar = toAvatarDisplay(agent.avatar);
  const name = agent.name?.trim() || "智能体";
  return `${avatar} ${name}`;
}

export function normalizeAgentConfig(
  value: unknown,
  fallback?: Partial<AgentConfig>
): AgentConfig {
  const base = { ...DEFAULT_AGENT_CONFIG, ...fallback };
  if (!value || typeof value !== "object") return { ...base };

  const raw = value as Partial<AgentConfig> & {
    mcpServers?: { id: string; enabled?: boolean }[];
    temperature?: number;
    maxContextMessages?: number;
    maxContextChars?: number;
    maxTokens?: number;
  };

  const envVars =
    raw.envVars && typeof raw.envVars === "object" && !Array.isArray(raw.envVars)
      ? Object.fromEntries(
          Object.entries(raw.envVars).filter(
            ([k, v]) => typeof k === "string" && typeof v === "string"
          )
        )
      : base.envVars;

  let mcpServerIds = Array.isArray(raw.mcpServerIds)
    ? raw.mcpServerIds.filter((id): id is string => typeof id === "string")
    : base.mcpServerIds;

  if (mcpServerIds.length === 0 && Array.isArray(raw.mcpServers)) {
    mcpServerIds = raw.mcpServers
      .filter((s) => s && typeof s.id === "string" && s.enabled !== false)
      .map((s) => s.id);
  }

  return {
    name: typeof raw.name === "string" && raw.name.trim() ? raw.name.trim() : base.name,
    avatar: (() => {
      const v = typeof raw.avatar === "string" ? raw.avatar.trim() : "";
      if (v && isImageAvatar(v)) return v;
      return base.avatar;
    })(),
    description:
      typeof raw.description === "string" ? raw.description : base.description,
    enabled: typeof raw.enabled === "boolean" ? raw.enabled : base.enabled,
    providerId:
      typeof raw.providerId === "string" && raw.providerId.trim()
        ? raw.providerId.trim()
        : base.providerId,
    modelName:
      typeof raw.modelName === "string" && raw.modelName.trim()
        ? raw.modelName.trim()
        : base.modelName,
    instructions:
      typeof raw.instructions === "string" ? raw.instructions : base.instructions,
    disabledToolIds: normalizeDisabledToolIds(raw.disabledToolIds),
    mcpServerIds,
    enabledSkillIds: (() => {
      const ids = Array.isArray(raw.enabledSkillIds)
        ? raw.enabledSkillIds.filter((id): id is string => typeof id === "string")
        : [...base.enabledSkillIds];
      if (ids.includes("find-skills") && !ids.includes("skill-creator")) {
        return [...ids, "skill-creator"];
      }
      return ids;
    })(),
    maxTurns:
      typeof raw.maxTurns === "number" && Number.isFinite(raw.maxTurns)
        ? Math.min(100, Math.max(1, Math.round(raw.maxTurns)))
        : base.maxTurns,
    toolApprovalMode:
      raw.toolApprovalMode === "auto" || raw.toolApprovalMode === "confirm"
        ? raw.toolApprovalMode
        : base.toolApprovalMode,
    envVars,
  };
}

export function getEnabledAgentBuiltinTools(agent: AgentConfig): AgentToolDescriptor[] {
  return getEnabledBuiltinTools(agent.disabledToolIds, agent.toolApprovalMode);
}
