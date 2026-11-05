const require_avatar = require("./avatar-DqAhynaP.cjs");
let react_jsx_runtime = require("react/jsx-runtime");
//#region src/components/icons/providers/riverflow/dark.tsx
const RiverflowDark = (props) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("svg", {
	xmlns: "http://www.w3.org/2000/svg",
	width: "1em",
	height: "1em",
	fill: "none",
	viewBox: "0 0 120 120",
	...props,
	children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
		fill: "#fff",
		d: "M74.9965 76.7536C73.225 73.07 77.5974 70.6069 79.9753 68.6732C87.8428 62.2684 97.1238 49.6338 88.6151 39.9086C82.8466 33.3156 71.6759 33.7575 65.4405 39.4098C60.0341 44.3097 56.4822 50.7713 53.371 57.2898C51.8743 60.4223 50.4604 63.5896 48.9681 66.7265C47.5282 69.7494 46.0053 73.0175 43.2825 75.0998C43.1777 75.1786 43.073 75.2574 42.964 75.3317C39.9356 77.4667 36.4011 75.8742 35.751 72.2694C34.7474 66.744 37.1997 60.7111 43.4788 53.2737C48.9072 46.834 55.1862 40.6873 62.1372 35H49.1514C44.7574 39.0861 40.6774 43.3516 36.9685 47.7483C31.9024 53.7506 25.392 62.9815 27.3599 73.8005C28.1584 78.1973 30.9031 81.9203 34.6907 83.7665C38.2688 85.5032 42.3879 85.4026 46.001 83.4865C51.5164 80.5597 54.5011 74.8024 57.1324 69.4081C60.3788 62.7496 63.3023 55.8417 67.6483 49.8001C69.5989 47.0878 73.0331 43.7453 76.5936 43.7453C79.5086 43.7453 82.2619 45.609 82.7812 48.5358C83.2394 51.0644 82.6065 53.6237 81.2407 55.763C76.1485 63.7559 60.9286 68.1307 65.5103 80.144C65.8942 81.1502 66.3962 82.1127 66.994 83.0053C67.4171 83.6528 67.897 84.2653 68.412 84.8559H83.0779C76.1311 80.6647 74.9965 76.7493 74.9965 76.7493V76.7536Z"
	})
});
//#endregion
//#region src/components/icons/providers/riverflow/light.tsx
const RiverflowLight = (props) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("svg", {
	xmlns: "http://www.w3.org/2000/svg",
	width: "1em",
	height: "1em",
	fill: "none",
	viewBox: "0 0 120 120",
	...props,
	children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
		fill: "#1F0909",
		d: "M74.9965 76.7536C73.225 73.07 77.5974 70.6069 79.9753 68.6732C87.8428 62.2684 97.1238 49.6338 88.6151 39.9086C82.8466 33.3156 71.6759 33.7575 65.4405 39.4098C60.0341 44.3097 56.4822 50.7713 53.371 57.2898C51.8743 60.4223 50.4604 63.5896 48.9681 66.7265C47.5282 69.7494 46.0053 73.0175 43.2825 75.0998C43.1777 75.1786 43.073 75.2574 42.964 75.3317C39.9356 77.4667 36.4011 75.8742 35.751 72.2694C34.7474 66.744 37.1997 60.7111 43.4788 53.2737C48.9072 46.834 55.1862 40.6873 62.1372 35H49.1514C44.7574 39.0861 40.6774 43.3516 36.9685 47.7483C31.9024 53.7506 25.392 62.9815 27.3599 73.8005C28.1584 78.1973 30.9031 81.9203 34.6907 83.7665C38.2688 85.5032 42.3879 85.4026 46.001 83.4865C51.5164 80.5597 54.5011 74.8024 57.1324 69.4081C60.3788 62.7496 63.3023 55.8417 67.6483 49.8001C69.5989 47.0878 73.0331 43.7453 76.5936 43.7453C79.5086 43.7453 82.2619 45.609 82.7812 48.5358C83.2394 51.0644 82.6065 53.6237 81.2407 55.763C76.1485 63.7559 60.9286 68.1307 65.5103 80.144C65.8942 81.1502 66.3962 82.1127 66.994 83.0053C67.4171 83.6528 67.897 84.2653 68.412 84.8559H83.0779C76.1311 80.6647 74.9965 76.7493 74.9965 76.7493V76.7536Z"
	})
});
//#endregion
//#region src/components/icons/providers/riverflow/avatar.tsx
function RiverflowAvatar({ size = 32, shape = "circle", className }) {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(require_avatar.Avatar, {
		className: require_avatar.cn("overflow-hidden", shape === "circle" ? "rounded-full" : "rounded-[20%]", className),
		style: {
			width: size,
			height: size
		},
		children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(require_avatar.AvatarFallback, {
			className: "text-foreground bg-background",
			children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(RiverflowLight, {
				className: "dark:hidden",
				style: {
					width: size,
					height: size
				}
			}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(RiverflowDark, {
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
//#region src/components/icons/providers/riverflow/index.tsx
var riverflow_exports = /* @__PURE__ */ require_avatar.__exportAll({
	RiverflowIcon: () => RiverflowIcon,
	default: () => RiverflowIcon
});
const Riverflow = ({ variant, className, ...props }) => {
	if (variant === "light") return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(RiverflowLight, {
		...props,
		className
	});
	if (variant === "dark") return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(RiverflowDark, {
		...props,
		className
	});
	return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(RiverflowLight, {
		className: require_avatar.cn("dark:hidden", className),
		...props
	}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(RiverflowDark, {
		className: require_avatar.cn("hidden dark:block", className),
		...props
	})] });
};
const RiverflowIcon = /*#__PURE__*/ Object.assign(Riverflow, {
	Avatar: RiverflowAvatar,
	colorPrimary: "#1F0909"
});
//#endregion
Object.defineProperty(exports, "RiverflowIcon", {
	enumerable: true,
	get: function() {
		return RiverflowIcon;
	}
});
Object.defineProperty(exports, "riverflow_exports", {
	enumerable: true,
	get: function() {
		return riverflow_exports;
	}
});
