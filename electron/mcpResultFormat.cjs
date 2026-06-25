/**
 * Format MCP `CallToolResult` into a plain-text summary for the LLM.
 * Adapted from cherry-studio's mcp result utilities.
 */

function mcpResultToTextSummary(result) {
  if (!result || typeof result !== 'object') {
    return String(result ?? '');
  }

  const content = result.content;
  if (!Array.isArray(content)) {
    if (typeof result === 'string') return result;
    return JSON.stringify(result, null, 2);
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

  return parts.join('\n\n').trim() || JSON.stringify(result, null, 2);
}

function hasMultimodalContent(result) {
  if (!result || typeof result !== 'object') return false;
  const content = result.content;
  if (!Array.isArray(content)) return false;
  return content.some((item) => item && (item.type === 'image' || item.type === 'resource'));
}

module.exports = {
  mcpResultToTextSummary,
  hasMultimodalContent,
};
