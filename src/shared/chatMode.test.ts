import { describe, it, expect } from 'vitest'
import {
  CHAT_MODE_CARDS,
  DEFAULT_CHAT_MODE,
  normalizeChatMode,
  getChatModeCard,
  buildModePrompt,
  type ChatMode,
} from './chatMode'

describe('chatMode', () => {
  describe('CHAT_MODE_CARDS', () => {
    it('should have 4 modes', () => {
      expect(CHAT_MODE_CARDS).toHaveLength(4)
    })

    it('should include all expected modes', () => {
      const modes = CHAT_MODE_CARDS.map((c) => c.mode)
      expect(modes).toEqual(['normal', 'plan', 'auto-edit', 'full-auto'])
    })

    it('plan mode should be readOnly', () => {
      const plan = CHAT_MODE_CARDS.find((c) => c.mode === 'plan')
      expect(plan?.readOnly).toBe(true)
    })

    it('full-auto mode should have toolApprovalOverride "auto"', () => {
      const fullAuto = CHAT_MODE_CARDS.find((c) => c.mode === 'full-auto')
      expect(fullAuto?.toolApprovalOverride).toBe('auto')
    })

    it('plan mode should have toolApprovalOverride "confirm"', () => {
      const plan = CHAT_MODE_CARDS.find((c) => c.mode === 'plan')
      expect(plan?.toolApprovalOverride).toBe('confirm')
    })

    it('auto-edit mode should have toolApprovalOverride "auto"', () => {
      const autoEdit = CHAT_MODE_CARDS.find((c) => c.mode === 'auto-edit')
      expect(autoEdit?.toolApprovalOverride).toBe('auto')
    })

    it('normal mode should not have toolApprovalOverride', () => {
      const normal = CHAT_MODE_CARDS.find((c) => c.mode === 'normal')
      expect(normal?.toolApprovalOverride).toBeUndefined()
    })
  })

  describe('DEFAULT_CHAT_MODE', () => {
    it('should be "normal"', () => {
      expect(DEFAULT_CHAT_MODE).toBe('normal')
    })
  })

  describe('normalizeChatMode', () => {
    it('should return "normal" for "normal"', () => {
      expect(normalizeChatMode('normal')).toBe('normal')
    })

    it('should return "plan" for "plan"', () => {
      expect(normalizeChatMode('plan')).toBe('plan')
    })

    it('should return "auto-edit" for "auto-edit"', () => {
      expect(normalizeChatMode('auto-edit')).toBe('auto-edit')
    })

    it('should return "full-auto" for "full-auto"', () => {
      expect(normalizeChatMode('full-auto')).toBe('full-auto')
    })

    it('should return "normal" for invalid string', () => {
      expect(normalizeChatMode('invalid')).toBe('normal')
    })

    it('should return "normal" for undefined', () => {
      expect(normalizeChatMode(undefined as unknown as ChatMode)).toBe('normal')
    })

    it('should return "normal" for null', () => {
      expect(normalizeChatMode(null as unknown as ChatMode)).toBe('normal')
    })
  })

  describe('getChatModeCard', () => {
    it('should return the correct card for "normal"', () => {
      const card = getChatModeCard('normal')
      expect(card.mode).toBe('normal')
    })

    it('should return the correct card for "plan"', () => {
      const card = getChatModeCard('plan')
      expect(card.mode).toBe('plan')
    })

    it('should return the correct card for "full-auto"', () => {
      const card = getChatModeCard('full-auto')
      expect(card.mode).toBe('full-auto')
    })

    it('should return the first card (normal) for unknown mode', () => {
      const card = getChatModeCard('unknown' as ChatMode)
      expect(card.mode).toBe('normal')
    })
  })

  describe('buildModePrompt', () => {
    it('should return base + suffix when both are non-empty', () => {
      const result = buildModePrompt('You are helpful.', 'plan')
      expect(result).toContain('You are helpful.')
      expect(result).toContain('计划模式')
    })

    it('should return only suffix when base is empty (plan mode has suffix)', () => {
      const result = buildModePrompt('', 'plan')
      const card = getChatModeCard('plan')
      expect(result).toBe(card.promptSuffix.trim())
    })

    it('should return only base when mode has no suffix (normal mode)', () => {
      const result = buildModePrompt('Base instructions', 'normal')
      expect(result).toBe('Base instructions')
    })

    it('should return undefined when both base and suffix are empty', () => {
      const result = buildModePrompt('', 'normal')
      expect(result).toBeUndefined()
    })

    it('should return undefined when base is undefined and mode has no suffix', () => {
      const result = buildModePrompt(undefined, 'normal')
      expect(result).toBeUndefined()
    })
  })
})
