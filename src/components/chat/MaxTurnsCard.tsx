interface Props {
  maxTurns: number;
  onContinue: () => void;
  onCancel: () => void;
}

export default function MaxTurnsCard({
  maxTurns,
  onContinue,
  onCancel,
}: Props) {
  return (
    <div className="max-turns-card">
      <div className="max-turns-card-head">
        <span className="max-turns-card-title">已达到最大执行轮数</span>
        <span className="max-turns-card-badge">{maxTurns} 轮</span>
      </div>
      <div className="max-turns-card-actions">
        <button
          type="button"
          className="agent-tool-btn agent-tool-btn-deny"
          onClick={onCancel}
        >
          取消
        </button>
        <button
          type="button"
          className="agent-tool-btn agent-tool-btn-approve"
          onClick={onContinue}
        >
          继续执行
        </button>
      </div>
    </div>
  );
}
