import { useId } from "react";
import { jsx, jsxs } from "react/jsx-runtime";
//#region src/components/icons/general/open-code.tsx
const OpenCode = (props) => {
	const iconId = useId();
	return /* @__PURE__ */ jsxs("svg", {
		xmlns: "http://www.w3.org/2000/svg",
		width: "1em",
		height: "1em",
		fill: "none",
		viewBox: "-8 -8 136 136",
		...props,
		children: [/* @__PURE__ */ jsx("g", {
			clipPath: `url(#${iconId}-opencode__a)`,
			children: /* @__PURE__ */ jsx("path", {
				fill: "currentColor",
				fillRule: "evenodd",
				d: "M77.2 34.2H42.8V85.8H77.2V34.2ZM94.4 103H25.6V17H94.4V103Z",
				clipRule: "evenodd"
			})
		}), /* @__PURE__ */ jsx("defs", { children: /* @__PURE__ */ jsx("clipPath", {
			id: `${iconId}-opencode__a`,
			children: /* @__PURE__ */ jsx("path", {
				fill: "#fff",
				d: "M0 0H86V86H0z",
				transform: "translate(17 17)"
			})
		}) })]
	});
};
//#endregion
export { OpenCode as t };
