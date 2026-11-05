import environmentPolicy from "../../electron/agentEnvironmentPolicy.json";

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
    accent: "var(--persimmon)",
  },
  {
    mode: "plan",
    title: "计划模式",
    description: "只读不写。助手只分析现状并输出执行计划，不会改文件或跑命令。",
    icon: "chat-mode-plan",
    promptSuffix: environmentPolicy.chatModeSuffixes.plan,
    readOnly: true,
    toolApprovalOverride: "confirm",
    accent: "var(--amber)",
  },
  {
    mode: "auto-edit",
    title: "自动编辑模式",
    description: "读写文件无需确认；执行命令前仍会征求同意。",
    icon: "chat-mode-auto-edit",
    promptSuffix: environmentPolicy.chatModeSuffixes["auto-edit"],
    readOnly: false,
    toolApprovalOverride: "auto",
    accent: "var(--animal-success-color)",
  },
  {
    mode: "full-auto",
    title: "全自动模式",
    description: "无需任何确认。谨慎使用，建议只在沙盒或信任场景下开启。",
    icon: "chat-mode-full-auto",
    promptSuffix: environmentPolicy.chatModeSuffixes["full-auto"],
    readOnly: false,
    toolApprovalOverride: "auto",
    accent: "var(--rust)",
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
