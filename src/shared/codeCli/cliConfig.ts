import type { CodeCliId } from "./types";

export const CLI_CONFIG_TARGET_IDS = [
  "claude-settings",
  "codex-config",
  "codex-auth",
  "opencode-config",
] as const;

export type CliConfigTarget = (typeof CLI_CONFIG_TARGET_IDS)[number];

export type CliConfigLanguage = "json" | "toml";

export interface CliConfigWriteFile {
  target: CliConfigTarget;
  content: string;
}

export const CLI_CONFIG_FILE_SPECS: Record<
  CliConfigTarget,
  { label: string; path: string; language: CliConfigLanguage }
> = {
  "claude-settings": {
    label: "Claude settings.json",
    path: "~/.claude/settings.json",
    language: "json",
  },
  "codex-config": {
    label: "Codex config.toml",
    path: "~/.codex/config.toml",
    language: "toml",
  },
  "codex-auth": {
    label: "Codex auth.json",
    path: "~/.codex/auth.json",
    language: "json",
  },
  "opencode-config": {
    label: "OpenCode opencode.json",
    path: "~/.config/opencode/opencode.json",
    language: "json",
  },
};

const CLI_CONFIG_TARGETS: Record<CodeCliId, readonly CliConfigTarget[]> = {
  "claude-code": ["claude-settings"],
  "openai-codex": ["codex-config", "codex-auth"],
  opencode: ["opencode-config"],
};

export function getCliConfigTargets(cliTool: CodeCliId): readonly CliConfigTarget[] {
  return CLI_CONFIG_TARGETS[cliTool] ?? [];
}

export function isValidConfigTargetForTool(
  cliTool: CodeCliId,
  target: CliConfigTarget,
): boolean {
  return getCliConfigTargets(cliTool).includes(target);
}
