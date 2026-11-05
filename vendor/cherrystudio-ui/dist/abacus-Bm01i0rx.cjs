const require_avatar = require("./avatar-DqAhynaP.cjs");
let react_jsx_runtime = require("react/jsx-runtime");
//#region src/components/icons/providers/abacus/light.tsx
const AbacusLight = (props) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
	xmlns: "http://www.w3.org/2000/svg",
	width: "1em",
	height: "1em",
	fill: "none",
	viewBox: "0 0 120 120",
	...props,
	children: [
		/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
			fill: "#000",
			d: "M0 0H120V120H0z"
		}),
		/* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
			width: 4.511,
			height: 11.688,
			x: 33.461,
			y: 73.546,
			fill: "#D1E4F5",
			rx: 2.256
		}),
		/* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
			width: 4.511,
			height: 13.738,
			x: 81.237,
			y: 36.227,
			fill: "#D1E4F5",
			rx: 2.256
		}),
		/* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
			width: 4.511,
			height: 31.987,
			x: 65.243,
			y: 27,
			fill: "#fff",
			rx: 2.256
		}),
		/* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
			width: 4.511,
			height: 19.274,
			x: 33.461,
			y: 36.227,
			fill: "#fff",
			rx: 2.256
		}),
		/* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
			width: 4.511,
			height: 15.994,
			x: 81.237,
			y: 68.01,
			fill: "#fff",
			rx: 2.256
		}),
		/* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
			width: 4.511,
			height: 31.987,
			x: 49.454,
			y: 60.013,
			fill: "#fff",
			rx: 2.256
		}),
		/* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
			width: 4.511,
			height: 13.533,
			x: 65.243,
			y: 78.467,
			fill: "#D1E4F5",
			rx: 2.256
		}),
		/* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
			width: 4.511,
			height: 13.943,
			x: 49.454,
			y: 28.025,
			fill: "#D1E4F5",
			rx: 2.256
		}),
		/* @__PURE__ */ (0, react_jsx_runtime.jsx)("circle", {
			cx: 35.716,
			cy: 64.729,
			r: 4.716,
			fill: "#238BFE"
		}),
		/* @__PURE__ */ (0, react_jsx_runtime.jsx)("circle", {
			cx: 51.607,
			cy: 50.478,
			r: 4.614,
			fill: "#D930A5"
		}),
		/* @__PURE__ */ (0, react_jsx_runtime.jsx)("circle", {
			cx: 67.601,
			cy: 69.137,
			r: 4.614,
			fill: "#25E3E1"
		}),
		/* @__PURE__ */ (0, react_jsx_runtime.jsx)("circle", {
			cx: 83.492,
			cy: 58.987,
			r: 4.511,
			fill: "#B636FB"
		})
	]
});
//#endregion
//#region src/components/icons/providers/abacus/avatar.tsx
function AbacusAvatar({ size = 32, shape = "circle", className }) {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(require_avatar.Avatar, {
		className: require_avatar.cn("overflow-hidden", shape === "circle" ? "rounded-full" : "rounded-[20%]", className),
		style: {
			width: size,
			height: size
		},
		children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(require_avatar.AvatarFallback, {
			className: "text-foreground",
			children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(AbacusLight, { style: {
				width: size,
				height: size
			} })
		})
	});
}
//#endregion
//#region src/components/icons/providers/abacus/index.tsx
var abacus_exports = /* @__PURE__ */ require_avatar.__exportAll({
	AbacusIcon: () => AbacusIcon,
	default: () => AbacusIcon
});
const Abacus = ({ variant, className, ...props }) => {
	if (variant === "light") return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(AbacusLight, {
		...props,
		className
	});
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(AbacusLight, {
		...props,
		className
	});
};
const AbacusIcon = /*#__PURE__*/ Object.assign(Abacus, {
	Avatar: AbacusAvatar,
	colorPrimary: "#D1E4F5"
});
//#endregion
Object.defineProperty(exports, "AbacusIcon", {
	enumerable: true,
	get: function() {
		return AbacusIcon;
	}
});
Object.defineProperty(exports, "abacus_exports", {
	enumerable: true,
	get: function() {
		return abacus_exports;
	}
});
