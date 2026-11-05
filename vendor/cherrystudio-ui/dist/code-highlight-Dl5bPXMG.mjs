import { themes } from "@pierre/highlights/themes/loader";
//#region src/lib/code-highlight/catalog.ts
const CODE_LANGUAGES = {
	text: [
		"plain",
		"plaintext",
		"txt"
	],
	"angular-html": [],
	asm: ["assembly", "s"],
	astro: [],
	bash: [
		"sh",
		"shell",
		"shellscript",
		"shellsession",
		"zsh"
	],
	bat: [
		"batch",
		"batchfile",
		"cmd",
		"dos"
	],
	c: ["h"],
	c3: [],
	clojure: [
		"clj",
		"cljc",
		"cljs",
		"edn"
	],
	cmake: [],
	cpp: [
		"c++",
		"cc",
		"cxx",
		"hh",
		"hpp",
		"hxx"
	],
	csharp: ["c#", "cs"],
	css: [],
	cuda: ["cu", "cuh"],
	dart: [],
	diff: [
		"git-commit",
		"git-rebase",
		"patch"
	],
	dockerfile: ["containerfile", "docker"],
	elixir: ["ex", "exs"],
	elm: [],
	erlang: ["erl", "hrl"],
	"fortran-free-form": [
		"f03",
		"f08",
		"f90",
		"f95",
		"fortran"
	],
	"fortran-fixed-form": [
		"f",
		"f77",
		"for"
	],
	fsharp: [
		"f#",
		"fs",
		"fsi",
		"fsx"
	],
	gdresource: [
		"godot-resource",
		"tres",
		"tscn"
	],
	gdscript: ["gd"],
	gdshader: ["gdshaderinc", "godot-shader"],
	gleam: [],
	glsl: [
		"comp",
		"frag",
		"geom",
		"vert"
	],
	go: ["golang"],
	graphql: ["gql"],
	groovy: [
		"gradle",
		"gsh",
		"gvy",
		"gy"
	],
	haskell: ["hs"],
	hlsl: [],
	html: ["htm"],
	java: [],
	javascript: [
		"cjs",
		"js",
		"mjs"
	],
	json: ["jsonc"],
	json5: [],
	jsonl: [],
	jsx: [],
	julia: ["jl"],
	kotlin: ["kt", "kts"],
	latex: ["tex"],
	less: [],
	lisp: [
		"cl",
		"el",
		"elisp",
		"emacs-lisp",
		"lsp",
		"scheme",
		"scm"
	],
	lua: [],
	makefile: ["make", "mk"],
	markdown: ["md"],
	matlab: ["octave"],
	mdx: [],
	nim: [],
	nix: [],
	"objective-c": [
		"m",
		"mm",
		"objc",
		"objcpp",
		"objective-cpp",
		"objectivec",
		"objective-c++",
		"obj-c++",
		"objc++"
	],
	ocaml: ["ml", "mli"],
	pascal: [
		"delphi",
		"dpk",
		"dpr",
		"lpr",
		"object-pascal",
		"objectpascal",
		"pas",
		"pp"
	],
	perl: ["pl", "pm"],
	php: [],
	powershell: [
		"ps",
		"ps1",
		"psd1",
		"psm1",
		"pwsh"
	],
	proto: ["protobuf"],
	python: ["py"],
	r: ["rscript"],
	ruby: ["rb"],
	rust: ["rs"],
	sass: [],
	scala: ["sbt", "sc"],
	scss: [],
	solidity: ["sol"],
	sql: [],
	svelte: [],
	swift: [],
	terraform: [
		"hcl",
		"tf",
		"tfvars"
	],
	toml: [],
	typescript: [
		"angular-ts",
		"cts",
		"mts",
		"ts"
	],
	tsrx: [],
	tsx: [],
	vue: [],
	wasm: ["wat"],
	wgsl: [],
	xml: ["svg", "xsd"],
	yaml: ["yml"],
	zig: ["zon"]
};
const aliases = new Map(Object.entries(CODE_LANGUAGES).flatMap(([name, values]) => [name, ...values].map((value) => [value, name])));
const CODE_THEME_NAMES = Object.keys(themes);
const DEFAULT_LANGUAGES = [
	"text",
	"javascript",
	"typescript",
	"python",
	"java",
	"markdown",
	"json"
];
function normalizeCodeLanguage(language) {
	const value = language.trim().toLowerCase();
	return aliases.get(value) ?? value;
}
function supportsCodeLanguage(language) {
	return aliases.has(language.trim().toLowerCase());
}
function resolveCodeTheme(name, fallback = "one-light") {
	return name === "cherry" || Object.hasOwn(themes, name) ? name : fallback;
}
//#endregion
//#region src/lib/code-highlight/theme.ts
const WHITE_COLOR = /^(?:white|#fff|#ffffff|#ffffffff)$/i;
const CHERRY_CODE_THEME = "cherry";
/**
* The default code theme. Colors are `--cherry-code-*` suffixes that `product.css` resolves per app mode;
* `defaults` repeat the light values so HTML exported without application CSS stays colored.
*/
const cherryCodeTheme = {
	name: CHERRY_CODE_THEME,
	appearance: "light",
	cssVariables: {
		prefix: "--cherry-code-",
		defaults: {
			background: "transparent",
			foreground: "oklch(0.213 0 0)",
			muted: "oklch(0.556 0 0)",
			selection: "oklch(0.54 0.215 263 / 0.2)",
			keyword: "oklch(0.49 0.242 292)",
			string: "oklch(0.5 0.104 166)",
			constant: "oklch(0.55 0.145 49)",
			type: "oklch(0.52 0.093 223)",
			function: "oklch(0.54 0.215 263)",
			tag: "oklch(0.52 0.199 17)",
			link: "oklch(0.54 0.215 263)",
			inserted: "oklch(0.52 0.137 150)",
			deleted: "oklch(0.58 0.214 27)"
		}
	},
	style: {
		"editor.foreground": "foreground",
		"editor.background": "background",
		players: [{
			cursor: "foreground",
			selection: "selection"
		}],
		syntax: {
			attribute: "constant",
			boolean: "constant",
			comment: {
				color: "muted",
				font_style: "italic"
			},
			constant: "constant",
			constructor: "type",
			"diff.minus": "deleted",
			"diff.plus": "inserted",
			emphasis: {
				color: "foreground",
				font_style: "italic"
			},
			"emphasis.strong": {
				color: "foreground",
				font_weight: 700
			},
			enum: "type",
			error: "deleted",
			function: "function",
			hint: "muted",
			keyword: "keyword",
			label: "keyword",
			link_text: "link",
			link_uri: "link",
			namespace: "type",
			number: "constant",
			operator: "foreground",
			predictive: "muted",
			preproc: "keyword",
			property: "foreground",
			punctuation: "muted",
			selector: "tag",
			"selector.class": "type",
			string: "string",
			"string.escape": "constant",
			"string.special.symbol": "constant",
			tag: "tag",
			"tag.component.jsx": "type",
			"text.literal": "string",
			title: {
				color: "foreground",
				font_weight: 700
			},
			type: "type",
			variable: "foreground",
			"variable.special": "keyword",
			variant: "type"
		}
	}
};
async function loadCodeTheme(name, foreground) {
	if (name === "cherry") return cherryCodeTheme;
	const { default: theme } = await themes[resolveCodeTheme(name)]();
	if (theme.appearance !== "light" || !foreground) return theme;
	return {
		...theme,
		style: {
			...theme.style,
			syntax: Object.fromEntries(Object.entries(theme.style.syntax ?? {}).map(([scope, settings]) => {
				if (typeof settings === "string") return [scope, WHITE_COLOR.test(settings) ? foreground : settings];
				return [scope, settings.color && WHITE_COLOR.test(settings.color) ? {
					...settings,
					color: foreground
				} : settings];
			}))
		}
	};
}
function getReactStyleFromToken(token, options) {
	const flags = token.fontStyle ?? 0;
	const style = token.htmlStyle ?? {
		...token.color ? { color: token.color } : {},
		...token.bgColor ? { "background-color": token.bgColor } : {},
		...flags & 1 ? { "font-style": "italic" } : {},
		...flags & 2 ? { "font-weight": "bold" } : {},
		...flags & 12 ? { "text-decoration": [flags & 4 ? "underline" : "", flags & 8 ? "line-through" : ""].filter(Boolean).join(" ") } : {}
	};
	return Object.fromEntries(Object.entries(style).map(([key, value]) => [key.startsWith("--") ? key : key.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase()), key === "color" && !options?.isDarkTheme && options?.foreground && WHITE_COLOR.test(value) ? options.foreground : value]));
}
//#endregion
//#region src/lib/code-highlight/runtime.ts
function plainTokens(code) {
	return { tokens: code.split("\n").map((content) => [{
		content,
		offset: 0
	}]) };
}
function escapeCode(code) {
	return code.replace(/[&<>"']/g, (character) => ({
		"&": "&amp;",
		"<": "&lt;",
		">": "&gt;",
		"\"": "&quot;",
		"'": "&#39;"
	})[character]);
}
var HighlightDocument = class {
	constructor(tokenizer) {
		this.tokenizer = tokenizer;
		this.indexLineEndings();
	}
	get code() {
		return this.tokenizer.getText();
	}
	get lineCount() {
		return this.rows?.length ?? this.tokenizer.lineCount;
	}
	indexLineEndings() {
		const code = this.code;
		let start = 0;
		this.rows = code.includes("\r") ? code.split("\n").map((line) => {
			const parts = line.split("\r");
			const row = {
				start,
				parts
			};
			start += parts.length - Number(line.endsWith("\r"));
			return row;
		}) : void 0;
	}
	update(change) {
		if (change.type === "replace") this.tokenizer.reset(change.code);
		else {
			const lines = this.rows ? this.code.split("\n") : void 0;
			const splitsCrlf = (point) => lines && point.line < lines.length - 1 && lines[point.line].endsWith("\r") && point.character === lines[point.line].length;
			if (change.edits.some(({ range }) => splitsCrlf(range.start) || splitsCrlf(range.end))) {
				const offset = (point) => lines.slice(0, point.line).reduce((total, line) => total + line.length + 1, point.character);
				const edits = change.edits.map(({ range, newText }) => ({
					start: offset(range.start),
					end: offset(range.end),
					newText
				}));
				edits.sort((a, b) => a.start - b.start || a.end - b.end);
				const code = edits.reduceRight((source, edit) => source.slice(0, edit.start) + edit.newText + source.slice(edit.end), this.code);
				this.tokenizer.reset(code);
				this.indexLineEndings();
				return;
			}
			const position = (point) => {
				const row = this.rows?.[point.line];
				if (!row) return point;
				const prefix = row.parts.join("\r").slice(0, point.character).split("\r");
				return {
					line: row.start + prefix.length - 1,
					character: prefix.at(-1).length
				};
			};
			this.tokenizer.applyEdits(change.edits.map((edit) => ({
				...edit,
				range: {
					start: position(edit.range.start),
					end: position(edit.range.end)
				}
			})));
		}
		this.indexLineEndings();
	}
	read(range) {
		const start = Math.max(0, Math.min(range.start, this.lineCount));
		const end = Math.max(start, Math.min(range.end, this.lineCount));
		return {
			start,
			lines: Array.from({ length: end - start }, (_, index) => {
				const row = this.rows?.[start + index];
				if (!row) return this.tokenizer.getLineTokens(start + index).tokens;
				const tokens = [];
				let offset = 0;
				row.parts.forEach((part, segment) => {
					if (part.length) for (const token of this.tokenizer.getLineTokens(row.start + segment).tokens) {
						tokens.push({
							...token,
							offset
						});
						offset += token.content.length;
					}
					if (segment < row.parts.length - 1) {
						tokens.push({
							content: "\r",
							offset
						});
						offset++;
					}
				});
				return tokens;
			})
		};
	}
	dispose() {
		this.tokenizer.dispose();
	}
};
let runtime;
async function initialize() {
	const engine = await import("@pierre/highlights");
	const language = (name) => {
		const normalized = normalizeCodeLanguage(name);
		return engine.isSupportedLanguage(normalized) ? normalized : "text";
	};
	return {
		createDocument(code, lang, theme) {
			return new HighlightDocument(new engine.LiveTokenizer({
				code,
				lang: language(lang),
				theme,
				tokenizeMaxLineLength: 1e4
			}));
		},
		codeToHtml(code, lang, theme) {
			return new TextDecoder().decode(engine.codeToHtml(code, {
				lang: language(lang),
				theme
			}));
		},
		snapshot(code, lang, light, dark) {
			const result = engine.codeToTokens(code, {
				lang: language(lang),
				themes: {
					light,
					dark
				},
				cssVariablePrefix: "--shiki-",
				tokenizeMaxLineLength: 1e4
			});
			const [fg, ...foreground] = (result.fg ?? "").split(";");
			const [bg, ...background] = (result.bg ?? "").split(";");
			const sourceLines = code.includes("\r") ? code.split("\n") : void 0;
			const tokens = result.tokens.map((line, index) => {
				let offset = 0;
				const normalized = line.map((token) => {
					const current = {
						...token,
						offset
					};
					offset += token.content.length;
					return current;
				});
				if (sourceLines?.[index].endsWith("\r") && offset < sourceLines[index].length) normalized.push({
					content: "\r",
					offset
				});
				return normalized;
			});
			return {
				...result,
				tokens,
				fg,
				bg,
				rootStyle: [...foreground, ...background].join(";")
			};
		}
	};
}
function loadCodeHighlightRuntime() {
	runtime ??= initialize().catch((error) => {
		runtime = void 0;
		throw error;
	});
	return runtime;
}
function createSnapshotExecutor() {
	const cache = /* @__PURE__ */ new Map();
	const pending = /* @__PURE__ */ new Map();
	let retained = 0;
	return (request) => {
		const { code, foreground } = request;
		const lang = normalizeCodeLanguage(request.language);
		const light = resolveCodeTheme(request.themes[0], "github-light");
		const dark = resolveCodeTheme(request.themes[1], "github-dark");
		const key = JSON.stringify([
			code,
			lang,
			light,
			dark,
			foreground
		]);
		const cached = cache.get(key);
		if (cached) {
			cache.delete(key);
			cache.set(key, cached);
			return Promise.resolve(cached.result);
		}
		const running = pending.get(key);
		if (running) return running;
		const task = Promise.all([
			loadCodeHighlightRuntime(),
			loadCodeTheme(light, foreground),
			loadCodeTheme(dark, foreground)
		]).then(([engine, lightTheme, darkTheme]) => {
			const result = engine.snapshot(code, lang, lightTheme, darkTheme);
			if (code.length <= 1048576) {
				cache.set(key, {
					result,
					size: code.length
				});
				retained += code.length;
				while (cache.size > 24 || retained > 1048576) {
					const oldest = cache.keys().next().value;
					retained -= cache.get(oldest).size;
					cache.delete(oldest);
				}
			}
			return result;
		}).finally(() => pending.delete(key));
		pending.set(key, task);
		return task;
	};
}
//#endregion
export { CHERRY_CODE_THEME as a, loadCodeTheme as c, DEFAULT_LANGUAGES as d, normalizeCodeLanguage as f, plainTokens as i, CODE_LANGUAGES as l, supportsCodeLanguage as m, escapeCode as n, cherryCodeTheme as o, resolveCodeTheme as p, loadCodeHighlightRuntime as r, getReactStyleFromToken as s, createSnapshotExecutor as t, CODE_THEME_NAMES as u };
