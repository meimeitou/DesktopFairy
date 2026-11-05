import { o as cherryCodeTheme } from "./code-highlight-Dl5bPXMG.mjs";
import { o as getCodeBlockPalette, s as codeBlockHighlightStyle } from "./code-block-DT_MiTw4.mjs";
import { d as gutters, r as EditorView } from "./dist-mkeOsl23.mjs";
import { syntaxHighlighting } from "@codemirror/language";
//#region src/components/composites/code-editor/cherry-theme.ts
const palette = getCodeBlockPalette(cherryCodeTheme);
/**
* CodeMirror chrome for the Cherry default code theme: transparent body, application tokens, shared syntax colors.
* Gutters scroll with the code; a sticky gutter would need an opaque fill that cannot match the translucent host.
*/
function createCherryCmTheme(dark) {
	return [
		EditorView.theme({
			"&": {
				...palette,
				backgroundColor: "transparent",
				color: "var(--code-foreground)"
			},
			".cm-content": { caretColor: "var(--code-caret)" },
			".cm-cursor, .cm-dropCursor": { borderLeftColor: "var(--code-caret)" },
			"&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection": { backgroundColor: "var(--code-selection)" },
			".cm-gutters": {
				backgroundColor: "transparent",
				color: "var(--muted-foreground)",
				border: "none"
			},
			".cm-activeLine": { backgroundColor: "var(--background-subtle)" },
			".cm-activeLineGutter": {
				backgroundColor: "transparent",
				color: "var(--foreground)"
			},
			".cm-panels": {
				backgroundColor: "var(--background)",
				color: "var(--foreground)"
			}
		}, { dark }),
		syntaxHighlighting(codeBlockHighlightStyle),
		gutters({ fixed: false })
	];
}
//#endregion
export { createCherryCmTheme };
