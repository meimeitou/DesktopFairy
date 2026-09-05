import { describe, expect, it } from "vitest";
import {
  filterHitsByThreshold,
  mergeKnowledgeHits,
  normalizeKnowledgeSettings,
  splitMarkdownChunks,
  uniqueCopyName,
  replaceDocumentImages,
  type KnowledgeHit,
} from "./knowledge";

function hit(partial: Partial<KnowledgeHit> & { score: number }): KnowledgeHit {
  return {
    baseId: "b1",
    baseName: "库",
    itemId: "i1",
    itemType: "note",
    sourceName: "笔记",
    chunkIndex: 0,
    text: "text",
    ...partial,
  };
}

describe("normalizeKnowledgeSettings", () => {
  it("fills defaults and clamps overlap below chunkSize", () => {
    const next = normalizeKnowledgeSettings({
      chunkSize: 200,
      chunkOverlap: 500,
      topK: 99,
    });
    expect(next.chunkSize).toBe(200);
    expect(next.chunkOverlap).toBeLessThan(next.chunkSize);
    expect(next.topK).toBe(20);
    expect(next.scoreThreshold).toBe(0.5);
  });

  it("clamps scoreThreshold to 0–1", () => {
    expect(normalizeKnowledgeSettings({ scoreThreshold: 1.8 }).scoreThreshold).toBe(1);
    expect(normalizeKnowledgeSettings({ scoreThreshold: -0.2 }).scoreThreshold).toBe(0);
  });
});

describe("filterHitsByThreshold", () => {
  it("keeps hits that meet the cosine threshold", () => {
    const kept = filterHitsByThreshold(
      [
        hit({ score: 0.49, sourceName: "low" }),
        hit({ score: 0.5, sourceName: "edge" }),
        hit({ score: 0.9, sourceName: "high" }),
      ],
      0.5,
    );
    expect(kept.map((h) => h.sourceName)).toEqual(["edge", "high"]);
  });
});

describe("splitMarkdownChunks", () => {
  it("keeps heading blocks together when they fit", () => {
    const chunks = splitMarkdownChunks(
      "# 标题\n\n第一段内容。\n\n## 第二节\n\n第二段内容。",
      80,
      10,
    );
    expect(chunks.length).toBeGreaterThan(0);
    expect(chunks.join(" ")).toContain("第一段");
    expect(chunks.join(" ")).toContain("第二段");
  });

  it("hard-splits oversized blocks", () => {
    const chunks = splitMarkdownChunks("a".repeat(50), 20, 4);
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.join("").includes("a")).toBe(true);
  });
});

describe("mergeKnowledgeHits", () => {
  it("keeps global topK by score", () => {
    const merged = mergeKnowledgeHits(
      [
        hit({ score: 0.2, sourceName: "low" }),
        hit({ score: 0.9, sourceName: "high" }),
        hit({ score: 0.5, sourceName: "mid" }),
      ],
      2,
    );
    expect(merged.map((h) => h.sourceName)).toEqual(["high", "mid"]);
  });
});

describe("uniqueCopyName", () => {
  it("adds numeric suffix", () => {
    expect(uniqueCopyName(["报告.pdf"], "报告.pdf")).toBe("报告 (2).pdf");
  });
});

describe("replaceDocumentImages", () => {
  it("replaces base64 markdown images with a placeholder", () => {
    const next = replaceDocumentImages(
      "前言\n\n![图1](data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB)\n\n后记",
    );
    expect(next).toContain("[图片]");
    expect(next).not.toMatch(/base64/i);
    expect(next).toContain("前言");
    expect(next).toContain("后记");
  });

  it("replaces mineru relative image paths and html img", () => {
    const next = replaceDocumentImages(
      "![x](images/0.jpg)\n<img src=\"data:image/jpeg;base64,abc\" />\n![ok](https://example.com/a.png)",
    );
    expect(next).toContain("[图片]");
    expect(next).toContain("![ok](https://example.com/a.png)");
    expect(next).not.toContain("images/0.jpg");
  });
});
