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

No tests, no CI. `lint` is the only pre-commit check.

## Architecture Gotchas

- **Multi-window via query param**: Single `index.html`, `?window=` selects the page. Not React Router. `?window=chat` and `?window=settings` both route to `ChatApp` (settings is a tab inside it). `?window=tip&text=...` for selection popup.
- **ChatApp tab keep-alive**: `ChatPage` and `SettingsPage` are both mounted simultaneously with CSS visibility toggle — not conditional rendering. Don't convert to conditional render or chat state will be lost on tab switch.
- **Electron main process is CJS**: All `electron/*.cjs` files use `require()`. Renderer (`src/`) is ESM. Do not mix.
- **Main process has no hot-reload**: In dev, `electron .` loads `electron/*.cjs` at startup. Vite HMR only applies to renderer (`src/`). Changing main process files requires restarting the app (quit + `make dev`).
- **`src/live2d/framework/` is read-only**: Unmodified Cubism SDK. Import via `@framework` alias (configured in both `vite.config.ts` and `tsconfig.app.json`). Never edit framework files.
- **Zustand is in package.json but unused**: State is React `useState` + `localStorage` + IPC. Do not introduce Zustand stores without explicit request.

## IPC: Adding a New Channel

Must update **two** places or the channel will be silently rejected at runtime:

1. `allowedChannels` array in `electron/preload.cjs`
2. `ipcMain.handle()` in the relevant `electron/*Service.cjs` file

Window geometry APIs (`windowGetSize`, `windowSetSize`, etc.) are dedicated methods on `electronAPI`, not in the whitelist — they go through their own `ipcRenderer.invoke` calls.

## macOS Window Pitfalls

- **Custom drag, not CSS**: Use `mousedown` + `mousemove` + `windowSetPosition` (see `MainView.tsx`). CSS `-webkit-app-region: drag` is unreliable on transparent windows and breaks cross-Space moves.
- **Close = hide**: Both windows intercept `close` with `e.preventDefault()` + `hide()`. Actual quit happens via `before-quit` removing the listener. Do not call `destroy()` on these windows.
- **Always-on-top must be re-asserted**: `floatWindowOnAllSpaces()` sets `screen-saver` level + `setVisibleOnAllWorkspaces(true)`. Re-call after `moved` and `focus` events or the window loses its floating status.
- **Dock icon hidden**: `app.dock.hide()`. `app.on('activate')` re-shows the main window (standard macOS accessory app pattern).

## Settings Propagation

Settings live in `localStorage` key `da_settings` in the renderer. Calling `settings:sync` IPC writes to `userData/da_settings.json` on disk and broadcasts `settings:updated` to all windows. **localStorage-only changes do not propagate** to other windows or the main process. Always call `settings:sync` after mutating settings.

Startup: disk file is read first (via `settings:load:sync`), falls back to localStorage.

## Agent System Prompt

Agent config lives at `settings.agent` (`AgentConfig` in `src/shared/agent.ts`). The system prompt is built in the **main process** by `buildAgentSystemPrompt()` in `electron/agentService.cjs`, NOT in the renderer. The renderer passes `agentConfig` via the `agent:run` IPC payload, but `mergeSystemMessage` strips any system message the renderer prepends and replaces it.

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
