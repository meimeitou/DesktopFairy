import { n as __exportAll } from "./rolldown-runtime-B000p9w_.mjs";
import { r as AvatarFallback, s as cn, t as Avatar } from "./avatar-D3NkEc4-.mjs";
import { useId } from "react";
import { jsx, jsxs } from "react/jsx-runtime";
//#region src/components/icons/providers/skywork/light.tsx
const SkyworkLight = (props) => {
	const iconId = useId();
	return /* @__PURE__ */ jsxs("svg", {
		xmlns: "http://www.w3.org/2000/svg",
		width: "1em",
		height: "1em",
		fill: "none",
		viewBox: "0 0 120 120",
		...props,
		children: [/* @__PURE__ */ jsx("mask", {
			id: `${iconId}-skyworklight__a`,
			width: 65,
			height: 65,
			x: 28,
			y: 28,
			maskUnits: "userSpaceOnUse",
			style: { maskType: "luminance" },
			children: /* @__PURE__ */ jsx("path", {
				fill: "#fff",
				d: "M93 28H28V93H93V28Z"
			})
		}), /* @__PURE__ */ jsxs("g", {
			mask: `url(#${iconId}-skyworklight__a)`,
			children: [/* @__PURE__ */ jsx("path", {
				fill: "#4D5EFF",
				d: "M64.3808 32.7559C60.201 29.4987 55.0067 27.8196 49.7113 28.0138C44.4159 28.2079 39.3586 30.263 35.4286 33.8175C30.9918 37.8301 28.3291 43.4397 28.0255 49.4142C27.7218 55.3886 29.802 61.2393 33.8091 65.681C37.358 69.6168 42.181 72.1751 47.4298 72.9062C52.6786 73.6374 58.0172 72.4945 62.5066 69.6785L45.0026 50.2788L64.3808 32.7559Z"
			}), /* @__PURE__ */ jsx("path", {
				fill: "#00FFCE",
				d: "M56.6216 86.8846C60.8009 90.1403 65.9941 91.8187 71.2882 91.6244C76.5824 91.4302 81.6387 89.376 85.5683 85.8229C90.0045 81.81 92.6667 76.2005 92.9706 70.2262C93.2737 64.252 91.1944 58.4014 87.1878 53.9593C83.6389 50.0237 78.8159 47.4653 73.5671 46.7341C68.3183 46.003 62.9798 47.1459 58.4903 49.9618L75.9943 69.3616L56.6161 86.8846H56.6216Z"
			})]
		})]
	});
};
//#endregion
//#region src/components/icons/providers/skywork/avatar.tsx
function SkyworkAvatar({ size = 32, shape = "circle", className }) {
	return /* @__PURE__ */ jsx(Avatar, {
		className: cn("overflow-hidden", shape === "circle" ? "rounded-full" : "rounded-[20%]", className),
		style: {
			width: size,
			height: size
		},
		children: /* @__PURE__ */ jsx(AvatarFallback, {
			className: "text-foreground bg-background",
			children: /* @__PURE__ */ jsx(SkyworkLight, { style: {
				width: size,
				height: size
			} })
		})
	});
}
//#endregion
//#region src/components/icons/providers/skywork/index.tsx
var skywork_exports = /* @__PURE__ */ __exportAll({
	SkyworkIcon: () => SkyworkIcon,
	default: () => SkyworkIcon
});
const Skywork = ({ variant, className, ...props }) => {
	if (variant === "light") return /* @__PURE__ */ jsx(SkyworkLight, {
		...props,
		className
	});
	return /* @__PURE__ */ jsx(SkyworkLight, {
		...props,
		className
	});
};
const SkyworkIcon = /*#__PURE__*/ Object.assign(Skywork, {
	Avatar: SkyworkAvatar,
	colorPrimary: "#4D5EFF"
});
//#endregion
export { skywork_exports as n, SkyworkIcon as t };
