const require_avatar = require("./avatar-DqAhynaP.cjs");
let react_jsx_runtime = require("react/jsx-runtime");
//#region src/components/icons/models/dbrx/light.tsx
const DbrxLight = (props) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("svg", {
	xmlns: "http://www.w3.org/2000/svg",
	width: "1em",
	height: "1em",
	fill: "none",
	viewBox: "0 0 24 24",
	...props,
	children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
		fill: "#EE3D2C",
		d: "M18.1961 10.596L11.5075 14.326L4.34432 10.3407L4 10.5247V13.418L11.5068 17.5887L18.1961 13.8727V15.404L11.5075 19.1347L4.34432 15.1487L4 15.3333V15.83L11.5068 20L19 15.83V12.9367L18.6557 12.752L11.5075 16.7233L4.80386 13.0073V11.4753L11.5075 15.1913L19 11.0213V8.17L18.627 7.95733L11.5075 11.9147L5.14818 8.39733L11.5075 4.86533L16.7323 7.77333L17.1911 7.518V7.16333L11.5075 4L4 8.17V8.624L11.5068 12.794L18.1961 9.064V10.596Z"
	})
});
//#endregion
//#region src/components/icons/models/dbrx/avatar.tsx
function DbrxAvatar({ size = 32, shape = "circle", className }) {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(require_avatar.Avatar, {
		className: require_avatar.cn("overflow-hidden", shape === "circle" ? "rounded-full" : "rounded-[20%]", className),
		style: {
			width: size,
			height: size
		},
		children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(require_avatar.AvatarFallback, {
			className: "text-foreground bg-background",
			children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(DbrxLight, { style: {
				width: size,
				height: size
			} })
		})
	});
}
//#endregion
//#region src/components/icons/models/dbrx/index.tsx
const Dbrx = ({ variant, className, ...props }) => {
	if (variant === "light") return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(DbrxLight, {
		...props,
		className
	});
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(DbrxLight, {
		...props,
		className
	});
};
const DbrxIcon = /*#__PURE__*/ Object.assign(Dbrx, {
	Avatar: DbrxAvatar,
	colorPrimary: "#EE3D2C"
});
//#endregion
exports.DbrxIcon = DbrxIcon;
