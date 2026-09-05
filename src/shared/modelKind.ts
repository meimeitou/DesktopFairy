export type CuratedModelKind = "chat" | "embedding" | "rerank";

export interface CatalogModel {
  id: string;
  kind: CuratedModelKind;
}

export const MODEL_KIND_LABELS: Record<CuratedModelKind, string> = {
  chat: "对话",
  embedding: "Embedding",
  rerank: "Rerank",
};

export const MODEL_KIND_FILTERS: Array<{ id: "all" | CuratedModelKind; label: string }> = [
  { id: "all", label: "全部" },
  { id: "chat", label: "对话" },
  { id: "embedding", label: "Embedding" },
  { id: "rerank", label: "Rerank" },
];

export interface ProviderModelLists {
  models: string[];
  embeddingModels: string[];
  rerankModels: string[];
}

export function emptyProviderModelLists(): ProviderModelLists {
  return { models: [], embeddingModels: [], rerankModels: [] };
}

/** Membership wins over remote classification so existing chat entries never move. */
export function displayModelKind(
  id: string,
  original: ProviderModelLists,
  remoteKind: Map<string, CuratedModelKind>
): CuratedModelKind {
  if ((original.models ?? []).includes(id)) return "chat";
  if ((original.embeddingModels ?? []).includes(id)) return "embedding";
  if ((original.rerankModels ?? []).includes(id)) return "rerank";
  return remoteKind.get(id) ?? "chat";
}

export function partitionDraftToArrays(
  draftIds: Iterable<string>,
  original: ProviderModelLists,
  remoteKind: Map<string, CuratedModelKind>
): ProviderModelLists {
  const origChat = new Set(original.models ?? []);
  const origEmbed = new Set(original.embeddingModels ?? []);
  const origRerank = new Set(original.rerankModels ?? []);
  const models: string[] = [];
  const embeddingModels: string[] = [];
  const rerankModels: string[] = [];
  const ids = [...new Set(draftIds)].sort((a, b) => a.localeCompare(b));
  for (const id of ids) {
    if (origChat.has(id)) models.push(id);
    else if (origEmbed.has(id)) embeddingModels.push(id);
    else if (origRerank.has(id)) rerankModels.push(id);
    else {
      const kind = remoteKind.get(id) ?? "chat";
      if (kind === "embedding") embeddingModels.push(id);
      else if (kind === "rerank") rerankModels.push(id);
      else models.push(id);
    }
  }
  return { models, embeddingModels, rerankModels };
}

export function enabledModelsWithKind(
  lists: ProviderModelLists
): CatalogModel[] {
  return [
    ...(lists.models ?? []).map((id) => ({ id, kind: "chat" as const })),
    ...(lists.embeddingModels ?? []).map((id) => ({
      id,
      kind: "embedding" as const,
    })),
    ...(lists.rerankModels ?? []).map((id) => ({ id, kind: "rerank" as const })),
  ];
}

export function enabledModelCount(lists: ProviderModelLists): number {
  return (
    (lists.models ?? []).length +
    (lists.embeddingModels ?? []).length +
    (lists.rerankModels ?? []).length
  );
}

export function providerHasModelId(
  lists: ProviderModelLists,
  id: string
): boolean {
  return (
    (lists.models ?? []).includes(id) ||
    (lists.embeddingModels ?? []).includes(id) ||
    (lists.rerankModels ?? []).includes(id)
  );
}

export function addModelToLists(
  lists: ProviderModelLists,
  id: string,
  kind: CuratedModelKind
): ProviderModelLists {
  if (providerHasModelId(lists, id)) return lists;
  if (kind === "embedding") {
    return {
      ...lists,
      embeddingModels: [...(lists.embeddingModels ?? []), id].sort((a, b) =>
        a.localeCompare(b)
      ),
    };
  }
  if (kind === "rerank") {
    return {
      ...lists,
      rerankModels: [...(lists.rerankModels ?? []), id].sort((a, b) =>
        a.localeCompare(b)
      ),
    };
  }
  return {
    ...lists,
    models: [...(lists.models ?? []), id].sort((a, b) => a.localeCompare(b)),
  };
}

export function removeModelFromLists(
  lists: ProviderModelLists,
  id: string
): ProviderModelLists {
  return {
    models: (lists.models ?? []).filter((m) => m !== id),
    embeddingModels: (lists.embeddingModels ?? []).filter((m) => m !== id),
    rerankModels: (lists.rerankModels ?? []).filter((m) => m !== id),
  };
}

export function findEnabledModelKind(
  lists: ProviderModelLists,
  id: string
): CuratedModelKind | undefined {
  if ((lists.models ?? []).includes(id)) return "chat";
  if ((lists.embeddingModels ?? []).includes(id)) return "embedding";
  if ((lists.rerankModels ?? []).includes(id)) return "rerank";
  return undefined;
}
