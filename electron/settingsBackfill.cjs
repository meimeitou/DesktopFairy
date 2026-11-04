/**
 * Minimal builtin-agent backfill for the main-process settings snapshot.
 * Full normalization lives in src/shared/settings.ts (finalizeSettings) on the
 * renderer side; this only guarantees the always-present builtin agents exist
 * so early stream/tool resolution (resolveForSend, host conversations) works
 * before the renderer's first settings:sync.
 *
 * Keep field defaults in sync with createTerminalAssistantDefaults in src/shared/agent.ts. The terminal prompt is shared with the renderer via agentEnvironmentPolicy.json.
 */

const BUILTIN_AGENTS = [
  {
    id: 'personal-assistant',
    builtinRole: 'personal-assistant',
    name: '小雅',
    avatar: '🌸',
    description: '需求整理与技术方案研究',
    providerId: 'openai',
    modelName: 'gpt-4o-mini',
    soul: '',
    user: '',
    disabledToolIds: ['Terminal'],
    mcpServerIds: [],
    enabledSkillIds: [],
    knowledgeBaseIds: [],
    maxTurns: 30,
    envVars: {},
    chatMode: 'normal',
  },
  {
    id: 'terminal-assistant',
    builtinRole: 'terminal-assistant',
    name: '终端助手',
    avatar: '🤖',
    description: '终端里的运维助手，解释命令、诊断错误、操作会话',
    providerId: 'openai',
    modelName: 'gpt-4o-mini',
    soul: require('./agentEnvironmentPolicy.json').terminalSoul,
    user: '',
    disabledToolIds: [],
    toolOverrides: {},
    mcpServerIds: [],
    enabledSkillIds: [],
    knowledgeBaseIds: [],
    maxTurns: 30,
    envVars: {},
    chatMode: 'normal',
  },

];

/** Backfill missing builtin agents onto a raw settings object (no full normalize). */
function backfillBuiltinAgents(settings) {
  const { migrateTerminalSettings } = require('./terminalAssistantMigration.cjs');
  const next = migrateTerminalSettings(settings && typeof settings === 'object' ? settings : {});
  const agents = Array.isArray(next.agents) ? next.agents.filter(Boolean) : [];
  const have = new Set(agents.map((a) => a && a.id).filter(Boolean));
  let changed = false;
  for (const builtin of BUILTIN_AGENTS) {
    if (!have.has(builtin.id)) {
      // Clone: the module-level template must never be mutated by settings
      // readers (renderer syncs merge into agent objects).
      agents.push({
        ...builtin,
        disabledToolIds: [...builtin.disabledToolIds],
        mcpServerIds: [...builtin.mcpServerIds],
        enabledSkillIds: [...builtin.enabledSkillIds],
        knowledgeBaseIds: [...builtin.knowledgeBaseIds],
        envVars: { ...builtin.envVars },
      });
      changed = true;
    }
  }
  if (changed || next.agents !== agents) next.agents = agents;
  return next;
}

module.exports = { backfillBuiltinAgents };
