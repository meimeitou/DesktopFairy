import { n as __exportAll } from "./rolldown-runtime-B000p9w_.mjs";
import { r as AvatarFallback, s as cn, t as Avatar } from "./avatar-D3NkEc4-.mjs";
import { useId } from "react";
import { jsx, jsxs } from "react/jsx-runtime";
//#region src/components/icons/providers/step/light.tsx
const StepLight = (props) => {
	const iconId = useId();
	return /* @__PURE__ */ jsxs("svg", {
		xmlns: "http://www.w3.org/2000/svg",
		width: "1em",
		height: "1em",
		fill: "none",
		viewBox: "0 0 120 120",
		...props,
		children: [
			/* @__PURE__ */ jsx("mask", {
				id: `${iconId}-steplight__a`,
				width: 65,
				height: 65,
				x: 27,
				y: 28,
				maskUnits: "userSpaceOnUse",
				style: { maskType: "luminance" },
				children: /* @__PURE__ */ jsx("path", {
					fill: "#fff",
					d: "M92 28H27V93H92V28Z"
				})
			}),
			/* @__PURE__ */ jsxs("g", {
				mask: `url(#${iconId}-steplight__a)`,
				children: [/* @__PURE__ */ jsx("mask", {
					id: `${iconId}-steplight__b`,
					width: 65,
					height: 65,
					x: 27,
					y: 28,
					maskUnits: "userSpaceOnUse",
					style: { maskType: "luminance" },
					children: /* @__PURE__ */ jsx("path", {
						fill: "#fff",
						d: "M92 28H27V93H92V28Z"
					})
				}), /* @__PURE__ */ jsx("g", {
					mask: `url(#${iconId}-steplight__b)`,
					children: /* @__PURE__ */ jsx("path", {
						fill: `url(#${iconId}-steplight__c)`,
						fillRule: "evenodd",
						d: "M86.6158 28H89.4108V30.5107H92V33.1323H89.4108V38.2375H86.6158V33.135H81.5296V30.5079H86.6158V28ZM34.0417 61.5048V33.0646H36.666V61.5075H34.039L34.0417 61.5048ZM62.2706 63.2923H91.9267V65.7785H75.1135V91.7219H62.2706V63.2896V63.2923ZM42.2452 37.0269V70.491H27V82.7057H55.1287V49.6667H83.4931L83.485 37.0242L42.2452 37.0269Z",
						clipRule: "evenodd"
					})
				})]
			}),
			/* @__PURE__ */ jsx("defs", { children: /* @__PURE__ */ jsxs("linearGradient", {
				id: `${iconId}-steplight__c`,
				x1: 31.458,
				x2: 76.676,
				y1: 33.189,
				y2: 87.83,
				gradientUnits: "userSpaceOnUse",
				children: [/* @__PURE__ */ jsx("stop", { stopColor: "#01A9FF" }), /* @__PURE__ */ jsx("stop", {
					offset: 1,
					stopColor: "#0160FF"
				})]
			}) })
		]
	});
};
//#endregion
//#region src/components/icons/providers/step/avatar.tsx
function StepAvatar({ size = 32, shape = "circle", className }) {
	return /* @__PURE__ */ jsx(Avatar, {
		className: cn("overflow-hidden", shape === "circle" ? "rounded-full" : "rounded-[20%]", className),
		style: {
			width: size,
			height: size
		},
		children: /* @__PURE__ */ jsx(AvatarFallback, {
			className: "text-foreground bg-background",
			children: /* @__PURE__ */ jsx(StepLight, { style: {
				width: size,
				height: size
			} })
		})
	});
}
//#endregion
//#region src/components/icons/providers/step/index.tsx
var step_exports = /* @__PURE__ */ __exportAll({
	StepIcon: () => StepIcon,
	default: () => StepIcon
});
const Step = ({ variant, className, ...props }) => {
	if (variant === "light") return /* @__PURE__ */ jsx(StepLight, {
		...props,
		className
	});
	return /* @__PURE__ */ jsx(StepLight, {
		...props,
		className
	});
};
const StepIcon = /*#__PURE__*/ Object.assign(Step, {
	Avatar: StepAvatar,
	colorPrimary: "#000000"
});
//#endregion
export { step_exports as n, StepIcon as t };
