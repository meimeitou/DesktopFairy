# 对话中 Bash 代码块一键发送终端计划

## 需求概述

在对话窗口的 Markdown 渲染中，bash/shell 类代码块新增「在终端运行」按钮。点击后：
1. 自动切换到终端 tab。
2. 将代码块内容发送到当前活跃的终端 PTY 会话并执行。

## 现状分析

### 代码块渲染
- `src/components/chat/CodeBlock.tsx`：渲染代码块 header（语言名 + 「复制」按钮），**无终端集成**。
- `src/components/chat/ChatMarkdown.tsx`：`code` 组件根据 `className`（`language-xxx`）判断是否为代码块，渲染 `<CodeBlock>`。
- `src/components/chat/ChatMarkdown.css`：`.md-code-header` 使用 `display: flex; justify-content: space-between`，语言名在左，按钮在右。

### 终端系统
- `src/pages/TerminalPage.tsx`：管理多个 `TerminalInstance`（多标签），每个实例独立创建 PTY 会话。
  - `sessionIdRef` 是 `TerminalInstance` 内部的 `useRef`，**外部无法访问**。
  - `activeTabId` state 在 `TerminalPage` 中管理。
  - `TerminalInstance` 接收 `isActive` prop（`tab.id === activeTabId && isActive`）。
- `src/pages/ChatApp.tsx`：三 tab keep-alive（对话/终端/设置），通过 `view` state 切换，隐藏面板用 `visibility: hidden`（组件仍挂载，事件监听仍活跃）。
- PTY IPC：`pty:create` / `pty:input` / `pty:resize` / `pty:kill`，已在 preload.cjs 白名单中。

### 关键约束
- `TerminalInstance` 的 PTY 会话 ID 在内部 ref 中，`TerminalPage` 无法直接访问。
- 需要将 session ID 提升到 `TerminalPage` 层级，才能向活跃 tab 的 PTY 发送命令。
- 隐藏面板用 `visibility: hidden`（非 `display: none`），xterm 实例仍活跃，PTY 输出仍被接收和写入。

## 修改方案

### 文件 1：`src/components/chat/CodeBlock.tsx`

**目的**：为 shell 类代码块新增「在终端运行」按钮。

修改内容：
1. 新增 `SHELL_LANGS` 集合：`["bash", "sh", "shell", "zsh", "fish", "console", "terminal"]`。
2. 新增 `handleRunInTerminal` 函数：
   ```typescript
   const handleRunInTerminal = useCallback(() => {
     window.dispatchEvent(
       new CustomEvent("terminal:run-command", { detail: { command: code } })
     );
   }, [code]);
   ```
3. 在 `.md-code-header` 中，当 `lang` 属于 `SHELL_LANGS` 时，在「复制」按钮左侧新增「在终端运行」按钮：
   ```tsx
   {isShell && (
     <button type="button" className="md-code-run" onClick={handleRunInTerminal} title="在终端运行">
       <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
         <polyline points="4 17 10 11 4 5" />
         <line x1="12" y1="19" x2="20" y2="19" />
       </svg>
       在终端运行
     </button>
   )}
   ```

### 文件 2：`src/pages/ChatApp.tsx`

**目的**：监听 `terminal:run-command` 事件，切换到终端 tab。

修改内容：
1. 新增 `useEffect` 注册 `window` 事件监听：
   ```typescript
   useEffect(() => {
     const handler = () => setView("terminal");
     window.addEventListener("terminal:run-command", handler);
     return () => window.removeEventListener("terminal:run-command", handler);
   }, []);
   ```

### 文件 3：`src/pages/TerminalPage.tsx`

**目的**：将 session ID 提升到 TerminalPage，监听事件并向活跃 tab 的 PTY 发送命令。

修改内容：
1. `TerminalPage` 新增 `sessionMapRef`：
   ```typescript
   const sessionMapRef = useRef<Map<string, string>>(new Map());
   ```
2. `TerminalInstance` 新增 props：
   - `tabId: string`
   - `onSessionReady?: (tabId: string, sessionId: string) => void`
   - `onSessionEnd?: (tabId: string) => void`
3. `TerminalInstance` 在 PTY 创建成功后调用 `onSessionReady?.(tabId, sessionId)`，在 cleanup 中调用 `onSessionEnd?.(tabId)`。
4. `TerminalPage` 传入回调：
   - `onSessionReady`: `(id, sid) => sessionMapRef.current.set(id, sid)`
   - `onSessionEnd`: `(id) => sessionMapRef.current.delete(id)`
5. `TerminalPage` 新增 `useEffect` 监听 `terminal:run-command` 事件：
   ```typescript
   useEffect(() => {
     const handler = (e: Event) => {
       const { command } = (e as CustomEvent).detail;
       const sessionId = sessionMapRef.current.get(activeTabId);
       if (sessionId) {
         api.invoke("pty:input", { sessionId, data: command + "\n" });
       }
     };
     window.addEventListener("terminal:run-command", handler);
     return () => window.removeEventListener("terminal:run-command", handler);
   }, [activeTabId]);
   ```
6. 渲染 `TerminalInstance` 时传入 `tabId={tab.id}`。

### 文件 4：`src/components/chat/ChatMarkdown.css`

**目的**：为「在终端运行」按钮添加样式。

修改内容：
1. 新增 `.md-code-run` 样式，与 `.md-code-copy` 类似但带有终端图标色调：
   ```css
   .md-code-run {
     display: inline-flex;
     align-items: center;
     gap: 3px;
     padding: 2px 8px;
     background: transparent;
     border: 1px solid rgba(255, 255, 255, 0.12);
     border-radius: 4px;
     font-size: 11px;
     color: rgba(255, 255, 255, 0.55);
     cursor: pointer;
     transition: background 0.15s, color 0.15s;
   }
   .md-code-run:hover {
     background: rgba(120, 200, 120, 0.12);
     color: rgba(180, 255, 180, 0.9);
     border-color: rgba(120, 200, 120, 0.25);
   }
   ```
2. 调整 `.md-code-header` 的 `justify-content` 为 `flex-end`，让语言名和按钮组分开（语言名左对齐，按钮组右对齐）。新增 `.md-code-actions` 容器包裹按钮：
   ```css
   .md-code-actions {
     display: flex;
     align-items: center;
     gap: 6px;
   }
   ```

## 事件流

```
CodeBlock「在终端运行」按钮点击
  → window.dispatchEvent('terminal:run-command', { command })
  → ChatApp 监听 → setView('terminal')  (切换 tab)
  → TerminalPage 监听 → api.invoke('pty:input', { sessionId, data: command + '\n' })
  → PTY 执行命令 → 输出通过 pty:output 事件回传 → xterm 显示
```

## 假设与决策

1. **按钮仅对 shell 类语言显示**：`bash`/`sh`/`shell`/`zsh`/`fish`/`console`/`terminal`。其他语言（如 `python`、`javascript`）不显示。
2. **命令自动执行**：发送 `command + '\n'` 到 PTY，shell 自动执行。PTY 默认 echo 模式会将命令回显到终端。
3. **发送到活跃 tab**：使用 `TerminalPage` 的 `activeTabId` 对应的 session ID。如果该 tab 的 PTY 尚未创建完成（异步），命令不会被发送——但实际场景中 ChatApp 挂载时 TerminalPage 就已挂载，PTY 应已就绪。
4. **无需新增 IPC 通道**：复用已有的 `pty:input` 通道，无需修改 preload.cjs 白名单。
5. **CustomEvent 通信**：使用 `window` 自定义事件在组件间通信，避免 prop drilling，适合同窗口内的跨组件通信。

## 验证步骤

1. `make lint` 确认无 ESLint 错误。
2. `make dev` 启动应用。
3. 在对话中让 AI 生成一个 bash 代码块（如 ` ```bash\nls -la\n``` `）。
4. 确认代码块 header 显示「在终端运行」按钮（仅 shell 类语言）。
5. 点击「在终端运行」：
   - 自动切换到终端 tab。
   - 终端中显示并执行了命令。
   - 命令输出正常显示。
6. 确认非 shell 语言代码块（如 `python`）不显示「在终端运行」按钮。
