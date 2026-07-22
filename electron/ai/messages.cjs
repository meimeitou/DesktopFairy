/**
 * Convert OpenAI-style chat messages (DesktopFairy) to AI SDK ModelMessage[].
 */

function textContent(value) {
  if (typeof value === 'string') return value;
  if (value == null) return '';
  return String(value);
}

function mapUserContent(content) {
  if (typeof content === 'string') {
    return content;
  }
  if (!Array.isArray(content)) {
    return textContent(content ?? '');
  }

  const parts = [];
  for (const part of content) {
    if (!part || typeof part !== 'object') continue;
    if (part.type === 'text' && typeof part.text === 'string') {
      if (part.text) parts.push({ type: 'text', text: part.text });
      continue;
    }
    if (part.type === 'image_url') {
      const url = part.image_url?.url ?? part.url;
      if (typeof url === 'string' && url) {
        parts.push({ type: 'image', image: url });
      }
      continue;
    }
    if (part.type === 'image' && part.image != null) {
      parts.push({ type: 'image', image: part.image, mediaType: part.mediaType });
    }
  }

  if (parts.length === 0) return '';
  if (parts.length === 1 && parts[0].type === 'text') return parts[0].text;
  return parts;
}

function mapToolResultOutput(raw) {
  if (raw && typeof raw === 'object' && typeof raw.type === 'string') {
    if (
      raw.type === 'text' ||
      raw.type === 'json' ||
      raw.type === 'error-text' ||
      raw.type === 'error-json' ||
      raw.type === 'execution-denied' ||
      raw.type === 'content'
    ) {
      return raw;
    }
  }
  if (typeof raw === 'string') {
    return { type: 'text', value: raw };
  }
  return { type: 'json', value: raw === undefined ? null : raw };
}

function toCoreMessages(openAiMessages) {
  const out = [];
  for (const msg of openAiMessages || []) {
    if (!msg || !msg.role) continue;

    if (msg.role === 'system') {
      out.push({ role: 'system', content: textContent(msg.content ?? '') });
      continue;
    }

    if (msg.role === 'user') {
      out.push({ role: 'user', content: mapUserContent(msg.content) });
      continue;
    }

    if (msg.role === 'assistant') {
      const toolCalls = Array.isArray(msg.tool_calls) ? msg.tool_calls : [];
      const text = textContent(msg.content ?? '');

      if (toolCalls.length === 0) {
        out.push({ role: 'assistant', content: text });
        continue;
      }

      const content = [];
      if (text) content.push({ type: 'text', text });
      for (const tc of toolCalls) {
        content.push({
          type: 'tool-call',
          toolCallId: tc.id || tc.toolCallId || 'unknown',
          toolName: tc.function?.name || tc.toolName || 'unknown',
          input: safeParseJson(tc.function?.arguments ?? tc.args ?? tc.input),
        });
      }
      out.push({ role: 'assistant', content });
      continue;
    }

    if (msg.role === 'tool') {
      const toolCallId = msg.tool_call_id || msg.toolCallId || 'unknown';
      const toolName = msg.name || msg.toolName || 'unknown';
      let parsed = msg.content;
      if (typeof parsed === 'string') {
        try {
          parsed = JSON.parse(parsed);
        } catch {
          // keep string
        }
      }
      out.push({
        role: 'tool',
        content: [
          {
            type: 'tool-result',
            toolCallId,
            toolName,
            output: mapToolResultOutput(parsed),
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

module.exports = { toCoreMessages, safeParseJson, mapUserContent, mapToolResultOutput };
