const { shouldPromptForTool, resolveToolApprovalMode } = require('./agentBuiltinCatalog.cjs');
const { executeBuiltinTool } = require('./agentBuiltinExecutors.cjs');
const { executeSkillTool, executeSkillsTool } = require('./agentSkillService.cjs');
const { parseToolArgumentsStrict } = require('./toolCallDisplay.cjs');
const {
  makeApprovalId,
  makeAnswerId,
  waitForToolApproval,
  waitForUserAnswer,
} = require('./agentToolApproval.cjs');

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
  deps.onApprovalWaitStart?.();

  const approvalResult = await waitForToolApproval({
    approvalId,
    signal: deps.signal,
  });

  if (approvalResult === 'aborted') {
    emitToolEvent(deps, {
      toolCallId,
      toolName,
      toolArgs: rawArgs,
      approvalId,
      status: 'error',
      message: '已取消',
    });
    return 'aborted';
  }

  if (approvalResult === 'denied') {
    emitToolEvent(deps, {
      toolCallId,
      toolName,
      toolArgs: rawArgs,
      approvalId,
      status: 'denied',
      message: '用户拒绝执行',
    });
    return 'denied';
  }

  emitToolEvent(deps, {
    toolCallId,
    toolName,
    toolArgs: rawArgs,
    approvalId,
    status: 'running',
  });
  return 'approved';
}

function returnToolResult(deps, toolCallId, toolName, rawArgs, resultText) {
  if (!deps.suppressToolDoneEvent) {
    emitToolEvent(deps, {
      toolCallId,
      toolName,
      toolArgs: rawArgs,
      status: 'done',
      resultPreview: resultText,
    });
  }
  return { resultText, denied: false };
}

function normalizeAskOption(opt) {
  if (typeof opt === 'string') {
    const label = opt.trim();
    return label ? { label } : null;
  }
  if (!opt || typeof opt !== 'object') return null;
  const labelRaw = opt.label ?? opt.text ?? opt.value ?? opt.name ?? opt.title;
  if (typeof labelRaw !== 'string' || !labelRaw.trim()) return null;
  const normalized = { label: labelRaw.trim() };
  if (typeof opt.description === 'string' && opt.description.trim()) {
    normalized.description = opt.description.trim();
  } else if (typeof opt.detail === 'string' && opt.detail.trim()) {
    normalized.description = opt.detail.trim();
  }
  return normalized;
}

function normalizeAskUserQuestionsArgs(args) {
  const questions = args?.questions;
  if (!Array.isArray(questions) || questions.length < 1 || questions.length > 4) {
    return { error: 'questions must be an array of 1–4 items' };
  }
  const normalized = [];
  for (let i = 0; i < questions.length; i += 1) {
    const q = questions[i];
    if (!q || typeof q !== 'object') {
      return { error: `questions[${i}] must be an object` };
    }
    if (typeof q.question !== 'string' || !q.question.trim()) {
      return { error: `questions[${i}].question is required` };
    }
    const optionsRaw = Array.isArray(q.options) ? q.options : [];
    const options = [];
    for (let j = 0; j < optionsRaw.length; j += 1) {
      const opt = normalizeAskOption(optionsRaw[j]);
      if (opt) options.push(opt);
    }
    if (options.length > 4) {
      return { error: `questions[${i}].options must have at most 4 items` };
    }
    normalized.push({
      question: q.question.trim(),
      ...(typeof q.header === 'string' && q.header.trim() ? { header: q.header.trim() } : {}),
      ...(q.multiSelect === true ? { multiSelect: true } : {}),
      options,
    });
  }
  return { questions: normalized };
}

function validateAskUserQuestions(args) {
  const result = normalizeAskUserQuestionsArgs(args);
  if (result.error) return result.error;
  return null;
}

async function executeAskUserQuestion(toolCall, deps, args, rawArgs, toolCallId) {
  const toolName = 'AskUserQuestion';
  if (deps.agentConfig?.chatMode === 'full-auto') {
    return returnToolResult(
      deps,
      toolCallId,
      toolName,
      rawArgs,
      JSON.stringify({
        ok: false,
        error: 'AskUserQuestion is unavailable in full-auto mode',
      }),
    );
  }

  const validationError = validateAskUserQuestions(args);
  if (validationError) {
    return returnToolResult(
      deps,
      toolCallId,
      toolName,
      rawArgs,
      JSON.stringify({ ok: false, error: validationError }),
    );
  }

  const normalized = normalizeAskUserQuestionsArgs(args);
  const normalizedArgsJson = JSON.stringify({ questions: normalized.questions });

  const answerId = makeAnswerId(deps.requestId, toolCallId);
  emitToolEvent(deps, {
    toolCallId,
    toolName,
    toolArgs: normalizedArgsJson,
    approvalId: answerId,
    status: 'awaiting_input',
  });
  deps.onApprovalWaitStart?.();

  const answerResult = await waitForUserAnswer({
    answerId,
    signal: deps.signal,
  });

  if (answerResult.kind === 'aborted') {
    emitToolEvent(deps, {
      toolCallId,
      toolName,
      toolArgs: normalizedArgsJson,
      approvalId: answerId,
      status: 'error',
      message: '已取消',
    });
    return { resultText: '', aborted: true };
  }

  return returnToolResult(
    deps,
    toolCallId,
    toolName,
    normalizedArgsJson,
    JSON.stringify({ ok: true, answers: answerResult.answers }),
  );
}

async function executeAgentTool(toolCall, deps) {
  const name = toolCall?.function?.name;
  const rawArgs = toolCall?.function?.arguments || '';
  // readSseResponse 已为缺失 id 提供 call_${index} 兜底（agentService.cjs），
  // 此处再补一个本地兜底，避免引用不存在的 deps.toolCallId（历史死代码）。
  const toolCallId = toolCall?.id || `call_${name || 'unknown'}_${Date.now()}`;
  // 执行层用严格解析：畸形 JSON 直接拒绝执行（不进行正则容错提取）。
  // 审批卡片仍可用 parseToolArguments 容错展示。
  const { args } = parseToolArgumentsStrict(rawArgs);

  if (!name) {
    return {
      resultText: JSON.stringify({ ok: false, error: 'Missing tool name' }),
      denied: false,
    };
  }

  if (args === null) {
    return {
      resultText: JSON.stringify({
        ok: false,
        error: 'Invalid tool arguments (malformed JSON). 请模型重新构造合法的 JSON 参数。',
      }),
      denied: false,
    };
  }

  // AskUserQuestion: never go through danger-tool approval / bypass; always wait for answers.
  if (name === 'AskUserQuestion') {
    return executeAskUserQuestion(toolCall, deps, args, rawArgs, toolCallId);
  }

  const approvalMode = resolveToolApprovalMode(deps.agentConfig);
  if (!deps.bypassApproval && shouldPromptForTool(name, approvalMode, args)) {
    const approvalResult = await requestInlineToolApproval(toolCall, deps, args, rawArgs);
    if (approvalResult === 'aborted') {
      return { resultText: '', aborted: true };
    }
    if (approvalResult === 'denied') {
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
    const mcpResult = await deps.executeMcpTool?.(name, args, toolCallId);
    if (mcpResult != null) {
      return returnToolResult(deps, toolCallId, name, rawArgs, mcpResult);
    }
    return {
      resultText: JSON.stringify({ ok: false, error: 'MCP tool unavailable' }),
      denied: false,
    };
  }

  if (name === 'Skill') {
    return returnToolResult(
      deps,
      toolCallId,
      name,
      rawArgs,
      executeSkillTool(args, deps),
    );
  }

  if (name === 'Skills') {
    return returnToolResult(
      deps,
      toolCallId,
      name,
      rawArgs,
      await executeSkillsTool(args, deps),
    );
  }

  return returnToolResult(
    deps,
    toolCallId,
    name,
    rawArgs,
    await executeBuiltinTool(name, args, deps),
  );
}

module.exports = {
  parseCommandString,
  executeAgentTool,
};
