# 工具审批「始终允许」按钮实现计划

## 需求概述

智能体工具调用审批卡片当前默认是普通模式，每次工具调用都需要用户手动批准。需要在审批按钮区域最左侧（「拒绝」按钮的左边）新增一个显眼的「始终允许」按钮。点击后：
1. 批准当前工具调用（等同于点击「允许」）。
2. 立即将当前 session 的对话模式切换为「全自动模式」（full-auto），后续工具调用不再询问。

## 现状分析

当前代码中**尚未实现**此功能。经检查：

- `ToolPermissionCard.tsx`：只有 `onApprove` / `onDeny` 两个回调，按钮区域只有「拒绝」和「允许」两个按钮。
- `ToolCallBubble.tsx`：`ToolStepProps` / `GroupProps` / `BubbleProps` 三个接口均无 `onAlwaysAllow` 字段。
- `ChatPage.tsx`：无 `handleAlwaysAllowTool` 函数，渲染 `ToolCallGroup` / `ToolCallBubble` 时未传递 `onAlwaysAllow`。
- `ChatPage.css`：无 `.agent-tool-btn-always-allow` 样式。

关键代码位置：
- `respondToolApproval`：ChatPage.tsx:378
- `handleApproveTool`：ChatPage.tsx:398
- `handleDenyTool`：ChatPage.tsx:405
- `handleChatModeChange`：ChatPage.tsx:770
- `ToolCallGroup` / `ToolCallBubble` 渲染处：ChatPage.tsx:1112-1130
- 审批按钮容器 `.agent-tool-permission-actions`：ChatPage.css:825
- 按钮基础样式 `.agent-tool-btn`：ChatPage.css:834

**重要约束**：`handleAlwaysAllowTool` 需要引用 `handleChatModeChange`（定义在 line 770）。由于两者都是 `useCallback`，如果将 `handleAlwaysAllowTool` 放在 `handleChatModeChange` 之前，其依赖数组会引用尚未初始化的 `const` 变量，触发 TDZ（Temporal Dead Zone）错误。因此 `handleAlwaysAllowTool` 必须放在 `handleChatModeChange` 之后（line 781 之后）。

## 修改方案

### 文件 1：`src/components/chat/agentTools/ToolPermissionCard.tsx`

**目的**：在审批卡片中新增「始终允许」按钮。

修改内容：
1. `Props` 接口新增 `onAlwaysAllow?: (approvalId: string) => void`。
2. 函数参数解构新增 `onAlwaysAllow`。
3. 在 `.agent-tool-permission-actions` 容器内、「拒绝」按钮之前插入「始终允许」按钮：
   - className: `agent-tool-btn agent-tool-btn-always-allow`
   - 内含 SVG 对勾图标 + "始终允许" 文字
   - disabled 条件: `submitting || !canApprove`
   - onClick: `() => msg.toolApprovalId && onAlwaysAllow?.(msg.toolApprovalId)`
   - title: `"批准本次并切换为全自动模式，后续工具调用不再询问"`

按钮顺序变为：**[始终允许] [拒绝] [允许]**（从左到右）。

### 文件 2：`src/components/chat/ToolCallBubble.tsx`

**目的**：将 `onAlwaysAllow` 从顶层透传到 `ToolPermissionCard`。

修改内容：
1. `ToolStepProps` 接口新增 `onAlwaysAllow?: (approvalId: string) => void`。
2. `AgentToolStep` 参数解构新增 `onAlwaysAllow`，传给 `<ToolPermissionCard>`。
3. `GroupProps` 接口新增 `onAlwaysAllow`。
4. `ToolCallGroup` 参数解构新增 `onAlwaysAllow`，传给每个 `<AgentToolStep>`。
5. `BubbleProps` 接口新增 `onAlwaysAllow`。
6. `ToolCallBubble` 参数解构新增 `onAlwaysAllow`，传给 `<ToolCallGroup>`。

### 文件 3：`src/pages/ChatPage.tsx`

**目的**：实现 `handleAlwaysAllowTool` 回调，并传递给渲染的组件。

修改内容：
1. 在 `handleChatModeChange`（line 781）之后新增 `handleAlwaysAllowTool`：
   ```typescript
   const handleAlwaysAllowTool = useCallback(
     (approvalId: string) => {
       void respondToolApproval(approvalId, true);
       handleChatModeChange("full-auto");
     },
     [respondToolApproval, handleChatModeChange],
   );
   ```
2. 在渲染 `ToolCallGroup`（line 1114）处新增 `onAlwaysAllow={handleAlwaysAllowTool}`。
3. 在渲染 `ToolCallBubble`（line 1122）处新增 `onAlwaysAllow={handleAlwaysAllowTool}`。

### 文件 4：`src/pages/ChatPage.css`

**目的**：为「始终允许」按钮添加显眼样式。

修改内容：
1. 更新 `.agent-tool-btn` 基础样式，增加 `display: inline-flex; align-items: center; gap: 4px;` 以支持图标+文字水平排列。
2. 新增 `.agent-tool-btn-always-allow` 样式：
   - 背景：橙色渐变 `linear-gradient(135deg, #f97316 0%, #ea580c 100%)`（与全自动模式 accent 色 `#f97316` 一致）
   - 文字：白色，`font-weight: 500`
   - 边框：`rgba(255, 255, 255, 0.15)`
   - 阴影：`0 1px 4px rgba(249, 115, 22, 0.35)`
3. 新增 `.agent-tool-btn-always-allow:hover:not(:disabled)` 样式：
   - 背景加深：`linear-gradient(135deg, #fb923c 0%, #f97316 100%)`
   - 阴影增强：`0 2px 8px rgba(249, 115, 22, 0.5)`

## 假设与决策

1. **按钮颜色选择橙色**：与全自动模式的 accent 色 `#f97316` 保持一致，视觉上提示用户点击后会切换到全自动模式。
2. **按钮位置**：放在「拒绝」按钮左侧（即最左边），符合用户要求。
3. **TDZ 规避**：`handleAlwaysAllowTool` 放在 `handleChatModeChange` 之后声明，避免引用未初始化的 `const`。
4. **模式切换即时生效**：`handleChatModeChange` 通过 `saveSettings` 写入 localStorage 并更新 React 状态。当前正在进行的 agent 请求的 `agentConfig` 已在 `agent:run` 时传入，不会回溯修改，但本次审批已通过 `respondToolApproval` 放行，不会阻塞当前流程。后续新请求将使用新的 `full-auto` 模式。

## 验证步骤

1. 运行 `make lint` 确认无 ESLint 错误。
2. 运行 `npm run build` 确认 TypeScript 编译通过。
3. 启动应用 `make dev`，在智能体对话中触发需要审批的工具调用。
4. 确认审批卡片按钮顺序为：**[始终允许] [拒绝] [允许]**。
5. 点击「始终允许」：
   - 当前工具调用继续执行。
   - 模式指示器切换为「全自动模式」（橙色）。
   - 后续工具调用不再弹出审批卡片。
