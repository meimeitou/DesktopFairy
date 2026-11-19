/** Missing selection inherits the agent; an explicit empty list stays empty. */
export function resolveKnowledgeBaseIds(
  override: string[] | null | undefined,
  agentIds: string[] | undefined,
): string[] {
  return override ?? agentIds ?? [];
}
