import { n as __exportAll } from "./rolldown-runtime-B000p9w_.mjs";
import { r as AvatarFallback, s as cn, t as Avatar } from "./avatar-D3NkEc4-.mjs";
import { useId } from "react";
import { jsx, jsxs } from "react/jsx-runtime";
//#region src/components/icons/providers/stability/light.tsx
const StabilityLight = (props) => {
	const iconId = useId();
	return /* @__PURE__ */ jsxs("svg", {
		xmlns: "http://www.w3.org/2000/svg",
		width: "1em",
		height: "1em",
		fill: "none",
		viewBox: "0 0 120 120",
		...props,
		children: [
			/* @__PURE__ */ jsx("path", {
				fill: `url(#${iconId}-stabilitylight__a)`,
				d: "M64.1882 37.1611V48.4462C60.5315 45.7352 54.5422 43.6547 48.6789 43.6547C43.4462 43.6547 40.5461 45.6091 40.5461 48.6983C40.5461 51.9768 43.8875 53.3007 50.1921 54.9398C58.451 57.0834 67.4035 59.9205 67.4035 70.5752C67.4035 80.4734 59.6489 86.967 46.3463 86.967C39.1591 86.967 32.7915 85.0126 28.1891 81.7343V69.5034C32.4132 73.2231 38.2764 76.2493 45.7789 76.2493C51.5791 76.2493 54.8574 74.1057 54.8574 70.7013C54.8574 67.0447 50.8225 65.8468 43.8875 63.7662C35.5655 61.4336 28 58.2183 28 49.0136C28 39.8089 35.5655 33 48.1746 33C54.227 33 60.4055 34.6392 64.1882 37.1611Z"
			}),
			/* @__PURE__ */ jsx("path", {
				fill: "#E80000",
				d: "M77.8691 78.6449C77.8691 74.3578 81.1475 71.0795 85.4346 71.0795C89.7217 71.0795 93.0002 74.3578 93.0002 78.6449C93.0002 82.9321 89.6586 86.2104 85.4346 86.2104C81.1475 86.2734 77.8691 82.869 77.8691 78.6449Z"
			}),
			/* @__PURE__ */ jsx("defs", { children: /* @__PURE__ */ jsxs("linearGradient", {
				id: `${iconId}-stabilitylight__a`,
				x1: 47.702,
				x2: 47.702,
				y1: 86.967,
				y2: 33,
				gradientUnits: "userSpaceOnUse",
				children: [/* @__PURE__ */ jsx("stop", { stopColor: "#A381FF" }), /* @__PURE__ */ jsx("stop", {
					offset: 1,
					stopColor: "#9D38FF"
				})]
			}) })
		]
	});
};
//#endregion
//#region src/components/icons/providers/stability/avatar.tsx
function StabilityAvatar({ size = 32, shape = "circle", className }) {
	return /* @__PURE__ */ jsx(Avatar, {
		className: cn("overflow-hidden", shape === "circle" ? "rounded-full" : "rounded-[20%]", className),
		style: {
			width: size,
			height: size
		},
		children: /* @__PURE__ */ jsx(AvatarFallback, {
			className: "text-foreground bg-background",
			children: /* @__PURE__ */ jsx(StabilityLight, { style: {
				width: size,
				height: size
			} })
		})
	});
}
//#endregion
//#region src/components/icons/providers/stability/index.tsx
var stability_exports = /* @__PURE__ */ __exportAll({
	StabilityIcon: () => StabilityIcon,
	default: () => StabilityIcon
});
const Stability = ({ variant, className, ...props }) => {
	if (variant === "light") return /* @__PURE__ */ jsx(StabilityLight, {
		...props,
		className
	});
	return /* @__PURE__ */ jsx(StabilityLight, {
		...props,
		className
	});
};
const StabilityIcon = /*#__PURE__*/ Object.assign(Stability, {
	Avatar: StabilityAvatar,
	colorPrimary: "#E80000"
});
//#endregion
export { stability_exports as n, StabilityIcon as t };
