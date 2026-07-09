import { useEffect, useRef, useState, useCallback } from "react";
import Live2DCanvas from "../components/Live2DCanvas";
import {
  loadSettings,
  normalizeSpeechBubbleMaxChars,
  type AppSettings,
} from "../shared/settings";
import "./MainView.css";

const DEFAULT_MODEL = "/models/Hiyori/Hiyori.model3.json";

// Electron IPC bridge (exposed via preload.js contextBridge)
const api = window.electronAPI;

export default function MainView() {
  const initial = loadSettings();
  const [modelPath, setModelPath] = useState<string>(
    initial.modelPath || DEFAULT_MODEL,
  );
  const [modelScale, setModelScale] = useState<number>(
    initial.modelScale ?? 1.0,
  );
  const [modelOffsetX, setModelOffsetX] = useState<number>(
    initial.modelOffsetX ?? 0,
  );
  const [modelOffsetY, setModelOffsetY] = useState<number>(
    initial.modelOffsetY ?? 0,
  );
  const [live2dReactive, setLive2dReactive] = useState<boolean>(
    initial.live2dReactive !== false,
  );
  const [live2dSpeechBubble, setLive2dSpeechBubble] = useState<boolean>(
    initial.live2dSpeechBubble !== false,
  );
  const [live2dSpeechBubbleMaxChars, setLive2dSpeechBubbleMaxChars] =
    useState<number>(
      normalizeSpeechBubbleMaxChars(initial.live2dSpeechBubbleMaxChars),
    );
  const [isHovered, setIsHovered] = useState(false);

  const applySettings = useCallback((s: Partial<AppSettings>) => {
    if (typeof s.modelPath === "string") {
      setModelPath(s.modelPath || DEFAULT_MODEL);
    }
    if (typeof s.modelScale === "number") {
      setModelScale(s.modelScale);
    }
    if (typeof s.modelOffsetX === "number") {
      setModelOffsetX(s.modelOffsetX);
    }
    if (typeof s.modelOffsetY === "number") {
      setModelOffsetY(s.modelOffsetY);
    }
    if (typeof s.live2dReactive === "boolean") {
      setLive2dReactive(s.live2dReactive);
    }
    if (typeof s.live2dSpeechBubble === "boolean") {
      setLive2dSpeechBubble(s.live2dSpeechBubble);
    }
    if (typeof s.live2dSpeechBubbleMaxChars === "number") {
      setLive2dSpeechBubbleMaxChars(
        normalizeSpeechBubbleMaxChars(s.live2dSpeechBubbleMaxChars),
      );
    }
  }, []);

  // Resize window on mount + re-assert float behavior + sync settings to main
  useEffect(() => {
    const s = loadSettings();
    const w = s.windowWidth ?? 200;
    const h = s.windowHeight ?? 400;
    api.windowSetSize(w, h);
    api.invoke("reapply_window_float");
    api.invoke("settings:sync", s).catch(() => {});
  }, []);

  // Apply settings pushed from the chat/settings window immediately
  useEffect(() => {
    const off = api.onSettingsUpdated?.((settings) => {
      applySettings(settings as Partial<AppSettings>);
    });
    return () => off?.();
  }, [applySettings]);

  // Fallback when user focuses the model window directly
  useEffect(() => {
    const onFocus = () => {
      applySettings(loadSettings());
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [applySettings]);

  // Live2D model path is persisted by the settings UI via settings:sync.
  // Re-syncing loadSettings() here races with in-flight saves and can
  // broadcast stale customModels back to the settings window (UI flicker).
  useEffect(() => {
    const unsubscribe = api.onSwitchModel((newPath: string) => {
      setModelPath(newPath);
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
