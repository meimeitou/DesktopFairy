const require_avatar = require("./avatar-DqAhynaP.cjs");
let react_jsx_runtime = require("react/jsx-runtime");
//#region src/components/icons/models/dalle/light.tsx
const DalleLight = (props) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
	xmlns: "http://www.w3.org/2000/svg",
	width: "1em",
	height: "1em",
	fill: "none",
	viewBox: "0 0 24 24",
	...props,
	children: [
		/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
			fill: "#FFFF67",
			d: "M4 10H7.2V13.3333H4V10Z"
		}),
		/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
			fill: "#43FFFF",
			d: "M7.20001 10H10.4V13.3333H7.20001V10Z"
		}),
		/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
			fill: "#51DA4B",
			d: "M10.4 10H13.6V13.3333H10.4V10Z"
		}),
		/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
			fill: "#FF6E3D",
			d: "M13.6 10H16.8V13.3333H13.6V10Z"
		}),
		/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
			fill: "#3C46FF",
			d: "M16.8 10H20V13.3333H16.8V10Z"
		})
	]
});
//#endregion
//#region src/components/icons/models/dalle/avatar.tsx
function DalleAvatar({ size = 32, shape = "circle", className }) {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(require_avatar.Avatar, {
		className: require_avatar.cn("overflow-hidden", shape === "circle" ? "rounded-full" : "rounded-[20%]", className),
		style: {
			width: size,
			height: size
		},
		children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(require_avatar.AvatarFallback, {
			className: "text-foreground bg-background",
			children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(DalleLight, { style: {
				width: size,
				height: size
			} })
		})
	});
}
//#endregion
//#region src/components/icons/models/dalle/index.tsx
const Dalle = ({ variant, className, ...props }) => {
	if (variant === "light") return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(DalleLight, {
		...props,
		className
	});
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(DalleLight, {
		...props,
		className
	});
};
const DalleIcon = /*#__PURE__*/ Object.assign(Dalle, {
	Avatar: DalleAvatar,
	colorPrimary: "#FFFF67"
});
//#endregion
exports.DalleIcon = DalleIcon;
