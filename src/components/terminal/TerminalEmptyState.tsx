import type { SshRecentEntry } from "../../shared/terminalSettings";

function describeHost(h: { user: string; host: string; port: number }): string {
  return h.port === 22 ? `${h.user}@${h.host}` : `${h.user}@${h.host}:${h.port}`;
}

export default function TerminalEmptyState({
  recent,
  onOpenLocal,
  onOpenRecent,
}: {
  recent: SshRecentEntry[];
  onOpenLocal: () => void;
  onOpenRecent: (entry: SshRecentEntry) => void;
}) {
  return (
    <div className="terminal-empty">
      <div className="terminal-empty-inner">
        <div className="terminal-empty-hero">
          <svg
            className="terminal-empty-mark"
            width="52"
            height="52"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <polyline points="4 17 10 11 4 5" />
            <line x1="12" y1="19" x2="20" y2="19" />
          </svg>
          <button
            type="button"
            className="terminal-empty-local"
            autoFocus
            onClick={onOpenLocal}
          >
            <span className="terminal-empty-cursor" aria-hidden="true" />
            打开本地终端
          </button>
        </div>
        {recent.length > 0 && (
          <div className="terminal-empty-recent">
            <div className="terminal-empty-recent-label">最近连接</div>
            {recent.map((entry) => (
              <button
                key={`${entry.host.id}-${entry.connectedAt}`}
                type="button"
                className="terminal-empty-recent-item"
                onClick={() => onOpenRecent(entry)}
              >
                <span className="terminal-empty-recent-name">{entry.host.name}</span>
                <span className="terminal-empty-recent-detail">
                  {describeHost(entry.host)}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
