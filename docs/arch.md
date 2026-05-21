# Live2D 桌面精灵 — 技术架构文档

> 版本：v2.0 | 日期：2026-05-21
> 技术栈：Electron + React + TypeScript + Live2D Cubism SDK + 可插拔 AI Provider

---

## 1. 项目概述

常驻桌面的 Live2D 看板娘应用，核心能力：

- 透明置顶悬浮窗
- Live2D 角色显示与交互（鼠标跟随、表情、动作）
- 接入云端 / 本地 AI 模型对话
- 基础 TTS 语音播报
- 系统级集成（托盘、快捷键、截图、剪贴板）

**设计原则**：优先可运行、可扩展、可持续迭代，不做大而全的 Agent 平台。

---

## 2. 技术选型

| 层次 | 技术 | 说明 |
|------|------|------|
| 桌面壳 | Electron | 跨平台、原生 API 丰富、Chromium 渲染 |
| UI | React + TypeScript | 生态成熟、组件化开发效率高 |
| 角色渲染 | Live2D Cubism SDK | 参数驱动、动作表情切换、嘴型同步 |
| AI 接入 | 可插拔 Provider | 统一适配 OpenAI / Ollama / LM Studio |
| 系统服务 | Electron Main Process | 托盘、快捷键、截图、剪贴板、存储 |

---

## 3. 架构分层

```
┌──────────────────────────────────────┐
│          Desktop Shell Layer          │  Electron：窗口、托盘、快捷键
├──────────────────────────────────────┤
│               UI Layer                │  React：聊天、设置、状态展示
├─────────────────┬────────────────────┤
│ Character Engine│  AI Runtime Layer   │  Live2D 引擎 │ Provider / 上下文管理
├─────────────────┴────────────────────┤
│             Service Layer             │  TTS / 截图 / 剪贴板 / 存储
└──────────────────────────────────────┘
```

---

## 4. 核心模块

### 4.1 Desktop Shell

- 透明无边框窗口、始终置顶、可拖动
- 托盘图标与右键菜单、全局快捷键注册

关键 IPC 命令：`show_main_window` / `hide_main_window` / `toggle_click_through` / `open_settings_window` / `open_chat_window` / `resize_main_window` / `reapply_window_float`

### 4.2 UI 层

- 主聊天面板、设置面板、模型配置页、角色配置页、调试页
- 状态管理推荐：**Zustand**（轻量）

### 4.3 Character Engine

管理 Live2D 模型生命周期，驱动动作、表情、视线与嘴型。

**角色状态**：`idle` / `speaking` / `thinking` / `listening` / `reacting` / `sleeping`

```ts
interface CharacterEngine {
  loadModel(modelPath: string): Promise<void>;
  setExpression(name: string): void;
  playMotion(group: string, index?: number): void;
  lookAt(x: number, y: number): void;
  setMouthOpen(value: number): void;
  setState(state: CharacterState): void;
  speak(text: string, emotion?: string): Promise<void>;
  stop(): void;
}
```

> React 只调用 Character Engine 暴露的命令接口，不直接驱动 Live2D 参数。

### 4.4 AI Runtime

多 Provider 适配、上下文管理、基础工具调用、人设 Prompt 注入。第一版不做复杂 Agent 编排。

```ts
interface ChatProvider {
  id: string;
  name: string;
  chat(messages: ChatMessage[], options?: ChatOptions): Promise<ChatResponse>;
  listModels?(): Promise<string[]>;
}
```

支持：`OpenAICompatibleProvider` / `OllamaProvider` / `LMStudioProvider`

统一配置项：API Base URL、API Key、Model Name、Temperature、Max Tokens、Stream 开关

### 4.5 Service 层

| 服务 | 职责 |
|------|------|
| TTS | 文本转音频，驱动 speaking 状态与嘴型同步；推荐 Edge TTS 或系统 TTS |
| 截图 | 全屏 / 选区截图，输出图片供 AI 识别 |
| 剪贴板 | 读写文本 |
| 存储 | 配置 / 会话 / 角色数据持久化（SQLite 或 `electron-store`） |

---

## 5. 通信设计

- **前端 → Main Process**：`window.electronAPI.invoke('command_name', args)` — 通过 `contextBridge` 暴露，`ipcMain.handle()` 处理
- **Main Process → 前端**：`webContents.send()` 推送事件（托盘点击、快捷键触发、任务状态变更）
- **模块间**：事件总线解耦，典型流程：
  UI 发送消息 → AI Runtime 执行 → TTS 播放 → Character Engine 进入 speaking → UI 刷新记录

---

## 6. 目录结构

```text
electron/           # Main process code
  main.js           # BrowserWindow creation, IPC handlers, tray, macOS native
  preload.js        # contextBridge: IPC whitelist + window APIs

src/
  app/          # store / providers / router
  components/   # common / layout
  features/     # chat / settings / model-config / tray
  character/    # engine / live2d / expression / motion / lip-sync / interaction
  ai/           # providers(openai, ollama, lmstudio) / runtime / prompts / memory / tools
  services/     # tts / asr / screenshot / clipboard / storage / event-bus
  shared/       # types / constants / utils
  electron.d.ts # TypeScript declarations for window.electronAPI

public/
  models/       # Live2D model assets
  shaders/      # WebGL shaders for Live2D rendering
```

---

## 7. macOS 特殊行为

| 行为 | Electron 实现 |
|------|------|
| 透明窗口 | `BrowserWindow({ transparent: true, frame: false })` |
| 始终置顶 (NSStatusWindowLevel) | `win.setAlwaysOnTop(true, 'screen-saver')` |
| 所有工作区可见 | `win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })` |
| 关闭 = 隐藏 | `win.on('close', e => { e.preventDefault(); win.hide(); })` |
| Dock 点击恢复窗口 | `app.on('activate', () => { win.show(); win.focus(); })` |
| 退出时真正关闭 | `app.on('before-quit', () => { win.removeAllListeners('close'); win.close(); })` |

---

## 8. MVP 范围

### 必做

| 类别 | 功能 |
|------|------|
| 桌面 | 透明窗、置顶、托盘、显示/隐藏、右键菜单 |
| 角色 | Live2D 模型加载、待机动作、鼠标跟随、点击反馈、基础表情 |
| AI | 文本对话、OpenAI 兼容接口、Ollama、模型切换、对话历史 |
| 音频 | TTS 播放、简单嘴型同步 |
| 设置 | API / 模型 / 角色 / TTS 配置 |

**核心主链路**：窗口显示 → 角色渲染 → 文本对话 → 模型调用 → TTS 播报 → 基础设置

### 暂不做

多 Agent 编排、插件市场、复杂记忆、多角色切换、自动化流程、phoneme 级嘴型同步

---

## 9. 开发阶段

| 阶段 | 目标 |
|------|------|
| 一 | Electron + React 跑通，透明窗、托盘、设置页 ✓ |
| 二 | 接入 Live2D SDK，鼠标跟随、表情、动作 ✓ |
| 三 | 接入 OpenAI 兼容接口，流式对话 |
| 四 | 接入 Ollama / LM Studio，本地模型切换 |
| 五 | 接入 TTS，speaking 状态与嘴型同步 |
| 六 | 截图、剪贴板、快捷键、调试面板 |

**工程原则**：系统能力统一走 Service Layer；模型能力统一走 Provider；角色动作统一由 Character Engine 调度；先打通主链路，再优化细节。

---

## 10. 风险与难点

| 风险 | 应对 |
|------|------|
| 透明窗跨平台兼容 | 各平台单独测试点击穿透、阴影、焦点行为 |
| Live2D 与 React 生命周期冲突 | 避免重复初始化，防止渲染上下文泄漏 |
| 语音 / 动作时序联动 | 音频、嘴型、状态切换需协调时序 |
| 本地模型性能差异 | 超时控制、中断能力、错误提示 |

---

## 11. 后续扩展

ASR 语音输入 / OCR + 截图理解 / RAG 知识库 / 角色记忆 / 主动提醒 / 插件系统 / 多角色 / 云同步

---

## 附录：核心类型定义

```ts
interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  timestamp?: number;
}

interface ChatOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
}

interface ChatResponse {
  content: string;
  usage?: { promptTokens?: number; completionTokens?: number; totalTokens?: number };
}

type CharacterState = 'idle' | 'speaking' | 'thinking' | 'listening' | 'reacting' | 'sleeping';
```

```ts
// Electron IPC 调用示例
const api = window.electronAPI;

await api.invoke('reapply_window_float');
await api.invoke('open_chat_window');
await api.invoke('resize_main_window', { width: 480, height: 500 });

// Window management
const pos = await api.windowGetPosition();
await api.windowSetPosition(pos.x + 100, pos.y);
```

---
