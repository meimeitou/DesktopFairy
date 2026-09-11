# ADR 0005 — 半结构化知识库与统一预注入

## 背景

初版知识库只有一种类型：分块 + embedding 向量检索。适合大段文档，但对 `.md / .json / .yaml` 等本身已经是"半结构化"的短文件不友好——切分会破坏语义整体，向量检索也常常召不回描述性内容。

Agent 侧原本通过 `kb_search` / `kb_read` 工具让模型自主决定何时检索。这带来两个问题：

- 用户明明勾选了知识库，模型可能不调用工具（"忘记查资料"）。
- 半结构化文件的选择粒度是"整篇文件"，不需要向量搜索，只需要根据"文件描述"由 LLM 挑选。工具形态不符合这一语义。

## 决策

1. **知识库分为两种类型（库级绑定，建库时选定，之后不可改）**：
   - `vector`：延续 v1 行为，分块 + embedding + 余弦相似度 top-K 检索。
   - `semi_structured`：不做向量化，只存原文和"文件描述"，由 LLM 按最近一轮 user message 挑选相关文件，整篇注入 system message。
2. **半结构化文件描述**：
   - 入库时若全局配置了"描述生成 LLM"，自动生成 200–500 字描述；否则占位为空。
   - 用户可在知识库详情页手动编辑或触发"AI 重新生成"。
   - 无描述的文件不参与筛选。
   - 允许扩展名：`.md .markdown .txt .json .yaml .yml`；不允许 `.pdf / .docx`。
   - 单文件大小上限与"单次注入最多文件数"在全局设置里可配置（默认 64KB / 3 个）。
3. **统一预注入（本 ADR 的第二个决策）**：
   - `chat:send` 保持"发送前根据 baseIds 检索并塞入 system message"的形态。
   - `ai:stream_open`（Agent 流）不再暴露 `kb_search` / `kb_read` 工具；改为在流开启前调用同一份 `buildKnowledgeInjection` helper，把检索结果拼接进 system prompt。
   - 混合选择多个库时，向量库走 top-K 片段、半结构化库走 LLM 挑文件全文，合并到同一 system message 中按类型分节。
4. **筛选调用的模型**：使用当前 chat / agent 对话正在使用的**主模型**（非描述生成模型）。仅将最近一轮 user message + 候选清单 `[{itemId, sourceName, description}]` 传入，返回严格 JSON `{ selectedIds }`。

## 后果

优点：

- 用户勾选即生效，模型不会"忘记查资料"。
- 半结构化库对角色人设、runbook、schema 说明等短文本资源友好。
- 全局配置一次描述生成模型即可批量入库。

代价 / 权衡：

- 每次开流都会做一次预筛选调用，token 有额外成本。为控制预算，`buildKnowledgeInjection` 内按顺序累计半结构化文件全文，超过预算时丢弃末尾文件。
- 模型不能再"决定是否查资料"——如果用户勾选了不相关的库，仍会花一次预筛选调用。UI 应引导用户按需勾选。
- 旧库缺少 `kind` 字段，`catalog.listBases` 归一化时视为 `vector`，行为不变。

## 迁移

- 旧的 `kb_search` / `kb_read` 工具定义仍保留在 `electron/knowledge/tools.cjs` 供参考，但已从 `DEFAULT_SAFE_TOOLS` 与 `agentBuiltinExecutors` 中移除，不会被 agent 使用。
- 旧知识库自动继承 `kind = 'vector'`。
