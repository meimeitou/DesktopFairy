const require_code_highlight = require("./code-highlight-DwTJhNuP.cjs");
const require_code_block = require("./code-block-_0WPk1_g.cjs");
const require_dist = require("./dist-YoILAXW4.cjs");
let _codemirror_language = require("@codemirror/language");
//#region src/components/composites/code-editor/cherry-theme.ts
const palette = require_code_block.getCodeBlockPalette(require_code_highlight.cherryCodeTheme);
/**
* CodeMirror chrome for the Cherry default code theme: transparent body, application tokens, shared syntax colors.
* Gutters scroll with the code; a sticky gutter would need an opaque fill that cannot match the translucent host.
*/
function createCherryCmTheme(dark) {
	return [
		require_dist.EditorView.theme({
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
		(0, _codemirror_language.syntaxHighlighting)(require_code_block.codeBlockHighlightStyle),
		require_dist.gutters({ fixed: false })
	];
}
//#endregion
exports.createCherryCmTheme = createCherryCmTheme;
