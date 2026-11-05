const require_avatar = require("./avatar-DqAhynaP.cjs");
let react_jsx_runtime = require("react/jsx-runtime");
//#region src/components/icons/providers/recraft/dark.tsx
const RecraftDark = (props) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
	xmlns: "http://www.w3.org/2000/svg",
	width: "1em",
	height: "1em",
	fill: "none",
	viewBox: "0 0 120 120",
	...props,
	children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
		fill: "#fff",
		fillRule: "evenodd",
		d: "M80.2647 50.4115C80.2647 38.0344 69.0251 28 55.1585 28C50.3539 28 46.4566 38.0344 46.4566 50.4115C46.4566 53.5071 46.7003 56.4592 47.1418 59.1431H38.6187L29.7083 90.2917H55.1666V72.831C69.0251 72.831 80.262 62.7913 80.262 50.4196L80.2647 50.4142V50.4115ZM55.1585 32.1031C57.6772 32.1031 59.7139 40.304 59.7139 50.4115C59.7139 60.5217 57.6772 68.7198 55.1612 68.7198C52.6424 68.7198 50.6085 60.5217 50.6085 50.4115C50.6085 40.304 52.6451 32.1031 55.1585 32.1031Z",
		clipRule: "evenodd"
	}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
		fill: "#fff",
		fillRule: "evenodd",
		d: "M80.7549 72.8284H55.1882L64.9924 90.2917H90.5537L80.7549 72.8284Z",
		clipRule: "evenodd"
	})]
});
//#endregion
//#region src/components/icons/providers/recraft/light.tsx
const RecraftLight = (props) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
	xmlns: "http://www.w3.org/2000/svg",
	width: "1em",
	height: "1em",
	fill: "none",
	viewBox: "0 0 120 120",
	...props,
	children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
		fill: "#000",
		fillRule: "evenodd",
		d: "M80.2647 50.4115C80.2647 38.0344 69.0251 28 55.1585 28C50.3539 28 46.4566 38.0344 46.4566 50.4115C46.4566 53.5071 46.7003 56.4592 47.1418 59.1431H38.6187L29.7083 90.2917H55.1666V72.831C69.0251 72.831 80.262 62.7913 80.262 50.4196L80.2647 50.4142V50.4115ZM55.1585 32.1031C57.6772 32.1031 59.7139 40.304 59.7139 50.4115C59.7139 60.5217 57.6772 68.7198 55.1612 68.7198C52.6424 68.7198 50.6085 60.5217 50.6085 50.4115C50.6085 40.304 52.6451 32.1031 55.1585 32.1031Z",
		clipRule: "evenodd"
	}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
		fill: "#000",
		fillRule: "evenodd",
		d: "M80.7549 72.8283H55.1882L64.9924 90.2917H90.5537L80.7549 72.8283Z",
		clipRule: "evenodd"
	})]
});
//#endregion
//#region src/components/icons/providers/recraft/avatar.tsx
function RecraftAvatar({ size = 32, shape = "circle", className }) {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(require_avatar.Avatar, {
		className: require_avatar.cn("overflow-hidden", shape === "circle" ? "rounded-full" : "rounded-[20%]", className),
		style: {
			width: size,
			height: size
		},
		children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(require_avatar.AvatarFallback, {
			className: "text-foreground bg-background",
			children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(RecraftLight, {
				className: "dark:hidden",
				style: {
					width: size,
					height: size
				}
			}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(RecraftDark, {
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
//#region src/components/icons/providers/recraft/index.tsx
var recraft_exports = /* @__PURE__ */ require_avatar.__exportAll({
	RecraftIcon: () => RecraftIcon,
	default: () => RecraftIcon
});
const Recraft = ({ variant, className, ...props }) => {
	if (variant === "light") return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(RecraftLight, {
		...props,
		className
	});
	if (variant === "dark") return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(RecraftDark, {
		...props,
		className
	});
	return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(RecraftLight, {
		className: require_avatar.cn("dark:hidden", className),
		...props
	}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(RecraftDark, {
		className: require_avatar.cn("hidden dark:block", className),
		...props
	})] });
};
const RecraftIcon = /*#__PURE__*/ Object.assign(Recraft, {
	Avatar: RecraftAvatar,
	colorPrimary: "#000000"
});
//#endregion
Object.defineProperty(exports, "RecraftIcon", {
	enumerable: true,
	get: function() {
		return RecraftIcon;
	}
});
Object.defineProperty(exports, "recraft_exports", {
	enumerable: true,
	get: function() {
		return recraft_exports;
	}
});
