/** Traveling stroke that follows the composer’s rounded rect, including corners. */
export default function ComposerBusyHalo() {
  return (
    <span className="chat-input-busy-halo" aria-hidden>
      <svg className="chat-input-busy-svg">
        <rect
          className="chat-input-busy-stroke chat-input-busy-stroke-ring"
          x="0"
          y="0"
          width="100%"
          height="100%"
          rx="20"
          ry="20"
        />
        <rect
          className="chat-input-busy-stroke chat-input-busy-stroke-soft"
          x="0"
          y="0"
          width="100%"
          height="100%"
          rx="20"
          ry="20"
          pathLength={100}
        />
        <rect
          className="chat-input-busy-stroke chat-input-busy-stroke-core"
          x="0"
          y="0"
          width="100%"
          height="100%"
          rx="20"
          ry="20"
          pathLength={100}
        />
      </svg>
    </span>
  );
}
