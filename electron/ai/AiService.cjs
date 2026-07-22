const { ToolLoopAgent, stepCountIs, streamText: aiStreamText, generateText } = require('ai');
const { resolveProviderModel } = require('./providerModel.cjs');
const { toCoreMessages } = require('./messages.cjs');
const { buildToolSet } = require('./buildToolSet.cjs');
const { createChunkBridge } = require('./chunkBridge.cjs');

/**
 * AiService.streamText — Cherry Studio pattern (agent-session branch omitted).
 * Tool-loop agent stream as a UIMessageChunk ReadableStream.
 */
async function streamText({
  messages,
  systemPrompt,
  apiConfig,
  toolDefinitions,
  toolDeps,
  maxTurns = 10,
  reasoningEffort,
  signal,
}) {
  const model = resolveProviderModel(apiConfig);
  const tools = buildToolSet(toolDefinitions, toolDeps);

  const agentOptions = {
    model,
    tools,
    instructions: systemPrompt,
    stopWhen: stepCountIs(Math.max(1, maxTurns)),
  };

  const pt = apiConfig?.providerType;
  if (
    reasoningEffort &&
    reasoningEffort !== 'default' &&
    (pt === 'openai' || pt === 'openai-response')
  ) {
    agentOptions.providerOptions = { openai: { reasoningEffort } };
  }

  const agent = new ToolLoopAgent(agentOptions);
  const coreMessages = toCoreMessages(messages);
  const result = await agent.stream({
    messages: coreMessages,
    abortSignal: signal,
  });

  return result.toUIMessageStream();
}

/**
 * Plain chat (no tools): stream via AI SDK and bridge to chat:stream:* IPC.
 */
async function streamPlainText({
  requestId,
  messages,
  apiConfig,
  signal,
  safeSend,
}) {
  const model = resolveProviderModel(apiConfig);
  const coreMessages = toCoreMessages(messages);
  const bridge = createChunkBridge({ requestId, safeSend });

  const result = aiStreamText({
    model,
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

  return { aborted: Boolean(signal?.aborted) };
}

/**
 * Connectivity check via AI SDK generateText (all provider types).
 */
async function checkConnection({ apiConfig, signal }) {
  const model = resolveProviderModel(apiConfig);
  await generateText({
    model,
    prompt: 'hi',
    maxOutputTokens: 1,
    abortSignal: signal,
  });
}

module.exports = { streamText, streamPlainText, checkConnection };
