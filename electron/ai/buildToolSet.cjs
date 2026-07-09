const { tool, jsonSchema } = require('ai');
const { executeAgentTool } = require('../agentTools.cjs');

/**
 * Build AI SDK ToolSet from OpenAI function definitions + DesktopFairy executor deps.
 * @param {Array<{ type: string, function: { name, description, parameters } }>} definitions
 * @param {object} deps - passed through to executeAgentTool
 */
function buildToolSet(definitions, deps) {
  const tools = {};
  for (const def of definitions || []) {
    const fn = def?.function;
    if (!fn?.name) continue;
    const toolName = fn.name;
    const parameters = fn.parameters || { type: 'object', properties: {} };

    tools[toolName] = tool({
      description: fn.description || toolName,
      inputSchema: jsonSchema(parameters),
      execute: async (args, { toolCallId, abortSignal }) => {
        const toolCall = {
          id: toolCallId,
          function: {
            name: toolName,
            arguments: JSON.stringify(args ?? {}),
          },
        };
        const mergedDeps = {
          ...deps,
          signal: abortSignal || deps.signal,
        };
        const result = await executeAgentTool(toolCall, mergedDeps);
        if (result.aborted) {
          const err = new DOMException('Aborted', 'AbortError');
          throw err;
        }
        if (result.denied) {
          return { ok: false, error: 'User denied tool execution' };
        }
        const text = result.resultText || '';
        try {
          return JSON.parse(text);
        } catch {
          return { ok: true, content: text };
        }
      },
    });
  }
  return tools;
}

module.exports = { buildToolSet };
