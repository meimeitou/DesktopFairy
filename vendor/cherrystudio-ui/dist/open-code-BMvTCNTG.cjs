let react = require("react");
let react_jsx_runtime = require("react/jsx-runtime");
//#region src/components/icons/general/open-code.tsx
const OpenCode = (props) => {
	const iconId = (0, react.useId)();
	return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
		xmlns: "http://www.w3.org/2000/svg",
		width: "1em",
		height: "1em",
		fill: "none",
		viewBox: "-8 -8 136 136",
		...props,
		children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("g", {
			clipPath: `url(#${iconId}-opencode__a)`,
			children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
				fill: "currentColor",
				fillRule: "evenodd",
				d: "M77.2 34.2H42.8V85.8H77.2V34.2ZM94.4 103H25.6V17H94.4V103Z",
				clipRule: "evenodd"
			})
		}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("defs", { children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("clipPath", {
			id: `${iconId}-opencode__a`,
			children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
				fill: "#fff",
				d: "M0 0H86V86H0z",
				transform: "translate(17 17)"
			})
		}) })]
	});
};
//#endregion
Object.defineProperty(exports, "OpenCode", {
	enumerable: true,
	get: function() {
		return OpenCode;
	}
});
