import type { AgentSkillDescriptor } from "./agent";

export type SlashCommandGroup = "builtin" | "skill";

export interface SlashCommand {
  id: string;
  /** Display label shown in the popup */
  label: string;
  /** Short description */
  description: string;
  /** Category for grouping in the popup */
  group: SlashCommandGroup;
  /** The text to insert into the textarea (for skill commands) */
  insertText?: string;
}

const BUILTIN_COMMANDS: SlashCommand[] = [
  {
    id: "compact",
    label: "/compact",
    description: "AI 自动压缩上下文摘要并清除旧对话",
    group: "builtin",
  },
];

export function getBuiltinCommands(): SlashCommand[] {
  return [...BUILTIN_COMMANDS];
}

export function buildSkillCommands(
  skills: AgentSkillDescriptor[]
): SlashCommand[] {
  return skills.map((s) => ({
    id: s.id,
    label: `/${s.id}`,
    description: s.description || s.name,
    group: "skill" as const,
    insertText: `/${s.id} `,
  }));
}

/** Parses a leading `/command` from input text. Returns the command id and the remainder. */
export function parseSlashCommand(
  text: string
): { command: string; rest: string } | null {
  const trimmed = text.trimStart();
  if (!trimmed.startsWith("/")) return null;
  const match = trimmed.match(/^\/([a-zA-Z0-9_-]+)(\s.*)?$/s);
  if (!match) return null;
  return {
    command: match[1],
    rest: (match[2] || "").trim(),
  };
}

export const COMPACT_PROMPT =
  "请总结此前的对话内容，提取关键信息、用户意图、已完成的操作和待办事项，生成一段简洁的上下文摘要。后续对话将基于此摘要继续。";
