import { r as AvatarFallback, s as cn, t as Avatar } from "./avatar-D3NkEc4-.mjs";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
//#region src/components/icons/models/glm/dark.tsx
const GlmDark = (props) => /* @__PURE__ */ jsx("svg", {
	xmlns: "http://www.w3.org/2000/svg",
	width: "1em",
	height: "1em",
	fill: "none",
	viewBox: "0 0 24 24",
	...props,
	children: /* @__PURE__ */ jsx("path", {
		fill: "#fff",
		fillRule: "evenodd",
		d: "M12.07 5L10.618 6.91945H4.43533L5.88667 5H12.0707H12.07ZM19.5027 16.0812L18.052 18H11.8907L13.34 16.0812H19.5027ZM20 5L10.176 18H4L13.824 5H20Z",
		clipRule: "evenodd"
	})
});
//#endregion
//#region src/components/icons/models/glm/light.tsx
const GlmLight = (props) => /* @__PURE__ */ jsx("svg", {
	xmlns: "http://www.w3.org/2000/svg",
	width: "1em",
	height: "1em",
	fill: "none",
	viewBox: "0 0 24 24",
	...props,
	children: /* @__PURE__ */ jsx("path", {
		fill: "#000",
		fillRule: "evenodd",
		d: "M12.07 5L10.618 6.91945H4.43533L5.88667 5H12.0707H12.07ZM19.5027 16.0812L18.052 18H11.8907L13.34 16.0812H19.5027ZM20 5L10.176 18H4L13.824 5H20Z",
		clipRule: "evenodd"
	})
});
//#endregion
//#region src/components/icons/models/glm/avatar.tsx
function GlmAvatar({ size = 32, shape = "circle", className }) {
	return /* @__PURE__ */ jsx(Avatar, {
		className: cn("overflow-hidden", shape === "circle" ? "rounded-full" : "rounded-[20%]", className),
		style: {
			width: size,
			height: size
		},
		children: /* @__PURE__ */ jsxs(AvatarFallback, {
			className: "text-foreground bg-background",
			children: [/* @__PURE__ */ jsx(GlmLight, {
				className: "dark:hidden",
				style: {
					width: size,
					height: size
				}
			}), /* @__PURE__ */ jsx(GlmDark, {
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
//#region src/components/icons/models/glm/index.tsx
const Glm = ({ variant, className, ...props }) => {
	if (variant === "light") return /* @__PURE__ */ jsx(GlmLight, {
		...props,
		className
	});
	if (variant === "dark") return /* @__PURE__ */ jsx(GlmDark, {
		...props,
		className
	});
	return /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsx(GlmLight, {
		className: cn("dark:hidden", className),
		...props
	}), /* @__PURE__ */ jsx(GlmDark, {
		className: cn("hidden dark:block", className),
		...props
	})] });
};
const GlmIcon = /*#__PURE__*/ Object.assign(Glm, {
	Avatar: GlmAvatar,
	colorPrimary: "#000000"
});
//#endregion
export { GlmIcon, GlmIcon as default };
