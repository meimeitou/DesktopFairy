const require_avatar = require("./avatar-DqAhynaP.cjs");
const require_open_code = require("./open-code-BMvTCNTG.cjs");
let react_jsx_runtime = require("react/jsx-runtime");
//#region src/components/icons/providers/opencode/light.tsx
/**
* Hand-written forwarder: the OpenCode provider mark reuses the general
* open-code glyph instead of a vectorized SVG source. Exposing it as
* `<Name>Light` lets the icon pipeline (collectIconDirs/getComponentName)
* treat this directory like any generated icon — index.tsx/avatar.tsx are
* regenerated from it, and the catalog entries pick it up automatically.
*/
const OpenCodeGoLight = (props) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(require_open_code.OpenCode, { ...props });
//#endregion
//#region src/components/icons/providers/opencode/avatar.tsx
function OpenCodeGoAvatar({ size = 32, shape = "circle", className }) {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(require_avatar.Avatar, {
		className: require_avatar.cn("overflow-hidden", shape === "circle" ? "rounded-full" : "rounded-[20%]", className),
		style: {
			width: size,
			height: size
		},
		children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(require_avatar.AvatarFallback, {
			className: "text-foreground bg-background",
			children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(OpenCodeGoLight, { style: {
				width: size,
				height: size
			} })
		})
	});
}
//#endregion
//#region src/components/icons/providers/opencode/index.tsx
var opencode_exports = /* @__PURE__ */ require_avatar.__exportAll({
	OpenCodeGoIcon: () => OpenCodeGoIcon,
	default: () => OpenCodeGoIcon
});
const OpenCodeGo = ({ variant, className, ...props }) => {
	if (variant === "light") return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(OpenCodeGoLight, {
		...props,
		className
	});
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(OpenCodeGoLight, {
		...props,
		className
	});
};
const OpenCodeGoIcon = /*#__PURE__*/ Object.assign(OpenCodeGo, {
	Avatar: OpenCodeGoAvatar,
	colorPrimary: "#131010"
});
//#endregion
Object.defineProperty(exports, "OpenCodeGoIcon", {
	enumerable: true,
	get: function() {
		return OpenCodeGoIcon;
	}
});
Object.defineProperty(exports, "opencode_exports", {
	enumerable: true,
	get: function() {
		return opencode_exports;
	}
});
