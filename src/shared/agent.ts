import environmentPolicy from "../../electron/agentEnvironmentPolicy.json";
import {
  ALWAYS_ENABLED_TOOL_IDS,
  getBuiltinToolCatalog,
  normalizeDisabledToolIds,
  type AgentBuiltinTool,
} from "./agentBuiltinTools";
import { DEFAULT_AGENT_AVATAR, isImageAvatar, toAvatarDisplay } from "./agentAvatar";
import { type ChatMode, DEFAULT_CHAT_MODE, getChatModeCard, normalizeChatMode } from "./chatMode";
import {
  type ReasoningEffort,
  DEFAULT_REASONING_EFFORT,
  normalizeReasoningEffort,
} from "./reasoningEffort";


export type AgentEnvironment = keyof typeof environmentPolicy.contexts;
export const AGENT_ENVIRONMENT_POLICY: Record<AgentEnvironment, { blocked: string[]; defaultDisabled: string[] }> = environmentPolicy.contexts;

export type BuiltinAgentRole =
  | "personal-assistant"
  | "terminal-assistant"
  | "host-assistant";

export interface AgentConfig {
  /** Stable unique id; builtin agents use fixed ids. */
  id: string;
  /** Builtin protection marker; custom agents leave this unset. */
  builtinRole?: BuiltinAgentRole;
  name: string;
  /** Default emoji, or `img:relativePath` for uploaded image */
  avatar: string;
  description: string;
  providerId: string;
  modelName: string;
  /** SOUL.md — agent's purpose, personality and execution rules. */
  soul: string;
  /** USER.md — user's profile, preferences and habits. */
  user: string;
  /** Opt-out: disabled builtin tool ids (single set, context rules applied on top) */
  disabledToolIds: string[];
  /** Missing key uses environment default; true/false are explicit user preferences. */
  toolOverrides?: Record<string, boolean>;
  /** Bound global MCP server ids */
  mcpServerIds: string[];
  /** Enabled skill folder ids */
  enabledSkillIds: string[];
  /** Knowledge bases attached to new conversations of this agent */
  knowledgeBaseIds: string[];
  maxTurns: number;

  envVars: Record<string, string>;
  /** Default conversation mode for this agent's new topics. */
  chatMode: ChatMode;
  /** Reasoning effort for OpenAI-compatible o-series / thinking models. "default" = send nothing. */
  reasoningEffort: ReasoningEffort;
}

export type AgentToolDescriptor = AgentBuiltinTool;

export type { AgentBuiltinTool, ToolApproval } from "./agentBuiltinTools";
export {
  CLAUDE_CODE_BUILTIN_TOOLS,
  ALWAYS_ENABLED_TOOL_IDS,
  getBuiltinToolCatalog,
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

/** Previous shipped personal-assistant souls. Exact match upgrades; edited text stays. */
export const PREVIOUS_PERSONAL_SOULS = [`# Soul

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
- 缺少信息时先用 read/grep 等工具查；只有工具答不上来、且会阻塞下一步时，再用 AskUserQuestion 向用户确认（全自动模式不可用）。
- 多步修改完成后，验证结果（重读文件、跑测试、看输出）。`, `# Soul

你叫小雅，用户的桌面伙伴。工作是把需求说清楚、把技术方案想明白：整理需求、比较方案、查公开资料、写出可执行的结论。你不做本地项目开发，不改代码、不跑构建、不排查本机工程。

## 核心原则

- 先弄清用户要决定什么，再回答。需求类问题给出结构化结论：背景、目标、范围、约束、待确认项。方案类问题给出可比较的选项、取舍和推荐。
- 回答简洁自然、有温度；用户要求展开时再写长。
- 知之为知之。外部事实不确定时用 WebSearch / WebFetch 查公开资料，不要用本地目录冒充调研。
- 珍惜用户的时间。

## 工具边界

- 默认不要用 Bash、Glob、Grep、Read、Write、Edit 浏览或修改用户电脑上的文件。用户没有点名路径时，禁止 ls、find、grep、rg 这类本地检索。
- 只有用户明确要求查看或修改某个具体文件或目录时，才使用本地文件工具，并且只碰该路径。
- 需要外部信息时优先 WebSearch、WebFetch，或用户已绑定的知识库与 MCP。
- 缺的是偏好或业务约束、且对话里推不出来时，用 AskUserQuestion 问一个会挡住下一步的问题，不要先去翻本地文件。
- 写代码、改仓库、跑测试、看日志，请用户交给终端助手。`, `# Soul

你叫小雅，用户的桌面伙伴。主责是需求整理和技术方案研究：把需求说清楚，把方案想明白，查公开资料，写出可执行的结论。

## 工作方式

- 先弄清用户要决定什么，再回答。需求类问题给出结构化结论：背景、目标、范围、约束、待确认项。方案类问题给出可比较的选项、取舍和推荐。
- 回答简洁自然、有温度；用户要求展开时再写长。
- 知之为知之。外部事实不确定时，先查资料再下结论。
- 珍惜用户的时间。用户交代的具体事项照做，工具按任务需要选用。`];

export const DEFAULT_SOUL = `# Soul

你叫小雅，用户的桌面伙伴。主责是需求整理和技术方案研究：把需求说清楚，把方案想明白，查公开资料，写出可执行的结论。

## 工作方式

- 先弄清用户要决定什么，再回答。需求类问题给出结构化结论：背景、目标、范围、约束、待确认项。方案类问题给出可比较的选项、取舍和推荐。
- 问题不清楚时，用 AskUserQuestion 提问，不要猜测。
- 回答简洁自然、有温度；用户要求展开时再写长。
- 知之为知之。外部事实不确定时，先查资料再下结论。
- 珍惜用户的时间。用户交代的具体事项照做，工具按任务需要选用。`;

export function upgradeDefaultPersonalSoul(soul: string): string {
  return PREVIOUS_PERSONAL_SOULS.some((previous) => previous.trim() === soul.trim())
    ? DEFAULT_SOUL
    : soul;
}

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
export const HOST_ASSISTANT_ID = "host-assistant";

export const PERSONAL_ASSISTANT_ID = "personal-assistant";
export const TERMINAL_ASSISTANT_ID = "terminal-assistant";

export const PERSONAL_DEFAULT_DISABLED_TOOL_IDS = ["Terminal"];

export const TERMINAL_DEFAULT_DISABLED_TOOL_IDS = [
  "bash",
  "read",
  "write",
  "edit",
  "glob",
  "grep",
];

export const LEGACY_TERMINAL_SOUL = environmentPolicy.legacyTerminalSoul;

export const DEFAULT_TERMINAL_SOUL = environmentPolicy.terminalSoul;
export const DEFAULT_TERMINAL_USER_TEMPLATE = environmentPolicy.terminalUserTemplate;

/** Upgrade known defaults only; an edited SOUL belongs to the user. */
export function upgradeDefaultTerminalSoul(soul: string): string {
  return [LEGACY_TERMINAL_SOUL, ...environmentPolicy.previousTerminalSouls]
    .some((previous) => previous.trim() === soul.trim())
    ? DEFAULT_TERMINAL_SOUL
    : soul;
}

export const NEW_AGENT_SOUL_TEMPLATE = `# Soul

（在这里描述这个智能体是谁：用途、性格、语气。）

## 执行规则

- 单步任务立即执行，多步任务先简述计划。
- 写之前先读——不要假设文件存在或内容如你所想。
- 工具调用失败时先诊断错误、换一种方式重试，再向用户报告。
- 多步修改完成后，验证结果（重读文件、跑测试、看输出）。`;

export function createPersonalAssistantDefaults(
  overrides?: Partial<AgentConfig>,
): AgentConfig {
  return {
    id: PERSONAL_ASSISTANT_ID,
    builtinRole: "personal-assistant",
    name: "小雅",
    avatar: DEFAULT_AGENT_AVATAR,
    description: "需求整理与技术方案研究",
    providerId: "openai",
    modelName: "gpt-4o-mini",
    soul: DEFAULT_SOUL,
    user: "",
    disabledToolIds: PERSONAL_DEFAULT_DISABLED_TOOL_IDS,
    mcpServerIds: [],
    enabledSkillIds: [],
    knowledgeBaseIds: [],
    maxTurns: 30,
    envVars: {},
    chatMode: DEFAULT_CHAT_MODE,
    reasoningEffort: DEFAULT_REASONING_EFFORT,
    ...overrides,
  };
}

export function createTerminalAssistantDefaults(
  overrides?: Partial<AgentConfig>,
): AgentConfig {
  return {
    id: TERMINAL_ASSISTANT_ID,
    builtinRole: "terminal-assistant",
    name: "终端助手",
    avatar: "🤖",
    description: "本机、终端与远程主机的统一运维助手",
    providerId: "openai",
    modelName: "gpt-4o-mini",
    soul: DEFAULT_TERMINAL_SOUL,
    user: "",
    disabledToolIds: [],
    toolOverrides: {},
    mcpServerIds: [],
    enabledSkillIds: [],
    knowledgeBaseIds: [],
    maxTurns: 30,
    envVars: {},
    chatMode: DEFAULT_CHAT_MODE,
    reasoningEffort: DEFAULT_REASONING_EFFORT,
    ...overrides,
  };
}

export const HOST_DEFAULT_DISABLED_TOOL_IDS = [
  "Terminal",
  "bash",
  "read",
  "write",
  "edit",
  "glob",
  "grep",
];

export const DEFAULT_HOST_SOUL = `# Soul

你是主机助手，通过 SSH 直连用户的远程主机执行命令与文件操作。你没有本地能力——所有文件与命令工具只作用于远程主机。

## 角色定位

- 你是一位**一线运维工程师**：用户的远程主机出问题、要改配置、要查状态，你直接动手，产出是结果，不是教程。
- 你的一切操作都发生在远程主机上：读文件用 ssh_read，执行命令用 ssh_exec，永远不要假设本地环境。

## 工作方式

### 执行

- **写之前先读**：修改任何文件前先 ssh_read 确认现状，不要凭记忆或猜测写。
- **破坏性命令先说明影响**：rm、kill、覆盖写、批量修改、改系统配置——先说清会动到什么，用户确认后再执行。只读命令（ls、cat、grep、ps、systemctl status）直接跑。
- **cd 失败必须报错**：切换工作目录用 ssh_cwd；cd 不成功就把错误原样告诉用户，绝不静默回退到 home 目录。
- **修复后验证**：改动完成后重跑命令或重读文件确认生效，才收工。

### 路径与主机

- 相对路径基于当前工作目录解析；需要确认位置时先 pwd。
- 默认操作对话所属的主机；用户明确要求操作另一台主机时，首次需要用户确认。

## 沟通

- 回复精确、简短。结论先行，命令输出引用关键行即可，不大段粘贴。
- 不确定就说不确定；远程环境（发行版、包管理器、路径）与本地可能完全不同，先确认再动手。`;

export function createHostAssistantDefaults(
  overrides?: Partial<AgentConfig>,
): AgentConfig {
  return {
    id: HOST_ASSISTANT_ID,
    builtinRole: "host-assistant",
    name: "主机助手",
    avatar: "🐧",
    description: "SSH 主机助手，直连远程主机执行命令与文件操作",
    providerId: "openai",
    modelName: "gpt-4o-mini",
    soul: DEFAULT_HOST_SOUL,
    user: "",
    disabledToolIds: HOST_DEFAULT_DISABLED_TOOL_IDS,
    mcpServerIds: [],
    enabledSkillIds: [],
    knowledgeBaseIds: [],
    maxTurns: 30,
    envVars: {},
    chatMode: DEFAULT_CHAT_MODE,
    reasoningEffort: DEFAULT_REASONING_EFFORT,
    ...overrides,
  };
}

export function isAgentBackend(backend: string): boolean {
  return backend === AGENT_BACKEND_KEY;
}

export function getAgentBackendLabel(agent: AgentConfig): string {
  const avatar = toAvatarDisplay(agent.avatar);
  const name = agent.name?.trim() || "智能体";
  return `${avatar} ${name}`;
}

function pickTypedAgentFields(
  fallback: Partial<AgentConfig> | undefined,
): Partial<AgentConfig> {
  if (!fallback || typeof fallback !== "object") return {};
  const f = fallback as Partial<AgentConfig> & Record<string, unknown>;
  const out: Partial<AgentConfig> = {};
  if (typeof f.id === "string" && f.id.trim()) out.id = f.id;
  if (
    f.builtinRole === "personal-assistant" ||
    f.builtinRole === "terminal-assistant" ||
    f.builtinRole === "host-assistant"
  ) {
    out.builtinRole = f.builtinRole;
  }
  if (typeof f.name === "string" && f.name.trim()) out.name = f.name;
  if (typeof f.avatar === "string" && f.avatar.trim()) out.avatar = f.avatar;
  if (typeof f.description === "string") out.description = f.description;
  if (typeof f.providerId === "string" && f.providerId.trim()) {
    out.providerId = f.providerId;
  }
  if (typeof f.modelName === "string" && f.modelName.trim()) {
    out.modelName = f.modelName;
  }
  if (typeof f.soul === "string" && f.soul.trim()) out.soul = f.soul;
  if (typeof f.user === "string") out.user = f.user;
  if (f.toolOverrides && typeof f.toolOverrides === "object" && !Array.isArray(f.toolOverrides)) {
    out.toolOverrides = f.toolOverrides;
  }
  if (Array.isArray(f.disabledToolIds)) out.disabledToolIds = f.disabledToolIds;
  if (Array.isArray(f.mcpServerIds)) out.mcpServerIds = f.mcpServerIds;
  if (Array.isArray(f.enabledSkillIds)) out.enabledSkillIds = f.enabledSkillIds;
  if (Array.isArray(f.knowledgeBaseIds)) {
    out.knowledgeBaseIds = f.knowledgeBaseIds;
  }
  if (typeof f.maxTurns === "number" && Number.isFinite(f.maxTurns)) {
    out.maxTurns = f.maxTurns;
  }
  if (
    f.envVars &&
    typeof f.envVars === "object" &&
    !Array.isArray(f.envVars)
  ) {
    out.envVars = f.envVars;
  }
  if (typeof f.chatMode === "string") out.chatMode = f.chatMode;
  if (typeof f.reasoningEffort === "string") {
    out.reasoningEffort = f.reasoningEffort;
  }
  return out;
}

export function normalizeAgentConfig(
  value: unknown,
  fallback?: Partial<AgentConfig>,
): AgentConfig {
  // Fallback participates in base via a type-checked whitelist: a corrupt
  // fallback (e.g. caller passes the same raw object) must not re-inject
  // invalid values through base when field validation rejects them.
  const safeFallback = pickTypedAgentFields(fallback);
  const base = {
    ...createPersonalAssistantDefaults(),
    ...safeFallback,
  };
  if (!value || typeof value !== "object") return { ...base };

  const raw = value as Partial<AgentConfig> & {
    instructions?: string;
    mcpServers?: { id: string; enabled?: boolean }[];
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
    id:
      typeof raw.id === "string" && raw.id.trim()
        ? raw.id.trim()
        : base.id ||
          (typeof crypto !== "undefined" && "randomUUID" in crypto
            ? crypto.randomUUID()
            : `agent-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`),
    builtinRole:
      raw.builtinRole === "personal-assistant" ||
      raw.builtinRole === "terminal-assistant" ||
      raw.builtinRole === "host-assistant"
        ? raw.builtinRole
        : base.builtinRole,
    name: typeof raw.name === "string" && raw.name.trim() ? raw.name.trim() : base.name,
    avatar: (() => {
      const v = typeof raw.avatar === "string" ? raw.avatar.trim() : "";
      if (v && isImageAvatar(v)) return v;
      return base.avatar;
    })(),
    description:
      typeof raw.description === "string" ? raw.description : base.description,
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
    disabledToolIds: (() => {
      const ids = normalizeDisabledToolIds(
        raw.disabledToolIds,
        base.disabledToolIds,
      );
      // 一次性迁移：主机助手原强制禁用 McpManager，对齐本地智能体后改为可配置。
      return (raw.builtinRole ?? base.builtinRole) === "host-assistant"
        ? ids.filter((id) => id !== "McpManager")
        : ids;
    })(),
    ...(raw.toolOverrides || base.toolOverrides ? {
      toolOverrides: Object.fromEntries(
        Object.entries(raw.toolOverrides || base.toolOverrides || {}).filter(([, v]) => typeof v === "boolean"),
      ),
    } : {}),
    mcpServerIds,
    enabledSkillIds: Array.isArray(raw.enabledSkillIds)
      ? raw.enabledSkillIds.filter((id): id is string => typeof id === "string")
      : [...base.enabledSkillIds],
    knowledgeBaseIds: Array.isArray(raw.knowledgeBaseIds)
      ? raw.knowledgeBaseIds.filter(
          (id): id is string => typeof id === "string",
        )
      : [...base.knowledgeBaseIds],
    maxTurns:
      typeof raw.maxTurns === "number" && Number.isFinite(raw.maxTurns)
        ? Math.min(100, Math.max(1, Math.round(raw.maxTurns)))
        : base.maxTurns,
    envVars,
    chatMode: normalizeChatMode(raw.chatMode),
    reasoningEffort: normalizeReasoningEffort(raw.reasoningEffort),
  };
}

export function findAgentById(
  agents: AgentConfig[],
  id: string | undefined | null,
): AgentConfig | undefined {
  if (!id) return undefined;
  return agents.find((a) => a.id === id);
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

export function getEnabledAgentBuiltinTools(
  agent: AgentConfig,
  context: AgentEnvironment = "local",
  options?: { hideWebFetch?: boolean }
): AgentToolDescriptor[] {
  const approval = getEffectiveToolApprovalMode(agent);
  const card = getChatModeCard(agent.chatMode);
  const disabled = new Set(agent.disabledToolIds);
  const policy = AGENT_ENVIRONMENT_POLICY[context];
  if (agent.toolOverrides) {
    for (const id of policy.defaultDisabled) disabled.add(id);
    for (const [id, enabled] of Object.entries(agent.toolOverrides)) {
      if (enabled) disabled.delete(id); else disabled.add(id);
    }
  }
  for (const id of policy.blocked) disabled.add(id);
  // Preferences cannot override plan mode or the question-tool mode rules.
  if (card.readOnly) {
    for (const id of environmentPolicy.readOnlyBlocked) disabled.add(id);
  }
  for (const id of ALWAYS_ENABLED_TOOL_IDS) disabled.delete(id);
  if (agent.chatMode === "full-auto") disabled.add("AskUserQuestion");

  if (options?.hideWebFetch) {
    disabled.add("WebFetch");
  }

  return getBuiltinToolCatalog(approval).filter((t) => !disabled.has(t.id));
}
