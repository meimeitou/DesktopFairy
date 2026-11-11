const { shouldPromptForTool, resolveToolApprovalMode } = require('./agentBuiltinCatalog.cjs');
const { executeBuiltinTool } = require('./agentBuiltinExecutors.cjs');
const { executeSkillTool, executeSkillsTool } = require('./agentSkillService.cjs');
const { parseToolArgumentsStrict } = require('./toolCallDisplay.cjs');
const {
  makeApprovalId,
  askUserInStream,
  waitForToolApproval,
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

async function requestInlineToolApproval(toolCall, deps, args, rawArgs, { force = false } = {}) {
  const toolCallId = toolCall?.id || deps.toolCallId || 'unknown';
  const toolName = toolCall?.function?.name || 'unknown';
  const approvalId = makeApprovalId(deps.requestId, toolCallId);

  emitToolEvent(deps, {
    toolCallId,
    toolName,
    toolArgs: rawArgs,
    approvalId,
    status: 'awaiting_approval',
    // Force entries cannot be bulk-approved by "always allow" — the renderer
    // must exclude them from its per-card approval loop.
    force: force === true,
  });
  deps.onApprovalWaitStart?.();

  const approvalResult = await waitForToolApproval({
    approvalId,
    signal: deps.signal,
    force,
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

function toolFailureMessage(resultText) {
  if (typeof resultText !== 'string') return null;
  const trimmed = resultText.trim();
  if (!trimmed.startsWith('{')) return null;
  try {
    const obj = JSON.parse(trimmed);
    if (!obj || obj.ok !== false) return null;
    return typeof obj.error === 'string' && obj.error ? obj.error : 'Tool error';
  } catch {
    return null;
  }
}

function returnToolResult(deps, toolCallId, toolName, rawArgs, resultText) {
  if (!deps.suppressToolDoneEvent) {
    const errorMessage = toolFailureMessage(resultText);
    emitToolEvent(deps, {
      toolCallId,
      toolName,
      toolArgs: rawArgs,
      status: errorMessage ? 'error' : 'done',
      resultPreview: resultText,
      ...(errorMessage ? { message: errorMessage } : {}),
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
      ...(q.secret === true ? { secret: true } : {}),
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

  const answerResult = await askUserInStream({
    requestId: deps.requestId,
    safeSend: deps.safeSend,
    onApprovalWaitStart: deps.onApprovalWaitStart,
    signal: deps.signal,
    toolCallId,
    questions: normalized.questions,
  });
  if (answerResult.kind === 'aborted') return { resultText: '', aborted: true };
  return returnToolResult(
    deps,
    toolCallId,
    toolName,
    normalizedArgsJson,
    JSON.stringify({ ok: true, answers: answerResult.answers }),
  );
}

function savedHostLabel(host) {
  return `${host.name} (${host.user || '?'}@${host.host || '?'}:${host.port || 22})`;
}

function explicitHostQuery(args, rt) {
  const name = typeof args.host === 'string' ? args.host.trim() : '';
  if (name) return name;
  const id = typeof args.hostId === 'string' ? args.hostId.trim() : '';
  if (id && id !== rt.defaultHostId) return id;
  return '';
}

function pickHostFromAnswer(matches, answer) {
  const text = String(answer || '').trim();
  if (!text) return null;
  const byLabel = matches.filter((h) => savedHostLabel(h) === text || h.name === text || h.id === text);
  if (byLabel.length > 0) return byLabel.length === 1 ? byLabel[0] : null;
  const again = matches.filter((h) => {
    const blob = `${h.name} ${h.host || ''} ${h.user || ''}@${h.host || ''}`.toLowerCase();
    return blob.includes(text.toLowerCase());
  });
  return again.length === 1 ? again[0] : null;
}

/** One AskUserQuestion before ssh_* when the user named a host that is not yet granted. */
async function confirmSavedSshHost(deps, args, toolCallId) {
  const rt = deps.hostRuntime;
  if (rt.requireExplicitHost && !String(args.hostId || '').trim()) {
    return { error: '本轮选择了多台机器，请为此次 ssh_* 操作明确提供真实 hostId；不得使用隐式默认目标。' };
  }
  if (!args.host && rt.selectedHosts?.some((h) => h.id === args.hostId) && rt.isGranted(args.hostId)) {
    return { asked: false };
  }
  const query = explicitHostQuery(args, rt);
  if (!query) {
    args.hostId = rt.defaultHostId;
    if (args.hostId && rt.fingerprintOf(args.hostId)) return { asked: false };
  }
  const matched = query && typeof rt.searchSavedHosts === 'function' ? rt.searchSavedHosts(query) : [];
  const allHosts = rt.listSavedHosts?.() || [];
  const exact = matched.filter((h) => [h.id, h.name, h.host, `${h.user || ''}@${h.host || ''}`]
    .some((value) => String(value || '').toLowerCase() === query.toLowerCase()));
  const requestedId = typeof args.hostId === 'string' ? args.hostId.trim() : '';
  const conflicting = !!(args.host && requestedId && !(exact.length === 1 && exact[0].id === requestedId));
  const matches = matched.length > 0 ? [...matched] : [...allHosts];
  if (conflicting && !matches.some((h) => h.id === requestedId)) {
    const byId = allHosts.find((h) => h.id === requestedId);
    if (byId) matches.push(byId);
  }
  if (!conflicting && exact.length === 1 && rt.isGranted(exact[0].id)) {
    args.hostId = exact[0].id;
    delete args.host;
    return { asked: false };
  }
  const shown = matches.slice(0, 4);
  const extra = matches.length - shown.length;
  const fingerprintAtAsk = new Map(matches.map((h) => [
    h.id,
    typeof rt.operationFingerprintOf === 'function'
      ? rt.operationFingerprintOf(h.id)
      : rt.fingerprintOf(h.id),
  ]));
  const question = !matches.length
    ? '当前没有已保存的 SSH 主机。请说明要连接的主机名称、地址和登录账号；确认并保存主机后才能执行操作。不要填写密码。'
    : conflicting
      ? '主机名称与 hostId 不能唯一对应同一台已保存主机，请确认本次操作的目标：'
    : !query
      ? '当前未指定目标主机，要在哪一台已保存主机上执行？'
      : !matched.length
        ? `已保存列表中没有与「${query}」匹配的主机。你指的是下面哪台已保存主机？若都不是，请说明目标主机，暂不执行。`
        : matches.length === 1
          ? `在已保存主机「${savedHostLabel(matches[0])}」上执行这次操作？`
          : `「${query}」匹配到 ${matches.length} 台已保存主机，要在哪一台执行？`;
  const questionText = extra > 0 ? `${question}（另有 ${extra} 台未列出，可在「其他」填写完整主机名）` : question;
  const questions = [{
    question: questionText,
    header: '主机',
    options: shown.map((h) => ({ label: savedHostLabel(h) })),
  }];
  const askResult = await askUserInStream({
    requestId: deps.requestId,
    safeSend: deps.safeSend,
    onApprovalWaitStart: deps.onApprovalWaitStart,
    signal: deps.signal,
    toolCallId,
    questions,
  });
  if (askResult.kind === 'aborted') return { aborted: true };
  const closeQuestion = askResult.close;
  const answer = askResult.answers?.[questionText] || Object.values(askResult.answers || {})[0] || '';
  const picked = pickHostFromAnswer(matches, answer);
  if (!picked) {
    closeQuestion('尚未确认已保存主机，未执行操作', false);
    return {
      error: '没有确认到已保存主机，已取消执行。请先调用 ssh_hosts(action="list") 核对列表，通过 AskUserQuestion 澄清目标；需要新增主机时先收集配置并经用户批准保存，不得直接连接猜测的地址。',
      clarification: String(answer).trim().slice(0, 2000),
    };
  }
  const currentFingerprint = typeof rt.operationFingerprintOf === 'function'
    ? rt.operationFingerprintOf(picked.id)
    : rt.fingerprintOf(picked.id);
  if (currentFingerprint !== fingerprintAtAsk.get(picked.id)) {
    closeQuestion('确认期间目标主机身份已变化', false);
    return { error: '确认期间目标主机身份已变化，请重新确认' };
  }
  args.hostId = picked.id;
  delete args.host;
  rt.ensureGrant(rt.topicId, picked.id);
  closeQuestion(`已确认主机：${savedHostLabel(picked)}`, true);
  return { asked: true };
}

async function executeAgentTool(toolCall, deps) {
  const name = toolCall?.function?.name;
  let rawArgs = toolCall?.function?.arguments || '';
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

  try {
    deps.assertEnvironment?.();
    if (deps.allowedToolNames && !deps.allowedToolNames.has(name)) throw new Error('当前环境或配置未开放工具：' + name);
  } catch (e) {
    return { resultText: JSON.stringify({ ok: false, error: e.message }), denied: true };
  }

  // AskUserQuestion: never go through danger-tool approval / bypass; always wait for answers.
  if (name === 'AskUserQuestion') {
    return executeAskUserQuestion(toolCall, deps, args, rawArgs, toolCallId);
  }

  const isSshTargetTool = deps.hostRuntime && name.startsWith('ssh_') && name !== 'ssh_hosts';
  let hostOperation = null;
  if (isSshTargetTool) {
    const confirmed = await confirmSavedSshHost(deps, args, toolCallId);
    if (confirmed.aborted) return { resultText: '', aborted: true };
    if (confirmed.error) {
      return { resultText: JSON.stringify({ ok: false, error: confirmed.error, ...(confirmed.clarification ? { hostClarification: confirmed.clarification } : {}) }), denied: false };
    }
    args.targetLabel = deps.hostRuntime.describeHost?.(args.hostId) || args.hostId;
    rawArgs = JSON.stringify(args);
    try {
      hostOperation = deps.hostRuntime.captureOperation?.(args.hostId) || null;
    } catch (e) {
      return { resultText: JSON.stringify({ ok: false, error: e.message }), denied: false };
    }
  }
  const targetFingerprint = isSshTargetTool ? deps.hostRuntime.fingerprintOf(args.hostId) : null;
  // Bind the approval to the actual endpoint, including non-host contexts.
  let sudoTarget = null;
  const resolveSudoTarget = () => {
    const hosts = require('./settingsSnapshot.cjs').getSnapshot()?.sshHosts || [];
    const id = args.hostId || deps.hostRuntime?.hostId;
    const matches = id ? hosts.filter((h) => h.id === id) : hosts.filter((h) => h.name === args.host);
    if (matches.length !== 1) throw new Error('无法唯一确定 sudo 目标主机，请检查主机名称');
    const h = matches[0];
    return { id: h.id, name: h.name, user: h.user, host: h.host, port: h.port || 22, proxyJump: h.proxyJump || '' };
  };
  if (name === 'ssh_exec' && args.sudo === true) {
    try {
      sudoTarget = resolveSudoTarget();
      args.targetLabel = `${sudoTarget.name} (${sudoTarget.user || '?'}@${sudoTarget.host}:${sudoTarget.port})`;
      rawArgs = JSON.stringify(args);
    } catch (e) { return { resultText: JSON.stringify({ ok: false, error: e.message }), denied: false }; }
  }

  if (name === 'Terminal') {
    args.targetLabel = '当前交互终端（跟随会话）';
    rawArgs = JSON.stringify(args);
  }
  deps.onToolArgs?.(toolCallId, name, rawArgs);

  // Host-conversation force rules (ssh_hosts writes, cross-host grants):
  // even full-auto / "always allow" must show an approval card. The bulk
  // bypass (approveRequestApprovals) skips force entries, so only an
  // explicit per-card decision resolves them.
  const hostForce =
    deps.hostRuntime
      ? deps.hostRuntime.forceApproval(name, args, deps.hostRuntime)
      : false;
  const sudoForce = name === 'ssh_exec' && args.sudo === true;
  const approvalMode = resolveToolApprovalMode(deps.agentConfig);
  if (sudoForce || hostForce || (!deps.bypassApproval && shouldPromptForTool(name, approvalMode, args))) {
    const approvalResult = await requestInlineToolApproval(toolCall, deps, args, rawArgs, { force: hostForce || sudoForce });
    if (approvalResult === 'aborted') {
      return { resultText: '', aborted: true };
    }
    if (approvalResult === 'denied') {
      deps.onToolDenied?.(toolCallId);
      return {
        resultText: JSON.stringify({ ok: false, error: 'User denied tool execution' }),
        denied: true,
      };
    }
    if (sudoTarget) {
      try {
        if (JSON.stringify(resolveSudoTarget()) !== JSON.stringify(sudoTarget)) throw new Error('changed');
      } catch {
        return returnToolResult(deps, toolCallId, name, rawArgs, JSON.stringify({ ok: false, error: '审批期间目标主机身份已变化，请重新确认' }));
      }
    }
    if (isSshTargetTool && deps.hostRuntime.fingerprintOf(args.hostId) !== targetFingerprint) {
      return returnToolResult(deps, toolCallId, name, rawArgs, JSON.stringify({ ok: false, error: '审批期间目标主机身份已变化，请重新确认' }));
    }
    try { if (hostOperation) deps.hostRuntime.assertOperation(hostOperation); } catch (e) {
      return returnToolResult(deps, toolCallId, name, rawArgs, JSON.stringify({ ok: false, error: e.message }));
    }
    // Approved force card for a cross-host call → persist the grant.
    if (
      hostForce &&
      name !== 'ssh_hosts' &&
      (args?.hostId || deps.hostRuntime.defaultHostId)
    ) {
      deps.hostRuntime.ensureGrant(deps.hostRuntime.topicId, args.hostId || deps.hostRuntime.defaultHostId);
    }
  } else {
    emitToolEvent(deps, {
      toolCallId,
      toolName: name,
      toolArgs: rawArgs,
      status: 'running',
    });
  }

  // Recheck after approval: the terminal or host may have changed while waiting.
  try { deps.assertEnvironment?.(); } catch (e) {
    return returnToolResult(deps, toolCallId, name, rawArgs, JSON.stringify({ ok: false, error: e.message }));
  }
  try { if (hostOperation) deps.hostRuntime.assertOperation(hostOperation); } catch (e) {
    return returnToolResult(deps, toolCallId, name, rawArgs, JSON.stringify({ ok: false, error: e.message }));
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

  if (require('./knowledge/tools.cjs').TOOL_NAMES.has(name)) {
    return returnToolResult(deps, toolCallId, name, rawArgs, await require('./knowledge/tools.cjs').executeKnowledgeTool(name, args, deps));
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
    await executeBuiltinTool(name, args, {
      ...deps,
      toolCallId,
      ...(sudoTarget ? { approvedSudoTarget: sudoTarget } : {}),
      ...(hostOperation ? { hostOperation } : {}),
    }),
  );
}

module.exports = {
  parseCommandString,
  executeAgentTool,
};
