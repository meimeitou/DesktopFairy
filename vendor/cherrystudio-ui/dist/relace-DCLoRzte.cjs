const require_avatar = require("./avatar-DqAhynaP.cjs");
let react_jsx_runtime = require("react/jsx-runtime");
//#region src/components/icons/providers/relace/dark.tsx
const RelaceDark = (props) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("svg", {
	xmlns: "http://www.w3.org/2000/svg",
	width: "1em",
	height: "1em",
	fill: "none",
	viewBox: "0 0 120 120",
	...props,
	children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
		fill: "#fff",
		fillRule: "evenodd",
		d: "M92 93H27V28H92V93ZM32.7969 70.0491C38.6143 70.9355 47.6523 71.29 55.7832 69.5439C58.4541 68.9677 60.933 68.1847 63.14 67.1713C59.0184 57.1259 58.1912 50.1354 59.4054 45.3727C60.7823 39.9865 64.7207 37.7204 68.2632 37.685H68.2927C70.3254 37.685 74.5475 38.2079 77.3956 41.6736C80.359 45.2782 80.9884 50.9863 78.1639 59.3743C76.6748 63.7854 73.9182 67.1034 70.4998 69.5852C74.4086 78.4282 76.7339 82.8748 78.1461 85.197C78.805 86.2813 79.2452 86.8634 79.5259 87.2031H86.2031V33.7968H32.7969V70.0491ZM65.4446 72.4925C62.75 73.7127 59.8693 74.5932 57.0034 75.2107C48.4057 77.0602 39.1019 76.7677 32.7969 75.902V87.2031H72.5975C71.0405 84.485 68.795 80.0443 65.4446 72.4925ZM68.3105 43.4789C67.3561 43.4936 65.74 44.0136 65.025 46.8086C64.2864 49.6893 64.5493 55.0104 68.142 64.0632C70.225 62.2964 71.7849 60.1365 72.6654 57.5248C75.23 49.9138 74.0098 46.6816 72.9196 45.355C71.72 43.8954 69.6991 43.4818 68.3105 43.4789Z",
		clipRule: "evenodd"
	})
});
//#endregion
//#region src/components/icons/providers/relace/light.tsx
const RelaceLight = (props) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("svg", {
	xmlns: "http://www.w3.org/2000/svg",
	width: "1em",
	height: "1em",
	fill: "none",
	viewBox: "0 0 120 120",
	...props,
	children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
		fill: "#000",
		fillRule: "evenodd",
		d: "M92 93H27V28H92V93ZM32.7969 70.0491C38.6143 70.9355 47.6523 71.29 55.7832 69.5439C58.4541 68.9677 60.933 68.1847 63.14 67.1713C59.0184 57.1259 58.1912 50.1354 59.4054 45.3727C60.7823 39.9865 64.7207 37.7204 68.2632 37.685H68.2927C70.3254 37.685 74.5475 38.2079 77.3956 41.6736C80.359 45.2782 80.9884 50.9863 78.1639 59.3743C76.6748 63.7854 73.9182 67.1034 70.4998 69.5852C74.4086 78.4282 76.7339 82.8748 78.1461 85.197C78.805 86.2813 79.2452 86.8634 79.5259 87.2031H86.2031V33.7968H32.7969V70.0491ZM65.4446 72.4925C62.75 73.7127 59.8693 74.5932 57.0034 75.2107C48.4057 77.0602 39.1019 76.7677 32.7969 75.902V87.2031H72.5975C71.0405 84.485 68.795 80.0443 65.4446 72.4925ZM68.3105 43.4789C67.3561 43.4936 65.74 44.0136 65.025 46.8086C64.2864 49.6893 64.5493 55.0104 68.142 64.0632C70.225 62.2964 71.7849 60.1365 72.6654 57.5248C75.23 49.9138 74.0098 46.6816 72.9196 45.355C71.72 43.8954 69.6991 43.4818 68.3105 43.4789Z",
		clipRule: "evenodd"
	})
});
//#endregion
//#region src/components/icons/providers/relace/avatar.tsx
function RelaceAvatar({ size = 32, shape = "circle", className }) {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(require_avatar.Avatar, {
		className: require_avatar.cn("overflow-hidden", shape === "circle" ? "rounded-full" : "rounded-[20%]", className),
		style: {
			width: size,
			height: size
		},
		children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(require_avatar.AvatarFallback, {
			className: "text-foreground bg-background",
			children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(RelaceLight, {
				className: "dark:hidden",
				style: {
					width: size,
					height: size
				}
			}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(RelaceDark, {
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
//#region src/components/icons/providers/relace/index.tsx
var relace_exports = /* @__PURE__ */ require_avatar.__exportAll({
	RelaceIcon: () => RelaceIcon,
	default: () => RelaceIcon
});
const Relace = ({ variant, className, ...props }) => {
	if (variant === "light") return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(RelaceLight, {
		...props,
		className
	});
	if (variant === "dark") return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(RelaceDark, {
		...props,
		className
	});
	return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(RelaceLight, {
		className: require_avatar.cn("dark:hidden", className),
		...props
	}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(RelaceDark, {
		className: require_avatar.cn("hidden dark:block", className),
		...props
	})] });
};
const RelaceIcon = /*#__PURE__*/ Object.assign(Relace, {
	Avatar: RelaceAvatar,
	colorPrimary: "#000000"
});
//#endregion
Object.defineProperty(exports, "RelaceIcon", {
	enumerable: true,
	get: function() {
		return RelaceIcon;
	}
});
Object.defineProperty(exports, "relace_exports", {
	enumerable: true,
	get: function() {
		return relace_exports;
	}
});
