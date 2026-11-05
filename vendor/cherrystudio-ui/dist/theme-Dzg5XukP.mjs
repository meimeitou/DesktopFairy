//#region src/lib/mermaid/canvas-text-measurer.ts
const BREAK_TOKENS = /[⺀-鿿가-힯豈-﫿＀-￯]|\s+|[^\s⺀-鿿가-힯豈-﫿＀-￯]+/gu;
/**
* Measures Merman labels with an OffscreenCanvas, so rendering works where the DOM probes of
* `createBrowserTextMeasurementSession` are unavailable, such as a Web Worker. Widths are glyph
* advances; SVG box heights are the font's ascent plus descent; HTML-like wrapping breaks greedily.
*/
function createCanvasTextMeasurer() {
	const context = new OffscreenCanvas(1, 1).getContext("2d");
	if (!context) return () => void 0;
	const use = (request) => {
		const size = Number.isFinite(request.font_size) ? request.font_size : 16;
		const family = request.font_family || "sans-serif";
		context.font = `${request.font_style || "normal"} ${request.font_weight ?? "normal"} ${size}px ${family}`;
		context.letterSpacing = `${request.letter_spacing || 0}px`;
		context.wordSpacing = `${request.word_spacing || 0}px`;
	};
	const width = (text) => Math.max(0, context.measureText(text).width);
	const fontBox = () => {
		const metrics = context.measureText("Mg");
		return {
			ascent: metrics.fontBoundingBoxAscent,
			height: metrics.fontBoundingBoxAscent + metrics.fontBoundingBoxDescent
		};
	};
	const wrapLines = (text, maxWidth) => text.split("\n").flatMap((paragraph) => {
		if (maxWidth === null) return [paragraph];
		const lines = [];
		let line = "";
		for (const token of paragraph.match(BREAK_TOKENS) ?? []) {
			const candidate = line + token;
			if (line && !/^\s+$/.test(token) && width(candidate.trimEnd()) > maxWidth) {
				lines.push(line.trimEnd());
				line = token.trimStart();
			} else line = candidate;
		}
		lines.push(line.trimEnd());
		return lines;
	});
	const wrapped = (request) => {
		const maxWidth = request.has_max_width && request.max_width ? request.max_width : null;
		const natural = Math.max(...request.text.split("\n").map(width));
		const lines = request.white_space === "nowrap" ? request.text.split("\n") : wrapLines(request.text, maxWidth);
		return {
			width: maxWidth !== null && natural > maxWidth ? maxWidth : natural,
			height: lines.length * request.line_height,
			lineCount: lines.length,
			rawWidth: natural
		};
	};
	return (request) => {
		use(request);
		if (!request.text) {
			if (request.operation === "bbox-x" || request.operation === "bbox-x-with-ascii-overhang") return {
				kind: "horizontal-extents",
				bbox_left: 0,
				bbox_right: 0
			};
			if (request.operation === "title-bbox-x") return {
				kind: "horizontal-extents",
				bbox_left: 0,
				bbox_right: 0
			};
			if (request.operation === "measure" || request.operation === "wrapped") return {
				kind: "metrics",
				width: 0,
				height: 0,
				line_count: 1
			};
			return {
				kind: "length",
				length: 0
			};
		}
		switch (request.operation) {
			case "measure":
			case "mermaid-calculate-text-dimensions": return {
				kind: "metrics",
				width: width(request.text),
				height: fontBox().height,
				line_count: 1
			};
			case "wrapped": {
				if (request.wrap_mode !== "html-like") return void 0;
				const { width: w, height, lineCount } = wrapped(request);
				return {
					kind: "metrics",
					width: w,
					height,
					line_count: lineCount
				};
			}
			case "wrapped-with-raw-width": {
				if (request.wrap_mode !== "html-like") return void 0;
				const { width: w, height, lineCount, rawWidth } = wrapped(request);
				return {
					kind: "wrapped-with-raw-width",
					width: w,
					height,
					line_count: lineCount,
					raw_width: rawWidth
				};
			}
			case "computed-length":
			case "canvas-measure-text-width":
			case "raw-bbox-width":
			case "tspan-bbox-width":
			case "simple-bbox-width":
			case "wrap-probe-bbox-width":
			case "bounding-client-rect-width": return {
				kind: "length",
				length: width(request.text)
			};
			case "raw-bbox-height":
			case "tspan-bbox-height":
			case "simple-bbox-height": return {
				kind: "length",
				length: fontBox().height
			};
			case "raw-bbox-y-offset": return {
				kind: "length",
				length: -fontBox().ascent
			};
			default: return;
		}
	};
}
//#endregion
//#region src/lib/mermaid/fonts.ts
const unquote = (family) => family.trim().replace(/^["']|["']$/g, "");
/**
* Collects the page's `@font-face` rules for the families in a CSS `font-family` list, with absolute URLs.
* System fonts have no rule and need none: every realm can already use them.
*/
function collectFontFaces(fontFamily) {
	const families = new Set(fontFamily.split(",").map(unquote));
	const faces = [];
	const collect = (sheet, rules) => {
		for (const rule of rules) if (rule instanceof CSSImportRule && rule.styleSheet) visit(rule.styleSheet);
		else if (rule instanceof CSSGroupingRule) collect(sheet, rule.cssRules);
		else if (rule instanceof CSSFontFaceRule) {
			const family = unquote(rule.style.getPropertyValue("font-family"));
			if (families.has(family)) faces.push(toSource(rule, family, sheet.href ?? document.baseURI));
		}
	};
	const visit = (sheet) => {
		try {
			collect(sheet, sheet.cssRules);
		} catch {}
	};
	for (const sheet of document.styleSheets) visit(sheet);
	return faces;
}
function toSource(rule, family, base) {
	return {
		family,
		source: rule.style.getPropertyValue("src").replace(/url\((["']?)([^"')]+)\1\)/g, (_, quote, url) => `url(${quote}${new URL(url, base).href}${quote})`),
		descriptors: {
			style: rule.style.getPropertyValue("font-style") || "normal",
			weight: rule.style.getPropertyValue("font-weight") || "normal",
			unicodeRange: rule.style.getPropertyValue("unicode-range") || "U+0-10FFFF"
		}
	};
}
const registered = /* @__PURE__ */ new Map();
/** Registers `faces` in `fontSet` once each and waits until they have loaded, so canvas measurement uses them. */
async function ensureFontFaces(faces, fontSet) {
	await Promise.all(faces.map((face) => {
		const key = `${face.family}|${face.source}|${face.descriptors.weight}|${face.descriptors.style}`;
		let loading = registered.get(key);
		if (!loading) {
			const fontFace = new FontFace(face.family, face.source, face.descriptors);
			fontSet.add(fontFace);
			loading = fontFace.load().catch(() => void 0);
			registered.set(key, loading);
		}
		return loading;
	}));
}
//#endregion
//#region src/lib/mermaid/runtime.ts
let runtime = null;
/** Loads and initializes the Merman WASM runtime once per realm; a failed load is retried on the next call. */
function loadMermaidRuntime() {
	runtime ??= import("@mermanjs/web-render").then(async (merman) => {
		await merman.initMerman();
		return {
			merman,
			measure: createCanvasTextMeasurer()
		};
	}).catch((error) => {
		runtime = null;
		throw error;
	});
	return runtime;
}
const SCOPED_CSS = [
	"[filter*=\"drop-shadow\"] { filter: none; }",
	"text[alignment-baseline=\"central\"] { dominant-baseline: central; }",
	"text[alignment-baseline=\"middle\"] { dominant-baseline: middle; }"
].join("\n");
/**
* Merman's `interactive` profile caps layout work low enough to reject a 200-node flowchart. Render off the
* main thread and let the host stop a worker that overruns its deadline instead of refusing those diagrams.
*/
const LAYOUT_WORK_LIMIT = 4e8;
/** Renders Mermaid source to an SVG string styled by `theme`; throws an Error with Merman's message on invalid source. */
async function renderMermaidSvg(source, { theme, diagramId }) {
	const fontSet = typeof document === "undefined" ? self.fonts : document.fonts;
	const [{ merman, measure }] = await Promise.all([loadMermaidRuntime(), ensureFontFaces(theme.fontFaces, fontSet)]);
	try {
		return merman.renderSvgWithTextMeasurer(source, measure, {
			presentation: { theme: {
				appearance: theme.appearance,
				font_family: theme.fontFamily,
				font_size: theme.fontSize,
				roles: theme.roles,
				series_palette: theme.seriesPalette
			} },
			site_config: { themeVariables: { dropShadow: "none" } },
			svg: {
				diagram_id: diagramId,
				root_background_color: "transparent",
				scoped_css: SCOPED_CSS
			},
			resources: {
				profile: "interactive",
				limits: { max_layout_work_units: LAYOUT_WORK_LIMIT }
			}
		});
	} catch (error) {
		throw toError(error);
	}
}
function toError(error) {
	if (error instanceof Error) return error;
	if (error && typeof error === "object" && "message" in error && typeof error.message === "string") return new Error(error.message);
	return new Error(String(error));
}
//#endregion
//#region src/lib/mermaid/theme.ts
const ROLE_TOKENS = {
	surface: "--muted",
	"surface-alt": "--secondary",
	text: "--foreground",
	"subtle-text": "--muted-foreground",
	border: "--border-strong",
	line: "--muted-foreground",
	"cluster-background": "--background-subtle",
	"cluster-border": "--border",
	"note-background": "--warning-subtle",
	"note-border": "--warning-border",
	success: "--success"
};
const SERIES_TOKENS = [
	"--chart-1",
	"--chart-2",
	"--chart-3",
	"--chart-4",
	"--chart-5"
];
let probe = null;
const fontFacesByFamily = /* @__PURE__ */ new Map();
/** Paints `layers` bottom-up on one pixel and returns it as RGBA, so oklch and translucent paints resolve. */
function paint(layers) {
	probe ??= document.createElement("canvas").getContext("2d", { willReadFrequently: true });
	if (!probe) return new Uint8ClampedArray([
		255,
		255,
		255,
		255
	]);
	probe.clearRect(0, 0, 1, 1);
	for (const layer of layers) {
		probe.fillStyle = layer;
		probe.fillRect(0, 0, 1, 1);
	}
	return probe.getImageData(0, 0, 1, 1).data;
}
function paintHex(layers) {
	const [r, g, b] = paint(layers);
	return `#${[
		r,
		g,
		b
	].map((channel) => channel.toString(16).padStart(2, "0")).join("")}`;
}
/** The colour the page actually shows behind `element`: every translucent ancestor layer over the first opaque one. */
function backgroundBehind(element) {
	const layers = [];
	for (let node = element; node; node = node.parentElement) {
		const color = getComputedStyle(node).backgroundColor;
		const alpha = paint([color])[3] / 255;
		if (alpha === 0) continue;
		layers.push(color);
		if (alpha === 1) break;
	}
	return paintHex([
		"#ffffff",
		getComputedStyle(document.documentElement).getPropertyValue("--background").trim() || "#ffffff",
		...layers.reverse()
	]);
}
/** Resolves the diagram theme from the design tokens and background in effect at `element`. */
function resolveMermaidTheme(element) {
	const style = getComputedStyle(element);
	const body = getComputedStyle(element.ownerDocument.body);
	const canvas = backgroundBehind(element);
	const token = (name) => paintHex([canvas, style.getPropertyValue(name).trim() || "transparent"]);
	const roles = Object.fromEntries(Object.entries(ROLE_TOKENS).map(([role, name]) => [role, token(name)]));
	const [r, g, b] = [
		1,
		3,
		5
	].map((index) => Number.parseInt(canvas.slice(index, index + 2), 16));
	return {
		appearance: .2126 * r + .7152 * g + .0722 * b < 128 ? "dark" : "light",
		fontFamily: body.fontFamily,
		fontSize: body.fontSize,
		fontFaces: fontFacesByFamily.get(body.fontFamily) ?? cacheFontFaces(body.fontFamily),
		roles: {
			...roles,
			canvas,
			"edge-label-background": canvas
		},
		seriesPalette: SERIES_TOKENS.map(token)
	};
}
function cacheFontFaces(fontFamily) {
	const faces = collectFontFaces(fontFamily);
	fontFacesByFamily.set(fontFamily, faces);
	return faces;
}
//#endregion
export { loadMermaidRuntime as n, renderMermaidSvg as r, resolveMermaidTheme as t };
