export type WebSearchProviderId =
  | "duckduckgo"
  | "tavily"
  | "serpapi"
  | "brave"
  | "searxng"
  | "zhipu";

export interface WebSearchProviderMeta {
  id: WebSearchProviderId;
  label: string;
  description: string;
  requiresApiKey: boolean;
  apiKeyLabel?: string;
  apiKeyPlaceholder?: string;
  defaultApiUrl: string;
  apiUrlLabel: string;
  apiUrlPlaceholder: string;
  urlInput?: { label: string; placeholder: string; default: string };
}

export interface WebSearchConfig {
  provider: WebSearchProviderId;
  duckduckgoApiUrl?: string;
  tavilyApiKey?: string;
  tavilyApiUrl?: string;
  serpapiApiKey?: string;
  serpapiApiUrl?: string;
  braveApiKey?: string;
  braveApiUrl?: string;
  zhipuApiKey?: string;
  zhipuApiUrl?: string;
  searxngUrl?: string;
}

export const WEB_SEARCH_PROVIDERS: WebSearchProviderMeta[] = [
  {
    id: "duckduckgo",
    label: "DuckDuckGo",
    description: "免费、无需 Key，适合快速查询。",
    requiresApiKey: false,
    defaultApiUrl: "https://api.duckduckgo.com",
    apiUrlLabel: "API 地址",
    apiUrlPlaceholder: "https://api.duckduckgo.com",
  },
  {
    id: "tavily",
    label: "Tavily",
    description: "专为 LLM 设计，支持搜索 + 内容抓取一体化。",
    requiresApiKey: true,
    apiKeyLabel: "Tavily API Key",
    apiKeyPlaceholder: "tvly-...",
    defaultApiUrl: "https://api.tavily.com",
    apiUrlLabel: "API 地址",
    apiUrlPlaceholder: "https://api.tavily.com",
  },
  {
    id: "serpapi",
    label: "SerpAPI",
    description: "Google 结果聚合，需 API Key。",
    requiresApiKey: true,
    apiKeyLabel: "SerpAPI API Key",
    apiKeyPlaceholder: "SerpAPI Key",
    defaultApiUrl: "https://serpapi.com",
    apiUrlLabel: "API 地址",
    apiUrlPlaceholder: "https://serpapi.com",
  },
  {
    id: "brave",
    label: "Brave Search",
    description: "Brave Search API，免费额度 2000 次/月。",
    requiresApiKey: true,
    apiKeyLabel: "Brave Search API Key",
    apiKeyPlaceholder: "Brave API Key",
    defaultApiUrl: "https://api.search.brave.com",
    apiUrlLabel: "API 地址",
    apiUrlPlaceholder: "https://api.search.brave.com",
  },
  {
    id: "searxng",
    label: "SearXNG",
    description: "可自托管的元搜索引擎，提供实例 URL 即可。",
    requiresApiKey: false,
    defaultApiUrl: "https://searx.be",
    apiUrlLabel: "实例 URL",
    apiUrlPlaceholder: "https://searx.be",
    urlInput: {
      label: "SearXNG 实例 URL",
      placeholder: "https://searx.be",
      default: "https://searx.be",
    },
  },
  {
    id: "zhipu",
    label: "智谱 AI",
    description: "智谱 Web Search API（glm-4-web 联网搜索），需 API Key。",
    requiresApiKey: true,
    apiKeyLabel: "智谱 API Key",
    apiKeyPlaceholder: "Zhipu API Key",
    defaultApiUrl: "https://open.bigmodel.cn",
    apiUrlLabel: "API 地址",
    apiUrlPlaceholder: "https://open.bigmodel.cn",
  },
];

export const DEFAULT_WEB_SEARCH_CONFIG: WebSearchConfig = {
  provider: "duckduckgo",
  duckduckgoApiUrl: "https://api.duckduckgo.com",
  tavilyApiKey: "",
  tavilyApiUrl: "https://api.tavily.com",
  serpapiApiKey: "",
  serpapiApiUrl: "https://serpapi.com",
  braveApiKey: "",
  braveApiUrl: "https://api.search.brave.com",
  zhipuApiKey: "",
  zhipuApiUrl: "https://open.bigmodel.cn",
  searxngUrl: "https://searx.be",
};

const PROVIDER_IDS = new Set<WebSearchProviderId>(
  WEB_SEARCH_PROVIDERS.map((p) => p.id)
);

export function getWebSearchProviderMeta(
  id: WebSearchProviderId
): WebSearchProviderMeta {
  return (
    WEB_SEARCH_PROVIDERS.find((p) => p.id === id) || WEB_SEARCH_PROVIDERS[0]
  );
}

export function normalizeWebSearchConfig(value: unknown): WebSearchConfig {
  if (!value || typeof value !== "object") {
    return { ...DEFAULT_WEB_SEARCH_CONFIG };
  }
  const raw = value as Partial<WebSearchConfig>;
  const provider: WebSearchProviderId =
    typeof raw.provider === "string" && PROVIDER_IDS.has(raw.provider as WebSearchProviderId)
      ? (raw.provider as WebSearchProviderId)
      : DEFAULT_WEB_SEARCH_CONFIG.provider;
  const duckduckgoApiUrl =
    typeof raw.duckduckgoApiUrl === "string" && raw.duckduckgoApiUrl.trim()
      ? raw.duckduckgoApiUrl.trim()
      : DEFAULT_WEB_SEARCH_CONFIG.duckduckgoApiUrl;
  const tavilyApiKey =
    typeof raw.tavilyApiKey === "string" ? raw.tavilyApiKey : "";
  const tavilyApiUrl =
    typeof raw.tavilyApiUrl === "string" && raw.tavilyApiUrl.trim()
      ? raw.tavilyApiUrl.trim()
      : DEFAULT_WEB_SEARCH_CONFIG.tavilyApiUrl;
  const serpapiApiKey =
    typeof raw.serpapiApiKey === "string" ? raw.serpapiApiKey : "";
  const serpapiApiUrl =
    typeof raw.serpapiApiUrl === "string" && raw.serpapiApiUrl.trim()
      ? raw.serpapiApiUrl.trim()
      : DEFAULT_WEB_SEARCH_CONFIG.serpapiApiUrl;
  const braveApiKey =
    typeof raw.braveApiKey === "string" ? raw.braveApiKey : "";
  const braveApiUrl =
    typeof raw.braveApiUrl === "string" && raw.braveApiUrl.trim()
      ? raw.braveApiUrl.trim()
      : DEFAULT_WEB_SEARCH_CONFIG.braveApiUrl;
  const zhipuApiKey =
    typeof raw.zhipuApiKey === "string" ? raw.zhipuApiKey : "";
  const zhipuApiUrl =
    typeof raw.zhipuApiUrl === "string" && raw.zhipuApiUrl.trim()
      ? raw.zhipuApiUrl.trim()
      : DEFAULT_WEB_SEARCH_CONFIG.zhipuApiUrl;
  const searxngUrl =
    typeof raw.searxngUrl === "string" && raw.searxngUrl.trim()
      ? raw.searxngUrl.trim()
      : DEFAULT_WEB_SEARCH_CONFIG.searxngUrl;
  return {
    provider,
    duckduckgoApiUrl,
    tavilyApiKey,
    tavilyApiUrl,
    serpapiApiKey,
    serpapiApiUrl,
    braveApiKey,
    braveApiUrl,
    zhipuApiKey,
    zhipuApiUrl,
    searxngUrl,
  };
}
