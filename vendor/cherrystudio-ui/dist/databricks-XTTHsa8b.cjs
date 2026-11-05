const require_avatar = require("./avatar-DqAhynaP.cjs");
let react_jsx_runtime = require("react/jsx-runtime");
//#region src/components/icons/providers/databricks/light.tsx
const DatabricksLight = (props) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("svg", {
	xmlns: "http://www.w3.org/2000/svg",
	width: "1em",
	height: "1em",
	fill: "none",
	viewBox: "0 0 120 120",
	...props,
	children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
		fill: "#FF3621",
		d: "M86.8382 53.7951L60.5283 68.9503L32.355 52.7581L31 53.5071V65.2624L60.5283 82.2038L86.8382 67.1064V73.3299L60.5283 88.4849L32.355 72.2926L31 73.0416V75.0586L60.5283 92L90 75.0586V63.3032L88.6449 62.554L60.5283 78.6888L34.1617 63.5913V57.3679L60.5283 72.4655L90 55.524V43.9415L88.5321 43.0771L60.5283 59.1542L35.5167 44.8634L60.5283 30.5151L81.0794 42.3281L82.8861 41.2908V39.8502L60.5283 27L31 43.9415V45.7855L60.5283 62.727L86.8382 47.5718V53.7951Z"
	})
});
//#endregion
//#region src/components/icons/providers/databricks/avatar.tsx
function DatabricksAvatar({ size = 32, shape = "circle", className }) {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(require_avatar.Avatar, {
		className: require_avatar.cn("overflow-hidden", shape === "circle" ? "rounded-full" : "rounded-[20%]", className),
		style: {
			width: size,
			height: size
		},
		children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(require_avatar.AvatarFallback, {
			className: "text-foreground bg-background",
			children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(DatabricksLight, { style: {
				width: size,
				height: size
			} })
		})
	});
}
//#endregion
//#region src/components/icons/providers/databricks/index.tsx
var databricks_exports = /* @__PURE__ */ require_avatar.__exportAll({
	DatabricksIcon: () => DatabricksIcon,
	default: () => DatabricksIcon
});
const Databricks = ({ variant, className, ...props }) => {
	if (variant === "light") return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(DatabricksLight, {
		...props,
		className
	});
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(DatabricksLight, {
		...props,
		className
	});
};
const DatabricksIcon = /*#__PURE__*/ Object.assign(Databricks, {
	Avatar: DatabricksAvatar,
	colorPrimary: "#FF3621"
});
//#endregion
Object.defineProperty(exports, "DatabricksIcon", {
	enumerable: true,
	get: function() {
		return DatabricksIcon;
	}
});
Object.defineProperty(exports, "databricks_exports", {
	enumerable: true,
	get: function() {
		return databricks_exports;
	}
});
