const { shouldPromptForTool } = require('./agentBuiltinCatalog.cjs');
const { executeBuiltinTool } = require('./agentBuiltinExecutors.cjs');
const { executeSkillTool, executeSkillsTool } = require('./agentSkillService.cjs');
const { parseToolArguments } = require('./toolCallDisplay.cjs');
const { makeApprovalId, waitForToolApproval } = require('./agentToolApproval.cjs');

function parseCommandString(commandStr) {
  const parts = String(commandStr || '')
    .match(/(?:[^\s"']+|"[^"]*"|'[^']*')+/g);
  if (!parts || parts.length === 0) return { cmd: '', args: [] };
  const cmd = parts[0].replace(/^["']|["']$/g, '');
  const args = parts.slice(1).map((p) => p.replace(/^["']|["']$/g, ''));
  return { cmd, args };
}

function emitToolEvent(deps, patch) {
  deps.safeSend?.('agent:stream:tool', {
    requestId: deps.requestId,
    ...patch,
  });
}

async function requestInlineToolApproval(toolCall, deps, args, rawArgs) {
  const toolCallId = toolCall?.id || deps.toolCallId || 'unknown';
  const toolName = toolCall?.function?.name || 'unknown';
  const approvalId = makeApprovalId(deps.requestId, toolCallId);

  emitToolEvent(deps, {
    toolCallId,
    toolName,
    toolArgs: rawArgs,
    approvalId,
    status: 'awaiting_approval',
  });

  const approved = await waitForToolApproval({
    approvalId,
    signal: deps.signal,
  });

  if (!approved) {
    emitToolEvent(deps, {
      toolCallId,
      toolName,
      toolArgs: rawArgs,
      approvalId,
      status: 'denied',
      message: '用户拒绝执行',
    });
    return false;
  }

  emitToolEvent(deps, {
    toolCallId,
    toolName,
    toolArgs: rawArgs,
    approvalId,
    status: 'running',
  });
  return true;
}

async function executeAgentTool(toolCall, deps) {
  const name = toolCall?.function?.name;
  const rawArgs = toolCall?.function?.arguments || '';
  const toolCallId = toolCall?.id || deps.toolCallId;
  const { args } = parseToolArguments(rawArgs);

  if (shouldPromptForTool(name, deps.toolApprovalMode || 'confirm', args)) {
    const approved = await requestInlineToolApproval(toolCall, deps, args, rawArgs);
    if (!approved) {
      return {
        resultText: JSON.stringify({ ok: false, error: 'User denied tool execution' }),
        denied: true,
      };
    }
  } else {
    emitToolEvent(deps, {
      toolCallId,
      toolName: name,
      toolArgs: rawArgs,
      status: 'running',
    });
  }

  if (name.startsWith('mcp__')) {
    const mcpResult = await deps.executeMcpTool?.(name, args);
    if (mcpResult != null) {
      return { resultText: mcpResult, denied: false };
    }
    return {
      resultText: JSON.stringify({ ok: false, error: 'MCP tool unavailable' }),
      denied: false,
    };
  }

  if (name === 'Skill') {
    return {
      resultText: executeSkillTool(args, deps),
      denied: false,
    };
  }

  if (name === 'Skills') {
    return {
      resultText: await executeSkillsTool(args, deps),
      denied: false,
    };
  }

  return {
    resultText: await executeBuiltinTool(name, args, deps),
    denied: false,
  };
}

module.exports = {
  parseCommandString,
  executeAgentTool,
};
