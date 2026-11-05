const require_avatar = require("./avatar-DqAhynaP.cjs");
let react_jsx_runtime = require("react/jsx-runtime");
//#region src/components/icons/models/inflection/dark.tsx
const InflectionDark = (props) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("svg", {
	xmlns: "http://www.w3.org/2000/svg",
	width: "1em",
	height: "1em",
	fill: "none",
	viewBox: "0 0 24 24",
	...props,
	children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
		fill: "#fff",
		fillRule: "evenodd",
		d: "M9.5829 20C9.21599 20 9.00069 19.7947 9.00069 19.4507V19.27C9.00069 18.9273 9.17238 18.7667 9.49083 18.6527L10.2004 18.424C10.6906 18.2433 10.8609 18.0353 10.8609 17.5553V6.44467C10.8609 5.96467 10.6906 5.75867 10.2004 5.576L9.48529 5.34667C9.16684 5.23267 9 5.07467 9 4.72933V4.54933C9.00069 4.206 9.22084 4 9.58775 4H14.4116C14.7792 4 15 4.206 15 4.54933V4.73C15 5.07267 14.8276 5.23333 14.5092 5.34733L13.7954 5.574C13.2811 5.75533 13.1087 5.96267 13.1087 6.44267V17.552C13.1087 18.032 13.2811 18.2373 13.7954 18.4207L14.5043 18.6487C14.8228 18.7633 14.9945 18.9207 14.9945 19.266V19.4473C14.9945 19.7907 14.7743 19.9967 14.406 19.9967L9.58359 20H9.5829Z",
		clipRule: "evenodd"
	})
});
//#endregion
//#region src/components/icons/models/inflection/light.tsx
const InflectionLight = (props) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("svg", {
	xmlns: "http://www.w3.org/2000/svg",
	width: "1em",
	height: "1em",
	fill: "none",
	viewBox: "0 0 24 24",
	...props,
	children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
		fill: "#000",
		fillRule: "evenodd",
		d: "M9.5829 20C9.21599 20 9.00069 19.7947 9.00069 19.4507V19.27C9.00069 18.9273 9.17238 18.7667 9.49083 18.6527L10.2004 18.424C10.6906 18.2433 10.8609 18.0353 10.8609 17.5553V6.44467C10.8609 5.96467 10.6906 5.75867 10.2004 5.576L9.48529 5.34667C9.16684 5.23267 9 5.07467 9 4.72933V4.54933C9.00069 4.206 9.22084 4 9.58775 4H14.4116C14.7792 4 15 4.206 15 4.54933V4.73C15 5.07267 14.8276 5.23333 14.5092 5.34733L13.7954 5.574C13.2811 5.75533 13.1087 5.96267 13.1087 6.44267V17.552C13.1087 18.032 13.2811 18.2373 13.7954 18.4207L14.5043 18.6487C14.8228 18.7633 14.9945 18.9207 14.9945 19.266V19.4473C14.9945 19.7907 14.7743 19.9967 14.406 19.9967L9.58359 20H9.5829Z",
		clipRule: "evenodd"
	})
});
//#endregion
//#region src/components/icons/models/inflection/avatar.tsx
function InflectionAvatar({ size = 32, shape = "circle", className }) {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(require_avatar.Avatar, {
		className: require_avatar.cn("overflow-hidden", shape === "circle" ? "rounded-full" : "rounded-[20%]", className),
		style: {
			width: size,
			height: size
		},
		children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(require_avatar.AvatarFallback, {
			className: "text-foreground bg-background",
			children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(InflectionLight, {
				className: "dark:hidden",
				style: {
					width: size,
					height: size
				}
			}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(InflectionDark, {
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
//#region src/components/icons/models/inflection/index.tsx
const Inflection = ({ variant, className, ...props }) => {
	if (variant === "light") return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(InflectionLight, {
		...props,
		className
	});
	if (variant === "dark") return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(InflectionDark, {
		...props,
		className
	});
	return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(InflectionLight, {
		className: require_avatar.cn("dark:hidden", className),
		...props
	}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(InflectionDark, {
		className: require_avatar.cn("hidden dark:block", className),
		...props
	})] });
};
const InflectionIcon = /*#__PURE__*/ Object.assign(Inflection, {
	Avatar: InflectionAvatar,
	colorPrimary: "#000000"
});
//#endregion
exports.InflectionIcon = InflectionIcon;
