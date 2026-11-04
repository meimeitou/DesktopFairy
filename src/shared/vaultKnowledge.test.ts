import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { createRequire } from "node:module";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { Worker } from "node:worker_threads";
import { spawn } from "node:child_process";
const require = createRequire(import.meta.url);
const { textTokens, matchQuery, parseNote, normalizeExcludes, readLines } = require("../../electron/knowledge/vaultFiles.cjs");
const { broadcast } = require("../../electron/knowledge/vaultService.cjs");

describe("vault files", () => {
  it("tokenizes adjacent Chinese/English consistently and escapes FTS input", () => {
    expect(textTokens("Electron知识库 V2")).toBe("electron 知 识 库 v2");
    expect(matchQuery("Electron知识库 OR \"x\"*")).toBe('"electron" AND "知 识 库" AND "or" AND "x"');
  });
  it("parses YAML metadata, inline tags and malformed frontmatter without losing source", () => {
    expect(parseNote('---\ntitle: 笔记\naliases: [另一个名称]\ntags: [学习]\n---\n# 标题\n内容 #项目/一', 'note.md')).toMatchObject({ title: "笔记", aliases: ["另一个名称"], tags: ["学习", "项目/一"], warning: "" });
    expect(parseNote('---\naliases: [broken\n---\n# 标题', 'note.md').warning).toContain("解析失败");
    expect(() => normalizeExcludes(["../private"])).toThrow();
    expect(normalizeExcludes(["private/", "private"])).toEqual(["private"]);
    if (process.platform === "darwin" || process.platform === "win32") {
      expect(() => readLines({ id: "case", path: vault.path, excludes: ["Private"] }, { path: "private/secret.md" })).toThrow();
    }
  });
  it("skips destroyed render frames when broadcasting vault updates", () => {
    const deadFrameSend = vi.fn();
    const liveFrameSend = vi.fn();
    const destroyedWindowSend = vi.fn();
    broadcast([
      { isDestroyed: () => false, webContents: { isDestroyed: () => false, mainFrame: { isDestroyed: () => true, send: deadFrameSend } } },
      { isDestroyed: () => false, webContents: { isDestroyed: () => false, mainFrame: { isDestroyed: () => false, send: liveFrameSend } } },
      { isDestroyed: () => true, webContents: { isDestroyed: () => false, mainFrame: { isDestroyed: () => false, send: destroyedWindowSend } } },
    ]);
    expect(deadFrameSend).not.toHaveBeenCalled();
    expect(liveFrameSend).toHaveBeenCalledWith("knowledge:updated");
    expect(destroyedWindowSend).not.toHaveBeenCalled();
  });
});

describe("vault worker integration", () => {
  let temp: string;
  let worker: {
    postMessage: (value: unknown) => void;
    on: (event: string, callback: (...args: unknown[]) => void) => unknown;
    terminate: () => Promise<unknown>;
  };
  let seq = 0;
  const requests = new Map<number, { resolve: (value: unknown) => void; reject: (error: Error) => void }>();
  let vault: { id: string; name: string; path: string; excludes: string[] };
  function rpc(method: string, args: Record<string, unknown> = {}, vaults = [vault]): Promise<Record<string, unknown>> {
    const id = ++seq;
    return new Promise((resolve, reject) => {
      requests.set(id, { resolve: (value) => resolve(value as Record<string, unknown>), reject });
      worker.postMessage({ id, method, vaults, args });
    });
  }
  beforeAll(async () => {
    temp = fs.mkdtempSync(path.join(os.tmpdir(), "df-vault-test-"));
    const directory = path.join(temp, "notes"); fs.mkdirSync(directory);
    vault = { id: "vault-test", name: "测试库", path: fs.realpathSync(directory), excludes: ["private"] };
    fs.writeFileSync(path.join(directory, "intro.md"), '---\naliases: [知识别名]\ntags: [学习]\n---\n# Electron知识库\n中文全文搜索内容\n## 后台索引\n链接 [[folder/target#细节]]\n');
    fs.mkdirSync(path.join(directory, "folder"));
    fs.writeFileSync(path.join(directory, "folder/target.md"), '# 目标笔记\n## 细节\nCurrent source\n');
    fs.mkdirSync(path.join(directory, "private")); fs.writeFileSync(path.join(directory, "private/secret.md"), "私密内容");
    fs.mkdirSync(path.join(directory, ".obsidian")); fs.writeFileSync(path.join(directory, ".obsidian/config.md"), "隐藏配置");
    fs.writeFileSync(path.join(directory, "ignored.txt"), "忽略附件");
    fs.writeFileSync(path.join(temp, "outside.md"), "外部秘密");
    fs.symlinkSync(path.join(temp, "outside.md"), path.join(directory, "link.md"));
    const workerPath = path.resolve("electron/knowledge/vaultWorker.cjs");
    const workerData = { indexDir: path.join(temp, "indexes") };
    try {
      const Database = require("better-sqlite3");
      const probe = new Database(":memory:"); probe.close();
      worker = new Worker(workerPath, { workerData });
    } catch {
      // build:dir rebuilds native modules for Electron. Keep npm test usable afterwards.
      const bridge = `const {Worker}=require('worker_threads');const w=new Worker(${JSON.stringify(workerPath)},{workerData:${JSON.stringify(workerData)}});process.on('message',m=>w.postMessage(m));w.on('message',m=>process.send(m));w.on('error',e=>{console.error(e);process.exit(1)});`;
      const child = spawn(require("electron"), ["-e", bridge], { env: { ...process.env, ELECTRON_RUN_AS_NODE: "1" }, stdio: ["ignore", "ignore", "pipe", "ipc"] });
      worker = {
        postMessage: (value) => child.send(value),
        on: (event, callback) => child.on(event, callback),
        terminate: () => new Promise((resolve) => { child.once("exit", resolve); child.kill(); }),
      };
    }
    worker.on("message", (value) => {
      const { id, result, error } = value as { id: number; result: unknown; error?: string };
      const request = requests.get(id); if (!request) return;
      requests.delete(id); if (error) request.reject(new Error(error)); else request.resolve(result);
    });
    worker.on("error", (error) => { for (const request of requests.values()) request.reject(error as Error); requests.clear(); });
    await rpc("scan");
  });
  afterAll(async () => { await worker?.terminate(); fs.rmSync(temp, { recursive: true, force: true }); });
  it("indexes only allowed Markdown, finds Chinese, mixed words, aliases and tags", async () => {
    const status = await rpc("scan"); expect(status.fileCount).toBe(2);
    for (const query of ["全文搜索", "Electron知识库", "知识别名", "学习"]) {
      const result = await rpc("search", { query });
      expect(result.hits).toEqual(expect.arrayContaining([expect.objectContaining({ path: "intro.md", baseName: "测试库", startLine: expect.any(Number) })]));
    }
    const aliasHits = (await rpc("search", { query: "知识别名" })).hits as { matchedBy: string[] }[];
    expect(aliasHits[0].matchedBy).toContain("别名");
    const bodyHits = (await rpc("search", { query: "全文搜索" })).hits as { text: string; startLine: number }[];
    expect(bodyHits[0].text).toContain("全文搜索"); expect(bodyHits[0].text).not.toContain("aliases:");
    expect(bodyHits[0].startLine).toBeGreaterThan(1);
    expect((await rpc("search", { query: "私密内容" })).hits).toEqual([]);
    expect((await rpc("search", { query: '" OR * NOT' })).hits).toEqual([]);
  });
  it("lists searchable paginated directories, including exclusions but not hidden or symlink directories", async () => {
    fs.mkdirSync(path.join(vault.path, "folder/nested"));
    fs.symlinkSync(path.join(vault.path, "folder"), path.join(vault.path, "linked-folder"));
    const all = await rpc("directories");
    expect(all).toEqual({ directories: ["folder", "folder/nested", "private"], hasMore: false });
    expect(await rpc("directories", { query: "FOLDER", limit: 1 })).toEqual({ directories: ["folder"], hasMore: true });
    expect(await rpc("directories", { query: "folder", limit: 1, offset: 1 })).toEqual({ directories: ["folder/nested"], hasMore: false });
    expect(await rpc("directories", { query: "missing" })).toEqual({ directories: [], hasMore: false });
    expect(await rpc("directories", { query: "private" })).toEqual({ directories: ["private"], hasMore: false });
  });
  it("reads current source and paginates without writing into the vault", async () => {
    const note = path.join(vault.path, "intro.md");
    const original = fs.readFileSync(note, "utf8");
    fs.writeFileSync(note, original + "\n即时修改原文");
    const result = await rpc("read", { path: "intro.md", startLine: 6, endLine: 7 });
    expect(result).toMatchObject({ startLine: 6, endLine: 7, truncated: true, nextLine: 8 });
    expect((await rpc("read", { path: "intro.md" })).text).toContain("即时修改原文");
    expect(fs.readFileSync(note, "utf8")).toBe(original + "\n即时修改原文");
    fs.writeFileSync(path.join(vault.path, "long.md"), Array.from({ length: 800 }, (_, i) => `line ${i + 1}`).join("\n"));
    expect(readLines(vault, { path: "long.md" })).toMatchObject({ endLine: 200, nextLine: 201, totalLines: 800 });
    expect(readLines(vault, { path: "long.md", startLine: 201, endLine: 800 })).toMatchObject({ endLine: 700, nextLine: 701 });
  });
  it("blocks traversal, absolute paths, excluded files, hidden files and symlinks", async () => {
    for (const relative of ["../outside.md", path.join(temp, "outside.md"), "private/secret.md", "Private/secret.md", ".obsidian/config.md", "link.md", "ignored.txt"]) {
      await expect(rpc("read", { path: relative })).rejects.toThrow();
    }
    await expect(rpc("read", { path: "intro.md" }, [{ ...vault, excludes: ["intro.md"] }])).rejects.toThrow();
    await expect(rpc("resolve", { sourcePath: "intro.md", link: "[[../outside]]" })).resolves.toMatchObject({ candidates: [] });
    await expect(rpc("resolve", { sourcePath: "intro.md", link: "[[Private/secret]]" })).resolves.toMatchObject({ candidates: [] });
  });
  it("resolves Wiki and Markdown links, heading anchors, aliases and ambiguity", async () => {
    expect(await rpc("resolve", { sourcePath: "intro.md", link: "[[folder/target#细节|说明]]" })).toMatchObject({ path: "folder/target.md", startLine: 2 });
    expect(await rpc("resolve", { sourcePath: "intro.md", link: "[目标](folder/target.md#细节)" })).toMatchObject({ path: "folder/target.md", startLine: 2 });
    expect(await rpc("resolve", { sourcePath: "intro.md", link: "[[知识别名]]" })).toMatchObject({ path: "intro.md" });
    await expect(rpc("resolve", { sourcePath: "intro.md", link: "https://example.com" })).rejects.toThrow();
    fs.mkdirSync(path.join(vault.path, "other")); fs.writeFileSync(path.join(vault.path, "other/target.md"), "同名笔记");
    await rpc("scan");
    expect(await rpc("resolve", { sourcePath: "intro.md", link: "[[target]]" })).toMatchObject({ ambiguous: true, candidates: expect.arrayContaining([expect.objectContaining({ path: "other/target.md" }), expect.objectContaining({ path: "folder/target.md" })]) });
    expect(await rpc("resolve", { sourcePath: "intro.md", link: "[[private/secret]]" })).toMatchObject({ candidates: [] });
  });
  it("updates additions, edits, renames, deletions and changed exclusions", async () => {
    fs.writeFileSync(path.join(vault.path, "new.markdown"), "新增内容独特关键词");
    await rpc("scan"); expect((await rpc("search", { query: "独特关键词" })).hits).toHaveLength(1);
    fs.renameSync(path.join(vault.path, "new.markdown"), path.join(vault.path, "renamed.md"));
    await rpc("scan"); expect((await rpc("search", { query: "独特关键词" })).hits).toEqual([expect.objectContaining({ path: "renamed.md" })]);
    fs.unlinkSync(path.join(vault.path, "renamed.md"));
    await rpc("scan"); expect((await rpc("search", { query: "独特关键词" })).hits).toEqual([]);
    const excluded = { ...vault, excludes: ["private", "folder"] };
    await rpc("scan", {}, [excluded]);
    expect((await rpc("search", { query: "目标笔记" }, [excluded])).hits).toEqual([]);
    await rpc("scan", { rebuild: true });
    expect((await rpc("search", { query: "目标笔记" })).hits).toHaveLength(1);
  });
  it("returns distinct files even when one note has many matching chunks", async () => {
    fs.writeFileSync(path.join(vault.path, "many.md"), "# manychunks\n" + "manychunks matching line\n".repeat(8000));
    fs.writeFileSync(path.join(vault.path, "small.md"), "# manychunks\nsmall matching note");
    await rpc("scan");
    const result = await rpc("search", { query: "manychunks", limit: 2 });
    expect(result.hits).toHaveLength(2);
  });
  it("matches conjunction terms that occur in different chunks of one note", async () => {
    fs.writeFileSync(path.join(vault.path, "cross-chunk.md"), `${"filler\n".repeat(79)}跨行\n短语\n`);
    await rpc("scan");
    const result = await rpc("search", { query: "跨行 短语" });
    expect(result.hits).toEqual([expect.objectContaining({ path: "cross-chunk.md" })]);
  });
  it("keeps vault identity for cross-vault search and refuses offline cached content", async () => {
    const secondPath = path.join(temp, "second"); fs.mkdirSync(secondPath); fs.writeFileSync(path.join(secondPath, "intro.md"), "第二仓库独立笔记");
    const second = { ...vault, id: "second", name: "第二库", path: fs.realpathSync(secondPath), excludes: [] };
    await rpc("scan", {}, [second]);
    expect((await rpc("search", { query: "独立笔记" }, [vault, second])).hits).toEqual([expect.objectContaining({ baseId: "second", baseName: "第二库" })]);
    fs.renameSync(vault.path, vault.path + "-offline");
    const result = await rpc("search", { query: "知识库" });
    expect(result.hits).toEqual([]); expect(result.errors).toHaveLength(1);
    await expect(rpc("read", { path: "intro.md" })).rejects.toThrow();
    fs.renameSync(vault.path + "-offline", vault.path); await rpc("scan");
    expect((await rpc("search", { query: "知识库" })).hits).toHaveLength(1);
  });
});
