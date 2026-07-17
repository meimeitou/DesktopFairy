const { ToolLoopAgent, stepCountIs } = require('ai');
const { resolveProviderModel } = require('./providerModel.cjs');
const { toCoreMessages } = require('./messages.cjs');
const { buildToolSet } = require('./buildToolSet.cjs');
const { createChunkBridge } = require('./chunkBridge.cjs');

/**
 * Run agent via AI SDK ToolLoopAgent (Cherry Studio pattern).
 * Replaces manual SSE turn loop in agentService.cjs.
 */
async function runAgentStream({
  requestId,
  messages,
  systemPrompt,
  apiConfig,
  toolDefinitions,
  toolDeps,
  maxTurns = 10,
  reasoningEffort,
  signal,
  safeSend,
}) {
  const model = resolveProviderModel(apiConfig);
  const tools = buildToolSet(toolDefinitions, toolDeps);
  const bridge = createChunkBridge({ requestId, safeSend });

  const agentOptions = {
    model,
    tools,
    instructions: systemPrompt,
    stopWhen: stepCountIs(Math.max(1, maxTurns)),
  };

  if (reasoningEffort && reasoningEffort !== 'default') {
    agentOptions.providerOptions = {
      openai: { reasoningEffort },
    };
  }

  const agent = new ToolLoopAgent(agentOptions);
  const coreMessages = toCoreMessages(messages);

  const result = await agent.stream({
    messages: coreMessages,
    abortSignal: signal,
  });

  const uiStream = result.toUIMessageStream();
  const reader = uiStream.getReader();

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done || signal?.aborted) break;
      bridge.handleChunk(value);
    }
  } finally {
    reader.releaseLock();
  }

  return {
    toolSnapshot: bridge.getToolSnapshot(),
    aborted: Boolean(signal?.aborted),
  };
}

module.exports = { runAgentStream };
