const PROVIDER_IDS = ["duckduckgo", "tavily", "serpapi", "brave", "searxng", "zhipu"];

const DEFAULT_CONFIG = {
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

const META = {
  duckduckgo: {
    label: "DuckDuckGo",
    description: "免费、无需 Key，适合快速查询。",
    requiresApiKey: false,
    defaultApiUrl: "https://api.duckduckgo.com",
  },
  tavily: {
    label: "Tavily",
    description: "专为 LLM 设计，支持搜索 + 内容抓取一体化。",
    requiresApiKey: true,
    apiKeyLabel: "Tavily API Key",
    defaultApiUrl: "https://api.tavily.com",
  },
  serpapi: {
    label: "SerpAPI",
    description: "Google 结果聚合，需 API Key。",
    requiresApiKey: true,
    apiKeyLabel: "SerpAPI API Key",
    defaultApiUrl: "https://serpapi.com",
  },
  brave: {
    label: "Brave Search",
    description: "Brave Search API，免费额度 2000 次/月。",
    requiresApiKey: true,
    apiKeyLabel: "Brave Search API Key",
    defaultApiUrl: "https://api.search.brave.com",
  },
  searxng: {
    label: "SearXNG",
    description: "可自托管的元搜索引擎，提供实例 URL 即可。",
    requiresApiKey: false,
    defaultApiUrl: "https://searx.be",
  },
  zhipu: {
    label: "智谱 AI",
    description: "智谱 Web Search API（glm-4-web 联网搜索），需 API Key。",
    requiresApiKey: true,
    apiKeyLabel: "智谱 API Key",
    defaultApiUrl: "https://open.bigmodel.cn",
  },
};

function isValidProvider(id) {
  return PROVIDER_IDS.indexOf(id) !== -1;
}

function normalizeWebSearchConfig(raw) {
  if (!raw || typeof raw !== "object") {
    return { ...DEFAULT_CONFIG };
  }
  const provider =
    typeof raw.provider === "string" && isValidProvider(raw.provider)
      ? raw.provider
      : DEFAULT_CONFIG.provider;
  const duckduckgoApiUrl =
    typeof raw.duckduckgoApiUrl === "string" && raw.duckduckgoApiUrl.trim()
      ? raw.duckduckgoApiUrl.trim()
      : DEFAULT_CONFIG.duckduckgoApiUrl;
  const tavilyApiKey =
    typeof raw.tavilyApiKey === "string" ? raw.tavilyApiKey : "";
  const tavilyApiUrl =
    typeof raw.tavilyApiUrl === "string" && raw.tavilyApiUrl.trim()
      ? raw.tavilyApiUrl.trim()
      : DEFAULT_CONFIG.tavilyApiUrl;
  const serpapiApiKey =
    typeof raw.serpapiApiKey === "string" ? raw.serpapiApiKey : "";
  const serpapiApiUrl =
    typeof raw.serpapiApiUrl === "string" && raw.serpapiApiUrl.trim()
      ? raw.serpapiApiUrl.trim()
      : DEFAULT_CONFIG.serpapiApiUrl;
  const braveApiKey =
    typeof raw.braveApiKey === "string" ? raw.braveApiKey : "";
  const braveApiUrl =
    typeof raw.braveApiUrl === "string" && raw.braveApiUrl.trim()
      ? raw.braveApiUrl.trim()
      : DEFAULT_CONFIG.braveApiUrl;
  const zhipuApiKey =
    typeof raw.zhipuApiKey === "string" ? raw.zhipuApiKey : "";
  const zhipuApiUrl =
    typeof raw.zhipuApiUrl === "string" && raw.zhipuApiUrl.trim()
      ? raw.zhipuApiUrl.trim()
      : DEFAULT_CONFIG.zhipuApiUrl;
  const searxngUrl =
    typeof raw.searxngUrl === "string" && raw.searxngUrl.trim()
      ? raw.searxngUrl.trim()
      : DEFAULT_CONFIG.searxngUrl;
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

module.exports = {
  PROVIDER_IDS,
  DEFAULT_CONFIG,
  META,
  isValidProvider,
  normalizeWebSearchConfig,
};
