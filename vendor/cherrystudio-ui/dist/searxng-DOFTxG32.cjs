const require_avatar = require("./avatar-DqAhynaP.cjs");
let react = require("react");
let react_jsx_runtime = require("react/jsx-runtime");
//#region src/components/icons/providers/searxng/light.tsx
const SearxngLight = (props) => {
	const iconId = (0, react.useId)();
	return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
		xmlns: "http://www.w3.org/2000/svg",
		width: "1em",
		height: "1em",
		fill: "none",
		viewBox: "0 0 120 120",
		...props,
		children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("mask", {
			id: `${iconId}-searxnglight__a`,
			width: 65,
			height: 65,
			x: 28,
			y: 28,
			maskUnits: "userSpaceOnUse",
			style: { maskType: "luminance" },
			children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
				fill: "#fff",
				d: "M93 28H28V93H93V28Z"
			})
		}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("g", {
			mask: `url(#${iconId}-searxnglight__a)`,
			children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("mask", {
				id: `${iconId}-searxnglight__b`,
				width: 65,
				height: 65,
				x: 28,
				y: 28,
				maskUnits: "userSpaceOnUse",
				style: { maskType: "luminance" },
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
					fill: "#fff",
					d: "M93 28H28V93H93V28Z"
				})
			}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("g", {
				mask: `url(#${iconId}-searxnglight__b)`,
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
					fill: "#3050FF",
					d: "M52.7792 28C66.4646 28 77.5584 39.2234 77.5584 53.0682C77.5584 57.4674 76.438 61.6017 74.4704 65.1957L92.9282 83.081L83.6996 92.8292L65.1104 74.8168C61.4791 76.9284 57.2684 78.1364 52.7792 78.1364C39.0941 78.1364 28 66.9131 28 53.0682C28 39.2234 39.0941 28 52.7792 28ZM52.7792 35.1623C43.0041 35.1623 35.0797 43.1791 35.0797 53.0682C35.0797 62.9575 43.0041 70.9742 52.7792 70.9742C62.5545 70.9742 70.4789 62.9575 70.4789 53.0682C70.4789 43.1791 62.5545 35.1623 52.7792 35.1623ZM46.0145 40.0269C48.7596 38.5902 51.8863 38.0776 54.9393 38.5636C57.9924 39.0495 60.8123 40.5088 62.9884 42.7288C65.1648 44.9488 66.5837 47.8138 67.0387 50.9064C67.4937 53.9989 66.9613 57.1576 65.5183 59.9226L63.9532 59.0868L62.3877 58.2507C63.4789 56.1602 63.8817 53.7718 63.5377 51.4336C63.1934 49.0952 62.1204 46.9292 60.4751 45.2506C58.8298 43.5721 56.6975 42.4687 54.389 42.1012C52.0807 41.7337 49.7166 42.1213 47.6413 43.2075L46.8279 41.6173L46.0145 40.0269Z"
				})
			})]
		})]
	});
};
//#endregion
//#region src/components/icons/providers/searxng/avatar.tsx
function SearxngAvatar({ size = 32, shape = "circle", className }) {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(require_avatar.Avatar, {
		className: require_avatar.cn("overflow-hidden", shape === "circle" ? "rounded-full" : "rounded-[20%]", className),
		style: {
			width: size,
			height: size
		},
		children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(require_avatar.AvatarFallback, {
			className: "text-foreground bg-background",
			children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(SearxngLight, { style: {
				width: size,
				height: size
			} })
		})
	});
}
//#endregion
//#region src/components/icons/providers/searxng/index.tsx
var searxng_exports = /* @__PURE__ */ require_avatar.__exportAll({
	SearxngIcon: () => SearxngIcon,
	default: () => SearxngIcon
});
const Searxng = ({ variant, className, ...props }) => {
	if (variant === "light") return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(SearxngLight, {
		...props,
		className
	});
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(SearxngLight, {
		...props,
		className
	});
};
const SearxngIcon = /*#__PURE__*/ Object.assign(Searxng, {
	Avatar: SearxngAvatar,
	colorPrimary: "#3050FF"
});
//#endregion
Object.defineProperty(exports, "SearxngIcon", {
	enumerable: true,
	get: function() {
		return SearxngIcon;
	}
});
Object.defineProperty(exports, "searxng_exports", {
	enumerable: true,
	get: function() {
		return searxng_exports;
	}
});
