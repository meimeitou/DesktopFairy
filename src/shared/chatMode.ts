export type ChatMode = "normal" | "plan" | "auto-edit" | "full-auto";

export interface ChatModeCard {
  mode: ChatMode;
  title: string;
  description: string;
  icon: string;
  /** Suffix appended to the system prompt when this mode is active. */
  promptSuffix: string;
  /** When true, non-safe tools (writes/shell/network) are hidden from the model. */
  readOnly: boolean;
  /** Tool approval override for non-safe tools. undefined keeps the agent's default. */
  toolApprovalOverride?: "auto" | "confirm";
  /** Visual accent color. */
  accent: string;
}

export const CHAT_MODE_CARDS: ChatModeCard[] = [
  {
    mode: "normal",
    title: "普通模式",
    description: "可随意阅读；编辑文件或执行命令前会征求你的同意。",
    icon: "chat-mode-normal",
    promptSuffix: "",
    readOnly: false,
    toolApprovalOverride: undefined,
    accent: "#10b981",
  },
  {
    mode: "plan",
    title: "计划模式",
    description: "只读不写。助手只分析现状并输出执行计划，不会改文件或跑命令。",
    icon: "chat-mode-plan",
    promptSuffix:
      "\n\n## 计划模式\n当前处于【计划模式】。你只能使用 Read / Glob / Grep / TodoWrite / Skill / Skills 等只读工具来理解现状并输出执行计划。严禁调用 Write / Edit / MultiEdit / NotebookEdit / Bash / WebFetch / WebSearch / Task 等会改变系统或需要联网的工具。回答先给出目标与方案拆解，再列出要修改的文件和具体步骤，等待用户确认后再进入下一阶段。",
    readOnly: true,
    toolApprovalOverride: "confirm",
    accent: "#3b82f6",
  },
  {
    mode: "auto-edit",
    title: "自动编辑模式",
    description: "读写文件无需确认；执行命令前仍会征求同意。",
    icon: "chat-mode-auto-edit",
    promptSuffix:
      "\n\n## 自动编辑模式\n当前处于【自动编辑模式】。为了推进任务，你可以直接读写文件，无需再为 Edit / Write / MultiEdit 等编辑类操作请求用户确认；但 Bash / WebFetch / WebSearch / 网络请求或可能破坏环境的操作仍需先征得用户同意。",
    readOnly: false,
    toolApprovalOverride: "auto",
    accent: "#22c55e",
  },
  {
    mode: "full-auto",
    title: "全自动模式",
    description: "无需任何确认。谨慎使用，建议只在沙盒或信任场景下开启。",
    icon: "chat-mode-full-auto",
    promptSuffix:
      "\n\n## 全自动模式\n当前处于【全自动模式】。为了高效推进任务，你可以自主决定使用任何已提供的工具，无需再向用户请求确认，包括文件编辑、Bash 命令、网络请求、子 Agent 调度等。请保持操作的正确性与安全，在任务完成后再向用户汇报结果。",
    readOnly: false,
    toolApprovalOverride: "auto",
    accent: "#f97316",
  },
];

export const DEFAULT_CHAT_MODE: ChatMode = "normal";

export function normalizeChatMode(value: unknown): ChatMode {
  if (value === "plan" || value === "auto-edit" || value === "full-auto") {
    return value;
  }
  return DEFAULT_CHAT_MODE;
}

export function getChatModeCard(mode: ChatMode): ChatModeCard {
  return CHAT_MODE_CARDS.find((c) => c.mode === mode) ?? CHAT_MODE_CARDS[0];
}

/** Concatenates the agent's base instructions with the mode suffix (if any). */
export function buildModePrompt(
  baseInstructions: string | undefined,
  mode: ChatMode
): string | undefined {
  const card = getChatModeCard(mode);
  const base = typeof baseInstructions === "string" ? baseInstructions.trim() : "";
  const suffix = card.promptSuffix.trim();
  if (!suffix) return base || undefined;
  return base ? `${base}\n\n${suffix}` : suffix;
}
