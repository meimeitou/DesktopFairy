export const CHERRY_PROVIDER_PREFIX = "cherry-";
export const OPENCODE_SCHEMA = "https://opencode.ai/config.json";

export const CLAUDE_MANAGED_TOP_LEVEL_KEYS = ["attribution", "effortLevel"] as const;
export const CLAUDE_MANAGED_PERMISSION_KEYS = ["defaultMode"] as const;
export const CLAUDE_MANAGED_ENV_KEYS = [
  "ANTHROPIC_BASE_URL",
  "ANTHROPIC_MODEL",
  "ANTHROPIC_API_KEY",
  "ANTHROPIC_AUTH_TOKEN",
] as const;

export const CODEX_MANAGED_TOP_LEVEL_KEYS = [
  "approval_policy",
  "sandbox_mode",
  "default_permissions",
  "model_reasoning_effort",
  "disable_response_storage",
] as const;

export const OPEN_CODE_MANAGED_TOP_LEVEL_KEYS = [
  "autoCompact",
  "maxTurns",
  "permission",
] as const;
