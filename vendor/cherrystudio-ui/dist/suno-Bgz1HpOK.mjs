import { n as __exportAll } from "./rolldown-runtime-B000p9w_.mjs";
import { r as AvatarFallback, s as cn, t as Avatar } from "./avatar-D3NkEc4-.mjs";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
//#region src/components/icons/providers/suno/dark.tsx
const SunoDark = (props) => /* @__PURE__ */ jsx("svg", {
	xmlns: "http://www.w3.org/2000/svg",
	width: "1em",
	height: "1em",
	fill: "none",
	viewBox: "0 0 120 120",
	...props,
	children: /* @__PURE__ */ jsx("path", {
		fill: "#fff",
		d: "M78.3175 29.4856C85.8 33.739 89.4633 41.138 91.718 49.244C92.6756 53.1356 92.581 56.398 92.581 60.5234C84.5028 60.5234 76.4135 60.5234 68.0847 60.5234C68.0847 62.9118 68.0847 65.3001 68.0847 67.7609C66.9601 76.4125 63.2467 84.5854 56.5158 90.2195C53.142 92.7471 49.9297 93.365 45.8154 92.8139C39.658 91.127 36.2229 87.6028 33.0106 82.2359C29.4531 75.3046 28 68.2731 28 60.5234C36.0893 60.5234 44.1731 60.5234 52.4962 60.5234C52.4962 57.9513 52.4962 55.3792 52.4962 52.7291C53.6876 44.3782 57.2563 36.6507 63.6309 31.0166C68.2573 27.704 73.1343 27.0081 78.3175 29.4856Z"
	})
});
//#endregion
//#region src/components/icons/providers/suno/light.tsx
const SunoLight = (props) => /* @__PURE__ */ jsx("svg", {
	xmlns: "http://www.w3.org/2000/svg",
	width: "1em",
	height: "1em",
	fill: "none",
	viewBox: "0 0 120 120",
	...props,
	children: /* @__PURE__ */ jsx("path", {
		fill: "#020202",
		d: "M78.3175 29.4856C85.8 33.739 89.4633 41.138 91.718 49.244C92.6756 53.1356 92.581 56.398 92.581 60.5234C84.5028 60.5234 76.4135 60.5234 68.0847 60.5234C68.0847 62.9118 68.0847 65.3001 68.0847 67.7609C66.9601 76.4125 63.2467 84.5854 56.5158 90.2195C53.142 92.7471 49.9297 93.365 45.8154 92.8139C39.658 91.127 36.2229 87.6028 33.0106 82.2359C29.4531 75.3046 28 68.2731 28 60.5234C36.0893 60.5234 44.1731 60.5234 52.4962 60.5234C52.4962 57.9513 52.4962 55.3792 52.4962 52.7291C53.6876 44.3782 57.2563 36.6507 63.6309 31.0166C68.2573 27.704 73.1343 27.0081 78.3175 29.4856Z"
	})
});
//#endregion
//#region src/components/icons/providers/suno/avatar.tsx
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
//#region src/components/icons/providers/suno/index.tsx
var suno_exports = /* @__PURE__ */ __exportAll({
	SunoIcon: () => SunoIcon,
	default: () => SunoIcon
});
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
	colorPrimary: "#020202"
});
//#endregion
export { suno_exports as n, SunoIcon as t };
