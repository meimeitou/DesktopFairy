const string = { type: 'string' };
const tabId = { type: 'string', description: 'browser_tabs 返回的标签页 ID' };
const snapshotId = { type: 'string', description: 'browser_snapshot 返回的快照 ID；元素变化后重新读取' };
const locator = { type: 'object', additionalProperties: false, properties: { css: string, xpath: string, role: string, name: string, text: string, index: { type: 'integer', minimum: 0 }, framePath: { type: 'array', items: { type: 'integer', minimum: 0 } }, shadowPath: { type: 'array', items: string } } };
const decision = { type: 'object', additionalProperties: false, properties: { accept: { type: 'boolean' }, promptText: string }, required: ['accept'] };
const session = { instanceId: { type: 'string', description: '从 list/snapshot 获取；传入可检测主进程重启' }, generation: { type: 'integer', minimum: 1 }, action_id: { type: 'string', description: '写操作的稳定唯一 ID；传输失败重试必须复用原 ID 和原参数，绝不生成新 ID 重复提交' } };
function parameters(name) {
  const schemas = {
    browser_tabs: { properties: { ...session, action: { type: 'string', enum: ['list', 'open', 'activate', 'close'] }, tabId, url: string }, required: ['action'] },
    browser_navigate: { properties: { ...session, tabId, action: { type: 'string', enum: ['open', 'back', 'forward', 'reload'] }, url: string }, required: ['tabId', 'action'] },
    browser_snapshot: { properties: { ...session, tabId, snapshotId, screenshot: { type: 'boolean', description: '将当前页面截图写到本地 PNG，返回路径' }, textOffset: { type: 'integer', minimum: 0 }, elementOffset: { type: 'integer', minimum: 0 } }, required: ['tabId'] },
    browser_act: { properties: { ...session, tabId, snapshotId, action: { type: 'string', enum: ['click', 'fill', 'select', 'scroll', 'press', 'hover', 'upload', 'dialog', 'wait_for'] }, elementId: string, locator, value: string, direction: { type: 'string', enum: ['up', 'down', 'left', 'right'] }, key: { type: 'string', description: 'Enter/Tab/Escape/Space/ArrowLeft/Backspace/Delete/Home/End/PageUp/PageDown/F1-F12、ASCII 或 Ctrl/Meta/Alt/Shift 组合，如 Meta+a' }, files: { type: 'array', items: string }, accept: { type: 'boolean' }, promptText: string, dialog: decision, text: string, state: { type: 'string', enum: ['visible', 'hidden', 'attached', 'detached'] }, timeoutMs: { type: 'integer', minimum: 1, maximum: 30000 } }, required: ['tabId', 'action'] },
  };
  return { type: 'object', additionalProperties: false, ...schemas[name] };
}
module.exports = { parameters };
