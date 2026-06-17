interface Props {
  content: string;
  commandMode?: boolean;
}

export default function TerminalOutput({ content, commandMode = false }: Props) {
  if (!content) return null;
  return (
    <pre
      className={`agent-tool-terminal${commandMode ? " agent-tool-terminal-command" : ""}`}
    >
      {content}
    </pre>
  );
}
