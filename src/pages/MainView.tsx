import { useEffect, useRef, useState } from "react";
import Live2DCanvas from "../components/Live2DCanvas";
import "./MainView.css";

const SIZE_MAP = {
  small: { width: 280, height: 320 },
  medium: { width: 380, height: 400 },
  large: { width: 480, height: 500 },
};

const DEFAULT_MODEL = "/models/Hiyori/Hiyori.model3.json";

function readSettings() {
  try {
    const raw = localStorage.getItem("da_settings");
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

// Electron IPC bridge (exposed via preload.js contextBridge)
const api = window.electronAPI;

export default function MainView() {
  const initial = readSettings();
  const [modelPath, setModelPath] = useState<string>(
    initial.modelPath || DEFAULT_MODEL,
  );
  const [isHovered, setIsHovered] = useState(false);

  // Resize window on mount + re-assert float behavior
  useEffect(() => {
    const { windowSize = "medium" } = readSettings();
    const size =
      SIZE_MAP[windowSize as keyof typeof SIZE_MAP] ?? SIZE_MAP.medium;
    api.windowSetSize(size.width, size.height);
    api.invoke("reapply_window_float");
  }, []);

  // Re-read settings when window gets focus (user closed settings window)
  useEffect(() => {
    const onFocus = () => {
      const s = readSettings();
      setModelPath(s.modelPath || DEFAULT_MODEL);
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  // Custom drag: bypasses macOS restriction that blocks startDragging() from
  // crossing into a full-screen Space on another display.
  const dragRef = useRef<{
    active: boolean;
    startScreenX: number;
    startScreenY: number;
    startWinX: number;
    startWinY: number;
  }>({
    active: false,
    startScreenX: 0,
    startScreenY: 0,
    startWinX: 0,
    startWinY: 0,
  });

  useEffect(() => {
    const onMove = async (e: MouseEvent) => {
      const d = dragRef.current;
      if (!d.active) return;
      // Electron getPosition/setPosition and e.screenX are all logical coords — no DPR needed
      const x = Math.round(d.startWinX + (e.screenX - d.startScreenX));
      const y = Math.round(d.startWinY + (e.screenY - d.startScreenY));
      await api.windowSetPosition(x, y);
    };
    const onUp = async () => {
      if (dragRef.current.active) {
        dragRef.current.active = false;
        // Re-assert float — macOS may reassign Space after setPosition()
        await api.invoke("reapply_window_float");
      }
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  const handleMouseDown = async (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("button")) return;
    const startScreenX = e.screenX;
    const startScreenY = e.screenY;
    const pos = await api.windowGetPosition();
    if (pos) {
      dragRef.current = {
        active: true,
        startScreenX,
        startScreenY,
        startWinX: pos.x,
        startWinY: pos.y,
      };
    }
  };

  return (
    <div
      className="main-view"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onMouseDown={handleMouseDown}
    >
      <div className="main-content">
        {modelPath ? (
          <Live2DCanvas modelPath={modelPath} />
        ) : (
          <div className="char-default">
            <span className="char-emoji">🧚</span>
          </div>
        )}
      </div>

      {isHovered && (
        <div className="hover-overlay">
          <button
            className="hover-btn primary"
            onClick={() => api.invoke("open_chat_window")}
          >
            💬 开始聊天
          </button>
        </div>
      )}
    </div>
  );
}
