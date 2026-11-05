const require_avatar = require("./avatar-DqAhynaP.cjs");
let react_jsx_runtime = require("react/jsx-runtime");
//#region src/components/icons/providers/inflection/dark.tsx
const InflectionDark = (props) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("svg", {
	xmlns: "http://www.w3.org/2000/svg",
	width: "1em",
	height: "1em",
	fill: "none",
	viewBox: "0 0 120 120",
	...props,
	children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
		fill: "#fff",
		fillRule: "evenodd",
		d: "M50.2344 92C48.828 92 48.0027 91.1656 48.0027 89.7681V89.0343C48.0027 87.6423 48.6607 86.9896 49.8815 86.5265L52.6016 85.5975C54.4805 84.8635 55.1333 84.0185 55.1333 82.0685V36.9315C55.1333 34.9815 54.4805 34.1446 52.6016 33.4025L49.8603 32.4708C48.6396 32.0077 48 31.3658 48 29.9629V29.2317C48.0027 27.8368 48.8466 27 50.253 27H68.7443C70.1534 27 71 27.8368 71 29.2317V29.9656C71 31.3577 70.3393 32.0104 69.1185 32.4735L66.3825 33.3943C64.4108 34.131 63.75 34.9733 63.75 36.9233V82.055C63.75 84.005 64.4108 84.8392 66.3825 85.584L69.1 86.5102C70.3207 86.976 70.9788 87.6152 70.9788 89.0181V89.7545C70.9788 91.1497 70.1349 91.9864 68.7231 91.9864L50.2371 92H50.2344Z",
		clipRule: "evenodd"
	})
});
//#endregion
//#region src/components/icons/providers/inflection/light.tsx
const InflectionLight = (props) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("svg", {
	xmlns: "http://www.w3.org/2000/svg",
	width: "1em",
	height: "1em",
	fill: "none",
	viewBox: "0 0 120 120",
	...props,
	children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
		fill: "#000",
		fillRule: "evenodd",
		d: "M50.2344 92C48.828 92 48.0027 91.1656 48.0027 89.7681V89.0343C48.0027 87.6423 48.6607 86.9896 49.8815 86.5265L52.6016 85.5975C54.4805 84.8635 55.1333 84.0185 55.1333 82.0685V36.9315C55.1333 34.9815 54.4805 34.1446 52.6016 33.4025L49.8603 32.4708C48.6396 32.0077 48 31.3658 48 29.9629V29.2317C48.0027 27.8368 48.8466 27 50.253 27H68.7443C70.1534 27 71 27.8368 71 29.2317V29.9656C71 31.3577 70.3393 32.0104 69.1185 32.4735L66.3825 33.3943C64.4108 34.131 63.75 34.9733 63.75 36.9233V82.055C63.75 84.005 64.4108 84.8392 66.3825 85.584L69.1 86.5102C70.3207 86.976 70.9788 87.6152 70.9788 89.0181V89.7545C70.9788 91.1497 70.1349 91.9864 68.7231 91.9864L50.2371 92H50.2344Z",
		clipRule: "evenodd"
	})
});
//#endregion
//#region src/components/icons/providers/inflection/avatar.tsx
function InflectionAvatar({ size = 32, shape = "circle", className }) {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(require_avatar.Avatar, {
		className: require_avatar.cn("overflow-hidden", shape === "circle" ? "rounded-full" : "rounded-[20%]", className),
		style: {
			width: size,
			height: size
		},
		children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(require_avatar.AvatarFallback, {
			className: "text-foreground bg-background",
			children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(InflectionLight, {
				className: "dark:hidden",
				style: {
					width: size,
					height: size
				}
			}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(InflectionDark, {
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
//#region src/components/icons/providers/inflection/index.tsx
var inflection_exports = /* @__PURE__ */ require_avatar.__exportAll({
	InflectionIcon: () => InflectionIcon,
	default: () => InflectionIcon
});
const Inflection = ({ variant, className, ...props }) => {
	if (variant === "light") return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(InflectionLight, {
		...props,
		className
	});
	if (variant === "dark") return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(InflectionDark, {
		...props,
		className
	});
	return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(InflectionLight, {
		className: require_avatar.cn("dark:hidden", className),
		...props
	}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(InflectionDark, {
		className: require_avatar.cn("hidden dark:block", className),
		...props
	})] });
};
const InflectionIcon = /*#__PURE__*/ Object.assign(Inflection, {
	Avatar: InflectionAvatar,
	colorPrimary: "#000000"
});
//#endregion
Object.defineProperty(exports, "InflectionIcon", {
	enumerable: true,
	get: function() {
		return InflectionIcon;
	}
});
Object.defineProperty(exports, "inflection_exports", {
	enumerable: true,
	get: function() {
		return inflection_exports;
	}
});
