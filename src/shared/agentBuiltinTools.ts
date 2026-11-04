import toolCatalog from "../../electron/agentBuiltinCatalogData.json";

export type ToolApproval = "auto" | "prompt";
export type ToolOrigin = "builtin";
export type ToolCategory = "shell" | "file" | "search" | "orchestration" | "context";

export interface AgentBuiltinTool {
  id: string;
  name: string;
  description: string;
  origin: ToolOrigin;
  approval: ToolApproval;
  category: ToolCategory;
}

interface CatalogTool {
  id: string;
  description: string;
  category: ToolCategory;
  defaultPrompt: boolean;
}

/** Shared with electron/agentBuiltinCatalog.cjs via agentBuiltinCatalogData.json. */
export const LEGACY_TOOL_ID_MAP: Record<string, string> = toolCatalog.legacyToolIdMap;

const SAFE_TOOL_IDS = new Set(toolCatalog.defaultSafeTools);

export const CLAUDE_CODE_BUILTIN_TOOLS: AgentBuiltinTool[] = (
  toolCatalog.tools as CatalogTool[]
).map((tool) => ({
  id: tool.id,
  name: tool.id,
  description: tool.description,
  origin: "builtin" as const,
  approval: tool.defaultPrompt ? "prompt" : "auto",
  category: tool.category,
}));

export function resolveBuiltinToolApproval(
  toolId: string,
  toolApprovalMode: "auto" | "confirm"
): ToolApproval {
  if (toolApprovalMode === "auto") return "auto";
  if (SAFE_TOOL_IDS.has(toolId)) return "auto";
  return "prompt";
}

export function getBuiltinToolCatalog(
  toolApprovalMode: "auto" | "confirm"
): AgentBuiltinTool[] {
  return CLAUDE_CODE_BUILTIN_TOOLS.map((tool) => ({
    ...tool,
    approval: resolveBuiltinToolApproval(tool.id, toolApprovalMode),
  }));
}

/** Builtin tools that stay enabled unless mode rules block them (e.g. full-auto). */
export const ALWAYS_ENABLED_TOOL_IDS = toolCatalog.alwaysEnabledToolIds;

export function stripAlwaysEnabledToolIds(disabledToolIds: string[]): string[] {
  const locked = new Set<string>(ALWAYS_ENABLED_TOOL_IDS);
  return disabledToolIds.filter((id) => !locked.has(id));
}

export function normalizeDisabledToolIds(
  value: unknown,
  fallback: string[] = [],
): string[] {
  const valid = new Set(CLAUDE_CODE_BUILTIN_TOOLS.map((t) => t.id));
  if (!Array.isArray(value)) return stripAlwaysEnabledToolIds([...fallback]);
  const seen = new Set<string>();
  const mapped: string[] = [];
  for (const id of value) {
    if (typeof id !== "string") continue;
    const n = LEGACY_TOOL_ID_MAP[id] || id;
    if (valid.has(n) && !seen.has(n)) {
      seen.add(n);
      mapped.push(n);
    }
  }
  return stripAlwaysEnabledToolIds(mapped);
}
