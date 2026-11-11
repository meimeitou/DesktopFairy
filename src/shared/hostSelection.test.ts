import { describe, expect, it } from "vitest";
import { createRequire } from "node:module";
import { hostsForContinuation, normalizeSelectedHosts, projectHostSelection } from "./hostSelection";
import { buildHostCommands, buildSkillCommands, getBuiltinCommands } from "./slashCommands";
import { prepareSkillInvocation, rankSkillCommands, skillQueryAt } from "./skillInvocation";
import { acceptSendDraft, beginSend, emptyAgentSessionState } from "./agentSession";
import { buildChatSession, normalizeChatSession } from "./chatSession";
import type { SshHost } from "./terminalSettings";
const require = createRequire(import.meta.url);
const main = require('../../electron/hostSelection.cjs');
const machine = { id: "a", name: "应用服务器", host: "10.0.0.1", user: "ops", port: 2222, group: "生产", authMethod: "password", credentialId: "secret-ref", password: "secret", privateKeyPath: "/secret/key", proxyJump: "jump@bastion:22" } as SshHost;
const selection = projectHostSelection(machine);

describe('host mentions', () => {
  it('projects exactly the same public metadata in renderer and main, without credentials', () => {
    expect(selection).toEqual(main.projectHostSelection(machine));
    expect(JSON.stringify(selection)).not.toContain('secret');
    expect(normalizeSelectedHosts([machine, machine])).toEqual([selection]);
    expect(main.normalizeSelectedHosts([machine, machine])).toEqual([selection]);
  });
  it('groups machines before skills for @ and keeps machines out of slash menus', () => {
    const commands = [...getBuiltinCommands(), ...buildHostCommands([machine]), ...buildSkillCommands([{ id: 'review', name: '审查', folderName: 'review', description: '检查代码' }])];
    expect(rankSkillCommands(commands, skillQueryAt('@', 1)!).map((c) => c.group)).toEqual(['host', 'skill']);
    for (const query of ['应用', '10.0', 'ops', '生产']) {
      expect(rankSkillCommands(commands, skillQueryAt(`@${query}`, query.length + 1)!)[0].id).toBe('a');
    }
    expect(rankSkillCommands(commands, skillQueryAt('/', 1)!).some((c) => c.group === 'host')).toBe(false);
    const sameName = buildHostCommands([machine, { ...machine, id: 'b', host: '10.0.0.2' }]);
    expect(sameName[0].name).toBe(sameName[1].name);
    expect(sameName[0].description).not.toBe(sameName[1].description);
  });
  it('preserves both host and skill prefixes exactly once when retrying', () => {
    const first = prepareSkillInvocation('检查服务', ['review'], ['review'], [selection]);
    expect(first.text).toBe('@应用服务器 @review\n检查服务');
    expect(prepareSkillInvocation(first.text, ['review'], [], [selection]).text).toBe(first.text);
    expect(prepareSkillInvocation('/review 检查服务', [], ['review'], [selection]).text).toBe(first.text);
    expect(prepareSkillInvocation('', [], [], [selection]).rawText).toBe('');
  });
  it('round-trips message/draft targets, keeps changed drafts and clears accepted ones', () => {
    const draft = { ...emptyAgentSessionState(), input: '检查', selectedHosts: [selection] };
    const sending = beginSend(draft, { requestId: 'r', userText: '@应用服务器\n检查', rawText: '检查', selectedHosts: [selection], keepInput: true });
    expect(sending.selectedHosts).toEqual([selection]);
    const accepted = acceptSendDraft(sending, false, draft);
    expect(accepted.selectedHosts).toEqual([]);
    const changed = { ...sending, selectedHosts: [] };
    expect(acceptSendDraft(changed, false, draft)).toBe(changed);
    const restored = normalizeChatSession(buildChatSession(accepted.messages, draft.input, [], undefined, [], [selection]));
    expect(restored.messages[0]).toMatchObject({ rawText: '检查', selectedHosts: [selection] });
    expect(restored.draftSelectedHosts).toEqual([selection]);
    expect(hostsForContinuation(restored.messages)).toEqual([selection]);
    expect(hostsForContinuation([...restored.messages, { id: 'new', role: 'user', content: '另一个任务' }])).toEqual([]);
    expect(hostsForContinuation([...restored.messages, { id: 'clear', role: 'user', type: 'clear', content: '' }])).toEqual([]);
  });
});
