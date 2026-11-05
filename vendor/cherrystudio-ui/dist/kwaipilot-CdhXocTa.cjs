const require_avatar = require("./avatar-DqAhynaP.cjs");
let react = require("react");
let react_jsx_runtime = require("react/jsx-runtime");
//#region src/components/icons/providers/kwaipilot/light.tsx
const KwaipilotLight = (props) => {
	const iconId = (0, react.useId)();
	return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
		xmlns: "http://www.w3.org/2000/svg",
		width: "1em",
		height: "1em",
		fill: "none",
		viewBox: "0 0 120 120",
		...props,
		children: [
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
				fill: `url(#${iconId}-kwaipilotlight__a)`,
				d: "M59.5003 27.0054C41.5524 27.0054 27 41.5575 27 59.5052C27 69.3037 31.3388 78.0888 38.1945 84.0498L54.2723 51.081H72.2579L52.6554 91.2775C54.8652 91.7518 57.1503 92 59.5003 92C77.4483 92 92.0006 77.4474 92.0006 59.4998C92.0006 41.5521 77.4483 27 59.5003 27V27.0054Z"
			}),
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
				fill: `url(#${iconId}-kwaipilotlight__b)`,
				d: "M38.1945 84.0444L55.9323 47.6748C55.9808 47.5724 56.0294 47.4701 56.0832 47.3676L56.3258 46.8664H56.3365C59.4787 40.9755 65.6825 36.9655 72.8238 36.9655C80.5853 36.9655 87.2417 41.7031 90.0659 48.4402C85.5438 35.9361 73.5623 27 59.5003 27C41.5524 27 27 41.5521 27 59.4998C27 69.2983 31.3388 78.0835 38.1945 84.0444Z"
			}),
			/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("defs", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("linearGradient", {
				id: `${iconId}-kwaipilotlight__a`,
				x1: 64.249,
				x2: 61.71,
				y1: 40.367,
				y2: 86.314,
				gradientUnits: "userSpaceOnUse",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("stop", {
					offset: .313,
					stopColor: "#9EC0E0"
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("stop", {
					offset: 1,
					stopColor: "#fff"
				})]
			}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("linearGradient", {
				id: `${iconId}-kwaipilotlight__b`,
				x1: 65.003,
				x2: 42.444,
				y1: 38.712,
				y2: 75.396,
				gradientUnits: "userSpaceOnUse",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("stop", { stopColor: "#fff" }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("stop", {
					offset: 1,
					stopColor: "#BCD5EC"
				})]
			})] })
		]
	});
};
//#endregion
//#region src/components/icons/providers/kwaipilot/avatar.tsx
function KwaipilotAvatar({ size = 32, shape = "circle", className }) {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(require_avatar.Avatar, {
		className: require_avatar.cn("overflow-hidden", shape === "circle" ? "rounded-full" : "rounded-[20%]", className),
		style: {
			width: size,
			height: size
		},
		children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(require_avatar.AvatarFallback, {
			className: "text-foreground bg-background",
			children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(KwaipilotLight, { style: {
				width: size,
				height: size
			} })
		})
	});
}
//#endregion
//#region src/components/icons/providers/kwaipilot/index.tsx
var kwaipilot_exports = /* @__PURE__ */ require_avatar.__exportAll({
	KwaipilotIcon: () => KwaipilotIcon,
	default: () => KwaipilotIcon
});
const Kwaipilot = ({ variant, className, ...props }) => {
	if (variant === "light") return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(KwaipilotLight, {
		...props,
		className
	});
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(KwaipilotLight, {
		...props,
		className
	});
};
const KwaipilotIcon = /*#__PURE__*/ Object.assign(Kwaipilot, {
	Avatar: KwaipilotAvatar,
	colorPrimary: "#000000"
});
//#endregion
Object.defineProperty(exports, "KwaipilotIcon", {
	enumerable: true,
	get: function() {
		return KwaipilotIcon;
	}
});
Object.defineProperty(exports, "kwaipilot_exports", {
	enumerable: true,
	get: function() {
		return kwaipilot_exports;
	}
});
