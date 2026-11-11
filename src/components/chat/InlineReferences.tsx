import type { SelectedHost } from "../../shared/hostSelection";
import { referenceParts } from "../../shared/composerReferences";
import "./InlineReferences.css";

export default function InlineReferences({ text, skillIds, hosts, skillErrors, hostErrors }: {
  text: string;
  skillIds?: string[];
  hosts?: SelectedHost[];
  skillErrors?: Record<string, string>;
  hostErrors?: Record<string, string>;
}) {
  return referenceParts(text, skillIds, hosts).map((part) => {
    const ref = part.reference;
    if (!ref) return part.text;
    const error = (ref.kind === "host" ? hostErrors : skillErrors)?.[ref.id];
    return <span key={part.start} className={`reference-inline reference-inline-${ref.kind}${error ? " has-error" : ""}`}
      title={error || ref.title}>{part.text}</span>;
  });
}
