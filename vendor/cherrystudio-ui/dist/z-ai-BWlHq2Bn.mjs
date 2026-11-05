import { n as __exportAll } from "./rolldown-runtime-B000p9w_.mjs";
import { r as AvatarFallback, s as cn, t as Avatar } from "./avatar-D3NkEc4-.mjs";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
//#region src/components/icons/providers/z-ai/dark.tsx
const ZAiDark = (props) => /* @__PURE__ */ jsx("svg", {
	xmlns: "http://www.w3.org/2000/svg",
	width: "1em",
	height: "1em",
	fill: "none",
	viewBox: "0 0 120 120",
	...props,
	children: /* @__PURE__ */ jsx("path", {
		fill: "#fff",
		fillRule: "evenodd",
		d: "M60.7843 33L54.8857 40.9731H29.7685L35.6646 33H60.7871H60.7843ZM90.9797 79.0296L85.0863 87H60.0558L65.9437 79.0296H90.9797ZM93 33L53.09 87H28L67.91 33H93Z",
		clipRule: "evenodd"
	})
});
//#endregion
//#region src/components/icons/providers/z-ai/light.tsx
const ZAiLight = (props) => /* @__PURE__ */ jsx("svg", {
	xmlns: "http://www.w3.org/2000/svg",
	width: "1em",
	height: "1em",
	fill: "none",
	viewBox: "0 0 120 120",
	...props,
	children: /* @__PURE__ */ jsx("path", {
		fill: "#000",
		fillRule: "evenodd",
		d: "M60.7843 33L54.8857 40.9731H29.7685L35.6646 33H60.7871H60.7843ZM90.9797 79.0296L85.0863 87H60.0558L65.9437 79.0296H90.9797ZM93 33L53.09 87H28L67.91 33H93Z",
		clipRule: "evenodd"
	})
});
//#endregion
//#region src/components/icons/providers/z-ai/avatar.tsx
function ZAiAvatar({ size = 32, shape = "circle", className }) {
	return /* @__PURE__ */ jsx(Avatar, {
		className: cn("overflow-hidden", shape === "circle" ? "rounded-full" : "rounded-[20%]", className),
		style: {
			width: size,
			height: size
		},
		children: /* @__PURE__ */ jsxs(AvatarFallback, {
			className: "text-foreground bg-background",
			children: [/* @__PURE__ */ jsx(ZAiLight, {
				className: "dark:hidden",
				style: {
					width: size,
					height: size
				}
			}), /* @__PURE__ */ jsx(ZAiDark, {
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
//#region src/components/icons/providers/z-ai/index.tsx
var z_ai_exports = /* @__PURE__ */ __exportAll({
	ZAiIcon: () => ZAiIcon,
	default: () => ZAiIcon
});
const ZAi = ({ variant, className, ...props }) => {
	if (variant === "light") return /* @__PURE__ */ jsx(ZAiLight, {
		...props,
		className
	});
	if (variant === "dark") return /* @__PURE__ */ jsx(ZAiDark, {
		...props,
		className
	});
	return /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsx(ZAiLight, {
		className: cn("dark:hidden", className),
		...props
	}), /* @__PURE__ */ jsx(ZAiDark, {
		className: cn("hidden dark:block", className),
		...props
	})] });
};
const ZAiIcon = /*#__PURE__*/ Object.assign(ZAi, {
	Avatar: ZAiAvatar,
	colorPrimary: "#000000"
});
//#endregion
export { z_ai_exports as n, ZAiIcon as t };
