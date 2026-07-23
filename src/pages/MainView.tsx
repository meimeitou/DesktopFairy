import { useEffect, useRef, useState } from "react";
import Live2DCanvas from "../components/Live2DCanvas";
import {
  normalizeSpeechBubbleMaxChars,
} from "../shared/settings";
import { useSettings, setSettings as commitAppSettings } from "../shared/settingsStore";
import "./MainView.css";

const DEFAULT_MODEL = "/models/Hiyori/Hiyori.model3.json";

// Electron IPC bridge (exposed via preload.js contextBridge)
const api = window.electronAPI;

export default function MainView() {
  const settings = useSettings();
  const modelPath = settings.modelPath || DEFAULT_MODEL;
  const modelScale = settings.modelScale ?? 1.0;
  const modelOffsetX = settings.modelOffsetX ?? 0;
  const modelOffsetY = settings.modelOffsetY ?? 0;
  const live2dReactive = settings.live2dReactive !== false;
  const live2dSpeechBubble = settings.live2dSpeechBubble !== false;
  const live2dSpeechBubbleMaxChars = normalizeSpeechBubbleMaxChars(
    settings.live2dSpeechBubbleMaxChars,
  );
  const [isHovered, setIsHovered] = useState(false);

  // Resize window on mount + re-assert float behavior.
  // Do NOT commitAppSettings here — that races with the chat window and can
  // overwrite a newer agent model with this window's stale snapshot.
  useEffect(() => {
    const w = settings.windowWidth ?? 200;
    const h = settings.windowHeight ?? 400;
    api.windowSetSize(w, h);
    api.invoke("reapply_window_float");
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only window geometry sync
  }, []);

  // Live2D model path is persisted by the settings UI via settings:sync.
  useEffect(() => {
    const unsubscribe = api.onSwitchModel((newPath: string) => {
      commitAppSettings((prev) => ({ ...prev, modelPath: newPath }));
    });
    return unsubscribe;
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
          <Live2DCanvas
            modelPath={modelPath}
            modelScale={modelScale}
            modelOffsetX={modelOffsetX}
            modelOffsetY={modelOffsetY}
            live2dReactive={live2dReactive}
            live2dSpeechBubble={live2dSpeechBubble}
            live2dSpeechBubbleMaxChars={live2dSpeechBubbleMaxChars}
          />
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
