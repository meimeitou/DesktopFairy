import { describe, it, expect } from 'vitest'
import {
  getEffectiveToolApprovalMode,
  getEnabledAgentBuiltinTools,
  normalizeAgentConfig,
  createPersonalAssistantDefaults,
  createTerminalAssistantDefaults,
  createHostAssistantDefaults,
  findAgentById,
  PERSONAL_ASSISTANT_ID,
  TERMINAL_ASSISTANT_ID,
  HOST_ASSISTANT_ID,
  PERSONAL_DEFAULT_DISABLED_TOOL_IDS,
  TERMINAL_DEFAULT_DISABLED_TOOL_IDS,
  HOST_DEFAULT_DISABLED_TOOL_IDS,
  isAgentBackend,
  getAgentBackendLabel,
  type AgentConfig,
} from './agent'
import { DEFAULT_CHAT_MODE } from './chatMode'

function makeAgent(overrides: Partial<AgentConfig> = {}): AgentConfig {
  return createPersonalAssistantDefaults({ id: 'test-agent', builtinRole: undefined, ...overrides })
}

describe('agent', () => {
  describe('builtin defaults', () => {
    it('personal assistant has chatMode "normal" and Terminal disabled', () => {
      const agent = createPersonalAssistantDefaults()
      expect(agent.id).toBe(PERSONAL_ASSISTANT_ID)
      expect(agent.builtinRole).toBe('personal-assistant')
      expect(agent.chatMode).toBe(DEFAULT_CHAT_MODE)
      expect(agent.disabledToolIds).toEqual(PERSONAL_DEFAULT_DISABLED_TOOL_IDS)
      expect(agent.maxTurns).toBe(30)
    })

    it('terminal assistant disables file/bash tools and keeps Terminal', () => {
      const agent = createTerminalAssistantDefaults()
      expect(agent.id).toBe(TERMINAL_ASSISTANT_ID)
      expect(agent.builtinRole).toBe('terminal-assistant')
      expect(agent.disabledToolIds).toEqual(TERMINAL_DEFAULT_DISABLED_TOOL_IDS)
      expect(agent.disabledToolIds).not.toContain('Terminal')
    })
  })

  describe('getEffectiveToolApprovalMode', () => {
    it('should return "auto" for full-auto mode', () => {
      const agent = makeAgent({ chatMode: 'full-auto' })
      expect(getEffectiveToolApprovalMode(agent)).toBe('auto')
    })

    it('should return "auto" for auto-edit mode', () => {
      const agent = makeAgent({ chatMode: 'auto-edit' })
      expect(getEffectiveToolApprovalMode(agent)).toBe('auto')
    })

    it('should return "confirm" for plan mode', () => {
      const agent = makeAgent({ chatMode: 'plan' })
      expect(getEffectiveToolApprovalMode(agent)).toBe('confirm')
    })

    it('should return "confirm" for normal mode (no override)', () => {
      const agent = makeAgent({ chatMode: 'normal' })
      expect(getEffectiveToolApprovalMode(agent)).toBe('confirm')
    })
  })

  describe('getEnabledAgentBuiltinTools', () => {
    it('should not expose Task, MultiEdit, or Skill in the catalog', () => {
      const agent = makeAgent({ chatMode: 'normal' })
      const ids = getEnabledAgentBuiltinTools(agent).map((t) => t.id)
      expect(ids).not.toContain('Task')
      expect(ids).not.toContain('MultiEdit')
      expect(ids).not.toContain('Skill')
      expect(ids).toContain('edit')
      expect(ids).toContain('Skills')
    })

    it('should hide WebFetch when hideWebFetch is set', () => {
      const agent = makeAgent({ chatMode: 'normal' })
      const ids = getEnabledAgentBuiltinTools(agent, 'local', {
        hideWebFetch: true,
      }).map((t) => t.id)
      expect(ids).not.toContain('WebFetch')
      expect(ids).toContain('WebSearch')
    })

    it('should disable write/bash tools in plan mode (readOnly)', () => {
      const agent = makeAgent({ chatMode: 'plan' })
      const tools = getEnabledAgentBuiltinTools(agent)
      const ids = tools.map((t) => t.id)
      expect(ids).not.toContain('write')
      expect(ids).not.toContain('edit')
      expect(ids).not.toContain('bash')
      expect(ids).not.toContain('WebFetch')
      expect(ids).not.toContain('WebSearch')
    })

    it('should include bash in full-auto mode', () => {
      const agent = makeAgent({ chatMode: 'full-auto' })
      const tools = getEnabledAgentBuiltinTools(agent)
      const ids = tools.map((t) => t.id)
      expect(ids).toContain('bash')
    })

    it('should exclude AskUserQuestion in full-auto mode', () => {
      const agent = makeAgent({ chatMode: 'full-auto' })
      const tools = getEnabledAgentBuiltinTools(agent)
      const ids = tools.map((t) => t.id)
      expect(ids).not.toContain('AskUserQuestion')
    })

    it('should include AskUserQuestion in normal / plan / auto-edit modes', () => {
      for (const chatMode of ['normal', 'plan', 'auto-edit'] as const) {
        const agent = makeAgent({ chatMode })
        const ids = getEnabledAgentBuiltinTools(agent).map((t) => t.id)
        expect(ids).toContain('AskUserQuestion')
      }
    })

    it('should filter out explicitly disabled tools', () => {
      const agent = makeAgent({
        chatMode: 'full-auto',
        disabledToolIds: ['bash'],
      })
      const tools = getEnabledAgentBuiltinTools(agent)
      const ids = tools.map((t) => t.id)
      expect(ids).not.toContain('bash')
    })

    it('should disable Terminal in local context', () => {
      const agent = makeAgent({ chatMode: 'normal' })
      const tools = getEnabledAgentBuiltinTools(agent)
      const ids = tools.map((t) => t.id)
      expect(ids).not.toContain('Terminal')
    })

    it('terminal assistant in terminal context: Terminal on, file/bash off', () => {
      const agent = createTerminalAssistantDefaults()
      const tools = getEnabledAgentBuiltinTools(agent, 'terminal')
      const ids = tools.map((t) => t.id)
      expect(ids).toContain('Terminal')
      expect(ids).not.toContain('bash')
      expect(ids).not.toContain('read')
      expect(ids).not.toContain('write')
      expect(ids).not.toContain('edit')
      expect(ids).not.toContain('glob')
      expect(ids).not.toContain('grep')
    })

    it('terminal context force-disables bash even when enabled in disabledToolIds', () => {
      const agent = createTerminalAssistantDefaults({ disabledToolIds: [] })
      const ids = getEnabledAgentBuiltinTools(agent, 'terminal').map((t) => t.id)
      expect(ids).not.toContain('bash')
    })

    it('should allow disabling Terminal explicitly in terminal context', () => {
      const agent = makeAgent({
        chatMode: 'normal',
        disabledToolIds: ['Terminal'],
      })
      const tools = getEnabledAgentBuiltinTools(agent, 'terminal')
      const ids = tools.map((t) => t.id)
      expect(ids).not.toContain('Terminal')
    })
  })

  describe('normalizeAgentConfig', () => {
    it('should return default config for null input', () => {
      const result = normalizeAgentConfig(null)
      expect(result.chatMode).toBe(DEFAULT_CHAT_MODE)
    })

    it('should return default config for undefined input', () => {
      const result = normalizeAgentConfig(undefined)
      expect(result.chatMode).toBe(DEFAULT_CHAT_MODE)
    })

    it('generates an id when missing and keeps it when present', () => {
      expect(normalizeAgentConfig({ name: 'x' }).id).toBeTruthy()
      expect(normalizeAgentConfig({ id: 'fixed' }).id).toBe('fixed')
    })

    it('validates builtinRole: unknown values fall back, known kept', () => {
      expect(normalizeAgentConfig({ builtinRole: 'nope' }).builtinRole).toBe(
        'personal-assistant',
      )
      expect(normalizeAgentConfig({ builtinRole: 'terminal-assistant' }).builtinRole).toBe(
        'terminal-assistant',
      )
    })

    it('normalizes knowledgeBaseIds and drops non-strings', () => {
      const result = normalizeAgentConfig({
        knowledgeBaseIds: ['kb1', 42, 'kb2'],
      })
      expect(result.knowledgeBaseIds).toEqual(['kb1', 'kb2'])
    })

    it('should migrate legacy "instructions" to "soul"', () => {
      const result = normalizeAgentConfig({
        name: 'test',
        instructions: 'You are helpful',
      })
      expect(result.soul).toBe('You are helpful')
    })

    it('should not overwrite soul if both soul and instructions exist', () => {
      const result = normalizeAgentConfig({
        soul: 'New soul',
        instructions: 'Old instructions',
      })
      expect(result.soul).toBe('New soul')
    })

    it('should clamp maxTurns to 1-100 range', () => {
      const tooHigh = normalizeAgentConfig({ maxTurns: 200 })
      expect(tooHigh.maxTurns).toBe(100)

      const tooLow = normalizeAgentConfig({ maxTurns: 0 })
      expect(tooLow.maxTurns).toBe(1)

      const valid = normalizeAgentConfig({ maxTurns: 50 })
      expect(valid.maxTurns).toBe(50)
    })

    it('should normalize invalid chatMode to "normal"', () => {
      const result = normalizeAgentConfig({ chatMode: 'invalid' })
      expect(result.chatMode).toBe('normal')
    })

    it('should strip unknown legacy tool ids and map old capitalized ids', () => {
      const result = normalizeAgentConfig({
        disabledToolIds: ['Task', 'MultiEdit', 'Terminal'],
      })
      // MultiEdit is legacy-mapped to edit (kept); Task is unknown (stripped)
      expect(result.disabledToolIds).toEqual(['edit', 'Terminal'])
    })

    it('should keep AskUserQuestion enabled even if present in disabledToolIds', () => {
      const result = normalizeAgentConfig({
        disabledToolIds: ['AskUserQuestion', 'Terminal'],
        chatMode: 'normal',
      })
      expect(result.disabledToolIds).toEqual(['Terminal'])
      const ids = getEnabledAgentBuiltinTools(result).map((t) => t.id)
      expect(ids).toContain('AskUserQuestion')
    })

    it('should ensure envVars is an object', () => {
      const result = normalizeAgentConfig({ envVars: null })
      expect(typeof result.envVars).toBe('object')
    })

    it('should ensure mcpServerIds is an array', () => {
      const result = normalizeAgentConfig({ mcpServerIds: null })
      expect(Array.isArray(result.mcpServerIds)).toBe(true)
    })

    it('should ensure enabledSkillIds is an array', () => {
      const result = normalizeAgentConfig({ enabledSkillIds: null })
      expect(Array.isArray(result.enabledSkillIds)).toBe(true)
    })

    it('does not inject readable skills until the settings toggle is on', () => {
      expect(makeAgent().enabledSkillIds).toEqual([])
      expect(normalizeAgentConfig({}).enabledSkillIds).toEqual([])
      expect(
        normalizeAgentConfig({ enabledSkillIds: ['find-skills'] }).enabledSkillIds,
      ).toEqual(['find-skills'])
    })
  })

  describe('findAgentById', () => {
    it('finds by id and returns undefined for missing/empty', () => {
      const agents = [createPersonalAssistantDefaults(), createTerminalAssistantDefaults()]
      expect(findAgentById(agents, TERMINAL_ASSISTANT_ID)?.builtinRole).toBe(
        'terminal-assistant',
      )
      expect(findAgentById(agents, 'nope')).toBeUndefined()
      expect(findAgentById(agents, undefined)).toBeUndefined()
    })
  })

  describe('isAgentBackend', () => {
    it('should return true for "agent"', () => {
      expect(isAgentBackend('agent')).toBe(true)
    })

    it('should return false for "openai"', () => {
      expect(isAgentBackend('openai')).toBe(false)
    })
  })

  describe('getAgentBackendLabel', () => {
    it('should return a non-empty string for agent config', () => {
      const agent = makeAgent({ name: 'TestAgent', avatar: '🤖' })
      const label = getAgentBackendLabel(agent)
      expect(typeof label).toBe('string')
      expect(label.length).toBeGreaterThan(0)
      expect(label).toContain('TestAgent')
    })
  })
})

describe('createHostAssistantDefaults', () => {
  it('fills host assistant fields', () => {
    const agent = createHostAssistantDefaults()
    expect(agent.id).toBe(HOST_ASSISTANT_ID)
    expect(agent.builtinRole).toBe('host-assistant')
    expect(agent.name).toBe('主机助手')
    expect(agent.avatar).toBe('🐧')
    expect(agent.mcpServerIds).toEqual([])
    expect(agent.enabledSkillIds).toEqual([])
    expect(agent.knowledgeBaseIds).toEqual([])
    expect(agent.maxTurns).toBe(30)
    expect(agent.chatMode).toBe(DEFAULT_CHAT_MODE)
    expect(agent.soul).toContain('ssh')
    expect(agent.disabledToolIds).toEqual(HOST_DEFAULT_DISABLED_TOOL_IDS)
  })
})

describe('getEnabledAgentBuiltinTools host context', () => {
  it('exposes ssh_* tools in host context and hides local machine tools', () => {
    const agent = createHostAssistantDefaults({ disabledToolIds: [] })
    const ids = getEnabledAgentBuiltinTools(agent, 'host').map((t) => t.id)
    for (const id of ['ssh_read', 'ssh_glob', 'ssh_grep', 'ssh_write', 'ssh_edit', 'ssh_cwd', 'ssh_exec', 'ssh_hosts']) {
      expect(ids).toContain(id)
    }
    for (const id of ['bash', 'read', 'write', 'edit', 'glob', 'grep', 'Terminal', 'McpManager']) {
      expect(ids).not.toContain(id)
    }
  })

  it('local and terminal contexts never expose the new ssh_* file tools', () => {
    const agent = createPersonalAssistantDefaults({ disabledToolIds: [] })
    const local = getEnabledAgentBuiltinTools(agent, 'local').map((t) => t.id)
    const term = getEnabledAgentBuiltinTools(createTerminalAssistantDefaults({ disabledToolIds: [] }), 'terminal').map((t) => t.id)
    for (const id of ['ssh_read', 'ssh_glob', 'ssh_grep', 'ssh_write', 'ssh_edit', 'ssh_cwd']) {
      expect(local).not.toContain(id)
      expect(term).not.toContain(id)
    }
    // terminal keeps the live-session path
    expect(term).toContain('ssh_exec')
  })

  it('plan mode blocks ssh_write/ssh_edit/ssh_cwd but keeps ssh_read', () => {
    const agent = createHostAssistantDefaults({ chatMode: 'plan', disabledToolIds: [] })
    const ids = getEnabledAgentBuiltinTools(agent, 'host').map((t) => t.id)
    expect(ids).not.toContain('ssh_write')
    expect(ids).not.toContain('ssh_edit')
    expect(ids).not.toContain('ssh_cwd')
    expect(ids).toContain('ssh_read')
  })
})
