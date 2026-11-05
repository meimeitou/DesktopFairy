import { Button, Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, Input } from "@cherrystudio/ui";
import { Book, File, Folder, Plus, Settings } from "lucide-react";

import { useEffect, useRef, useState } from "react";
import { useKnowledgeBases } from "../hooks/useKnowledgeBases";
import VaultDirectorySelect from "../components/knowledge/VaultDirectorySelect";
import { useConfirm } from "../hooks/useConfirm";
import type { VaultKnowledgeBase, VaultReadResult, VaultSearchHit } from "../shared/knowledge";
import "./KnowledgePage.css";

const api = window.electronAPI;
const STATUS = { pending: "等待索引", indexing: "正在索引", ready: "已就绪", error: "目录或索引不可用" };
const message = (error: unknown) => error instanceof Error ? error.message : String(error);

function VaultConfiguration({ vault, onSave, onClose, busy, error }: {
  vault: VaultKnowledgeBase;
  onSave: (patch: { name: string; excludes: string[] }) => Promise<boolean>;
  onClose: () => void;
  busy: boolean;
  error: string;
}) {
  const [name, setName] = useState(vault.name);
  const [excludes, setExcludes] = useState<string[]>(vault.excludes);
  const changed = name.trim() !== vault.name || excludes.length !== vault.excludes.length || excludes.some((dir) => !vault.excludes.includes(dir));
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!changed || !name.trim() || busy) return;
    const saved = await onSave({ name, excludes });
    if (saved) onClose();
  };
  return <Dialog open={true} onOpenChange={(next) => { if (!next) (onClose)(); }}>
      <DialogContent className={"vault-settings-modal"} style={{ maxWidth: 480 }}>
        <DialogHeader><DialogTitle>{"目录设置"}</DialogTitle></DialogHeader>
        
    <form className="vault-config-fields" onSubmit={(event) => void submit(event)}>
      <p className="vault-settings-target">正在设置：<strong>{vault.name}</strong></p>
      {error && <p className="vault-settings-error" role="alert">{error}</p>}
      <label htmlFor="vault-name">显示名称</label>
      <Input id="vault-name" value={name} onChange={(event) => setName(event.target.value)} autoFocus />
      <label id="vault-excludes-label" htmlFor="vault-excludes">排除子目录</label>
      <VaultDirectorySelect baseId={vault.id} value={excludes} onChange={setExcludes} disabled={busy} />
      <p id="vault-excludes-hint">搜索并勾选多个子目录。排除后不会被搜索、读取或通过链接访问；隐藏目录和符号链接始终跳过。</p>
      <div className="vault-settings-footer">
        <Button variant="ghost" type="button" disabled={busy} onClick={onClose}>取消</Button>
        <Button variant="default" type="submit" disabled={busy || !changed || !name.trim()}>{busy ? "保存中…" : "保存设置"}</Button>
      </div>
    </form>
  
        
      </DialogContent>
    </Dialog>;
}

export default function KnowledgePage({ isActive = true }: { isActive?: boolean }) {
  const { bases, loaded, error: loadError, reload } = useKnowledgeBases();
  const { confirm, dialog } = useConfirm();
  const [selected, setSelected] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [settingsVault, setSettingsVault] = useState<VaultKnowledgeBase | null>(null);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [allVaults, setAllVaults] = useState(false);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [hits, setHits] = useState<VaultSearchHit[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [preview, setPreview] = useState<VaultReadResult | null>(null);
  const [previewPath, setPreviewPath] = useState("");
  const [previewError, setPreviewError] = useState("");
  const [reading, setReading] = useState(false);
  const searchId = useRef(0);
  const readId = useRef(0);
  const current = bases.find((base) => base.id === selected) ?? bases[0];
  const scope = allVaults ? bases.map((base) => base.id).join(",") : current?.id ?? "";
  const scopeRules = JSON.stringify((allVaults ? bases : current ? [current] : []).map((v) => [v.id, v.excludes]));
  useEffect(() => {
    searchId.current++; readId.current++;
    setHits([]); setSearched(false); setPreview(null); setPreviewPath(""); setPreviewError(""); setWarnings([]); setSearching(false); setReading(false);
  }, [scope, scopeRules]);
  useEffect(() => () => { searchId.current++; readId.current++; }, []);

  async function mutate(action: () => Promise<unknown>): Promise<boolean> {
    setBusy(true); setError("");
    try { await action(); await reload(); return true; } catch (cause) { setError(message(cause)); return false; }
    finally { setBusy(false); }
  }
  async function search(event: React.FormEvent) {
    event.preventDefault();
    if (!query.trim() || !current) return;
    const id = ++searchId.current;
    readId.current++; setPreview(null); setPreviewPath(""); setPreviewError(""); setReading(false); setSearching(true); setError("");
    try {
      const result = await api.invoke("knowledge:search", { query, baseIds: scope.split(","), limit: 50 }) as {
        hits: VaultSearchHit[]; errors: { baseId: string; message: string }[];
      };
      if (id !== searchId.current) return;
      setHits(result.hits); setWarnings(result.errors.map((e) => e.message)); setSearched(true);
    } catch (cause) { if (id === searchId.current) setError(message(cause)); }
    finally { if (id === searchId.current) setSearching(false); }
  }
  async function read(baseId: string, path: string, startLine = 1) {
    const id = ++readId.current;
    setReading(true); setPreviewError("");
    try {
      const result = await api.invoke("knowledge:read_item", { baseId, path, startLine }) as VaultReadResult;
      if (id === readId.current) setPreview(result);
    } catch (cause) { if (id === readId.current) { setPreviewError(message(cause)); setPreview(null); } }
    finally { if (id === readId.current) setReading(false); }
  }
  async function remove(vault: VaultKnowledgeBase) {
    if (!await confirm({ title: "移除 vault", content: `移除「${vault.name}」的挂载和本地索引？原目录中的笔记会保留。`, okText: "移除挂载", danger: true })) return;
    await mutate(() => api.invoke("knowledge:delete_base", { baseId: vault.id }));
  }
  const save = async (vault: VaultKnowledgeBase, patch: { name: string; excludes: string[] }) => {
    const saved = await mutate(() => api.invoke("knowledge:update_base", { baseId: vault.id, patch }));
    if (saved) {
      searchId.current++; readId.current++; setHits([]); setPreview(null); setPreviewPath(""); setPreviewError(""); setSearched(false);
    }
    return saved;
  };

  return <div className="kb-page vault-page" aria-hidden={!isActive}>
    {(error || loadError) && <div className="vault-error" role="alert"><span>{error || loadError}</span><Button variant="ghost" size="sm" onClick={() => { setError(""); void reload(); }}>重试加载</Button></div>}
    <div className="vault-layout">
      <aside className="vault-sidebar" aria-label="已挂载的 vault">
        <div className="vault-sidebar-heading"><h2>知识库</h2><div className="vault-sidebar-tools">
          <Button variant="outline" size="sm" disabled={busy} onClick={() => void mutate(async () => {
          const added = await api.invoke("knowledge:select_vaults") as VaultKnowledgeBase[];
          if (added[0]) setSelected(added[0].id);
          })}><Plus size={14} />添加目录</Button>
        </div></div>
        <p className="vault-sidebar-hint">连接 Obsidian vault，直接读取你的笔记。</p>
        <nav className="vault-list">
          {bases.map((vault) => <div key={vault.id} className={`vault-list-item${current?.id === vault.id ? " active" : ""}`}>
            <Button variant="ghost" className="vault-list-item-select" aria-pressed={current?.id === vault.id} onClick={() => setSelected(vault.id)}>
              <Folder size={18} /><span><strong>{vault.name}</strong><small>{vault.fileCount.toLocaleString()} 篇笔记 · {STATUS[vault.state]}</small></span>
            </Button>
            <Button variant="ghost" className="vault-item-action vault-open-item" title={`在 Obsidian 中打开${vault.name}`} aria-label={`在 Obsidian 中打开${vault.name}`} disabled={busy} onClick={() => void mutate(() => api.invoke("knowledge:open_vault", { baseId: vault.id }))}><Book size={15} /></Button>
            <Button variant="ghost" className="vault-item-action vault-item-settings" title={`设置${vault.name}`} aria-label={`设置${vault.name}`} disabled={busy} onClick={() => { setError(""); setSettingsVault(vault); }}><Settings size={15} /></Button>
          </div>)}
        </nav>
        <p className="vault-readonly"><File size={14} />只读目录 · 本地全文索引</p>
      </aside>
      <main className="vault-main">
        {!loaded ? <p role="status">正在加载目录…</p> : !current ? <div className="vault-empty">
          <Folder size={36} /><h2>让智能体读懂你的笔记</h2>
          <p>添加一个或多个 Obsidian vault，也可以选择普通 Markdown 目录。笔记留在原处，索引会自动更新。</p>
          <Button variant="default" disabled={busy} onClick={() => void mutate(() => api.invoke("knowledge:select_vaults"))}>选择笔记目录</Button>
          <p>添加后，在智能体或对话中选择要使用的 vault。</p>
        </div> : <>
          <header className="vault-heading"><div><h1>{current.name}</h1><p className="vault-path" title={current.path}>{current.path}</p></div>
            <div className="vault-actions"><Button variant="outline" size="sm" disabled={busy || current.state === "indexing"} onClick={() => void mutate(() => api.invoke("knowledge:rebuild_all", { baseId: current.id }))}>重建索引</Button>
              <Button variant="ghost" size="sm" disabled={busy} onClick={() => void remove(current)}>移除挂载</Button></div>
          </header>
          <div className="vault-status" role="status"><span>{STATUS[current.state]}</span><span>{current.fileCount.toLocaleString()} 篇笔记</span>
            {current.state === "indexing" ? <span>已检查 {current.processed?.toLocaleString() ?? 0} 个文件</span> : current.updatedAt ? <span>上次同步 {new Date(current.updatedAt).toLocaleTimeString()}</span> : null}
          </div>
          {current.errors.length > 0 && <details className="vault-errors"><summary>{current.errors.length} 条索引提示</summary><ul>{current.errors.map((item, i) => <li key={i}>{item}</li>)}</ul></details>}
          <section className="vault-search" aria-label="搜索笔记">
            <form onSubmit={(event) => void search(event)} className="vault-search-form">
              <Input aria-label="搜索笔记关键词" placeholder="搜索标题、标签、别名或正文…" value={query} onChange={(event) => setQuery(event.target.value)} />
              <Button variant="default" type="submit" disabled={searching || !query.trim()}>{searching ? "搜索中…" : "搜索"}</Button>
            </form>
            <label className="vault-search-scope"><input type="checkbox" checked={allVaults} onChange={(event) => setAllVaults(event.target.checked)} />搜索全部已挂载目录</label>
            {warnings.map((warning, i) => <p className="vault-error" role="alert" key={i}>{warning}</p>)}
            {searched && <p className="vault-result-count" role="status">{hits.length ? `${hits.length} 条结果（最多显示 50 条）` : "未找到匹配笔记，试试更短的关键词或笔记别名。"}</p>}
            <div className="vault-results">{hits.map((hit) => <button type="button" key={hit.baseId + hit.path} className={`vault-result${previewPath && preview?.baseId === hit.baseId && preview.path === hit.path ? " selected" : ""}`} onClick={() => { setPreviewPath(hit.path); setPreview(null); setPreviewError(""); void read(hit.baseId, hit.path, hit.startLine); }}>
              <strong>{hit.title}</strong><span>{hit.baseName} / {hit.path} · L{hit.startLine}–{hit.endLine}{hit.matchedBy.length ? ` · 命中${hit.matchedBy.join("、")}` : ""}</span><p>{hit.text.slice(0, 600)}</p>
            </button>)}</div>
            {previewPath && <Dialog open={true} onOpenChange={(next) => { if (!next) (() => { readId.current++; setPreviewPath(""); setPreview(null); setPreviewError(""); })(); }}>
      <DialogContent className={"vault-preview-modal"} style={{ maxWidth: 760 }}>
        <DialogHeader><DialogTitle>{"笔记原文"}</DialogTitle></DialogHeader>
        
              <section className="vault-preview" aria-label="笔记原文">
              {reading && <p role="status">正在读取原文…</p>}
              {previewError && <p className="vault-error" role="alert">{previewError}</p>}
              {preview && <>
              <header><div><h2>{preview.path}</h2><p>L{preview.startLine}–{preview.endLine} / {preview.totalLines} 行</p></div>
                <Button variant="outline" size="sm" onClick={() => void mutate(() => api.invoke("knowledge:open_file", { baseId: preview.baseId, path: preview.path }))}>{bases.find((v) => v.id === preview.baseId)?.obsidian ? "在 Obsidian 打开" : "打开文件"}</Button></header>
              <pre>{preview.text.split("\n").map((line, i) => <span className="vault-source-line" key={i}><span aria-hidden="true">{preview.startLine + i}</span><code>{line || " "}</code></span>)}</pre>
              {preview.warning && <p role="status">{preview.warning}</p>}
              <div className="vault-preview-pagination"><Button variant="outline" size="sm" disabled={reading || preview.startLine <= 1} onClick={() => void read(preview.baseId, preview.path, Math.max(1, preview.startLine - 200))}>上一段</Button>
                <Button variant="outline" size="sm" disabled={reading || !preview.nextLine} onClick={() => void read(preview.baseId, preview.path, preview.nextLine!)}>下一段</Button></div>
              </>}
              </section>
            
        
      </DialogContent>
    </Dialog>}
            {!searched && !searching && <p className="vault-search-hint">使用关键词检查检索结果。智能体会按需搜索，再读取原文；无需配置 embedding 模型。</p>}
          </section>
        </>}
      </main>
    </div>
    {settingsVault && <VaultConfiguration key={settingsVault.id + JSON.stringify(settingsVault.excludes) + settingsVault.name}
      vault={settingsVault} onSave={(patch) => save(settingsVault, patch)} onClose={() => setSettingsVault(null)} busy={busy} error={error} />}
    {dialog}
  </div>;
}
