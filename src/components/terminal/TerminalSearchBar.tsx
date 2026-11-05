import { Button } from "@cherrystudio/ui";
import { ChevronDown, ChevronUp, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { Terminal } from "@xterm/xterm";
import type { SearchAddon } from "@xterm/addon-search";

interface Props {
  xterm: Terminal;
  searchAddon: SearchAddon;
  onClose: () => void;
}

// xterm css.toColor 只认 #RRGGBB / rgb()。var() 会在绘制装饰时抛错。
// 指定值若是 var(--animal-*)，再解一层。读不到就用 theme.css 的原值。
function readHex(css: CSSStyleDeclaration, name: string, fallback: string): string {
  let raw = css.getPropertyValue(name).trim();
  const nested = /^var\((--[A-Za-z0-9-]+)\)$/.exec(raw);
  if (nested) raw = css.getPropertyValue(nested[1]).trim();
  return /^#[0-9a-fA-F]{6}$/.test(raw) ? raw : fallback;
}

function searchDecorations() {
  const css = getComputedStyle(document.documentElement);
  return {
    matchBackground: readHex(css, "--hairline-strong", "#575757"),
    matchBorder: readHex(css, "--hairline-bold", "#6e6e6e"),
    matchOverviewRuler: readHex(css, "--hairline-strong", "#575757"),
    activeMatchBackground: readHex(css, "--animal-primary-color", "#1fd584"),
    activeMatchBorder: readHex(css, "--animal-success-color", "#2fd565"),
    activeMatchColorOverviewRuler: readHex(css, "--animal-primary-color", "#1fd584"),
  };
}

export default function TerminalSearchBar({ xterm, searchAddon, onClose }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [matchInfo, setMatchInfo] = useState<{ index: number; count: number } | null>(null);

  // 挂载即聚焦并全选，方便直接覆盖默认值（如果有）。
  useEffect(() => {
    const el = inputRef.current;
    if (el) {
      el.focus();
      el.select();
    }
  }, []);

  // 订阅搜索结果变化，更新匹配计数显示。resultIndex === -1 表示超出
  // highlightLimit（默认 1000），此时 count 仍有效但无法定位当前序号。
  useEffect(() => {
    const disposable = searchAddon.onDidChangeResults((e) => {
      if (e == null) {
        setMatchInfo(null);
        return;
      }
      setMatchInfo({ index: e.resultIndex, count: e.resultCount });
    });
    return () => disposable.dispose();
  }, [searchAddon]);

  const buildOptions = (incremental: boolean) => ({
    caseSensitive,
    incremental,
    decorations: searchDecorations(),
  });

  // 输入或选项变化时执行增量搜索：扩展当前选中匹配而非重新定位，
  // 打字时体验更连贯。空查询时清装饰（onDidChangeResults 不会在 clearDecorations
  // 后触发，故 matchInfo 的清空交给渲染期从 query 派生，避免 effect 内 setState）。
  useEffect(() => {
    const q = query;
    if (!q) {
      searchAddon.clearDecorations();
      return;
    }
    searchAddon.findNext(q, buildOptions(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, caseSensitive]);

  const findNext = () => {
    if (!query) return;
    searchAddon.findNext(query, buildOptions(false));
  };

  const findPrevious = () => {
    if (!query) return;
    searchAddon.findPrevious(query, buildOptions(false));
  };

  const handleClose = () => {
    searchAddon.clearDecorations();
    xterm.focus();
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (e.shiftKey) findPrevious();
      else findNext();
    } else if (e.key === "Escape") {
      e.preventDefault();
      handleClose();
    }
  };

  // 计数显示：查询为空时不显示；超出 highlight limit 时序号不可用，只显示总数。
  const countLabel = query && matchInfo
    ? matchInfo.index >= 0
      ? `${matchInfo.index + 1}/${matchInfo.count}`
      : `${matchInfo.count}+`
    : "";

  return (
    <div className="terminal-search-bar">
      <Button variant="ghost" size="sm" className={`terminal-search-toggle${caseSensitive ? " active" : ""}`} onClick={() => setCaseSensitive((v) => !v)} title="区分大小写">
        Aa
      </Button>
      <input
        ref={inputRef}
        className="terminal-search-input"
        type="text"
        value={query}
        placeholder="搜索"
        spellCheck={false}
        autoComplete="off"
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
      />
      <span className="terminal-search-count">{countLabel}</span>
      <div className="terminal-search-divider" />
      <Button variant="ghost" size="sm" className="terminal-search-btn" onClick={findPrevious} title="上一个匹配 (Shift+Enter)" disabled={!query}><ChevronUp size={12} /></Button>
      <Button variant="ghost" size="sm" className="terminal-search-btn" onClick={findNext} title="下一个匹配 (Enter)" disabled={!query}><ChevronDown size={12} /></Button>
      <Button variant="ghost" size="sm" className="terminal-search-btn" onClick={handleClose} title="关闭 (Esc)"><X size={12} /></Button>
    </div>
  );
}
