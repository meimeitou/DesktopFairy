import { describe, it, expect } from 'vitest'
import {
  getEffectiveToolApprovalMode,
  getEnabledAgentBuiltinTools,
  normalizeAgentConfig,
  DEFAULT_AGENT_CONFIG,
  LOCAL_DEFAULT_DISABLED_TOOL_IDS,
  TERMINAL_DEFAULT_DISABLED_TOOL_IDS,
  isAgentBackend,
  getAgentBackendLabel,
  type AgentConfig,
} from './agent'
import { DEFAULT_CHAT_MODE } from './chatMode'

function makeAgent(overrides: Partial<AgentConfig> = {}): AgentConfig {
  return { ...DEFAULT_AGENT_CONFIG, ...overrides }
}

describe('agent', () => {
  describe('DEFAULT_AGENT_CONFIG', () => {
    it('should have chatMode "normal"', () => {
      expect(DEFAULT_AGENT_CONFIG.chatMode).toBe(DEFAULT_CHAT_MODE)
    })

    it('should have enabled true', () => {
      expect(DEFAULT_AGENT_CONFIG.enabled).toBe(true)
    })

    it('should disable Terminal in local context by default', () => {
      expect(DEFAULT_AGENT_CONFIG.disabledToolIds).toEqual(LOCAL_DEFAULT_DISABLED_TOOL_IDS)
    })

    it('should have terminalDisabledToolIds matching default file/bash tools', () => {
      expect(DEFAULT_AGENT_CONFIG.terminalDisabledToolIds).toEqual(TERMINAL_DEFAULT_DISABLED_TOOL_IDS)
    })

    it('should have maxTurns >= 1', () => {
      expect(DEFAULT_AGENT_CONFIG.maxTurns).toBeGreaterThanOrEqual(1)
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

    it('should NOT fall back to agent.toolApprovalMode when chatMode has no override', () => {
      // normal mode has no toolApprovalOverride, so it should return "confirm"
      // regardless of agent.toolApprovalMode
      const agent = makeAgent({ chatMode: 'normal', toolApprovalMode: 'auto' })
      expect(getEffectiveToolApprovalMode(agent)).toBe('confirm')
    })
  })

  describe('getEnabledAgentBuiltinTools', () => {
    it('should return tools for normal mode', () => {
      const agent = makeAgent({ chatMode: 'normal' })
      const tools = getEnabledAgentBuiltinTools(agent)
      expect(tools.length).toBeGreaterThan(0)
    })

    it('should disable write/bash tools in plan mode (readOnly)', () => {
      const agent = makeAgent({ chatMode: 'plan' })
      const tools = getEnabledAgentBuiltinTools(agent)
      const ids = tools.map((t) => t.id)
      expect(ids).not.toContain('Write')
      expect(ids).not.toContain('Edit')
      expect(ids).not.toContain('Bash')
      expect(ids).not.toContain('WebFetch')
      expect(ids).not.toContain('WebSearch')
    })

    it('should include bash in full-auto mode', () => {
      const agent = makeAgent({ chatMode: 'full-auto' })
      const tools = getEnabledAgentBuiltinTools(agent)
      const ids = tools.map((t) => t.id)
      expect(ids).toContain('Bash')
    })

    it('should filter out explicitly disabled tools', () => {
      const agent = makeAgent({
        chatMode: 'full-auto',
        disabledToolIds: ['Bash'],
      })
      const tools = getEnabledAgentBuiltinTools(agent)
      const ids = tools.map((t) => t.id)
      expect(ids).not.toContain('Bash')
    })

    it('should disable Terminal in local context', () => {
      const agent = makeAgent({ chatMode: 'normal' })
      const tools = getEnabledAgentBuiltinTools(agent)
      const ids = tools.map((t) => t.id)
      expect(ids).not.toContain('Terminal')
    })

    it('should enable Terminal and disable Bash/file tools in terminal context', () => {
      const agent = makeAgent({ chatMode: 'normal' })
      const tools = getEnabledAgentBuiltinTools(agent, 'terminal')
      const ids = tools.map((t) => t.id)
      expect(ids).toContain('Terminal')
      expect(ids).not.toContain('Bash')
      expect(ids).not.toContain('Read')
      expect(ids).not.toContain('Write')
      expect(ids).not.toContain('Edit')
      expect(ids).not.toContain('Glob')
      expect(ids).not.toContain('Grep')
    })

    it('should keep Terminal available in terminal context even in plan mode', () => {
      const agent = makeAgent({ chatMode: 'plan' })
      const tools = getEnabledAgentBuiltinTools(agent, 'terminal')
      const ids = tools.map((t) => t.id)
      expect(ids).toContain('Terminal')
    })

    it('should allow disabling Terminal explicitly in terminal context', () => {
      const agent = makeAgent({
        chatMode: 'normal',
        terminalDisabledToolIds: ['Terminal'],
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
      expect(result.enabled).toBe(true)
    })

    it('should return default config for undefined input', () => {
      const result = normalizeAgentConfig(undefined)
      expect(result.chatMode).toBe(DEFAULT_CHAT_MODE)
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

    it('should ensure disabledToolIds is an array', () => {
      const result = normalizeAgentConfig({ disabledToolIds: null })
      expect(Array.isArray(result.disabledToolIds)).toBe(true)
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

    it('should auto-add skill-creator when find-skills is enabled', () => {
      const result = normalizeAgentConfig({
        enabledSkillIds: ['find-skills'],
      })
      expect(result.enabledSkillIds).toContain('find-skills')
      expect(result.enabledSkillIds).toContain('skill-creator')
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
