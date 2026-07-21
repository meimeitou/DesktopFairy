export interface SelectionActionItem {
  id: string;
  name: string;
  enabled: boolean;
  isBuiltIn: boolean;
  icon?: string;
  /** Prompt template; use {{text}} for selected text */
  prompt?: string;
  /** Format: Label|URL with {{query}} or {{queryString}} */
  searchEngine?: string;
}

export const DEFAULT_SEARCH_ENGINE =
  "Google|https://www.google.com/search?q={{queryString}}";

export const DEFAULT_SELECTION_ACTIONS: SelectionActionItem[] = [
  {
    id: "ask",
    name: "询问",
    enabled: true,
    isBuiltIn: true,
    icon: "💬",
  },
  {
    id: "translate",
    name: "翻译",
    enabled: true,
    isBuiltIn: true,
    icon: "🌐",
    prompt: "请翻译以下内容，只输出译文：\n\n{{text}}",
  },
  {
    id: "explain",
    name: "解释",
    enabled: true,
    isBuiltIn: true,
    icon: "💡",
    prompt: "请解释以下内容：\n\n{{text}}",
  },
  {
    id: "summary",
    name: "总结",
    enabled: true,
    isBuiltIn: true,
    icon: "📝",
    prompt: "请总结以下内容的要点：\n\n{{text}}",
  },
  {
    id: "search",
    name: "搜索",
    enabled: true,
    isBuiltIn: true,
    icon: "🔍",
    searchEngine: DEFAULT_SEARCH_ENGINE,
  },
  {
    id: "copy",
    name: "复制",
    enabled: true,
    isBuiltIn: true,
    icon: "📋",
  },
  {
    id: "quote",
    name: "引用",
    enabled: false,
    isBuiltIn: true,
    icon: "❝",
  },
];

export function formatFencedText(text: string): string {
  return `\`\`\`\n${text}\n\`\`\``;
}

export function formatActionPrompt(
  template: string | undefined,
  text: string,
  options?: { fenceText?: boolean },
): string {
  const body = options?.fenceText ? formatFencedText(text) : text;
  if (!template) return body;
  return template.replace(/\{\{text\}\}/g, body);
}

export function formatQuotedText(text: string): string {
  const lines = text.split("\n").map((line) => `> ${line}`);
  return lines.join("\n");
}

export function buildSearchUrl(engine: string, query: string): string {
  const parts = engine.split("|");
  const urlTemplate = parts[1] || parts[0];
  const encoded = encodeURIComponent(query);
  return urlTemplate
    .replace(/\{\{queryString\}\}/g, encoded)
    .replace(/\{\{query\}\}/g, encoded);
}

export function mergeSelectionActions(
  saved: SelectionActionItem[] | undefined
): SelectionActionItem[] {
  if (!saved?.length) return DEFAULT_SELECTION_ACTIONS.map((a) => ({ ...a }));
  const defaultsById = new Map(
    DEFAULT_SELECTION_ACTIONS.map((a) => [a.id, a])
  );
  const merged = saved.map((item) => {
    const def = defaultsById.get(item.id);
    return def ? { ...def, ...item, isBuiltIn: def.isBuiltIn } : item;
  });
  for (const def of DEFAULT_SELECTION_ACTIONS) {
    if (!merged.some((m) => m.id === def.id)) {
      merged.push({ ...def });
    }
  }
  return merged;
}
