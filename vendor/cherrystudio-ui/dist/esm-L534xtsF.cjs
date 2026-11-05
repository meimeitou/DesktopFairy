const require_avatar = require("./avatar-DqAhynaP.cjs");
const require_extends$1 = require("./extends-BCGQqsrm.cjs");
const require_dist = require("./dist-YoILAXW4.cjs");
let _codemirror_language = require("@codemirror/language");
let _lezer_highlight = require("@lezer/highlight");
//#region ../../node_modules/.pnpm/@uiw+codemirror-themes@4.25.7_@codemirror+language@6.12.2_@codemirror+state@6.5.4_@codemirror+view@6.39.16/node_modules/@uiw/codemirror-themes/esm/index.js
var import_extends = /* @__PURE__ */ require_avatar.__toESM(require_extends$1.require_extends());
var createTheme = (_ref) => {
	var { theme, settings = {}, styles = [] } = _ref;
	var themeOptions = { ".cm-gutters": {} };
	var baseStyle = {};
	if (settings.background) baseStyle.backgroundColor = settings.background;
	if (settings.backgroundImage) baseStyle.backgroundImage = settings.backgroundImage;
	if (settings.foreground) baseStyle.color = settings.foreground;
	if (settings.fontSize) baseStyle.fontSize = settings.fontSize;
	if (settings.background || settings.foreground) themeOptions["&"] = baseStyle;
	if (settings.fontFamily) themeOptions["&.cm-editor .cm-scroller"] = { fontFamily: settings.fontFamily };
	if (settings.gutterBackground) themeOptions[".cm-gutters"].backgroundColor = settings.gutterBackground;
	if (settings.gutterForeground) themeOptions[".cm-gutters"].color = settings.gutterForeground;
	if (settings.gutterBorder) themeOptions[".cm-gutters"].borderRightColor = settings.gutterBorder;
	if (settings.caret) {
		themeOptions[".cm-content"] = { caretColor: settings.caret };
		themeOptions[".cm-cursor, .cm-dropCursor"] = { borderLeftColor: settings.caret };
	}
	var activeLineGutterStyle = {};
	if (settings.gutterActiveForeground) activeLineGutterStyle.color = settings.gutterActiveForeground;
	if (settings.lineHighlight) {
		themeOptions[".cm-activeLine"] = { backgroundColor: settings.lineHighlight };
		activeLineGutterStyle.backgroundColor = settings.lineHighlight;
	}
	themeOptions[".cm-activeLineGutter"] = activeLineGutterStyle;
	if (settings.selection) themeOptions["&.cm-focused .cm-selectionBackground, & .cm-line::selection, & .cm-selectionLayer .cm-selectionBackground, .cm-content ::selection"] = { background: settings.selection + " !important" };
	if (settings.selectionMatch) themeOptions["& .cm-selectionMatch"] = { backgroundColor: settings.selectionMatch };
	var themeExtension = require_dist.EditorView.theme(themeOptions, { dark: theme === "dark" });
	var highlightStyle = _codemirror_language.HighlightStyle.define(styles);
	return [themeExtension, (0, _codemirror_language.syntaxHighlighting)(highlightStyle)];
};
//#endregion
//#region ../../node_modules/.pnpm/@uiw+codemirror-theme-abcdef@4.25.7_@codemirror+language@6.12.2_@codemirror+state@6.5.4_@codemirror+view@6.39.16/node_modules/@uiw/codemirror-theme-abcdef/esm/index.js
/**
* @name abcdef
* @author codemirror.net
* https://codemirror.net/5/theme/abcdef.css
*/
var defaultSettingsAbcdef = {
	background: "#0f0f0f",
	foreground: "#defdef",
	caret: "#00FF00",
	selection: "#515151",
	selectionMatch: "#515151",
	gutterBackground: "#555",
	gutterForeground: "#FFFFFF",
	lineHighlight: "#0a6bcb3d"
};
var abcdefDarkStyle = [
	{
		tag: _lezer_highlight.tags.keyword,
		color: "darkgoldenrod",
		fontWeight: "bold"
	},
	{
		tag: _lezer_highlight.tags.atom,
		color: "#77F"
	},
	{
		tag: _lezer_highlight.tags.comment,
		color: "#7a7b7c",
		fontStyle: "italic"
	},
	{
		tag: _lezer_highlight.tags.number,
		color: "violet"
	},
	{
		tag: _lezer_highlight.tags.definition(_lezer_highlight.tags.variableName),
		color: "#fffabc"
	},
	{
		tag: _lezer_highlight.tags.variableName,
		color: "#abcdef"
	},
	{
		tag: _lezer_highlight.tags.function(_lezer_highlight.tags.variableName),
		color: "#fffabc"
	},
	{
		tag: _lezer_highlight.tags.typeName,
		color: "#FFDD44"
	},
	{
		tag: _lezer_highlight.tags.tagName,
		color: "#def"
	},
	{
		tag: _lezer_highlight.tags.string,
		color: "#2b4"
	},
	{
		tag: _lezer_highlight.tags.meta,
		color: "#C9F"
	},
	{
		tag: _lezer_highlight.tags.bracket,
		color: "#8a8a8a"
	},
	{
		tag: _lezer_highlight.tags.attributeName,
		color: "#DDFF00"
	},
	{
		tag: _lezer_highlight.tags.heading,
		color: "aquamarine",
		fontWeight: "bold"
	},
	{
		tag: _lezer_highlight.tags.link,
		color: "blueviolet",
		fontWeight: "bold"
	}
];
var abcdefInit = (options) => {
	var { theme = "dark", settings = {}, styles = [] } = options || {};
	return createTheme({
		theme,
		settings: (0, import_extends.default)({}, defaultSettingsAbcdef, settings),
		styles: [...abcdefDarkStyle, ...styles]
	});
};
var abcdef = abcdefInit();
//#endregion
//#region ../../node_modules/.pnpm/@uiw+codemirror-theme-abyss@4.25.7_@codemirror+language@6.12.2_@codemirror+state@6.5.4_@codemirror+view@6.39.16/node_modules/@uiw/codemirror-theme-abyss/esm/color.js
var config$12 = {
	background: "#000c18",
	foreground: "#6688cc",
	selection: "#770811",
	selectionMatch: "#770811",
	cursor: "#ddbb88",
	dropdownBackground: "#181f2f",
	activeLine: "#0055ff30",
	matchingBracket: "#082050",
	keyword: "#225588",
	storage: "#225588",
	variable: "#2277ff",
	parameter: "#2277ff",
	function: "#9966b8",
	string: "#22aa44",
	constant: "#f280d0",
	type: "#9966b8",
	class: "#ddbb88",
	number: "#f280d0",
	comment: "#384887",
	heading: "#6688cc",
	invalid: "#A22D44",
	regexp: "#22aa44",
	tag: "#225588"
};
//#endregion
//#region ../../node_modules/.pnpm/@uiw+codemirror-theme-abyss@4.25.7_@codemirror+language@6.12.2_@codemirror+state@6.5.4_@codemirror+view@6.39.16/node_modules/@uiw/codemirror-theme-abyss/esm/index.js
var defaultSettingsAbyss = {
	background: config$12.background,
	foreground: config$12.foreground,
	caret: config$12.cursor,
	selection: config$12.selection,
	selectionMatch: config$12.selectionMatch,
	gutterBackground: config$12.background,
	gutterForeground: config$12.foreground,
	lineHighlight: config$12.activeLine
};
var abyssDarkStyle = [
	{
		tag: _lezer_highlight.tags.keyword,
		color: config$12.keyword
	},
	{
		tag: [
			_lezer_highlight.tags.name,
			_lezer_highlight.tags.deleted,
			_lezer_highlight.tags.character,
			_lezer_highlight.tags.macroName
		],
		color: config$12.variable
	},
	{
		tag: [_lezer_highlight.tags.propertyName],
		color: config$12.function
	},
	{
		tag: [
			_lezer_highlight.tags.processingInstruction,
			_lezer_highlight.tags.string,
			_lezer_highlight.tags.inserted,
			_lezer_highlight.tags.special(_lezer_highlight.tags.string)
		],
		color: config$12.string
	},
	{
		tag: [_lezer_highlight.tags.function(_lezer_highlight.tags.variableName), _lezer_highlight.tags.labelName],
		color: config$12.function
	},
	{
		tag: [
			_lezer_highlight.tags.color,
			_lezer_highlight.tags.constant(_lezer_highlight.tags.name),
			_lezer_highlight.tags.standard(_lezer_highlight.tags.name)
		],
		color: config$12.constant
	},
	{
		tag: [_lezer_highlight.tags.definition(_lezer_highlight.tags.name), _lezer_highlight.tags.separator],
		color: config$12.variable
	},
	{
		tag: [_lezer_highlight.tags.className],
		color: config$12.class
	},
	{
		tag: [
			_lezer_highlight.tags.number,
			_lezer_highlight.tags.changed,
			_lezer_highlight.tags.annotation,
			_lezer_highlight.tags.modifier,
			_lezer_highlight.tags.self,
			_lezer_highlight.tags.namespace
		],
		color: config$12.number
	},
	{
		tag: [_lezer_highlight.tags.typeName],
		color: config$12.type,
		fontStyle: config$12.type
	},
	{
		tag: [_lezer_highlight.tags.operator, _lezer_highlight.tags.operatorKeyword],
		color: config$12.keyword
	},
	{
		tag: [
			_lezer_highlight.tags.url,
			_lezer_highlight.tags.escape,
			_lezer_highlight.tags.regexp,
			_lezer_highlight.tags.link
		],
		color: config$12.regexp
	},
	{
		tag: [_lezer_highlight.tags.meta, _lezer_highlight.tags.comment],
		color: config$12.comment
	},
	{
		tag: _lezer_highlight.tags.tagName,
		color: config$12.tag
	},
	{
		tag: _lezer_highlight.tags.strong,
		fontWeight: "bold"
	},
	{
		tag: _lezer_highlight.tags.emphasis,
		fontStyle: "italic"
	},
	{
		tag: _lezer_highlight.tags.link,
		textDecoration: "underline"
	},
	{
		tag: _lezer_highlight.tags.heading,
		fontWeight: "bold",
		color: config$12.heading
	},
	{
		tag: [
			_lezer_highlight.tags.atom,
			_lezer_highlight.tags.bool,
			_lezer_highlight.tags.special(_lezer_highlight.tags.variableName)
		],
		color: config$12.variable
	},
	{
		tag: _lezer_highlight.tags.invalid,
		color: config$12.invalid
	},
	{
		tag: _lezer_highlight.tags.strikethrough,
		textDecoration: "line-through"
	}
];
var abyssInit = (options) => {
	var { theme = "dark", settings = {}, styles = [] } = options || {};
	return createTheme({
		theme,
		settings: (0, import_extends.default)({}, defaultSettingsAbyss, settings),
		styles: [...abyssDarkStyle, ...styles]
	});
};
var abyss = abyssInit();
//#endregion
//#region ../../node_modules/.pnpm/@uiw+codemirror-theme-androidstudio@4.25.7_@codemirror+language@6.12.2_@codemirror+state@6.5.4_@codemirror+view@6.39.16/node_modules/@uiw/codemirror-theme-androidstudio/esm/index.js
/**
* @name androidstudio
*/
var defaultSettingsAndroidstudio = {
	background: "#282b2e",
	foreground: "#a9b7c6",
	caret: "#00FF00",
	selection: "#4e5254",
	selectionMatch: "#4e5254",
	lineHighlight: "#7f85891f"
};
var androidstudioDarkStyle = [
	{
		tag: [
			_lezer_highlight.tags.keyword,
			_lezer_highlight.tags.deleted,
			_lezer_highlight.tags.className
		],
		color: "#cc7832"
	},
	{
		tag: [
			_lezer_highlight.tags.number,
			_lezer_highlight.tags.literal,
			_lezer_highlight.tags.derefOperator
		],
		color: "#6897bb"
	},
	{
		tag: [_lezer_highlight.tags.link, _lezer_highlight.tags.variableName],
		color: "#629755"
	},
	{
		tag: [_lezer_highlight.tags.comment, _lezer_highlight.tags.quote],
		color: "grey"
	},
	{
		tag: [_lezer_highlight.tags.meta, _lezer_highlight.tags.documentMeta],
		color: "#bbb529"
	},
	{
		tag: [
			_lezer_highlight.tags.string,
			_lezer_highlight.tags.propertyName,
			_lezer_highlight.tags.attributeValue
		],
		color: "#6a8759"
	},
	{
		tag: [_lezer_highlight.tags.heading, _lezer_highlight.tags.typeName],
		color: "#ffc66d"
	},
	{
		tag: [_lezer_highlight.tags.attributeName],
		color: "#a9b7c6"
	},
	{
		tag: [_lezer_highlight.tags.emphasis],
		fontStyle: "italic"
	}
];
var androidstudioInit = (options) => {
	var { theme = "dark", settings = {}, styles = [] } = options || {};
	return createTheme({
		theme,
		settings: (0, import_extends.default)({}, defaultSettingsAndroidstudio, settings),
		styles: [...androidstudioDarkStyle, ...styles]
	});
};
var androidstudio = androidstudioInit();
//#endregion
//#region ../../node_modules/.pnpm/@uiw+codemirror-theme-andromeda@4.25.7_@codemirror+language@6.12.2_@codemirror+state@6.5.4_@codemirror+view@6.39.16/node_modules/@uiw/codemirror-theme-andromeda/esm/color.js
var config$11 = {
	background: "#23262E",
	foreground: "#D5CED9",
	selection: "#db45a280",
	selectionMatch: "#db45a280",
	cursor: "#FFF",
	dropdownBackground: "#2b303b",
	dropdownBorder: "#363c49",
	activeLine: "#596a992e",
	matchingBracket: "#746f77",
	keyword: "#c74ded",
	storage: "#c74ded",
	variable: "#00e8c6",
	parameter: "#00e8c6",
	function: "#FFE66D",
	string: "#96E072",
	constant: "#ee5d43",
	type: "#FFE66D",
	class: "#FFE66D",
	number: "#ee5d43",
	comment: "#A0A1A7cc",
	heading: "#ff00aa",
	invalid: null,
	regexp: "#96E072",
	tag: "#f92672"
};
//#endregion
//#region ../../node_modules/.pnpm/@uiw+codemirror-theme-andromeda@4.25.7_@codemirror+language@6.12.2_@codemirror+state@6.5.4_@codemirror+view@6.39.16/node_modules/@uiw/codemirror-theme-andromeda/esm/index.js
var defaultSettingsAndromeda = {
	background: config$11.background,
	foreground: config$11.foreground,
	caret: config$11.cursor,
	selection: config$11.selection,
	selectionMatch: config$11.selectionMatch,
	gutterBackground: config$11.background,
	gutterForeground: config$11.foreground,
	lineHighlight: config$11.activeLine
};
var andromedaDarkStyle = [
	{
		tag: _lezer_highlight.tags.keyword,
		color: config$11.keyword
	},
	{
		tag: [
			_lezer_highlight.tags.name,
			_lezer_highlight.tags.deleted,
			_lezer_highlight.tags.character,
			_lezer_highlight.tags.macroName
		],
		color: config$11.variable
	},
	{
		tag: [_lezer_highlight.tags.propertyName],
		color: config$11.function
	},
	{
		tag: [
			_lezer_highlight.tags.processingInstruction,
			_lezer_highlight.tags.string,
			_lezer_highlight.tags.inserted,
			_lezer_highlight.tags.special(_lezer_highlight.tags.string)
		],
		color: config$11.string
	},
	{
		tag: [_lezer_highlight.tags.function(_lezer_highlight.tags.variableName), _lezer_highlight.tags.labelName],
		color: config$11.function
	},
	{
		tag: [
			_lezer_highlight.tags.color,
			_lezer_highlight.tags.constant(_lezer_highlight.tags.name),
			_lezer_highlight.tags.standard(_lezer_highlight.tags.name)
		],
		color: config$11.constant
	},
	{
		tag: [_lezer_highlight.tags.definition(_lezer_highlight.tags.name), _lezer_highlight.tags.separator],
		color: config$11.variable
	},
	{
		tag: [_lezer_highlight.tags.className],
		color: config$11.class
	},
	{
		tag: [
			_lezer_highlight.tags.number,
			_lezer_highlight.tags.changed,
			_lezer_highlight.tags.annotation,
			_lezer_highlight.tags.modifier,
			_lezer_highlight.tags.self,
			_lezer_highlight.tags.namespace
		],
		color: config$11.number
	},
	{
		tag: [_lezer_highlight.tags.typeName],
		color: config$11.type,
		fontStyle: config$11.type
	},
	{
		tag: [_lezer_highlight.tags.operator],
		color: config$11.keyword
	},
	{
		tag: [
			_lezer_highlight.tags.url,
			_lezer_highlight.tags.escape,
			_lezer_highlight.tags.regexp,
			_lezer_highlight.tags.link
		],
		color: config$11.regexp
	},
	{
		tag: [_lezer_highlight.tags.meta, _lezer_highlight.tags.comment],
		color: config$11.comment
	},
	{
		tag: _lezer_highlight.tags.tagName,
		color: config$11.tag
	},
	{
		tag: _lezer_highlight.tags.strong,
		fontWeight: "bold"
	},
	{
		tag: _lezer_highlight.tags.emphasis,
		fontStyle: "italic"
	},
	{
		tag: _lezer_highlight.tags.link,
		textDecoration: "underline"
	},
	{
		tag: _lezer_highlight.tags.heading,
		fontWeight: "bold",
		color: config$11.heading
	},
	{
		tag: [_lezer_highlight.tags.atom, _lezer_highlight.tags.special(_lezer_highlight.tags.variableName)],
		color: config$11.variable
	},
	{
		tag: _lezer_highlight.tags.invalid,
		color: config$11.invalid
	},
	{
		tag: _lezer_highlight.tags.strikethrough,
		textDecoration: "line-through"
	},
	{
		tag: [
			_lezer_highlight.tags.operatorKeyword,
			_lezer_highlight.tags.bool,
			_lezer_highlight.tags.null,
			_lezer_highlight.tags.variableName
		],
		color: config$11.constant
	}
];
var andromedaInit = (options) => {
	var { theme = "dark", settings = {}, styles = [] } = options || {};
	return createTheme({
		theme,
		settings: (0, import_extends.default)({}, defaultSettingsAndromeda, settings),
		styles: [...andromedaDarkStyle, ...styles]
	});
};
var andromeda = andromedaInit();
//#endregion
//#region ../../node_modules/.pnpm/@uiw+codemirror-theme-atomone@4.25.7_@codemirror+language@6.12.2_@codemirror+state@6.5.4_@codemirror+view@6.39.16/node_modules/@uiw/codemirror-theme-atomone/esm/index.js
/**
* @name Atom One
* Atom One dark syntax theme
*
* https://github.com/atom/one-dark-syntax
*/
var defaultSettingsAtomone = {
	background: "#272C35",
	foreground: "#9d9b97",
	caret: "#797977",
	selection: "#3d4c64",
	selectionMatch: "#3d4c64",
	gutterBackground: "#272C35",
	gutterForeground: "#465063",
	gutterBorder: "transparent",
	lineHighlight: "#2e3f5940"
};
var atomoneDarkStyle = [
	{
		tag: [
			_lezer_highlight.tags.function(_lezer_highlight.tags.variableName),
			_lezer_highlight.tags.function(_lezer_highlight.tags.propertyName),
			_lezer_highlight.tags.url,
			_lezer_highlight.tags.processingInstruction
		],
		color: "hsl(207, 82%, 66%)"
	},
	{
		tag: [_lezer_highlight.tags.tagName, _lezer_highlight.tags.heading],
		color: "#e06c75"
	},
	{
		tag: _lezer_highlight.tags.comment,
		color: "#54636D"
	},
	{
		tag: [_lezer_highlight.tags.propertyName],
		color: "hsl(220, 14%, 71%)"
	},
	{
		tag: [_lezer_highlight.tags.attributeName, _lezer_highlight.tags.number],
		color: "hsl( 29, 54%, 61%)"
	},
	{
		tag: _lezer_highlight.tags.className,
		color: "hsl( 39, 67%, 69%)"
	},
	{
		tag: _lezer_highlight.tags.keyword,
		color: "hsl(286, 60%, 67%)"
	},
	{
		tag: [
			_lezer_highlight.tags.string,
			_lezer_highlight.tags.regexp,
			_lezer_highlight.tags.special(_lezer_highlight.tags.propertyName)
		],
		color: "#98c379"
	}
];
var atomoneInit = (options) => {
	var { theme = "dark", settings = {}, styles = [] } = options || {};
	return createTheme({
		theme,
		settings: (0, import_extends.default)({}, defaultSettingsAtomone, settings),
		styles: [...atomoneDarkStyle, ...styles]
	});
};
var atomone = atomoneInit();
//#endregion
//#region ../../node_modules/.pnpm/@uiw+codemirror-theme-aura@4.25.7_@codemirror+language@6.12.2_@codemirror+state@6.5.4_@codemirror+view@6.39.16/node_modules/@uiw/codemirror-theme-aura/esm/index.js
var defaultSettingsAura = {
	background: "#21202e",
	foreground: "#edecee",
	caret: "#a277ff",
	selection: "#5a51898f",
	selectionMatch: "#5a51898f",
	gutterBackground: "#21202e",
	gutterForeground: "#edecee",
	gutterBorder: "transparent",
	lineHighlight: "#a394f033"
};
var auraDarkStyle = [
	{
		tag: _lezer_highlight.tags.keyword,
		color: "#a277ff"
	},
	{
		tag: [
			_lezer_highlight.tags.name,
			_lezer_highlight.tags.deleted,
			_lezer_highlight.tags.character,
			_lezer_highlight.tags.macroName
		],
		color: "#edecee"
	},
	{
		tag: [_lezer_highlight.tags.propertyName],
		color: "#ffca85"
	},
	{
		tag: [
			_lezer_highlight.tags.processingInstruction,
			_lezer_highlight.tags.string,
			_lezer_highlight.tags.inserted,
			_lezer_highlight.tags.special(_lezer_highlight.tags.string)
		],
		color: "#61ffca"
	},
	{
		tag: [_lezer_highlight.tags.function(_lezer_highlight.tags.variableName), _lezer_highlight.tags.labelName],
		color: "#ffca85"
	},
	{
		tag: [
			_lezer_highlight.tags.color,
			_lezer_highlight.tags.constant(_lezer_highlight.tags.name),
			_lezer_highlight.tags.standard(_lezer_highlight.tags.name)
		],
		color: "#61ffca"
	},
	{
		tag: [_lezer_highlight.tags.definition(_lezer_highlight.tags.name), _lezer_highlight.tags.separator],
		color: "#edecee"
	},
	{
		tag: [_lezer_highlight.tags.className],
		color: "#82e2ff"
	},
	{
		tag: [
			_lezer_highlight.tags.number,
			_lezer_highlight.tags.changed,
			_lezer_highlight.tags.annotation,
			_lezer_highlight.tags.modifier,
			_lezer_highlight.tags.self,
			_lezer_highlight.tags.namespace
		],
		color: "#61ffca"
	},
	{
		tag: [_lezer_highlight.tags.typeName],
		color: "#82e2ff"
	},
	{
		tag: [_lezer_highlight.tags.operator, _lezer_highlight.tags.operatorKeyword],
		color: "#a277ff"
	},
	{
		tag: [
			_lezer_highlight.tags.url,
			_lezer_highlight.tags.escape,
			_lezer_highlight.tags.regexp,
			_lezer_highlight.tags.link
		],
		color: "#61ffca"
	},
	{
		tag: [_lezer_highlight.tags.meta, _lezer_highlight.tags.comment],
		color: "#6d6d6d"
	},
	{
		tag: _lezer_highlight.tags.strong,
		fontWeight: "bold"
	},
	{
		tag: _lezer_highlight.tags.emphasis,
		fontStyle: "italic"
	},
	{
		tag: _lezer_highlight.tags.link,
		textDecoration: "underline"
	},
	{
		tag: _lezer_highlight.tags.heading,
		fontWeight: "bold",
		color: "#a277ff"
	},
	{
		tag: [
			_lezer_highlight.tags.atom,
			_lezer_highlight.tags.bool,
			_lezer_highlight.tags.special(_lezer_highlight.tags.variableName)
		],
		color: "#edecee"
	},
	{
		tag: _lezer_highlight.tags.invalid,
		color: "#ff6767"
	},
	{
		tag: _lezer_highlight.tags.strikethrough,
		textDecoration: "line-through"
	}
];
var auraInit = (options) => {
	var { theme = "dark", settings = {}, styles = [] } = options || {};
	return createTheme({
		theme,
		settings: (0, import_extends.default)({}, defaultSettingsAura, settings),
		styles: [...auraDarkStyle, ...styles]
	});
};
var aura = auraInit();
//#endregion
//#region ../../node_modules/.pnpm/@uiw+codemirror-theme-basic@4.25.7_@codemirror+language@6.12.2_@codemirror+state@6.5.4_@codemirror+view@6.39.16/node_modules/@uiw/codemirror-theme-basic/esm/dark.js
var defaultSettingsBasicDark = {
	background: "#2E3235",
	foreground: "#DDDDDD",
	caret: "#DDDDDD",
	selection: "#202325",
	selectionMatch: "#202325",
	gutterBackground: "#292d30",
	gutterForeground: "#808080",
	gutterBorder: "1px solid #ffffff10",
	lineHighlight: "#B9D2FF30"
};
var basicDarkStyle = [
	{
		tag: _lezer_highlight.tags.keyword,
		color: "#fda331"
	},
	{
		tag: [
			_lezer_highlight.tags.name,
			_lezer_highlight.tags.deleted,
			_lezer_highlight.tags.character,
			_lezer_highlight.tags.propertyName,
			_lezer_highlight.tags.macroName
		],
		color: "#b5bd68"
	},
	{
		tag: [_lezer_highlight.tags.variableName],
		color: "#6fb3d2"
	},
	{
		tag: [_lezer_highlight.tags.function(_lezer_highlight.tags.variableName)],
		color: "#fda331"
	},
	{
		tag: [_lezer_highlight.tags.labelName],
		color: "#fc6d24"
	},
	{
		tag: [
			_lezer_highlight.tags.color,
			_lezer_highlight.tags.constant(_lezer_highlight.tags.name),
			_lezer_highlight.tags.standard(_lezer_highlight.tags.name)
		],
		color: "#fda331"
	},
	{
		tag: [_lezer_highlight.tags.definition(_lezer_highlight.tags.name), _lezer_highlight.tags.separator],
		color: "#cc99cc"
	},
	{
		tag: [_lezer_highlight.tags.brace],
		color: "#cc99cc"
	},
	{
		tag: [_lezer_highlight.tags.annotation],
		color: "#fc6d24"
	},
	{
		tag: [
			_lezer_highlight.tags.number,
			_lezer_highlight.tags.changed,
			_lezer_highlight.tags.annotation,
			_lezer_highlight.tags.modifier,
			_lezer_highlight.tags.self,
			_lezer_highlight.tags.namespace
		],
		color: "#fda331"
	},
	{
		tag: [_lezer_highlight.tags.typeName, _lezer_highlight.tags.className],
		color: "#6fb3d2"
	},
	{
		tag: [_lezer_highlight.tags.operator, _lezer_highlight.tags.operatorKeyword],
		color: "#cc99cc"
	},
	{
		tag: [_lezer_highlight.tags.tagName],
		color: "#fda331"
	},
	{
		tag: [_lezer_highlight.tags.squareBracket],
		color: "#cc99cc"
	},
	{
		tag: [_lezer_highlight.tags.angleBracket],
		color: "#cc99cc"
	},
	{
		tag: [_lezer_highlight.tags.attributeName],
		color: "#6fb3d2"
	},
	{
		tag: [_lezer_highlight.tags.regexp],
		color: "#fda331"
	},
	{
		tag: [_lezer_highlight.tags.quote],
		color: "#DDDDDD"
	},
	{
		tag: [_lezer_highlight.tags.string],
		color: "#b5bd68"
	},
	{
		tag: _lezer_highlight.tags.link,
		color: "#6987AF",
		textDecoration: "underline",
		textUnderlinePosition: "under"
	},
	{
		tag: [
			_lezer_highlight.tags.url,
			_lezer_highlight.tags.escape,
			_lezer_highlight.tags.special(_lezer_highlight.tags.string)
		],
		color: "#8abeb7"
	},
	{
		tag: [_lezer_highlight.tags.meta],
		color: "#A54543"
	},
	{
		tag: [_lezer_highlight.tags.comment],
		color: "#808080",
		fontStyle: "italic"
	},
	{
		tag: _lezer_highlight.tags.monospace,
		color: "#DDDDDD"
	},
	{
		tag: _lezer_highlight.tags.strong,
		fontWeight: "bold",
		color: "#fda331"
	},
	{
		tag: _lezer_highlight.tags.emphasis,
		fontStyle: "italic",
		color: "#6fb3d2"
	},
	{
		tag: _lezer_highlight.tags.strikethrough,
		textDecoration: "line-through"
	},
	{
		tag: _lezer_highlight.tags.heading,
		fontWeight: "bold",
		color: "#DDDDDD"
	},
	{
		tag: _lezer_highlight.tags.special(_lezer_highlight.tags.heading1),
		fontWeight: "bold",
		color: "#DDDDDD"
	},
	{
		tag: _lezer_highlight.tags.heading1,
		fontWeight: "bold",
		color: "#DDDDDD"
	},
	{
		tag: [
			_lezer_highlight.tags.heading2,
			_lezer_highlight.tags.heading3,
			_lezer_highlight.tags.heading4
		],
		fontWeight: "bold",
		color: "#DDDDDD"
	},
	{
		tag: [_lezer_highlight.tags.heading5, _lezer_highlight.tags.heading6],
		color: "#DDDDDD"
	},
	{
		tag: [
			_lezer_highlight.tags.atom,
			_lezer_highlight.tags.bool,
			_lezer_highlight.tags.special(_lezer_highlight.tags.variableName)
		],
		color: "#8abeb7"
	},
	{
		tag: [_lezer_highlight.tags.processingInstruction, _lezer_highlight.tags.inserted],
		color: "#8abeb7"
	},
	{
		tag: [_lezer_highlight.tags.contentSeparator],
		color: "#6fb3d2"
	},
	{
		tag: _lezer_highlight.tags.invalid,
		color: "#B9D2FF",
		borderBottom: "1px dotted #fc6d24"
	}
];
var basicDarkInit = (options) => {
	var { theme = "dark", settings = {}, styles = [] } = options || {};
	return createTheme({
		theme,
		settings: (0, import_extends.default)({}, defaultSettingsBasicDark, settings),
		styles: [...basicDarkStyle, ...styles]
	});
};
var basicDark = basicDarkInit();
//#endregion
//#region ../../node_modules/.pnpm/@uiw+codemirror-theme-basic@4.25.7_@codemirror+language@6.12.2_@codemirror+state@6.5.4_@codemirror+view@6.39.16/node_modules/@uiw/codemirror-theme-basic/esm/light.js
var defaultSettingsBasicLight = {
	background: "#ffffff",
	foreground: "#2e3440",
	caret: "#3b4252",
	selection: "#eceff4",
	selectionMatch: "#e5e9f0",
	gutterBackground: "#eceff4",
	gutterForeground: "#2e3440",
	gutterBorder: "none",
	lineHighlight: "#02255f11"
};
var basicLightStyle = [
	{
		tag: _lezer_highlight.tags.keyword,
		color: "#5e81ac"
	},
	{
		tag: [
			_lezer_highlight.tags.name,
			_lezer_highlight.tags.deleted,
			_lezer_highlight.tags.character,
			_lezer_highlight.tags.propertyName,
			_lezer_highlight.tags.macroName
		],
		color: "#d08770"
	},
	{
		tag: [_lezer_highlight.tags.variableName],
		color: "#d08770"
	},
	{
		tag: [_lezer_highlight.tags.function(_lezer_highlight.tags.variableName)],
		color: "#5e81ac"
	},
	{
		tag: [_lezer_highlight.tags.labelName],
		color: "#81a1c1"
	},
	{
		tag: [
			_lezer_highlight.tags.color,
			_lezer_highlight.tags.constant(_lezer_highlight.tags.name),
			_lezer_highlight.tags.standard(_lezer_highlight.tags.name)
		],
		color: "#5e81ac"
	},
	{
		tag: [_lezer_highlight.tags.definition(_lezer_highlight.tags.name), _lezer_highlight.tags.separator],
		color: "#a3be8c"
	},
	{
		tag: [_lezer_highlight.tags.brace],
		color: "#8fbcbb"
	},
	{
		tag: [_lezer_highlight.tags.annotation],
		color: "#d30102"
	},
	{
		tag: [
			_lezer_highlight.tags.number,
			_lezer_highlight.tags.changed,
			_lezer_highlight.tags.annotation,
			_lezer_highlight.tags.modifier,
			_lezer_highlight.tags.self,
			_lezer_highlight.tags.namespace
		],
		color: "#88c0d0"
	},
	{
		tag: [_lezer_highlight.tags.typeName, _lezer_highlight.tags.className],
		color: "#ebcb8b"
	},
	{
		tag: [_lezer_highlight.tags.operator, _lezer_highlight.tags.operatorKeyword],
		color: "#a3be8c"
	},
	{
		tag: [_lezer_highlight.tags.tagName],
		color: "#b48ead"
	},
	{
		tag: [_lezer_highlight.tags.squareBracket],
		color: "#bf616a"
	},
	{
		tag: [_lezer_highlight.tags.angleBracket],
		color: "#d08770"
	},
	{
		tag: [_lezer_highlight.tags.attributeName],
		color: "#ebcb8b"
	},
	{
		tag: [_lezer_highlight.tags.regexp],
		color: "#5e81ac"
	},
	{
		tag: [_lezer_highlight.tags.quote],
		color: "#3b4252"
	},
	{
		tag: [_lezer_highlight.tags.string],
		color: "#d08770"
	},
	{
		tag: _lezer_highlight.tags.link,
		color: "#8fbcbb",
		textDecoration: "underline",
		textUnderlinePosition: "under"
	},
	{
		tag: [
			_lezer_highlight.tags.url,
			_lezer_highlight.tags.escape,
			_lezer_highlight.tags.special(_lezer_highlight.tags.string)
		],
		color: "#d08770"
	},
	{
		tag: [_lezer_highlight.tags.meta],
		color: "#88c0d0"
	},
	{
		tag: [_lezer_highlight.tags.comment],
		color: "#434c5e",
		fontStyle: "italic"
	},
	{
		tag: _lezer_highlight.tags.strong,
		fontWeight: "bold",
		color: "#5e81ac"
	},
	{
		tag: _lezer_highlight.tags.emphasis,
		fontStyle: "italic",
		color: "#5e81ac"
	},
	{
		tag: _lezer_highlight.tags.strikethrough,
		textDecoration: "line-through"
	},
	{
		tag: _lezer_highlight.tags.heading,
		fontWeight: "bold",
		color: "#5e81ac"
	},
	{
		tag: _lezer_highlight.tags.special(_lezer_highlight.tags.heading1),
		fontWeight: "bold",
		color: "#5e81ac"
	},
	{
		tag: _lezer_highlight.tags.heading1,
		fontWeight: "bold",
		color: "#5e81ac"
	},
	{
		tag: [
			_lezer_highlight.tags.heading2,
			_lezer_highlight.tags.heading3,
			_lezer_highlight.tags.heading4
		],
		fontWeight: "bold",
		color: "#5e81ac"
	},
	{
		tag: [_lezer_highlight.tags.heading5, _lezer_highlight.tags.heading6],
		color: "#5e81ac"
	},
	{
		tag: [
			_lezer_highlight.tags.atom,
			_lezer_highlight.tags.bool,
			_lezer_highlight.tags.special(_lezer_highlight.tags.variableName)
		],
		color: "#d08770"
	},
	{
		tag: [_lezer_highlight.tags.processingInstruction, _lezer_highlight.tags.inserted],
		color: "#8fbcbb"
	},
	{
		tag: [_lezer_highlight.tags.contentSeparator],
		color: "#ebcb8b"
	},
	{
		tag: _lezer_highlight.tags.invalid,
		color: "#434c5e",
		borderBottom: "1px dotted #d30102"
	}
];
var basicLightInit = (options) => {
	var { theme = "light", settings = {}, styles = [] } = options || {};
	return createTheme({
		theme,
		settings: (0, import_extends.default)({}, defaultSettingsBasicLight, settings),
		styles: [...basicLightStyle, ...styles]
	});
};
var basicLight = basicLightInit();
//#endregion
//#region ../../node_modules/.pnpm/@uiw+codemirror-theme-bbedit@4.25.7_@codemirror+language@6.12.2_@codemirror+state@6.5.4_@codemirror+view@6.39.16/node_modules/@uiw/codemirror-theme-bbedit/esm/index.js
var defaultSettingsBbedit = {
	background: "#FFFFFF",
	foreground: "#000000",
	caret: "#FBAC52",
	selection: "#FFD420",
	selectionMatch: "#FFD420",
	gutterBackground: "#f5f5f5",
	gutterForeground: "#4D4D4C",
	gutterBorder: "transparent",
	lineHighlight: "#00000012"
};
var bbeditLightStyle = [
	{
		tag: [_lezer_highlight.tags.meta, _lezer_highlight.tags.comment],
		color: "#804000"
	},
	{
		tag: [_lezer_highlight.tags.keyword, _lezer_highlight.tags.strong],
		color: "#0000FF"
	},
	{
		tag: [_lezer_highlight.tags.number],
		color: "#FF0080"
	},
	{
		tag: [_lezer_highlight.tags.string],
		color: "#FF0080"
	},
	{
		tag: [_lezer_highlight.tags.variableName],
		color: "#006600"
	},
	{
		tag: [_lezer_highlight.tags.escape],
		color: "#33CC33"
	},
	{
		tag: [_lezer_highlight.tags.tagName],
		color: "#1C02FF"
	},
	{
		tag: [_lezer_highlight.tags.heading],
		color: "#0C07FF"
	},
	{
		tag: [_lezer_highlight.tags.quote],
		color: "#000000"
	},
	{
		tag: [_lezer_highlight.tags.list],
		color: "#B90690"
	},
	{
		tag: [_lezer_highlight.tags.documentMeta],
		color: "#888888"
	},
	{
		tag: [_lezer_highlight.tags.function(_lezer_highlight.tags.variableName)],
		color: "#0000A2"
	},
	{
		tag: [_lezer_highlight.tags.definition(_lezer_highlight.tags.typeName), _lezer_highlight.tags.typeName],
		color: "#6D79DE"
	}
];
var bbeditInit = (options) => {
	var { theme = "light", settings = {}, styles = [] } = options || {};
	return createTheme({
		theme,
		settings: (0, import_extends.default)({}, defaultSettingsBbedit, settings),
		styles: [...bbeditLightStyle, ...styles]
	});
};
var bbedit = bbeditInit();
//#endregion
//#region ../../node_modules/.pnpm/@uiw+codemirror-theme-bespin@4.25.7_@codemirror+language@6.12.2_@codemirror+state@6.5.4_@codemirror+view@6.39.16/node_modules/@uiw/codemirror-theme-bespin/esm/index.js
/**
* @name Bespin
* @author Mozilla / Jan T. Sott
*
* CodeMirror template by Jan T. Sott (https://github.com/idleberg/base16-codemirror)
* Original Base16 color scheme by Chris Kempson (https://github.com/chriskempson/base16)
*/
var defaultSettingsBespin = {
	background: "#28211c",
	foreground: "#9d9b97",
	caret: "#797977",
	selection: "#4f382b",
	selectionMatch: "#4f382b",
	gutterBackground: "#28211c",
	gutterForeground: "#666666",
	lineHighlight: "#ffffff1a"
};
var bespinDarkStyle = [
	{
		tag: [
			_lezer_highlight.tags.atom,
			_lezer_highlight.tags.number,
			_lezer_highlight.tags.link,
			_lezer_highlight.tags.bool
		],
		color: "#9b859d"
	},
	{
		tag: _lezer_highlight.tags.comment,
		color: "#937121"
	},
	{
		tag: [_lezer_highlight.tags.keyword, _lezer_highlight.tags.tagName],
		color: "#cf6a4c"
	},
	{
		tag: _lezer_highlight.tags.string,
		color: "#f9ee98"
	},
	{
		tag: _lezer_highlight.tags.bracket,
		color: "#9d9b97"
	},
	{
		tag: [_lezer_highlight.tags.variableName],
		color: "#5ea6ea"
	},
	{
		tag: _lezer_highlight.tags.definition(_lezer_highlight.tags.variableName),
		color: "#cf7d34"
	},
	{
		tag: [_lezer_highlight.tags.function(_lezer_highlight.tags.variableName), _lezer_highlight.tags.className],
		color: "#cf7d34"
	},
	{
		tag: [_lezer_highlight.tags.propertyName, _lezer_highlight.tags.attributeName],
		color: "#54be0d"
	}
];
var bespinInit = (options) => {
	var { theme = "dark", settings = {}, styles = [] } = options || {};
	return createTheme({
		theme,
		settings: (0, import_extends.default)({}, defaultSettingsBespin, settings),
		styles: [...bespinDarkStyle, ...styles]
	});
};
var bespin = bespinInit();
//#endregion
//#region ../../node_modules/.pnpm/@uiw+codemirror-theme-console@4.25.7_@codemirror+language@6.12.2_@codemirror+state@6.5.4_@codemirror+view@6.39.16/node_modules/@uiw/codemirror-theme-console/esm/dark.js
var defaultSettingsConsoleDark = {
	background: "#000",
	foreground: "#fff",
	caret: "#fff",
	selection: "#5c6c9b",
	selectionMatch: "#2a3967",
	gutterBackground: "#000",
	gutterForeground: "#ada9a9",
	gutterActiveForeground: "#fff",
	lineHighlight: "#82828275"
};
var consoleDarkInit = (options) => {
	var { theme = "dark", settings = {}, styles = [] } = options || {};
	return createTheme({
		theme,
		settings: (0, import_extends.default)({}, defaultSettingsConsoleDark, settings),
		styles: [...styles]
	});
};
var consoleDark = consoleDarkInit();
//#endregion
//#region ../../node_modules/.pnpm/@uiw+codemirror-theme-console@4.25.7_@codemirror+language@6.12.2_@codemirror+state@6.5.4_@codemirror+view@6.39.16/node_modules/@uiw/codemirror-theme-console/esm/light.js
var defaultSettingsConsoleLight = {
	background: "#fff",
	foreground: "#000",
	caret: "#000",
	selection: "#c2d2ff",
	selectionMatch: "#b1c1ef",
	gutterBackground: "#fff",
	gutterForeground: "#ada9a9",
	gutterActiveForeground: "#000",
	lineHighlight: "#c7c5c575"
};
var consoleLightInit = (options) => {
	var { theme = "light", settings = {}, styles = [] } = options || {};
	return createTheme({
		theme,
		settings: (0, import_extends.default)({}, defaultSettingsConsoleLight, settings),
		styles: [...styles]
	});
};
var consoleLight = consoleLightInit();
//#endregion
//#region ../../node_modules/.pnpm/@uiw+codemirror-theme-copilot@4.25.7_@codemirror+language@6.12.2_@codemirror+state@6.5.4_@codemirror+view@6.39.16/node_modules/@uiw/codemirror-theme-copilot/esm/color.js
var config$10 = {
	background: "#232a2f",
	foreground: "#939da5",
	selection: "#204062",
	selectionMatch: "#204062",
	cursor: "#939da5",
	dropdownBackground: "#1a2023",
	activeLine: "#4469832b",
	matchingBracket: "#204062",
	keyword: "#ba8ef7",
	storage: "#ba8ef7",
	variable: "#939da5",
	parameter: "#939da5",
	function: "#ffea6b",
	string: "#5bec95",
	constant: "#939da5",
	type: "#89ddff",
	class: "#ffea6b",
	number: "#89ddff",
	comment: "#707a84",
	heading: "#5bec95",
	invalid: "#ff6a80",
	regexp: "#56adb7",
	tag: "#ff6a80"
};
//#endregion
//#region ../../node_modules/.pnpm/@uiw+codemirror-theme-copilot@4.25.7_@codemirror+language@6.12.2_@codemirror+state@6.5.4_@codemirror+view@6.39.16/node_modules/@uiw/codemirror-theme-copilot/esm/index.js
var defaultSettingsCopilot = {
	background: config$10.background,
	foreground: config$10.foreground,
	caret: config$10.cursor,
	selection: config$10.selection,
	selectionMatch: config$10.selectionMatch,
	gutterBackground: config$10.background,
	gutterForeground: config$10.foreground,
	lineHighlight: config$10.activeLine
};
var copilotDarkStyle = [
	{
		tag: _lezer_highlight.tags.keyword,
		color: config$10.keyword
	},
	{
		tag: [
			_lezer_highlight.tags.name,
			_lezer_highlight.tags.deleted,
			_lezer_highlight.tags.character,
			_lezer_highlight.tags.macroName
		],
		color: config$10.variable
	},
	{
		tag: [_lezer_highlight.tags.propertyName],
		color: config$10.function
	},
	{
		tag: [
			_lezer_highlight.tags.processingInstruction,
			_lezer_highlight.tags.string,
			_lezer_highlight.tags.inserted,
			_lezer_highlight.tags.special(_lezer_highlight.tags.string)
		],
		color: config$10.string
	},
	{
		tag: [_lezer_highlight.tags.function(_lezer_highlight.tags.variableName), _lezer_highlight.tags.labelName],
		color: config$10.function
	},
	{
		tag: [
			_lezer_highlight.tags.color,
			_lezer_highlight.tags.constant(_lezer_highlight.tags.name),
			_lezer_highlight.tags.standard(_lezer_highlight.tags.name)
		],
		color: config$10.constant
	},
	{
		tag: [_lezer_highlight.tags.definition(_lezer_highlight.tags.name), _lezer_highlight.tags.separator],
		color: config$10.variable
	},
	{
		tag: [_lezer_highlight.tags.className],
		color: config$10.class
	},
	{
		tag: [
			_lezer_highlight.tags.number,
			_lezer_highlight.tags.changed,
			_lezer_highlight.tags.annotation,
			_lezer_highlight.tags.modifier,
			_lezer_highlight.tags.self,
			_lezer_highlight.tags.namespace
		],
		color: config$10.number
	},
	{
		tag: [_lezer_highlight.tags.typeName],
		color: config$10.type,
		fontStyle: config$10.type
	},
	{
		tag: [_lezer_highlight.tags.operator],
		color: config$10.keyword
	},
	{
		tag: [
			_lezer_highlight.tags.url,
			_lezer_highlight.tags.escape,
			_lezer_highlight.tags.regexp,
			_lezer_highlight.tags.link
		],
		color: config$10.regexp
	},
	{
		tag: [_lezer_highlight.tags.meta, _lezer_highlight.tags.comment],
		color: config$10.comment
	},
	{
		tag: _lezer_highlight.tags.tagName,
		color: config$10.tag
	},
	{
		tag: _lezer_highlight.tags.strong,
		fontWeight: "bold"
	},
	{
		tag: _lezer_highlight.tags.emphasis,
		fontStyle: "italic"
	},
	{
		tag: _lezer_highlight.tags.link,
		textDecoration: "underline"
	},
	{
		tag: _lezer_highlight.tags.heading,
		fontWeight: "bold",
		color: config$10.heading
	},
	{
		tag: [_lezer_highlight.tags.atom, _lezer_highlight.tags.special(_lezer_highlight.tags.variableName)],
		color: config$10.variable
	},
	{
		tag: _lezer_highlight.tags.invalid,
		color: config$10.invalid
	},
	{
		tag: _lezer_highlight.tags.strikethrough,
		textDecoration: "line-through"
	},
	{
		tag: [
			_lezer_highlight.tags.operatorKeyword,
			_lezer_highlight.tags.bool,
			_lezer_highlight.tags.null,
			_lezer_highlight.tags.variableName
		],
		color: config$10.constant
	}
];
var copilotInit = (options) => {
	var { theme = "dark", settings = {}, styles = [] } = options || {};
	return createTheme({
		theme,
		settings: (0, import_extends.default)({}, defaultSettingsCopilot, settings),
		styles: [...copilotDarkStyle, ...styles]
	});
};
var copilot = copilotInit();
//#endregion
//#region ../../node_modules/.pnpm/@uiw+codemirror-theme-darcula@4.25.7_@codemirror+language@6.12.2_@codemirror+state@6.5.4_@codemirror+view@6.39.16/node_modules/@uiw/codemirror-theme-darcula/esm/index.js
/**
* @name darcula
* @author darcula
* Name: IntelliJ IDEA darcula theme
* From IntelliJ IDEA by JetBrains
*/
var defaultSettingsDarcula = {
	background: "#2B2B2B",
	foreground: "#f8f8f2",
	caret: "#FFFFFF",
	selection: "rgba(255, 255, 255, 0.1)",
	selectionMatch: "rgba(255, 255, 255, 0.2)",
	gutterBackground: "rgba(255, 255, 255, 0.1)",
	gutterForeground: "#999",
	gutterBorder: "transparent",
	lineHighlight: "rgba(255, 255, 255, 0.1)"
};
var darculaDarkStyle = [
	{
		tag: [_lezer_highlight.tags.atom, _lezer_highlight.tags.number],
		color: "#bd93f9"
	},
	{
		tag: [_lezer_highlight.tags.comment],
		color: "#61A151"
	},
	{
		tag: [_lezer_highlight.tags.string],
		color: "#6A8759"
	},
	{
		tag: [_lezer_highlight.tags.variableName, _lezer_highlight.tags.operator],
		color: "#A9B7C6"
	},
	{
		tag: [_lezer_highlight.tags.meta, _lezer_highlight.tags.className],
		color: "#A9B7C6"
	},
	{
		tag: [_lezer_highlight.tags.propertyName],
		color: "#FFC66D"
	},
	{
		tag: [_lezer_highlight.tags.keyword],
		color: "#CC7832"
	},
	{
		tag: [_lezer_highlight.tags.tagName],
		color: "#ff79c6"
	},
	{
		tag: [_lezer_highlight.tags.typeName],
		color: "#ffb86c"
	}
];
var darculaInit = (options) => {
	var { theme = "dark", settings = {}, styles = [] } = options || {};
	return createTheme({
		theme,
		settings: (0, import_extends.default)({}, defaultSettingsDarcula, settings),
		styles: [...darculaDarkStyle, ...styles]
	});
};
var darcula = darculaInit();
//#endregion
//#region ../../node_modules/.pnpm/@uiw+codemirror-theme-dracula@4.25.7_@codemirror+language@6.12.2_@codemirror+state@6.5.4_@codemirror+view@6.39.16/node_modules/@uiw/codemirror-theme-dracula/esm/index.js
/**
* @name dracula
* @author dracula
* Michael Kaminsky (http://github.com/mkaminsky11)
* Original dracula color scheme by Zeno Rocha (https://github.com/zenorocha/dracula-theme)
*/
var defaultSettingsDracula = {
	background: "#282a36",
	foreground: "#f8f8f2",
	caret: "#f8f8f0",
	selection: "rgba(255, 255, 255, 0.1)",
	selectionMatch: "rgba(255, 255, 255, 0.2)",
	gutterBackground: "#282a36",
	gutterForeground: "#6D8A88",
	gutterBorder: "transparent",
	lineHighlight: "rgba(255, 255, 255, 0.1)"
};
var draculaDarkStyle = [
	{
		tag: _lezer_highlight.tags.comment,
		color: "#6272a4"
	},
	{
		tag: _lezer_highlight.tags.string,
		color: "#f1fa8c"
	},
	{
		tag: _lezer_highlight.tags.atom,
		color: "#bd93f9"
	},
	{
		tag: _lezer_highlight.tags.meta,
		color: "#f8f8f2"
	},
	{
		tag: [
			_lezer_highlight.tags.keyword,
			_lezer_highlight.tags.operator,
			_lezer_highlight.tags.tagName
		],
		color: "#ff79c6"
	},
	{
		tag: [_lezer_highlight.tags.function(_lezer_highlight.tags.propertyName), _lezer_highlight.tags.propertyName],
		color: "#66d9ef"
	},
	{
		tag: [
			_lezer_highlight.tags.definition(_lezer_highlight.tags.variableName),
			_lezer_highlight.tags.function(_lezer_highlight.tags.variableName),
			_lezer_highlight.tags.className,
			_lezer_highlight.tags.attributeName
		],
		color: "#50fa7b"
	},
	{
		tag: _lezer_highlight.tags.atom,
		color: "#bd93f9"
	}
];
var draculaInit = (options) => {
	var { theme = "dark", settings = {}, styles = [] } = options || {};
	return createTheme({
		theme,
		settings: (0, import_extends.default)({}, defaultSettingsDracula, settings),
		styles: [...draculaDarkStyle, ...styles]
	});
};
var dracula = draculaInit();
//#endregion
//#region ../../node_modules/.pnpm/@uiw+codemirror-theme-duotone@4.25.7_@codemirror+language@6.12.2_@codemirror+state@6.5.4_@codemirror+view@6.39.16/node_modules/@uiw/codemirror-theme-duotone/esm/index.js
/**
* @name duotone
* @author Bram de Haan
* by Bram de Haan, adapted from DuoTone themes by Simurai (http://simurai.com/projects/2016/01/01/duotone-themes)
*/
var defaultSettingsDuotoneLight = {
	background: "#faf8f5",
	foreground: "#b29762",
	caret: "#93abdc",
	selection: "#e3dcce",
	selectionMatch: "#e3dcce",
	gutterBackground: "#faf8f5",
	gutterForeground: "#cdc4b1",
	gutterBorder: "transparent",
	lineHighlight: "#ddceb154"
};
var douToneLightStyle = [
	{
		tag: [_lezer_highlight.tags.comment, _lezer_highlight.tags.bracket],
		color: "#b6ad9a"
	},
	{
		tag: [
			_lezer_highlight.tags.atom,
			_lezer_highlight.tags.number,
			_lezer_highlight.tags.keyword,
			_lezer_highlight.tags.link,
			_lezer_highlight.tags.attributeName,
			_lezer_highlight.tags.quote
		],
		color: "#063289"
	},
	{
		tag: [
			_lezer_highlight.tags.emphasis,
			_lezer_highlight.tags.heading,
			_lezer_highlight.tags.tagName,
			_lezer_highlight.tags.propertyName,
			_lezer_highlight.tags.variableName
		],
		color: "#2d2006"
	},
	{
		tag: [
			_lezer_highlight.tags.typeName,
			_lezer_highlight.tags.url,
			_lezer_highlight.tags.string
		],
		color: "#896724"
	},
	{
		tag: [_lezer_highlight.tags.operator, _lezer_highlight.tags.string],
		color: "#1659df"
	},
	{
		tag: [_lezer_highlight.tags.propertyName],
		color: "#b29762"
	},
	{
		tag: [_lezer_highlight.tags.unit, _lezer_highlight.tags.punctuation],
		color: "#063289"
	}
];
var duotoneLightInit = (options) => {
	var { theme = "light", settings = {}, styles = [] } = options || {};
	return createTheme({
		theme,
		settings: (0, import_extends.default)({}, defaultSettingsDuotoneLight, settings),
		styles: [...douToneLightStyle, ...styles]
	});
};
var duotoneLight = duotoneLightInit();
var defaultSettingsDuotoneDark = {
	background: "#2a2734",
	foreground: "#6c6783",
	caret: "#ffad5c",
	selection: "#91ff6c26",
	selectionMatch: "#91ff6c26",
	gutterBackground: "#2a2734",
	gutterForeground: "#545167",
	lineHighlight: "#36334280"
};
var duotoneDarkStyle = [
	{
		tag: [_lezer_highlight.tags.comment, _lezer_highlight.tags.bracket],
		color: "#6c6783"
	},
	{
		tag: [
			_lezer_highlight.tags.atom,
			_lezer_highlight.tags.number,
			_lezer_highlight.tags.keyword,
			_lezer_highlight.tags.link,
			_lezer_highlight.tags.attributeName,
			_lezer_highlight.tags.quote
		],
		color: "#ffcc99"
	},
	{
		tag: [
			_lezer_highlight.tags.emphasis,
			_lezer_highlight.tags.heading,
			_lezer_highlight.tags.tagName,
			_lezer_highlight.tags.propertyName,
			_lezer_highlight.tags.className,
			_lezer_highlight.tags.variableName
		],
		color: "#eeebff"
	},
	{
		tag: [_lezer_highlight.tags.typeName, _lezer_highlight.tags.url],
		color: "#7a63ee"
	},
	{
		tag: _lezer_highlight.tags.operator,
		color: "#ffad5c"
	},
	{
		tag: _lezer_highlight.tags.string,
		color: "#ffb870"
	},
	{
		tag: [_lezer_highlight.tags.propertyName],
		color: "#9a86fd"
	},
	{
		tag: [_lezer_highlight.tags.unit, _lezer_highlight.tags.punctuation],
		color: "#e09142"
	}
];
var duotoneDarkInit = (options) => {
	var { theme = "dark", settings = {}, styles = [] } = options || {};
	return createTheme({
		theme,
		settings: (0, import_extends.default)({}, defaultSettingsDuotoneDark, settings),
		styles: [...duotoneDarkStyle, ...styles]
	});
};
var duotoneDark = duotoneDarkInit();
//#endregion
//#region ../../node_modules/.pnpm/@uiw+codemirror-theme-eclipse@4.25.7_@codemirror+language@6.12.2_@codemirror+state@6.5.4_@codemirror+view@6.39.16/node_modules/@uiw/codemirror-theme-eclipse/esm/index.js
var defaultSettingsEclipse = {
	background: "#fff",
	foreground: "#000",
	caret: "#FFFFFF",
	selection: "#d7d4f0",
	selectionMatch: "#d7d4f0",
	gutterBackground: "#f7f7f7",
	gutterForeground: "#999",
	lineHighlight: "#006fff1c",
	gutterBorder: "transparent"
};
var eclipseLightStyle = [
	{
		tag: [_lezer_highlight.tags.comment],
		color: "#3F7F5F"
	},
	{
		tag: [_lezer_highlight.tags.documentMeta],
		color: "#FF1717"
	},
	{
		tag: _lezer_highlight.tags.keyword,
		color: "#7F0055",
		fontWeight: "bold"
	},
	{
		tag: _lezer_highlight.tags.atom,
		color: "#00f"
	},
	{
		tag: _lezer_highlight.tags.number,
		color: "#164"
	},
	{
		tag: _lezer_highlight.tags.propertyName,
		color: "#164"
	},
	{
		tag: [_lezer_highlight.tags.variableName, _lezer_highlight.tags.definition(_lezer_highlight.tags.variableName)],
		color: "#0000C0"
	},
	{
		tag: _lezer_highlight.tags.function(_lezer_highlight.tags.variableName),
		color: "#0000C0"
	},
	{
		tag: _lezer_highlight.tags.string,
		color: "#2A00FF"
	},
	{
		tag: _lezer_highlight.tags.operator,
		color: "black"
	},
	{
		tag: _lezer_highlight.tags.tagName,
		color: "#170"
	},
	{
		tag: _lezer_highlight.tags.attributeName,
		color: "#00c"
	},
	{
		tag: _lezer_highlight.tags.link,
		color: "#219"
	}
];
var eclipseInit = (options) => {
	var { theme = "light", settings = {}, styles = [] } = options || {};
	return createTheme({
		theme,
		settings: (0, import_extends.default)({}, defaultSettingsEclipse, settings),
		styles: [...eclipseLightStyle, ...styles]
	});
};
var eclipse = eclipseInit();
//#endregion
//#region ../../node_modules/.pnpm/@uiw+codemirror-theme-github@4.25.7_@codemirror+language@6.12.2_@codemirror+state@6.5.4_@codemirror+view@6.39.16/node_modules/@uiw/codemirror-theme-github/esm/index.js
/**
* @name github
*/
var defaultSettingsGithubLight = {
	background: "#fff",
	foreground: "#24292e",
	selection: "#BBDFFF",
	selectionMatch: "#BBDFFF",
	gutterBackground: "#fff",
	gutterForeground: "#6e7781"
};
var githubLightStyle = [
	{
		tag: [_lezer_highlight.tags.standard(_lezer_highlight.tags.tagName), _lezer_highlight.tags.tagName],
		color: "#116329"
	},
	{
		tag: [_lezer_highlight.tags.comment, _lezer_highlight.tags.bracket],
		color: "#6a737d"
	},
	{
		tag: [_lezer_highlight.tags.className, _lezer_highlight.tags.propertyName],
		color: "#6f42c1"
	},
	{
		tag: [
			_lezer_highlight.tags.variableName,
			_lezer_highlight.tags.attributeName,
			_lezer_highlight.tags.number,
			_lezer_highlight.tags.operator
		],
		color: "#005cc5"
	},
	{
		tag: [
			_lezer_highlight.tags.keyword,
			_lezer_highlight.tags.typeName,
			_lezer_highlight.tags.typeOperator,
			_lezer_highlight.tags.typeName
		],
		color: "#d73a49"
	},
	{
		tag: [
			_lezer_highlight.tags.string,
			_lezer_highlight.tags.meta,
			_lezer_highlight.tags.regexp
		],
		color: "#032f62"
	},
	{
		tag: [_lezer_highlight.tags.name, _lezer_highlight.tags.quote],
		color: "#22863a"
	},
	{
		tag: [_lezer_highlight.tags.heading, _lezer_highlight.tags.strong],
		color: "#24292e",
		fontWeight: "bold"
	},
	{
		tag: [_lezer_highlight.tags.emphasis],
		color: "#24292e",
		fontStyle: "italic"
	},
	{
		tag: [_lezer_highlight.tags.deleted],
		color: "#b31d28",
		backgroundColor: "ffeef0"
	},
	{
		tag: [
			_lezer_highlight.tags.atom,
			_lezer_highlight.tags.bool,
			_lezer_highlight.tags.special(_lezer_highlight.tags.variableName)
		],
		color: "#e36209"
	},
	{
		tag: [
			_lezer_highlight.tags.url,
			_lezer_highlight.tags.escape,
			_lezer_highlight.tags.regexp,
			_lezer_highlight.tags.link
		],
		color: "#032f62"
	},
	{
		tag: _lezer_highlight.tags.link,
		textDecoration: "underline"
	},
	{
		tag: _lezer_highlight.tags.strikethrough,
		textDecoration: "line-through"
	},
	{
		tag: _lezer_highlight.tags.invalid,
		color: "#cb2431"
	}
];
var githubLightInit = (options) => {
	var { theme = "light", settings = {}, styles = [] } = options || {};
	return createTheme({
		theme,
		settings: (0, import_extends.default)({}, defaultSettingsGithubLight, settings),
		styles: [...githubLightStyle, ...styles]
	});
};
var githubLight = githubLightInit();
var defaultSettingsGithubDark = {
	background: "#0d1117",
	foreground: "#c9d1d9",
	caret: "#c9d1d9",
	selection: "#003d73",
	selectionMatch: "#003d73",
	lineHighlight: "#36334280"
};
var githubDarkStyle = [
	{
		tag: [_lezer_highlight.tags.standard(_lezer_highlight.tags.tagName), _lezer_highlight.tags.tagName],
		color: "#7ee787"
	},
	{
		tag: [_lezer_highlight.tags.comment, _lezer_highlight.tags.bracket],
		color: "#8b949e"
	},
	{
		tag: [_lezer_highlight.tags.className, _lezer_highlight.tags.propertyName],
		color: "#d2a8ff"
	},
	{
		tag: [
			_lezer_highlight.tags.variableName,
			_lezer_highlight.tags.attributeName,
			_lezer_highlight.tags.number,
			_lezer_highlight.tags.operator
		],
		color: "#79c0ff"
	},
	{
		tag: [
			_lezer_highlight.tags.keyword,
			_lezer_highlight.tags.typeName,
			_lezer_highlight.tags.typeOperator,
			_lezer_highlight.tags.typeName
		],
		color: "#ff7b72"
	},
	{
		tag: [
			_lezer_highlight.tags.string,
			_lezer_highlight.tags.meta,
			_lezer_highlight.tags.regexp
		],
		color: "#a5d6ff"
	},
	{
		tag: [_lezer_highlight.tags.name, _lezer_highlight.tags.quote],
		color: "#7ee787"
	},
	{
		tag: [_lezer_highlight.tags.heading, _lezer_highlight.tags.strong],
		color: "#d2a8ff",
		fontWeight: "bold"
	},
	{
		tag: [_lezer_highlight.tags.emphasis],
		color: "#d2a8ff",
		fontStyle: "italic"
	},
	{
		tag: [_lezer_highlight.tags.deleted],
		color: "#ffdcd7",
		backgroundColor: "ffeef0"
	},
	{
		tag: [
			_lezer_highlight.tags.atom,
			_lezer_highlight.tags.bool,
			_lezer_highlight.tags.special(_lezer_highlight.tags.variableName)
		],
		color: "#ffab70"
	},
	{
		tag: _lezer_highlight.tags.link,
		textDecoration: "underline"
	},
	{
		tag: _lezer_highlight.tags.strikethrough,
		textDecoration: "line-through"
	},
	{
		tag: _lezer_highlight.tags.invalid,
		color: "#f97583"
	}
];
var githubDarkInit = (options) => {
	var { theme = "dark", settings = {}, styles = [] } = options || {};
	return createTheme({
		theme,
		settings: (0, import_extends.default)({}, defaultSettingsGithubDark, settings),
		styles: [...githubDarkStyle, ...styles]
	});
};
var githubDark = githubDarkInit();
//#endregion
//#region ../../node_modules/.pnpm/@uiw+codemirror-theme-gruvbox-dark@4.25.7_@codemirror+language@6.12.2_@codemirror+state@6.5.4_@codemirror+view@6.39.16/node_modules/@uiw/codemirror-theme-gruvbox-dark/esm/index.js
/**
* @name gruvbox-dark
* @author morhetz
* Name: Gruvbox
* From github.com/codemirror/codemirror5/blob/master/theme/gruvbox-dark.css
*/
var defaultSettingsGruvboxDark = {
	background: "#282828",
	foreground: "#ebdbb2",
	caret: "#ebdbb2",
	selection: "#b99d555c",
	selectionMatch: "#b99d555c",
	lineHighlight: "#baa1602b",
	gutterBackground: "#282828",
	gutterForeground: "#7c6f64"
};
var gruvboxDarkStyle = [
	{
		tag: _lezer_highlight.tags.keyword,
		color: "#fb4934"
	},
	{
		tag: [
			_lezer_highlight.tags.name,
			_lezer_highlight.tags.deleted,
			_lezer_highlight.tags.character,
			_lezer_highlight.tags.propertyName,
			_lezer_highlight.tags.macroName
		],
		color: "#8ec07c"
	},
	{
		tag: [_lezer_highlight.tags.variableName],
		color: "#83a598"
	},
	{
		tag: [_lezer_highlight.tags.function(_lezer_highlight.tags.variableName)],
		color: "#b8bb26",
		fontStyle: "bold"
	},
	{
		tag: [_lezer_highlight.tags.labelName],
		color: "#ebdbb2"
	},
	{
		tag: [
			_lezer_highlight.tags.color,
			_lezer_highlight.tags.constant(_lezer_highlight.tags.name),
			_lezer_highlight.tags.standard(_lezer_highlight.tags.name)
		],
		color: "#d3869b"
	},
	{
		tag: [_lezer_highlight.tags.definition(_lezer_highlight.tags.name), _lezer_highlight.tags.separator],
		color: "#ebdbb2"
	},
	{
		tag: [_lezer_highlight.tags.brace],
		color: "#ebdbb2"
	},
	{
		tag: [_lezer_highlight.tags.annotation],
		color: "#fb4934d"
	},
	{
		tag: [
			_lezer_highlight.tags.number,
			_lezer_highlight.tags.changed,
			_lezer_highlight.tags.annotation,
			_lezer_highlight.tags.modifier,
			_lezer_highlight.tags.self,
			_lezer_highlight.tags.namespace
		],
		color: "#d3869b"
	},
	{
		tag: [_lezer_highlight.tags.typeName, _lezer_highlight.tags.className],
		color: "#fabd2f"
	},
	{
		tag: [_lezer_highlight.tags.operator, _lezer_highlight.tags.operatorKeyword],
		color: "#fb4934"
	},
	{
		tag: [_lezer_highlight.tags.tagName],
		color: "#8ec07c",
		fontStyle: "bold"
	},
	{
		tag: [_lezer_highlight.tags.squareBracket],
		color: "#fe8019"
	},
	{
		tag: [_lezer_highlight.tags.angleBracket],
		color: "#83a598"
	},
	{
		tag: [_lezer_highlight.tags.attributeName],
		color: "#8ec07c"
	},
	{
		tag: [_lezer_highlight.tags.regexp],
		color: "#8ec07c"
	},
	{
		tag: [_lezer_highlight.tags.quote],
		color: "#928374"
	},
	{
		tag: [_lezer_highlight.tags.string],
		color: "#ebdbb2"
	},
	{
		tag: _lezer_highlight.tags.link,
		color: "#a89984",
		textDecoration: "underline",
		textUnderlinePosition: "under"
	},
	{
		tag: [
			_lezer_highlight.tags.url,
			_lezer_highlight.tags.escape,
			_lezer_highlight.tags.special(_lezer_highlight.tags.string)
		],
		color: "#d3869b"
	},
	{
		tag: [_lezer_highlight.tags.meta],
		color: "#fabd2f"
	},
	{
		tag: [_lezer_highlight.tags.comment],
		color: "#928374",
		fontStyle: "italic"
	},
	{
		tag: _lezer_highlight.tags.strong,
		fontWeight: "bold",
		color: "#fe8019"
	},
	{
		tag: _lezer_highlight.tags.emphasis,
		fontStyle: "italic",
		color: "#b8bb26"
	},
	{
		tag: _lezer_highlight.tags.strikethrough,
		textDecoration: "line-through"
	},
	{
		tag: _lezer_highlight.tags.heading,
		fontWeight: "bold",
		color: "#b8bb26"
	},
	{
		tag: [_lezer_highlight.tags.heading1, _lezer_highlight.tags.heading2],
		fontWeight: "bold",
		color: "#b8bb26"
	},
	{
		tag: [_lezer_highlight.tags.heading3, _lezer_highlight.tags.heading4],
		fontWeight: "bold",
		color: "#fabd2f"
	},
	{
		tag: [_lezer_highlight.tags.heading5, _lezer_highlight.tags.heading6],
		color: "#fabd2f"
	},
	{
		tag: [
			_lezer_highlight.tags.atom,
			_lezer_highlight.tags.bool,
			_lezer_highlight.tags.special(_lezer_highlight.tags.variableName)
		],
		color: "#d3869b"
	},
	{
		tag: [_lezer_highlight.tags.processingInstruction, _lezer_highlight.tags.inserted],
		color: "#83a598"
	},
	{
		tag: [_lezer_highlight.tags.contentSeparator],
		color: "#fb4934"
	},
	{
		tag: _lezer_highlight.tags.invalid,
		color: "#fe8019",
		borderBottom: "1px dotted #fb4934d"
	}
];
var gruvboxDarkInit = (options) => {
	var { theme = "dark", settings = {}, styles = [] } = options || {};
	return createTheme({
		theme,
		settings: (0, import_extends.default)({}, defaultSettingsGruvboxDark, settings),
		styles: [...gruvboxDarkStyle, ...styles]
	});
};
var gruvboxDark = gruvboxDarkInit();
var defaultSettingsGruvboxLight = {
	background: "#fbf1c7",
	foreground: "#3c3836",
	caret: "#af3a03",
	selection: "#bdae9391",
	selectionMatch: "#bdae9391",
	lineHighlight: "#a37f2238",
	gutterBackground: "#ebdbb2",
	gutterForeground: "#665c54",
	gutterBorder: "transparent"
};
var gruvboxLightInit = (options) => {
	var { theme = "light", settings = {}, styles = [] } = options || {};
	return createTheme({
		theme,
		settings: (0, import_extends.default)({}, defaultSettingsGruvboxLight, settings),
		styles: [
			{
				tag: _lezer_highlight.tags.keyword,
				color: "#9d0006"
			},
			{
				tag: [
					_lezer_highlight.tags.name,
					_lezer_highlight.tags.deleted,
					_lezer_highlight.tags.character,
					_lezer_highlight.tags.propertyName,
					_lezer_highlight.tags.macroName
				],
				color: "#427b58"
			},
			{
				tag: [_lezer_highlight.tags.variableName],
				color: "#076678"
			},
			{
				tag: [_lezer_highlight.tags.function(_lezer_highlight.tags.variableName)],
				color: "#79740e",
				fontStyle: "bold"
			},
			{
				tag: [_lezer_highlight.tags.labelName],
				color: "#3c3836"
			},
			{
				tag: [
					_lezer_highlight.tags.color,
					_lezer_highlight.tags.constant(_lezer_highlight.tags.name),
					_lezer_highlight.tags.standard(_lezer_highlight.tags.name)
				],
				color: "#8f3f71"
			},
			{
				tag: [_lezer_highlight.tags.definition(_lezer_highlight.tags.name), _lezer_highlight.tags.separator],
				color: "#3c3836"
			},
			{
				tag: [_lezer_highlight.tags.brace],
				color: "#3c3836"
			},
			{
				tag: [_lezer_highlight.tags.annotation],
				color: "#9d0006"
			},
			{
				tag: [
					_lezer_highlight.tags.number,
					_lezer_highlight.tags.changed,
					_lezer_highlight.tags.annotation,
					_lezer_highlight.tags.modifier,
					_lezer_highlight.tags.self,
					_lezer_highlight.tags.namespace
				],
				color: "#8f3f71"
			},
			{
				tag: [_lezer_highlight.tags.typeName, _lezer_highlight.tags.className],
				color: "#b57614"
			},
			{
				tag: [_lezer_highlight.tags.operator, _lezer_highlight.tags.operatorKeyword],
				color: "#9d0006"
			},
			{
				tag: [_lezer_highlight.tags.tagName],
				color: "#427b58",
				fontStyle: "bold"
			},
			{
				tag: [_lezer_highlight.tags.squareBracket],
				color: "#af3a03"
			},
			{
				tag: [_lezer_highlight.tags.angleBracket],
				color: "#076678"
			},
			{
				tag: [_lezer_highlight.tags.attributeName],
				color: "#427b58"
			},
			{
				tag: [_lezer_highlight.tags.regexp],
				color: "#427b58"
			},
			{
				tag: [_lezer_highlight.tags.quote],
				color: "#928374"
			},
			{
				tag: [_lezer_highlight.tags.string],
				color: "#3c3836"
			},
			{
				tag: _lezer_highlight.tags.link,
				color: "#7c6f64",
				textDecoration: "underline",
				textUnderlinePosition: "under"
			},
			{
				tag: [
					_lezer_highlight.tags.url,
					_lezer_highlight.tags.escape,
					_lezer_highlight.tags.special(_lezer_highlight.tags.string)
				],
				color: "#8f3f71"
			},
			{
				tag: [_lezer_highlight.tags.meta],
				color: "#b57614"
			},
			{
				tag: [_lezer_highlight.tags.comment],
				color: "#928374",
				fontStyle: "italic"
			},
			{
				tag: _lezer_highlight.tags.strong,
				fontWeight: "bold",
				color: "#af3a03"
			},
			{
				tag: _lezer_highlight.tags.emphasis,
				fontStyle: "italic",
				color: "#79740e"
			},
			{
				tag: _lezer_highlight.tags.strikethrough,
				textDecoration: "line-through"
			},
			{
				tag: _lezer_highlight.tags.heading,
				fontWeight: "bold",
				color: "#79740e"
			},
			{
				tag: [_lezer_highlight.tags.heading1, _lezer_highlight.tags.heading2],
				fontWeight: "bold",
				color: "#79740e"
			},
			{
				tag: [_lezer_highlight.tags.heading3, _lezer_highlight.tags.heading4],
				fontWeight: "bold",
				color: "#b57614"
			},
			{
				tag: [_lezer_highlight.tags.heading5, _lezer_highlight.tags.heading6],
				color: "#b57614"
			},
			{
				tag: [
					_lezer_highlight.tags.atom,
					_lezer_highlight.tags.bool,
					_lezer_highlight.tags.special(_lezer_highlight.tags.variableName)
				],
				color: "#8f3f71"
			},
			{
				tag: [_lezer_highlight.tags.processingInstruction, _lezer_highlight.tags.inserted],
				color: "#076678"
			},
			{
				tag: [_lezer_highlight.tags.contentSeparator],
				color: "#9d0006"
			},
			{
				tag: _lezer_highlight.tags.invalid,
				color: "#af3a03",
				borderBottom: "1px dotted #9d0006"
			},
			...styles
		]
	});
};
var gruvboxLight = gruvboxLightInit();
//#endregion
//#region ../../node_modules/.pnpm/@uiw+codemirror-theme-kimbie@4.25.7_@codemirror+language@6.12.2_@codemirror+state@6.5.4_@codemirror+view@6.39.16/node_modules/@uiw/codemirror-theme-kimbie/esm/color.js
var config$9 = {
	background: "#221a0f",
	foreground: "#d3af86",
	selection: "#84613daa",
	selectionMatch: "#84613daa",
	cursor: "#d3af86",
	dropdownBackground: "#51412c",
	activeLine: "#5e452b52",
	matchingBracket: "#5e452b",
	keyword: "#98676a",
	storage: "#98676a",
	variable: "#dc3958",
	parameter: "#dc3958",
	function: "#7e602c",
	string: "#889b4a",
	constant: "#f79a32",
	type: "#f06431",
	class: "#f06431",
	number: "#f79a32",
	comment: "#a57a4c",
	heading: "#8ab1b0",
	invalid: "#dc3958",
	regexp: "#7e602c",
	tag: "#dc3958"
};
//#endregion
//#region ../../node_modules/.pnpm/@uiw+codemirror-theme-kimbie@4.25.7_@codemirror+language@6.12.2_@codemirror+state@6.5.4_@codemirror+view@6.39.16/node_modules/@uiw/codemirror-theme-kimbie/esm/index.js
var defaultSettingsKimbie = {
	background: config$9.background,
	foreground: config$9.foreground,
	caret: config$9.cursor,
	selection: config$9.selection,
	selectionMatch: config$9.selection,
	gutterBackground: config$9.background,
	gutterForeground: config$9.foreground,
	lineHighlight: config$9.activeLine
};
var kimbieDarkStyle = [
	{
		tag: _lezer_highlight.tags.keyword,
		color: config$9.keyword
	},
	{
		tag: [
			_lezer_highlight.tags.name,
			_lezer_highlight.tags.deleted,
			_lezer_highlight.tags.character,
			_lezer_highlight.tags.macroName
		],
		color: config$9.variable
	},
	{
		tag: [_lezer_highlight.tags.propertyName],
		color: config$9.function
	},
	{
		tag: [
			_lezer_highlight.tags.processingInstruction,
			_lezer_highlight.tags.string,
			_lezer_highlight.tags.inserted,
			_lezer_highlight.tags.special(_lezer_highlight.tags.string)
		],
		color: config$9.string
	},
	{
		tag: [_lezer_highlight.tags.function(_lezer_highlight.tags.variableName), _lezer_highlight.tags.labelName],
		color: config$9.function
	},
	{
		tag: [
			_lezer_highlight.tags.color,
			_lezer_highlight.tags.constant(_lezer_highlight.tags.name),
			_lezer_highlight.tags.standard(_lezer_highlight.tags.name)
		],
		color: config$9.constant
	},
	{
		tag: [_lezer_highlight.tags.definition(_lezer_highlight.tags.name), _lezer_highlight.tags.separator],
		color: config$9.variable
	},
	{
		tag: [_lezer_highlight.tags.className],
		color: config$9.class
	},
	{
		tag: [
			_lezer_highlight.tags.number,
			_lezer_highlight.tags.changed,
			_lezer_highlight.tags.annotation,
			_lezer_highlight.tags.modifier,
			_lezer_highlight.tags.self,
			_lezer_highlight.tags.namespace
		],
		color: config$9.number
	},
	{
		tag: [_lezer_highlight.tags.typeName],
		color: config$9.type,
		fontStyle: config$9.type
	},
	{
		tag: [_lezer_highlight.tags.operator, _lezer_highlight.tags.operatorKeyword],
		color: config$9.keyword
	},
	{
		tag: [
			_lezer_highlight.tags.url,
			_lezer_highlight.tags.escape,
			_lezer_highlight.tags.regexp,
			_lezer_highlight.tags.link
		],
		color: config$9.regexp
	},
	{
		tag: [_lezer_highlight.tags.meta, _lezer_highlight.tags.comment],
		color: config$9.comment
	},
	{
		tag: _lezer_highlight.tags.tagName,
		color: config$9.tag
	},
	{
		tag: _lezer_highlight.tags.strong,
		fontWeight: "bold"
	},
	{
		tag: _lezer_highlight.tags.emphasis,
		fontStyle: "italic"
	},
	{
		tag: _lezer_highlight.tags.link,
		textDecoration: "underline"
	},
	{
		tag: _lezer_highlight.tags.heading,
		fontWeight: "bold",
		color: config$9.heading
	},
	{
		tag: [
			_lezer_highlight.tags.atom,
			_lezer_highlight.tags.bool,
			_lezer_highlight.tags.special(_lezer_highlight.tags.variableName)
		],
		color: config$9.variable
	},
	{
		tag: _lezer_highlight.tags.invalid,
		color: config$9.invalid
	},
	{
		tag: _lezer_highlight.tags.strikethrough,
		textDecoration: "line-through"
	}
];
var kimbieInit = (options) => {
	var { theme = "dark", settings = {}, styles = [] } = options || {};
	return createTheme({
		theme,
		settings: (0, import_extends.default)({}, defaultSettingsKimbie, settings),
		styles: [...kimbieDarkStyle, ...styles]
	});
};
var kimbie = kimbieInit();
//#endregion
//#region ../../node_modules/.pnpm/@uiw+codemirror-theme-material@4.25.7_@codemirror+language@6.12.2_@codemirror+state@6.5.4_@codemirror+view@6.39.16/node_modules/@uiw/codemirror-theme-material/esm/index.js
var defaultSettingsMaterial = {
	background: "#2e3235",
	foreground: "#bdbdbd",
	caret: "#a0a4ae",
	selection: "#d7d4f063",
	selectionMatch: "#d7d4f063",
	gutterBackground: "#2e3235",
	gutterForeground: "#999",
	gutterActiveForeground: "#4f5b66",
	lineHighlight: "#545b6130"
};
var defaultSettingsMaterialDark = defaultSettingsMaterial;
var materialDarkStyle = [
	{
		tag: _lezer_highlight.tags.keyword,
		color: "#cf6edf"
	},
	{
		tag: [
			_lezer_highlight.tags.name,
			_lezer_highlight.tags.deleted,
			_lezer_highlight.tags.character,
			_lezer_highlight.tags.macroName
		],
		color: "#56c8d8"
	},
	{
		tag: [_lezer_highlight.tags.propertyName],
		color: "#facf4e"
	},
	{
		tag: [_lezer_highlight.tags.variableName],
		color: "#bdbdbd"
	},
	{
		tag: [_lezer_highlight.tags.function(_lezer_highlight.tags.variableName)],
		color: "#56c8d8"
	},
	{
		tag: [_lezer_highlight.tags.labelName],
		color: "#cf6edf"
	},
	{
		tag: [
			_lezer_highlight.tags.color,
			_lezer_highlight.tags.constant(_lezer_highlight.tags.name),
			_lezer_highlight.tags.standard(_lezer_highlight.tags.name)
		],
		color: "#facf4e"
	},
	{
		tag: [_lezer_highlight.tags.definition(_lezer_highlight.tags.name), _lezer_highlight.tags.separator],
		color: "#fa5788"
	},
	{
		tag: [_lezer_highlight.tags.brace],
		color: "#cf6edf"
	},
	{
		tag: [_lezer_highlight.tags.annotation],
		color: "#ff5f52"
	},
	{
		tag: [
			_lezer_highlight.tags.number,
			_lezer_highlight.tags.changed,
			_lezer_highlight.tags.annotation,
			_lezer_highlight.tags.modifier,
			_lezer_highlight.tags.self,
			_lezer_highlight.tags.namespace
		],
		color: "#ffad42"
	},
	{
		tag: [_lezer_highlight.tags.typeName, _lezer_highlight.tags.className],
		color: "#ffad42"
	},
	{
		tag: [_lezer_highlight.tags.operator, _lezer_highlight.tags.operatorKeyword],
		color: "#7186f0"
	},
	{
		tag: [_lezer_highlight.tags.tagName],
		color: "#99d066"
	},
	{
		tag: [_lezer_highlight.tags.squareBracket],
		color: "#ff5f52"
	},
	{
		tag: [_lezer_highlight.tags.angleBracket],
		color: "#606f7a"
	},
	{
		tag: [_lezer_highlight.tags.attributeName],
		color: "#bdbdbd"
	},
	{
		tag: [_lezer_highlight.tags.regexp],
		color: "#ff5f52"
	},
	{
		tag: [_lezer_highlight.tags.quote],
		color: "#6abf69"
	},
	{
		tag: [_lezer_highlight.tags.string],
		color: "#99d066"
	},
	{
		tag: _lezer_highlight.tags.link,
		color: "#56c8d8",
		textDecoration: "underline",
		textUnderlinePosition: "under"
	},
	{
		tag: [
			_lezer_highlight.tags.url,
			_lezer_highlight.tags.escape,
			_lezer_highlight.tags.special(_lezer_highlight.tags.string)
		],
		color: "#facf4e"
	},
	{
		tag: [_lezer_highlight.tags.meta],
		color: "#707d8b"
	},
	{
		tag: [_lezer_highlight.tags.comment],
		color: "#707d8b",
		fontStyle: "italic"
	},
	{
		tag: _lezer_highlight.tags.monospace,
		color: "#bdbdbd"
	},
	{
		tag: _lezer_highlight.tags.strong,
		fontWeight: "bold",
		color: "#ff5f52"
	},
	{
		tag: _lezer_highlight.tags.emphasis,
		fontStyle: "italic",
		color: "#99d066"
	},
	{
		tag: _lezer_highlight.tags.strikethrough,
		textDecoration: "line-through"
	},
	{
		tag: _lezer_highlight.tags.heading,
		fontWeight: "bold",
		color: "#facf4e"
	},
	{
		tag: _lezer_highlight.tags.heading1,
		fontWeight: "bold",
		color: "#facf4e"
	},
	{
		tag: [
			_lezer_highlight.tags.heading2,
			_lezer_highlight.tags.heading3,
			_lezer_highlight.tags.heading4
		],
		fontWeight: "bold",
		color: "#facf4e"
	},
	{
		tag: [_lezer_highlight.tags.heading5, _lezer_highlight.tags.heading6],
		color: "#facf4e"
	},
	{
		tag: [
			_lezer_highlight.tags.atom,
			_lezer_highlight.tags.bool,
			_lezer_highlight.tags.special(_lezer_highlight.tags.variableName)
		],
		color: "#56c8d8"
	},
	{
		tag: [_lezer_highlight.tags.processingInstruction, _lezer_highlight.tags.inserted],
		color: "#ff5f52"
	},
	{
		tag: [_lezer_highlight.tags.contentSeparator],
		color: "#56c8d8"
	},
	{
		tag: _lezer_highlight.tags.invalid,
		color: "#606f7a",
		borderBottom: "1px dotted #ff5f52"
	}
];
var materialInit = (options) => {
	var { theme = "dark", settings = {}, styles = [] } = options || {};
	return createTheme({
		theme,
		settings: (0, import_extends.default)({}, defaultSettingsMaterial, settings),
		styles: [...materialDarkStyle, ...styles]
	});
};
var materialDarkInit = materialInit;
var materialDark = materialInit();
var material = materialInit();
var defaultSettingsMaterialLight = {
	background: "#FAFAFA",
	foreground: "#90A4AE",
	caret: "#272727",
	selection: "#80CBC440",
	selectionMatch: "#80CBC440",
	gutterBackground: "#FAFAFA",
	gutterForeground: "#90A4AE",
	gutterBorder: "transparent",
	lineHighlight: "#CCD7DA50"
};
var materialLightStyle = [
	{
		tag: _lezer_highlight.tags.keyword,
		color: "#39ADB5"
	},
	{
		tag: [
			_lezer_highlight.tags.name,
			_lezer_highlight.tags.deleted,
			_lezer_highlight.tags.character,
			_lezer_highlight.tags.macroName
		],
		color: "#90A4AE"
	},
	{
		tag: [_lezer_highlight.tags.propertyName],
		color: "#6182B8"
	},
	{
		tag: [
			_lezer_highlight.tags.processingInstruction,
			_lezer_highlight.tags.string,
			_lezer_highlight.tags.inserted,
			_lezer_highlight.tags.special(_lezer_highlight.tags.string)
		],
		color: "#91B859"
	},
	{
		tag: [_lezer_highlight.tags.function(_lezer_highlight.tags.variableName), _lezer_highlight.tags.labelName],
		color: "#6182B8"
	},
	{
		tag: [
			_lezer_highlight.tags.color,
			_lezer_highlight.tags.constant(_lezer_highlight.tags.name),
			_lezer_highlight.tags.standard(_lezer_highlight.tags.name)
		],
		color: "#39ADB5"
	},
	{
		tag: [_lezer_highlight.tags.definition(_lezer_highlight.tags.name), _lezer_highlight.tags.separator],
		color: "#90A4AE"
	},
	{
		tag: [_lezer_highlight.tags.className],
		color: "#E2931D"
	},
	{
		tag: [
			_lezer_highlight.tags.number,
			_lezer_highlight.tags.changed,
			_lezer_highlight.tags.annotation,
			_lezer_highlight.tags.modifier,
			_lezer_highlight.tags.self,
			_lezer_highlight.tags.namespace
		],
		color: "#F76D47"
	},
	{
		tag: [_lezer_highlight.tags.typeName],
		color: "#E2931D",
		fontStyle: "#E2931D"
	},
	{
		tag: [_lezer_highlight.tags.operator, _lezer_highlight.tags.operatorKeyword],
		color: "#39ADB5"
	},
	{
		tag: [
			_lezer_highlight.tags.url,
			_lezer_highlight.tags.escape,
			_lezer_highlight.tags.regexp,
			_lezer_highlight.tags.link
		],
		color: "#91B859"
	},
	{
		tag: [_lezer_highlight.tags.meta, _lezer_highlight.tags.comment],
		color: "#90A4AE"
	},
	{
		tag: _lezer_highlight.tags.strong,
		fontWeight: "bold"
	},
	{
		tag: _lezer_highlight.tags.emphasis,
		fontStyle: "italic"
	},
	{
		tag: _lezer_highlight.tags.link,
		textDecoration: "underline"
	},
	{
		tag: _lezer_highlight.tags.heading,
		fontWeight: "bold",
		color: "#39ADB5"
	},
	{
		tag: [
			_lezer_highlight.tags.atom,
			_lezer_highlight.tags.bool,
			_lezer_highlight.tags.special(_lezer_highlight.tags.variableName)
		],
		color: "#90A4AE"
	},
	{
		tag: _lezer_highlight.tags.invalid,
		color: "#E5393570"
	},
	{
		tag: _lezer_highlight.tags.strikethrough,
		textDecoration: "line-through"
	}
];
var materialLightInit = (options) => {
	var { theme = "light", settings = {}, styles = [] } = options || {};
	return createTheme({
		theme,
		settings: (0, import_extends.default)({}, defaultSettingsMaterialLight, settings),
		styles: [...materialLightStyle, ...styles]
	});
};
var materialLight = materialLightInit();
//#endregion
//#region ../../node_modules/.pnpm/@uiw+codemirror-theme-monokai@4.25.7_@codemirror+language@6.12.2_@codemirror+state@6.5.4_@codemirror+view@6.39.16/node_modules/@uiw/codemirror-theme-monokai/esm/color.js
var config$8 = {
	background: "#272822",
	foreground: "#f8f8f2",
	selection: "#4a4a76",
	selectionMatch: "#4a4a76",
	cursor: "#f8f8f0",
	dropdownBackground: "#414339",
	activeLine: "#3e3d3257",
	matchingBracket: "#3e3d32",
	keyword: "#F92672",
	storage: "#F92672",
	variable: "#FD971F",
	parameter: "#FD971F",
	function: "#66D9EF",
	string: "#E6DB74",
	constant: "#AE81FF",
	type: "#66D9EF",
	class: "#A6E22E",
	number: "#AE81FF",
	comment: "#88846f",
	heading: "#A6E22E",
	invalid: "#F44747",
	regexp: "#E6DB74",
	tag: "#F92672"
};
//#endregion
//#region ../../node_modules/.pnpm/@uiw+codemirror-theme-monokai@4.25.7_@codemirror+language@6.12.2_@codemirror+state@6.5.4_@codemirror+view@6.39.16/node_modules/@uiw/codemirror-theme-monokai/esm/index.js
var defaultSettingsMonokai = {
	background: config$8.background,
	foreground: config$8.foreground,
	caret: config$8.cursor,
	selection: config$8.selection,
	selectionMatch: config$8.selection,
	gutterBackground: config$8.background,
	gutterForeground: config$8.foreground,
	lineHighlight: config$8.activeLine
};
var monokaiDarkStyle = [
	{
		tag: _lezer_highlight.tags.keyword,
		color: config$8.keyword
	},
	{
		tag: [
			_lezer_highlight.tags.name,
			_lezer_highlight.tags.deleted,
			_lezer_highlight.tags.character,
			_lezer_highlight.tags.macroName
		],
		color: config$8.variable
	},
	{
		tag: [_lezer_highlight.tags.propertyName],
		color: config$8.function
	},
	{
		tag: [
			_lezer_highlight.tags.processingInstruction,
			_lezer_highlight.tags.string,
			_lezer_highlight.tags.inserted,
			_lezer_highlight.tags.special(_lezer_highlight.tags.string)
		],
		color: config$8.string
	},
	{
		tag: [_lezer_highlight.tags.function(_lezer_highlight.tags.variableName), _lezer_highlight.tags.labelName],
		color: config$8.function
	},
	{
		tag: [
			_lezer_highlight.tags.color,
			_lezer_highlight.tags.constant(_lezer_highlight.tags.name),
			_lezer_highlight.tags.standard(_lezer_highlight.tags.name)
		],
		color: config$8.constant
	},
	{
		tag: [_lezer_highlight.tags.definition(_lezer_highlight.tags.name), _lezer_highlight.tags.separator],
		color: config$8.variable
	},
	{
		tag: [_lezer_highlight.tags.className],
		color: config$8.class
	},
	{
		tag: [
			_lezer_highlight.tags.number,
			_lezer_highlight.tags.changed,
			_lezer_highlight.tags.annotation,
			_lezer_highlight.tags.modifier,
			_lezer_highlight.tags.self,
			_lezer_highlight.tags.namespace
		],
		color: config$8.number
	},
	{
		tag: [_lezer_highlight.tags.typeName],
		color: config$8.type,
		fontStyle: config$8.type
	},
	{
		tag: [_lezer_highlight.tags.operator, _lezer_highlight.tags.operatorKeyword],
		color: config$8.keyword
	},
	{
		tag: [
			_lezer_highlight.tags.url,
			_lezer_highlight.tags.escape,
			_lezer_highlight.tags.regexp,
			_lezer_highlight.tags.link
		],
		color: config$8.regexp
	},
	{
		tag: [_lezer_highlight.tags.meta, _lezer_highlight.tags.comment],
		color: config$8.comment
	},
	{
		tag: _lezer_highlight.tags.tagName,
		color: config$8.tag
	},
	{
		tag: _lezer_highlight.tags.strong,
		fontWeight: "bold"
	},
	{
		tag: _lezer_highlight.tags.emphasis,
		fontStyle: "italic"
	},
	{
		tag: _lezer_highlight.tags.link,
		textDecoration: "underline"
	},
	{
		tag: _lezer_highlight.tags.heading,
		fontWeight: "bold",
		color: config$8.heading
	},
	{
		tag: [
			_lezer_highlight.tags.atom,
			_lezer_highlight.tags.bool,
			_lezer_highlight.tags.special(_lezer_highlight.tags.variableName)
		],
		color: config$8.variable
	},
	{
		tag: _lezer_highlight.tags.invalid,
		color: config$8.invalid
	},
	{
		tag: _lezer_highlight.tags.strikethrough,
		textDecoration: "line-through"
	}
];
var monokaiInit = (options) => {
	var { theme = "dark", settings = {}, styles = [] } = options || {};
	return createTheme({
		theme,
		settings: (0, import_extends.default)({}, defaultSettingsMonokai, settings),
		styles: [...monokaiDarkStyle, ...styles]
	});
};
var monokai = monokaiInit();
//#endregion
//#region ../../node_modules/.pnpm/@uiw+codemirror-theme-monokai-dimmed@4.25.7_@codemirror+language@6.12.2_@codemirror+state@6.5.4_@codemirror+view@6.39.16/node_modules/@uiw/codemirror-theme-monokai-dimmed/esm/color.js
var config$7 = {
	background: "#1e1e1e",
	foreground: "#c5c8c6",
	selection: "#4747a1",
	selectionMatch: "#4747a1",
	cursor: "#c07020",
	dropdownBackground: "#525252",
	activeLine: "#30303078",
	matchingBracket: "#303030",
	keyword: "#676867",
	storage: "#676867",
	variable: "#c7444a",
	parameter: "#6089B4",
	function: "#9872A2",
	string: "#D08442",
	constant: "#8080FF",
	type: "#9B0000",
	class: "#CE6700",
	number: "#6089B4",
	comment: "#9A9B99",
	heading: "#D0B344",
	invalid: "#FF0B00",
	regexp: "#D08442",
	tag: "#6089B4"
};
//#endregion
//#region ../../node_modules/.pnpm/@uiw+codemirror-theme-monokai-dimmed@4.25.7_@codemirror+language@6.12.2_@codemirror+state@6.5.4_@codemirror+view@6.39.16/node_modules/@uiw/codemirror-theme-monokai-dimmed/esm/index.js
var defaultSettingsMonokaiDimmed = {
	background: config$7.background,
	foreground: config$7.foreground,
	caret: config$7.cursor,
	selection: config$7.selection,
	selectionMatch: config$7.selection,
	gutterBackground: config$7.background,
	gutterForeground: config$7.foreground,
	lineHighlight: config$7.activeLine
};
var monokaiDimmedDarkStyle = [
	{
		tag: _lezer_highlight.tags.keyword,
		color: config$7.keyword
	},
	{
		tag: [
			_lezer_highlight.tags.name,
			_lezer_highlight.tags.deleted,
			_lezer_highlight.tags.character,
			_lezer_highlight.tags.macroName
		],
		color: config$7.variable
	},
	{
		tag: [_lezer_highlight.tags.propertyName],
		color: config$7.function
	},
	{
		tag: [
			_lezer_highlight.tags.processingInstruction,
			_lezer_highlight.tags.string,
			_lezer_highlight.tags.inserted,
			_lezer_highlight.tags.special(_lezer_highlight.tags.string)
		],
		color: config$7.string
	},
	{
		tag: [_lezer_highlight.tags.function(_lezer_highlight.tags.variableName), _lezer_highlight.tags.labelName],
		color: config$7.function
	},
	{
		tag: [
			_lezer_highlight.tags.color,
			_lezer_highlight.tags.constant(_lezer_highlight.tags.name),
			_lezer_highlight.tags.standard(_lezer_highlight.tags.name)
		],
		color: config$7.constant
	},
	{
		tag: [_lezer_highlight.tags.definition(_lezer_highlight.tags.name), _lezer_highlight.tags.separator],
		color: config$7.variable
	},
	{
		tag: [_lezer_highlight.tags.className],
		color: config$7.class
	},
	{
		tag: [
			_lezer_highlight.tags.number,
			_lezer_highlight.tags.changed,
			_lezer_highlight.tags.annotation,
			_lezer_highlight.tags.modifier,
			_lezer_highlight.tags.self,
			_lezer_highlight.tags.namespace
		],
		color: config$7.number
	},
	{
		tag: [_lezer_highlight.tags.typeName],
		color: config$7.type,
		fontStyle: config$7.type
	},
	{
		tag: [_lezer_highlight.tags.operator, _lezer_highlight.tags.operatorKeyword],
		color: config$7.keyword
	},
	{
		tag: [
			_lezer_highlight.tags.url,
			_lezer_highlight.tags.escape,
			_lezer_highlight.tags.regexp,
			_lezer_highlight.tags.link
		],
		color: config$7.regexp
	},
	{
		tag: [_lezer_highlight.tags.meta, _lezer_highlight.tags.comment],
		color: config$7.comment
	},
	{
		tag: _lezer_highlight.tags.tagName,
		color: config$7.tag
	},
	{
		tag: _lezer_highlight.tags.strong,
		fontWeight: "bold"
	},
	{
		tag: _lezer_highlight.tags.emphasis,
		fontStyle: "italic"
	},
	{
		tag: _lezer_highlight.tags.link,
		textDecoration: "underline"
	},
	{
		tag: _lezer_highlight.tags.heading,
		fontWeight: "bold",
		color: config$7.heading
	},
	{
		tag: [
			_lezer_highlight.tags.atom,
			_lezer_highlight.tags.bool,
			_lezer_highlight.tags.special(_lezer_highlight.tags.variableName)
		],
		color: config$7.variable
	},
	{
		tag: _lezer_highlight.tags.invalid,
		color: config$7.invalid
	},
	{
		tag: _lezer_highlight.tags.strikethrough,
		textDecoration: "line-through"
	}
];
var monokaiDimmedInit = (options) => {
	var { theme = "dark", settings = {}, styles = [] } = options || {};
	return createTheme({
		theme,
		settings: (0, import_extends.default)({}, defaultSettingsMonokaiDimmed, settings),
		styles: [...monokaiDimmedDarkStyle, ...styles]
	});
};
var monokaiDimmed = monokaiDimmedInit();
//#endregion
//#region ../../node_modules/.pnpm/@uiw+codemirror-theme-noctis-lilac@4.25.7_@codemirror+language@6.12.2_@codemirror+state@6.5.4_@codemirror+view@6.39.16/node_modules/@uiw/codemirror-theme-noctis-lilac/esm/index.js
var defaultSettingsNoctisLilac = {
	background: "#f2f1f8",
	foreground: "#0c006b",
	caret: "#5c49e9",
	selection: "#d5d1f2",
	selectionMatch: "#d5d1f2",
	gutterBackground: "#f2f1f8",
	gutterForeground: "#0c006b70",
	lineHighlight: "#16067911"
};
var noctisLilacLightStyle = [
	{
		tag: _lezer_highlight.tags.comment,
		color: "#9995b7"
	},
	{
		tag: _lezer_highlight.tags.keyword,
		color: "#ff5792",
		fontWeight: "bold"
	},
	{
		tag: [_lezer_highlight.tags.definitionKeyword, _lezer_highlight.tags.modifier],
		color: "#ff5792"
	},
	{
		tag: [
			_lezer_highlight.tags.className,
			_lezer_highlight.tags.tagName,
			_lezer_highlight.tags.definition(_lezer_highlight.tags.typeName)
		],
		color: "#0094f0"
	},
	{
		tag: [
			_lezer_highlight.tags.number,
			_lezer_highlight.tags.bool,
			_lezer_highlight.tags.null,
			_lezer_highlight.tags.special(_lezer_highlight.tags.brace)
		],
		color: "#5842ff"
	},
	{
		tag: [_lezer_highlight.tags.definition(_lezer_highlight.tags.propertyName), _lezer_highlight.tags.function(_lezer_highlight.tags.variableName)],
		color: "#0095a8"
	},
	{
		tag: _lezer_highlight.tags.typeName,
		color: "#b3694d"
	},
	{
		tag: [_lezer_highlight.tags.propertyName, _lezer_highlight.tags.variableName],
		color: "#fa8900"
	},
	{
		tag: _lezer_highlight.tags.operator,
		color: "#ff5792"
	},
	{
		tag: _lezer_highlight.tags.self,
		color: "#e64100"
	},
	{
		tag: [_lezer_highlight.tags.string, _lezer_highlight.tags.regexp],
		color: "#00b368"
	},
	{
		tag: [_lezer_highlight.tags.paren, _lezer_highlight.tags.bracket],
		color: "#0431fa"
	},
	{
		tag: _lezer_highlight.tags.labelName,
		color: "#00bdd6"
	},
	{
		tag: _lezer_highlight.tags.attributeName,
		color: "#e64100"
	},
	{
		tag: _lezer_highlight.tags.angleBracket,
		color: "#9995b7"
	}
];
var noctisLilacInit = (options) => {
	var { theme = "light", settings = {}, styles = [] } = options || {};
	return createTheme({
		theme,
		settings: (0, import_extends.default)({}, defaultSettingsNoctisLilac, settings),
		styles: [...noctisLilacLightStyle, ...styles]
	});
};
var noctisLilac = noctisLilacInit();
//#endregion
//#region ../../node_modules/.pnpm/@uiw+codemirror-theme-nord@4.25.7_@codemirror+language@6.12.2_@codemirror+state@6.5.4_@codemirror+view@6.39.16/node_modules/@uiw/codemirror-theme-nord/esm/index.js
var defaultSettingsNord = {
	background: "#2e3440",
	foreground: "#FFFFFF",
	caret: "#FFFFFF",
	selection: "#00000073",
	selectionMatch: "#00000073",
	gutterBackground: "#2e3440",
	gutterForeground: "#4c566a",
	gutterActiveForeground: "#d8dee9",
	lineHighlight: "#4c566a29"
};
var nordDarkStyle = [
	{
		tag: _lezer_highlight.tags.keyword,
		color: "#5e81ac"
	},
	{
		tag: [
			_lezer_highlight.tags.name,
			_lezer_highlight.tags.deleted,
			_lezer_highlight.tags.character,
			_lezer_highlight.tags.propertyName,
			_lezer_highlight.tags.macroName
		],
		color: "#88c0d0"
	},
	{
		tag: [_lezer_highlight.tags.variableName],
		color: "#8fbcbb"
	},
	{
		tag: [_lezer_highlight.tags.function(_lezer_highlight.tags.variableName)],
		color: "#8fbcbb"
	},
	{
		tag: [_lezer_highlight.tags.labelName],
		color: "#81a1c1"
	},
	{
		tag: [
			_lezer_highlight.tags.color,
			_lezer_highlight.tags.constant(_lezer_highlight.tags.name),
			_lezer_highlight.tags.standard(_lezer_highlight.tags.name)
		],
		color: "#5e81ac"
	},
	{
		tag: [_lezer_highlight.tags.definition(_lezer_highlight.tags.name), _lezer_highlight.tags.separator],
		color: "#a3be8c"
	},
	{
		tag: [_lezer_highlight.tags.brace],
		color: "#8fbcbb"
	},
	{
		tag: [_lezer_highlight.tags.annotation],
		color: "#d30102"
	},
	{
		tag: [
			_lezer_highlight.tags.number,
			_lezer_highlight.tags.changed,
			_lezer_highlight.tags.annotation,
			_lezer_highlight.tags.modifier,
			_lezer_highlight.tags.self,
			_lezer_highlight.tags.namespace
		],
		color: "#b48ead"
	},
	{
		tag: [_lezer_highlight.tags.typeName, _lezer_highlight.tags.className],
		color: "#ebcb8b"
	},
	{
		tag: [_lezer_highlight.tags.operator, _lezer_highlight.tags.operatorKeyword],
		color: "#a3be8c"
	},
	{
		tag: [_lezer_highlight.tags.tagName],
		color: "#b48ead"
	},
	{
		tag: [_lezer_highlight.tags.squareBracket],
		color: "#bf616a"
	},
	{
		tag: [_lezer_highlight.tags.angleBracket],
		color: "#d08770"
	},
	{
		tag: [_lezer_highlight.tags.attributeName],
		color: "#ebcb8b"
	},
	{
		tag: [_lezer_highlight.tags.regexp],
		color: "#5e81ac"
	},
	{
		tag: [_lezer_highlight.tags.quote],
		color: "#b48ead"
	},
	{
		tag: [_lezer_highlight.tags.string],
		color: "#a3be8c"
	},
	{
		tag: _lezer_highlight.tags.link,
		color: "#a3be8c",
		textDecoration: "underline",
		textUnderlinePosition: "under"
	},
	{
		tag: [
			_lezer_highlight.tags.url,
			_lezer_highlight.tags.escape,
			_lezer_highlight.tags.special(_lezer_highlight.tags.string)
		],
		color: "#8fbcbb"
	},
	{
		tag: [_lezer_highlight.tags.meta],
		color: "#88c0d0"
	},
	{
		tag: [_lezer_highlight.tags.monospace],
		color: "#d8dee9",
		fontStyle: "italic"
	},
	{
		tag: [_lezer_highlight.tags.comment],
		color: "#4c566a",
		fontStyle: "italic"
	},
	{
		tag: _lezer_highlight.tags.strong,
		fontWeight: "bold",
		color: "#5e81ac"
	},
	{
		tag: _lezer_highlight.tags.emphasis,
		fontStyle: "italic",
		color: "#5e81ac"
	},
	{
		tag: _lezer_highlight.tags.strikethrough,
		textDecoration: "line-through"
	},
	{
		tag: _lezer_highlight.tags.heading,
		fontWeight: "bold",
		color: "#5e81ac"
	},
	{
		tag: _lezer_highlight.tags.special(_lezer_highlight.tags.heading1),
		fontWeight: "bold",
		color: "#5e81ac"
	},
	{
		tag: _lezer_highlight.tags.heading1,
		fontWeight: "bold",
		color: "#5e81ac"
	},
	{
		tag: [
			_lezer_highlight.tags.heading2,
			_lezer_highlight.tags.heading3,
			_lezer_highlight.tags.heading4
		],
		fontWeight: "bold",
		color: "#5e81ac"
	},
	{
		tag: [_lezer_highlight.tags.heading5, _lezer_highlight.tags.heading6],
		color: "#5e81ac"
	},
	{
		tag: [
			_lezer_highlight.tags.atom,
			_lezer_highlight.tags.bool,
			_lezer_highlight.tags.special(_lezer_highlight.tags.variableName)
		],
		color: "#d08770"
	},
	{
		tag: [_lezer_highlight.tags.processingInstruction, _lezer_highlight.tags.inserted],
		color: "#8fbcbb"
	},
	{
		tag: [_lezer_highlight.tags.contentSeparator],
		color: "#ebcb8b"
	},
	{
		tag: _lezer_highlight.tags.invalid,
		color: "#434c5e",
		borderBottom: "1px dotted #d30102"
	}
];
var nordInit = (options) => {
	var { theme = "dark", settings = {}, styles = [] } = options || {};
	return createTheme({
		theme,
		settings: (0, import_extends.default)({}, defaultSettingsNord, settings),
		styles: [...nordDarkStyle, ...styles]
	});
};
var nord = nordInit();
//#endregion
//#region ../../node_modules/.pnpm/@uiw+codemirror-theme-okaidia@4.25.7_@codemirror+language@6.12.2_@codemirror+state@6.5.4_@codemirror+view@6.39.16/node_modules/@uiw/codemirror-theme-okaidia/esm/index.js
var defaultSettingsOkaidia = {
	background: "#272822",
	foreground: "#FFFFFF",
	caret: "#FFFFFF",
	selection: "#49483E",
	selectionMatch: "#49483E",
	gutterBackground: "#272822",
	gutterForeground: "#FFFFFF70",
	lineHighlight: "#0000003b"
};
var okaidiaDarkStyle = [
	{
		tag: [_lezer_highlight.tags.comment, _lezer_highlight.tags.documentMeta],
		color: "#8292a2"
	},
	{
		tag: [
			_lezer_highlight.tags.number,
			_lezer_highlight.tags.bool,
			_lezer_highlight.tags.null,
			_lezer_highlight.tags.atom
		],
		color: "#ae81ff"
	},
	{
		tag: [
			_lezer_highlight.tags.attributeValue,
			_lezer_highlight.tags.className,
			_lezer_highlight.tags.name
		],
		color: "#e6db74"
	},
	{
		tag: [_lezer_highlight.tags.propertyName, _lezer_highlight.tags.attributeName],
		color: "#a6e22e"
	},
	{
		tag: [_lezer_highlight.tags.variableName],
		color: "#9effff"
	},
	{
		tag: [_lezer_highlight.tags.squareBracket],
		color: "#bababa"
	},
	{
		tag: [_lezer_highlight.tags.string, _lezer_highlight.tags.special(_lezer_highlight.tags.brace)],
		color: "#e6db74"
	},
	{
		tag: [
			_lezer_highlight.tags.regexp,
			_lezer_highlight.tags.className,
			_lezer_highlight.tags.typeName,
			_lezer_highlight.tags.definition(_lezer_highlight.tags.typeName)
		],
		color: "#66d9ef"
	},
	{
		tag: [
			_lezer_highlight.tags.definition(_lezer_highlight.tags.variableName),
			_lezer_highlight.tags.definition(_lezer_highlight.tags.propertyName),
			_lezer_highlight.tags.function(_lezer_highlight.tags.variableName)
		],
		color: "#fd971f"
	},
	{
		tag: [
			_lezer_highlight.tags.keyword,
			_lezer_highlight.tags.definitionKeyword,
			_lezer_highlight.tags.modifier,
			_lezer_highlight.tags.tagName,
			_lezer_highlight.tags.angleBracket
		],
		color: "#f92672"
	}
];
var okaidiaInit = (options) => {
	var { theme = "dark", settings = {}, styles = [] } = options || {};
	return createTheme({
		theme,
		settings: (0, import_extends.default)({}, defaultSettingsOkaidia, settings),
		styles: [...okaidiaDarkStyle, ...styles]
	});
};
var okaidia = okaidiaInit();
//#endregion
//#region ../../node_modules/.pnpm/@uiw+codemirror-theme-quietlight@4.25.7_@codemirror+language@6.12.2_@codemirror+state@6.5.4_@codemirror+view@6.39.16/node_modules/@uiw/codemirror-theme-quietlight/esm/color.js
var config$6 = {
	background: "#F5F5F5",
	foreground: "#333333",
	selection: "#C9D0D9",
	selectionMatch: "#C9D0D9",
	cursor: "#54494B",
	dropdownBackground: "#F5F5F5",
	activeLine: "#79ff002b",
	matchingBracket: "#E4F6D4",
	keyword: "#4B69C6",
	storage: "#4B69C6",
	variable: "#7A3E9D",
	parameter: "#7A3E9D",
	function: "#AA3731",
	string: "#448C27",
	constant: "#9C5D27",
	type: "#7A3E9D",
	class: "#AA3731",
	number: "#9C5D27",
	comment: "#AAAAAA",
	heading: "#AA3731",
	invalid: "#cd3131",
	regexp: "#4B69C6",
	tag: "#4B69C6"
};
//#endregion
//#region ../../node_modules/.pnpm/@uiw+codemirror-theme-quietlight@4.25.7_@codemirror+language@6.12.2_@codemirror+state@6.5.4_@codemirror+view@6.39.16/node_modules/@uiw/codemirror-theme-quietlight/esm/index.js
var defaultSettingsQuietlight = {
	background: config$6.background,
	foreground: config$6.foreground,
	caret: config$6.cursor,
	selection: config$6.selection,
	selectionMatch: config$6.selection,
	gutterBackground: config$6.background,
	gutterForeground: config$6.foreground,
	gutterBorder: "transparent",
	lineHighlight: config$6.activeLine
};
var quietlightStyle = [
	{
		tag: _lezer_highlight.tags.keyword,
		color: config$6.keyword
	},
	{
		tag: [
			_lezer_highlight.tags.name,
			_lezer_highlight.tags.deleted,
			_lezer_highlight.tags.character,
			_lezer_highlight.tags.macroName
		],
		color: config$6.variable
	},
	{
		tag: [_lezer_highlight.tags.propertyName],
		color: config$6.function
	},
	{
		tag: [
			_lezer_highlight.tags.processingInstruction,
			_lezer_highlight.tags.string,
			_lezer_highlight.tags.inserted,
			_lezer_highlight.tags.special(_lezer_highlight.tags.string)
		],
		color: config$6.string
	},
	{
		tag: [_lezer_highlight.tags.function(_lezer_highlight.tags.variableName), _lezer_highlight.tags.labelName],
		color: config$6.function
	},
	{
		tag: [
			_lezer_highlight.tags.color,
			_lezer_highlight.tags.constant(_lezer_highlight.tags.name),
			_lezer_highlight.tags.standard(_lezer_highlight.tags.name)
		],
		color: config$6.constant
	},
	{
		tag: [_lezer_highlight.tags.definition(_lezer_highlight.tags.name), _lezer_highlight.tags.separator],
		color: config$6.variable
	},
	{
		tag: [_lezer_highlight.tags.className],
		color: config$6.class
	},
	{
		tag: [
			_lezer_highlight.tags.number,
			_lezer_highlight.tags.changed,
			_lezer_highlight.tags.annotation,
			_lezer_highlight.tags.modifier,
			_lezer_highlight.tags.self,
			_lezer_highlight.tags.namespace
		],
		color: config$6.number
	},
	{
		tag: [_lezer_highlight.tags.typeName],
		color: config$6.type,
		fontStyle: config$6.type
	},
	{
		tag: [_lezer_highlight.tags.operator, _lezer_highlight.tags.operatorKeyword],
		color: config$6.keyword
	},
	{
		tag: [
			_lezer_highlight.tags.url,
			_lezer_highlight.tags.escape,
			_lezer_highlight.tags.regexp,
			_lezer_highlight.tags.link
		],
		color: config$6.regexp
	},
	{
		tag: [_lezer_highlight.tags.meta, _lezer_highlight.tags.comment],
		color: config$6.comment
	},
	{
		tag: _lezer_highlight.tags.tagName,
		color: config$6.tag
	},
	{
		tag: _lezer_highlight.tags.strong,
		fontWeight: "bold"
	},
	{
		tag: _lezer_highlight.tags.emphasis,
		fontStyle: "italic"
	},
	{
		tag: _lezer_highlight.tags.link,
		textDecoration: "underline"
	},
	{
		tag: _lezer_highlight.tags.heading,
		fontWeight: "bold",
		color: config$6.heading
	},
	{
		tag: [
			_lezer_highlight.tags.atom,
			_lezer_highlight.tags.bool,
			_lezer_highlight.tags.special(_lezer_highlight.tags.variableName)
		],
		color: config$6.variable
	},
	{
		tag: _lezer_highlight.tags.invalid,
		color: config$6.invalid
	},
	{
		tag: _lezer_highlight.tags.strikethrough,
		textDecoration: "line-through"
	}
];
var quietlightInit = (options) => {
	var { theme = "light", settings = {}, styles = [] } = options || {};
	return createTheme({
		theme,
		settings: (0, import_extends.default)({}, defaultSettingsQuietlight, settings),
		styles: [...quietlightStyle, ...styles]
	});
};
var quietlight = quietlightInit();
//#endregion
//#region ../../node_modules/.pnpm/@uiw+codemirror-theme-red@4.25.7_@codemirror+language@6.12.2_@codemirror+state@6.5.4_@codemirror+view@6.39.16/node_modules/@uiw/codemirror-theme-red/esm/color.js
var config$5 = {
	background: "#390000",
	foreground: "#F8F8F8",
	selection: "#750000",
	selectionMatch: "#750000",
	cursor: "#970000",
	dropdownBackground: "#580000",
	activeLine: "#ff000033",
	matchingBracket: "#ff000033",
	keyword: "#f12727ff",
	storage: "#ff6262ff",
	variable: "#edef7dff",
	parameter: "#edef7dff",
	function: "#ffb454ff",
	string: "#edef7dff",
	constant: "#ec0d1e",
	type: "#9df39fff",
	class: "#fec758ff",
	number: "#994646ff",
	comment: "#e7c0c0ff",
	heading: "#fec758ff",
	invalid: "#ffffffff",
	regexp: "#edef7dff",
	tag: "#aa5507ff"
};
//#endregion
//#region ../../node_modules/.pnpm/@uiw+codemirror-theme-red@4.25.7_@codemirror+language@6.12.2_@codemirror+state@6.5.4_@codemirror+view@6.39.16/node_modules/@uiw/codemirror-theme-red/esm/index.js
var defaultSettingsRed = {
	background: config$5.background,
	foreground: config$5.foreground,
	caret: config$5.cursor,
	selection: config$5.selection,
	selectionMatch: config$5.selection,
	gutterBackground: config$5.background,
	gutterForeground: config$5.foreground,
	lineHighlight: config$5.activeLine
};
var redDarkStyle = [
	{
		tag: _lezer_highlight.tags.keyword,
		color: config$5.keyword
	},
	{
		tag: [
			_lezer_highlight.tags.name,
			_lezer_highlight.tags.deleted,
			_lezer_highlight.tags.character,
			_lezer_highlight.tags.macroName
		],
		color: config$5.variable
	},
	{
		tag: [_lezer_highlight.tags.propertyName],
		color: config$5.function
	},
	{
		tag: [
			_lezer_highlight.tags.processingInstruction,
			_lezer_highlight.tags.string,
			_lezer_highlight.tags.inserted,
			_lezer_highlight.tags.special(_lezer_highlight.tags.string)
		],
		color: config$5.string
	},
	{
		tag: [_lezer_highlight.tags.function(_lezer_highlight.tags.variableName), _lezer_highlight.tags.labelName],
		color: config$5.function
	},
	{
		tag: [
			_lezer_highlight.tags.color,
			_lezer_highlight.tags.constant(_lezer_highlight.tags.name),
			_lezer_highlight.tags.standard(_lezer_highlight.tags.name)
		],
		color: config$5.constant
	},
	{
		tag: [_lezer_highlight.tags.definition(_lezer_highlight.tags.name), _lezer_highlight.tags.separator],
		color: config$5.variable
	},
	{
		tag: [_lezer_highlight.tags.className],
		color: config$5.class
	},
	{
		tag: [
			_lezer_highlight.tags.number,
			_lezer_highlight.tags.changed,
			_lezer_highlight.tags.annotation,
			_lezer_highlight.tags.modifier,
			_lezer_highlight.tags.self,
			_lezer_highlight.tags.namespace
		],
		color: config$5.number
	},
	{
		tag: [_lezer_highlight.tags.typeName],
		color: config$5.type,
		fontStyle: config$5.type
	},
	{
		tag: [_lezer_highlight.tags.operator, _lezer_highlight.tags.operatorKeyword],
		color: config$5.keyword
	},
	{
		tag: [
			_lezer_highlight.tags.url,
			_lezer_highlight.tags.escape,
			_lezer_highlight.tags.regexp,
			_lezer_highlight.tags.link
		],
		color: config$5.regexp
	},
	{
		tag: [_lezer_highlight.tags.meta, _lezer_highlight.tags.comment],
		color: config$5.comment
	},
	{
		tag: _lezer_highlight.tags.tagName,
		color: config$5.tag
	},
	{
		tag: _lezer_highlight.tags.strong,
		fontWeight: "bold"
	},
	{
		tag: _lezer_highlight.tags.emphasis,
		fontStyle: "italic"
	},
	{
		tag: _lezer_highlight.tags.link,
		textDecoration: "underline"
	},
	{
		tag: _lezer_highlight.tags.heading,
		fontWeight: "bold",
		color: config$5.heading
	},
	{
		tag: [
			_lezer_highlight.tags.atom,
			_lezer_highlight.tags.bool,
			_lezer_highlight.tags.special(_lezer_highlight.tags.variableName)
		],
		color: config$5.variable
	},
	{
		tag: _lezer_highlight.tags.invalid,
		color: config$5.invalid
	},
	{
		tag: _lezer_highlight.tags.strikethrough,
		textDecoration: "line-through"
	}
];
var redInit = (options) => {
	var { theme = "dark", settings = {}, styles = [] } = options || {};
	return createTheme({
		theme,
		settings: (0, import_extends.default)({}, defaultSettingsRed, settings),
		styles: [...redDarkStyle, ...styles]
	});
};
var red = redInit();
//#endregion
//#region ../../node_modules/.pnpm/@uiw+codemirror-theme-solarized@4.25.7_@codemirror+language@6.12.2_@codemirror+state@6.5.4_@codemirror+view@6.39.16/node_modules/@uiw/codemirror-theme-solarized/esm/dark-color.js
var config$4 = {
	background: "#002B36",
	foreground: "#839496",
	selection: "#004454AA",
	selectionMatch: "#005A6FAA",
	cursor: "#D30102",
	dropdownBackground: "#00212B",
	dropdownBorder: "#2AA19899",
	activeLine: "#00cafe11",
	matchingBracket: "#073642",
	keyword: "#859900",
	storage: "#93A1A1",
	variable: "#268BD2",
	parameter: "#268BD2",
	function: "#268BD2",
	string: "#2AA198",
	constant: "#CB4B16",
	type: "#859900",
	class: "#268BD2",
	number: "#D33682",
	comment: "#586E75",
	heading: "#268BD2",
	invalid: "#DC322F",
	regexp: "#DC322F",
	tag: "#268BD2"
};
//#endregion
//#region ../../node_modules/.pnpm/@uiw+codemirror-theme-solarized@4.25.7_@codemirror+language@6.12.2_@codemirror+state@6.5.4_@codemirror+view@6.39.16/node_modules/@uiw/codemirror-theme-solarized/esm/dark.js
var defaultSettingsSolarizedDark = {
	background: config$4.background,
	foreground: config$4.foreground,
	caret: config$4.cursor,
	selection: config$4.selection,
	selectionMatch: config$4.selection,
	gutterBackground: config$4.background,
	gutterForeground: config$4.foreground,
	gutterBorder: "transparent",
	lineHighlight: config$4.activeLine
};
var solarizedDarkStyle = [
	{
		tag: _lezer_highlight.tags.keyword,
		color: config$4.keyword
	},
	{
		tag: [
			_lezer_highlight.tags.name,
			_lezer_highlight.tags.deleted,
			_lezer_highlight.tags.character,
			_lezer_highlight.tags.macroName
		],
		color: config$4.variable
	},
	{
		tag: [_lezer_highlight.tags.propertyName],
		color: config$4.function
	},
	{
		tag: [
			_lezer_highlight.tags.processingInstruction,
			_lezer_highlight.tags.string,
			_lezer_highlight.tags.inserted,
			_lezer_highlight.tags.special(_lezer_highlight.tags.string)
		],
		color: config$4.string
	},
	{
		tag: [_lezer_highlight.tags.function(_lezer_highlight.tags.variableName), _lezer_highlight.tags.labelName],
		color: config$4.function
	},
	{
		tag: [
			_lezer_highlight.tags.color,
			_lezer_highlight.tags.constant(_lezer_highlight.tags.name),
			_lezer_highlight.tags.standard(_lezer_highlight.tags.name)
		],
		color: config$4.constant
	},
	{
		tag: [_lezer_highlight.tags.definition(_lezer_highlight.tags.name), _lezer_highlight.tags.separator],
		color: config$4.variable
	},
	{
		tag: [_lezer_highlight.tags.className],
		color: config$4.class
	},
	{
		tag: [
			_lezer_highlight.tags.number,
			_lezer_highlight.tags.changed,
			_lezer_highlight.tags.annotation,
			_lezer_highlight.tags.modifier,
			_lezer_highlight.tags.self,
			_lezer_highlight.tags.namespace
		],
		color: config$4.number
	},
	{
		tag: [_lezer_highlight.tags.typeName],
		color: config$4.type,
		fontStyle: config$4.type
	},
	{
		tag: [_lezer_highlight.tags.operator, _lezer_highlight.tags.operatorKeyword],
		color: config$4.keyword
	},
	{
		tag: [
			_lezer_highlight.tags.url,
			_lezer_highlight.tags.escape,
			_lezer_highlight.tags.regexp,
			_lezer_highlight.tags.link
		],
		color: config$4.regexp
	},
	{
		tag: [_lezer_highlight.tags.meta, _lezer_highlight.tags.comment],
		color: config$4.comment
	},
	{
		tag: _lezer_highlight.tags.tagName,
		color: config$4.tag
	},
	{
		tag: _lezer_highlight.tags.strong,
		fontWeight: "bold"
	},
	{
		tag: _lezer_highlight.tags.emphasis,
		fontStyle: "italic"
	},
	{
		tag: _lezer_highlight.tags.link,
		textDecoration: "underline"
	},
	{
		tag: _lezer_highlight.tags.heading,
		fontWeight: "bold",
		color: config$4.heading
	},
	{
		tag: [
			_lezer_highlight.tags.atom,
			_lezer_highlight.tags.bool,
			_lezer_highlight.tags.special(_lezer_highlight.tags.variableName)
		],
		color: config$4.variable
	},
	{
		tag: _lezer_highlight.tags.invalid,
		color: config$4.invalid
	},
	{
		tag: _lezer_highlight.tags.strikethrough,
		textDecoration: "line-through"
	}
];
var solarizedDarkInit = (options) => {
	var { theme = "dark", settings = {}, styles = [] } = options || {};
	return createTheme({
		theme,
		settings: (0, import_extends.default)({}, defaultSettingsSolarizedDark, settings),
		styles: [...solarizedDarkStyle, ...styles]
	});
};
var solarizedDark = solarizedDarkInit();
//#endregion
//#region ../../node_modules/.pnpm/@uiw+codemirror-theme-solarized@4.25.7_@codemirror+language@6.12.2_@codemirror+state@6.5.4_@codemirror+view@6.39.16/node_modules/@uiw/codemirror-theme-solarized/esm/light-color.js
var config$3 = {
	background: "#FDF6E3",
	foreground: "#657B83",
	selection: "#EEE8D5",
	selectionMatch: "#EEE8D5",
	cursor: "#657B83",
	dropdownBackground: "#EEE8D5",
	dropdownBorder: "#D3AF86",
	activeLine: "#3d392d11",
	matchingBracket: "#EEE8D5",
	keyword: "#859900",
	storage: "#586E75",
	variable: "#268BD2",
	parameter: "#268BD2",
	function: "#268BD2",
	string: "#2AA198",
	constant: "#CB4B16",
	type: "#859900",
	class: "#268BD2",
	number: "#D33682",
	comment: "#93A1A1",
	heading: "#268BD2",
	invalid: "#DC322F",
	regexp: "#DC322F",
	tag: "#268BD2"
};
//#endregion
//#region ../../node_modules/.pnpm/@uiw+codemirror-theme-solarized@4.25.7_@codemirror+language@6.12.2_@codemirror+state@6.5.4_@codemirror+view@6.39.16/node_modules/@uiw/codemirror-theme-solarized/esm/light.js
var defaultSettingsSolarizedLight = {
	background: config$3.background,
	foreground: config$3.foreground,
	caret: config$3.cursor,
	selection: config$3.selection,
	selectionMatch: config$3.selectionMatch,
	gutterBackground: config$3.background,
	gutterForeground: config$3.foreground,
	gutterBorder: "transparent",
	lineHighlight: config$3.activeLine
};
var solarizedLightStyle = [
	{
		tag: _lezer_highlight.tags.keyword,
		color: config$3.keyword
	},
	{
		tag: [
			_lezer_highlight.tags.name,
			_lezer_highlight.tags.deleted,
			_lezer_highlight.tags.character,
			_lezer_highlight.tags.macroName
		],
		color: config$3.variable
	},
	{
		tag: [_lezer_highlight.tags.propertyName],
		color: config$3.function
	},
	{
		tag: [
			_lezer_highlight.tags.processingInstruction,
			_lezer_highlight.tags.string,
			_lezer_highlight.tags.inserted,
			_lezer_highlight.tags.special(_lezer_highlight.tags.string)
		],
		color: config$3.string
	},
	{
		tag: [_lezer_highlight.tags.function(_lezer_highlight.tags.variableName), _lezer_highlight.tags.labelName],
		color: config$3.function
	},
	{
		tag: [
			_lezer_highlight.tags.color,
			_lezer_highlight.tags.constant(_lezer_highlight.tags.name),
			_lezer_highlight.tags.standard(_lezer_highlight.tags.name)
		],
		color: config$3.constant
	},
	{
		tag: [_lezer_highlight.tags.definition(_lezer_highlight.tags.name), _lezer_highlight.tags.separator],
		color: config$3.variable
	},
	{
		tag: [_lezer_highlight.tags.className],
		color: config$3.class
	},
	{
		tag: [
			_lezer_highlight.tags.number,
			_lezer_highlight.tags.changed,
			_lezer_highlight.tags.annotation,
			_lezer_highlight.tags.modifier,
			_lezer_highlight.tags.self,
			_lezer_highlight.tags.namespace
		],
		color: config$3.number
	},
	{
		tag: [_lezer_highlight.tags.typeName],
		color: config$3.type,
		fontStyle: config$3.type
	},
	{
		tag: [_lezer_highlight.tags.operator, _lezer_highlight.tags.operatorKeyword],
		color: config$3.keyword
	},
	{
		tag: [
			_lezer_highlight.tags.url,
			_lezer_highlight.tags.escape,
			_lezer_highlight.tags.regexp,
			_lezer_highlight.tags.link
		],
		color: config$3.regexp
	},
	{
		tag: [_lezer_highlight.tags.meta, _lezer_highlight.tags.comment],
		color: config$3.comment
	},
	{
		tag: _lezer_highlight.tags.tagName,
		color: config$3.tag
	},
	{
		tag: _lezer_highlight.tags.strong,
		fontWeight: "bold"
	},
	{
		tag: _lezer_highlight.tags.emphasis,
		fontStyle: "italic"
	},
	{
		tag: _lezer_highlight.tags.link,
		textDecoration: "underline"
	},
	{
		tag: _lezer_highlight.tags.heading,
		fontWeight: "bold",
		color: config$3.heading
	},
	{
		tag: [
			_lezer_highlight.tags.atom,
			_lezer_highlight.tags.bool,
			_lezer_highlight.tags.special(_lezer_highlight.tags.variableName)
		],
		color: config$3.variable
	},
	{
		tag: _lezer_highlight.tags.invalid,
		color: config$3.invalid
	},
	{
		tag: _lezer_highlight.tags.strikethrough,
		textDecoration: "line-through"
	}
];
var solarizedLightInit = (options) => {
	var { theme = "light", settings = {}, styles = [] } = options || {};
	return createTheme({
		theme,
		settings: (0, import_extends.default)({}, defaultSettingsSolarizedLight, settings),
		styles: [...solarizedLightStyle, ...styles]
	});
};
var solarizedLight = solarizedLightInit();
//#endregion
//#region ../../node_modules/.pnpm/@uiw+codemirror-theme-sublime@4.25.7_@codemirror+language@6.12.2_@codemirror+state@6.5.4_@codemirror+view@6.39.16/node_modules/@uiw/codemirror-theme-sublime/esm/index.js
var defaultSettingsSublime = {
	background: "#303841",
	foreground: "#FFFFFF",
	caret: "#FBAC52",
	selection: "#4C5964",
	selectionMatch: "#3A546E",
	gutterBackground: "#303841",
	gutterForeground: "#FFFFFF70",
	lineHighlight: "#00000059"
};
var sublimeDarkStyle = [
	{
		tag: [_lezer_highlight.tags.meta, _lezer_highlight.tags.comment],
		color: "#A2A9B5"
	},
	{
		tag: [_lezer_highlight.tags.attributeName, _lezer_highlight.tags.keyword],
		color: "#B78FBA"
	},
	{
		tag: _lezer_highlight.tags.function(_lezer_highlight.tags.variableName),
		color: "#5AB0B0"
	},
	{
		tag: [
			_lezer_highlight.tags.string,
			_lezer_highlight.tags.regexp,
			_lezer_highlight.tags.attributeValue
		],
		color: "#99C592"
	},
	{
		tag: _lezer_highlight.tags.operator,
		color: "#f47954"
	},
	{
		tag: [_lezer_highlight.tags.tagName, _lezer_highlight.tags.modifier],
		color: "#E35F63"
	},
	{
		tag: [
			_lezer_highlight.tags.number,
			_lezer_highlight.tags.definition(_lezer_highlight.tags.tagName),
			_lezer_highlight.tags.className,
			_lezer_highlight.tags.definition(_lezer_highlight.tags.variableName)
		],
		color: "#fbac52"
	},
	{
		tag: [
			_lezer_highlight.tags.atom,
			_lezer_highlight.tags.bool,
			_lezer_highlight.tags.special(_lezer_highlight.tags.variableName)
		],
		color: "#E35F63"
	},
	{
		tag: _lezer_highlight.tags.variableName,
		color: "#539ac4"
	},
	{
		tag: [_lezer_highlight.tags.propertyName, _lezer_highlight.tags.typeName],
		color: "#629ccd"
	},
	{
		tag: _lezer_highlight.tags.propertyName,
		color: "#36b7b5"
	}
];
function sublimeInit(options) {
	var { theme = "dark", settings = {}, styles = [] } = options || {};
	return createTheme({
		theme,
		settings: (0, import_extends.default)({}, defaultSettingsSublime, settings),
		styles: [...sublimeDarkStyle, ...styles]
	});
}
var sublime = sublimeInit();
//#endregion
//#region ../../node_modules/.pnpm/@uiw+codemirror-theme-tokyo-night@4.25.7_@codemirror+language@6.12.2_@codemirror+state@6.5.4_@codemirror+view@6.39.16/node_modules/@uiw/codemirror-theme-tokyo-night/esm/index.js
var defaultSettingsTokyoNight = {
	background: "#1a1b26",
	foreground: "#787c99",
	caret: "#c0caf5",
	selection: "#515c7e40",
	selectionMatch: "#16161e",
	gutterBackground: "#1a1b26",
	gutterForeground: "#787c99",
	gutterBorder: "transparent",
	lineHighlight: "#474b6611"
};
var tokyoNightStyle = [
	{
		tag: _lezer_highlight.tags.keyword,
		color: "#bb9af7"
	},
	{
		tag: [
			_lezer_highlight.tags.name,
			_lezer_highlight.tags.deleted,
			_lezer_highlight.tags.character,
			_lezer_highlight.tags.macroName
		],
		color: "#c0caf5"
	},
	{
		tag: [_lezer_highlight.tags.propertyName],
		color: "#7aa2f7"
	},
	{
		tag: [
			_lezer_highlight.tags.processingInstruction,
			_lezer_highlight.tags.string,
			_lezer_highlight.tags.inserted,
			_lezer_highlight.tags.special(_lezer_highlight.tags.string)
		],
		color: "#9ece6a"
	},
	{
		tag: [_lezer_highlight.tags.function(_lezer_highlight.tags.variableName), _lezer_highlight.tags.labelName],
		color: "#7aa2f7"
	},
	{
		tag: [
			_lezer_highlight.tags.color,
			_lezer_highlight.tags.constant(_lezer_highlight.tags.name),
			_lezer_highlight.tags.standard(_lezer_highlight.tags.name)
		],
		color: "#bb9af7"
	},
	{
		tag: [_lezer_highlight.tags.definition(_lezer_highlight.tags.name), _lezer_highlight.tags.separator],
		color: "#c0caf5"
	},
	{
		tag: [_lezer_highlight.tags.className],
		color: "#c0caf5"
	},
	{
		tag: [
			_lezer_highlight.tags.number,
			_lezer_highlight.tags.changed,
			_lezer_highlight.tags.annotation,
			_lezer_highlight.tags.modifier,
			_lezer_highlight.tags.self,
			_lezer_highlight.tags.namespace
		],
		color: "#ff9e64"
	},
	{
		tag: [_lezer_highlight.tags.typeName],
		color: "#0db9d7"
	},
	{
		tag: [_lezer_highlight.tags.operator, _lezer_highlight.tags.operatorKeyword],
		color: "#bb9af7"
	},
	{
		tag: [
			_lezer_highlight.tags.url,
			_lezer_highlight.tags.escape,
			_lezer_highlight.tags.regexp,
			_lezer_highlight.tags.link
		],
		color: "#b4f9f8"
	},
	{
		tag: [_lezer_highlight.tags.meta, _lezer_highlight.tags.comment],
		color: "#444b6a"
	},
	{
		tag: _lezer_highlight.tags.strong,
		fontWeight: "bold"
	},
	{
		tag: _lezer_highlight.tags.emphasis,
		fontStyle: "italic"
	},
	{
		tag: _lezer_highlight.tags.link,
		textDecoration: "underline"
	},
	{
		tag: _lezer_highlight.tags.heading,
		fontWeight: "bold",
		color: "#89ddff"
	},
	{
		tag: [
			_lezer_highlight.tags.atom,
			_lezer_highlight.tags.bool,
			_lezer_highlight.tags.special(_lezer_highlight.tags.variableName)
		],
		color: "#c0caf5"
	},
	{
		tag: _lezer_highlight.tags.invalid,
		color: "#ff5370"
	},
	{
		tag: _lezer_highlight.tags.strikethrough,
		textDecoration: "line-through"
	}
];
var tokyoNightInit = (options) => {
	var { theme = "dark", settings = {}, styles = [] } = options || {};
	return createTheme({
		theme,
		settings: (0, import_extends.default)({}, defaultSettingsTokyoNight, settings),
		styles: [...tokyoNightStyle, ...styles]
	});
};
var tokyoNight = tokyoNightInit();
//#endregion
//#region ../../node_modules/.pnpm/@uiw+codemirror-theme-tokyo-night-storm@4.25.7_@codemirror+language@6.12.2_@codemirror+_f174ecb51cda3bd68f385ce3688f3ba2/node_modules/@uiw/codemirror-theme-tokyo-night-storm/esm/index.js
var defaultSettingsTokyoNightStorm = {
	background: "#24283b",
	foreground: "#7982a9",
	caret: "#c0caf5",
	selection: "#6f7bb630",
	selectionMatch: "#343b5f",
	gutterBackground: "#24283b",
	gutterForeground: "#7982a9",
	gutterBorder: "transparent",
	lineHighlight: "#292e427a"
};
var tokyoNightStormStyle = [
	{
		tag: _lezer_highlight.tags.keyword,
		color: "#bb9af7"
	},
	{
		tag: [
			_lezer_highlight.tags.name,
			_lezer_highlight.tags.deleted,
			_lezer_highlight.tags.character,
			_lezer_highlight.tags.macroName
		],
		color: "#c0caf5"
	},
	{
		tag: [_lezer_highlight.tags.propertyName],
		color: "#7aa2f7"
	},
	{
		tag: [
			_lezer_highlight.tags.processingInstruction,
			_lezer_highlight.tags.string,
			_lezer_highlight.tags.inserted,
			_lezer_highlight.tags.special(_lezer_highlight.tags.string)
		],
		color: "#9ece6a"
	},
	{
		tag: [_lezer_highlight.tags.function(_lezer_highlight.tags.variableName), _lezer_highlight.tags.labelName],
		color: "#7aa2f7"
	},
	{
		tag: [
			_lezer_highlight.tags.color,
			_lezer_highlight.tags.constant(_lezer_highlight.tags.name),
			_lezer_highlight.tags.standard(_lezer_highlight.tags.name)
		],
		color: "#bb9af7"
	},
	{
		tag: [_lezer_highlight.tags.definition(_lezer_highlight.tags.name), _lezer_highlight.tags.separator],
		color: "#c0caf5"
	},
	{
		tag: [_lezer_highlight.tags.className],
		color: "#c0caf5"
	},
	{
		tag: [
			_lezer_highlight.tags.number,
			_lezer_highlight.tags.changed,
			_lezer_highlight.tags.annotation,
			_lezer_highlight.tags.modifier,
			_lezer_highlight.tags.self,
			_lezer_highlight.tags.namespace
		],
		color: "#ff9e64"
	},
	{
		tag: [_lezer_highlight.tags.typeName],
		color: "#2ac3de",
		fontStyle: "#2ac3de"
	},
	{
		tag: [_lezer_highlight.tags.operator, _lezer_highlight.tags.operatorKeyword],
		color: "#bb9af7"
	},
	{
		tag: [
			_lezer_highlight.tags.url,
			_lezer_highlight.tags.escape,
			_lezer_highlight.tags.regexp,
			_lezer_highlight.tags.link
		],
		color: "#b4f9f8"
	},
	{
		tag: [_lezer_highlight.tags.meta, _lezer_highlight.tags.comment],
		color: "#565f89"
	},
	{
		tag: _lezer_highlight.tags.strong,
		fontWeight: "bold"
	},
	{
		tag: _lezer_highlight.tags.emphasis,
		fontStyle: "italic"
	},
	{
		tag: _lezer_highlight.tags.link,
		textDecoration: "underline"
	},
	{
		tag: _lezer_highlight.tags.heading,
		fontWeight: "bold",
		color: "#89ddff"
	},
	{
		tag: [
			_lezer_highlight.tags.atom,
			_lezer_highlight.tags.bool,
			_lezer_highlight.tags.special(_lezer_highlight.tags.variableName)
		],
		color: "#c0caf5"
	},
	{
		tag: _lezer_highlight.tags.invalid,
		color: "#ff5370"
	},
	{
		tag: _lezer_highlight.tags.strikethrough,
		textDecoration: "line-through"
	}
];
var tokyoNightStormInit = (options) => {
	var { theme = "dark", settings = {}, styles = [] } = options || {};
	return createTheme({
		theme,
		settings: (0, import_extends.default)({}, defaultSettingsTokyoNightStorm, settings),
		styles: [...tokyoNightStormStyle, ...styles]
	});
};
var tokyoNightStorm = tokyoNightStormInit();
//#endregion
//#region ../../node_modules/.pnpm/@uiw+codemirror-theme-tokyo-night-day@4.25.7_@codemirror+language@6.12.2_@codemirror+st_d7adacab7c44d2b4f6f28b483aa5fd3a/node_modules/@uiw/codemirror-theme-tokyo-night-day/esm/index.js
var defaultSettingsTokyoNightDay = {
	background: "#e1e2e7",
	foreground: "#3760bf",
	caret: "#3760bf",
	selection: "#99a7df",
	selectionMatch: "#99a7df",
	gutterBackground: "#e1e2e7",
	gutterForeground: "#3760bf",
	gutterBorder: "transparent",
	lineHighlight: "#5f5faf11"
};
var tokyoNightDayStyle = [
	{
		tag: _lezer_highlight.tags.keyword,
		color: "#007197"
	},
	{
		tag: [
			_lezer_highlight.tags.name,
			_lezer_highlight.tags.deleted,
			_lezer_highlight.tags.character,
			_lezer_highlight.tags.macroName
		],
		color: "#3760bf"
	},
	{
		tag: [_lezer_highlight.tags.propertyName],
		color: "#3760bf"
	},
	{
		tag: [
			_lezer_highlight.tags.processingInstruction,
			_lezer_highlight.tags.string,
			_lezer_highlight.tags.inserted,
			_lezer_highlight.tags.special(_lezer_highlight.tags.string)
		],
		color: "#587539"
	},
	{
		tag: [_lezer_highlight.tags.function(_lezer_highlight.tags.variableName), _lezer_highlight.tags.labelName],
		color: "#3760bf"
	},
	{
		tag: [
			_lezer_highlight.tags.color,
			_lezer_highlight.tags.constant(_lezer_highlight.tags.name),
			_lezer_highlight.tags.standard(_lezer_highlight.tags.name)
		],
		color: "#3760bf"
	},
	{
		tag: [_lezer_highlight.tags.definition(_lezer_highlight.tags.name), _lezer_highlight.tags.separator],
		color: "#3760bf"
	},
	{
		tag: [_lezer_highlight.tags.className],
		color: "#3760bf"
	},
	{
		tag: [
			_lezer_highlight.tags.number,
			_lezer_highlight.tags.changed,
			_lezer_highlight.tags.annotation,
			_lezer_highlight.tags.modifier,
			_lezer_highlight.tags.self,
			_lezer_highlight.tags.namespace
		],
		color: "#b15c00"
	},
	{
		tag: [_lezer_highlight.tags.typeName],
		color: "#007197",
		fontStyle: "#007197"
	},
	{
		tag: [_lezer_highlight.tags.operator, _lezer_highlight.tags.operatorKeyword],
		color: "#007197"
	},
	{
		tag: [
			_lezer_highlight.tags.url,
			_lezer_highlight.tags.escape,
			_lezer_highlight.tags.regexp,
			_lezer_highlight.tags.link
		],
		color: "#587539"
	},
	{
		tag: [_lezer_highlight.tags.meta, _lezer_highlight.tags.comment],
		color: "#848cb5"
	},
	{
		tag: _lezer_highlight.tags.strong,
		fontWeight: "bold"
	},
	{
		tag: _lezer_highlight.tags.emphasis,
		fontStyle: "italic"
	},
	{
		tag: _lezer_highlight.tags.link,
		textDecoration: "underline"
	},
	{
		tag: _lezer_highlight.tags.heading,
		fontWeight: "bold",
		color: "#b15c00"
	},
	{
		tag: [
			_lezer_highlight.tags.atom,
			_lezer_highlight.tags.bool,
			_lezer_highlight.tags.special(_lezer_highlight.tags.variableName)
		],
		color: "#3760bf"
	},
	{
		tag: _lezer_highlight.tags.invalid,
		color: "#f52a65"
	},
	{
		tag: _lezer_highlight.tags.strikethrough,
		textDecoration: "line-through"
	}
];
var tokyoNightDayInit = (options) => {
	var { theme = "light", settings = {}, styles = [] } = options || {};
	return createTheme({
		theme,
		settings: (0, import_extends.default)({}, defaultSettingsTokyoNightDay, settings),
		styles: [...tokyoNightDayStyle, ...styles]
	});
};
var tokyoNightDay = tokyoNightDayInit();
//#endregion
//#region ../../node_modules/.pnpm/@uiw+codemirror-theme-tomorrow-night-blue@4.25.7_@codemirror+language@6.12.2_@codemirro_ed342db3187b2f26a0290923777fa2b1/node_modules/@uiw/codemirror-theme-tomorrow-night-blue/esm/color.js
var config$2 = {
	background: "#002451",
	foreground: "#ffffff",
	selection: "#003f8e",
	selectionMatch: "#003f8e",
	cursor: "#ffffff",
	dropdownBackground: "#001733",
	activeLine: "#00346e7a",
	matchingBracket: "#00346e",
	keyword: "#EBBBFF",
	storage: "#EBBBFF",
	variable: "#FFC58F",
	parameter: "#FFC58F",
	function: "#BBDAFF",
	string: "#D1F1A9",
	constant: "#FFC58F",
	type: "#FFEEAD",
	class: "#BBDAFF",
	number: "#FFC58F",
	comment: "#7285B7",
	heading: "#D1F1A9",
	invalid: "#a92049",
	regexp: "#D1F1A9",
	tag: "#FF9DA4"
};
//#endregion
//#region ../../node_modules/.pnpm/@uiw+codemirror-theme-tomorrow-night-blue@4.25.7_@codemirror+language@6.12.2_@codemirro_ed342db3187b2f26a0290923777fa2b1/node_modules/@uiw/codemirror-theme-tomorrow-night-blue/esm/index.js
var defaultSettingsTomorrowNightBlue = {
	background: config$2.background,
	foreground: config$2.foreground,
	caret: config$2.cursor,
	selection: config$2.selection,
	selectionMatch: config$2.selection,
	gutterBackground: config$2.background,
	gutterForeground: config$2.foreground,
	lineHighlight: config$2.activeLine
};
var tomorrowNightBlueStyle = [
	{
		tag: _lezer_highlight.tags.keyword,
		color: config$2.keyword
	},
	{
		tag: [
			_lezer_highlight.tags.name,
			_lezer_highlight.tags.deleted,
			_lezer_highlight.tags.character,
			_lezer_highlight.tags.macroName
		],
		color: config$2.variable
	},
	{
		tag: [_lezer_highlight.tags.propertyName],
		color: config$2.function
	},
	{
		tag: [
			_lezer_highlight.tags.processingInstruction,
			_lezer_highlight.tags.string,
			_lezer_highlight.tags.inserted,
			_lezer_highlight.tags.special(_lezer_highlight.tags.string)
		],
		color: config$2.string
	},
	{
		tag: [_lezer_highlight.tags.function(_lezer_highlight.tags.variableName), _lezer_highlight.tags.labelName],
		color: config$2.function
	},
	{
		tag: [
			_lezer_highlight.tags.color,
			_lezer_highlight.tags.constant(_lezer_highlight.tags.name),
			_lezer_highlight.tags.standard(_lezer_highlight.tags.name)
		],
		color: config$2.constant
	},
	{
		tag: [_lezer_highlight.tags.definition(_lezer_highlight.tags.name), _lezer_highlight.tags.separator],
		color: config$2.variable
	},
	{
		tag: [_lezer_highlight.tags.className],
		color: config$2.class
	},
	{
		tag: [
			_lezer_highlight.tags.number,
			_lezer_highlight.tags.changed,
			_lezer_highlight.tags.annotation,
			_lezer_highlight.tags.modifier,
			_lezer_highlight.tags.self,
			_lezer_highlight.tags.namespace
		],
		color: config$2.number
	},
	{
		tag: [_lezer_highlight.tags.typeName],
		color: config$2.type,
		fontStyle: config$2.type
	},
	{
		tag: [_lezer_highlight.tags.operator, _lezer_highlight.tags.operatorKeyword],
		color: config$2.keyword
	},
	{
		tag: [
			_lezer_highlight.tags.url,
			_lezer_highlight.tags.escape,
			_lezer_highlight.tags.regexp,
			_lezer_highlight.tags.link
		],
		color: config$2.regexp
	},
	{
		tag: [_lezer_highlight.tags.meta, _lezer_highlight.tags.comment],
		color: config$2.comment
	},
	{
		tag: _lezer_highlight.tags.tagName,
		color: config$2.tag
	},
	{
		tag: _lezer_highlight.tags.strong,
		fontWeight: "bold"
	},
	{
		tag: _lezer_highlight.tags.emphasis,
		fontStyle: "italic"
	},
	{
		tag: _lezer_highlight.tags.link,
		textDecoration: "underline"
	},
	{
		tag: _lezer_highlight.tags.heading,
		fontWeight: "bold",
		color: config$2.heading
	},
	{
		tag: [
			_lezer_highlight.tags.atom,
			_lezer_highlight.tags.bool,
			_lezer_highlight.tags.special(_lezer_highlight.tags.variableName)
		],
		color: config$2.variable
	},
	{
		tag: _lezer_highlight.tags.invalid,
		color: config$2.invalid
	},
	{
		tag: _lezer_highlight.tags.strikethrough,
		textDecoration: "line-through"
	}
];
var tomorrowNightBlueInit = (options) => {
	var { theme = "dark", settings = {}, styles = [] } = options || {};
	return createTheme({
		theme,
		settings: (0, import_extends.default)({}, defaultSettingsTomorrowNightBlue, settings),
		styles: [...tomorrowNightBlueStyle, ...styles]
	});
};
var tomorrowNightBlue = tomorrowNightBlueInit();
//#endregion
//#region ../../node_modules/.pnpm/@uiw+codemirror-theme-vscode@4.25.7_@codemirror+language@6.12.2_@codemirror+state@6.5.4_@codemirror+view@6.39.16/node_modules/@uiw/codemirror-theme-vscode/esm/light.js
/**
* https://github.com/uiwjs/react-codemirror/issues/409
*/
var defaultSettingsVscodeLight = {
	background: "#ffffff",
	foreground: "#383a42",
	caret: "#000",
	selection: "#add6ff",
	selectionMatch: "#a8ac94",
	lineHighlight: "#99999926",
	gutterBackground: "#fff",
	gutterForeground: "#237893",
	gutterActiveForeground: "#0b216f",
	fontFamily: "Menlo, Monaco, Consolas, \"Andale Mono\", \"Ubuntu Mono\", \"Courier New\", monospace"
};
var vscodeLightStyle = [
	{
		tag: [
			_lezer_highlight.tags.keyword,
			_lezer_highlight.tags.operatorKeyword,
			_lezer_highlight.tags.modifier,
			_lezer_highlight.tags.color,
			_lezer_highlight.tags.constant(_lezer_highlight.tags.name),
			_lezer_highlight.tags.standard(_lezer_highlight.tags.name),
			_lezer_highlight.tags.standard(_lezer_highlight.tags.tagName),
			_lezer_highlight.tags.special(_lezer_highlight.tags.brace),
			_lezer_highlight.tags.atom,
			_lezer_highlight.tags.bool,
			_lezer_highlight.tags.special(_lezer_highlight.tags.variableName)
		],
		color: "#0000ff"
	},
	{
		tag: [_lezer_highlight.tags.moduleKeyword, _lezer_highlight.tags.controlKeyword],
		color: "#af00db"
	},
	{
		tag: [
			_lezer_highlight.tags.name,
			_lezer_highlight.tags.deleted,
			_lezer_highlight.tags.character,
			_lezer_highlight.tags.macroName,
			_lezer_highlight.tags.propertyName,
			_lezer_highlight.tags.variableName,
			_lezer_highlight.tags.labelName,
			_lezer_highlight.tags.definition(_lezer_highlight.tags.name)
		],
		color: "#0070c1"
	},
	{
		tag: _lezer_highlight.tags.heading,
		fontWeight: "bold",
		color: "#0070c1"
	},
	{
		tag: [
			_lezer_highlight.tags.typeName,
			_lezer_highlight.tags.className,
			_lezer_highlight.tags.tagName,
			_lezer_highlight.tags.number,
			_lezer_highlight.tags.changed,
			_lezer_highlight.tags.annotation,
			_lezer_highlight.tags.self,
			_lezer_highlight.tags.namespace
		],
		color: "#267f99"
	},
	{
		tag: [_lezer_highlight.tags.function(_lezer_highlight.tags.variableName), _lezer_highlight.tags.function(_lezer_highlight.tags.propertyName)],
		color: "#795e26"
	},
	{
		tag: [_lezer_highlight.tags.number],
		color: "#098658"
	},
	{
		tag: [
			_lezer_highlight.tags.operator,
			_lezer_highlight.tags.punctuation,
			_lezer_highlight.tags.separator,
			_lezer_highlight.tags.url,
			_lezer_highlight.tags.escape,
			_lezer_highlight.tags.regexp
		],
		color: "#383a42"
	},
	{
		tag: [_lezer_highlight.tags.regexp],
		color: "#af00db"
	},
	{
		tag: [
			_lezer_highlight.tags.special(_lezer_highlight.tags.string),
			_lezer_highlight.tags.processingInstruction,
			_lezer_highlight.tags.string,
			_lezer_highlight.tags.inserted
		],
		color: "#a31515"
	},
	{
		tag: [_lezer_highlight.tags.angleBracket],
		color: "#383a42"
	},
	{
		tag: _lezer_highlight.tags.strong,
		fontWeight: "bold"
	},
	{
		tag: _lezer_highlight.tags.emphasis,
		fontStyle: "italic"
	},
	{
		tag: _lezer_highlight.tags.strikethrough,
		textDecoration: "line-through"
	},
	{
		tag: [_lezer_highlight.tags.meta, _lezer_highlight.tags.comment],
		color: "#008000"
	},
	{
		tag: _lezer_highlight.tags.link,
		color: "#4078f2",
		textDecoration: "underline"
	},
	{
		tag: _lezer_highlight.tags.invalid,
		color: "#e45649"
	}
];
function vscodeLightInit(options) {
	var { theme = "light", settings = {}, styles = [] } = options || {};
	return createTheme({
		theme,
		settings: (0, import_extends.default)({}, defaultSettingsVscodeLight, settings),
		styles: [...vscodeLightStyle, ...styles]
	});
}
var vscodeLight = vscodeLightInit();
//#endregion
//#region ../../node_modules/.pnpm/@uiw+codemirror-theme-vscode@4.25.7_@codemirror+language@6.12.2_@codemirror+state@6.5.4_@codemirror+view@6.39.16/node_modules/@uiw/codemirror-theme-vscode/esm/dark.js
/**
* https://github.com/uiwjs/react-codemirror/issues/409
*/
var defaultSettingsVscodeDark = {
	background: "#1e1e1e",
	foreground: "#9cdcfe",
	caret: "#c6c6c6",
	selection: "#6199ff2f",
	selectionMatch: "#72a1ff59",
	lineHighlight: "#ffffff0f",
	gutterBackground: "#1e1e1e",
	gutterForeground: "#838383",
	gutterActiveForeground: "#fff",
	fontFamily: "Menlo, Monaco, Consolas, \"Andale Mono\", \"Ubuntu Mono\", \"Courier New\", monospace"
};
var vscodeDarkStyle = [
	{
		tag: [
			_lezer_highlight.tags.keyword,
			_lezer_highlight.tags.operatorKeyword,
			_lezer_highlight.tags.modifier,
			_lezer_highlight.tags.color,
			_lezer_highlight.tags.constant(_lezer_highlight.tags.name),
			_lezer_highlight.tags.standard(_lezer_highlight.tags.name),
			_lezer_highlight.tags.standard(_lezer_highlight.tags.tagName),
			_lezer_highlight.tags.special(_lezer_highlight.tags.brace),
			_lezer_highlight.tags.atom,
			_lezer_highlight.tags.bool,
			_lezer_highlight.tags.special(_lezer_highlight.tags.variableName)
		],
		color: "#569cd6"
	},
	{
		tag: [_lezer_highlight.tags.controlKeyword, _lezer_highlight.tags.moduleKeyword],
		color: "#c586c0"
	},
	{
		tag: [
			_lezer_highlight.tags.name,
			_lezer_highlight.tags.deleted,
			_lezer_highlight.tags.character,
			_lezer_highlight.tags.macroName,
			_lezer_highlight.tags.propertyName,
			_lezer_highlight.tags.variableName,
			_lezer_highlight.tags.labelName,
			_lezer_highlight.tags.definition(_lezer_highlight.tags.name)
		],
		color: "#9cdcfe"
	},
	{
		tag: _lezer_highlight.tags.heading,
		fontWeight: "bold",
		color: "#9cdcfe"
	},
	{
		tag: [
			_lezer_highlight.tags.typeName,
			_lezer_highlight.tags.className,
			_lezer_highlight.tags.tagName,
			_lezer_highlight.tags.number,
			_lezer_highlight.tags.changed,
			_lezer_highlight.tags.annotation,
			_lezer_highlight.tags.self,
			_lezer_highlight.tags.namespace
		],
		color: "#4ec9b0"
	},
	{
		tag: [_lezer_highlight.tags.function(_lezer_highlight.tags.variableName), _lezer_highlight.tags.function(_lezer_highlight.tags.propertyName)],
		color: "#dcdcaa"
	},
	{
		tag: [_lezer_highlight.tags.number],
		color: "#b5cea8"
	},
	{
		tag: [
			_lezer_highlight.tags.operator,
			_lezer_highlight.tags.punctuation,
			_lezer_highlight.tags.separator,
			_lezer_highlight.tags.url,
			_lezer_highlight.tags.escape,
			_lezer_highlight.tags.regexp
		],
		color: "#d4d4d4"
	},
	{
		tag: [_lezer_highlight.tags.regexp],
		color: "#d16969"
	},
	{
		tag: [
			_lezer_highlight.tags.special(_lezer_highlight.tags.string),
			_lezer_highlight.tags.processingInstruction,
			_lezer_highlight.tags.string,
			_lezer_highlight.tags.inserted
		],
		color: "#ce9178"
	},
	{
		tag: [_lezer_highlight.tags.angleBracket],
		color: "#808080"
	},
	{
		tag: _lezer_highlight.tags.strong,
		fontWeight: "bold"
	},
	{
		tag: _lezer_highlight.tags.emphasis,
		fontStyle: "italic"
	},
	{
		tag: _lezer_highlight.tags.strikethrough,
		textDecoration: "line-through"
	},
	{
		tag: [_lezer_highlight.tags.meta, _lezer_highlight.tags.comment],
		color: "#6a9955"
	},
	{
		tag: _lezer_highlight.tags.link,
		color: "#6a9955",
		textDecoration: "underline"
	},
	{
		tag: _lezer_highlight.tags.invalid,
		color: "#ff0000"
	}
];
function vscodeDarkInit(options) {
	var { theme = "dark", settings = {}, styles = [] } = options || {};
	return createTheme({
		theme,
		settings: (0, import_extends.default)({}, defaultSettingsVscodeDark, settings),
		styles: [...vscodeDarkStyle, ...styles]
	});
}
var vscodeDark = vscodeDarkInit();
//#endregion
//#region ../../node_modules/.pnpm/@uiw+codemirror-theme-white@4.25.7_@codemirror+language@6.12.2_@codemirror+state@6.5.4_@codemirror+view@6.39.16/node_modules/@uiw/codemirror-theme-white/esm/dark-color.js
var config$1 = {
	background: "#000",
	foreground: "#fff",
	selection: "#7d46fc3f",
	selectionMatch: "#7d46fc7f",
	cursor: "#7d46fc",
	dropdownBackground: "#0a0b0f",
	dropdownBorder: "#1e1d27",
	activeLine: "#00346eb0",
	matchingBracket: "#7d46fc7f",
	keyword: null,
	storage: null,
	variable: null,
	parameter: null,
	function: null,
	string: "#a8a8b1",
	constant: null,
	type: null,
	class: null,
	number: null,
	comment: "#2e2e37",
	heading: null,
	invalid: null,
	regexp: "#a8a8b1",
	tag: null
};
//#endregion
//#region ../../node_modules/.pnpm/@uiw+codemirror-theme-white@4.25.7_@codemirror+language@6.12.2_@codemirror+state@6.5.4_@codemirror+view@6.39.16/node_modules/@uiw/codemirror-theme-white/esm/dark.js
var defaultSettingsWhiteDark = {
	background: config$1.background,
	foreground: config$1.foreground,
	caret: config$1.cursor,
	selection: config$1.selection,
	selectionMatch: config$1.selectionMatch,
	gutterBackground: config$1.background,
	gutterForeground: config$1.foreground,
	lineHighlight: config$1.activeLine
};
var whiteDarkStyle = [
	{
		tag: _lezer_highlight.tags.keyword,
		color: config$1.keyword,
		fontWeight: "bold"
	},
	{
		tag: [
			_lezer_highlight.tags.name,
			_lezer_highlight.tags.deleted,
			_lezer_highlight.tags.character,
			_lezer_highlight.tags.macroName
		],
		color: config$1.variable
	},
	{
		tag: [_lezer_highlight.tags.propertyName],
		color: config$1.function
	},
	{
		tag: [
			_lezer_highlight.tags.processingInstruction,
			_lezer_highlight.tags.string,
			_lezer_highlight.tags.inserted,
			_lezer_highlight.tags.special(_lezer_highlight.tags.string)
		],
		color: config$1.string
	},
	{
		tag: [_lezer_highlight.tags.function(_lezer_highlight.tags.variableName), _lezer_highlight.tags.labelName],
		color: config$1.function
	},
	{
		tag: [
			_lezer_highlight.tags.color,
			_lezer_highlight.tags.constant(_lezer_highlight.tags.name),
			_lezer_highlight.tags.standard(_lezer_highlight.tags.name)
		],
		color: config$1.constant
	},
	{
		tag: [_lezer_highlight.tags.definition(_lezer_highlight.tags.name), _lezer_highlight.tags.separator],
		color: config$1.variable
	},
	{
		tag: [_lezer_highlight.tags.className],
		color: config$1.class
	},
	{
		tag: [_lezer_highlight.tags.typeName],
		color: config$1.type,
		fontStyle: config$1.type
	},
	{
		tag: [
			_lezer_highlight.tags.url,
			_lezer_highlight.tags.escape,
			_lezer_highlight.tags.regexp,
			_lezer_highlight.tags.link
		],
		color: config$1.regexp
	},
	{
		tag: [_lezer_highlight.tags.meta, _lezer_highlight.tags.comment],
		color: config$1.comment
	},
	{
		tag: _lezer_highlight.tags.tagName,
		color: config$1.tag
	},
	{
		tag: _lezer_highlight.tags.strong,
		fontWeight: "bold"
	},
	{
		tag: _lezer_highlight.tags.emphasis,
		fontStyle: "italic"
	},
	{
		tag: _lezer_highlight.tags.link,
		textDecoration: "underline"
	},
	{
		tag: _lezer_highlight.tags.heading,
		fontWeight: "bold",
		color: config$1.heading
	},
	{
		tag: [_lezer_highlight.tags.atom, _lezer_highlight.tags.special(_lezer_highlight.tags.variableName)],
		color: config$1.variable
	},
	{
		tag: _lezer_highlight.tags.invalid,
		color: config$1.invalid
	},
	{
		tag: _lezer_highlight.tags.strikethrough,
		textDecoration: "line-through"
	},
	{
		tag: [
			_lezer_highlight.tags.operatorKeyword,
			_lezer_highlight.tags.bool,
			_lezer_highlight.tags.null,
			_lezer_highlight.tags.variableName
		],
		color: config$1.constant
	},
	{
		tag: [_lezer_highlight.tags.operator],
		color: "#bb9af7"
	},
	{
		tag: [_lezer_highlight.tags.number],
		color: "#a8a8b1"
	},
	{
		tag: [_lezer_highlight.tags.bracket],
		color: "#bb9af7"
	}
];
var whiteDarkInit = (options) => {
	var { theme = "dark", settings = {}, styles = [] } = options || {};
	return createTheme({
		theme,
		settings: (0, import_extends.default)({}, defaultSettingsWhiteDark, settings),
		styles: [...whiteDarkStyle, ...styles]
	});
};
var whiteDark = whiteDarkInit();
//#endregion
//#region ../../node_modules/.pnpm/@uiw+codemirror-theme-white@4.25.7_@codemirror+language@6.12.2_@codemirror+state@6.5.4_@codemirror+view@6.39.16/node_modules/@uiw/codemirror-theme-white/esm/light-color.js
var config = {
	background: "#fff",
	foreground: "#000",
	selection: "#0064ff26",
	selectionMatch: "#0064ff4c",
	cursor: "#004bff",
	dropdownBackground: "#f4f6fc",
	dropdownBorder: "#e7ecf2",
	activeLine: "#0064ff0c",
	matchingBracket: "#0064ff4c",
	keyword: null,
	storage: null,
	variable: null,
	parameter: null,
	function: null,
	string: "#6b7a88",
	constant: null,
	type: null,
	class: null,
	number: null,
	comment: "#bec9d3",
	heading: null,
	invalid: null,
	regexp: "#6b7a88",
	tag: null
};
//#endregion
//#region ../../node_modules/.pnpm/@uiw+codemirror-theme-white@4.25.7_@codemirror+language@6.12.2_@codemirror+state@6.5.4_@codemirror+view@6.39.16/node_modules/@uiw/codemirror-theme-white/esm/light.js
var defaultSettingsWhiteLight = {
	background: config.background,
	foreground: config.foreground,
	caret: config.cursor,
	selection: config.selection,
	selectionMatch: config.selectionMatch,
	gutterBackground: config.background,
	gutterForeground: config.foreground,
	lineHighlight: config.activeLine
};
var whiteLightStyle = [
	{
		tag: _lezer_highlight.tags.keyword,
		color: config.keyword,
		fontWeight: "bold"
	},
	{
		tag: [
			_lezer_highlight.tags.name,
			_lezer_highlight.tags.deleted,
			_lezer_highlight.tags.character,
			_lezer_highlight.tags.macroName
		],
		color: config.variable
	},
	{
		tag: [_lezer_highlight.tags.propertyName],
		color: config.function
	},
	{
		tag: [
			_lezer_highlight.tags.processingInstruction,
			_lezer_highlight.tags.string,
			_lezer_highlight.tags.inserted,
			_lezer_highlight.tags.special(_lezer_highlight.tags.string)
		],
		color: config.string
	},
	{
		tag: [_lezer_highlight.tags.function(_lezer_highlight.tags.variableName), _lezer_highlight.tags.labelName],
		color: config.function
	},
	{
		tag: [
			_lezer_highlight.tags.color,
			_lezer_highlight.tags.constant(_lezer_highlight.tags.name),
			_lezer_highlight.tags.standard(_lezer_highlight.tags.name)
		],
		color: config.constant
	},
	{
		tag: [_lezer_highlight.tags.definition(_lezer_highlight.tags.name), _lezer_highlight.tags.separator],
		color: config.variable
	},
	{
		tag: [_lezer_highlight.tags.className],
		color: config.class
	},
	{
		tag: [_lezer_highlight.tags.typeName],
		color: config.type,
		fontStyle: config.type
	},
	{
		tag: [
			_lezer_highlight.tags.url,
			_lezer_highlight.tags.escape,
			_lezer_highlight.tags.regexp,
			_lezer_highlight.tags.link
		],
		color: config.regexp
	},
	{
		tag: [_lezer_highlight.tags.meta, _lezer_highlight.tags.comment],
		color: config.comment
	},
	{
		tag: _lezer_highlight.tags.tagName,
		color: config.tag
	},
	{
		tag: _lezer_highlight.tags.strong,
		fontWeight: "bold"
	},
	{
		tag: _lezer_highlight.tags.emphasis,
		fontStyle: "italic"
	},
	{
		tag: _lezer_highlight.tags.link,
		textDecoration: "underline"
	},
	{
		tag: _lezer_highlight.tags.heading,
		fontWeight: "bold",
		color: config.heading
	},
	{
		tag: [_lezer_highlight.tags.atom, _lezer_highlight.tags.special(_lezer_highlight.tags.variableName)],
		color: config.variable
	},
	{
		tag: _lezer_highlight.tags.invalid,
		color: config.invalid
	},
	{
		tag: _lezer_highlight.tags.strikethrough,
		textDecoration: "line-through"
	},
	{
		tag: [
			_lezer_highlight.tags.operatorKeyword,
			_lezer_highlight.tags.bool,
			_lezer_highlight.tags.null,
			_lezer_highlight.tags.variableName
		],
		color: config.constant
	},
	{
		tag: [_lezer_highlight.tags.operator],
		color: "#0431fa"
	},
	{
		tag: [_lezer_highlight.tags.number],
		color: "#a8a8b1"
	},
	{
		tag: [_lezer_highlight.tags.bracket],
		color: "#0431fa"
	}
];
var whiteLightInit = (options) => {
	var { theme = "light", settings = {}, styles = [] } = options || {};
	return createTheme({
		theme,
		settings: (0, import_extends.default)({}, defaultSettingsWhiteLight, settings),
		styles: [...whiteLightStyle, ...styles]
	});
};
var whiteLight = whiteLightInit();
//#endregion
//#region ../../node_modules/.pnpm/@uiw+codemirror-theme-xcode@4.25.7_@codemirror+language@6.12.2_@codemirror+state@6.5.4_@codemirror+view@6.39.16/node_modules/@uiw/codemirror-theme-xcode/esm/index.js
/**
* @name Xcode
*/
var defaultSettingsXcodeLight = {
	background: "#fff",
	foreground: "#3D3D3D",
	selection: "#BBDFFF",
	selectionMatch: "#BBDFFF",
	gutterBackground: "#fff",
	gutterForeground: "#AFAFAF",
	lineHighlight: "#d5e6ff69"
};
var xcodeLightStyle = [
	{
		tag: [_lezer_highlight.tags.comment, _lezer_highlight.tags.quote],
		color: "#707F8D"
	},
	{
		tag: [_lezer_highlight.tags.typeName, _lezer_highlight.tags.typeOperator],
		color: "#aa0d91"
	},
	{
		tag: [_lezer_highlight.tags.keyword],
		color: "#aa0d91",
		fontWeight: "bold"
	},
	{
		tag: [_lezer_highlight.tags.string, _lezer_highlight.tags.meta],
		color: "#D23423"
	},
	{
		tag: [_lezer_highlight.tags.name],
		color: "#032f62"
	},
	{
		tag: [_lezer_highlight.tags.typeName],
		color: "#522BB2"
	},
	{
		tag: [_lezer_highlight.tags.variableName],
		color: "#23575C"
	},
	{
		tag: [_lezer_highlight.tags.definition(_lezer_highlight.tags.variableName)],
		color: "#327A9E"
	},
	{
		tag: [_lezer_highlight.tags.regexp, _lezer_highlight.tags.link],
		color: "#0e0eff"
	}
];
function xcodeLightInit(options) {
	var { theme = "light", settings = {}, styles = [] } = options || {};
	return createTheme({
		theme,
		settings: (0, import_extends.default)({}, defaultSettingsXcodeLight, settings),
		styles: [...xcodeLightStyle, ...styles]
	});
}
var xcodeLight = xcodeLightInit();
var defaultSettingsXcodeDark = {
	background: "#292A30",
	foreground: "#CECFD0",
	caret: "#fff",
	selection: "#727377",
	selectionMatch: "#727377",
	lineHighlight: "#ffffff0f"
};
var xcodeDarkStyle = [
	{
		tag: [_lezer_highlight.tags.comment, _lezer_highlight.tags.quote],
		color: "#7F8C98"
	},
	{
		tag: [_lezer_highlight.tags.keyword],
		color: "#FF7AB2",
		fontWeight: "bold"
	},
	{
		tag: [_lezer_highlight.tags.string, _lezer_highlight.tags.meta],
		color: "#FF8170"
	},
	{
		tag: [_lezer_highlight.tags.typeName],
		color: "#DABAFF"
	},
	{
		tag: [_lezer_highlight.tags.definition(_lezer_highlight.tags.variableName)],
		color: "#6BDFFF"
	},
	{
		tag: [_lezer_highlight.tags.name],
		color: "#6BAA9F"
	},
	{
		tag: [_lezer_highlight.tags.variableName],
		color: "#ACF2E4"
	},
	{
		tag: [_lezer_highlight.tags.regexp, _lezer_highlight.tags.link],
		color: "#FF8170"
	}
];
var xcodeDarkInit = (options) => {
	var { theme = "dark", settings = {}, styles = [] } = options || {};
	return createTheme({
		theme,
		settings: (0, import_extends.default)({}, defaultSettingsXcodeDark, settings),
		styles: [...xcodeDarkStyle, ...styles]
	});
};
var xcodeDark = xcodeDarkInit();
//#endregion
exports.abcdef = abcdef;
exports.abcdefDarkStyle = abcdefDarkStyle;
exports.abcdefInit = abcdefInit;
exports.abyss = abyss;
exports.abyssDarkStyle = abyssDarkStyle;
exports.abyssInit = abyssInit;
exports.androidstudio = androidstudio;
exports.androidstudioDarkStyle = androidstudioDarkStyle;
exports.androidstudioInit = androidstudioInit;
exports.andromeda = andromeda;
exports.andromedaDarkStyle = andromedaDarkStyle;
exports.andromedaInit = andromedaInit;
exports.atomone = atomone;
exports.atomoneDarkStyle = atomoneDarkStyle;
exports.atomoneInit = atomoneInit;
exports.aura = aura;
exports.auraDarkStyle = auraDarkStyle;
exports.auraInit = auraInit;
exports.basicDark = basicDark;
exports.basicDarkInit = basicDarkInit;
exports.basicDarkStyle = basicDarkStyle;
exports.basicLight = basicLight;
exports.basicLightInit = basicLightInit;
exports.basicLightStyle = basicLightStyle;
exports.bbedit = bbedit;
exports.bbeditInit = bbeditInit;
exports.bbeditLightStyle = bbeditLightStyle;
exports.bespin = bespin;
exports.bespinDarkStyle = bespinDarkStyle;
exports.bespinInit = bespinInit;
exports.consoleDark = consoleDark;
exports.consoleDarkInit = consoleDarkInit;
exports.consoleLight = consoleLight;
exports.consoleLightInit = consoleLightInit;
exports.copilot = copilot;
exports.copilotDarkStyle = copilotDarkStyle;
exports.copilotInit = copilotInit;
exports.darcula = darcula;
exports.darculaDarkStyle = darculaDarkStyle;
exports.darculaInit = darculaInit;
exports.defaultSettingsAbcdef = defaultSettingsAbcdef;
exports.defaultSettingsAbyss = defaultSettingsAbyss;
exports.defaultSettingsAndroidstudio = defaultSettingsAndroidstudio;
exports.defaultSettingsAndromeda = defaultSettingsAndromeda;
exports.defaultSettingsAtomone = defaultSettingsAtomone;
exports.defaultSettingsAura = defaultSettingsAura;
exports.defaultSettingsBasicDark = defaultSettingsBasicDark;
exports.defaultSettingsBasicLight = defaultSettingsBasicLight;
exports.defaultSettingsBbedit = defaultSettingsBbedit;
exports.defaultSettingsBespin = defaultSettingsBespin;
exports.defaultSettingsConsoleDark = defaultSettingsConsoleDark;
exports.defaultSettingsConsoleLight = defaultSettingsConsoleLight;
exports.defaultSettingsCopilot = defaultSettingsCopilot;
exports.defaultSettingsDarcula = defaultSettingsDarcula;
exports.defaultSettingsDracula = defaultSettingsDracula;
exports.defaultSettingsDuotoneDark = defaultSettingsDuotoneDark;
exports.defaultSettingsDuotoneLight = defaultSettingsDuotoneLight;
exports.defaultSettingsEclipse = defaultSettingsEclipse;
exports.defaultSettingsGithubDark = defaultSettingsGithubDark;
exports.defaultSettingsGithubLight = defaultSettingsGithubLight;
exports.defaultSettingsGruvboxDark = defaultSettingsGruvboxDark;
exports.defaultSettingsGruvboxLight = defaultSettingsGruvboxLight;
exports.defaultSettingsKimbie = defaultSettingsKimbie;
exports.defaultSettingsMaterial = defaultSettingsMaterial;
exports.defaultSettingsMaterialDark = defaultSettingsMaterialDark;
exports.defaultSettingsMaterialLight = defaultSettingsMaterialLight;
exports.defaultSettingsMonokai = defaultSettingsMonokai;
exports.defaultSettingsMonokaiDimmed = defaultSettingsMonokaiDimmed;
exports.defaultSettingsNoctisLilac = defaultSettingsNoctisLilac;
exports.defaultSettingsNord = defaultSettingsNord;
exports.defaultSettingsOkaidia = defaultSettingsOkaidia;
exports.defaultSettingsQuietlight = defaultSettingsQuietlight;
exports.defaultSettingsRed = defaultSettingsRed;
exports.defaultSettingsSolarizedDark = defaultSettingsSolarizedDark;
exports.defaultSettingsSolarizedLight = defaultSettingsSolarizedLight;
exports.defaultSettingsSublime = defaultSettingsSublime;
exports.defaultSettingsTokyoNight = defaultSettingsTokyoNight;
exports.defaultSettingsTokyoNightDay = defaultSettingsTokyoNightDay;
exports.defaultSettingsTokyoNightStorm = defaultSettingsTokyoNightStorm;
exports.defaultSettingsTomorrowNightBlue = defaultSettingsTomorrowNightBlue;
exports.defaultSettingsVscodeDark = defaultSettingsVscodeDark;
exports.defaultSettingsVscodeLight = defaultSettingsVscodeLight;
exports.defaultSettingsWhiteDark = defaultSettingsWhiteDark;
exports.defaultSettingsWhiteLight = defaultSettingsWhiteLight;
exports.defaultSettingsXcodeDark = defaultSettingsXcodeDark;
exports.defaultSettingsXcodeLight = defaultSettingsXcodeLight;
exports.douToneLightStyle = douToneLightStyle;
exports.dracula = dracula;
exports.draculaDarkStyle = draculaDarkStyle;
exports.draculaInit = draculaInit;
exports.duotoneDark = duotoneDark;
exports.duotoneDarkInit = duotoneDarkInit;
exports.duotoneDarkStyle = duotoneDarkStyle;
exports.duotoneLight = duotoneLight;
exports.duotoneLightInit = duotoneLightInit;
exports.eclipse = eclipse;
exports.eclipseInit = eclipseInit;
exports.eclipseLightStyle = eclipseLightStyle;
exports.githubDark = githubDark;
exports.githubDarkInit = githubDarkInit;
exports.githubDarkStyle = githubDarkStyle;
exports.githubLight = githubLight;
exports.githubLightInit = githubLightInit;
exports.githubLightStyle = githubLightStyle;
exports.gruvboxDark = gruvboxDark;
exports.gruvboxDarkInit = gruvboxDarkInit;
exports.gruvboxDarkStyle = gruvboxDarkStyle;
exports.gruvboxLight = gruvboxLight;
exports.gruvboxLightInit = gruvboxLightInit;
exports.kimbie = kimbie;
exports.kimbieDarkStyle = kimbieDarkStyle;
exports.kimbieInit = kimbieInit;
exports.material = material;
exports.materialDark = materialDark;
exports.materialDarkInit = materialDarkInit;
exports.materialDarkStyle = materialDarkStyle;
exports.materialInit = materialInit;
exports.materialLight = materialLight;
exports.materialLightInit = materialLightInit;
exports.materialLightStyle = materialLightStyle;
exports.monokai = monokai;
exports.monokaiDarkStyle = monokaiDarkStyle;
exports.monokaiDimmed = monokaiDimmed;
exports.monokaiDimmedDarkStyle = monokaiDimmedDarkStyle;
exports.monokaiDimmedInit = monokaiDimmedInit;
exports.monokaiInit = monokaiInit;
exports.noctisLilac = noctisLilac;
exports.noctisLilacInit = noctisLilacInit;
exports.noctisLilacLightStyle = noctisLilacLightStyle;
exports.nord = nord;
exports.nordDarkStyle = nordDarkStyle;
exports.nordInit = nordInit;
exports.okaidia = okaidia;
exports.okaidiaDarkStyle = okaidiaDarkStyle;
exports.okaidiaInit = okaidiaInit;
exports.quietlight = quietlight;
exports.quietlightInit = quietlightInit;
exports.quietlightStyle = quietlightStyle;
exports.red = red;
exports.redDarkStyle = redDarkStyle;
exports.redInit = redInit;
exports.solarizedDark = solarizedDark;
exports.solarizedDarkInit = solarizedDarkInit;
exports.solarizedDarkStyle = solarizedDarkStyle;
exports.solarizedLight = solarizedLight;
exports.solarizedLightInit = solarizedLightInit;
exports.solarizedLightStyle = solarizedLightStyle;
exports.sublime = sublime;
exports.sublimeDarkStyle = sublimeDarkStyle;
exports.sublimeInit = sublimeInit;
exports.tokyoNight = tokyoNight;
exports.tokyoNightDay = tokyoNightDay;
exports.tokyoNightDayInit = tokyoNightDayInit;
exports.tokyoNightDayStyle = tokyoNightDayStyle;
exports.tokyoNightInit = tokyoNightInit;
exports.tokyoNightStorm = tokyoNightStorm;
exports.tokyoNightStormInit = tokyoNightStormInit;
exports.tokyoNightStormStyle = tokyoNightStormStyle;
exports.tokyoNightStyle = tokyoNightStyle;
exports.tomorrowNightBlue = tomorrowNightBlue;
exports.tomorrowNightBlueInit = tomorrowNightBlueInit;
exports.tomorrowNightBlueStyle = tomorrowNightBlueStyle;
exports.vscodeDark = vscodeDark;
exports.vscodeDarkInit = vscodeDarkInit;
exports.vscodeDarkStyle = vscodeDarkStyle;
exports.vscodeLight = vscodeLight;
exports.vscodeLightInit = vscodeLightInit;
exports.vscodeLightStyle = vscodeLightStyle;
exports.whiteDark = whiteDark;
exports.whiteDarkInit = whiteDarkInit;
exports.whiteDarkStyle = whiteDarkStyle;
exports.whiteLight = whiteLight;
exports.whiteLightInit = whiteLightInit;
exports.whiteLightStyle = whiteLightStyle;
exports.xcodeDark = xcodeDark;
exports.xcodeDarkInit = xcodeDarkInit;
exports.xcodeDarkStyle = xcodeDarkStyle;
exports.xcodeLight = xcodeLight;
exports.xcodeLightInit = xcodeLightInit;
exports.xcodeLightStyle = xcodeLightStyle;
