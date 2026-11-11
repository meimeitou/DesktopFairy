import { selectedHostLabel, type SelectedHost } from "./hostSelection";

export interface ComposerReference {
  kind: "skill" | "host";
  id: string;
  text: string;
  title: string;
}
export interface ReferencePart {
  text: string;
  start: number;
  end: number;
  reference?: ComposerReference;
}

export function hostMention(host: SelectedHost) {
  return `@${selectedHostLabel(host)}`;
}

/** Resolve only explicitly selected references; ordinary @text is left alone. */
export function referenceParts(text: string, skillIds: string[] = [], hosts: SelectedHost[] = []): ReferencePart[] {
  const references: ComposerReference[] = [
    ...skillIds.map((id) => ({ kind: "skill" as const, id, text: `@${id}`, title: `技能：${id}` })),
    ...hosts.flatMap((host) => {
      const reference = { kind: "host" as const, id: host.id, text: hostMention(host), title: `机器：${selectedHostLabel(host)}` };
      // Older messages used the name alone. Do not guess among same-name hosts.
      return hosts.filter((h) => h.name === host.name).length === 1
        ? [reference, { ...reference, text: `@${host.name}` }]
        : [reference];
    }),
  ].sort((a, b) => b.text.length - a.text.length);
  const parts: ReferencePart[] = [];
  let plainStart = 0;
  for (let index = 0; index < text.length; index++) {
    if (text[index] !== "@" || (index > 0 && !/[\s（(，,：:]/.test(text[index - 1]))) continue;
    const reference = references.find((ref) => text.startsWith(ref.text, index) &&
      (index + ref.text.length === text.length || /[\s，。！？；：、,.!?;:()（）]/.test(text[index + ref.text.length])));
    if (!reference) continue;
    if (plainStart < index) parts.push({ text: text.slice(plainStart, index), start: plainStart, end: index });
    const end = index + reference.text.length;
    parts.push({ text: text.slice(index, end), start: index, end, reference });
    plainStart = end;
    index = end - 1;
  }
  if (plainStart < text.length) parts.push({ text: text.slice(plainStart), start: plainStart, end: text.length });
  return parts;
}

export function retainedReferences(text: string, skillIds: string[] = [], hosts: SelectedHost[] = []) {
  const refs = referenceParts(text, skillIds, hosts).flatMap((part) => part.reference ? [part.reference] : []);
  return {
    skillIds: skillIds.filter((id) => refs.some((ref) => ref.kind === "skill" && ref.id === id)),
    hosts: hosts.filter((host) => refs.some((ref) => ref.kind === "host" && ref.id === host.id)),
  };
}

export function hasReferenceTask(text: string, skillIds: string[] = [], hosts: SelectedHost[] = []) {
  return referenceParts(text, skillIds, hosts).some((part) => !part.reference && !!part.text.trim());
}

/** Migrate metadata-only drafts without moving references already in the text. */
export function withMissingReferences(text: string, skillIds: string[] = [], hosts: SelectedHost[] = []) {
  const retained = retainedReferences(text, skillIds, hosts);
  const missing = [
    ...hosts.filter((h) => !retained.hosts.includes(h)).map(hostMention),
    ...skillIds.filter((id) => !retained.skillIds.includes(id)).map((id) => `@${id}`),
  ];
  return missing.length ? `${missing.join(" ")}${text ? ` ${text}` : " "}` : text;
}
