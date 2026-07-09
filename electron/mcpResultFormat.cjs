/**
 * Format MCP `CallToolResult` into a plain-text summary for the LLM.
 * Adapted from cherry-studio's mcp result utilities.
 */

/** Align with builtin WebFetch (agentBuiltinExecutors MAX_FETCH_BYTES) */
const MAX_MCP_TOOL_RESULT_CHARS = 512 * 1024;

function truncateMcpTextSummary(text) {
  const str = String(text ?? '');
  if (str.length <= MAX_MCP_TOOL_RESULT_CHARS) return str;
  const omitted = str.length - MAX_MCP_TOOL_RESULT_CHARS;
  return (
    `${str.slice(0, MAX_MCP_TOOL_RESULT_CHARS)}\n\n` +
    `…[MCP 结果已截断，省略 ${omitted} 字符。` +
    `若使用 fetch 工具，可增大 max_length 或配合 start_index 分页读取剩余内容。]`
  );
}

function mcpResultToTextSummary(result) {
  if (!result || typeof result !== 'object') {
    return truncateMcpTextSummary(String(result ?? ''));
  }

  const content = result.content;
  if (!Array.isArray(content)) {
    if (typeof result === 'string') return truncateMcpTextSummary(result);
    return truncateMcpTextSummary(JSON.stringify(result, null, 2));
  }

  if (content.length === 0) {
    return '';
  }

  const parts = [];
  for (const item of content) {
    if (!item || typeof item !== 'object') {
      parts.push(String(item));
      continue;
    }

    switch (item.type) {
      case 'text': {
        parts.push(String(item.text ?? ''));
        break;
      }
      case 'image': {
        parts.push('[图片资源]');
        break;
      }
      case 'resource': {
        const resource = item.resource || {};
        if (typeof resource.text === 'string' && resource.text.length > 0) {
          parts.push(resource.text);
        } else if (resource.blob) {
          parts.push(`[二进制资源: ${resource.mimeType || 'unknown'}]`);
        } else {
          parts.push(`[资源: ${resource.uri || ''}]`);
        }
        break;
      }
      default: {
        parts.push(JSON.stringify(item));
      }
    }
  }

  const joined = parts.join('\n\n').trim() || JSON.stringify(result, null, 2);
  return truncateMcpTextSummary(joined);
}

function hasMultimodalContent(result) {
  if (!result || typeof result !== 'object') return false;
  const content = result.content;
  if (!Array.isArray(content)) return false;
  return content.some((item) => item && (item.type === 'image' || item.type === 'resource'));
}

module.exports = {
  MAX_MCP_TOOL_RESULT_CHARS,
  truncateMcpTextSummary,
  mcpResultToTextSummary,
  hasMultimodalContent,
};
