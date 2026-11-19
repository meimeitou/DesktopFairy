const { tool, jsonSchema } = require('ai');
const agentTools = require('../agentTools.cjs');
const { boundToolOutput } = require('./toolResultStore.cjs');
const READ_TOOL_RESULT_DEFINITION = {
  type: 'function', function: {
    name: 'read_tool_result',
    description: '分页读取之前工具输出中 resultId 对应的完整原文。无需重新执行工具；offset 使用上一次结果的 nextOffset（JS 字符索引）。',
    parameters: { type: 'object', properties: {
      resultId: { type: 'string' }, offset: { type: 'integer', minimum: 0 },
      maxTokens: { type: 'integer', minimum: 1, maximum: 4000 },
    }, required: ['resultId'] },
  },
};
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
  const outputBudget = Math.max(256, Math.min(8000, Math.floor((deps.contextWindow || 128000) * 0.05)));
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
          let output;
          try {
            output = JSON.parse(text);
          } catch {
            output = { ok: true, content: text };
          }
          return deps.resultStore ? await boundToolOutput(output, deps.resultStore, outputBudget) : output;
        } finally {
          unregisterToolAbort(toolCallId);
        }
      },
    });
  }
  if (deps.resultStore) {
    tools.read_tool_result = tool({
      description: READ_TOOL_RESULT_DEFINITION.function.description,
      inputSchema: jsonSchema(READ_TOOL_RESULT_DEFINITION.function.parameters),
      execute: async ({ resultId, offset, maxTokens }, { abortSignal }) => {
        abortSignal?.throwIfAborted();
        const page = await deps.resultStore.read(resultId, { offset, maxTokens: Math.min(maxTokens || 2000, Math.max(128, outputBudget - 200)) });
        abortSignal?.throwIfAborted();
        return page;
      },
    });
  }
  return tools;
}

module.exports = { buildToolSet, mergeSignals, READ_TOOL_RESULT_DEFINITION };
