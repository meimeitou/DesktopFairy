# 智能体控制内置浏览器

普通聊天中的智能体默认可以操作内置浏览器。在智能体的工具设置中，可以分别关闭 `browser_tabs`、`browser_navigate`、`browser_snapshot` 和 `browser_act`。

## 使用

直接在聊天中描述网页任务，例如“打开这篇文章，查看相关链接后整理要点”或“搜索资料，筛选结果并填写这份表单”。智能体可以读取正文、点击、填写、选择、容器/页面滚动、原生按键及组合键、悬停、文件上传下载和提交信息。第一版所有浏览器操作均直接执行，不弹审批。

所有标签页和登录状态共享。同一标签页一次只允许一个会话控制；控制期间状态栏显示会话名称和当前动作，网页暂时不能手动操作。

点击“暂停并接管”停止当前请求。已发出的动作可能仍在结束，状态栏会显示“正在停止”；结束后即可手动登录、处理验证码或修改内容。导航超时或取消会停止加载；若页面调用仍无法结束，暂停后可以直接关闭该标签页恢复。“继续”会在原聊天会话发起新一轮请求，先重新读取页面，再继续任务。“结束”放弃这次继续入口。

收起浏览器面板和隐藏聊天窗口后，任务继续执行。停止请求会释放控制权；标签页 URL 和逻辑 ID 会保留；窗口重建或应用重启后可以重新连接，但不会自动恢复或重放任务。已经提交到网站的操作不能通过停止或暂停撤回。

支持普通 DOM、open Shadow DOM 和同源 iframe。元素返回 framePath、shadowPath 和附近的 context；跨域 iframe 返回带 URL/标题/路径的占位。跨域 iframe 内操作、封闭 Shadow DOM、Canvas、复杂拖拽和验证码仍需人工处理。搜索和读取内容不要求视觉模型。

## 实现与验证

浏览器工具接入既有 agent 工具循环，架构参见 [arch.md](arch.md)。主进程管理标签页和控制锁；renderer 保留 `webview` 展示，网页继续禁用 Node 和 preload。页面脚本在隔离 world 中执行，模型不能传入任意 JavaScript。原生键盘、文本输入、hover 和上传通过固定 CDP 命令执行；隐藏 webview 会先取得 guest 焦点，执行完恢复聊天输入焦点。键盘支持导航键、F1–F12、ASCII 和 Meta/Ctrl/Alt/Shift 组合。普通文本填写使用原生 input 事件；日期等特殊原生控件仍使用固定 DOM setter。不同标签页的原生输入串行执行。

快照每页最多 8,000 字符、100 个元素，并受完整响应 48 KiB 的上限约束；超出大小预算时提前分页，继续位置由 nextTextOffset / nextElementOffset 返回。选项字段最多 240 字符，截断值带有 valueTruncated 标记，不能直接用于选择。页面捕获最多保留 200,000 字符、5,000 个交互元素和 32 个文档，达到上限时返回 captureTruncated。元素编号属于对应快照，操作时逐元素验证连接、文档及签名。未变化元素可以继续使用，失败前置校验不会无条件废弃整张快照；MutationObserver 记录 DOM 变化，新快照返回有上限的 added/changed/removed 摘要；密码框不返回值；复选框、单选框和 ARIA 控件返回勾选状态。控件和选项的禁用检查包含 fieldset / optgroup 继承的状态。每次调用最多等待 15 秒。超时后的提交结果可能未知，必须先检查页面，不能自动重试。

计划模式仅允许列出标签页和读取现有页面；终端、SSH 和主机对话不提供浏览器工具。

```bash
npx vitest run electron/browserAutomation.test.cjs src/shared/agentEnvironment.test.ts
npm run build:dir
node_modules/.bin/electron scripts/smoke-browser-electron.cjs
```

Electron smoke test 使用临时配置和本地 HTTP 页面，验证真实 preload/IPC、工具分发、搜索、填表、提交、键盘操作、快照失效、分页、同源 iframe、暂停/继续事件、后台运行、弹出标签页及销毁清理。测试不访问外部网站，也不调用模型 API；真实模型的任务规划质量需结合实际 Provider 另外体验。

## 动作结果与防重

写操作接受 `action_id`，缺省使用当前工具调用 ID。需要在传输失败后重取结果时，必须复用原 ID 和原参数。同一聊天 topic、同一应用实例中，相同 ID 的并发/重复请求只执行一次；参数冲突返回 `action_id_conflict`。缓存最多 10,000 条，满后拒绝新写操作，不会淘汰旧 ID 后再次执行。缓存不跨应用重启，不能把这层去重当成网站业务的 exactly-once 保证。

- `outcome: not_applied`：在派发动作前被拒绝，可以重新读取并修正参数。
- `outcome: applied`：工具动作已派发；`verified: false` 表示业务是否成功仍需检查页面或业务记录。
- `outcome: unknown`：可能已生效，包括超时、取消或正在等待原生对话框。先核对副作用，禁止生成新 ID 重复提交。

所有响应带 `instanceId`、`revision`；标签页带 `generation`。后续调用传回 `instanceId` 和 `generation`，旧实例/代次返回 `session_restarted` 和当前标签页清单。网页实例或聊天窗口丢失时保留 tabId、URL，释放控制权并使旧快照失效；renderer 可重建 webview。应用重启也会更换 instanceId。恢复连接不等于恢复页面内存或已填表单。

## 新动作

`browser_act` 的 click/fill/select/press/hover/upload 接受 `snapshotId` 和 `elementId`，或 `locator`：`css`、`xpath`、`role`+`name`、`text`，还可指定 `framePath`、`shadowPath`、零基 `index`。匹配多个时返回 `ambiguous_locator`，不默认点击第一个。XPath 不穿透 Shadow DOM，shadow 内可用 css/role+name 和 shadowPath。定位只在快照已捕获的元素中进行。

- `scroll`：direction 为 up/down/left/right；传 elementId/locator 滚动指定容器，否则滚动页面。
- `wait_for`：不要求 snapshotId，传 locator 或 text，以及 visible/hidden/attached/detached 条件，timeoutMs 最大 30,000。按条件轮询，不依赖猜测 sleep。不是 network-idle 保证。
- `upload`：files 为最多 20 个存在的本地绝对文件路径，只用于 type=file 元素；不打开系统文件选择器。
- `dialog`：不要求快照，显式传 accept 和可选 promptText。alert/confirm/prompt 的 type/message/defaultPrompt 从动作响应或 tabs list 读取。触发动作也可预先传 dialog 决策。未指定时暂停并返回对话框，不默认确认；暂停/结束控制会取消仍待处理的对话框。

Electron 原生不支持 window.prompt；通过固定、可暂停的兼容函数桥接 prompt，拿到明确决定后才返回文本或 null。不是系统输入框，不适用于页面已缓存原始 prompt 函数的情况。DevTools 与自动化 debugger 冲突时返回 debugger_busy，需要先关闭该网页 DevTools。

受控网页下载保存到 userData/browser-downloads，文件名加唯一前缀，downloads 列出路径与 progressing/completed/cancelled/interrupted 状态。下载不代表已完成，必须等 completed 后再使用。`browser_snapshot(screenshot=true)` 保存 PNG 到 userData/browser-captures 并返回路径，不把图片 base64 塞入快照。

正文和元素独立分页：正文完整不代表元素完整；必须继续 nextElementOffset。快照返回 totalElements/totalTextChars、captureTruncated、frameMetadataTruncated，无法捕获的内容不会伪装成完整页面。工具不提供模型任意 JavaScript 执行或任意网络拦截。

## 报告回归

外部 Agent 的 19 场景报告保留在 `/Users/yin/web-agent-tool-test-report.md`。本地固定 fixture 回归覆盖 Todo Enter 假失败、请求防重、可信输入、组合键、Tab、open shadow、frame 归属与跨域占位、歧义定位、hover、条件等待、confirm/prompt 分支、上传、截图及会话代次。原 webview/IPC smoke 额外覆盖真实下载、隐藏输入、14 标签页窗口重建。

```bash
node_modules/.bin/electron scripts/test-browser-report-electron.cjs
BROWSER_REPORT_LIVE=1 node_modules/.bin/electron scripts/test-browser-report-electron.cjs
node_modules/.bin/electron scripts/smoke-browser-electron.cjs
BROWSER_SMOKE_DEV_URL=http://localhost:5173 node_modules/.bin/electron scripts/smoke-browser-electron.cjs
```

真实站点另外复测了 TodoMVC（Enter + 同 ID 重试只产生一条记录）与 ExpandTesting form-validation（全部字段通过原生校验，未提交外部表单）。其余是可重复的本地机制回归，不等于已重新跑过全部外部网站；网站自身的校验、网络差异和复杂控件仍需业务断言。

表单快照也返回 name、placeholder、constraints（required/readOnly/pattern/min/max/maxLength）、valid 和 validationMessage，方便按网页实际约束填写，避免将网站业务格式校验误判为输入失败。
