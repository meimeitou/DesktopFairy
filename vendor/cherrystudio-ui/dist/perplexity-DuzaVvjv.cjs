const require_avatar = require("./avatar-DqAhynaP.cjs");
let react_jsx_runtime = require("react/jsx-runtime");
//#region src/components/icons/models/perplexity/light.tsx
const PerplexityLight = (props) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("svg", {
	xmlns: "http://www.w3.org/2000/svg",
	width: "1em",
	height: "1em",
	fill: "none",
	viewBox: "0 0 24 24",
	...props,
	children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
		fill: "#22B8CD",
		d: "M17.19 4V8.848H19V15.7467H17.0433V20L12.352 15.8707V19.9673H11.6247V15.866L6.928 20V15.69H5V8.792H6.92267V4L11.6247 8.32933V4.12667H12.3513V8.45333L17.19 4ZM12.352 10.0293V14.9087L16.316 18.398V13.6267L12.352 10.0293ZM11.6193 9.976L7.65533 13.5747V18.398L11.6193 14.9087V9.97667V9.976ZM17.0433 15.0293H18.2727V9.566H12.9733L17.0433 13.2593V15.0293ZM11.0553 9.50933H5.72667V14.9727H6.92667V13.2553L11.0547 9.50867L11.0553 9.50933ZM7.65 5.65067V8.79067H11.06L7.65 5.65067ZM16.4627 5.65067L13.0527 8.79067H16.4627V5.65067Z"
	})
});
//#endregion
//#region src/components/icons/models/perplexity/avatar.tsx
function PerplexityAvatar({ size = 32, shape = "circle", className }) {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(require_avatar.Avatar, {
		className: require_avatar.cn("overflow-hidden", shape === "circle" ? "rounded-full" : "rounded-[20%]", className),
		style: {
			width: size,
			height: size
		},
		children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(require_avatar.AvatarFallback, {
			className: "text-foreground bg-background",
			children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(PerplexityLight, { style: {
				width: size,
				height: size
			} })
		})
	});
}
//#endregion
//#region src/components/icons/models/perplexity/index.tsx
const Perplexity = ({ variant, className, ...props }) => {
	if (variant === "light") return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(PerplexityLight, {
		...props,
		className
	});
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(PerplexityLight, {
		...props,
		className
	});
};
const PerplexityIcon = /*#__PURE__*/ Object.assign(Perplexity, {
	Avatar: PerplexityAvatar,
	colorPrimary: "#22B8CD"
});
//#endregion
exports.PerplexityIcon = PerplexityIcon;
