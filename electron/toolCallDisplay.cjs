const TOOL_LABELS = {
  Bash: '执行命令',
  Read: '读取文件',
  Write: '写入文件',
  Edit: '编辑文件',
  MultiEdit: '批量编辑',
  Glob: '查找文件',
  Grep: '搜索内容',
  NotebookRead: '读取 Notebook',
  NotebookEdit: '编辑 Notebook',
  WebFetch: '获取网页',
  WebSearch: '网页搜索',
  Task: '子任务',
  TodoWrite: '任务列表',
};

function truncate(text, max = 800) {
  const t = String(text || '').replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

function unescapeJsonString(value) {
  try {
    return JSON.parse(`"${value}"`);
  } catch {
    return value.replace(/\\"/g, '"').replace(/\\\\/g, '\\');
  }
}

function extractJsonStringField(raw, field) {
  const re = new RegExp(`"${field}"\\s*:\\s*"((?:\\\\.|[^"\\\\])*)"`);
  const match = String(raw || '').match(re);
  if (!match) return '';
  return unescapeJsonString(match[1]);
}

function parseToolArguments(raw) {
  const str = String(raw || '').trim();
  if (!str) return { args: {}, raw: str };

  try {
    const parsed = JSON.parse(str);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return { args: parsed, raw: str };
    }
  } catch {
    /* fall through to partial extraction */
  }

  const args = {};
  for (const field of [
    'command',
    'cmd',
    'script',
    'path',
    'file_path',
    'filePath',
    'notebook_path',
    'pattern',
    'url',
    'query',
    'description',
    'prompt',
  ]) {
    const value = extractJsonStringField(str, field);
    if (value) args[field] = value;
  }

  return { args, raw: str };
}

function pickString(args, keys) {
  for (const key of keys) {
    const value = args?.[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
}

function formatToolApprovalDetail(toolName, rawArgs, parsedArgs) {
  const { args, raw } =
    parsedArgs && typeof parsedArgs === 'object'
      ? { args: parsedArgs, raw: String(rawArgs || '') }
      : parseToolArguments(rawArgs);

  switch (toolName) {
    case 'Bash': {
      const command = pickString(args, ['command', 'cmd', 'script']);
      const desc = pickString(args, ['description']);
      if (command && desc && desc !== command) {
        return `说明：${desc}\n\n命令：\n${command}`;
      }
      if (command) return `命令：\n${command}`;
      if (desc) return `命令：\n${desc}`;
      break;
    }
    case 'Read':
    case 'Write':
    case 'Edit':
    case 'MultiEdit':
    case 'Glob':
    case 'Grep': {
      const path = pickString(args, ['path', 'file_path', 'filePath']);
      const pattern = pickString(args, ['pattern']);
      if (pattern && path) return `模式：${pattern}\n路径：${path}`;
      if (pattern) return `模式：${pattern}`;
      if (path) return `路径：${path}`;
      break;
    }
    case 'NotebookRead':
    case 'NotebookEdit': {
      const notebook = pickString(args, ['notebook_path', 'path', 'file_path']);
      if (notebook) return `Notebook：\n${notebook}`;
      break;
    }
    case 'WebFetch': {
      const url = pickString(args, ['url']);
      if (url) return `URL：\n${url}`;
      break;
    }
    case 'WebSearch': {
      const query = pickString(args, ['query']);
      if (query) return `搜索：\n${query}`;
      break;
    }
    case 'Task': {
      const desc = pickString(args, ['description', 'prompt']);
      if (desc) return `任务：\n${desc}`;
      break;
    }
    default:
      break;
  }

  const keys = Object.keys(args || {});
  if (keys.length > 0) return JSON.stringify(args, null, 2);
  if (raw && raw !== '{}' && raw !== '[]') return truncate(raw, 800);
  return '（未收到工具参数，请拒绝或检查模型响应）';
}

function getToolLabel(toolName) {
  return TOOL_LABELS[toolName] || toolName || '工具';
}

module.exports = {
  TOOL_LABELS,
  parseToolArguments,
  formatToolApprovalDetail,
  getToolLabel,
  extractJsonStringField,
};
