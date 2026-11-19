# 智能体上下文管理

模块关系见 [产品架构](arch.md)，压缩方案背景见 [开源实现调研](research/context-compaction-open-source.md)。本页记录当前行为；调研中的旧版审计不代表当前实现。

## 工具结果先减量，历史仍超限才摘要

`electron/ai/AiService.cjs` 为每次智能体执行创建按 topic 隔离的结果存储，并将它传给工具层和压缩器。每次模型步骤前，压缩器计算系统提示、工具定义、消息和单步 usage 校准后的占用。

1. `buildToolSet.cjs` 在工具返回时限制模型可见结果，预算为模型窗口的 5%，最多 8k、至少 256 个估算 tokens。超量结果先完整落盘，再返回片段和 `resultId`。工具错误状态保留。
2. 如果下一步仍达到窗口的 80%，`contextCompaction.cjs` 先进一步裁剪工具结果；不改用户原文、不拆工具调用与结果配对。减量足够时不调用摘要模型、不发 checkpoint。
3. 仍超预算时，原有 checkpoint 流程总结旧前缀并保留安全的近期后缀。真正的模型上下文溢出支持一次减量/摘要后的重试，不重复此前已完成的工具。

这些 tokens 都是启发式估算，不是 tokenizer 精确计数；用量校准取单步输入 usage，不是累计账单。

## 原文补读

工具层自动提供只读的 `read_tool_result({ resultId, offset?, maxTokens? })`，无需新 IPC。`offset` 为 JavaScript 字符串索引；使用返回的 `nextOffset` 继续读取。默认每页 2k、最大 4k 个估算 tokens，小窗口模型会进一步限制。分页不会再次执行原工具。

原文保存在 `userData/chat_tool_results/<topicId>/context-<sha256>.json`，以完整写入后原子发布的方式提交。读取只能访问当前 topic 的合法资源 ID，不能传文件路径。资源沿用话题删除生命周期；分叉复制引用到的资源及其传递引用，删除源话题不会破坏分叉。renderer 在后续轮次组装精简工具证据时保留资源 ID。

## 网络工具

- WebFetch 使用 HTML parser 提取 `main` / `article` 或 body 文本，排除脚本、样式和导航等内容。正文及原始响应分别提供 `resultId` 和 `rawResultId`。纯文本保持原文。
- 每页预览最多 2k tokens，整批正文预览最多 3k tokens；统一工具层再检查包含元数据的总结果。一次仍最多 20 个 URL。
- 响应体流式读取，上限 4 MiB；超限明确报错，不把静默截断的响应当作完整网页。抓取服从执行取消信号。
- WebSearch 保存完整搜索结果，每条内容最多预览 600 tokens，统一工具层再次限制整份结果。
- MCP 格式化不再提前按 512K 字符截断文本；统一工具层负责保存原文和控制模型输入。

## 模型窗口覆盖

在「设置 → AI 模型 → 上下文窗口」为已启用的对话模型填写服务商实际容量，留空恢复默认。配置位于 `providers[].modelContextWindows[modelId]`，通过既有 `settings:sync` 路径保存和广播。

主进程从 settings snapshot 解析实际 provider/model 的覆盖值，renderer 三个聊天面的用量估算采用同一配置。合法范围为 4,096～10,000,000；未知模型没有覆盖值时仍采用 128k 默认值。覆盖值不改变服务商实际支持的上下文长度。
