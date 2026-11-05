const require_avatar = require("./avatar-DqAhynaP.cjs");
let react_jsx_runtime = require("react/jsx-runtime");
//#region src/components/icons/providers/twitter/dark.tsx
const TwitterDark = (props) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("svg", {
	xmlns: "http://www.w3.org/2000/svg",
	width: "1em",
	height: "1em",
	fill: "none",
	viewBox: "0 0 120 120",
	...props,
	children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
		fill: "#fff",
		d: "M79.1864 31H89.1582L67.3785 55.9899L93 90H72.9435L57.2231 69.3783L39.2571 90H29.2711L52.5621 63.2656L28 31H48.565L62.7599 49.8488L79.1864 31ZM75.6836 84.0148H81.2062L45.5564 36.6731H39.6243L75.6836 84.0148Z"
	})
});
//#endregion
//#region src/components/icons/providers/twitter/light.tsx
const TwitterLight = (props) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("svg", {
	xmlns: "http://www.w3.org/2000/svg",
	width: "1em",
	height: "1em",
	fill: "none",
	viewBox: "0 0 120 120",
	...props,
	children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
		fill: "#000",
		d: "M79.1864 31H89.1582L67.3785 55.9899L93 90H72.9435L57.2231 69.3783L39.2571 90H29.2711L52.5621 63.2656L28 31H48.565L62.7599 49.8488L79.1864 31ZM75.6836 84.0148H81.2062L45.5564 36.6731H39.6243L75.6836 84.0148Z"
	})
});
//#endregion
//#region src/components/icons/providers/twitter/avatar.tsx
function TwitterAvatar({ size = 32, shape = "circle", className }) {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(require_avatar.Avatar, {
		className: require_avatar.cn("overflow-hidden", shape === "circle" ? "rounded-full" : "rounded-[20%]", className),
		style: {
			width: size,
			height: size
		},
		children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(require_avatar.AvatarFallback, {
			className: "text-foreground bg-background",
			children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(TwitterLight, {
				className: "dark:hidden",
				style: {
					width: size,
					height: size
				}
			}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(TwitterDark, {
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
//#region src/components/icons/providers/twitter/index.tsx
var twitter_exports = /* @__PURE__ */ require_avatar.__exportAll({
	TwitterIcon: () => TwitterIcon,
	default: () => TwitterIcon
});
const Twitter = ({ variant, className, ...props }) => {
	if (variant === "light") return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(TwitterLight, {
		...props,
		className
	});
	if (variant === "dark") return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(TwitterDark, {
		...props,
		className
	});
	return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(TwitterLight, {
		className: require_avatar.cn("dark:hidden", className),
		...props
	}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(TwitterDark, {
		className: require_avatar.cn("hidden dark:block", className),
		...props
	})] });
};
const TwitterIcon = /*#__PURE__*/ Object.assign(Twitter, {
	Avatar: TwitterAvatar,
	colorPrimary: "#000000"
});
//#endregion
Object.defineProperty(exports, "TwitterIcon", {
	enumerable: true,
	get: function() {
		return TwitterIcon;
	}
});
Object.defineProperty(exports, "twitter_exports", {
	enumerable: true,
	get: function() {
		return twitter_exports;
	}
});
