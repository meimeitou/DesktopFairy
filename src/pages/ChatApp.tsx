import { Button } from "@cherrystudio/ui";
import { Book, Globe, MessageSquare, Settings, SquareTerminal, X } from "lucide-react";
import { lazy, Suspense, useEffect, useState } from "react";

import ChatBrowserPane from "../components/chat/ChatBrowserPane";
import "./ChatApp.css";

const ChatPage = lazy(() => import("./ChatPage"));
const SettingsPage = lazy(() => import("./SettingsPage"));
const TerminalPage = lazy(() => import("./TerminalPage"));
const KnowledgePage = lazy(() => import("./KnowledgePage"));

type AppView = "chat" | "terminal" | "settings" | "knowledge";

const api = window.electronAPI;
const isMac =
  typeof navigator !== "undefined" &&
  navigator.platform.toUpperCase().includes("MAC");

const params = new URLSearchParams(window.location.search);
const viewParam = params.get("view");
const initialView: AppView =
  viewParam === "settings"
    ? "settings"
    : viewParam === "terminal"
      ? "terminal"
      : viewParam === "knowledge"
        ? "knowledge"
        : "chat";

function ChatIcon() {
  return <MessageSquare size={14} />;
}

function TerminalIcon() {
  return <SquareTerminal size={14} />;
}

function KnowledgeIcon() {
  return <Book size={14} />;
}

function SettingsIcon() {
  return <Settings size={14} />;
}

function CloseIcon() {
  return <X size={12} />;
}

export default function ChatApp() {
  const [view, setView] = useState<AppView>(initialView);
  const [mountedViews, setMountedViews] = useState<ReadonlySet<AppView>>(
    () => new Set<AppView>([initialView]),
  );
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [browserOpen, setBrowserOpen] = useState(false);
  const [browserMaximized, setBrowserMaximized] = useState(false);

  useEffect(() => {
    setMountedViews((prev) => {
      if (prev.has(view)) return prev;
      const next = new Set(prev);
      next.add(view);
      return next;
    });
  }, [view]);

  useEffect(() => {
    document.title = " ";
    document.documentElement.classList.add("chat-window-shell");
    if (isMac) document.documentElement.classList.add("chat-window-mac");
    return () => {
      document.documentElement.classList.remove(
        "chat-window-shell",
        "chat-window-mac",
      );
    };
  }, []);

  useEffect(() => {
    const off = api.onChatWindowFullscreenChanged?.((value) =>
      setIsFullscreen(Boolean(value)),
    );
    return () => off?.();
  }, []);

  useEffect(() => {
    const off = api.onChatNavigate?.((nextView) => {
      if (nextView === "terminal") setView("terminal");
      else if (nextView === "settings") setView("settings");
      else if (nextView === "knowledge") setView("knowledge");
      else setView("chat");
    });
    return () => off?.();
  }, []);

  useEffect(() => {
    const switchTerminal = () => setView("terminal");
    window.addEventListener("terminal:run-command", switchTerminal);
    return () => {
      window.removeEventListener("terminal:run-command", switchTerminal);
    };
  }, []);

  useEffect(() => {
    const reveal = () => setView("knowledge");
    window.addEventListener("knowledge:reveal", reveal);
    return () => window.removeEventListener("knowledge:reveal", reveal);
  }, []);

  return (
    <div
      className={`chat-app${isMac ? " chat-app-mac" : " chat-app-frameless"}${isFullscreen ? " chat-app-fullscreen" : ""}`}
    >
      <header className="chat-app-topbar">
        <nav className="chat-app-tabs">
          <Button variant="ghost" className={`chat-tab${view === "chat" ? " active" : ""}`} onClick={() => setView("chat")}>
            <ChatIcon />
            <span>智能体</span>
          </Button>
          <Button variant="ghost" className={`chat-tab${view === "terminal" ? " active" : ""}`} onClick={() => setView("terminal")}>
            <TerminalIcon />
            <span>终端</span>
          </Button>
          <Button variant="ghost" className={`chat-tab${view === "knowledge" ? " active" : ""}`} onClick={() => setView("knowledge")}>
            <KnowledgeIcon />
            <span>知识库</span>
          </Button>
          <Button variant="ghost" className={`chat-tab${view === "settings" ? " active" : ""}`} onClick={() => setView("settings")}>
            <SettingsIcon />
            <span>设置</span>
          </Button>
          <Button variant="ghost" className={`chat-tab${browserOpen ? " active" : ""}`} onClick={() => setBrowserOpen(v => !v)} title="浏览器">
            <Globe size={16} />
            <span>浏览器</span>
          </Button>
        </nav>

        <div className="chat-app-topbar-drag" aria-hidden />

        {!isMac && (
          <Button variant="ghost" className="chat-window-close" onClick={() => window.close()} title="关闭">
            <CloseIcon />
          </Button>
        )}
      </header>

      <div className={`chat-app-workspace${browserMaximized ? " maximized" : ""}`}>
        <main className="chat-app-body">
          {mountedViews.has("chat") && (
            <div
              className={`chat-app-panel${view === "chat" ? "" : " chat-app-panel-hidden"}`}
              aria-hidden={view !== "chat"}
            >
              <Suspense fallback={null}>
                <ChatPage embedded isActive={view === "chat"} />
              </Suspense>
            </div>
          )}
          {mountedViews.has("terminal") && (
            <div
              className={`chat-app-panel${view === "terminal" ? "" : " chat-app-panel-hidden"}`}
              aria-hidden={view !== "terminal"}
            >
              <Suspense fallback={null}>
                <TerminalPage isActive={view === "terminal"} />
              </Suspense>
            </div>
          )}
          {mountedViews.has("knowledge") && (
            <div
              className={`chat-app-panel${view === "knowledge" ? "" : " chat-app-panel-hidden"}`}
              aria-hidden={view !== "knowledge"}
            >
              <Suspense fallback={null}>
                <KnowledgePage isActive={view === "knowledge"} />
              </Suspense>
            </div>
          )}
          {mountedViews.has("settings") && (
            <div
              className={`chat-app-panel${view === "settings" ? "" : " chat-app-panel-hidden"}`}
              aria-hidden={view !== "settings"}
            >
              <Suspense fallback={null}>
                <SettingsPage embedded />
              </Suspense>
            </div>
          )}
        </main>
        <ChatBrowserPane
          open={browserOpen}
          onOpenChange={setBrowserOpen}
          onMaximizeChange={setBrowserMaximized}
        />
      </div>
    </div>
  );
}
