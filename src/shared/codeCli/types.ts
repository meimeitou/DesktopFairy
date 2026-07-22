export const CODE_CLI_IDS = [
  "claude-code",
  "openai-codex",
  "opencode",
] as const;

export type CodeCliId = (typeof CODE_CLI_IDS)[number];

export const CLI_BINARY_NAMES: Record<CodeCliId, string> = {
  "claude-code": "claude",
  "openai-codex": "codex",
  opencode: "opencode",
};

export const CLI_TOOL_LABELS: Record<CodeCliId, string> = {
  "claude-code": "Claude Code",
  "openai-codex": "Codex",
  opencode: "OpenCode",
};

export const CLI_INSTALL_HINTS: Record<CodeCliId, string> = {
  "claude-code": "npm install -g @anthropic-ai/claude-code",
  "openai-codex": "npm install -g @openai/codex",
  opencode: "npm install -g opencode-ai",
};

export interface CliBinaryStatus {
  installed: boolean;
  version?: string;
  path?: string;
}

export function isCodeCliId(value: string): value is CodeCliId {
  return (CODE_CLI_IDS as readonly string[]).includes(value);
}
