const require_avatar = require("./avatar-DqAhynaP.cjs");
let react_jsx_runtime = require("react/jsx-runtime");
//#region src/components/icons/models/baai/dark.tsx
const BaaiDark = (props) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("svg", {
	xmlns: "http://www.w3.org/2000/svg",
	width: "1em",
	height: "1em",
	fill: "none",
	viewBox: "0 0 24 24",
	...props,
	children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
		fill: "#fff",
		fillRule: "evenodd",
		d: "M4 7.12L9.74 4L12.1287 5.336L14.1953 4.17933L20 7.42667V13.2273L17.612 14.5633V16.876L12.0253 20L6.37067 16.9867V14.422L4 13.2667V7.12ZM4.856 8.10133V10.0573L10.1467 12.7893L10.1253 13.7353L4.856 11.0153V12.7873L11.5513 16.3227V11.8467L4.856 8.10133ZM12.0167 11.1227L18.544 7.56933L16.7907 6.58933L11.8587 9.34733L11.0247 8.85667L15.9353 6.11L14.1953 5.13667L7.658 8.69667L12.0167 11.1233V11.1227ZM6.8 8.21867L11.2727 5.81467L9.74 4.95733L5.264 7.364L6.8 8.21867ZM14.16 17.848L12.4147 18.8247V11.96L16.756 9.532V16.3973L15.016 17.3707V11.8767L14.1607 12.3313V17.8493L14.16 17.848ZM7.22667 14.9013L11.5513 17.28V18.7667L7.22667 16.5087V14.902V14.9013ZM19.144 12.748V8.19467L17.612 9.05333V13.606L19.144 12.7487V12.748Z",
		clipRule: "evenodd"
	})
});
//#endregion
//#region src/components/icons/models/baai/light.tsx
const BaaiLight = (props) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("svg", {
	xmlns: "http://www.w3.org/2000/svg",
	width: "1em",
	height: "1em",
	fill: "none",
	viewBox: "0 0 24 24",
	...props,
	children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
		fill: "#000",
		fillRule: "evenodd",
		d: "M4 7.12L9.74 4L12.1287 5.336L14.1953 4.17933L20 7.42667V13.2273L17.612 14.5633V16.876L12.0253 20L6.37067 16.9867V14.422L4 13.2667V7.12ZM4.856 8.10133V10.0573L10.1467 12.7893L10.1253 13.7353L4.856 11.0153V12.7873L11.5513 16.3227V11.8467L4.856 8.10133ZM12.0167 11.1227L18.544 7.56933L16.7907 6.58933L11.8587 9.34733L11.0247 8.85667L15.9353 6.11L14.1953 5.13667L7.658 8.69667L12.0167 11.1233V11.1227ZM6.8 8.21867L11.2727 5.81467L9.74 4.95733L5.264 7.364L6.8 8.21867ZM14.16 17.848L12.4147 18.8247V11.96L16.756 9.532V16.3973L15.016 17.3707V11.8767L14.1607 12.3313V17.8493L14.16 17.848ZM7.22667 14.9013L11.5513 17.28V18.7667L7.22667 16.5087V14.902V14.9013ZM19.144 12.748V8.19467L17.612 9.05333V13.606L19.144 12.7487V12.748Z",
		clipRule: "evenodd"
	})
});
//#endregion
//#region src/components/icons/models/baai/avatar.tsx
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
//#region src/components/icons/models/baai/index.tsx
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
exports.BaaiIcon = BaaiIcon;
