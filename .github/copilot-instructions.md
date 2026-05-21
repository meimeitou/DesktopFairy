# DesktopFairy — Copilot Instructions

## Project Overview

macOS desktop Live2D companion app. Stack: **Electron** (shell) + **React + TypeScript** (frontend). See [docs/arch.md](../docs/arch.md) for full architecture and roadmap.

## Dev Commands

```bash
npm run dev          # start dev (Vite + Electron concurrently)
npm run build        # production build
npm run build:dir    # build without installer
npm run lint         # eslint
```

## Key Conventions

### Multi-Window Routing

A single `index.html` with `?window=` query param selects the page: `MainView` (default), `SettingsPage` (`?window=settings`), `ChatPage` (`?window=chat`). Each window is a separate `BrowserWindow` created in `electron/main.cjs`.

### Frontend ↔ Electron IPC

Two-tier IPC design in `electron/preload.cjs`:

1. **General commands** — `window.electronAPI.invoke('channel_name', args)` — only channels in the `allowedChannels` whitelist are permitted. Current channels: `reapply_window_float`, `show_main_window`, `hide_main_window`, `toggle_click_through`, `open_settings_window`, `open_chat_window`, `quit_app`, `resize_main_window`.
2. **Window geometry** — dedicated methods: `windowGetSize()`, `windowSetSize(w, h)`, `windowGetPosition()`, `windowSetPosition(x, y)` — registered as `window:*` handlers, not in the whitelist.

**New general IPC channels must be added to both** the `allowedChannels` array in `electron/preload.cjs` AND `ipcMain.handle()` in `electron/main.cjs`.

### Window Dragging (macOS)

- Use custom `mousedown` + `mousemove` + `windowSetPosition` (see `MainView.tsx`), NOT CSS `-webkit-app-region: drag` (unreliable on transparent windows)
- Skip drag when `event.target.closest('button')` matches

### macOS Transparent Window

- `BrowserWindow` created with `frame: false, transparent: true`
- `floatWindowOnAllSpaces()` sets `setAlwaysOnTop(true, 'screen-saver')` (NSStatusWindowLevel) + `setVisibleOnAllWorkspaces(true)` — must be re-asserted after `moved`/`focus` events
- Window close → hides (not quits): `close` event with `e.preventDefault()` + `hide()` in `electron/main.cjs`
- Dock icon click → re-shows window: `app.on('activate')` in `electron/main.cjs`

### Settings

- User settings stored in `localStorage` key `da_settings` as JSON (see `src/pages/SettingsPage.tsx`)
- `Settings` interface fields: `apiBaseUrl`, `apiKey`, `modelName`, `ttsEnabled`, `modelPath`, `windowSize`
- MainView re-reads settings on `window focus` event (after settings window closes)

### Live2D Pipeline

`Live2DCanvas` (React) → `Live2DController` (owns WebGL context + render loop) → `Live2DModel` (extends `CubismUserModel`, handles asset loading + per-frame update/draw). `src/live2d/framework/` is the unmodified Cubism SDK; import via `@framework` alias.

## File Map

| Path                              | Purpose                                                  |
| --------------------------------- | -------------------------------------------------------- |
| `electron/main.cjs`               | Main process: windows, IPC handlers, tray, macOS native  |
| `electron/preload.cjs`            | Context bridge: IPC channel whitelist + window:\* APIs   |
| `src/electron.d.ts`               | TypeScript declarations for `window.electronAPI`         |
| `src/App.tsx`                     | Multi-window router (`?window=` param)                   |
| `src/pages/MainView.tsx`          | Main window UI + drag handler                            |
| `src/pages/SettingsPage.tsx`      | Settings UI + localStorage                               |
| `src/pages/ChatPage.tsx`          | Chat window (placeholder — AI not yet implemented)       |
| `src/components/Live2DCanvas.tsx` | React wrapper for Live2DController lifecycle             |
| `src/live2d/Live2DController.ts`  | WebGL context owner, render loop, public motion API      |
| `src/live2d/Live2DModel.ts`       | Model loading chain, per-frame update, draw              |
| `src/live2d/define.ts`            | Constants: motion groups, priorities, shader paths       |
| `src/App.css`                     | Shared `.window-frame`, `.title-bar`, `.icon-btn` styles |

---

# Behavioral Guidelines

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:

- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:

- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:

- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:

- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:

```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.
