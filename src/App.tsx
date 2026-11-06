import { ToastProvider, ToastViewport } from "@cherrystudio/ui";
import { lazy, Suspense } from "react";
import ErrorBoundary from "./components/ErrorBoundary";
import { installSettingsSyncListener } from "./shared/settingsStore";
import "./App.css";

// One listener per renderer process — pages subscribe via useSettings().
installSettingsSyncListener();

const params = new URLSearchParams(window.location.search);
const windowType = params.get("window");
const isMac =
  typeof navigator !== "undefined" &&
  navigator.platform.toUpperCase().includes("MAC");

// Paint the shell before the window chunk arrives. Each page also adds these
// classes; doing it here covers the gap while that chunk is still parsing.
if (typeof document !== "undefined") {
  const root = document.documentElement;
  if (windowType === "chat" || windowType === "settings") {
    root.classList.add("chat-window-shell");
    if (isMac) root.classList.add("chat-window-mac");
  } else if (windowType === "tip") {
    root.classList.add("tip-window");
  }
}

const ChatApp = lazy(() => import("./pages/ChatApp"));
const TipView = lazy(() => import("./pages/TipView"));
const MainView = lazy(() => import("./pages/MainView"));

function App() {
  let child;
  if (windowType === "chat" || windowType === "settings") {
    child = (
      <div className="app">
        <ChatApp />
      </div>
    );
  } else if (windowType === "tip") {
    child = <TipView text={params.get("text") || ""} />;
  } else {
    child = (
      <div className="app">
        <MainView />
      </div>
    );
  }

  return (
    <ToastProvider>
      <ErrorBoundary>
        <Suspense fallback={null}>{child}</Suspense>
      </ErrorBoundary>
      <ToastViewport />
    </ToastProvider>
  );
}

export default App;
