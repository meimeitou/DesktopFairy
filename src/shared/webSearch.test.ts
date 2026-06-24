import { describe, it, expect } from 'vitest'
import {
  WEB_SEARCH_PROVIDERS,
  DEFAULT_WEB_SEARCH_CONFIG,
  getWebSearchProviderMeta,
  normalizeWebSearchConfig,
  type WebSearchProviderId,
} from './webSearch'

describe('webSearch', () => {
  describe('WEB_SEARCH_PROVIDERS', () => {
    it('should have 6 providers', () => {
      expect(WEB_SEARCH_PROVIDERS).toHaveLength(6)
    })

    it('should include all expected provider ids', () => {
      const ids = WEB_SEARCH_PROVIDERS.map((p) => p.id)
      expect(ids).toEqual([
        'duckduckgo',
        'tavily',
        'serpapi',
        'brave',
        'searxng',
        'zhipu',
      ])
    })

    it('duckduckgo should not require API key', () => {
      const ddg = WEB_SEARCH_PROVIDERS.find((p) => p.id === 'duckduckgo')
      expect(ddg?.requiresApiKey).toBe(false)
    })

    it('tavily should require API key', () => {
      const tavily = WEB_SEARCH_PROVIDERS.find((p) => p.id === 'tavily')
      expect(tavily?.requiresApiKey).toBe(true)
    })

    it('every provider should have a defaultApiUrl', () => {
      for (const p of WEB_SEARCH_PROVIDERS) {
        expect(p.defaultApiUrl).toBeTruthy()
      }
    })
  })

  describe('DEFAULT_WEB_SEARCH_CONFIG', () => {
    it('should default to duckduckgo', () => {
      expect(DEFAULT_WEB_SEARCH_CONFIG.provider).toBe('duckduckgo')
    })

    it('should have all API keys as empty strings', () => {
      expect(DEFAULT_WEB_SEARCH_CONFIG.tavilyApiKey).toBe('')
      expect(DEFAULT_WEB_SEARCH_CONFIG.serpapiApiKey).toBe('')
      expect(DEFAULT_WEB_SEARCH_CONFIG.braveApiKey).toBe('')
      expect(DEFAULT_WEB_SEARCH_CONFIG.zhipuApiKey).toBe('')
    })
  })

  describe('getWebSearchProviderMeta', () => {
    it('should return correct meta for duckduckgo', () => {
      const meta = getWebSearchProviderMeta('duckduckgo')
      expect(meta.id).toBe('duckduckgo')
      expect(meta.label).toBeTruthy()
    })

    it('should return correct meta for zhipu', () => {
      const meta = getWebSearchProviderMeta('zhipu')
      expect(meta.id).toBe('zhipu')
    })

    it('should return first provider for unknown id', () => {
      const meta = getWebSearchProviderMeta('unknown' as WebSearchProviderId)
      expect(meta.id).toBe('duckduckgo')
    })
  })

  describe('normalizeWebSearchConfig', () => {
    it('should return default config for null input', () => {
      const result = normalizeWebSearchConfig(null)
      expect(result.provider).toBe('duckduckgo')
    })

    it('should return default config for non-object input', () => {
      const result = normalizeWebSearchConfig('invalid')
      expect(result.provider).toBe('duckduckgo')
    })

    it('should preserve valid provider', () => {
      const result = normalizeWebSearchConfig({ provider: 'tavily' })
      expect(result.provider).toBe('tavily')
    })

    it('should fallback to duckduckgo for invalid provider', () => {
      const result = normalizeWebSearchConfig({ provider: 'invalid' })
      expect(result.provider).toBe('duckduckgo')
    })

    it('should preserve API keys as-is (no trimming)', () => {
      const result = normalizeWebSearchConfig({
        provider: 'tavily',
        tavilyApiKey: '  key123  ',
      })
      // API keys are NOT trimmed (only URLs are trimmed)
      expect(result.tavilyApiKey).toBe('  key123  ')
    })

    it('should fallback to default URL when URL is empty', () => {
      const result = normalizeWebSearchConfig({
        provider: 'tavily',
        tavilyApiUrl: '',
      })
      const tavilyMeta = getWebSearchProviderMeta('tavily')
      expect(result.tavilyApiUrl).toBe(tavilyMeta.defaultApiUrl)
    })

    it('should preserve custom URL', () => {
      const result = normalizeWebSearchConfig({
        provider: 'tavily',
        tavilyApiUrl: 'https://custom.url/api',
      })
      expect(result.tavilyApiUrl).toBe('https://custom.url/api')
    })

    it('should return empty string for missing API keys', () => {
      const result = normalizeWebSearchConfig({ provider: 'brave' })
      expect(result.braveApiKey).toBe('')
    })

    it('should handle complete config with all fields', () => {
      const input = {
        provider: 'zhipu',
        zhipuApiKey: 'test-key',
        zhipuApiUrl: 'https://custom.zhipu.cn/api',
        tavilyApiKey: 'other-key',
      }
      const result = normalizeWebSearchConfig(input)
      expect(result.provider).toBe('zhipu')
      expect(result.zhipuApiKey).toBe('test-key')
      expect(result.zhipuApiUrl).toBe('https://custom.zhipu.cn/api')
      expect(result.tavilyApiKey).toBe('other-key')
    })
  })
})
