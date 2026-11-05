const require_avatar = require("./avatar-DqAhynaP.cjs");
let react_jsx_runtime = require("react/jsx-runtime");
//#region src/components/icons/providers/anthropic/light.tsx
const AnthropicLight = (props) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
	xmlns: "http://www.w3.org/2000/svg",
	width: "1em",
	height: "1em",
	fill: "none",
	viewBox: "0 0 120 120",
	...props,
	children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
		fill: "#CA9F7B",
		d: "M0 0H120V120H0z"
	}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
		fill: "#191918",
		d: "M74.865 37H64.9209L83.0554 83H93L74.865 37ZM46.1348 37L28 83H38.1405L41.8491 73.3403H60.8216L64.5298 83H74.6704L56.5357 37H46.1348ZM45.1295 64.797L51.3353 48.6309L57.541 64.797H45.1295Z"
	})]
});
//#endregion
//#region src/components/icons/providers/anthropic/avatar.tsx
function AnthropicAvatar({ size = 32, shape = "circle", className }) {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(require_avatar.Avatar, {
		className: require_avatar.cn("overflow-hidden", shape === "circle" ? "rounded-full" : "rounded-[20%]", className),
		style: {
			width: size,
			height: size
		},
		children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(require_avatar.AvatarFallback, {
			className: "text-foreground",
			children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(AnthropicLight, { style: {
				width: size,
				height: size
			} })
		})
	});
}
//#endregion
//#region src/components/icons/providers/anthropic/index.tsx
var anthropic_exports = /* @__PURE__ */ require_avatar.__exportAll({
	AnthropicIcon: () => AnthropicIcon,
	default: () => AnthropicIcon
});
const Anthropic = ({ variant, className, ...props }) => {
	if (variant === "light") return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(AnthropicLight, {
		...props,
		className
	});
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(AnthropicLight, {
		...props,
		className
	});
};
const AnthropicIcon = /*#__PURE__*/ Object.assign(Anthropic, {
	Avatar: AnthropicAvatar,
	colorPrimary: "#CA9F7B"
});
//#endregion
Object.defineProperty(exports, "AnthropicIcon", {
	enumerable: true,
	get: function() {
		return AnthropicIcon;
	}
});
Object.defineProperty(exports, "anthropic_exports", {
	enumerable: true,
	get: function() {
		return anthropic_exports;
	}
});
