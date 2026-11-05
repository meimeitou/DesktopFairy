import { n as __exportAll } from "./rolldown-runtime-B000p9w_.mjs";
import { r as AvatarFallback, s as cn, t as Avatar } from "./avatar-D3NkEc4-.mjs";
import { jsx } from "react/jsx-runtime";
//#region src/components/icons/providers/perplexity/light.tsx
const PerplexityLight = (props) => /* @__PURE__ */ jsx("svg", {
	xmlns: "http://www.w3.org/2000/svg",
	width: "1em",
	height: "1em",
	fill: "none",
	viewBox: "0 0 120 120",
	...props,
	children: /* @__PURE__ */ jsx("path", {
		fill: "#20808D",
		fillRule: "evenodd",
		d: "M39.6193 28L58.1451 45.0532V45.0493V28.0394H61.7512V45.1295L80.36 28V47.4432H88V75.4882H80.3836V92.8012L61.7512 76.4467V92.9894H58.1451V76.7161L39.6403 93V75.4882H32V47.4432H39.6193V28ZM55.4264 51.0021H35.6062V71.9292H39.6358V65.3281L55.4264 51.0021ZM43.2463 66.9071V85.0584L58.1451 71.9481V53.3873L43.2463 66.9071ZM61.855 71.7746V53.3697L76.7581 66.8906V75.4882H76.7773V84.8731L61.855 71.7746ZM80.3836 71.9292H84.3938V51.0021H64.7214L80.3836 65.1797V71.9292ZM76.7538 47.4432V36.1864L64.5249 47.4432H76.7538ZM55.4543 47.4432H43.2255V36.1864L55.4543 47.4432Z",
		clipRule: "evenodd"
	})
});
//#endregion
//#region src/components/icons/providers/perplexity/avatar.tsx
function PerplexityAvatar({ size = 32, shape = "circle", className }) {
	return /* @__PURE__ */ jsx(Avatar, {
		className: cn("overflow-hidden", shape === "circle" ? "rounded-full" : "rounded-[20%]", className),
		style: {
			width: size,
			height: size
		},
		children: /* @__PURE__ */ jsx(AvatarFallback, {
			className: "text-foreground bg-background",
			children: /* @__PURE__ */ jsx(PerplexityLight, { style: {
				width: size,
				height: size
			} })
		})
	});
}
//#endregion
//#region src/components/icons/providers/perplexity/index.tsx
var perplexity_exports = /* @__PURE__ */ __exportAll({
	PerplexityIcon: () => PerplexityIcon,
	default: () => PerplexityIcon
});
const Perplexity = ({ variant, className, ...props }) => {
	if (variant === "light") return /* @__PURE__ */ jsx(PerplexityLight, {
		...props,
		className
	});
	return /* @__PURE__ */ jsx(PerplexityLight, {
		...props,
		className
	});
};
const PerplexityIcon = /*#__PURE__*/ Object.assign(Perplexity, {
	Avatar: PerplexityAvatar,
	colorPrimary: "#20808D"
});
//#endregion
export { perplexity_exports as n, PerplexityIcon as t };
