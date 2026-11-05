import { n as __exportAll } from "./rolldown-runtime-B000p9w_.mjs";
import { r as AvatarFallback, s as cn, t as Avatar } from "./avatar-D3NkEc4-.mjs";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
//#region src/components/icons/providers/elevenlabs/dark.tsx
const ElevenlabsDark = (props) => /* @__PURE__ */ jsx("svg", {
	xmlns: "http://www.w3.org/2000/svg",
	width: "1em",
	height: "1em",
	fill: "none",
	viewBox: "0 0 120 120",
	...props,
	children: /* @__PURE__ */ jsx("path", {
		fill: "#fff",
		fillRule: "evenodd",
		d: "M41 27H54.5714V92H41V27ZM65.4286 27H79V92H65.4286V27Z",
		clipRule: "evenodd"
	})
});
//#endregion
//#region src/components/icons/providers/elevenlabs/light.tsx
const ElevenlabsLight = (props) => /* @__PURE__ */ jsx("svg", {
	xmlns: "http://www.w3.org/2000/svg",
	width: "1em",
	height: "1em",
	fill: "none",
	viewBox: "0 0 120 120",
	...props,
	children: /* @__PURE__ */ jsx("path", {
		fill: "#000",
		fillRule: "evenodd",
		d: "M41 27H54.5714V92H41V27ZM65.4286 27H79V92H65.4286V27Z",
		clipRule: "evenodd"
	})
});
//#endregion
//#region src/components/icons/providers/elevenlabs/avatar.tsx
function ElevenlabsAvatar({ size = 32, shape = "circle", className }) {
	return /* @__PURE__ */ jsx(Avatar, {
		className: cn("overflow-hidden", shape === "circle" ? "rounded-full" : "rounded-[20%]", className),
		style: {
			width: size,
			height: size
		},
		children: /* @__PURE__ */ jsxs(AvatarFallback, {
			className: "text-foreground bg-background",
			children: [/* @__PURE__ */ jsx(ElevenlabsLight, {
				className: "dark:hidden",
				style: {
					width: size,
					height: size
				}
			}), /* @__PURE__ */ jsx(ElevenlabsDark, {
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
//#region src/components/icons/providers/elevenlabs/index.tsx
var elevenlabs_exports = /* @__PURE__ */ __exportAll({
	ElevenlabsIcon: () => ElevenlabsIcon,
	default: () => ElevenlabsIcon
});
const Elevenlabs = ({ variant, className, ...props }) => {
	if (variant === "light") return /* @__PURE__ */ jsx(ElevenlabsLight, {
		...props,
		className
	});
	if (variant === "dark") return /* @__PURE__ */ jsx(ElevenlabsDark, {
		...props,
		className
	});
	return /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsx(ElevenlabsLight, {
		className: cn("dark:hidden", className),
		...props
	}), /* @__PURE__ */ jsx(ElevenlabsDark, {
		className: cn("hidden dark:block", className),
		...props
	})] });
};
const ElevenlabsIcon = /*#__PURE__*/ Object.assign(Elevenlabs, {
	Avatar: ElevenlabsAvatar,
	colorPrimary: "#000000"
});
//#endregion
export { elevenlabs_exports as n, ElevenlabsIcon as t };
