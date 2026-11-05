import * as React$1 from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { jsx } from "react/jsx-runtime";
import * as AvatarPrimitive from "@radix-ui/react-avatar";
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
	return twMerge(clsx(inputs));
}
//#endregion
//#region src/components/primitives/avatar.tsx
function Avatar({ className, size = "default", children, ...props }) {
	const imageKey = React$1.Children.toArray(children).reduce((found, child) => {
		if (found !== void 0) return found;
		if (React$1.isValidElement(child) && child.type === AvatarImage) return child.props.src ?? void 0;
	}, void 0);
	return /* @__PURE__ */ jsx(AvatarPrimitive.Root, {
		"data-slot": "avatar",
		"data-size": size,
		className: cn("group/avatar relative flex size-8 shrink-0 overflow-hidden rounded-full select-none data-[size=lg]:size-10 data-[size=sm]:size-6", className),
		...props,
		children
	}, imageKey ?? "__no-avatar-image__");
}
function AvatarImage({ className, ...props }) {
	return /* @__PURE__ */ jsx(AvatarPrimitive.Image, {
		"data-slot": "avatar-image",
		className: cn("aspect-square size-full", className),
		...props
	});
}
function AvatarFallback({ className, ...props }) {
	return /* @__PURE__ */ jsx(AvatarPrimitive.Fallback, {
		"data-slot": "avatar-fallback",
		className: cn("flex size-full items-center justify-center rounded-full text-sm group-data-[size=sm]/avatar:text-xs", className),
		...props
	});
}
function AvatarBadge({ className, ...props }) {
	return /* @__PURE__ */ jsx("span", {
		"data-slot": "avatar-badge",
		className: cn("absolute right-0 bottom-0 z-10 inline-flex items-center justify-center rounded-full bg-primary text-primary-foreground ring-2 ring-background select-none", "group-data-[size=sm]/avatar:size-2 group-data-[size=sm]/avatar:[&>svg]:hidden", "group-data-[size=default]/avatar:size-2.5 group-data-[size=default]/avatar:[&>svg]:size-2", "group-data-[size=lg]/avatar:size-3 group-data-[size=lg]/avatar:[&>svg]:size-2", className),
		...props
	});
}
function AvatarGroup({ className, ...props }) {
	return /* @__PURE__ */ jsx("div", {
		"data-slot": "avatar-group",
		className: cn("group/avatar-group flex -space-x-2 *:data-[slot=avatar]:ring-2 *:data-[slot=avatar]:ring-background", className),
		...props
	});
}
function AvatarGroupCount({ className, ...props }) {
	return /* @__PURE__ */ jsx("div", {
		"data-slot": "avatar-group-count",
		className: cn("relative flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-sm text-muted-foreground ring-2 ring-background group-has-data-[size=lg]/avatar-group:size-10 group-has-data-[size=sm]/avatar-group:size-6 [&>svg]:size-4 group-has-data-[size=lg]/avatar-group:[&>svg]:size-5 group-has-data-[size=sm]/avatar-group:[&>svg]:size-3", className),
		...props
	});
}
//#endregion
export { AvatarGroupCount as a, AvatarGroup as i, AvatarBadge as n, AvatarImage as o, AvatarFallback as r, cn as s, Avatar as t };
