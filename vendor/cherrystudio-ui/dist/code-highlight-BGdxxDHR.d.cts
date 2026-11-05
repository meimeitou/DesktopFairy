import { LiveTextEdit, LiveTextEdit as TextEdit, LiveTokenizer, Theme, Theme as Theme$1, ThemedToken, ThemedToken as ThemedToken$1, TokensResult, TokensResult as TokensResult$1 } from "@pierre/highlights";
//#region src/lib/code-highlight/catalog.d.ts
declare const CODE_LANGUAGES: {
  text: string[];
  'angular-html': never[];
  asm: string[];
  astro: never[];
  bash: string[];
  bat: string[];
  c: string[];
  c3: never[];
  clojure: string[];
  cmake: never[];
  cpp: string[];
  csharp: string[];
  css: never[];
  cuda: string[];
  dart: never[];
  diff: string[];
  dockerfile: string[];
  elixir: string[];
  elm: never[];
  erlang: string[];
  'fortran-free-form': string[];
  'fortran-fixed-form': string[];
  fsharp: string[];
  gdresource: string[];
  gdscript: string[];
  gdshader: string[];
  gleam: never[];
  glsl: string[];
  go: string[];
  graphql: string[];
  groovy: string[];
  haskell: string[];
  hlsl: never[];
  html: string[];
  java: never[];
  javascript: string[];
  json: string[];
  json5: never[];
  jsonl: never[];
  jsx: never[];
  julia: string[];
  kotlin: string[];
  latex: string[];
  less: never[];
  lisp: string[];
  lua: never[];
  makefile: string[];
  markdown: string[];
  matlab: string[];
  mdx: never[];
  nim: never[];
  nix: never[];
  'objective-c': string[];
  ocaml: string[];
  pascal: string[];
  perl: string[];
  php: never[];
  powershell: string[];
  proto: string[];
  python: string[];
  r: string[];
  ruby: string[];
  rust: string[];
  sass: never[];
  scala: string[];
  scss: never[];
  solidity: string[];
  sql: never[];
  svelte: never[];
  swift: never[];
  terraform: string[];
  toml: never[];
  typescript: string[];
  tsrx: never[];
  tsx: never[];
  vue: never[];
  wasm: string[];
  wgsl: never[];
  xml: string[];
  yaml: string[];
  zig: string[];
};
declare const CODE_THEME_NAMES: string[];
declare const DEFAULT_LANGUAGES: string[];
declare function normalizeCodeLanguage(language: string): string;
declare function supportsCodeLanguage(language: string): boolean;
declare function resolveCodeTheme(name: string, fallback?: string): string;
//#endregion
//#region src/lib/code-highlight/theme.d.ts
declare const CHERRY_CODE_THEME = "cherry";
/**
 * The default code theme. Colors are `--cherry-code-*` suffixes that `product.css` resolves per app mode;
 * `defaults` repeat the light values so HTML exported without application CSS stays colored.
 */
declare const cherryCodeTheme: Theme;
declare function loadCodeTheme(name: string, foreground?: string): Promise<Theme>;
declare function getReactStyleFromToken(token: ThemedToken, options?: {
  isDarkTheme?: boolean;
  foreground?: string;
}): Record<string, string>;
//#endregion
//#region src/lib/code-highlight/runtime.d.ts
interface HighlightRange {
  start: number;
  end: number;
}
interface HighlightResult {
  start: number;
  lines: TokensResult['tokens'];
}
type DocumentChange = {
  type: 'replace';
  code: string;
} | {
  type: 'edits';
  edits: LiveTextEdit[];
};
interface SnapshotRequest {
  code: string;
  language: string;
  themes: [string, string];
  foreground?: string;
}
type SnapshotExecutor = (request: SnapshotRequest) => Promise<TokensResult>;
declare function plainTokens(code: string): TokensResult;
declare function escapeCode(code: string): string;
declare class HighlightDocument {
  private tokenizer;
  private rows?;
  constructor(tokenizer: LiveTokenizer);
  get code(): string;
  get lineCount(): number;
  private indexLineEndings;
  update(change: DocumentChange): void;
  read(range: HighlightRange): HighlightResult;
  dispose(): void;
}
declare function loadCodeHighlightRuntime(): Promise<{
  createDocument(code: string, lang: string, theme: Theme): HighlightDocument;
  codeToHtml(code: string, lang: string, theme: Theme): string;
  snapshot(code: string, lang: string, light: Theme, dark: Theme): TokensResult;
}>;
declare function createSnapshotExecutor(): SnapshotExecutor;
//#endregion
export { resolveCodeTheme as C, normalizeCodeLanguage as S, getReactStyleFromToken as _, DocumentChange as a, CODE_THEME_NAMES as b, HighlightResult as c, createSnapshotExecutor as d, escapeCode as f, cherryCodeTheme as g, CHERRY_CODE_THEME as h, TokensResult$1 as i, SnapshotExecutor as l, plainTokens as m, Theme$1 as n, HighlightDocument as o, loadCodeHighlightRuntime as p, ThemedToken$1 as r, HighlightRange as s, TextEdit as t, SnapshotRequest as u, loadCodeTheme as v, supportsCodeLanguage as w, DEFAULT_LANGUAGES as x, CODE_LANGUAGES as y };