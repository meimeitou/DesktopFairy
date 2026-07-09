# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Dev Commands

```bash
npm run dev          # start dev (Vite + Electron concurrently)
npm run build        # production build (tsc + vite + electron-builder)
npm run build:dir    # build without installer (faster for testing)
npm run lint         # eslint
```

Dev mode uses `concurrently` to run Vite dev server and Electron. `wait-on` ensures Electron starts only after Vite is ready.

**Makefile shortcuts** (preferred for dev):
- `make dev` — runs `npm run dev` with `DEVTOOLS=1 DEVTOOLS_MODE=detach` by default
- `make build`, `make build-dir`, `make lint`, `make clean`
- `make build-adhoc` — unsigned ad-hoc DMG

No test framework or CI is configured. `npm test` runs vitest for unit tests in `src/`.

## Architecture

macOS desktop Live2D companion app. Stack: **Electron** (shell) + **React 19 + TypeScript** (UI) + **Live2D Cubism SDK** (character rendering).

**Multi-window routing**: A single `index.html` with a `?window=` query param selects the page component. Each window is a separate `BrowserWindow` created from the Electron main process.

| Param | Page | Window |
|-------|------|--------|
| (default) | `MainView` | Transparent Live2D overlay |
| `?window=chat` | `ChatApp` | Chat + Settings tab shell (760×680) |
| `?window=tip&text=…` | `TipView` | Selection toolbar popup |

**ChatApp** (`src/pages/ChatApp.tsx`) hosts `ChatPage` and `SettingsPage` as tabs, both mounted simultaneously with CSS visibility toggle (tab keep-alive — avoids losing chat state on tab switch). `?window=chat&view=settings` opens directly to settings tab.

**Live2D pipeline**: `Live2DCanvas` (React component) → `Live2DController` (owns WebGL context + render loop) → `Live2DModel` (extends `CubismUserModel`, handles asset loading + per-frame update/draw). The `src/live2d/framework/` directory is the unmodified Cubism SDK; `src/live2d/core/` has the WASM type definitions. Import path `@framework` aliases to `src/live2d/framework`.

**Live2D reactions** (`src/shared/live2dReactions.ts`): Chat lifecycle events (send, streaming, done, error) trigger `notifyLive2DIfReactive` → IPC `live2d:command` with `react:<reaction>`. Controller intersects candidate expressions against model's available expressions; no match falls back to random motion. When `live2dReactive` is on, the 8-second random expression timer is disabled.

**Shared state layer** (`src/shared/`): No Zustand/Redux — state lives in React `useState` + `localStorage`. Cross-window sync via IPC events. Key modules: `settings.ts` (AppSettings, load/save, provider/model resolution), `providers.ts` (LlmProvider type, SYSTEM_PROVIDERS including Hermes Agent), `chatMessages.ts` (API message building, context trimming to 40 msgs / 24k chars), `live2dPaths.ts` (bundled vs local model path resolution).

**Frontend → Main process IPC**: `window.electronAPI.invoke('command_name', args)` exposed via `contextBridge` in `electron/preload.cjs`. Main process handlers are in `electron/main.cjs` and various `electron/*Service.cjs` files, registered via `ipcMain.handle()`.

**Agent mode** (when `settings.chatBackend === 'agent'`): Renderer calls `ai:stream_open` via `src/services/aiTransport/IpcChatTransport.ts`. Main process runs `ToolLoopAgent` (`electron/ai/AiService.cjs`) with topic-scoped `AiStreamManager` (`electron/aiStreamService.cjs`). Legacy `agent:run` still exists but new code should use `ai:stream_open`. Plain chat uses `chat:send` with no system prompt or tools.

## Key Conventions

- **IPC security**: The preload script (`electron/preload.cjs`) whitelists specific IPC channels (~44 channels). New commands must be added to both the `allowedChannels` array in preload.cjs AND the `ipcMain.handle()` in the relevant service file. Window geometry APIs (`windowGetSize`, `windowSetSize`, etc.) are dedicated methods, not in the whitelist.

- **Window dragging**: Use custom `mousedown` + `mousemove` + `windowSetPosition` (see `MainView.tsx`), NOT CSS `-webkit-app-region: drag`. The custom drag handles cross-Space moves on macOS.

- **macOS transparent/always-on-top window**: `BrowserWindow` is created with `frame: false, transparent: true`. `floatWindowOnAllSpaces()` uses `setAlwaysOnTop(true, 'screen-saver')` for NSStatusWindowLevel and `setVisibleOnAllWorkspaces(true)` for canJoinAllSpaces. Must be re-asserted after `moved`/`focus` events.

- **Dock icon hidden**: `app.dock.hide()` — app runs as accessory. Dock click (`app.on('activate')`) re-shows the main window.

- **Window close = hide**: Both main and chat windows intercept `close` with `e.preventDefault()` + `hide()`. On `before-quit`, the close listener is removed so windows can actually close.

- **Settings dual storage**: Renderer reads/writes `localStorage` key `da_settings`. Calling `settings:sync` writes to disk (`userData/da_settings.json`) and broadcasts `settings:updated` to all windows. Startup reads disk first, falls back to localStorage. Always call `settings:sync` after changing settings — localStorage alone won't propagate to other windows or the main process.

- **Chat context management**: `filterForApi` removes `type: 'clear'` markers and non-API messages; `trimMessagesForApi` caps at 40 messages / 24k chars before sending to the API.

- **Local Live2D models**: Loaded via custom `dfmodel://local/...` protocol registered in `electron/live2dService.cjs`. Resources are read from the user's chosen directory — never copied.

## Critical Files

| File | Role |
|------|------|
| `electron/main.cjs` | Electron main process: BrowserWindow creation, IPC handlers, tray, macOS native behaviors |
| `electron/preload.cjs` | Context bridge: exposes `window.electronAPI` with IPC channel whitelist |
| `electron/live2dService.cjs` | `dfmodel://` protocol, model scanning, `live2d:*` IPC handlers |
| `electron/chatSessionService.cjs` | `da_chat.json` session persistence, `chat:session:*` handlers |
| `electron/screenshotService.cjs` | macOS `screencapture -i` region capture, auto-hide windows during capture |
| `electron/selectionService.cjs` | Text selection hook lifecycle, `selection:*` handlers |
| `src/electron.d.ts` | TypeScript declarations for `window.electronAPI` |
| `src/App.tsx` | Window-type router (`?window=` param) |
| `src/pages/MainView.tsx` | Main window: Live2D canvas, custom drag, hover overlay |
| `src/pages/ChatApp.tsx` | Chat + Settings tab shell with keep-alive |
| `src/components/Live2DCanvas.tsx` | React wrapper for Live2D controller lifecycle |
| `src/live2d/Live2DController.ts` | WebGL context owner, render loop, public motion/expression/drag API |
| `src/live2d/Live2DModel.ts` | Model loading chain, per-frame update, draw |
| `src/shared/settings.ts` | AppSettings interface, load/save, provider merging, model resolution |
| `src/shared/providers.ts` | LlmProvider type, SYSTEM_PROVIDERS (OpenAI, Ollama, Hermes) |
| `src/shared/live2dReactions.ts` | Chat-to-Live2D expression mapping, `notifyLive2DIfReactive` |
| `electron/agentService.cjs` | `buildAgentSystemPrompt`, legacy `agent:run` |
| `electron/aiStreamService.cjs` | `ai:stream_*` IPC, topic agent streams |
| `electron/ai/AiService.cjs` | AI SDK `ToolLoopAgent` wrapper |
| `electron/ai/chunkBridge.cjs` | UIMessageChunk → legacy stream IPC |
| `src/services/aiTransport/IpcChatTransport.ts` | Renderer `openAgentStream` / attach / abort |
| `src/shared/chatMessages.ts` | `buildApiMessages`, `filterForApi`, `trimMessagesForApi`, `reconcileToolMessages` |
