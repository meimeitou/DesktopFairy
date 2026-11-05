import { r as AvatarFallback, s as cn, t as Avatar } from "./avatar-D3NkEc4-.mjs";
import { jsx } from "react/jsx-runtime";
//#region src/components/icons/models/adobe/light.tsx
const AdobeLight = (props) => /* @__PURE__ */ jsx("svg", {
	xmlns: "http://www.w3.org/2000/svg",
	width: "1em",
	height: "1em",
	fill: "none",
	viewBox: "0 0 24 24",
	...props,
	children: /* @__PURE__ */ jsx("path", {
		fill: "#EB1000",
		d: "M14.08 6H20V20L14.08 6ZM9.92 6H4V20L9.92 6ZM11.9942 11.1564L15.7687 20H13.3004L12.1738 17.1904H9.41745L11.9942 11.1564Z"
	})
});
//#endregion
//#region src/components/icons/models/adobe/avatar.tsx
function AdobeAvatar({ size = 32, shape = "circle", className }) {
	return /* @__PURE__ */ jsx(Avatar, {
		className: cn("overflow-hidden", shape === "circle" ? "rounded-full" : "rounded-[20%]", className),
		style: {
			width: size,
			height: size
		},
		children: /* @__PURE__ */ jsx(AvatarFallback, {
			className: "text-foreground bg-background",
			children: /* @__PURE__ */ jsx(AdobeLight, { style: {
				width: size,
				height: size
			} })
		})
	});
}
//#endregion
//#region src/components/icons/models/adobe/index.tsx
const Adobe = ({ variant, className, ...props }) => {
	if (variant === "light") return /* @__PURE__ */ jsx(AdobeLight, {
		...props,
		className
	});
	return /* @__PURE__ */ jsx(AdobeLight, {
		...props,
		className
	});
};
const AdobeIcon = /*#__PURE__*/ Object.assign(Adobe, {
	Avatar: AdobeAvatar,
	colorPrimary: "#EB1000"
});
//#endregion
export { AdobeIcon, AdobeIcon as default };
