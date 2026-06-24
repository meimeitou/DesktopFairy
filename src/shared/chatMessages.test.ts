import { describe, it, expect } from 'vitest'
import {
  filterAfterContextClear,
  filterForApi,
  trimMessagesForApi,
  findLastAssistantReplyIndex,
  isSupportedFileName,
  type ChatMsg,
} from './chatMessages'

function makeMsg(
  role: 'user' | 'assistant',
  content: string,
  overrides: Partial<ChatMsg> = {},
): ChatMsg {
  return {
    id: `msg_${Math.random().toString(36).slice(2)}`,
    role,
    content,
    ...overrides,
  }
}

describe('chatMessages', () => {
  describe('filterAfterContextClear', () => {
    it('should return all messages when no clear marker', () => {
      const msgs = [makeMsg('user', 'hello'), makeMsg('assistant', 'hi')]
      expect(filterAfterContextClear(msgs)).toHaveLength(2)
    })

    it('should return messages after the last clear marker', () => {
      const msgs = [
        makeMsg('user', 'old'),
        makeMsg('user', '', { type: 'clear' }),
        makeMsg('user', 'new'),
      ]
      const result = filterAfterContextClear(msgs)
      expect(result).toHaveLength(1)
      expect(result[0].content).toBe('new')
    })

    it('should return messages after the last clear marker when multiple clears', () => {
      const msgs = [
        makeMsg('user', 'old1'),
        makeMsg('user', '', { type: 'clear' }),
        makeMsg('user', 'mid'),
        makeMsg('user', '', { type: 'clear' }),
        makeMsg('user', 'new'),
      ]
      const result = filterAfterContextClear(msgs)
      expect(result).toHaveLength(1)
      expect(result[0].content).toBe('new')
    })

    it('should return empty array when clear is the last message', () => {
      const msgs = [makeMsg('user', 'hello'), makeMsg('user', '', { type: 'clear' })]
      expect(filterAfterContextClear(msgs)).toHaveLength(0)
    })
  })

  describe('filterForApi', () => {
    it('should filter out tool type messages', () => {
      const msgs = [
        makeMsg('user', 'hello'),
        makeMsg('assistant', '', { type: 'tool', toolName: 'Bash' }),
        makeMsg('assistant', 'hi'),
      ]
      const result = filterForApi(msgs)
      expect(result).toHaveLength(2)
    })

    it('should filter out error messages', () => {
      const msgs = [makeMsg('user', 'hello'), makeMsg('assistant', 'error', { error: true })]
      const result = filterForApi(msgs)
      expect(result).toHaveLength(1)
    })

    it('should filter out empty assistant messages', () => {
      const msgs = [makeMsg('user', 'hello'), makeMsg('assistant', '')]
      const result = filterForApi(msgs)
      expect(result).toHaveLength(1)
    })

    it('should keep empty user messages', () => {
      const msgs = [makeMsg('user', ''), makeMsg('assistant', 'response')]
      const result = filterForApi(msgs)
      expect(result).toHaveLength(2)
    })
  })

  describe('trimMessagesForApi', () => {
    it('should return all messages when under limits', () => {
      const msgs = [makeMsg('user', 'hello'), makeMsg('assistant', 'hi')]
      expect(trimMessagesForApi(msgs)).toHaveLength(2)
    })

    it('should trim to maxMessages', () => {
      const msgs: ChatMsg[] = []
      for (let i = 0; i < 50; i++) {
        msgs.push(makeMsg('user', `msg ${i}`))
      }
      const result = trimMessagesForApi(msgs, { maxMessages: 10 })
      expect(result).toHaveLength(10)
      // Should keep the last 10
      expect(result[0].content).toBe('msg 40')
      expect(result[9].content).toBe('msg 49')
    })

    it('should trim to maxChars', () => {
      const msgs: ChatMsg[] = []
      for (let i = 0; i < 10; i++) {
        msgs.push(makeMsg('user', 'x'.repeat(1000)))
      }
      const result = trimMessagesForApi(msgs, { maxChars: 3000 })
      // Each message is 1000 chars, so max 3 messages (first one doesn't count toward budget)
      expect(result.length).toBeLessThanOrEqual(4)
    })

    it('should always keep at least one message', () => {
      const msgs = [makeMsg('user', 'x'.repeat(100000))]
      const result = trimMessagesForApi(msgs, { maxChars: 100 })
      expect(result).toHaveLength(1)
    })

    it('should handle empty array', () => {
      expect(trimMessagesForApi([])).toHaveLength(0)
    })

    it('first message (from end) should not count toward char budget', () => {
      const msgs = [
        makeMsg('user', 'x'.repeat(5000)),
        makeMsg('assistant', 'short'),
      ]
      const result = trimMessagesForApi(msgs, { maxChars: 100 })
      // The last message (assistant, 5 chars) is always kept (doesn't count toward budget)
      // The first message (user, 5000 chars) exceeds remaining budget → trimmed
      expect(result).toHaveLength(1)
      expect(result[0].content).toBe('short')
    })
  })

  describe('findLastAssistantReplyIndex', () => {
    it('should find the last non-tool assistant message', () => {
      const msgs = [
        makeMsg('user', 'q'),
        makeMsg('assistant', '', { type: 'tool', toolName: 'Bash' }),
        makeMsg('assistant', 'real reply'),
      ]
      const idx = findLastAssistantReplyIndex(msgs)
      expect(idx).toBe(2)
    })

    it('should return -1 when no valid assistant reply', () => {
      const msgs = [makeMsg('user', 'q'), makeMsg('assistant', '', { type: 'tool' })]
      expect(findLastAssistantReplyIndex(msgs)).toBe(-1)
    })

    it('should skip error messages', () => {
      const msgs = [makeMsg('assistant', 'ok'), makeMsg('assistant', 'err', { error: true })]
      expect(findLastAssistantReplyIndex(msgs)).toBe(0)
    })

    it('should return -1 for empty array', () => {
      expect(findLastAssistantReplyIndex([])).toBe(-1)
    })
  })

  describe('isSupportedFileName', () => {
    it('should accept .txt files', () => {
      expect(isSupportedFileName('readme.txt')).toBe(true)
    })

    it('should accept .md files', () => {
      expect(isSupportedFileName('doc.md')).toBe(true)
    })

    it('should accept .json files', () => {
      expect(isSupportedFileName('config.json')).toBe(true)
    })

    it('should accept .py files', () => {
      expect(isSupportedFileName('script.py')).toBe(true)
    })

    it('should accept .ts files', () => {
      expect(isSupportedFileName('app.ts')).toBe(true)
    })

    it('should reject .exe files', () => {
      expect(isSupportedFileName('app.exe')).toBe(false)
    })

    it('should reject files without extension', () => {
      expect(isSupportedFileName('Makefile')).toBe(false)
    })

    it('should be case insensitive', () => {
      expect(isSupportedFileName('README.MD')).toBe(true)
      expect(isSupportedFileName('CONFIG.JSON')).toBe(true)
    })
  })
})
