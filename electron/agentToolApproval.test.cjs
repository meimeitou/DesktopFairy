const approval = require('./agentToolApproval.cjs');

function makeHarness({ signal } = {}) {
  const events = [];
  const safeSend = (_channel, event) => events.push(event);
  const ask = approval.askUserInStream({
    requestId: 'req-1', safeSend, onApprovalWaitStart: () => {}, signal,
    toolCallId: 'call-1', questions: [{ question: 'q?', header: 'h' }],
  });
  return { ask, events, safeSend };
}

describe('askUserInStream lifecycle', () => {
  afterEach(() => approval.clearAllToolApprovals());

  it('registers, shows awaiting_input, resolves answers, and closes with a done event', async () => {
    const { ask, events } = makeHarness();
    const awaiting = events.find((e) => e.status === 'awaiting_input');
    expect(awaiting).toMatchObject({ toolName: 'AskUserQuestion', approvalId: 'req-1::call-1' });
    expect(JSON.parse(awaiting.toolArgs).questions[0].question).toBe('q?');
    approval.dispatchUserAnswer('req-1::call-1', { 'q?': 'a' });
    const result = await ask;
    expect(result.kind).toBe('answered');
    expect(result.answers).toEqual({ 'q?': 'a' });
    result.close('done-message', false);
    const done = events[events.length - 1];
    expect(done.status).toBe('done');
    expect(JSON.parse(done.resultPreview)).toEqual({ ok: false, message: 'done-message' });
  });

  it('emits an error terminal event on abort and returns kind aborted', async () => {
    const controller = new AbortController();
    const { ask, events } = makeHarness({ signal: controller.signal });
    controller.abort();
    const result = await ask;
    expect(result).toEqual({ kind: 'aborted' });
    const last = events[events.length - 1];
    expect(last.status).toBe('error');
    expect(last.message).toBe('已取消');
  });

  it('drops an answer that arrives after the wait was aborted', async () => {
    const controller = new AbortController();
    const { ask, events } = makeHarness({ signal: controller.signal });
    controller.abort();
    await ask;
    expect(approval.dispatchUserAnswer('req-1::call-1', { 'q?': 'late' })).toBe(false);
    expect(events.filter((e) => e.status === 'done')).toHaveLength(0);
  });

  it('drops a second answer after the first one resolved the wait', async () => {
    const { ask, events } = makeHarness();
    approval.dispatchUserAnswer('req-1::call-1', { 'q?': 'first' });
    const result = await ask;
    expect(result.answers['q?']).toBe('first');
    expect(approval.dispatchUserAnswer('req-1::call-1', { 'q?': 'second' })).toBe(false);
    result.close('ok', true);
    expect(events.filter((e) => e.status === 'done')).toHaveLength(1);
    expect(JSON.parse(events[events.length - 1].resultPreview).message).toBe('ok');
  });
});
