import MainView from "./pages/MainView";
import SettingsPage from "./pages/SettingsPage";
import ChatPage from "./pages/ChatPage";
import "./App.css";

const windowType = new URLSearchParams(window.location.search).get("window");

function App() {
  if (windowType === "settings") {
    return (
      <div className="app">
        <SettingsPage onClose={() => window.close()} standalone />
      </div>
    );
  }

  if (windowType === "chat") {
    return (
      <div className="app">
        <ChatPage />
      </div>
    );
  }

  return (
    <div className="app">
      <MainView />
    </div>
  );
}

export default App;
