import { n as __exportAll } from "./rolldown-runtime-B000p9w_.mjs";
import { r as AvatarFallback, s as cn, t as Avatar } from "./avatar-D3NkEc4-.mjs";
import { useId } from "react";
import { jsx, jsxs } from "react/jsx-runtime";
//#region src/components/icons/providers/baichuan/light.tsx
const BaichuanLight = (props) => {
	const iconId = useId();
	return /* @__PURE__ */ jsxs("svg", {
		xmlns: "http://www.w3.org/2000/svg",
		width: "1em",
		height: "1em",
		fill: "none",
		viewBox: "0 0 120 120",
		...props,
		children: [/* @__PURE__ */ jsx("path", {
			fill: `url(#${iconId}-baichuanlight__a)`,
			d: "M48.6657 30H39.2111L33.302 42.7824V76.61L27 89H42.3636L48.3554 76.61L48.6657 30ZM70.3343 30H54.9707V89H70.3343V30ZM76.6364 46.9124H92V89H76.6364V46.9124ZM92 30H76.6364V42.1923H92V30Z"
		}), /* @__PURE__ */ jsx("defs", { children: /* @__PURE__ */ jsxs("linearGradient", {
			id: `${iconId}-baichuanlight__a`,
			x1: 38.547,
			x2: 86.816,
			y1: 35.12,
			y2: 88.562,
			gradientUnits: "userSpaceOnUse",
			children: [/* @__PURE__ */ jsx("stop", { stopColor: "#FEC13E" }), /* @__PURE__ */ jsx("stop", {
				offset: 1,
				stopColor: "#FF6933"
			})]
		}) })]
	});
};
//#endregion
//#region src/components/icons/providers/baichuan/avatar.tsx
function BaichuanAvatar({ size = 32, shape = "circle", className }) {
	return /* @__PURE__ */ jsx(Avatar, {
		className: cn("overflow-hidden", shape === "circle" ? "rounded-full" : "rounded-[20%]", className),
		style: {
			width: size,
			height: size
		},
		children: /* @__PURE__ */ jsx(AvatarFallback, {
			className: "text-foreground bg-background",
			children: /* @__PURE__ */ jsx(BaichuanLight, { style: {
				width: size,
				height: size
			} })
		})
	});
}
//#endregion
//#region src/components/icons/providers/baichuan/index.tsx
var baichuan_exports = /* @__PURE__ */ __exportAll({
	BaichuanIcon: () => BaichuanIcon,
	default: () => BaichuanIcon
});
const Baichuan = ({ variant, className, ...props }) => {
	if (variant === "light") return /* @__PURE__ */ jsx(BaichuanLight, {
		...props,
		className
	});
	return /* @__PURE__ */ jsx(BaichuanLight, {
		...props,
		className
	});
};
const BaichuanIcon = /*#__PURE__*/ Object.assign(Baichuan, {
	Avatar: BaichuanAvatar,
	colorPrimary: "#000000"
});
//#endregion
export { baichuan_exports as n, BaichuanIcon as t };
