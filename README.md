# DesktopFairy

常驻桌面的 Live2D 看板娘应用，支持 AI 对话。

![DesktopFairy](./docs/desktopfairy.png)

## 功能

- 透明悬浮窗，Live2D 角色始终显示在桌面最前方
- 鼠标跟随、动作、表情；**拟人化反应**（随聊天状态换表情，可在设置中关闭）
- AI 对话：OpenAI 兼容接口流式输出，可中断，支持 System Prompt 人设
- 接入云端或本地：OpenAI / Ollama / vLLM / LM Studio / **Hermes Agent** 等
- 系统托盘，菜单栏快捷操作，划词助手

## Hermes Agent 快速接入

DesktopFairy 内置 Hermes 系统 Provider（设置 → AI 模型 → 启用 **Hermes Agent**）：

1. 在 Hermes 项目中启用 API Server（例如 `API_SERVER_ENABLED=true`）并启动 gateway（默认 `http://127.0.0.1:8642/v1`）
2. 在 DesktopFairy 设置中将 Hermes 的 **API Key** 填为 Hermes 的 `API_SERVER_KEY`
3. 选择模型 **hermes-agent**，即可流式对话；tools/skills 在 Hermes 服务端执行

Live2D 拟人化与 Provider 无关：任意已配置的模型对话都会触发表情反应（设置 → Live2D →「拟人化反应」；需模型本身含对应表情）。

## Live2D 模型

- **内置模型**：仅包含 Live2D SDK 官方示例 **Hiyori**（无版权问题）
- **其他模型**：请自行下载后，在设置 → Live2D →「浏览本地目录…」加载（需遵守相应授权）

## 开发

需要 Node.js >= 18。

```bash
npm install
npm run dev
```

## 打包

```bash
npm run build        # 生成 dmg 安装包（release/ 目录）
npm run build:dir    # 只打包目录，不出安装包（调试用）
```

## 技术栈

- **Electron** — 桌面壳
- **React + TypeScript** — UI
- **Live2D Cubism SDK** — 角色渲染
- **Vite** — 前端构建
