const require_avatar = require("./avatar-DqAhynaP.cjs");
let react = require("react");
let react_jsx_runtime = require("react/jsx-runtime");
//#region src/components/icons/models/baichuan/light.tsx
const BaichuanLight = (props) => {
	const iconId = (0, react.useId)();
	return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
		xmlns: "http://www.w3.org/2000/svg",
		width: "1em",
		height: "1em",
		fill: "none",
		viewBox: "0 0 24 24",
		...props,
		children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
			fill: `url(#${iconId}-baichuanlight__a)`,
			d: "M9.33309 4H7.00582L5.55127 7.24975V15.85L4 19H7.78182L9.25673 15.85L9.33309 4ZM14.6669 4H10.8851V19H14.6669V4ZM16.2182 8.29975H20V19H16.2182V8.29975ZM20 4H16.2182V7.09975H20V4Z"
		}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("defs", { children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("linearGradient", {
			id: `${iconId}-baichuanlight__a`,
			x1: 6.842,
			x2: 19.148,
			y1: 5.302,
			y2: 18.493,
			gradientUnits: "userSpaceOnUse",
			children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("stop", { stopColor: "#FEC13E" }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("stop", {
				offset: 1,
				stopColor: "#FF6933"
			})]
		}) })]
	});
};
//#endregion
//#region src/components/icons/models/baichuan/avatar.tsx
function BaichuanAvatar({ size = 32, shape = "circle", className }) {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(require_avatar.Avatar, {
		className: require_avatar.cn("overflow-hidden", shape === "circle" ? "rounded-full" : "rounded-[20%]", className),
		style: {
			width: size,
			height: size
		},
		children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(require_avatar.AvatarFallback, {
			className: "text-foreground bg-background",
			children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(BaichuanLight, { style: {
				width: size,
				height: size
			} })
		})
	});
}
//#endregion
//#region src/components/icons/models/baichuan/index.tsx
const Baichuan = ({ variant, className, ...props }) => {
	if (variant === "light") return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(BaichuanLight, {
		...props,
		className
	});
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(BaichuanLight, {
		...props,
		className
	});
};
const BaichuanIcon = /*#__PURE__*/ Object.assign(Baichuan, {
	Avatar: BaichuanAvatar,
	colorPrimary: "#000000"
});
//#endregion
exports.BaichuanIcon = BaichuanIcon;
