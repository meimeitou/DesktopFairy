import { useEffect, useRef, useState } from "react";
import { Live2DController } from "../live2d/Live2DController";

interface Props {
  modelPath: string;
}

type Status = "loading" | "ready" | "error";

export default function Live2DCanvas({ modelPath }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [status, setStatus] = useState<Status>("loading");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    setStatus("loading");
    setErrorMsg("");

    let cancelled = false;
    let controller: Live2DController | null = null;

    (async () => {
      try {
        controller = new Live2DController(canvas);
        await controller.initialize(modelPath);
        if (cancelled) {
          controller.release();
          controller = null;
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

    const onMouseMove = (e: MouseEvent) =>
      controller?.setDraggingFromEvent(e.clientX, e.clientY);
    window.addEventListener("mousemove", onMouseMove);

    return () => {
      cancelled = true;
      window.removeEventListener("mousemove", onMouseMove);
      controller?.release();
      controller = null;
    };
  }, [modelPath]);

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
