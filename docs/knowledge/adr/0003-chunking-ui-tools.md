# ADR 0003 — 分块、界面与工具

- 状态：已采纳（访谈第 3 轮）
- 日期：2026-09-05
- 前置：[0002](./0002-ingest-index-retrieval.md)

## 决策

### 本机文档处理器

- V1 **不提供** `local-document`（不下载本机 OCR，也不做纯文本层抽取作为处理器预置）。
- 可用预置只有 `mineru` 与 `open-mineru`。
- 知识库未配置全局文档处理器时，PDF 条目失败（与 [0002](./0002-ingest-index-retrieval.md) 路由一致）。文字 PDF 若用户也不愿配 MinerU，则本版不能入库 PDF。

### 分块

- ~~全应用固定且不露出参数~~ **已由 [0004](./0004-global-rag-config.md) 取代**：`chunkSize` / `chunkOverlap` / `topK` 全局可配，所有知识库共用。默认值仍为 1024 / 200 / 5。

### 检索栈

- V1 **仅向量检索**（余弦）。不做 BM25 / hybrid，不接入 rerank（rerank 模型仍可在设置里策展，本链路不用）。
- 多库合成：因 embedding 全局唯一，余弦分可比；每库各取 `topK`，按分数合成后再截断到全局 `topK`。见 [0004](./0004-global-rag-config.md)。

### 知识库 Tab

- ChatApp 第四 Tab：左侧知识库列表，右侧条目列表（右上「添加数据」选文件或笔记）。embedding 与文档处理器都不在单库上选。
- 不因切入该 Tab 自动改窗口尺寸（当前约 853×520）；详情内部滚动。
- 笔记在弹窗中编辑（标题 + Markdown + 预览），不新开窗口。
- 召回测试：当前库详情、添加数据左侧。走与对话相同的向量检索，展示分块与余弦分；topK / 匹配度可临时改，不落盘。低于阈值的分块标出但不算相关。不保存测试历史。

### 建库与换模型

- ~~创建必填名称 + embedding~~ **已由 [0004](./0004-global-rag-config.md) 取代**：创建必填名称。全局 embedding / 换模型重建范围见 0004。文档处理器改为全局选用，不按库。

### 笔记与 `kb_read`

- 笔记：Markdown 文本框 + 预览切换，内容上限约 10 万字。无行内图片、无独立 grep 工具。
- `kb_search` 返回带 `itemId` 的片段。
- `kb_read` 按 `itemId` 读取该条目预处理后的全文；过长截断并说明。

## 刻意不做（本轮追加）

- 本机 PDF 处理器 / 本机 OCR 模型下载
- 每库不同的 chunk / topK / embedding
- hybrid FTS、rerank
- 换模型时另存新库（Cherry restore）
- 笔记富文本、kb grep

## 后果

- 没有 MinerU / open-mineru 配置时，V1 只能入库 `txt` / `md` / `docx` 与笔记。
- sqlite-vec 表结构只需向量检索，不必上 FTS5。
- 聊天窗口偏矮，知识库详情必须以紧凑列表 + 滚动为主，不能照搬 Cherry 三栏。
