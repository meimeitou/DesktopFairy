import { r as AvatarFallback, s as cn, t as Avatar } from "./avatar-D3NkEc4-.mjs";
import { jsx, jsxs } from "react/jsx-runtime";
//#region src/components/icons/models/mistral/light.tsx
const MistralLight = (props) => /* @__PURE__ */ jsxs("svg", {
	xmlns: "http://www.w3.org/2000/svg",
	width: "1em",
	height: "1em",
	fill: "none",
	viewBox: "0 0 24 24",
	...props,
	children: [
		/* @__PURE__ */ jsx("path", {
			fill: "gold",
			d: "M6.28534 6H8.57134V8.28534H6.28534V6ZM15.428 6H17.7147V8.28534H15.428V6Z"
		}),
		/* @__PURE__ */ jsx("path", {
			fill: "#FFAF00",
			d: "M6.28534 8.28534H10.8567V10.5713H6.28601L6.28534 8.28534ZM13.1427 8.28534H17.714V10.5713H13.1427V8.28534Z"
		}),
		/* @__PURE__ */ jsx("path", {
			fill: "#FF8205",
			d: "M6.28534 10.572H17.7147V12.8573H6.28534V10.572Z"
		}),
		/* @__PURE__ */ jsx("path", {
			fill: "#FA500F",
			d: "M6.28534 12.8573H8.57134V15.1427H6.28534V12.8573ZM10.8573 12.8573H13.1433V15.1427H10.8573V12.8573ZM15.428 12.8573H17.7147V15.1427H15.428V12.8573Z"
		}),
		/* @__PURE__ */ jsx("path", {
			fill: "#E10500",
			d: "M4 15.1427H10.8573V17.4287H4V15.1427ZM13.1427 15.1427H20V17.4287H13.1427V15.1427Z"
		})
	]
});
//#endregion
//#region src/components/icons/models/mistral/avatar.tsx
function MistralAvatar({ size = 32, shape = "circle", className }) {
	return /* @__PURE__ */ jsx(Avatar, {
		className: cn("overflow-hidden", shape === "circle" ? "rounded-full" : "rounded-[20%]", className),
		style: {
			width: size,
			height: size
		},
		children: /* @__PURE__ */ jsx(AvatarFallback, {
			className: "text-foreground bg-background",
			children: /* @__PURE__ */ jsx(MistralLight, { style: {
				width: size,
				height: size
			} })
		})
	});
}
//#endregion
//#region src/components/icons/models/mistral/index.tsx
const Mistral = ({ variant, className, ...props }) => {
	if (variant === "light") return /* @__PURE__ */ jsx(MistralLight, {
		...props,
		className
	});
	return /* @__PURE__ */ jsx(MistralLight, {
		...props,
		className
	});
};
const MistralIcon = /*#__PURE__*/ Object.assign(Mistral, {
	Avatar: MistralAvatar,
	colorPrimary: "#FFD700"
});
//#endregion
export { MistralIcon, MistralIcon as default };
