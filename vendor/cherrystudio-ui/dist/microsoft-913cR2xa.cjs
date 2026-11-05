const require_avatar = require("./avatar-DqAhynaP.cjs");
let react_jsx_runtime = require("react/jsx-runtime");
//#region src/components/icons/models/microsoft/light.tsx
const MicrosoftLight = (props) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
	xmlns: "http://www.w3.org/2000/svg",
	width: "1em",
	height: "1em",
	fill: "none",
	viewBox: "0 0 24 24",
	...props,
	children: [
		/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
			fill: "#F25022",
			d: "M11.592 4H4V11.5936H11.5936V4H11.592Z"
		}),
		/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
			fill: "#7FBA00",
			d: "M20 4H12.4064V11.5936H20V4Z"
		}),
		/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
			fill: "#00A4EF",
			d: "M11.592 12.4064H4V20H11.5936V12.4064H11.592Z"
		}),
		/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
			fill: "#FFB900",
			d: "M20 12.4064H12.4064V20H20V12.4064Z"
		})
	]
});
//#endregion
//#region src/components/icons/models/microsoft/avatar.tsx
function MicrosoftAvatar({ size = 32, shape = "circle", className }) {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(require_avatar.Avatar, {
		className: require_avatar.cn("overflow-hidden", shape === "circle" ? "rounded-full" : "rounded-[20%]", className),
		style: {
			width: size,
			height: size
		},
		children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(require_avatar.AvatarFallback, {
			className: "text-foreground bg-background",
			children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(MicrosoftLight, { style: {
				width: size,
				height: size
			} })
		})
	});
}
//#endregion
//#region src/components/icons/models/microsoft/index.tsx
const Microsoft = ({ variant, className, ...props }) => {
	if (variant === "light") return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(MicrosoftLight, {
		...props,
		className
	});
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(MicrosoftLight, {
		...props,
		className
	});
};
const MicrosoftIcon = /*#__PURE__*/ Object.assign(Microsoft, {
	Avatar: MicrosoftAvatar,
	colorPrimary: "#F25022"
});
//#endregion
exports.MicrosoftIcon = MicrosoftIcon;
