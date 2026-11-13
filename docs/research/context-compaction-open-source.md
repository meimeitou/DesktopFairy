# 开源 Agent 上下文压缩：源码调研与本项目审计

调研日期：2026-11-12。范围：OpenAI Codex `main`、OpenCode `dev` 的当前公开源码；链接指向可变分支，不代表某个已发布版本。仅记录可验证实现，不将客户端代码推断成服务端摘要算法。本文不修改业务代码。原有 `docs/` 尚无研究笔记目录，因此使用 `docs/research/`。产品架构见 [arch.md](../arch.md)。

## 结论

本项目最值得借鉴的是：**压缩较旧前缀并保留近期原文；在每个模型步骤检查实际请求预算；压缩成功后提交可持久化 checkpoint**。摘要调用自身也可能超限，需要逐级降载，而不是先按普通发送规则丢弃旧消息再总结。以下是源码事实；末节的实施顺序是针对本项目的建议。

## 1. Codex：区分本地摘要与远端原生 checkpoint

### 触发与循环位置

`ModelInfo::auto_compact_token_limit()` 默认取 resolved context window 的 90%，显式模型阈值也被这一上限约束。`context_window_token_status` 另外区分完整 active context 和配置作用域，不能把累计账单 token 当窗口占用。见 [openai_models.rs](https://github.com/openai/codex/blob/main/codex-rs/protocol/src/openai_models.rs) 和 [context_window.rs](https://github.com/openai/codex/blob/main/codex-rs/core/src/session/context_window.rs)。

`session/turn.rs:651–738` 在模型采样及工具完成后读取窗口状态；还需要后续步骤且触顶时执行自动压缩。因此压缩可发生在一次用户任务的工具循环中。见 [turn.rs](https://github.com/openai/codex/blob/main/codex-rs/core/src/session/turn.rs#L651)。

### 两条路径不能混为一谈

`tasks/compact.rs:50–90` 除独立 TokenBudget feature 外，按 provider capability 选择 `RemoteCompactionSupport::V2` 或 `Unsupported`：后者运行客户端编排的摘要请求。这里的“本地”指应用层负责提示词与历史替换，**不意味着在本机运行模型**。见 [tasks/compact.rs](https://github.com/openai/codex/blob/main/codex-rs/core/src/tasks/compact.rs#L50)。

| 路径 | 证据与行为 |
| --- | --- |
| 本地摘要 | `compact.rs` 的 `COMPACT_USER_MESSAGE_MAX_TOKENS = 20_000`，`build_compacted_history_with_limit` 从新到旧选择 user 原文，另加摘要；不是保留最近 20k 的完整工具对话。摘要请求超窗时移除最旧历史项再重试。见 [compact.rs:61](https://github.com/openai/codex/blob/main/codex-rs/core/src/compact.rs#L61)、[333–344](https://github.com/openai/codex/blob/main/codex-rs/core/src/compact.rs#L333)、[686 起](https://github.com/openai/codex/blob/main/codex-rs/core/src/compact.rs#L686)。 |
| 远端 V2 | 收集并要求恰好一个 `ResponseItem::Compaction`；客户端筛选保留消息、按 `RETAINED_MESSAGE_TOKEN_BUDGET = 64_000` 裁剪，再安装 checkpoint。普通 assistant 对话不会全部原样保留；user/hook、部分 agent 消息与 feature 控制的客户端内容有专门规则。见 [compact_remote_v2.rs:89](https://github.com/openai/codex/blob/main/codex-rs/core/src/compact_remote_v2.rs#L89)、[420–595](https://github.com/openai/codex/blob/main/codex-rs/core/src/compact_remote_v2.rs#L420)。 |

本地摘要 prompt 要求记录进展与决定、约束与偏好、后续工作和关键引用，但没有 OpenCode 那样固定的 Markdown 字段契约。见 [compact/prompt.md](https://github.com/openai/codex/blob/main/codex-rs/prompts/templates/compact/prompt.md)。远端原生输出有 opaque/encrypted compaction item，不能从开源客户端断言它内部使用相同摘要模板。

### 提交、持久化与错误边界

`CompactedHistoryMetadata` 明确说明 `replace_compacted_history` 在持久化前补齐 item ID，使 live/persisted 历史一致。恢复逻辑识别 `replacement_history`，重建 active history，而非仅靠界面上的摘要文本。见 [compact.rs:66](https://github.com/openai/codex/blob/main/codex-rs/core/src/compact.rs#L66)、[rollout_reconstruction.rs](https://github.com/openai/codex/blob/main/codex-rs/core/src/session/rollout_reconstruction.rs)。

远端预计算结果会校验模型与历史前缀；装入后仍超预算可再走一次 foreground compaction。见 [compact_remote_v2_installation.rs:13–84](https://github.com/openai/codex/blob/main/codex-rs/core/src/compact_remote_v2_installation.rs#L13)。

不要将“摘要请求超窗重试”扩大解释成“所有业务推理 overflow 都会自动恢复”：`turn.rs:1959` 对常规 `ContextWindowExceeded` 设置窗口已满并返回；另有特定 Guardian 预算分支单次压缩重试。见 [turn.rs:885](https://github.com/openai/codex/blob/main/codex-rs/core/src/session/turn.rs#L885)、[1958](https://github.com/openai/codex/blob/main/codex-rs/core/src/session/turn.rs#L1958)。

## 2. OpenCode：预算、近期文本与分层降载

当前实现已在 `packages/core/src/session/`，不应将旧 `packages/opencode` 版本常量直接套用到当前分支。

| 环节 | 当前源码证据 |
| --- | --- |
| 自动触发预算 | 默认 `auto: true, keep: 15_000, precompute: false`。`calculateCeiling` 使用 input/context 的有效窗口，默认预留 15%；窗口至少 32k 时预留量至少 16k，可配置绝对 token 或百分比 buffer。未知窗口不自动触发。见 [compaction.ts:246–307](https://github.com/anomalyco/opencode/blob/dev/packages/core/src/session/compaction.ts#L246)、[1081–1102](https://github.com/anomalyco/opencode/blob/dev/packages/core/src/session/compaction.ts#L1081)。 |
| 保留近期信息 | 本地摘要保存 `keepID`；历史读取时重建 recent 文本。`recentStart` 对齐 user 边界；15k 是目标预算，不是保证保留任意类型的完整原始 wire 消息。见 [compaction.ts:944–981](https://github.com/anomalyco/opencode/blob/dev/packages/core/src/session/compaction.ts#L944)、[history.ts:220–258](https://github.com/anomalyco/opencode/blob/dev/packages/core/src/session/history.ts#L220)。 |
| 结构化摘要 | 固定 Objective、Requirements、Decisions、Work State、Next Move、Relevant Files、Important Context；更新旧 checkpoint 时明确让较新信息优先。见 [compaction.ts:161–226](https://github.com/anomalyco/opencode/blob/dev/packages/core/src/session/compaction.ts#L161)。 |
| 工具结果降载 | 摘要输入过大时逐层缩短：tool output 裁剪、移除 output 并裁剪 input、只留 user 文本、最后才省略整轮；优先损失旧细节，最新 exchange 不被完全省略。此处是**摘要请求的文本化降载**，不能等同于后台永久删除原始 tool 记录。见 [compaction.ts:659–735](https://github.com/anomalyco/opencode/blob/dev/packages/core/src/session/compaction.ts#L659)、[995–1023](https://github.com/anomalyco/opencode/blob/dev/packages/core/src/session/compaction.ts#L995)。 |
| overflow 恢复 | provider 拒绝过长请求后，按首次被拒请求估计量的 85%、70%、50%、35% 依次尝试；payload-too-large 可先去掉媒体转文本；次数有界，最新内容不能再缩则失败。见 [compaction.ts:563–657](https://github.com/anomalyco/opencode/blob/dev/packages/core/src/session/compaction.ts#L563)。 |

OpenCode 也有 native 路径：endpoint 返回完整 replacement window，trigger 路径返回 checkpoint 并由客户端补 recent user messages；不是所有 provider 都通过本地 Markdown 摘要。持久化读取 `session_message` 中已完成 compaction；native window 仅在匹配 provider/model 且可解码时回放，否则回溯到可用边界。原始 transcript 仍可通过 local boundary 读取。见 [compaction.ts:515–561](https://github.com/anomalyco/opencode/blob/dev/packages/core/src/session/compaction.ts#L515)、[history.ts:24–80](https://github.com/anomalyco/opencode/blob/dev/packages/core/src/session/history.ts#L24)、[178–218](https://github.com/anomalyco/opencode/blob/dev/packages/core/src/session/history.ts#L178)。

## 3. DesktopFairy 当前审计

本节为主审计代理在同一工作区已核验的发现；不将开源实现直接当成本项目现状。

| 发现 | 本项目证据 | 影响 |
| --- | --- | --- |
| 摘要前已走普通发送裁剪 | [ChatPage.tsx](../../src/pages/ChatPage.tsx) `1099` 判定 compact，`1189–1207` 仍共用 `buildTrimOptions → trimMessagesForApi → buildAgentApiMessages`；[HostChatPanel.tsx](../../src/components/terminal/HostChatPanel.tsx) `477–510`、[TerminalAgentDrawer.tsx](../../src/components/terminal/TerminalAgentDrawer.tsx) `559–583` 同样 | 较旧但有价值的信息先被丢弃，摘要模型无法恢复。 |
| 成功后仅保留摘要为后续输入 | [agentSession.ts](../../src/shared/agentSession.ts) `275–308` 在全历史尾部追加 clear + user 摘要；[chatMessages.ts](../../src/shared/chatMessages.ts) `78` 的 `filterAfterContextClear` 从 clear 之后取上下文 | UI 旧历史仍在，但后续模型没有 recent 原文；abort/空摘要不会 clear。 |
| 摘要模板过于宽泛 | [slashCommands.ts](../../src/shared/slashCommands.ts) `121` | 缺少目标、约束、已完成/进行中/阻塞、下一步等稳定字段。 |
| 估算与实际载荷不完全一致 | [contextUsage.ts](../../src/shared/contextUsage.ts) `10` 的 `SEND_BUDGET_RATIO = .8`、固定 system overhead 2000；`89` 起估算未计 `toolArgs`，而 [chatMessages.ts](../../src/shared/chatMessages.ts) `374` 附近会序列化参数 | 工具输入很大时可能低估占用；固定 overhead 难以反映技能、工具 schema 与系统提示增长。 |
| 无统一循环中预算检查 | [steerableStream.cjs](../../electron/ai/steerableStream.cjs) `23–35` 的 `prepareStep` 注入消息和完整 ledger；`49–54` usage 是合计 | 一次用户输入内长工具循环也可能溢出；累计 usage 不能直接充当最后一步窗口占用。 |

## 4. 建议实施顺序（方案建议，尚未实现）

1. **先修手动 compact 的信息损失**：对当前 active history 划分“待总结前缀 + recent suffix”，专用摘要流程成功后提交 checkpoint，并保留近期原文；不要让摘要前缀先走普通发送的截断。前缀自身太大时，先缩短旧工具结果，必要时分段/递归摘要。
2. **专用摘要调用**：禁用工具，使用结构化字段，保留用户原要求、关键决定、已完成事项、未完成事项、阻塞和关键文件/命令。摘要失败、取消、空结果、并发历史变化时不替换现有有效上下文。
3. **main 统一预算**：在每次 `prepareStep` 构建实际请求时纳入 system、工具定义、参数、结果、注入消息及输出预留；优先使用最近一次 provider usage 校准新增内容估算。多个 UI 共用一套策略。
4. **持久化边界**：把 checkpoint、覆盖范围、recent 起点、策略版本与 usage 基线作为显式状态保存；UI transcript 与模型 active context 分开，重启/重连重建同一上下文。
5. **有界 overflow 恢复**：识别窗口错误后执行一次降载/压缩并重试被拒的模型请求；保留已执行工具 ledger，不从头重跑有副作用工具。效果不佳则明确失败，避免无限循环。

验证重点应是：摘要前覆盖正确、recent 不重复/不丢失、工具调用与结果配对、取消不覆盖、并发不回滚、重连一致、超窗恢复不重复副作用。

## 实现进展

上述审计记录的是修改前状态。两步方案已在当前工作区实现，现行策略与边界见 [架构文档的压缩策略与恢复](../arch.md)。本笔记保留源码对照与原始审计，便于理解设计动机。
