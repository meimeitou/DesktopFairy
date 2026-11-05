const require_avatar = require("./avatar-DqAhynaP.cjs");
let react_jsx_runtime = require("react/jsx-runtime");
//#region src/components/icons/models/menlo/light.tsx
const MenloLight = (props) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("svg", {
	xmlns: "http://www.w3.org/2000/svg",
	width: "1em",
	height: "1em",
	fill: "none",
	viewBox: "0 0 24 24",
	...props,
	children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
		fill: "#FF5C00",
		d: "M15.23 4.99467L16 6.024V11L15.23 12.0067L14.4605 11V6.024L15.2305 4.99467H15.23ZM11.4955 4.99467L12.274 6.024V11L11.4955 12.0067L10.7255 11V6.024L11.4955 4.99467ZM7.77 12.0067L7 10.9993V6.024L7.77 4.99467L8.5395 6.024V11L7.77 12.0067ZM7 13.0127L7.77 12.006L8.5395 13.0127V18.9933L7.7695 20L7 18.9933V13.012V13.0127ZM15.23 20L14.4605 18.9933V13.012L15.2305 12.0053L16 13.0127V18.994L15.23 20ZM8.54 4H10.7265L11.4965 4.99467L10.7265 6.024H8.5395L7.77 4.99467L8.54 4ZM12.275 4H14.461L15.2305 4.99467L14.461 6.024H12.274L11.4955 4.99467L12.274 4H12.275Z"
	})
});
//#endregion
//#region src/components/icons/models/menlo/avatar.tsx
function MenloAvatar({ size = 32, shape = "circle", className }) {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(require_avatar.Avatar, {
		className: require_avatar.cn("overflow-hidden", shape === "circle" ? "rounded-full" : "rounded-[20%]", className),
		style: {
			width: size,
			height: size
		},
		children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(require_avatar.AvatarFallback, {
			className: "text-foreground bg-background",
			children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(MenloLight, { style: {
				width: size,
				height: size
			} })
		})
	});
}
//#endregion
//#region src/components/icons/models/menlo/index.tsx
const Menlo = ({ variant, className, ...props }) => {
	if (variant === "light") return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(MenloLight, {
		...props,
		className
	});
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(MenloLight, {
		...props,
		className
	});
};
const MenloIcon = /*#__PURE__*/ Object.assign(Menlo, {
	Avatar: MenloAvatar,
	colorPrimary: "#FF5C00"
});
//#endregion
exports.MenloIcon = MenloIcon;
