const require_avatar = require("./avatar-DqAhynaP.cjs");
let react_jsx_runtime = require("react/jsx-runtime");
//#region src/components/icons/models/tii/light.tsx
const TiiLight = (props) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
	xmlns: "http://www.w3.org/2000/svg",
	width: "1em",
	height: "1em",
	fill: "none",
	viewBox: "0 0 24 24",
	...props,
	children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
		fill: "#6400FF",
		d: "M10.232 9.04199H6V10.5133H7.18V14.9587H9.05133V10.5133H10.2313L10.232 9.04199ZM12.708 9.04199H10.8367V14.9587H12.708V9.04199ZM15.7887 9.04199H13.9173V14.9587H15.7887V9.04199Z"
	}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
		fill: "#6400FF",
		d: "M10.8333 20V19.2967C12.8399 19.2967 14.5753 18.5773 15.9913 17.158C17.4066 15.738 18.1306 14.0067 18.1306 12C18.1306 9.994 17.4106 8.262 15.9913 6.84267C14.5726 5.42267 12.8366 4.70267 10.8339 4.70267V4C13.0299 4 14.9326 4.78933 16.4886 6.34533C18.0446 7.90133 18.8333 9.804 18.8333 12C18.8333 14.1967 18.0446 16.1033 16.4879 17.6553C14.9313 19.2073 13.0333 20 10.8339 20H10.8333Z"
	})]
});
//#endregion
//#region src/components/icons/models/tii/avatar.tsx
function TiiAvatar({ size = 32, shape = "circle", className }) {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(require_avatar.Avatar, {
		className: require_avatar.cn("overflow-hidden", shape === "circle" ? "rounded-full" : "rounded-[20%]", className),
		style: {
			width: size,
			height: size
		},
		children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(require_avatar.AvatarFallback, {
			className: "text-foreground bg-background",
			children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(TiiLight, { style: {
				width: size,
				height: size
			} })
		})
	});
}
//#endregion
//#region src/components/icons/models/tii/index.tsx
const Tii = ({ variant, className, ...props }) => {
	if (variant === "light") return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(TiiLight, {
		...props,
		className
	});
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(TiiLight, {
		...props,
		className
	});
};
const TiiIcon = /*#__PURE__*/ Object.assign(Tii, {
	Avatar: TiiAvatar,
	colorPrimary: "#6400FF"
});
//#endregion
exports.TiiIcon = TiiIcon;
