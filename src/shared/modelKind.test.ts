import { createRequire } from "node:module";
import { describe, it, expect } from "vitest";
import { normalizeProvider } from "./providers";
import {
  addModelToLists,
  displayModelKind,
  enabledModelCount,
  partitionDraftToArrays,
  providerHasModelId,
  removeModelFromLists,
  type ProviderModelLists,
} from "./modelKind";

const require = createRequire(import.meta.url);
const {
  classifyModelKind,
  classifyCatalog,
} = require("../../electron/modelKind.cjs") as {
  classifyModelKind: (id: string, raw?: unknown) => string;
  classifyCatalog: (list: unknown) => Array<{ id: string; kind: string }>;
};

describe("classifyModelKind", () => {
  it("prefers API embedding type over a chat-like id", () => {
    expect(
      classifyModelKind("gpt-custom", { id: "gpt-custom", type: "embedding" })
    ).toBe("embedding");
  });

  it("prefers API rerank type", () => {
    expect(
      classifyModelKind("foo", { id: "foo", task: "rerank" })
    ).toBe("rerank");
  });

  it("treats explicit API chat as chat even if the id looks like embedding", () => {
    expect(
      classifyModelKind("text-embedding-3-small", {
        id: "text-embedding-3-small",
        type: "chat",
      })
    ).toBe("chat");
  });

  it("uses conservative id heuristics when API has no type", () => {
    expect(classifyModelKind("text-embedding-3-small", { id: "text-embedding-3-small" })).toBe(
      "embedding"
    );
    expect(classifyModelKind("nomic-embed-text", null)).toBe("embedding");
    expect(classifyModelKind("BAAI/bge-reranker-v2-m3", null)).toBe("rerank");
    expect(classifyModelKind("gpt-4o-mini", null)).toBe("chat");
  });

  it("leaves names without embed/rerank tokens as chat (missed labels)", () => {
    expect(classifyModelKind("bge-m3", null)).toBe("chat");
  });

  it("classifies well-known non-text models as other", () => {
    expect(classifyModelKind("tts-1", null)).toBe("other");
    expect(classifyModelKind("whisper-1", null)).toBe("other");
    expect(classifyModelKind("dall-e-3", null)).toBe("other");
    expect(classifyModelKind("omni-moderation-latest", null)).toBe("other");
  });

  it("does not treat multimodal chat ids as other", () => {
    expect(classifyModelKind("gpt-4o-audio-preview", null)).toBe("chat");
    expect(classifyModelKind("llama-3.2-vision", null)).toBe("chat");
  });
});

describe("classifyCatalog", () => {
  it("drops other models and keeps chat/embedding/rerank", () => {
    expect(
      classifyCatalog([
        { id: "gpt-4o-mini" },
        { id: "text-embedding-3-small" },
        { id: "tts-1" },
        { id: "bge-reranker-v2-m3" },
      ])
    ).toEqual([
      { id: "gpt-4o-mini", kind: "chat" },
      { id: "text-embedding-3-small", kind: "embedding" },
      { id: "bge-reranker-v2-m3", kind: "rerank" },
    ]);
  });

  it("accepts string entries and name fields", () => {
    expect(classifyCatalog(["llama3.2", { name: "nomic-embed-text" }])).toEqual([
      { id: "llama3.2", kind: "chat" },
      { id: "nomic-embed-text", kind: "embedding" },
    ]);
  });
});

const original: ProviderModelLists = {
  models: ["gpt-4o-mini", "text-embedding-3-small"],
  embeddingModels: ["bge-m3"],
  rerankModels: [],
};

describe("partitionDraftToArrays", () => {
  it("keeps existing chat membership even when remote classifies embedding", () => {
    const remote = new Map([
      ["text-embedding-3-small", "embedding" as const],
      ["gpt-4o-mini", "chat" as const],
    ]);
    expect(
      partitionDraftToArrays(
        ["gpt-4o-mini", "text-embedding-3-small"],
        original,
        remote
      )
    ).toEqual({
      models: ["gpt-4o-mini", "text-embedding-3-small"],
      embeddingModels: [],
      rerankModels: [],
    });
  });

  it("writes newly checked ids to the classified array", () => {
    const remote = new Map([
      ["qwen3-embedding", "embedding" as const],
      ["bge-reranker", "rerank" as const],
      ["llama3.2", "chat" as const],
    ]);
    expect(
      partitionDraftToArrays(
        ["llama3.2", "qwen3-embedding", "bge-reranker", "gpt-4o-mini"],
        { models: ["gpt-4o-mini"], embeddingModels: [], rerankModels: [] },
        remote
      )
    ).toEqual({
      models: ["gpt-4o-mini", "llama3.2"],
      embeddingModels: ["qwen3-embedding"],
      rerankModels: ["bge-reranker"],
    });
  });
});

describe("displayModelKind", () => {
  it("uses membership for enabled ids", () => {
    expect(
      displayModelKind(
        "text-embedding-3-small",
        original,
        new Map([["text-embedding-3-small", "embedding"]])
      )
    ).toBe("chat");
    expect(
      displayModelKind("bge-m3", original, new Map([["bge-m3", "chat"]]))
    ).toBe("embedding");
  });
});

describe("list helpers", () => {
  it("counts and detects membership across three arrays", () => {
    expect(enabledModelCount(original)).toBe(3);
    expect(providerHasModelId(original, "bge-m3")).toBe(true);
    expect(providerHasModelId(original, "missing")).toBe(false);
  });

  it("refuses to add a duplicate id via addModelToLists", () => {
    const next = addModelToLists(original, "gpt-4o-mini", "embedding");
    expect(next).toBe(original);
  });

  it("adds and removes by kind", () => {
    const added = addModelToLists(
      { models: [], embeddingModels: [], rerankModels: [] },
      "bge-m3",
      "embedding"
    );
    expect(added.embeddingModels).toEqual(["bge-m3"]);
    expect(removeModelFromLists(added, "bge-m3")).toEqual({
      models: [],
      embeddingModels: [],
      rerankModels: [],
    });
  });
});

describe("normalizeProvider", () => {
  it("fills missing embedding/rerank arrays on old settings", () => {
    const normalized = normalizeProvider({
      id: "openai",
      name: "OpenAI",
      type: "openai",
      apiHost: "https://api.openai.com/v1",
      apiKey: "",
      enabled: true,
      isSystem: true,
      models: ["gpt-4o-mini"],
    } as Parameters<typeof normalizeProvider>[0]);
    expect(normalized.embeddingModels).toEqual([]);
    expect(normalized.rerankModels).toEqual([]);
    expect(normalized.models).toEqual(["gpt-4o-mini"]);
  });
});
