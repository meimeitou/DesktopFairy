# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

（Electron 桌面应用；渲染端为 Web 技术，仅支持 macOS Apple Silicon。）

## Users

开发者 / 技术型用户。自己配置 Provider、模型与 MCP，重度使用终端与智能体工具；桌面常驻使用。

## Product Purpose

常驻 macOS 桌面的 Live2D 看板娘，集成 AI 对话、智能体工具、终端与知识库。存在意义：让 AI 助手有形象、有感情地陪伴日常开发与信息处理，而不是又一个网页聊天框。成功 = 用户每天常驻使用它聊天、干活、查资料，替代网页版 AI 对话。

## Positioning

「有感情的助手」：Live2D 情感陪伴（拟人化反应、表情、气泡）与完整智能体工具链（read/write/edit/bash、终端、MCP、技能、知识库）缺一不可——这是同类产品无法同时复制的组合。不是纯桌面宠物，也不是无脸智能体工作台。

## Operating Context

- macOS 桌面常驻：透明悬浮 Live2D 主窗跨 Space 置顶，聊天/终端/知识库/设置四 Tab 壳
- 划词助手：选中文本快捷键/自动弹出工具栏，动作可跳转聊天
- 区域截图（`screencapture -i`）作为视觉输入入口
- 多会话管理、`/compact` 上下文压缩、对话模式（普通/计划/自动编辑/全自动）
- SOUL.md / USER.md 人格系统；智能体可通过 UpdateProfile 自动学习用户偏好
- 详细架构见 docs/arch.md

## Capabilities and Constraints

已实现：透明主窗 + 拟人化反应、流式对话（OpenAI 兼容 / Anthropic / Ollama）、多会话、智能体工具循环、技能系统、MCP、网络搜索（6 Provider）、内置终端（xterm + PTY，SSH）、Obsidian / Markdown vault 只读挂载与本地全文检索（SQLite FTS5）、划词助手、区域截图、系统托盘。

未实现：TTS 播放与嘴型同步（仅有设置开关）、ASR。

约束：
- 仅支持 macOS Apple Silicon；不做 Windows / Linux / Intel Mac
- 界面默认中文
- 开源免费，保持开源，不商业化
- 产品名称 DesktopFairy 不变
- 配置双写约定：UI 改 localStorage，`settings:sync` 写盘并广播（见 docs/arch.md §11）
- IPC 安全：新通道必须同时加入 preload 白名单与主进程 handler

## Brand Commitments

- 名称：DesktopFairy（不变）
- 内置模型仅 Live2D SDK 官方示例 Hiyori（无版权问题）；其他模型用户自行加载并遵守授权

## Evidence on Hand

- docs/arch.md — 完整技术架构文档（v3.0）
- docs/desktopfairy.png — 产品截图
- README.md — 功能清单与安装说明（Homebrew 私有 tap + GitHub Releases）
- 无客户证言、使用数据等营销素材；未来工作不得虚构

## Product Principles

1. **有感情的助手**：情感陪伴与工具能力同等重要，任何一侧的削弱都偏离定位。
2. **优先可运行、可扩展**：不做 Agent 平台与大而全编排（docs/arch.md 设计原则）。
3. **常驻不打扰**：透明置顶、关闭即隐藏、划词按需出现——桌面存在感以不干扰为前提。
4. **用户的数据归用户**：本地配置与多会话持久化、Obsidian / Markdown vault 只读挂载与本地全文检索。
5. **中文优先**：界面与文档默认中文。

## Accessibility & Inclusion

尚无已确立的产品级无障碍要求（Electron 桌面应用，macOS 辅助功能权限仅用于划词自动模式）。
