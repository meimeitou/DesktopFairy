// withSftp / withOneShotConnection 生命周期回归：超时、abort、迟到连接回收。
// 与 sshSudo.test.cjs 共用同一本地 SSH Server stand-in 思路。
const { Server } = require('ssh2');
const { generateKeyPairSync } = require('crypto');
const { withSftp, execOnSavedHost } = require('./sshService.cjs');

const key = generateKeyPairSync('rsa', { modulusLength: 2048 }).privateKey.export({ type: 'pkcs1', format: 'pem' });
let server;
let port;
let connectDelayMs = 0;
let connections = [];

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
      const session = accept();
      session.on('exec', (acceptExec) => {
        const stream = acceptExec();
        stream.write('ok');
        stream.exit(0);
        stream.end();
      });
      session.on('sftp', (acceptSftp) => {
        const sftpStream = acceptSftp();
        // 最小 SFTP：只回一个永不完成的 open 请求，模拟传输挂起。
        sftpStream.on('OPEN', () => { /* never respond */ });
      });
    }));
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  port = server.address().port;
});
afterAll(() => server.close());
beforeEach(() => { connectDelayMs = 0; connections = []; });
afterEach(() => { for (const { client } of connections) client.end(); });

const params = () => ({ host: '127.0.0.1', port, user: 'user', authMethod: 'password', password: 'pw' });

describe('withSftp connection lifecycle', () => {
  it('times out a stalled transfer and recycles the connection', async () => {
    await expect(withSftp(params(), () => new Promise(() => {}), { timeoutMs: 80 }))
      .rejects.toThrow('超时');
    await new Promise((resolve) => setTimeout(resolve, 120));
    expect(connections[0].ended).toBe(true);
  });

  it('abort tears the connection down while an operation is in flight', async () => {
    const controller = new AbortController();
    const promise = withSftp(params(), () => new Promise(() => {}), { timeoutMs: 5_000, signal: controller.signal });
    setTimeout(() => controller.abort(), 50);
    await expect(promise).rejects.toThrow('取消');
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(connections[0].ended).toBe(true);
  });

  it('closes a late connection that completes after the SFTP deadline', async () => {
    connectDelayMs = 60;
    await expect(withSftp(params(), () => 'unused', { timeoutMs: 20 })).rejects.toThrow('超时');
    await new Promise((resolve) => setTimeout(resolve, 150));
    expect(connections[0].ended).toBe(true);
  });

  it('aborts before connecting when the signal is already aborted', async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(execOnSavedHost(params(), 'id', 1_000, controller.signal)).rejects.toThrow('取消');
    expect(connections).toEqual([]);
  });
});
