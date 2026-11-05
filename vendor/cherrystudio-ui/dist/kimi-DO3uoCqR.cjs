const require_avatar = require("./avatar-DqAhynaP.cjs");
let react_jsx_runtime = require("react/jsx-runtime");
//#region src/components/icons/models/kimi/dark.tsx
const KimiDark = (props) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
	xmlns: "http://www.w3.org/2000/svg",
	width: "1em",
	height: "1em",
	fill: "none",
	viewBox: "0 0 24 24",
	...props,
	children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
		fill: "#027AFF",
		fillRule: "evenodd",
		d: "M16.9886 8.40141C17.1046 8.25253 17.2065 8.11652 17.314 7.98485C17.3639 7.92288 17.3596 7.87575 17.3111 7.81103C16.8447 7.19781 16.8006 6.51697 17.069 5.82616C17.2706 5.30628 17.7164 5.06262 18.2612 5.01076C18.6008 4.97873 18.9342 5.01352 19.2433 5.17868C19.6493 5.39595 19.8856 5.72718 19.9625 6.1843C20.0238 6.54901 20.0124 6.90505 19.9092 7.25833C19.7261 7.88363 19.2767 8.20764 18.6607 8.28956C18.1494 8.35795 17.6309 8.36649 17.1152 8.40141C17.0755 8.4043 17.0348 8.40141 16.9886 8.40141Z",
		clipRule: "evenodd"
	}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
		fill: "#fff",
		fillRule: "evenodd",
		d: "M15.7239 5.60089H12.643L10.2038 11.1631H6.75549V5.62518H4V19.9556H6.75615V13.9185H11.6161C12.4529 13.9185 13.217 13.4306 13.5696 12.6722V19.9556H16.3257V13.9185C16.3257 12.4821 15.2033 11.2742 13.7704 11.1695V11.1623H12.257C12.6217 11.0378 12.9568 10.8395 13.2414 10.5798C13.5261 10.32 13.7542 10.0044 13.9114 9.65254L15.7239 5.60089Z",
		clipRule: "evenodd"
	})]
});
//#endregion
//#region src/components/icons/models/kimi/light.tsx
const KimiLight = (props) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
	xmlns: "http://www.w3.org/2000/svg",
	width: "1em",
	height: "1em",
	fill: "none",
	viewBox: "0 0 24 24",
	...props,
	children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
		fill: "#027AFF",
		fillRule: "evenodd",
		d: "M16.9886 8.40141C17.1047 8.25253 17.2065 8.11652 17.3141 7.98485C17.3639 7.92288 17.3596 7.87575 17.3112 7.81103C16.8447 7.19781 16.8006 6.51697 17.0691 5.82616C17.2706 5.30628 17.7164 5.06262 18.2613 5.01076C18.6009 4.97873 18.9342 5.01352 19.2434 5.17868C19.6493 5.39595 19.8856 5.72718 19.9625 6.1843C20.0239 6.54901 20.0124 6.90505 19.9092 7.25833C19.7261 7.88363 19.2767 8.20764 18.6608 8.28956C18.1494 8.35795 17.631 8.36649 17.1153 8.40141C17.0755 8.4043 17.0348 8.40141 16.9886 8.40141Z",
		clipRule: "evenodd"
	}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
		fill: "#000",
		fillRule: "evenodd",
		d: "M15.7239 5.60089H12.643L10.2038 11.1631H6.75549V5.62518H4V19.9556H6.75615V13.9185H11.6161C12.4529 13.9185 13.217 13.4306 13.5696 12.6722V19.9556H16.3257V13.9185C16.3257 12.4821 15.2033 11.2742 13.7704 11.1695V11.1623H12.257C12.6217 11.0378 12.9568 10.8395 13.2414 10.5798C13.5261 10.32 13.7542 10.0044 13.9114 9.65254L15.7239 5.60089Z",
		clipRule: "evenodd"
	})]
});
//#endregion
//#region src/components/icons/models/kimi/avatar.tsx
function KimiAvatar({ size = 32, shape = "circle", className }) {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(require_avatar.Avatar, {
		className: require_avatar.cn("overflow-hidden", shape === "circle" ? "rounded-full" : "rounded-[20%]", className),
		style: {
			width: size,
			height: size
		},
		children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(require_avatar.AvatarFallback, {
			className: "text-foreground bg-background",
			children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(KimiLight, {
				className: "dark:hidden",
				style: {
					width: size,
					height: size
				}
			}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(KimiDark, {
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
//#region src/components/icons/models/kimi/index.tsx
const Kimi = ({ variant, className, ...props }) => {
	if (variant === "light") return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(KimiLight, {
		...props,
		className
	});
	if (variant === "dark") return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(KimiDark, {
		...props,
		className
	});
	return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(KimiLight, {
		className: require_avatar.cn("dark:hidden", className),
		...props
	}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(KimiDark, {
		className: require_avatar.cn("hidden dark:block", className),
		...props
	})] });
};
const KimiIcon = /*#__PURE__*/ Object.assign(Kimi, {
	Avatar: KimiAvatar,
	colorPrimary: "#027AFF"
});
//#endregion
exports.KimiIcon = KimiIcon;
