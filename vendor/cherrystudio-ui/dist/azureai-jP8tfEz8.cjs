const require_avatar = require("./avatar-DqAhynaP.cjs");
let react = require("react");
let react_jsx_runtime = require("react/jsx-runtime");
//#region src/components/icons/providers/azureai/light.tsx
const AzureaiLight = (props) => {
	const iconId = (0, react.useId)();
	return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
		xmlns: "http://www.w3.org/2000/svg",
		width: "1em",
		height: "1em",
		fill: "none",
		viewBox: "0 0 120 120",
		...props,
		children: [
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("mask", {
				id: `${iconId}-azureailight__a`,
				width: 65,
				height: 65,
				x: 27,
				y: 27,
				maskUnits: "userSpaceOnUse",
				style: { maskType: "luminance" },
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
					fill: "#fff",
					d: "M92 27H27V92H92V27Z"
				})
			}),
			/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("g", {
				mask: `url(#${iconId}-azureailight__a)`,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("mask", {
					id: `${iconId}-azureailight__b`,
					width: 65,
					height: 65,
					x: 27,
					y: 27,
					maskUnits: "userSpaceOnUse",
					style: { maskType: "luminance" },
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
						fill: "#fff",
						d: "M92 27H27V92H92V27Z"
					})
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("g", {
					mask: `url(#${iconId}-azureailight__b)`,
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
							fill: `url(#${iconId}-azureailight__c)`,
							fillRule: "evenodd",
							d: "M70.9652 27C72.8962 27 74.6079 28.4923 75.2227 30.5994C75.8375 32.7065 79.4341 45.739 79.4341 45.739V71.636H66.3989L66.6644 27H70.9652Z",
							clipRule: "evenodd"
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
							fill: `url(#${iconId}-azureailight__d)`,
							d: "M90.0998 47.2316C90.0998 46.3108 89.3553 45.6066 88.4751 45.6066H80.797C78.2013 45.6088 75.7126 46.641 73.8774 48.4767C72.0423 50.3124 71.0107 52.8015 71.009 55.3972V71.6363H80.3149C82.9098 71.6336 85.3974 70.6012 87.232 68.7663C89.0666 66.9311 90.0982 64.4433 90.0998 61.8484V47.2316Z"
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
							fill: `url(#${iconId}-azureailight__e)`,
							fillRule: "evenodd",
							d: "M70.9646 27.0001C70.612 26.9976 70.2626 27.0651 69.9366 27.1988C69.6104 27.3325 69.3142 27.5297 69.065 27.7789C68.8156 28.0282 68.6184 28.3245 68.4846 28.6506C68.3511 28.9767 68.2834 29.3262 68.2861 29.6786L68.0234 78.9648C68.0226 82.4217 66.6489 85.7369 64.2046 88.1812C61.7601 90.6259 58.4451 91.9992 54.9882 92H31.3335C31.0745 92.0015 30.819 91.941 30.5884 91.8231C30.3578 91.7052 30.1589 91.5337 30.0084 91.3228C29.8578 91.1119 29.7602 90.8685 29.7235 90.6123C29.6869 90.3553 29.7124 90.0938 29.7979 89.8497L48.7562 35.7344C49.6493 33.1864 51.3107 30.978 53.5114 29.4137C55.7121 27.8494 58.3438 27.0061 61.044 27.0001H71.0079H70.9646Z",
							clipRule: "evenodd"
						})
					]
				})]
			}),
			/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("defs", { children: [
				/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("linearGradient", {
					id: `${iconId}-azureailight__c`,
					x1: 76.406,
					x2: 65.435,
					y1: 72.6,
					y2: 28.668,
					gradientUnits: "userSpaceOnUse",
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("stop", { stopColor: "#712575" }),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("stop", {
							offset: .09,
							stopColor: "#9A2884"
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("stop", {
							offset: .18,
							stopColor: "#BF2C92"
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("stop", {
							offset: .27,
							stopColor: "#DA2E9C"
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("stop", {
							offset: .34,
							stopColor: "#EB30A2"
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("stop", {
							offset: .4,
							stopColor: "#F131A5"
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("stop", {
							offset: .5,
							stopColor: "#EC30A3"
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("stop", {
							offset: .61,
							stopColor: "#DF2F9E"
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("stop", {
							offset: .72,
							stopColor: "#C92D96"
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("stop", {
							offset: .83,
							stopColor: "#AA2A8A"
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("stop", {
							offset: .95,
							stopColor: "#83267C"
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("stop", {
							offset: 1,
							stopColor: "#712575"
						})
					]
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("linearGradient", {
					id: `${iconId}-azureailight__d`,
					x1: 80.578,
					x2: 80.578,
					y1: 27.921,
					y2: 89.894,
					gradientUnits: "userSpaceOnUse",
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("stop", { stopColor: "#DA7ED0" }),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("stop", {
							offset: .08,
							stopColor: "#B17BD5"
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("stop", {
							offset: .19,
							stopColor: "#8778DB"
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("stop", {
							offset: .3,
							stopColor: "#6276E1"
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("stop", {
							offset: .41,
							stopColor: "#4574E5"
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("stop", {
							offset: .54,
							stopColor: "#2E72E8"
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("stop", {
							offset: .67,
							stopColor: "#1D71EB"
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("stop", {
							offset: .81,
							stopColor: "#1471EC"
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("stop", {
							offset: 1,
							stopColor: "#1171ED"
						})
					]
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("linearGradient", {
					id: `${iconId}-azureailight__e`,
					x1: 76.844,
					x2: 35.764,
					y1: 29.326,
					y2: 95.204,
					gradientUnits: "userSpaceOnUse",
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("stop", { stopColor: "#DA7ED0" }),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("stop", {
							offset: .05,
							stopColor: "#B77BD4"
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("stop", {
							offset: .11,
							stopColor: "#9079DA"
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("stop", {
							offset: .18,
							stopColor: "#6E77DF"
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("stop", {
							offset: .25,
							stopColor: "#5175E3"
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("stop", {
							offset: .33,
							stopColor: "#3973E7"
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("stop", {
							offset: .42,
							stopColor: "#2772E9"
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("stop", {
							offset: .54,
							stopColor: "#1A71EB"
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("stop", {
							offset: .68,
							stopColor: "#1371EC"
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("stop", {
							offset: 1,
							stopColor: "#1171ED"
						})
					]
				})
			] })
		]
	});
};
//#endregion
//#region src/components/icons/providers/azureai/avatar.tsx
function AzureaiAvatar({ size = 32, shape = "circle", className }) {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(require_avatar.Avatar, {
		className: require_avatar.cn("overflow-hidden", shape === "circle" ? "rounded-full" : "rounded-[20%]", className),
		style: {
			width: size,
			height: size
		},
		children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(require_avatar.AvatarFallback, {
			className: "text-foreground bg-background",
			children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(AzureaiLight, { style: {
				width: size,
				height: size
			} })
		})
	});
}
//#endregion
//#region src/components/icons/providers/azureai/index.tsx
var azureai_exports = /* @__PURE__ */ require_avatar.__exportAll({
	AzureaiIcon: () => AzureaiIcon,
	default: () => AzureaiIcon
});
const Azureai = ({ variant, className, ...props }) => {
	if (variant === "light") return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(AzureaiLight, {
		...props,
		className
	});
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(AzureaiLight, {
		...props,
		className
	});
};
const AzureaiIcon = /*#__PURE__*/ Object.assign(Azureai, {
	Avatar: AzureaiAvatar,
	colorPrimary: "#000000"
});
//#endregion
Object.defineProperty(exports, "AzureaiIcon", {
	enumerable: true,
	get: function() {
		return AzureaiIcon;
	}
});
Object.defineProperty(exports, "azureai_exports", {
	enumerable: true,
	get: function() {
		return azureai_exports;
	}
});
