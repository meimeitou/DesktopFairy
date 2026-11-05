const require_avatar = require("./avatar-DqAhynaP.cjs");
let react_jsx_runtime = require("react/jsx-runtime");
//#region src/components/icons/providers/xinghuo/light.tsx
const XinghuoLight = (props) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
	xmlns: "http://www.w3.org/2000/svg",
	width: "1em",
	height: "1em",
	fill: "none",
	viewBox: "0 0 120 120",
	...props,
	children: [
		/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
			fill: "#3DC8F9",
			d: "M33 63.9648C33 52.9488 40.8338 44.9935 53.6867 32.9969C51.8498 55.2746 71.8017 56.374 67.882 67.5143C65.0842 75.4696 55.8882 73.0222 54.9104 71.3068C54.9104 71.3068 58.3356 72.2875 58.8245 68.8595C59.3162 65.4315 52.4602 63.5974 48.0572 54.9073C40.7095 63.3515 45.3611 80.3643 59.9266 80.3643C73.3899 80.3643 78.5305 66.4121 73.7573 57.4761C73.7573 57.4761 85.2622 59.4346 86.2428 68.2462C87.2206 77.0607 75.9616 92.3609 60.5399 91.9935C45.1181 91.6261 33 80.2428 33 63.9648Z"
		}),
		/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
			fill: "#EA0100",
			d: "M77.7988 44.2587L60.1727 27C58.7032 43.767 62.6201 50.6654 74.0034 53.8051C81.7157 55.9331 83.3492 56.7442 86.732 61.6389C85.7768 54.8366 84.5277 50.866 77.7988 44.2587Z"
		}),
		/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
			fill: "#1652D8",
			fillRule: "evenodd",
			d: "M52.8748 78.7817C54.8784 79.7822 57.2325 80.3643 59.9258 80.3643C73.3891 80.3643 78.5296 66.4121 73.7564 57.4761C73.7564 57.4761 85.2613 59.4346 86.2419 68.2462C86.6828 72.2112 84.6452 77.4874 80.8668 82.0656C71.0943 86.5025 60.2649 84.4395 52.8748 78.7817Z",
			clipRule: "evenodd"
		})
	]
});
//#endregion
//#region src/components/icons/providers/xinghuo/avatar.tsx
function XinghuoAvatar({ size = 32, shape = "circle", className }) {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(require_avatar.Avatar, {
		className: require_avatar.cn("overflow-hidden", shape === "circle" ? "rounded-full" : "rounded-[20%]", className),
		style: {
			width: size,
			height: size
		},
		children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(require_avatar.AvatarFallback, {
			className: "text-foreground bg-background",
			children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(XinghuoLight, { style: {
				width: size,
				height: size
			} })
		})
	});
}
//#endregion
//#region src/components/icons/providers/xinghuo/index.tsx
var xinghuo_exports = /* @__PURE__ */ require_avatar.__exportAll({
	XinghuoIcon: () => XinghuoIcon,
	default: () => XinghuoIcon
});
const Xinghuo = ({ variant, className, ...props }) => {
	if (variant === "light") return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(XinghuoLight, {
		...props,
		className
	});
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(XinghuoLight, {
		...props,
		className
	});
};
const XinghuoIcon = /*#__PURE__*/ Object.assign(Xinghuo, {
	Avatar: XinghuoAvatar,
	colorPrimary: "#3DC8F9"
});
//#endregion
Object.defineProperty(exports, "XinghuoIcon", {
	enumerable: true,
	get: function() {
		return XinghuoIcon;
	}
});
Object.defineProperty(exports, "xinghuo_exports", {
	enumerable: true,
	get: function() {
		return xinghuo_exports;
	}
});
