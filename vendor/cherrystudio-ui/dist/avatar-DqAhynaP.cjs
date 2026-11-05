//#region \0rolldown/runtime.js
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJSMin = (cb, mod) => () => (mod || (cb((mod = { exports: {} }).exports, mod), cb = null), mod.exports);
var __exportAll = (all, no_symbols) => {
	let target = {};
	for (var name in all) __defProp(target, name, {
		get: all[name],
		enumerable: true
	});
	if (!no_symbols) __defProp(target, Symbol.toStringTag, { value: "Module" });
	return target;
};
var __copyProps = (to, from, except, desc) => {
	if (from && typeof from === "object" || typeof from === "function") for (var keys = __getOwnPropNames(from), i = 0, n = keys.length, key; i < n; i++) {
		key = keys[i];
		if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
			get: ((k) => from[k]).bind(null, key),
			enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
		});
	}
	return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(isNodeMode || !mod || !mod.__esModule || !__hasOwnProp.call(mod, "default") ? __defProp(target, "default", {
	value: mod,
	enumerable: true
}) : target, mod));
//#endregion
let react = require("react");
react = __toESM(react);
let clsx = require("clsx");
let tailwind_merge = require("tailwind-merge");
let react_jsx_runtime = require("react/jsx-runtime");
let _radix_ui_react_avatar = require("@radix-ui/react-avatar");
_radix_ui_react_avatar = __toESM(_radix_ui_react_avatar);
//#region src/lib/utils.ts
/**
* Internal utilities for UI components.
*
* This module is for INTERNAL use only and should NOT be exposed to external consumers.
* External utilities should be placed in `utils/` instead.
*
* @internal
*/
/**
* Merges Tailwind CSS class names with conflict resolution.
* Combines clsx for conditional classes and tailwind-merge for deduplication.
*
* @example
* cn('px-2 py-1', 'px-4') // => 'py-1 px-4'
* cn('text-red-500', isActive && 'text-blue-500')
*/
function cn(...inputs) {
	return (0, tailwind_merge.twMerge)((0, clsx.clsx)(inputs));
}
//#endregion
//#region src/components/primitives/avatar.tsx
function Avatar({ className, size = "default", children, ...props }) {
	const imageKey = react.Children.toArray(children).reduce((found, child) => {
		if (found !== void 0) return found;
		if (react.isValidElement(child) && child.type === AvatarImage) return child.props.src ?? void 0;
	}, void 0);
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_radix_ui_react_avatar.Root, {
		"data-slot": "avatar",
		"data-size": size,
		className: cn("group/avatar relative flex size-8 shrink-0 overflow-hidden rounded-full select-none data-[size=lg]:size-10 data-[size=sm]:size-6", className),
		...props,
		children
	}, imageKey ?? "__no-avatar-image__");
}
function AvatarImage({ className, ...props }) {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_radix_ui_react_avatar.Image, {
		"data-slot": "avatar-image",
		className: cn("aspect-square size-full", className),
		...props
	});
}
function AvatarFallback({ className, ...props }) {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_radix_ui_react_avatar.Fallback, {
		"data-slot": "avatar-fallback",
		className: cn("flex size-full items-center justify-center rounded-full text-sm group-data-[size=sm]/avatar:text-xs", className),
		...props
	});
}
function AvatarBadge({ className, ...props }) {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
		"data-slot": "avatar-badge",
		className: cn("absolute right-0 bottom-0 z-10 inline-flex items-center justify-center rounded-full bg-primary text-primary-foreground ring-2 ring-background select-none", "group-data-[size=sm]/avatar:size-2 group-data-[size=sm]/avatar:[&>svg]:hidden", "group-data-[size=default]/avatar:size-2.5 group-data-[size=default]/avatar:[&>svg]:size-2", "group-data-[size=lg]/avatar:size-3 group-data-[size=lg]/avatar:[&>svg]:size-2", className),
		...props
	});
}
function AvatarGroup({ className, ...props }) {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
		"data-slot": "avatar-group",
		className: cn("group/avatar-group flex -space-x-2 *:data-[slot=avatar]:ring-2 *:data-[slot=avatar]:ring-background", className),
		...props
	});
}
function AvatarGroupCount({ className, ...props }) {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
		"data-slot": "avatar-group-count",
		className: cn("relative flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-sm text-muted-foreground ring-2 ring-background group-has-data-[size=lg]/avatar-group:size-10 group-has-data-[size=sm]/avatar-group:size-6 [&>svg]:size-4 group-has-data-[size=lg]/avatar-group:[&>svg]:size-5 group-has-data-[size=sm]/avatar-group:[&>svg]:size-3", className),
		...props
	});
}
//#endregion
Object.defineProperty(exports, "Avatar", {
	enumerable: true,
	get: function() {
		return Avatar;
	}
});
Object.defineProperty(exports, "AvatarBadge", {
	enumerable: true,
	get: function() {
		return AvatarBadge;
	}
});
Object.defineProperty(exports, "AvatarFallback", {
	enumerable: true,
	get: function() {
		return AvatarFallback;
	}
});
Object.defineProperty(exports, "AvatarGroup", {
	enumerable: true,
	get: function() {
		return AvatarGroup;
	}
});
Object.defineProperty(exports, "AvatarGroupCount", {
	enumerable: true,
	get: function() {
		return AvatarGroupCount;
	}
});
Object.defineProperty(exports, "AvatarImage", {
	enumerable: true,
	get: function() {
		return AvatarImage;
	}
});
Object.defineProperty(exports, "__commonJSMin", {
	enumerable: true,
	get: function() {
		return __commonJSMin;
	}
});
Object.defineProperty(exports, "__exportAll", {
	enumerable: true,
	get: function() {
		return __exportAll;
	}
});
Object.defineProperty(exports, "__toESM", {
	enumerable: true,
	get: function() {
		return __toESM;
	}
});
Object.defineProperty(exports, "cn", {
	enumerable: true,
	get: function() {
		return cn;
	}
});
