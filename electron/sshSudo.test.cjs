const { Server } = require('ssh2');
const { generateKeyPairSync } = require('crypto');
const { execOnSavedHost } = require('./sshService.cjs');
const cache = require('./sudoPasswordCache.cjs');

const key = generateKeyPairSync('rsa', { modulusLength: 2048 }).privateKey.export({ type: 'pkcs1', format: 'pem' });
let server;
let port;
let behavior;
let received;
let commands;
let acceptedPassword;
let connectDelayMs = 0;
let connections = [];
const topicId = 'sudo-test';

beforeAll(async () => {
  server = new Server({ hostKeys: [key] }, (client) => {
    const connection = { client, ended: false };
    connections.push(connection);
    client.on('end', () => { connection.ended = true; });
    client.on('authentication', (ctx) => {
      if (connectDelayMs) setTimeout(() => ctx.accept(), connectDelayMs);
      else ctx.accept();
    });
    client.on('ready', () => client.on('session', (accept) => {
      accept().on('exec', (acceptExec, _reject, info) => {
        const stream = acceptExec();
        commands.push(info.command);
        const prompt = info.command.match(/__DF_SUDO_PROMPT_[0-9a-f]+__/g)?.[0];
        const start = info.command.match(/__DF_SUDO_START_[0-9a-f]+__/g)?.[0];
        if (!prompt) {
          stream.stderr.write('Password:');
          setTimeout(() => { stream.exit(behavior === 'command-error' ? 1 : 0); stream.end(); }, 20);
          stream.on('data', (data) => received.push(data.toString()));
          return;
        }
        if (behavior === 'nopass') {
          stream.stderr.write(start);
          stream.write('ok');
          stream.exit(0); stream.end();
          return;
        }
        const sendPrompt = () => {
          stream.stderr.write(prompt.slice(0, 15));
          stream.stderr.write(prompt.slice(15));
        };
        stream.on('data', (data) => {
          const password = data.toString();
          received.push(password);
          if (password === acceptedPassword + '\n') {
            stream.stderr.write(start + 'command stderr');
            stream.write('done');
            stream.exit(0); stream.end();
          } else sendPrompt();
        });
        sendPrompt();
      });
    }));
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  port = server.address().port;
});
afterAll(() => { cache.clearTopic(topicId); server.close(); });
beforeEach(() => { received = []; commands = []; behavior = 'password'; acceptedPassword = ' correct '; connectDelayMs = 0; connections = []; cache.clearTopic(topicId); });
afterEach(() => { for (const { client } of connections) client.end(); });
function run(options = {}) {
  return execOnSavedHost({ host: '127.0.0.1', port, user: 'user', authMethod: 'password', password: 'ssh-password' }, 'echo done', 3000, undefined, {
    sudo: true, sudoCache: { topicId, hostId: 'h1' }, ...options,
  });
}

describe('SSH sudo authentication', () => {
  it('sends an exact password only on a split sudo prompt and caches it', async () => {
    let calls = 0;
    const result = await run({ onPasswordPrompt: async () => { calls++; return ' correct '; } });
    expect(result).toMatchObject({ stdout: 'done', stderr: 'command stderr', exitCode: 0 });
    expect(received).toEqual([' correct \n']);
    expect(commands[0]).toContain('exec </dev/null');
    await run({ onPasswordPrompt: async () => { calls++; return null; } });
    expect(calls).toBe(1);
    expect(received).toEqual([' correct \n', ' correct \n']);
  });
  it('does not send a cached password if sudo needs no authentication', async () => {
    behavior = 'nopass';
    const result = await run({ onPasswordPrompt: () => { throw new Error('unexpected'); } });
    expect(result.stdout).toBe('ok');
    expect(received).toEqual([]);
  });
  it('retries rejected credentials and stops after three failures', async () => {
    let calls = 0;
    await expect(run({ onPasswordPrompt: async () => { calls++; return 'wrong'; } })).rejects.toThrow('三次');
    expect(calls).toBe(3);
  });
  it('does not respond to ordinary command prompts', async () => {
    await run({ sudo: false, onPasswordPrompt: () => { throw new Error('unexpected'); } });
    expect(received).toEqual([]);
    expect(commands[0]).toBe('echo done');
  });
  it('closes a connection that completes after the connection timeout', async () => {
    connectDelayMs = 60;
    await expect(execOnSavedHost({ host: '127.0.0.1', port, user: 'user', authMethod: 'password', password: 'pw' }, 'id', 20)).rejects.toThrow('超时');
    await new Promise((resolve) => setTimeout(resolve, 120));
    expect(connections[0].ended).toBe(true);
    expect(commands).toEqual([]);
  });
  it('isolates and expires cache entries', () => {
    const params = { host: 'a', user: 'u' };
    cache.put(topicId, 'h', params, 'pw');
    expect(cache.get(topicId, 'h', params)).toBe('pw');
    expect(cache.get('other', 'h', params)).toBeNull();
    expect(cache.get(topicId, 'h', { ...params, user: 'other' })).toBeNull();
    const now = Date.now;
    try {
      Date.now = () => now() + 10 * 60 * 1000;
      expect(cache.get(topicId, 'h', params)).toBeNull();
    } finally { Date.now = now; }
    cache.put(topicId, 'h', params, 'pw');
    cache.clearTopic(topicId);
    expect(cache.get(topicId, 'h', params)).toBeNull();
  });
});


describe('sudo password source question', () => {
  async function runTool(answer, password = 'ssh-password', { args = {}, deps = {}, credential } = {}) {
    const snapshot = require('./settingsSnapshot.cjs');
    const { dispatchUserAnswer } = require('./agentToolApproval.cjs');
    const { executeSshBuiltinTool } = require('./agentBuiltinSshExecutors.cjs');
    const events = [];
    snapshot.setSnapshot({
      sshHosts: [{ id: 'h1', name: 'host', host: '127.0.0.1', port, user: 'user', authMethod: password || credential ? 'password' : 'agent', password, credentialId: credential?.id }],
      sshCredentials: credential ? [credential] : [],
    });
    try {
      const result = await executeSshBuiltinTool('ssh_exec', { host: 'host', command: 'id', sudo: true, ...args }, {
        requestId: 'sudo-source-test', topicId,
        ...deps,
        safeSend: (_channel, event) => {
          events.push(event);
          if (event.status === 'awaiting_input') queueMicrotask(() => {
            const question = JSON.parse(event.toolArgs).questions[0];
            dispatchUserAnswer(event.approvalId, { [question.question]: answer(question) });
          });
        },
      });
      return { result: JSON.parse(result), events };
    } finally { snapshot.setSnapshot(null); }
  }

  it('offers the connection password without exposing it and sends it only after selection', async () => {
    acceptedPassword = 'ssh-password';
    const { result, events } = await runTool(() => JSON.stringify({ source: 'connection' }));
    const question = JSON.parse(events.find((e) => e.status === 'awaiting_input').toolArgs).questions[0];
    expect(question.secretDefaultLabel).toContain('user');
    expect(result.ok).toBe(true);
    expect(result.exitCode).toBe(0);
    expect(received).toEqual(['ssh-password\n']);
    expect(JSON.stringify(events)).not.toContain('ssh-password');
  });

  it('preserves a manually entered password when a connection password is available', async () => {
    const { result, events } = await runTool(() => JSON.stringify({ source: 'manual', password: ' correct ' }));
    expect(result.exitCode).toBe(0);
    expect(received).toEqual([' correct \n']);
    expect(JSON.stringify(events)).not.toContain(' correct ');
  });

  it('offers only manual input when the connection has no password', async () => {
    const { result, events } = await runTool(() => ' correct ', null);
    expect(result.exitCode).toBe(0);
    const question = JSON.parse(events.find((e) => e.status === 'awaiting_input').toolArgs).questions[0];
    expect(question.secretDefaultLabel).toBeUndefined();
  });

  it('uses the bound credential password rather than the legacy inline password', async () => {
    const { result } = await runTool(() => JSON.stringify({ source: 'connection' }), 'legacy-password', {
      credential: { id: 'cred1', name: 'user-login', password: ' correct ' },
    });
    expect(result.exitCode).toBe(0);
    expect(received).toEqual([' correct \n']);
  });

  it('allows switching from a rejected connection password to manual input', async () => {
    let asks = 0;
    const { result, events } = await runTool(() => JSON.stringify(++asks === 1
      ? { source: 'connection' } : { source: 'manual', password: ' correct ' }));
    expect(result.exitCode).toBe(0);
    expect(received).toEqual(['ssh-password\n', ' correct \n']);
    const questions = events.filter((e) => e.status === 'awaiting_input').map((e) => JSON.parse(e.toolArgs).questions[0]);
    expect(questions[1].question).toContain('认证失败');
    expect(JSON.stringify(events)).not.toContain('ssh-password');
    expect(JSON.stringify(events)).not.toContain(' correct ');
  });

  it('does not fall back to the connection password for an invalid answer', async () => {
    const { result } = await runTool(() => JSON.stringify({ source: 'unknown' }));
    expect(result.ok).toBe(false);
    expect(result.error).toContain('密码来源');
    expect(received).toEqual([]);
  });

  it('does not claim a command was never executed merely because its exit code is nonzero', async () => {
    behavior = 'command-error';
    const { result } = await runTool(() => '', 'ssh-password', {
      args: { sudo: false },
      deps: { hostRuntime: { hostId: 'h1', defaultHostId: 'h1', topicId, getCwd: () => '/srv' } },
    });
    expect(result.exitCode).toBe(1);
    expect(commands[0]).toBe("cd '/srv' && id");
    expect(result.output).not.toContain('命令未执行');
  });
});

describe('sudo approval', () => {
  it('requires explicit per-card approval even in full-auto and rejects bulk approval', async () => {
    const snapshot = require('./settingsSnapshot.cjs');
    const approval = require('./agentToolApproval.cjs');
    const { executeAgentTool } = require('./agentTools.cjs');
    snapshot.setSnapshot({ sshHosts: [{ id: 'h1', name: 'host', host: 'example', user: 'alice' }] });
    const events = [];
    const promise = executeAgentTool({ id: 'sudo-call', function: { name: 'ssh_exec', arguments: JSON.stringify({ host: 'host', command: 'id', sudo: true }) } }, {
      requestId: 'sudo-approval-test', agentConfig: { chatMode: 'full-auto' }, bypassApproval: true,
      allowedToolNames: new Set(['ssh_exec']),
      safeSend: (_channel, event) => {
        events.push(event);
        if (event.status === 'awaiting_approval') queueMicrotask(() => {
          expect(approval.approveRequestApprovals('sudo-approval-test')).toBe(0);
          approval.dispatchToolApproval(event.approvalId, false);
        });
      },
    });
    const result = await promise;
    const event = events.find((e) => e.status === 'awaiting_approval');
    expect(event.force).toBe(true);
    expect(JSON.parse(event.toolArgs).targetLabel).toContain('alice@example');
    expect(result.denied).toBe(true);
    approval.clearAllToolApprovals();
    snapshot.setSnapshot(null);
  });
});
