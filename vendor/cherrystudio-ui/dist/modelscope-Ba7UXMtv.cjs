const require_avatar = require("./avatar-DqAhynaP.cjs");
let react_jsx_runtime = require("react/jsx-runtime");
//#region src/components/icons/providers/modelscope/light.tsx
const ModelscopeLight = (props) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
	xmlns: "http://www.w3.org/2000/svg",
	width: "1em",
	height: "1em",
	fill: "none",
	viewBox: "0 0 120 120",
	...props,
	children: [
		/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
			fill: "#624AFF",
			d: "M28 56.7835H35.4453V64.1737H28V56.7835ZM56.7768 64.1763H64.2222V71.5666H56.7768V64.1763ZM79.1124 71.5666H71.6671V77.9599H85.5536V64.1763H79.1124V71.5666Z"
		}),
		/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
			fill: "#36CFD1",
			d: "M64.2222 56.7835H71.6671V64.1738H64.2222V56.7835ZM28 49.3935H35.4453V56.7835H28V49.3935Z"
		}),
		/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
			fill: "#624AFF",
			d: "M85.5544 56.7835H93.0001V64.1737H85.5544V56.7835Z"
		}),
		/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
			fill: "#36CFD1",
			d: "M85.5544 49.3935H93.0001V56.7835H85.5544V49.3935Z"
		}),
		/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
			fill: "#624AFF",
			d: "M71.6697 43V49.3932H79.1149V56.7833H85.5561V43H71.6697Z"
		}),
		/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
			fill: "#36CFD1",
			d: "M49.334 56.7835H56.7792V64.1737H49.334V56.7835Z"
		}),
		/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
			fill: "#624AFF",
			d: "M41.8877 49.3932H49.333V43H35.4468V56.7833H41.8877V49.3932ZM41.8877 64.1766H35.4468V77.9598H49.333V71.5664H41.8877V64.1766Z"
		})
	]
});
//#endregion
//#region src/components/icons/providers/modelscope/avatar.tsx
function ModelscopeAvatar({ size = 32, shape = "circle", className }) {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(require_avatar.Avatar, {
		className: require_avatar.cn("overflow-hidden", shape === "circle" ? "rounded-full" : "rounded-[20%]", className),
		style: {
			width: size,
			height: size
		},
		children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(require_avatar.AvatarFallback, {
			className: "text-foreground bg-background",
			children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ModelscopeLight, { style: {
				width: size,
				height: size
			} })
		})
	});
}
//#endregion
//#region src/components/icons/providers/modelscope/index.tsx
var modelscope_exports = /* @__PURE__ */ require_avatar.__exportAll({
	ModelscopeIcon: () => ModelscopeIcon,
	default: () => ModelscopeIcon
});
const Modelscope = ({ variant, className, ...props }) => {
	if (variant === "light") return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ModelscopeLight, {
		...props,
		className
	});
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ModelscopeLight, {
		...props,
		className
	});
};
const ModelscopeIcon = /*#__PURE__*/ Object.assign(Modelscope, {
	Avatar: ModelscopeAvatar,
	colorPrimary: "#624AFF"
});
//#endregion
Object.defineProperty(exports, "ModelscopeIcon", {
	enumerable: true,
	get: function() {
		return ModelscopeIcon;
	}
});
Object.defineProperty(exports, "modelscope_exports", {
	enumerable: true,
	get: function() {
		return modelscope_exports;
	}
});
