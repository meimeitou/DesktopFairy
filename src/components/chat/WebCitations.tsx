import type { WebCitation } from "../../shared/webCitation";
import "./WebCitations.css";

/** Clickable source links under an assistant reply that used web search. */
export function WebCitations({ citations }: { citations?: WebCitation[] }) {
  if (!citations?.length) return null;
  return (
    <div className="web-citations">
      {citations.map((c) => (
        <a
          key={`${c.index}-${c.url}`}
          className="web-citation"
          href={c.url}
          title={c.url}
          onClick={(e) => {
            e.preventDefault();
            void window.electronAPI.invoke("browser:open", { url: c.url });
          }}
        >
          <span className="web-citation-index">[{c.index}]</span>
          <span className="web-citation-title">{c.title}</span>
        </a>
      ))}
    </div>
  );
}
