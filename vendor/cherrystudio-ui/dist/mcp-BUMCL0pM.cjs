const require_avatar = require("./avatar-DqAhynaP.cjs");
let react_jsx_runtime = require("react/jsx-runtime");
//#region src/components/icons/providers/mcp/dark.tsx
const McpDark = (props) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
	xmlns: "http://www.w3.org/2000/svg",
	width: "1em",
	height: "1em",
	fill: "none",
	viewBox: "0 0 120 120",
	...props,
	children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
		stroke: "#fff",
		strokeLinecap: "round",
		strokeWidth: 4.589,
		d: "M32.6274 57.9434 58.5879 31.9829C62.1723 28.3985 67.9839 28.3985 71.568 31.9829 75.1526 35.5673 75.1526 41.3788 71.568 44.9632L51.9626 64.5688M52.2336 64.2985 71.5684 44.9632C75.153 41.3788 80.9649 41.3788 84.549 44.9632L84.6842 45.0984C88.2688 48.6828 88.2688 54.4943 84.6842 58.0786L61.2053 81.5578C60.0105 82.7525 60.0105 84.6895 61.2053 85.8842L66.0265 90.7054"
	}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
		stroke: "#fff",
		strokeLinecap: "round",
		strokeWidth: 4.589,
		d: "M65.0781 38.473L45.8781 57.673C42.2937 61.2574 42.2937 67.0686 45.8781 70.6531C49.4625 74.2377 55.2739 74.2377 58.8584 70.6531L78.0583 51.4533"
	})]
});
//#endregion
//#region src/components/icons/providers/mcp/light.tsx
const McpLight = (props) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
	xmlns: "http://www.w3.org/2000/svg",
	width: "1em",
	height: "1em",
	fill: "none",
	viewBox: "0 0 120 120",
	...props,
	children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
		stroke: "#020202",
		strokeLinecap: "round",
		strokeWidth: 4.589,
		d: "M32.6274 57.9434 58.5879 31.9829C62.1723 28.3985 67.9839 28.3985 71.568 31.9829 75.1526 35.5673 75.1526 41.3788 71.568 44.9632L51.9626 64.5688M52.2336 64.2985 71.5684 44.9632C75.153 41.3788 80.9649 41.3788 84.549 44.9632L84.6842 45.0984C88.2688 48.6828 88.2688 54.4943 84.6842 58.0786L61.2053 81.5578C60.0105 82.7525 60.0105 84.6895 61.2053 85.8842L66.0265 90.7054"
	}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
		stroke: "#020202",
		strokeLinecap: "round",
		strokeWidth: 4.589,
		d: "M65.0781 38.473L45.8781 57.673C42.2937 61.2574 42.2937 67.0686 45.8781 70.6531C49.4625 74.2377 55.2739 74.2377 58.8584 70.6531L78.0583 51.4533"
	})]
});
//#endregion
//#region src/components/icons/providers/mcp/avatar.tsx
function McpAvatar({ size = 32, shape = "circle", className }) {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(require_avatar.Avatar, {
		className: require_avatar.cn("overflow-hidden", shape === "circle" ? "rounded-full" : "rounded-[20%]", className),
		style: {
			width: size,
			height: size
		},
		children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(require_avatar.AvatarFallback, {
			className: "text-foreground bg-background",
			children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(McpLight, {
				className: "dark:hidden",
				style: {
					width: size,
					height: size
				}
			}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(McpDark, {
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
//#region src/components/icons/providers/mcp/index.tsx
var mcp_exports = /* @__PURE__ */ require_avatar.__exportAll({
	McpIcon: () => McpIcon,
	default: () => McpIcon
});
const Mcp = ({ variant, className, ...props }) => {
	if (variant === "light") return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(McpLight, {
		...props,
		className
	});
	if (variant === "dark") return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(McpDark, {
		...props,
		className
	});
	return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(McpLight, {
		className: require_avatar.cn("dark:hidden", className),
		...props
	}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(McpDark, {
		className: require_avatar.cn("hidden dark:block", className),
		...props
	})] });
};
const McpIcon = /*#__PURE__*/ Object.assign(Mcp, {
	Avatar: McpAvatar,
	colorPrimary: "#020202"
});
//#endregion
Object.defineProperty(exports, "McpIcon", {
	enumerable: true,
	get: function() {
		return McpIcon;
	}
});
Object.defineProperty(exports, "mcp_exports", {
	enumerable: true,
	get: function() {
		return mcp_exports;
	}
});
