const require_avatar = require("./avatar-DqAhynaP.cjs");
let react = require("react");
let react_jsx_runtime = require("react/jsx-runtime");
//#region src/components/icons/providers/vidu/light.tsx
const ViduLight = (props) => {
	const iconId = (0, react.useId)();
	return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
		xmlns: "http://www.w3.org/2000/svg",
		width: "1em",
		height: "1em",
		fill: "none",
		viewBox: "0 0 120 120",
		...props,
		children: [
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("mask", {
				id: `${iconId}-vidulight__a`,
				width: 65,
				height: 65,
				x: 27,
				y: 28,
				maskUnits: "userSpaceOnUse",
				style: { maskType: "luminance" },
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
					fill: "#fff",
					d: "M92 28H27V93H92V28Z"
				})
			}),
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("g", {
				mask: `url(#${iconId}-vidulight__a)`,
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
					fill: `url(#${iconId}-vidulight__b)`,
					d: "M82.811 34.0856C74.9108 31.4694 68.1156 37.0214 66.5313 42.1022C66.5313 42.1022 60.8302 60.4106 58.4008 68.0481C57.2416 71.6935 54.3681 77.6572 48.9568 77.6572C44.5504 77.6572 42.2863 73.5217 41.3302 71.0571L34.7598 53.5422C33.9988 51.6979 34.795 48.0172 37.8473 46.915C41.1081 45.745 43.2043 48.4722 43.746 49.9212L51.9306 70.8837C53.8806 68.3704 55.121 64.2808 55.9281 61.3856L50.5548 47.2752C48.0063 40.6912 41.2652 37.6958 35.0225 39.9979C29.966 41.8612 25.0991 48.2421 27.7452 56.2614L34.5268 73.7031C35.556 76.3464 39.6213 84.9779 48.8133 84.9779C59.8443 84.9779 63.9827 75.5719 66.2793 68.1375C67.4277 64.4189 73.7246 44.3122 73.7246 44.3122C74.64 41.3087 78.3558 40.4447 80.6796 41.2031C82.3181 41.7339 85.2783 43.9954 84.3223 47.5C84.1435 48.1392 79.1223 64.316 77.2698 69.2371C76.3029 71.8046 73.8518 77.3783 68.2673 76.6037C66.5665 80.3683 65.1527 82.5594 63.0131 84.5256C69.979 87.8244 80.1298 84.5012 84.4035 71.5906C85.9906 66.7887 91.5646 49.4744 91.5646 49.4744C93.1836 44.1579 90.2941 36.561 82.811 34.0856Z"
				})
			}),
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("defs", { children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("linearGradient", {
				id: `${iconId}-vidulight__b`,
				x1: 29.056,
				x2: 97.837,
				y1: 43.267,
				y2: 74.884,
				gradientUnits: "userSpaceOnUse",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("stop", { stopColor: "#40EDD8" }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("stop", {
						offset: .024,
						stopColor: "#38E7E2"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("stop", {
						offset: .084,
						stopColor: "#28DAF7"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("stop", {
						offset: .124,
						stopColor: "#22D5FF"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("stop", {
						offset: .36,
						stopColor: "#1ABFFF"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("stop", {
						offset: .85,
						stopColor: "#0786FE"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("stop", {
						offset: .909,
						stopColor: "#047FFE"
					})
				]
			}) })
		]
	});
};
//#endregion
//#region src/components/icons/providers/vidu/avatar.tsx
function ViduAvatar({ size = 32, shape = "circle", className }) {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(require_avatar.Avatar, {
		className: require_avatar.cn("overflow-hidden", shape === "circle" ? "rounded-full" : "rounded-[20%]", className),
		style: {
			width: size,
			height: size
		},
		children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(require_avatar.AvatarFallback, {
			className: "text-foreground bg-background",
			children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ViduLight, { style: {
				width: size,
				height: size
			} })
		})
	});
}
//#endregion
//#region src/components/icons/providers/vidu/index.tsx
var vidu_exports = /* @__PURE__ */ require_avatar.__exportAll({
	ViduIcon: () => ViduIcon,
	default: () => ViduIcon
});
const Vidu = ({ variant, className, ...props }) => {
	if (variant === "light") return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ViduLight, {
		...props,
		className
	});
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ViduLight, {
		...props,
		className
	});
};
const ViduIcon = /*#__PURE__*/ Object.assign(Vidu, {
	Avatar: ViduAvatar,
	colorPrimary: "#000000"
});
//#endregion
Object.defineProperty(exports, "ViduIcon", {
	enumerable: true,
	get: function() {
		return ViduIcon;
	}
});
Object.defineProperty(exports, "vidu_exports", {
	enumerable: true,
	get: function() {
		return vidu_exports;
	}
});
