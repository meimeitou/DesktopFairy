const require_avatar = require("./avatar-DqAhynaP.cjs");
let react_jsx_runtime = require("react/jsx-runtime");
//#region src/components/icons/models/zai/dark.tsx
const ZaiDark = (props) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("svg", {
	xmlns: "http://www.w3.org/2000/svg",
	width: "1em",
	height: "1em",
	fill: "none",
	viewBox: "0 0 24 24",
	...props,
	children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
		fill: "#fff",
		fillRule: "evenodd",
		d: "M12.07 5L10.618 6.91945H4.43533L5.88667 5H12.0707H12.07ZM19.5027 16.0812L18.052 18H11.8907L13.34 16.0812H19.5027ZM20 5L10.176 18H4L13.824 5H20Z",
		clipRule: "evenodd"
	})
});
//#endregion
//#region src/components/icons/models/zai/light.tsx
const ZaiLight = (props) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("svg", {
	xmlns: "http://www.w3.org/2000/svg",
	width: "1em",
	height: "1em",
	fill: "none",
	viewBox: "0 0 24 24",
	...props,
	children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
		fill: "#000",
		fillRule: "evenodd",
		d: "M12.07 5L10.618 6.91945H4.43533L5.88667 5H12.0707H12.07ZM19.5027 16.0812L18.052 18H11.8907L13.34 16.0812H19.5027ZM20 5L10.176 18H4L13.824 5H20Z",
		clipRule: "evenodd"
	})
});
//#endregion
//#region src/components/icons/models/zai/avatar.tsx
function ZaiAvatar({ size = 32, shape = "circle", className }) {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(require_avatar.Avatar, {
		className: require_avatar.cn("overflow-hidden", shape === "circle" ? "rounded-full" : "rounded-[20%]", className),
		style: {
			width: size,
			height: size
		},
		children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(require_avatar.AvatarFallback, {
			className: "text-foreground bg-background",
			children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ZaiLight, {
				className: "dark:hidden",
				style: {
					width: size,
					height: size
				}
			}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ZaiDark, {
				className: "hidden dark:block",
				style: {
					width: size,
					height: size
				}
			})]
		})
	});
}
//#endregion
//#region src/components/icons/models/zai/index.tsx
const Zai = ({ variant, className, ...props }) => {
	if (variant === "light") return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ZaiLight, {
		...props,
		className
	});
	if (variant === "dark") return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ZaiDark, {
		...props,
		className
	});
	return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ZaiLight, {
		className: require_avatar.cn("dark:hidden", className),
		...props
	}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ZaiDark, {
		className: require_avatar.cn("hidden dark:block", className),
		...props
	})] });
};
const ZaiIcon = /*#__PURE__*/ Object.assign(Zai, {
	Avatar: ZaiAvatar,
	colorPrimary: "#000000"
});
//#endregion
exports.ZaiIcon = ZaiIcon;
