const require_avatar = require("./avatar-DqAhynaP.cjs");
let react_jsx_runtime = require("react/jsx-runtime");
//#region src/components/icons/providers/vercel/dark.tsx
const VercelDark = (props) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("svg", {
	xmlns: "http://www.w3.org/2000/svg",
	width: "1em",
	height: "1em",
	fill: "none",
	viewBox: "0 0 120 120",
	...props,
	children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
		fill: "#fff",
		fillRule: "evenodd",
		d: "M59.5 32L92 88H27L59.5 32Z",
		clipRule: "evenodd"
	})
});
//#endregion
//#region src/components/icons/providers/vercel/light.tsx
const VercelLight = (props) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("svg", {
	xmlns: "http://www.w3.org/2000/svg",
	width: "1em",
	height: "1em",
	fill: "none",
	viewBox: "0 0 120 120",
	...props,
	children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
		fill: "#000",
		fillRule: "evenodd",
		d: "M59.5 32L92 88H27L59.5 32Z",
		clipRule: "evenodd"
	})
});
//#endregion
//#region src/components/icons/providers/vercel/avatar.tsx
function VercelAvatar({ size = 32, shape = "circle", className }) {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(require_avatar.Avatar, {
		className: require_avatar.cn("overflow-hidden", shape === "circle" ? "rounded-full" : "rounded-[20%]", className),
		style: {
			width: size,
			height: size
		},
		children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(require_avatar.AvatarFallback, {
			className: "text-foreground bg-background",
			children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(VercelLight, {
				className: "dark:hidden",
				style: {
					width: size,
					height: size
				}
			}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(VercelDark, {
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
//#region src/components/icons/providers/vercel/index.tsx
var vercel_exports = /* @__PURE__ */ require_avatar.__exportAll({
	VercelIcon: () => VercelIcon,
	default: () => VercelIcon
});
const Vercel = ({ variant, className, ...props }) => {
	if (variant === "light") return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(VercelLight, {
		...props,
		className
	});
	if (variant === "dark") return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(VercelDark, {
		...props,
		className
	});
	return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(VercelLight, {
		className: require_avatar.cn("dark:hidden", className),
		...props
	}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(VercelDark, {
		className: require_avatar.cn("hidden dark:block", className),
		...props
	})] });
};
const VercelIcon = /*#__PURE__*/ Object.assign(Vercel, {
	Avatar: VercelAvatar,
	colorPrimary: "#000000"
});
//#endregion
Object.defineProperty(exports, "VercelIcon", {
	enumerable: true,
	get: function() {
		return VercelIcon;
	}
});
Object.defineProperty(exports, "vercel_exports", {
	enumerable: true,
	get: function() {
		return vercel_exports;
	}
});
