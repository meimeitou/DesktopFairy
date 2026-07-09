import MainView from "./pages/MainView";
import ChatApp from "./pages/ChatApp";
import TipView from "./pages/TipView";
import BrowserPage from "./pages/BrowserPage";
import "./App.css";

const params = new URLSearchParams(window.location.search);
const windowType = params.get("window");

function App() {
  if (windowType === "chat" || windowType === "settings") {
    return (
      <div className="app">
        <ChatApp />
      </div>
    );
  }

  if (windowType === "tip") {
    const text = params.get("text") || "";
    return <TipView text={text} />;
  }

  if (windowType === "browser") {
    return (
      <div className="app">
        <BrowserPage />
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
