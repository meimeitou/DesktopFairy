# 网络搜索工具可配置支持实现计划

## 需求分析
参考 cherry-studio 项目，为 DesktopFairy 的 `WebSearch` 工具增加可切换的搜索提供商支持。

支持的提供商：
- **DuckDuckGo**（默认，无需 Key）
- **Tavily**（LLM 专用，需 API Key）
- **SerpAPI**（Google 聚合，需 API Key）
- **Brave Search API**（需 API Key，免费 2000 次/月）
- **SearXNG**（可自托管，提供实例 URL 即可，无需 Key）

## 架构设计

### 1. 数据层（前端）
**新增文件：`src/shared/webSearch.ts`**
- 定义 `WebSearchProviderId` 联合类型：`"duckduckgo" | "tavily" | "serpapi" | "brave" | "searxng"`
- 定义 `WebSearchConfig` 接口：
  ```ts
  {
    provider: WebSearchProviderId;
    tavilyApiKey?: string;
    serpapiApiKey?: string;
    braveApiKey?: string;
    searxngUrl?: string; // 默认 https://searx.be
  }
  ```
- 定义 provider 元数据（名称、图标、是否需要 Key、Key 字段名等）
- 导出默认值、normalize 函数

**修改 `src/shared/settings.ts`**
- 在 `AppSettings` 中新增 `webSearch: WebSearchConfig`
- 添加默认值 `DEFAULT_WEB_SEARCH_CONFIG`
- 添加 normalize / 迁移逻辑

### 2. 主进程执行层
**新增文件：`electron/webSearchProviders.cjs`**
- 导出 `PROVIDER_IDS`、`DEFAULT_WEB_SEARCH_CONFIG`、`PROVIDER_META`
- 导出 `normalizeWebSearchConfig(raw)` 做运行时校验

**修改 `electron/agentBuiltinExecutors.cjs`**
- 读取设置中的 `webSearch` 配置（通过 `settings:get` IPC 或 `agentConfig` 扩展字段传递）
- 改写 `toolWebSearch(args)`：根据 `provider` 分支调用不同的实现
  - `duckduckgo`：保留现有实现（Instant Answer + HTML fallback）
  - `tavily`：POST `https://api.tavily.com/search`，Bearer Token
  - `serpapi`：GET `https://serpapi.com/search`，`engine=google` + `api_key`
  - `brave`：GET `https://api.search.brave.com/res/v1/web/search`，`X-Subscription-Token`
  - `searxng`：GET `{searxngUrl}/search?format=json&categories=general`

统一输出格式：`{ ok: true, query, results: [{ title, url, content }] }`

### 3. 设置页面 UI
**新增文件：`src/components/settings/WebSearchSettings.tsx`**
- 提供商下拉选择
- 根据所选提供商动态显示对应配置项：
  - Tavily/SerpAPI/Brave：显示 API Key 输入框
  - SearXNG：显示实例 URL 输入框
  - DuckDuckGo：无额外配置，显示说明文字
- 使用与现有 settings 一致的 CSS 样式（`.field`, `.field-row`, `.field-hint`）

**修改 `src/pages/SettingsPage.tsx`**
- 在"智能体"Tab 下或新增"网络搜索"分区引入该组件
- 状态变更时调用 `saveSettings` 同步

### 4. IPC 与配置传递
**修改 `electron/agentService.cjs`**
- `executeAgentTool` 调用链中，确保 `WebSearch` 执行时可读到当前 `webSearch` 配置
- 方案：在调用 `toolWebSearch` 前从 settings 读取并注入到执行函数闭包；或通过 `agentConfig.webSearch` 字段从前端传入

**修改 `electron/preload.cjs` & 对应 service**
- 若需要新增 IPC：`settings:get`（若已有则复用）

## 涉及文件清单

| 文件 | 操作 | 说明 |
|------|------|------|
| `src/shared/webSearch.ts` | 新增 | 类型、默认值、元数据、normalize |
| `src/shared/settings.ts` | 修改 | AppSettings 增加 webSearch 字段 |
| `electron/webSearchProviders.cjs` | 新增 | 主进程 provider 配置与校验 |
| `electron/agentBuiltinExecutors.cjs` | 修改 | 重构 toolWebSearch，支持多 provider |
| `electron/agentService.cjs` | 修改 | 执行 WebSearch 时注入配置 |
| `src/components/settings/WebSearchSettings.tsx` | 新增 | 设置页面 UI |
| `src/components/settings/WebSearchSettings.css` | 新增 | 设置页面样式（如需要） |
| `src/pages/SettingsPage.tsx` | 修改 | 引入 WebSearchSettings |

## 风险与考虑

1. **网络请求成本**：Tavily/SerpAPI/Brave 都需要 Key，由用户自担成本。UI 需明确提示。
2. **SearXNG 公共实例稳定性**：公共实例可能限流。UI 中默认值用 `https://searx.be` 并提示用户自建。
3. **向后兼容**：历史 settings 无 `webSearch` 字段时，默认回落到 DuckDuckGo。
4. **主进程/渲染进程配置同步**：保持现有 settings:sync 通道同步。
5. **错误处理**：所有 provider 失败都返回 `{ ok: false, error }`，便于 LLM 决定重试或切换。

## 执行步骤

1. 新增 `src/shared/webSearch.ts`
2. 修改 `src/shared/settings.ts` 接入字段 + 默认值 + 校验
3. 新增 `electron/webSearchProviders.cjs` 主进程配置/校验
4. 重构 `electron/agentBuiltinExecutors.cjs` 的 `toolWebSearch`
5. 修改 `electron/agentService.cjs` 把 webSearch 配置注入工具执行
6. 新增 `src/components/settings/WebSearchSettings.tsx` 与样式
7. 在 `SettingsPage.tsx` 中挂载 UI
8. 跑 `make lint` 做最终检查
