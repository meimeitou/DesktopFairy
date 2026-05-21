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

No test framework is configured yet.

## Architecture

macOS desktop Live2D companion app. Stack: **Electron** (shell) + **React 19 + TypeScript** (UI) + **Live2D Cubism SDK** (character rendering).

**Multi-window routing**: A single `index.html` with a `?window=` query param selects the page component — `MainView` (default), `SettingsPage` (`?window=settings`), or `ChatPage` (`?window=chat`). Each window is created from the Electron main process via `BrowserWindow`.

**Live2D pipeline**: `Live2DCanvas` (React component) → `Live2DController` (owns WebGL context + render loop) → `Live2DModel` (extends `CubismUserModel`, handles asset loading + per-frame update/draw). The `src/live2d/framework/` directory is the unmodified Cubism SDK; `src/live2d/core/` has the WASM type definitions. Import path `@framework` aliases to `src/live2d/framework`.

**Frontend → Main process IPC**: `window.electronAPI.invoke('command_name', args)` exposed via `contextBridge` in `electron/preload.cjs`. Main process handlers are in `electron/main.cjs`, registered via `ipcMain.handle()`.

## Key Conventions

- **IPC security**: The preload script (`electron/preload.cjs`) whitelists specific IPC channels. New commands must be added to both the `allowedChannels` array in preload.cjs AND the `ipcMain.handle()` in main.cjs.

- **Window dragging**: Use custom `mousedown` + `mousemove` + `windowSetPosition` (see `MainView.tsx`), NOT CSS `-webkit-app-region: drag`. The custom drag handles cross-Space moves on macOS.

- **macOS transparent/always-on-top window**: `BrowserWindow` is created with `frame: false, transparent: true`. `floatWindowOnAllSpaces()` uses `setAlwaysOnTop(true, 'screen-saver')` for NSStatusWindowLevel and `setVisibleOnAllWorkspaces(true)` for canJoinAllSpaces. Must be re-asserted after `moved`/`focus` events.

- **Window close = hide**: The main window's `close` event is intercepted with `e.preventDefault()` + `hide()`. Dock icon click (`app.on('activate')`) re-shows it. On `before-quit`, the close listener is removed so the window can actually close.

- **Settings**: Stored in `localStorage` key `da_settings` as JSON. Main window re-reads on `focus` event.

## Critical Files

| File | Role |
|------|------|
| `electron/main.cjs` | Electron main process: BrowserWindow creation, IPC handlers, tray, macOS native behaviors |
| `electron/preload.cjs` | Context bridge: exposes `window.electronAPI` with IPC channel whitelist |
| `src/electron.d.ts` | TypeScript declarations for `window.electronAPI` |
| `src/App.tsx` | Window-type router (`?window=` param) |
| `src/pages/MainView.tsx` | Main window: Live2D canvas, custom drag, hover overlay |
| `src/components/Live2DCanvas.tsx` | React wrapper for Live2D controller lifecycle |
| `src/live2d/Live2DController.ts` | WebGL context owner, render loop, public motion/expression/drag API |
| `src/live2d/Live2DModel.ts` | Model loading chain, per-frame update, draw |
| `src/pages/SettingsPage.tsx` | Settings UI, localStorage persistence |
