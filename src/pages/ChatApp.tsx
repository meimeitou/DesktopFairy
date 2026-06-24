import { useState, useEffect } from "react";
import ChatPage from "./ChatPage";
import SettingsPage from "./SettingsPage";
import TerminalPage from "./TerminalPage";
import "./ChatApp.css";

type AppView = "chat" | "terminal" | "settings";

const api = window.electronAPI;
const isMac =
  typeof navigator !== "undefined" &&
  navigator.platform.toUpperCase().includes("MAC");

const params = new URLSearchParams(window.location.search);
const initialView: AppView =
  params.get("view") === "settings" ? "settings" : "chat";

function ChatIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function TerminalIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="4 17 10 11 4 5" />
      <line x1="12" y1="19" x2="20" y2="19" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

export default function ChatApp() {
  const [view, setView] = useState<AppView>(initialView);

  useEffect(() => {
    document.title = " ";
    document.documentElement.classList.add("chat-window-shell");
    if (isMac) document.documentElement.classList.add("chat-window-mac");
    return () => {
      document.documentElement.classList.remove("chat-window-shell", "chat-window-mac");
    };
  }, []);

  useEffect(() => {
    const off = api.onChatNavigate?.((nextView) => {
      if (nextView === "terminal") setView("terminal");
      else if (nextView === "settings") setView("settings");
      else setView("chat");
    });
    return () => off?.();
  }, []);

  useEffect(() => {
    const handler = () => setView("terminal");
    window.addEventListener("terminal:run-command", handler);
    return () => window.removeEventListener("terminal:run-command", handler);
  }, []);

  return (
    <div className={`chat-app${isMac ? " chat-app-mac" : " chat-app-frameless"}`}>
      <header className="chat-app-topbar">
        <nav className="chat-app-tabs">
          <button
            type="button"
            className={`chat-tab${view === "chat" ? " active" : ""}`}
            onClick={() => setView("chat")}
          >
            <ChatIcon />
            <span>对话</span>
          </button>
          <button
            type="button"
            className={`chat-tab${view === "terminal" ? " active" : ""}`}
            onClick={() => setView("terminal")}
          >
            <TerminalIcon />
            <span>终端</span>
          </button>
          <button
            type="button"
            className={`chat-tab${view === "settings" ? " active" : ""}`}
            onClick={() => setView("settings")}
          >
            <SettingsIcon />
            <span>设置</span>
          </button>
        </nav>

        <div className="chat-app-topbar-drag" aria-hidden />

        {!isMac && (
          <button
            type="button"
            className="chat-window-close"
            onClick={() => window.close()}
            title="关闭"
          >
            <CloseIcon />
          </button>
        )}
      </header>

      <main className="chat-app-body">
        <div
          className={`chat-app-panel${view === "chat" ? "" : " chat-app-panel-hidden"}`}
          aria-hidden={view !== "chat"}
        >
          <ChatPage embedded />
        </div>
        <div
          className={`chat-app-panel${view === "terminal" ? "" : " chat-app-panel-hidden"}`}
          aria-hidden={view !== "terminal"}
        >
          <TerminalPage isActive={view === "terminal"} />
        </div>
        <div
          className={`chat-app-panel${view === "settings" ? "" : " chat-app-panel-hidden"}`}
          aria-hidden={view !== "settings"}
        >
          <SettingsPage embedded />
        </div>
      </main>
    </div>
  );
}
