import { n as __exportAll } from "./rolldown-runtime-B000p9w_.mjs";
import { r as AvatarFallback, s as cn, t as Avatar } from "./avatar-D3NkEc4-.mjs";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
//#region src/components/icons/providers/grok/dark.tsx
const GrokDark = (props) => /* @__PURE__ */ jsx("svg", {
	xmlns: "http://www.w3.org/2000/svg",
	width: "1em",
	height: "1em",
	fill: "none",
	viewBox: "0 0 120 120",
	...props,
	children: /* @__PURE__ */ jsx("path", {
		fill: "#fff",
		fillRule: "evenodd",
		d: "M44.1835 49.9746L73.8104 92H60.6416L31.0147 49.9746H44.1835ZM44.1718 73.3154L50.7591 82.6637L44.1776 92H31L44.1718 73.3154ZM90 31.6741V92H79.206V46.9845L90 31.6741ZM90 27L60.6416 68.6444L54.0542 59.2991L76.8224 27H90Z",
		clipRule: "evenodd"
	})
});
//#endregion
//#region src/components/icons/providers/grok/light.tsx
const GrokLight = (props) => /* @__PURE__ */ jsx("svg", {
	xmlns: "http://www.w3.org/2000/svg",
	width: "1em",
	height: "1em",
	fill: "none",
	viewBox: "0 0 120 120",
	...props,
	children: /* @__PURE__ */ jsx("path", {
		fill: "#000",
		fillRule: "evenodd",
		d: "M44.1835 49.9746L73.8104 92H60.6416L31.0147 49.9746H44.1835ZM44.1718 73.3154L50.7591 82.6637L44.1776 92H31L44.1718 73.3154ZM90 31.6741V92H79.206V46.9845L90 31.6741ZM90 27L60.6416 68.6444L54.0542 59.2991L76.8224 27H90Z",
		clipRule: "evenodd"
	})
});
//#endregion
//#region src/components/icons/providers/grok/avatar.tsx
function GrokAvatar({ size = 32, shape = "circle", className }) {
	return /* @__PURE__ */ jsx(Avatar, {
		className: cn("overflow-hidden", shape === "circle" ? "rounded-full" : "rounded-[20%]", className),
		style: {
			width: size,
			height: size
		},
		children: /* @__PURE__ */ jsxs(AvatarFallback, {
			className: "text-foreground bg-background",
			children: [/* @__PURE__ */ jsx(GrokLight, {
				className: "dark:hidden",
				style: {
					width: size,
					height: size
				}
			}), /* @__PURE__ */ jsx(GrokDark, {
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
//#region src/components/icons/providers/grok/index.tsx
var grok_exports = /* @__PURE__ */ __exportAll({
	GrokIcon: () => GrokIcon,
	default: () => GrokIcon
});
const Grok = ({ variant, className, ...props }) => {
	if (variant === "light") return /* @__PURE__ */ jsx(GrokLight, {
		...props,
		className
	});
	if (variant === "dark") return /* @__PURE__ */ jsx(GrokDark, {
		...props,
		className
	});
	return /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsx(GrokLight, {
		className: cn("dark:hidden", className),
		...props
	}), /* @__PURE__ */ jsx(GrokDark, {
		className: cn("hidden dark:block", className),
		...props
	})] });
};
const GrokIcon = /*#__PURE__*/ Object.assign(Grok, {
	Avatar: GrokAvatar,
	colorPrimary: "#000000"
});
//#endregion
export { grok_exports as n, GrokIcon as t };
