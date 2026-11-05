import { r as AvatarFallback, s as cn, t as Avatar } from "./avatar-D3NkEc4-.mjs";
import { jsx } from "react/jsx-runtime";
//#region src/components/icons/models/arcee/light.tsx
const ArceeLight = (props) => /* @__PURE__ */ jsx("svg", {
	xmlns: "http://www.w3.org/2000/svg",
	width: "1em",
	height: "1em",
	fill: "none",
	viewBox: "0 0 24 24",
	...props,
	children: /* @__PURE__ */ jsx("path", {
		fill: "#008C8C",
		d: "M12.9365 6.62387L5.85737 19H4L12.0095 5L12.9365 6.62387ZM15.336 10.8294L8.85037 19H6.78842L14.4724 9.31757L15.336 10.8287V10.8294ZM20 19H13.486L19.1614 17.5305L20 19ZM17.6909 14.9543L12.3956 18.9986H9.72673L16.8814 13.5354L17.6909 14.9543Z"
	})
});
//#endregion
//#region src/components/icons/models/arcee/avatar.tsx
function ArceeAvatar({ size = 32, shape = "circle", className }) {
	return /* @__PURE__ */ jsx(Avatar, {
		className: cn("overflow-hidden", shape === "circle" ? "rounded-full" : "rounded-[20%]", className),
		style: {
			width: size,
			height: size
		},
		children: /* @__PURE__ */ jsx(AvatarFallback, {
			className: "text-foreground bg-background",
			children: /* @__PURE__ */ jsx(ArceeLight, { style: {
				width: size,
				height: size
			} })
		})
	});
}
//#endregion
//#region src/components/icons/models/arcee/index.tsx
const Arcee = ({ variant, className, ...props }) => {
	if (variant === "light") return /* @__PURE__ */ jsx(ArceeLight, {
		...props,
		className
	});
	return /* @__PURE__ */ jsx(ArceeLight, {
		...props,
		className
	});
};
const ArceeIcon = /*#__PURE__*/ Object.assign(Arcee, {
	Avatar: ArceeAvatar,
	colorPrimary: "#008C8C"
});
//#endregion
export { ArceeIcon, ArceeIcon as default };
