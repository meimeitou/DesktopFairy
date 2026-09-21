import { Button, Icon } from "animal-island-ui";
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
          <Icon name="Code" size={52} className="terminal-empty-mark" />
          <Button
            type="text"
            className="terminal-empty-local"
            autoFocus
            onClick={onOpenLocal}
          >
            <span className="terminal-empty-cursor" aria-hidden="true" />
            打开本地终端
          </Button>
        </div>
        {recent.length > 0 && (
          <div className="terminal-empty-recent">
            <div className="terminal-empty-recent-label">最近连接</div>
            {recent.map((entry) => (
              <Button
                key={`${entry.host.id}-${entry.connectedAt}`}
                type="text"
                className="terminal-empty-recent-item"
                onClick={() => onOpenRecent(entry)}
              >
                <span className="terminal-empty-recent-name">{entry.host.name}</span>
                <span className="terminal-empty-recent-detail">
                  {describeHost(entry.host)}
                </span>
              </Button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
