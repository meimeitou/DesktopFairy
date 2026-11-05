import { n as __exportAll } from "./rolldown-runtime-B000p9w_.mjs";
import { r as AvatarFallback, s as cn, t as Avatar } from "./avatar-D3NkEc4-.mjs";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
//#region src/components/icons/providers/ai21/dark.tsx
const Ai21Dark = (props) => /* @__PURE__ */ jsx("svg", {
	xmlns: "http://www.w3.org/2000/svg",
	width: "1em",
	height: "1em",
	fill: "none",
	viewBox: "0 0 120 120",
	...props,
	children: /* @__PURE__ */ jsx("path", {
		fill: "#fff",
		d: "M56.9752 90C63.2902 90 69.0141 87.9723 73.3935 84.1698L73.8982 83.7471V89.5772H92V78.4229H86.6113V41.5771H92V30.4229H73.8982V36.0833L73.3935 35.6602C68.9277 32.0278 63.2867 30 56.9752 30C40.4701 30 27 43.435 27 60.0001C27 76.5651 40.4701 90 56.9752 90ZM56.9752 78.0831C47.0412 78.0831 38.9561 69.8856 38.9561 59.9134C38.9561 49.9409 47.0375 41.8301 56.9752 41.8301C61.6899 41.8301 66.2352 43.7747 69.6052 47.1544C72.9719 50.6206 74.8246 55.0988 74.8246 59.9134C74.8246 69.8856 66.8263 78.0831 56.9752 78.0831Z"
	})
});
//#endregion
//#region src/components/icons/providers/ai21/light.tsx
const Ai21Light = (props) => /* @__PURE__ */ jsx("svg", {
	xmlns: "http://www.w3.org/2000/svg",
	width: "1em",
	height: "1em",
	fill: "none",
	viewBox: "0 0 120 120",
	...props,
	children: /* @__PURE__ */ jsx("path", {
		fill: "#000",
		d: "M56.9752 90C63.2902 90 69.0141 87.9723 73.3935 84.1698L73.8982 83.7471V89.5772H92V78.4229H86.6113V41.5771H92V30.4229H73.8982V36.0833L73.3935 35.6602C68.9277 32.0278 63.2867 30 56.9752 30C40.4701 30 27 43.435 27 60.0001C27 76.5651 40.4701 90 56.9752 90ZM56.9752 78.0831C47.0412 78.0831 38.9561 69.8856 38.9561 59.9134C38.9561 49.9409 47.0375 41.8301 56.9752 41.8301C61.6899 41.8301 66.2352 43.7747 69.6052 47.1544C72.9719 50.6206 74.8246 55.0988 74.8246 59.9134C74.8246 69.8856 66.8263 78.0831 56.9752 78.0831Z"
	})
});
//#endregion
//#region src/components/icons/providers/ai21/avatar.tsx
function Ai21Avatar({ size = 32, shape = "circle", className }) {
	return /* @__PURE__ */ jsx(Avatar, {
		className: cn("overflow-hidden", shape === "circle" ? "rounded-full" : "rounded-[20%]", className),
		style: {
			width: size,
			height: size
		},
		children: /* @__PURE__ */ jsxs(AvatarFallback, {
			className: "text-foreground bg-background",
			children: [/* @__PURE__ */ jsx(Ai21Light, {
				className: "dark:hidden",
				style: {
					width: size,
					height: size
				}
			}), /* @__PURE__ */ jsx(Ai21Dark, {
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
//#region src/components/icons/providers/ai21/index.tsx
var ai21_exports = /* @__PURE__ */ __exportAll({
	Ai21Icon: () => Ai21Icon,
	default: () => Ai21Icon
});
const Ai21 = ({ variant, className, ...props }) => {
	if (variant === "light") return /* @__PURE__ */ jsx(Ai21Light, {
		...props,
		className
	});
	if (variant === "dark") return /* @__PURE__ */ jsx(Ai21Dark, {
		...props,
		className
	});
	return /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsx(Ai21Light, {
		className: cn("dark:hidden", className),
		...props
	}), /* @__PURE__ */ jsx(Ai21Dark, {
		className: cn("hidden dark:block", className),
		...props
	})] });
};
const Ai21Icon = /*#__PURE__*/ Object.assign(Ai21, {
	Avatar: Ai21Avatar,
	colorPrimary: "#000000"
});
//#endregion
export { ai21_exports as n, Ai21Icon as t };
