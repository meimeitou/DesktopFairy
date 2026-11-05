import { r as AvatarFallback, s as cn, t as Avatar } from "./avatar-D3NkEc4-.mjs";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
//#region src/components/icons/models/anthropic/dark.tsx
const AnthropicDark = (props) => /* @__PURE__ */ jsx("svg", {
	xmlns: "http://www.w3.org/2000/svg",
	width: "1em",
	height: "1em",
	fill: "none",
	viewBox: "0 0 24 24",
	...props,
	children: /* @__PURE__ */ jsx("path", {
		fill: "#fff",
		fillRule: "evenodd",
		d: "M13.218 6H15.62L20 17H17.598L13.218 6ZM8.37933 6H10.8907L15.2707 17H12.8213L11.926 14.6899H7.34467L6.44867 16.9993H4L8.38 6.00134L8.37933 6ZM11.134 12.6474L9.63533 8.78137L8.13667 12.6481H11.1333L11.134 12.6474Z",
		clipRule: "evenodd"
	})
});
//#endregion
//#region src/components/icons/models/anthropic/light.tsx
const AnthropicLight = (props) => /* @__PURE__ */ jsx("svg", {
	xmlns: "http://www.w3.org/2000/svg",
	width: "1em",
	height: "1em",
	fill: "none",
	viewBox: "0 0 24 24",
	...props,
	children: /* @__PURE__ */ jsx("path", {
		fill: "#000",
		fillRule: "evenodd",
		d: "M13.218 6H15.62L20 17H17.598L13.218 6ZM8.37933 6H10.8907L15.2707 17H12.8213L11.926 14.6899H7.34467L6.44867 16.9993H4L8.38 6.00134L8.37933 6ZM11.134 12.6474L9.63533 8.78137L8.13667 12.6481H11.1333L11.134 12.6474Z",
		clipRule: "evenodd"
	})
});
//#endregion
//#region src/components/icons/models/anthropic/avatar.tsx
function AnthropicAvatar({ size = 32, shape = "circle", className }) {
	return /* @__PURE__ */ jsx(Avatar, {
		className: cn("overflow-hidden", shape === "circle" ? "rounded-full" : "rounded-[20%]", className),
		style: {
			width: size,
			height: size
		},
		children: /* @__PURE__ */ jsxs(AvatarFallback, {
			className: "text-foreground bg-background",
			children: [/* @__PURE__ */ jsx(AnthropicLight, {
				className: "dark:hidden",
				style: {
					width: size,
					height: size
				}
			}), /* @__PURE__ */ jsx(AnthropicDark, {
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
//#region src/components/icons/models/anthropic/index.tsx
const Anthropic = ({ variant, className, ...props }) => {
	if (variant === "light") return /* @__PURE__ */ jsx(AnthropicLight, {
		...props,
		className
	});
	if (variant === "dark") return /* @__PURE__ */ jsx(AnthropicDark, {
		...props,
		className
	});
	return /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsx(AnthropicLight, {
		className: cn("dark:hidden", className),
		...props
	}), /* @__PURE__ */ jsx(AnthropicDark, {
		className: cn("hidden dark:block", className),
		...props
	})] });
};
const AnthropicIcon = /*#__PURE__*/ Object.assign(Anthropic, {
	Avatar: AnthropicAvatar,
	colorPrimary: "#000000"
});
//#endregion
export { AnthropicIcon, AnthropicIcon as default };
