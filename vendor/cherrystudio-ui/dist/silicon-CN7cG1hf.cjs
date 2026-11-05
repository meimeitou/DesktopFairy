const require_avatar = require("./avatar-DqAhynaP.cjs");
let react_jsx_runtime = require("react/jsx-runtime");
//#region src/components/icons/providers/silicon/light.tsx
const SiliconLight = (props) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("svg", {
	xmlns: "http://www.w3.org/2000/svg",
	width: "1em",
	height: "1em",
	fill: "none",
	viewBox: "0 0 120 120",
	...props,
	children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
		fill: "#6E29F6",
		fillRule: "evenodd",
		d: "M90.1725 45H61.9137C60.351 45 59.0863 46.2639 59.0863 47.8194V56.2723C59.0863 57.8305 57.8242 59.0917 56.2615 59.0917H30.8275C29.2648 59.0917 28 60.3528 28 61.9111V73.1833C28 74.7388 29.2648 76 30.8275 76H59.0863C60.649 76 61.9137 74.7388 61.9137 73.1833V64.7305C61.9137 63.1695 63.1758 61.9111 64.7385 61.9111H90.1725C91.7355 61.9111 93 60.6499 93 59.0917V47.8194C93 46.2639 91.7355 45 90.1725 45Z",
		clipRule: "evenodd"
	})
});
//#endregion
//#region src/components/icons/providers/silicon/avatar.tsx
function SiliconAvatar({ size = 32, shape = "circle", className }) {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(require_avatar.Avatar, {
		className: require_avatar.cn("overflow-hidden", shape === "circle" ? "rounded-full" : "rounded-[20%]", className),
		style: {
			width: size,
			height: size
		},
		children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(require_avatar.AvatarFallback, {
			className: "text-foreground bg-background",
			children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(SiliconLight, { style: {
				width: size,
				height: size
			} })
		})
	});
}
//#endregion
//#region src/components/icons/providers/silicon/index.tsx
var silicon_exports = /* @__PURE__ */ require_avatar.__exportAll({
	SiliconIcon: () => SiliconIcon,
	default: () => SiliconIcon
});
const Silicon = ({ variant, className, ...props }) => {
	if (variant === "light") return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(SiliconLight, {
		...props,
		className
	});
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(SiliconLight, {
		...props,
		className
	});
};
const SiliconIcon = /*#__PURE__*/ Object.assign(Silicon, {
	Avatar: SiliconAvatar,
	colorPrimary: "#6E29F6"
});
//#endregion
Object.defineProperty(exports, "SiliconIcon", {
	enumerable: true,
	get: function() {
		return SiliconIcon;
	}
});
Object.defineProperty(exports, "silicon_exports", {
	enumerable: true,
	get: function() {
		return silicon_exports;
	}
});
