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
    id: "clear",
    label: "/clear",
    description: "清除上下文，后续消息不再引用此前对话",
    group: "builtin",
  },
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

/**
 * Query string for the slash popup, or `null` when the menu should stay closed.
 * Closes after a space so selecting `/skill-id ` can send on the next Enter.
 */
export function slashMenuQuery(input: string): string | null {
  const token = input.trimStart();
  if (!token.startsWith("/") || input.includes("\n")) return null;
  const after = token.slice(1);
  if (/\s/.test(after)) return null;
  return after;
}

/** Rewrites `/<skill-id> …` into a Skills load-tool instruction. */
export function applySkillSlashCommand(
  text: string,
  skillIds: Iterable<string>,
): { text: string; skillId: string } | null {
  const parsed = parseSlashCommand(text);
  if (!parsed) return null;
  const idSet = skillIds instanceof Set ? skillIds : new Set(skillIds);
  if (!idSet.has(parsed.command)) return null;
  const { command: skillId, rest } = parsed;
  return {
    skillId,
    text: rest
      ? `请使用 Skills 工具（action: "load"）加载并执行技能「${skillId}」，然后根据以下要求完成任务：\n\n${rest}`
      : `请使用 Skills 工具（action: "load"）加载并执行技能「${skillId}」，然后根据用户的后续要求完成任务。`,
  };
}

export function withEnabledSkillId(
  enabledSkillIds: string[] | undefined,
  skillId: string,
): string[] {
  const ids = Array.isArray(enabledSkillIds) ? enabledSkillIds : [];
  return ids.includes(skillId) ? ids : [...ids, skillId];
}

export const COMPACT_PROMPT =
  "请总结此前的对话内容，提取关键信息、用户意图、已完成的操作和待办事项，生成一段简洁的上下文摘要。后续对话将基于此摘要继续。";
