import { useEffect, useRef, useState, useCallback } from "react";
import { Live2DController } from "../live2d/Live2DController";
import { parseReactionCommand } from "../shared/live2dReactions";

interface Props {
  modelPath: string;
  modelScale?: number;
  modelOffsetX?: number;
  modelOffsetY?: number;
  live2dReactive?: boolean;
}

type Status = "loading" | "ready" | "error";

const api = window.electronAPI;

export default function Live2DCanvas({
  modelPath,
  modelScale = 1.0,
  modelOffsetX = 0,
  modelOffsetY = 0,
  live2dReactive = true,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const controllerRef = useRef<Live2DController | null>(null);
  const [status, setStatus] = useState<Status>("loading");
  const [errorMsg, setErrorMsg] = useState("");

  const refreshCanvasLayout = useCallback(() => {
    requestAnimationFrame(() => controllerRef.current?.resize());
  }, []);

  const handleLive2DCommand = useCallback((cmd: string) => {
    const controller = controllerRef.current;
    if (!controller) return;
    if (cmd === "random_motion") {
      controller.triggerRandomMotion();
      return;
    }
    if (cmd === "next_expression") {
      controller.nextExpression();
      return;
    }
    const parsed = parseReactionCommand(cmd);
    if (parsed) {
      controller.applyReaction(parsed.reaction, parsed.assistantText);
    }
  }, []);

  useEffect(() => {
    controllerRef.current?.setScale(modelScale);
    refreshCanvasLayout();
  }, [modelScale, refreshCanvasLayout]);

  useEffect(() => {
    controllerRef.current?.setOffset(modelOffsetX, modelOffsetY);
    refreshCanvasLayout();
  }, [modelOffsetX, modelOffsetY, refreshCanvasLayout]);

  useEffect(() => {
    const unsubscribe = api.onLive2DCommand(handleLive2DCommand);
    return unsubscribe;
  }, [handleLive2DCommand]);

  useEffect(() => {
    window.addEventListener("resize", refreshCanvasLayout);
    const off = api.onMainWindowLayoutChanged?.(refreshCanvasLayout);
    return () => {
      window.removeEventListener("resize", refreshCanvasLayout);
      off?.();
    };
  }, [refreshCanvasLayout]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    setStatus("loading");
    setErrorMsg("");

    let cancelled = false;
    let trackingTimer: ReturnType<typeof setInterval> | null = null;

    (async () => {
      try {
        const controller = new Live2DController(canvas);
        controllerRef.current = controller;
        await controller.initialize(modelPath);
        controller.setScale(modelScale);
        controller.setOffset(modelOffsetX, modelOffsetY);
        if (cancelled) {
          controller.release();
          controllerRef.current = null;
          return;
        }
        setStatus("ready");
      } catch (err) {
        if (cancelled) return;
        console.error("[Live2DCanvas]", err);
        setStatus("error");
        setErrorMsg(err instanceof Error ? err.message : String(err));
      }
    })();

    const startTracking = () => {
      if (trackingTimer) return;
      trackingTimer = setInterval(async () => {
        if (!controllerRef.current) return;
        try {
          const [cursor, winPos] = await Promise.all([
            api.screenGetCursorPoint(),
            api.windowGetPosition(),
          ]);
          if (cursor && winPos) {
            controllerRef.current.setDraggingFromScreen(
              cursor.x,
              cursor.y,
              winPos
            );
          }
        } catch {
          /* ignore IPC errors during tracking */
        }
      }, 50);
    };

    const stopTracking = () => {
      if (trackingTimer) {
        clearInterval(trackingTimer);
        trackingTimer = null;
      }
    };

    startTracking();

    return () => {
      cancelled = true;
      stopTracking();
      controllerRef.current?.release();
      controllerRef.current = null;
    };
  }, [modelPath, modelScale, modelOffsetX, modelOffsetY]);

  // Random expression loop only when reactive mode is off
  useEffect(() => {
    if (live2dReactive || status !== "ready") return;
    const expressionTimer = setInterval(() => {
      controllerRef.current?.setRandomExpression();
    }, 8000);
    return () => clearInterval(expressionTimer);
  }, [live2dReactive, status, modelPath]);

  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <canvas
        ref={canvasRef}
        style={{ display: "block", width: "100%", height: "100%" }}
      />
      {status === "loading" && (
        <div className="live2d-status">
          <span>加载中…</span>
        </div>
      )}
      {status === "error" && (
        <div className="live2d-status live2d-error">
          <p>模型加载失败</p>
          <small>{errorMsg}</small>
        </div>
      )}
    </div>
  );
}
