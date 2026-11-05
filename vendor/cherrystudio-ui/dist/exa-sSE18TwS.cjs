const require_avatar = require("./avatar-DqAhynaP.cjs");
let react_jsx_runtime = require("react/jsx-runtime");
//#region src/components/icons/providers/exa/light.tsx
const ExaLight = (props) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("svg", {
	xmlns: "http://www.w3.org/2000/svg",
	width: "1em",
	height: "1em",
	fill: "none",
	viewBox: "0 0 120 120",
	...props,
	children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
		fill: "#1F40ED",
		fillRule: "evenodd",
		d: "M35 27H86V31.8506L64.2365 59.5L86 87.1492V92H35V27ZM60.8222 55.0259L78.5084 31.8506H43.1331L60.8222 55.0259ZM40.7389 37.6573V57.0761H55.5557L40.7389 37.6573ZM55.5557 61.9239H40.7389V81.3427L55.5557 61.9239ZM43.1331 87.1522L60.8222 63.977L78.5084 87.1522H43.1331Z",
		clipRule: "evenodd"
	})
});
//#endregion
//#region src/components/icons/providers/exa/avatar.tsx
function ExaAvatar({ size = 32, shape = "circle", className }) {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(require_avatar.Avatar, {
		className: require_avatar.cn("overflow-hidden", shape === "circle" ? "rounded-full" : "rounded-[20%]", className),
		style: {
			width: size,
			height: size
		},
		children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(require_avatar.AvatarFallback, {
			className: "text-foreground bg-background",
			children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ExaLight, { style: {
				width: size,
				height: size
			} })
		})
	});
}
//#endregion
//#region src/components/icons/providers/exa/index.tsx
var exa_exports = /* @__PURE__ */ require_avatar.__exportAll({
	ExaIcon: () => ExaIcon,
	default: () => ExaIcon
});
const Exa = ({ variant, className, ...props }) => {
	if (variant === "light") return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ExaLight, {
		...props,
		className
	});
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ExaLight, {
		...props,
		className
	});
};
const ExaIcon = /*#__PURE__*/ Object.assign(Exa, {
	Avatar: ExaAvatar,
	colorPrimary: "#1F40ED"
});
//#endregion
Object.defineProperty(exports, "ExaIcon", {
	enumerable: true,
	get: function() {
		return ExaIcon;
	}
});
Object.defineProperty(exports, "exa_exports", {
	enumerable: true,
	get: function() {
		return exa_exports;
	}
});
