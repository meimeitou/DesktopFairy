import { n as __exportAll } from "./rolldown-runtime-B000p9w_.mjs";
import { r as AvatarFallback, s as cn, t as Avatar } from "./avatar-D3NkEc4-.mjs";
import { jsx, jsxs } from "react/jsx-runtime";
//#region src/components/icons/providers/jina/light.tsx
const JinaLight = (props) => /* @__PURE__ */ jsxs("svg", {
	xmlns: "http://www.w3.org/2000/svg",
	width: "1em",
	height: "1em",
	fill: "none",
	viewBox: "0 0 120 120",
	...props,
	children: [/* @__PURE__ */ jsx("path", {
		fill: "#EB6161",
		d: "M42.8218 90.4163C51.0077 90.4163 57.6438 83.7804 57.6438 75.5948C57.6438 67.4094 51.0077 60.7738 42.8218 60.7738C34.6359 60.7738 28 67.4094 28 75.5948C28 83.7804 34.6359 90.4163 42.8218 90.4163Z"
	}), /* @__PURE__ */ jsx("path", {
		fill: "#009191",
		d: "M93 32.3905L92.8063 60.7738C92.8063 76.9512 79.8251 90.1254 63.6468 90.416L63.3555 60.8707L63.3562 32.4874C63.3562 30.5499 64.9061 29 66.8438 29H89.5124C91.4501 29 93 30.4531 93 32.3905Z"
	})]
});
//#endregion
//#region src/components/icons/providers/jina/avatar.tsx
function JinaAvatar({ size = 32, shape = "circle", className }) {
	return /* @__PURE__ */ jsx(Avatar, {
		className: cn("overflow-hidden", shape === "circle" ? "rounded-full" : "rounded-[20%]", className),
		style: {
			width: size,
			height: size
		},
		children: /* @__PURE__ */ jsx(AvatarFallback, {
			className: "text-foreground bg-background",
			children: /* @__PURE__ */ jsx(JinaLight, { style: {
				width: size,
				height: size
			} })
		})
	});
}
//#endregion
//#region src/components/icons/providers/jina/index.tsx
var jina_exports = /* @__PURE__ */ __exportAll({
	JinaIcon: () => JinaIcon,
	default: () => JinaIcon
});
const Jina = ({ variant, className, ...props }) => {
	if (variant === "light") return /* @__PURE__ */ jsx(JinaLight, {
		...props,
		className
	});
	return /* @__PURE__ */ jsx(JinaLight, {
		...props,
		className
	});
};
const JinaIcon = /*#__PURE__*/ Object.assign(Jina, {
	Avatar: JinaAvatar,
	colorPrimary: "#EB6161"
});
//#endregion
export { jina_exports as n, JinaIcon as t };
