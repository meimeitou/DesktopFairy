const { getServersByIds, getServerById } = require('./mcpServerService.cjs');
const { getOrCreateClient, callTool } = require('./mcpRuntimeService.cjs');
const { mcpResultToTextSummary } = require('./mcpResultFormat.cjs');
const { normalizeMcpToolArgs, enhanceMcpToolDescription } = require('./mcpToolArgs.cjs');

function parseMcpToolName(openAiName) {
  // Format: mcp__<serverId>__<toolName>
  const match = openAiName.match(/^mcp__(.+?)__(.+)$/);
  if (!match) return null;
  return { serverId: match[1], toolName: match[2] };
}

async function loadMcpToolDefinitions(serversOrIds) {
  const servers = Array.isArray(serversOrIds)
    ? serversOrIds.every((s) => typeof s === 'string')
      ? getServersByIds(serversOrIds)
      : serversOrIds
    : [];

  const enabled = servers.filter(
    (s) => s && s.isActive !== false && (s.command?.trim() || s.baseUrl?.trim())
  );

  const definitions = [];
  const connectedServerIds = [];

  for (const server of enabled) {
    try {
      const client = await getOrCreateClient(server);
      const { tools } = await client.listTools();
      for (const tool of tools || []) {
        const openAiName = `mcp__${server.id}__${tool.name}`;
        const inputSchema = tool.inputSchema || { type: 'object', properties: {} };
        definitions.push({
          type: 'function',
          function: {
            name: openAiName,
            description: enhanceMcpToolDescription(server, tool),
            parameters: inputSchema,
          },
        });
      }
      connectedServerIds.push(server.id);
    } catch (err) {
      console.warn(`[MCP] Failed to list tools from ${server.name}:`, err.message);
    }
  }

  return {
    definitions,
    connectedServerIds,
    executeMcpTool: async (openAiName, args, callId) => {
      const parsed = parseMcpToolName(openAiName);
      if (!parsed) throw new Error(`Invalid MCP tool name: ${openAiName}`);

      const { serverId, toolName } = parsed;
      const server = await getServerById(serverId);
      if (!server) throw new Error(`MCP server ${serverId} not found`);

      const normalizedArgs = normalizeMcpToolArgs(server, toolName, args);
      const result = await callTool({ serverId, name: toolName, args: normalizedArgs, callId });
      const summary = mcpResultToTextSummary(result);
      return JSON.stringify({ ok: true, content: summary });
    },
    dispose: () => {
      // Runtime service keeps clients alive for caching; do not kill them per agent run.
    },
  };
}

module.exports = {
  loadMcpToolDefinitions,
};
