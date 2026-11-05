import { r as AvatarFallback, s as cn, t as Avatar } from "./avatar-D3NkEc4-.mjs";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
//#region src/components/icons/models/voyage/dark.tsx
const VoyageDark = (props) => /* @__PURE__ */ jsx("svg", {
	xmlns: "http://www.w3.org/2000/svg",
	width: "1em",
	height: "1em",
	fill: "none",
	viewBox: "0 0 24 24",
	...props,
	children: /* @__PURE__ */ jsx("path", {
		fill: "#fff",
		d: "M6.87413 4V4.044C6.85688 4.09685 6.84636 4.15174 6.84283 4.20733C6.83565 4.28067 6.83239 4.346 6.83239 4.404C6.83239 4.63 6.86044 4.88067 6.91587 5.15733C6.97913 5.42733 7.09457 5.76533 7.26217 6.17333L11.9089 17.084L16.3985 6.26C16.5035 5.99067 16.6157 5.696 16.7343 5.37533C16.853 5.05533 16.9124 4.73133 16.9124 4.40333C16.9148 4.2803 16.8936 4.15797 16.8498 4.04333V4H19V4.044C18.867 4.182 18.7065 4.42933 18.5174 4.78667C18.3283 5.14333 18.1222 5.58333 17.8985 6.108L11.888 20H11.0487L5.35326 6.64333C5.22022 6.33 5.08065 6.028 4.93326 5.73667C4.7937 5.44533 4.66065 5.18333 4.53543 4.95C4.40891 4.71 4.29739 4.51 4.19957 4.35C4.13798 4.24429 4.07138 4.14173 4 4.04267V4H6.87413Z"
	})
});
//#endregion
//#region src/components/icons/models/voyage/light.tsx
const VoyageLight = (props) => /* @__PURE__ */ jsx("svg", {
	xmlns: "http://www.w3.org/2000/svg",
	width: "1em",
	height: "1em",
	fill: "none",
	viewBox: "0 0 24 24",
	...props,
	children: /* @__PURE__ */ jsx("path", {
		fill: "#000",
		d: "M6.87413 4V4.044C6.85688 4.09685 6.84636 4.15174 6.84283 4.20733C6.83565 4.28067 6.83239 4.346 6.83239 4.404C6.83239 4.63 6.86044 4.88067 6.91587 5.15733C6.97913 5.42733 7.09457 5.76533 7.26217 6.17333L11.9089 17.084L16.3985 6.26C16.5035 5.99067 16.6157 5.696 16.7343 5.37533C16.853 5.05533 16.9124 4.73133 16.9124 4.40333C16.9148 4.2803 16.8936 4.15797 16.8498 4.04333V4H19V4.044C18.867 4.182 18.7065 4.42933 18.5174 4.78667C18.3283 5.14333 18.1222 5.58333 17.8985 6.108L11.888 20H11.0487L5.35326 6.64333C5.22022 6.33 5.08065 6.028 4.93326 5.73667C4.7937 5.44533 4.66065 5.18333 4.53543 4.95C4.40891 4.71 4.29739 4.51 4.19957 4.35C4.13798 4.24429 4.07138 4.14173 4 4.04267V4H6.87413Z"
	})
});
//#endregion
//#region src/components/icons/models/voyage/avatar.tsx
function VoyageAvatar({ size = 32, shape = "circle", className }) {
	return /* @__PURE__ */ jsx(Avatar, {
		className: cn("overflow-hidden", shape === "circle" ? "rounded-full" : "rounded-[20%]", className),
		style: {
			width: size,
			height: size
		},
		children: /* @__PURE__ */ jsxs(AvatarFallback, {
			className: "text-foreground bg-background",
			children: [/* @__PURE__ */ jsx(VoyageLight, {
				className: "dark:hidden",
				style: {
					width: size,
					height: size
				}
			}), /* @__PURE__ */ jsx(VoyageDark, {
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
//#region src/components/icons/models/voyage/index.tsx
const Voyage = ({ variant, className, ...props }) => {
	if (variant === "light") return /* @__PURE__ */ jsx(VoyageLight, {
		...props,
		className
	});
	if (variant === "dark") return /* @__PURE__ */ jsx(VoyageDark, {
		...props,
		className
	});
	return /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsx(VoyageLight, {
		className: cn("dark:hidden", className),
		...props
	}), /* @__PURE__ */ jsx(VoyageDark, {
		className: cn("hidden dark:block", className),
		...props
	})] });
};
const VoyageIcon = /*#__PURE__*/ Object.assign(Voyage, {
	Avatar: VoyageAvatar,
	colorPrimary: "#000000"
});
//#endregion
export { VoyageIcon, VoyageIcon as default };
