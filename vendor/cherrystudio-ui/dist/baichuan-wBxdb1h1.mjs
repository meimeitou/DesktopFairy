import { r as AvatarFallback, s as cn, t as Avatar } from "./avatar-D3NkEc4-.mjs";
import { useId } from "react";
import { jsx, jsxs } from "react/jsx-runtime";
//#region src/components/icons/models/baichuan/light.tsx
const BaichuanLight = (props) => {
	const iconId = useId();
	return /* @__PURE__ */ jsxs("svg", {
		xmlns: "http://www.w3.org/2000/svg",
		width: "1em",
		height: "1em",
		fill: "none",
		viewBox: "0 0 24 24",
		...props,
		children: [/* @__PURE__ */ jsx("path", {
			fill: `url(#${iconId}-baichuanlight__a)`,
			d: "M9.33309 4H7.00582L5.55127 7.24975V15.85L4 19H7.78182L9.25673 15.85L9.33309 4ZM14.6669 4H10.8851V19H14.6669V4ZM16.2182 8.29975H20V19H16.2182V8.29975ZM20 4H16.2182V7.09975H20V4Z"
		}), /* @__PURE__ */ jsx("defs", { children: /* @__PURE__ */ jsxs("linearGradient", {
			id: `${iconId}-baichuanlight__a`,
			x1: 6.842,
			x2: 19.148,
			y1: 5.302,
			y2: 18.493,
			gradientUnits: "userSpaceOnUse",
			children: [/* @__PURE__ */ jsx("stop", { stopColor: "#FEC13E" }), /* @__PURE__ */ jsx("stop", {
				offset: 1,
				stopColor: "#FF6933"
			})]
		}) })]
	});
};
//#endregion
//#region src/components/icons/models/baichuan/avatar.tsx
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
//#region src/components/icons/models/baichuan/index.tsx
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
export { BaichuanIcon, BaichuanIcon as default };
