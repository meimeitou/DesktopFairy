# DesktopFairy — 技术架构文档

> 版本：v2.1 | 日期：2026-05-22  
> 技术栈：Electron + React 19 + TypeScript + Live2D Cubism SDK

---

## 1. 项目概述

常驻 macOS 桌面的 Live2D 看板娘应用。

**已实现能力**：

| 模块 | 状态 | 说明 |
|------|------|------|
| 透明悬浮主窗 | ✓ | Live2D 渲染、自定义拖动、跨 Space 置顶 |
| 聊天窗口 | ✓ | 流式对话、Markdown、附件、清除上下文；Tab keep-alive |
| 会话持久化 | ✓ | 单会话 `da_chat.json`；展示全量、API 发送前裁剪 |
| 统一设置壳 | ✓ | 对话 / 设置 Tab，隐藏系统标题栏 |
| AI 服务商配置 | ✓ | OpenAI 兼容 + Ollama，多 Provider、检测连接 |
| 划词助手 | ✓ | 快捷键 / 自动弹出、工具栏动作、跳转聊天 |
| Live2D 配置 | ✓ | 模型切换、窗口尺寸、缩放、位置偏移 |
| Live2D 本地模型 | ✓ | 浏览目录选择 `*.model3.json`，`dfmodel://` 直读 |
| Live2D 拟人化反应 | ✓ | 聊天生命周期驱动表情；可开关 `live2dReactive` |
| 人设 Prompt | ✓ | 独立设置页，注入 System 消息 |
| 系统托盘 | ✓ | 显示/隐藏模型、打开设置、退出 |
| TTS | ✗ | 仅有设置开关，未接入播放 |
| 区域截图 | ✓ | macOS `screencapture -i`，托盘 / 聊天输入栏触发，预填附件 |
| ASR | ✗ | 未实现 |

**设计原则**：优先可运行、可扩展；不做 Agent 平台与大而全编排。

---

## 2. 技术选型

| 层次 | 技术 | 说明 |
|------|------|------|
| 桌面壳 | Electron | 主进程 IPC、托盘、全局快捷键、文件对话框 |
| UI | React 19 + TypeScript + Vite | 单页多窗口路由（`?window=` 参数） |
| 角色渲染 | Live2D Cubism SDK (WebGL2) | `Live2DController` → `Live2DModel` |
| AI 接入 | 主进程 HTTP + IPC 流式回推 | 避免 CORS；OpenAI 兼容（含 Hermes Agent）与 Ollama |
| 配置存储 | localStorage + 磁盘 JSON | 键名 `da_settings`；主进程同步划词等子系统 |

---

## 3. 窗口与路由

单入口 `index.html`，由 `src/App.tsx` 根据 URL 参数选择页面：

| 参数 | 页面 | 窗口 |
|------|------|------|
| （默认） | `MainView` | 透明 Live2D 主窗 |
| `?window=chat` | `ChatApp` | 聊天 + 设置 Tab |
| `?window=chat&view=settings` | `ChatApp`（设置 Tab） | 同上 |
| `?window=tip&text=…` | `TipView` | 划词工具栏小窗 |

```
┌─────────────────┐     ┌──────────────────────────────┐
│   MainView      │     │         ChatApp              │
│  Live2DCanvas   │     │  ┌────────┬────────┐         │
│  hover → 聊天   │     │  │ 对话   │  设置   │         │
└────────┬────────┘     │  │ChatPage│Settings│         │
         │              │  └────────┴────────┘         │
         │  open_chat    └──────────────────────────────┘
         └──────────────────────────────────────────────►

选词 ──► TipView（工具栏）──► open_chat_with_payload ──► ChatPage
```

**ChatApp**（`src/pages/ChatApp.tsx`）：顶部 Tab「对话 / 设置」，macOS 使用 `titleBarStyle: 'hidden'` + overlay。

**SettingsPage**（嵌入 ChatApp）：侧栏 Tab — AI 模型、人设、划词助手、Live2D 配置、关于。

---

## 4. 架构分层（当前实现）

```
┌─────────────────────────────────────────────────────────┐
│  Electron Main (electron/main.cjs + *.cjs)              │
│  窗口 · 托盘 · IPC · 聊天 HTTP · 划词 hook · 文件读取    │
├─────────────────────────────────────────────────────────┤
│  Preload (electron/preload.cjs) — IPC 白名单             │
├─────────────────────────────────────────────────────────┤
│  React UI                                               │
│  MainView │ ChatApp/ChatPage │ Settings │ TipView       │
├──────────────────────────┬──────────────────────────────┤
│  Live2D Pipeline         │  Shared State (src/shared/)    │
│  Canvas→Controller→Model │  settings · providers · chat │
└──────────────────────────┴──────────────────────────────┘
```

未引入 Zustand/Redux；状态以 React `useState` + `localStorage` 为主，跨窗通过 IPC 事件同步。

---

## 5. 核心模块

### 5.1 Desktop Shell

**主窗**（`createMainWindow`）：

- 透明、无边框、不可缩放（尺寸由设置控制）
- 关闭 = 隐藏；Dock `activate` 恢复
- 自定义拖动（`MainView.tsx` + `windowSetPosition`），支持跨 Space
- `floatWindowOnAllSpaces()`：`screen-saver` 级别置顶

**聊天窗**（`createChatWindow`）：普通不透明窗，可缩放，760×680 默认；**关闭 = 隐藏**（与主窗一致）。

**ChatApp Tab**：`ChatPage` 与 `SettingsPage` 同时挂载，CSS 切换可见性，避免切换 Tab 丢失对话 state。

**托盘**：设置、显示/隐藏模型、退出（Live2D 相关项已移至设置页）。

**macOS 菜单**：应用名菜单（设置、显示/隐藏、退出）+ 编辑菜单（复制/粘贴/全选）。

### 5.2 Live2D 角色引擎

```
Live2DCanvas (React)
  └─ Live2DController   WebGL 上下文、渲染循环、缩放/偏移
       └─ Live2DModel   CubismUserModel，资源加载、动作/表情
```

| 能力 | 实现 |
|------|------|
| 模型加载 | 内置仅 **Hiyori**（SDK 示例）；或用户本地目录（`dfmodel://local/...`） |
| 鼠标/光标跟随 | 全局光标轮询 → `setDraggingFromScreen` |
| 待机动作 | 模型内 Idle motion 自动播放 |
| 随机动作 / 表情 | IPC `live2d:command`、设置页按钮 |
| 拟人化反应 | 聊天窗 `notifyLive2D` → `react:*` 命令；与模型可用表情求交 |
| 缩放 | `modelScale`，投影矩阵 scale |
| 位置偏移 | `modelOffsetX/Y`（像素，相对窗口中心） |

SDK 源码：`src/live2d/framework/`（别名 `@framework`），业务代码在 `src/live2d/`。

**拟人化反应**（`src/shared/live2dReactions.ts`）：

聊天窗在发送 / 流式完成 / 出错时调用 `notifyLive2DIfReactive`（受 `live2dReactive` 开关控制），经 IPC `live2d:command` 转发至主窗 `Live2DCanvas`。命令格式：`react:<reaction>` 或 `react:replyDone:<urlencodedText>`。

| 聊天事件 | Reaction | 候选表情（按优先级，需模型支持） |
|----------|----------|---------------------------|
| 用户发出消息 | `userSend` | 呆呆、麦克风 |
| 等待 / 流式生成中 | `thinking` | 麦克风、麦克风小熊 |
| 正常完成 | `replyDone` | 星星、爱心、脸红（可按回复关键词微调） |
| 请求失败 | `replyError` | 哭哭、问号 |
| 打开聊天窗 | `chatOpen` | 星星 |

`Live2DController.applyReaction` 用 `getExpressionNames()` 与当前模型表情列表求交；无匹配时 fallback 随机动作。开启拟人化时，`Live2DCanvas` **关闭** 8 秒随机换表情定时器。

Hermes tools/skills 在 Hermes 服务端执行；Live2D 仅对聊天 UI 生命周期事件反应，不解析 `hermes.tool.progress` SSE。

**模型来源**（`electron/live2dService.cjs` + `src/shared/live2dPaths.ts`）：

| 类型 | settings.modelPath 示例 | 加载方式 |
|------|-------------------------|----------|
| 内置 | `/models/Hiyori/Hiyori.model3.json`（唯一内置，Live2D SDK 示例） | Vite / `dist` HTTP 相对路径 |
| 本地 | `/Users/you/Models/MyModel/MyModel.model3.json` | 主进程 `dfmodel://local/...` 自定义协议 |

设置页「浏览本地目录…」会打开文件夹选择器，在目录内查找 `*.model3.json`（优先 `{目录名}.model3.json`），写入 `customModels` 并设为当前模型。资源**不复制**，直接从所选路径读取。

### 5.3 AI 对话

**配置模型**（`src/shared/providers.ts` + `settings.ts`）：

```ts
interface LlmProvider {
  id: string;
  name: string;
  type: 'openai' | 'ollama';
  apiHost: string;
  apiKey: string;
  enabled: boolean;
  isSystem: boolean;
  models: string[];  // 管理模型面板勾选的列表
}
```

- 内置 Provider：OpenAI、Ollama、**Hermes Agent**（`http://127.0.0.1:8642/v1`，模型 `hermes-agent`，默认未启用）
- 支持添加自定义 Provider（类型二选一）
- 设置页：API Host、Key（Ollama 可空）、管理模型、**检测连接**（`chat:check`）
- Ollama 拉模型：`GET /api/tags`；对话：`/v1/chat/completions`

**Hermes Agent**（OpenAI 兼容）：

- 系统预设 Provider `hermes`：`apiHost` 为 `http://127.0.0.1:8642/v1`，`models: ['hermes-agent']`
- API Key 填 Hermes 侧 `API_SERVER_KEY`（Bearer）；客户端仍持有会话 messages，对话走现有 `chat:send` 流式路径
- Tools / skills 由 Hermes gateway 在服务端执行，DesktopFairy 无需额外 IPC

**ChatPage**（`src/pages/ChatPage.tsx`）：

- 流式 SSE，可中断（`chat:abort`）
- System Prompt 来自 `settings.systemPrompt`（人设页）
- **上下文清除**：插入 `type: 'clear'` 标记，发送时过滤历史
- **会话持久化**：`chat:session:load/save` 读写 `userData/da_chat.json`；debounce 保存 messages / draft；存储上限 500 条或 2MB
- **API 上下文裁剪**：`trimMessagesForApi` 在 `filterForApi` 之后，默认最近 40 条 / 24k 字符
- **附件**：文本嵌入消息 / 图片 multimodal（`fileService` + `chatMessages.buildApiMessages`）

**ChatInputBar**（`src/components/chat/ChatInputBar.tsx`）：

- 工具栏：上传文件、清除上下文、清空消息、模型选择
- 拖拽/粘贴本地文件、Enter 发送

### 5.4 划词助手

主进程 `electron/selectionService.cjs` + `selection-hook`：

| 配置项 | 说明 |
|--------|------|
| `selectionTriggerMode` | `shortcut` 快捷键 / `auto` 选中后自动弹出 |
| `selectionShortcut` | 快捷键模式下的组合键 |
| `selectionAutoSend` | 从工具栏进聊天是否自动发送 |
| `selectionMaxLength` | 超过长度不弹工具栏（默认 500） |
| `selectionActions` | 询问、翻译、解释、总结、搜索、复制等 |

**TipView** 小窗：`tipWindow.cjs` 定位，动作通过 `open_chat_with_payload` 预填聊天。

macOS 自动模式需辅助功能权限（`selection:check_accessibility`）。

### 5.5 文件与附件

`electron/fileService.cjs`：

- `file:select` — 多选文件对话框
- `file:read` / `file:stat_path` — 读文本或图片 base64

### 5.6 区域截图

`electron/screenshotService.cjs`（仅 macOS）：

1. 短暂 `hide()` 主窗与聊天窗，避免截进 Live2D / 聊天 UI
2. `screencapture -i -x` 区域框选（Esc 取消）
3. PNG 写入 `temp/desktopfairy-screenshots/`
4. 恢复窗口可见性，返回 `ChatAttachment`（`kind: 'image'`）

触发：`screenshot:capture_to_chat`（托盘菜单、聊天输入栏相机按钮）→ 打开聊天窗 → `chat:prefill { attachments }`。仅预填附件，不自动发送。首次使用可能需 **系统设置 → 隐私与安全性 → 屏幕录制** 授权。

### 5.7 配置持久化

| 存储 | 位置 | 用途 |
|------|------|------|
| localStorage | `da_settings` | Renderer 读写（聊天、设置 UI） |
| 磁盘 JSON | `userData/da_settings.json` | `settings:sync` 写入；启动时划词读盘 |
| 磁盘 JSON | `userData/da_chat.json` | `chat:session:save` 写入；ChatPage mount 加载 |

设置变更时：`saveSettings` → `settings:sync` → 主进程写盘 + `settings:updated` 推送到主窗/聊天窗。

---

## 6. IPC 一览

**调用**（`window.electronAPI.invoke`，见 `preload.cjs` 白名单）：

| 通道 | 说明 |
|------|------|
| **窗口** | |
| `show_main_window` / `hide_main_window` | 显示/隐藏 Live2D 主窗 |
| `resize_main_window` | `{ width, height }` |
| `reapply_window_float` | 重新断言 macOS 置顶 |
| `toggle_click_through` | 点击穿透 |
| `open_chat_window` / `open_settings_window` | 打开聊天壳（可切 Tab） |
| `open_chat_with_text` / `open_chat_with_payload` | 预填聊天 `{ text?, autoSend?, attachments? }` |
| `window:get_size` / `window:set_size` | 当前窗尺寸 |
| `window:get_position` / `window:set_position` | 当前窗位置 |
| `screen:get_cursor_point` | 全局光标（Live2D 跟随） |
| **聊天** | |
| `chat:send` | `{ requestId, messages, chatUrl, apiKey, model, temperature? }` |
| `chat:abort` | `{ requestId }` |
| `chat:session:load` | 读取单会话 JSON，无文件则空 session |
| `chat:session:save` | 写入单会话 JSON |
| `chat:list_models` | `{ apiHost, apiKey, providerType }` |
| `chat:check` | 连通性检测，返回 `{ ok, latencyMs, model }` |
| **设置** | |
| `settings:sync` | 全量 settings 对象写盘并广播 |
| `get_shortcut` / `set_shortcut` | 划词快捷键 |
| **Live2D** | |
| `live2d:list_models` / `live2d:switch_model` | 扫描/切换模型（内置 + customModels） |
| `live2d:command` | `random_motion` / `next_expression` / `react:<reaction>` |
| `live2d:inspect_model` | 返回 expressions / motionGroups |
| `live2d:select_model_dir` | 选择本地模型目录，返回 `*.model3.json` 绝对路径 |
| **划词** | |
| `selection:copy` / `selection:open_url` | 复制 / 打开 URL |
| `selection:resize_tip` | Tip 窗尺寸 |
| `selection:check_accessibility` / `selection:prompt_accessibility` | macOS 权限 |
| **文件** | |
| `file:select` / `file:read` / `file:stat_path` | 附件 |
| **截图** | |
| `screenshot:capture` | 区域截图，返回 `ChatAttachment \| null` |
| `screenshot:capture_to_chat` | 截图后打开聊天并 `chat:prefill` 附件 |
| `quit_app` | 退出 |

**事件**（main → renderer）：

| 事件 | 说明 |
|------|------|
| `chat:stream:chunk` / `done` / `error` | 流式对话 |
| `chat:prefill` | 预填文本 / 附件（划词、截图） |
| `chat:navigate` | `chat` \| `settings` |
| `settings:updated` | 配置变更 |
| `main-window:layout-changed` | 主窗布局（缩放/偏移） |
| `live2d:command` / `live2d:switch_model` | Live2D 控制 |

---

## 7. 目录结构（实际）

```text
electron/
  main.cjs              # 主进程：窗口、IPC、聊天 HTTP、托盘
  preload.cjs           # contextBridge 白名单
  selectionService.cjs  # 划词 hook 生命周期
  selectionPosition.cjs # Tip 窗定位
  tipWindow.cjs         # Tip BrowserWindow
  selectionConfig.cjs   # 黑名单/微调列表
  chatSessionService.cjs # 单会话 da_chat.json 读写
  fileService.cjs       # 文件选择与读取
  screenshotService.cjs # macOS 区域截图
  live2dService.cjs     # Live2D 模型扫描、dfmodel 协议、目录选择

src/
  App.tsx               # ?window= 路由
  pages/
    MainView.tsx        # Live2D 主窗
    ChatApp.tsx         # 聊天+设置壳
    ChatPage.tsx        # 对话页
    SettingsPage.tsx    # 设置侧栏
    TipView.tsx         # 划词工具栏
  components/
    Live2DCanvas.tsx
    ModelSelector.tsx
    ManageModelsPanel.tsx
    chat/               # ChatInputBar, ChatMarkdown, AttachmentPreview
    settings/           # Provider/Persona/Selection/Live2D 各 Section
  live2d/
    Live2DController.ts
    Live2DModel.ts
    framework/          # Cubism SDK（勿改）
  shared/
    settings.ts         # AppSettings、load/save、迁移
    providers.ts        # LlmProvider、URL 工具、Hermes 系统预设
    live2dReactions.ts  # 聊天→Live2D 反应映射与 notifyLive2D
    live2dPaths.ts      # bundled/local 路径判定与 dfmodel URL 转换
    chatMessages.ts     # 上下文过滤、API 消息构建、trimMessagesForApi
    chatSession.ts      # ChatSession 类型、normalize、存储上限裁剪
    chatAttachments.ts
    selectionActions.ts
  electron.d.ts

public/
  models/               # Live2D 模型资源
  shaders/              # WebGL shader
```

---

## 8. 设置项（AppSettings 摘要）

```ts
interface AppSettings {
  // AI
  activeProviderId: string;
  providers: LlmProvider[];
  modelName: string;
  systemPrompt: string;
  temperature: number;

  // 划词
  selectionEnabled: boolean;
  selectionTriggerMode: 'shortcut' | 'auto';
  selectionShortcut: string;
  selectionAutoSend: boolean;
  selectionMaxLength: number;
  searchEngine: string;
  selectionActions: SelectionActionItem[];

  // Live2D
  modelPath: string;
  customModels: { name: string; path: string }[]; // 本地 model3.json 绝对路径
  windowWidth: number;
  windowHeight: number;
  modelScale: number;
  modelOffsetX: number;  // 负左正右
  modelOffsetY: number;  // 负上正下
  live2dReactive: boolean; // 聊天驱动表情；true 时关闭 8s 随机表情

  // 其他
  ttsEnabled: boolean;   // 未实现播放
}
```

---

## 9. macOS 特殊行为

| 行为 | 实现 |
|------|------|
| 透明主窗 | `transparent: true, frame: false` |
| 全 Space 置顶 | `setAlwaysOnTop(true, 'screen-saver')` + `setVisibleOnAllWorkspaces` |
| 关闭 = 隐藏 | `close` → `preventDefault` + `hide()` |
| 隐藏 Dock 图标 | `app.dock.hide()`（Accessory 策略） |
| 跨 Space 拖动 | 自定义 `mousemove` + `setPosition`，非 `-webkit-app-region` |
| 划词自动模式 | 需辅助功能权限 |

---

## 10. 开发阶段与待办

| 阶段 | 内容 | 状态 |
|------|------|------|
| 一 | Electron + React 透明窗、托盘、设置 | ✓ |
| 二 | Live2D SDK、跟随、动作表情 | ✓ |
| 三 | OpenAI 兼容流式对话、Markdown | ✓ |
| 四 | 多 Provider（OpenAI + Ollama）、管理模型、检测 | ✓ |
| 五 | 划词助手、聊天输入栏、附件、人设 | ✓ |
| 六 | TTS 播放与嘴型同步 | 待做 |
| 七 | ASR | 待做 |
| 七（部分） | 区域截图 → 聊天附件 | ✓ |
| 七（部分） | 单会话持久化 + API 上下文裁剪 | ✓ |

---

## 11. 风险与约定

| 项 | 说明 |
|----|------|
| IPC 安全 | 新通道必须同时加入 `preload.cjs` 白名单与 `main.cjs` handler |
| 配置双写 | UI 改 localStorage；需 `settings:sync` 才写盘并推送主窗 |
| Live2D 生命周期 | 仅 `Live2DCanvas` mount/unmount 时创建/释放 Controller |
| Ollama Host | 建议 `http://localhost:11434`（无需 `/v1` 后缀） |
| 附件 vision | 图片 multimodal 依赖模型能力，不支持时会报错 |

---

## 附录：聊天请求示例

```ts
const api = window.electronAPI;

// 流式发送（renderer 订阅 chat:stream:* 事件）
await api.invoke('chat:send', {
  requestId: crypto.randomUUID(),
  chatUrl: 'https://api.openai.com/v1/chat/completions',
  apiKey: 'sk-...',
  model: 'gpt-4o-mini',
  messages: [
    { role: 'system', content: '你是桌面伙伴…' },
    { role: 'user', content: '你好' },
  ],
  temperature: 0.7,
});

// 检测 Provider
await api.invoke('chat:check', {
  apiHost: 'http://localhost:11434',
  apiKey: '',
  providerType: 'ollama',
  model: 'llama3.2',
});
```

---
