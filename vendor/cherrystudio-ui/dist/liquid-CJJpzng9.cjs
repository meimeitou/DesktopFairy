const require_avatar = require("./avatar-DqAhynaP.cjs");
let react_jsx_runtime = require("react/jsx-runtime");
//#region src/components/icons/models/liquid/dark.tsx
const LiquidDark = (props) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("svg", {
	xmlns: "http://www.w3.org/2000/svg",
	width: "1em",
	height: "1em",
	fill: "none",
	viewBox: "0 0 24 24",
	...props,
	children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
		fill: "#fff",
		fillRule: "evenodd",
		d: "M12.1996 9.69733L12.1955 9.70067L13.7666 13.2007C13.9846 13.6291 14.1005 14.13 14.1 14.642C14.1 15.1447 13.99 15.6153 13.7992 16.0167L17 14.6893L11.9933 4L10.7872 6.58133L12.1996 9.69733ZM9.50804 20L12.0228 17.298H12.0161C10.8655 17.298 9.93322 16.1087 9.93322 14.642C9.93322 14.1127 10.0551 13.6193 10.2651 13.2047L11.7506 9.88733L10.516 7.16267L7 14.6893L9.50441 20H9.50804ZM13.0858 16.9213H13.0852L10.2262 20H14.4686L16.6194 15.4873L13.0858 16.9213Z",
		clipRule: "evenodd"
	})
});
//#endregion
//#region src/components/icons/models/liquid/light.tsx
const LiquidLight = (props) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("svg", {
	xmlns: "http://www.w3.org/2000/svg",
	width: "1em",
	height: "1em",
	fill: "none",
	viewBox: "0 0 24 24",
	...props,
	children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
		fill: "#000",
		fillRule: "evenodd",
		d: "M12.1996 9.69733L12.1955 9.70067L13.7666 13.2007C13.9846 13.6291 14.1005 14.13 14.1 14.642C14.1 15.1447 13.99 15.6153 13.7992 16.0167L17 14.6893L11.9933 4L10.7872 6.58133L12.1996 9.69733ZM9.50804 20L12.0228 17.298H12.0161C10.8655 17.298 9.93322 16.1087 9.93322 14.642C9.93322 14.1127 10.0551 13.6193 10.2651 13.2047L11.7506 9.88733L10.516 7.16267L7 14.6893L9.50441 20H9.50804ZM13.0858 16.9213H13.0852L10.2262 20H14.4686L16.6194 15.4873L13.0858 16.9213Z",
		clipRule: "evenodd"
	})
});
//#endregion
//#region src/components/icons/models/liquid/avatar.tsx
function LiquidAvatar({ size = 32, shape = "circle", className }) {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(require_avatar.Avatar, {
		className: require_avatar.cn("overflow-hidden", shape === "circle" ? "rounded-full" : "rounded-[20%]", className),
		style: {
			width: size,
			height: size
		},
		children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(require_avatar.AvatarFallback, {
			className: "text-foreground bg-background",
			children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(LiquidLight, {
				className: "dark:hidden",
				style: {
					width: size,
					height: size
				}
			}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(LiquidDark, {
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
//#region src/components/icons/models/liquid/index.tsx
const Liquid = ({ variant, className, ...props }) => {
	if (variant === "light") return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(LiquidLight, {
		...props,
		className
	});
	if (variant === "dark") return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(LiquidDark, {
		...props,
		className
	});
	return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(LiquidLight, {
		className: require_avatar.cn("dark:hidden", className),
		...props
	}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(LiquidDark, {
		className: require_avatar.cn("hidden dark:block", className),
		...props
	})] });
};
const LiquidIcon = /*#__PURE__*/ Object.assign(Liquid, {
	Avatar: LiquidAvatar,
	colorPrimary: "#000000"
});
//#endregion
exports.LiquidIcon = LiquidIcon;
