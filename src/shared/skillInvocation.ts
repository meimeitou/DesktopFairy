import { retainedReferences } from "./composerReferences";
import type { SelectedHost } from "./hostSelection";
import type { SlashCommand } from "./slashCommands";
import { parseSlashCommand } from "./slashCommands";

export interface SkillQuery {
  trigger: "/" | "@";
  query: string;
  start: number;
  end: number;
}

/** Only inspect the token at the caret, never email addresses or slash paths. */
export function skillQueryAt(input: string, caret: number): SkillQuery | null {
  const before = input.slice(0, caret);
  const end = caret + (input.slice(caret).match(/^[^\s]*/)?.[0].length || 0);
  const slash = before.match(/^\s*\/([^\s/]*)$/);
  if (slash && !before.includes("\n")) {
    return { trigger: "/", query: slash[1], start: before.indexOf("/"), end };
  }
  const mention = before.match(/(?:^|\s)@([^\s@]*)$/);
  if (!mention) return null;
  return { trigger: "@", query: mention[1], start: caret - mention[1].length - 1, end };
}

export function removeSkillQuery(input: string, query: SkillQuery) {
  return input.slice(0, query.start) + input.slice(query.end);
}

export function addSelectedSkill(ids: string[], id: string) {
  return ids.includes(id) ? ids : [...ids, id];
}

export function rankSkillCommands(commands: SlashCommand[], query: SkillQuery): SlashCommand[] {
  const q = query.query.toLocaleLowerCase();
  const score = (c: SlashCommand) => {
    const names = [c.id, c.name || c.label.replace(/^[/@]/, "")].map((s) => s.toLocaleLowerCase());
    if (names.includes(q)) return 0;
    if (names.some((s) => s.startsWith(q))) return 1;
    if (names.some((s) => s.includes(q))) return 2;
    return 3;
  };
  return commands.filter((c) =>
    (query.trigger === "/" ? c.group !== "host" : c.group !== "builtin") &&
    (!q || [c.id, c.name || c.label, c.description, c.searchText || ""].some((s) => s.toLocaleLowerCase().includes(q))),
  ).sort((a, b) => {
    const groupOrder = { builtin: 0, host: 1, skill: 2 };
    if (a.group !== b.group) return groupOrder[a.group] - groupOrder[b.group];
    if (q) return score(a) - score(b) || (a.name || a.label).localeCompare(b.name || b.label, "zh-CN");
    return Number(!!b.enabled) - Number(!!a.enabled) || (a.name || a.label).localeCompare(b.name || b.label, "zh-CN");
  });
}

export function skillHistoryText(rawText: string, ids: string[], hosts: SelectedHost[] = []) {
  const retained = retainedReferences(rawText, ids, hosts);
  const mentions = [...hosts.filter((h) => !retained.hosts.includes(h)).map((h) => `@${h.name}`), ...ids.filter((id) => !retained.skillIds.includes(id)).map((id) => `@${id}`)];
  return mentions.length ? `${mentions.join(" ")}\n${rawText}` : rawText;
}

/** Strip only the exact generated prefix when editing/retrying a recorded message. */
export function skillRawText(content: string, ids: string[] = [], hosts: SelectedHost[] = []) {
  const prefix = skillHistoryText("", ids, hosts);
  return (ids.length || hosts.length) && content.startsWith(prefix) ? content.slice(prefix.length) : content;
}

export interface SkillResendOptions {
  selectedSkillIds?: string[];
  selectedHosts?: SelectedHost[];
  resendMessageId?: string;
  resendAttachments?: import("./chatAttachments").ChatAttachment[];
}

export function prepareSkillInvocation(text: string, selectedIds: string[], installedIds: string[], selectedHosts: SelectedHost[] = []) {
  let rawText = skillRawText(text, selectedIds, selectedHosts).trim();
  let ids = [...new Set(selectedIds)];
  const parsed = parseSlashCommand(rawText);
  if (parsed && !["clear", "compact"].includes(parsed.command) && installedIds.includes(parsed.command)) {
    ids = addSelectedSkill(ids, parsed.command);
    rawText = parsed.rest;
  }
  return { rawText, selectedSkillIds: ids, text: skillHistoryText(rawText, ids, selectedHosts) };
}
