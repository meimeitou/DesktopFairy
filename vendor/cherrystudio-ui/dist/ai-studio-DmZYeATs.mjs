import { n as __exportAll } from "./rolldown-runtime-B000p9w_.mjs";
import { r as AvatarFallback, s as cn, t as Avatar } from "./avatar-D3NkEc4-.mjs";
import { useId } from "react";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
//#region src/components/icons/providers/ai-studio/dark.tsx
const AiStudioDark = (props) => {
	const iconId = useId();
	return /* @__PURE__ */ jsxs("svg", {
		xmlns: "http://www.w3.org/2000/svg",
		width: "1em",
		height: "1em",
		fill: "none",
		viewBox: "0 0 120 120",
		...props,
		children: [
			/* @__PURE__ */ jsxs("mask", {
				id: `${iconId}-aistudiodark__a`,
				width: 80,
				height: 80,
				x: 20,
				y: 20,
				maskUnits: "userSpaceOnUse",
				style: { maskType: "luminance" },
				children: [/* @__PURE__ */ jsx("path", {
					fill: "#fff",
					d: "M100 20H20V100H100V20Z"
				}), /* @__PURE__ */ jsx("path", {
					fill: "#000",
					d: "M71.5625 64.5313C81.0549 64.5313 88.75 56.8362 88.75 47.3438C88.75 37.8514 81.0549 30.1562 71.5625 30.1562C62.0701 30.1562 54.375 37.8514 54.375 47.3438C54.375 56.8362 62.0701 64.5313 71.5625 64.5313Z"
				})]
			}),
			/* @__PURE__ */ jsx("g", {
				mask: `url(#${iconId}-aistudiodark__a)`,
				children: /* @__PURE__ */ jsx("path", {
					stroke: "#fff",
					strokeLinejoin: "round",
					strokeWidth: 6.016,
					d: "M75.1592 38.9091H42.6592C40.5882 38.9091 38.9092 40.588 38.9092 42.6591V75.1591C38.9092 77.2301 40.5882 78.9091 42.6592 78.9091H75.1592C77.2303 78.9091 78.9092 77.2301 78.9092 75.1591V42.6591C78.9092 40.588 77.2303 38.9091 75.1592 38.9091Z"
				})
			}),
			/* @__PURE__ */ jsx("path", {
				fill: "#fff",
				d: "M71.5625 30.625C71.5625 30.625 69.6875 38.4375 67.1875 40.9375C64.6875 43.4375 56.875 45.3125 56.875 45.3125C56.875 45.3125 64.6875 47.1875 67.1875 49.6875C69.6875 52.1875 71.5625 60 71.5625 60C71.5625 60 73.4375 52.1875 75.9375 49.6875C78.4375 47.1875 86.2501 45.3125 86.2501 45.3125C86.2501 45.3125 78.4375 43.4375 75.9375 40.9375C73.4375 38.4375 71.5625 30.625 71.5625 30.625Z"
			})
		]
	});
};
//#endregion
//#region src/components/icons/providers/ai-studio/light.tsx
const AiStudioLight = (props) => {
	const iconId = useId();
	return /* @__PURE__ */ jsxs("svg", {
		xmlns: "http://www.w3.org/2000/svg",
		width: "1em",
		height: "1em",
		fill: "none",
		viewBox: "0 0 120 120",
		...props,
		children: [
			/* @__PURE__ */ jsxs("mask", {
				id: `${iconId}-aistudiolight__a`,
				width: 80,
				height: 80,
				x: 20,
				y: 20,
				maskUnits: "userSpaceOnUse",
				style: { maskType: "luminance" },
				children: [/* @__PURE__ */ jsx("path", {
					fill: "#fff",
					d: "M100 20H20V100H100V20Z"
				}), /* @__PURE__ */ jsx("path", {
					fill: "#000",
					d: "M71.5625 64.5312C81.0549 64.5312 88.75 56.8361 88.75 47.3438C88.75 37.8513 81.0549 30.1562 71.5625 30.1562C62.0701 30.1562 54.375 37.8513 54.375 47.3438C54.375 56.8361 62.0701 64.5312 71.5625 64.5312Z"
				})]
			}),
			/* @__PURE__ */ jsx("g", {
				mask: `url(#${iconId}-aistudiolight__a)`,
				children: /* @__PURE__ */ jsx("path", {
					stroke: "#1A1A1A",
					strokeLinejoin: "round",
					strokeWidth: 6.016,
					d: "M75.1592 38.9091H42.6592C40.5882 38.9091 38.9092 40.5881 38.9092 42.6592V75.1592C38.9092 77.2302 40.5882 78.9091 42.6592 78.9091H75.1592C77.2303 78.9091 78.9092 77.2302 78.9092 75.1592V42.6592C78.9092 40.5881 77.2303 38.9091 75.1592 38.9091Z"
				})
			}),
			/* @__PURE__ */ jsx("path", {
				fill: "#1A1A1A",
				d: "M71.5625 30.625C71.5625 30.625 69.6875 38.4375 67.1875 40.9375C64.6875 43.4375 56.875 45.3125 56.875 45.3125C56.875 45.3125 64.6875 47.1875 67.1875 49.6875C69.6875 52.1875 71.5625 60 71.5625 60C71.5625 60 73.4375 52.1875 75.9375 49.6875C78.4375 47.1875 86.2501 45.3125 86.2501 45.3125C86.2501 45.3125 78.4375 43.4375 75.9375 40.9375C73.4375 38.4375 71.5625 30.625 71.5625 30.625Z"
			})
		]
	});
};
//#endregion
//#region src/components/icons/providers/ai-studio/avatar.tsx
function AiStudioAvatar({ size = 32, shape = "circle", className }) {
	return /* @__PURE__ */ jsx(Avatar, {
		className: cn("overflow-hidden", shape === "circle" ? "rounded-full" : "rounded-[20%]", className),
		style: {
			width: size,
			height: size
		},
		children: /* @__PURE__ */ jsxs(AvatarFallback, {
			className: "text-foreground bg-background",
			children: [/* @__PURE__ */ jsx(AiStudioLight, {
				className: "dark:hidden",
				style: {
					width: size,
					height: size
				}
			}), /* @__PURE__ */ jsx(AiStudioDark, {
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
//#region src/components/icons/providers/ai-studio/index.tsx
var ai_studio_exports = /* @__PURE__ */ __exportAll({
	AiStudioIcon: () => AiStudioIcon,
	default: () => AiStudioIcon
});
const AiStudio = ({ variant, className, ...props }) => {
	if (variant === "light") return /* @__PURE__ */ jsx(AiStudioLight, {
		...props,
		className
	});
	if (variant === "dark") return /* @__PURE__ */ jsx(AiStudioDark, {
		...props,
		className
	});
	return /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsx(AiStudioLight, {
		className: cn("dark:hidden", className),
		...props
	}), /* @__PURE__ */ jsx(AiStudioDark, {
		className: cn("hidden dark:block", className),
		...props
	})] });
};
const AiStudioIcon = /*#__PURE__*/ Object.assign(AiStudio, {
	Avatar: AiStudioAvatar,
	colorPrimary: "#1A1A1A"
});
//#endregion
export { ai_studio_exports as n, AiStudioIcon as t };
