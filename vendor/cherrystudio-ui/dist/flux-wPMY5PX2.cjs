const require_avatar = require("./avatar-DqAhynaP.cjs");
let react_jsx_runtime = require("react/jsx-runtime");
//#region src/components/icons/models/flux/dark.tsx
const FluxDark = (props) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
	xmlns: "http://www.w3.org/2000/svg",
	width: "1em",
	height: "1em",
	fill: "none",
	viewBox: "0 0 24 24",
	...props,
	children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
		fill: "#fff",
		fillRule: "evenodd",
		d: "M4 18.122L12.0067 6L20 18.122H18.5113L12.006 8.252L6.314 16.8707H14.3953L15.2213 18.122H4Z",
		clipRule: "evenodd"
	}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
		fill: "#fff",
		fillRule: "evenodd",
		d: "M9.37927 15.4827L10.7613 13.406L12.1439 15.4827H9.37927ZM16.1599 18.122L12.3813 12.3173H13.8326L17.6233 18.122H16.1599ZM17.1599 12.1173L18.5799 9.99066L19.9999 12.1173H17.1599Z",
		clipRule: "evenodd"
	})]
});
//#endregion
//#region src/components/icons/models/flux/light.tsx
const FluxLight = (props) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
	xmlns: "http://www.w3.org/2000/svg",
	width: "1em",
	height: "1em",
	fill: "none",
	viewBox: "0 0 24 24",
	...props,
	children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
		fill: "#000",
		fillRule: "evenodd",
		d: "M4 18.122L12.0067 6L20 18.122H18.5113L12.006 8.252L6.314 16.8707H14.3953L15.2213 18.122H4Z",
		clipRule: "evenodd"
	}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
		fill: "#000",
		fillRule: "evenodd",
		d: "M9.3793 15.4827L10.7613 13.406L12.144 15.4827H9.3793ZM16.16 18.122L12.3813 12.3173H13.8326L17.6233 18.122H16.16ZM17.16 12.1173L18.58 9.99066L20 12.1173H17.16Z",
		clipRule: "evenodd"
	})]
});
//#endregion
//#region src/components/icons/models/flux/avatar.tsx
function FluxAvatar({ size = 32, shape = "circle", className }) {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(require_avatar.Avatar, {
		className: require_avatar.cn("overflow-hidden", shape === "circle" ? "rounded-full" : "rounded-[20%]", className),
		style: {
			width: size,
			height: size
		},
		children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(require_avatar.AvatarFallback, {
			className: "text-foreground bg-background",
			children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(FluxLight, {
				className: "dark:hidden",
				style: {
					width: size,
					height: size
				}
			}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(FluxDark, {
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
//#region src/components/icons/models/flux/index.tsx
const Flux = ({ variant, className, ...props }) => {
	if (variant === "light") return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(FluxLight, {
		...props,
		className
	});
	if (variant === "dark") return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(FluxDark, {
		...props,
		className
	});
	return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(FluxLight, {
		className: require_avatar.cn("dark:hidden", className),
		...props
	}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(FluxDark, {
		className: require_avatar.cn("hidden dark:block", className),
		...props
	})] });
};
const FluxIcon = /*#__PURE__*/ Object.assign(Flux, {
	Avatar: FluxAvatar,
	colorPrimary: "#000000"
});
//#endregion
exports.FluxIcon = FluxIcon;
