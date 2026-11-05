const require_avatar = require("./avatar-DqAhynaP.cjs");
let react_jsx_runtime = require("react/jsx-runtime");
//#region src/components/icons/providers/voyage/dark.tsx
const VoyageDark = (props) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("svg", {
	xmlns: "http://www.w3.org/2000/svg",
	width: "1em",
	height: "1em",
	fill: "none",
	viewBox: "0 0 120 120",
	...props,
	children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
		fill: "#F7FEFF",
		d: "M40.8797 28V28.1787C40.8084 28.3934 40.7649 28.6164 40.7503 28.8423C40.7207 29.1402 40.7072 29.4057 40.7072 29.6412C40.7072 30.5593 40.8231 31.5777 41.0522 32.7017C41.3137 33.7985 41.7908 35.1717 42.4836 36.8292L61.6901 81.1538L80.2469 37.1812C80.6809 36.0871 81.1445 34.89 81.6351 33.5873C82.1258 32.2873 82.3711 30.971 82.3711 29.6385C82.3811 29.1387 82.2932 28.6418 82.1122 28.176V28H91V28.1787C90.4501 28.7393 89.7866 29.7442 89.005 31.1958C88.2233 32.6448 87.3714 34.4323 86.4469 36.5637L61.6038 93H58.1345L34.5934 38.7385C34.0435 37.4656 33.4667 36.2388 32.8575 35.0552C32.2806 33.8717 31.7307 32.8073 31.2131 31.8593C30.6902 30.8843 30.2292 30.0718 29.8249 29.4218C29.5704 28.9925 29.295 28.5758 29 28.1733V28H40.8797Z"
	})
});
//#endregion
//#region src/components/icons/providers/voyage/light.tsx
const VoyageLight = (props) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("svg", {
	xmlns: "http://www.w3.org/2000/svg",
	width: "1em",
	height: "1em",
	fill: "none",
	viewBox: "0 0 120 120",
	...props,
	children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
		fill: "#012E33",
		d: "M40.8797 28V28.1787C40.8084 28.3934 40.7649 28.6164 40.7503 28.8423C40.7207 29.1402 40.7072 29.4057 40.7072 29.6412C40.7072 30.5593 40.8231 31.5777 41.0522 32.7017C41.3137 33.7985 41.7908 35.1717 42.4836 36.8292L61.6901 81.1538L80.2469 37.1812C80.6809 36.0871 81.1445 34.89 81.6351 33.5873C82.1258 32.2873 82.3711 30.971 82.3711 29.6385C82.3811 29.1387 82.2932 28.6418 82.1122 28.176V28H91V28.1787C90.4501 28.7393 89.7866 29.7442 89.005 31.1958C88.2233 32.6448 87.3714 34.4323 86.4469 36.5637L61.6038 93H58.1345L34.5934 38.7385C34.0435 37.4656 33.4667 36.2388 32.8575 35.0552C32.2806 33.8717 31.7307 32.8073 31.2131 31.8593C30.6902 30.8843 30.2292 30.0718 29.8249 29.4218C29.5704 28.9925 29.295 28.5758 29 28.1733V28H40.8797Z"
	})
});
//#endregion
//#region src/components/icons/providers/voyage/avatar.tsx
function VoyageAvatar({ size = 32, shape = "circle", className }) {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(require_avatar.Avatar, {
		className: require_avatar.cn("overflow-hidden", shape === "circle" ? "rounded-full" : "rounded-[20%]", className),
		style: {
			width: size,
			height: size
		},
		children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(require_avatar.AvatarFallback, {
			className: "text-foreground bg-background",
			children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(VoyageLight, {
				className: "dark:hidden",
				style: {
					width: size,
					height: size
				}
			}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(VoyageDark, {
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
//#region src/components/icons/providers/voyage/index.tsx
var voyage_exports = /* @__PURE__ */ require_avatar.__exportAll({
	VoyageIcon: () => VoyageIcon,
	default: () => VoyageIcon
});
const Voyage = ({ variant, className, ...props }) => {
	if (variant === "light") return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(VoyageLight, {
		...props,
		className
	});
	if (variant === "dark") return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(VoyageDark, {
		...props,
		className
	});
	return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(VoyageLight, {
		className: require_avatar.cn("dark:hidden", className),
		...props
	}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(VoyageDark, {
		className: require_avatar.cn("hidden dark:block", className),
		...props
	})] });
};
const VoyageIcon = /*#__PURE__*/ Object.assign(Voyage, {
	Avatar: VoyageAvatar,
	colorPrimary: "#012E33"
});
//#endregion
Object.defineProperty(exports, "VoyageIcon", {
	enumerable: true,
	get: function() {
		return VoyageIcon;
	}
});
Object.defineProperty(exports, "voyage_exports", {
	enumerable: true,
	get: function() {
		return voyage_exports;
	}
});
