const { ToolLoopAgent, stepCountIs, generateText, streamText: aiStreamText } = require('ai');
const { resolveProviderModel } = require('./providerModel.cjs');
const { toCoreMessages } = require('./messages.cjs');
const { buildToolSet } = require('./buildToolSet.cjs');
const { createChunkBridge } = require('./chunkBridge.cjs');
const { resolveStreamUsage } = require('./extractUsage.cjs');
const { createSteerableStream } = require('./steerableStream.cjs');
const { createContextCompactor } = require('./contextCompaction.cjs');

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
  maxTurns = 30,
  inputs,
  reasoningEffort,
  signal,
  compact = false,
}) {
  const model = resolveProviderModel(apiConfig);
  const compactor = createContextCompactor({ model, systemPrompt, toolDefinitions, apiConfig, signal, generateSummary: generateText });
  if (compact) {
    // A dedicated, tool-free call: never run the normal agent loop to summarize.
    const result = await compactor.compact(toCoreMessages(messages), 'manual');
    return { stream: new ReadableStream({ start(controller) {
      if (result) controller.enqueue({ type: 'context-checkpoint', checkpoint: result.checkpoint });
      else controller.enqueue({ type: 'text-delta', id: 'compact-noop', delta: '当前上下文无需压缩，已保留原文。' });
      controller.enqueue({ type: 'finish', finishReason: 'stop' });
      controller.close();
    } }) };
  }
  const tools = buildToolSet(toolDefinitions, toolDeps);

  const agentOptions = {
    model,
    tools,
    instructions: systemPrompt,
    maxOutputTokens: compactor.maxOutputTokens,
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

  return createSteerableStream({
    messages: toCoreMessages(messages), maxTurns: Math.max(1, maxTurns), signal, inputs, compactor,
    createAgent: ({ remainingTurns, prepareStep, onStepFinish }) => new ToolLoopAgent({
      ...agentOptions, stopWhen: stepCountIs(remainingTurns), prepareStep, onStepFinish,
    }),
  });
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
  const result = aiStreamText({
    model,
    messages: coreMessages,
    abortSignal: signal,
  });

  const bridge = createChunkBridge({ requestId, safeSend });
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

  const usage = await resolveStreamUsage(result);
  return { aborted: Boolean(signal?.aborted), usage };
}

module.exports = { streamText, streamPlainText };
