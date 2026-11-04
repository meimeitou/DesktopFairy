# DesktopFairy 领域用语

本表给架构评审与重构讨论提供统一词汇。实现代码应使用这里的词。

| 用语 | 含义 | 不是 |
|------|------|------|
| **智能体会话（agent session）** | 一次 topic 级智能体流的生命周期状态：消息列表、输入草稿、streaming/requestId、usage 记录。状态转移集中在 `src/shared/agentSession.ts`（纯状态机）+ `useAgentChatSession` hook（IPC 订阅与路由）。聊天页、终端抽屉、主机面板三个界面共用同一状态机。 | 单条 IPC 事件；React 组件树；会话持久化文件（那是 ChatSession） |
| **会话（topic）** | 用户可见的一段对话，有 topicId，持久化在 `chat-sessions/`。聊天页、终端抽屉（`terminal:<tabId>`）、主机面板各持有一批。 | 智能体会话（那是运行时状态）；终端 SSH 会话 |
| **智能体（agent）** | 一份 `AgentConfig`：人格（SOUL）、用户档案（USER）、模型绑定、工具/技能/MCP/知识库开关。 | 会话；智能体会话 |
| **流（stream）** | 主进程 `AiStreamManager` 按 topicId 单飞的 ToolLoopAgent 执行，经 `chat:stream:*` / `agent:stream:tool` 事件回推。 | 遗留 `agent:run` 同步路径（已删除）；HTTP SSE |
| **紧凑请求（compact request）** | `/compact` 压缩上下文触发的发送；done 时把摘要固化为 clear 标记 + `[上下文摘要]` 消息。 | 清除上下文（只插 clear 标记，不调模型） |
| **续跑（continue）** | maxTurns 到顶后的追加流：不插用户消息，只追加空 assistant 气泡。 | 重新发送；重试 |
