import * as Merman from "@mermanjs/web-render";
import { HostTextMeasurer } from "@mermanjs/web-render";
//#region src/lib/mermaid/fonts.d.ts
/** A serializable `@font-face` rule, so another realm (a Web Worker) can load the page's web fonts. */
interface FontFaceSource {
  family: string;
  source: string;
  descriptors: FontFaceDescriptors;
}
//#endregion
//#region src/lib/mermaid/theme.d.ts
/** Merman's host theme: semantic roles and categorical palette, all opaque hex. Serializable for a worker. */
interface MermaidTheme {
  appearance: 'light' | 'dark';
  fontFamily: string;
  fontSize: string;
  /** The page's web fonts in `fontFamily`, which a worker must load to measure labels like the page draws them. */
  fontFaces: FontFaceSource[];
  roles: Record<string, string>;
  seriesPalette: string[];
}
/** Resolves the diagram theme from the design tokens and background in effect at `element`. */
declare function resolveMermaidTheme(element: Element): MermaidTheme;
//#endregion
//#region src/lib/mermaid/runtime.d.ts
type MermanModule = typeof Merman;
/** Loads and initializes the Merman WASM runtime once per realm; a failed load is retried on the next call. */
declare function loadMermaidRuntime(): Promise<{
  merman: MermanModule;
  measure: HostTextMeasurer;
}>;
interface RenderMermaidOptions {
  theme: MermaidTheme;
  /** Unique within the document that will host the SVG. */
  diagramId?: string;
}
/** Renders Mermaid source to an SVG string styled by `theme`; throws an Error with Merman's message on invalid source. */
declare function renderMermaidSvg(source: string, { theme, diagramId }: RenderMermaidOptions): Promise<string>;
//#endregion
export { type FontFaceSource, type MermaidTheme, type RenderMermaidOptions, loadMermaidRuntime, renderMermaidSvg, resolveMermaidTheme };