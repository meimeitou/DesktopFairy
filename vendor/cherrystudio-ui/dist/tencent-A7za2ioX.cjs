const require_avatar = require("./avatar-DqAhynaP.cjs");
let react_jsx_runtime = require("react/jsx-runtime");
//#region src/components/icons/models/tencent/light.tsx
const TencentLight = (props) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("svg", {
	xmlns: "http://www.w3.org/2000/svg",
	width: "1em",
	height: "1em",
	fill: "none",
	viewBox: "0 0 24 24",
	...props,
	children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
		fill: "#0052D9",
		fillRule: "evenodd",
		d: "M10.2442 4L20 10.4L12.6351 10.4109L10.7638 20H7.12278L8.99478 10.4H5.56104L4 7.2H9.61878L10.2442 4Z",
		clipRule: "evenodd"
	})
});
//#endregion
//#region src/components/icons/models/tencent/avatar.tsx
function TencentAvatar({ size = 32, shape = "circle", className }) {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(require_avatar.Avatar, {
		className: require_avatar.cn("overflow-hidden", shape === "circle" ? "rounded-full" : "rounded-[20%]", className),
		style: {
			width: size,
			height: size
		},
		children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(require_avatar.AvatarFallback, {
			className: "text-foreground bg-background",
			children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(TencentLight, { style: {
				width: size,
				height: size
			} })
		})
	});
}
//#endregion
//#region src/components/icons/models/tencent/index.tsx
const Tencent = ({ variant, className, ...props }) => {
	if (variant === "light") return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(TencentLight, {
		...props,
		className
	});
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(TencentLight, {
		...props,
		className
	});
};
const TencentIcon = /*#__PURE__*/ Object.assign(Tencent, {
	Avatar: TencentAvatar,
	colorPrimary: "#0052D9"
});
//#endregion
exports.TencentIcon = TencentIcon;
