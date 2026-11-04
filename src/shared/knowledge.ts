/** Historical chat citations remain displayable; vault retrieval uses the types below. */
export interface KnowledgeCitation {
  baseId: string;
  baseName: string;
  itemId: string;
  sourceName: string;
  text: string;
  kind?: "vector" | "semi_structured";
}


export interface VaultKnowledgeBase {
  id: string;
  kind: "vault";
  name: string;
  path: string;
  excludes: string[];
  obsidian: boolean;
  createdAt: number;
  fileCount: number;
  state: "pending" | "indexing" | "ready" | "error";
  processed?: number;
  discovered?: number;
  updatedAt?: number;
  errors: string[];
}

export interface VaultSearchHit {
  baseId: string;
  baseName: string;
  path: string;
  title: string;
  startLine: number;
  endLine: number;
  text: string;
  score: number;
  matchedBy: string[];
}

export interface VaultReadResult {
  baseId: string;
  path: string;
  text: string;
  startLine: number;
  endLine: number;
  totalLines: number;
  truncated: boolean;
  nextLine: number | null;
  warning?: string;
}
