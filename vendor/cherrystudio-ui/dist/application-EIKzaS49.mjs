import { n as __exportAll } from "./rolldown-runtime-B000p9w_.mjs";
import { r as AvatarFallback, s as cn, t as Avatar } from "./avatar-D3NkEc4-.mjs";
import { jsx, jsxs } from "react/jsx-runtime";
//#region src/components/icons/providers/application/light.tsx
const ApplicationLight = (props) => /* @__PURE__ */ jsxs("svg", {
	xmlns: "http://www.w3.org/2000/svg",
	width: "1em",
	height: "1em",
	fill: "none",
	viewBox: "0 0 120 120",
	...props,
	children: [
		/* @__PURE__ */ jsx("path", {
			fill: "#2BA471",
			d: "M48.8929 27H34.9643C31.118 27 28 30.118 28 33.9643V47.8929C28 51.7391 31.118 54.8571 34.9643 54.8571H48.8929C52.7391 54.8571 55.8571 51.7391 55.8571 47.8929V33.9643C55.8571 30.118 52.7391 27 48.8929 27Z"
		}),
		/* @__PURE__ */ jsx("path", {
			fill: "#1B8A5A",
			d: "M86.0357 27H72.1072C68.2609 27 65.1429 30.118 65.1429 33.9643V47.8929C65.1429 51.7391 68.2609 54.8571 72.1072 54.8571H86.0357C89.882 54.8571 93 51.7391 93 47.8929V33.9643C93 30.118 89.882 27 86.0357 27Z"
		}),
		/* @__PURE__ */ jsx("path", {
			fill: "#2BA471",
			d: "M48.8929 64.1429H34.9643C31.118 64.1429 28 67.2609 28 71.1072V85.0357C28 88.882 31.118 92 34.9643 92H48.8929C52.7391 92 55.8571 88.882 55.8571 85.0357V71.1072C55.8571 67.2609 52.7391 64.1429 48.8929 64.1429Z"
		}),
		/* @__PURE__ */ jsx("path", {
			fill: "#0E5C3A",
			d: "M79.0715 92C86.764 92 93 85.764 93 78.0715C93 70.3789 86.764 64.1429 79.0715 64.1429C71.3789 64.1429 65.1429 70.3789 65.1429 78.0715C65.1429 85.764 71.3789 92 79.0715 92Z"
		})
	]
});
//#endregion
//#region src/components/icons/providers/application/avatar.tsx
function ApplicationAvatar({ size = 32, shape = "circle", className }) {
	return /* @__PURE__ */ jsx(Avatar, {
		className: cn("overflow-hidden", shape === "circle" ? "rounded-full" : "rounded-[20%]", className),
		style: {
			width: size,
			height: size
		},
		children: /* @__PURE__ */ jsx(AvatarFallback, {
			className: "text-foreground bg-background",
			children: /* @__PURE__ */ jsx(ApplicationLight, { style: {
				width: size,
				height: size
			} })
		})
	});
}
//#endregion
//#region src/components/icons/providers/application/index.tsx
var application_exports = /* @__PURE__ */ __exportAll({
	ApplicationIcon: () => ApplicationIcon,
	default: () => ApplicationIcon
});
const Application = ({ variant, className, ...props }) => {
	if (variant === "light") return /* @__PURE__ */ jsx(ApplicationLight, {
		...props,
		className
	});
	return /* @__PURE__ */ jsx(ApplicationLight, {
		...props,
		className
	});
};
const ApplicationIcon = /*#__PURE__*/ Object.assign(Application, {
	Avatar: ApplicationAvatar,
	colorPrimary: "#2BA471"
});
//#endregion
export { application_exports as n, ApplicationIcon as t };
