# 知识库 V1 领域模型

与 [glossary.md](./glossary.md) 使用同一套词。决策来源见 `adr/`。本文是实现对照，不是再开一轮访谈。

## 边界

知识库是独立限界上下文：建库、入库、索引、检索 API。对话 / 终端只保存 **检索范围**（`knowledgeBaseIds`）并调用检索；不拥有条目。

设置拆成两块，都走现有 `da_settings` 同步：

| 设置项 | 内容 |
|--------|------|
| 知识库 | 全局 embedding 模型、`topK`、匹配度阈值、`chunkSize`、`chunkOverlap` |
| 文档处理 | 当前处理器、`mineru` / `open-mineru` 的 Key 与地址 |

ChatApp 第四 Tab「知识库」是资料工作区，不是上述配置页。

## 实体

```text
KnowledgeSettings (全局 1)
  embeddingProviderId, embeddingModel
  topK (default 5)
  scoreThreshold (default 0.5)   // 余弦匹配度，低于则视为不相关
  chunkSize (default 1024)
  chunkOverlap (default 200)

FileProcessingSettings (全局 1)
  processorId: 'mineru' | 'open-mineru'   // 当前选用的处理器
  mineru: { apiKey, apiHost }
  openMineru: { apiHost, apiKey? }

KnowledgeBase
  id, name
  createdAt, updatedAt
  items: KnowledgeItem[]
  files: userData/knowledge/{baseId}/raw/…
  index: userData/knowledge/{baseId}/index.sqlite   // sqlite-vec

KnowledgeItem
  id, baseId
  type: 'file' | 'note'
  status: pending | processing | completed | failed
  error?: string
  sourceName                  // 展示标题 / 原始文件名
  relativePath?               // 文件副本相对 raw/
  indexedRelativePath?        // PDF 处理器产出的 MD，索引读这个
  noteContent?                // 仅 note；上限约 10 万字
  createdAt, updatedAt

ChatTopic.knowledgeBaseIds: string[]    // 对话检索范围
terminal tab → 同结构，随 tab 生命周期   // 不跨启动恢复
```

创建知识库只需 **名称**。不选 embedding、不选处理器（两者都在全局设置）。

## 条目状态

```text
        加入 / 重建 / 重新处理
                │
                ▼
            pending ──────────────────────────────┐
                │ 队列取到                          │ 进程退出或崩溃
                ▼                                  ▼
           processing ──────────────────────► failed
                │ 预处理 + 分块 + embedding           ▲
                ▼                                    │
            completed                                │
                │                                    │
                └──── 空文本 / 超时 / 无处理器 / ──────┘
                      无 embedding / API 错误
```

- `processing` 时不可取消；要停就等失败或删除条目。
- 失败可「重新处理」→ 回到 `pending`。
- 编辑笔记内容 = 该条重新入队。
- 改全局 embedding 或 chunk：所有库清空索引，全部条目 → `pending` 再入队（先确认）。改 `topK` / 匹配度阈值不重建。

## 入库主路径

```text
选文件（≤20，扩展名白名单，≤100MB）
  → 同名冲突对话框（逐行保留两者 / 替换；可全选）
  → 拷贝进 raw/（保留两者则加后缀）
  → 条目 pending
  → 若未配置全局 embedding：拦截，横幅去设置
  → txt/md：读文本
    docx：本地抽取
    pdf：使用全局文档处理器，未配置则 failed；全局同时只跑 1 个 PDF 任务；超时 10 分钟
  → 结构化分块（全局 chunkSize / overlap）
  → embedding（批约 10）写入该库 index.sqlite
  → completed
```

笔记：详情内 Markdown 编辑 + 预览 → 快照为文本 → 同一条分块/embedding 路径。无行内图。

## 检索主路径

检索范围 = 当前 topic（或终端 tab）勾选的库。空 = 不检索、不挂 kb 工具。

1. 用全局 embedding 把用户问题（或工具 query）向量化。
2. 每个选中且有可用索引的库：余弦检索，丢掉低于 **匹配度阈值** 的分块，再取 topK。
3. 按分数合并，截断到全局 `topK`。低于阈值的不注入、不作为 `kb_search` 命中。
4. 普通对话：注入当次 API 上下文；气泡下来源引用（popover 看片段，可跳转知识库 Tab）。
5. 智能体 / 终端：勾选了库则带上 `kb_search` / `kb_read`；`kb_read(itemId)` 读预处理全文（过长截断）。

未配置 embedding、库 failed、或没有 `completed` 条目：明确错误，不静默当没选库。全部低于阈值：当次无资料，不报错。

召回测试：当前知识库详情右上，输入问题后对该库跑同一条检索路径（可临时改 topK / 匹配度），列出分块与分数；低于阈值的灰色标出。不写入 topic、不改全局配置。

## UI 挂点

| 表面 | 行为 |
|------|------|
| ChatApp 顶栏 | 第四 Tab「知识库」，keep-alive，不自动改窗口尺寸 |
| 知识库 Tab | 左列表 + 右条目列表（添加数据 → 文件 / 笔记弹窗；召回测试走当前库） |
| 对话输入栏 / 终端助手栏 | 多选知识库，写入 topic |
| 知识库页左下角设置 | 全局 embedding、topK、匹配度阈值、chunk |
| 设置 → 文档处理 | 选用 MinerU / Open MinerU 并配置凭证 |

## 明确不做（V1）

目录/URL、本机 `local-document`、hybrid/BM25、rerank、每库 embedding、默认检索库、笔记 App、kb grep、持久化 Job 续跑、切 Tab 自动放大窗口。
