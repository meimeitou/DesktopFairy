/**
 * MCP tool argument normalization — align fetch pagination with official mcp-server-fetch.
 * @see https://github.com/modelcontextprotocol/servers/tree/main/src/fetch
 */

/** Official mcp-server-fetch default when max_length is omitted */
const OFFICIAL_FETCH_DEFAULT_MAX_LENGTH = 5000;

/** DesktopFairy default when agent omits max_length (server allows up to 1_000_000) */
const DF_FETCH_DEFAULT_MAX_LENGTH = 50_000;

/** Hard cap we pass to fetch to avoid multi-MB tool payloads */
const DF_FETCH_MAX_LENGTH_CAP = 200_000;

const FETCH_TOOL_NAMES = new Set(['fetch']);

function isOfficialFetchServer(server) {
  if (!server) return false;
  if (server.id === 'builtin-mcp-fetch') return true;
  const args = server.args || [];
  return args.some((a) => String(a).includes('mcp-server-fetch'));
}

function normalizeMcpToolArgs(server, toolName, args) {
  const base = args && typeof args === 'object' && !Array.isArray(args) ? { ...args } : {};

  if (isOfficialFetchServer(server) && FETCH_TOOL_NAMES.has(toolName)) {
    const raw = Number(base.max_length);
    if (!Number.isFinite(raw) || raw <= 0) {
      base.max_length = DF_FETCH_DEFAULT_MAX_LENGTH;
    } else {
      base.max_length = Math.min(Math.max(Math.floor(raw), 1), DF_FETCH_MAX_LENGTH_CAP);
    }
    const start = Number(base.start_index);
    if (!Number.isFinite(start) || start < 0) {
      base.start_index = 0;
    } else {
      base.start_index = Math.floor(start);
    }
  }

  return base;
}

function enhanceMcpToolDescription(server, tool) {
  const base = tool?.description || tool?.name || 'MCP tool';
  if (isOfficialFetchServer(server) && FETCH_TOOL_NAMES.has(tool?.name)) {
    return (
      `[MCP:${server.name}] ${base}. ` +
      `Supports max_length (chars, server default ${OFFICIAL_FETCH_DEFAULT_MAX_LENGTH}) ` +
      `and start_index for pagination when content is truncated. ` +
      `DesktopFairy uses max_length=${DF_FETCH_DEFAULT_MAX_LENGTH} when omitted.`
    );
  }
  return `[MCP:${server.name}] ${base}`;
}

module.exports = {
  OFFICIAL_FETCH_DEFAULT_MAX_LENGTH,
  DF_FETCH_DEFAULT_MAX_LENGTH,
  DF_FETCH_MAX_LENGTH_CAP,
  normalizeMcpToolArgs,
  enhanceMcpToolDescription,
  isOfficialFetchServer,
};
