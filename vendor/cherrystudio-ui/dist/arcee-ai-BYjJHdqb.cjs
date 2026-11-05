const require_avatar = require("./avatar-DqAhynaP.cjs");
let react_jsx_runtime = require("react/jsx-runtime");
//#region src/components/icons/providers/arcee-ai/light.tsx
const ArceeAiLight = (props) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("svg", {
	xmlns: "http://www.w3.org/2000/svg",
	width: "1em",
	height: "1em",
	fill: "none",
	viewBox: "0 0 120 120",
	...props,
	children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
		fill: "#008C8C",
		d: "M64.8895 34.5394L31.7064 92H23L60.5443 27L64.8895 34.5394ZM76.1373 54.0651L45.7361 92H36.0707L72.0895 47.0459L76.1373 54.0619V54.0651ZM98 92H67.4657L94.0691 85.1774L98 92ZM87.1762 73.2164L62.3546 91.9936H49.844L83.3815 66.6287L87.1762 73.2164Z"
	})
});
//#endregion
//#region src/components/icons/providers/arcee-ai/avatar.tsx
function ArceeAiAvatar({ size = 32, shape = "circle", className }) {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(require_avatar.Avatar, {
		className: require_avatar.cn("overflow-hidden", shape === "circle" ? "rounded-full" : "rounded-[20%]", className),
		style: {
			width: size,
			height: size
		},
		children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(require_avatar.AvatarFallback, {
			className: "text-foreground bg-background",
			children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ArceeAiLight, { style: {
				width: size,
				height: size
			} })
		})
	});
}
//#endregion
//#region src/components/icons/providers/arcee-ai/index.tsx
var arcee_ai_exports = /* @__PURE__ */ require_avatar.__exportAll({
	ArceeAiIcon: () => ArceeAiIcon,
	default: () => ArceeAiIcon
});
const ArceeAi = ({ variant, className, ...props }) => {
	if (variant === "light") return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ArceeAiLight, {
		...props,
		className
	});
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ArceeAiLight, {
		...props,
		className
	});
};
const ArceeAiIcon = /*#__PURE__*/ Object.assign(ArceeAi, {
	Avatar: ArceeAiAvatar,
	colorPrimary: "#008C8C"
});
//#endregion
Object.defineProperty(exports, "ArceeAiIcon", {
	enumerable: true,
	get: function() {
		return ArceeAiIcon;
	}
});
Object.defineProperty(exports, "arcee_ai_exports", {
	enumerable: true,
	get: function() {
		return arcee_ai_exports;
	}
});
