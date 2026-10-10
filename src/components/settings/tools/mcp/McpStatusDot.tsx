import type { McpRuntimeState } from "../../../../shared/mcpServer";

const MCP_STATUS_COLOR: Record<McpRuntimeState, string> = {
  connected: "#4ade80",
  connecting: "#facc15",
  error: "#e05a5a",
  disabled: "#6b7280",
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
      style={{ backgroundColor: MCP_STATUS_COLOR[state] || "#6b7280" }}
    />
  );
}
