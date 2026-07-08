import { useEffect, useRef, useState } from "react";
import type { Terminal } from "@xterm/xterm";
import type { SearchAddon } from "@xterm/addon-search";

interface Props {
  xterm: Terminal;
  searchAddon: SearchAddon;
  onClose: () => void;
}

// 装饰颜色必须用 #RRGGBB 字面值（SearchAddon 类型要求），不能用 CSS 变量。
// ink-600 #3a332c 用于所有匹配项的淡底；persimmon #e8624a 用于当前活跃匹配。
// overviewRuler 字段在未加载 overview ruler addon 时无视觉效果，但类型必填。
const DECORATIONS = {
  matchBackground: "#3a332c",
  matchBorder: "#4a423a",
  matchOverviewRuler: "#3a332c",
  activeMatchBackground: "#e8624a",
  activeMatchBorder: "#f07558",
  activeMatchColorOverviewRuler: "#e8624a",
};

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
    decorations: DECORATIONS,
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
      <button
        type="button"
        className={`terminal-search-toggle${caseSensitive ? " active" : ""}`}
        onClick={() => setCaseSensitive((v) => !v)}
        title="区分大小写"
      >
        Aa
      </button>
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
      <button
        type="button"
        className="terminal-search-btn"
        onClick={findPrevious}
        title="上一个匹配 (Shift+Enter)"
        disabled={!query}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="18 15 12 9 6 15" />
        </svg>
      </button>
      <button
        type="button"
        className="terminal-search-btn"
        onClick={findNext}
        title="下一个匹配 (Enter)"
        disabled={!query}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      <button
        type="button"
        className="terminal-search-btn"
        onClick={handleClose}
        title="关闭 (Esc)"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  );
}
