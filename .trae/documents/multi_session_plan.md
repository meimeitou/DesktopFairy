# 多会话支持 (Multi-Session) 实现计划

## 1. 调研总结

### 当前架构分析
- **单会话存储**：`electron/chatSessionService.cjs` 提供 `chat:session:load` 和 `chat:session:save` IPC 通道，只读写一个固定的 `da_chat.json` 文件
- **前端实现**：`src/pages/ChatPage.tsx` 管理单一 `messages` 数组
- **数据模型**：`src/shared/chatSession.ts` 定义了 `ChatSession` 接口
- **核心约束**：`AGENTS.md` 明确指出 "Multi-window via query param" 但未支持多会话

### Cherry-Studio 参考
Cherry-Studio 使用 `Topic` 概念组织会话：
- **Topic 实体**：包含 `id`, `name`, `createdAt`, `updatedAt`, `groupId`, `orderKey`
- **Topic 列表**：左侧 Sidebar 显示所有 Topic，支持搜索、右键菜单（删除、重命名、导出）
- **数据持久化**：通过 `useTopic` hook 管理 Topic CRUD
- **消息关联**：每个 Topic 拥有独立的消息列表

### 技术方案
基于 Electron + IPC 的纯文件存储方案，无需数据库。

---

## 2. 架构设计

### 数据模型扩展
```typescript
// src/shared/chatSession.ts
interface ChatTopic {
  id: string;           // crypto.randomUUID()
  name: string;         // 初始为空，首条消息后自动生成
  createdAt: number;
  updatedAt: number;
  orderKey: number;     // 用于排序，越新越大
}

// 存储结构: userData/da_chat_topics.json
interface ChatTopicsStore {
  version: 1;
  activeId: string;
  topics: ChatTopic[];
}

// 每个会话存储: userData/chat_sessions/{topicId}.json
// 保持现有 ChatSession 结构不变
```

### 文件结构
```
userData/
├── da_settings.json
├── da_chat_topics.json          ← NEW: Topic 列表索引
└── chat_sessions/
    ├── {topicId-1}.json        ← 会话 1
    ├── {topicId-2}.json        ← 会话 2
    └── ...
```

### IPC 通道扩展
在 `electron/chatSessionService.cjs` 中新增：
- `chat:topics:list` → 获取所有 Topic
- `chat:topics:create` → 创建新 Topic
- `chat:topics:delete` → 删除 Topic（同时删除会话文件）
- `chat:topics:rename` → 重命名 Topic
- `chat:session:load` → 扩展支持 `topicId` 参数
- `chat:session:save` → 扩展支持 `topicId` 参数
- `chat:session:title` → 根据首条消息自动生成 Topic 标题

### UI 设计
参考 Cherry-Studio 风格，在 ChatPage 左侧添加 Topic 列表栏：

```
┌──────────────────────────────────────────────────┐
│  [+ 新对话]  [搜索框]   │  顶部 Header（模型选择等）│
├──────────────────────────────────────────────────┤
│  📝 新对话              │                          │
│  💬 会话 A              │     消息气泡区域          │
│  💬 会话 B (active)     │                          │
│  💬 会话 C              │                          │
│                        │                          │
├──────────────────────────────────────────────────┤
│  [输入框]              │  底部输入区               │
└──────────────────────────────────────────────────┘
```

---

## 3. 实施步骤

### Step 1: 扩展数据层
1. **修改** `src/shared/chatSession.ts`
   - 添加 `ChatTopic` 接口
   - 添加 `ChatTopicsStore` 接口
   - 添加 Topic CRUD 工具函数
   - 添加 `generateTopicTitle()` 函数（从首条用户消息截取前 20 字）

2. **修改** `electron/chatSessionService.cjs`
   - 扩展现有 load/save 支持 `topicId` 参数
   - 新增 Topic 管理 IPC handlers
   - 实现会话文件按 Topic ID 分文件存储
   - 实现 Topic 列表持久化

3. **修改** `electron/preload.cjs`
   - `allowedChannels` 添加 `chat:topics:*` 通道

### Step 2: 创建 Topic 列表 UI
4. **新建** `src/components/chat/TopicSidebar.tsx`
   - Topic 列表组件
   - 新对话按钮
   - 搜索过滤
   - 右键菜单（重命名、删除）
   - 空状态提示

5. **新建** `src/components/chat/TopicSidebar.css`
   - 侧边栏样式

### Step 3: 集成到 ChatPage
6. **修改** `src/pages/ChatPage.tsx`
   - 添加 `topics` state 和 `activeTopicId` state
   - Topic 切换时加载对应会话
   - 新对话时创建新 Topic + 加载空会话
   - 删除 Topic 时确认并清理数据
   - 首条消息发送后自动命名 Topic
   - 恢复：单 Topic 架构平滑迁移

7. **修改** `src/pages/ChatPage.css`
   - 适配左侧 Topic 侧边栏布局
   - 主内容区调整为 flex: 1

### Step 4: 迁移与兼容
8. **添加** 数据迁移逻辑
   - 首次加载时检测是否存在旧的 `da_chat.json`
   - 迁移旧数据到 `chat_sessions/{defaultId}.json`
   - 创建默认 Topic 映射

---

## 4. 关键实现细节

### Topic 自动命名
```typescript
// 从首条用户消息自动生成标题
function generateTopicTitle(firstUserMessage: string): string {
  const trimmed = firstUserMessage.trim();
  if (!trimmed) return "新对话";
  return trimmed.length > 20 ? trimmed.slice(0, 20) + "..." : trimmed;
}
```

### Topic 文件存储
```javascript
// electron/chatSessionService.cjs
const path = require('path');

const SESSIONS_DIR = () => path.join(app.getPath('userData'), 'chat_sessions');
const TOPICS_INDEX = () => path.join(app.getPath('userData'), 'da_chat_topics.json');

// 按 topicId 存储独立会话文件
function sessionFilePath(topicId) {
  return path.join(SESSIONS_DIR(), `${topicId}.json`);
}
```

### Topic 列表持久化
```javascript
// 每个 Topic 包含:
{
  id: "uuid",
  name: "会话标题",
  createdAt: 1710000000000,
  updatedAt: 1710000000000,
  orderKey: 1710000000000  // 用 updatedAt 做排序
}
```

### 右键菜单
参考 Cherry-Studio 的 Topics 组件：
- 双击 Topic → 重命名
- 右键 Topic → 显示菜单
  - 重命名
  - 删除（带确认对话框）
  - 导出（可选增强）

---

## 5. 风险与处理

| 风险 | 处理方案 |
|------|---------|
| 现有会话数据丢失 | 首次启动时自动迁移 `da_chat.json` → 默认 Topic |
| Topic 文件损坏 | try/catch 包裹文件读写，损坏时返回空会话 |
| 会话文件过大 | 复用现有 `trimSessionForStorage` 限制 |
| Topic 数量过多 | 侧边栏滚动 + 搜索过滤 |
| 并发写入冲突 | 单进程应用，IPC handler 顺序执行 |

---

## 6. 文件修改清单

### 新建文件
- `src/components/chat/TopicSidebar.tsx`
- `src/components/chat/TopicSidebar.css`

### 修改文件
- `src/shared/chatSession.ts`
- `electron/chatSessionService.cjs`
- `electron/preload.cjs`
- `src/pages/ChatPage.tsx`
- `src/pages/ChatPage.css`
