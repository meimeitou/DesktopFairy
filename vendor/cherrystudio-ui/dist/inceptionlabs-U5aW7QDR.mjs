import { n as __exportAll } from "./rolldown-runtime-B000p9w_.mjs";
import { r as AvatarFallback, s as cn, t as Avatar } from "./avatar-D3NkEc4-.mjs";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
//#region src/components/icons/providers/inceptionlabs/dark.tsx
const InceptionlabsDark = (props) => /* @__PURE__ */ jsx("svg", {
	xmlns: "http://www.w3.org/2000/svg",
	width: "1em",
	height: "1em",
	fill: "none",
	viewBox: "0 0 120 120",
	...props,
	children: /* @__PURE__ */ jsx("path", {
		fill: "#fff",
		fillRule: "evenodd",
		d: "M67.6752 27H47.3391L27 47.3362V67.6752H47.3391V47.3362H67.6752V27ZM51.3277 92H71.6609L92 71.661V51.3248H71.6609V71.661H51.3277V92Z",
		clipRule: "evenodd"
	})
});
//#endregion
//#region src/components/icons/providers/inceptionlabs/light.tsx
const InceptionlabsLight = (props) => /* @__PURE__ */ jsx("svg", {
	xmlns: "http://www.w3.org/2000/svg",
	width: "1em",
	height: "1em",
	fill: "none",
	viewBox: "0 0 120 120",
	...props,
	children: /* @__PURE__ */ jsx("path", {
		fill: "#000",
		fillRule: "evenodd",
		d: "M67.6752 27H47.3391L27 47.3362V67.6752H47.3391V47.3362H67.6752V27ZM51.3277 92H71.6609L92 71.661V51.3248H71.6609V71.661H51.3277V92Z",
		clipRule: "evenodd"
	})
});
//#endregion
//#region src/components/icons/providers/inceptionlabs/avatar.tsx
function InceptionlabsAvatar({ size = 32, shape = "circle", className }) {
	return /* @__PURE__ */ jsx(Avatar, {
		className: cn("overflow-hidden", shape === "circle" ? "rounded-full" : "rounded-[20%]", className),
		style: {
			width: size,
			height: size
		},
		children: /* @__PURE__ */ jsxs(AvatarFallback, {
			className: "text-foreground bg-background",
			children: [/* @__PURE__ */ jsx(InceptionlabsLight, {
				className: "dark:hidden",
				style: {
					width: size,
					height: size
				}
			}), /* @__PURE__ */ jsx(InceptionlabsDark, {
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
//#region src/components/icons/providers/inceptionlabs/index.tsx
var inceptionlabs_exports = /* @__PURE__ */ __exportAll({
	InceptionlabsIcon: () => InceptionlabsIcon,
	default: () => InceptionlabsIcon
});
const Inceptionlabs = ({ variant, className, ...props }) => {
	if (variant === "light") return /* @__PURE__ */ jsx(InceptionlabsLight, {
		...props,
		className
	});
	if (variant === "dark") return /* @__PURE__ */ jsx(InceptionlabsDark, {
		...props,
		className
	});
	return /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsx(InceptionlabsLight, {
		className: cn("dark:hidden", className),
		...props
	}), /* @__PURE__ */ jsx(InceptionlabsDark, {
		className: cn("hidden dark:block", className),
		...props
	})] });
};
const InceptionlabsIcon = /*#__PURE__*/ Object.assign(Inceptionlabs, {
	Avatar: InceptionlabsAvatar,
	colorPrimary: "#000000"
});
//#endregion
export { inceptionlabs_exports as n, InceptionlabsIcon as t };
