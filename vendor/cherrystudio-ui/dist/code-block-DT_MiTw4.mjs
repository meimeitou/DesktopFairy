import { c as loadCodeTheme, f as normalizeCodeLanguage, l as CODE_LANGUAGES, n as escapeCode } from "./code-highlight-Dl5bPXMG.mjs";
import { HighlightStyle, syntaxTree, syntaxTreeAvailable } from "@codemirror/language";
import { highlightTree, tags } from "@lezer/highlight";
import { TreeFragment } from "@lezer/common";
//#region src/lib/code-block/language.ts
const _customLanguageExtensions = {
	svg: "xml",
	vab: "vb",
	graphviz: "dot"
};
const _defaultLanguageConfig = {
	JavaScript: {
		type: "programming",
		extensions: [
			".js",
			".mjs",
			".cjs"
		],
		aliases: ["js", "node"]
	},
	TypeScript: {
		type: "programming",
		extensions: [".ts"],
		aliases: ["ts"]
	},
	Python: {
		type: "programming",
		extensions: [".py"],
		aliases: ["python3", "py"]
	},
	Java: {
		type: "programming",
		extensions: [".java"]
	},
	"C++": {
		type: "programming",
		extensions: [
			".cpp",
			".cc",
			".cxx"
		],
		aliases: ["cpp"]
	},
	C: {
		type: "programming",
		extensions: [".c"]
	},
	"C#": {
		type: "programming",
		extensions: [".cs"],
		aliases: ["csharp"]
	},
	HTML: {
		type: "markup",
		extensions: [".html", ".htm"]
	},
	CSS: {
		type: "markup",
		extensions: [".css"]
	},
	JSON: {
		type: "data",
		extensions: [".json"]
	},
	XML: {
		type: "data",
		extensions: [".xml"]
	},
	YAML: {
		type: "data",
		extensions: [".yml", ".yaml"]
	},
	SQL: {
		type: "data",
		extensions: [".sql"]
	},
	Shell: {
		type: "programming",
		extensions: [".sh", ".bash"],
		aliases: ["bash", "sh"]
	},
	Go: {
		type: "programming",
		extensions: [".go"],
		aliases: ["golang"]
	},
	Rust: {
		type: "programming",
		extensions: [".rs"]
	},
	PHP: {
		type: "programming",
		extensions: [".php"]
	},
	Ruby: {
		type: "programming",
		extensions: [".rb"],
		aliases: ["rb"]
	},
	Swift: {
		type: "programming",
		extensions: [".swift"]
	},
	Kotlin: {
		type: "programming",
		extensions: [".kt"]
	},
	Dart: {
		type: "programming",
		extensions: [".dart"]
	},
	R: {
		type: "programming",
		extensions: [".r"]
	},
	MATLAB: {
		type: "programming",
		extensions: [".m"]
	}
};
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
function getExtensionByLanguage(language, languageConfig) {
	const languages = languageConfig || _defaultLanguageConfig;
	const lowerLanguage = language.toLowerCase();
	const directMatch = languages[language];
	if (directMatch?.extensions?.[0]) return directMatch.extensions[0];
	for (const [langName, data] of Object.entries(languages)) if (langName.toLowerCase() === lowerLanguage && data.extensions?.[0]) return data.extensions[0];
	for (const [, data] of Object.entries(languages)) if (data.aliases?.some((alias) => alias.toLowerCase() === lowerLanguage)) return data.extensions?.[0] || `.${language}`;
	return `.${language}`;
}
/**
* Get the file extension of the language, for @uiw/codemirror-extensions-langs
* - First, search for custom extensions
* - Then, search for language configuration extensions
* - Finally, assume the name is already an extension
* @param language language name
* @param languageConfig optional language configuration
* @returns file extension (without `.` prefix)
*/
async function getNormalizedExtension(language, languageConfig) {
	return normalizeExtension(language, languageConfig);
}
function normalizeExtension(language, languageConfig) {
	let lang = language;
	if (language.startsWith(".") && language.length > 1) lang = language.slice(1);
	const lowerLanguage = lang.toLowerCase();
	const customExt = _customLanguageExtensions[lowerLanguage];
	if (customExt) return customExt;
	const linguistExt = getExtensionByLanguage(lang, languageConfig);
	if (linguistExt) return linguistExt.slice(1).toLowerCase();
	return lowerLanguage;
}
const languages = /* @__PURE__ */ new Map();
function loadCodeBlockLanguage(language, config) {
	const extension = normalizeExtension(language, config);
	let pending = languages.get(extension);
	if (!pending) {
		pending = (async () => {
			if (extension === "dot") return (await import("@viz-js/lang-dot")).dot();
			if (extension === "mmd" || extension === "mermaid") return (await import("codemirror-lang-mermaid")).mermaid();
			const { loadLanguage } = await import("@uiw/codemirror-extensions-langs");
			const canonical = normalizeCodeLanguage(extension);
			const candidates = [
				extension,
				normalizeExtension(canonical),
				...CODE_LANGUAGES[canonical] ?? []
			];
			for (const candidate of candidates) {
				const support = loadLanguage(candidate);
				if (support) return support;
			}
			return null;
		})();
		languages.set(extension, pending);
		pending.catch(() => languages.delete(extension));
	}
	return pending;
}
function getCodeBlockParser(support) {
	return ("language" in support ? support.language : support).parser;
}
//#endregion
//#region src/lib/code-block/syntax.ts
const CODE_BLOCK_SYNTAX = [
	{
		role: "keyword",
		tag: tags.keyword
	},
	{
		role: "comment",
		tag: tags.comment
	},
	{
		role: "string",
		tag: [
			tags.string,
			tags.regexp,
			tags.escape
		]
	},
	{
		role: "number",
		tag: tags.number
	},
	{
		role: "boolean",
		tag: [tags.bool, tags.null]
	},
	{
		role: "type",
		tag: [
			tags.typeName,
			tags.className,
			tags.namespace
		]
	},
	{
		role: "function",
		tag: [tags.function(tags.variableName), tags.function(tags.propertyName)]
	},
	{
		role: "variable",
		tag: tags.variableName
	},
	{
		role: "constant",
		tag: tags.constant(tags.variableName)
	},
	{
		role: "property",
		tag: tags.propertyName
	},
	{
		role: "operator",
		tag: tags.operator
	},
	{
		role: "punctuation",
		tag: tags.punctuation
	},
	{
		role: "tag",
		tag: tags.tagName
	},
	{
		role: "attribute",
		tag: tags.attributeName
	},
	{
		role: "link",
		tag: tags.link
	},
	{
		role: "heading",
		tag: tags.heading
	},
	{
		role: "emphasis",
		tag: tags.emphasis
	},
	{
		role: "strong",
		tag: tags.strong
	},
	{
		role: "meta",
		tag: tags.meta
	},
	{
		role: "invalid",
		tag: tags.invalid
	}
];
const codeBlockHighlightStyle = HighlightStyle.define(CODE_BLOCK_SYNTAX.map(({ role, tag }) => ({
	tag,
	class: `code-syntax-${role}`
})));
const codeBlockSyntaxCss = ".code-viewer ::selection,.code-syntax-root ::selection{background:var(--code-selection)}" + CODE_BLOCK_SYNTAX.map(({ role }) => `.code-syntax-${role}{color:var(--code-syntax-${role},inherit);font-style:var(--code-syntax-${role}-style,normal);font-weight:var(--code-syntax-${role}-weight,normal)}`).join("");
//#endregion
//#region src/lib/code-block/palette.ts
const roles = {
	keyword: "keyword",
	comment: "comment",
	string: "string",
	number: "number",
	boolean: "boolean",
	type: "type",
	function: "function",
	variable: "variable",
	constant: "constant",
	property: "property",
	operator: "operator",
	punctuation: "punctuation",
	tag: "tag",
	attribute: "attribute",
	link: "link_text",
	heading: "title",
	emphasis: "emphasis",
	strong: "emphasis.strong",
	meta: "preproc",
	invalid: "error"
};
function getCodeBlockPalette(theme) {
	const variables = typeof theme.cssVariables === "object" ? theme.cssVariables : void 0;
	const color = (value) => {
		if (value === void 0 || !variables) return value;
		const fallback = variables.defaults?.[value];
		return `var(${variables.prefix ?? "--hls-"}${value}${fallback ? `, ${fallback}` : ""})`;
	};
	const foreground = color(theme.style["editor.foreground"] ?? theme.style.text) ?? "var(--foreground)";
	const background = color(theme.style["editor.background"] ?? theme.style.background) ?? "var(--background)";
	const player = theme.style.players?.[0];
	const palette = {
		"--code-foreground": foreground,
		"--code-background": background,
		"--code-selection": color(player?.selection) ?? "var(--accent)",
		"--code-caret": color(player?.cursor) ?? foreground
	};
	for (const [role, scope] of Object.entries(roles)) {
		const syntax = theme.style.syntax?.[scope];
		const settings = typeof syntax === "string" ? { color: syntax } : syntax;
		palette[`--code-syntax-${role}`] = color(settings?.color) ?? foreground;
		palette[`--code-syntax-${role}-style`] = settings?.font_style ?? (role === "emphasis" ? "italic" : "normal");
		palette[`--code-syntax-${role}-weight`] = String(settings?.font_weight ?? (role === "strong" || role === "heading" ? 700 : 400));
	}
	return palette;
}
//#endregion
//#region src/lib/code-block/document.ts
/** Read an editor's already parsed range without parsing or copying the full document. */
function readCodeBlockState(state, range) {
	const start = Math.max(0, Math.min(range.start, state.doc.lines));
	const end = Math.max(start, Math.min(range.end, state.doc.lines));
	if (end === start) return {
		start,
		lines: []
	};
	if (!syntaxTreeAvailable(state, state.doc.line(end).to)) return null;
	const tree = syntaxTree(state);
	return {
		start,
		lines: Array.from({ length: end - start }, (_, index) => {
			const line = state.doc.line(start + index + 1);
			const tokens = [];
			let cursor = line.from;
			highlightTree(tree, codeBlockHighlightStyle, (from, to, className) => {
				if (from > cursor) tokens.push({
					content: state.doc.sliceString(cursor, from),
					offset: cursor - line.from
				});
				tokens.push({
					content: state.doc.sliceString(from, to),
					offset: from - line.from,
					className
				});
				cursor = to;
			}, line.from, line.to);
			if (cursor < line.to || tokens.length === 0) tokens.push({
				content: state.doc.sliceString(cursor, line.to),
				offset: cursor - line.from
			});
			return tokens;
		})
	};
}
function lineOffsets(code) {
	const offsets = [0];
	for (let index = 0; index < code.length; index++) if (code.charCodeAt(index) === 10) offsets.push(index + 1);
	return offsets;
}
function plainCodeBlockTokens(code, range) {
	return {
		start: range.start,
		lines: code.split("\n").slice(range.start, range.end).map((content) => [{
			content,
			offset: 0
		}])
	};
}
var CodeBlockDocument = class {
	constructor(code, parser) {
		this.code = code;
		this.parser = parser;
		this.fragments = [];
		this.disposed = false;
		this.offsets = lineOffsets(code);
	}
	update(change) {
		const previousLength = this.code.length;
		const edits = change.type === "replace" ? [{
			from: 0,
			to: previousLength,
			text: change.code
		}] : change.edits.map(({ range, newText }) => ({
			from: this.offsets[range.start.line] + range.start.character,
			to: this.offsets[range.end.line] + range.end.character,
			text: newText
		})).sort((a, b) => a.from - b.from || a.to - b.to);
		let delta = 0;
		const changed = edits.map(({ from, to, text }) => {
			const fromB = from + delta;
			delta += text.length - (to - from);
			return {
				fromA: from,
				toA: to,
				fromB,
				toB: fromB + text.length
			};
		});
		this.fragments = TreeFragment.applyChanges(this.fragments, changed);
		this.tree = void 0;
		this.code = edits.reduceRight((code, edit) => code.slice(0, edit.from) + edit.text + code.slice(edit.to), this.code);
		if (edits.length === 1 && edits[0].from === previousLength && edits[0].to === previousLength) {
			for (let index = previousLength; index < this.code.length; index++) if (this.code.charCodeAt(index) === 10) this.offsets.push(index + 1);
		} else this.offsets = lineOffsets(this.code);
	}
	async read(range) {
		const start = Math.max(0, Math.min(range.start, this.offsets.length));
		const end = Math.max(start, Math.min(range.end, this.offsets.length));
		const from = this.offsets[start] ?? this.code.length;
		const to = this.offsets[end] ?? this.code.length;
		if (this.parser && (!this.tree || this.tree.length < to)) {
			const parsing = this.parser.startParse(this.code, this.fragments);
			parsing.stopAt(to);
			let tree = null;
			while (!tree) {
				if (this.disposed) throw new Error("Code block document closed");
				const deadline = performance.now() + 8;
				do
					tree = parsing.advance();
				while (!tree && performance.now() < deadline);
				if (!tree) await new Promise((resolve) => setTimeout(resolve, 0));
			}
			this.tree = tree;
			this.fragments = TreeFragment.addTree(tree, this.fragments, tree.length < this.code.length);
		}
		const spans = [];
		if (this.tree) highlightTree(this.tree, codeBlockHighlightStyle, (from, to, className) => spans.push({
			from,
			to,
			className
		}), from, to);
		let spanIndex = 0;
		const lines = [];
		for (let line = start; line < end; line++) {
			const rowStart = this.offsets[line];
			const rowEnd = (this.offsets[line + 1] ?? this.code.length + 1) - 1;
			let cursor = rowStart;
			const tokens = [];
			while (spanIndex < spans.length && spans[spanIndex].to <= rowStart) spanIndex++;
			let index = spanIndex;
			while (index < spans.length && spans[index].from < rowEnd) {
				const span = spans[index];
				const begin = Math.max(rowStart, span.from);
				const finish = Math.min(rowEnd, span.to);
				if (begin > cursor) tokens.push({
					content: this.code.slice(cursor, begin),
					offset: cursor - rowStart
				});
				tokens.push({
					content: this.code.slice(begin, finish),
					offset: begin - rowStart,
					className: span.className
				});
				cursor = finish;
				if (span.to > rowEnd) break;
				index++;
			}
			if (cursor < rowEnd || tokens.length === 0) tokens.push({
				content: this.code.slice(cursor, rowEnd),
				offset: cursor - rowStart
			});
			lines.push(tokens);
		}
		return {
			start,
			lines
		};
	}
	dispose() {
		this.disposed = true;
		this.tree = void 0;
		this.fragments = [];
		this.code = "";
		this.offsets = [];
	}
};
async function createCodeBlockDocument(code, language) {
	const support = await loadCodeBlockLanguage(language);
	return new CodeBlockDocument(code, support ? getCodeBlockParser(support) : null);
}
//#endregion
//#region src/lib/code-block/snapshot.ts
function tokenStyle(className, palette) {
	const style = { color: palette["--code-foreground"] };
	for (const name of className?.split(" ") ?? []) {
		const role = name.replace(/^code-syntax-/, "");
		if (!palette[`--code-syntax-${role}`]) continue;
		style.color = palette[`--code-syntax-${role}`];
		style["font-style"] = palette[`--code-syntax-${role}-style`];
		style["font-weight"] = palette[`--code-syntax-${role}-weight`];
	}
	return style;
}
function createCodeBlockSnapshotExecutor() {
	const cache = /* @__PURE__ */ new Map();
	const pending = /* @__PURE__ */ new Map();
	let retained = 0;
	return (request) => {
		const key = JSON.stringify(request);
		const cached = cache.get(key);
		if (cached) {
			cache.delete(key);
			cache.set(key, cached);
			return Promise.resolve(cached.result);
		}
		const running = pending.get(key);
		if (running) return running;
		const task = Promise.all([loadCodeTheme(request.themes[0], request.foreground), loadCodeTheme(request.themes[1], request.foreground)]).then(async ([light, dark]) => {
			const document = await createCodeBlockDocument(request.code, request.language);
			try {
				const result = await document.read({
					start: 0,
					end: request.code.split("\n").length
				});
				const palettes = [getCodeBlockPalette(light), getCodeBlockPalette(dark)];
				const snapshot = {
					fg: palettes[0]["--code-foreground"],
					bg: palettes[0]["--code-background"],
					rootStyle: `--shiki-dark:${palettes[1]["--code-foreground"]};--shiki-dark-bg:${palettes[1]["--code-background"]}`,
					tokens: result.lines.map((line) => line.map(({ className, ...token }) => {
						const style = tokenStyle(className, palettes[0]);
						const darkStyle = tokenStyle(className, palettes[1]);
						return {
							...token,
							color: style.color,
							htmlStyle: {
								...style,
								"--shiki-dark": darkStyle.color,
								"--shiki-dark-font-style": darkStyle["font-style"] ?? "normal",
								"--shiki-dark-font-weight": darkStyle["font-weight"] ?? "normal"
							}
						};
					}))
				};
				if (request.code.length <= 1048576) {
					cache.set(key, {
						size: request.code.length,
						result: snapshot
					});
					retained += request.code.length;
					while (cache.size > 24 || retained > 1048576) {
						const oldest = cache.keys().next().value;
						retained -= cache.get(oldest).size;
						cache.delete(oldest);
					}
				}
				return snapshot;
			} finally {
				document.dispose();
			}
		}).finally(() => pending.delete(key));
		pending.set(key, task);
		return task;
	};
}
const execute = createCodeBlockSnapshotExecutor();
async function codeBlockToHtml(code, language, theme) {
	const result = await execute({
		code,
		language,
		themes: [theme, theme]
	});
	const html = result.tokens.map((line) => line.map((token) => {
		const style = Object.entries(token.htmlStyle ?? {}).filter(([name]) => !name.startsWith("--")).map(([name, value]) => `${name}:${value}`).join(";");
		return `<span style="${escapeCode(style)}">${escapeCode(token.content).replaceAll("\r", "&#13;")}</span>`;
	}).join("")).join("\n");
	return `<pre class="shiki highlights" style="color:${escapeCode(result.fg ?? "")};background-color:${escapeCode(result.bg ?? "")}"><code>${html}</code></pre>`;
}
//#endregion
export { readCodeBlockState as a, codeBlockSyntaxCss as c, getNormalizedExtension as d, loadCodeBlockLanguage as f, plainCodeBlockTokens as i, getCodeBlockParser as l, createCodeBlockSnapshotExecutor as n, getCodeBlockPalette as o, createCodeBlockDocument as r, codeBlockHighlightStyle as s, codeBlockToHtml as t, getExtensionByLanguage as u };
