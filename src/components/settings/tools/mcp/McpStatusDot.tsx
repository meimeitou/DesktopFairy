import type { McpRuntimeState } from "../../../../shared/mcpServer";

const MCP_STATUS_COLOR: Record<McpRuntimeState, string> = {
  connected: "var(--animal-success-color)",
  connecting: "var(--amber)",
  error: "var(--rust)",
  disabled: "var(--bone-600)",
};

export default function McpStatusDot({
  state,
  title,
}: {
  state: McpRuntimeState;
  title?: string;
}) {
  return (
    <span
      className={`mcp-status-dot mcp-status-${state}`}
      title={title || state}
      style={{ backgroundColor: MCP_STATUS_COLOR[state] || "var(--bone-600)" }}
    />
  );
}
