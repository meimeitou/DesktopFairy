const require_avatar = require("./avatar-DqAhynaP.cjs");
let react_jsx_runtime = require("react/jsx-runtime");
//#region src/components/icons/models/inception/dark.tsx
const InceptionDark = (props) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("svg", {
	xmlns: "http://www.w3.org/2000/svg",
	width: "1em",
	height: "1em",
	fill: "none",
	viewBox: "0 0 24 24",
	...props,
	children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
		fill: "#fff",
		fillRule: "evenodd",
		d: "M14.0124 4H9.00655L4 9.00582V14.0124H9.00655V9.00582H14.0124V4ZM9.98836 20H14.9935L20 14.9935V9.98764H14.9935V14.9935H9.98836V20Z",
		clipRule: "evenodd"
	})
});
//#endregion
//#region src/components/icons/models/inception/light.tsx
const InceptionLight = (props) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("svg", {
	xmlns: "http://www.w3.org/2000/svg",
	width: "1em",
	height: "1em",
	fill: "none",
	viewBox: "0 0 24 24",
	...props,
	children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
		fill: "#000",
		fillRule: "evenodd",
		d: "M14.0124 4H9.00655L4 9.00582V14.0124H9.00655V9.00582H14.0124V4ZM9.98836 20H14.9935L20 14.9935V9.98764H14.9935V14.9935H9.98836V20Z",
		clipRule: "evenodd"
	})
});
//#endregion
//#region src/components/icons/models/inception/avatar.tsx
function InceptionAvatar({ size = 32, shape = "circle", className }) {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(require_avatar.Avatar, {
		className: require_avatar.cn("overflow-hidden", shape === "circle" ? "rounded-full" : "rounded-[20%]", className),
		style: {
			width: size,
			height: size
		},
		children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(require_avatar.AvatarFallback, {
			className: "text-foreground bg-background",
			children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(InceptionLight, {
				className: "dark:hidden",
				style: {
					width: size,
					height: size
				}
			}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(InceptionDark, {
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
//#region src/components/icons/models/inception/index.tsx
const Inception = ({ variant, className, ...props }) => {
	if (variant === "light") return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(InceptionLight, {
		...props,
		className
	});
	if (variant === "dark") return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(InceptionDark, {
		...props,
		className
	});
	return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(InceptionLight, {
		className: require_avatar.cn("dark:hidden", className),
		...props
	}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(InceptionDark, {
		className: require_avatar.cn("hidden dark:block", className),
		...props
	})] });
};
const InceptionIcon = /*#__PURE__*/ Object.assign(Inception, {
	Avatar: InceptionAvatar,
	colorPrimary: "#000000"
});
//#endregion
exports.InceptionIcon = InceptionIcon;
