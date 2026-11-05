import { a as __toESM, t as __commonJSMin } from "./rolldown-runtime-B000p9w_.mjs";
import { jr as prepareCodeChanges } from "./components-D_9c9-mV.mjs";
import { d as getNormalizedExtension, f as loadCodeBlockLanguage } from "./code-block-DT_MiTw4.mjs";
import { t as require_extends } from "./extends-0Fd9D_hw.mjs";
import { C as showTooltip, S as showPanel, _ as lineNumbers, a as WidgetType, b as rectangularSelection, c as dropCursor, d as gutters, f as highlightActiveLine, g as keymap, h as hoverTooltip, i as ViewPlugin, l as getPanel, m as highlightSpecialChars, n as Direction, o as crosshairCursor, p as highlightActiveLineGutter, r as EditorView, s as drawSelection, t as Decoration, u as getTooltip, v as logException, x as runScopeHandlers, y as placeholder } from "./dist-mkeOsl23.mjs";
import { forwardRef, memo, use, useCallback, useEffect, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState } from "react";
import { jsx } from "react/jsx-runtime";
import { HighlightStyle, bracketMatching, defaultHighlightStyle, foldGutter, foldKeymap, foldState, indentOnInput, indentUnit, syntaxHighlighting, syntaxTree } from "@codemirror/language";
import { tags } from "@lezer/highlight";
import { Annotation, CharCategory, EditorSelection, EditorState, Facet, MapMode, Prec, RangeSet, RangeSetBuilder, RangeValue, StateEffect, StateField, Text, codePointAt, codePointSize, combineConfig, findClusterBreak, fromCodePoint } from "@codemirror/state";
import { defaultKeymap, history, historyField, historyKeymap, indentWithTab } from "@codemirror/commands";
//#region ../../node_modules/.pnpm/crelt@1.0.6/node_modules/crelt/index.js
var import_extends = /* @__PURE__ */ __toESM(require_extends());
function crelt$1() {
	var elt = arguments[0];
	if (typeof elt == "string") elt = document.createElement(elt);
	var i = 1, next = arguments[1];
	if (next && typeof next == "object" && next.nodeType == null && !Array.isArray(next)) {
		for (var name in next) if (Object.prototype.hasOwnProperty.call(next, name)) {
			var value = next[name];
			if (typeof value == "string") elt.setAttribute(name, value);
			else if (value != null) elt[name] = value;
		}
		i++;
	}
	for (; i < arguments.length; i++) add$1(elt, arguments[i]);
	return elt;
}
function add$1(elt, child) {
	if (typeof child == "string") elt.appendChild(document.createTextNode(child));
	else if (child == null) {} else if (child.nodeType != null) elt.appendChild(child);
	else if (Array.isArray(child)) for (var i = 0; i < child.length; i++) add$1(elt, child[i]);
	else throw new RangeError("Unsupported child node: " + child);
}
//#endregion
//#region ../../node_modules/.pnpm/crelt@1.0.7/node_modules/crelt/index.js
var import_objectWithoutPropertiesLoose = /* @__PURE__ */ __toESM((/* @__PURE__ */ __commonJSMin(((exports, module) => {
	function _objectWithoutPropertiesLoose(r, e) {
		if (null == r) return {};
		var t = {};
		for (var n in r) if ({}.hasOwnProperty.call(r, n)) {
			if (-1 !== e.indexOf(n)) continue;
			t[n] = r[n];
		}
		return t;
	}
	module.exports = _objectWithoutPropertiesLoose, module.exports.__esModule = true, module.exports["default"] = module.exports;
})))());
function crelt() {
	var elt = arguments[0];
	if (typeof elt == "string") elt = document.createElement(elt);
	var i = 1, next = arguments[1];
	if (next && typeof next == "object" && next.nodeType == null && !Array.isArray(next)) {
		for (var name in next) if (Object.prototype.hasOwnProperty.call(next, name)) {
			var value = next[name];
			if (typeof value == "string") elt.setAttribute(name, value);
			else if (value != null) elt[name] = value;
		}
		i++;
	}
	for (; i < arguments.length; i++) add(elt, arguments[i]);
	return elt;
}
function add(elt, child) {
	if (typeof child == "string") elt.appendChild(document.createTextNode(child));
	else if (child == null) {} else if (child.nodeType != null) elt.appendChild(child);
	else if (Array.isArray(child)) for (var i = 0; i < child.length; i++) add(elt, child[i]);
	else throw new RangeError("Unsupported child node: " + child);
}
//#endregion
//#region ../../node_modules/.pnpm/@codemirror+search@6.5.11/node_modules/@codemirror/search/dist/index.js
const basicNormalize = typeof String.prototype.normalize == "function" ? (x) => x.normalize("NFKD") : (x) => x;
/**
A search cursor provides an iterator over text matches in a
document.
*/
var SearchCursor = class {
	/**
	Create a text cursor. The query is the search string, `from` to
	`to` provides the region to search.
	
	When `normalize` is given, it will be called, on both the query
	string and the content it is matched against, before comparing.
	You can, for example, create a case-insensitive search by
	passing `s => s.toLowerCase()`.
	
	Text is always normalized with
	[`.normalize("NFKD")`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/normalize)
	(when supported).
	*/
	constructor(text, query, from = 0, to = text.length, normalize, test) {
		this.test = test;
		/**
		The current match (only holds a meaningful value after
		[`next`](https://codemirror.net/6/docs/ref/#search.SearchCursor.next) has been called and when
		`done` is false).
		*/
		this.value = {
			from: 0,
			to: 0
		};
		/**
		Whether the end of the iterated region has been reached.
		*/
		this.done = false;
		this.matches = [];
		this.buffer = "";
		this.bufferPos = 0;
		this.iter = text.iterRange(from, to);
		this.bufferStart = from;
		this.normalize = normalize ? (x) => normalize(basicNormalize(x)) : basicNormalize;
		this.query = this.normalize(query);
	}
	peek() {
		if (this.bufferPos == this.buffer.length) {
			this.bufferStart += this.buffer.length;
			this.iter.next();
			if (this.iter.done) return -1;
			this.bufferPos = 0;
			this.buffer = this.iter.value;
		}
		return codePointAt(this.buffer, this.bufferPos);
	}
	/**
	Look for the next match. Updates the iterator's
	[`value`](https://codemirror.net/6/docs/ref/#search.SearchCursor.value) and
	[`done`](https://codemirror.net/6/docs/ref/#search.SearchCursor.done) properties. Should be called
	at least once before using the cursor.
	*/
	next() {
		while (this.matches.length) this.matches.pop();
		return this.nextOverlapping();
	}
	/**
	The `next` method will ignore matches that partially overlap a
	previous match. This method behaves like `next`, but includes
	such matches.
	*/
	nextOverlapping() {
		for (;;) {
			let next = this.peek();
			if (next < 0) {
				this.done = true;
				return this;
			}
			let str = fromCodePoint(next), start = this.bufferStart + this.bufferPos;
			this.bufferPos += codePointSize(next);
			let norm = this.normalize(str);
			if (norm.length) for (let i = 0, pos = start;; i++) {
				let code = norm.charCodeAt(i);
				let match = this.match(code, pos, this.bufferPos + this.bufferStart);
				if (i == norm.length - 1) {
					if (match) {
						this.value = match;
						return this;
					}
					break;
				}
				if (pos == start && i < str.length && str.charCodeAt(i) == code) pos++;
			}
		}
	}
	match(code, pos, end) {
		let match = null;
		for (let i = 0; i < this.matches.length; i += 2) {
			let index = this.matches[i], keep = false;
			if (this.query.charCodeAt(index) == code) {
				if (index == this.query.length - 1) match = {
					from: this.matches[i + 1],
					to: end
				};
				else {
					this.matches[i]++;
					keep = true;
				}
			}
			if (!keep) {
				this.matches.splice(i, 2);
				i -= 2;
			}
		}
		if (this.query.charCodeAt(0) == code) {
			if (this.query.length == 1) match = {
				from: pos,
				to: end
			};
			else this.matches.push(1, pos);
		}
		if (match && this.test && !this.test(match.from, match.to, this.buffer, this.bufferStart)) match = null;
		return match;
	}
};
if (typeof Symbol != "undefined") SearchCursor.prototype[Symbol.iterator] = function() {
	return this;
};
const empty = {
	from: -1,
	to: -1,
	match: /*@__PURE__*/ /.*/.exec("")
};
const baseFlags = "gm" + (/x/.unicode == null ? "" : "u");
/**
This class is similar to [`SearchCursor`](https://codemirror.net/6/docs/ref/#search.SearchCursor)
but searches for a regular expression pattern instead of a plain
string.
*/
var RegExpCursor = class {
	/**
	Create a cursor that will search the given range in the given
	document. `query` should be the raw pattern (as you'd pass it to
	`new RegExp`).
	*/
	constructor(text, query, options, from = 0, to = text.length) {
		this.text = text;
		this.to = to;
		this.curLine = "";
		/**
		Set to `true` when the cursor has reached the end of the search
		range.
		*/
		this.done = false;
		/**
		Will contain an object with the extent of the match and the
		match object when [`next`](https://codemirror.net/6/docs/ref/#search.RegExpCursor.next)
		sucessfully finds a match.
		*/
		this.value = empty;
		if (/\\[sWDnr]|\n|\r|\[\^/.test(query)) return new MultilineRegExpCursor(text, query, options, from, to);
		this.re = new RegExp(query, baseFlags + ((options === null || options === void 0 ? void 0 : options.ignoreCase) ? "i" : ""));
		this.test = options === null || options === void 0 ? void 0 : options.test;
		this.iter = text.iter();
		let startLine = text.lineAt(from);
		this.curLineStart = startLine.from;
		this.matchPos = toCharEnd(text, from);
		this.getLine(this.curLineStart);
	}
	getLine(skip) {
		this.iter.next(skip);
		if (this.iter.lineBreak) this.curLine = "";
		else {
			this.curLine = this.iter.value;
			if (this.curLineStart + this.curLine.length > this.to) this.curLine = this.curLine.slice(0, this.to - this.curLineStart);
			this.iter.next();
		}
	}
	nextLine() {
		this.curLineStart = this.curLineStart + this.curLine.length + 1;
		if (this.curLineStart > this.to) this.curLine = "";
		else this.getLine(0);
	}
	/**
	Move to the next match, if there is one.
	*/
	next() {
		for (let off = this.matchPos - this.curLineStart;;) {
			this.re.lastIndex = off;
			let match = this.matchPos <= this.to && this.re.exec(this.curLine);
			if (match) {
				let from = this.curLineStart + match.index, to = from + match[0].length;
				this.matchPos = toCharEnd(this.text, to + (from == to ? 1 : 0));
				if (from == this.curLineStart + this.curLine.length) this.nextLine();
				if ((from < to || from > this.value.to) && (!this.test || this.test(from, to, match))) {
					this.value = {
						from,
						to,
						match
					};
					return this;
				}
				off = this.matchPos - this.curLineStart;
			} else if (this.curLineStart + this.curLine.length < this.to) {
				this.nextLine();
				off = 0;
			} else {
				this.done = true;
				return this;
			}
		}
	}
};
const flattened = /*@__PURE__*/ new WeakMap();
var FlattenedDoc = class FlattenedDoc {
	constructor(from, text) {
		this.from = from;
		this.text = text;
	}
	get to() {
		return this.from + this.text.length;
	}
	static get(doc, from, to) {
		let cached = flattened.get(doc);
		if (!cached || cached.from >= to || cached.to <= from) {
			let flat = new FlattenedDoc(from, doc.sliceString(from, to));
			flattened.set(doc, flat);
			return flat;
		}
		if (cached.from == from && cached.to == to) return cached;
		let { text, from: cachedFrom } = cached;
		if (cachedFrom > from) {
			text = doc.sliceString(from, cachedFrom) + text;
			cachedFrom = from;
		}
		if (cached.to < to) text += doc.sliceString(cached.to, to);
		flattened.set(doc, new FlattenedDoc(cachedFrom, text));
		return new FlattenedDoc(from, text.slice(from - cachedFrom, to - cachedFrom));
	}
};
var MultilineRegExpCursor = class {
	constructor(text, query, options, from, to) {
		this.text = text;
		this.to = to;
		this.done = false;
		this.value = empty;
		this.matchPos = toCharEnd(text, from);
		this.re = new RegExp(query, baseFlags + ((options === null || options === void 0 ? void 0 : options.ignoreCase) ? "i" : ""));
		this.test = options === null || options === void 0 ? void 0 : options.test;
		this.flat = FlattenedDoc.get(text, from, this.chunkEnd(from + 5e3));
	}
	chunkEnd(pos) {
		return pos >= this.to ? this.to : this.text.lineAt(pos).to;
	}
	next() {
		for (;;) {
			let off = this.re.lastIndex = this.matchPos - this.flat.from;
			let match = this.re.exec(this.flat.text);
			if (match && !match[0] && match.index == off) {
				this.re.lastIndex = off + 1;
				match = this.re.exec(this.flat.text);
			}
			if (match) {
				let from = this.flat.from + match.index, to = from + match[0].length;
				if ((this.flat.to >= this.to || match.index + match[0].length <= this.flat.text.length - 10) && (!this.test || this.test(from, to, match))) {
					this.value = {
						from,
						to,
						match
					};
					this.matchPos = toCharEnd(this.text, to + (from == to ? 1 : 0));
					return this;
				}
			}
			if (this.flat.to == this.to) {
				this.done = true;
				return this;
			}
			this.flat = FlattenedDoc.get(this.text, this.flat.from, this.chunkEnd(this.flat.from + this.flat.text.length * 2));
		}
	}
};
if (typeof Symbol != "undefined") RegExpCursor.prototype[Symbol.iterator] = MultilineRegExpCursor.prototype[Symbol.iterator] = function() {
	return this;
};
function validRegExp(source) {
	try {
		new RegExp(source, baseFlags);
		return true;
	} catch (_a) {
		return false;
	}
}
function toCharEnd(text, pos) {
	if (pos >= text.length) return pos;
	let line = text.lineAt(pos), next;
	while (pos < line.to && (next = line.text.charCodeAt(pos - line.from)) >= 56320 && next < 57344) pos++;
	return pos;
}
function createLineDialog(view) {
	let input = crelt("input", {
		class: "cm-textfield",
		name: "line",
		value: String(view.state.doc.lineAt(view.state.selection.main.head).number)
	});
	let dom = crelt("form", {
		class: "cm-gotoLine",
		onkeydown: (event) => {
			if (event.keyCode == 27) {
				event.preventDefault();
				view.dispatch({ effects: dialogEffect.of(false) });
				view.focus();
			} else if (event.keyCode == 13) {
				event.preventDefault();
				go();
			}
		},
		onsubmit: (event) => {
			event.preventDefault();
			go();
		}
	}, crelt("label", view.state.phrase("Go to line"), ": ", input), " ", crelt("button", {
		class: "cm-button",
		type: "submit"
	}, view.state.phrase("go")), crelt("button", {
		name: "close",
		onclick: () => {
			view.dispatch({ effects: dialogEffect.of(false) });
			view.focus();
		},
		"aria-label": view.state.phrase("close"),
		type: "button"
	}, ["×"]));
	function go() {
		let match = /^([+-])?(\d+)?(:\d+)?(%)?$/.exec(input.value);
		if (!match) return;
		let { state } = view, startLine = state.doc.lineAt(state.selection.main.head);
		let [, sign, ln, cl, percent] = match;
		let col = cl ? +cl.slice(1) : 0;
		let line = ln ? +ln : startLine.number;
		if (ln && percent) {
			let pc = line / 100;
			if (sign) pc = pc * (sign == "-" ? -1 : 1) + startLine.number / state.doc.lines;
			line = Math.round(state.doc.lines * pc);
		} else if (ln && sign) line = line * (sign == "-" ? -1 : 1) + startLine.number;
		let docLine = state.doc.line(Math.max(1, Math.min(state.doc.lines, line)));
		let selection = EditorSelection.cursor(docLine.from + Math.max(0, Math.min(col, docLine.length)));
		view.dispatch({
			effects: [dialogEffect.of(false), EditorView.scrollIntoView(selection.from, { y: "center" })],
			selection
		});
		view.focus();
	}
	return { dom };
}
const dialogEffect = /*@__PURE__*/ StateEffect.define();
const dialogField = /*@__PURE__*/ StateField.define({
	create() {
		return true;
	},
	update(value, tr) {
		for (let e of tr.effects) if (e.is(dialogEffect)) value = e.value;
		return value;
	},
	provide: (f) => showPanel.from(f, (val) => val ? createLineDialog : null)
});
/**
Command that shows a dialog asking the user for a line number, and
when a valid position is provided, moves the cursor to that line.

Supports line numbers, relative line offsets prefixed with `+` or
`-`, document percentages suffixed with `%`, and an optional
column position by adding `:` and a second number after the line
number.
*/
const gotoLine = (view) => {
	let panel = getPanel(view, createLineDialog);
	if (!panel) {
		let effects = [dialogEffect.of(true)];
		if (view.state.field(dialogField, false) == null) effects.push(StateEffect.appendConfig.of([dialogField, baseTheme$1$1]));
		view.dispatch({ effects });
		panel = getPanel(view, createLineDialog);
	}
	if (panel) panel.dom.querySelector("input").select();
	return true;
};
const baseTheme$1$1 = /*@__PURE__*/ EditorView.baseTheme({ ".cm-panel.cm-gotoLine": {
	padding: "2px 6px 4px",
	position: "relative",
	"& label": { fontSize: "80%" },
	"& [name=close]": {
		position: "absolute",
		top: "0",
		bottom: "0",
		right: "4px",
		backgroundColor: "inherit",
		border: "none",
		font: "inherit",
		padding: "0"
	}
} });
const defaultHighlightOptions = {
	highlightWordAroundCursor: false,
	minSelectionLength: 1,
	maxMatches: 100,
	wholeWords: false
};
const highlightConfig = /*@__PURE__*/ Facet.define({ combine(options) {
	return combineConfig(options, defaultHighlightOptions, {
		highlightWordAroundCursor: (a, b) => a || b,
		minSelectionLength: Math.min,
		maxMatches: Math.min
	});
} });
/**
This extension highlights text that matches the selection. It uses
the `"cm-selectionMatch"` class for the highlighting. When
`highlightWordAroundCursor` is enabled, the word at the cursor
itself will be highlighted with `"cm-selectionMatch-main"`.
*/
function highlightSelectionMatches(options) {
	let ext = [defaultTheme, matchHighlighter];
	if (options) ext.push(highlightConfig.of(options));
	return ext;
}
const matchDeco = /*@__PURE__*/ Decoration.mark({ class: "cm-selectionMatch" });
const mainMatchDeco = /*@__PURE__*/ Decoration.mark({ class: "cm-selectionMatch cm-selectionMatch-main" });
function insideWordBoundaries(check, state, from, to) {
	return (from == 0 || check(state.sliceDoc(from - 1, from)) != CharCategory.Word) && (to == state.doc.length || check(state.sliceDoc(to, to + 1)) != CharCategory.Word);
}
function insideWord(check, state, from, to) {
	return check(state.sliceDoc(from, from + 1)) == CharCategory.Word && check(state.sliceDoc(to - 1, to)) == CharCategory.Word;
}
const matchHighlighter = /*@__PURE__*/ ViewPlugin.fromClass(class {
	constructor(view) {
		this.decorations = this.getDeco(view);
	}
	update(update) {
		if (update.selectionSet || update.docChanged || update.viewportChanged) this.decorations = this.getDeco(update.view);
	}
	getDeco(view) {
		let conf = view.state.facet(highlightConfig);
		let { state } = view, sel = state.selection;
		if (sel.ranges.length > 1) return Decoration.none;
		let range = sel.main, query, check = null;
		if (range.empty) {
			if (!conf.highlightWordAroundCursor) return Decoration.none;
			let word = state.wordAt(range.head);
			if (!word) return Decoration.none;
			check = state.charCategorizer(range.head);
			query = state.sliceDoc(word.from, word.to);
		} else {
			let len = range.to - range.from;
			if (len < conf.minSelectionLength || len > 200) return Decoration.none;
			if (conf.wholeWords) {
				query = state.sliceDoc(range.from, range.to);
				check = state.charCategorizer(range.head);
				if (!(insideWordBoundaries(check, state, range.from, range.to) && insideWord(check, state, range.from, range.to))) return Decoration.none;
			} else {
				query = state.sliceDoc(range.from, range.to);
				if (!query) return Decoration.none;
			}
		}
		let deco = [];
		for (let part of view.visibleRanges) {
			let cursor = new SearchCursor(state.doc, query, part.from, part.to);
			while (!cursor.next().done) {
				let { from, to } = cursor.value;
				if (!check || insideWordBoundaries(check, state, from, to)) {
					if (range.empty && from <= range.from && to >= range.to) deco.push(mainMatchDeco.range(from, to));
					else if (from >= range.to || to <= range.from) deco.push(matchDeco.range(from, to));
					if (deco.length > conf.maxMatches) return Decoration.none;
				}
			}
		}
		return Decoration.set(deco);
	}
}, { decorations: (v) => v.decorations });
const defaultTheme = /*@__PURE__*/ EditorView.baseTheme({
	".cm-selectionMatch": { backgroundColor: "#99ff7780" },
	".cm-searchMatch .cm-selectionMatch": { backgroundColor: "transparent" }
});
const selectWord = ({ state, dispatch }) => {
	let { selection } = state;
	let newSel = EditorSelection.create(selection.ranges.map((range) => state.wordAt(range.head) || EditorSelection.cursor(range.head)), selection.mainIndex);
	if (newSel.eq(selection)) return false;
	dispatch(state.update({ selection: newSel }));
	return true;
};
function findNextOccurrence(state, query) {
	let { main, ranges } = state.selection;
	let word = state.wordAt(main.head), fullWord = word && word.from == main.from && word.to == main.to;
	for (let cycled = false, cursor = new SearchCursor(state.doc, query, ranges[ranges.length - 1].to);;) {
		cursor.next();
		if (cursor.done) {
			if (cycled) return null;
			cursor = new SearchCursor(state.doc, query, 0, Math.max(0, ranges[ranges.length - 1].from - 1));
			cycled = true;
		} else {
			if (cycled && ranges.some((r) => r.from == cursor.value.from)) continue;
			if (fullWord) {
				let word = state.wordAt(cursor.value.from);
				if (!word || word.from != cursor.value.from || word.to != cursor.value.to) continue;
			}
			return cursor.value;
		}
	}
}
/**
Select next occurrence of the current selection. Expand selection
to the surrounding word when the selection is empty.
*/
const selectNextOccurrence = ({ state, dispatch }) => {
	let { ranges } = state.selection;
	if (ranges.some((sel) => sel.from === sel.to)) return selectWord({
		state,
		dispatch
	});
	let searchedText = state.sliceDoc(ranges[0].from, ranges[0].to);
	if (state.selection.ranges.some((r) => state.sliceDoc(r.from, r.to) != searchedText)) return false;
	let range = findNextOccurrence(state, searchedText);
	if (!range) return false;
	dispatch(state.update({
		selection: state.selection.addRange(EditorSelection.range(range.from, range.to), false),
		effects: EditorView.scrollIntoView(range.to)
	}));
	return true;
};
const searchConfigFacet = /*@__PURE__*/ Facet.define({ combine(configs) {
	return combineConfig(configs, {
		top: false,
		caseSensitive: false,
		literal: false,
		regexp: false,
		wholeWord: false,
		createPanel: (view) => new SearchPanel(view),
		scrollToMatch: (range) => EditorView.scrollIntoView(range)
	});
} });
/**
A search query. Part of the editor's search state.
*/
var SearchQuery = class {
	/**
	Create a query object.
	*/
	constructor(config) {
		this.search = config.search;
		this.caseSensitive = !!config.caseSensitive;
		this.literal = !!config.literal;
		this.regexp = !!config.regexp;
		this.replace = config.replace || "";
		this.valid = !!this.search && (!this.regexp || validRegExp(this.search));
		this.unquoted = this.unquote(this.search);
		this.wholeWord = !!config.wholeWord;
	}
	/**
	@internal
	*/
	unquote(text) {
		return this.literal ? text : text.replace(/\\([nrt\\])/g, (_, ch) => ch == "n" ? "\n" : ch == "r" ? "\r" : ch == "t" ? "	" : "\\");
	}
	/**
	Compare this query to another query.
	*/
	eq(other) {
		return this.search == other.search && this.replace == other.replace && this.caseSensitive == other.caseSensitive && this.regexp == other.regexp && this.wholeWord == other.wholeWord;
	}
	/**
	@internal
	*/
	create() {
		return this.regexp ? new RegExpQuery(this) : new StringQuery(this);
	}
	/**
	Get a search cursor for this query, searching through the given
	range in the given state.
	*/
	getCursor(state, from = 0, to) {
		let st = state.doc ? state : EditorState.create({ doc: state });
		if (to == null) to = st.doc.length;
		return this.regexp ? regexpCursor(this, st, from, to) : stringCursor(this, st, from, to);
	}
};
var QueryType = class {
	constructor(spec) {
		this.spec = spec;
	}
};
function stringCursor(spec, state, from, to) {
	return new SearchCursor(state.doc, spec.unquoted, from, to, spec.caseSensitive ? void 0 : (x) => x.toLowerCase(), spec.wholeWord ? stringWordTest(state.doc, state.charCategorizer(state.selection.main.head)) : void 0);
}
function stringWordTest(doc, categorizer) {
	return (from, to, buf, bufPos) => {
		if (bufPos > from || bufPos + buf.length < to) {
			bufPos = Math.max(0, from - 2);
			buf = doc.sliceString(bufPos, Math.min(doc.length, to + 2));
		}
		return (categorizer(charBefore(buf, from - bufPos)) != CharCategory.Word || categorizer(charAfter(buf, from - bufPos)) != CharCategory.Word) && (categorizer(charAfter(buf, to - bufPos)) != CharCategory.Word || categorizer(charBefore(buf, to - bufPos)) != CharCategory.Word);
	};
}
var StringQuery = class extends QueryType {
	constructor(spec) {
		super(spec);
	}
	nextMatch(state, curFrom, curTo) {
		let cursor = stringCursor(this.spec, state, curTo, state.doc.length).nextOverlapping();
		if (cursor.done) {
			let end = Math.min(state.doc.length, curFrom + this.spec.unquoted.length);
			cursor = stringCursor(this.spec, state, 0, end).nextOverlapping();
		}
		return cursor.done || cursor.value.from == curFrom && cursor.value.to == curTo ? null : cursor.value;
	}
	prevMatchInRange(state, from, to) {
		for (let pos = to;;) {
			let start = Math.max(from, pos - 1e4 - this.spec.unquoted.length);
			let cursor = stringCursor(this.spec, state, start, pos), range = null;
			while (!cursor.nextOverlapping().done) range = cursor.value;
			if (range) return range;
			if (start == from) return null;
			pos -= 1e4;
		}
	}
	prevMatch(state, curFrom, curTo) {
		let found = this.prevMatchInRange(state, 0, curFrom);
		if (!found) found = this.prevMatchInRange(state, Math.max(0, curTo - this.spec.unquoted.length), state.doc.length);
		return found && (found.from != curFrom || found.to != curTo) ? found : null;
	}
	getReplacement(_result) {
		return this.spec.unquote(this.spec.replace);
	}
	matchAll(state, limit) {
		let cursor = stringCursor(this.spec, state, 0, state.doc.length), ranges = [];
		while (!cursor.next().done) {
			if (ranges.length >= limit) return null;
			ranges.push(cursor.value);
		}
		return ranges;
	}
	highlight(state, from, to, add) {
		let cursor = stringCursor(this.spec, state, Math.max(0, from - this.spec.unquoted.length), Math.min(to + this.spec.unquoted.length, state.doc.length));
		while (!cursor.next().done) add(cursor.value.from, cursor.value.to);
	}
};
function regexpCursor(spec, state, from, to) {
	return new RegExpCursor(state.doc, spec.search, {
		ignoreCase: !spec.caseSensitive,
		test: spec.wholeWord ? regexpWordTest(state.charCategorizer(state.selection.main.head)) : void 0
	}, from, to);
}
function charBefore(str, index) {
	return str.slice(findClusterBreak(str, index, false), index);
}
function charAfter(str, index) {
	return str.slice(index, findClusterBreak(str, index));
}
function regexpWordTest(categorizer) {
	return (_from, _to, match) => !match[0].length || (categorizer(charBefore(match.input, match.index)) != CharCategory.Word || categorizer(charAfter(match.input, match.index)) != CharCategory.Word) && (categorizer(charAfter(match.input, match.index + match[0].length)) != CharCategory.Word || categorizer(charBefore(match.input, match.index + match[0].length)) != CharCategory.Word);
}
var RegExpQuery = class extends QueryType {
	nextMatch(state, curFrom, curTo) {
		let cursor = regexpCursor(this.spec, state, curTo, state.doc.length).next();
		if (cursor.done) cursor = regexpCursor(this.spec, state, 0, curFrom).next();
		return cursor.done ? null : cursor.value;
	}
	prevMatchInRange(state, from, to) {
		for (let size = 1;; size++) {
			let start = Math.max(from, to - size * 1e4);
			let cursor = regexpCursor(this.spec, state, start, to), range = null;
			while (!cursor.next().done) range = cursor.value;
			if (range && (start == from || range.from > start + 10)) return range;
			if (start == from) return null;
		}
	}
	prevMatch(state, curFrom, curTo) {
		return this.prevMatchInRange(state, 0, curFrom) || this.prevMatchInRange(state, curTo, state.doc.length);
	}
	getReplacement(result) {
		return this.spec.unquote(this.spec.replace).replace(/\$([$&]|\d+)/g, (m, i) => {
			if (i == "&") return result.match[0];
			if (i == "$") return "$";
			for (let l = i.length; l > 0; l--) {
				let n = +i.slice(0, l);
				if (n > 0 && n < result.match.length) return result.match[n] + i.slice(l);
			}
			return m;
		});
	}
	matchAll(state, limit) {
		let cursor = regexpCursor(this.spec, state, 0, state.doc.length), ranges = [];
		while (!cursor.next().done) {
			if (ranges.length >= limit) return null;
			ranges.push(cursor.value);
		}
		return ranges;
	}
	highlight(state, from, to, add) {
		let cursor = regexpCursor(this.spec, state, Math.max(0, from - 250), Math.min(to + 250, state.doc.length));
		while (!cursor.next().done) add(cursor.value.from, cursor.value.to);
	}
};
/**
A state effect that updates the current search query. Note that
this only has an effect if the search state has been initialized
(by including [`search`](https://codemirror.net/6/docs/ref/#search.search) in your configuration or
by running [`openSearchPanel`](https://codemirror.net/6/docs/ref/#search.openSearchPanel) at least
once).
*/
const setSearchQuery = /*@__PURE__*/ StateEffect.define();
const togglePanel$1 = /*@__PURE__*/ StateEffect.define();
const searchState = /*@__PURE__*/ StateField.define({
	create(state) {
		return new SearchState(defaultQuery(state).create(), null);
	},
	update(value, tr) {
		for (let effect of tr.effects) if (effect.is(setSearchQuery)) value = new SearchState(effect.value.create(), value.panel);
		else if (effect.is(togglePanel$1)) value = new SearchState(value.query, effect.value ? createSearchPanel : null);
		return value;
	},
	provide: (f) => showPanel.from(f, (val) => val.panel)
});
var SearchState = class {
	constructor(query, panel) {
		this.query = query;
		this.panel = panel;
	}
};
const matchMark = /*@__PURE__*/ Decoration.mark({ class: "cm-searchMatch" });
const selectedMatchMark = /*@__PURE__*/ Decoration.mark({ class: "cm-searchMatch cm-searchMatch-selected" });
const searchHighlighter = /*@__PURE__*/ ViewPlugin.fromClass(class {
	constructor(view) {
		this.view = view;
		this.decorations = this.highlight(view.state.field(searchState));
	}
	update(update) {
		let state = update.state.field(searchState);
		if (state != update.startState.field(searchState) || update.docChanged || update.selectionSet || update.viewportChanged) this.decorations = this.highlight(state);
	}
	highlight({ query, panel }) {
		if (!panel || !query.spec.valid) return Decoration.none;
		let { view } = this;
		let builder = new RangeSetBuilder();
		for (let i = 0, ranges = view.visibleRanges, l = ranges.length; i < l; i++) {
			let { from, to } = ranges[i];
			while (i < l - 1 && to > ranges[i + 1].from - 500) to = ranges[++i].to;
			query.highlight(view.state, from, to, (from, to) => {
				let selected = view.state.selection.ranges.some((r) => r.from == from && r.to == to);
				builder.add(from, to, selected ? selectedMatchMark : matchMark);
			});
		}
		return builder.finish();
	}
}, { decorations: (v) => v.decorations });
function searchCommand(f) {
	return (view) => {
		let state = view.state.field(searchState, false);
		return state && state.query.spec.valid ? f(view, state) : openSearchPanel(view);
	};
}
/**
Open the search panel if it isn't already open, and move the
selection to the first match after the current main selection.
Will wrap around to the start of the document when it reaches the
end.
*/
const findNext = /*@__PURE__*/ searchCommand((view, { query }) => {
	let { to } = view.state.selection.main;
	let next = query.nextMatch(view.state, to, to);
	if (!next) return false;
	let selection = EditorSelection.single(next.from, next.to);
	let config = view.state.facet(searchConfigFacet);
	view.dispatch({
		selection,
		effects: [announceMatch(view, next), config.scrollToMatch(selection.main, view)],
		userEvent: "select.search"
	});
	selectSearchInput(view);
	return true;
});
/**
Move the selection to the previous instance of the search query,
before the current main selection. Will wrap past the start
of the document to start searching at the end again.
*/
const findPrevious = /*@__PURE__*/ searchCommand((view, { query }) => {
	let { state } = view, { from } = state.selection.main;
	let prev = query.prevMatch(state, from, from);
	if (!prev) return false;
	let selection = EditorSelection.single(prev.from, prev.to);
	let config = view.state.facet(searchConfigFacet);
	view.dispatch({
		selection,
		effects: [announceMatch(view, prev), config.scrollToMatch(selection.main, view)],
		userEvent: "select.search"
	});
	selectSearchInput(view);
	return true;
});
/**
Select all instances of the search query.
*/
const selectMatches = /*@__PURE__*/ searchCommand((view, { query }) => {
	let ranges = query.matchAll(view.state, 1e3);
	if (!ranges || !ranges.length) return false;
	view.dispatch({
		selection: EditorSelection.create(ranges.map((r) => EditorSelection.range(r.from, r.to))),
		userEvent: "select.search.matches"
	});
	return true;
});
/**
Select all instances of the currently selected text.
*/
const selectSelectionMatches = ({ state, dispatch }) => {
	let sel = state.selection;
	if (sel.ranges.length > 1 || sel.main.empty) return false;
	let { from, to } = sel.main;
	let ranges = [], main = 0;
	for (let cur = new SearchCursor(state.doc, state.sliceDoc(from, to)); !cur.next().done;) {
		if (ranges.length > 1e3) return false;
		if (cur.value.from == from) main = ranges.length;
		ranges.push(EditorSelection.range(cur.value.from, cur.value.to));
	}
	dispatch(state.update({
		selection: EditorSelection.create(ranges, main),
		userEvent: "select.search.matches"
	}));
	return true;
};
/**
Replace the current match of the search query.
*/
const replaceNext = /*@__PURE__*/ searchCommand((view, { query }) => {
	let { state } = view, { from, to } = state.selection.main;
	if (state.readOnly) return false;
	let match = query.nextMatch(state, from, from);
	if (!match) return false;
	let next = match;
	let changes = [], selection, replacement;
	let effects = [];
	if (next.from == from && next.to == to) {
		replacement = state.toText(query.getReplacement(next));
		changes.push({
			from: next.from,
			to: next.to,
			insert: replacement
		});
		next = query.nextMatch(state, next.from, next.to);
		effects.push(EditorView.announce.of(state.phrase("replaced match on line $", state.doc.lineAt(from).number) + "."));
	}
	let changeSet = view.state.changes(changes);
	if (next) {
		selection = EditorSelection.single(next.from, next.to).map(changeSet);
		effects.push(announceMatch(view, next));
		effects.push(state.facet(searchConfigFacet).scrollToMatch(selection.main, view));
	}
	view.dispatch({
		changes: changeSet,
		selection,
		effects,
		userEvent: "input.replace"
	});
	return true;
});
/**
Replace all instances of the search query with the given
replacement.
*/
const replaceAll = /*@__PURE__*/ searchCommand((view, { query }) => {
	if (view.state.readOnly) return false;
	let changes = query.matchAll(view.state, 1e9).map((match) => {
		let { from, to } = match;
		return {
			from,
			to,
			insert: query.getReplacement(match)
		};
	});
	if (!changes.length) return false;
	let announceText = view.state.phrase("replaced $ matches", changes.length) + ".";
	view.dispatch({
		changes,
		effects: EditorView.announce.of(announceText),
		userEvent: "input.replace.all"
	});
	return true;
});
function createSearchPanel(view) {
	return view.state.facet(searchConfigFacet).createPanel(view);
}
function defaultQuery(state, fallback) {
	var _a, _b, _c, _d, _e;
	let sel = state.selection.main;
	let selText = sel.empty || sel.to > sel.from + 100 ? "" : state.sliceDoc(sel.from, sel.to);
	if (fallback && !selText) return fallback;
	let config = state.facet(searchConfigFacet);
	return new SearchQuery({
		search: ((_a = fallback === null || fallback === void 0 ? void 0 : fallback.literal) !== null && _a !== void 0 ? _a : config.literal) ? selText : selText.replace(/\n/g, "\\n"),
		caseSensitive: (_b = fallback === null || fallback === void 0 ? void 0 : fallback.caseSensitive) !== null && _b !== void 0 ? _b : config.caseSensitive,
		literal: (_c = fallback === null || fallback === void 0 ? void 0 : fallback.literal) !== null && _c !== void 0 ? _c : config.literal,
		regexp: (_d = fallback === null || fallback === void 0 ? void 0 : fallback.regexp) !== null && _d !== void 0 ? _d : config.regexp,
		wholeWord: (_e = fallback === null || fallback === void 0 ? void 0 : fallback.wholeWord) !== null && _e !== void 0 ? _e : config.wholeWord
	});
}
function getSearchInput(view) {
	let panel = getPanel(view, createSearchPanel);
	return panel && panel.dom.querySelector("[main-field]");
}
function selectSearchInput(view) {
	let input = getSearchInput(view);
	if (input && input == view.root.activeElement) input.select();
}
/**
Make sure the search panel is open and focused.
*/
const openSearchPanel = (view) => {
	let state = view.state.field(searchState, false);
	if (state && state.panel) {
		let searchInput = getSearchInput(view);
		if (searchInput && searchInput != view.root.activeElement) {
			let query = defaultQuery(view.state, state.query.spec);
			if (query.valid) view.dispatch({ effects: setSearchQuery.of(query) });
			searchInput.focus();
			searchInput.select();
		}
	} else view.dispatch({ effects: [togglePanel$1.of(true), state ? setSearchQuery.of(defaultQuery(view.state, state.query.spec)) : StateEffect.appendConfig.of(searchExtensions)] });
	return true;
};
/**
Close the search panel.
*/
const closeSearchPanel = (view) => {
	let state = view.state.field(searchState, false);
	if (!state || !state.panel) return false;
	let panel = getPanel(view, createSearchPanel);
	if (panel && panel.dom.contains(view.root.activeElement)) view.focus();
	view.dispatch({ effects: togglePanel$1.of(false) });
	return true;
};
/**
Default search-related key bindings.

- Mod-f: [`openSearchPanel`](https://codemirror.net/6/docs/ref/#search.openSearchPanel)
- F3, Mod-g: [`findNext`](https://codemirror.net/6/docs/ref/#search.findNext)
- Shift-F3, Shift-Mod-g: [`findPrevious`](https://codemirror.net/6/docs/ref/#search.findPrevious)
- Mod-Alt-g: [`gotoLine`](https://codemirror.net/6/docs/ref/#search.gotoLine)
- Mod-d: [`selectNextOccurrence`](https://codemirror.net/6/docs/ref/#search.selectNextOccurrence)
*/
const searchKeymap = [
	{
		key: "Mod-f",
		run: openSearchPanel,
		scope: "editor search-panel"
	},
	{
		key: "F3",
		run: findNext,
		shift: findPrevious,
		scope: "editor search-panel",
		preventDefault: true
	},
	{
		key: "Mod-g",
		run: findNext,
		shift: findPrevious,
		scope: "editor search-panel",
		preventDefault: true
	},
	{
		key: "Escape",
		run: closeSearchPanel,
		scope: "editor search-panel"
	},
	{
		key: "Mod-Shift-l",
		run: selectSelectionMatches
	},
	{
		key: "Mod-Alt-g",
		run: gotoLine
	},
	{
		key: "Mod-d",
		run: selectNextOccurrence,
		preventDefault: true
	}
];
var SearchPanel = class {
	constructor(view) {
		this.view = view;
		let query = this.query = view.state.field(searchState).query.spec;
		this.commit = this.commit.bind(this);
		this.searchField = crelt("input", {
			value: query.search,
			placeholder: phrase(view, "Find"),
			"aria-label": phrase(view, "Find"),
			class: "cm-textfield",
			name: "search",
			form: "",
			"main-field": "true",
			onchange: this.commit,
			onkeyup: this.commit
		});
		this.replaceField = crelt("input", {
			value: query.replace,
			placeholder: phrase(view, "Replace"),
			"aria-label": phrase(view, "Replace"),
			class: "cm-textfield",
			name: "replace",
			form: "",
			onchange: this.commit,
			onkeyup: this.commit
		});
		this.caseField = crelt("input", {
			type: "checkbox",
			name: "case",
			form: "",
			checked: query.caseSensitive,
			onchange: this.commit
		});
		this.reField = crelt("input", {
			type: "checkbox",
			name: "re",
			form: "",
			checked: query.regexp,
			onchange: this.commit
		});
		this.wordField = crelt("input", {
			type: "checkbox",
			name: "word",
			form: "",
			checked: query.wholeWord,
			onchange: this.commit
		});
		function button(name, onclick, content) {
			return crelt("button", {
				class: "cm-button",
				name,
				onclick,
				type: "button"
			}, content);
		}
		this.dom = crelt("div", {
			onkeydown: (e) => this.keydown(e),
			class: "cm-search"
		}, [
			this.searchField,
			button("next", () => findNext(view), [phrase(view, "next")]),
			button("prev", () => findPrevious(view), [phrase(view, "previous")]),
			button("select", () => selectMatches(view), [phrase(view, "all")]),
			crelt("label", null, [this.caseField, phrase(view, "match case")]),
			crelt("label", null, [this.reField, phrase(view, "regexp")]),
			crelt("label", null, [this.wordField, phrase(view, "by word")]),
			...view.state.readOnly ? [] : [
				crelt("br"),
				this.replaceField,
				button("replace", () => replaceNext(view), [phrase(view, "replace")]),
				button("replaceAll", () => replaceAll(view), [phrase(view, "replace all")])
			],
			crelt("button", {
				name: "close",
				onclick: () => closeSearchPanel(view),
				"aria-label": phrase(view, "close"),
				type: "button"
			}, ["×"])
		]);
	}
	commit() {
		let query = new SearchQuery({
			search: this.searchField.value,
			caseSensitive: this.caseField.checked,
			regexp: this.reField.checked,
			wholeWord: this.wordField.checked,
			replace: this.replaceField.value
		});
		if (!query.eq(this.query)) {
			this.query = query;
			this.view.dispatch({ effects: setSearchQuery.of(query) });
		}
	}
	keydown(e) {
		if (runScopeHandlers(this.view, e, "search-panel")) e.preventDefault();
		else if (e.keyCode == 13 && e.target == this.searchField) {
			e.preventDefault();
			(e.shiftKey ? findPrevious : findNext)(this.view);
		} else if (e.keyCode == 13 && e.target == this.replaceField) {
			e.preventDefault();
			replaceNext(this.view);
		}
	}
	update(update) {
		for (let tr of update.transactions) for (let effect of tr.effects) if (effect.is(setSearchQuery) && !effect.value.eq(this.query)) this.setQuery(effect.value);
	}
	setQuery(query) {
		this.query = query;
		this.searchField.value = query.search;
		this.replaceField.value = query.replace;
		this.caseField.checked = query.caseSensitive;
		this.reField.checked = query.regexp;
		this.wordField.checked = query.wholeWord;
	}
	mount() {
		this.searchField.select();
	}
	get pos() {
		return 80;
	}
	get top() {
		return this.view.state.facet(searchConfigFacet).top;
	}
};
function phrase(view, phrase) {
	return view.state.phrase(phrase);
}
const AnnounceMargin = 30;
const Break = /[\s\.,:;?!]/;
function announceMatch(view, { from, to }) {
	let line = view.state.doc.lineAt(from), lineEnd = view.state.doc.lineAt(to).to;
	let start = Math.max(line.from, from - AnnounceMargin), end = Math.min(lineEnd, to + AnnounceMargin);
	let text = view.state.sliceDoc(start, end);
	if (start != line.from) {
		for (let i = 0; i < AnnounceMargin; i++) if (!Break.test(text[i + 1]) && Break.test(text[i])) {
			text = text.slice(i);
			break;
		}
	}
	if (end != lineEnd) {
		for (let i = text.length - 1; i > text.length - AnnounceMargin; i--) if (!Break.test(text[i - 1]) && Break.test(text[i])) {
			text = text.slice(0, i);
			break;
		}
	}
	return EditorView.announce.of(`${view.state.phrase("current match")}. ${text} ${view.state.phrase("on line")} ${line.number}.`);
}
const baseTheme$2 = /*@__PURE__*/ EditorView.baseTheme({
	".cm-panel.cm-search": {
		padding: "2px 6px 4px",
		position: "relative",
		"& [name=close]": {
			position: "absolute",
			top: "0",
			right: "4px",
			backgroundColor: "inherit",
			border: "none",
			font: "inherit",
			padding: 0,
			margin: 0
		},
		"& input, & button, & label": { margin: ".2em .6em .2em 0" },
		"& input[type=checkbox]": { marginRight: ".2em" },
		"& label": {
			fontSize: "80%",
			whiteSpace: "pre"
		}
	},
	"&light .cm-searchMatch": { backgroundColor: "#ffff0054" },
	"&dark .cm-searchMatch": { backgroundColor: "#00ffff8a" },
	"&light .cm-searchMatch-selected": { backgroundColor: "#ff6a0054" },
	"&dark .cm-searchMatch-selected": { backgroundColor: "#ff00ff8a" }
});
const searchExtensions = [
	searchState,
	/*@__PURE__*/ Prec.low(searchHighlighter),
	baseTheme$2
];
//#endregion
//#region ../../node_modules/.pnpm/@codemirror+autocomplete@6.20.1/node_modules/@codemirror/autocomplete/dist/index.js
/**
An instance of this is passed to completion source functions.
*/
var CompletionContext = class {
	/**
	Create a new completion context. (Mostly useful for testing
	completion sources—in the editor, the extension will create
	these for you.)
	*/
	constructor(state, pos, explicit, view) {
		this.state = state;
		this.pos = pos;
		this.explicit = explicit;
		this.view = view;
		/**
		@internal
		*/
		this.abortListeners = [];
		/**
		@internal
		*/
		this.abortOnDocChange = false;
	}
	/**
	Get the extent, content, and (if there is a token) type of the
	token before `this.pos`.
	*/
	tokenBefore(types) {
		let token = syntaxTree(this.state).resolveInner(this.pos, -1);
		while (token && types.indexOf(token.name) < 0) token = token.parent;
		return token ? {
			from: token.from,
			to: this.pos,
			text: this.state.sliceDoc(token.from, this.pos),
			type: token.type
		} : null;
	}
	/**
	Get the match of the given expression directly before the
	cursor.
	*/
	matchBefore(expr) {
		let line = this.state.doc.lineAt(this.pos);
		let start = Math.max(line.from, this.pos - 250);
		let str = line.text.slice(start - line.from, this.pos - line.from);
		let found = str.search(ensureAnchor(expr, false));
		return found < 0 ? null : {
			from: start + found,
			to: this.pos,
			text: str.slice(found)
		};
	}
	/**
	Yields true when the query has been aborted. Can be useful in
	asynchronous queries to avoid doing work that will be ignored.
	*/
	get aborted() {
		return this.abortListeners == null;
	}
	/**
	Allows you to register abort handlers, which will be called when
	the query is
	[aborted](https://codemirror.net/6/docs/ref/#autocomplete.CompletionContext.aborted).
	
	By default, running queries will not be aborted for regular
	typing or backspacing, on the assumption that they are likely to
	return a result with a
	[`validFor`](https://codemirror.net/6/docs/ref/#autocomplete.CompletionResult.validFor) field that
	allows the result to be used after all. Passing `onDocChange:
	true` will cause this query to be aborted for any document
	change.
	*/
	addEventListener(type, listener, options) {
		if (type == "abort" && this.abortListeners) {
			this.abortListeners.push(listener);
			if (options && options.onDocChange) this.abortOnDocChange = true;
		}
	}
};
function toSet(chars) {
	let flat = Object.keys(chars).join("");
	let words = /\w/.test(flat);
	if (words) flat = flat.replace(/\w/g, "");
	return `[${words ? "\\w" : ""}${flat.replace(/[^\w\s]/g, "\\$&")}]`;
}
function prefixMatch(options) {
	let first = Object.create(null), rest = Object.create(null);
	for (let { label } of options) {
		first[label[0]] = true;
		for (let i = 1; i < label.length; i++) rest[label[i]] = true;
	}
	let source = toSet(first) + toSet(rest) + "*$";
	return [new RegExp("^" + source), new RegExp(source)];
}
/**
Given a a fixed array of options, return an autocompleter that
completes them.
*/
function completeFromList(list) {
	let options = list.map((o) => typeof o == "string" ? { label: o } : o);
	let [validFor, match] = options.every((o) => /^\w+$/.test(o.label)) ? [/\w*$/, /\w+$/] : prefixMatch(options);
	return (context) => {
		let token = context.matchBefore(match);
		return token || context.explicit ? {
			from: token ? token.from : context.pos,
			options,
			validFor
		} : null;
	};
}
var Option = class {
	constructor(completion, source, match, score) {
		this.completion = completion;
		this.source = source;
		this.match = match;
		this.score = score;
	}
};
function cur(state) {
	return state.selection.main.from;
}
function ensureAnchor(expr, start) {
	var _a;
	let { source } = expr;
	let addStart = start && source[0] != "^", addEnd = source[source.length - 1] != "$";
	if (!addStart && !addEnd) return expr;
	return new RegExp(`${addStart ? "^" : ""}(?:${source})${addEnd ? "$" : ""}`, (_a = expr.flags) !== null && _a !== void 0 ? _a : expr.ignoreCase ? "i" : "");
}
/**
This annotation is added to transactions that are produced by
picking a completion.
*/
const pickedCompletion = /*@__PURE__*/ Annotation.define();
/**
Helper function that returns a transaction spec which inserts a
completion's text in the main selection range, and any other
selection range that has the same text in front of it.
*/
function insertCompletionText(state, text, from, to) {
	let { main } = state.selection, fromOff = from - main.from, toOff = to - main.from;
	return {
		...state.changeByRange((range) => {
			if (range != main && from != to && state.sliceDoc(range.from + fromOff, range.from + toOff) != state.sliceDoc(from, to)) return { range };
			let lines = state.toText(text);
			return {
				changes: {
					from: range.from + fromOff,
					to: to == main.from ? range.to : range.from + toOff,
					insert: lines
				},
				range: EditorSelection.cursor(range.from + fromOff + lines.length)
			};
		}),
		scrollIntoView: true,
		userEvent: "input.complete"
	};
}
const SourceCache = /*@__PURE__*/ new WeakMap();
function asSource(source) {
	if (!Array.isArray(source)) return source;
	let known = SourceCache.get(source);
	if (!known) SourceCache.set(source, known = completeFromList(source));
	return known;
}
const startCompletionEffect = /*@__PURE__*/ StateEffect.define();
const closeCompletionEffect = /*@__PURE__*/ StateEffect.define();
var FuzzyMatcher = class {
	constructor(pattern) {
		this.pattern = pattern;
		this.chars = [];
		this.folded = [];
		this.any = [];
		this.precise = [];
		this.byWord = [];
		this.score = 0;
		this.matched = [];
		for (let p = 0; p < pattern.length;) {
			let char = codePointAt(pattern, p), size = codePointSize(char);
			this.chars.push(char);
			let part = pattern.slice(p, p + size), upper = part.toUpperCase();
			this.folded.push(codePointAt(upper == part ? part.toLowerCase() : upper, 0));
			p += size;
		}
		this.astral = pattern.length != this.chars.length;
	}
	ret(score, matched) {
		this.score = score;
		this.matched = matched;
		return this;
	}
	match(word) {
		if (this.pattern.length == 0) return this.ret(-100, []);
		if (word.length < this.pattern.length) return null;
		let { chars, folded, any, precise, byWord } = this;
		if (chars.length == 1) {
			let first = codePointAt(word, 0), firstSize = codePointSize(first);
			let score = firstSize == word.length ? 0 : -100;
			if (first == chars[0]);
			else if (first == folded[0]) score += -200;
			else return null;
			return this.ret(score, [0, firstSize]);
		}
		let direct = word.indexOf(this.pattern);
		if (direct == 0) return this.ret(word.length == this.pattern.length ? 0 : -100, [0, this.pattern.length]);
		let len = chars.length, anyTo = 0;
		if (direct < 0) {
			for (let i = 0, e = Math.min(word.length, 200); i < e && anyTo < len;) {
				let next = codePointAt(word, i);
				if (next == chars[anyTo] || next == folded[anyTo]) any[anyTo++] = i;
				i += codePointSize(next);
			}
			if (anyTo < len) return null;
		}
		let preciseTo = 0;
		let byWordTo = 0, byWordFolded = false;
		let adjacentTo = 0, adjacentStart = -1, adjacentEnd = -1;
		let hasLower = /[a-z]/.test(word), wordAdjacent = true;
		for (let i = 0, e = Math.min(word.length, 200), prevType = 0; i < e && byWordTo < len;) {
			let next = codePointAt(word, i);
			if (direct < 0) {
				if (preciseTo < len && next == chars[preciseTo]) precise[preciseTo++] = i;
				if (adjacentTo < len) {
					if (next == chars[adjacentTo] || next == folded[adjacentTo]) {
						if (adjacentTo == 0) adjacentStart = i;
						adjacentEnd = i + 1;
						adjacentTo++;
					} else adjacentTo = 0;
				}
			}
			let ch, type = next < 255 ? next >= 48 && next <= 57 || next >= 97 && next <= 122 ? 2 : next >= 65 && next <= 90 ? 1 : 0 : (ch = fromCodePoint(next)) != ch.toLowerCase() ? 1 : ch != ch.toUpperCase() ? 2 : 0;
			if (!i || type == 1 && hasLower || prevType == 0 && type != 0) {
				if (chars[byWordTo] == next || folded[byWordTo] == next && (byWordFolded = true)) byWord[byWordTo++] = i;
				else if (byWord.length) wordAdjacent = false;
			}
			prevType = type;
			i += codePointSize(next);
		}
		if (byWordTo == len && byWord[0] == 0 && wordAdjacent) return this.result(-100 + (byWordFolded ? -200 : 0), byWord, word);
		if (adjacentTo == len && adjacentStart == 0) return this.ret(-200 - word.length + (adjacentEnd == word.length ? 0 : -100), [0, adjacentEnd]);
		if (direct > -1) return this.ret(-700 - word.length, [direct, direct + this.pattern.length]);
		if (adjacentTo == len) return this.ret(-900 - word.length, [adjacentStart, adjacentEnd]);
		if (byWordTo == len) return this.result(-100 + (byWordFolded ? -200 : 0) + -700 + (wordAdjacent ? 0 : -1100), byWord, word);
		return chars.length == 2 ? null : this.result((any[0] ? -700 : 0) + -200 + -1100, any, word);
	}
	result(score, positions, word) {
		let result = [], i = 0;
		for (let pos of positions) {
			let to = pos + (this.astral ? codePointSize(codePointAt(word, pos)) : 1);
			if (i && result[i - 1] == pos) result[i - 1] = to;
			else {
				result[i++] = pos;
				result[i++] = to;
			}
		}
		return this.ret(score - word.length, result);
	}
};
var StrictMatcher = class {
	constructor(pattern) {
		this.pattern = pattern;
		this.matched = [];
		this.score = 0;
		this.folded = pattern.toLowerCase();
	}
	match(word) {
		if (word.length < this.pattern.length) return null;
		let start = word.slice(0, this.pattern.length);
		let match = start == this.pattern ? 0 : start.toLowerCase() == this.folded ? -200 : null;
		if (match == null) return null;
		this.matched = [0, start.length];
		this.score = match + (word.length == this.pattern.length ? 0 : -100);
		return this;
	}
};
const completionConfig = /*@__PURE__*/ Facet.define({ combine(configs) {
	return combineConfig(configs, {
		activateOnTyping: true,
		activateOnCompletion: () => false,
		activateOnTypingDelay: 100,
		selectOnOpen: true,
		override: null,
		closeOnBlur: true,
		maxRenderedOptions: 100,
		defaultKeymap: true,
		tooltipClass: () => "",
		optionClass: () => "",
		aboveCursor: false,
		icons: true,
		addToOptions: [],
		positionInfo: defaultPositionInfo,
		filterStrict: false,
		compareCompletions: (a, b) => (a.sortText || a.label).localeCompare(b.sortText || b.label),
		interactionDelay: 75,
		updateSyncTime: 100
	}, {
		defaultKeymap: (a, b) => a && b,
		closeOnBlur: (a, b) => a && b,
		icons: (a, b) => a && b,
		tooltipClass: (a, b) => (c) => joinClass(a(c), b(c)),
		optionClass: (a, b) => (c) => joinClass(a(c), b(c)),
		addToOptions: (a, b) => a.concat(b),
		filterStrict: (a, b) => a || b
	});
} });
function joinClass(a, b) {
	return a ? b ? a + " " + b : a : b;
}
function defaultPositionInfo(view, list, option, info, space, tooltip) {
	let rtl = view.textDirection == Direction.RTL, left = rtl, narrow = false;
	let side = "top", offset, maxWidth;
	let spaceLeft = list.left - space.left, spaceRight = space.right - list.right;
	let infoWidth = info.right - info.left, infoHeight = info.bottom - info.top;
	if (left && spaceLeft < Math.min(infoWidth, spaceRight)) left = false;
	else if (!left && spaceRight < Math.min(infoWidth, spaceLeft)) left = true;
	if (infoWidth <= (left ? spaceLeft : spaceRight)) {
		offset = Math.max(space.top, Math.min(option.top, space.bottom - infoHeight)) - list.top;
		maxWidth = Math.min(400, left ? spaceLeft : spaceRight);
	} else {
		narrow = true;
		maxWidth = Math.min(400, (rtl ? list.right : space.right - list.left) - 30);
		let spaceBelow = space.bottom - list.bottom;
		if (spaceBelow >= infoHeight || spaceBelow > list.top) offset = option.bottom - list.top;
		else {
			side = "bottom";
			offset = list.bottom - option.top;
		}
	}
	let scaleY = (list.bottom - list.top) / tooltip.offsetHeight;
	let scaleX = (list.right - list.left) / tooltip.offsetWidth;
	return {
		style: `${side}: ${offset / scaleY}px; max-width: ${maxWidth / scaleX}px`,
		class: "cm-completionInfo-" + (narrow ? rtl ? "left-narrow" : "right-narrow" : left ? "left" : "right")
	};
}
const setSelectedEffect = /*@__PURE__*/ StateEffect.define();
function optionContent(config) {
	let content = config.addToOptions.slice();
	if (config.icons) content.push({
		render(completion) {
			let icon = document.createElement("div");
			icon.classList.add("cm-completionIcon");
			if (completion.type) icon.classList.add(...completion.type.split(/\s+/g).map((cls) => "cm-completionIcon-" + cls));
			icon.setAttribute("aria-hidden", "true");
			return icon;
		},
		position: 20
	});
	content.push({
		render(completion, _s, _v, match) {
			let labelElt = document.createElement("span");
			labelElt.className = "cm-completionLabel";
			let label = completion.displayLabel || completion.label, off = 0;
			for (let j = 0; j < match.length;) {
				let from = match[j++], to = match[j++];
				if (from > off) labelElt.appendChild(document.createTextNode(label.slice(off, from)));
				let span = labelElt.appendChild(document.createElement("span"));
				span.appendChild(document.createTextNode(label.slice(from, to)));
				span.className = "cm-completionMatchedText";
				off = to;
			}
			if (off < label.length) labelElt.appendChild(document.createTextNode(label.slice(off)));
			return labelElt;
		},
		position: 50
	}, {
		render(completion) {
			if (!completion.detail) return null;
			let detailElt = document.createElement("span");
			detailElt.className = "cm-completionDetail";
			detailElt.textContent = completion.detail;
			return detailElt;
		},
		position: 80
	});
	return content.sort((a, b) => a.position - b.position).map((a) => a.render);
}
function rangeAroundSelected(total, selected, max) {
	if (total <= max) return {
		from: 0,
		to: total
	};
	if (selected < 0) selected = 0;
	if (selected <= total >> 1) {
		let off = Math.floor(selected / max);
		return {
			from: off * max,
			to: (off + 1) * max
		};
	}
	let off = Math.floor((total - selected) / max);
	return {
		from: total - (off + 1) * max,
		to: total - off * max
	};
}
var CompletionTooltip = class {
	constructor(view, stateField, applyCompletion) {
		this.view = view;
		this.stateField = stateField;
		this.applyCompletion = applyCompletion;
		this.info = null;
		this.infoDestroy = null;
		this.placeInfoReq = {
			read: () => this.measureInfo(),
			write: (pos) => this.placeInfo(pos),
			key: this
		};
		this.space = null;
		this.currentClass = "";
		let cState = view.state.field(stateField);
		let { options, selected } = cState.open;
		let config = view.state.facet(completionConfig);
		this.optionContent = optionContent(config);
		this.optionClass = config.optionClass;
		this.tooltipClass = config.tooltipClass;
		this.range = rangeAroundSelected(options.length, selected, config.maxRenderedOptions);
		this.dom = document.createElement("div");
		this.dom.className = "cm-tooltip-autocomplete";
		this.updateTooltipClass(view.state);
		this.dom.addEventListener("mousedown", (e) => {
			let { options } = view.state.field(stateField).open;
			for (let dom = e.target, match; dom && dom != this.dom; dom = dom.parentNode) if (dom.nodeName == "LI" && (match = /-(\d+)$/.exec(dom.id)) && +match[1] < options.length) {
				this.applyCompletion(view, options[+match[1]]);
				e.preventDefault();
				return;
			}
			if (e.target == this.list) {
				let move = this.list.classList.contains("cm-completionListIncompleteTop") && e.clientY < this.list.firstChild.getBoundingClientRect().top ? this.range.from - 1 : this.list.classList.contains("cm-completionListIncompleteBottom") && e.clientY > this.list.lastChild.getBoundingClientRect().bottom ? this.range.to : null;
				if (move != null) {
					view.dispatch({ effects: setSelectedEffect.of(move) });
					e.preventDefault();
				}
			}
		});
		this.dom.addEventListener("focusout", (e) => {
			let state = view.state.field(this.stateField, false);
			if (state && state.tooltip && view.state.facet(completionConfig).closeOnBlur && e.relatedTarget != view.contentDOM) view.dispatch({ effects: closeCompletionEffect.of(null) });
		});
		this.showOptions(options, cState.id);
	}
	mount() {
		this.updateSel();
	}
	showOptions(options, id) {
		if (this.list) this.list.remove();
		this.list = this.dom.appendChild(this.createListBox(options, id, this.range));
		this.list.addEventListener("scroll", () => {
			if (this.info) this.view.requestMeasure(this.placeInfoReq);
		});
	}
	update(update) {
		var _a;
		let cState = update.state.field(this.stateField);
		let prevState = update.startState.field(this.stateField);
		this.updateTooltipClass(update.state);
		if (cState != prevState) {
			let { options, selected, disabled } = cState.open;
			if (!prevState.open || prevState.open.options != options) {
				this.range = rangeAroundSelected(options.length, selected, update.state.facet(completionConfig).maxRenderedOptions);
				this.showOptions(options, cState.id);
			}
			this.updateSel();
			if (disabled != ((_a = prevState.open) === null || _a === void 0 ? void 0 : _a.disabled)) this.dom.classList.toggle("cm-tooltip-autocomplete-disabled", !!disabled);
		}
	}
	updateTooltipClass(state) {
		let cls = this.tooltipClass(state);
		if (cls != this.currentClass) {
			for (let c of this.currentClass.split(" ")) if (c) this.dom.classList.remove(c);
			for (let c of cls.split(" ")) if (c) this.dom.classList.add(c);
			this.currentClass = cls;
		}
	}
	positioned(space) {
		this.space = space;
		if (this.info) this.view.requestMeasure(this.placeInfoReq);
	}
	updateSel() {
		let cState = this.view.state.field(this.stateField), open = cState.open;
		if (open.selected > -1 && open.selected < this.range.from || open.selected >= this.range.to) {
			this.range = rangeAroundSelected(open.options.length, open.selected, this.view.state.facet(completionConfig).maxRenderedOptions);
			this.showOptions(open.options, cState.id);
		}
		let newSel = this.updateSelectedOption(open.selected);
		if (newSel) {
			this.destroyInfo();
			let { completion } = open.options[open.selected];
			let { info } = completion;
			if (!info) return;
			let infoResult = typeof info === "string" ? document.createTextNode(info) : info(completion);
			if (!infoResult) return;
			if ("then" in infoResult) infoResult.then((obj) => {
				if (obj && this.view.state.field(this.stateField, false) == cState) this.addInfoPane(obj, completion);
			}).catch((e) => logException(this.view.state, e, "completion info"));
			else {
				this.addInfoPane(infoResult, completion);
				newSel.setAttribute("aria-describedby", this.info.id);
			}
		}
	}
	addInfoPane(content, completion) {
		this.destroyInfo();
		let wrap = this.info = document.createElement("div");
		wrap.className = "cm-tooltip cm-completionInfo";
		wrap.id = "cm-completionInfo-" + Math.floor(Math.random() * 65535).toString(16);
		if (content.nodeType != null) {
			wrap.appendChild(content);
			this.infoDestroy = null;
		} else {
			let { dom, destroy } = content;
			wrap.appendChild(dom);
			this.infoDestroy = destroy || null;
		}
		this.dom.appendChild(wrap);
		this.view.requestMeasure(this.placeInfoReq);
	}
	updateSelectedOption(selected) {
		let set = null;
		for (let opt = this.list.firstChild, i = this.range.from; opt; opt = opt.nextSibling, i++) if (opt.nodeName != "LI" || !opt.id) i--;
		else if (i == selected) {
			if (!opt.hasAttribute("aria-selected")) {
				opt.setAttribute("aria-selected", "true");
				set = opt;
			}
		} else if (opt.hasAttribute("aria-selected")) {
			opt.removeAttribute("aria-selected");
			opt.removeAttribute("aria-describedby");
		}
		if (set) scrollIntoView(this.list, set);
		return set;
	}
	measureInfo() {
		let sel = this.dom.querySelector("[aria-selected]");
		if (!sel || !this.info) return null;
		let listRect = this.dom.getBoundingClientRect();
		let infoRect = this.info.getBoundingClientRect();
		let selRect = sel.getBoundingClientRect();
		let space = this.space;
		if (!space) {
			let docElt = this.dom.ownerDocument.documentElement;
			space = {
				left: 0,
				top: 0,
				right: docElt.clientWidth,
				bottom: docElt.clientHeight
			};
		}
		if (selRect.top > Math.min(space.bottom, listRect.bottom) - 10 || selRect.bottom < Math.max(space.top, listRect.top) + 10) return null;
		return this.view.state.facet(completionConfig).positionInfo(this.view, listRect, selRect, infoRect, space, this.dom);
	}
	placeInfo(pos) {
		if (this.info) {
			if (pos) {
				if (pos.style) this.info.style.cssText = pos.style;
				this.info.className = "cm-tooltip cm-completionInfo " + (pos.class || "");
			} else this.info.style.cssText = "top: -1e6px";
		}
	}
	createListBox(options, id, range) {
		const ul = document.createElement("ul");
		ul.id = id;
		ul.setAttribute("role", "listbox");
		ul.setAttribute("aria-expanded", "true");
		ul.setAttribute("aria-label", this.view.state.phrase("Completions"));
		ul.addEventListener("mousedown", (e) => {
			if (e.target == ul) e.preventDefault();
		});
		let curSection = null;
		for (let i = range.from; i < range.to; i++) {
			let { completion, match } = options[i], { section } = completion;
			if (section) {
				let name = typeof section == "string" ? section : section.name;
				if (name != curSection && (i > range.from || range.from == 0)) {
					curSection = name;
					if (typeof section != "string" && section.header) ul.appendChild(section.header(section));
					else {
						let header = ul.appendChild(document.createElement("completion-section"));
						header.textContent = name;
					}
				}
			}
			const li = ul.appendChild(document.createElement("li"));
			li.id = id + "-" + i;
			li.setAttribute("role", "option");
			let cls = this.optionClass(completion);
			if (cls) li.className = cls;
			for (let source of this.optionContent) {
				let node = source(completion, this.view.state, this.view, match);
				if (node) li.appendChild(node);
			}
		}
		if (range.from) ul.classList.add("cm-completionListIncompleteTop");
		if (range.to < options.length) ul.classList.add("cm-completionListIncompleteBottom");
		return ul;
	}
	destroyInfo() {
		if (this.info) {
			if (this.infoDestroy) this.infoDestroy();
			this.info.remove();
			this.info = null;
		}
	}
	destroy() {
		this.destroyInfo();
	}
};
function completionTooltip(stateField, applyCompletion) {
	return (view) => new CompletionTooltip(view, stateField, applyCompletion);
}
function scrollIntoView(container, element) {
	let parent = container.getBoundingClientRect();
	let self = element.getBoundingClientRect();
	let scaleY = parent.height / container.offsetHeight;
	if (self.top < parent.top) container.scrollTop -= (parent.top - self.top) / scaleY;
	else if (self.bottom > parent.bottom) container.scrollTop += (self.bottom - parent.bottom) / scaleY;
}
function score(option) {
	return (option.boost || 0) * 100 + (option.apply ? 10 : 0) + (option.info ? 5 : 0) + (option.type ? 1 : 0);
}
function sortOptions(active, state) {
	let options = [];
	let sections = null, dynamicSectionScore = null;
	let addOption = (option) => {
		options.push(option);
		let { section } = option.completion;
		if (section) {
			if (!sections) sections = [];
			let name = typeof section == "string" ? section : section.name;
			if (!sections.some((s) => s.name == name)) sections.push(typeof section == "string" ? { name } : section);
		}
	};
	let conf = state.facet(completionConfig);
	for (let a of active) if (a.hasResult()) {
		let getMatch = a.result.getMatch;
		if (a.result.filter === false) for (let option of a.result.options) addOption(new Option(option, a.source, getMatch ? getMatch(option) : [], 1e9 - options.length));
		else {
			let pattern = state.sliceDoc(a.from, a.to), match;
			let matcher = conf.filterStrict ? new StrictMatcher(pattern) : new FuzzyMatcher(pattern);
			for (let option of a.result.options) if (match = matcher.match(option.label)) {
				let matched = !option.displayLabel ? match.matched : getMatch ? getMatch(option, match.matched) : [];
				let score = match.score + (option.boost || 0);
				addOption(new Option(option, a.source, matched, score));
				if (typeof option.section == "object" && option.section.rank === "dynamic") {
					let { name } = option.section;
					if (!dynamicSectionScore) dynamicSectionScore = Object.create(null);
					dynamicSectionScore[name] = Math.max(score, dynamicSectionScore[name] || -1e9);
				}
			}
		}
	}
	if (sections) {
		let sectionOrder = Object.create(null), pos = 0;
		let cmp = (a, b) => {
			return (a.rank === "dynamic" && b.rank === "dynamic" ? dynamicSectionScore[b.name] - dynamicSectionScore[a.name] : 0) || (typeof a.rank == "number" ? a.rank : 1e9) - (typeof b.rank == "number" ? b.rank : 1e9) || (a.name < b.name ? -1 : 1);
		};
		for (let s of sections.sort(cmp)) {
			pos -= 1e5;
			sectionOrder[s.name] = pos;
		}
		for (let option of options) {
			let { section } = option.completion;
			if (section) option.score += sectionOrder[typeof section == "string" ? section : section.name];
		}
	}
	let result = [], prev = null;
	let compare = conf.compareCompletions;
	for (let opt of options.sort((a, b) => b.score - a.score || compare(a.completion, b.completion))) {
		let cur = opt.completion;
		if (!prev || prev.label != cur.label || prev.detail != cur.detail || prev.type != null && cur.type != null && prev.type != cur.type || prev.apply != cur.apply || prev.boost != cur.boost) result.push(opt);
		else if (score(opt.completion) > score(prev)) result[result.length - 1] = opt;
		prev = opt.completion;
	}
	return result;
}
var CompletionDialog = class CompletionDialog {
	constructor(options, attrs, tooltip, timestamp, selected, disabled) {
		this.options = options;
		this.attrs = attrs;
		this.tooltip = tooltip;
		this.timestamp = timestamp;
		this.selected = selected;
		this.disabled = disabled;
	}
	setSelected(selected, id) {
		return selected == this.selected || selected >= this.options.length ? this : new CompletionDialog(this.options, makeAttrs(id, selected), this.tooltip, this.timestamp, selected, this.disabled);
	}
	static build(active, state, id, prev, conf, didSetActive) {
		if (prev && !didSetActive && active.some((s) => s.isPending)) return prev.setDisabled();
		let options = sortOptions(active, state);
		if (!options.length) return prev && active.some((a) => a.isPending) ? prev.setDisabled() : null;
		let selected = state.facet(completionConfig).selectOnOpen ? 0 : -1;
		if (prev && prev.selected != selected && prev.selected != -1) {
			let selectedValue = prev.options[prev.selected].completion;
			for (let i = 0; i < options.length; i++) if (options[i].completion == selectedValue) {
				selected = i;
				break;
			}
		}
		return new CompletionDialog(options, makeAttrs(id, selected), {
			pos: active.reduce((a, b) => b.hasResult() ? Math.min(a, b.from) : a, 1e8),
			create: createTooltip,
			above: conf.aboveCursor
		}, prev ? prev.timestamp : Date.now(), selected, false);
	}
	map(changes) {
		return new CompletionDialog(this.options, this.attrs, {
			...this.tooltip,
			pos: changes.mapPos(this.tooltip.pos)
		}, this.timestamp, this.selected, this.disabled);
	}
	setDisabled() {
		return new CompletionDialog(this.options, this.attrs, this.tooltip, this.timestamp, this.selected, true);
	}
};
var CompletionState = class CompletionState {
	constructor(active, id, open) {
		this.active = active;
		this.id = id;
		this.open = open;
	}
	static start() {
		return new CompletionState(none, "cm-ac-" + Math.floor(Math.random() * 2e6).toString(36), null);
	}
	update(tr) {
		let { state } = tr, conf = state.facet(completionConfig);
		let active = (conf.override || state.languageDataAt("autocomplete", cur(state)).map(asSource)).map((source) => {
			return (this.active.find((s) => s.source == source) || new ActiveSource(source, this.active.some((a) => a.state != 0) ? 1 : 0)).update(tr, conf);
		});
		if (active.length == this.active.length && active.every((a, i) => a == this.active[i])) active = this.active;
		let open = this.open, didSet = tr.effects.some((e) => e.is(setActiveEffect));
		if (open && tr.docChanged) open = open.map(tr.changes);
		if (tr.selection || active.some((a) => a.hasResult() && tr.changes.touchesRange(a.from, a.to)) || !sameResults(active, this.active) || didSet) open = CompletionDialog.build(active, state, this.id, open, conf, didSet);
		else if (open && open.disabled && !active.some((a) => a.isPending)) open = null;
		if (!open && active.every((a) => !a.isPending) && active.some((a) => a.hasResult())) active = active.map((a) => a.hasResult() ? new ActiveSource(a.source, 0) : a);
		for (let effect of tr.effects) if (effect.is(setSelectedEffect)) open = open && open.setSelected(effect.value, this.id);
		return active == this.active && open == this.open ? this : new CompletionState(active, this.id, open);
	}
	get tooltip() {
		return this.open ? this.open.tooltip : null;
	}
	get attrs() {
		return this.open ? this.open.attrs : this.active.length ? baseAttrs : noAttrs;
	}
};
function sameResults(a, b) {
	if (a == b) return true;
	for (let iA = 0, iB = 0;;) {
		while (iA < a.length && !a[iA].hasResult()) iA++;
		while (iB < b.length && !b[iB].hasResult()) iB++;
		let endA = iA == a.length, endB = iB == b.length;
		if (endA || endB) return endA == endB;
		if (a[iA++].result != b[iB++].result) return false;
	}
}
const baseAttrs = { "aria-autocomplete": "list" };
const noAttrs = {};
function makeAttrs(id, selected) {
	let result = {
		"aria-autocomplete": "list",
		"aria-haspopup": "listbox",
		"aria-controls": id
	};
	if (selected > -1) result["aria-activedescendant"] = id + "-" + selected;
	return result;
}
const none = [];
function getUpdateType(tr, conf) {
	if (tr.isUserEvent("input.complete")) {
		let completion = tr.annotation(pickedCompletion);
		if (completion && conf.activateOnCompletion(completion)) return 12;
	}
	let typing = tr.isUserEvent("input.type");
	return typing && conf.activateOnTyping ? 5 : typing ? 1 : tr.isUserEvent("delete.backward") ? 2 : tr.selection ? 8 : tr.docChanged ? 16 : 0;
}
var ActiveSource = class ActiveSource {
	constructor(source, state, explicit = false) {
		this.source = source;
		this.state = state;
		this.explicit = explicit;
	}
	hasResult() {
		return false;
	}
	get isPending() {
		return this.state == 1;
	}
	update(tr, conf) {
		let type = getUpdateType(tr, conf), value = this;
		if (type & 8 || type & 16 && this.touches(tr)) value = new ActiveSource(value.source, 0);
		if (type & 4 && value.state == 0) value = new ActiveSource(this.source, 1);
		value = value.updateFor(tr, type);
		for (let effect of tr.effects) if (effect.is(startCompletionEffect)) value = new ActiveSource(value.source, 1, effect.value);
		else if (effect.is(closeCompletionEffect)) value = new ActiveSource(value.source, 0);
		else if (effect.is(setActiveEffect)) {
			for (let active of effect.value) if (active.source == value.source) value = active;
		}
		return value;
	}
	updateFor(tr, type) {
		return this.map(tr.changes);
	}
	map(changes) {
		return this;
	}
	touches(tr) {
		return tr.changes.touchesRange(cur(tr.state));
	}
};
var ActiveResult = class ActiveResult extends ActiveSource {
	constructor(source, explicit, limit, result, from, to) {
		super(source, 3, explicit);
		this.limit = limit;
		this.result = result;
		this.from = from;
		this.to = to;
	}
	hasResult() {
		return true;
	}
	updateFor(tr, type) {
		var _a;
		if (!(type & 3)) return this.map(tr.changes);
		let result = this.result;
		if (result.map && !tr.changes.empty) result = result.map(result, tr.changes);
		let from = tr.changes.mapPos(this.from), to = tr.changes.mapPos(this.to, 1);
		let pos = cur(tr.state);
		if (pos > to || !result || type & 2 && (cur(tr.startState) == this.from || pos < this.limit)) return new ActiveSource(this.source, type & 4 ? 1 : 0);
		let limit = tr.changes.mapPos(this.limit);
		if (checkValid(result.validFor, tr.state, from, to)) return new ActiveResult(this.source, this.explicit, limit, result, from, to);
		if (result.update && (result = result.update(result, from, to, new CompletionContext(tr.state, pos, false)))) return new ActiveResult(this.source, this.explicit, limit, result, result.from, (_a = result.to) !== null && _a !== void 0 ? _a : cur(tr.state));
		return new ActiveSource(this.source, 1, this.explicit);
	}
	map(mapping) {
		if (mapping.empty) return this;
		if (!(this.result.map ? this.result.map(this.result, mapping) : this.result)) return new ActiveSource(this.source, 0);
		return new ActiveResult(this.source, this.explicit, mapping.mapPos(this.limit), this.result, mapping.mapPos(this.from), mapping.mapPos(this.to, 1));
	}
	touches(tr) {
		return tr.changes.touchesRange(this.from, this.to);
	}
};
function checkValid(validFor, state, from, to) {
	if (!validFor) return false;
	let text = state.sliceDoc(from, to);
	return typeof validFor == "function" ? validFor(text, from, to, state) : ensureAnchor(validFor, true).test(text);
}
const setActiveEffect = /*@__PURE__*/ StateEffect.define({ map(sources, mapping) {
	return sources.map((s) => s.map(mapping));
} });
const completionState = /*@__PURE__*/ StateField.define({
	create() {
		return CompletionState.start();
	},
	update(value, tr) {
		return value.update(tr);
	},
	provide: (f) => [showTooltip.from(f, (val) => val.tooltip), EditorView.contentAttributes.from(f, (state) => state.attrs)]
});
function applyCompletion(view, option) {
	const apply = option.completion.apply || option.completion.label;
	let result = view.state.field(completionState).active.find((a) => a.source == option.source);
	if (!(result instanceof ActiveResult)) return false;
	if (typeof apply == "string") view.dispatch({
		...insertCompletionText(view.state, apply, result.from, result.to),
		annotations: pickedCompletion.of(option.completion)
	});
	else apply(view, option.completion, result.from, result.to);
	return true;
}
const createTooltip = /*@__PURE__*/ completionTooltip(completionState, applyCompletion);
/**
Returns a command that moves the completion selection forward or
backward by the given amount.
*/
function moveCompletionSelection(forward, by = "option") {
	return (view) => {
		let cState = view.state.field(completionState, false);
		if (!cState || !cState.open || cState.open.disabled || Date.now() - cState.open.timestamp < view.state.facet(completionConfig).interactionDelay) return false;
		let step = 1, tooltip;
		if (by == "page" && (tooltip = getTooltip(view, cState.open.tooltip))) step = Math.max(2, Math.floor(tooltip.dom.offsetHeight / tooltip.dom.querySelector("li").offsetHeight) - 1);
		let { length } = cState.open.options;
		let selected = cState.open.selected > -1 ? cState.open.selected + step * (forward ? 1 : -1) : forward ? 0 : length - 1;
		if (selected < 0) selected = by == "page" ? 0 : length - 1;
		else if (selected >= length) selected = by == "page" ? length - 1 : 0;
		view.dispatch({ effects: setSelectedEffect.of(selected) });
		return true;
	};
}
/**
Accept the current completion.
*/
const acceptCompletion = (view) => {
	let cState = view.state.field(completionState, false);
	if (view.state.readOnly || !cState || !cState.open || cState.open.selected < 0 || cState.open.disabled || Date.now() - cState.open.timestamp < view.state.facet(completionConfig).interactionDelay) return false;
	return applyCompletion(view, cState.open.options[cState.open.selected]);
};
/**
Explicitly start autocompletion.
*/
const startCompletion = (view) => {
	if (!view.state.field(completionState, false)) return false;
	view.dispatch({ effects: startCompletionEffect.of(true) });
	return true;
};
/**
Close the currently active completion.
*/
const closeCompletion = (view) => {
	let cState = view.state.field(completionState, false);
	if (!cState || !cState.active.some((a) => a.state != 0)) return false;
	view.dispatch({ effects: closeCompletionEffect.of(null) });
	return true;
};
var RunningQuery = class {
	constructor(active, context) {
		this.active = active;
		this.context = context;
		this.time = Date.now();
		this.updates = [];
		this.done = void 0;
	}
};
const MaxUpdateCount = 50;
const MinAbortTime = 1e3;
const completionPlugin = /*@__PURE__*/ ViewPlugin.fromClass(class {
	constructor(view) {
		this.view = view;
		this.debounceUpdate = -1;
		this.running = [];
		this.debounceAccept = -1;
		this.pendingStart = false;
		this.composing = 0;
		for (let active of view.state.field(completionState).active) if (active.isPending) this.startQuery(active);
	}
	update(update) {
		let cState = update.state.field(completionState);
		let conf = update.state.facet(completionConfig);
		if (!update.selectionSet && !update.docChanged && update.startState.field(completionState) == cState) return;
		let doesReset = update.transactions.some((tr) => {
			let type = getUpdateType(tr, conf);
			return type & 8 || (tr.selection || tr.docChanged) && !(type & 3);
		});
		for (let i = 0; i < this.running.length; i++) {
			let query = this.running[i];
			if (doesReset || query.context.abortOnDocChange && update.docChanged || query.updates.length + update.transactions.length > MaxUpdateCount && Date.now() - query.time > MinAbortTime) {
				for (let handler of query.context.abortListeners) try {
					handler();
				} catch (e) {
					logException(this.view.state, e);
				}
				query.context.abortListeners = null;
				this.running.splice(i--, 1);
			} else query.updates.push(...update.transactions);
		}
		if (this.debounceUpdate > -1) clearTimeout(this.debounceUpdate);
		if (update.transactions.some((tr) => tr.effects.some((e) => e.is(startCompletionEffect)))) this.pendingStart = true;
		let delay = this.pendingStart ? 50 : conf.activateOnTypingDelay;
		this.debounceUpdate = cState.active.some((a) => a.isPending && !this.running.some((q) => q.active.source == a.source)) ? setTimeout(() => this.startUpdate(), delay) : -1;
		if (this.composing != 0) {
			for (let tr of update.transactions) if (tr.isUserEvent("input.type")) this.composing = 2;
			else if (this.composing == 2 && tr.selection) this.composing = 3;
		}
	}
	startUpdate() {
		this.debounceUpdate = -1;
		this.pendingStart = false;
		let { state } = this.view, cState = state.field(completionState);
		for (let active of cState.active) if (active.isPending && !this.running.some((r) => r.active.source == active.source)) this.startQuery(active);
		if (this.running.length && cState.open && cState.open.disabled) this.debounceAccept = setTimeout(() => this.accept(), this.view.state.facet(completionConfig).updateSyncTime);
	}
	startQuery(active) {
		let { state } = this.view;
		let context = new CompletionContext(state, cur(state), active.explicit, this.view);
		let pending = new RunningQuery(active, context);
		this.running.push(pending);
		Promise.resolve(active.source(context)).then((result) => {
			if (!pending.context.aborted) {
				pending.done = result || null;
				this.scheduleAccept();
			}
		}, (err) => {
			this.view.dispatch({ effects: closeCompletionEffect.of(null) });
			logException(this.view.state, err);
		});
	}
	scheduleAccept() {
		if (this.running.every((q) => q.done !== void 0)) this.accept();
		else if (this.debounceAccept < 0) this.debounceAccept = setTimeout(() => this.accept(), this.view.state.facet(completionConfig).updateSyncTime);
	}
	accept() {
		var _a;
		if (this.debounceAccept > -1) clearTimeout(this.debounceAccept);
		this.debounceAccept = -1;
		let updated = [];
		let conf = this.view.state.facet(completionConfig), cState = this.view.state.field(completionState);
		for (let i = 0; i < this.running.length; i++) {
			let query = this.running[i];
			if (query.done === void 0) continue;
			this.running.splice(i--, 1);
			if (query.done) {
				let pos = cur(query.updates.length ? query.updates[0].startState : this.view.state);
				let limit = Math.min(pos, query.done.from + (query.active.explicit ? 0 : 1));
				let active = new ActiveResult(query.active.source, query.active.explicit, limit, query.done, query.done.from, (_a = query.done.to) !== null && _a !== void 0 ? _a : pos);
				for (let tr of query.updates) active = active.update(tr, conf);
				if (active.hasResult()) {
					updated.push(active);
					continue;
				}
			}
			let current = cState.active.find((a) => a.source == query.active.source);
			if (current && current.isPending) {
				if (query.done == null) {
					let active = new ActiveSource(query.active.source, 0);
					for (let tr of query.updates) active = active.update(tr, conf);
					if (!active.isPending) updated.push(active);
				} else this.startQuery(current);
			}
		}
		if (updated.length || cState.open && cState.open.disabled) this.view.dispatch({ effects: setActiveEffect.of(updated) });
	}
}, { eventHandlers: {
	blur(event) {
		let state = this.view.state.field(completionState, false);
		if (state && state.tooltip && this.view.state.facet(completionConfig).closeOnBlur) {
			let dialog = state.open && getTooltip(this.view, state.open.tooltip);
			if (!dialog || !dialog.dom.contains(event.relatedTarget)) setTimeout(() => this.view.dispatch({ effects: closeCompletionEffect.of(null) }), 10);
		}
	},
	compositionstart() {
		this.composing = 1;
	},
	compositionend() {
		if (this.composing == 3) setTimeout(() => this.view.dispatch({ effects: startCompletionEffect.of(false) }), 20);
		this.composing = 0;
	}
} });
const windows = typeof navigator == "object" && /*@__PURE__*/ /Win/.test(navigator.platform);
const commitCharacters = /*@__PURE__*/ Prec.highest(/*@__PURE__*/ EditorView.domEventHandlers({ keydown(event, view) {
	let field = view.state.field(completionState, false);
	if (!field || !field.open || field.open.disabled || field.open.selected < 0 || event.key.length > 1 || event.ctrlKey && !(windows && event.altKey) || event.metaKey) return false;
	let option = field.open.options[field.open.selected];
	let result = field.active.find((a) => a.source == option.source);
	let commitChars = option.completion.commitCharacters || result.result.commitCharacters;
	if (commitChars && commitChars.indexOf(event.key) > -1) applyCompletion(view, option);
	return false;
} }));
const baseTheme$1 = /*@__PURE__*/ EditorView.baseTheme({
	".cm-tooltip.cm-tooltip-autocomplete": { "& > ul": {
		fontFamily: "monospace",
		whiteSpace: "nowrap",
		overflow: "hidden auto",
		maxWidth_fallback: "700px",
		maxWidth: "min(700px, 95vw)",
		minWidth: "250px",
		maxHeight: "10em",
		height: "100%",
		listStyle: "none",
		margin: 0,
		padding: 0,
		"& > li, & > completion-section": {
			padding: "1px 3px",
			lineHeight: 1.2
		},
		"& > li": {
			overflowX: "hidden",
			textOverflow: "ellipsis",
			cursor: "pointer"
		},
		"& > completion-section": {
			display: "list-item",
			borderBottom: "1px solid silver",
			paddingLeft: "0.5em",
			opacity: .7
		}
	} },
	"&light .cm-tooltip-autocomplete ul li[aria-selected]": {
		background: "#17c",
		color: "white"
	},
	"&light .cm-tooltip-autocomplete-disabled ul li[aria-selected]": { background: "#777" },
	"&dark .cm-tooltip-autocomplete ul li[aria-selected]": {
		background: "#347",
		color: "white"
	},
	"&dark .cm-tooltip-autocomplete-disabled ul li[aria-selected]": { background: "#444" },
	".cm-completionListIncompleteTop:before, .cm-completionListIncompleteBottom:after": {
		content: "\"···\"",
		opacity: .5,
		display: "block",
		textAlign: "center"
	},
	".cm-tooltip.cm-completionInfo": {
		position: "absolute",
		padding: "3px 9px",
		width: "max-content",
		maxWidth: `400px`,
		boxSizing: "border-box",
		whiteSpace: "pre-line"
	},
	".cm-completionInfo.cm-completionInfo-left": { right: "100%" },
	".cm-completionInfo.cm-completionInfo-right": { left: "100%" },
	".cm-completionInfo.cm-completionInfo-left-narrow": { right: `30px` },
	".cm-completionInfo.cm-completionInfo-right-narrow": { left: `30px` },
	"&light .cm-snippetField": { backgroundColor: "#00000022" },
	"&dark .cm-snippetField": { backgroundColor: "#ffffff22" },
	".cm-snippetFieldPosition": {
		verticalAlign: "text-top",
		width: 0,
		height: "1.15em",
		display: "inline-block",
		margin: "0 -0.7px -.7em",
		borderLeft: "1.4px dotted #888"
	},
	".cm-completionMatchedText": { textDecoration: "underline" },
	".cm-completionDetail": {
		marginLeft: "0.5em",
		fontStyle: "italic"
	},
	".cm-completionIcon": {
		fontSize: "90%",
		width: ".8em",
		display: "inline-block",
		textAlign: "center",
		paddingRight: ".6em",
		opacity: "0.6",
		boxSizing: "content-box"
	},
	".cm-completionIcon-function, .cm-completionIcon-method": { "&:after": { content: "'ƒ'" } },
	".cm-completionIcon-class": { "&:after": { content: "'○'" } },
	".cm-completionIcon-interface": { "&:after": { content: "'◌'" } },
	".cm-completionIcon-variable": { "&:after": { content: "'𝑥'" } },
	".cm-completionIcon-constant": { "&:after": { content: "'𝐶'" } },
	".cm-completionIcon-type": { "&:after": { content: "'𝑡'" } },
	".cm-completionIcon-enum": { "&:after": { content: "'∪'" } },
	".cm-completionIcon-property": { "&:after": { content: "'□'" } },
	".cm-completionIcon-keyword": { "&:after": { content: "'🔑︎'" } },
	".cm-completionIcon-namespace": { "&:after": { content: "'▢'" } },
	".cm-completionIcon-text": { "&:after": {
		content: "'abc'",
		fontSize: "50%",
		verticalAlign: "middle"
	} }
});
const defaults = {
	brackets: [
		"(",
		"[",
		"{",
		"'",
		"\""
	],
	before: ")]}:;>",
	stringPrefixes: []
};
const closeBracketEffect = /*@__PURE__*/ StateEffect.define({ map(value, mapping) {
	let mapped = mapping.mapPos(value, -1, MapMode.TrackAfter);
	return mapped == null ? void 0 : mapped;
} });
const closedBracket = /*@__PURE__*/ new class extends RangeValue {}();
closedBracket.startSide = 1;
closedBracket.endSide = -1;
const bracketState = /*@__PURE__*/ StateField.define({
	create() {
		return RangeSet.empty;
	},
	update(value, tr) {
		value = value.map(tr.changes);
		if (tr.selection) {
			let line = tr.state.doc.lineAt(tr.selection.main.head);
			value = value.update({ filter: (from) => from >= line.from && from <= line.to });
		}
		for (let effect of tr.effects) if (effect.is(closeBracketEffect)) value = value.update({ add: [closedBracket.range(effect.value, effect.value + 1)] });
		return value;
	}
});
/**
Extension to enable bracket-closing behavior. When a closeable
bracket is typed, its closing bracket is immediately inserted
after the cursor. When closing a bracket directly in front of a
closing bracket inserted by the extension, the cursor moves over
that bracket.
*/
function closeBrackets() {
	return [inputHandler, bracketState];
}
const definedClosing = "()[]{}<>«»»«［］｛｝";
function closing(ch) {
	for (let i = 0; i < 16; i += 2) if (definedClosing.charCodeAt(i) == ch) return definedClosing.charAt(i + 1);
	return fromCodePoint(ch < 128 ? ch : ch + 1);
}
function config(state, pos) {
	return state.languageDataAt("closeBrackets", pos)[0] || defaults;
}
const android = typeof navigator == "object" && /*@__PURE__*/ /Android\b/.test(navigator.userAgent);
const inputHandler = /*@__PURE__*/ EditorView.inputHandler.of((view, from, to, insert) => {
	if ((android ? view.composing : view.compositionStarted) || view.state.readOnly) return false;
	let sel = view.state.selection.main;
	if (insert.length > 2 || insert.length == 2 && codePointSize(codePointAt(insert, 0)) == 1 || from != sel.from || to != sel.to) return false;
	let tr = insertBracket(view.state, insert);
	if (!tr) return false;
	view.dispatch(tr);
	return true;
});
/**
Command that implements deleting a pair of matching brackets when
the cursor is between them.
*/
const deleteBracketPair = ({ state, dispatch }) => {
	if (state.readOnly) return false;
	let tokens = config(state, state.selection.main.head).brackets || defaults.brackets;
	let dont = null, changes = state.changeByRange((range) => {
		if (range.empty) {
			let before = prevChar(state.doc, range.head);
			for (let token of tokens) if (token == before && nextChar(state.doc, range.head) == closing(codePointAt(token, 0))) return {
				changes: {
					from: range.head - token.length,
					to: range.head + token.length
				},
				range: EditorSelection.cursor(range.head - token.length)
			};
		}
		return { range: dont = range };
	});
	if (!dont) dispatch(state.update(changes, {
		scrollIntoView: true,
		userEvent: "delete.backward"
	}));
	return !dont;
};
/**
Close-brackets related key bindings. Binds Backspace to
[`deleteBracketPair`](https://codemirror.net/6/docs/ref/#autocomplete.deleteBracketPair).
*/
const closeBracketsKeymap = [{
	key: "Backspace",
	run: deleteBracketPair
}];
/**
Implements the extension's behavior on text insertion. If the
given string counts as a bracket in the language around the
selection, and replacing the selection with it requires custom
behavior (inserting a closing version or skipping past a
previously-closed bracket), this function returns a transaction
representing that custom behavior. (You only need this if you want
to programmatically insert brackets—the
[`closeBrackets`](https://codemirror.net/6/docs/ref/#autocomplete.closeBrackets) extension will
take care of running this for user input.)
*/
function insertBracket(state, bracket) {
	let conf = config(state, state.selection.main.head);
	let tokens = conf.brackets || defaults.brackets;
	for (let tok of tokens) {
		let closed = closing(codePointAt(tok, 0));
		if (bracket == tok) return closed == tok ? handleSame(state, tok, tokens.indexOf(tok + tok + tok) > -1, conf) : handleOpen(state, tok, closed, conf.before || defaults.before);
		if (bracket == closed && closedBracketAt(state, state.selection.main.from)) return handleClose(state, tok, closed);
	}
	return null;
}
function closedBracketAt(state, pos) {
	let found = false;
	state.field(bracketState).between(0, state.doc.length, (from) => {
		if (from == pos) found = true;
	});
	return found;
}
function nextChar(doc, pos) {
	let next = doc.sliceString(pos, pos + 2);
	return next.slice(0, codePointSize(codePointAt(next, 0)));
}
function prevChar(doc, pos) {
	let prev = doc.sliceString(pos - 2, pos);
	return codePointSize(codePointAt(prev, 0)) == prev.length ? prev : prev.slice(1);
}
function handleOpen(state, open, close, closeBefore) {
	let dont = null, changes = state.changeByRange((range) => {
		if (!range.empty) return {
			changes: [{
				insert: open,
				from: range.from
			}, {
				insert: close,
				from: range.to
			}],
			effects: closeBracketEffect.of(range.to + open.length),
			range: EditorSelection.range(range.anchor + open.length, range.head + open.length)
		};
		let next = nextChar(state.doc, range.head);
		if (!next || /\s/.test(next) || closeBefore.indexOf(next) > -1) return {
			changes: {
				insert: open + close,
				from: range.head
			},
			effects: closeBracketEffect.of(range.head + open.length),
			range: EditorSelection.cursor(range.head + open.length)
		};
		return { range: dont = range };
	});
	return dont ? null : state.update(changes, {
		scrollIntoView: true,
		userEvent: "input.type"
	});
}
function handleClose(state, _open, close) {
	let dont = null, changes = state.changeByRange((range) => {
		if (range.empty && nextChar(state.doc, range.head) == close) return {
			changes: {
				from: range.head,
				to: range.head + close.length,
				insert: close
			},
			range: EditorSelection.cursor(range.head + close.length)
		};
		return dont = { range };
	});
	return dont ? null : state.update(changes, {
		scrollIntoView: true,
		userEvent: "input.type"
	});
}
function handleSame(state, token, allowTriple, config) {
	let stringPrefixes = config.stringPrefixes || defaults.stringPrefixes;
	let dont = null, changes = state.changeByRange((range) => {
		if (!range.empty) return {
			changes: [{
				insert: token,
				from: range.from
			}, {
				insert: token,
				from: range.to
			}],
			effects: closeBracketEffect.of(range.to + token.length),
			range: EditorSelection.range(range.anchor + token.length, range.head + token.length)
		};
		let pos = range.head, next = nextChar(state.doc, pos), start;
		if (next == token) {
			if (nodeStart(state, pos)) return {
				changes: {
					insert: token + token,
					from: pos
				},
				effects: closeBracketEffect.of(pos + token.length),
				range: EditorSelection.cursor(pos + token.length)
			};
			else if (closedBracketAt(state, pos)) {
				let content = allowTriple && state.sliceDoc(pos, pos + token.length * 3) == token + token + token ? token + token + token : token;
				return {
					changes: {
						from: pos,
						to: pos + content.length,
						insert: content
					},
					range: EditorSelection.cursor(pos + content.length)
				};
			}
		} else if (allowTriple && state.sliceDoc(pos - 2 * token.length, pos) == token + token && (start = canStartStringAt(state, pos - 2 * token.length, stringPrefixes)) > -1 && nodeStart(state, start)) return {
			changes: {
				insert: token + token + token + token,
				from: pos
			},
			effects: closeBracketEffect.of(pos + token.length),
			range: EditorSelection.cursor(pos + token.length)
		};
		else if (state.charCategorizer(pos)(next) != CharCategory.Word) {
			if (canStartStringAt(state, pos, stringPrefixes) > -1 && !probablyInString(state, pos, token, stringPrefixes)) return {
				changes: {
					insert: token + token,
					from: pos
				},
				effects: closeBracketEffect.of(pos + token.length),
				range: EditorSelection.cursor(pos + token.length)
			};
		}
		return { range: dont = range };
	});
	return dont ? null : state.update(changes, {
		scrollIntoView: true,
		userEvent: "input.type"
	});
}
function nodeStart(state, pos) {
	let tree = syntaxTree(state).resolveInner(pos + 1);
	return tree.parent && tree.from == pos;
}
function probablyInString(state, pos, quoteToken, prefixes) {
	let node = syntaxTree(state).resolveInner(pos, -1);
	let maxPrefix = prefixes.reduce((m, p) => Math.max(m, p.length), 0);
	for (let i = 0; i < 5; i++) {
		let start = state.sliceDoc(node.from, Math.min(node.to, node.from + quoteToken.length + maxPrefix));
		let quotePos = start.indexOf(quoteToken);
		if (!quotePos || quotePos > -1 && prefixes.indexOf(start.slice(0, quotePos)) > -1) {
			let first = node.firstChild;
			while (first && first.from == node.from && first.to - first.from > quoteToken.length + quotePos) {
				if (state.sliceDoc(first.to - quoteToken.length, first.to) == quoteToken) return false;
				first = first.firstChild;
			}
			return true;
		}
		let parent = node.to == pos && node.parent;
		if (!parent) break;
		node = parent;
	}
	return false;
}
function canStartStringAt(state, pos, prefixes) {
	let charCat = state.charCategorizer(pos);
	if (charCat(state.sliceDoc(pos - 1, pos)) != CharCategory.Word) return pos;
	for (let prefix of prefixes) {
		let start = pos - prefix.length;
		if (state.sliceDoc(start, pos) == prefix && charCat(state.sliceDoc(start - 1, start)) != CharCategory.Word) return start;
	}
	return -1;
}
/**
Returns an extension that enables autocompletion.
*/
function autocompletion(config = {}) {
	return [
		commitCharacters,
		completionState,
		completionConfig.of(config),
		completionPlugin,
		completionKeymapExt,
		baseTheme$1
	];
}
/**
Basic keybindings for autocompletion.

- Ctrl-Space (and Alt-\` or Alt-i on macOS): [`startCompletion`](https://codemirror.net/6/docs/ref/#autocomplete.startCompletion)
- Escape: [`closeCompletion`](https://codemirror.net/6/docs/ref/#autocomplete.closeCompletion)
- ArrowDown: [`moveCompletionSelection`](https://codemirror.net/6/docs/ref/#autocomplete.moveCompletionSelection)`(true)`
- ArrowUp: [`moveCompletionSelection`](https://codemirror.net/6/docs/ref/#autocomplete.moveCompletionSelection)`(false)`
- PageDown: [`moveCompletionSelection`](https://codemirror.net/6/docs/ref/#autocomplete.moveCompletionSelection)`(true, "page")`
- PageUp: [`moveCompletionSelection`](https://codemirror.net/6/docs/ref/#autocomplete.moveCompletionSelection)`(false, "page")`
- Enter: [`acceptCompletion`](https://codemirror.net/6/docs/ref/#autocomplete.acceptCompletion)
*/
const completionKeymap = [
	{
		key: "Ctrl-Space",
		run: startCompletion
	},
	{
		mac: "Alt-`",
		run: startCompletion
	},
	{
		mac: "Alt-i",
		run: startCompletion
	},
	{
		key: "Escape",
		run: closeCompletion
	},
	{
		key: "ArrowDown",
		run: /*@__PURE__*/ moveCompletionSelection(true)
	},
	{
		key: "ArrowUp",
		run: /*@__PURE__*/ moveCompletionSelection(false)
	},
	{
		key: "PageDown",
		run: /*@__PURE__*/ moveCompletionSelection(true, "page")
	},
	{
		key: "PageUp",
		run: /*@__PURE__*/ moveCompletionSelection(false, "page")
	},
	{
		key: "Enter",
		run: acceptCompletion
	}
];
const completionKeymapExt = /*@__PURE__*/ Prec.highest(/*@__PURE__*/ keymap.computeN([completionConfig], (state) => state.facet(completionConfig).defaultKeymap ? [completionKeymap] : []));
//#endregion
//#region ../../node_modules/.pnpm/@codemirror+lint@6.9.5/node_modules/@codemirror/lint/dist/index.js
var SelectedDiagnostic = class {
	constructor(from, to, diagnostic) {
		this.from = from;
		this.to = to;
		this.diagnostic = diagnostic;
	}
};
var LintState = class LintState {
	constructor(diagnostics, panel, selected) {
		this.diagnostics = diagnostics;
		this.panel = panel;
		this.selected = selected;
	}
	static init(diagnostics, panel, state) {
		let diagnosticFilter = state.facet(lintConfig).markerFilter;
		if (diagnosticFilter) diagnostics = diagnosticFilter(diagnostics, state);
		let sorted = diagnostics.slice().sort((a, b) => a.from - b.from || a.to - b.to);
		let deco = new RangeSetBuilder(), active = [], pos = 0;
		let scan = state.doc.iter(), scanPos = 0, docLen = state.doc.length;
		for (let i = 0;;) {
			let next = i == sorted.length ? null : sorted[i];
			if (!next && !active.length) break;
			let from, to;
			if (active.length) {
				from = pos;
				to = active.reduce((p, d) => Math.min(p, d.to), next && next.from > from ? next.from : 1e8);
			} else {
				from = next.from;
				if (from > docLen) break;
				to = next.to;
				active.push(next);
				i++;
			}
			while (i < sorted.length) {
				let next = sorted[i];
				if (next.from == from && (next.to > next.from || next.to == from)) {
					active.push(next);
					i++;
					to = Math.min(next.to, to);
				} else {
					to = Math.min(next.from, to);
					break;
				}
			}
			to = Math.min(to, docLen);
			let widget = false;
			if (active.some((d) => d.from == from && (d.to == to || to == docLen))) {
				widget = from == to;
				if (!widget && to - from < 10) {
					let behind = from - (scanPos + scan.value.length);
					if (behind > 0) {
						scan.next(behind);
						scanPos = from;
					}
					for (let check = from;;) {
						if (check >= to) {
							widget = true;
							break;
						}
						if (!scan.lineBreak && scanPos + scan.value.length > check) break;
						check = scanPos + scan.value.length;
						scanPos += scan.value.length;
						scan.next();
					}
				}
			}
			let sev = maxSeverity(active);
			if (widget) deco.add(from, from, Decoration.widget({
				widget: new DiagnosticWidget(sev),
				diagnostics: active.slice()
			}));
			else {
				let markClass = active.reduce((c, d) => d.markClass ? c + " " + d.markClass : c, "");
				deco.add(from, to, Decoration.mark({
					class: "cm-lintRange cm-lintRange-" + sev + markClass,
					diagnostics: active.slice(),
					inclusiveEnd: active.some((a) => a.to > to)
				}));
			}
			pos = to;
			if (pos == docLen) break;
			for (let i = 0; i < active.length; i++) if (active[i].to <= pos) active.splice(i--, 1);
		}
		let set = deco.finish();
		return new LintState(set, panel, findDiagnostic(set));
	}
};
function findDiagnostic(diagnostics, diagnostic = null, after = 0) {
	let found = null;
	diagnostics.between(after, 1e9, (from, to, { spec }) => {
		if (diagnostic && spec.diagnostics.indexOf(diagnostic) < 0) return;
		if (!found) found = new SelectedDiagnostic(from, to, diagnostic || spec.diagnostics[0]);
		else if (spec.diagnostics.indexOf(found.diagnostic) < 0) return false;
		else found = new SelectedDiagnostic(found.from, to, found.diagnostic);
	});
	return found;
}
function hideTooltip(tr, tooltip) {
	let from = tooltip.pos, to = tooltip.end || from;
	let result = tr.state.facet(lintConfig).hideOn(tr, from, to);
	if (result != null) return result;
	let line = tr.startState.doc.lineAt(tooltip.pos);
	return !!(tr.effects.some((e) => e.is(setDiagnosticsEffect)) || tr.changes.touchesRange(line.from, Math.max(line.to, to)));
}
function maybeEnableLint(state, effects) {
	return state.field(lintState, false) ? effects : effects.concat(StateEffect.appendConfig.of(lintExtensions));
}
/**
Returns a transaction spec which updates the current set of
diagnostics, and enables the lint extension if if wasn't already
active.
*/
function setDiagnostics(state, diagnostics) {
	return { effects: maybeEnableLint(state, [setDiagnosticsEffect.of(diagnostics)]) };
}
/**
The state effect that updates the set of active diagnostics. Can
be useful when writing an extension that needs to track these.
*/
const setDiagnosticsEffect = /*@__PURE__*/ StateEffect.define();
const togglePanel = /*@__PURE__*/ StateEffect.define();
const movePanelSelection = /*@__PURE__*/ StateEffect.define();
const lintState = /*@__PURE__*/ StateField.define({
	create() {
		return new LintState(Decoration.none, null, null);
	},
	update(value, tr) {
		if (tr.docChanged && value.diagnostics.size) {
			let mapped = value.diagnostics.map(tr.changes), selected = null, panel = value.panel;
			if (value.selected) {
				let selPos = tr.changes.mapPos(value.selected.from, 1);
				selected = findDiagnostic(mapped, value.selected.diagnostic, selPos) || findDiagnostic(mapped, null, selPos);
			}
			if (!mapped.size && panel && tr.state.facet(lintConfig).autoPanel) panel = null;
			value = new LintState(mapped, panel, selected);
		}
		for (let effect of tr.effects) if (effect.is(setDiagnosticsEffect)) {
			let panel = !tr.state.facet(lintConfig).autoPanel ? value.panel : effect.value.length ? LintPanel.open : null;
			value = LintState.init(effect.value, panel, tr.state);
		} else if (effect.is(togglePanel)) value = new LintState(value.diagnostics, effect.value ? LintPanel.open : null, value.selected);
		else if (effect.is(movePanelSelection)) value = new LintState(value.diagnostics, value.panel, effect.value);
		return value;
	},
	provide: (f) => [showPanel.from(f, (val) => val.panel), EditorView.decorations.from(f, (s) => s.diagnostics)]
});
const activeMark = /*@__PURE__*/ Decoration.mark({ class: "cm-lintRange cm-lintRange-active" });
function lintTooltip(view, pos, side) {
	let { diagnostics } = view.state.field(lintState);
	let found, start = -1, end = -1;
	diagnostics.between(pos - (side < 0 ? 1 : 0), pos + (side > 0 ? 1 : 0), (from, to, { spec }) => {
		if (pos >= from && pos <= to && (from == to || (pos > from || side > 0) && (pos < to || side < 0))) {
			found = spec.diagnostics;
			start = from;
			end = to;
			return false;
		}
	});
	let diagnosticFilter = view.state.facet(lintConfig).tooltipFilter;
	if (found && diagnosticFilter) found = diagnosticFilter(found, view.state);
	if (!found) return null;
	return {
		pos: start,
		end,
		above: view.state.doc.lineAt(start).to < end,
		create() {
			return { dom: diagnosticsTooltip(view, found) };
		}
	};
}
function diagnosticsTooltip(view, diagnostics) {
	return crelt$1("ul", { class: "cm-tooltip-lint" }, diagnostics.map((d) => renderDiagnostic(view, d, false)));
}
/**
Command to open and focus the lint panel.
*/
const openLintPanel = (view) => {
	let field = view.state.field(lintState, false);
	if (!field || !field.panel) view.dispatch({ effects: maybeEnableLint(view.state, [togglePanel.of(true)]) });
	let panel = getPanel(view, LintPanel.open);
	if (panel) panel.dom.querySelector(".cm-panel-lint ul").focus();
	return true;
};
/**
Command to close the lint panel, when open.
*/
const closeLintPanel = (view) => {
	let field = view.state.field(lintState, false);
	if (!field || !field.panel) return false;
	view.dispatch({ effects: togglePanel.of(false) });
	return true;
};
/**
Move the selection to the next diagnostic.
*/
const nextDiagnostic = (view) => {
	let field = view.state.field(lintState, false);
	if (!field) return false;
	let sel = view.state.selection.main, next = findDiagnostic(field.diagnostics, null, sel.to + 1);
	if (!next) {
		next = findDiagnostic(field.diagnostics, null, 0);
		if (!next || next.from == sel.from && next.to == sel.to) return false;
	}
	view.dispatch({
		selection: {
			anchor: next.from,
			head: next.to
		},
		scrollIntoView: true
	});
	return true;
};
/**
A set of default key bindings for the lint functionality.

- Ctrl-Shift-m (Cmd-Shift-m on macOS): [`openLintPanel`](https://codemirror.net/6/docs/ref/#lint.openLintPanel)
- F8: [`nextDiagnostic`](https://codemirror.net/6/docs/ref/#lint.nextDiagnostic)
*/
const lintKeymap = [{
	key: "Mod-Shift-m",
	run: openLintPanel,
	preventDefault: true
}, {
	key: "F8",
	run: nextDiagnostic
}];
const lintPlugin = /*@__PURE__*/ ViewPlugin.fromClass(class {
	constructor(view) {
		this.view = view;
		this.timeout = -1;
		this.set = true;
		let { delay } = view.state.facet(lintConfig);
		this.lintTime = Date.now() + delay;
		this.run = this.run.bind(this);
		this.timeout = setTimeout(this.run, delay);
	}
	run() {
		clearTimeout(this.timeout);
		let now = Date.now();
		if (now < this.lintTime - 10) this.timeout = setTimeout(this.run, this.lintTime - now);
		else {
			this.set = false;
			let { state } = this.view, { sources } = state.facet(lintConfig);
			if (sources.length) batchResults(sources.map((s) => Promise.resolve(s(this.view))), (annotations) => {
				if (this.view.state.doc == state.doc) this.view.dispatch(setDiagnostics(this.view.state, annotations.reduce((a, b) => a.concat(b))));
			}, (error) => {
				logException(this.view.state, error);
			});
		}
	}
	update(update) {
		let config = update.state.facet(lintConfig);
		if (update.docChanged || config != update.startState.facet(lintConfig) || config.needsRefresh && config.needsRefresh(update)) {
			this.lintTime = Date.now() + config.delay;
			if (!this.set) {
				this.set = true;
				this.timeout = setTimeout(this.run, config.delay);
			}
		}
	}
	force() {
		if (this.set) {
			this.lintTime = Date.now();
			this.run();
		}
	}
	destroy() {
		clearTimeout(this.timeout);
	}
});
function batchResults(promises, sink, error) {
	let collected = [], timeout = -1;
	for (let p of promises) p.then((value) => {
		collected.push(value);
		clearTimeout(timeout);
		if (collected.length == promises.length) sink(collected);
		else timeout = setTimeout(() => sink(collected), 200);
	}, error);
}
const lintConfig = /*@__PURE__*/ Facet.define({ combine(input) {
	return {
		sources: input.map((i) => i.source).filter((x) => x != null),
		...combineConfig(input.map((i) => i.config), {
			delay: 750,
			markerFilter: null,
			tooltipFilter: null,
			needsRefresh: null,
			hideOn: () => null
		}, {
			delay: Math.max,
			markerFilter: combineFilter,
			tooltipFilter: combineFilter,
			needsRefresh: (a, b) => !a ? b : !b ? a : (u) => a(u) || b(u),
			hideOn: (a, b) => !a ? b : !b ? a : (t, x, y) => a(t, x, y) || b(t, x, y),
			autoPanel: (a, b) => a || b
		})
	};
} });
function combineFilter(a, b) {
	return !a ? b : !b ? a : (d, s) => b(a(d, s), s);
}
/**
Given a diagnostic source, this function returns an extension that
enables linting with that source. It will be called whenever the
editor is idle (after its content changed).

Note that settings given here will apply to all linters active in
the editor. If `null` is given as source, this only configures the
lint extension.
*/
function linter(source, config = {}) {
	return [
		lintConfig.of({
			source,
			config
		}),
		lintPlugin,
		lintExtensions
	];
}
function assignKeys(actions) {
	let assigned = [];
	if (actions) actions: for (let { name } of actions) {
		for (let i = 0; i < name.length; i++) {
			let ch = name[i];
			if (/[a-zA-Z]/.test(ch) && !assigned.some((c) => c.toLowerCase() == ch.toLowerCase())) {
				assigned.push(ch);
				continue actions;
			}
		}
		assigned.push("");
	}
	return assigned;
}
function renderDiagnostic(view, diagnostic, inPanel) {
	var _a;
	let keys = inPanel ? assignKeys(diagnostic.actions) : [];
	return crelt$1("li", { class: "cm-diagnostic cm-diagnostic-" + diagnostic.severity }, crelt$1("span", { class: "cm-diagnosticText" }, diagnostic.renderMessage ? diagnostic.renderMessage(view) : diagnostic.message), (_a = diagnostic.actions) === null || _a === void 0 ? void 0 : _a.map((action, i) => {
		let fired = false, click = (e) => {
			e.preventDefault();
			if (fired) return;
			fired = true;
			let found = findDiagnostic(view.state.field(lintState).diagnostics, diagnostic);
			if (found) action.apply(view, found.from, found.to);
		};
		let { name } = action, keyIndex = keys[i] ? name.indexOf(keys[i]) : -1;
		let nameElt = keyIndex < 0 ? name : [
			name.slice(0, keyIndex),
			crelt$1("u", name.slice(keyIndex, keyIndex + 1)),
			name.slice(keyIndex + 1)
		];
		return crelt$1("button", {
			type: "button",
			class: "cm-diagnosticAction" + (action.markClass ? " " + action.markClass : ""),
			onclick: click,
			onmousedown: click,
			"aria-label": ` Action: ${name}${keyIndex < 0 ? "" : ` (access key "${keys[i]})"`}.`
		}, nameElt);
	}), diagnostic.source && crelt$1("div", { class: "cm-diagnosticSource" }, diagnostic.source));
}
var DiagnosticWidget = class extends WidgetType {
	constructor(sev) {
		super();
		this.sev = sev;
	}
	eq(other) {
		return other.sev == this.sev;
	}
	toDOM() {
		return crelt$1("span", { class: "cm-lintPoint cm-lintPoint-" + this.sev });
	}
};
var PanelItem = class {
	constructor(view, diagnostic) {
		this.diagnostic = diagnostic;
		this.id = "item_" + Math.floor(Math.random() * 4294967295).toString(16);
		this.dom = renderDiagnostic(view, diagnostic, true);
		this.dom.id = this.id;
		this.dom.setAttribute("role", "option");
	}
};
var LintPanel = class LintPanel {
	constructor(view) {
		this.view = view;
		this.items = [];
		let onkeydown = (event) => {
			if (event.ctrlKey || event.altKey || event.metaKey) return;
			if (event.keyCode == 27) {
				closeLintPanel(this.view);
				this.view.focus();
			} else if (event.keyCode == 38 || event.keyCode == 33) this.moveSelection((this.selectedIndex - 1 + this.items.length) % this.items.length);
			else if (event.keyCode == 40 || event.keyCode == 34) this.moveSelection((this.selectedIndex + 1) % this.items.length);
			else if (event.keyCode == 36) this.moveSelection(0);
			else if (event.keyCode == 35) this.moveSelection(this.items.length - 1);
			else if (event.keyCode == 13) this.view.focus();
			else if (event.keyCode >= 65 && event.keyCode <= 90 && this.selectedIndex >= 0) {
				let { diagnostic } = this.items[this.selectedIndex], keys = assignKeys(diagnostic.actions);
				for (let i = 0; i < keys.length; i++) if (keys[i].toUpperCase().charCodeAt(0) == event.keyCode) {
					let found = findDiagnostic(this.view.state.field(lintState).diagnostics, diagnostic);
					if (found) diagnostic.actions[i].apply(view, found.from, found.to);
				}
			} else return;
			event.preventDefault();
		};
		let onclick = (event) => {
			for (let i = 0; i < this.items.length; i++) if (this.items[i].dom.contains(event.target)) this.moveSelection(i);
		};
		this.list = crelt$1("ul", {
			tabIndex: 0,
			role: "listbox",
			"aria-label": this.view.state.phrase("Diagnostics"),
			onkeydown,
			onclick
		});
		this.dom = crelt$1("div", { class: "cm-panel-lint" }, this.list, crelt$1("button", {
			type: "button",
			name: "close",
			"aria-label": this.view.state.phrase("close"),
			onclick: () => closeLintPanel(this.view)
		}, "×"));
		this.update();
	}
	get selectedIndex() {
		let selected = this.view.state.field(lintState).selected;
		if (!selected) return -1;
		for (let i = 0; i < this.items.length; i++) if (this.items[i].diagnostic == selected.diagnostic) return i;
		return -1;
	}
	update() {
		let { diagnostics, selected } = this.view.state.field(lintState);
		let i = 0, needsSync = false, newSelectedItem = null;
		let seen = /* @__PURE__ */ new Set();
		diagnostics.between(0, this.view.state.doc.length, (_start, _end, { spec }) => {
			for (let diagnostic of spec.diagnostics) {
				if (seen.has(diagnostic)) continue;
				seen.add(diagnostic);
				let found = -1, item;
				for (let j = i; j < this.items.length; j++) if (this.items[j].diagnostic == diagnostic) {
					found = j;
					break;
				}
				if (found < 0) {
					item = new PanelItem(this.view, diagnostic);
					this.items.splice(i, 0, item);
					needsSync = true;
				} else {
					item = this.items[found];
					if (found > i) {
						this.items.splice(i, found - i);
						needsSync = true;
					}
				}
				if (selected && item.diagnostic == selected.diagnostic) {
					if (!item.dom.hasAttribute("aria-selected")) {
						item.dom.setAttribute("aria-selected", "true");
						newSelectedItem = item;
					}
				} else if (item.dom.hasAttribute("aria-selected")) item.dom.removeAttribute("aria-selected");
				i++;
			}
		});
		while (i < this.items.length && !(this.items.length == 1 && this.items[0].diagnostic.from < 0)) {
			needsSync = true;
			this.items.pop();
		}
		if (this.items.length == 0) {
			this.items.push(new PanelItem(this.view, {
				from: -1,
				to: -1,
				severity: "info",
				message: this.view.state.phrase("No diagnostics")
			}));
			needsSync = true;
		}
		if (newSelectedItem) {
			this.list.setAttribute("aria-activedescendant", newSelectedItem.id);
			this.view.requestMeasure({
				key: this,
				read: () => ({
					sel: newSelectedItem.dom.getBoundingClientRect(),
					panel: this.list.getBoundingClientRect()
				}),
				write: ({ sel, panel }) => {
					let scaleY = panel.height / this.list.offsetHeight;
					if (sel.top < panel.top) this.list.scrollTop -= (panel.top - sel.top) / scaleY;
					else if (sel.bottom > panel.bottom) this.list.scrollTop += (sel.bottom - panel.bottom) / scaleY;
				}
			});
		} else if (this.selectedIndex < 0) this.list.removeAttribute("aria-activedescendant");
		if (needsSync) this.sync();
	}
	sync() {
		let domPos = this.list.firstChild;
		function rm() {
			let prev = domPos;
			domPos = prev.nextSibling;
			prev.remove();
		}
		for (let item of this.items) if (item.dom.parentNode == this.list) {
			while (domPos != item.dom) rm();
			domPos = item.dom.nextSibling;
		} else this.list.insertBefore(item.dom, domPos);
		while (domPos) rm();
	}
	moveSelection(selectedIndex) {
		if (this.selectedIndex < 0) return;
		let selection = findDiagnostic(this.view.state.field(lintState).diagnostics, this.items[selectedIndex].diagnostic);
		if (!selection) return;
		this.view.dispatch({
			selection: {
				anchor: selection.from,
				head: selection.to
			},
			scrollIntoView: true,
			effects: movePanelSelection.of(selection)
		});
	}
	static open(view) {
		return new LintPanel(view);
	}
};
function svg(content, attrs = `viewBox="0 0 40 40"`) {
	return `url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" ${attrs}>${encodeURIComponent(content)}</svg>')`;
}
function underline(color) {
	return svg(`<path d="m0 2.5 l2 -1.5 l1 0 l2 1.5 l1 0" stroke="${color}" fill="none" stroke-width=".7"/>`, `width="6" height="3"`);
}
const baseTheme = /*@__PURE__*/ EditorView.baseTheme({
	".cm-diagnostic": {
		padding: "3px 6px 3px 8px",
		marginLeft: "-1px",
		display: "block",
		whiteSpace: "pre-wrap"
	},
	".cm-diagnostic-error": { borderLeft: "5px solid #d11" },
	".cm-diagnostic-warning": { borderLeft: "5px solid orange" },
	".cm-diagnostic-info": { borderLeft: "5px solid #999" },
	".cm-diagnostic-hint": { borderLeft: "5px solid #66d" },
	".cm-diagnosticAction": {
		font: "inherit",
		border: "none",
		padding: "2px 4px",
		backgroundColor: "#444",
		color: "white",
		borderRadius: "3px",
		marginLeft: "8px",
		cursor: "pointer"
	},
	".cm-diagnosticSource": {
		fontSize: "70%",
		opacity: .7
	},
	".cm-lintRange": {
		backgroundPosition: "left bottom",
		backgroundRepeat: "repeat-x",
		paddingBottom: "0.7px"
	},
	".cm-lintRange-error": { backgroundImage: /*@__PURE__*/ underline("#d11") },
	".cm-lintRange-warning": { backgroundImage: /*@__PURE__*/ underline("orange") },
	".cm-lintRange-info": { backgroundImage: /*@__PURE__*/ underline("#999") },
	".cm-lintRange-hint": { backgroundImage: /*@__PURE__*/ underline("#66d") },
	".cm-lintRange-active": { backgroundColor: "#ffdd9980" },
	".cm-tooltip-lint": {
		padding: 0,
		margin: 0
	},
	".cm-lintPoint": {
		position: "relative",
		"&:after": {
			content: "\"\"",
			position: "absolute",
			bottom: 0,
			left: "-2px",
			borderLeft: "3px solid transparent",
			borderRight: "3px solid transparent",
			borderBottom: "4px solid #d11"
		}
	},
	".cm-lintPoint-warning": { "&:after": { borderBottomColor: "orange" } },
	".cm-lintPoint-info": { "&:after": { borderBottomColor: "#999" } },
	".cm-lintPoint-hint": { "&:after": { borderBottomColor: "#66d" } },
	".cm-panel.cm-panel-lint": {
		position: "relative",
		"& ul": {
			maxHeight: "100px",
			overflowY: "auto",
			"& [aria-selected]": {
				backgroundColor: "#ddd",
				"& u": { textDecoration: "underline" }
			},
			"&:focus [aria-selected]": {
				background_fallback: "#bdf",
				backgroundColor: "Highlight",
				color_fallback: "white",
				color: "HighlightText"
			},
			"& u": { textDecoration: "none" },
			padding: 0,
			margin: 0
		},
		"& [name=close]": {
			position: "absolute",
			top: "0",
			right: "2px",
			background: "inherit",
			border: "none",
			font: "inherit",
			padding: 0,
			margin: 0
		}
	},
	"&dark .cm-lintRange-active": { backgroundColor: "#86714a80" },
	"&dark .cm-panel.cm-panel-lint ul": { "& [aria-selected]": { backgroundColor: "#2e343e" } }
});
function severityWeight(sev) {
	return sev == "error" ? 4 : sev == "warning" ? 3 : sev == "info" ? 2 : 1;
}
function maxSeverity(diagnostics) {
	let sev = "hint", weight = 1;
	for (let d of diagnostics) {
		let w = severityWeight(d.severity);
		if (w > weight) {
			weight = w;
			sev = d.severity;
		}
	}
	return sev;
}
const lintExtensions = [
	lintState,
	/*@__PURE__*/ EditorView.decorations.compute([lintState], (state) => {
		let { selected, panel } = state.field(lintState);
		return !selected || !panel || selected.from == selected.to ? Decoration.none : Decoration.set([activeMark.range(selected.from, selected.to)]);
	}),
	/*@__PURE__*/ hoverTooltip(lintTooltip, { hideOn: hideTooltip }),
	baseTheme
];
//#endregion
//#region ../../node_modules/.pnpm/@uiw+codemirror-extensions-basic-setup@4.25.7_@codemirror+autocomplete@6.20.1_@codemirr_c956a800fa7abbabb07b2a2a14d4c5fe/node_modules/@uiw/codemirror-extensions-basic-setup/esm/index.js
/**
This is an extension value that just pulls together a number of
extensions that you might want in a basic editor. It is meant as a
convenient helper to quickly set up CodeMirror without installing
and importing a lot of separate packages.

Specifically, it includes...

- [the default command bindings](https://codemirror.net/6/docs/ref/#commands.defaultKeymap)
- [line numbers](https://codemirror.net/6/docs/ref/#view.lineNumbers)
- [special character highlighting](https://codemirror.net/6/docs/ref/#view.highlightSpecialChars)
- [the undo history](https://codemirror.net/6/docs/ref/#commands.history)
- [a fold gutter](https://codemirror.net/6/docs/ref/#language.foldGutter)
- [custom selection drawing](https://codemirror.net/6/docs/ref/#view.drawSelection)
- [drop cursor](https://codemirror.net/6/docs/ref/#view.dropCursor)
- [multiple selections](https://codemirror.net/6/docs/ref/#state.EditorState^allowMultipleSelections)
- [reindentation on input](https://codemirror.net/6/docs/ref/#language.indentOnInput)
- [the default highlight style](https://codemirror.net/6/docs/ref/#language.defaultHighlightStyle) (as fallback)
- [bracket matching](https://codemirror.net/6/docs/ref/#language.bracketMatching)
- [bracket closing](https://codemirror.net/6/docs/ref/#autocomplete.closeBrackets)
- [autocompletion](https://codemirror.net/6/docs/ref/#autocomplete.autocompletion)
- [rectangular selection](https://codemirror.net/6/docs/ref/#view.rectangularSelection) and [crosshair cursor](https://codemirror.net/6/docs/ref/#view.crosshairCursor)
- [active line highlighting](https://codemirror.net/6/docs/ref/#view.highlightActiveLine)
- [active line gutter highlighting](https://codemirror.net/6/docs/ref/#view.highlightActiveLineGutter)
- [selection match highlighting](https://codemirror.net/6/docs/ref/#search.highlightSelectionMatches)
- [search](https://codemirror.net/6/docs/ref/#search.searchKeymap)
- [linting](https://codemirror.net/6/docs/ref/#lint.lintKeymap)

(You'll probably want to add some language package to your setup
too.)

This extension does not allow customization. The idea is that,
once you decide you want to configure your editor more precisely,
you take this package's source (which is just a bunch of imports
and an array literal), copy it into your own code, and adjust it
as desired.
*/
var basicSetup = function basicSetup(options) {
	if (options === void 0) options = {};
	var { crosshairCursor: initCrosshairCursor = false } = options;
	var keymaps = [];
	if (options.closeBracketsKeymap !== false) keymaps = keymaps.concat(closeBracketsKeymap);
	if (options.defaultKeymap !== false) keymaps = keymaps.concat(defaultKeymap);
	if (options.searchKeymap !== false) keymaps = keymaps.concat(searchKeymap);
	if (options.historyKeymap !== false) keymaps = keymaps.concat(historyKeymap);
	if (options.foldKeymap !== false) keymaps = keymaps.concat(foldKeymap);
	if (options.completionKeymap !== false) keymaps = keymaps.concat(completionKeymap);
	if (options.lintKeymap !== false) keymaps = keymaps.concat(lintKeymap);
	var extensions = [];
	if (options.lineNumbers !== false) extensions.push(lineNumbers());
	if (options.highlightActiveLineGutter !== false) extensions.push(highlightActiveLineGutter());
	if (options.highlightSpecialChars !== false) extensions.push(highlightSpecialChars());
	if (options.history !== false) extensions.push(history());
	if (options.foldGutter !== false) extensions.push(foldGutter());
	if (options.drawSelection !== false) extensions.push(drawSelection());
	if (options.dropCursor !== false) extensions.push(dropCursor());
	if (options.allowMultipleSelections !== false) extensions.push(EditorState.allowMultipleSelections.of(true));
	if (options.indentOnInput !== false) extensions.push(indentOnInput());
	if (options.syntaxHighlighting !== false) extensions.push(syntaxHighlighting(defaultHighlightStyle, { fallback: true }));
	if (options.bracketMatching !== false) extensions.push(bracketMatching());
	if (options.closeBrackets !== false) extensions.push(closeBrackets());
	if (options.autocompletion !== false) extensions.push(autocompletion());
	if (options.rectangularSelection !== false) extensions.push(rectangularSelection());
	if (initCrosshairCursor !== false) extensions.push(crosshairCursor());
	if (options.highlightActiveLine !== false) extensions.push(highlightActiveLine());
	if (options.highlightSelectionMatches !== false) extensions.push(highlightSelectionMatches());
	if (options.tabSize && typeof options.tabSize === "number") extensions.push(indentUnit.of(" ".repeat(options.tabSize)));
	return extensions.concat([keymap.of(keymaps.flat())]).filter(Boolean);
};
//#endregion
//#region ../../node_modules/.pnpm/@codemirror+theme-one-dark@6.1.3/node_modules/@codemirror/theme-one-dark/dist/index.js
const chalky = "#e5c07b";
const coral = "#e06c75";
const cyan = "#56b6c2";
const invalid = "#ffffff";
const ivory = "#abb2bf";
const stone = "#7d8799";
const malibu = "#61afef";
const sage = "#98c379";
const whiskey = "#d19a66";
const violet = "#c678dd";
const darkBackground = "#21252b";
const highlightBackground = "#2c313a";
const background = "#282c34";
const tooltipBackground = "#353a42";
const selection = "#3E4451";
const cursor = "#528bff";
/**
The editor theme styles for One Dark.
*/
const oneDarkTheme = /*@__PURE__*/ EditorView.theme({
	"&": {
		color: ivory,
		backgroundColor: background
	},
	".cm-content": { caretColor: cursor },
	".cm-cursor, .cm-dropCursor": { borderLeftColor: cursor },
	"&.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection": { backgroundColor: selection },
	".cm-panels": {
		backgroundColor: darkBackground,
		color: ivory
	},
	".cm-panels.cm-panels-top": { borderBottom: "2px solid black" },
	".cm-panels.cm-panels-bottom": { borderTop: "2px solid black" },
	".cm-searchMatch": {
		backgroundColor: "#72a1ff59",
		outline: "1px solid #457dff"
	},
	".cm-searchMatch.cm-searchMatch-selected": { backgroundColor: "#6199ff2f" },
	".cm-activeLine": { backgroundColor: "#6699ff0b" },
	".cm-selectionMatch": { backgroundColor: "#aafe661a" },
	"&.cm-focused .cm-matchingBracket, &.cm-focused .cm-nonmatchingBracket": { backgroundColor: "#bad0f847" },
	".cm-gutters": {
		backgroundColor: background,
		color: stone,
		border: "none"
	},
	".cm-activeLineGutter": { backgroundColor: highlightBackground },
	".cm-foldPlaceholder": {
		backgroundColor: "transparent",
		border: "none",
		color: "#ddd"
	},
	".cm-tooltip": {
		border: "none",
		backgroundColor: tooltipBackground
	},
	".cm-tooltip .cm-tooltip-arrow:before": {
		borderTopColor: "transparent",
		borderBottomColor: "transparent"
	},
	".cm-tooltip .cm-tooltip-arrow:after": {
		borderTopColor: tooltipBackground,
		borderBottomColor: tooltipBackground
	},
	".cm-tooltip-autocomplete": { "& > ul > li[aria-selected]": {
		backgroundColor: highlightBackground,
		color: ivory
	} }
}, { dark: true });
/**
The highlighting style for code in the One Dark theme.
*/
const oneDarkHighlightStyle = /*@__PURE__*/ HighlightStyle.define([
	{
		tag: tags.keyword,
		color: violet
	},
	{
		tag: [
			tags.name,
			tags.deleted,
			tags.character,
			tags.propertyName,
			tags.macroName
		],
		color: coral
	},
	{
		tag: [/*@__PURE__*/ tags.function(tags.variableName), tags.labelName],
		color: malibu
	},
	{
		tag: [
			tags.color,
			/*@__PURE__*/ tags.constant(tags.name),
			/*@__PURE__*/ tags.standard(tags.name)
		],
		color: whiskey
	},
	{
		tag: [/*@__PURE__*/ tags.definition(tags.name), tags.separator],
		color: ivory
	},
	{
		tag: [
			tags.typeName,
			tags.className,
			tags.number,
			tags.changed,
			tags.annotation,
			tags.modifier,
			tags.self,
			tags.namespace
		],
		color: chalky
	},
	{
		tag: [
			tags.operator,
			tags.operatorKeyword,
			tags.url,
			tags.escape,
			tags.regexp,
			tags.link,
			/*@__PURE__*/ tags.special(tags.string)
		],
		color: cyan
	},
	{
		tag: [tags.meta, tags.comment],
		color: stone
	},
	{
		tag: tags.strong,
		fontWeight: "bold"
	},
	{
		tag: tags.emphasis,
		fontStyle: "italic"
	},
	{
		tag: tags.strikethrough,
		textDecoration: "line-through"
	},
	{
		tag: tags.link,
		color: stone,
		textDecoration: "underline"
	},
	{
		tag: tags.heading,
		fontWeight: "bold",
		color: coral
	},
	{
		tag: [
			tags.atom,
			tags.bool,
			/*@__PURE__*/ tags.special(tags.variableName)
		],
		color: whiskey
	},
	{
		tag: [
			tags.processingInstruction,
			tags.string,
			tags.inserted
		],
		color: sage
	},
	{
		tag: tags.invalid,
		color: invalid
	}
]);
/**
Extension to enable the One Dark theme (both the editor theme and
the highlight style).
*/
const oneDark = [oneDarkTheme, /*@__PURE__*/ syntaxHighlighting(oneDarkHighlightStyle)];
//#endregion
//#region ../../node_modules/.pnpm/@uiw+react-codemirror@4.25.7_@babel+runtime@7.29.7_@codemirror+autocomplete@6.20.1_@cod_1534a1796e572d79d7155c9efe7d6527/node_modules/@uiw/react-codemirror/esm/theme/light.js
var defaultLightThemeOption = EditorView.theme({ "&": { backgroundColor: "#fff" } }, { dark: false });
//#endregion
//#region ../../node_modules/.pnpm/@uiw+react-codemirror@4.25.7_@babel+runtime@7.29.7_@codemirror+autocomplete@6.20.1_@cod_1534a1796e572d79d7155c9efe7d6527/node_modules/@uiw/react-codemirror/esm/getDefaultExtensions.js
var getDefaultExtensions = function getDefaultExtensions(optios) {
	if (optios === void 0) optios = {};
	var { indentWithTab: defaultIndentWithTab = true, editable = true, readOnly = false, theme = "light", placeholder: placeholderStr = "", basicSetup: defaultBasicSetup = true } = optios;
	var getExtensions = [];
	if (defaultIndentWithTab) getExtensions.unshift(keymap.of([indentWithTab]));
	if (defaultBasicSetup) {
		if (typeof defaultBasicSetup === "boolean") getExtensions.unshift(basicSetup());
		else getExtensions.unshift(basicSetup(defaultBasicSetup));
	}
	if (placeholderStr) getExtensions.unshift(placeholder(placeholderStr));
	switch (theme) {
		case "light":
			getExtensions.push(defaultLightThemeOption);
			break;
		case "dark":
			getExtensions.push(oneDark);
			break;
		case "none": break;
		default: getExtensions.push(theme);
	}
	if (editable === false) getExtensions.push(EditorView.editable.of(false));
	if (readOnly) getExtensions.push(EditorState.readOnly.of(true));
	return [...getExtensions];
};
//#endregion
//#region ../../node_modules/.pnpm/@uiw+react-codemirror@4.25.7_@babel+runtime@7.29.7_@codemirror+autocomplete@6.20.1_@cod_1534a1796e572d79d7155c9efe7d6527/node_modules/@uiw/react-codemirror/esm/utils.js
var getStatistics = (view) => {
	return {
		line: view.state.doc.lineAt(view.state.selection.main.from),
		lineCount: view.state.doc.lines,
		lineBreak: view.state.lineBreak,
		length: view.state.doc.length,
		readOnly: view.state.readOnly,
		tabSize: view.state.tabSize,
		selection: view.state.selection,
		selectionAsSingle: view.state.selection.asSingle().main,
		ranges: view.state.selection.ranges,
		selectionCode: view.state.sliceDoc(view.state.selection.main.from, view.state.selection.main.to),
		selections: view.state.selection.ranges.map((r) => view.state.sliceDoc(r.from, r.to)),
		selectedText: view.state.selection.ranges.some((r) => !r.empty)
	};
};
//#endregion
//#region ../../node_modules/.pnpm/@uiw+react-codemirror@4.25.7_@babel+runtime@7.29.7_@codemirror+autocomplete@6.20.1_@cod_1534a1796e572d79d7155c9efe7d6527/node_modules/@uiw/react-codemirror/esm/timeoutLatch.js
var TimeoutLatch = class {
	constructor(callback, timeoutMS) {
		this.timeLeftMS = void 0;
		this.timeoutMS = void 0;
		this.isCancelled = false;
		this.isTimeExhausted = false;
		this.callbacks = [];
		this.timeLeftMS = timeoutMS;
		this.timeoutMS = timeoutMS;
		this.callbacks.push(callback);
	}
	tick() {
		if (!this.isCancelled && !this.isTimeExhausted) {
			this.timeLeftMS--;
			if (this.timeLeftMS <= 0) {
				this.isTimeExhausted = true;
				var callbacks = this.callbacks.slice();
				this.callbacks.length = 0;
				callbacks.forEach((callback) => {
					try {
						callback();
					} catch (error) {
						console.error("TimeoutLatch callback error:", error);
					}
				});
			}
		}
	}
	cancel() {
		this.isCancelled = true;
		this.callbacks.length = 0;
	}
	reset() {
		this.timeLeftMS = this.timeoutMS;
		this.isCancelled = false;
		this.isTimeExhausted = false;
	}
	get isDone() {
		return this.isCancelled || this.isTimeExhausted;
	}
};
var Scheduler = class {
	constructor() {
		this.interval = null;
		this.latches = /* @__PURE__ */ new Set();
	}
	add(latch) {
		this.latches.add(latch);
		this.start();
	}
	remove(latch) {
		this.latches.delete(latch);
		if (this.latches.size === 0) this.stop();
	}
	start() {
		if (this.interval === null) this.interval = setInterval(() => {
			this.latches.forEach((latch) => {
				latch.tick();
				if (latch.isDone) this.remove(latch);
			});
		}, 1);
	}
	stop() {
		if (this.interval !== null) {
			clearInterval(this.interval);
			this.interval = null;
		}
	}
};
var globalScheduler = null;
var getScheduler = () => {
	if (typeof window === "undefined") return new Scheduler();
	if (!globalScheduler) globalScheduler = new Scheduler();
	return globalScheduler;
};
//#endregion
//#region ../../node_modules/.pnpm/@uiw+react-codemirror@4.25.7_@babel+runtime@7.29.7_@codemirror+autocomplete@6.20.1_@cod_1534a1796e572d79d7155c9efe7d6527/node_modules/@uiw/react-codemirror/esm/useCodeMirror.js
var ExternalChange = Annotation.define();
var TYPING_TIMOUT = 200;
var emptyExtensions = [];
function useCodeMirror(props) {
	var { value, selection, onChange, onStatistics, onCreateEditor, onUpdate, extensions = emptyExtensions, autoFocus, theme = "light", height = null, minHeight = null, maxHeight = null, width = null, minWidth = null, maxWidth = null, placeholder: placeholderStr = "", editable = true, readOnly = false, indentWithTab: defaultIndentWithTab = true, basicSetup: defaultBasicSetup = true, root, initialState } = props;
	var [container, setContainer] = useState();
	var [view, setView] = useState();
	var [state, setState] = useState();
	var typingLatch = useState(() => ({ current: null }))[0];
	var pendingUpdate = useState(() => ({ current: null }))[0];
	var defaultThemeOption = EditorView.theme({
		"&": {
			height,
			minHeight,
			maxHeight,
			width,
			minWidth,
			maxWidth
		},
		"& .cm-scroller": { height: "100% !important" }
	});
	var getExtensions = [
		EditorView.updateListener.of((vu) => {
			if (vu.docChanged && typeof onChange === "function" && !vu.transactions.some((tr) => tr.annotation(ExternalChange))) {
				if (typingLatch.current) typingLatch.current.reset();
				else {
					typingLatch.current = new TimeoutLatch(() => {
						if (pendingUpdate.current) {
							var forceUpdate = pendingUpdate.current;
							pendingUpdate.current = null;
							forceUpdate();
						}
						typingLatch.current = null;
					}, TYPING_TIMOUT);
					getScheduler().add(typingLatch.current);
				}
				onChange(vu.state.doc.toString(), vu);
			}
			onStatistics && onStatistics(getStatistics(vu));
		}),
		defaultThemeOption,
		...getDefaultExtensions({
			theme,
			editable,
			readOnly,
			placeholder: placeholderStr,
			indentWithTab: defaultIndentWithTab,
			basicSetup: defaultBasicSetup
		})
	];
	if (onUpdate && typeof onUpdate === "function") getExtensions.push(EditorView.updateListener.of(onUpdate));
	getExtensions = getExtensions.concat(extensions);
	useLayoutEffect(() => {
		if (container && !state) {
			var config = {
				doc: value,
				selection,
				extensions: getExtensions
			};
			var stateCurrent = initialState ? EditorState.fromJSON(initialState.json, config, initialState.fields) : EditorState.create(config);
			setState(stateCurrent);
			if (!view) {
				var viewCurrent = new EditorView({
					state: stateCurrent,
					parent: container,
					root
				});
				setView(viewCurrent);
				onCreateEditor && onCreateEditor(viewCurrent, stateCurrent);
			}
		}
		return () => {
			if (view) {
				setState(void 0);
				setView(void 0);
			}
		};
	}, [container, state]);
	useEffect(() => {
		if (props.container) setContainer(props.container);
	}, [props.container]);
	useEffect(() => () => {
		if (view) {
			view.destroy();
			setView(void 0);
		}
		if (typingLatch.current) {
			typingLatch.current.cancel();
			typingLatch.current = null;
		}
	}, [view]);
	useEffect(() => {
		if (autoFocus && view) view.focus();
	}, [autoFocus, view]);
	useEffect(() => {
		if (view) view.dispatch({ effects: StateEffect.reconfigure.of(getExtensions) });
	}, [
		theme,
		extensions,
		height,
		minHeight,
		maxHeight,
		width,
		minWidth,
		maxWidth,
		placeholderStr,
		editable,
		readOnly,
		defaultIndentWithTab,
		defaultBasicSetup,
		onChange,
		onUpdate
	]);
	useEffect(() => {
		if (value === void 0) return;
		var currentValue = view ? view.state.doc.toString() : "";
		if (view && value !== currentValue) {
			var isTyping = typingLatch.current && !typingLatch.current.isDone;
			var forceUpdate = () => {
				if (view && value !== view.state.doc.toString()) view.dispatch({
					changes: {
						from: 0,
						to: view.state.doc.toString().length,
						insert: value || ""
					},
					annotations: [ExternalChange.of(true)]
				});
			};
			if (!isTyping) forceUpdate();
			else pendingUpdate.current = forceUpdate;
		}
	}, [value, view]);
	return {
		state,
		setState,
		view,
		setView,
		container,
		setContainer
	};
}
//#endregion
//#region ../../node_modules/.pnpm/@uiw+react-codemirror@4.25.7_@babel+runtime@7.29.7_@codemirror+autocomplete@6.20.1_@cod_1534a1796e572d79d7155c9efe7d6527/node_modules/@uiw/react-codemirror/esm/index.js
var _excluded = [
	"className",
	"value",
	"selection",
	"extensions",
	"onChange",
	"onStatistics",
	"onCreateEditor",
	"onUpdate",
	"autoFocus",
	"theme",
	"height",
	"minHeight",
	"maxHeight",
	"width",
	"minWidth",
	"maxWidth",
	"basicSetup",
	"placeholder",
	"indentWithTab",
	"editable",
	"readOnly",
	"root",
	"initialState"
];
var ReactCodeMirror = /*#__PURE__*/ forwardRef((props, ref) => {
	var { className, value = "", selection, extensions = [], onChange, onStatistics, onCreateEditor, onUpdate, autoFocus, theme = "light", height, minHeight, maxHeight, width, minWidth, maxWidth, basicSetup, placeholder, indentWithTab, editable, readOnly, root, initialState } = props, other = (0, import_objectWithoutPropertiesLoose.default)(props, _excluded);
	var editor = useRef(null);
	var { state, view, container, setContainer } = useCodeMirror({
		root,
		value,
		autoFocus,
		theme,
		height,
		minHeight,
		maxHeight,
		width,
		minWidth,
		maxWidth,
		basicSetup,
		placeholder,
		indentWithTab,
		editable,
		readOnly,
		selection,
		onChange,
		onStatistics,
		onCreateEditor,
		onUpdate,
		extensions,
		initialState
	});
	useImperativeHandle(ref, () => ({
		editor: editor.current,
		state,
		view
	}), [
		editor,
		container,
		state,
		view
	]);
	var setEditorRef = useCallback((el) => {
		editor.current = el;
		setContainer(el);
	}, [setContainer]);
	if (typeof value !== "string") throw new Error("value must be typeof string but got " + typeof value);
	var defaultClassNames = typeof theme === "string" ? "cm-theme-" + theme : "cm-theme";
	return /*#__PURE__*/ jsx("div", (0, import_extends.default)({
		ref: setEditorRef,
		className: "" + defaultClassNames + (className ? " " + className : "")
	}, other));
});
ReactCodeMirror.displayName = "CodeMirror";
//#endregion
//#region src/components/composites/code-editor/hooks.ts
/** 语言对应的 linter 加载器
* key: 语言文件扩展名（不包含 `.`）
*/
const linterLoaders = { json: async () => {
	return linter((await import("./dist-C5T8mdAZ.mjs").then((mod) => mod.jsonParseLinter))());
} };
/**
* 加载 linter 扩展
*/
async function loadLinterExtension(language, languageConfig) {
	const fileExt = await getNormalizedExtension(language, languageConfig);
	const loader = linterLoaders[fileExt];
	if (!loader) return null;
	try {
		return await loader();
	} catch (error) {
		console.debug(`Failed to load linter for ${language} (${fileExt})`, error);
		return null;
	}
}
/**
* 加载语言相关扩展
*/
const useLanguageExtensions = (language, lint, languageConfig) => {
	const [extensions, setExtensions] = useState([]);
	useEffect(() => {
		let cancelled = false;
		const loadAllExtensions = async () => {
			try {
				const [languageResult, linterResult] = await Promise.allSettled([loadCodeBlockLanguage(language, languageConfig), lint ? loadLinterExtension(language, languageConfig) : Promise.resolve(null)]);
				if (cancelled) return;
				const results = [];
				if (languageResult.status === "fulfilled" && languageResult.value) results.push(languageResult.value);
				if (linterResult.status === "fulfilled" && linterResult.value) results.push(linterResult.value);
				setExtensions(results);
			} catch (error) {
				if (!cancelled) {
					console.debug("Failed to load language extensions:", error);
					setExtensions([]);
				}
			}
		};
		loadAllExtensions();
		return () => {
			cancelled = true;
		};
	}, [
		language,
		lint,
		languageConfig
	]);
	return extensions;
};
/**
* CodeMirror 扩展，用于处理保存快捷键 (Cmd/Ctrl + S)
* @param onSave 保存时触发的回调函数
* @param enabled 是否启用此快捷键
* @returns 扩展或空数组
*/
function useSaveKeymap({ onSave, enabled = true }) {
	return useMemo(() => {
		if (!enabled || !onSave) return [];
		return keymap.of([{
			key: "Mod-s",
			run: (view) => {
				onSave(view.state.sliceDoc());
				return true;
			},
			preventDefault: true
		}]);
	}, [onSave, enabled]);
}
/**
* CodeMirror 扩展，用于处理编辑器的 blur 事件
* @param onBlur blur 事件触发时的回调函数
* @returns 扩展或空数组
*/
function useBlurHandler({ onBlur }) {
	return useMemo(() => {
		if (!onBlur) return [];
		return EditorView.domEventHandlers({ blur: (_event, view) => {
			onBlur(view.state.sliceDoc());
		} });
	}, [onBlur]);
}
/**
* CodeMirror 扩展，用于监听编辑器高度变化
* @param onHeightChange 高度变化时触发的回调函数
* @returns 扩展或空数组
*/
function useHeightListener({ onHeightChange }) {
	return useMemo(() => {
		if (!onHeightChange) return [];
		return EditorView.updateListener.of((update) => {
			if (update.docChanged || update.heightChanged) onHeightChange(update.view.scrollDOM?.scrollHeight ?? 0);
		});
	}, [onHeightChange]);
}
function useScrollToLine(editorViewRef) {
	const findLineElement = useCallback((view, position) => {
		let node = view.domAtPos(position).node;
		if (node.nodeType === Node.TEXT_NODE) node = node.parentElement;
		while (node) {
			if (node instanceof HTMLElement && node.classList.contains("cm-line")) return node;
			node = node.parentElement;
		}
		return null;
	}, []);
	const highlightLine = useCallback((view, element) => {
		const previousHighlight = view.dom.querySelector(".animation-locate-highlight");
		if (previousHighlight) previousHighlight.classList.remove("animation-locate-highlight");
		element.classList.add("animation-locate-highlight");
		const handleAnimationEnd = () => {
			element.classList.remove("animation-locate-highlight");
			element.removeEventListener("animationend", handleAnimationEnd);
		};
		element.addEventListener("animationend", handleAnimationEnd);
	}, []);
	return useCallback((lineNumber, options) => {
		const view = editorViewRef.current;
		if (!view) return;
		const targetLine = view.state.doc.line(Math.min(lineNumber, view.state.doc.lines));
		const lineElement = findLineElement(view, targetLine.from);
		if (lineElement) {
			lineElement.scrollIntoView({
				behavior: "smooth",
				block: "center",
				inline: "nearest"
			});
			if (options?.highlight) requestAnimationFrame(() => highlightLine(view, lineElement));
			return;
		}
		view.dispatch({ effects: EditorView.scrollIntoView(targetLine.from, { y: "start" }) });
		if (!options?.highlight) return;
		setTimeout(() => {
			const fallbackElement = findLineElement(view, targetLine.from);
			if (fallbackElement) highlightLine(view, fallbackElement);
		}, 200);
	}, [
		editorViewRef,
		findLineElement,
		highlightLine
	]);
}
//#endregion
//#region src/components/composites/code-editor/code-editor.tsx
function toDocumentText(source) {
	return Text.of(source.split(/\r\n?|\n/));
}
const codeEditorLineBreakFilter = EditorState.transactionFilter.of((transaction) => {
	const changes = [];
	transaction.changes.iterChanges((_from, _to, from, to, inserted) => {
		const normalized = toDocumentText(inserted.toString());
		if (!inserted.eq(normalized)) changes.push({
			from,
			to,
			insert: normalized
		});
	});
	return changes.length ? [transaction, {
		changes,
		sequential: true
	}] : transaction;
});
const codeEditorGutterTheme = EditorView.theme({
	".cm-gutters": {
		backgroundColor: "transparent",
		borderRight: "none",
		color: "var(--muted-foreground)"
	},
	".cm-activeLineGutter": { backgroundColor: "transparent" }
});
/**
* A code editor component based on CodeMirror.
* This is a wrapper of ReactCodeMirror.
*/
const CodeEditor = ({ ref, stateRef, syntaxHighlightStyle, value, placeholder, autoFocus, language, languageConfig, onSave, onChange, onBlur, onHeightChange, height, maxHeight, minHeight, options, extensions, theme = "light", fontSize = 16, style, className, editable = true, readOnly = false, expanded = true, wrapped = true, autoScrollToBottom = false }) => {
	const basicSetup = useMemo(() => {
		return {
			dropCursor: true,
			allowMultipleSelections: true,
			indentOnInput: true,
			bracketMatching: true,
			closeBrackets: true,
			rectangularSelection: true,
			crosshairCursor: true,
			highlightActiveLineGutter: false,
			highlightSelectionMatches: true,
			closeBracketsKeymap: options?.keymap,
			searchKeymap: options?.keymap,
			foldKeymap: options?.keymap,
			completionKeymap: options?.keymap,
			lintKeymap: options?.keymap,
			...options
		};
	}, [options]);
	const initialContent = useRef(options?.stream && !syntaxHighlightStyle ? (value ?? "").trimEnd() : value ?? "");
	const lineBreak = initialContent.current.includes("\r\n") ? "\r\n" : "\n";
	const [initialState] = useState(() => {
		const retained = stateRef?.current;
		return {
			json: (retained?.sliceDoc() === initialContent.current ? retained : EditorState.create({
				doc: toDocumentText(initialContent.current),
				extensions: [EditorState.lineSeparator.of(lineBreak)]
			})).toJSON({
				history: historyField,
				folds: foldState
			}),
			fields: {
				history: historyField,
				folds: foldState
			}
		};
	});
	const editorViewRef = useRef(null);
	const shouldStickToBottomRef = useRef(true);
	const autoScrollToBottomRef = useRef(autoScrollToBottom);
	const expandedRef = useRef(expanded);
	const scrollCleanupRef = useRef(null);
	const langExtensions = useLanguageExtensions(language, options?.lint, languageConfig);
	const handleSave = useCallback(() => {
		const currentDoc = editorViewRef.current?.state.sliceDoc() ?? "";
		onSave?.(currentDoc);
	}, [onSave]);
	const insertText = useCallback((text) => {
		const editorView = editorViewRef.current;
		if (!editorView) return false;
		editorView.dispatch(editorView.state.replaceSelection(text));
		editorView.focus();
		return true;
	}, []);
	const getSelection = useCallback(() => {
		const editorView = editorViewRef.current;
		if (!editorView) return null;
		const { from, to } = editorView.state.selection.main;
		return {
			from,
			to,
			text: editorView.state.sliceDoc(from, to)
		};
	}, []);
	const replaceRange = useCallback((range, text) => {
		const editorView = editorViewRef.current;
		if (!editorView || !editorView.state.facet(EditorView.editable) || editorView.state.readOnly || !Number.isInteger(range.from) || !Number.isInteger(range.to) || range.from < 0 || range.to < range.from || range.to > editorView.state.doc.length) return false;
		const insert = editorView.state.toText(text);
		editorView.dispatch({
			changes: {
				from: range.from,
				to: range.to,
				insert
			},
			selection: { anchor: range.from + insert.length }
		});
		editorView.focus();
		return true;
	}, []);
	const focus = useCallback(() => {
		editorViewRef.current?.focus();
	}, []);
	useEffect(() => {
		autoScrollToBottomRef.current = autoScrollToBottom;
		expandedRef.current = expanded;
		if (!autoScrollToBottom || expanded) shouldStickToBottomRef.current = true;
	}, [autoScrollToBottom, expanded]);
	const updateShouldStickToBottom = useCallback((scrollElement) => {
		const distanceToBottom = scrollElement.scrollHeight - scrollElement.scrollTop - scrollElement.clientHeight;
		shouldStickToBottomRef.current = distanceToBottom <= 8;
	}, []);
	const scrollToDocumentBottom = useCallback((view) => {
		view.dispatch({ effects: EditorView.scrollIntoView(view.state.doc.length, {
			y: "end",
			x: "nearest"
		}) });
	}, []);
	useEffect(() => {
		if (!editorViewRef.current) return;
		const newContent = options?.stream && !syntaxHighlightStyle ? (value ?? "").trimEnd() : value ?? "";
		const currentDoc = editorViewRef.current.state.doc.toString();
		const nextDoc = toDocumentText(newContent);
		const changes = prepareCodeChanges(currentDoc, nextDoc.toString()).map((change) => ({
			...change,
			insert: toDocumentText(change.insert)
		}));
		if (changes && changes.length > 0) {
			const shouldScrollToBottom = autoScrollToBottom && !expanded && shouldStickToBottomRef.current;
			editorViewRef.current.dispatch({
				changes,
				annotations: [ExternalChange.of(true)],
				...shouldScrollToBottom ? { effects: EditorView.scrollIntoView(nextDoc.length, {
					y: "end",
					x: "nearest"
				}) } : {}
			});
		}
	}, [
		autoScrollToBottom,
		expanded,
		options?.stream,
		value,
		syntaxHighlightStyle
	]);
	const saveKeymapExtension = useSaveKeymap({
		onSave,
		enabled: options?.keymap
	});
	const blurExtension = useBlurHandler({ onBlur });
	const heightListenerExtension = useHeightListener({ onHeightChange });
	const customExtensions = useMemo(() => {
		return [
			...extensions ?? [],
			EditorState.lineSeparator.of(lineBreak),
			codeEditorLineBreakFilter,
			...syntaxHighlightStyle ? [
				syntaxHighlighting(syntaxHighlightStyle),
				EditorState.tabSize.of(2),
				gutters({ fixed: false })
			] : [],
			...langExtensions,
			...wrapped ? [EditorView.lineWrapping] : [],
			codeEditorGutterTheme,
			saveKeymapExtension,
			blurExtension,
			heightListenerExtension
		].flat();
	}, [
		extensions,
		langExtensions,
		wrapped,
		saveKeymapExtension,
		blurExtension,
		heightListenerExtension,
		syntaxHighlightStyle,
		lineBreak
	]);
	const sharedTheme = useMemo(() => EditorView.theme({
		"&": {
			backgroundColor: "transparent",
			color: "var(--code-foreground)"
		},
		".cm-scroller": {
			fontFamily: "var(--code-font-family)",
			lineHeight: `${Math.round(fontSize * 1.6)}px`
		},
		".cm-scroller .cm-content": {
			padding: `${Math.round(fontSize / 2)}px 1em`,
			lineHeight: "inherit",
			caretColor: "var(--code-caret)"
		},
		".cm-line": { padding: "0" },
		".cm-scroller:has(.cm-gutters) .cm-content": { paddingLeft: "0" },
		".cm-scroller .cm-gutters": {
			lineHeight: "inherit",
			padding: "0 0 0 1em",
			backgroundColor: "transparent",
			border: "none",
			color: "var(--code-foreground)"
		},
		".cm-lineNumbers .cm-gutterElement": {
			padding: "0",
			minWidth: "0",
			opacity: "0.35",
			marginRight: "1rem",
			fontVariantNumeric: "tabular-nums"
		},
		".cm-activeLine": { backgroundColor: "color-mix(in srgb, var(--code-selection) 35%, transparent)" },
		"&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection": { backgroundColor: "var(--code-selection)" },
		".cm-cursor": { borderLeftColor: "var(--code-caret)" },
		".cm-panels": {
			color: "var(--code-foreground)",
			backgroundColor: "var(--code-background)"
		}
	}, { dark: theme === "dark" }), [theme, fontSize]);
	const handleUpdate = useCallback((update) => {
		if (stateRef) stateRef.current = update.state;
	}, [stateRef]);
	const scrollToLine = useScrollToLine(editorViewRef);
	useEffect(() => {
		if (!autoScrollToBottom || expanded || !shouldStickToBottomRef.current || !editorViewRef.current) return;
		scrollToDocumentBottom(editorViewRef.current);
	}, [
		autoScrollToBottom,
		expanded,
		scrollToDocumentBottom
	]);
	useEffect(() => {
		return () => {
			scrollCleanupRef.current?.();
			scrollCleanupRef.current = null;
			editorViewRef.current = null;
		};
	}, []);
	useImperativeHandle(ref, () => ({
		save: handleSave,
		getContent: () => editorViewRef.current?.state.sliceDoc() ?? "",
		getSelection,
		replaceRange,
		scrollToLine,
		insertText,
		focus
	}));
	return /* @__PURE__ */ jsx(ReactCodeMirror, {
		value: String(initialState.json.doc).replaceAll("\r\n", "\n"),
		placeholder,
		autoFocus,
		width: "100%",
		height: expanded ? void 0 : height,
		maxHeight: expanded ? void 0 : maxHeight,
		minHeight,
		editable,
		readOnly,
		theme: syntaxHighlightStyle ? sharedTheme : theme,
		initialState,
		onUpdate: handleUpdate,
		extensions: customExtensions,
		onCreateEditor: (view) => {
			scrollCleanupRef.current?.();
			editorViewRef.current = view;
			if (stateRef) stateRef.current = view.state;
			onHeightChange?.(view.scrollDOM?.scrollHeight ?? 0);
			const scrollElement = view.scrollDOM;
			const handleScroll = () => {
				if (autoScrollToBottomRef.current && !expandedRef.current) updateShouldStickToBottom(scrollElement);
			};
			scrollElement.addEventListener("scroll", handleScroll, { passive: true });
			scrollCleanupRef.current = () => scrollElement.removeEventListener("scroll", handleScroll);
		},
		onChange: (_value, viewUpdate) => {
			if (onChange && viewUpdate.docChanged) onChange(viewUpdate.state.sliceDoc());
		},
		basicSetup,
		style: {
			fontSize,
			marginTop: 0,
			borderRadius: "inherit",
			...expanded ? void 0 : { height },
			...style
		},
		className: `code-editor ${className ?? ""}`
	});
};
CodeEditor.displayName = "CodeEditor";
function SharedSyntaxEditor(props) {
	const language = use(loadCodeBlockLanguage(props.language, props.languageConfig));
	const extensions = useMemo(() => language ? [language, ...props.extensions ?? []] : props.extensions, [language, props.extensions]);
	return /* @__PURE__ */ jsx(CodeEditor, {
		...props,
		extensions
	});
}
var code_editor_default = memo(CodeEditor);
//#endregion
export { SharedSyntaxEditor, code_editor_default as default };
