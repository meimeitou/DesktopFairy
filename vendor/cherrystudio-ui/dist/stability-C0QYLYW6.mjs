import { r as AvatarFallback, s as cn, t as Avatar } from "./avatar-D3NkEc4-.mjs";
import { useId } from "react";
import { jsx, jsxs } from "react/jsx-runtime";
//#region src/components/icons/models/stability/light.tsx
const StabilityLight = (props) => {
	const iconId = useId();
	return /* @__PURE__ */ jsxs("svg", {
		xmlns: "http://www.w3.org/2000/svg",
		width: "1em",
		height: "1em",
		fill: "none",
		viewBox: "0 0 24 24",
		...props,
		children: [
			/* @__PURE__ */ jsx("path", {
				fill: `url(#${iconId}-stabilitylight__a)`,
				d: "M8.52582 18.0909C11.6182 18.0909 13.6298 16.4764 13.6298 14.0473C13.6298 12.1636 12.4065 10.9665 10.2189 10.4705L8.81527 10.0553C7.58327 9.78255 6.864 9.45527 7.03345 8.61891C7.17454 7.92291 7.59563 7.53018 8.57672 7.53018C11.6931 7.53018 12.848 8.61891 12.848 8.61891V6.00073C12.848 6.00073 11.7236 5 8.57672 5C5.60945 5 4 6.50545 4 8.83491C4 10.7185 5.11564 11.8145 7.37818 12.3345L7.62109 12.3949C7.96509 12.4996 8.42982 12.6385 9.01454 12.8109C10.1709 13.0836 10.4684 13.3731 10.4684 14.2407C10.4684 15.0335 9.632 15.4844 8.52654 15.4844C5.33891 15.4844 4 13.8953 4 13.8953V16.7964C4 16.7964 4.83782 18.0909 8.52582 18.0909Z"
			}),
			/* @__PURE__ */ jsx("path", {
				fill: "#E80000",
				d: "M18.0902 17.8945C19.1847 17.8945 20 17.1142 20 16.0574C20 14.9782 19.208 14.2204 18.0902 14.2204C16.9956 14.2204 16.2036 14.9782 16.2036 16.0574C16.2036 17.1367 16.9956 17.8945 18.0902 17.8945Z"
			}),
			/* @__PURE__ */ jsx("defs", { children: /* @__PURE__ */ jsxs("linearGradient", {
				id: `${iconId}-stabilitylight__a`,
				x1: 8.815,
				x2: 8.815,
				y1: 5,
				y2: 18.091,
				gradientUnits: "userSpaceOnUse",
				children: [/* @__PURE__ */ jsx("stop", { stopColor: "#9D39FF" }), /* @__PURE__ */ jsx("stop", {
					offset: 1,
					stopColor: "#A380FF"
				})]
			}) })
		]
	});
};
//#endregion
//#region src/components/icons/models/stability/avatar.tsx
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
//#region src/components/icons/models/stability/index.tsx
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
export { StabilityIcon, StabilityIcon as default };
