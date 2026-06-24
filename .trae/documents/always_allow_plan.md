# 工具审批「始终允许」按钮实现计划

## 需求概述

在智能体工具调用审批卡片中，默认是普通模式（每个工具调用都需要用户手动批准）。为了提升使用体验，需要在审批区域最左侧（即「拒绝」按钮的左边）新增一个显眼的「始终允许」按钮。

点击该按钮的行为：
1. 批准当前这一次工具调用（等同于点击「允许」）。
2. 立即把当前 session 的对话模式切换为「全自动模式」（full-auto），后续工具调用不再询问，直接执行。

## 现状调研

根据对代码的检查，相关实现已经基本就绪：

- `src/components/chat/agentTools/ToolPermissionCard.tsx`：已存在 `onAlwaysAllow` prop，按钮已渲染在 `.agent-tool-permission-actions` 容器内，位置为「拒绝」按钮之前。
- `src/components/chat/ToolCallBubble.tsx`：`ToolStepProps` / `GroupProps` / `BubbleProps` 都已包含 `onAlwaysAllow`，并在 `AgentToolStep`、`ToolCallGroup`、`ToolCallBubble` 中透传。
- `src/pages/ChatPage.tsx`：已实现 `handleAlwaysAllowTool`，内部调用 `respondToolApproval(approvalId, true)` 批准本次请求，同时调用 `handleChatModeChange("full-auto")` 切换模式。在渲染 `ToolCallGroup` / `ToolCallBubble` 时已将 `onAlwaysAllow` 传入。
- `src/pages/ChatPage.css`：已有 `.agent-tool-btn-always-allow` 样式，紫色渐变背景、白色文字、带阴影、带对勾图标。

TypeScript 诊断：上述三个文件均无诊断错误。

## 涉及文件

1. `src/components/chat/agentTools/ToolPermissionCard.tsx`
   - 按钮位置：`.agent-tool-permission-actions` 容器内，位于「拒绝」按钮之前（HTML 顺序即视觉顺序）。
   - 按钮样式：`agent-tool-btn agent-tool-btn-always-allow`。
   - 图标：内联 SVG 对勾。
   - `title`："批准本次并切换为全自动模式，后续工具调用不再询问"。

2. `src/components/chat/ToolCallBubble.tsx`
   - 为 `ToolStepProps`、`GroupProps`、`BubbleProps` 添加 `onAlwaysAllow?: (approvalId: string) => void`。
   - 透传链路：`ToolCallBubble` → `ToolCallGroup` → `AgentToolStep` → `ToolPermissionCard`。

3. `src/pages/ChatPage.tsx`
   - 新增 `handleAlwaysAllowTool(approvalId)`：先 `respondToolApproval(approvalId, true)`，再 `handleChatModeChange("full-auto")`。
   - 在渲染 `ToolCallGroup` 与 `ToolCallBubble` 时，将 `onAlwaysAllow={handleAlwaysAllowTool}` 传入。

4. `src/pages/ChatPage.css`
   - `.agent-tool-btn-always-allow`：紫色渐变背景、白色文字、边框半透明白、带柔和阴影。
   - `:hover` 状态下颜色加深、阴影增强。
   - `.agent-tool-btn` 基础样式支持 `inline-flex` + `gap: 4px`，图标与文字水平对齐。

## 修改步骤

### 步骤 1：在 ToolPermissionCard 中加入按钮
- 在 `agent-tool-permission-actions` 容器内、「拒绝」按钮之前插入按钮。
- 添加 `onAlwaysAllow` prop，点击时调用 `onAlwaysAllow?.(msg.toolApprovalId)`。
- 仅在 `submitting || !canApprove` 时禁用。

### 步骤 2：透传 onAlwaysAllow 到所有中间组件
- `ToolCallBubble.tsx` 中的 `ToolStepProps`、`GroupProps`、`BubbleProps` 接口均新增 prop。
- `AgentToolStep`、`ToolCallGroup`、`ToolCallBubble` 内部向下透传。

### 步骤 3：在 ChatPage 中处理回调并切换模式
- 新增 `handleAlwaysAllowTool`：先批准当前审批，再调用 `handleChatModeChange("full-auto")`。
- 在 `ToolCallGroup`、`ToolCallBubble` 渲染处均传入 `onAlwaysAllow={handleAlwaysAllowTool}`。

### 步骤 4：CSS 样式
- 为 `.agent-tool-btn-always-allow` 设置显眼的紫色渐变背景、对勾图标、hover 态。
- 调整 `.agent-tool-btn` 基础样式支持图标+文字水平排列。

## 风险与注意事项

1. **模式切换生效时机**：`handleChatModeChange` 会立即写入 `localStorage`（通过 `saveSettings`）并更新 React 状态。后续新建请求会使用新的 `chatMode`。当前正在进行的 agent 调用由于 `agentConfig` 已在 `agent:run` 时传入，不会回溯修改——但本次按钮对应的工具审批已通过 `respondToolApproval` 允许通过，因此不会阻塞当前流程。

2. **代码位置顺序**：`handleAlwaysAllowTool` 引用了后面声明的 `handleChatModeChange`。由于两者都是 `useCallback` 且仅在事件回调中执行（而非渲染期求值），不会触发 TDZ 问题，运行时均已初始化。

3. **TypeScript 诊断**：已检查，相关文件目前均无错误。

4. **UI 对比度**：紫色渐变在深色主题下对比度良好；若未来切换浅色主题，需要单独调整该按钮配色。

## 验证方式

- 打开智能体对话窗口，触发一个需要审批的工具调用（例如命令执行类工具）。
- 确认审批卡片上按钮顺序为：**[始终允许]  [拒绝]  [允许]**。
- 点击「始终允许」：
  - 当前工具调用应继续执行（不再停在等待审批状态）。
  - 对话窗口顶部的模式指示器应切换为「全自动模式」（橙色）。
  - 后续同一会话中的工具调用不再弹出审批卡片。
- 刷新页面或重启应用后，模式保持为「全自动模式」（通过 `localStorage` 持久化）。

## 预期结果

- 审批卡片最左侧新增一个显眼的紫色「始终允许」按钮，带对勾图标。
- 点击后当前请求立即放行，同时 session 模式切换为全自动，后续工具调用不再询问。
- 按钮文案、位置、样式符合用户要求，整体交互与 cherry-studio 中"始终允许"体验一致。
