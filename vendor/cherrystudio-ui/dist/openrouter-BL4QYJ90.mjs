import { n as __exportAll } from "./rolldown-runtime-B000p9w_.mjs";
import { r as AvatarFallback, s as cn, t as Avatar } from "./avatar-D3NkEc4-.mjs";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
//#region src/components/icons/providers/openrouter/dark.tsx
const OpenrouterDark = (props) => /* @__PURE__ */ jsx("svg", {
	xmlns: "http://www.w3.org/2000/svg",
	viewBox: "-80.28 -134.13 561.96 561.96",
	width: "1em",
	height: "1em",
	...props,
	children: /* @__PURE__ */ jsx("path", {
		d: "M303.9475,17.19926c42.79734,0,77.48933,34.69327,77.48933,77.48933s-34.69199,77.48933-77.48933,77.48933l76.86166,76.86244c9.76367,9.76313,2.84903,26.45667-10.95697,26.45667h-220.88335c-71.32686,0-129.14889-57.82202-129.14889-129.14889S77.64197,17.19926,148.96884,17.19926h154.97866ZM148.96884,68.85881c-42.79607,0-77.48933,34.69327-77.48933,77.48933s34.69327,77.48933,77.48933,77.48933,77.48933-34.69327,77.48933-77.48933-34.69327-77.48933-77.48933-77.48933Z",
		style: { fill: "#c8ff00" }
	})
});
//#endregion
//#region src/components/icons/providers/openrouter/light.tsx
const OpenrouterLight = (props) => /* @__PURE__ */ jsx("svg", {
	xmlns: "http://www.w3.org/2000/svg",
	viewBox: "-80.28 -134.13 561.96 561.96",
	width: "1em",
	height: "1em",
	...props,
	children: /* @__PURE__ */ jsx("path", {
		d: "M303.9475,17.19926c42.79734,0,77.48933,34.69327,77.48933,77.48933s-34.69199,77.48933-77.48933,77.48933l76.86166,76.86244c9.76367,9.76313,2.84903,26.45667-10.95697,26.45667h-220.88335c-71.32686,0-129.14889-57.82202-129.14889-129.14889S77.64197,17.19926,148.96884,17.19926h154.97866ZM148.96884,68.85881c-42.79607,0-77.48933,34.69327-77.48933,77.48933s34.69327,77.48933,77.48933,77.48933,77.48933-34.69327,77.48933-77.48933-34.69327-77.48933-77.48933-77.48933Z",
		style: { fill: "#7624f4" }
	})
});
//#endregion
//#region src/components/icons/providers/openrouter/avatar.tsx
function OpenrouterAvatar({ size = 32, shape = "circle", className }) {
	return /* @__PURE__ */ jsx(Avatar, {
		className: cn("overflow-hidden", shape === "circle" ? "rounded-full" : "rounded-[20%]", className),
		style: {
			width: size,
			height: size
		},
		children: /* @__PURE__ */ jsxs(AvatarFallback, {
			className: "text-foreground bg-background",
			children: [/* @__PURE__ */ jsx(OpenrouterLight, {
				className: "dark:hidden",
				style: {
					width: size,
					height: size
				}
			}), /* @__PURE__ */ jsx(OpenrouterDark, {
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
//#region src/components/icons/providers/openrouter/index.tsx
var openrouter_exports = /* @__PURE__ */ __exportAll({
	OpenrouterIcon: () => OpenrouterIcon,
	default: () => OpenrouterIcon
});
const Openrouter = ({ variant, className, ...props }) => {
	if (variant === "light") return /* @__PURE__ */ jsx(OpenrouterLight, {
		...props,
		className
	});
	if (variant === "dark") return /* @__PURE__ */ jsx(OpenrouterDark, {
		...props,
		className
	});
	return /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsx(OpenrouterLight, {
		className: cn("dark:hidden", className),
		...props
	}), /* @__PURE__ */ jsx(OpenrouterDark, {
		className: cn("hidden dark:block", className),
		...props
	})] });
};
const OpenrouterIcon = /*#__PURE__*/ Object.assign(Openrouter, {
	Avatar: OpenrouterAvatar,
	colorPrimary: "#000000"
});
//#endregion
export { openrouter_exports as n, OpenrouterIcon as t };
