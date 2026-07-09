# AGENTS.md

macOS desktop Live2D companion app. Electron + React 19 + TypeScript + Live2D Cubism SDK.

## Commands

```bash
make dev          # preferred over npm run dev (sets DEVTOOLS=1 DEVTOOLS_MODE=detach)
make dev DEVTOOLS=0  # without DevTools
make lint         # eslint only (no typecheck command; tsc -b runs as part of build)
npm run build     # tsc -b && vite build && electron-builder
npm run build:dir # faster build, no DMG installer
make build-adhoc  # unsigned ad-hoc DMG (no Apple Developer account needed)
```

No tests in CI, but `npm test` runs vitest (renderer/shared unit tests). `lint` is the primary pre-commit check; `tsc -b` runs as part of `npm run build`.

## Architecture Gotchas

- **Multi-window via query param**: Single `index.html`, `?window=` selects the page. Not React Router. `?window=chat` and `?window=settings` both route to `ChatApp` (settings is a tab inside it). `?window=tip&text=...` for selection popup.
- **ChatApp tab keep-alive**: `ChatPage` and `SettingsPage` are both mounted simultaneously with CSS visibility toggle — not conditional rendering. Don't convert to conditional render or chat state will be lost on tab switch.
- **Electron main process is CJS**: All `electron/*.cjs` files use `require()`. Renderer (`src/`) is ESM. Do not mix.
- **Main process hot-reload (dev only)**: In dev, `electron/*.cjs` changes auto-trigger `app.relaunch()` + `app.exit(0)` via an `fs.watch` watcher in `main.cjs` (debounced 300ms). Vite HMR still only applies to renderer (`src/`). Disable with `ELECTRON_HOT_RELOAD=0 make dev`. Production builds are unaffected (`isDev` gate).
- **`src/live2d/framework/` is read-only**: Unmodified Cubism SDK. Import via `@framework` alias (configured in both `vite.config.ts` and `tsconfig.app.json`). Never edit framework files.
- **Zustand is in package.json but unused**: State is React `useState` + `localStorage` + IPC. Do not introduce Zustand stores without explicit request.

## IPC: Adding a New Channel

Must update **two** places or the channel will be silently rejected at runtime:

1. `allowedChannels` array in `electron/preload.cjs`
2. `ipcMain.handle()` in the relevant `electron/*Service.cjs` file

For push events (main → renderer), also add `ipcRenderer.on` listener helpers in `preload.cjs` and types in `src/electron.d.ts`.

**Agent stream channels** (registered in `aiStreamService.cjs`):

| Invoke | Push events |
|--------|-------------|
| `ai:stream_open` | `chat:stream:chunk/done/error`, `agent:stream:tool`, `ai:stream:chunk/done/error` |
| `ai:stream_attach` / `ai:stream_detach` | — |
| `ai:stream_abort` | — |
| `ai:tool:bypass_approval` | — |

Window geometry APIs (`windowGetSize`, `windowSetSize`, etc.) are dedicated methods on `electronAPI`, not in the whitelist — they go through their own `ipcRenderer.invoke` calls.

## macOS Window Pitfalls

- **Custom drag, not CSS**: Use `mousedown` + `mousemove` + `windowSetPosition` (see `MainView.tsx`). CSS `-webkit-app-region: drag` is unreliable on transparent windows and breaks cross-Space moves.
- **Close = hide**: Both windows intercept `close` with `e.preventDefault()` + `hide()`. Actual quit happens via `before-quit` removing the listener. Do not call `destroy()` on these windows.
- **Always-on-top must be re-asserted**: `floatWindowOnAllSpaces()` sets `screen-saver` level + `setVisibleOnAllWorkspaces(true)`. Re-call after `moved` and `focus` events or the window loses its floating status.
- **Dock icon hidden**: `app.dock.hide()`. `app.on('activate')` re-shows the main window (standard macOS accessory app pattern).

## Settings Propagation

Settings live in `localStorage` key `da_settings` in the renderer. Calling `settings:sync` IPC writes to `userData/da_settings.json` on disk and broadcasts `settings:updated` to all windows. **localStorage-only changes do not propagate** to other windows or the main process. Always call `settings:sync` after mutating settings.

Startup: disk file is read first (via `settings:load:sync`), falls back to localStorage.

## Agent Runtime (AI SDK)

智能体模式走 **AI SDK `ToolLoopAgent`** 多轮工具循环，不再使用手写 SSE turn loop。

```
ChatPage / TerminalAgentDrawer
  → openAgentStream (ai:stream_open)
  → AiStreamManager.startStream (后台执行)
  → AiService.streamText → ToolLoopAgent
  → chunkBridge → chat:stream:chunk / agent:stream:tool
  → chat:stream:done（含 tools snapshot）

Legacy: agent:run 仍保留（同步等待、无 topic 管理），新代码请用 ai:stream_open。
普通对话: chat:send 不变（无系统提示词、无工具）。
```

**关键模块**（`electron/ai/`）：

| 文件 | 作用 |
|------|------|
| `AiService.cjs` | `streamText()` 包装 `ToolLoopAgent` |
| `providerModel.cjs` | apiConfig → AI SDK model（官方 OpenAI 用 `.chat()`，第三方用 `createOpenAICompatible`） |
| `messages.cjs` | OpenAI 消息 → AI SDK `CoreMessage[]` |
| `buildToolSet.cjs` | OpenAI function defs → AI SDK `tool()`，桥接 `executeAgentTool` |
| `chunkBridge.cjs` | `UIMessageChunk` → 既有 `chat:stream:*` / `agent:stream:tool` IPC |
| `agentStreamShared.cjs` | 共享 `buildAgentToolDeps`（MCP abort、审批 bypass、suppressToolDoneEvent） |
| `topicBroadcast.cjs` | 向 topic 所有 attach 的 webContents 广播 legacy 流事件 |
| `streamManager/AiStreamManager.cjs` | topic 级流生命周期、attach/detach、grace、MCP callId 登记 |
| `aiStreamService.cjs` | `ai:stream_*` IPC 注册 |

**Renderer 传输层**：`src/services/aiTransport/IpcChatTransport.ts` — `openAgentStream`、`attachTopicStream`、`replayLegacyStreamEvents`、`abortTopicStream`。

**关窗重连**：`ai:stream_attach` 返回 `legacyEvents`，renderer 回放错过的 `chat:stream:*` 事件；进行中流通过 `broadcastToTopic` 推送到所有已 attach 窗口。

**同 topic 并发**：`ai:stream_open` 若 topic 已在 streaming 返回 `{ mode: 'blocked' }`；UI 应在发送前检查 `streaming` 状态。

**Stop / 删除 topic**：同时调用 `abortTopicStream(topicId, requestId)` 与 `agent:abort`（后者按 requestId 兜底）。MCP 工具通过 `registerMcpCall` + `abortSignal` → `abortTool(callId)` 终止子进程。

**工具事件双路**：审批类（`awaiting_approval` / `running` / `denied`）由 `executeAgentTool` 发 `agent:stream:tool`；完成/错误由 `chunkBridge` 从 AI SDK chunk 发出（`suppressToolDoneEvent` 避免重复 `done`）。

## Agent System Prompt

Agent config lives at `settings.agent` (`AgentConfig` in `src/shared/agent.ts`). The system prompt is built in the **main process** by `buildAgentSystemPrompt()` in `electron/agentService.cjs`, NOT in the renderer. The renderer passes `agentConfig` via `ai:stream_open` (or legacy `agent:run`); any system message in the renderer payload is stripped and replaced in main.

Prompt assembly order: `soul` → `user` (wrapped under `# 用户档案` header) → skills block → hardcoded tool guidance → chat-mode suffix.

- **`soul`** (SOUL.md): agent's purpose, personality, execution rules. Migrated from legacy `instructions` field by `normalizeAgentConfig`.
- **`user`** (USER.md): user's profile, preferences, habits. Injected only when non-empty.
- **Non-agent mode** (`chat:send`): no system prompt is injected at all. Messages forwarded verbatim.

## Chat Context

`trimMessagesForApi` caps at 40 messages / 24k chars. `filterForApi` strips `type: 'clear'` markers. These run before every API call.

## Live2D

- **Custom protocol**: Models loaded via `dfmodel://local/...` registered in `electron/live2dService.cjs`. Resources stream from user's chosen directory — never copied.
- **Expression fallback**: `notifyLive2DIfReactive` (in `src/shared/live2dReactions.ts`) intersects desired expressions against model's available set. No match → random motion. When `live2dReactive` is on, the 8-second random expression timer is disabled.

## TypeScript Config

`strict: false` in `tsconfig.app.json`. `noUnusedLocals` and `noUnusedParameters` are both `false`. Don't assume strict type checking is enforced — lint is the only active check.
