import { r as AvatarFallback, s as cn, t as Avatar } from "./avatar-D3NkEc4-.mjs";
import { jsx, jsxs } from "react/jsx-runtime";
//#region src/components/icons/models/spark/light.tsx
const SparkLight = (props) => /* @__PURE__ */ jsxs("svg", {
	xmlns: "http://www.w3.org/2000/svg",
	width: "1em",
	height: "1em",
	fill: "none",
	viewBox: "0 0 24 24",
	...props,
	children: [
		/* @__PURE__ */ jsx("path", {
			fill: "#3DC8F9",
			d: "M5 13.099C5 10.3874 6.92832 8.42917 10.0921 5.47617C9.63993 10.9599 14.5512 11.2305 13.5863 13.9727C12.8976 15.931 10.634 15.3286 10.3933 14.9063C10.3933 14.9063 11.2364 15.1477 11.3568 14.3039C11.4778 13.4601 9.79019 13.0086 8.70638 10.8695C6.89771 12.9481 8.04274 17.1358 11.6281 17.1358C14.9421 17.1358 16.2075 13.7014 15.0326 11.5018C15.0326 11.5018 17.8645 11.9839 18.1059 14.1529C18.3466 16.3226 15.5752 20.0888 11.779 19.9984C7.98291 19.908 5 17.1059 5 13.099Z"
		}),
		/* @__PURE__ */ jsx("path", {
			fill: "#EA0100",
			d: "M16.0273 8.24829L11.6886 4C11.3269 8.12725 12.291 9.82531 15.0931 10.5982C16.9915 11.122 17.3936 11.3216 18.2263 12.5265C17.9911 10.8521 17.6837 9.8747 16.0273 8.24829Z"
		}),
		/* @__PURE__ */ jsx("path", {
			fill: "#1652D8",
			fillRule: "evenodd",
			d: "M9.89243 16.7463C10.3856 16.9925 10.9651 17.1358 11.6281 17.1358C14.9421 17.1358 16.2075 13.7014 15.0325 11.5018C15.0325 11.5018 17.8645 11.9839 18.1059 14.1529C18.2144 15.1289 17.7128 16.4277 16.7828 17.5546C14.3772 18.6468 11.7115 18.1389 9.89243 16.7463Z",
			clipRule: "evenodd"
		})
	]
});
//#endregion
//#region src/components/icons/models/spark/avatar.tsx
function SparkAvatar({ size = 32, shape = "circle", className }) {
	return /* @__PURE__ */ jsx(Avatar, {
		className: cn("overflow-hidden", shape === "circle" ? "rounded-full" : "rounded-[20%]", className),
		style: {
			width: size,
			height: size
		},
		children: /* @__PURE__ */ jsx(AvatarFallback, {
			className: "text-foreground bg-background",
			children: /* @__PURE__ */ jsx(SparkLight, { style: {
				width: size,
				height: size
			} })
		})
	});
}
//#endregion
//#region src/components/icons/models/spark/index.tsx
const Spark = ({ variant, className, ...props }) => {
	if (variant === "light") return /* @__PURE__ */ jsx(SparkLight, {
		...props,
		className
	});
	return /* @__PURE__ */ jsx(SparkLight, {
		...props,
		className
	});
};
const SparkIcon = /*#__PURE__*/ Object.assign(Spark, {
	Avatar: SparkAvatar,
	colorPrimary: "#3DC8F9"
});
//#endregion
export { SparkIcon, SparkIcon as default };
