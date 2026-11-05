const require_avatar = require("./avatar-DqAhynaP.cjs");
let react_jsx_runtime = require("react/jsx-runtime");
//#region src/components/icons/models/jina/dark.tsx
const JinaDark = (props) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("svg", {
	xmlns: "http://www.w3.org/2000/svg",
	width: "1em",
	height: "1em",
	fill: "none",
	viewBox: "0 0 24 24",
	...props,
	children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
		fill: "#fff",
		fillRule: "evenodd",
		d: "M7.68671 19.9368C8.66448 19.9368 9.60221 19.5383 10.2936 18.8289C10.985 18.1195 11.3734 17.1573 11.3734 16.1541C11.3734 15.1509 10.985 14.1887 10.2936 13.4793C9.60221 12.7699 8.66448 12.3714 7.68671 12.3714C6.70893 12.3714 5.7712 12.7699 5.07981 13.4793C4.38842 14.1887 4 15.1509 4 16.1541C4 17.1573 4.38842 18.1195 5.07981 18.8289C5.7712 19.5383 6.70893 19.9368 7.68671 19.9368ZM19.1152 4.01231C19.6064 4.01231 20 4.41615 20 4.92013V12.309C20 16.5198 16.6817 19.9499 12.6266 20V12.3213L12.6026 4.90781C12.6026 4.40384 12.9954 4 13.4874 4H19.2136L19.1152 4.01231Z",
		clipRule: "evenodd"
	})
});
//#endregion
//#region src/components/icons/models/jina/light.tsx
const JinaLight = (props) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("svg", {
	xmlns: "http://www.w3.org/2000/svg",
	width: "1em",
	height: "1em",
	fill: "none",
	viewBox: "0 0 24 24",
	...props,
	children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
		fill: "#000",
		fillRule: "evenodd",
		d: "M7.68671 19.9368C8.66448 19.9368 9.60221 19.5383 10.2936 18.8289C10.985 18.1195 11.3734 17.1573 11.3734 16.1541C11.3734 15.1509 10.985 14.1887 10.2936 13.4793C9.60221 12.7699 8.66448 12.3714 7.68671 12.3714C6.70893 12.3714 5.7712 12.7699 5.07981 13.4793C4.38842 14.1887 4 15.1509 4 16.1541C4 17.1573 4.38842 18.1195 5.07981 18.8289C5.7712 19.5383 6.70893 19.9368 7.68671 19.9368ZM19.1152 4.01231C19.6064 4.01231 20 4.41615 20 4.92013V12.309C20 16.5198 16.6817 19.9499 12.6266 20V12.3213L12.6026 4.90781C12.6026 4.40384 12.9954 4 13.4874 4H19.2136L19.1152 4.01231Z",
		clipRule: "evenodd"
	})
});
//#endregion
//#region src/components/icons/models/jina/avatar.tsx
function JinaAvatar({ size = 32, shape = "circle", className }) {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(require_avatar.Avatar, {
		className: require_avatar.cn("overflow-hidden", shape === "circle" ? "rounded-full" : "rounded-[20%]", className),
		style: {
			width: size,
			height: size
		},
		children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(require_avatar.AvatarFallback, {
			className: "text-foreground bg-background",
			children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(JinaLight, {
				className: "dark:hidden",
				style: {
					width: size,
					height: size
				}
			}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(JinaDark, {
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
//#region src/components/icons/models/jina/index.tsx
const Jina = ({ variant, className, ...props }) => {
	if (variant === "light") return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(JinaLight, {
		...props,
		className
	});
	if (variant === "dark") return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(JinaDark, {
		...props,
		className
	});
	return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(JinaLight, {
		className: require_avatar.cn("dark:hidden", className),
		...props
	}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(JinaDark, {
		className: require_avatar.cn("hidden dark:block", className),
		...props
	})] });
};
const JinaIcon = /*#__PURE__*/ Object.assign(Jina, {
	Avatar: JinaAvatar,
	colorPrimary: "#000000"
});
//#endregion
exports.JinaIcon = JinaIcon;
