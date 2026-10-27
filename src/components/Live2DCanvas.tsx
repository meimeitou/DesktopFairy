import { useEffect, useRef, useState, useCallback } from "react";
import type { Live2DController } from "../live2d/Live2DController";
import Live2DSpeechBubble from "./Live2DSpeechBubble";
import {
  parseBubbleCommand,
  parseReactionCommand,
} from "../shared/live2dReactions";
import {
  normalizeSpeechBubblePayload,
  truncateBubbleText,
  type SpeechBubblePayload,
} from "../shared/speechBubble";
import { normalizeSpeechBubbleMaxChars } from "../shared/settings";

interface Props {
  modelPath: string;
  modelScale?: number;
  modelOffsetX?: number;
  modelOffsetY?: number;
  live2dReactive?: boolean;
  live2dSpeechBubble?: boolean;
  live2dSpeechBubbleMaxChars?: number;
}

type Status = "loading" | "ready" | "error";

const api = window.electronAPI;
const EYE_TRACK_INTERVAL_MS = 200;

let cubismCorePromise: Promise<void> | null = null;

/** Cubism core is only needed by the resident pet window. */
function ensureCubismCore(): Promise<void> {
  if (typeof Live2DCubismCore !== "undefined") return Promise.resolve();
  if (!cubismCorePromise) {
    cubismCorePromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.dataset.cubismCore = "true";
      script.async = true;
      script.src = new URL(
        `${import.meta.env.BASE_URL}live2dcubismcore.min.js`,
        window.location.href,
      ).href;
      script.onload = () => {
        // 脚本 200 但没挂上全局（缓存了坏文件 / 版本不匹配）时不能算成功，
        // 否则后面 new Controller 阶段才炸，错误信息更难定位。
        if (typeof Live2DCubismCore === "undefined") {
          cubismCorePromise = null;
          reject(new Error("Live2D Cubism Core 未注册全局对象"));
          return;
        }
        resolve();
      };
      script.onerror = () => {
        cubismCorePromise = null;
        reject(new Error("Live2D Cubism Core 加载失败"));
      };
      document.head.appendChild(script);
    });
  }
  return cubismCorePromise;
}

export default function Live2DCanvas({
  modelPath,
  modelScale = 1.0,
  modelOffsetX = 0,
  modelOffsetY = 0,
  live2dReactive = true,
  live2dSpeechBubble = true,
  live2dSpeechBubbleMaxChars = 50,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const controllerRef = useRef<Live2DController | null>(null);
  const visibleRef = useRef(true);
  const trackingControlRef = useRef<{
    start: () => void;
    stop: () => void;
  } | null>(null);
  const layoutRef = useRef({ modelScale, modelOffsetX, modelOffsetY });
  const bubbleSettingsRef = useRef({
    live2dSpeechBubble,
    live2dSpeechBubbleMaxChars,
  });
  const [status, setStatus] = useState<Status>("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const [errorDetail, setErrorDetail] = useState("");
  const [bubbleState, setBubbleState] = useState<{
    text: string;
    key: number;
  } | null>(null);
  const bubbleSeqRef = useRef(0);

  layoutRef.current = { modelScale, modelOffsetX, modelOffsetY };
  bubbleSettingsRef.current = {
    live2dSpeechBubble,
    live2dSpeechBubbleMaxChars,
  };

  const refreshCanvasLayout = useCallback(() => {
    requestAnimationFrame(() => controllerRef.current?.resize());
  }, []);

  const showSpeechBubble = useCallback(
    (input: string | SpeechBubblePayload): boolean => {
      const { live2dSpeechBubble: enabled, live2dSpeechBubbleMaxChars: maxCharsSetting } =
        bubbleSettingsRef.current;
      if (!enabled) return false;

      const payload = normalizeSpeechBubblePayload(input);
      if (!payload.text.trim()) return false;

      const maxChars = normalizeSpeechBubbleMaxChars(maxCharsSetting);
      const truncated = truncateBubbleText(payload.text, maxChars);
      if (!truncated) return false;

      bubbleSeqRef.current += 1;
      setBubbleState({ text: truncated, key: bubbleSeqRef.current });
      return true;
    },
    []
  );

  const handleBubbleHidden = useCallback(() => {
    setBubbleState(null);
  }, []);

  const handleLive2DCommand = useCallback(
    (cmd: string) => {
      const manualBubble = parseBubbleCommand(cmd);
      if (manualBubble !== null) {
        showSpeechBubble({ text: manualBubble, source: "manual" });
        return;
      }

      const controller = controllerRef.current;
      if (cmd === "random_motion") {
        controller?.triggerRandomMotion();
        return;
      }
      if (cmd === "next_expression") {
        controller?.nextExpression();
        return;
      }

      const parsed = parseReactionCommand(cmd);
      if (!parsed) return;

      controller?.applyReaction(parsed.reaction, parsed.assistantText);
    },
    [showSpeechBubble]
  );

  const handleLive2DBubble = useCallback(
    (payload: string | SpeechBubblePayload) => {
      showSpeechBubble(payload);
    },
    [showSpeechBubble]
  );

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
    const unsubscribe = api.onLive2DBubble?.(handleLive2DBubble);
    return () => unsubscribe?.();
  }, [handleLive2DBubble]);

  useEffect(() => {
    window.addEventListener("resize", refreshCanvasLayout);
    const off = api.onMainWindowLayoutChanged?.(refreshCanvasLayout);
    return () => {
      window.removeEventListener("resize", refreshCanvasLayout);
      off?.();
    };
  }, [refreshCanvasLayout]);

  useEffect(() => {
    const applyVisibility = (visible: boolean) => {
      visibleRef.current = visible;
      const controller = controllerRef.current;
      if (controller) {
        if (visible) controller.run();
        else controller.pause();
      }
      if (visible) trackingControlRef.current?.start();
      else trackingControlRef.current?.stop();
    };

    applyVisibility(document.visibilityState !== "hidden");
    const onDocumentVisibility = () => {
      applyVisibility(document.visibilityState !== "hidden");
    };
    document.addEventListener("visibilitychange", onDocumentVisibility);
    const offMainWindow = api.onMainWindowVisibilityChanged?.(applyVisibility);
    return () => {
      document.removeEventListener("visibilitychange", onDocumentVisibility);
      offMainWindow?.();
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    setStatus("loading");
    setErrorMsg("");
    setErrorDetail("");

    let cancelled = false;
    let trackingTimer: ReturnType<typeof setInterval> | null = null;
    let lastCursor: { x: number; y: number } | null = null;
    let lastWinPos: { x: number; y: number } | null = null;
    // Holds the controller created by *this* effect run, so the cleanup
    // function can release exactly it (and avoid clobbering a controller
    // installed by a newer run when this async load resolves late).
    let controller: Live2DController | null = null;

    (async () => {
      try {
        await ensureCubismCore();
        if (cancelled) return;
        // Cubism 框架在模块求值阶段就读全局 Live2DCubismCore（cubismmodel 的
        // 枚举一求值就要 core），所以必须在 core 脚本就绪后再动态 import。
        // 静态 import 会让整个 MainView chunk 在 import 阶段抛 ReferenceError，
        // 结果是 #root 为空、只剩一个透明窗口挡住点击。
        const { Live2DController } = await import("../live2d/Live2DController");
        if (cancelled) return;
        controller = new Live2DController(canvas);
        controllerRef.current = controller;
        await controller.initialize(modelPath);
        const layout = layoutRef.current;
        controller.setScale(layout.modelScale);
        controller.setOffset(layout.modelOffsetX, layout.modelOffsetY);
        if (cancelled) {
          // release() is idempotent, so re-releasing here is safe even if
          // the cleanup function already released this controller. But we
          // must NOT null controllerRef.current unless it still points at
          // *this* controller — by the time this async block runs, a newer
          // load may have already installed a different controller.
          controller.release();
          if (controllerRef.current === controller) controllerRef.current = null;
          controller = null;
          return;
        }
        setStatus("ready");
      } catch (err) {
        if (cancelled) return;
        console.error("[Live2DCanvas]", err);
        const detail = err instanceof Error ? err.message : String(err);
        // Missing file / failed fetch → give the user an actionable hint
        // instead of a raw "HTTP 0 for dfmodel://…" message.
        const isMissing =
          /HTTP \d|Failed to fetch|NetworkError|could not load/i.test(detail);
        setErrorMsg(
          isMissing
            ? "模型文件不存在或无法读取，请打开聊天窗口 → 设置重新选择模型"
            : "模型加载失败",
        );
        setErrorDetail(detail);
        setStatus("error");
      }
    })();

    const startTracking = () => {
      if (trackingTimer) return;
      trackingTimer = setInterval(async () => {
        if (!visibleRef.current || !controllerRef.current) return;
        try {
          const [cursor, winPos] = await Promise.all([
            api.screenGetCursorPoint(),
            api.windowGetPosition(),
          ]);
          if (!cursor || !winPos) return;
          if (
            lastCursor?.x === cursor.x &&
            lastCursor?.y === cursor.y &&
            lastWinPos?.x === winPos.x &&
            lastWinPos?.y === winPos.y
          ) {
            return;
          }
          lastCursor = cursor;
          lastWinPos = winPos;
          controllerRef.current.setDraggingFromScreen(
            cursor.x,
            cursor.y,
            winPos,
          );
        } catch {
          /* ignore IPC errors during tracking */
        }
      }, EYE_TRACK_INTERVAL_MS);
    };

    const stopTracking = () => {
      if (trackingTimer) {
        clearInterval(trackingTimer);
        trackingTimer = null;
      }
      lastCursor = null;
      lastWinPos = null;
    };

    trackingControlRef.current = { start: startTracking, stop: stopTracking };
    if (visibleRef.current) startTracking();

    return () => {
      cancelled = true;
      stopTracking();
      trackingControlRef.current = null;
      controller?.release();
      // Don't clobber a controller installed by a newer effect run.
      if (controllerRef.current === controller) controllerRef.current = null;
      controller = null;
    };
  }, [modelPath]);

  // Random expression loop only when reactive mode is off
  useEffect(() => {
    if (live2dReactive || status !== "ready") return;
    const expressionTimer = setInterval(() => {
      controllerRef.current?.setRandomExpression();
    }, 8000);
    return () => clearInterval(expressionTimer);
  }, [live2dReactive, status, modelPath]);

  const bubbleDisplay = bubbleState?.text ?? null;

  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <canvas
        ref={canvasRef}
        style={{ display: "block", width: "100%", height: "100%" }}
      />
      <Live2DSpeechBubble
        key={bubbleState?.key ?? "idle"}
        text={bubbleDisplay}
        offsetX={modelOffsetX}
        offsetY={modelOffsetY}
        onHidden={handleBubbleHidden}
      />
      {status === "loading" && (
        <div className="live2d-status">
          <span>加载中…</span>
        </div>
      )}
      {status === "error" && (
        <div className="live2d-status live2d-error">
          <p>{errorMsg}</p>
          {errorDetail && <small>{errorDetail}</small>}
        </div>
      )}
    </div>
  );
}
