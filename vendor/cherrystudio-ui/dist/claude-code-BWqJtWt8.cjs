const require_avatar = require("./avatar-DqAhynaP.cjs");
let react = require("react");
let react_jsx_runtime = require("react/jsx-runtime");
//#region src/components/icons/providers/claude-code/light.tsx
const ClaudeCodeLight = (props) => {
	const iconId = (0, react.useId)();
	return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
		xmlns: "http://www.w3.org/2000/svg",
		width: "1em",
		height: "1em",
		fill: "none",
		viewBox: "0 0 120 120",
		...props,
		children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("g", {
			clipPath: `url(#${iconId}-claudecodelight__a)`,
			children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
				fill: "#D97757",
				fillRule: "evenodd",
				d: "M91.7428 55.7339H102.5V66.8494H91.75V77.6998H86.4216V88.1667H81V77.6998H75.6716V88.1667H70.25V77.6998H48.75V88.1667H43.332V77.6998H38V88.1667H32.5784V77.6998H27.25V66.8458H16.5V55.7375H27.25V34.4167H91.7428V55.7339ZM38 55.7339H43.332V45.5322H38V55.7339ZM75.6608 55.7339H81V45.5322H75.6608V55.7339Z",
				clipRule: "evenodd"
			})
		}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("defs", { children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("clipPath", {
			id: `${iconId}-claudecodelight__a`,
			children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
				fill: "#fff",
				d: "M0 0H86V86H0z",
				transform: "translate(16.5 16.5)"
			})
		}) })]
	});
};
//#endregion
//#region src/components/icons/providers/claude-code/avatar.tsx
function ClaudeCodeAvatar({ size = 32, shape = "circle", className }) {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(require_avatar.Avatar, {
		className: require_avatar.cn("overflow-hidden", shape === "circle" ? "rounded-full" : "rounded-[20%]", className),
		style: {
			width: size,
			height: size
		},
		children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(require_avatar.AvatarFallback, {
			className: "text-foreground bg-background",
			children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ClaudeCodeLight, { style: {
				width: size,
				height: size
			} })
		})
	});
}
//#endregion
//#region src/components/icons/providers/claude-code/index.tsx
var claude_code_exports = /* @__PURE__ */ require_avatar.__exportAll({
	ClaudeCodeIcon: () => ClaudeCodeIcon,
	default: () => ClaudeCodeIcon
});
const ClaudeCode = ({ variant, className, ...props }) => {
	if (variant === "light") return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ClaudeCodeLight, {
		...props,
		className
	});
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ClaudeCodeLight, {
		...props,
		className
	});
};
const ClaudeCodeIcon = /*#__PURE__*/ Object.assign(ClaudeCode, {
	Avatar: ClaudeCodeAvatar,
	colorPrimary: "#D97757"
});
//#endregion
Object.defineProperty(exports, "ClaudeCodeIcon", {
	enumerable: true,
	get: function() {
		return ClaudeCodeIcon;
	}
});
Object.defineProperty(exports, "claude_code_exports", {
	enumerable: true,
	get: function() {
		return claude_code_exports;
	}
});
