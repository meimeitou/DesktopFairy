// Headless-test-only stub for window.electronAPI. Injected by vite.config.ts
// ONLY when DF_HEADLESS_STUB=1; never loaded in normal dev or production builds.
(function () {
  // Real Electron preload (contextBridge) injects electronAPI before any
  // page script — never overwrite it; the stub is for plain-Chrome checks only.
  if (window.electronAPI) return;
  const handler = () => () => {};
  const base = {
    invoke: (channel) =>
      Promise.resolve(channel === "agent:skills:scan" ? [] : undefined),
  };
  const names = [
    "onAgentStreamTool", "onAiStreamChunk", "onAiStreamDone", "onAiStreamError",
    "onBrowserPaneOpen", "onChatNavigate", "onChatPrefill", "onChatStreamChunk",
    "onChatStreamCitations", "onChatStreamDone", "onChatStreamError",
    "onChatStreamKnowledgeError", "onChatWindowFullscreenChanged",
    "onLive2DScene", "onMainWindowLayoutChanged", "onMainWindowVisibilityChanged",
    "onMcpLog", "onMcpStatusChanged", "onPtyExit", "onPtyOutput",
    "onSelectionTipText", "onSettingsUpdated", "onSshExit", "onSshOutput",
    "onSwitchModel",
  ];
  for (const n of names) base[n] = handler;
  window.electronAPI = new Proxy(base, {
    get(t, p) {
      if (p in t) return t[p];
      if (typeof p === "string" && p.startsWith("on")) return handler;
      return () => Promise.resolve(undefined);
    },
  });
})();
