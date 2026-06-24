import {
  getBuiltinToolCatalog,
  getEnabledBuiltinTools,
  normalizeDisabledToolIds,
  type AgentBuiltinTool,
} from "./agentBuiltinTools";
import { DEFAULT_AGENT_AVATAR, isImageAvatar, toAvatarDisplay } from "./agentAvatar";
import { type ChatMode, DEFAULT_CHAT_MODE, getChatModeCard, normalizeChatMode } from "./chatMode";

export type ToolApprovalMode = "auto" | "confirm";

export interface AgentConfig {
  name: string;
  /** Default emoji, or `img:relativePath` for uploaded image */
  avatar: string;
  description: string;
  enabled: boolean;
  providerId: string;
  modelName: string;
  /** SOUL.md — agent's purpose, personality and execution rules. */
  soul: string;
  /** USER.md — user's profile, preferences and habits. */
  user: string;
  /** Opt-out: disabled builtin tool ids */
  disabledToolIds: string[];
  /** Bound global MCP server ids */
  mcpServerIds: string[];
  /** Enabled skill folder ids */
  enabledSkillIds: string[];
  maxTurns: number;
  toolApprovalMode: ToolApprovalMode;
  envVars: Record<string, string>;
  /** Active conversation mode — drives system prompt + tool behavior. */
  chatMode: ChatMode;
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

export const DEFAULT_SOUL = `# Soul

你叫小雅，一位住在用户桌面上、有 Live2D 形象的小伙伴。

## 核心原则

- 用行动解决问题，而不是描述你会怎么做。
- 回答简洁自然、有温度，除非用户要求深入展开。
- 知之为知之，不知为不知，绝不假装自信。
- 珍惜用户的时间，把信任视作最珍贵的东西。

## 执行规则

- 单步任务立即执行，不要只给计划就结束一轮对话。
- 多步任务先简述计划，等用户确认后再动手。
- 写之前先读——不要假设文件存在或内容如你所想。
- 工具调用失败时，先诊断错误、换一种方式重试，再向用户报告。
- 缺少信息时先用工具查，只有工具答不上来才问用户。
- 多步修改完成后，验证结果（重读文件、跑测试、看输出）。`;

export const DEFAULT_USER_TEMPLATE = `# 用户档案

## 基本信息

- **称呼**：（你的名字）
- **时区**：（例如 UTC+8）
- **语言**：中文

## 偏好

### 沟通风格
- [ ] 随意自然
- [ ] 专业正式
- [ ] 偏技术

### 回复长度
- [ ] 简洁扼要
- [ ] 详细解释
- [ ] 视问题而定

## 工作背景

- **主要角色**：（你的身份，如开发者、设计师）
- **正在做的项目**：
- **常用工具**：

## 特别说明

（任何希望智能体记住的习惯或要求）`;

export const BUILTIN_AGENT_TOOLS = getBuiltinToolCatalog("confirm");

export const DEFAULT_AGENT_CONFIG: AgentConfig = {
  name: "桌面精灵",
  avatar: DEFAULT_AGENT_AVATAR,
  description: "Live2D 桌面智能体",
  enabled: true,
  providerId: "openai",
  modelName: "gpt-4o-mini",
  soul: DEFAULT_SOUL,
  user: "",
  disabledToolIds: [],
  mcpServerIds: [],
  enabledSkillIds: ["find-skills", "skill-creator"],
  maxTurns: 10,
  toolApprovalMode: "confirm",
  envVars: {},
  chatMode: DEFAULT_CHAT_MODE,
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
    instructions?: string;
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
    soul: (() => {
      if (typeof raw.soul === "string" && raw.soul.trim()) return raw.soul;
      // migrate legacy `instructions` field into soul
      if (typeof raw.instructions === "string" && raw.instructions.trim()) {
        return raw.instructions;
      }
      return base.soul;
    })(),
    user: typeof raw.user === "string" ? raw.user : base.user,
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
    chatMode: normalizeChatMode(raw.chatMode),
  };
}

export function getEffectiveToolApprovalMode(
  agent: AgentConfig
): "auto" | "confirm" {
  const card = getChatModeCard(agent.chatMode);
  if (card.toolApprovalOverride === "auto" || card.toolApprovalOverride === "confirm") {
    return card.toolApprovalOverride;
  }
  return "confirm";
}

export function getEnabledAgentBuiltinTools(agent: AgentConfig): AgentToolDescriptor[] {
  const approval = getEffectiveToolApprovalMode(agent);
  const card = getChatModeCard(agent.chatMode);
  const disabled = new Set(agent.disabledToolIds);
  if (card.readOnly) {
    for (const id of ["Write", "Edit", "MultiEdit", "NotebookEdit", "Bash", "WebFetch", "WebSearch", "Task"]) {
      disabled.add(id);
    }
  }
  return getBuiltinToolCatalog(approval).filter((t) => !disabled.has(t.id));
}
