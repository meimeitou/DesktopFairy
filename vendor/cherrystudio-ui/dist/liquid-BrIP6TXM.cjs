const require_avatar = require("./avatar-DqAhynaP.cjs");
let react_jsx_runtime = require("react/jsx-runtime");
//#region src/components/icons/providers/liquid/dark.tsx
const LiquidDark = (props) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("svg", {
	xmlns: "http://www.w3.org/2000/svg",
	width: "1em",
	height: "1em",
	fill: "none",
	viewBox: "0 0 120 120",
	...props,
	children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
		fill: "#fff",
		fillRule: "evenodd",
		d: "M61.038 50.1454L61.0165 50.159L69.1862 64.3777C70.3198 66.1181 70.9224 68.1533 70.9199 70.2331C70.9199 72.2752 70.3483 74.1873 69.356 75.8177L86 70.4254L59.965 27L53.6934 37.4867L61.038 50.1454ZM47.0418 92L60.1186 81.0232H60.0836C54.1006 81.0232 49.2527 76.1915 49.2527 70.2331C49.2527 68.0827 49.8864 66.0785 50.9783 64.394L58.7031 50.9173L52.2833 39.8483L34 70.4254L47.0229 92H47.0418ZM65.646 79.4929H65.6433L50.7761 92H72.8369L84.021 73.6673L65.646 79.4929Z",
		clipRule: "evenodd"
	})
});
//#endregion
//#region src/components/icons/providers/liquid/light.tsx
const LiquidLight = (props) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("svg", {
	xmlns: "http://www.w3.org/2000/svg",
	width: "1em",
	height: "1em",
	fill: "none",
	viewBox: "0 0 120 120",
	...props,
	children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
		fill: "#000",
		fillRule: "evenodd",
		d: "M61.038 50.1454L61.0165 50.159L69.1862 64.3777C70.3198 66.1181 70.9224 68.1533 70.9199 70.2331C70.9199 72.2752 70.3483 74.1873 69.356 75.8177L86 70.4254L59.965 27L53.6934 37.4867L61.038 50.1454ZM47.0418 92L60.1186 81.0232H60.0836C54.1006 81.0232 49.2527 76.1915 49.2527 70.2331C49.2527 68.0827 49.8864 66.0785 50.9783 64.394L58.7031 50.9173L52.2833 39.8483L34 70.4254L47.0229 92H47.0418ZM65.646 79.4929H65.6433L50.7761 92H72.8369L84.021 73.6673L65.646 79.4929Z",
		clipRule: "evenodd"
	})
});
//#endregion
//#region src/components/icons/providers/liquid/avatar.tsx
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
//#region src/components/icons/providers/liquid/index.tsx
var liquid_exports = /* @__PURE__ */ require_avatar.__exportAll({
	LiquidIcon: () => LiquidIcon,
	default: () => LiquidIcon
});
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
Object.defineProperty(exports, "LiquidIcon", {
	enumerable: true,
	get: function() {
		return LiquidIcon;
	}
});
Object.defineProperty(exports, "liquid_exports", {
	enumerable: true,
	get: function() {
		return liquid_exports;
	}
});
