import { describe, it, expect } from 'vitest'
import {
  filterAfterContextClear,
  trimMessagesForApi,
  findLastAssistantReplyIndex,
  isEmptyAssistantPlaceholder,
  isSupportedFileName,
  applyStreamTextPart,
  pruneEmptyAssistantMessages,
  upsertAgentToolMessage,
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


  describe('trimMessagesForApi', () => {
    it('should return all messages when under token budget', () => {
      const msgs = [makeMsg('user', 'hello'), makeMsg('assistant', 'hi')]
      expect(trimMessagesForApi(msgs, { maxTokens: 10_000 })).toHaveLength(2)
    })

    it('should trim oldest when over token budget', () => {
      const msgs: ChatMsg[] = []
      for (let i = 0; i < 30; i++) {
        msgs.push(makeMsg('user', `msg ${i} `.repeat(40)))
      }
      const result = trimMessagesForApi(msgs, { maxTokens: 800 })
      expect(result.length).toBeLessThan(msgs.length)
      expect(result[result.length - 1].content).toContain('29')
    })

    it('should always keep at least one message', () => {
      const msgs = [makeMsg('user', 'x'.repeat(100000))]
      const result = trimMessagesForApi(msgs, { maxTokens: 50 })
      expect(result).toHaveLength(1)
    })

    it('should handle empty array', () => {
      expect(trimMessagesForApi([], { maxTokens: 1000 })).toHaveLength(0)
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

  describe('upsertAgentToolMessage', () => {
    it('reuses empty assistant placeholder for consecutive new tools', () => {
      const empty = makeMsg('assistant', '')
      const msgs = [makeMsg('user', 'q'), empty]
      const after1 = upsertAgentToolMessage(msgs, {
        toolCallId: 'c1',
        toolName: 'Read',
        toolStatus: 'running',
      })
      const after2 = upsertAgentToolMessage(after1, {
        toolCallId: 'c2',
        toolName: 'Bash',
        toolStatus: 'running',
      })
      expect(after2.filter((m) => m.type === 'tool')).toHaveLength(2)
      expect(after2.filter((m) => isEmptyAssistantPlaceholder(m))).toHaveLength(1)
      expect(after2[after2.length - 1]).toBe(empty)
      expect(after2.map((m) => m.type ?? m.role)).toEqual([
        'user',
        'tool',
        'tool',
        'assistant',
      ])
    })

    it('inserts tool after contentful assistant and adds at most one empty placeholder', () => {
      const msgs = [makeMsg('user', 'q'), makeMsg('assistant', 'checking…')]
      const after = upsertAgentToolMessage(msgs, {
        toolCallId: 'c1',
        toolName: 'Read',
        toolStatus: 'streaming',
      })
      expect(after.map((m) => (m.type === 'tool' ? 'tool' : m.content || '(empty)'))).toEqual([
        'q',
        'checking…',
        'tool',
        '(empty)',
      ])
      const after2 = upsertAgentToolMessage(after, {
        toolCallId: 'c2',
        toolName: 'Bash',
        toolStatus: 'running',
      })
      expect(after2.filter((m) => m.type !== 'tool' && m.role === 'assistant' && !m.content)).toHaveLength(1)
      expect(after2.filter((m) => m.type === 'tool')).toHaveLength(2)
    })

    it('updates existing tool by toolCallId without adding rows', () => {
      const msgs = [
        makeMsg('user', 'q'),
        makeMsg('assistant', '', {
          type: 'tool',
          toolCallId: 'c1',
          toolName: 'Read',
          toolStatus: 'streaming',
        }),
        makeMsg('assistant', ''),
      ]
      const after = upsertAgentToolMessage(msgs, {
        toolCallId: 'c1',
        toolName: 'Read',
        toolStatus: 'done',
        toolResultPreview: 'ok',
      })
      expect(after).toHaveLength(3)
      expect(after[1].toolStatus).toBe('done')
      expect(after[1].toolResultPreview).toBe('ok')
    })
  })

  describe('pruneEmptyAssistantMessages', () => {
    it('removes empty assistants and keeps content, reasoning, tool, and error', () => {
      const msgs = [
        makeMsg('user', 'q'),
        makeMsg('assistant', ''),
        makeMsg('assistant', '', { type: 'tool', toolName: 'Read', toolCallId: 'c1' }),
        makeMsg('assistant', 'answer'),
        makeMsg('assistant', '', { reasoning: 'think' }),
        makeMsg('assistant', 'boom', { error: true }),
        makeMsg('assistant', ''),
      ]
      const pruned = pruneEmptyAssistantMessages(msgs)
      expect(pruned).toHaveLength(5)
      expect(pruned.map((m) => m.content || m.reasoning || m.type || 'err')).toEqual([
        'q',
        'tool',
        'answer',
        'think',
        'boom',
      ])
    })
  })

  describe('applyStreamTextPart', () => {
    it('appends a new assistant on an empty list', () => {
      const next = applyStreamTextPart([], 'a', '你好')
      expect(next).toHaveLength(1)
      expect(next[0].role).toBe('assistant')
      expect(next[0].content).toBe('你好')
      expect(next[0].partId).toBe('a')
    })

    it('appends in place when the trailing plain assistant has the same partId', () => {
      const msgs = [makeMsg('assistant', '你好', { partId: 'a' })]
      const next = applyStreamTextPart(msgs, 'a', '世界')
      expect(next).toHaveLength(1)
      expect(next[0].id).toBe(msgs[0].id)
      expect(next[0].content).toBe('你好世界')
      expect(next[0].partId).toBe('a')
    })

    it('adopts a trailing empty placeholder and stamps partId', () => {
      const msgs = [makeMsg('assistant', '')]
      const next = applyStreamTextPart(msgs, 'b', 'x')
      expect(next).toHaveLength(1)
      expect(next[0].id).toBe(msgs[0].id)
      expect(next[0].content).toBe('x')
      expect(next[0].partId).toBe('b')
    })

    it('opens a new bubble when the trailing partId differs', () => {
      const msgs = [makeMsg('assistant', '你好', { partId: 'a' })]
      const next = applyStreamTextPart(msgs, 'b', 'x')
      expect(next).toHaveLength(2)
      expect(next[0].content).toBe('你好')
      expect(next[1].content).toBe('x')
      expect(next[1].partId).toBe('b')
    })

    it('opens a new bubble after a tool message', () => {
      const msgs = [
        makeMsg('assistant', '', {
          type: 'tool',
          toolCallId: 'c1',
          toolName: 'Read',
          toolStatus: 'done',
        }),
      ]
      const next = applyStreamTextPart(msgs, 'b', 'x')
      expect(next).toHaveLength(2)
      expect(next[0].type).toBe('tool')
      expect(next[1].content).toBe('x')
      expect(next[1].partId).toBe('b')
    })

    it('appends in place for legacy deltas with no partId', () => {
      const msgs = [makeMsg('assistant', '你好')]
      const next = applyStreamTextPart(msgs, undefined, 'x')
      expect(next).toHaveLength(1)
      expect(next[0].id).toBe(msgs[0].id)
      expect(next[0].content).toBe('你好x')
      expect(next[0].partId).toBeUndefined()
    })

    it('returns the same array when delta is empty', () => {
      const msgs = [makeMsg('assistant', '你好', { partId: 'a' })]
      expect(applyStreamTextPart(msgs, 'a', '')).toBe(msgs)
    })

    it('opens a new assistant after a user message', () => {
      const msgs = [makeMsg('user', 'q')]
      const next = applyStreamTextPart(msgs, 'a', 'x')
      expect(next).toHaveLength(2)
      expect(next[1].role).toBe('assistant')
      expect(next[1].content).toBe('x')
      expect(next[1].partId).toBe('a')
    })
  })
})
