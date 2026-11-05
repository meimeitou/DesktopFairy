import { n as __exportAll } from "./rolldown-runtime-B000p9w_.mjs";
import { r as AvatarFallback, s as cn, t as Avatar } from "./avatar-D3NkEc4-.mjs";
import { useId } from "react";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
//#region src/components/icons/providers/notebooklm/dark.tsx
const NotebooklmDark = (props) => {
	const iconId = useId();
	return /* @__PURE__ */ jsxs("svg", {
		xmlns: "http://www.w3.org/2000/svg",
		width: "1em",
		height: "1em",
		fill: "none",
		viewBox: "0 0 120 120",
		...props,
		children: [/* @__PURE__ */ jsx("mask", {
			id: `${iconId}-notebooklmdark__a`,
			width: 65,
			height: 48,
			x: 28,
			y: 36,
			maskUnits: "userSpaceOnUse",
			style: { maskType: "luminance" },
			children: /* @__PURE__ */ jsx("path", {
				fill: "#fff",
				d: "M93 36H28V83.6666H93V36Z"
			})
		}), /* @__PURE__ */ jsx("g", {
			mask: `url(#${iconId}-notebooklmdark__a)`,
			children: /* @__PURE__ */ jsx("path", {
				fill: "#fff",
				d: "M60.5 36C42.5491 36 28 50.43 28 68.2346V83.6665H33.9909V82.1286C33.9909 74.9078 39.8896 69.0525 47.1696 69.0525C54.4496 69.0525 60.3484 74.9078 60.3484 82.1286V83.6665H66.3391V82.1286C66.3391 71.6254 57.7538 63.1158 47.1696 63.1158C43.0475 63.1158 39.2287 64.4051 36.1034 66.6042C39.3749 60.1529 46.1133 55.7275 53.8916 55.7275C64.8821 55.7275 73.7925 64.5675 73.7925 75.4658V83.6665H79.7835V75.4658C79.7835 61.2849 68.1916 49.7854 53.8916 49.7854C47.4621 49.7854 41.5796 52.1091 37.0513 55.9604C41.4984 47.6242 50.3275 41.9421 60.5 41.9421C75.1413 41.9421 87.009 53.7125 87.009 68.2346V83.6665H93V68.2346C93 50.43 78.451 36 60.5 36Z"
			})
		})]
	});
};
//#endregion
//#region src/components/icons/providers/notebooklm/light.tsx
const NotebooklmLight = (props) => {
	const iconId = useId();
	return /* @__PURE__ */ jsxs("svg", {
		xmlns: "http://www.w3.org/2000/svg",
		width: "1em",
		height: "1em",
		fill: "none",
		viewBox: "0 0 120 120",
		...props,
		children: [/* @__PURE__ */ jsx("mask", {
			id: `${iconId}-notebooklmlight__a`,
			width: 65,
			height: 48,
			x: 28,
			y: 36,
			maskUnits: "userSpaceOnUse",
			style: { maskType: "luminance" },
			children: /* @__PURE__ */ jsx("path", {
				fill: "#fff",
				d: "M93 36H28V83.6666H93V36Z"
			})
		}), /* @__PURE__ */ jsx("g", {
			mask: `url(#${iconId}-notebooklmlight__a)`,
			children: /* @__PURE__ */ jsx("path", {
				fill: "#000",
				d: "M60.5 36C42.5491 36 28 50.43 28 68.2346V83.6665H33.9909V82.1286C33.9909 74.9078 39.8896 69.0525 47.1696 69.0525C54.4496 69.0525 60.3484 74.9078 60.3484 82.1286V83.6665H66.3391V82.1286C66.3391 71.6254 57.7538 63.1158 47.1696 63.1158C43.0475 63.1158 39.2287 64.4051 36.1034 66.6042C39.3749 60.1529 46.1133 55.7275 53.8916 55.7275C64.8821 55.7275 73.7925 64.5675 73.7925 75.4658V83.6665H79.7835V75.4658C79.7835 61.2849 68.1916 49.7854 53.8916 49.7854C47.4621 49.7854 41.5796 52.1091 37.0513 55.9604C41.4984 47.6242 50.3275 41.9421 60.5 41.9421C75.1413 41.9421 87.009 53.7125 87.009 68.2346V83.6665H93V68.2346C93 50.43 78.451 36 60.5 36Z"
			})
		})]
	});
};
//#endregion
//#region src/components/icons/providers/notebooklm/avatar.tsx
function NotebooklmAvatar({ size = 32, shape = "circle", className }) {
	return /* @__PURE__ */ jsx(Avatar, {
		className: cn("overflow-hidden", shape === "circle" ? "rounded-full" : "rounded-[20%]", className),
		style: {
			width: size,
			height: size
		},
		children: /* @__PURE__ */ jsxs(AvatarFallback, {
			className: "text-foreground bg-background",
			children: [/* @__PURE__ */ jsx(NotebooklmLight, {
				className: "dark:hidden",
				style: {
					width: size,
					height: size
				}
			}), /* @__PURE__ */ jsx(NotebooklmDark, {
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
//#region src/components/icons/providers/notebooklm/index.tsx
var notebooklm_exports = /* @__PURE__ */ __exportAll({
	NotebooklmIcon: () => NotebooklmIcon,
	default: () => NotebooklmIcon
});
const Notebooklm = ({ variant, className, ...props }) => {
	if (variant === "light") return /* @__PURE__ */ jsx(NotebooklmLight, {
		...props,
		className
	});
	if (variant === "dark") return /* @__PURE__ */ jsx(NotebooklmDark, {
		...props,
		className
	});
	return /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsx(NotebooklmLight, {
		className: cn("dark:hidden", className),
		...props
	}), /* @__PURE__ */ jsx(NotebooklmDark, {
		className: cn("hidden dark:block", className),
		...props
	})] });
};
const NotebooklmIcon = /*#__PURE__*/ Object.assign(Notebooklm, {
	Avatar: NotebooklmAvatar,
	colorPrimary: "#000000"
});
//#endregion
export { notebooklm_exports as n, NotebooklmIcon as t };
