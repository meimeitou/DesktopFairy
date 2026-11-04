import { Button, Icon, Input } from "animal-island-ui";
import { useEffect, useRef, useState } from "react";
import "../Select.css";
import "./VaultDirectorySelect.css";

type DirectoryPage = { directories: string[]; hasMore: boolean };
interface Props {
  baseId: string;
  value: string[];
  onChange: (directories: string[]) => void;
  disabled?: boolean;
}

export default function VaultDirectorySelect({ baseId, value, onChange, disabled }: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [retry, setRetry] = useState(0);
  const [directories, setDirectories] = useState<string[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const container = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const [settledSearch, setSettledSearch] = useState("");

  useEffect(() => {
    if (!open) return;
    let active = true;
    const timer = setTimeout(async () => {
      setLoading(true); setError("");
      try {
        const result = await window.electronAPI.invoke("knowledge:list_directories", {
          baseId, query: search, offset: page * 100, limit: 100,
        }) as DirectoryPage;
        if (!active) return;
        setDirectories((previous) => page ? [...previous, ...result.directories] : result.directories);
        setSettledSearch(search); setHasMore(result.hasMore);
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : String(cause));
      } finally { if (active) setLoading(false); }
    }, search ? 150 : 0);
    return () => { active = false; clearTimeout(timer); };
  }, [baseId, open, search, page, retry]);

  useEffect(() => {
    if (!open) return;
    const closeOutside = (event: PointerEvent) => {
      if (!container.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", closeOutside);
    return () => document.removeEventListener("pointerdown", closeOutside);
  }, [open]);

  const toggle = (directory: string) => onChange(value.includes(directory)
    ? value.filter((item) => item !== directory) : [...value, directory]);
  const filteredSelection = value.filter((directory) => directory.normalize("NFC").toLocaleLowerCase().includes(search.normalize("NFC").toLocaleLowerCase().trim()));
  const options = [...new Set([...filteredSelection, ...(search === settledSearch ? directories : [])])];
  const pending = loading || search !== settledSearch;

  return <div className="vault-directory-select" ref={container}
    onBlur={(event) => { if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget)) setOpen(false); }}
    onKeyDownCapture={(event) => {
      if (event.key === "Escape" && open) { event.preventDefault(); event.stopPropagation(); setOpen(false); trigger.current?.focus(); }
    }}>
    <button ref={trigger} id="vault-excludes" type="button" className="df-select-trigger vault-directory-trigger"
      disabled={disabled} aria-labelledby="vault-excludes-label vault-directory-value" aria-describedby="vault-excludes-hint"
      aria-expanded={open} aria-controls={open ? "vault-directory-options" : undefined}
      onClick={() => { if (!open) setPage(0); setOpen((previous) => !previous); }}>
      <span id="vault-directory-value">{value.length ? `已选择 ${value.length} 个子目录` : "选择要排除的子目录"}</span>
      <Icon name={open ? "Close" : "Folder"} size={14} />
    </button>
    {value.length > 0 && <div className="vault-directory-selected" aria-label="已排除的子目录">
      {value.map((directory) => <span key={directory} className="vault-directory-tag"><span title={directory}>{directory}</span>
        <Button type="text" size="small" htmlType="button" disabled={disabled} aria-label={`取消排除 ${directory}`}
          icon={<Icon name="Close" size={10} />} onClick={() => toggle(directory)} /></span>)}
    </div>}
    {open && <div className="vault-directory-dropdown" id="vault-directory-options">
      <Input shadow autoFocus aria-label="搜索子目录" placeholder="搜索子目录名称或路径…" value={search} disabled={disabled}
        onChange={(event) => { setSearch(event.target.value); setPage(0); setDirectories([]); setHasMore(false); }}
        onKeyDown={(event) => { if (event.key === "Enter") event.preventDefault(); }} />
      {error ? <div className="vault-directory-message" role="alert"><span>无法读取子目录：{error}</span>
        <Button type="text" size="small" htmlType="button" onClick={() => setRetry((previous) => previous + 1)}>重试</Button></div> : null}
      <div className="vault-directory-options" role="group" aria-label="选择排除的子目录" aria-busy={pending}>
        {options.map((directory) => {
          const selected = value.includes(directory);
          return <button key={directory} type="button" title={directory} disabled={disabled}
            className={`vault-directory-option${selected ? " selected" : ""}`}
            aria-pressed={selected} onClick={() => toggle(directory)}>{directory}</button>;
        })}
        {pending && <p className="vault-directory-message" role="status">正在加载子目录…</p>}
        {!pending && !error && !options.length && <p className="vault-directory-message">{search.trim() ? "没有匹配的子目录" : "此 vault 没有可选择的子目录"}</p>}
      </div>
      {hasMore && !error && <Button type="text" size="small" htmlType="button" disabled={pending} onClick={() => setPage((previous) => previous + 1)}>加载更多目录</Button>}
      <div className="vault-directory-footer"><span>{value.length ? `已选择 ${value.length} 项` : "可选择多个目录"}</span>
        <Button type="text" size="small" htmlType="button" onClick={() => { setOpen(false); trigger.current?.focus(); }}>完成选择</Button></div>
    </div>}
  </div>;
}
