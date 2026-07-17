# DesktopFairy — 技术架构文档

> 版本：v3.0 | 日期：2026-06-24  
> 技术栈：Electron + React 19 + TypeScript + Live2D Cubism SDK

---

## 1. 项目概述

常驻 macOS 桌面的 Live2D 看板娘应用，集成智能体工具调用与技能扩展。

**已实现能力**：

| 模块 | 状态 | 说明 |
|------|------|------|
| 透明悬浮主窗 | ✓ | Live2D 渲染、自定义拖动、跨 Space 置顶 |
| 聊天窗口 | ✓ | 流式对话、Markdown、附件、清除上下文、AI 压缩上下文 |
| 多会话管理 | ✓ | 侧边栏新建 / 切换 / 重命名 / 删除；每会话独立持久化 |
| 智能体模式 | ✓ | SOUL.md + USER.md 人格系统、工具调用、技能、MCP |
| 快捷指令 | ✓ | `/compact` 压缩上下文、`/<skill-id>` 指定技能 |
| 对话模式 | ✓ | 普通 / 计划（只读）/ 自动编辑 / 全自动 |
| 统一设置壳 | ✓ | 对话 / 设置 Tab，Tab keep-alive |
| AI 服务商配置 | ✓ | OpenAI 兼容 + Ollama，多 Provider、检测连接 |
| 划词助手 | ✓ | 快捷键 / 自动弹出、工具栏动作、跳转聊天 |
| Live2D 配置 | ✓ | 模型切换、窗口尺寸、缩放、位置偏移 |
| Live2D 本地模型 | ✓ | 浏览目录选择 `*.model3.json`，`dfmodel://` 直读 |
| Live2D 拟人化反应 | ✓ | 聊天生命周期驱动表情；可开关 `live2dReactive` |
| 系统托盘 | ✓ | 显示/隐藏模型、打开设置、退出 |
| 区域截图 | ✓ | macOS `screencapture -i`，托盘 / 聊天输入栏触发 |
| 网络搜索 | ✓ | DuckDuckGo / Tavily / SerpAPI / Brave / SearXNG / Zhipu |
| TTS | ✗ | 仅有设置开关，未接入播放 |
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

**SettingsPage**（嵌入 ChatApp）：侧栏 Tab — AI 模型、智能体（SOUL/USER、工具、技能、高级）、划词助手、网络搜索、Live2D 配置、关于。

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

### 5.3 AI 对话与智能体

**后端选择**（`settings.chatBackend`）：

- `"agent"` — 智能体模式，通过 `ai:stream_open` IPC（AI SDK `ToolLoopAgent` 多轮工具循环）；主进程构建系统提示词、注入工具定义、管理 topic 级流
- `"providerId::modelName"` — 普通对话模式，通过 `chat:send` IPC，消息原样转发，无系统提示词

**智能体运行时**（Cherry Studio 风格，基于 `ai` 包）：

```text
Renderer (ChatPage / TerminalAgentDrawer)
  openAgentStream → ai:stream_open
  attachTopicStream → ai:stream_attach（关窗重连时回放 legacyEvents）
  abortTopicStream  → ai:stream_abort

Main (aiStreamService.cjs)
  AiStreamManager.startStream（后台执行，按 topicId 单飞）
  → AiService.streamText → ToolLoopAgent
  → chunkBridge → chat:stream:chunk / agent:stream:tool / chat:stream:done

Legacy: agent:run（同步等待，无 topic 管理，仍可用但不推荐新接入）
```

| topicId 来源 | 场景 |
|--------------|------|
| Chat 会话 `topicId` | `ChatPage` 多会话 |
| `terminal:<tabId>` | `TerminalAgentDrawer` 终端内 Agent |

同 topic 已有流时 `ai:stream_open` 返回 `{ mode: 'blocked' }`。

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
  models: string[];
}
```

- 内置 Provider：OpenAI、Ollama、**Hermes Agent**
- 支持添加自定义 Provider（类型二选一）
- 设置页：API Host、Key（Ollama 可空）、管理模型、**检测连接**（`chat:check`）

**智能体系统提示词**（主进程 `buildAgentSystemPrompt()` in `agentService.cjs`）：

组装顺序：`soul` → `user`（`# 用户档案` 头部）→ skills block → 工具指引 → UpdateProfile 引导 → chat-mode suffix

- **`soul`**（SOUL.md）：智能体人格、用途、执行规则。设置页可编辑，有恢复默认按钮
- **`user`**（USER.md）：用户偏好与习惯。留空则不注入
- **`UpdateProfile` 工具**：智能体在对话中可自动调用，将学到的用户偏好追加到 USER.md，或替换 SOUL.md
- **`mergeSystemMessage`**：主进程剥离渲染端传入的 system 消息，替换为主进程构建的完整提示词

**对话模式**（`settings.agent.chatMode`）：

| 模式 | 工具审批 | 说明 |
|------|---------|------|
| `normal` | confirm | 默认，写操作需确认 |
| `plan` | confirm | 只读工具，输出执行方案 |
| `auto-edit` | auto | 文件编辑免确认，Bash/网络仍需确认 |
| `full-auto` | bypass | 全部工具免确认 |

模式切换通过聊天输入栏的模式选择器按钮（`ChatModeSelector`），不支持快捷指令切换。

**快捷指令**（`src/shared/slashCommands.ts` + `SlashCommandMenu`）：

输入 `/` 唤出面板，所有后端（助手和模型）均可用：

| 指令 | 说明 |
|------|------|
| `/compact` | 发送压缩 prompt，LLM 回复摘要后自动插入 clear 标记 + 摘要作为新上下文 |
| `/<skill-id>` | 补全到输入框，用户可追加说明后发送；`handleSend` 解析前缀并注入 skill 调用指令 |

**ChatPage**（`src/pages/ChatPage.tsx`）：

- 普通模式：`chat:send` 流式 SSE，可 `chat:abort`
- 智能体模式：`IpcChatTransport.openAgentStream`，监听 `chat:stream:*` / `agent:stream:tool`；`attachTopicStream` 重连并回放 `legacyEvents`
- 中断：`abortTopicStream` + `agent:abort`；删除 topic 时同样 abort
- **上下文清除**：插入 `type: 'clear'` 标记，`filterAfterContextClear` 过滤历史
- **AI 压缩上下文**：`/compact` 发送 `COMPACT_PROMPT`，流结束后在 `onChatStreamDone` 中插入 clear + 摘要
- **多会话**：侧边栏 `TopicSidebar` 管理会话列表，`chat:topics:*` IPC 增删改查
- **API 上下文裁剪**：`trimMessagesForApi` 默认最近 40 条 / 24k 字符
- **附件**：文本嵌入消息 / 图片 multimodal

**ChatInputBar**（`src/components/chat/ChatInputBar.tsx`）：

- 工具栏：上传文件、截图、清除上下文、压缩上下文、清空消息、模式选择器、模型选择
- 快捷指令面板（`/` 触发，键盘导航）
- 拖拽/粘贴本地文件、Enter 发送

### 5.4 智能体工具与技能

**内置工具**（`electron/agentBuiltinCatalog.cjs` + `agentBuiltinExecutors.cjs`）：

| 工具 | 类别 | 审批 | 说明 |
|------|------|------|------|
| Read / Glob / Grep / NotebookRead | 搜索/文件 | 自动 | 只读 |
| Write / Edit / MultiEdit / NotebookEdit | 文件 | 确认 | 写操作 |
| Bash | Shell | 确认 | 命令执行 |
| WebFetch / WebSearch | 网络 | 确认 | URL 抓取 / 搜索 |
| TodoWrite | 编排 | 自动 | 任务列表 |
| Task | 编排 | 自动 | 子 Agent（当前不支持，返回错误） |
| Skill / Skills | 上下文 | 自动 | 技能加载 / 管理 |
| UpdateProfile | 上下文 | 自动 | 更新 SOUL.md / USER.md |

**技能系统**（`electron/agentSkillService.cjs`）：

- 技能目录：`~/.agents/skills/<skill-id>/SKILL.md`（YAML frontmatter + markdown body）
- 内置技能：`find-skills`（发现并安装技能）、`skill-creator`（创建技能），受保护不可删除
- `agent:skills:scan` IPC 返回技能列表（id / name / description / folderName / isBuiltin）
- `agent:skills:import_directory`：系统选目录对话框，校验 `SKILL.md` 后复制到全局技能目录
- `buildSkillsPrompt` 将已启用技能的目录注入系统提示词；完整内容由 `Skill` 工具按需加载
- `Skills` 工具支持 list / search（skills.sh 市场）/ install / remove / init / register
- 运行时安装的技能通过 `persistEnabledSkillId` 写入设置并广播

**MCP 服务器**（`electron/agentMcpClient.cjs` + `mcpServerService.cjs`）：

- 设置页配置 MCP 服务器（stdio 类型）
- 智能体运行时加载已绑定的 MCP 服务器工具定义
- MCP 工具名格式：`mcp__<serverId>__<toolName>`

**网络搜索**（`electron/webSearchProviders.cjs` + `agentBuiltinExecutors.cjs`）：

支持 DuckDuckGo / Tavily / SerpAPI / Brave / SearXNG / Zhipu，通过 `WebSearch` 工具调用。

### 5.5 划词助手

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

### 5.6 文件与附件

`electron/fileService.cjs`：

- `file:select` — 多选文件对话框
- `file:read` / `file:stat_path` — 读文本或图片 base64

### 5.7 区域截图

`electron/screenshotService.cjs`（仅 macOS）：

1. 短暂 `hide()` 主窗与聊天窗，避免截进 Live2D / 聊天 UI
2. `screencapture -i -x` 区域框选（Esc 取消）
3. PNG 写入 `temp/desktopfairy-screenshots/`
4. 恢复窗口可见性，返回 `ChatAttachment`（`kind: 'image'`）

触发：`screenshot:capture_to_chat`（托盘菜单、聊天输入栏相机按钮）→ 打开聊天窗 → `chat:prefill { attachments }`。仅预填附件，不自动发送。首次使用可能需 **系统设置 → 隐私与安全性 → 屏幕录制** 授权。

### 5.8 配置持久化

| 存储 | 位置 | 用途 |
|------|------|------|
| localStorage | `da_settings` | Renderer 读写（聊天、设置 UI） |
| 磁盘 JSON | `userData/da_settings.json` | `settings:sync` 写入；启动时优先读取 |
| 磁盘 JSON | `userData/da_chat.json` | 单会话持久化（兼容旧版） |
| 磁盘 JSON | `userData/chat-sessions/` | 多会话持久化，按 topicId 分文件 |

设置变更时：`saveSettings` → `settings:sync` → 主进程写盘 + `settings:updated` 推送到所有窗口。

**竞态注意**：`ChatPage` 和 `SettingsPage` 同时监听 `settings:updated`。`SettingsPage` 用 `JSON.stringify` 比较避免内容相同时的不必要重渲染，防止无限循环。

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
| `chat:send` | `{ requestId, messages, chatUrl, apiKey, model }` |
| `chat:abort` | `{ requestId }` |
| `chat:session:load` / `chat:session:save` | 单会话 JSON 读写 |
| `chat:topics:list` / `create` / `delete` / `rename` | 多会话管理 |
| `chat:list_models` | `{ apiHost, apiKey, providerType }` |
| `chat:check` | 连通性检测 |
| **智能体** | |
| `ai:stream_open` | `{ topicId, requestId, messages, agentConfig, apiConfig, terminalSessionId? }` → `{ mode, requestId }` |
| `ai:stream_attach` | `{ topicId }` → `{ attached, legacyEvents, status?, requestId? }` |
| `ai:stream_detach` | `{ topicId }` |
| `ai:stream_abort` | `{ topicId?, requestId? }` |
| `ai:tool:bypass_approval` | `{ topicId }` — 本次 topic 后续工具免审批 |
| `agent:run` | **Legacy** — `{ requestId, messages, agentConfig, apiConfig }` |
| `agent:abort` | `{ requestId }` — 同时尝试 abort 对应 ai stream |
| `agent:tool:approve` | `{ approvalId, approved }` |
| `agent:tool:bypass_approval` | `{ requestId?, topicId? }` |
| `agent:skills:scan` / `agent:skills:open_dir` / `agent:skills:import_directory` | 技能扫描 / 打开根目录 / 选目录导入（须含 SKILL.md） |
| `agent:avatar:select` / `agent:avatar:resolve` | 智能体头像 |
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
| **MCP** | |
| `mcp:servers:list` / `add` / `update` / `delete` / `test` | MCP 服务器管理 |
| **网络搜索** | |
| `websearch:test` | 测试搜索配置 |
| `quit_app` | 退出 |

**事件**（main → renderer）：

| 事件 | 说明 |
|------|------|
| `chat:stream:chunk` / `done` / `error` | 流式对话（普通 + 智能体共用） |
| `agent:stream:tool` | 智能体工具调用进度（审批、running、done/error） |
| `ai:stream:chunk` / `done` / `error` | AI SDK 原始 chunk（可选订阅；UI 主要听 legacy 事件） |
| `chat:prefill` | 预填文本 / 附件（划词、截图） |
| `chat:navigate` | `chat` \| `settings` |
| `settings:updated` | 配置变更（全量 settings 广播） |
| `main-window:layout-changed` | 主窗布局（缩放/偏移） |
| `live2d:command` / `live2d:switch_model` | Live2D 控制 |

---

## 7. 目录结构（实际）

```text
electron/
  main.cjs                  # 主进程：窗口、IPC、聊天 HTTP、托盘、菜单
  preload.cjs               # contextBridge 白名单
  aiStreamService.cjs       # ai:stream_* IPC、topic 级 Agent 流
  ai/
    AiService.cjs           # ToolLoopAgent.streamText 包装
    providerModel.cjs       # apiConfig → AI SDK model（chat/completions）
    messages.cjs            # OpenAI 消息 → CoreMessage[]
    buildToolSet.cjs        # function defs → AI SDK tool()
    chunkBridge.cjs         # UIMessageChunk → legacy IPC + tool ledger
    agentStreamShared.cjs   # 共享 buildAgentToolDeps
    topicBroadcast.cjs      # 多窗口广播 + MCP abort 包装
    runAgentStream.cjs      # legacy agent:run 内联消费流
    streamManager/
      AiStreamManager.cjs   # attach/detach、grace、idle timeout、MCP callId
      pipeStreamLoop.cjs    # ReadableStream 消费循环
  agentService.cjs          # buildAgentSystemPrompt、legacy agent:run
  agentTools.cjs            # 工具执行路由 + 审批
  agentBuiltinCatalog.cjs   # 内置工具定义、参数 schema、审批模式
  agentBuiltinExecutors.cjs # 内置工具执行器（Read/Write/Bash/WebSearch/UpdateProfile…）
  agentBuiltinFsUtils.cjs   # Read/Edit/Glob/Grep 文件工具实现
  bashTimeout.cjs           # Bash timeout 解析（秒/ms 启发式）
  mcpToolArgs.cjs           # MCP fetch max_length 注入
  mcpResultFormat.cjs       # MCP 结果截断
  agentSkillService.cjs     # 技能扫描、Skill/Skills 工具、skills.sh 市场
  agentMcpClient.cjs        # MCP 客户端
  agentToolApproval.cjs     # 工具审批流程
  builtinSkills.cjs         # 内置技能安装器
  mcpServerService.cjs      # MCP 服务器配置管理
  webSearchProviders.cjs    # 网络搜索 Provider 规范化
  chatSessionService.cjs    # 多会话持久化
  chatWindowPosition.cjs    # 聊天窗定位
  selectionService.cjs      # 划词 hook 生命周期
  selectionPosition.cjs     # Tip 窗定位
  tipWindow.cjs             # Tip BrowserWindow
  selectionConfig.cjs       # 黑名单/微调列表
  fileService.cjs           # 文件选择与读取
  screenshotService.cjs     # macOS 区域截图
  live2dService.cjs         # Live2D 模型扫描、dfmodel 协议、目录选择

src/
  App.tsx                   # ?window= 路由
  pages/
    MainView.tsx            # Live2D 主窗
    ChatApp.tsx             # 聊天+设置壳（Tab keep-alive）
    ChatPage.tsx            # 对话页（多会话、快捷指令、压缩上下文）
    SettingsPage.tsx        # 设置侧栏
    TerminalPage.tsx        # 终端页
    TipView.tsx             # 划词工具栏
  components/
    Live2DCanvas.tsx
    ModelSelector.tsx
    Tooltip.tsx
    chat/
      ChatInputBar.tsx      # 输入栏（工具栏、快捷指令、模型选择）
      ChatMarkdown.tsx
      ChatModeSelector.tsx  # 对话模式弹出选择器
      SlashCommandMenu.tsx  # 快捷指令弹出面板
      TopicSidebar.tsx      # 会话列表侧边栏
      AttachmentPreview.tsx
      ToolCallBubble.tsx
      agentTools/           # 智能体工具渲染组件
    settings/
      agent/                # 智能体设置子组件
        AgentSettingsSection.tsx
        AgentBasicSection.tsx
        AgentPromptSection.tsx   # SOUL.md / USER.md 编辑
        AgentToolsSection.tsx
        AgentAdvancedSection.tsx
  live2d/
    Live2DController.ts
    Live2DModel.ts
    framework/              # Cubism SDK（勿改）
  shared/
    settings.ts             # AppSettings、load/save、迁移
    providers.ts            # LlmProvider、URL 工具、Hermes 系统预设
    agent.ts                # AgentConfig、normalize、工具目录
    ai/stream.ts            # ToolTerminalState、AiStreamOpenRequest
    agentBuiltinTools.ts    # 内置工具定义（renderer 端镜像）
    agentSettingsSections.ts
    agentAvatar.ts
    chatMode.ts             # ChatMode 类型、模式卡片
    chatMessages.ts         # 上下文过滤、API 消息构建、trimMessagesForApi
    chatSession.ts          # ChatSession 类型、多会话
    chatAttachments.ts
    slashCommands.ts        # SlashCommand 类型、内置命令、解析
    live2dReactions.ts      # 聊天→Live2D 反应映射
    live2dPaths.ts          # bundled/local 路径判定与 dfmodel URL
    selectionActions.ts
    webSearch.ts            # 网络搜索配置类型
  services/
    aiTransport/
      IpcChatTransport.ts  # openAgentStream、attach、replay、abort
  electron.d.ts

resources/
  agent-skills/             # 内置技能资源（find-skills, skill-creator）

public/
  models/                   # Live2D 模型资源
  shaders/                  # WebGL shader
```

---

## 8. 设置项（AppSettings 摘要）

```ts
interface AppSettings {
  // AI
  activeProviderId: string;
  providers: LlmProvider[];
  modelName: string;
  chatBackend: string;          // "agent" | "providerId::modelName"

  // 智能体
  agent: AgentConfig;           // 见下文
  chatMode: ChatMode;           // 镜像 agent.chatMode，便于 UI 快速访问

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
  customModels: { name: string; path: string }[];
  windowWidth: number;
  windowHeight: number;
  modelScale: number;
  modelOffsetX: number;
  modelOffsetY: number;
  live2dReactive: boolean;
  live2dSpeechBubble: boolean;
  live2dSpeechBubbleMaxChars: number;

  // MCP
  mcpServers: McpServer[];

  // 网络搜索
  webSearch: WebSearchConfig;

  // 其他
  ttsEnabled: boolean;          // 未实现播放
  deletedSystemProviderIds: string[];
}

interface AgentConfig {
  name: string;
  avatar: string;               // emoji 或 img:relativePath
  description: string;
  enabled: boolean;
  providerId: string;
  modelName: string;
  soul: string;                 // SOUL.md — 人格与执行规则
  user: string;                 // USER.md — 用户偏好（留空则不注入）
  disabledToolIds: string[];
  mcpServerIds: string[];
  enabledSkillIds: string[];
  maxTurns: number;
  toolApprovalMode: 'auto' | 'confirm';
  envVars: Record<string, string>;
  chatMode: ChatMode;
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
| Cmd+W 关闭窗口 | 应用菜单「窗口」→ `role: 'close'`（触发 close 事件 → 隐藏） |
| 划词自动模式 | 需辅助功能权限 |

---

## 10. 开发阶段与待办

| 阶段 | 内容 | 状态 |
|------|------|------|
| 一 | Electron + React 透明窗、托盘、设置 | ✓ |
| 二 | Live2D SDK、跟随、动作表情 | ✓ |
| 三 | OpenAI 兼容流式对话、Markdown | ✓ |
| 四 | 多 Provider（OpenAI + Ollama）、管理模型、检测 | ✓ |
| 五 | 划词助手、聊天输入栏、附件 | ✓ |
| 六 | 智能体模式：SOUL.md / USER.md、工具调用、技能、MCP | ✓ |
| 七 | 多会话管理、快捷指令、AI 压缩上下文 | ✓ |
| 八 | 对话模式（计划 / 自动编辑 / 全自动） | ✓ |
| 九 | UpdateProfile 自动记忆持久化 | ✓ |
| 十 | 网络搜索（多 Provider） | ✓ |
| 十一 | TTS 播放与嘴型同步 | 待做 |
| 十二 | ASR | 待做 |

---

## 11. 风险与约定

| 项 | 说明 |
|----|------|
| IPC 安全 | 新通道必须同时加入 `preload.cjs` 白名单与 `main.cjs` / `*Service.cjs` handler |
| 配置双写 | UI 改 localStorage；需 `settings:sync` 才写盘并推送所有窗口 |
| 设置竞态 | `ChatPage` 和 `SettingsPage` 同时监听 `settings:updated`；`SettingsPage` 用 `JSON.stringify` 比较避免循环 |
| 主进程热重载 | dev 下 `electron/*.cjs` 改动触发 `app.relaunch()`（`ELECTRON_HOT_RELOAD=0` 可关） |
| Live2D 生命周期 | 仅 `Live2DCanvas` mount/unmount 时创建/释放 Controller |
| Live2D SDK | `src/live2d/framework/` 为只读，通过 `@framework` 别名导入 |
| Ollama Host | 建议 `http://localhost:11434`（无需 `/v1` 后缀） |
| 附件 vision | 图片 multimodal 依赖模型能力，不支持时会报错 |
| 技能保护 | `find-skills` 和 `skill-creator` 为内置受保护技能，不可删除 |

---

## 附录：聊天请求示例

```ts
const api = window.electronAPI;

// 普通对话（chat:send）
await api.invoke('chat:send', {
  requestId: crypto.randomUUID(),
  chatUrl: 'https://api.openai.com/v1/chat/completions',
  apiKey: 'sk-...',
  model: 'gpt-4o-mini',
  messages: [{ role: 'user', content: '你好' }],
});

// 智能体模式（ai:stream_open）— 主进程构建系统提示词，AI SDK ToolLoopAgent 多轮工具
import { openAgentStream } from './services/aiTransport/IpcChatTransport';

await openAgentStream({
  topicId: 'topic-uuid',           // Chat 会话 ID；终端用 terminal:<tabId>
  requestId: crypto.randomUUID(),
  messages: [{ role: 'user', content: '帮我读取文件' }],
  apiConfig: { apiHost, apiKey, providerType, modelName },
  agentConfig: settings.agent,
});
// 监听 chat:stream:chunk / agent:stream:tool / chat:stream:done（与旧版相同）
// 关窗重连：attachTopicStream(topicId) 回放 legacyEvents

// Legacy（不推荐新代码使用）
// await api.invoke('agent:run', { requestId, messages, agentConfig, apiConfig, ... });

// 快捷指令 /compact — 发送压缩 prompt，流结束后自动清除旧上下文
handleSend(COMPACT_PROMPT);  // 在 onChatStreamDone 中检测并插入 clear + 摘要
```

---
