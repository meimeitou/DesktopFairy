import { r as AvatarFallback, s as cn, t as Avatar } from "./avatar-D3NkEc4-.mjs";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
//#region src/components/icons/models/suno/dark.tsx
const SunoDark = (props) => /* @__PURE__ */ jsx("svg", {
	xmlns: "http://www.w3.org/2000/svg",
	width: "1em",
	height: "1em",
	fill: "none",
	viewBox: "0 0 24 24",
	...props,
	children: /* @__PURE__ */ jsx("path", {
		fill: "#fff",
		fillRule: "evenodd",
		d: "M15 4C17.7613 4 20 7.582 20 12H14C14 16.418 11.7613 20 9 20C6.23867 20 4 16.418 4 12H10C10 7.582 12.2387 4 15 4Z",
		clipRule: "evenodd"
	})
});
//#endregion
//#region src/components/icons/models/suno/light.tsx
const SunoLight = (props) => /* @__PURE__ */ jsx("svg", {
	xmlns: "http://www.w3.org/2000/svg",
	width: "1em",
	height: "1em",
	fill: "none",
	viewBox: "0 0 24 24",
	...props,
	children: /* @__PURE__ */ jsx("path", {
		fill: "#000",
		fillRule: "evenodd",
		d: "M15 4C17.7613 4 20 7.582 20 12H14C14 16.418 11.7613 20 9 20C6.23867 20 4 16.418 4 12H10C10 7.582 12.2387 4 15 4Z",
		clipRule: "evenodd"
	})
});
//#endregion
//#region src/components/icons/models/suno/avatar.tsx
function SunoAvatar({ size = 32, shape = "circle", className }) {
	return /* @__PURE__ */ jsx(Avatar, {
		className: cn("overflow-hidden", shape === "circle" ? "rounded-full" : "rounded-[20%]", className),
		style: {
			width: size,
			height: size
		},
		children: /* @__PURE__ */ jsxs(AvatarFallback, {
			className: "text-foreground bg-background",
			children: [/* @__PURE__ */ jsx(SunoLight, {
				className: "dark:hidden",
				style: {
					width: size,
					height: size
				}
			}), /* @__PURE__ */ jsx(SunoDark, {
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
//#region src/components/icons/models/suno/index.tsx
const Suno = ({ variant, className, ...props }) => {
	if (variant === "light") return /* @__PURE__ */ jsx(SunoLight, {
		...props,
		className
	});
	if (variant === "dark") return /* @__PURE__ */ jsx(SunoDark, {
		...props,
		className
	});
	return /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsx(SunoLight, {
		className: cn("dark:hidden", className),
		...props
	}), /* @__PURE__ */ jsx(SunoDark, {
		className: cn("hidden dark:block", className),
		...props
	})] });
};
const SunoIcon = /*#__PURE__*/ Object.assign(Suno, {
	Avatar: SunoAvatar,
	colorPrimary: "#000000"
});
//#endregion
export { SunoIcon, SunoIcon as default };
