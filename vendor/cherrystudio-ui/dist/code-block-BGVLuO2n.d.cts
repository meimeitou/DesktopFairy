import { a as DocumentChange, l as SnapshotExecutor, n as Theme, s as HighlightRange } from "./code-highlight-BGdxxDHR.cjs";
import { HighlightStyle, Language, LanguageSupport } from "@codemirror/language";
import { EditorState } from "@codemirror/state";
import { Parser } from "@lezer/common";
//#region src/lib/code-block/language.d.ts
/** Language data structure for file extension mapping */
interface LanguageData {
  type: string;
  aliases?: string[];
  extensions?: string[];
}
/** Language configuration mapping language names to their data */
type LanguageConfig = Record<string, LanguageData>;
/**
 * Get the file extension of the language, by language name
 * - First, exact match
 * - Then, case-insensitive match
 * - Finally, match aliases
 * If there are multiple file extensions, only the first one will be returned
 * @param language language name
 * @param languageConfig optional language configuration, defaults to a minimal config
 * @returns file extension
 */
declare function getExtensionByLanguage(language: string, languageConfig?: LanguageConfig): string;
/**
 * Get the file extension of the language, for @uiw/codemirror-extensions-langs
 * - First, search for custom extensions
 * - Then, search for language configuration extensions
 * - Finally, assume the name is already an extension
 * @param language language name
 * @param languageConfig optional language configuration
 * @returns file extension (without `.` prefix)
 */
declare function getNormalizedExtension(language: string, languageConfig?: LanguageConfig): Promise<string>;
type Support = Language | LanguageSupport;
declare function loadCodeBlockLanguage(language: string, config?: LanguageConfig): Promise<Support | null>;
declare function getCodeBlockParser(support: Support): import("@lezer/common").Parser;
//#endregion
//#region src/lib/code-block/syntax.d.ts
declare const codeBlockHighlightStyle: HighlightStyle;
declare const codeBlockSyntaxCss: string;
//#endregion
//#region src/lib/code-block/palette.d.ts
declare function getCodeBlockPalette(theme: Theme): Record<string, string>;
//#endregion
//#region src/lib/code-block/document.d.ts
interface CodeBlockToken {
  content: string;
  offset: number;
  className?: string;
}
interface CodeBlockHighlightResult {
  start: number;
  lines: CodeBlockToken[][];
}
/** Read an editor's already parsed range without parsing or copying the full document. */
declare function readCodeBlockState(state: EditorState, range: HighlightRange): CodeBlockHighlightResult | null;
declare function plainCodeBlockTokens(code: string, range: HighlightRange): CodeBlockHighlightResult;
declare class CodeBlockDocument {
  code: string;
  private parser;
  private offsets;
  private tree?;
  private fragments;
  private disposed;
  constructor(code: string, parser: Parser | null);
  update(change: DocumentChange): void;
  read(range: HighlightRange): Promise<CodeBlockHighlightResult>;
  dispose(): void;
}
declare function createCodeBlockDocument(code: string, language: string): Promise<CodeBlockDocument>;
//#endregion
//#region src/lib/code-block/snapshot.d.ts
declare function createCodeBlockSnapshotExecutor(): SnapshotExecutor;
declare function codeBlockToHtml(code: string, language: string, theme: string): Promise<string>;
//#endregion
export { loadCodeBlockLanguage as _, CodeBlockToken as a, readCodeBlockState as c, codeBlockSyntaxCss as d, LanguageConfig as f, getNormalizedExtension as g, getExtensionByLanguage as h, CodeBlockHighlightResult as i, getCodeBlockPalette as l, getCodeBlockParser as m, createCodeBlockSnapshotExecutor as n, createCodeBlockDocument as o, LanguageData as p, CodeBlockDocument as r, plainCodeBlockTokens as s, codeBlockToHtml as t, codeBlockHighlightStyle as u };