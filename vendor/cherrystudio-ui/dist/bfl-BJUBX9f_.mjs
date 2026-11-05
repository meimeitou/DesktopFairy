import { n as __exportAll } from "./rolldown-runtime-B000p9w_.mjs";
import { r as AvatarFallback, s as cn, t as Avatar } from "./avatar-D3NkEc4-.mjs";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
//#region src/components/icons/providers/bfl/dark.tsx
const BflDark = (props) => /* @__PURE__ */ jsx("svg", {
	xmlns: "http://www.w3.org/2000/svg",
	width: "1em",
	height: "1em",
	fill: "none",
	viewBox: "0 0 120 120",
	...props,
	children: /* @__PURE__ */ jsx("path", {
		fill: "#fff",
		fillRule: "evenodd",
		d: "M74.3477 56.6122H67.4333L60.519 46.8278L38.9525 77.323H45.8804L60.519 56.6122H67.4307L52.7948 77.3204H59.7417L74.345 56.6122L93 83H82.0854V77.342L74.3477 66.3994L66.6506 77.323V83H28L60.5217 37L74.3477 56.6122Z",
		clipRule: "evenodd"
	})
});
//#endregion
//#region src/components/icons/providers/bfl/light.tsx
const BflLight = (props) => /* @__PURE__ */ jsx("svg", {
	xmlns: "http://www.w3.org/2000/svg",
	width: "1em",
	height: "1em",
	fill: "none",
	viewBox: "0 0 120 120",
	...props,
	children: /* @__PURE__ */ jsx("path", {
		fill: "#000",
		fillRule: "evenodd",
		d: "M74.3477 56.6122H67.4333L60.519 46.8278L38.9525 77.323H45.8804L60.519 56.6122H67.4307L52.7948 77.3204H59.7417L74.345 56.6122L93 83H82.0854V77.342L74.3477 66.3994L66.6506 77.323V83H28L60.5217 37L74.3477 56.6122Z",
		clipRule: "evenodd"
	})
});
//#endregion
//#region src/components/icons/providers/bfl/avatar.tsx
function BflAvatar({ size = 32, shape = "circle", className }) {
	return /* @__PURE__ */ jsx(Avatar, {
		className: cn("overflow-hidden", shape === "circle" ? "rounded-full" : "rounded-[20%]", className),
		style: {
			width: size,
			height: size
		},
		children: /* @__PURE__ */ jsxs(AvatarFallback, {
			className: "text-foreground bg-background",
			children: [/* @__PURE__ */ jsx(BflLight, {
				className: "dark:hidden",
				style: {
					width: size,
					height: size
				}
			}), /* @__PURE__ */ jsx(BflDark, {
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
//#region src/components/icons/providers/bfl/index.tsx
var bfl_exports = /* @__PURE__ */ __exportAll({
	BflIcon: () => BflIcon,
	default: () => BflIcon
});
const Bfl = ({ variant, className, ...props }) => {
	if (variant === "light") return /* @__PURE__ */ jsx(BflLight, {
		...props,
		className
	});
	if (variant === "dark") return /* @__PURE__ */ jsx(BflDark, {
		...props,
		className
	});
	return /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsx(BflLight, {
		className: cn("dark:hidden", className),
		...props
	}), /* @__PURE__ */ jsx(BflDark, {
		className: cn("hidden dark:block", className),
		...props
	})] });
};
const BflIcon = /*#__PURE__*/ Object.assign(Bfl, {
	Avatar: BflAvatar,
	colorPrimary: "#000000"
});
//#endregion
export { bfl_exports as n, BflIcon as t };
