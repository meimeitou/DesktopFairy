import { r as AvatarFallback, s as cn, t as Avatar } from "./avatar-D3NkEc4-.mjs";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
//#region src/components/icons/models/trinity/dark.tsx
const TrinityDark = (props) => /* @__PURE__ */ jsx("svg", {
	xmlns: "http://www.w3.org/2000/svg",
	width: "1em",
	height: "1em",
	fill: "none",
	viewBox: "0 0 24 24",
	...props,
	children: /* @__PURE__ */ jsx("path", {
		stroke: "#fff",
		strokeLinejoin: "round",
		strokeMiterlimit: 10,
		strokeWidth: .93,
		d: "M12 5L20 19H4L12 5ZM12 5V14.4316M12 14.4316L4.01969 19M12 14.4316L19.9803 19"
	})
});
//#endregion
//#region src/components/icons/models/trinity/light.tsx
const TrinityLight = (props) => /* @__PURE__ */ jsx("svg", {
	xmlns: "http://www.w3.org/2000/svg",
	width: "1em",
	height: "1em",
	fill: "none",
	viewBox: "0 0 24 24",
	...props,
	children: /* @__PURE__ */ jsx("path", {
		stroke: "#000",
		strokeLinejoin: "round",
		strokeMiterlimit: 10,
		strokeWidth: .93,
		d: "M12 5L20 19H4L12 5ZM12 5V14.4316M12 14.4316L4.01969 19M12 14.4316L19.9803 19"
	})
});
//#endregion
//#region src/components/icons/models/trinity/avatar.tsx
function TrinityAvatar({ size = 32, shape = "circle", className }) {
	return /* @__PURE__ */ jsx(Avatar, {
		className: cn("overflow-hidden", shape === "circle" ? "rounded-full" : "rounded-[20%]", className),
		style: {
			width: size,
			height: size
		},
		children: /* @__PURE__ */ jsxs(AvatarFallback, {
			className: "text-foreground bg-background",
			children: [/* @__PURE__ */ jsx(TrinityLight, {
				className: "dark:hidden",
				style: {
					width: size,
					height: size
				}
			}), /* @__PURE__ */ jsx(TrinityDark, {
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
//#region src/components/icons/models/trinity/index.tsx
const Trinity = ({ variant, className, ...props }) => {
	if (variant === "light") return /* @__PURE__ */ jsx(TrinityLight, {
		...props,
		className
	});
	if (variant === "dark") return /* @__PURE__ */ jsx(TrinityDark, {
		...props,
		className
	});
	return /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsx(TrinityLight, {
		className: cn("dark:hidden", className),
		...props
	}), /* @__PURE__ */ jsx(TrinityDark, {
		className: cn("hidden dark:block", className),
		...props
	})] });
};
const TrinityIcon = /*#__PURE__*/ Object.assign(Trinity, {
	Avatar: TrinityAvatar,
	colorPrimary: "#000000"
});
//#endregion
export { TrinityIcon, TrinityIcon as default };
