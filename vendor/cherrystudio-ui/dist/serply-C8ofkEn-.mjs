import { n as __exportAll } from "./rolldown-runtime-B000p9w_.mjs";
import { r as AvatarFallback, s as cn, t as Avatar } from "./avatar-D3NkEc4-.mjs";
import { jsx } from "react/jsx-runtime";
//#region src/components/icons/providers/serply/light.tsx
const SerplyLight = (props) => /* @__PURE__ */ jsx("svg", {
	xmlns: "http://www.w3.org/2000/svg",
	width: "1em",
	height: "1em",
	fill: "none",
	viewBox: "0 0 120 120",
	...props,
	children: /* @__PURE__ */ jsx("path", {
		fill: "#F03E2F",
		d: "M39.806 59.202 4.199 85.626C-1.927 77.37-.2 65.703 8.055 59.576l35.606-26.423c6.127 8.255 4.4 19.922-3.855 26.049ZM7.523 26.424 43.13 0c6.127 8.255 4.4 19.922-3.855 26.049L3.667 52.473C-2.459 44.218-.732 32.55 7.523 26.424Z",
		transform: "translate(40.626 25)scale(.8175)"
	})
});
//#endregion
//#region src/components/icons/providers/serply/avatar.tsx
function SerplyAvatar({ size = 32, shape = "circle", className }) {
	return /* @__PURE__ */ jsx(Avatar, {
		className: cn("overflow-hidden", shape === "circle" ? "rounded-full" : "rounded-[20%]", className),
		style: {
			width: size,
			height: size
		},
		children: /* @__PURE__ */ jsx(AvatarFallback, {
			className: "text-foreground bg-background",
			children: /* @__PURE__ */ jsx(SerplyLight, { style: {
				width: size,
				height: size
			} })
		})
	});
}
//#endregion
//#region src/components/icons/providers/serply/index.tsx
var serply_exports = /* @__PURE__ */ __exportAll({
	SerplyIcon: () => SerplyIcon,
	default: () => SerplyIcon
});
const Serply = ({ variant, className, ...props }) => {
	if (variant === "light") return /* @__PURE__ */ jsx(SerplyLight, {
		...props,
		className
	});
	return /* @__PURE__ */ jsx(SerplyLight, {
		...props,
		className
	});
};
const SerplyIcon = /*#__PURE__*/ Object.assign(Serply, {
	Avatar: SerplyAvatar,
	colorPrimary: "#F03E2F"
});
//#endregion
export { serply_exports as n, SerplyIcon as t };
