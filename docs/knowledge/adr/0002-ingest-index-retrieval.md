# ADR 0002 — 入库、索引与检索范围

- 状态：已采纳（访谈第 2 轮）
- 日期：2026-09-05
- 前置：[0001](./0001-v1-product-decisions.md)

## 决策

### 预处理路由

- `txt` / `md`：本地直接读，不经文档处理器。
- `docx`：本地抽取（如 mammoth），不经文档处理器。
- **仅 PDF** 走设置里当前选中的文档处理器。
- 未配置该处理器凭证时，加入的 PDF **失败**（不静默用文本层抽取），条目错误提示去设置 → 文档处理。扫描件应改用 MinerU，不能假装已索引。

本机 `local-document` **不做**（见 [0003](./0003-chunking-ui-tools.md)）。无文本层的 PDF 只能走 MinerU / open-mineru。

### 处理器配置

- 设置一级新增「文档处理」：配置当前选用的预置处理器的凭证与地址。
- V1 预置：**仅** `mineru`（官方 API）与 `open-mineru`（自托管）。不做 `local-document`。
- 全应用只选其中一个。未配置凭证则 PDF 失败；不按知识库分别选择。

### 存储

- 每个知识库一份 SQLite + sqlite-vec，与 `userData` 下该库的文件副本目录对应。
- 全应用一个 embedding 模型，因此各库向量维度相同；更换全局模型必须重建**所有**库的索引（见 [0004](./0004-global-rag-config.md)）。

### 入库执行

- 主进程内存队列；条目状态落盘。
- 可观察状态：`pending` | `processing` | `completed` | `failed`。
- 重启或崩溃：中断中的条目标 `failed`，**不自动重试**（避免静默消耗 MinerU/embedding 配额）。用户手动「重新处理」。

### 检索范围

- 勾选集合写在 **对话 topic** 上，随会话持久化；后续消息沿用，输入栏可改。
- 终端：跟当前终端 tab 的 agent topic（`terminal:${tabId}`）走。终端 tab 本身是内存态，关 tab 后勾选不必跨启动恢复。
- 无全局默认库。

### 普通对话

- 发送前用当前用户问题检索，`topK` 来自全局配置（默认 5，见 [0004](./0004-global-rag-config.md)）。
- 命中写入当次模型上下文；助手气泡下展示来源引用。
- 不把检索原文整篇存进 `ChatSession.messages`。

### 智能体 / 终端工具

- 当次发送勾选了 ≥1 个知识库 → 自动附带只读 `kb_search` / `kb_read`。
- 未勾选 → 不出现这些工具。
- 不受终端默认禁用文件系统工具的影响。

## 后果

- 设置侧栏 `MENU_PRIMARY` 增加「文档处理」；所有知识库共用当前选中的处理器。
- `ChatTopic`（或等价字段）增加 `knowledgeBaseIds: string[]`。
- 打包链路必须能编过 `better-sqlite3` + `sqlite-vec` 原生模块。
- 普通对话与智能体的引用 UI 形态不同（气泡下来源 vs 工具调用卡片）。
