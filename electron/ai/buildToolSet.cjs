const { tool, jsonSchema } = require('ai');
const agentTools = require('../agentTools.cjs');
const {
  registerToolAbort,
  unregisterToolAbort,
} = require('../agentToolAbort.cjs');

function mergeSignals(streamSignal, toolSignal) {
  if (!streamSignal) return toolSignal;
  if (!toolSignal) return streamSignal;
  const controller = new AbortController();
  const forward = (signal) => () => controller.abort(signal?.reason);
  for (const signal of [streamSignal, toolSignal]) {
    if (signal.aborted) {
      // Already-aborted sources never fire a listener — propagate synchronously.
      controller.abort(signal.reason);
      return controller.signal;
    }
  }
  const onStreamAbort = forward(streamSignal);
  const onToolAbort = forward(toolSignal);
  streamSignal.addEventListener('abort', onStreamAbort, { once: true });
  toolSignal.addEventListener('abort', onToolAbort, { once: true });
  return controller.signal;
}

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
        // Per-tool cancel (renderer 取消按钮): aborting this controller fires
        // the merged signal; executors return an aborted result and we throw
        // below — the agent loop continues, only this call dies.
        const streamSignal = abortSignal || deps.signal;
        const toolController = registerToolAbort(toolCallId);
        const mergedSignal = mergeSignals(streamSignal, toolController?.signal);
        try {
          // Cancel may have landed before we registered — check first.
          if (toolController?.signal.aborted) {
            throw new Error('工具调用已被用户取消');
          }
          const toolCall = {
            id: toolCallId,
            function: {
              name: toolName,
              arguments: JSON.stringify(args ?? {}),
            },
          };
          const mergedDeps = {
            ...deps,
            signal: mergedSignal,
          };
          const result = await agentTools.executeAgentTool(toolCall, mergedDeps);
          if (result.aborted || mergedSignal.aborted) {
            // Distinguish the two abort sources: a per-tool cancel is a normal
            // tool error the model can read (loop continues); a whole-stream
            // abort stays AbortError so upstream keeps its abort semantics.
            if (streamSignal?.aborted) {
              throw new DOMException('Aborted', 'AbortError');
            }
            throw new Error('工具调用已被用户取消');
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
        } finally {
          unregisterToolAbort(toolCallId);
        }
      },
    });
  }
  return tools;
}

module.exports = { buildToolSet, mergeSignals };
