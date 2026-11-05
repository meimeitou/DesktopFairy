const require_avatar = require("./avatar-DqAhynaP.cjs");
let react = require("react");
let react_jsx_runtime = require("react/jsx-runtime");
//#region src/components/icons/providers/baai/dark.tsx
const BaaiDark = (props) => {
	const iconId = (0, react.useId)();
	return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
		xmlns: "http://www.w3.org/2000/svg",
		width: "1em",
		height: "1em",
		fill: "none",
		viewBox: "0 0 120 120",
		...props,
		children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("mask", {
			id: `${iconId}-baaidark__a`,
			width: 65,
			height: 65,
			x: 27,
			y: 27,
			maskUnits: "userSpaceOnUse",
			style: { maskType: "luminance" },
			children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
				fill: "#fff",
				d: "M92 27H27V92H92V27Z"
			})
		}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("g", {
			mask: `url(#${iconId}-baaidark__a)`,
			children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
				fill: "#fff",
				fillRule: "evenodd",
				d: "M27 39.675L50.3188 27L60.0227 32.4275L68.4185 27.7285L92 40.9208V64.486L82.2987 69.9135V79.3088L59.6029 92L36.6308 79.7583V69.3393L27 64.6458V39.675ZM30.4775 43.6617V51.6079L51.9708 62.7067L51.8842 66.5498L30.4775 55.4998V62.6985L57.6773 77.0608V58.8771L30.4775 43.6617ZM59.5677 55.9358L86.085 41.5004L78.9621 37.5192L58.9258 48.7235L55.5377 46.7302L75.4873 35.5718L68.4185 31.6177L41.8606 46.0802L59.5677 55.9385V55.9358ZM38.375 44.1383L56.5452 34.3721L50.3188 30.8892L32.135 40.6663L38.375 44.1383ZM68.275 83.2575L61.1846 87.2252V59.3375L78.8212 49.4738V77.3642L71.7525 81.3183V58.999L68.2777 60.846V83.2629L68.275 83.2575ZM40.1083 71.2867L57.6773 80.95V86.9896L40.1083 77.8165V71.2894V71.2867ZM88.5225 62.5388V44.0408L82.2987 47.5292V66.0244L88.5225 62.5415V62.5388Z",
				clipRule: "evenodd"
			})
		})]
	});
};
//#endregion
//#region src/components/icons/providers/baai/light.tsx
const BaaiLight = (props) => {
	const iconId = (0, react.useId)();
	return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
		xmlns: "http://www.w3.org/2000/svg",
		width: "1em",
		height: "1em",
		fill: "none",
		viewBox: "0 0 120 120",
		...props,
		children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("mask", {
			id: `${iconId}-baailight__a`,
			width: 65,
			height: 65,
			x: 27,
			y: 27,
			maskUnits: "userSpaceOnUse",
			style: { maskType: "luminance" },
			children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
				fill: "#fff",
				d: "M92 27H27V92H92V27Z"
			})
		}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("g", {
			mask: `url(#${iconId}-baailight__a)`,
			children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
				fill: "#000",
				fillRule: "evenodd",
				d: "M27 39.675L50.3188 27L60.0227 32.4275L68.4185 27.7285L92 40.9208V64.486L82.2987 69.9135V79.3088L59.6029 92L36.6308 79.7583V69.3393L27 64.6458V39.675ZM30.4775 43.6617V51.6079L51.9708 62.7067L51.8842 66.5498L30.4775 55.4998V62.6985L57.6773 77.0608V58.8771L30.4775 43.6617ZM59.5677 55.9358L86.085 41.5004L78.9621 37.5192L58.9258 48.7235L55.5377 46.7302L75.4873 35.5718L68.4185 31.6177L41.8606 46.0802L59.5677 55.9385V55.9358ZM38.375 44.1383L56.5452 34.3721L50.3188 30.8892L32.135 40.6663L38.375 44.1383ZM68.275 83.2575L61.1846 87.2252V59.3375L78.8212 49.4738V77.3642L71.7525 81.3183V58.999L68.2777 60.846V83.2629L68.275 83.2575ZM40.1083 71.2867L57.6773 80.95V86.9896L40.1083 77.8165V71.2894V71.2867ZM88.5225 62.5388V44.0408L82.2987 47.5292V66.0244L88.5225 62.5415V62.5388Z",
				clipRule: "evenodd"
			})
		})]
	});
};
//#endregion
//#region src/components/icons/providers/baai/avatar.tsx
function BaaiAvatar({ size = 32, shape = "circle", className }) {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(require_avatar.Avatar, {
		className: require_avatar.cn("overflow-hidden", shape === "circle" ? "rounded-full" : "rounded-[20%]", className),
		style: {
			width: size,
			height: size
		},
		children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(require_avatar.AvatarFallback, {
			className: "text-foreground bg-background",
			children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(BaaiLight, {
				className: "dark:hidden",
				style: {
					width: size,
					height: size
				}
			}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(BaaiDark, {
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
//#region src/components/icons/providers/baai/index.tsx
var baai_exports = /* @__PURE__ */ require_avatar.__exportAll({
	BaaiIcon: () => BaaiIcon,
	default: () => BaaiIcon
});
const Baai = ({ variant, className, ...props }) => {
	if (variant === "light") return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(BaaiLight, {
		...props,
		className
	});
	if (variant === "dark") return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(BaaiDark, {
		...props,
		className
	});
	return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(BaaiLight, {
		className: require_avatar.cn("dark:hidden", className),
		...props
	}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(BaaiDark, {
		className: require_avatar.cn("hidden dark:block", className),
		...props
	})] });
};
const BaaiIcon = /*#__PURE__*/ Object.assign(Baai, {
	Avatar: BaaiAvatar,
	colorPrimary: "#000000"
});
//#endregion
Object.defineProperty(exports, "BaaiIcon", {
	enumerable: true,
	get: function() {
		return BaaiIcon;
	}
});
Object.defineProperty(exports, "baai_exports", {
	enumerable: true,
	get: function() {
		return baai_exports;
	}
});
