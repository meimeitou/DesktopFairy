const require_avatar = require("./avatar-DqAhynaP.cjs");
let react = require("react");
let react_jsx_runtime = require("react/jsx-runtime");
//#region src/components/icons/models/stepfun/light.tsx
const StepfunLight = (props) => {
	const iconId = (0, react.useId)();
	return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
		xmlns: "http://www.w3.org/2000/svg",
		width: "1em",
		height: "1em",
		fill: "none",
		viewBox: "0 0 24 24",
		...props,
		children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
			fill: `url(#${iconId}-stepfunlight__a)`,
			fillRule: "evenodd",
			d: "M18.6747 4H19.3627V4.6304H20V5.28868H19.3627V6.57055H18.6747V5.28936H17.4227V4.62972H18.6747V4ZM5.73333 12.4128V5.27168H6.37933V12.4135H5.73267L5.73333 12.4128ZM12.682 12.8616H19.982V13.4859H15.8433V20H12.682V12.8609V12.8616ZM7.75267 6.26658V14.6692H4V17.7361H10.924V9.44033H17.906L17.904 6.2659L7.75267 6.26658Z",
			clipRule: "evenodd"
		}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("defs", { children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("linearGradient", {
			id: `${iconId}-stepfunlight__a`,
			x1: 5.097,
			x2: 16.491,
			y1: 5.303,
			y2: 18.8,
			gradientUnits: "userSpaceOnUse",
			children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("stop", { stopColor: "#01A9FF" }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("stop", {
				offset: 1,
				stopColor: "#0160FF"
			})]
		}) })]
	});
};
//#endregion
//#region src/components/icons/models/stepfun/avatar.tsx
function StepfunAvatar({ size = 32, shape = "circle", className }) {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(require_avatar.Avatar, {
		className: require_avatar.cn("overflow-hidden", shape === "circle" ? "rounded-full" : "rounded-[20%]", className),
		style: {
			width: size,
			height: size
		},
		children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(require_avatar.AvatarFallback, {
			className: "text-foreground bg-background",
			children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(StepfunLight, { style: {
				width: size,
				height: size
			} })
		})
	});
}
//#endregion
//#region src/components/icons/models/stepfun/index.tsx
const Stepfun = ({ variant, className, ...props }) => {
	if (variant === "light") return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(StepfunLight, {
		...props,
		className
	});
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(StepfunLight, {
		...props,
		className
	});
};
const StepfunIcon = /*#__PURE__*/ Object.assign(Stepfun, {
	Avatar: StepfunAvatar,
	colorPrimary: "#000000"
});
//#endregion
exports.StepfunIcon = StepfunIcon;
