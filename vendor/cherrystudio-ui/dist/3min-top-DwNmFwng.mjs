import { n as __exportAll } from "./rolldown-runtime-B000p9w_.mjs";
import { r as AvatarFallback, s as cn, t as Avatar } from "./avatar-D3NkEc4-.mjs";
import { jsx, jsxs } from "react/jsx-runtime";
//#region src/components/icons/providers/3min-top/light.tsx
const MinTop3Light = (props) => /* @__PURE__ */ jsxs("svg", {
	xmlns: "http://www.w3.org/2000/svg",
	width: "1em",
	height: "1em",
	fill: "none",
	viewBox: "0 0 120 120",
	...props,
	children: [/* @__PURE__ */ jsx("path", {
		fill: "#FFF0A0",
		d: "M0 0H120V120H0z"
	}), /* @__PURE__ */ jsx("path", {
		fill: "#fff",
		fillOpacity: .9,
		stroke: "#222",
		strokeLinecap: "round",
		strokeLinejoin: "round",
		strokeWidth: 5.513,
		d: "M63.5 27L31 66H60.2501L57 92L89.5001 53H60.2501L63.5 27Z"
	})]
});
//#endregion
//#region src/components/icons/providers/3min-top/avatar.tsx
function MinTop3Avatar({ size = 32, shape = "circle", className }) {
	return /* @__PURE__ */ jsx(Avatar, {
		className: cn("overflow-hidden", shape === "circle" ? "rounded-full" : "rounded-[20%]", className),
		style: {
			width: size,
			height: size
		},
		children: /* @__PURE__ */ jsx(AvatarFallback, {
			className: "text-foreground",
			children: /* @__PURE__ */ jsx(MinTop3Light, { style: {
				width: size,
				height: size
			} })
		})
	});
}
//#endregion
//#region src/components/icons/providers/3min-top/index.tsx
var _3min_top_exports = /* @__PURE__ */ __exportAll({
	MinTop3Icon: () => MinTop3Icon,
	default: () => MinTop3Icon
});
const MinTop3 = ({ variant, className, ...props }) => {
	if (variant === "light") return /* @__PURE__ */ jsx(MinTop3Light, {
		...props,
		className
	});
	return /* @__PURE__ */ jsx(MinTop3Light, {
		...props,
		className
	});
};
const MinTop3Icon = /*#__PURE__*/ Object.assign(MinTop3, {
	Avatar: MinTop3Avatar,
	colorPrimary: "#FFF0A0"
});
//#endregion
export { _3min_top_exports as n, MinTop3Icon as t };
