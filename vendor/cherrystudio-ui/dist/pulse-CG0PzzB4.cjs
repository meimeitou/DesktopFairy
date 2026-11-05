const require_avatar = require("./avatar-DqAhynaP.cjs");
let react = require("react");
let react_jsx_runtime = require("react/jsx-runtime");
//#region src/components/icons/providers/pulse/light.tsx
const PulseLight = (props) => {
	const iconId = (0, react.useId)();
	return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
		xmlns: "http://www.w3.org/2000/svg",
		width: "1em",
		height: "1em",
		fill: "none",
		viewBox: "0 0 120 120",
		...props,
		children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("mask", {
			id: `${iconId}-pulselight__a`,
			width: 65,
			height: 65,
			x: 28,
			y: 28,
			maskUnits: "userSpaceOnUse",
			style: { maskType: "luminance" },
			children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
				fill: "#fff",
				d: "M93 28H28V93H93V28Z"
			})
		}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("g", {
			mask: `url(#${iconId}-pulselight__a)`,
			children: [
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
					fill: "#fff",
					d: "M88.9375 30.0313H32.0625C30.9406 30.0313 30.0312 30.9407 30.0312 32.0625V88.9375C30.0312 90.0594 30.9406 90.9687 32.0625 90.9687H88.9375C90.0593 90.9687 90.9687 90.0594 90.9687 88.9375V32.0625C90.9687 30.9407 90.0593 30.0313 88.9375 30.0313Z"
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
					stroke: "#302F7D",
					strokeWidth: 5.188,
					d: "M88.9375 30.0313H32.0625C30.9406 30.0313 30.0312 30.9407 30.0312 32.0625V88.9375C30.0312 90.0594 30.9406 90.9687 32.0625 90.9687H88.9375C90.0593 90.9687 90.9687 90.0594 90.9687 88.9375V32.0625C90.9687 30.9407 90.0593 30.0313 88.9375 30.0313Z"
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
					fill: "#302F7D",
					d: "M48.3125 42.2187H52.0848V45.9911H48.3125V42.2187ZM52.0848 42.2187H55.8572V45.9911H52.0848V42.2187ZM55.8572 42.2187H59.6294V45.9911H55.8572V42.2187ZM59.6294 42.2187H63.4018V45.9911H59.6294V42.2187ZM63.4018 42.2187H67.1741V45.9911H63.4018V42.2187ZM67.1741 42.2187H70.9465V45.9911H67.1741V42.2187ZM67.1741 45.9911H70.9465V49.7634H67.1741V45.9911ZM63.4018 45.9911H67.1741V49.7634H63.4018V45.9911ZM59.6294 45.9911H63.4018V49.7634H59.6294V45.9911ZM55.8572 45.9911H59.6294V49.7634H55.8572V45.9911ZM52.0848 45.9911H55.8572V49.7634H52.0848V45.9911ZM48.3125 45.9911H52.0848V49.7634H48.3125V45.9911ZM70.9465 45.9911H74.7187V49.7634H70.9465V45.9911ZM67.1741 49.7634H70.9465V53.5357H67.1741V49.7634ZM70.9465 49.7634H74.7187V53.5357H70.9465V49.7634ZM70.9465 53.5357H74.7187V57.3081H70.9465V53.5357ZM70.9465 57.3081H74.7187V61.0803H70.9465V57.3081ZM67.1741 57.3081H70.9465V61.0803H67.1741V57.3081ZM67.1741 53.5357H70.9465V57.3081H67.1741V53.5357ZM67.1741 61.0803H70.9465V64.8527H67.1741V61.0803ZM67.1741 64.8527H70.9465V68.625H67.1741V64.8527ZM63.4018 64.8527H67.1741V68.625H63.4018V64.8527ZM63.4018 61.0803H67.1741V64.8527H63.4018V61.0803ZM59.6294 61.0803H63.4018V64.8527H59.6294V61.0803ZM59.6294 64.8527H63.4018V68.625H59.6294V64.8527ZM55.8572 64.8527H59.6294V68.625H55.8572V64.8527ZM55.8572 61.0803H59.6294V64.8527H55.8572V61.0803ZM52.0848 61.0803H55.8572V64.8527H52.0848V61.0803ZM48.3125 61.0803H52.0848V64.8527H48.3125V61.0803ZM48.3125 64.8527H52.0848V68.625H48.3125V64.8527ZM52.0848 64.8527H55.8572V68.625H52.0848V64.8527ZM48.3125 49.7634H52.0848V53.5357H48.3125V49.7634ZM52.0848 49.7634H55.8572V53.5357H52.0848V49.7634ZM52.0848 53.5357H55.8572V57.3081H52.0848V53.5357ZM52.0848 57.3081H55.8572V61.0803H52.0848V57.3081ZM48.3125 53.5357H52.0848V57.3081H48.3125V53.5357ZM48.3125 57.3081H52.0848V61.0803H48.3125V57.3081ZM48.3125 68.625H52.0848V72.3973H48.3125V68.625ZM52.0848 68.625H55.8572V72.3973H52.0848V68.625ZM52.0848 72.3973H55.8572V76.1697H52.0848V72.3973ZM52.0848 76.1697H55.8572V79.9419H52.0848V76.1697ZM48.3125 76.1697H52.0848V79.9419H48.3125V76.1697ZM48.3125 72.3973H52.0848V76.1697H48.3125V72.3973ZM70.9465 61.0803H74.7187V64.8527H70.9465V61.0803Z"
				})
			]
		})]
	});
};
//#endregion
//#region src/components/icons/providers/pulse/avatar.tsx
function PulseAvatar({ size = 32, shape = "circle", className }) {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(require_avatar.Avatar, {
		className: require_avatar.cn("overflow-hidden", shape === "circle" ? "rounded-full" : "rounded-[20%]", className),
		style: {
			width: size,
			height: size
		},
		children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(require_avatar.AvatarFallback, {
			className: "text-foreground bg-background",
			children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(PulseLight, { style: {
				width: size,
				height: size
			} })
		})
	});
}
//#endregion
//#region src/components/icons/providers/pulse/index.tsx
var pulse_exports = /* @__PURE__ */ require_avatar.__exportAll({
	PulseIcon: () => PulseIcon,
	default: () => PulseIcon
});
const Pulse = ({ variant, className, ...props }) => {
	if (variant === "light") return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(PulseLight, {
		...props,
		className
	});
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(PulseLight, {
		...props,
		className
	});
};
const PulseIcon = /*#__PURE__*/ Object.assign(Pulse, {
	Avatar: PulseAvatar,
	colorPrimary: "#302F7D"
});
//#endregion
Object.defineProperty(exports, "PulseIcon", {
	enumerable: true,
	get: function() {
		return PulseIcon;
	}
});
Object.defineProperty(exports, "pulse_exports", {
	enumerable: true,
	get: function() {
		return pulse_exports;
	}
});
