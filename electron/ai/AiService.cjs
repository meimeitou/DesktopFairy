const { ToolLoopAgent, stepCountIs } = require('ai');
const { resolveProviderModel } = require('./providerModel.cjs');
const { toCoreMessages } = require('./messages.cjs');
const { buildToolSet } = require('./buildToolSet.cjs');

/**
 * AiService.streamText — Cherry Studio pattern (agent-session branch omitted).
 */
async function streamText({
  messages,
  systemPrompt,
  apiConfig,
  toolDefinitions,
  toolDeps,
  maxTurns = 10,
  temperature,
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

  if (typeof temperature === 'number') agentOptions.temperature = temperature;
  if (reasoningEffort && reasoningEffort !== 'default') {
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

module.exports = { streamText };
