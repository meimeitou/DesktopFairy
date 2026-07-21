# DesktopFairy

常驻桌面的 Live2D 看板娘应用，支持 AI 对话与智能体工具调用。

![DesktopFairy](./docs/desktopfairy.png)

## 功能

### Live2D 桌面伙伴

- 透明悬浮窗，Live2D 角色始终显示在桌面最前方
- 鼠标跟随、动作、表情；**拟人化反应**（随聊天状态换表情，可在设置中关闭）
- 跨 Space 置顶，自定义拖动，强制置顶，自动置顶
- Cmd + R 打开聊天窗口，自动在鼠标位置显示窗口

### AI 对话

- OpenAI 兼容接口流式输出，可中断
- 多会话管理（侧边栏新建 / 切换 / 重命名 / 删除）
- 上下文管理：清除上下文、**AI 压缩上下文**（`/compact`）
- 附件支持：文本嵌入、图片 multimodal、拖拽 / 粘贴 / 截图

### 智能体模式

- **SOUL.md** — 定义智能体的人格、用途与执行规则
- **USER.md** — 记录用户偏好与习惯，自动注入每次对话
- **UpdateProfile 工具** — 智能体在对话中自动学习并更新 USER.md
- **Skills 系统** — 可安装 / 启用技能扩展能力（内置 find-skills、skill-creator）
- **MCP 服务器** — 接入外部工具服务
- **内置工具** — Read / Write / Edit / Bash / Glob / Grep / WebSearch / WebFetch / TodoWrite
- **对话模式** — 普通 / 计划（只读）/ 自动编辑（文件免确认）/ 全自动（全部免确认）

### 快捷指令

- 输入 `/` 唤出快捷指令面板
- `/compact` — AI 自动压缩上下文摘要并清除旧对话
- `/<skill-id>` — 指定使用特定技能

### 其他

- 接入云端或本地：OpenAI / Ollama / vLLM / LM Studio / Hermes Agent 等
- 系统托盘，菜单栏快捷操作
- 划词助手（快捷键 / 自动弹出）
- 区域截图（macOS `screencapture`）
- Cmd+W 关闭窗口

## Hermes Agent 快速接入

DesktopFairy 内置 Hermes 系统 Provider（设置 → AI 模型 → 启用 **Hermes Agent**）：

1. 在 Hermes 项目中启用 API Server（例如 `API_SERVER_ENABLED=true`）并启动 gateway（默认 `http://127.0.0.1:8642/v1`）
2. 在 DesktopFairy 设置中将 Hermes 的 **API Key** 填为 Hermes 的 `API_SERVER_KEY`
3. 选择模型 **hermes-agent**，即可流式对话；tools/skills 在 Hermes 服务端执行

## Live2D 模型

- **内置模型**：仅包含 Live2D SDK 官方示例 **Hiyori**（无版权问题）
- **其他模型**：请自行下载后，在设置 → Live2D →「浏览本地目录…」加载（需遵守相应授权）

## 下载安装

### 下载

前往 [GitHub Releases](https://github.com/meimeitou/DesktopFairy/releases) 下载最新版 `DesktopFairy-x.x.x-arm64.dmg`。

> 仅支持 Apple Silicon（M1/M2/M3/M4 系列）。Intel Mac 暂不支持。

### 安装

1. 双击挂载 DMG，将 `DesktopFairy` 拖入 `Applications` 文件夹
2. 弹出 DMG

### 首次打开（Gatekeeper 提示处理）

本项目为开源软件，未向 Apple 申请代码签名，首次打开会被 macOS Gatekeeper 拦截，提示「无法打开，因为无法验证开发者」或「已损坏」。这是正常现象，任选以下一种方式处理：

- **方式一（推荐，图形界面）**：在 Finder 的「应用程序」中右键点击 `DesktopFairy` → 选择「打开」→ 在弹窗中点击「仍要打开」
- **方式二（终端）**：
  ```bash
  xattr -d com.apple.quarantine /Applications/DesktopFairy.app
  ```

处理一次后，后续打开不再提示。

## 开发

需要 Node.js >= 18。

```bash
npm install
make dev          # 启动开发环境（Vite HMR + Electron，默认开启 DevTools）
make dev DEVTOOLS=0  # 不开启 DevTools
make lint         # ESLint
```

> **注意**：Electron 主进程（`electron/*.cjs`）无热重载，修改后需退出并重新 `make dev`。Vite HMR 仅作用于渲染端（`src/`）。

## 打包

```bash
npm run build        # 生成 dmg 安装包（release/ 目录）
npm run build:dir    # 只打包目录，不出安装包（调试用）
make build-adhoc     # 无需 Apple Developer 账户的 ad-hoc DMG
```

## 技术栈

- **Electron** — 桌面壳（主进程 CJS，渲染端 ESM）
- **React 19 + TypeScript** — UI
- **Live2D Cubism SDK** — 角色渲染（WebGL2）
- **Vite** — 前端构建
