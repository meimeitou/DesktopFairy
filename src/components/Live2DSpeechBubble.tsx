import { useEffect, useRef, useState, type CSSProperties } from "react";
import {
  SPEECH_BUBBLE_AUTO_HIDE_MS,
  SPEECH_BUBBLE_LEAVE_ANIM_MS,
  SPEECH_BUBBLE_LINE_MAX_WIDTH_PX,
  SPEECH_BUBBLE_MAX_LINES,
} from "../shared/speechBubble";
import "./Live2DSpeechBubble.css";

interface Props {
  text: string | null;
  offsetX?: number;
  offsetY?: number;
  onHidden?: () => void;
}

export default function Live2DSpeechBubble({
  text,
  offsetX = 0,
  offsetY = 0,
  onHidden,
}: Props) {
  const [visible, setVisible] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [displayText, setDisplayText] = useState("");
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const leaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onHiddenRef = useRef(onHidden);

  onHiddenRef.current = onHidden;

  const clearTimers = () => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
    if (leaveTimerRef.current) {
      clearTimeout(leaveTimerRef.current);
      leaveTimerRef.current = null;
    }
  };

  useEffect(() => {
    clearTimers();
    if (!text?.trim()) {
      setLeaving(false);
      setVisible(false);
      setDisplayText("");
      return;
    }

    setDisplayText(text);
    setLeaving(false);
    setVisible(true);

    hideTimerRef.current = setTimeout(() => {
      setLeaving(true);
      leaveTimerRef.current = setTimeout(() => {
        setVisible(false);
        setLeaving(false);
        setDisplayText("");
        onHiddenRef.current?.();
      }, SPEECH_BUBBLE_LEAVE_ANIM_MS);
    }, SPEECH_BUBBLE_AUTO_HIDE_MS);

    return clearTimers;
  }, [text]);

  if (!visible || !displayText) return null;

  return (
    <div
      className="live2d-speech-bubble"
      style={{
        left: `calc(50% + 14px + ${offsetX}px)`,
        top: `calc(0px + ${offsetY}px)`,
      }}
      aria-live="polite"
    >
      <div className={`live2d-speech-bubble-panel${leaving ? " leaving" : ""}`}>
        <div
          className="live2d-speech-bubble-inner"
          style={
            {
              "--bubble-line-max-width": `${SPEECH_BUBBLE_LINE_MAX_WIDTH_PX}px`,
            } as CSSProperties
          }
        >
          <span
            className="live2d-speech-bubble-text"
            style={
              {
                "--bubble-max-lines": SPEECH_BUBBLE_MAX_LINES,
              } as CSSProperties
            }
          >
            {displayText}
          </span>
          <span className="live2d-speech-bubble-tail" aria-hidden="true" />
        </div>
      </div>
    </div>
  );
}
