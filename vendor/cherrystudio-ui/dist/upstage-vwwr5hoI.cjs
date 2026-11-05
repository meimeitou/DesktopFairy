const require_avatar = require("./avatar-DqAhynaP.cjs");
let react = require("react");
let react_jsx_runtime = require("react/jsx-runtime");
//#region src/components/icons/models/upstage/light.tsx
const UpstageLight = (props) => {
	const iconId = (0, react.useId)();
	return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
		xmlns: "http://www.w3.org/2000/svg",
		width: "1em",
		height: "1em",
		fill: "none",
		viewBox: "0 0 24 24",
		...props,
		children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
			fill: `url(#${iconId}-upstagelight__a)`,
			d: "M17.2606 4L17.0102 4.86467H18.7516L19 4H17.2606ZM14.8632 5.51333L14.6108 6.37867H18.3166L18.565 5.51333H14.8632ZM12.6512 7.02667L12.3988 7.892H17.8809L18.1293 7.02667H12.6512ZM5.9063 8.54L5.65321 9.40533H17.4452L17.6936 8.54067H5.90496L5.9063 8.54ZM6.60046 10.054L6.34804 10.9187H17.0102L17.2586 10.054H6.59912H6.60046ZM6.73741 20L6.98983 19.1353H5.24571L5 20H6.73741ZM9.13676 18.4867L9.38918 17.622H5.6814L5.43637 18.4867H9.13676ZM11.3488 16.9727L11.6012 16.108H6.11643L5.87072 16.9727H11.3488ZM18.0944 15.4593L18.3468 14.5947H6.55212L6.30642 15.4593H18.0944ZM17.3975 13.946L17.6499 13.0813H6.98782L6.74211 13.946H17.3975ZM16.6047 12.4327L16.8571 11.568H6.85288L6.60717 12.4327H16.6054H16.6047Z"
		}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("defs", { children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("linearGradient", {
			id: `${iconId}-upstagelight__a`,
			x1: 12,
			x2: 12,
			y1: 4,
			y2: 20,
			gradientUnits: "userSpaceOnUse",
			children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("stop", { stopColor: "#AEBCFE" }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("stop", {
				offset: 1,
				stopColor: "#805DFA"
			})]
		}) })]
	});
};
//#endregion
//#region src/components/icons/models/upstage/avatar.tsx
function UpstageAvatar({ size = 32, shape = "circle", className }) {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(require_avatar.Avatar, {
		className: require_avatar.cn("overflow-hidden", shape === "circle" ? "rounded-full" : "rounded-[20%]", className),
		style: {
			width: size,
			height: size
		},
		children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(require_avatar.AvatarFallback, {
			className: "text-foreground bg-background",
			children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(UpstageLight, { style: {
				width: size,
				height: size
			} })
		})
	});
}
//#endregion
//#region src/components/icons/models/upstage/index.tsx
const Upstage = ({ variant, className, ...props }) => {
	if (variant === "light") return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(UpstageLight, {
		...props,
		className
	});
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(UpstageLight, {
		...props,
		className
	});
};
const UpstageIcon = /*#__PURE__*/ Object.assign(Upstage, {
	Avatar: UpstageAvatar,
	colorPrimary: "#000000"
});
//#endregion
exports.UpstageIcon = UpstageIcon;
