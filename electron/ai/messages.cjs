/**
 * Convert OpenAI-style chat messages (DesktopFairy) to AI SDK CoreMessage[].
 */
function toCoreMessages(openAiMessages) {
  const out = [];
  for (const msg of openAiMessages || []) {
    if (!msg || !msg.role) continue;

    if (msg.role === 'system') {
      const content = typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content ?? '');
      out.push({ role: 'system', content });
      continue;
    }

    if (msg.role === 'user') {
      const content = typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content ?? '');
      out.push({ role: 'user', content });
      continue;
    }

    if (msg.role === 'assistant') {
      const entry = { role: 'assistant', content: msg.content ?? '' };
      if (Array.isArray(msg.tool_calls) && msg.tool_calls.length > 0) {
        entry.toolCalls = msg.tool_calls.map((tc) => ({
          type: 'function',
          toolCallId: tc.id,
          toolName: tc.function?.name || 'unknown',
          input: safeParseJson(tc.function?.arguments),
        }));
      }
      out.push(entry);
      continue;
    }

    if (msg.role === 'tool') {
      const toolCallId = msg.tool_call_id || msg.toolCallId || 'unknown';
      const toolName = msg.name || msg.toolName || 'unknown';
      let output = msg.content;
      try {
        output = typeof output === 'string' ? JSON.parse(output) : output;
      } catch {
        output = msg.content;
      }
      out.push({
        role: 'tool',
        content: [
          {
            type: 'tool-result',
            toolCallId,
            toolName,
            output,
          },
        ],
      });
    }
  }
  return out;
}

function safeParseJson(raw) {
  if (raw == null || raw === '') return {};
  if (typeof raw === 'object') return raw;
  try {
    return JSON.parse(raw);
  } catch {
    return { _raw: String(raw) };
  }
}

module.exports = { toCoreMessages, safeParseJson };
