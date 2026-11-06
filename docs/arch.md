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
| AI 接入 | 主进程 HTTP + IPC 流式回推 | 避免 CORS；OpenAI 兼容与 Ollama |
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

macOS 托盘使用 `trayIconTemplate.png`（16pt，配套 `@2x`）且不附加标题，缺图时才回退为 emoji。启动延迟检查及显示器变化复用同一个 Tray，不重复销毁重建；菜单栏空间不足时仍可能被系统收起。

启动设置迁移由 `electron/startupSettings.cjs` 捕获异常。迁移失败时仍创建托盘和窗口并显示恢复提示，暂停会话 IPC（包括可能回写索引的读取回退）及快捷键设置写入；`settings:sync` 迁移重试成功后解除保护，避免以空索引覆盖损坏数据。

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

**模型来源**（`electron/live2dService.cjs` + `src/shared/live2dPaths.ts`）：

| 类型 | settings.modelPath 示例 | 加载方式 |
|------|-------------------------|----------|
| 内置 | `/models/Hiyori/Hiyori.model3.json`（唯一内置，Live2D SDK 示例） | Vite / `dist` HTTP 相对路径 |
| 本地 | `/Users/you/Models/MyModel/MyModel.model3.json` | 主进程 `dfmodel://local/...` 自定义协议 |

设置页「浏览本地目录…」会打开文件夹选择器，在目录内查找 `*.model3.json`（优先 `{目录名}.model3.json`），写入 `customModels` 并设为当前模型。资源**不复制**，直接从所选路径读取。

### 5.3 AI 对话与智能体（多智能体）

**多智能体模型**（参考 cherry-studio）：`settings.agents: AgentConfig[]` 数据层，智能体取代全局单一 `agent` 配置：

- **内置智能体**（`src/shared/agent.ts`）：个人助手「小雅」（`personal-assistant`，聊天页默认）与终端助手（`terminal-assistant`，`settings.terminalAgentId` 指向者，仅终端页可达）；`builtinRole` 标记内置，无删除入口
- **模型纯 agent 级**：每个智能体独立 `providerId`/`modelName`/`soul`/`user`/`disabledToolIds`/`mcpServerIds`/`enabledSkillIds`/`knowledgeBaseIds`/`maxTurns`/`envVars`/`reasoningEffort`；`sessionModel`（会话锁模型）链路已删除
- **chatMode 会话级**：`ChatTopic.chatMode` 持久化在会话上（agent 默认值作初值），`chat:topics:updateMeta` 修改；发送时 `{...agent, chatMode: topic.chatMode}` 合成生效配置
- **迁移**（`settings.ts migrateLegacyAgentSettings`）：旧 `settings.agent` → 两内置 agent；soul/provider/model/disabledToolIds/mcp/skills/maxTurns/envVars/reasoningEffort/chatMode 继承到个人助手，user/provider/model/terminalDisabledToolIds 到终端助手；`finalizeSettings` 恒定式保证内置补齐、id 去重、legacy 字段清除
- **AgentSettingsModal**（`src/components/agents/`）：弹窗式编辑（无保存按钮，patch 即写 settings），creating 模式首次 patch 时 materialize 新 uuid；基础/工具/技能/MCP/知识库/高级六分节

**后端选择**（`settings.chatBackend`）：

- `"agent"` — 智能体模式，通过 `ai:stream_open` IPC（AI SDK `ToolLoopAgent` 多轮工具循环）；主进程构建系统提示词、注入工具定义、管理 topic 级流；主进程按 `payload.agentConfig.id` 匹配磁盘 agent（渲染端不可覆盖 id/builtinRole/providerId/modelName）
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

- 内置 Provider：OpenAI、Ollama
- 支持添加自定义 Provider（类型二选一）
- 设置页：API Host、Key（Ollama 可空）、管理模型、**检测连接**（`chat:check`，探测模型列表接口，免模型、不消耗 tokens）

**智能体系统提示词**（主进程 `buildAgentSystemPrompt()` in `agentService.cjs`）：

组装顺序：`soul` → `user`（`# 用户档案` 头部）→ skills block → 工具指引 → UpdateProfile 引导 → chat-mode suffix

- **`soul`**（SOUL.md）：智能体人格、用途、执行规则。设置页可编辑，有恢复默认按钮
- **`user`**（USER.md）：用户偏好与习惯。留空则不注入
- **`UpdateProfile` 工具**：智能体在对话中可自动调用，将学到的用户偏好追加到 USER.md，或替换 SOUL.md
- **`mergeSystemMessage`**：主进程剥离渲染端传入的 system 消息，替换为主进程构建的完整提示词

**对话模式**（会话级，`ChatTopic.chatMode`，agent 默认值作初值）：

| 模式 | 工具审批 | 说明 |
|------|---------|------|
| `normal` | confirm | 默认，写操作需确认 |
| `plan` | confirm | 只读工具，输出执行方案 |
| `auto-edit` | auto | 文件编辑免确认，bash/网络仍需确认 |
| `full-auto` | bypass | 全部工具免确认 |

模式切换通过聊天输入栏的模式选择器按钮（`ChatModeSelector`）写回 topic（`chat:topics:updateMeta`），不支持快捷指令切换。

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
- **多会话**：侧边栏 `AgentChatSidebar` 上区为 agent 列表（`getChatAgents` 排除终端助手）、下区 `TopicSidebar` 按 `topic.agentId` 过滤；删除 agent 级联删除其 topics
- **API 上下文裁剪**：`trimMessagesForApi` 默认最近 40 条 / 24k 字符
- **附件**：文本嵌入消息 / 图片 multimodal

**ChatInputBar**（`src/components/chat/ChatInputBar.tsx`）：

- 工具栏：上传文件、截图、清除上下文、压缩上下文、清空消息、模式选择器
- 快捷指令面板（`/` 触发，键盘导航）
- 拖拽/粘贴本地文件、Enter 发送

模型选择器已移除——模型纯 agent 级，在各智能体设置的 AgentSettingsModal 中配置。

### 5.4 智能体工具与技能

**内置工具**（`electron/agentBuiltinCatalog.cjs` + `agentBuiltinExecutors.cjs`）：

| 工具 | 类别 | 审批 | 说明 |
|------|------|------|------|
| read / glob / grep | 搜索/文件 | 自动 | 只读；契约对齐 pi（oh-my-pi）：read 支持尾部行选择器（`:50`、`:50-100`、`:raw` 等）与 `[path#TAG]` 快照头；grep 带 `*LINE:match` 锚定输出、`skip` 文件页翻页；glob 支持 `;` 多路径与 `limit` |
| write / edit | 文件 | 确认 | write 返回新 `[path#TAG]` 头并自动剥离粘贴的行号前缀；edit 为 hashline 行锚补丁语言（`PUT/CUT/REM/MV` + 寄存器），一次调用可多 section |
| bash | Shell | 确认 | 命令执行；timeout 秒语义（默认 300、0 禁用、上限 3600），`cwd` 参数与 `cd X &&` 重写，stdout/stderr 合并、50 KiB 尾窗截断 |
| WebFetch / WebSearch | 网络 | 确认 | URL 抓取 / 搜索；绑定 MCP Fetch 时隐藏 WebFetch |
| TodoWrite | 编排 | 自动 | 任务列表 |
| Skills | 上下文 | load 自动；install/remove 确认 | 技能加载与管理 |
| ssh_exec / ssh_hosts | Shell | 确认 / list 只读 | 在已保存 SSH 主机上执行一次性命令 / 管理已保存主机（凭据只引用 credentialId）；主机对话中缺省 hostId=对话所属主机 |
| ssh_read / ssh_glob / ssh_grep / ssh_write / ssh_edit / ssh_cwd | 文件（主机对话） | 读取/搜索自动，写入/编辑/切目录确认 | SFTP 远程文件六件套，仅主机助手上下文暴露；相对路径基于对话 cwd；跨主机首次需用户确认（force 审批，full-auto 不可绕过） |
核心 FS 六件套（read/write/edit/bash/glob/grep）完整移植 pi 契约：小写工具名 + pi 参数 schema + `[path#TAG]` 快照锚点（`electron/agentSnapshotStore.cjs`）+ hashline 补丁引擎（`electron/hashlinePatch.cjs`）。旧的大写工具 id（Read/Write/Edit/MultiEdit/Bash/Glob/Grep）通过 `LEGACY_TOOL_ID_MAP` 映射兼容已保存的工具开关与旧会话回放。

**工具开关**：每个 agent 单套 `disabledToolIds`（旧的 `terminalDisabledToolIds`/`enableTerminalTool` 已删）；场景强制规则在 `getEnabledAgentBuiltinTools(agent, context)` 上层叠加——local 强制禁 Terminal，terminal 强制禁 bash，设置面板以「场景强制」徽章展示。

**主机对话**（内置「主机助手」`host-assistant`，终端页默认视图）：`electron/hostConversationService.cjs` 提供 per-conversation 运行时——对话绑定主机（`ChatTopic.host`，含跨主机授权 `grants` 与按主机持久化 `cwdByHost`，身份指纹 `user@host:port[?jump=]` 变化即失效）、force 审批（ssh_hosts 写操作与未授权跨主机调用，批量 bypass 跳过、仅单卡可决）、`ssh_hosts` add/update/delete 收敛入口（update 变更身份清授权与 cwd；delete 先 abort 流再级联删对话）。远端执行走 `withSftp`（SFTP）与 `execOnSavedHost`（命令，cwd 前缀 `cd '<cwd>' &&`，cd 失败报错不静默回 home）；快照 key 为 `topicId:hostId:path`，与本地快照隔离。工具能力与本地智能体对齐：MCP 服务器绑定、McpManager、Skills、TodoWrite、WebFetch/WebSearch、AskUserQuestion 照常可用，仅本机 FS/bash 工具被场景强制禁用（远程对应物为 ssh_* 系列）；Skills 在主机对话仅允许 load。主机面板（`HostChatPanel`）功能与聊天页对齐：消息重试/编辑/删除、斜杠命令（/clear、/compact、/技能）、压缩上下文、清空消息、知识库绑定与引用、maxTurns 续跑卡、单工具调用取消。

**技能系统**（`electron/agentSkillService.cjs`）：

- 技能目录：`~/.agents/skills/<skill-id>/SKILL.md`（YAML frontmatter + markdown body）
- 内置技能：`find-skills`（发现并安装技能）、`skill-creator`（创建技能），受保护不可删除
- `agent:skills:scan` IPC 返回技能列表（id / name / description / folderName / isBuiltin）
- `agent:skills:import_directory`：系统选目录对话框，校验 `SKILL.md` 后复制到全局技能目录
- `buildSkillsPrompt` 只将设置中开启的技能（名称与简介）注入系统提示词；完整内容由 `Skills`（action=load）按需加载
- 未开启的技能不进上下文，只能由用户 `/skill-id` 在当次请求临时启用
- `Skills` 工具支持 load / list / search（skills.sh 市场）/ install / remove / init / register
- 导入、安装、注册不会自动打开设置开关

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
| `chat:topics:list` / `create` / `delete` / `rename` | 多会话管理；create 接收 `{ name, agentId, chatMode, knowledgeBaseIds, hostId? }`（hostId 时创建主机对话，默认主机创建即授权）；list 接收 `{ scope: 'chat' | 'host' }` |
| `chat:topics:updateMeta` | `{ topicId, chatMode?, knowledgeBaseIds? }` — 会话级元数据更新；`host` 字段（授权/cwd）不可经此修改 |
| `chat:topics:setActive` | `{ topicId, scope: 'chat' | 'host' }` — host scope 写 `activeHostId` |
| `chat:list_models` | `{ apiHost, apiKey, providerType }` |
| `chat:check` | 连通性检测 |
| **智能体** | |
| `ai:stream_open` | `{ topicId, requestId, messages, agentConfig, apiConfig, terminalSessionId? }` → `{ mode, requestId }` |
| `ai:stream_attach` | `{ topicId }` → `{ attached, legacyEvents, status?, requestId? }` |
| `ai:stream_detach` | `{ topicId }` |
| `ai:stream_abort` | `{ topicId?, requestId? }` |
| `ai:tool:bypass_approval` | `{ topicId }` — 本次 topic 后续工具免审批 |
| `agent:abort` | `{ requestId }` — 同时尝试 abort 对应 ai stream |
| `agent:tool:approve` | `{ approvalId, approved }` |
| `agent:tool:bypass_approval` | `{ requestId?, topicId? }` |
| `agent:skills:scan` / `agent:skills:open_dir` / `agent:skills:import_directory` | 技能扫描 / 打开根目录 / 选目录导入（须含 SKILL.md） |
| `agent:avatar:select` / `agent:avatar:resolve` | 智能体头像；select 接收 `agentId`，存 `agent-avatar/<safeId><ext>` |
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
    streamManager/
      AiStreamManager.cjs   # attach/detach、grace、idle timeout、MCP callId
      pipeStreamLoop.cjs    # ReadableStream 消费循环
  agentService.cjs          # buildAgentSystemPrompt、agent:abort / websearch:test
  agentTools.cjs            # 工具执行路由 + 审批
  agentBuiltinCatalog.cjs   # 内置工具定义、参数 schema、审批模式
  agentBuiltinExecutors.cjs # 内置工具执行器（read/write/edit/bash/glob/grep/WebSearch/UpdateProfile…）
  agentBuiltinFsUtils.cjs   # read/grep/glob 路径选择器解析与格式化
  agentSnapshotStore.cjs    # [path#TAG] 文件快照存储（hashline 编辑锚点）
  hashlinePatch.cjs         # edit 工具的 hashline 行锚补丁解析与应用
  bashTimeout.cjs           # bash timeout 解析（秒语义：默认 300、0 禁用、clamp 1..3600）
  mcpToolArgs.cjs           # MCP fetch max_length 注入
  mcpResultFormat.cjs       # MCP 结果截断
  agentSkillService.cjs     # 技能扫描、Skills 工具、skills.sh 市场
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
    ChatPage.tsx            # 智能体对话页（agent 列表+会话分组、AgentSettingsModal 挂载）
    SettingsPage.tsx        # 设置侧栏
    TerminalPage.tsx        # 终端页（含 AI 助手设置入口）
    TipView.tsx             # 划词工具栏
  components/
    Live2DCanvas.tsx
    ModelSelector.tsx
    Tooltip.tsx
    agents/
      AgentSettingsModal.tsx  # 智能体设置弹窗（六分节、patch 即写）
    chat/
      AgentChatSidebar.tsx   # agent 列表 + 会话分组侧栏
      AgentContextMenu.tsx   # agent 右键菜单（编辑/复制/删除）
      ChatInputBar.tsx      # 输入栏（工具栏、快捷指令；无模型选择）
      ChatMarkdown.tsx
      ChatModeSelector.tsx  # 对话模式弹出选择器
      SlashCommandMenu.tsx  # 快捷指令弹出面板
      TopicSidebar.tsx      # 会话列表（按 agentId 过滤后传入）
      AttachmentPreview.tsx
      ToolCallBubble.tsx
      agentTools/           # 智能体工具渲染组件
    settings/
      agent/                # 智能体设置子组件（AgentSettingsModal 内复用）
        AgentBasicSection.tsx
        AgentPromptSection.tsx   # SOUL.md / USER.md 编辑
        AgentToolsSection.tsx    # 工具/MCP 面板（context 强制规则）
        AgentAdvancedSection.tsx
  live2d/
    Live2DController.ts
    Live2DModel.ts
    framework/              # Cubism SDK（勿改）
  shared/
    settings.ts             # AppSettings、load/save、迁移
    providers.ts            # LlmProvider、URL 工具、系统预设
    agent.ts                # AgentConfig、normalize、工具目录
    ai/stream.ts            # ToolTerminalState、AiStreamOpenRequest
    agentBuiltinTools.ts    # 内置工具定义（renderer 端镜像）
    agentSettingsSections.ts
    agentAvatar.ts
    chatMode.ts             # ChatMode 类型、模式卡片
    agentSession.ts         # 智能体会话状态机（chunk/done/error/tool/compact 转移）
    chatMessages.ts         # 上下文过滤、API 消息构建、trimMessagesForApi
    chatSession.ts          # ChatSession 类型、多会话
    chatAttachments.ts
    slashCommands.ts        # SlashCommand 类型、内置命令、解析
    live2dReactions.ts      # 聊天→Live2D 反应映射
    live2dPaths.ts          # bundled/local 路径判定与 dfmodel URL
    selectionActions.ts
    webSearch.ts            # 网络搜索配置类型
  hooks/
    useAgentChatSession.ts  # 智能体会话 React hook（IPC 订阅、requestId 路由、attach 回放）
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

### 终端助手与运行环境

终端页面的本机对话、主机对话和终端抽屉共用 `terminal-assistant`（或 `terminalAgentId` 指定的配置）。主进程的 `agentEnvironment.cjs` 从 topic 主机绑定或属于请求窗口的有效 session 解析环境；`ai:stream_open` 使用该逻辑，不再根据助手角色判断远程环境。

`agentEnvironmentPolicy.json` 是 renderer 与 main 共用的工具能力表：本机对话开放本地文件工具、默认关闭 `bash`；终端通过 `Terminal` 操作交互会话；明确绑定已保存 SSH 主机的终端额外开放远程文件工具；主机对话仅提供远程命令与文件工具。`toolOverrides` 的缺省/true/false 表示环境默认/启用/禁用，不能突破环境或计划模式的限制。MCP、技能和知识库配置在各入口共用。

`Terminal` 跟随当前交互环境；独立 SSH 工具固定使用绑定主机及配置账号，cwd 不跟随终端中的 `cd`、二次 SSH、容器或 `sudo`。调用卡片记录解析后的目标与账号。跨主机首次调用强制逐卡授权，全自动模式不可绕过；主机指纹变化使旧授权与 cwd 失效。终端的 SSH 授权/cwd 保存在 session 内，主机对话的状态继续随 topic 持久化。

用户指定机器并要求连接或操作时，助手先调用 `ssh_hosts(action="list")` 获取实时列表，核对名称、地址、端口及账号；列表优先读取主进程设置快照。用户提供的“机器 id”视为线索，可指简称、别名、部分 IP、分组或用途；模型结合列表及对话上下文筛选候选，展示主机身份与推荐理由，通过 `AskUserQuestion` 确认后才使用列表中的真实 `hostId` 调用工具。推断得到的候选即使只有一台也需确认；不能直接透传模糊 id，或仅凭字面不匹配判断目标不存在。目标缺失、重名或名称与 id 不一致时，也需先澄清。运行时也会读取已保存列表校验目标：未匹配时提供现有主机供选择，无已保存主机时询问配置并阻止执行。已授权主机也不能凭模糊匹配跳过确认；未保存目标必须经用户批准保存后才能连接。

`ssh_exec(sudo: true)` 在逐条确认后以 root 执行整条 shell 命令，目标命令的 stdin 为 `/dev/null`。需要认证且无有效 sudo 密码缓存时，由主进程发出 `AskUserQuestion` 密码卡：用户可手动输入密码，或明确选择使用当前连接账号已保存的密码（仅在该密码存在时提供）。已保存密码不传入 renderer；卡片完成事件不回显密码。成功验证的密码按 topic、主机及账号在主进程内存缓存最多 10 分钟，认证失败清除缓存并重新询问。普通命令不自动响应密码提示，智能体不得自行索取密码或在工具参数中传递密码。

首次升级在 `userData/terminal-assistant-migration-v1/` 备份原设置和 topic 索引后迁移；主机助手与终端页本机对话的助手引用改为统一助手，消息文件不重写。以终端助手配置为主，移除旧环境默认禁用项，保留其他工具禁用偏好和自定义 SOUL。旧 `host-ai` 设置链接导向统一设置。仅有 localStorage 的旧设置在首次同步时另存 `renderer-settings.json` 备份。

---

## 8. 设置项（AppSettings 摘要）

```ts
interface AppSettings {
  // AI
  activeProviderId: string;
  providers: LlmProvider[];
  chatBackend: string;          // "agent" | "providerId::modelName"

  // 多智能体
  agents: AgentConfig[];         // 内置两个（小雅 personal-assistant、终端助手 terminal-assistant）+ 自定义
  terminalAgentId: string;       // 终端页绑定的 agent（默认 terminal-assistant）
  activeChatAgentId: string;     // 聊天页当前选中 agent（不可指向终端 agent）

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

  // MCP（服务器全局管理，agent 通过 mcpServerIds 绑定）
  mcpServers: McpServer[];

  // 网络搜索
  webSearch: WebSearchConfig;

  // 其他
  deletedSystemProviderIds: string[];
}

interface AgentConfig {
  id: string;                    // normalize 缺省生成 uuid
  builtinRole?: 'personal-assistant' | 'terminal-assistant';
  name: string;
  avatar: string;                // emoji 或 img:relativePath（agent-avatar/<safeId><ext>）
  description: string;
  providerId: string;
  modelName: string;
  soul: string;                 // SOUL.md — 人格与执行规则
  user: string;                 // USER.md — 用户偏好（留空则不注入）
  disabledToolIds: string[];    // 旧配置兼容；统一终端助手迁移后使用 toolOverrides
  toolOverrides?: Record<string, boolean>; // 缺省跟随环境默认，true/false 为用户偏好
  mcpServerIds: string[];
  enabledSkillIds: string[];
  knowledgeBaseIds: string[];
  maxTurns: number;
  envVars: Record<string, string>;
  chatMode: ChatMode;           // agent 默认对话模式（会话可覆盖）
  reasoningEffort?: 'minimal' | 'low' | 'medium' | 'high';
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

// 快捷指令 /compact — 发送压缩 prompt，流结束后自动清除旧上下文
handleSend(COMPACT_PROMPT);  // 在 onChatStreamDone 中检测并插入 clear + 摘要
```

---

## Obsidian / Markdown vault 知识库

知识库直接挂载一个或多个本机目录，不复制或修改笔记。允许没有 `.obsidian` 的普通 Markdown 目录；仅索引 `.md` / `.markdown`，默认跳过隐藏文件、隐藏目录、符号链接，并支持每个 vault 的相对子目录排除。重复路径去重，父子目录不能重复挂载。旧导入式知识库与文档处理入口已移除；历史磁盘文件不迁移、不主动清理。

- `electron/knowledge/vaultService.cjs`：vault 目录配置、IPC、递归文件监听、防抖、启动和每分钟补扫、worker 生命周期。配置位于 `userData/vault-knowledge/vaults.json`，索引位于同目录 `indexes/`。配置由专用 IPC 原子写盘，并通过 `knowledge:updated` 广播；不向 vault 写入 `.index` 等文件。
- `vaultWorker.cjs`：后台 SQLite FTS5 索引，按文件修改时间和大小增量更新；每 100 个文件让出执行权，支持索引期间查询。标题、aliases、tags、路径、正文按不同权重检索；中日韩文字按字符分词并以短语检索，英文按词和大小写归一。查询作为文本处理，不接受原始 FTS 运算符。
- `vaultFiles.cjs`：共享路径与排除校验、无符号链接读取、YAML frontmatter、按行分段。单篇文件上限 16 MB，超限在索引提示中显示；读取每次默认 200 行、最多 500 行 / 32 KB。

绑定字段沿用 `knowledgeBaseIds`，内容为 vault ID。agent 默认选择可被对话覆盖，显式空数组表示不使用知识库；无效 ID 在发送时过滤。仅在选中有效 vault 时向 AI SDK 工具集开放 `kb_search`、`kb_read`、`kb_resolve_link`；聊天页、终端抽屉、主机面板共用同一条 agent 流。主机对话中的知识库仍指本机已选 vault。取消沿用流与单工具的合并 AbortSignal。普通对话不使用知识库，不再进行对话前检索注入。

`kb_search` 返回 vault、路径、标题、当前源文件片段和原文行号，默认 10 条、最多 50 条；`kb_read` 始终读取当前磁盘原文并返回后续行号。`kb_resolve_link` 支持 Wiki / Markdown 内链和标题锚点，优先源目录相对路径、再 vault 根目录路径、最后笔记名或别名；多个候选交由 agent 选择。不会展开嵌入、建立知识图谱或运行插件查询。工具结果可用 vault / 相对路径 / 行号引用。

vault 离线时保留挂载，返回明确错误，不返回缓存正文；目录恢复后补扫。移除挂载只删除应用内索引；排除规则同时作用于搜索、原文读取和链接解析。这里的只读和排除规则约束知识库功能，已有 Shell 等通用工具仍按原权限配置运行。

验证：`npm test -- src/shared/vaultKnowledge.test.ts`；`node scripts/benchmark-vault.cjs 50000` 在临时目录构造约 4 KB/篇的中英文笔记，验证完整索引、查询 p95 和全量核对后的增量可见时间，完成后清理临时文件。Electron 原生模块重建后需用 `ELECTRON_RUN_AS_NODE=1 node_modules/electron/dist/Electron.app/Contents/MacOS/Electron scripts/benchmark-vault.cjs 50000` 运行同一验证。

打包后的完整烟测：`node_modules/.bin/electron scripts/smoke-vault-electron.cjs release/mac-arm64/DesktopFairy.app/Contents/Resources/app.asar`。使用隔离临时 userData，验证四种 agent 环境的工具注册与执行、取消、目录监听、真实 preload / IPC、搜索与原文预览、排除规则及移除挂载；不会访问现有用户配置。
