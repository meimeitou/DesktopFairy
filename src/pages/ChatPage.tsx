import { useState } from "react";
import "./ChatPage.css";

export default function ChatPage() {
  const [input, setInput] = useState("");

  const handleSend = () => {
    if (!input.trim()) return;
    setInput("");
  };

  return (
    <div className="chat-page">
      <div className="chat-messages">
        <div className="chat-empty">
          <span className="chat-empty-icon">🤖</span>
          <p>AI 对话开发中</p>
          <small>敬请期待</small>
        </div>
      </div>
      <div className="chat-input-bar">
        <input
          type="text"
          placeholder="输入消息…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          autoFocus
        />
        <button onClick={handleSend}>发送</button>
      </div>
    </div>
  );
}
