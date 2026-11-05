import { n as __exportAll } from "./rolldown-runtime-B000p9w_.mjs";
import { r as AvatarFallback, s as cn, t as Avatar } from "./avatar-D3NkEc4-.mjs";
import { t as OpenCode } from "./open-code--PPWSkoz.mjs";
import { jsx } from "react/jsx-runtime";
//#region src/components/icons/providers/opencode/light.tsx
/**
* Hand-written forwarder: the OpenCode provider mark reuses the general
* open-code glyph instead of a vectorized SVG source. Exposing it as
* `<Name>Light` lets the icon pipeline (collectIconDirs/getComponentName)
* treat this directory like any generated icon — index.tsx/avatar.tsx are
* regenerated from it, and the catalog entries pick it up automatically.
*/
const OpenCodeGoLight = (props) => /* @__PURE__ */ jsx(OpenCode, { ...props });
//#endregion
//#region src/components/icons/providers/opencode/avatar.tsx
function OpenCodeGoAvatar({ size = 32, shape = "circle", className }) {
	return /* @__PURE__ */ jsx(Avatar, {
		className: cn("overflow-hidden", shape === "circle" ? "rounded-full" : "rounded-[20%]", className),
		style: {
			width: size,
			height: size
		},
		children: /* @__PURE__ */ jsx(AvatarFallback, {
			className: "text-foreground bg-background",
			children: /* @__PURE__ */ jsx(OpenCodeGoLight, { style: {
				width: size,
				height: size
			} })
		})
	});
}
//#endregion
//#region src/components/icons/providers/opencode/index.tsx
var opencode_exports = /* @__PURE__ */ __exportAll({
	OpenCodeGoIcon: () => OpenCodeGoIcon,
	default: () => OpenCodeGoIcon
});
const OpenCodeGo = ({ variant, className, ...props }) => {
	if (variant === "light") return /* @__PURE__ */ jsx(OpenCodeGoLight, {
		...props,
		className
	});
	return /* @__PURE__ */ jsx(OpenCodeGoLight, {
		...props,
		className
	});
};
const OpenCodeGoIcon = /*#__PURE__*/ Object.assign(OpenCodeGo, {
	Avatar: OpenCodeGoAvatar,
	colorPrimary: "#131010"
});
//#endregion
export { opencode_exports as n, OpenCodeGoIcon as t };
