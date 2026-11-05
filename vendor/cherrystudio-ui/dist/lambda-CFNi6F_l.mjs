import { n as __exportAll } from "./rolldown-runtime-B000p9w_.mjs";
import { r as AvatarFallback, s as cn, t as Avatar } from "./avatar-D3NkEc4-.mjs";
import { useId } from "react";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
//#region src/components/icons/providers/lambda/dark.tsx
const LambdaDark = (props) => {
	const iconId = useId();
	return /* @__PURE__ */ jsxs("svg", {
		xmlns: "http://www.w3.org/2000/svg",
		width: "1em",
		height: "1em",
		fill: "none",
		viewBox: "0 0 120 120",
		...props,
		children: [/* @__PURE__ */ jsx("mask", {
			id: `${iconId}-lambdadark__a`,
			width: 65,
			height: 65,
			x: 28,
			y: 27,
			maskUnits: "userSpaceOnUse",
			style: { maskType: "luminance" },
			children: /* @__PURE__ */ jsx("path", {
				fill: "#fff",
				d: "M93 27H28V92H93V27Z"
			})
		}), /* @__PURE__ */ jsxs("g", {
			fill: "#fff",
			mask: `url(#${iconId}-lambdadark__a)`,
			children: [/* @__PURE__ */ jsx("path", { d: "M44.8735 38.3226L56.1835 58.1412L43.5995 81.0927L51.6984 81.0862L60.0835 65.4277L69.0144 81.0927H77.2695L53.1284 38.3162L44.8735 38.3226Z" }), /* @__PURE__ */ jsx("path", { d: "M28 27V92H93V27H28ZM87.2605 86.2777H33.7395V32.7223H87.2605V86.2777Z" })]
		})]
	});
};
//#endregion
//#region src/components/icons/providers/lambda/light.tsx
const LambdaLight = (props) => {
	const iconId = useId();
	return /* @__PURE__ */ jsxs("svg", {
		xmlns: "http://www.w3.org/2000/svg",
		width: "1em",
		height: "1em",
		fill: "none",
		viewBox: "0 0 120 120",
		...props,
		children: [/* @__PURE__ */ jsx("mask", {
			id: `${iconId}-lambdalight__a`,
			width: 65,
			height: 65,
			x: 28,
			y: 27,
			maskUnits: "userSpaceOnUse",
			style: { maskType: "luminance" },
			children: /* @__PURE__ */ jsx("path", {
				fill: "#fff",
				d: "M93 27H28V92H93V27Z"
			})
		}), /* @__PURE__ */ jsxs("g", {
			fill: "#000",
			mask: `url(#${iconId}-lambdalight__a)`,
			children: [/* @__PURE__ */ jsx("path", { d: "M44.8735 38.3227L56.1835 58.1413L43.5995 81.0928L51.6984 81.0862L60.0835 65.4278L69.0144 81.0928H77.2695L53.1284 38.3163L44.8735 38.3227Z" }), /* @__PURE__ */ jsx("path", { d: "M28 27V92H93V27H28ZM87.2605 86.2777H33.7395V32.7223H87.2605V86.2777Z" })]
		})]
	});
};
//#endregion
//#region src/components/icons/providers/lambda/avatar.tsx
function LambdaAvatar({ size = 32, shape = "circle", className }) {
	return /* @__PURE__ */ jsx(Avatar, {
		className: cn("overflow-hidden", shape === "circle" ? "rounded-full" : "rounded-[20%]", className),
		style: {
			width: size,
			height: size
		},
		children: /* @__PURE__ */ jsxs(AvatarFallback, {
			className: "text-foreground bg-background",
			children: [/* @__PURE__ */ jsx(LambdaLight, {
				className: "dark:hidden",
				style: {
					width: size,
					height: size
				}
			}), /* @__PURE__ */ jsx(LambdaDark, {
				className: "hidden dark:block",
				style: {
					width: size,
					height: size
				}
			})]
		})
	});
}
//#endregion
//#region src/components/icons/providers/lambda/index.tsx
var lambda_exports = /* @__PURE__ */ __exportAll({
	LambdaIcon: () => LambdaIcon,
	default: () => LambdaIcon
});
const Lambda = ({ variant, className, ...props }) => {
	if (variant === "light") return /* @__PURE__ */ jsx(LambdaLight, {
		...props,
		className
	});
	if (variant === "dark") return /* @__PURE__ */ jsx(LambdaDark, {
		...props,
		className
	});
	return /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsx(LambdaLight, {
		className: cn("dark:hidden", className),
		...props
	}), /* @__PURE__ */ jsx(LambdaDark, {
		className: cn("hidden dark:block", className),
		...props
	})] });
};
const LambdaIcon = /*#__PURE__*/ Object.assign(Lambda, {
	Avatar: LambdaAvatar,
	colorPrimary: "#000000"
});
//#endregion
export { lambda_exports as n, LambdaIcon as t };
