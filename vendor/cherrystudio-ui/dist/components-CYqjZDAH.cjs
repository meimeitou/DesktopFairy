const require_avatar = require("./avatar-DqAhynaP.cjs");
const require_utils = require("./utils-CdeyJsUk.cjs");
const require_code_highlight = require("./code-highlight-DwTJhNuP.cjs");
const require_code_block = require("./code-block-_0WPk1_g.cjs");
const require_theme = require("./theme-AcPxKxLv.cjs");
const require_reorder_visible_subset = require("./reorder-visible-subset-By99U52z.cjs");
let react = require("react");
let react$1 = require_avatar.__toESM(react, 1);
react = require_avatar.__toESM(react);
let react_jsx_runtime = require("react/jsx-runtime");
let lucide_react = require("lucide-react");
let _radix_ui_react_tooltip = require("@radix-ui/react-tooltip");
let _radix_ui_react_slot = require("@radix-ui/react-slot");
let class_variance_authority = require("class-variance-authority");
let motion_react = require("motion/react");
let _radix_ui_primitive = require("@radix-ui/primitive");
let _radix_ui_react_use_controllable_state = require("@radix-ui/react-use-controllable-state");
let react_dom = require("react-dom");
react_dom = require_avatar.__toESM(react_dom, 1);
let _radix_ui_react_dialog = require("@radix-ui/react-dialog");
_radix_ui_react_dialog = require_avatar.__toESM(_radix_ui_react_dialog);
let _tanstack_react_table = require("@tanstack/react-table");
let _radix_ui_react_checkbox = require("@radix-ui/react-checkbox");
_radix_ui_react_checkbox = require_avatar.__toESM(_radix_ui_react_checkbox);
let _radix_ui_react_radio_group = require("@radix-ui/react-radio-group");
_radix_ui_react_radio_group = require_avatar.__toESM(_radix_ui_react_radio_group);
let date_fns = require("date-fns");
let react_day_picker = require("react-day-picker");
let _radix_ui_react_select = require("@radix-ui/react-select");
_radix_ui_react_select = require_avatar.__toESM(_radix_ui_react_select);
let _radix_ui_react_popover = require("@radix-ui/react-popover");
_radix_ui_react_popover = require_avatar.__toESM(_radix_ui_react_popover);
let _radix_ui_react_scroll_area = require("@radix-ui/react-scroll-area");
_radix_ui_react_scroll_area = require_avatar.__toESM(_radix_ui_react_scroll_area);
let _radix_ui_react_use_callback_ref = require("@radix-ui/react-use-callback-ref");
let react_hook_form = require("react-hook-form");
let _radix_ui_react_label = require("@radix-ui/react-label");
_radix_ui_react_label = require_avatar.__toESM(_radix_ui_react_label);
let remark_definition_list = require("remark-definition-list");
remark_definition_list = require_avatar.__toESM(remark_definition_list);
let remark_github_blockquote_alert = require("remark-github-blockquote-alert");
remark_github_blockquote_alert = require_avatar.__toESM(remark_github_blockquote_alert);
let remark_mark_highlight = require("remark-mark-highlight");
let streamdown = require("streamdown");
let unist_util_visit = require("unist-util-visit");
let unified = require("unified");
let _streamdown_cjk = require("@streamdown/cjk");
let _streamdown_math = require("@streamdown/math");
let _radix_ui_react_context_menu = require("@radix-ui/react-context-menu");
_radix_ui_react_context_menu = require_avatar.__toESM(_radix_ui_react_context_menu);
let _dnd_kit_abstract_modifiers = require("@dnd-kit/abstract/modifiers");
let _dnd_kit_collision = require("@dnd-kit/collision");
let _dnd_kit_dom = require("@dnd-kit/dom");
let _dnd_kit_dom_modifiers = require("@dnd-kit/dom/modifiers");
let _dnd_kit_dom_utilities = require("@dnd-kit/dom/utilities");
let _dnd_kit_helpers = require("@dnd-kit/helpers");
let _dnd_kit_react = require("@dnd-kit/react");
let _dnd_kit_react_sortable = require("@dnd-kit/react/sortable");
let _dnd_kit_core = require("@dnd-kit/core");
let _dnd_kit_utilities = require("@dnd-kit/utilities");
let _radix_ui_react_accordion = require("@radix-ui/react-accordion");
_radix_ui_react_accordion = require_avatar.__toESM(_radix_ui_react_accordion);
let _radix_ui_react_separator = require("@radix-ui/react-separator");
_radix_ui_react_separator = require_avatar.__toESM(_radix_ui_react_separator);
let cmdk = require("cmdk");
let vaul = require("vaul");
let _radix_ui_react_dropdown_menu = require("@radix-ui/react-dropdown-menu");
_radix_ui_react_dropdown_menu = require_avatar.__toESM(_radix_ui_react_dropdown_menu);
let _radix_ui_react_hover_card = require("@radix-ui/react-hover-card");
_radix_ui_react_hover_card = require_avatar.__toESM(_radix_ui_react_hover_card);
let react_resizable_panels = require("react-resizable-panels");
react_resizable_panels = require_avatar.__toESM(react_resizable_panels);
let react_dropzone = require("react-dropzone");
let _radix_ui_react_slider = require("@radix-ui/react-slider");
_radix_ui_react_slider = require_avatar.__toESM(_radix_ui_react_slider);
let _radix_ui_react_tabs = require("@radix-ui/react-tabs");
_radix_ui_react_tabs = require_avatar.__toESM(_radix_ui_react_tabs);
//#region src/components/primitives/bar-visualizer.tsx
function BarVisualizer({ analyser, state, barCount = 15, minHeight = 6, maxHeight = 100, className, ...props }) {
	const bars = (0, react.useRef)([]);
	(0, react.useEffect)(() => {
		const reset = () => bars.current.forEach((bar) => bar?.style.setProperty("height", `${minHeight}%`));
		reset();
		if (!analyser || state !== "speaking" && state !== "listening") return;
		const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
		const frequencies = new Uint8Array(analyser.frequencyBinCount);
		const binWidth = analyser.context.sampleRate / analyser.fftSize;
		const upperFrequency = Math.min(8e3, analyser.context.sampleRate / 2);
		let frame = 0;
		let lastUpdate = 0;
		const update = (timestamp) => {
			if (timestamp - lastUpdate >= 1e3 / 30) {
				analyser.getByteFrequencyData(frequencies);
				for (let index = 0; index < barCount; index++) {
					const low = Math.floor(80 * (upperFrequency / 80) ** (index / barCount) / binWidth);
					const high = Math.min(frequencies.length, Math.max(low + 1, Math.ceil(80 * (upperFrequency / 80) ** ((index + 1) / barCount) / binWidth)));
					let total = 0;
					for (let bin = low; bin < high; bin++) total += frequencies[bin];
					const volume = total / Math.max(1, high - low) / 255;
					const height = Math.min(maxHeight, Math.max(minHeight, volume * 100));
					bars.current[index]?.style.setProperty("height", `${height}%`);
				}
				lastUpdate = timestamp;
			}
			frame = requestAnimationFrame(update);
		};
		const synchronize = () => {
			cancelAnimationFrame(frame);
			if (document.hidden || reducedMotion.matches) reset();
			else frame = requestAnimationFrame(update);
		};
		synchronize();
		document.addEventListener("visibilitychange", synchronize);
		reducedMotion.addEventListener("change", synchronize);
		return () => {
			cancelAnimationFrame(frame);
			document.removeEventListener("visibilitychange", synchronize);
			reducedMotion.removeEventListener("change", synchronize);
			reset();
		};
	}, [
		analyser,
		state,
		barCount,
		minHeight,
		maxHeight
	]);
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
		"data-slot": "bar-visualizer",
		"data-state": state,
		className: require_avatar.cn("flex h-8 w-24 items-center justify-center gap-0.5 overflow-hidden text-primary", className),
		...props,
		children: Array.from({ length: barCount }, (_, index) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
			ref: (bar) => {
				bars.current[index] = bar;
			},
			className: "max-w-1 min-w-0 flex-1 rounded-full bg-current transition-[height] duration-150 ease-out motion-reduce:transition-none",
			style: { height: `${minHeight}%` }
		}, index))
	});
}
//#endregion
//#region src/components/primitives/circular-progress.tsx
const clamp$2 = (value, min, max) => Math.min(max, Math.max(min, value));
const CircularProgress = ({ value, renderLabel, className, progressClassName, labelClassName, showLabel = false, shape = "round", size = 100, strokeWidth, circleStrokeWidth = 10, progressStrokeWidth = 10 }) => {
	const normalizedValue = clamp$2(value, 0, 100);
	const resolvedCircleWidth = strokeWidth ?? circleStrokeWidth;
	const resolvedProgressWidth = strokeWidth ?? progressStrokeWidth;
	const maxStrokeWidth = Math.max(resolvedCircleWidth, resolvedProgressWidth);
	const radius = size / 2 - maxStrokeWidth / 2;
	const circumference = 2 * Math.PI * radius;
	const offset = circumference * (1 - normalizedValue / 100);
	return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
		className: "relative inline-flex items-center justify-center",
		children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
			width: size,
			height: size,
			viewBox: `0 0 ${size} ${size}`,
			version: "1.1",
			xmlns: "http://www.w3.org/2000/svg",
			style: {
				transform: "rotate(-90deg)",
				transformOrigin: "50% 50%"
			},
			className: "block",
			children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("circle", {
				r: radius,
				cx: size / 2,
				cy: size / 2,
				fill: "transparent",
				strokeWidth: resolvedCircleWidth,
				strokeDasharray: circumference,
				strokeDashoffset: "0",
				className: require_avatar.cn("stroke-primary/25", className)
			}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("circle", {
				r: radius,
				cx: size / 2,
				cy: size / 2,
				strokeWidth: resolvedProgressWidth,
				strokeLinecap: shape,
				strokeDashoffset: offset,
				fill: "transparent",
				strokeDasharray: circumference,
				className: require_avatar.cn("stroke-primary", progressClassName)
			})]
		}), showLabel && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
			className: require_avatar.cn("absolute inset-0 flex items-center justify-center text-sm", labelClassName),
			children: renderLabel ? renderLabel(normalizedValue) : normalizedValue
		})]
	});
};
//#endregion
//#region src/components/primitives/portal-container.tsx
const PortalContainerContext = react.createContext(null);
const TooltipPortalContainerContext = react.createContext(null);
const TooltipZIndexContext = react.createContext(void 0);
const DialogPortalContainerContext = react.createContext(null);
/**
* Overlays should portal into the nearest provided container, usually dialog
* content, so Radix focus traps and dismiss layers treat nested overlays as
* inside the same interaction boundary.
*
* @param tooltipContainer - Portal target for tooltips, which never take focus and so
*   can live outside a container that clips them. Defaults to `container`.
* @param tooltipZIndex - z-index for tooltips portaled outside `container`, so they stack
*   above the surface that owns them. Omitted, tooltips keep their own z-index.
*/
function PortalContainerProvider({ container, tooltipContainer = container, tooltipZIndex, children }) {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(PortalContainerContext, {
		value: container,
		children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(TooltipPortalContainerContext, {
			value: tooltipContainer,
			children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(TooltipZIndexContext, {
				value: tooltipZIndex,
				children
			})
		})
	});
}
function usePortalContainer() {
	return react.use(PortalContainerContext);
}
function useTooltipPortalContainer() {
	return react.use(TooltipPortalContainerContext);
}
function useTooltipZIndex() {
	return react.use(TooltipZIndexContext);
}
/**
* Dialogs use a page-level portal target so they remain attached to their owning
* tab without inheriting the transformed content node of a parent dialog.
*/
function DialogPortalContainerProvider({ container, children }) {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(DialogPortalContainerContext, {
		value: container,
		children
	});
}
function useDialogPortalContainer() {
	return react.use(DialogPortalContainerContext);
}
//#endregion
//#region src/components/primitives/tooltip.tsx
/**
* Tooltips anchored in a surface hidden via display:none (<Activity>) never see the leave events
* that would close them and park at the viewport origin; an inactive surface drops them at once.
*/
const TooltipSurfaceContext = react.createContext(true);
/** Marks a subtree as the anchoring surface for tooltips; inactive surfaces disable their tooltips. */
const TooltipSurface = ({ active = true, children }) => {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(TooltipSurfaceContext, {
		value: active,
		children
	});
};
function parsePlacement(placement) {
	return {
		top: {
			side: "top",
			align: "center"
		},
		"top-start": {
			side: "top",
			align: "start"
		},
		"top-end": {
			side: "top",
			align: "end"
		},
		bottom: {
			side: "bottom",
			align: "center"
		},
		"bottom-start": {
			side: "bottom",
			align: "start"
		},
		"bottom-end": {
			side: "bottom",
			align: "end"
		},
		bottomRight: {
			side: "bottom",
			align: "end"
		},
		left: {
			side: "left",
			align: "center"
		},
		"left-start": {
			side: "left",
			align: "start"
		},
		"left-end": {
			side: "left",
			align: "end"
		},
		right: {
			side: "right",
			align: "center"
		},
		"right-start": {
			side: "right",
			align: "start"
		},
		"right-end": {
			side: "right",
			align: "end"
		}
	}[placement ?? "top"] ?? {
		side: "top",
		align: "center"
	};
}
function useTooltipUnmountDelay(open) {
	const [visible, setVisible] = react.useState(open);
	react.useEffect(() => {
		if (open) {
			setVisible(true);
			return;
		}
		const timer = window.setTimeout(() => setVisible(false), 150);
		return () => window.clearTimeout(timer);
	}, [open]);
	return visible;
}
/** 清扫延迟 = 退出动画窗口 + 余量：正常实例在退出窗口内自行卸载，此期间不触发清扫。 */
const TOOLTIP_SWEEP_DELAY_MS = 200;
/** open 态重检周期：打开的内容无法仅凭 data-state 区分活实例与残骸，需周期性核对 trigger 引用。 */
const STALE_OPEN_SWEEP_MS = 3e3;
/** 清扫目标：本组件门控渲染且带清扫标记的内容（原生属性查询，避免逐元素 JS 判定）。 */
const SWEEPABLE_CONTENT_SELECTOR = "[data-slot=\"tooltip-content\"][data-tooltip-sweepable]";
/**
* 受控 + 挂载生命周期：受控（controlledOpen 非空）时外部权威、内部状态不参与；
* 非受控时内部状态跟随 Radix 开关。`Tooltip` 与 `TooltipRoot` 共用，避免两路漂移。
*/
function useTooltipController(controlledOpen, onOpenChange, defaultOpen = false, disabled = false) {
	const [innerOpen, setInnerOpen] = react.useState(controlledOpen ?? defaultOpen);
	const [wasControlled, setWasControlled] = react.useState(controlledOpen != null);
	if (wasControlled !== (controlledOpen != null)) {
		setWasControlled(controlledOpen != null);
		if (controlledOpen == null) setInnerOpen(false);
	}
	const effectiveOpen = controlledOpen != null ? controlledOpen : disabled ? false : innerOpen;
	const contentVisible = useTooltipUnmountDelay(effectiveOpen);
	const [wasDisabled, setWasDisabled] = react.useState(disabled);
	if (wasDisabled !== disabled) {
		setWasDisabled(disabled);
		setInnerOpen(false);
	}
	return {
		contentVisible,
		effectiveOpen,
		handleOpenChange: react.useCallback((next) => {
			if (controlledOpen == null) setInnerOpen(next);
			onOpenChange?.(next);
		}, [controlledOpen, onOpenChange])
	};
}
/**
* 孤儿清扫器（模块级，单例）：Radix portal content 在重挂风暴中可能失去 React owner 而
* 永久残留。closed 连续存活超过清扫延迟即移除；open 态（instant-open/delayed-open）无法
* 仅凭 data-state 区分活实例与残骸，周期性核对「仍被 floating-ui 定位」且「trigger 仍通过
* aria-describedby 引用 content 内 role=tooltip span 的 id」两个存活特征：超过一个重检
* 周期两者皆无才移除，任一存在则续期。不依赖任何实例生命周期（实例卸载会取消其
* timer，故清扫必须与实例生命周期解耦）。只清扫渲染时带 data-tooltip-sweepable 的内容
* （即本组件非显式 forceMount 的门控渲染内容）；显式 forceMount 内容由用户持有，不受影响。
*/
function setupTooltipOrphanSweeper() {
	const pending = /* @__PURE__ */ new WeakMap();
	const observedRoots = /* @__PURE__ */ new WeakSet();
	const shadowRoots = [];
	/** 查找对某 contentId 的 trigger 引用：document 单查询 + 已观察 shadow root 逐个单查询。
	* 只覆盖已观察的 shadow root（宿主插入后迟 attach 的 root 为已知边界）；iframe 不可达。 */
	const hasActiveAriaReference = (tooltipId) => {
		const selector = `[aria-describedby~="${CSS.escape(tooltipId)}"]`;
		if (document.querySelector(selector)) return true;
		for (let i = shadowRoots.length - 1; i >= 0; i--) {
			const root = shadowRoots[i].deref();
			if (!root) {
				shadowRoots.splice(i, 1);
				continue;
			}
			if (root.isConnected && root.querySelector(selector)) return true;
		}
		return false;
	};
	/** 内容是否脱离 popper 定位：活实例恒被 floating-ui 定位（wrapper 保有 transform），
	* popper 失去 floating 元素时该 transform 会被移除；删除中断（React 抛错）的残骸不在覆盖内。 */
	const isUnpositioned = (node) => {
		const wrapper = node.parentElement;
		return !wrapper?.hasAttribute("data-radix-popper-content-wrapper") || !wrapper.style.transform;
	};
	const cancelPending = (node) => {
		const previous = pending.get(node);
		if (previous != null) window.clearTimeout(previous);
		pending.delete(node);
	};
	const maybeSweep = (node) => {
		cancelPending(node);
		const state = node.getAttribute("data-state");
		if (state === "closed") pending.set(node, window.setTimeout(() => {
			pending.delete(node);
			if (node.isConnected && node.hasAttribute("data-tooltip-sweepable") && node.getAttribute("data-state") === "closed") node.remove();
		}, TOOLTIP_SWEEP_DELAY_MS));
		else if (state) pending.set(node, window.setTimeout(() => {
			if (!node.isConnected || !node.hasAttribute("data-tooltip-sweepable")) {
				pending.delete(node);
				return;
			}
			if (node.getAttribute("data-state") === "closed") {
				pending.delete(node);
				maybeSweep(node);
				return;
			}
			const tooltipIds = Array.from(node.querySelectorAll("[role=\"tooltip\"][id]")).map((el) => el.id).filter(Boolean);
			if (tooltipIds.length > 0 && isUnpositioned(node) && tooltipIds.every((id) => !hasActiveAriaReference(id))) {
				pending.delete(node);
				node.remove();
				return;
			}
			maybeSweep(node);
		}, STALE_OPEN_SWEEP_MS));
	};
	const observer = new MutationObserver((mutations) => {
		for (const mutation of mutations) {
			if (mutation.type === "attributes") {
				const target = mutation.target;
				if (target.getAttribute("data-slot") === "tooltip-content") {
					if (target.hasAttribute("data-tooltip-sweepable")) maybeSweep(target);
					else cancelPending(target);
				}
				continue;
			}
			for (const node of mutation.addedNodes) {
				const element = node;
				const isElement = element.nodeType === 1;
				if (!isElement && element.nodeType !== 11) continue;
				if (isElement && element.parentElement?.getAttribute("data-slot") === "tooltip-content") continue;
				if (isElement && element.matches(SWEEPABLE_CONTENT_SELECTOR)) maybeSweep(element);
				for (const target of element.querySelectorAll(SWEEPABLE_CONTENT_SELECTOR)) maybeSweep(target);
				if (isElement && element.shadowRoot) scanShadowTree(element.shadowRoot);
				for (const child of element.children) if (child.shadowRoot) scanShadowTree(child.shadowRoot);
			}
		}
	});
	function scanShadowTree(root) {
		ensureObserved(root);
		for (const el of root.querySelectorAll(SWEEPABLE_CONTENT_SELECTOR)) maybeSweep(el);
		for (const child of root.children) if (child.shadowRoot) scanShadowTree(child.shadowRoot);
	}
	function ensureObserved(root) {
		if (observedRoots.has(root)) return;
		observedRoots.add(root);
		if (root instanceof ShadowRoot) shadowRoots.push(new WeakRef(root));
		observer.observe(root, {
			childList: true,
			subtree: true,
			attributes: true,
			attributeFilter: ["data-state", "data-tooltip-sweepable"]
		});
	}
	ensureObserved(document);
}
if (typeof document !== "undefined" && typeof window !== "undefined") setupTooltipOrphanSweeper();
/** 由 TooltipRoot 提供，让低层 TooltipContent 走同一套挂载接管；无 Provider 时保持原行为。 */
const TooltipOverlayContext = react.createContext(null);
function TooltipProvider({ delayDuration = 0, ...props }) {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_radix_ui_react_tooltip.Provider, {
		"data-slot": "tooltip-provider",
		delayDuration,
		...props
	});
}
function TooltipRoot({ delayDuration = 0, open: openProp, defaultOpen, onOpenChange, ...props }) {
	const surfaceActive = react.use(TooltipSurfaceContext);
	const { contentVisible: controllerContentVisible, effectiveOpen: controllerEffectiveOpen, handleOpenChange } = useTooltipController(openProp, onOpenChange, defaultOpen, !surfaceActive);
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(TooltipOverlayContext, {
		value: surfaceActive && controllerContentVisible,
		children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(TooltipProvider, {
			delayDuration,
			children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_radix_ui_react_tooltip.Root, {
				"data-slot": "tooltip",
				delayDuration,
				open: surfaceActive && controllerEffectiveOpen,
				onOpenChange: handleOpenChange,
				...props
			})
		})
	});
}
function TooltipTrigger({ onFocus, ...props }) {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_radix_ui_react_tooltip.Trigger, {
		"data-slot": "tooltip-trigger",
		onFocus: (e) => {
			onFocus?.(e);
			if (!e.defaultPrevented && !e.target.matches(":focus-visible")) e.preventDefault();
		},
		...props
	});
}
const contentStyles = "z-[80] w-fit max-w-80 origin-(--radix-tooltip-content-transform-origin) rounded-md bg-neutral-900 px-3 py-1.5 text-neutral-50 text-xs leading-relaxed whitespace-normal break-words data-[state*=open]:animate-in data-[state*=open]:fade-in-0 data-[state*=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 dark:bg-neutral-100 dark:text-neutral-900 [-webkit-app-region:no-drag]";
const arrowStyles = "z-[80] -translate-y-px fill-neutral-900 stroke-neutral-900 stroke-2 dark:fill-neutral-100 dark:stroke-neutral-100 [paint-order:stroke_fill]";
function TooltipContent({ className, sideOffset = 8, children, portalContainer, showArrow = true, forceMount, style, ...props }) {
	const defaultPortalContainer = useTooltipPortalContainer();
	const zIndex = useTooltipZIndex();
	const contentVisible = react.use(TooltipOverlayContext);
	if (contentVisible === false && !forceMount) return null;
	const container = portalContainer ?? defaultPortalContainer ?? void 0;
	const contentStyle = zIndex ? {
		zIndex,
		...style
	} : style;
	const arrow = showArrow ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_radix_ui_react_tooltip.Arrow, {
		width: 12,
		height: 6,
		className: arrowStyles
	}) : null;
	if (contentVisible !== null) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_radix_ui_react_tooltip.Portal, {
		container,
		forceMount: true,
		children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(_radix_ui_react_tooltip.Content, {
			"data-slot": "tooltip-content",
			"data-tooltip-sweepable": forceMount ? void 0 : "",
			sideOffset,
			forceMount: true,
			className: require_avatar.cn(contentStyles, className),
			style: contentStyle,
			...props,
			children: [children, arrow]
		})
	});
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_radix_ui_react_tooltip.Portal, {
		container,
		forceMount: forceMount ? true : void 0,
		children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(_radix_ui_react_tooltip.Content, {
			"data-slot": "tooltip-content",
			sideOffset,
			forceMount,
			className: require_avatar.cn(contentStyles, className),
			style: contentStyle,
			...props,
			children: [children, arrow]
		})
	});
}
const Tooltip = ({ children, content, title, placement, delay = 0, sideOffset = 8, showArrow = true, fullWidthTrigger = false, classNames, className, isDisabled, isOpen, onOpenChange, onClick, portalContainer, asChild = false }) => {
	const tooltipContent = content ?? title;
	const defaultPortalContainer = useTooltipPortalContainer();
	const zIndex = useTooltipZIndex();
	const surfaceActive = react.use(TooltipSurfaceContext);
	const disabled = !tooltipContent || isDisabled || !surfaceActive;
	const { contentVisible, effectiveOpen, handleOpenChange } = useTooltipController(isOpen, onOpenChange, false, disabled);
	const triggerWrapperClassName = require_avatar.cn("relative z-10", fullWidthTrigger ? "block w-full max-w-full min-w-0" : "inline-block", classNames?.placeholder);
	if (disabled) {
		if (asChild) return children;
		return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
			className: triggerWrapperClassName,
			onClick,
			children
		});
	}
	const { side, align } = parsePlacement(placement);
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(TooltipProvider, {
		delayDuration: delay,
		children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(_radix_ui_react_tooltip.Root, {
			delayDuration: delay,
			open: effectiveOpen,
			onOpenChange: handleOpenChange,
			children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(TooltipTrigger, {
				asChild: true,
				children: asChild ? children : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: triggerWrapperClassName,
					onClick,
					children
				})
			}), contentVisible && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_radix_ui_react_tooltip.Portal, {
				container: portalContainer ?? defaultPortalContainer ?? void 0,
				forceMount: true,
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(_radix_ui_react_tooltip.Content, {
					"data-slot": "tooltip-content",
					"data-tooltip-sweepable": true,
					forceMount: true,
					side,
					align,
					sideOffset,
					className: require_avatar.cn(contentStyles, classNames?.content, className),
					style: zIndex ? { zIndex } : void 0,
					children: [tooltipContent, showArrow && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_radix_ui_react_tooltip.Arrow, {
						width: 12,
						height: 6,
						className: arrowStyles
					})]
				})
			})]
		})
	});
};
const NormalTooltip = ({ children, content, side, align, sideOffset, asChild = true, triggerProps, contentProps, showArrow = true, ...tooltipProps }) => {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(TooltipRoot, {
		...tooltipProps,
		children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(TooltipTrigger, {
			asChild,
			...triggerProps,
			children
		}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(TooltipContent, {
			side,
			align,
			sideOffset,
			showArrow,
			...contentProps,
			children: content
		})]
	});
};
//#endregion
//#region src/components/primitives/copy-button.tsx
const CopyButton = ({ tooltip, label, size = 14, className = "", ...props }) => {
	const button = /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
		className: `flex cursor-pointer flex-row items-center gap-1 text-gray-600 transition-colors duration-200 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 ${className}`,
		...props,
		children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(lucide_react.Copy, {
			size,
			className: "transition-colors duration-200"
		}), label && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
			style: { fontSize: `${size}px` },
			children: label
		})]
	});
	if (tooltip) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Tooltip, {
		content: tooltip,
		children: button
	});
	return button;
};
//#endregion
//#region src/components/primitives/custom-tag.tsx
const CustomTag = ({ children, icon, color, size = 12, style, tooltip, closable = false, onClose, onClick, onContextMenu, disabled, inactive, className = "" }) => {
	const actualColor = inactive ? "#aaaaaa" : color;
	const tagContent = (0, react.useMemo)(() => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
		className: `relative inline-flex items-center gap-1 rounded-full whitespace-nowrap transition-opacity duration-200 ${!disabled && onClick ? "cursor-pointer hover:opacity-80" : disabled ? "cursor-not-allowed" : "cursor-auto"} ${className}`,
		style: {
			padding: `${size / 3}px ${closable ? size * 1.8 : size * .8}px ${size / 3}px ${size * .8}px`,
			color: actualColor,
			backgroundColor: actualColor + "20",
			fontSize: `${size}px`,
			lineHeight: 1,
			...style
		},
		onClick: disabled ? void 0 : onClick,
		onContextMenu: disabled ? void 0 : onContextMenu,
		children: [
			icon && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
				className: "inline-flex items-center justify-center",
				style: {
					fontSize: `${size}px`,
					color: "currentColor"
				},
				children: icon
			}),
			children,
			closable && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: "absolute flex cursor-pointer items-center justify-center rounded-full transition-all duration-200 hover:bg-[#da8a8a] hover:text-white",
				style: {
					right: `${size * .2}px`,
					top: `${size * .2}px`,
					bottom: `${size * .2}px`,
					fontSize: `${size * .8}px`,
					color: actualColor,
					aspectRatio: 1
				},
				onClick: (e) => {
					e.stopPropagation();
					onClose?.();
				},
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(lucide_react.X, { size: size * .8 })
			})
		]
	}), [
		actualColor,
		children,
		closable,
		disabled,
		icon,
		onClick,
		onClose,
		onContextMenu,
		size,
		style,
		className
	]);
	return tooltip ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Tooltip, {
		content: tooltip,
		delay: 300,
		children: tagContent
	}) : tagContent;
};
var custom_tag_default = (0, react.memo)(CustomTag);
//#endregion
//#region src/components/primitives/divider.tsx
/**
* A simple divider component for visual separation.
* For more complex use cases with text, use DividerWithText instead.
*/
const Divider = ({ className, orientation = "horizontal", ...props }) => {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
		role: "separator",
		"aria-orientation": orientation,
		className: require_avatar.cn("shrink-0 border-0", orientation === "horizontal" ? "my-2.5 h-px w-full border-t-[0.5px] border-solid border-(--color-border)" : "mx-2.5 h-full w-px border-l-[0.5px] border-solid border-(--color-border)", className),
		...props
	});
};
//#endregion
//#region src/components/primitives/divider-with-text.tsx
const DividerWithText = ({ text, style, className = "" }) => {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
		className: `my-0 flex items-center ${className}`,
		style,
		children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
			className: "mr-2 text-xs text-gray-600 dark:text-gray-400",
			children: text
		}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", { className: "h-px flex-1 bg-gray-200 dark:bg-gray-700" })]
	});
};
//#endregion
//#region src/components/primitives/emoji-icon.tsx
const EmojiIcon = ({ emoji, className, size = 26, fontSize, fluid = false }) => {
	const wrapperStyle = fluid ? { containerType: "inline-size" } : {
		width: `${size}px`,
		height: `${size}px`,
		borderRadius: `${size / 2}px`,
		containerType: "inline-size"
	};
	const foregroundFontSize = fontSize === void 0 ? "70cqi" : `${fontSize}px`;
	const backgroundFontSize = fontSize === void 0 ? "120cqi" : `${fontSize * 2}px`;
	return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
		"data-slot": "emoji-icon",
		className: require_avatar.cn("relative flex shrink-0 items-center justify-center overflow-hidden rounded-full", fluid && "h-full w-full", className),
		style: wrapperStyle,
		children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
			"data-slot": "emoji-icon-background",
			"aria-hidden": "true",
			className: "absolute inset-0 flex items-center justify-center opacity-40 blur-sm",
			style: {
				fontSize: backgroundFontSize,
				lineHeight: 1,
				transform: "scale(1.5)"
			},
			children: emoji || "⭐️"
		}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
			"data-slot": "emoji-icon-foreground",
			className: "relative flex items-center justify-center",
			style: {
				fontSize: foregroundFontSize,
				lineHeight: 1
			},
			children: emoji
		})]
	});
};
//#endregion
//#region ../../node_modules/.pnpm/react-error-boundary@6.0.1_react-dom@19.2.3_react@19.2.3__react@19.2.3/node_modules/react-error-boundary/dist/react-error-boundary.cjs
var require_react_error_boundary = /* @__PURE__ */ require_avatar.__commonJSMin(((exports) => {
	Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
	const s = require("react");
	const c = s.createContext(null);
	const u = {
		didCatch: !1,
		error: null
	};
	var l = class extends s.Component {
		constructor(e) {
			super(e), this.resetErrorBoundary = this.resetErrorBoundary.bind(this), this.state = u;
		}
		static getDerivedStateFromError(e) {
			return {
				didCatch: !0,
				error: e
			};
		}
		resetErrorBoundary(...e) {
			const { error: t } = this.state;
			t !== null && (this.props.onReset?.({
				args: e,
				reason: "imperative-api"
			}), this.setState(u));
		}
		componentDidCatch(e, t) {
			this.props.onError?.(e, t);
		}
		componentDidUpdate(e, t) {
			const { didCatch: o } = this.state, { resetKeys: n } = this.props;
			o && t.error !== null && y(e.resetKeys, n) && (this.props.onReset?.({
				next: n,
				prev: e.resetKeys,
				reason: "keys"
			}), this.setState(u));
		}
		render() {
			const { children: e, fallbackRender: t, FallbackComponent: o, fallback: n } = this.props, { didCatch: a, error: i } = this.state;
			let d = e;
			if (a) {
				const h = {
					error: i,
					resetErrorBoundary: this.resetErrorBoundary
				};
				if (typeof t == "function") d = t(h);
				else if (o) d = s.createElement(o, h);
				else if (n !== void 0) d = n;
				else throw i;
			}
			return s.createElement(c.Provider, { value: {
				didCatch: a,
				error: i,
				resetErrorBoundary: this.resetErrorBoundary
			} }, d);
		}
	};
	function y(r = [], e = []) {
		return r.length !== e.length || r.some((t, o) => !Object.is(t, e[o]));
	}
	function E(r) {
		return r !== null && typeof r == "object" && "didCatch" in r && typeof r.didCatch == "boolean" && "error" in r && "resetErrorBoundary" in r && typeof r.resetErrorBoundary == "function";
	}
	function f(r) {
		if (!E(r)) throw new Error("ErrorBoundaryContext not found");
	}
	function p() {
		const r = s.useContext(c);
		f(r);
		const { error: e, resetErrorBoundary: t } = r, [o, n] = s.useState({
			error: null,
			hasError: !1
		}), a = s.useMemo(() => ({
			error: e,
			resetBoundary: () => {
				t(), n({
					error: null,
					hasError: !1
				});
			},
			showBoundary: (i) => n({
				error: i,
				hasError: !0
			})
		}), [e, t]);
		if (o.hasError) throw o.error;
		return a;
	}
	function B(r, e) {
		const t = s.forwardRef((n, a) => s.createElement(l, e, s.createElement(r, {
			...n,
			ref: a
		})));
		return t.displayName = `withErrorBoundary(${r.displayName || r.name || "Unknown"})`, t;
	}
	exports.ErrorBoundary = l;
	exports.ErrorBoundaryContext = c;
	exports.useErrorBoundary = p;
	exports.withErrorBoundary = B;
}));
//#endregion
//#region src/components/primitives/button.tsx
const buttonVariants$1 = (0, class_variance_authority.cva)(require_avatar.cn("inline-flex items-center justify-center gap-2 whitespace-nowrap", "rounded-md font-normal transition-all", "disabled:pointer-events-none disabled:opacity-40", "shrink-0 outline-none aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&_.lucide:not(.lucide-custom)]:text-current [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4", "data-[busy=true]:cursor-progress data-[busy=true]:opacity-40", "shadow-xs"), {
	variants: {
		variant: {
			default: "bg-neutral-900 text-white hover:bg-neutral-800 focus-visible:bg-neutral-800 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-200 dark:focus-visible:bg-neutral-200",
			destructive: "bg-destructive text-white hover:bg-destructive-hover focus-visible:bg-destructive-hover",
			outline: "border border-border bg-transparent text-foreground shadow-none hover:bg-accent focus-visible:border-primary focus-visible:bg-accent",
			secondary: "rounded-lg bg-secondary text-secondary-foreground shadow-none hover:bg-secondary-hover focus-visible:bg-secondary-hover",
			/** Dialog primary action style: same color hierarchy as default, with a flatter v2 shell. */
			emphasis: "rounded-lg bg-neutral-900 text-white shadow-none hover:bg-neutral-800 focus-visible:bg-neutral-800 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-200 dark:focus-visible:bg-neutral-200",
			ghost: "text-neutral-900 shadow-none hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent focus-visible:text-accent-foreground dark:text-neutral-100",
			link: "text-neutral-900 underline-offset-4 hover:text-neutral-700 hover:underline focus-visible:text-neutral-700 focus-visible:underline dark:text-neutral-100 dark:hover:text-neutral-300 dark:focus-visible:text-neutral-300"
		},
		size: {
			default: "min-h-7.5 gap-1.5 px-2.5 text-[13px]",
			sm: "min-h-7 gap-1.5 px-2.5 text-xs",
			lg: "min-h-9 px-4 text-sm",
			icon: "size-9",
			"icon-sm": "size-7",
			"icon-lg": "size-10",
			/** Navbar / toolbar icon button: 30px box, 18px icon (8px radius from base). */
			"icon-navbar": "size-[30px] [&_svg]:!size-[18px]"
		}
	},
	defaultVariants: {
		variant: "default",
		size: "default"
	}
});
function Button({ className, variant, size, asChild = false, loading = false, loadingIcon, loadingIconClassName, disabled, children, ...props }) {
	const Comp = asChild ? _radix_ui_react_slot.Slot : "button";
	const getSpinnerSize = () => {
		if (size === "icon-sm") return 13;
		if (size === "sm") return 14;
		if (size === "icon-navbar") return 18;
		if (size === "lg" || size === "icon-lg") return 18;
		return 16;
	};
	const defaultLoadingIcon = /* @__PURE__ */ (0, react_jsx_runtime.jsx)(lucide_react.Loader, {
		className: require_avatar.cn("animate-spin", loadingIconClassName),
		size: getSpinnerSize()
	});
	const spinnerElement = loadingIcon ?? defaultLoadingIcon;
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Comp, {
		"data-slot": "button",
		"data-variant": variant ?? "default",
		className: require_avatar.cn(buttonVariants$1({
			variant,
			size,
			className
		})),
		disabled: disabled || loading,
		"aria-busy": loading || void 0,
		"data-busy": loading || void 0,
		...props,
		children: asChild ? children : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [loading && spinnerElement, children] })
	});
}
//#endregion
//#region src/components/primitives/error-boundary/utils.ts
var import_react_error_boundary = require_react_error_boundary();
function formatErrorMessage(error) {
	if (error.message) return error.message;
	return error.toString();
}
//#endregion
//#region src/components/primitives/error-boundary/index.tsx
const DefaultFallback = (props) => {
	const { error, onDebugClick, onReloadClick, debugButtonText = "Open DevTools", reloadButtonText = "Reload", errorMessage = "An error occurred" } = props;
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
		className: "flex w-full items-center justify-center p-2",
		children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
			className: "w-full rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20",
			children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "flex items-start gap-3",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(lucide_react.AlertTriangle, {
					className: "mt-0.5 flex-shrink-0 text-red-500 dark:text-red-400",
					size: 20
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: "flex-1",
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", {
							className: "mb-1 text-sm font-medium text-red-800 dark:text-red-200",
							children: errorMessage
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: "mb-3 text-sm text-red-700 dark:text-red-300",
							children: formatErrorMessage(error)
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: "flex gap-2",
							children: [onDebugClick && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
								size: "sm",
								variant: "destructive",
								onClick: onDebugClick,
								children: debugButtonText
							}), onReloadClick && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
								size: "sm",
								variant: "destructive",
								onClick: onReloadClick,
								children: reloadButtonText
							})]
						})
					]
				})]
			})
		})
	});
};
const ErrorBoundaryCustomized = ({ children, fallbackComponent, onDebugClick, onReloadClick, debugButtonText, reloadButtonText, errorMessage }) => {
	const FallbackComponent = fallbackComponent ?? DefaultFallback;
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(import_react_error_boundary.ErrorBoundary, {
		FallbackComponent: (props) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(FallbackComponent, {
			...props,
			onDebugClick,
			onReloadClick,
			debugButtonText,
			reloadButtonText,
			errorMessage
		}),
		children
	});
};
//#endregion
//#region src/components/primitives/indicator-light.tsx
const IndicatorLight = ({ color, size = 8, shadow = true, style, animation = true, className = "" }) => {
	const actualColor = color === "green" ? "#22c55e" : color;
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
		className: `rounded-full ${animation ? "animate-pulse" : ""} ${className}`,
		style: {
			width: `${size}px`,
			height: `${size}px`,
			backgroundColor: actualColor,
			boxShadow: shadow ? `0 0 6px ${actualColor}` : "none",
			...style
		}
	});
};
//#endregion
//#region src/components/primitives/spinner.tsx
const spinnerVariants = {
	defaultColor: { color: "#2a2a2a" },
	dimmed: { color: "#8C9296" }
};
function Spinner({ text, className = "" }) {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(motion_react.motion.div, {
		className: `flex items-center gap-1 p-0 ${className}`,
		variants: spinnerVariants,
		initial: "defaultColor",
		animate: ["defaultColor", "dimmed"],
		transition: {
			duration: .8,
			repeat: Infinity,
			repeatType: "reverse",
			ease: "easeInOut"
		},
		children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(lucide_react.Search, {
			size: 16,
			style: { color: "unset" }
		}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: text })]
	});
}
//#endregion
//#region ../../node_modules/.pnpm/@radix-ui+react-compose-refs@1.1.2_@types+react@19.2.7_react@19.2.3/node_modules/@radix-ui/react-compose-refs/dist/index.mjs
function setRef(ref, value) {
	if (typeof ref === "function") return ref(value);
	else if (ref !== null && ref !== void 0) ref.current = value;
}
function composeRefs(...refs) {
	return (node) => {
		let hasCleanup = false;
		const cleanups = refs.map((ref) => {
			const cleanup = setRef(ref, node);
			if (!hasCleanup && typeof cleanup == "function") hasCleanup = true;
			return cleanup;
		});
		if (hasCleanup) return () => {
			for (let i = 0; i < cleanups.length; i++) {
				const cleanup = cleanups[i];
				if (typeof cleanup == "function") cleanup();
				else setRef(refs[i], null);
			}
		};
	};
}
function useComposedRefs(...refs) {
	return react$1.useCallback(composeRefs(...refs), refs);
}
//#endregion
//#region ../../node_modules/.pnpm/@radix-ui+react-context@1.1.2_@types+react@19.2.7_react@19.2.3/node_modules/@radix-ui/react-context/dist/index.mjs
function createContextScope(scopeName, createContextScopeDeps = []) {
	let defaultContexts = [];
	function createContext3(rootComponentName, defaultContext) {
		const BaseContext = react$1.createContext(defaultContext);
		const index = defaultContexts.length;
		defaultContexts = [...defaultContexts, defaultContext];
		const Provider = (props) => {
			const { scope, children, ...context } = props;
			const Context = scope?.[scopeName]?.[index] || BaseContext;
			const value = react$1.useMemo(() => context, Object.values(context));
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Context.Provider, {
				value,
				children
			});
		};
		Provider.displayName = rootComponentName + "Provider";
		function useContext2(consumerName, scope) {
			const Context = scope?.[scopeName]?.[index] || BaseContext;
			const context = react$1.useContext(Context);
			if (context) return context;
			if (defaultContext !== void 0) return defaultContext;
			throw new Error(`\`${consumerName}\` must be used within \`${rootComponentName}\``);
		}
		return [Provider, useContext2];
	}
	const createScope = () => {
		const scopeContexts = defaultContexts.map((defaultContext) => {
			return react$1.createContext(defaultContext);
		});
		return function useScope(scope) {
			const contexts = scope?.[scopeName] || scopeContexts;
			return react$1.useMemo(() => ({ [`__scope${scopeName}`]: {
				...scope,
				[scopeName]: contexts
			} }), [scope, contexts]);
		};
	};
	createScope.scopeName = scopeName;
	return [createContext3, composeContextScopes(createScope, ...createContextScopeDeps)];
}
function composeContextScopes(...scopes) {
	const baseScope = scopes[0];
	if (scopes.length === 1) return baseScope;
	const createScope = () => {
		const scopeHooks = scopes.map((createScope2) => ({
			useScope: createScope2(),
			scopeName: createScope2.scopeName
		}));
		return function useComposedScopes(overrideScopes) {
			const nextScopes = scopeHooks.reduce((nextScopes2, { useScope, scopeName }) => {
				const currentScope = useScope(overrideScopes)[`__scope${scopeName}`];
				return {
					...nextScopes2,
					...currentScope
				};
			}, {});
			return react$1.useMemo(() => ({ [`__scope${baseScope.scopeName}`]: nextScopes }), [nextScopes]);
		};
	};
	createScope.scopeName = baseScope.scopeName;
	return createScope;
}
//#endregion
//#region ../../node_modules/.pnpm/@radix-ui+react-use-previous@1.1.1_@types+react@19.2.7_react@19.2.3/node_modules/@radix-ui/react-use-previous/dist/index.mjs
function usePrevious(value) {
	const ref = react$1.useRef({
		value,
		previous: value
	});
	return react$1.useMemo(() => {
		if (ref.current.value !== value) {
			ref.current.previous = ref.current.value;
			ref.current.value = value;
		}
		return ref.current.previous;
	}, [value]);
}
//#endregion
//#region ../../node_modules/.pnpm/@radix-ui+react-use-layout-effect@1.1.1_@types+react@19.2.7_react@19.2.3/node_modules/@radix-ui/react-use-layout-effect/dist/index.mjs
var useLayoutEffect2 = globalThis?.document ? react$1.useLayoutEffect : () => {};
//#endregion
//#region ../../node_modules/.pnpm/@radix-ui+react-use-size@1.1.1_@types+react@19.2.7_react@19.2.3/node_modules/@radix-ui/react-use-size/dist/index.mjs
function useSize(element) {
	const [size, setSize] = react$1.useState(void 0);
	useLayoutEffect2(() => {
		if (element) {
			setSize({
				width: element.offsetWidth,
				height: element.offsetHeight
			});
			const resizeObserver = new ResizeObserver((entries) => {
				if (!Array.isArray(entries)) return;
				if (!entries.length) return;
				const entry = entries[0];
				let width;
				let height;
				if ("borderBoxSize" in entry) {
					const borderSizeEntry = entry["borderBoxSize"];
					const borderSize = Array.isArray(borderSizeEntry) ? borderSizeEntry[0] : borderSizeEntry;
					width = borderSize["inlineSize"];
					height = borderSize["blockSize"];
				} else {
					width = element.offsetWidth;
					height = element.offsetHeight;
				}
				setSize({
					width,
					height
				});
			});
			resizeObserver.observe(element, { box: "border-box" });
			return () => resizeObserver.unobserve(element);
		} else setSize(void 0);
	}, [element]);
	return size;
}
//#endregion
//#region ../../node_modules/.pnpm/@radix-ui+react-primitive@2.1.3_@types+react-dom@19.2.3_@types+react@19.2.7__@types+rea_5f3d28fea11cf58eed3830d0189b6e2d/node_modules/@radix-ui/react-primitive/dist/index.mjs
var Primitive = [
	"a",
	"button",
	"div",
	"form",
	"h2",
	"h3",
	"img",
	"input",
	"label",
	"li",
	"nav",
	"ol",
	"p",
	"select",
	"span",
	"svg",
	"ul"
].reduce((primitive, node) => {
	const Slot = (0, _radix_ui_react_slot.createSlot)(`Primitive.${node}`);
	const Node = react$1.forwardRef((props, forwardedRef) => {
		const { asChild, ...primitiveProps } = props;
		const Comp = asChild ? Slot : node;
		if (typeof window !== "undefined") window[Symbol.for("radix-ui")] = true;
		return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Comp, {
			...primitiveProps,
			ref: forwardedRef
		});
	});
	Node.displayName = `Primitive.${node}`;
	return {
		...primitive,
		[node]: Node
	};
}, {});
//#endregion
//#region ../../node_modules/.pnpm/@radix-ui+react-switch@1.2.6_@types+react-dom@19.2.3_@types+react@19.2.7__@types+react@_59174930405145abcf9f3e2ca1e923f1/node_modules/@radix-ui/react-switch/dist/index.mjs
var SWITCH_NAME = "Switch";
var [createSwitchContext, createSwitchScope] = createContextScope(SWITCH_NAME);
var [SwitchProvider, useSwitchContext] = createSwitchContext(SWITCH_NAME);
var Switch$1 = react$1.forwardRef((props, forwardedRef) => {
	const { __scopeSwitch, name, checked: checkedProp, defaultChecked, required, disabled, value = "on", onCheckedChange, form, ...switchProps } = props;
	const [button, setButton] = react$1.useState(null);
	const composedRefs = useComposedRefs(forwardedRef, (node) => setButton(node));
	const hasConsumerStoppedPropagationRef = react$1.useRef(false);
	const isFormControl = button ? form || !!button.closest("form") : true;
	const [checked, setChecked] = (0, _radix_ui_react_use_controllable_state.useControllableState)({
		prop: checkedProp,
		defaultProp: defaultChecked ?? false,
		onChange: onCheckedChange,
		caller: SWITCH_NAME
	});
	return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(SwitchProvider, {
		scope: __scopeSwitch,
		checked,
		disabled,
		children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Primitive.button, {
			type: "button",
			role: "switch",
			"aria-checked": checked,
			"aria-required": required,
			"data-state": getState(checked),
			"data-disabled": disabled ? "" : void 0,
			disabled,
			value,
			...switchProps,
			ref: composedRefs,
			onClick: (0, _radix_ui_primitive.composeEventHandlers)(props.onClick, (event) => {
				setChecked((prevChecked) => !prevChecked);
				if (isFormControl) {
					hasConsumerStoppedPropagationRef.current = event.isPropagationStopped();
					if (!hasConsumerStoppedPropagationRef.current) event.stopPropagation();
				}
			})
		}), isFormControl && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(SwitchBubbleInput, {
			control: button,
			bubbles: !hasConsumerStoppedPropagationRef.current,
			name,
			value,
			checked,
			required,
			disabled,
			form,
			style: { transform: "translateX(-100%)" }
		})]
	});
});
Switch$1.displayName = SWITCH_NAME;
var THUMB_NAME = "SwitchThumb";
var SwitchThumb = react$1.forwardRef((props, forwardedRef) => {
	const { __scopeSwitch, ...thumbProps } = props;
	const context = useSwitchContext(THUMB_NAME, __scopeSwitch);
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Primitive.span, {
		"data-state": getState(context.checked),
		"data-disabled": context.disabled ? "" : void 0,
		...thumbProps,
		ref: forwardedRef
	});
});
SwitchThumb.displayName = THUMB_NAME;
var BUBBLE_INPUT_NAME = "SwitchBubbleInput";
var SwitchBubbleInput = react$1.forwardRef(({ __scopeSwitch, control, checked, bubbles = true, ...props }, forwardedRef) => {
	const ref = react$1.useRef(null);
	const composedRefs = useComposedRefs(ref, forwardedRef);
	const prevChecked = usePrevious(checked);
	const controlSize = useSize(control);
	react$1.useEffect(() => {
		const input = ref.current;
		if (!input) return;
		const inputProto = window.HTMLInputElement.prototype;
		const setChecked = Object.getOwnPropertyDescriptor(inputProto, "checked").set;
		if (prevChecked !== checked && setChecked) {
			const event = new Event("click", { bubbles });
			setChecked.call(input, checked);
			input.dispatchEvent(event);
		}
	}, [
		prevChecked,
		checked,
		bubbles
	]);
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
		type: "checkbox",
		"aria-hidden": true,
		defaultChecked: checked,
		...props,
		tabIndex: -1,
		ref: composedRefs,
		style: {
			...props.style,
			...controlSize,
			position: "absolute",
			pointerEvents: "none",
			opacity: 0,
			margin: 0
		}
	});
});
SwitchBubbleInput.displayName = BUBBLE_INPUT_NAME;
function getState(checked) {
	return checked ? "checked" : "unchecked";
}
var Root = Switch$1;
var Thumb = SwitchThumb;
//#endregion
//#region src/components/primitives/switch.tsx
const switchRootVariants = (0, class_variance_authority.cva)([
	"cs-switch cs-switch-root",
	"group peer relative inline-flex shrink-0 cursor-pointer items-center rounded-full shadow-xs transition-all outline-none",
	"data-[state=checked]:bg-brand-600 data-[state=unchecked]:bg-gray-500/20",
	"disabled:cursor-not-allowed disabled:opacity-40",
	"focus-visible:[box-shadow:inset_0_0_0_1px_var(--ring)]"
], {
	variants: {
		size: {
			xs: ["h-4.5 w-8"],
			sm: ["h-5 w-9"],
			md: ["h-5.5 w-11"],
			lg: ["h-6 w-11"]
		},
		loading: {
			false: null,
			true: ["bg-brand-300!"]
		}
	},
	defaultVariants: {
		size: "md",
		loading: false
	}
});
const switchThumbVariants = (0, class_variance_authority.cva)(["cs-switch cs-switch-thumb", "pointer-events-none block rounded-full ring-0 transition-all data-[state=unchecked]:translate-x-0"], {
	variants: {
		size: {
			xs: ["ml-[1px] size-4 data-[state=checked]:translate-x-3.5"],
			sm: ["ml-[1px] size-4.5 data-[state=checked]:translate-x-4"],
			md: ["ml-0.5 size-[19px] data-[state=checked]:translate-x-[21px]"],
			lg: ["ml-[3px] size-5 data-[state=checked]:translate-x-4.5"]
		},
		loading: {
			false: null,
			true: ["bg-brand-300!"]
		}
	},
	compoundVariants: [
		{
			size: "xs",
			loading: true,
			className: "ml-0.5 size-3.5 data-[state=checked]:translate-x-3.5"
		},
		{
			size: "sm",
			loading: true,
			className: "ml-0.5 size-3.5 data-[state=checked]:translate-x-4.5"
		},
		{
			size: "md",
			loading: true,
			className: "ml-1 size-4 data-[state=checked]:translate-x-5"
		},
		{
			size: "lg",
			loading: true,
			className: "ml-1 size-4.5 data-[state=checked]:translate-x-4.5"
		}
	]
});
const switchThumbSvgVariants = (0, class_variance_authority.cva)(["size-full", "transition-all"], {
	variants: { loading: {
		false: null,
		true: ["animate-spin"]
	} },
	defaultVariants: { loading: false }
});
function Switch({ loading = false, size = "md", className, classNames, ...props }) {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Root, {
		"data-slot": "switch",
		className: require_avatar.cn(switchRootVariants({
			size,
			loading
		}), className, classNames?.root),
		...props,
		children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Thumb, {
			"data-slot": "switch-thumb",
			className: require_avatar.cn(switchThumbVariants({
				size,
				loading
			}), classNames?.thumb),
			children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("svg", {
				viewBox: "0 0 19 19",
				fill: "none",
				xmlns: "http://www.w3.org/2000/svg",
				className: require_avatar.cn(switchThumbSvgVariants({ loading }), classNames?.thumbSvg),
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
					d: "M9.5 0C14.7467 0 19 4.25329 19 9.5C19 14.7467 14.7467 19 9.5 19C4.25329 19 0 14.7467 0 9.5C0 4.25329 4.25329 0 9.5 0ZM9.5 6.33301C8.91711 6.33301 8.44445 6.8058 8.44434 7.38867V11.6113C8.44445 12.1942 8.91711 12.667 9.5 12.667C10.0829 12.667 10.5555 12.1942 10.5557 11.6113V7.38867C10.5555 6.8058 10.0829 6.33301 9.5 6.33301Z",
					fill: "white"
				})
			})
		})
	});
}
const DescriptionSwitch = ({ label, description, position = "right", size = "md", ...props }) => {
	const isLeftSide = position === "left";
	const id = (0, react.useId)();
	return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
		className: require_avatar.cn("flex w-full justify-between gap-3 p-2", isLeftSide && "flex-row-reverse"),
		children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
			className: require_avatar.cn("flex cursor-pointer flex-col gap-1"),
			htmlFor: id,
			children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
				className: require_avatar.cn("font-medium tracking-normal", {
					"text-sm leading-4": size === "sm",
					"text-md leading-4.5": size === "md",
					"text-lg leading-5.5": size === "lg"
				}, isLeftSide && "text-right"),
				children: label
			}), description && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
				className: require_avatar.cn("text-muted-foreground", {
					"text-[10px] leading-3": size === "sm",
					"text-xs leading-3.5": size === "md",
					"text-sm leading-4": size === "lg"
				}),
				children: description
			})]
		}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
			className: "flex items-center justify-center",
			children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Switch, {
				id,
				size,
				...props
			})
		})]
	});
};
Switch.displayName = "Switch";
//#endregion
//#region src/components/primitives/dialog.tsx
function Dialog({ ...props }) {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_radix_ui_react_dialog.Root, {
		"data-slot": "dialog",
		...props
	});
}
function DialogTrigger({ ...props }) {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_radix_ui_react_dialog.Trigger, {
		"data-slot": "dialog-trigger",
		...props
	});
}
function DialogPortal({ container, ...props }) {
	const defaultPortalContainer = useDialogPortalContainer();
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_radix_ui_react_dialog.Portal, {
		"data-slot": "dialog-portal",
		container: container ?? defaultPortalContainer,
		...props
	});
}
function DialogClose({ ...props }) {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_radix_ui_react_dialog.Close, {
		"data-slot": "dialog-close",
		...props
	});
}
function DialogOverlay({ className, onPointerDown, ...props }) {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_radix_ui_react_dialog.Overlay, {
		"data-slot": "dialog-overlay",
		className: require_avatar.cn("fixed inset-0 z-[80] bg-black/50", "data-[state=open]:animate-in data-[state=open]:ease-[cubic-bezier(0.16,1,0.3,1)] data-[state=open]:animation-duration-[220ms] data-[state=open]:fade-in-0", "data-[state=closed]:animate-out data-[state=closed]:ease-[cubic-bezier(0.4,0,1,1)] data-[state=closed]:animation-duration-[200ms] data-[state=closed]:fade-out-0", "fill-mode-both motion-reduce:animate-none", className),
		onPointerDown: (0, _radix_ui_primitive.composeEventHandlers)(onPointerDown, (event) => event.stopPropagation(), { checkForDefaultPrevented: false }),
		...props
	});
}
const dialogContentSizeClass = {
	sm: "sm:max-w-sm",
	default: "sm:max-w-lg",
	lg: "sm:max-w-xl",
	xl: "sm:max-w-[720px]"
};
function DialogContent({ className, children, closeLabel = "Close", closeOnOverlayClick = true, showCloseButton = true, motion = "directional", overlayClassName, onPointerDown, size = "default", style, ref, ...props }) {
	const dialogPortalContainer = useDialogPortalContainer();
	const [contentElement, setContentElement] = react.useState(null);
	const [contentZIndex, setContentZIndex] = react.useState();
	const handleRef = react.useCallback((node) => {
		setContentElement(node);
		if (typeof ref === "function") ref(node);
		else if (ref) ref.current = node;
	}, [ref]);
	react.useLayoutEffect(() => {
		if (contentElement) setContentZIndex(getComputedStyle(contentElement).zIndex);
	}, [
		contentElement,
		className,
		style
	]);
	return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(DialogPortal, {
		"data-slot": "dialog-portal",
		children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_radix_ui_react_dialog.Close, {
			asChild: true,
			children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(DialogOverlay, {
				className: overlayClassName,
				onClick: (event) => {
					if (!closeOnOverlayClick) event.preventDefault();
				}
			})
		}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_radix_ui_react_dialog.Content, {
			ref: handleRef,
			"data-slot": "dialog-content",
			className: require_avatar.cn("fixed top-[50%] left-[50%] z-[80] grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 rounded-3xl border-0 bg-card p-6 text-card-foreground shadow-xl [-webkit-app-region:no-drag]", "data-[state=open]:animate-in data-[state=open]:ease-[cubic-bezier(0.16,1,0.3,1)] data-[state=open]:animation-duration-[260ms] data-[state=open]:fade-in-0", "data-[state=closed]:animate-out data-[state=closed]:ease-[cubic-bezier(0.4,0,1,1)] data-[state=closed]:animation-duration-[200ms] data-[state=closed]:fade-out-0", motion === "directional" && "data-[state=closed]:slide-out-to-bottom-4 data-[state=open]:slide-in-from-bottom-4", "fill-mode-both motion-reduce:animate-none", dialogContentSizeClass[size], className),
			onPointerDown: (0, _radix_ui_primitive.composeEventHandlers)(onPointerDown, (event) => event.stopPropagation(), { checkForDefaultPrevented: false }),
			style,
			...props,
			children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(PortalContainerProvider, {
				container: contentElement,
				tooltipContainer: dialogPortalContainer,
				tooltipZIndex: contentZIndex,
				children: [children, showCloseButton && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(_radix_ui_react_dialog.Close, {
					"data-slot": "dialog-close",
					className: "absolute top-4 right-4 rounded-md opacity-70 transition-opacity hover:opacity-100 focus:outline-hidden focus-visible:bg-accent focus-visible:opacity-100 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(lucide_react.XIcon, {}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: "sr-only",
						children: closeLabel
					})]
				})]
			})
		})]
	});
}
function DialogHeader({ className, ...props }) {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
		"data-slot": "dialog-header",
		className: require_avatar.cn("flex flex-col gap-2 text-center sm:text-left", className),
		...props
	});
}
function DialogFooter({ className, ...props }) {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
		"data-slot": "dialog-footer",
		className: require_avatar.cn("flex flex-col-reverse gap-2 sm:flex-row sm:justify-end", className),
		...props
	});
}
function DialogTitle({ className, ...props }) {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_radix_ui_react_dialog.Title, {
		"data-slot": "dialog-title",
		className: require_avatar.cn("text-lg leading-none font-semibold", className),
		...props
	});
}
function DialogDescription({ className, ...props }) {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_radix_ui_react_dialog.Description, {
		"data-slot": "dialog-description",
		className: require_avatar.cn("text-sm text-muted-foreground", className),
		...props
	});
}
//#endregion
//#region src/components/composites/confirm-dialog/index.tsx
function ConfirmDialog({ open, onOpenChange, title, description, content, confirmText = "Confirm", cancelText = "Cancel", cancelDisabled = false, onConfirm, destructive = false, confirmLoading = false, confirmDisabled = false, contentClassName, overlayClassName }) {
	const handleConfirm = react.useCallback(async () => {
		if (await onConfirm?.() !== false) onOpenChange?.(false);
	}, [onConfirm, onOpenChange]);
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Dialog, {
		open,
		onOpenChange,
		children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(DialogContent, {
			motion: "fade-scale",
			showCloseButton: false,
			className: contentClassName,
			overlayClassName,
			children: [
				/* @__PURE__ */ (0, react_jsx_runtime.jsxs)(DialogHeader, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(DialogTitle, { children: title }), description && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(DialogDescription, { children: description })] }),
				content,
				/* @__PURE__ */ (0, react_jsx_runtime.jsxs)(DialogFooter, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(DialogClose, {
					asChild: true,
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
						variant: "outline",
						disabled: cancelDisabled,
						children: cancelText
					})
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
					variant: destructive ? "destructive" : "default",
					onClick: handleConfirm,
					loading: confirmLoading,
					disabled: confirmDisabled,
					children: confirmText
				})] })
			]
		})
	});
}
//#endregion
//#region src/components/primitives/checkbox.tsx
const checkboxVariants = (0, class_variance_authority.cva)(require_avatar.cn("aspect-square shrink-0 rounded-[4px] border transition-all duration-200 ease-out outline-none", "border-border bg-transparent", "hover:bg-accent/50", "hover:scale-[1.03] active:scale-[0.97]", "data-[state=checked]:border-foreground data-[state=checked]:text-foreground", "data-[state=indeterminate]:border-foreground data-[state=indeterminate]:text-foreground", "data-[state=checked]:animate-checkbox-bounce", "focus-visible:border-primary", "aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40", "disabled:cursor-not-allowed disabled:border-gray-500/10 disabled:bg-background-subtle", "disabled:data-[state=checked]:border-foreground-disabled disabled:data-[state=checked]:text-foreground-disabled"), {
	variants: { size: {
		sm: "size-4",
		md: "size-5",
		lg: "size-6"
	} },
	defaultVariants: { size: "md" }
});
const checkboxIconVariants = (0, class_variance_authority.cva)("animate-checkbox-icon-in motion-reduce:animate-none", {
	variants: { size: {
		sm: "size-3",
		md: "size-3.5",
		lg: "size-4"
	} },
	defaultVariants: { size: "md" }
});
function Checkbox({ className, size = "md", ...props }) {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_radix_ui_react_checkbox.Root, {
		"data-slot": "checkbox",
		"data-size": size,
		className: require_avatar.cn(checkboxVariants({ size }), className),
		...props,
		children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(_radix_ui_react_checkbox.Indicator, {
			"data-slot": "checkbox-indicator",
			className: "group/indicator grid place-content-center transition-none",
			children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(lucide_react.CheckIcon, {
				strokeWidth: 2.5,
				className: require_avatar.cn(checkboxIconVariants({ size }), "text-current group-data-[state=indeterminate]/indicator:hidden")
			}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(lucide_react.SquareIcon, {
				fill: "currentColor",
				strokeWidth: 0,
				className: require_avatar.cn(checkboxIconVariants({ size }), "hidden text-current group-data-[state=indeterminate]/indicator:block")
			})]
		})
	});
}
//#endregion
//#region src/components/primitives/radio-group.tsx
const radioGroupItemVariants = (0, class_variance_authority.cva)(require_avatar.cn("aspect-square shrink-0 rounded-full border border-input bg-transparent text-primary shadow-none transition-[color,border-color,box-shadow] outline-none", "data-[state=checked]:border-2 data-[state=checked]:border-primary", "focus-visible:border-primary", "aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40", "disabled:cursor-not-allowed disabled:opacity-50"), {
	variants: { size: {
		sm: "size-3.5",
		md: "size-4",
		lg: "size-5"
	} },
	defaultVariants: { size: "md" }
});
function RadioGroup({ className, ...props }) {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_radix_ui_react_radio_group.Root, {
		"data-slot": "radio-group",
		className: require_avatar.cn("grid gap-3", className),
		...props
	});
}
function RadioGroupItem({ className, size = "md", ...props }) {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_radix_ui_react_radio_group.Item, {
		"data-slot": "radio-group-item",
		"data-size": size,
		className: require_avatar.cn(radioGroupItemVariants({ size }), className),
		...props,
		children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_radix_ui_react_radio_group.Indicator, { "data-slot": "radio-group-indicator" })
	});
}
//#endregion
//#region src/components/primitives/table.tsx
function Table({ className, ...props }) {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
		"data-slot": "table-container",
		className: "relative w-full overflow-auto",
		children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("table", {
			"data-slot": "table",
			className: require_avatar.cn("w-full caption-bottom text-sm", className),
			...props
		})
	});
}
function TableHeader({ className, ...props }) {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("thead", {
		"data-slot": "table-header",
		className: require_avatar.cn("[&_tr]:border-b", className),
		...props
	});
}
function TableBody({ className, ...props }) {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("tbody", {
		"data-slot": "table-body",
		className: require_avatar.cn("[&_tr:last-child]:border-0", className),
		...props
	});
}
function TableFooter({ className, ...props }) {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("tfoot", {
		"data-slot": "table-footer",
		className: require_avatar.cn("border-t bg-muted/50 font-medium [&>tr]:last:border-b-0", className),
		...props
	});
}
function TableRow({ className, ...props }) {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("tr", {
		"data-slot": "table-row",
		className: require_avatar.cn("border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted", className),
		...props
	});
}
function TableHead({ className, ...props }) {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("th", {
		"data-slot": "table-head",
		className: require_avatar.cn("h-9 px-3 text-left align-middle font-medium text-muted-foreground", className),
		...props
	});
}
function TableCell({ className, ...props }) {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("td", {
		"data-slot": "table-cell",
		className: require_avatar.cn("px-3 py-2 align-middle", className),
		...props
	});
}
function TableCaption({ className, ...props }) {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("caption", {
		"data-slot": "table-caption",
		className: require_avatar.cn("mt-4 text-sm text-muted-foreground", className),
		...props
	});
}
//#endregion
//#region src/components/composites/data-table/index.tsx
const normalizeKey = (key) => String(key);
const toCssSize = (value) => typeof value === "number" ? `${value}px` : value;
const contentContainmentClassName = "min-w-0 max-w-full whitespace-normal break-words [overflow-wrap:anywhere]";
const tableShellClassName = "w-full max-w-full overflow-hidden rounded-lg border border-border/70 bg-background-subtle shadow-xs";
const tableScrollAreaClassName = "w-full max-w-full overflow-x-auto";
const tableHeaderClassName = "sticky top-0 z-1 bg-background-subtle/70";
const tableHeaderRowClassName = "border-border/70 bg-background-subtle/70 hover:bg-transparent";
const tableHeaderCellClassName = "h-10 bg-background-subtle/70 px-3 py-2 font-semibold text-muted-foreground text-xs leading-4";
const tableBodyRowClassName = "border-border/60 bg-background-subtle hover:bg-muted/40 data-[state=selected]:bg-muted/60";
const tableBodyCellClassName = "px-3 py-2.5 text-sm font-medium leading-5 text-foreground";
const tableExpandedCellClassName = "bg-muted/20 px-3 py-2.5 text-sm font-medium leading-5 text-foreground";
const tableEmptyCellClassName = "h-24 px-3 py-6 text-center text-sm font-medium text-muted-foreground";
const tableExpandButtonClassName = "flex size-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent/70 hover:text-foreground";
function getColumnMeta(cell) {
	return cell.column.columnDef.meta;
}
function getHeaderMeta(columnDef) {
	return columnDef.meta;
}
function getAlignClass(align) {
	if (align === "center") return "text-center";
	if (align === "right") return "text-right";
}
function getColumnStyle(meta) {
	if (!meta?.width && !meta?.maxWidth) return;
	return {
		width: toCssSize(meta.width),
		maxWidth: toCssSize(meta.maxWidth)
	};
}
function DataTable({ data, columns, rowKey, selection, headerLeft, headerRight, emptyText = "No results.", maxHeight, maxWidth, tableLayout = "auto", rowClassName, onRowClick, renderExpandedRow, getCanExpand, expandedRowKeys = [], onExpandedRowChange, className }) {
	const getRecordKey = react.useCallback((record) => {
		if (typeof rowKey === "function") return rowKey(record);
		return record[rowKey];
	}, [rowKey]);
	const rowById = react.useMemo(() => {
		const map = /* @__PURE__ */ new Map();
		data.forEach((record) => {
			const key = getRecordKey(record);
			map.set(normalizeKey(key), {
				key,
				record
			});
		});
		return map;
	}, [data, getRecordKey]);
	const selectedRowIds = react.useMemo(() => {
		if (!selection) return {};
		return (selection.type === "single" ? selection.selectedRowKey === null ? [] : [selection.selectedRowKey] : selection.selectedRowKeys).reduce((acc, key) => {
			acc[normalizeKey(key)] = true;
			return acc;
		}, {});
	}, [selection]);
	const emitSelectionChange = react.useCallback((nextSelection) => {
		if (!selection) return;
		const selected = Object.keys(nextSelection).filter((id) => nextSelection[id]).map((id) => rowById.get(id)).filter((entry) => Boolean(entry));
		const normalizedSelected = selection.type === "single" ? selected.slice(-1) : selected;
		if (selection.type === "single") {
			const selectedEntry = normalizedSelected[0];
			selection.onChange(selectedEntry?.key ?? null, selectedEntry?.record ?? null);
			return;
		}
		selection.onChange(normalizedSelected.map((entry) => entry.key), normalizedSelected.map((entry) => entry.record));
	}, [rowById, selection]);
	const handleRowSelectionChange = react.useCallback((updater) => {
		const next = typeof updater === "function" ? updater(selectedRowIds) : updater;
		emitSelectionChange(next);
	}, [emitSelectionChange, selectedRowIds]);
	const selectionColumn = react.useMemo(() => {
		if (!selection) return null;
		const width = selection.columnWidth ?? 44;
		if (selection.type === "single") return {
			id: "__selection",
			size: typeof width === "number" ? width : void 0,
			header: "",
			cell: ({ row }) => {
				const checkboxProps = selection.getCheckboxProps?.(row.original);
				return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: "flex items-center justify-center",
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(RadioGroupItem, {
						value: row.id,
						disabled: !row.getCanSelect() || checkboxProps?.disabled,
						"aria-label": checkboxProps?.ariaLabel ?? "Select row",
						size: "sm"
					})
				});
			},
			enableSorting: false,
			enableHiding: false,
			meta: {
				width,
				maxWidth: width,
				align: "center"
			}
		};
		return {
			id: "__selection",
			size: typeof width === "number" ? width : void 0,
			header: ({ table }) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: "flex items-center justify-center",
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Checkbox, {
					size: "sm",
					checked: table.getIsAllRowsSelected() ? true : table.getIsSomeRowsSelected() ? "indeterminate" : false,
					onCheckedChange: (checked) => table.toggleAllRowsSelected(Boolean(checked)),
					"aria-label": "Select all rows"
				})
			}),
			cell: ({ row }) => {
				const checkboxProps = selection.getCheckboxProps?.(row.original);
				return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: "flex items-center justify-center",
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Checkbox, {
						size: "sm",
						checked: row.getIsSelected(),
						disabled: !row.getCanSelect() || checkboxProps?.disabled,
						onCheckedChange: (checked) => row.toggleSelected(Boolean(checked)),
						"aria-label": checkboxProps?.ariaLabel ?? "Select row"
					})
				});
			},
			enableSorting: false,
			enableHiding: false,
			meta: {
				width,
				maxWidth: width,
				align: "center"
			}
		};
	}, [selection]);
	const expandedRowIdSet = react.useMemo(() => new Set(expandedRowKeys.map((key) => normalizeKey(key))), [expandedRowKeys]);
	const toggleExpandedRow = react.useCallback((record) => {
		if (!onExpandedRowChange) return;
		const key = getRecordKey(record);
		const id = normalizeKey(key);
		const next = new Set(expandedRowIdSet);
		if (next.has(id)) next.delete(id);
		else next.add(id);
		onExpandedRowChange(data.map((item) => getRecordKey(item)).filter((itemKey) => next.has(normalizeKey(itemKey))));
	}, [
		data,
		expandedRowIdSet,
		getRecordKey,
		onExpandedRowChange
	]);
	const expandColumn = react.useMemo(() => {
		if (!renderExpandedRow) return null;
		return {
			id: "__expand",
			size: 36,
			header: "",
			cell: ({ row }) => {
				const canExpand = getCanExpand ? getCanExpand(row.original) : true;
				const isExpanded = expandedRowIdSet.has(row.id);
				if (!canExpand) return null;
				return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
					type: "button",
					className: tableExpandButtonClassName,
					"aria-label": isExpanded ? "Collapse row" : "Expand row",
					"aria-expanded": isExpanded,
					onClick: (event) => {
						event.stopPropagation();
						toggleExpandedRow(row.original);
					},
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(lucide_react.ChevronRight, { className: require_avatar.cn("size-4 transition-transform", isExpanded && "rotate-90") })
				});
			},
			enableSorting: false,
			enableHiding: false,
			meta: {
				width: 36,
				maxWidth: 36,
				align: "center"
			}
		};
	}, [
		expandedRowIdSet,
		getCanExpand,
		renderExpandedRow,
		toggleExpandedRow
	]);
	const tableColumns = react.useMemo(() => [
		selectionColumn,
		expandColumn,
		...columns
	].filter((column) => Boolean(column)), [
		columns,
		expandColumn,
		selectionColumn
	]);
	const table = (0, _tanstack_react_table.useReactTable)({
		data,
		columns: tableColumns,
		getRowId: (record) => normalizeKey(getRecordKey(record)),
		getCoreRowModel: (0, _tanstack_react_table.getCoreRowModel)(),
		state: { rowSelection: selectedRowIds },
		enableRowSelection: (row) => !selection?.getCheckboxProps?.(row.original)?.disabled,
		enableMultiRowSelection: selection?.type === "multiple",
		onRowSelectionChange: handleRowSelectionChange
	});
	const visibleColumnCount = table.getVisibleFlatColumns().length;
	const hasToolbar = Boolean(headerLeft || headerRight);
	const tableElement = /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
		"data-slot": "data-table-shell",
		className: require_avatar.cn(tableShellClassName, className),
		children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
			style: { maxHeight: toCssSize(maxHeight) },
			className: require_avatar.cn(tableScrollAreaClassName, maxHeight && "overflow-y-auto"),
			children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(Table, {
				className: "max-w-full",
				style: { tableLayout },
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(TableHeader, {
					className: tableHeaderClassName,
					children: table.getHeaderGroups().map((headerGroup) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(TableRow, {
						className: tableHeaderRowClassName,
						children: headerGroup.headers.map((header) => {
							const meta = getHeaderMeta(header.column.columnDef);
							return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(TableHead, {
								colSpan: header.colSpan,
								className: require_avatar.cn(contentContainmentClassName, tableHeaderCellClassName, getAlignClass(meta?.align), meta?.headerClassName),
								style: getColumnStyle(meta),
								children: header.isPlaceholder ? null : (0, _tanstack_react_table.flexRender)(header.column.columnDef.header, header.getContext())
							}, header.id);
						})
					}, headerGroup.id))
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(TableBody, { children: table.getRowModel().rows.length ? table.getRowModel().rows.map((row, index) => {
					const key = getRecordKey(row.original);
					const isExpanded = expandedRowIdSet.has(normalizeKey(key));
					const customRowClassName = typeof rowClassName === "function" ? rowClassName(row.original, index) : rowClassName;
					return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(TableRow, {
						"data-state": row.getIsSelected() ? "selected" : void 0,
						className: require_avatar.cn(tableBodyRowClassName, onRowClick && "cursor-pointer", customRowClassName),
						onClick: () => onRowClick?.(row.original, index),
						children: row.getVisibleCells().map((cell) => {
							const meta = getColumnMeta(cell);
							return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(TableCell, {
								className: require_avatar.cn(contentContainmentClassName, tableBodyCellClassName, getAlignClass(meta?.align), meta?.className),
								style: getColumnStyle(meta),
								children: (0, _tanstack_react_table.flexRender)(cell.column.columnDef.cell, cell.getContext())
							}, cell.id);
						})
					}), renderExpandedRow && isExpanded && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(TableRow, {
						className: "hover:bg-transparent",
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(TableCell, {
							colSpan: visibleColumnCount,
							className: require_avatar.cn(tableExpandedCellClassName, contentContainmentClassName),
							children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								className: require_avatar.cn("w-full overflow-hidden", contentContainmentClassName, "[&_table]:w-full [&_table]:table-fixed [&_td]:whitespace-normal [&_th]:whitespace-normal"),
								children: renderExpandedRow(row.original, index)
							})
						})
					})] }, row.id);
				}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(TableRow, {
					className: "hover:bg-transparent",
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(TableCell, {
						colSpan: visibleColumnCount || 1,
						className: tableEmptyCellClassName,
						children: emptyText
					})
				}) })]
			})
		})
	});
	return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
		"data-slot": "data-table",
		className: "flex w-full max-w-full flex-col gap-2",
		style: { maxWidth: toCssSize(maxWidth) },
		children: [hasToolbar && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
			className: "flex min-h-8 items-center justify-between gap-3",
			children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: "flex min-w-0 items-center gap-2",
				children: headerLeft
			}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: "flex min-w-0 items-center justify-end gap-2",
				children: headerRight
			})]
		}), selection?.type === "single" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(RadioGroup, {
			value: selection.selectedRowKey === null ? "" : normalizeKey(selection.selectedRowKey),
			onValueChange: (value) => {
				const selected = rowById.get(value);
				selection.onChange(selected?.key ?? null, selected?.record ?? null);
			},
			className: "block",
			children: tableElement
		}) : tableElement]
	});
}
//#endregion
//#region src/components/primitives/select.tsx
const SelectContext = react.createContext(null);
function assignRef(ref, value) {
	if (typeof ref === "function") ref(value);
	else if (ref) ref.current = value;
}
const selectTriggerVariants$1 = (0, class_variance_authority.cva)(require_avatar.cn("inline-flex items-center justify-between rounded-md border-1 text-sm font-normal transition-colors outline-none", "bg-transparent dark:bg-input/30", "text-foreground"), {
	variants: {
		state: {
			default: "border-border focus-visible:border-primary",
			error: "border border-destructive!",
			disabled: "pointer-events-none cursor-not-allowed opacity-50"
		},
		size: {
			sm: "h-8 gap-2 px-3",
			default: "h-9 gap-2 px-3"
		}
	},
	defaultVariants: {
		state: "default",
		size: "default"
	}
});
function Select({ defaultOpen, onOpenChange, open: openProp, ...props }) {
	const [contentElement, setContentElement] = react.useState(null);
	const [internalOpen, setInternalOpen] = react.useState(defaultOpen ?? false);
	const [triggerElement, setTriggerElement] = react.useState(null);
	const isControlled = openProp !== void 0;
	const open = isControlled ? openProp : internalOpen;
	const setOpen = react.useCallback((nextOpen) => {
		if (!isControlled) setInternalOpen(nextOpen);
		onOpenChange?.(nextOpen);
	}, [isControlled, onOpenChange]);
	const contextValue = react.useMemo(() => ({
		contentElement,
		open,
		setContentElement,
		setOpen,
		setTriggerElement,
		triggerElement
	}), [
		contentElement,
		open,
		setOpen,
		triggerElement
	]);
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(SelectContext, {
		value: contextValue,
		children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_radix_ui_react_select.Root, {
			"data-slot": "select",
			open,
			onOpenChange: setOpen,
			...props
		})
	});
}
function SelectGroup({ ...props }) {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_radix_ui_react_select.Group, {
		"data-slot": "select-group",
		...props
	});
}
function SelectValue({ ...props }) {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_radix_ui_react_select.Value, {
		"data-slot": "select-value",
		...props
	});
}
function SelectTrigger({ className, size = "default", children, ref, ...props }) {
	const selectContext = react.use(SelectContext);
	const state = props.disabled ? "disabled" : props["aria-invalid"] ? "error" : "default";
	const handleRef = react.useCallback((node) => {
		selectContext?.setTriggerElement(node);
		assignRef(ref, node);
	}, [ref, selectContext]);
	return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(_radix_ui_react_select.Trigger, {
		ref: handleRef,
		"data-slot": "select-trigger",
		"data-size": size,
		className: require_avatar.cn(selectTriggerVariants$1({
			state,
			size
		}), "w-fit whitespace-nowrap data-[placeholder]:text-muted-foreground *:data-[slot=select-value]:line-clamp-1 *:data-[slot=select-value]:flex *:data-[slot=select-value]:items-center *:data-[slot=select-value]:gap-2 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 [&_svg:not([class*='text-'])]:text-muted-foreground", className),
		...props,
		children: [children, /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_radix_ui_react_select.Icon, {
			asChild: true,
			children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(lucide_react.ChevronDownIcon, { className: "size-4 opacity-50" })
		})]
	});
}
function SelectContent({ className, children, position = "popper", align = "center", portalContainer, ref, ...props }) {
	const defaultPortalContainer = usePortalContainer();
	const selectContext = react.use(SelectContext);
	const resolvedPortalContainer = portalContainer ?? defaultPortalContainer ?? void 0;
	const handleRef = react.useCallback((node) => {
		selectContext?.setContentElement(node);
		assignRef(ref, node);
	}, [ref, selectContext]);
	react.useEffect(() => {
		const portalElement = resolvedPortalContainer instanceof HTMLElement ? resolvedPortalContainer : null;
		if (!selectContext?.open || !portalElement) return;
		const ownerDocument = portalElement.ownerDocument;
		const ownerWindow = ownerDocument.defaultView ?? window;
		const previousPointerEvents = portalElement.style.getPropertyValue("pointer-events");
		const previousPointerEventsPriority = portalElement.style.getPropertyPriority("pointer-events");
		const keepPortalContainerInteractive = () => {
			if (portalElement.style.pointerEvents !== "auto") portalElement.style.setProperty("pointer-events", "auto", "important");
		};
		keepPortalContainerInteractive();
		const pointerEventsObserver = new ownerWindow.MutationObserver(keepPortalContainerInteractive);
		pointerEventsObserver.observe(portalElement, {
			attributes: true,
			attributeFilter: ["style"]
		});
		const closeForInsidePortalPointerDown = (event) => {
			if (!(event.target instanceof Node)) return;
			if (selectContext.contentElement?.contains(event.target)) return;
			if (selectContext.triggerElement?.contains(event.target)) return;
			if (!portalElement.contains(event.target)) return;
			selectContext.setOpen(false);
		};
		ownerDocument.addEventListener("pointerdown", closeForInsidePortalPointerDown, true);
		return () => {
			pointerEventsObserver.disconnect();
			ownerDocument.removeEventListener("pointerdown", closeForInsidePortalPointerDown, true);
			if (portalElement.style.pointerEvents === "auto") portalElement.style.removeProperty("pointer-events");
			if (previousPointerEvents && previousPointerEvents !== "none") portalElement.style.setProperty("pointer-events", previousPointerEvents, previousPointerEventsPriority);
		};
	}, [resolvedPortalContainer, selectContext]);
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_radix_ui_react_select.Portal, {
		container: resolvedPortalContainer,
		children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(_radix_ui_react_select.Content, {
			ref: handleRef,
			"data-slot": "select-content",
			className: require_avatar.cn("relative z-[80] max-h-(--radix-select-content-available-height) min-w-[8rem] origin-(--radix-select-content-transform-origin) overflow-x-hidden overflow-y-auto rounded-md border bg-popover text-popover-foreground shadow-md [-webkit-app-region:no-drag] data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95", position === "popper" && "data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1", className),
			position,
			align,
			...props,
			children: [
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)(SelectScrollUpButton, {}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_radix_ui_react_select.Viewport, {
					className: require_avatar.cn("p-1", position === "popper" && "h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)] scroll-my-1"),
					children
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)(SelectScrollDownButton, {})
			]
		})
	});
}
function SelectLabel({ className, ...props }) {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_radix_ui_react_select.Label, {
		"data-slot": "select-label",
		className: require_avatar.cn("px-2 py-1.5 text-xs text-muted-foreground", className),
		...props
	});
}
function SelectItem({ className, children, ...props }) {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(_radix_ui_react_select.Item, {
		"data-slot": "select-item",
		className: require_avatar.cn("relative flex w-full cursor-default items-center gap-2 rounded-sm py-1.5 pr-8 pl-2 text-sm outline-hidden select-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[state=checked]:bg-primary/10 data-[state=checked]:text-primary [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 [&_svg:not([class*='text-'])]:text-muted-foreground *:[span]:last:flex *:[span]:last:items-center *:[span]:last:gap-2", className),
		...props,
		children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
			className: "absolute right-2 flex size-3.5 items-center justify-center",
			children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_radix_ui_react_select.ItemIndicator, { children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(lucide_react.CheckIcon, { className: "size-4 text-primary" }) })
		}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_radix_ui_react_select.ItemText, { children })]
	});
}
function SelectSeparator({ className, ...props }) {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_radix_ui_react_select.Separator, {
		"data-slot": "select-separator",
		className: require_avatar.cn("pointer-events-none -mx-1 my-1 h-px bg-border", className),
		...props
	});
}
function SelectScrollUpButton({ className, ...props }) {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_radix_ui_react_select.ScrollUpButton, {
		"data-slot": "select-scroll-up-button",
		className: require_avatar.cn("flex cursor-default items-center justify-center py-1", className),
		...props,
		children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(lucide_react.ChevronUpIcon, { className: "size-4" })
	});
}
function SelectScrollDownButton({ className, ...props }) {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_radix_ui_react_select.ScrollDownButton, {
		"data-slot": "select-scroll-down-button",
		className: require_avatar.cn("flex cursor-default items-center justify-center py-1", className),
		...props,
		children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(lucide_react.ChevronDownIcon, { className: "size-4" })
	});
}
//#endregion
//#region src/components/primitives/calendar.tsx
function Calendar({ className, classNames, components, showOutsideDays = true, captionLayout = "dropdown", ...props }) {
	const defaultClassNames = (0, react_day_picker.getDefaultClassNames)();
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(react_day_picker.DayPicker, {
		showOutsideDays,
		captionLayout,
		className: require_avatar.cn("p-3", className),
		classNames: {
			...defaultClassNames,
			root: require_avatar.cn(defaultClassNames.root, "w-fit"),
			months: require_avatar.cn(defaultClassNames.months, "relative flex flex-col gap-4 sm:flex-row"),
			month: require_avatar.cn(defaultClassNames.month, "space-y-3"),
			month_caption: require_avatar.cn(defaultClassNames.month_caption, "flex h-8 items-center justify-center"),
			caption_label: require_avatar.cn(defaultClassNames.caption_label, "text-sm font-medium"),
			dropdowns: require_avatar.cn(defaultClassNames.dropdowns, "flex w-full items-center justify-center gap-2"),
			dropdown_root: require_avatar.cn(defaultClassNames.dropdown_root, "relative"),
			dropdown: require_avatar.cn(defaultClassNames.dropdown, "h-8 rounded-md border border-border bg-background px-2 text-sm transition-colors outline-none focus-visible:border-primary"),
			nav: require_avatar.cn(defaultClassNames.nav, "absolute inset-x-0 top-3 flex items-center justify-between px-3"),
			button_previous: require_avatar.cn(defaultClassNames.button_previous, "inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:pointer-events-none disabled:opacity-40"),
			button_next: require_avatar.cn(defaultClassNames.button_next, "inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:pointer-events-none disabled:opacity-40"),
			month_grid: require_avatar.cn(defaultClassNames.month_grid, "w-full border-collapse space-y-1"),
			weekdays: require_avatar.cn(defaultClassNames.weekdays, "flex"),
			weekday: require_avatar.cn(defaultClassNames.weekday, "w-8 rounded-md text-center text-xs font-normal text-muted-foreground"),
			week: require_avatar.cn(defaultClassNames.week, "mt-1 flex w-full"),
			day: require_avatar.cn(defaultClassNames.day, "size-8 p-0 text-center text-sm"),
			day_button: require_avatar.cn(defaultClassNames.day_button, "inline-flex size-8 items-center justify-center rounded-md text-sm font-normal transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent focus-visible:text-accent-foreground focus-visible:outline-none disabled:pointer-events-none disabled:opacity-40"),
			selected: require_avatar.cn(defaultClassNames.selected, "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground"),
			today: require_avatar.cn(defaultClassNames.today, "bg-accent text-accent-foreground"),
			outside: require_avatar.cn(defaultClassNames.outside, "text-muted-foreground opacity-50"),
			disabled: require_avatar.cn(defaultClassNames.disabled, "text-muted-foreground opacity-40"),
			range_middle: require_avatar.cn(defaultClassNames.range_middle, "rounded-none bg-accent text-accent-foreground"),
			range_start: require_avatar.cn(defaultClassNames.range_start, "rounded-l-md bg-primary text-primary-foreground"),
			range_end: require_avatar.cn(defaultClassNames.range_end, "rounded-r-md bg-primary text-primary-foreground"),
			hidden: require_avatar.cn(defaultClassNames.hidden, "invisible"),
			...classNames
		},
		components: {
			MonthCaption: CalendarMonthCaption,
			DropdownNav: CalendarDropdownNav,
			Dropdown: CalendarDropdown,
			Chevron: CalendarChevron,
			...components
		},
		...props
	});
}
function CalendarMonthCaption({ children }) {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(react_jsx_runtime.Fragment, { children });
}
function CalendarDropdownNav({ className, ...props }) {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
		className: require_avatar.cn("flex w-full items-center gap-2", className),
		...props
	});
}
function CalendarDropdown({ value, onChange, options, disabled, className, style, "aria-label": ariaLabel }) {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(Select, {
		value: value?.toString(),
		disabled,
		onValueChange: (nextValue) => handleCalendarDropdownChange(nextValue, onChange),
		children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(SelectTrigger, {
			"aria-label": ariaLabel,
			size: "sm",
			style,
			className: require_avatar.cn("min-w-0 first:flex-1 last:shrink-0", className),
			children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(SelectValue, {})
		}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(SelectContent, {
			align: "center",
			className: "max-h-64",
			children: options?.map((option) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(SelectItem, {
				value: String(option.value),
				disabled: option.disabled,
				children: option.label
			}, option.value))
		})]
	});
}
function handleCalendarDropdownChange(value, onChange) {
	if (!onChange) return;
	onChange({ target: { value: String(value) } });
}
function CalendarChevron({ className, orientation, disabled, ...props }) {
	const iconClassName = require_avatar.cn("size-4", disabled && "opacity-40", className);
	if (orientation === "left") return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(lucide_react.ChevronLeft, {
		className: iconClassName,
		...props
	});
	if (orientation === "right") return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(lucide_react.ChevronRight, {
		className: iconClassName,
		...props
	});
	if (orientation === "up") return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(lucide_react.ChevronUp, {
		className: iconClassName,
		...props
	});
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(lucide_react.ChevronDown, {
		className: iconClassName,
		...props
	});
}
//#endregion
//#region src/components/primitives/input.tsx
function Input$1({ className, type, ...props }) {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
		type,
		"data-slot": "input",
		className: require_avatar.cn("h-9 w-full min-w-0 rounded-md border border-input bg-transparent px-3 py-1 text-base transition-[color,box-shadow] outline-none selection:bg-primary selection:text-primary-foreground file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground disabled:pointer-events-none disabled:cursor-not-allowed md:text-sm dark:bg-input/30", "focus-visible:border-primary", "disabled:opacity-50", "aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40", className),
		...props
	});
}
//#endregion
//#region src/components/primitives/popover.tsx
function Popover({ ...props }) {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_radix_ui_react_popover.Root, {
		"data-slot": "popover",
		...props
	});
}
function PopoverTrigger({ ...props }) {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_radix_ui_react_popover.Trigger, {
		"data-slot": "popover-trigger",
		...props
	});
}
function PopoverContent({ className, align = "center", sideOffset = 4, forceMount, portalContainer, ...props }) {
	const defaultPortalContainer = usePortalContainer();
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_radix_ui_react_popover.Portal, {
		forceMount,
		container: portalContainer ?? defaultPortalContainer ?? void 0,
		children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_radix_ui_react_popover.Content, {
			"data-slot": "popover-content",
			align,
			sideOffset,
			forceMount,
			className: require_avatar.cn("z-[80] w-72 origin-(--radix-popover-content-transform-origin) rounded-lg border-[0.5px] bg-popover p-4 text-popover-foreground shadow-lg outline-hidden [-webkit-app-region:no-drag] data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95", className),
			...props
		})
	});
}
function PopoverAnchor({ ...props }) {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_radix_ui_react_popover.Anchor, {
		"data-slot": "popover-anchor",
		...props
	});
}
//#endregion
//#region src/components/composites/date-time-picker/index.tsx
const defaultLabels = {
	hour: "Hour",
	minute: "Minute",
	second: "Second"
};
const defaultFormatByGranularity = {
	day: "yyyy-MM-dd",
	hour: "yyyy-MM-dd HH",
	minute: "yyyy-MM-dd HH:mm",
	second: "yyyy-MM-dd HH:mm:ss"
};
function DateTimePicker({ value, defaultValue, onChange, open, defaultOpen, onOpenChange, granularity = "day", format, placeholder = "Pick a date", disabled, className, triggerClassName, popoverClassName, calendarProps, labels }) {
	const isValueControlled = value !== void 0;
	const [internalValue, setInternalValue] = react.useState(() => normalizeDate(defaultValue));
	const selectedDate = isValueControlled ? normalizeDate(value) : internalValue;
	const [month, setMonth] = react.useState(() => {
		return getMonthDate(normalizeDate(value) ?? normalizeDate(defaultValue) ?? /* @__PURE__ */ new Date());
	});
	const isOpenControlled = open !== void 0;
	const [internalOpen, setInternalOpen] = react.useState(defaultOpen ?? false);
	const pickerOpen = isOpenControlled ? open : internalOpen;
	const mergedLabels = {
		...defaultLabels,
		...labels
	};
	const selectedYear = selectedDate?.getFullYear();
	const selectedMonth = selectedDate?.getMonth();
	react.useEffect(() => {
		if (selectedYear === void 0 || selectedMonth === void 0) return;
		setMonth(new Date(selectedYear, selectedMonth));
	}, [selectedMonth, selectedYear]);
	const setPickerOpen = react.useCallback((nextOpen) => {
		if (!isOpenControlled) setInternalOpen(nextOpen);
		onOpenChange?.(nextOpen);
	}, [isOpenControlled, onOpenChange]);
	const commitDate = react.useCallback((nextDate) => {
		if (!isValueControlled) setInternalValue(nextDate);
		onChange?.(nextDate);
	}, [isValueControlled, onChange]);
	const handleSelectDate = react.useCallback((date) => {
		if (!date) {
			commitDate(void 0);
			return;
		}
		const nextDate = mergeDatePart(date, selectedDate);
		setMonth(getMonthDate(nextDate));
		commitDate(nextDate);
		if (granularity === "day") setPickerOpen(false);
	}, [
		commitDate,
		granularity,
		selectedDate,
		setPickerOpen
	]);
	const handleTimePartChange = react.useCallback((part, rawValue) => {
		const nextDate = selectedDate ? new Date(selectedDate) : /* @__PURE__ */ new Date();
		const nextValue = clampTimeValue(rawValue, part === "hours" ? 23 : 59);
		if (part === "hours") nextDate.setHours(nextValue);
		if (part === "minutes") nextDate.setMinutes(nextValue);
		if (part === "seconds") nextDate.setSeconds(nextValue);
		commitDate(nextDate);
	}, [commitDate, selectedDate]);
	const formattedValue = selectedDate ? safeFormatDate(selectedDate, format ?? defaultFormatByGranularity[granularity]) : null;
	return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(Popover, {
		open: pickerOpen,
		onOpenChange: setPickerOpen,
		children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(PopoverTrigger, {
			asChild: true,
			children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(Button, {
				type: "button",
				variant: "outline",
				disabled,
				"data-empty": !formattedValue,
				className: require_avatar.cn("h-9 w-[240px] justify-start text-left font-normal data-[empty=true]:text-muted-foreground", triggerClassName),
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(lucide_react.CalendarIcon, { className: "size-4" }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: "truncate",
					children: formattedValue ?? placeholder
				})]
			})
		}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(PopoverContent, {
			align: "start",
			className: require_avatar.cn("w-auto p-0", popoverClassName),
			children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: require_avatar.cn("flex flex-col", className),
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Calendar, {
					...calendarProps,
					mode: "single",
					selected: selectedDate,
					onSelect: handleSelectDate,
					month,
					onMonthChange: setMonth,
					disabled: disabled || calendarProps?.disabled,
					captionLayout: calendarProps?.captionLayout ?? "dropdown",
					hideNavigation: calendarProps?.hideNavigation ?? true,
					startMonth: calendarProps?.startMonth ?? new Date(1900, 0),
					endMonth: calendarProps?.endMonth ?? new Date(2100, 11)
				}), granularity !== "day" && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: "grid grid-cols-3 gap-2 border-t border-border p-3",
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(TimeInput, {
							label: mergedLabels.hour,
							value: selectedDate?.getHours() ?? 0,
							max: 23,
							disabled,
							onChange: (nextValue) => handleTimePartChange("hours", nextValue)
						}),
						(granularity === "minute" || granularity === "second") && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(TimeInput, {
							label: mergedLabels.minute,
							value: selectedDate?.getMinutes() ?? 0,
							max: 59,
							disabled,
							onChange: (nextValue) => handleTimePartChange("minutes", nextValue)
						}),
						granularity === "second" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(TimeInput, {
							label: mergedLabels.second,
							value: selectedDate?.getSeconds() ?? 0,
							max: 59,
							disabled,
							onChange: (nextValue) => handleTimePartChange("seconds", nextValue)
						})
					]
				})]
			})
		})]
	});
}
function TimeInput({ label, value, max, disabled, onChange }) {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
		className: "grid gap-1",
		children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
			className: "sr-only",
			children: label
		}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Input$1, {
			"aria-label": label,
			type: "number",
			inputMode: "numeric",
			min: 0,
			max,
			value: padTimeValue(value),
			disabled,
			onChange: (event) => onChange(event.target.value),
			className: "h-8 px-2 text-center font-mono text-sm"
		})]
	});
}
function normalizeDate(date) {
	return date instanceof Date && !Number.isNaN(date.getTime()) ? date : void 0;
}
function getMonthDate(date) {
	return new Date(date.getFullYear(), date.getMonth());
}
function mergeDatePart(date, current) {
	const nextDate = new Date(date);
	if (current) nextDate.setHours(current.getHours(), current.getMinutes(), current.getSeconds(), current.getMilliseconds());
	return nextDate;
}
function clampTimeValue(value, max) {
	const parsed = Number.parseInt(value, 10);
	if (Number.isNaN(parsed)) return 0;
	return Math.min(Math.max(parsed, 0), max);
}
function padTimeValue(value) {
	return String(value).padStart(2, "0");
}
function safeFormatDate(date, format) {
	try {
		return (0, date_fns.format)(date, format);
	} catch {
		return date.toLocaleString();
	}
}
//#endregion
//#region src/components/composites/ellipsis/index.tsx
const Ellipsis = (props) => {
	const { maxLine = 1, children, className, ref, ...rest } = props;
	const ellipsisClasses = require_avatar.cn("overflow-hidden text-ellipsis", maxLine > 1 ? `line-clamp-${maxLine} break-words` : "block whitespace-nowrap", className);
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
		ref,
		className: ellipsisClasses,
		...rest,
		children
	});
};
//#endregion
//#region src/components/composites/emoji-avatar/index.tsx
const EmojiAvatar = ({ children, size = 31, fontSize, onClick, className, style }) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
	onClick,
	className: require_avatar.cn("flex items-center justify-center", "bg-background-soft border-border", "cursor-pointer rounded-[20%]", "transition-opacity hover:opacity-80", "border-[0.5px]", className),
	style: {
		width: size,
		height: size,
		fontSize: fontSize ?? size * .5,
		...style
	},
	children
});
EmojiAvatar.displayName = "EmojiAvatar";
var emoji_avatar_default = (0, react.memo)(EmojiAvatar);
//#endregion
//#region src/components/composites/empty-state/index.tsx
const EMPTY_ILLUSTRATION_RATIO = 41 / 64;
/**
* Unified empty illustrations — soft line drawings with a ground shadow. All
* colors derive from `currentColor` opacity layers so they adapt to themes.
* `inbox` is the generic "nothing here"; `book` reads as knowledge/learning.
*/
function EmptyIllustration({ variant = "inbox", width, className }) {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("svg", {
		width,
		height: Math.round(width * EMPTY_ILLUSTRATION_RATIO),
		viewBox: "0 0 64 41",
		className,
		"aria-hidden": "true",
		children: variant === "book" ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("g", {
			transform: "translate(0 1)",
			fill: "none",
			fillRule: "evenodd",
			children: [
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("ellipse", {
					fill: "currentColor",
					fillOpacity: .08,
					cx: "32",
					cy: "33",
					rx: "28",
					ry: "6.5"
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("g", {
					stroke: "currentColor",
					strokeOpacity: .4,
					strokeLinejoin: "round",
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
							fill: "currentColor",
							fillOpacity: .05,
							d: "M32 10.5 11 6.5v18.2L32 30.5Z"
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
							fill: "currentColor",
							fillOpacity: .05,
							d: "M32 10.5 53 6.5v18.2L32 30.5Z"
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M32 10.5v20" })
					]
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
					fill: "currentColor",
					fillOpacity: .35,
					d: "m55.5 0 1.3 2.8 2.8 1.3-2.8 1.3-1.3 2.8-1.3-2.8-2.8-1.3 2.8-1.3Z"
				})
			]
		}) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("g", {
			transform: "translate(0 1)",
			fill: "none",
			fillRule: "evenodd",
			children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("ellipse", {
				fill: "currentColor",
				fillOpacity: .08,
				cx: "32",
				cy: "33",
				rx: "32",
				ry: "7"
			}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("g", {
				fillRule: "nonzero",
				stroke: "currentColor",
				strokeOpacity: .4,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", { d: "M55 12.76 44.854 1.258C44.367.474 43.656 0 42.907 0H21.093c-.749 0-1.46.474-1.947 1.257L9 12.761V22h46v-9.24z" }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
					fill: "currentColor",
					fillOpacity: .05,
					d: "M41.613 15.931c0-1.605.994-2.93 2.227-2.931H55v18.137C55 33.26 53.68 35 52.05 35h-40.1C10.32 35 9 33.259 9 31.137V13h11.16c1.233 0 2.227 1.323 2.227 2.928v.022c0 1.605 1.005 2.901 2.237 2.901h14.752c1.232 0 2.237-1.308 2.237-2.913v-.007z"
				})]
			})]
		})
	});
}
function EmptyState({ illustration = "inbox", icon: IconOverride, title, description, actionLabel, onAction, secondaryLabel, onSecondary, compact = false, className }) {
	const Icon = IconOverride;
	const buttonSize = compact ? "sm" : "default";
	return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
		className: require_avatar.cn("flex flex-col items-center justify-center text-center", compact ? "px-4 py-8" : "flex-1 px-6 py-12", className),
		children: [
			Icon ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Icon, {
				size: compact ? 28 : 40,
				strokeWidth: 1.5,
				className: require_avatar.cn("text-muted-foreground", compact ? "mb-3" : "mb-4")
			}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(EmptyIllustration, {
				variant: illustration,
				width: compact ? 48 : 64,
				className: require_avatar.cn("text-muted-foreground", compact ? "mb-3" : "mb-4")
			}),
			title && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", {
				className: require_avatar.cn("font-normal text-muted-foreground", compact ? "text-xs" : "text-sm", description ? "mb-1.5" : actionLabel || secondaryLabel ? compact ? "mb-3" : "mb-5" : ""),
				children: title
			}),
			description && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
				className: require_avatar.cn("text-muted-foreground", compact ? "mb-3 max-w-xs text-xs" : "mb-5 max-w-md text-xs leading-relaxed"),
				children: description
			}),
			(actionLabel || secondaryLabel) && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "flex items-center gap-2",
				children: [actionLabel && onAction && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
					variant: "outline",
					size: buttonSize,
					onClick: onAction,
					children: actionLabel
				}), secondaryLabel && onSecondary && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
					variant: "ghost",
					size: buttonSize,
					onClick: onSecondary,
					children: secondaryLabel
				})]
			})
		]
	});
}
//#endregion
//#region src/components/primitives/scroll-area.tsx
function ScrollArea({ className, children, hidden, type = "scroll", scrollHideDelay = 1500, orientation = "vertical", viewportProps, contentProps, ...props }) {
	const axes = orientation === "both" ? ["vertical", "horizontal"] : [orientation];
	return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(_radix_ui_react_scroll_area.Root, {
		...props,
		hidden,
		"data-slot": "scroll-area",
		type,
		scrollHideDelay,
		className: require_avatar.cn("relative grid min-h-0 min-w-0 grid-cols-[minmax(0,1fr)] grid-rows-[minmax(0,1fr)]", className, hidden && "hidden!"),
		children: [
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_radix_ui_react_scroll_area.Viewport, {
				"data-slot": "scroll-area-viewport",
				...viewportProps,
				disableImplicitContentElement: true,
				className: require_avatar.cn("min-h-0 min-w-0 [scrollbar-gutter:auto]!", viewportProps?.className),
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_radix_ui_react_scroll_area.Content, {
					...contentProps,
					"data-slot": "scroll-area-content",
					style: {
						display: orientation === "vertical" ? void 0 : "table",
						...contentProps?.style
					},
					children
				})
			}),
			axes.map((axis) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_radix_ui_react_scroll_area.Scrollbar, {
				"data-slot": "scroll-area-scrollbar",
				orientation: axis,
				className: require_avatar.cn("group/scrollbar z-10 flex touch-none duration-200 select-none data-[state=hidden]:animate-out data-[state=hidden]:fade-out-0 motion-reduce:animate-none", axis === "vertical" ? "w-3 py-0.5 pr-0.5" : "h-3 flex-col px-0.5 pb-0.5"),
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_radix_ui_react_scroll_area.Thumb, {
					"data-slot": "scroll-area-thumb",
					className: require_avatar.cn("relative flex-1 rounded-full border-solid border-transparent bg-[var(--scrollbar-thumb,color-mix(in_srgb,var(--foreground)_15%,transparent))] bg-clip-padding transition-[border-width,background-color] duration-150 group-hover/scrollbar:bg-[var(--scrollbar-thumb-hover,color-mix(in_srgb,var(--foreground)_20%,transparent))] motion-reduce:transition-none", axis === "vertical" ? "border-x-[3px] group-hover/scrollbar:border-x-0" : "border-y-[3px] group-hover/scrollbar:border-y-0")
				})
			}, axis)),
			orientation === "both" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_radix_ui_react_scroll_area.Corner, {})
		]
	});
}
//#endregion
//#region src/components/composites/entity-selector/parts/header.tsx
function Header({ search, searchInputRef, showFilterButton, filterActive, filterOpen, onToggleFilter }) {
	if (!search && !showFilterButton) return null;
	const filterButton = showFilterButton ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
		type: "button",
		onClick: onToggleFilter,
		"aria-pressed": filterOpen,
		className: require_avatar.cn("flex size-6 shrink-0 items-center justify-center rounded-full transition-colors", filterActive || filterOpen ? "text-foreground" : "text-muted-foreground/60 hover:text-foreground"),
		children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(lucide_react.Filter, { className: "size-3.5" })
	}) : null;
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
		className: "flex items-center gap-2 px-3 pt-3 pb-2",
		children: search ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
			className: "flex h-8 flex-1 items-center gap-2 rounded-full bg-muted/40 px-3",
			children: [
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)(lucide_react.Search, { className: "size-4 shrink-0 text-muted-foreground/70" }),
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
					ref: searchInputRef,
					type: "text",
					value: search.value,
					onChange: (e) => search.onChange(e.target.value),
					placeholder: search.placeholder,
					className: "h-full min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/60"
				}),
				filterButton
			]
		}) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", { className: "flex-1" }), filterButton] })
	});
}
//#endregion
//#region src/components/composites/entity-selector/parts/item-context-menu.tsx
const DEFAULT_VIEWPORT_MARGIN = 8;
/**
* Portal container for a row's context menu.
*
* Owns positioning, viewport clamping, outside-click / Escape / scroll dismissal.
* The visual content is fully consumer-supplied via `children`.
*/
function ItemContextMenu({ children, position, onClose, className, viewportMargin = DEFAULT_VIEWPORT_MARGIN }) {
	const ref = (0, react.useRef)(null);
	const [adjusted, setAdjusted] = (0, react.useState)(position);
	(0, react.useLayoutEffect)(() => {
		const el = ref.current;
		if (!el) return;
		const rect = el.getBoundingClientRect();
		let { x, y } = position;
		if (x + rect.width + viewportMargin > window.innerWidth) x = Math.max(viewportMargin, window.innerWidth - rect.width - viewportMargin);
		if (y + rect.height + viewportMargin > window.innerHeight) y = Math.max(viewportMargin, window.innerHeight - rect.height - viewportMargin);
		if (x !== position.x || y !== position.y) setAdjusted({
			x,
			y
		});
	}, [position, viewportMargin]);
	(0, react.useEffect)(() => {
		const onDown = (e) => {
			if (ref.current && !ref.current.contains(e.target)) onClose();
		};
		const onKey = (e) => {
			if (e.key === "Escape") onClose();
		};
		const onScroll = () => onClose();
		window.addEventListener("mousedown", onDown, true);
		window.addEventListener("contextmenu", onDown, true);
		window.addEventListener("keydown", onKey);
		window.addEventListener("scroll", onScroll, true);
		return () => {
			window.removeEventListener("mousedown", onDown, true);
			window.removeEventListener("contextmenu", onDown, true);
			window.removeEventListener("keydown", onKey);
			window.removeEventListener("scroll", onScroll, true);
		};
	}, [onClose]);
	if (typeof document === "undefined") return null;
	return (0, react_dom.createPortal)(/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
		ref,
		role: "menu",
		"data-entity-context-menu-root": "",
		style: {
			position: "fixed",
			left: adjusted.x,
			top: adjusted.y
		},
		className: require_avatar.cn("z-50 outline-none", className),
		children
	}), document.body);
}
function useItemContextMenu() {
	const [position, setPosition] = (0, react.useState)(null);
	return {
		position,
		open: (0, react.useCallback)((e, itemId) => {
			e.preventDefault();
			setPosition({
				x: e.clientX,
				y: e.clientY,
				itemId
			});
		}, []),
		close: (0, react.useCallback)(() => setPosition(null), [])
	};
}
//#endregion
//#region src/components/composites/entity-selector/parts/multi-select-bar.tsx
function MultiSelectBar({ enabled, onEnabledChange, label, hint, disabled }) {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
		className: "flex items-center justify-between gap-3 px-3 py-2",
		children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
			className: "flex min-w-0 flex-1 items-center gap-1 text-xs text-muted-foreground/80",
			children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
				className: "truncate",
				children: label
			}), hint ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
				className: "truncate text-muted-foreground/60",
				children: hint
			}) : null]
		}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Switch, {
			checked: enabled,
			onCheckedChange: onEnabledChange,
			disabled
		})]
	});
}
//#endregion
//#region src/components/composites/entity-selector/entity-selector.tsx
const DEFAULT_MAX_LIST_HEIGHT = 320;
const DEFAULT_WIDTH = 320;
function EntitySelector(props) {
	const { open: openProp, onOpenChange, trigger, mode, value, onChange, renderItem, search, autoFocusSearch, filterPanel, filterActive, multiSelect, renderItemContextMenu, contextMenuViewportMargin, footer, maxListHeight = DEFAULT_MAX_LIST_HEIGHT, emptyState, loading, loadingState, width = DEFAULT_WIDTH, className, popoverContentProps } = props;
	const itemsProp = "items" in props ? props.items : void 0;
	const sectionsProp = "sections" in props ? props.sections : void 0;
	const { flatItems, sectionOffsets } = (0, react.useMemo)(() => {
		if (sectionsProp) {
			const offsets = [];
			const flat = [];
			for (const section of sectionsProp) {
				offsets.push(flat.length);
				flat.push(...section.items);
			}
			return {
				flatItems: flat,
				sectionOffsets: offsets
			};
		}
		return {
			flatItems: itemsProp ?? [],
			sectionOffsets: []
		};
	}, [sectionsProp, itemsProp]);
	const [internalOpen, setInternalOpen] = (0, react.useState)(false);
	const open = openProp ?? internalOpen;
	const setOpen = (0, react.useCallback)((next) => {
		if (openProp === void 0) setInternalOpen(next);
		onOpenChange?.(next);
	}, [openProp, onOpenChange]);
	const [filterOpen, setFilterOpen] = (0, react.useState)(false);
	const ctxMenu = useItemContextMenu();
	const closeContextMenu = ctxMenu.close;
	const listboxId = (0, react.useId)();
	const listRef = (0, react.useRef)(null);
	const searchInputRef = (0, react.useRef)(null);
	const hasSearch = Boolean(search);
	(0, react.useEffect)(() => {
		if (!open) {
			setFilterOpen(false);
			closeContextMenu();
		}
	}, [open, closeContextMenu]);
	const isMultiMode = mode === "multi" && !!multiSelect?.enabled;
	const showFilterButton = !!filterPanel;
	const selectedSet = (0, react.useMemo)(() => {
		if (mode === "multi") return new Set(Array.isArray(value) ? value : []);
		return new Set(value && typeof value === "string" ? [value] : []);
	}, [mode, value]);
	const firstEnabledIndex = (0, react.useMemo)(() => flatItems.findIndex((it) => !it.disabled), [flatItems]);
	const [activeIndex, setActiveIndex] = (0, react.useState)(-1);
	const initActiveIndex = (0, react.useCallback)(() => {
		const selectedIdx = flatItems.findIndex((it) => selectedSet.has(it.id) && !it.disabled);
		setActiveIndex(selectedIdx >= 0 ? selectedIdx : firstEnabledIndex);
	}, [
		flatItems,
		firstEnabledIndex,
		selectedSet
	]);
	(0, react.useEffect)(() => {
		if (!open) {
			setActiveIndex(-1);
			return;
		}
		initActiveIndex();
	}, [
		open,
		flatItems,
		firstEnabledIndex,
		initActiveIndex
	]);
	const step = (0, react.useCallback)((from, direction) => {
		if (flatItems.length === 0) return -1;
		const total = flatItems.length;
		let i = from;
		for (let n = 0; n < total; n++) {
			i = (i + direction + total) % total;
			if (!flatItems[i]?.disabled) return i;
		}
		return -1;
	}, [flatItems]);
	const handleSelectItem = (0, react.useCallback)((item) => {
		if (item.disabled) return;
		if (mode === "multi") {
			if (isMultiMode) {
				const current = new Set(Array.isArray(value) ? value : []);
				if (current.has(item.id)) current.delete(item.id);
				else current.add(item.id);
				onChange(Array.from(current));
			} else {
				onChange([item.id]);
				setOpen(false);
			}
		} else {
			onChange(item.id);
			setOpen(false);
		}
	}, [
		mode,
		isMultiMode,
		onChange,
		setOpen,
		value
	]);
	const handleKeyDown = (0, react.useCallback)((event) => {
		if (event.nativeEvent.isComposing || event.keyCode === 229) return;
		switch (event.key) {
			case "ArrowDown":
				event.preventDefault();
				setActiveIndex((i) => step(i < 0 ? -1 : i, 1));
				return;
			case "ArrowUp":
				event.preventDefault();
				setActiveIndex((i) => step(i < 0 ? flatItems.length : i, -1));
				return;
			case "Home":
				if (flatItems.length === 0) return;
				event.preventDefault();
				setActiveIndex(step(-1, 1));
				return;
			case "End":
				if (flatItems.length === 0) return;
				event.preventDefault();
				setActiveIndex(step(0, -1));
				return;
			case "Enter": {
				if (activeIndex < 0) return;
				const item = flatItems[activeIndex];
				if (!item || item.disabled) return;
				event.preventDefault();
				handleSelectItem(item);
				return;
			}
		}
	}, [
		activeIndex,
		handleSelectItem,
		flatItems,
		step
	]);
	(0, react.useEffect)(() => {
		if (activeIndex < 0) return;
		const item = flatItems[activeIndex];
		if (!item) return;
		(listRef.current?.querySelector(`[data-option-id="${CSS.escape(item.id)}"]`))?.scrollIntoView({ block: "nearest" });
	}, [activeIndex, flatItems]);
	const activeOptionDomId = activeIndex >= 0 && flatItems[activeIndex] ? `${listboxId}-opt-${flatItems[activeIndex].id}` : void 0;
	const ctxMenuNode = (0, react.useMemo)(() => {
		if (!renderItemContextMenu || !ctxMenu.position) return null;
		const target = flatItems.find((it) => it.id === ctxMenu.position.itemId);
		if (!target) return null;
		return renderItemContextMenu(target, { close: ctxMenu.close });
	}, [
		renderItemContextMenu,
		ctxMenu.position,
		ctxMenu.close,
		flatItems
	]);
	const { align: userAlign, sideOffset: userSideOffset, className: userPopoverClassName, onInteractOutside: userOnInteractOutside, onKeyDown: userOnKeyDown, onEscapeKeyDown: userOnEscapeKeyDown, onOpenAutoFocus: userOnOpenAutoFocus, style: userStyle, ...restPopoverContentProps } = popoverContentProps ?? {};
	const renderOptionRow = (item, flatIndex) => {
		const isSelected = selectedSet.has(item.id);
		const isActive = flatIndex === activeIndex;
		return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
			id: `${listboxId}-opt-${item.id}`,
			role: "option",
			"aria-selected": isSelected,
			"aria-disabled": item.disabled || void 0,
			"data-option-id": item.id,
			"data-active": isActive || void 0,
			onMouseEnter: () => {
				if (!item.disabled) setActiveIndex(flatIndex);
			},
			children: renderItem(item, {
				isSelected,
				isMultiMode,
				isActive,
				onSelect: () => handleSelectItem(item),
				onContextMenu: renderItemContextMenu ? (e) => ctxMenu.open(e, item.id) : void 0
			})
		}, item.id);
	};
	return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)(Popover, {
		open,
		onOpenChange: setOpen,
		children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(PopoverTrigger, {
			asChild: true,
			children: trigger
		}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(PopoverContent, {
			align: userAlign ?? "start",
			sideOffset: userSideOffset ?? 6,
			...restPopoverContentProps,
			style: {
				width: typeof width === "number" ? `${width}px` : width,
				...userStyle
			},
			onInteractOutside: (event) => {
				if ((event.detail?.originalEvent?.target ?? event.target)?.closest?.("[data-entity-context-menu-root]")) event.preventDefault();
				userOnInteractOutside?.(event);
			},
			onKeyDown: (event) => {
				handleKeyDown(event);
				userOnKeyDown?.(event);
			},
			onEscapeKeyDown: (event) => {
				if (filterOpen) {
					event.preventDefault();
					setFilterOpen(false);
					return;
				}
				userOnEscapeKeyDown?.(event);
			},
			onOpenAutoFocus: (event) => {
				if (autoFocusSearch === false) event.preventDefault();
				else if (hasSearch) {
					event.preventDefault();
					searchInputRef.current?.focus();
				}
				userOnOpenAutoFocus?.(event);
			},
			className: require_avatar.cn("flex max-h-[var(--radix-popover-content-available-height)] flex-col overflow-hidden rounded-lg border-border/60 bg-popover p-0 shadow-lg", userPopoverClassName, className),
			children: [
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Header, {
					search,
					searchInputRef,
					showFilterButton,
					filterActive: !!filterActive,
					filterOpen,
					onToggleFilter: () => setFilterOpen((prev) => !prev)
				}),
				filterOpen && filterPanel ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: "px-3 pb-2",
					children: filterPanel
				}) : null,
				multiSelect ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(MultiSelectBar, {
					enabled: multiSelect.enabled,
					onEnabledChange: multiSelect.onEnabledChange,
					label: multiSelect.label,
					hint: multiSelect.hint,
					disabled: multiSelect.disabled
				}) : null,
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ScrollArea, {
					type: "auto",
					className: "min-h-0 flex-1",
					viewportProps: {
						ref: listRef,
						id: listboxId,
						role: "listbox",
						"aria-multiselectable": isMultiMode,
						"aria-activedescendant": activeOptionDomId,
						tabIndex: -1,
						className: "outline-none"
					},
					style: { maxHeight: typeof maxListHeight === "number" ? `${maxListHeight}px` : maxListHeight },
					children: loading ? loadingState ?? null : flatItems.length === 0 ? emptyState ?? null : sectionsProp ? sectionsProp.map((section, sIdx) => {
						if (section.items.length === 0) return null;
						const offset = sectionOffsets[sIdx] ?? 0;
						return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							role: "group",
							children: [section.header != null ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
								role: "presentation",
								"data-entity-section-header": section.key,
								children: section.header
							}) : null, section.items.map((it, itemIdx) => renderOptionRow(it, offset + itemIdx))]
						}, section.key);
					}) : flatItems.map((it, idx) => renderOptionRow(it, idx))
				}),
				footer ?? null
			]
		})]
	}), ctxMenu.position && ctxMenuNode ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ItemContextMenu, {
		position: ctxMenu.position,
		onClose: ctxMenu.close,
		viewportMargin: contextMenuViewportMargin,
		children: ctxMenuNode
	}) : null] });
}
//#endregion
//#region src/components/composites/flex/index.tsx
const Box = ({ children, className, ...props }) => {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
		className: require_avatar.cn("box-border", className),
		...props,
		children
	});
};
const Flex = ({ children, className, ...props }) => {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Box, {
		className: require_avatar.cn("flex", className),
		...props,
		children
	});
};
const RowFlex = ({ children, className, ...props }) => {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Flex, {
		className: require_avatar.cn("flex-row", className),
		...props,
		children
	});
};
const SpaceBetweenRowFlex = ({ children, className, ...props }) => {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(RowFlex, {
		className: require_avatar.cn("justify-between", className),
		...props,
		children
	});
};
const ColFlex = ({ children, className, ...props }) => {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Flex, {
		className: require_avatar.cn("flex-col", className),
		...props,
		children
	});
};
const Center = ({ children, className, ...props }) => {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Flex, {
		className: require_avatar.cn("items-center justify-center", className),
		...props,
		children
	});
};
//#endregion
//#region src/components/composites/horizontal-scroll-container/index.tsx
const SCROLL_POSITION_TOLERANCE = 1;
const HorizontalScrollContainer = ({ children, scrollDistance = 200, scrollLeftLabel, scrollRightLabel, className, gap = "8px", expandable = false }) => {
	const scrollRef = react.useRef(null);
	const [canScrollLeft, setCanScrollLeft] = react.useState(false);
	const [canScrollRight, setCanScrollRight] = react.useState(false);
	const [isExpanded, setIsExpanded] = react.useState(false);
	const handleScrollLeft = (event) => {
		scrollRef.current?.scrollBy({
			left: -scrollDistance,
			behavior: "smooth"
		});
		event.stopPropagation();
	};
	const handleScrollRight = (event) => {
		scrollRef.current?.scrollBy({
			left: scrollDistance,
			behavior: "smooth"
		});
		event.stopPropagation();
	};
	const handleContainerClick = (event) => {
		if (!expandable) return;
		if (!event.target.closest("[data-no-expand]")) setIsExpanded((value) => !value);
	};
	const checkScrollability = react.useCallback(() => {
		const scrollElement = scrollRef.current;
		if (!scrollElement) return;
		const parentElement = scrollElement.parentElement;
		const availableWidth = parentElement ? parentElement.clientWidth : scrollElement.clientWidth;
		const canScrollValue = scrollElement.scrollWidth > Math.min(availableWidth, scrollElement.clientWidth);
		setCanScrollLeft(canScrollValue && scrollElement.scrollLeft > SCROLL_POSITION_TOLERANCE);
		setCanScrollRight(canScrollValue && scrollElement.scrollLeft + scrollElement.clientWidth < scrollElement.scrollWidth - SCROLL_POSITION_TOLERANCE);
	}, []);
	react.useEffect(() => {
		const scrollElement = scrollRef.current;
		if (!scrollElement) return;
		const resizeObserver = new ResizeObserver(checkScrollability);
		const observeResizeTargets = () => {
			resizeObserver.disconnect();
			resizeObserver.observe(scrollElement);
			if (scrollElement.parentElement) resizeObserver.observe(scrollElement.parentElement);
			for (const child of scrollElement.children) resizeObserver.observe(child);
		};
		const mutationObserver = new MutationObserver(() => {
			observeResizeTargets();
			checkScrollability();
		});
		observeResizeTargets();
		mutationObserver.observe(scrollElement, {
			childList: true,
			subtree: true,
			characterData: true
		});
		scrollElement.addEventListener("scroll", checkScrollability, { passive: true });
		checkScrollability();
		return () => {
			resizeObserver.disconnect();
			mutationObserver.disconnect();
			scrollElement.removeEventListener("scroll", checkScrollability);
		};
	}, [checkScrollability]);
	return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
		className: require_avatar.cn("group/container relative flex max-w-full min-w-0 flex-1 items-center", expandable ? "cursor-pointer" : "cursor-default", className),
		onClick: expandable ? handleContainerClick : void 0,
		children: [
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				ref: scrollRef,
				"data-horizontal-scroll-viewport": "",
				className: "flex min-w-0 flex-1 overflow-y-hidden",
				style: {
					gap,
					overflowX: expandable && isExpanded ? "hidden" : "auto",
					whiteSpace: expandable && isExpanded ? "normal" : "nowrap",
					flexWrap: expandable && isExpanded ? "wrap" : "nowrap",
					scrollbarWidth: "none"
				},
				children
			}),
			canScrollLeft && !isExpanded && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
				type: "button",
				variant: "ghost",
				size: "icon-sm",
				"aria-label": scrollLeftLabel,
				"data-no-expand": true,
				className: require_avatar.cn("scroll-left-button absolute top-1/2 left-2 z-[1] -translate-y-1/2 rounded-full bg-background opacity-0 shadow-md transition-opacity hover:bg-background focus-visible:bg-background", "text-muted-foreground hover:text-foreground focus-visible:text-foreground", "group-hover/container:opacity-100 focus-visible:opacity-100"),
				onClick: handleScrollLeft,
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(lucide_react.ChevronLeft, { className: "size-3.5" })
			}),
			canScrollRight && !isExpanded && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
				type: "button",
				variant: "ghost",
				size: "icon-sm",
				"aria-label": scrollRightLabel,
				"data-no-expand": true,
				className: require_avatar.cn("scroll-right-button absolute top-1/2 right-2 z-[1] -translate-y-1/2 rounded-full bg-background opacity-0 shadow-md transition-opacity hover:bg-background focus-visible:bg-background", "text-muted-foreground hover:text-foreground focus-visible:text-foreground", "group-hover/container:opacity-100 focus-visible:opacity-100"),
				onClick: handleScrollRight,
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(lucide_react.ChevronRight, { className: "size-3.5" })
			})
		]
	});
};
//#endregion
//#region src/components/composites/page-side-panel/index.tsx
function PageSidePanel({ open, onClose, children, title, header, footer, side = "right", showCloseButton = true, closeLabel = "Close", backdropClassName, contentClassName, headerClassName, bodyClassName, footerClassName, closeButtonClassName }) {
	const headerContent = header ?? (title ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
		className: "text-base font-semibold text-foreground",
		children: title
	}) : null);
	const hasHeader = !!headerContent || showCloseButton;
	const headerId = (0, react.useId)();
	const panelRef = (0, react.useRef)(null);
	const triggerRef = (0, react.useRef)(null);
	const closedByPointerDownRef = (0, react.useRef)(false);
	const portalContainer = usePortalContainer() ?? (typeof document === "undefined" ? null : document.body);
	const isScopedPortal = typeof document !== "undefined" && portalContainer !== null && portalContainer !== document.body;
	const handleClose = (0, react.useCallback)((event) => {
		event?.preventDefault();
		event?.stopPropagation();
		onClose();
	}, [onClose]);
	(0, react.useEffect)(() => {
		if (open) {
			closedByPointerDownRef.current = false;
			triggerRef.current = document.activeElement;
			requestAnimationFrame(() => {
				panelRef.current?.focus();
			});
		} else {
			triggerRef.current?.focus();
			triggerRef.current = null;
		}
	}, [open]);
	const panel = /* @__PURE__ */ (0, react_jsx_runtime.jsx)(motion_react.AnimatePresence, { children: open && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(motion_react.motion.div, {
		initial: { opacity: 0 },
		animate: { opacity: 1 },
		exit: { opacity: 0 },
		transition: { duration: .15 },
		"data-slot": "page-side-panel-backdrop",
		className: require_avatar.cn(isScopedPortal ? "absolute inset-0" : "fixed inset-0", "z-60 bg-black/50", backdropClassName),
		onClick: handleClose
	}, "backdrop"), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(motion_react.motion.aside, {
		ref: panelRef,
		role: "dialog",
		"aria-modal": "true",
		"aria-labelledby": headerContent ? headerId : void 0,
		tabIndex: -1,
		onKeyDown: (e) => {
			if (e.key === "Escape") handleClose(e);
		},
		initial: { x: side === "right" ? "100%" : "-100%" },
		animate: { x: 0 },
		exit: { x: side === "right" ? "100%" : "-100%" },
		transition: {
			duration: .18,
			ease: [
				.16,
				1,
				.3,
				1
			]
		},
		"data-slot": "page-side-panel",
		className: require_avatar.cn(isScopedPortal ? "absolute" : "fixed", "top-3 bottom-3 z-70 flex w-100 flex-col overflow-hidden rounded-3xl bg-card text-card-foreground shadow-xl outline-none", side === "right" ? "right-3" : "left-3", contentClassName),
		children: [
			hasHeader && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				"data-slot": "page-side-panel-header",
				className: require_avatar.cn("flex shrink-0 items-center justify-between px-6 pt-6 pb-3", headerClassName),
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					id: headerContent ? headerId : void 0,
					className: "flex min-w-0 flex-1 items-center",
					children: headerContent
				}), showCloseButton && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
					type: "button",
					variant: "ghost",
					size: "icon-sm",
					onPointerDown: (event) => {
						closedByPointerDownRef.current = true;
						handleClose(event);
					},
					onClick: (event) => {
						if (closedByPointerDownRef.current) {
							closedByPointerDownRef.current = false;
							event.preventDefault();
							event.stopPropagation();
							return;
						}
						handleClose(event);
					},
					"aria-label": closeLabel,
					"data-slot": "page-side-panel-close",
					className: require_avatar.cn("ml-3 shrink-0 rounded-md opacity-70 shadow-none transition-opacity hover:bg-transparent hover:opacity-100", closeButtonClassName),
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(lucide_react.XIcon, { size: 16 })
				})]
			}),
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ScrollArea, {
				viewportProps: { "data-slot": "page-side-panel-body" },
				contentProps: { className: require_avatar.cn("h-full min-h-0 space-y-4 px-6 py-4", bodyClassName) },
				className: "min-h-0 flex-1",
				children
			}),
			footer && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				"data-slot": "page-side-panel-footer",
				className: require_avatar.cn("shrink-0 space-y-2.5 px-6 pt-3 pb-6", footerClassName),
				children: footer
			})
		]
	}, "panel")] }) });
	return portalContainer ? (0, react_dom.createPortal)(panel, portalContainer) : panel;
}
function PageSidePanelSection({ title, actions, children, className, ...props }) {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
		className: require_avatar.cn("flex flex-col gap-3", className),
		...props,
		children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
			className: "flex items-center justify-between gap-2",
			children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
				className: "text-sm font-semibold text-foreground",
				children: title
			}), actions && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: "flex shrink-0 items-center gap-1",
				children: actions
			})]
		}), children]
	});
}
function PageSidePanelItem({ title, description, action, children, className, ...props }) {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
		className: require_avatar.cn("flex flex-col gap-2", className),
		...props,
		children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
			className: "flex items-center justify-between gap-3",
			children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "flex min-w-0 flex-col gap-0.5",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: "text-sm text-foreground",
					children: title
				}), description && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: "text-xs text-muted-foreground",
					children: description
				})]
			}), action && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: "shrink-0",
				children: action
			})]
		}), children]
	});
}
//#endregion
//#region src/components/primitives/input-number.tsx
const sizeClasses = {
	small: "h-8 text-sm",
	middle: "h-9 text-sm",
	large: "h-10 text-base"
};
/** Digits after the point, reading `1e-7` as seven rather than as none. */
const decimalsOf = (value) => {
	const [mantissa, exponent] = String(value).split("e");
	const fraction = mantissa.split(".")[1]?.length ?? 0;
	return exponent ? Math.max(0, fraction - Number(exponent)) : fraction;
};
const format = (value) => {
	if (value === null) return "";
	const text = String(value);
	return text.includes("e") ? value.toFixed(Math.min(100, decimalsOf(value))) : text;
};
const allowsDecimal = (step) => step === void 0 || !Number.isInteger(step);
const typablePattern = /^-?\d*\.?\d*(?:e[+-]?\d*)?$/i;
/**
* Accepts anything that could still become a number — `"1."`, `"-"`, `"1e-"` —
* and rejects the rest wholesale. Deleting the offending characters instead
* would silently rewrite the magnitude: `"1e-6"` would become `"16"`.
*/
function isTypable(raw) {
	return typablePattern.test(raw);
}
/** `min > max` admits no value at all, so the field can settle on none — see `InputNumberProps`. */
const isEmptyRange = (min, max) => min !== void 0 && max !== void 0 && min > max;
/** Normalizes on commit only: an integer `step` truncates, then the value is clamped into range. */
function parse(raw, min, max, step) {
	const parsed = Number(raw);
	if (raw === "" || !Number.isFinite(parsed) || isEmptyRange(min, max)) return null;
	const normalized = allowsDecimal(step) ? parsed : Math.trunc(parsed);
	if (min !== void 0 && normalized < min) return min;
	if (max !== void 0 && normalized > max) return max;
	return normalized;
}
/** Reads what the field shows right now — the draft while editing, `value` otherwise. */
function toNumber(raw) {
	const parsed = Number(raw);
	return raw === "" || !Number.isFinite(parsed) ? null : parsed;
}
const isPromise = (value) => typeof value?.then === "function";
const inRange = (value, min, max) => (min === void 0 || value >= min) && (max === void 0 || value <= max);
/**
* Moves to the next value on the grid `step` describes, in the direction of travel —
* the same rule `stepUp`/`stepDown` follow on a native number input. The grid is
* anchored at `min` when one is declared, so `min={0.5} step={1}` steps 0.5, 1.5, 2.5.
*
* Adding `step` to an off-grid base instead would carry the remainder along: from
* `3.7` with `step={1}` the next value is 4, not 4.7 — nor 5, which is what rounding
* the sum to the step's precision used to produce. Rounding still finishes the job,
* since `0.1` in binary floating point otherwise surfaces as `0.30000000000000004`.
*
* A base already outside the range is left where it is rather than clamped, so an
* arrow never moves the value against its own direction.
*/
function stepFrom(base, step, min, max) {
	const anchor = min ?? 0;
	const size = Math.abs(step);
	const offsets = (base - anchor) / size;
	const epsilon = 1e-9;
	const next = step > 0 ? Math.floor(offsets + epsilon) + 1 : Math.ceil(offsets - epsilon) - 1;
	const decimals = Math.max(decimalsOf(size), decimalsOf(anchor));
	const stepped = Number((anchor + next * size).toFixed(decimals));
	const clamped = min !== void 0 && stepped < min ? min : max !== void 0 && stepped > max ? max : stepped;
	return (step > 0 ? clamped < base : clamped > base) ? base : clamped;
}
function InputNumber({ value, onValueChange, min, max, step, size = "middle", className, onFocus, onBlur, onKeyDown, ...props }) {
	if (min !== void 0 && max !== void 0 && min > max) console.warn(`InputNumber: min (${min}) is greater than max (${max}); no value can satisfy that, so the field will settle on none.`);
	const [draft, setDraft] = react.useState(null);
	const text = draft ?? format(value);
	const preEdit = react.useRef(null);
	const [busy, setBusy] = react.useState(false);
	const generation = react.useRef(0);
	const discarding = react.useRef(false);
	const handleChange = (event) => {
		const next = event.target.value;
		if (!isTypable(next)) return;
		setDraft(next);
		const parsed = Number(next);
		if (next === "") onValueChange?.(null);
		else if (Number.isFinite(parsed)) onValueChange?.(parsed);
	};
	const handleBlur = () => {
		const isIncomplete = text !== "" && !Number.isFinite(Number(text));
		const settled = discarding.current || isIncomplete ? preEdit.current : parse(text, min, max, step);
		discarding.current = false;
		const commit = onBlur?.(settled);
		if (!isPromise(commit)) {
			setDraft(null);
			return;
		}
		const current = ++generation.current;
		setDraft(format(settled));
		setBusy(true);
		const release = () => {
			if (generation.current !== current) return;
			setBusy(false);
			setDraft(null);
		};
		commit.then(release, release);
	};
	const handleKeyDown = (event) => {
		if (event.key === "Enter") event.currentTarget.blur();
		if (event.key === "Escape") {
			event.stopPropagation();
			discarding.current = true;
			onValueChange?.(preEdit.current);
			event.currentTarget.blur();
		}
		if (event.key === "ArrowUp" || event.key === "ArrowDown") {
			event.preventDefault();
			if (isEmptyRange(min, max)) return;
			const delta = (step ?? 1) * (event.key === "ArrowUp" ? 1 : -1);
			const current = toNumber(text);
			const bound = event.key === "ArrowUp" ? min : max;
			const next = current === null ? bound ?? stepFrom(0, delta, min, max) : stepFrom(current, delta, min, max);
			if (current === null && bound === void 0 && !inRange(next, min, max)) return;
			setDraft(format(next));
			onValueChange?.(next);
		}
		onKeyDown?.(event);
	};
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Input$1, {
		...props,
		type: "text",
		inputMode: allowsDecimal(step) ? "decimal" : "numeric",
		role: "spinbutton",
		"aria-busy": busy || void 0,
		"data-busy": busy || void 0,
		"aria-valuemin": min,
		"aria-valuemax": max,
		"aria-valuenow": toNumber(text) ?? void 0,
		value: text,
		className: require_avatar.cn(sizeClasses[size], "data-[busy=true]:cursor-progress data-[busy=true]:opacity-40", className),
		onFocus: (event) => {
			generation.current += 1;
			setBusy(false);
			preEdit.current = toNumber(text);
			setDraft(text);
			onFocus?.(event);
		},
		onChange: handleChange,
		onBlur: handleBlur,
		onKeyDown: handleKeyDown
	});
}
//#endregion
//#region src/components/primitives/textarea.tsx
var textarea_exports = /* @__PURE__ */ require_avatar.__exportAll({
	CharCount: () => CharCount,
	Input: () => Input
});
const textareaVariants = (0, class_variance_authority.cva)(require_avatar.cn("flex field-sizing-content min-h-16 w-full resize-y border bg-transparent px-4 py-3 text-lg transition-[color,box-shadow] outline-none", "rounded-md", "border-input text-foreground placeholder:text-muted-foreground", "focus-visible:border-primary", "disabled:cursor-not-allowed disabled:opacity-50", "md:text-sm"), {
	variants: { hasError: {
		true: "aria-invalid:border-destructive aria-invalid:ring-destructive/20",
		false: ""
	} },
	defaultVariants: { hasError: false }
});
const INPUT_NAME = "TextareaInput";
function TextareaInput({ value: valueProp, defaultValue, onValueChange, hasError = false, className, ref, ...props }) {
	const [value, setValue] = (0, _radix_ui_react_use_controllable_state.useControllableState)({
		prop: valueProp,
		defaultProp: defaultValue ?? "",
		onChange: onValueChange
	});
	const handleChange = (0, _radix_ui_react_use_callback_ref.useCallbackRef)((event) => {
		const newValue = event.target.value;
		if (props.maxLength && newValue.length > props.maxLength) return;
		setValue(newValue);
	});
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("textarea", {
		"data-slot": "textarea-input",
		...props,
		ref,
		value,
		onChange: (0, _radix_ui_primitive.composeEventHandlers)(props.onChange, handleChange),
		"aria-invalid": hasError,
		className: require_avatar.cn(textareaVariants({ hasError }), className)
	});
}
TextareaInput.displayName = INPUT_NAME;
const CHAR_COUNT_NAME = "TextareaCharCount";
function TextareaCharCount({ value = "", maxLength, className, ...props }) {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
		"data-slot": "textarea-char-count",
		...props,
		className: require_avatar.cn("absolute right-2 bottom-2 text-xs text-muted-foreground", className),
		children: [
			value.length,
			"/",
			maxLength
		]
	});
}
TextareaCharCount.displayName = CHAR_COUNT_NAME;
const Input = TextareaInput;
const CharCount = TextareaCharCount;
//#endregion
//#region src/components/primitives/input-group.tsx
const inputGroupVariants$1 = (0, class_variance_authority.cva)([
	"group/input-group relative flex w-full items-center rounded-md border border-input bg-background transition-[color,box-shadow] outline-none",
	"min-w-0 has-[>textarea]:h-auto",
	"has-[>[data-align=inline-start]]:[&>input]:pl-2",
	"has-[>[data-align=inline-end]]:[&>input]:pr-2",
	"has-[>[data-align=block-start]]:h-auto has-[>[data-align=block-start]]:flex-col has-[>[data-align=block-start]]:[&>input]:pb-3",
	"has-[>[data-align=block-end]]:h-auto has-[>[data-align=block-end]]:flex-col has-[>[data-align=block-end]]:[&>input]:pt-3",
	"has-[[data-slot=input-group-control]:focus-visible]:border-primary",
	"has-[[data-slot][aria-invalid=true]]:border-destructive has-[[data-slot][aria-invalid=true]]:ring-destructive/20 dark:has-[[data-slot][aria-invalid=true]]:ring-destructive/40"
], {
	variants: { size: {
		default: "h-9",
		sm: "h-7 text-sm"
	} },
	defaultVariants: { size: "default" }
});
function InputGroup({ className, size, ...props }) {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
		"data-slot": "input-group",
		role: "group",
		className: require_avatar.cn(inputGroupVariants$1({ size }), className),
		...props
	});
}
const inputGroupAddonVariants = (0, class_variance_authority.cva)("flex h-auto items-center justify-center gap-2 py-1.5 text-sm font-medium text-muted-foreground select-none group-data-[disabled=true]/input-group:opacity-50 [&>svg:not([class*='size-'])]:size-4", {
	variants: { align: {
		"inline-start": "order-first pl-3 has-[>button]:ml-[-0.45rem] has-[>kbd]:ml-[-0.35rem]",
		"inline-end": "order-last pr-3 has-[>button]:mr-[-0.45rem] has-[>kbd]:mr-[-0.35rem]",
		"block-start": "order-first w-full justify-start px-3 pt-3 group-has-[>input]/input-group:pt-2.5 [.border-b]:pb-3",
		"block-end": "order-last w-full justify-start px-3 pb-3 group-has-[>input]/input-group:pb-2.5 [.border-t]:pt-3"
	} },
	defaultVariants: { align: "inline-start" }
});
function InputGroupAddon({ className, align = "inline-start", ...props }) {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
		role: "group",
		"data-slot": "input-group-addon",
		"data-align": align,
		className: require_avatar.cn(inputGroupAddonVariants({ align }), className),
		onClick: (e) => {
			if (e.target.closest("button")) return;
			e.currentTarget.parentElement?.querySelector("input")?.focus();
		},
		...props
	});
}
const inputGroupButtonVariants = (0, class_variance_authority.cva)("flex items-center gap-2 text-sm shadow-none", {
	variants: { size: {
		xs: "h-6 gap-1 px-2 has-[>svg]:px-2 [&>svg:not([class*='size-'])]:size-3.5",
		sm: "h-8 gap-1.5 rounded-md px-2.5 has-[>svg]:px-2.5",
		"icon-xs": "size-6 min-h-0 p-0 has-[>svg]:p-0",
		"icon-sm": "size-8 min-h-0 p-0 has-[>svg]:p-0"
	} },
	defaultVariants: { size: "xs" }
});
function InputGroupButton({ className, type = "button", variant = "ghost", size = "xs", ...props }) {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
		type,
		"data-size": size,
		variant,
		className: require_avatar.cn(inputGroupButtonVariants({ size }), className),
		...props
	});
}
function InputGroupText({ className, ...props }) {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
		className: require_avatar.cn("flex items-center gap-2 text-sm text-muted-foreground [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4", className),
		...props
	});
}
function InputGroupInput({ className, ...props }) {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Input$1, {
		"data-slot": "input-group-control",
		className: require_avatar.cn("flex-1 rounded-none border-0 bg-transparent shadow-none focus-visible:ring-0 dark:bg-transparent", className),
		...props
	});
}
function InputGroupInputNumber({ className, ...props }) {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(InputNumber, {
		"data-slot": "input-group-control",
		className: require_avatar.cn("h-full flex-1 rounded-none border-0 bg-transparent shadow-none focus-visible:ring-0 dark:bg-transparent", className),
		...props
	});
}
function InputGroupTextarea({ className, ...props }) {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Input, {
		"data-slot": "input-group-control",
		className: require_avatar.cn("flex-1 resize-none rounded-none border-0 bg-transparent py-3 shadow-none focus-visible:ring-0 dark:bg-transparent", className),
		...props
	});
}
//#endregion
//#region src/components/composites/search-input/index.tsx
/**
* Search field built on `InputGroup`: a leading search icon, a text input, and
* an optional trailing clear button. Controlled via `value` / `onChange`.
*/
function SearchInput({ className, value, disabled, onClear, clearLabel, size, containerClassName, ...props }) {
	const hasValue = value !== void 0 && value !== null && String(value).length > 0;
	const showClear = onClear !== void 0 && clearLabel !== void 0 && hasValue;
	return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(InputGroup, {
		size,
		className: containerClassName,
		"data-disabled": disabled ? "true" : void 0,
		children: [
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)(InputGroupAddon, { children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(lucide_react.Search, {}) }),
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)(InputGroupInput, {
				type: "search",
				value,
				disabled,
				className: require_avatar.cn("[&::-webkit-search-cancel-button]:hidden", className),
				...props
			}),
			showClear && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(InputGroupAddon, {
				align: "inline-end",
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(InputGroupButton, {
					type: "button",
					size: "icon-xs",
					"aria-label": clearLabel,
					disabled,
					onClick: onClear,
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(lucide_react.X, { className: "size-3.5" })
				})
			})
		]
	});
}
//#endregion
//#region ../../node_modules/.pnpm/@tanstack+virtual-core@3.14.0/node_modules/@tanstack/virtual-core/dist/esm/utils.js
function memo$2(getDeps, fn, opts) {
	let deps = opts.initialDeps ?? [];
	let result;
	let isInitial = true;
	function memoizedFunction() {
		var _a, _b, _c;
		let depTime;
		if (opts.key && ((_a = opts.debug) == null ? void 0 : _a.call(opts))) depTime = Date.now();
		const newDeps = getDeps();
		if (!(newDeps.length !== deps.length || newDeps.some((dep, index) => deps[index] !== dep))) return result;
		deps = newDeps;
		let resultTime;
		if (opts.key && ((_b = opts.debug) == null ? void 0 : _b.call(opts))) resultTime = Date.now();
		result = fn(...newDeps);
		if (opts.key && ((_c = opts.debug) == null ? void 0 : _c.call(opts))) {
			const depEndTime = Math.round((Date.now() - depTime) * 100) / 100;
			const resultEndTime = Math.round((Date.now() - resultTime) * 100) / 100;
			const resultFpsPercentage = resultEndTime / 16;
			const pad = (str, num) => {
				str = String(str);
				while (str.length < num) str = " " + str;
				return str;
			};
			console.info(`%c⏱ ${pad(resultEndTime, 5)} /${pad(depEndTime, 5)} ms`, `
            font-size: .6rem;
            font-weight: bold;
            color: hsl(${Math.max(0, Math.min(120 - 120 * resultFpsPercentage, 120))}deg 100% 31%);`, opts == null ? void 0 : opts.key);
		}
		if ((opts == null ? void 0 : opts.onChange) && !(isInitial && opts.skipInitialOnChange)) opts.onChange(result);
		isInitial = false;
		return result;
	}
	memoizedFunction.updateDeps = (newDeps) => {
		deps = newDeps;
	};
	return memoizedFunction;
}
function notUndefined(value, msg) {
	if (value === void 0) throw new Error(`Unexpected undefined${msg ? `: ${msg}` : ""}`);
	else return value;
}
const approxEqual = (a, b) => Math.abs(a - b) < 1.01;
const debounce = (targetWindow, fn, ms) => {
	let timeoutId;
	return function(...args) {
		targetWindow.clearTimeout(timeoutId);
		timeoutId = targetWindow.setTimeout(() => fn.apply(this, args), ms);
	};
};
//#endregion
//#region ../../node_modules/.pnpm/@tanstack+virtual-core@3.14.0/node_modules/@tanstack/virtual-core/dist/esm/index.js
const getRect = (element) => {
	const { offsetWidth, offsetHeight } = element;
	return {
		width: offsetWidth,
		height: offsetHeight
	};
};
const defaultKeyExtractor = (index) => index;
const defaultRangeExtractor = (range) => {
	const start = Math.max(range.startIndex - range.overscan, 0);
	const end = Math.min(range.endIndex + range.overscan, range.count - 1);
	const arr = [];
	for (let i = start; i <= end; i++) arr.push(i);
	return arr;
};
const observeElementRect = (instance, cb) => {
	const element = instance.scrollElement;
	if (!element) return;
	const targetWindow = instance.targetWindow;
	if (!targetWindow) return;
	const handler = (rect) => {
		const { width, height } = rect;
		cb({
			width: Math.round(width),
			height: Math.round(height)
		});
	};
	handler(getRect(element));
	if (!targetWindow.ResizeObserver) return () => {};
	const observer = new targetWindow.ResizeObserver((entries) => {
		const run = () => {
			const entry = entries[0];
			if (entry == null ? void 0 : entry.borderBoxSize) {
				const box = entry.borderBoxSize[0];
				if (box) {
					handler({
						width: box.inlineSize,
						height: box.blockSize
					});
					return;
				}
			}
			handler(getRect(element));
		};
		instance.options.useAnimationFrameWithResizeObserver ? requestAnimationFrame(run) : run();
	});
	observer.observe(element, { box: "border-box" });
	return () => {
		observer.unobserve(element);
	};
};
const addEventListenerOptions = { passive: true };
const supportsScrollend = typeof window == "undefined" ? true : "onscrollend" in window;
const observeElementOffset = (instance, cb) => {
	const element = instance.scrollElement;
	if (!element) return;
	const targetWindow = instance.targetWindow;
	if (!targetWindow) return;
	let offset = 0;
	const fallback = instance.options.useScrollendEvent && supportsScrollend ? () => void 0 : debounce(targetWindow, () => {
		cb(offset, false);
	}, instance.options.isScrollingResetDelay);
	const createHandler = (isScrolling) => () => {
		const { horizontal, isRtl } = instance.options;
		offset = horizontal ? element["scrollLeft"] * (isRtl && -1 || 1) : element["scrollTop"];
		fallback();
		cb(offset, isScrolling);
	};
	const handler = createHandler(true);
	const endHandler = createHandler(false);
	element.addEventListener("scroll", handler, addEventListenerOptions);
	const registerScrollendEvent = instance.options.useScrollendEvent && supportsScrollend;
	if (registerScrollendEvent) element.addEventListener("scrollend", endHandler, addEventListenerOptions);
	return () => {
		element.removeEventListener("scroll", handler);
		if (registerScrollendEvent) element.removeEventListener("scrollend", endHandler);
	};
};
const measureElement = (element, entry, instance) => {
	if (entry == null ? void 0 : entry.borderBoxSize) {
		const box = entry.borderBoxSize[0];
		if (box) return Math.round(box[instance.options.horizontal ? "inlineSize" : "blockSize"]);
	}
	return element[instance.options.horizontal ? "offsetWidth" : "offsetHeight"];
};
const elementScroll = (offset, { adjustments = 0, behavior }, instance) => {
	var _a, _b;
	const toOffset = offset + adjustments;
	(_b = (_a = instance.scrollElement) == null ? void 0 : _a.scrollTo) == null || _b.call(_a, {
		[instance.options.horizontal ? "left" : "top"]: toOffset,
		behavior
	});
};
var Virtualizer = class {
	constructor(opts) {
		this.unsubs = [];
		this.scrollElement = null;
		this.targetWindow = null;
		this.isScrolling = false;
		this.scrollState = null;
		this.measurementsCache = [];
		this.itemSizeCache = /* @__PURE__ */ new Map();
		this.laneAssignments = /* @__PURE__ */ new Map();
		this.pendingMeasuredCacheIndexes = [];
		this.prevLanes = void 0;
		this.lanesChangedFlag = false;
		this.lanesSettling = false;
		this.scrollRect = null;
		this.scrollOffset = null;
		this.scrollDirection = null;
		this.scrollAdjustments = 0;
		this.elementsCache = /* @__PURE__ */ new Map();
		this.now = () => {
			var _a, _b, _c;
			return ((_c = (_b = (_a = this.targetWindow) == null ? void 0 : _a.performance) == null ? void 0 : _b.now) == null ? void 0 : _c.call(_b)) ?? Date.now();
		};
		this.observer = /* @__PURE__ */ (() => {
			let _ro = null;
			const get = () => {
				if (_ro) return _ro;
				if (!this.targetWindow || !this.targetWindow.ResizeObserver) return null;
				return _ro = new this.targetWindow.ResizeObserver((entries) => {
					entries.forEach((entry) => {
						const run = () => {
							const node = entry.target;
							const index = this.indexFromElement(node);
							if (!node.isConnected) {
								this.observer.unobserve(node);
								return;
							}
							if (this.shouldMeasureDuringScroll(index)) this.resizeItem(index, this.options.measureElement(node, entry, this));
						};
						this.options.useAnimationFrameWithResizeObserver ? requestAnimationFrame(run) : run();
					});
				});
			};
			return {
				disconnect: () => {
					var _a;
					(_a = get()) == null || _a.disconnect();
					_ro = null;
				},
				observe: (target) => {
					var _a;
					return (_a = get()) == null ? void 0 : _a.observe(target, { box: "border-box" });
				},
				unobserve: (target) => {
					var _a;
					return (_a = get()) == null ? void 0 : _a.unobserve(target);
				}
			};
		})();
		this.range = null;
		this.setOptions = (opts2) => {
			Object.entries(opts2).forEach(([key, value]) => {
				if (typeof value === "undefined") delete opts2[key];
			});
			this.options = {
				debug: false,
				initialOffset: 0,
				overscan: 1,
				paddingStart: 0,
				paddingEnd: 0,
				scrollPaddingStart: 0,
				scrollPaddingEnd: 0,
				horizontal: false,
				getItemKey: defaultKeyExtractor,
				rangeExtractor: defaultRangeExtractor,
				onChange: () => {},
				measureElement,
				initialRect: {
					width: 0,
					height: 0
				},
				scrollMargin: 0,
				gap: 0,
				indexAttribute: "data-index",
				initialMeasurementsCache: [],
				lanes: 1,
				isScrollingResetDelay: 150,
				enabled: true,
				isRtl: false,
				useScrollendEvent: false,
				useAnimationFrameWithResizeObserver: false,
				laneAssignmentMode: "estimate",
				...opts2
			};
		};
		this.notify = (sync) => {
			var _a, _b;
			(_b = (_a = this.options).onChange) == null || _b.call(_a, this, sync);
		};
		this.maybeNotify = memo$2(() => {
			this.calculateRange();
			return [
				this.isScrolling,
				this.range ? this.range.startIndex : null,
				this.range ? this.range.endIndex : null
			];
		}, (isScrolling) => {
			this.notify(isScrolling);
		}, {
			key: process.env.NODE_ENV !== "production" && "maybeNotify",
			debug: () => this.options.debug,
			initialDeps: [
				this.isScrolling,
				this.range ? this.range.startIndex : null,
				this.range ? this.range.endIndex : null
			]
		});
		this.cleanup = () => {
			this.unsubs.filter(Boolean).forEach((d) => d());
			this.unsubs = [];
			this.observer.disconnect();
			if (this.rafId != null && this.targetWindow) {
				this.targetWindow.cancelAnimationFrame(this.rafId);
				this.rafId = null;
			}
			this.scrollState = null;
			this.scrollElement = null;
			this.targetWindow = null;
		};
		this._didMount = () => {
			return () => {
				this.cleanup();
			};
		};
		this._willUpdate = () => {
			var _a;
			const scrollElement = this.options.enabled ? this.options.getScrollElement() : null;
			if (this.scrollElement !== scrollElement) {
				this.cleanup();
				if (!scrollElement) {
					this.maybeNotify();
					return;
				}
				this.scrollElement = scrollElement;
				if (this.scrollElement && "ownerDocument" in this.scrollElement) this.targetWindow = this.scrollElement.ownerDocument.defaultView;
				else this.targetWindow = ((_a = this.scrollElement) == null ? void 0 : _a.window) ?? null;
				this.elementsCache.forEach((cached) => {
					this.observer.observe(cached);
				});
				this.unsubs.push(this.options.observeElementRect(this, (rect) => {
					this.scrollRect = rect;
					this.maybeNotify();
				}));
				this.unsubs.push(this.options.observeElementOffset(this, (offset, isScrolling) => {
					this.scrollAdjustments = 0;
					this.scrollDirection = isScrolling ? this.getScrollOffset() < offset ? "forward" : "backward" : null;
					this.scrollOffset = offset;
					this.isScrolling = isScrolling;
					if (this.scrollState) this.scheduleScrollReconcile();
					this.maybeNotify();
				}));
				this._scrollToOffset(this.getScrollOffset(), {
					adjustments: void 0,
					behavior: void 0
				});
			}
		};
		this.rafId = null;
		this.getSize = () => {
			if (!this.options.enabled) {
				this.scrollRect = null;
				return 0;
			}
			this.scrollRect = this.scrollRect ?? this.options.initialRect;
			return this.scrollRect[this.options.horizontal ? "width" : "height"];
		};
		this.getScrollOffset = () => {
			if (!this.options.enabled) {
				this.scrollOffset = null;
				return 0;
			}
			this.scrollOffset = this.scrollOffset ?? (typeof this.options.initialOffset === "function" ? this.options.initialOffset() : this.options.initialOffset);
			return this.scrollOffset;
		};
		this.getFurthestMeasurement = (measurements, index) => {
			const furthestMeasurementsFound = /* @__PURE__ */ new Map();
			const furthestMeasurements = /* @__PURE__ */ new Map();
			for (let m = index - 1; m >= 0; m--) {
				const measurement = measurements[m];
				if (furthestMeasurementsFound.has(measurement.lane)) continue;
				const previousFurthestMeasurement = furthestMeasurements.get(measurement.lane);
				if (previousFurthestMeasurement == null || measurement.end > previousFurthestMeasurement.end) furthestMeasurements.set(measurement.lane, measurement);
				else if (measurement.end < previousFurthestMeasurement.end) furthestMeasurementsFound.set(measurement.lane, true);
				if (furthestMeasurementsFound.size === this.options.lanes) break;
			}
			return furthestMeasurements.size === this.options.lanes ? Array.from(furthestMeasurements.values()).sort((a, b) => {
				if (a.end === b.end) return a.index - b.index;
				return a.end - b.end;
			})[0] : void 0;
		};
		this.getMeasurementOptions = memo$2(() => [
			this.options.count,
			this.options.paddingStart,
			this.options.scrollMargin,
			this.options.getItemKey,
			this.options.enabled,
			this.options.lanes,
			this.options.laneAssignmentMode
		], (count, paddingStart, scrollMargin, getItemKey, enabled, lanes, laneAssignmentMode) => {
			if (this.prevLanes !== void 0 && this.prevLanes !== lanes) this.lanesChangedFlag = true;
			this.prevLanes = lanes;
			this.pendingMeasuredCacheIndexes = [];
			return {
				count,
				paddingStart,
				scrollMargin,
				getItemKey,
				enabled,
				lanes,
				laneAssignmentMode
			};
		}, { key: false });
		this.getMeasurements = memo$2(() => [this.getMeasurementOptions(), this.itemSizeCache], ({ count, paddingStart, scrollMargin, getItemKey, enabled, lanes, laneAssignmentMode }, itemSizeCache) => {
			if (!enabled) {
				this.measurementsCache = [];
				this.itemSizeCache.clear();
				this.laneAssignments.clear();
				return [];
			}
			if (this.laneAssignments.size > count) {
				for (const index of this.laneAssignments.keys()) if (index >= count) this.laneAssignments.delete(index);
			}
			if (this.lanesChangedFlag) {
				this.lanesChangedFlag = false;
				this.lanesSettling = true;
				this.measurementsCache = [];
				this.itemSizeCache.clear();
				this.laneAssignments.clear();
				this.pendingMeasuredCacheIndexes = [];
			}
			if (this.measurementsCache.length === 0 && !this.lanesSettling) {
				this.measurementsCache = this.options.initialMeasurementsCache;
				this.measurementsCache.forEach((item) => {
					this.itemSizeCache.set(item.key, item.size);
				});
			}
			const min = this.lanesSettling ? 0 : this.pendingMeasuredCacheIndexes.length > 0 ? Math.min(...this.pendingMeasuredCacheIndexes) : 0;
			this.pendingMeasuredCacheIndexes = [];
			if (this.lanesSettling && this.measurementsCache.length === count) this.lanesSettling = false;
			const measurements = this.measurementsCache.slice(0, min);
			const laneLastIndex = new Array(lanes).fill(void 0);
			for (let m = 0; m < min; m++) {
				const item = measurements[m];
				if (item) laneLastIndex[item.lane] = m;
			}
			for (let i = min; i < count; i++) {
				const key = getItemKey(i);
				const cachedLane = this.laneAssignments.get(i);
				let lane;
				let start;
				const shouldCacheLane = laneAssignmentMode === "estimate" || itemSizeCache.has(key);
				if (cachedLane !== void 0 && this.options.lanes > 1) {
					lane = cachedLane;
					const prevIndex = laneLastIndex[lane];
					const prevInLane = prevIndex !== void 0 ? measurements[prevIndex] : void 0;
					start = prevInLane ? prevInLane.end + this.options.gap : paddingStart + scrollMargin;
				} else {
					const furthestMeasurement = this.options.lanes === 1 ? measurements[i - 1] : this.getFurthestMeasurement(measurements, i);
					start = furthestMeasurement ? furthestMeasurement.end + this.options.gap : paddingStart + scrollMargin;
					lane = furthestMeasurement ? furthestMeasurement.lane : i % this.options.lanes;
					if (this.options.lanes > 1 && shouldCacheLane) this.laneAssignments.set(i, lane);
				}
				const measuredSize = itemSizeCache.get(key);
				const size = typeof measuredSize === "number" ? measuredSize : this.options.estimateSize(i);
				const end = start + size;
				measurements[i] = {
					index: i,
					start,
					size,
					end,
					key,
					lane
				};
				laneLastIndex[lane] = i;
			}
			this.measurementsCache = measurements;
			return measurements;
		}, {
			key: process.env.NODE_ENV !== "production" && "getMeasurements",
			debug: () => this.options.debug
		});
		this.calculateRange = memo$2(() => [
			this.getMeasurements(),
			this.getSize(),
			this.getScrollOffset(),
			this.options.lanes
		], (measurements, outerSize, scrollOffset, lanes) => {
			return this.range = measurements.length > 0 && outerSize > 0 ? calculateRange({
				measurements,
				outerSize,
				scrollOffset,
				lanes
			}) : null;
		}, {
			key: process.env.NODE_ENV !== "production" && "calculateRange",
			debug: () => this.options.debug
		});
		this.getVirtualIndexes = memo$2(() => {
			let startIndex = null;
			let endIndex = null;
			const range = this.calculateRange();
			if (range) {
				startIndex = range.startIndex;
				endIndex = range.endIndex;
			}
			this.maybeNotify.updateDeps([
				this.isScrolling,
				startIndex,
				endIndex
			]);
			return [
				this.options.rangeExtractor,
				this.options.overscan,
				this.options.count,
				startIndex,
				endIndex
			];
		}, (rangeExtractor, overscan, count, startIndex, endIndex) => {
			return startIndex === null || endIndex === null ? [] : rangeExtractor({
				startIndex,
				endIndex,
				overscan,
				count
			});
		}, {
			key: process.env.NODE_ENV !== "production" && "getVirtualIndexes",
			debug: () => this.options.debug
		});
		this.indexFromElement = (node) => {
			const attributeName = this.options.indexAttribute;
			const indexStr = node.getAttribute(attributeName);
			if (!indexStr) {
				console.warn(`Missing attribute name '${attributeName}={index}' on measured element.`);
				return -1;
			}
			return parseInt(indexStr, 10);
		};
		this.shouldMeasureDuringScroll = (index) => {
			var _a;
			if (!this.scrollState || this.scrollState.behavior !== "smooth") return true;
			const scrollIndex = this.scrollState.index ?? ((_a = this.getVirtualItemForOffset(this.scrollState.lastTargetOffset)) == null ? void 0 : _a.index);
			if (scrollIndex !== void 0 && this.range) {
				const bufferSize = Math.max(this.options.overscan, Math.ceil((this.range.endIndex - this.range.startIndex) / 2));
				const minIndex = Math.max(0, scrollIndex - bufferSize);
				const maxIndex = Math.min(this.options.count - 1, scrollIndex + bufferSize);
				return index >= minIndex && index <= maxIndex;
			}
			return true;
		};
		this.measureElement = (node) => {
			if (!node) {
				this.elementsCache.forEach((cached, key2) => {
					if (!cached.isConnected) {
						this.observer.unobserve(cached);
						this.elementsCache.delete(key2);
					}
				});
				return;
			}
			const index = this.indexFromElement(node);
			const key = this.options.getItemKey(index);
			const prevNode = this.elementsCache.get(key);
			if (prevNode !== node) {
				if (prevNode) this.observer.unobserve(prevNode);
				this.observer.observe(node);
				this.elementsCache.set(key, node);
			}
			if ((!this.isScrolling || this.scrollState) && this.shouldMeasureDuringScroll(index)) this.resizeItem(index, this.options.measureElement(node, void 0, this));
		};
		this.resizeItem = (index, size) => {
			var _a;
			const item = this.measurementsCache[index];
			if (!item) return;
			const delta = size - (this.itemSizeCache.get(item.key) ?? item.size);
			if (delta !== 0) {
				if (((_a = this.scrollState) == null ? void 0 : _a.behavior) !== "smooth" && (this.shouldAdjustScrollPositionOnItemSizeChange !== void 0 ? this.shouldAdjustScrollPositionOnItemSizeChange(item, delta, this) : item.start < this.getScrollOffset() + this.scrollAdjustments)) {
					if (process.env.NODE_ENV !== "production" && this.options.debug) console.info("correction", delta);
					this._scrollToOffset(this.getScrollOffset(), {
						adjustments: this.scrollAdjustments += delta,
						behavior: void 0
					});
				}
				this.pendingMeasuredCacheIndexes.push(item.index);
				this.itemSizeCache = new Map(this.itemSizeCache.set(item.key, size));
				this.notify(false);
			}
		};
		this.getVirtualItems = memo$2(() => [this.getVirtualIndexes(), this.getMeasurements()], (indexes, measurements) => {
			const virtualItems = [];
			for (let k = 0, len = indexes.length; k < len; k++) {
				const measurement = measurements[indexes[k]];
				virtualItems.push(measurement);
			}
			return virtualItems;
		}, {
			key: process.env.NODE_ENV !== "production" && "getVirtualItems",
			debug: () => this.options.debug
		});
		this.getVirtualItemForOffset = (offset) => {
			const measurements = this.getMeasurements();
			if (measurements.length === 0) return;
			return notUndefined(measurements[findNearestBinarySearch(0, measurements.length - 1, (index) => notUndefined(measurements[index]).start, offset)]);
		};
		this.getMaxScrollOffset = () => {
			if (!this.scrollElement) return 0;
			if ("scrollHeight" in this.scrollElement) return this.options.horizontal ? this.scrollElement.scrollWidth - this.scrollElement.clientWidth : this.scrollElement.scrollHeight - this.scrollElement.clientHeight;
			else {
				const doc = this.scrollElement.document.documentElement;
				return this.options.horizontal ? doc.scrollWidth - this.scrollElement.innerWidth : doc.scrollHeight - this.scrollElement.innerHeight;
			}
		};
		this.getOffsetForAlignment = (toOffset, align, itemSize = 0) => {
			if (!this.scrollElement) return 0;
			const size = this.getSize();
			const scrollOffset = this.getScrollOffset();
			if (align === "auto") align = toOffset >= scrollOffset + size ? "end" : "start";
			if (align === "center") toOffset += (itemSize - size) / 2;
			else if (align === "end") toOffset -= size;
			const maxOffset = this.getMaxScrollOffset();
			return Math.max(Math.min(maxOffset, toOffset), 0);
		};
		this.getOffsetForIndex = (index, align = "auto") => {
			index = Math.max(0, Math.min(index, this.options.count - 1));
			const size = this.getSize();
			const scrollOffset = this.getScrollOffset();
			const item = this.measurementsCache[index];
			if (!item) return;
			if (align === "auto") {
				if (item.end >= scrollOffset + size - this.options.scrollPaddingEnd) align = "end";
				else if (item.start <= scrollOffset + this.options.scrollPaddingStart) align = "start";
				else return [scrollOffset, align];
			}
			if (align === "end" && index === this.options.count - 1) return [this.getMaxScrollOffset(), align];
			const toOffset = align === "end" ? item.end + this.options.scrollPaddingEnd : item.start - this.options.scrollPaddingStart;
			return [this.getOffsetForAlignment(toOffset, align, item.size), align];
		};
		this.scrollToOffset = (toOffset, { align = "start", behavior = "auto" } = {}) => {
			const offset = this.getOffsetForAlignment(toOffset, align);
			const now = this.now();
			this.scrollState = {
				index: null,
				align,
				behavior,
				startedAt: now,
				lastTargetOffset: offset,
				stableFrames: 0
			};
			this._scrollToOffset(offset, {
				adjustments: void 0,
				behavior
			});
			this.scheduleScrollReconcile();
		};
		this.scrollToIndex = (index, { align: initialAlign = "auto", behavior = "auto" } = {}) => {
			index = Math.max(0, Math.min(index, this.options.count - 1));
			const offsetInfo = this.getOffsetForIndex(index, initialAlign);
			if (!offsetInfo) return;
			const [offset, align] = offsetInfo;
			const now = this.now();
			this.scrollState = {
				index,
				align,
				behavior,
				startedAt: now,
				lastTargetOffset: offset,
				stableFrames: 0
			};
			this._scrollToOffset(offset, {
				adjustments: void 0,
				behavior
			});
			this.scheduleScrollReconcile();
		};
		this.scrollBy = (delta, { behavior = "auto" } = {}) => {
			const offset = this.getScrollOffset() + delta;
			const now = this.now();
			this.scrollState = {
				index: null,
				align: "start",
				behavior,
				startedAt: now,
				lastTargetOffset: offset,
				stableFrames: 0
			};
			this._scrollToOffset(offset, {
				adjustments: void 0,
				behavior
			});
			this.scheduleScrollReconcile();
		};
		this.getTotalSize = () => {
			var _a;
			const measurements = this.getMeasurements();
			let end;
			if (measurements.length === 0) end = this.options.paddingStart;
			else if (this.options.lanes === 1) end = ((_a = measurements[measurements.length - 1]) == null ? void 0 : _a.end) ?? 0;
			else {
				const endByLane = Array(this.options.lanes).fill(null);
				let endIndex = measurements.length - 1;
				while (endIndex >= 0 && endByLane.some((val) => val === null)) {
					const item = measurements[endIndex];
					if (endByLane[item.lane] === null) endByLane[item.lane] = item.end;
					endIndex--;
				}
				end = Math.max(...endByLane.filter((val) => val !== null));
			}
			return Math.max(end - this.options.scrollMargin + this.options.paddingEnd, 0);
		};
		this._scrollToOffset = (offset, { adjustments, behavior }) => {
			this.options.scrollToFn(offset, {
				behavior,
				adjustments
			}, this);
		};
		this.measure = () => {
			this.itemSizeCache = /* @__PURE__ */ new Map();
			this.laneAssignments = /* @__PURE__ */ new Map();
			this.notify(false);
		};
		this.setOptions(opts);
	}
	scheduleScrollReconcile() {
		if (!this.targetWindow) {
			this.scrollState = null;
			return;
		}
		if (this.rafId != null) return;
		this.rafId = this.targetWindow.requestAnimationFrame(() => {
			this.rafId = null;
			this.reconcileScroll();
		});
	}
	reconcileScroll() {
		if (!this.scrollState) return;
		if (!this.scrollElement) return;
		if (this.now() - this.scrollState.startedAt > 5e3) {
			this.scrollState = null;
			return;
		}
		const offsetInfo = this.scrollState.index != null ? this.getOffsetForIndex(this.scrollState.index, this.scrollState.align) : void 0;
		const targetOffset = offsetInfo ? offsetInfo[0] : this.scrollState.lastTargetOffset;
		const STABLE_FRAMES = 1;
		const targetChanged = targetOffset !== this.scrollState.lastTargetOffset;
		if (!targetChanged && approxEqual(targetOffset, this.getScrollOffset())) {
			this.scrollState.stableFrames++;
			if (this.scrollState.stableFrames >= STABLE_FRAMES) {
				this.scrollState = null;
				return;
			}
		} else {
			this.scrollState.stableFrames = 0;
			if (targetChanged) {
				this.scrollState.lastTargetOffset = targetOffset;
				this.scrollState.behavior = "auto";
				this._scrollToOffset(targetOffset, {
					adjustments: void 0,
					behavior: "auto"
				});
			}
		}
		this.scheduleScrollReconcile();
	}
};
const findNearestBinarySearch = (low, high, getCurrentValue, value) => {
	while (low <= high) {
		const middle = (low + high) / 2 | 0;
		const currentValue = getCurrentValue(middle);
		if (currentValue < value) low = middle + 1;
		else if (currentValue > value) high = middle - 1;
		else return middle;
	}
	if (low > 0) return low - 1;
	else return 0;
};
function calculateRange({ measurements, outerSize, scrollOffset, lanes }) {
	const lastIndex = measurements.length - 1;
	const getOffset = (index) => measurements[index].start;
	if (measurements.length <= lanes) return {
		startIndex: 0,
		endIndex: lastIndex
	};
	let startIndex = findNearestBinarySearch(0, lastIndex, getOffset, scrollOffset);
	let endIndex = startIndex;
	if (lanes === 1) while (endIndex < lastIndex && measurements[endIndex].end < scrollOffset + outerSize) endIndex++;
	else if (lanes > 1) {
		const endPerLane = Array(lanes).fill(0);
		while (endIndex < lastIndex && endPerLane.some((pos) => pos < scrollOffset + outerSize)) {
			const item = measurements[endIndex];
			endPerLane[item.lane] = item.end;
			endIndex++;
		}
		const startPerLane = Array(lanes).fill(scrollOffset + outerSize);
		while (startIndex >= 0 && startPerLane.some((pos) => pos >= scrollOffset)) {
			const item = measurements[startIndex];
			startPerLane[item.lane] = item.start;
			startIndex--;
		}
		startIndex = Math.max(0, startIndex - startIndex % lanes);
		endIndex = Math.min(lastIndex, endIndex + (lanes - 1 - endIndex % lanes));
	}
	return {
		startIndex,
		endIndex
	};
}
//#endregion
//#region ../../node_modules/.pnpm/@tanstack+react-virtual@3.13.24_react-dom@19.2.3_react@19.2.3__react@19.2.3/node_modules/@tanstack/react-virtual/dist/esm/index.js
const useIsomorphicLayoutEffect = typeof document !== "undefined" ? react$1.useLayoutEffect : react$1.useEffect;
function useVirtualizerBase({ useFlushSync = true, ...options }) {
	const rerender = react$1.useReducer(() => ({}), {})[1];
	const resolvedOptions = {
		...options,
		onChange: (instance2, sync) => {
			var _a;
			if (useFlushSync && sync) (0, react_dom.flushSync)(rerender);
			else rerender();
			(_a = options.onChange) == null || _a.call(options, instance2, sync);
		}
	};
	const [instance] = react$1.useState(() => new Virtualizer(resolvedOptions));
	instance.setOptions(resolvedOptions);
	useIsomorphicLayoutEffect(() => {
		return instance._didMount();
	}, []);
	useIsomorphicLayoutEffect(() => {
		return instance._willUpdate();
	});
	return instance;
}
function useVirtualizer(options) {
	return useVirtualizerBase({
		observeElementRect,
		observeElementOffset,
		scrollToFn: elementScroll,
		...options
	});
}
//#endregion
//#region src/components/composites/select-dropdown/index.tsx
function getWheelDeltaY(event, el) {
	if (event.deltaMode === 1) return event.deltaY * 16;
	if (event.deltaMode === 2) return event.deltaY * el.clientHeight;
	return event.deltaY;
}
function useModalPopoverWheel(ref) {
	(0, react.useEffect)(() => {
		const el = ref.current;
		if (!el) return;
		const handleWheel = (e) => {
			if (el.scrollHeight <= el.clientHeight) return;
			e.preventDefault();
			e.stopPropagation();
			el.scrollTop += getWheelDeltaY(e, el);
		};
		el.addEventListener("wheel", handleWheel, { passive: false });
		return () => el.removeEventListener("wheel", handleWheel);
	}, [ref]);
}
function ScrollContainer({ children, className, maxHeight }) {
	const scrollerRef = (0, react.useRef)(null);
	useModalPopoverWheel(scrollerRef);
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ScrollArea, {
		type: "auto",
		style: { maxHeight },
		viewportProps: { ref: scrollerRef },
		contentProps: { className },
		children
	});
}
function VirtualRows({ items, itemHeight, maxHeight, overscan, renderRow }) {
	const scrollerRef = (0, react.useRef)(null);
	useModalPopoverWheel(scrollerRef);
	const virtualizer = useVirtualizer({
		count: items.length,
		getScrollElement: () => scrollerRef.current,
		estimateSize: () => itemHeight,
		overscan
	});
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ScrollArea, {
		type: "auto",
		style: { maxHeight },
		viewportProps: { ref: scrollerRef },
		children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
			className: "relative w-full",
			style: { height: virtualizer.getTotalSize() },
			children: virtualizer.getVirtualItems().map((vItem) => {
				const item = items[vItem.index];
				return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: "absolute top-0 left-0 w-full",
					style: {
						height: vItem.size,
						transform: `translateY(${vItem.start}px)`
					},
					children: renderRow(item)
				}, item.id);
			})
		})
	});
}
function SelectDropdown({ items, selectedId, onSelect, renderSelected, renderItem, renderTriggerLeading, onRemove, removeLabel, placeholder, emptyText, maxHeight = 240, virtualize = false, itemHeight = 36, overscan = 12, triggerClassName }) {
	const [open, setOpen] = (0, react.useState)(false);
	const selected = items.find((i) => i.id === selectedId);
	const renderRow = (item) => {
		const isSelected = selectedId === item.id;
		if (onRemove) return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
			className: require_avatar.cn("flex items-center gap-1 rounded-md pr-1 transition-colors", isSelected && "bg-primary/10 text-primary"),
			children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
				type: "button",
				onClick: () => {
					onSelect(item.id);
					setOpen(false);
				},
				className: "flex min-w-0 flex-1 items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-muted",
				children: renderItem(item, isSelected)
			}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
				type: "button",
				"aria-label": removeLabel,
				onClick: () => onRemove(item.id),
				className: "shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(lucide_react.X, { size: 10 })
			})]
		});
		return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
			type: "button",
			onClick: () => {
				onSelect(item.id);
				setOpen(false);
			},
			className: require_avatar.cn("w-full rounded-md px-2.5 py-1.5 text-left text-sm transition-colors", isSelected ? "bg-primary/10 text-primary" : "text-foreground hover:bg-muted"),
			children: renderItem(item, isSelected)
		});
	};
	return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(Popover, {
		open,
		onOpenChange: setOpen,
		children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(PopoverTrigger, {
			asChild: true,
			children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
				type: "button",
				className: require_avatar.cn("flex h-9 w-full items-center justify-between rounded-md border bg-transparent px-3 text-sm transition-colors hover:bg-muted/30", open ? "border-primary/40 ring-1 ring-primary/15" : "border-border-subtle", triggerClassName),
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: "flex min-w-0 flex-1 items-center gap-2 text-left",
					children: [renderTriggerLeading, selected ? renderSelected(selected) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: "truncate text-muted-foreground/50",
						children: placeholder || "..."
					})]
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(lucide_react.ChevronDown, {
					size: 12,
					className: require_avatar.cn("ml-2 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")
				})]
			})
		}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(PopoverContent, {
			align: "start",
			sideOffset: 4,
			style: { width: "var(--radix-popover-trigger-width)" },
			className: "rounded-md border border-border-subtle bg-popover p-1 shadow-lg",
			children: items.length === 0 && emptyText ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: "px-2.5 py-3 text-sm text-muted-foreground/45",
				children: emptyText
			}) : virtualize ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(VirtualRows, {
				items,
				itemHeight,
				maxHeight,
				overscan,
				renderRow
			}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ScrollContainer, {
				className: require_avatar.cn(onRemove && "space-y-1"),
				maxHeight,
				children: items.map((item) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", { children: renderRow(item) }, item.id))
			})
		})]
	});
}
//#endregion
//#region src/components/composites/code-editor/lazy-code-editor.tsx
const CodeEditorImpl = (0, react.lazy)(() => Promise.resolve().then(() => require("./code-editor-CbcRME28.cjs")));
const SharedSyntaxEditorImpl = (0, react.lazy)(() => Promise.resolve().then(() => require("./code-editor-CbcRME28.cjs")).then((module) => ({ default: module.SharedSyntaxEditor })));
function LazyCodeEditor({ value, fallback, ...props }) {
	const { expanded = true, height, minHeight, maxHeight, className, style, wrapped = true, fontSize = 16 } = props;
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(react.Suspense, {
		fallback: fallback ?? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("pre", {
			className: `code-editor ${className ?? ""}`,
			"aria-busy": "true",
			style: {
				margin: 0,
				overflow: "auto",
				whiteSpace: wrapped ? "pre-wrap" : "pre",
				fontSize,
				minHeight,
				...expanded ? void 0 : {
					height,
					maxHeight
				},
				...style
			},
			children: value
		}),
		children: props.syntaxHighlightStyle ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(SharedSyntaxEditorImpl, {
			value,
			...props
		}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(CodeEditorImpl, {
			value,
			...props
		})
	});
}
//#endregion
//#region ../../node_modules/.pnpm/fast-diff@1.3.0/node_modules/fast-diff/diff.js
var require_diff = /* @__PURE__ */ require_avatar.__commonJSMin(((exports, module) => {
	/**
	* This library modifies the diff-patch-match library by Neil Fraser
	* by removing the patch and match functionality and certain advanced
	* options in the diff function. The original license is as follows:
	*
	* ===
	*
	* Diff Match and Patch
	*
	* Copyright 2006 Google Inc.
	* http://code.google.com/p/google-diff-match-patch/
	*
	* Licensed under the Apache License, Version 2.0 (the "License");
	* you may not use this file except in compliance with the License.
	* You may obtain a copy of the License at
	*
	*   http://www.apache.org/licenses/LICENSE-2.0
	*
	* Unless required by applicable law or agreed to in writing, software
	* distributed under the License is distributed on an "AS IS" BASIS,
	* WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
	* See the License for the specific language governing permissions and
	* limitations under the License.
	*/
	/**
	* The data structure representing a diff is an array of tuples:
	* [[DIFF_DELETE, 'Hello'], [DIFF_INSERT, 'Goodbye'], [DIFF_EQUAL, ' world.']]
	* which means: delete 'Hello', add 'Goodbye' and keep ' world.'
	*/
	var DIFF_DELETE = -1;
	var DIFF_INSERT = 1;
	var DIFF_EQUAL = 0;
	/**
	* Find the differences between two texts.  Simplifies the problem by stripping
	* any common prefix or suffix off the texts before diffing.
	* @param {string} text1 Old string to be diffed.
	* @param {string} text2 New string to be diffed.
	* @param {Int|Object} [cursor_pos] Edit position in text1 or object with more info
	* @param {boolean} [cleanup] Apply semantic cleanup before returning.
	* @return {Array} Array of diff tuples.
	*/
	function diff_main(text1, text2, cursor_pos, cleanup, _fix_unicode) {
		if (text1 === text2) {
			if (text1) return [[DIFF_EQUAL, text1]];
			return [];
		}
		if (cursor_pos != null) {
			var editdiff = find_cursor_edit_diff(text1, text2, cursor_pos);
			if (editdiff) return editdiff;
		}
		var commonlength = diff_commonPrefix(text1, text2);
		var commonprefix = text1.substring(0, commonlength);
		text1 = text1.substring(commonlength);
		text2 = text2.substring(commonlength);
		commonlength = diff_commonSuffix(text1, text2);
		var commonsuffix = text1.substring(text1.length - commonlength);
		text1 = text1.substring(0, text1.length - commonlength);
		text2 = text2.substring(0, text2.length - commonlength);
		var diffs = diff_compute_(text1, text2);
		if (commonprefix) diffs.unshift([DIFF_EQUAL, commonprefix]);
		if (commonsuffix) diffs.push([DIFF_EQUAL, commonsuffix]);
		diff_cleanupMerge(diffs, _fix_unicode);
		if (cleanup) diff_cleanupSemantic(diffs);
		return diffs;
	}
	/**
	* Find the differences between two texts.  Assumes that the texts do not
	* have any common prefix or suffix.
	* @param {string} text1 Old string to be diffed.
	* @param {string} text2 New string to be diffed.
	* @return {Array} Array of diff tuples.
	*/
	function diff_compute_(text1, text2) {
		var diffs;
		if (!text1) return [[DIFF_INSERT, text2]];
		if (!text2) return [[DIFF_DELETE, text1]];
		var longtext = text1.length > text2.length ? text1 : text2;
		var shorttext = text1.length > text2.length ? text2 : text1;
		var i = longtext.indexOf(shorttext);
		if (i !== -1) {
			diffs = [
				[DIFF_INSERT, longtext.substring(0, i)],
				[DIFF_EQUAL, shorttext],
				[DIFF_INSERT, longtext.substring(i + shorttext.length)]
			];
			if (text1.length > text2.length) diffs[0][0] = diffs[2][0] = DIFF_DELETE;
			return diffs;
		}
		if (shorttext.length === 1) return [[DIFF_DELETE, text1], [DIFF_INSERT, text2]];
		var hm = diff_halfMatch_(text1, text2);
		if (hm) {
			var text1_a = hm[0];
			var text1_b = hm[1];
			var text2_a = hm[2];
			var text2_b = hm[3];
			var mid_common = hm[4];
			var diffs_a = diff_main(text1_a, text2_a);
			var diffs_b = diff_main(text1_b, text2_b);
			return diffs_a.concat([[DIFF_EQUAL, mid_common]], diffs_b);
		}
		return diff_bisect_(text1, text2);
	}
	/**
	* Find the 'middle snake' of a diff, split the problem in two
	* and return the recursively constructed diff.
	* See Myers 1986 paper: An O(ND) Difference Algorithm and Its Variations.
	* @param {string} text1 Old string to be diffed.
	* @param {string} text2 New string to be diffed.
	* @return {Array} Array of diff tuples.
	* @private
	*/
	function diff_bisect_(text1, text2) {
		var text1_length = text1.length;
		var text2_length = text2.length;
		var max_d = Math.ceil((text1_length + text2_length) / 2);
		var v_offset = max_d;
		var v_length = 2 * max_d;
		var v1 = new Array(v_length);
		var v2 = new Array(v_length);
		for (var x = 0; x < v_length; x++) {
			v1[x] = -1;
			v2[x] = -1;
		}
		v1[v_offset + 1] = 0;
		v2[v_offset + 1] = 0;
		var delta = text1_length - text2_length;
		var front = delta % 2 !== 0;
		var k1start = 0;
		var k1end = 0;
		var k2start = 0;
		var k2end = 0;
		for (var d = 0; d < max_d; d++) {
			for (var k1 = -d + k1start; k1 <= d - k1end; k1 += 2) {
				var k1_offset = v_offset + k1;
				var x1;
				if (k1 === -d || k1 !== d && v1[k1_offset - 1] < v1[k1_offset + 1]) x1 = v1[k1_offset + 1];
				else x1 = v1[k1_offset - 1] + 1;
				var y1 = x1 - k1;
				while (x1 < text1_length && y1 < text2_length && text1.charAt(x1) === text2.charAt(y1)) {
					x1++;
					y1++;
				}
				v1[k1_offset] = x1;
				if (x1 > text1_length) k1end += 2;
				else if (y1 > text2_length) k1start += 2;
				else if (front) {
					var k2_offset = v_offset + delta - k1;
					if (k2_offset >= 0 && k2_offset < v_length && v2[k2_offset] !== -1) {
						var x2 = text1_length - v2[k2_offset];
						if (x1 >= x2) return diff_bisectSplit_(text1, text2, x1, y1);
					}
				}
			}
			for (var k2 = -d + k2start; k2 <= d - k2end; k2 += 2) {
				var k2_offset = v_offset + k2;
				var x2;
				if (k2 === -d || k2 !== d && v2[k2_offset - 1] < v2[k2_offset + 1]) x2 = v2[k2_offset + 1];
				else x2 = v2[k2_offset - 1] + 1;
				var y2 = x2 - k2;
				while (x2 < text1_length && y2 < text2_length && text1.charAt(text1_length - x2 - 1) === text2.charAt(text2_length - y2 - 1)) {
					x2++;
					y2++;
				}
				v2[k2_offset] = x2;
				if (x2 > text1_length) k2end += 2;
				else if (y2 > text2_length) k2start += 2;
				else if (!front) {
					var k1_offset = v_offset + delta - k2;
					if (k1_offset >= 0 && k1_offset < v_length && v1[k1_offset] !== -1) {
						var x1 = v1[k1_offset];
						var y1 = v_offset + x1 - k1_offset;
						x2 = text1_length - x2;
						if (x1 >= x2) return diff_bisectSplit_(text1, text2, x1, y1);
					}
				}
			}
		}
		return [[DIFF_DELETE, text1], [DIFF_INSERT, text2]];
	}
	/**
	* Given the location of the 'middle snake', split the diff in two parts
	* and recurse.
	* @param {string} text1 Old string to be diffed.
	* @param {string} text2 New string to be diffed.
	* @param {number} x Index of split point in text1.
	* @param {number} y Index of split point in text2.
	* @return {Array} Array of diff tuples.
	*/
	function diff_bisectSplit_(text1, text2, x, y) {
		var text1a = text1.substring(0, x);
		var text2a = text2.substring(0, y);
		var text1b = text1.substring(x);
		var text2b = text2.substring(y);
		var diffs = diff_main(text1a, text2a);
		var diffsb = diff_main(text1b, text2b);
		return diffs.concat(diffsb);
	}
	/**
	* Determine the common prefix of two strings.
	* @param {string} text1 First string.
	* @param {string} text2 Second string.
	* @return {number} The number of characters common to the start of each
	*     string.
	*/
	function diff_commonPrefix(text1, text2) {
		if (!text1 || !text2 || text1.charAt(0) !== text2.charAt(0)) return 0;
		var pointermin = 0;
		var pointermax = Math.min(text1.length, text2.length);
		var pointermid = pointermax;
		var pointerstart = 0;
		while (pointermin < pointermid) {
			if (text1.substring(pointerstart, pointermid) == text2.substring(pointerstart, pointermid)) {
				pointermin = pointermid;
				pointerstart = pointermin;
			} else pointermax = pointermid;
			pointermid = Math.floor((pointermax - pointermin) / 2 + pointermin);
		}
		if (is_surrogate_pair_start(text1.charCodeAt(pointermid - 1))) pointermid--;
		return pointermid;
	}
	/**
	* Determine if the suffix of one string is the prefix of another.
	* @param {string} text1 First string.
	* @param {string} text2 Second string.
	* @return {number} The number of characters common to the end of the first
	*     string and the start of the second string.
	* @private
	*/
	function diff_commonOverlap_(text1, text2) {
		var text1_length = text1.length;
		var text2_length = text2.length;
		if (text1_length == 0 || text2_length == 0) return 0;
		if (text1_length > text2_length) text1 = text1.substring(text1_length - text2_length);
		else if (text1_length < text2_length) text2 = text2.substring(0, text1_length);
		var text_length = Math.min(text1_length, text2_length);
		if (text1 == text2) return text_length;
		var best = 0;
		var length = 1;
		while (true) {
			var pattern = text1.substring(text_length - length);
			var found = text2.indexOf(pattern);
			if (found == -1) return best;
			length += found;
			if (found == 0 || text1.substring(text_length - length) == text2.substring(0, length)) {
				best = length;
				length++;
			}
		}
	}
	/**
	* Determine the common suffix of two strings.
	* @param {string} text1 First string.
	* @param {string} text2 Second string.
	* @return {number} The number of characters common to the end of each string.
	*/
	function diff_commonSuffix(text1, text2) {
		if (!text1 || !text2 || text1.slice(-1) !== text2.slice(-1)) return 0;
		var pointermin = 0;
		var pointermax = Math.min(text1.length, text2.length);
		var pointermid = pointermax;
		var pointerend = 0;
		while (pointermin < pointermid) {
			if (text1.substring(text1.length - pointermid, text1.length - pointerend) == text2.substring(text2.length - pointermid, text2.length - pointerend)) {
				pointermin = pointermid;
				pointerend = pointermin;
			} else pointermax = pointermid;
			pointermid = Math.floor((pointermax - pointermin) / 2 + pointermin);
		}
		if (is_surrogate_pair_end(text1.charCodeAt(text1.length - pointermid))) pointermid--;
		return pointermid;
	}
	/**
	* Do the two texts share a substring which is at least half the length of the
	* longer text?
	* This speedup can produce non-minimal diffs.
	* @param {string} text1 First string.
	* @param {string} text2 Second string.
	* @return {Array.<string>} Five element Array, containing the prefix of
	*     text1, the suffix of text1, the prefix of text2, the suffix of
	*     text2 and the common middle.  Or null if there was no match.
	*/
	function diff_halfMatch_(text1, text2) {
		var longtext = text1.length > text2.length ? text1 : text2;
		var shorttext = text1.length > text2.length ? text2 : text1;
		if (longtext.length < 4 || shorttext.length * 2 < longtext.length) return null;
		/**
		* Does a substring of shorttext exist within longtext such that the substring
		* is at least half the length of longtext?
		* Closure, but does not reference any external variables.
		* @param {string} longtext Longer string.
		* @param {string} shorttext Shorter string.
		* @param {number} i Start index of quarter length substring within longtext.
		* @return {Array.<string>} Five element Array, containing the prefix of
		*     longtext, the suffix of longtext, the prefix of shorttext, the suffix
		*     of shorttext and the common middle.  Or null if there was no match.
		* @private
		*/
		function diff_halfMatchI_(longtext, shorttext, i) {
			var seed = longtext.substring(i, i + Math.floor(longtext.length / 4));
			var j = -1;
			var best_common = "";
			var best_longtext_a, best_longtext_b, best_shorttext_a, best_shorttext_b;
			while ((j = shorttext.indexOf(seed, j + 1)) !== -1) {
				var prefixLength = diff_commonPrefix(longtext.substring(i), shorttext.substring(j));
				var suffixLength = diff_commonSuffix(longtext.substring(0, i), shorttext.substring(0, j));
				if (best_common.length < suffixLength + prefixLength) {
					best_common = shorttext.substring(j - suffixLength, j) + shorttext.substring(j, j + prefixLength);
					best_longtext_a = longtext.substring(0, i - suffixLength);
					best_longtext_b = longtext.substring(i + prefixLength);
					best_shorttext_a = shorttext.substring(0, j - suffixLength);
					best_shorttext_b = shorttext.substring(j + prefixLength);
				}
			}
			if (best_common.length * 2 >= longtext.length) return [
				best_longtext_a,
				best_longtext_b,
				best_shorttext_a,
				best_shorttext_b,
				best_common
			];
			else return null;
		}
		var hm1 = diff_halfMatchI_(longtext, shorttext, Math.ceil(longtext.length / 4));
		var hm2 = diff_halfMatchI_(longtext, shorttext, Math.ceil(longtext.length / 2));
		var hm;
		if (!hm1 && !hm2) return null;
		else if (!hm2) hm = hm1;
		else if (!hm1) hm = hm2;
		else hm = hm1[4].length > hm2[4].length ? hm1 : hm2;
		var text1_a, text1_b, text2_a, text2_b;
		if (text1.length > text2.length) {
			text1_a = hm[0];
			text1_b = hm[1];
			text2_a = hm[2];
			text2_b = hm[3];
		} else {
			text2_a = hm[0];
			text2_b = hm[1];
			text1_a = hm[2];
			text1_b = hm[3];
		}
		var mid_common = hm[4];
		return [
			text1_a,
			text1_b,
			text2_a,
			text2_b,
			mid_common
		];
	}
	/**
	* Reduce the number of edits by eliminating semantically trivial equalities.
	* @param {!Array.<!diff_match_patch.Diff>} diffs Array of diff tuples.
	*/
	function diff_cleanupSemantic(diffs) {
		var changes = false;
		var equalities = [];
		var equalitiesLength = 0;
		/** @type {?string} */
		var lastequality = null;
		var pointer = 0;
		var length_insertions1 = 0;
		var length_deletions1 = 0;
		var length_insertions2 = 0;
		var length_deletions2 = 0;
		while (pointer < diffs.length) {
			if (diffs[pointer][0] == DIFF_EQUAL) {
				equalities[equalitiesLength++] = pointer;
				length_insertions1 = length_insertions2;
				length_deletions1 = length_deletions2;
				length_insertions2 = 0;
				length_deletions2 = 0;
				lastequality = diffs[pointer][1];
			} else {
				if (diffs[pointer][0] == DIFF_INSERT) length_insertions2 += diffs[pointer][1].length;
				else length_deletions2 += diffs[pointer][1].length;
				if (lastequality && lastequality.length <= Math.max(length_insertions1, length_deletions1) && lastequality.length <= Math.max(length_insertions2, length_deletions2)) {
					diffs.splice(equalities[equalitiesLength - 1], 0, [DIFF_DELETE, lastequality]);
					diffs[equalities[equalitiesLength - 1] + 1][0] = DIFF_INSERT;
					equalitiesLength--;
					equalitiesLength--;
					pointer = equalitiesLength > 0 ? equalities[equalitiesLength - 1] : -1;
					length_insertions1 = 0;
					length_deletions1 = 0;
					length_insertions2 = 0;
					length_deletions2 = 0;
					lastequality = null;
					changes = true;
				}
			}
			pointer++;
		}
		if (changes) diff_cleanupMerge(diffs);
		diff_cleanupSemanticLossless(diffs);
		pointer = 1;
		while (pointer < diffs.length) {
			if (diffs[pointer - 1][0] == DIFF_DELETE && diffs[pointer][0] == DIFF_INSERT) {
				var deletion = diffs[pointer - 1][1];
				var insertion = diffs[pointer][1];
				var overlap_length1 = diff_commonOverlap_(deletion, insertion);
				var overlap_length2 = diff_commonOverlap_(insertion, deletion);
				if (overlap_length1 >= overlap_length2) {
					if (overlap_length1 >= deletion.length / 2 || overlap_length1 >= insertion.length / 2) {
						diffs.splice(pointer, 0, [DIFF_EQUAL, insertion.substring(0, overlap_length1)]);
						diffs[pointer - 1][1] = deletion.substring(0, deletion.length - overlap_length1);
						diffs[pointer + 1][1] = insertion.substring(overlap_length1);
						pointer++;
					}
				} else if (overlap_length2 >= deletion.length / 2 || overlap_length2 >= insertion.length / 2) {
					diffs.splice(pointer, 0, [DIFF_EQUAL, deletion.substring(0, overlap_length2)]);
					diffs[pointer - 1][0] = DIFF_INSERT;
					diffs[pointer - 1][1] = insertion.substring(0, insertion.length - overlap_length2);
					diffs[pointer + 1][0] = DIFF_DELETE;
					diffs[pointer + 1][1] = deletion.substring(overlap_length2);
					pointer++;
				}
				pointer++;
			}
			pointer++;
		}
	}
	var nonAlphaNumericRegex_ = /[^a-zA-Z0-9]/;
	var whitespaceRegex_ = /\s/;
	var linebreakRegex_ = /[\r\n]/;
	var blanklineEndRegex_ = /\n\r?\n$/;
	var blanklineStartRegex_ = /^\r?\n\r?\n/;
	/**
	* Look for single edits surrounded on both sides by equalities
	* which can be shifted sideways to align the edit to a word boundary.
	* e.g: The c<ins>at c</ins>ame. -> The <ins>cat </ins>came.
	* @param {!Array.<!diff_match_patch.Diff>} diffs Array of diff tuples.
	*/
	function diff_cleanupSemanticLossless(diffs) {
		/**
		* Given two strings, compute a score representing whether the internal
		* boundary falls on logical boundaries.
		* Scores range from 6 (best) to 0 (worst).
		* Closure, but does not reference any external variables.
		* @param {string} one First string.
		* @param {string} two Second string.
		* @return {number} The score.
		* @private
		*/
		function diff_cleanupSemanticScore_(one, two) {
			if (!one || !two) return 6;
			var char1 = one.charAt(one.length - 1);
			var char2 = two.charAt(0);
			var nonAlphaNumeric1 = char1.match(nonAlphaNumericRegex_);
			var nonAlphaNumeric2 = char2.match(nonAlphaNumericRegex_);
			var whitespace1 = nonAlphaNumeric1 && char1.match(whitespaceRegex_);
			var whitespace2 = nonAlphaNumeric2 && char2.match(whitespaceRegex_);
			var lineBreak1 = whitespace1 && char1.match(linebreakRegex_);
			var lineBreak2 = whitespace2 && char2.match(linebreakRegex_);
			var blankLine1 = lineBreak1 && one.match(blanklineEndRegex_);
			var blankLine2 = lineBreak2 && two.match(blanklineStartRegex_);
			if (blankLine1 || blankLine2) return 5;
			else if (lineBreak1 || lineBreak2) return 4;
			else if (nonAlphaNumeric1 && !whitespace1 && whitespace2) return 3;
			else if (whitespace1 || whitespace2) return 2;
			else if (nonAlphaNumeric1 || nonAlphaNumeric2) return 1;
			return 0;
		}
		var pointer = 1;
		while (pointer < diffs.length - 1) {
			if (diffs[pointer - 1][0] == DIFF_EQUAL && diffs[pointer + 1][0] == DIFF_EQUAL) {
				var equality1 = diffs[pointer - 1][1];
				var edit = diffs[pointer][1];
				var equality2 = diffs[pointer + 1][1];
				var commonOffset = diff_commonSuffix(equality1, edit);
				if (commonOffset) {
					var commonString = edit.substring(edit.length - commonOffset);
					equality1 = equality1.substring(0, equality1.length - commonOffset);
					edit = commonString + edit.substring(0, edit.length - commonOffset);
					equality2 = commonString + equality2;
				}
				var bestEquality1 = equality1;
				var bestEdit = edit;
				var bestEquality2 = equality2;
				var bestScore = diff_cleanupSemanticScore_(equality1, edit) + diff_cleanupSemanticScore_(edit, equality2);
				while (edit.charAt(0) === equality2.charAt(0)) {
					equality1 += edit.charAt(0);
					edit = edit.substring(1) + equality2.charAt(0);
					equality2 = equality2.substring(1);
					var score = diff_cleanupSemanticScore_(equality1, edit) + diff_cleanupSemanticScore_(edit, equality2);
					if (score >= bestScore) {
						bestScore = score;
						bestEquality1 = equality1;
						bestEdit = edit;
						bestEquality2 = equality2;
					}
				}
				if (diffs[pointer - 1][1] != bestEquality1) {
					if (bestEquality1) diffs[pointer - 1][1] = bestEquality1;
					else {
						diffs.splice(pointer - 1, 1);
						pointer--;
					}
					diffs[pointer][1] = bestEdit;
					if (bestEquality2) diffs[pointer + 1][1] = bestEquality2;
					else {
						diffs.splice(pointer + 1, 1);
						pointer--;
					}
				}
			}
			pointer++;
		}
	}
	/**
	* Reorder and merge like edit sections.  Merge equalities.
	* Any edit section can move as long as it doesn't cross an equality.
	* @param {Array} diffs Array of diff tuples.
	* @param {boolean} fix_unicode Whether to normalize to a unicode-correct diff
	*/
	function diff_cleanupMerge(diffs, fix_unicode) {
		diffs.push([DIFF_EQUAL, ""]);
		var pointer = 0;
		var count_delete = 0;
		var count_insert = 0;
		var text_delete = "";
		var text_insert = "";
		var commonlength;
		while (pointer < diffs.length) {
			if (pointer < diffs.length - 1 && !diffs[pointer][1]) {
				diffs.splice(pointer, 1);
				continue;
			}
			switch (diffs[pointer][0]) {
				case DIFF_INSERT:
					count_insert++;
					text_insert += diffs[pointer][1];
					pointer++;
					break;
				case DIFF_DELETE:
					count_delete++;
					text_delete += diffs[pointer][1];
					pointer++;
					break;
				case DIFF_EQUAL:
					var previous_equality = pointer - count_insert - count_delete - 1;
					if (fix_unicode) {
						if (previous_equality >= 0 && ends_with_pair_start(diffs[previous_equality][1])) {
							var stray = diffs[previous_equality][1].slice(-1);
							diffs[previous_equality][1] = diffs[previous_equality][1].slice(0, -1);
							text_delete = stray + text_delete;
							text_insert = stray + text_insert;
							if (!diffs[previous_equality][1]) {
								diffs.splice(previous_equality, 1);
								pointer--;
								var k = previous_equality - 1;
								if (diffs[k] && diffs[k][0] === DIFF_INSERT) {
									count_insert++;
									text_insert = diffs[k][1] + text_insert;
									k--;
								}
								if (diffs[k] && diffs[k][0] === DIFF_DELETE) {
									count_delete++;
									text_delete = diffs[k][1] + text_delete;
									k--;
								}
								previous_equality = k;
							}
						}
						if (starts_with_pair_end(diffs[pointer][1])) {
							var stray = diffs[pointer][1].charAt(0);
							diffs[pointer][1] = diffs[pointer][1].slice(1);
							text_delete += stray;
							text_insert += stray;
						}
					}
					if (pointer < diffs.length - 1 && !diffs[pointer][1]) {
						diffs.splice(pointer, 1);
						break;
					}
					if (text_delete.length > 0 || text_insert.length > 0) {
						if (text_delete.length > 0 && text_insert.length > 0) {
							commonlength = diff_commonPrefix(text_insert, text_delete);
							if (commonlength !== 0) {
								if (previous_equality >= 0) diffs[previous_equality][1] += text_insert.substring(0, commonlength);
								else {
									diffs.splice(0, 0, [DIFF_EQUAL, text_insert.substring(0, commonlength)]);
									pointer++;
								}
								text_insert = text_insert.substring(commonlength);
								text_delete = text_delete.substring(commonlength);
							}
							commonlength = diff_commonSuffix(text_insert, text_delete);
							if (commonlength !== 0) {
								diffs[pointer][1] = text_insert.substring(text_insert.length - commonlength) + diffs[pointer][1];
								text_insert = text_insert.substring(0, text_insert.length - commonlength);
								text_delete = text_delete.substring(0, text_delete.length - commonlength);
							}
						}
						var n = count_insert + count_delete;
						if (text_delete.length === 0 && text_insert.length === 0) {
							diffs.splice(pointer - n, n);
							pointer = pointer - n;
						} else if (text_delete.length === 0) {
							diffs.splice(pointer - n, n, [DIFF_INSERT, text_insert]);
							pointer = pointer - n + 1;
						} else if (text_insert.length === 0) {
							diffs.splice(pointer - n, n, [DIFF_DELETE, text_delete]);
							pointer = pointer - n + 1;
						} else {
							diffs.splice(pointer - n, n, [DIFF_DELETE, text_delete], [DIFF_INSERT, text_insert]);
							pointer = pointer - n + 2;
						}
					}
					if (pointer !== 0 && diffs[pointer - 1][0] === DIFF_EQUAL) {
						diffs[pointer - 1][1] += diffs[pointer][1];
						diffs.splice(pointer, 1);
					} else pointer++;
					count_insert = 0;
					count_delete = 0;
					text_delete = "";
					text_insert = "";
			}
		}
		if (diffs[diffs.length - 1][1] === "") diffs.pop();
		var changes = false;
		pointer = 1;
		while (pointer < diffs.length - 1) {
			if (diffs[pointer - 1][0] === DIFF_EQUAL && diffs[pointer + 1][0] === DIFF_EQUAL) {
				if (diffs[pointer][1].substring(diffs[pointer][1].length - diffs[pointer - 1][1].length) === diffs[pointer - 1][1]) {
					diffs[pointer][1] = diffs[pointer - 1][1] + diffs[pointer][1].substring(0, diffs[pointer][1].length - diffs[pointer - 1][1].length);
					diffs[pointer + 1][1] = diffs[pointer - 1][1] + diffs[pointer + 1][1];
					diffs.splice(pointer - 1, 1);
					changes = true;
				} else if (diffs[pointer][1].substring(0, diffs[pointer + 1][1].length) == diffs[pointer + 1][1]) {
					diffs[pointer - 1][1] += diffs[pointer + 1][1];
					diffs[pointer][1] = diffs[pointer][1].substring(diffs[pointer + 1][1].length) + diffs[pointer + 1][1];
					diffs.splice(pointer + 1, 1);
					changes = true;
				}
			}
			pointer++;
		}
		if (changes) diff_cleanupMerge(diffs, fix_unicode);
	}
	function is_surrogate_pair_start(charCode) {
		return charCode >= 55296 && charCode <= 56319;
	}
	function is_surrogate_pair_end(charCode) {
		return charCode >= 56320 && charCode <= 57343;
	}
	function starts_with_pair_end(str) {
		return is_surrogate_pair_end(str.charCodeAt(0));
	}
	function ends_with_pair_start(str) {
		return is_surrogate_pair_start(str.charCodeAt(str.length - 1));
	}
	function remove_empty_tuples(tuples) {
		var ret = [];
		for (var i = 0; i < tuples.length; i++) if (tuples[i][1].length > 0) ret.push(tuples[i]);
		return ret;
	}
	function make_edit_splice(before, oldMiddle, newMiddle, after) {
		if (ends_with_pair_start(before) || starts_with_pair_end(after)) return null;
		return remove_empty_tuples([
			[DIFF_EQUAL, before],
			[DIFF_DELETE, oldMiddle],
			[DIFF_INSERT, newMiddle],
			[DIFF_EQUAL, after]
		]);
	}
	function find_cursor_edit_diff(oldText, newText, cursor_pos) {
		var oldRange = typeof cursor_pos === "number" ? {
			index: cursor_pos,
			length: 0
		} : cursor_pos.oldRange;
		var newRange = typeof cursor_pos === "number" ? null : cursor_pos.newRange;
		var oldLength = oldText.length;
		var newLength = newText.length;
		if (oldRange.length === 0 && (newRange === null || newRange.length === 0)) {
			var oldCursor = oldRange.index;
			var oldBefore = oldText.slice(0, oldCursor);
			var oldAfter = oldText.slice(oldCursor);
			var maybeNewCursor = newRange ? newRange.index : null;
			editBefore: {
				var newCursor = oldCursor + newLength - oldLength;
				if (maybeNewCursor !== null && maybeNewCursor !== newCursor) break editBefore;
				if (newCursor < 0 || newCursor > newLength) break editBefore;
				var newBefore = newText.slice(0, newCursor);
				var newAfter = newText.slice(newCursor);
				if (newAfter !== oldAfter) break editBefore;
				var prefixLength = Math.min(oldCursor, newCursor);
				var oldPrefix = oldBefore.slice(0, prefixLength);
				var newPrefix = newBefore.slice(0, prefixLength);
				if (oldPrefix !== newPrefix) break editBefore;
				var oldMiddle = oldBefore.slice(prefixLength);
				var newMiddle = newBefore.slice(prefixLength);
				return make_edit_splice(oldPrefix, oldMiddle, newMiddle, oldAfter);
			}
			editAfter: {
				if (maybeNewCursor !== null && maybeNewCursor !== oldCursor) break editAfter;
				var cursor = oldCursor;
				var newBefore = newText.slice(0, cursor);
				var newAfter = newText.slice(cursor);
				if (newBefore !== oldBefore) break editAfter;
				var suffixLength = Math.min(oldLength - cursor, newLength - cursor);
				var oldSuffix = oldAfter.slice(oldAfter.length - suffixLength);
				var newSuffix = newAfter.slice(newAfter.length - suffixLength);
				if (oldSuffix !== newSuffix) break editAfter;
				var oldMiddle = oldAfter.slice(0, oldAfter.length - suffixLength);
				var newMiddle = newAfter.slice(0, newAfter.length - suffixLength);
				return make_edit_splice(oldBefore, oldMiddle, newMiddle, oldSuffix);
			}
		}
		if (oldRange.length > 0 && newRange && newRange.length === 0) replaceRange: {
			var oldPrefix = oldText.slice(0, oldRange.index);
			var oldSuffix = oldText.slice(oldRange.index + oldRange.length);
			var prefixLength = oldPrefix.length;
			var suffixLength = oldSuffix.length;
			if (newLength < prefixLength + suffixLength) break replaceRange;
			var newPrefix = newText.slice(0, prefixLength);
			var newSuffix = newText.slice(newLength - suffixLength);
			if (oldPrefix !== newPrefix || oldSuffix !== newSuffix) break replaceRange;
			var oldMiddle = oldText.slice(prefixLength, oldLength - suffixLength);
			var newMiddle = newText.slice(prefixLength, newLength - suffixLength);
			return make_edit_splice(oldPrefix, oldMiddle, newMiddle, oldSuffix);
		}
		return null;
	}
	function diff(text1, text2, cursor_pos, cleanup) {
		return diff_main(text1, text2, cursor_pos, cleanup, true);
	}
	diff.INSERT = DIFF_INSERT;
	diff.DELETE = DIFF_DELETE;
	diff.EQUAL = DIFF_EQUAL;
	module.exports = diff;
}));
//#endregion
//#region src/components/composites/code-editor/utils.ts
var import_diff = /* @__PURE__ */ require_avatar.__toESM(require_diff());
let cmThemesPromise;
function loadCmThemes() {
	cmThemesPromise ??= Promise.resolve().then(() => require("./esm-L534xtsF.cjs"));
	return cmThemesPromise;
}
/**
* Computes code changes using fast-diff and converts them to CodeMirror changes.
* Could handle all types of changes, though insertions are most common during streaming responses.
* @param oldCode The old code content
* @param newCode The new code content
* @returns An array of changes for EditorView.dispatch
*/
function prepareCodeChanges(oldCode, newCode) {
	const diffResult = (0, import_diff.default)(oldCode, newCode);
	const changes = [];
	let offset = 0;
	for (const [operation, text] of diffResult) if (operation === 1) changes.push({
		from: offset,
		to: offset,
		insert: text
	});
	else if (operation === -1) {
		changes.push({
			from: offset,
			to: offset + text.length,
			insert: ""
		});
		offset += text.length;
	} else offset += text.length;
	return changes;
}
/**
* Get the list of CodeMirror theme names
* - Include auto, light, dark
* - Include all themes in @uiw/codemirror-themes-all
*
* A more robust approach might be to hardcode the theme list
* @returns theme name list
*/
async function getCmThemeNames() {
	const cmThemes = await loadCmThemes();
	return [
		"auto",
		"light",
		"dark"
	].concat(Object.keys(cmThemes)).filter((item) => typeof cmThemes[item] !== "function").filter((item) => !/^(defaultSettings)/.test(item) && !/(Style)$/.test(item));
}
/**
* Get the CodeMirror theme object by theme name
* @param name theme name
* @returns theme object
*/
async function getCmThemeByName(name) {
	if (name === "light" || name === "dark" || name === "none") return name;
	const cmThemes = await loadCmThemes();
	const candidate = cmThemes[name];
	if (Object.prototype.hasOwnProperty.call(cmThemes, name) && typeof candidate !== "function" && !/^defaultSettings/i.test(name) && !/(Style)$/.test(name)) return candidate;
	return "light";
}
/** The Cherry default CodeMirror theme, loaded on demand like the other themes. */
async function getCherryCmTheme(dark) {
	const { createCherryCmTheme } = await Promise.resolve().then(() => require("./cherry-theme-Dg3WC5ex.cjs"));
	return createCherryCmTheme(dark);
}
//#endregion
//#region src/components/primitives/label.tsx
/**
* Decorative "required field" asterisk. Standalone-usable (e.g. next to a
* schema property name) and the single source of truth for the marker that
* `Label` renders when `required` is set.
*/
function RequiredMark({ className, ...props }) {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
		"aria-hidden": "true",
		className: require_avatar.cn("text-destructive", className),
		...props,
		children: "*"
	});
}
function Label({ className, required, children, ...props }) {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(_radix_ui_react_label.Root, {
		"data-slot": "label",
		className: require_avatar.cn("flex items-center gap-2 text-sm leading-none font-medium select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50", className),
		...props,
		children: [children, required && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(RequiredMark, {
			"aria-hidden": "true",
			className: "-ms-1"
		})]
	});
}
//#endregion
//#region src/components/composites/form/index.tsx
const Form = react_hook_form.FormProvider;
const FormFieldContext = react.createContext(null);
function FormField({ ...props }) {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(FormFieldContext, {
		value: { name: props.name },
		children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(react_hook_form.Controller, { ...props })
	});
}
const useFormField = () => {
	const fieldContext = react.use(FormFieldContext);
	const itemContext = react.use(FormItemContext);
	if (!fieldContext) throw new Error("useFormField should be used within <FormField>");
	if (!itemContext) throw new Error("useFormField should be used within <FormItem>");
	const { getFieldState } = (0, react_hook_form.useFormContext)();
	const formState = (0, react_hook_form.useFormState)({ name: fieldContext.name });
	const fieldState = getFieldState(fieldContext.name, formState);
	const { id } = itemContext;
	return {
		id,
		name: fieldContext.name,
		formItemId: `${id}-form-item`,
		formDescriptionId: `${id}-form-item-description`,
		formMessageId: `${id}-form-item-message`,
		...fieldState
	};
};
const FormItemContext = react.createContext(null);
function FormItem({ className, ...props }) {
	const id = react.useId();
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(FormItemContext, {
		value: { id },
		children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
			"data-slot": "form-item",
			className: require_avatar.cn("grid gap-2", className),
			...props
		})
	});
}
function FormLabel({ className, ...props }) {
	const { error, formItemId } = useFormField();
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Label, {
		"data-slot": "form-label",
		"data-error": !!error,
		className: require_avatar.cn("data-[error=true]:text-destructive", className),
		htmlFor: formItemId,
		...props
	});
}
function FormControl({ ...props }) {
	const { error, formItemId, formDescriptionId, formMessageId } = useFormField();
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_radix_ui_react_slot.Slot, {
		"data-slot": "form-control",
		id: formItemId,
		"aria-describedby": !error ? `${formDescriptionId}` : `${formDescriptionId} ${formMessageId}`,
		"aria-invalid": !!error,
		...props
	});
}
function FormDescription({ className, ...props }) {
	const { formDescriptionId } = useFormField();
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
		"data-slot": "form-description",
		id: formDescriptionId,
		className: require_avatar.cn("text-sm text-muted-foreground", className),
		...props
	});
}
function FormMessage({ className, ...props }) {
	const { error, formMessageId } = useFormField();
	const body = error ? String(error?.message ?? "") : props.children;
	if (!body) return null;
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
		"data-slot": "form-message",
		id: formMessageId,
		className: require_avatar.cn("text-sm text-destructive", className),
		...props,
		children: body
	});
}
//#endregion
//#region src/components/composites/icon-tooltips/icon-tooltip.tsx
/**
* A reusable tooltip component that wraps a Lucide icon.
* This is the base component for InfoTooltip, WarnTooltip, and HelpTooltip.
*/
const IconTooltip = ({ icon: Icon, iconProps, ariaLabel, defaultAriaLabel = "Icon", defaultColor, content, onClick, ...tooltipProps }) => {
	const accessibleLabel = ariaLabel ?? iconProps?.["aria-label"] ?? (typeof content === "string" ? content : defaultAriaLabel);
	const icon = /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Icon, {
		size: iconProps?.size ?? 14,
		color: iconProps?.color ?? defaultColor,
		...iconProps,
		"aria-hidden": "true",
		focusable: "false",
		tabIndex: -1
	});
	const triggerClassName = "inline-flex shrink-0 items-center justify-center rounded-sm border-0 bg-transparent p-0 outline-none focus-visible:bg-accent";
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Tooltip, {
		content,
		...tooltipProps,
		asChild: true,
		children: onClick ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
			type: "button",
			"aria-label": accessibleLabel,
			className: triggerClassName,
			onClick,
			children: icon
		}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
			role: "img",
			"aria-label": accessibleLabel,
			tabIndex: 0,
			className: triggerClassName,
			children: icon
		})
	});
};
//#endregion
//#region src/components/composites/icon-tooltips/help-tooltip.tsx
/**
* A tooltip with a help icon.
* Used for providing help or guidance.
*/
const HelpTooltip = (props) => {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(IconTooltip, {
		icon: lucide_react.HelpCircle,
		defaultAriaLabel: "Help",
		defaultColor: "var(--muted-foreground)",
		...props
	});
};
//#endregion
//#region src/components/composites/icon-tooltips/info-tooltip.tsx
/**
* A tooltip with an info icon.
* Used for providing additional information or context.
*/
const InfoTooltip = (props) => {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(IconTooltip, {
		icon: lucide_react.Info,
		defaultAriaLabel: "Information",
		defaultColor: "var(--muted-foreground)",
		...props
	});
};
//#endregion
//#region src/components/composites/icon-tooltips/warn-tooltip.tsx
/**
* A tooltip with a warning icon.
* Used for displaying warnings or cautions.
*/
const WarnTooltip = (props) => {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(IconTooltip, {
		icon: lucide_react.AlertTriangle,
		defaultAriaLabel: "Warning",
		defaultColor: "var(--warning)",
		...props
	});
};
//#endregion
//#region src/components/composites/image-tool-button/index.tsx
const ImageToolButton = ({ tooltip, icon, onPress }) => {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Tooltip, {
		content: tooltip,
		delay: 500,
		children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
			size: "icon",
			className: "rounded-full",
			onClick: onPress,
			"aria-label": tooltip,
			children: icon
		})
	});
};
var image_tool_button_default = (0, react.memo)(ImageToolButton);
//#endregion
//#region src/components/composites/markdown/context.ts
const MarkdownBlockContext = (0, react.createContext)(null);
function useMarkdownBlockContext() {
	return (0, react.use)(MarkdownBlockContext);
}
//#endregion
//#region src/components/composites/markdown/footnotes.tsx
function FootnoteSection({ children, node, ...props }) {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("section", {
		...props,
		children
	}, JSON.stringify(node));
}
function FootnoteLink({ children, node, ...props }) {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("a", {
		...props,
		className: "rounded-sm text-primary underline focus-visible:outline-2 focus-visible:outline-ring",
		onClick: (event) => {
			event.preventDefault();
			const href = event.currentTarget.getAttribute("href");
			if (!href) return;
			const target = event.currentTarget.ownerDocument.getElementById(decodeURIComponent(href.slice(1)));
			if (!target) return;
			target.scrollIntoView({ block: "nearest" });
			if (target.tagName !== "A") target.tabIndex = -1;
			target.focus({ preventScroll: true });
		},
		children
	});
}
//#endregion
//#region src/components/composites/markdown/plugins/code-highlight.ts
const executeLocal = require_code_block.createCodeBlockSnapshotExecutor();
const STREAMDOWN_LANGUAGES = Object.keys(require_code_highlight.CODE_LANGUAGES).filter((name) => ![
	"text",
	"c3",
	"cuda",
	"tsrx"
].includes(name));
function createCodeHighlightPlugin({ execute = executeLocal, themes = ["github-light", "github-dark"] } = {}) {
	return {
		name: "shiki",
		type: "code-highlighter",
		getSupportedLanguages: () => [...STREAMDOWN_LANGUAGES],
		getThemes: () => [{
			name: themes[0],
			settings: []
		}, {
			name: themes[1],
			settings: []
		}],
		supportsLanguage: require_code_highlight.supportsCodeLanguage,
		highlight({ code, language, themes: selected }, callback) {
			const names = selected.map((theme, index) => (typeof theme === "string" ? theme : theme.name) ?? themes[index]);
			execute({
				code,
				language,
				themes: [names[0], names[1]]
			}).then(callback, () => callback?.(require_code_highlight.plainTokens(code)));
			return null;
		}
	};
}
//#endregion
//#region src/components/composites/markdown/plugins/rehype-heading-ids.ts
function createSlugger() {
	const seen = /* @__PURE__ */ new Map();
	const normalize = (text) => {
		return (text || "section").toLowerCase().trim().replace(/[\u200B-\u200D\uFEFF]/g, "").replace(/["'`(){}[\]:;!?.,]/g, "").replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-").replace(/-{2,}/g, "-").replace(/^-|-$/g, "") || "section";
	};
	const slug = (text) => {
		const base = normalize(text);
		const count = seen.get(base) || 0;
		seen.set(base, count + 1);
		return count === 0 ? base : `${base}-${count}`;
	};
	return { slug };
}
function extractTextFromNode(node) {
	if (!node) return "";
	if (typeof node.value === "string") return node.value;
	if (node.children?.length) return node.children.map(extractTextFromNode).join("");
	return "";
}
function rehypeHeadingIds(options) {
	return (tree) => {
		const slugger = createSlugger();
		const prefix = options?.prefix ? `${options.prefix}--` : "";
		(0, unist_util_visit.visit)(tree, "element", (node) => {
			if (!node || typeof node.tagName !== "string") return;
			const tag = node.tagName.toLowerCase();
			if (!/^h[1-6]$/.test(tag)) return;
			const text = extractTextFromNode(node);
			const id = prefix + slugger.slug(text);
			node.properties = node.properties || {};
			if (!node.properties.id) node.properties.id = id;
		});
	};
}
//#endregion
//#region src/components/composites/markdown/plugins/rehype-prefix-svg-refs.ts
/**
* Rehype plugin: prefix SVG IDs and rewrite intra-SVG references.
*
* Moved verbatim from src/renderer/src/components/chat/messages/markdown/Markdown.tsx
* (lines 227-297). Pairs with the sanitize plugin's `clobberPrefix` so that
* an SVG's `id="foo"` becomes `id="user-content-foo"` (clobbered to avoid
* colliding with the host page), and all `url(#foo)` references inside the
* same SVG follow suit.
*/
const rewriteSvgReference = (value, idMap) => {
	let rewritten = value.replace(/url\(\s*(['"]?)#([^'")\s]+)\1\s*\)/g, (match, quote, id) => {
		const prefixedId = idMap.get(id);
		return prefixedId ? `url(${quote}#${prefixedId}${quote})` : match;
	});
	if (rewritten.startsWith("#")) {
		const id = rewritten.slice(1);
		const prefixedId = idMap.get(id);
		if (prefixedId) rewritten = `#${prefixedId}`;
	}
	return rewritten;
};
const rewriteSvgProperty = (value, idMap) => {
	if (typeof value === "string") return rewriteSvgReference(value, idMap);
	if (Array.isArray(value)) return value.map((item) => rewriteSvgProperty(item, idMap));
	return value;
};
const walkElement = (node, visitor) => {
	if (!node || typeof node !== "object") return;
	if (node.type === "element") visitor(node);
	if (Array.isArray(node.children)) for (const child of node.children) walkElement(child, visitor);
};
function rehypePrefixSvgReferences(clobberPrefix = "user-content-") {
	return (tree) => {
		if (!clobberPrefix) return;
		(0, unist_util_visit.visit)(tree, "element", (svgNode) => {
			if (svgNode.tagName !== "svg") return;
			const idMap = /* @__PURE__ */ new Map();
			walkElement(svgNode, (node) => {
				const id = node.properties?.id;
				if (typeof id === "string" && id.startsWith(clobberPrefix)) idMap.set(id.slice(clobberPrefix.length), id);
			});
			if (idMap.size === 0) return;
			walkElement(svgNode, (node) => {
				const properties = node.properties;
				if (!properties) return;
				for (const key of Object.keys(properties)) properties[key] = rewriteSvgProperty(properties[key], idMap);
			});
		});
	};
}
//#endregion
//#region src/components/composites/markdown/plugins/rehype-preserve-anchor-targets.ts
function rehypePreserveAnchorTargets() {
	return (tree) => {
		(0, unist_util_visit.visit)(tree, "element", (node) => {
			if (node.tagName === "a" && !node.properties?.href && typeof node.properties?.id === "string") node.tagName = "span";
		});
	};
}
//#endregion
//#region src/components/composites/markdown/plugins/rehype-scalable-svg.ts
const isNumeric = (value) => {
	if (typeof value === "string" && value.trim() !== "") return /^(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i.test(value.trim());
	return false;
};
const isNegativeNumeric = (value) => /^-\d/.test(value.trim());
const isSafeCssLength = (value) => /^(?:\d+\.?\d*|\.\d+)(?:px|pt|em|rem|%|vw|vh|cm|mm|in)?$/i.test(value.trim());
const isSafeSvgDimension = (value) => isNumeric(value) || isSafeCssLength(value);
const toCssMaxWidth = (width) => {
	if (isNegativeNumeric(width)) return null;
	if (isNumeric(width)) return `${width}px`;
	return isSafeCssLength(width) ? width : null;
};
/**
* A Rehype plugin that prepares SVG elements for scalable rendering.
*
* This plugin classifies SVGs into two categories:
*
* 1.  **Simple SVGs**: Those that already have a `viewBox` or have unitless
*     numeric `width` and `height` attributes. These are processed directly
*     in the HAST tree for maximum performance. A `viewBox` is added if
*     missing, and fixed dimensions are removed.
*
* 2.  **Complex SVGs**: Those without a `viewBox` and with dimensions that
*     have units (e.g., "100pt", "10em"). These cannot be safely processed
*     at the data layer. The plugin adds a `data-needs-measurement="true"`
*     attribute to them, flagging them for runtime processing by a
*     specialized React component.
*
* @returns A unified transformer function.
*/
function rehypeScalableSvg() {
	return (tree) => {
		(0, unist_util_visit.visit)(tree, "element", (node) => {
			if (node.tagName === "svg") {
				const properties = node.properties;
				const hasViewBox = "viewBox" in properties;
				const width = properties.width?.trim();
				const height = properties.height?.trim();
				if (width && !isSafeSvgDimension(width)) delete properties.width;
				if (height && !isSafeSvgDimension(height)) delete properties.height;
				if (width) {
					const cssMaxWidth = toCssMaxWidth(width);
					if (cssMaxWidth) {
						const existingStyle = properties.style ? String(properties.style).trim().replace(/;$/, "") : "";
						const maxWidth = `max-width: ${cssMaxWidth}`;
						properties.style = existingStyle ? `${existingStyle}; ${maxWidth}` : maxWidth;
					}
				}
				if (!hasViewBox && isNumeric(width) && isNumeric(height)) {
					properties.viewBox = `0 0 ${width} ${height}`;
					properties.width = "100%";
					delete properties.height;
				} else if (!hasViewBox && width && height) properties["data-needs-measurement"] = "true";
				node.properties = properties;
			}
		});
	};
}
//#endregion
//#region src/components/composites/markdown/plugins/rehype-streaming-math.ts
function closedBoundaries(source) {
	const boundaries = [0];
	let groups = 0;
	let delimiters = 0;
	let awaitingDelimiter = false;
	const environments = [];
	for (const match of source.matchAll(/\\(?:begin|end)\s*\{([^{}]*)\}|\\[a-zA-Z]+|\\[\s\S]|%[^\n]*(?:\n|$)|[\s\S]/gu)) {
		const token = match[0];
		if (token === "{") groups += 1;
		if (token === "}") groups -= 1;
		if (groups === 0) {
			if (awaitingDelimiter && token.trim() !== "" && !token.startsWith("%")) awaitingDelimiter = false;
			if (match[1] !== void 0) {
				if (token.startsWith("\\begin")) environments.push(match[1]);
				else if (environments.at(-1) === match[1]) environments.pop();
			}
			if (token === "\\left") delimiters += 1;
			if (token === "\\right") delimiters -= 1;
			if (token === "\\left" || token === "\\right") awaitingDelimiter = true;
		}
		if (groups === 0 && delimiters === 0 && !awaitingDelimiter && environments.length === 0 && token !== "\\") boundaries.push(match.index + token.length);
	}
	return boundaries;
}
/** Render only a closed, KaTeX-valid prefix while a math source is growing. */
const rehypeStreamingMath = function(mathRenderer) {
	const renderer = (0, unified.unified)().use([mathRenderer]);
	return (tree, file) => {
		(0, unist_util_visit.visit)(tree, "element", (element, index, parent) => {
			if (index === void 0 || !parent) return;
			const firstChild = element.children[0];
			const mathElement = element.tagName === "pre" && firstChild?.type === "element" && firstChild.tagName === "code" ? firstChild : element;
			const classes = mathElement.properties.className;
			if (!Array.isArray(classes) || !classes.some((name) => [
				"language-math",
				"math-display",
				"math-inline"
			].includes(String(name)))) return;
			const source = mathElement.children.map((child) => child.type === "text" ? child.value : "").join("");
			const boundaries = closedBoundaries(source);
			let end = source.length;
			let output = [];
			while (end > 0) {
				const candidate = {
					...mathElement,
					children: [{
						type: "text",
						value: source.slice(0, end)
					}]
				};
				const root = {
					type: "root",
					children: [mathElement === element ? candidate : {
						...element,
						children: [candidate]
					}]
				};
				const messageCount = file.messages.length;
				const rendered = renderer.runSync(root, file);
				const failure = file.messages.splice(messageCount).find((message) => message.source === "rehype-katex");
				if (!failure) {
					output = rendered.children;
					break;
				}
				const cause = failure.cause;
				const limit = cause?.name === "ParseError" && Number.isFinite(cause.position) ? cause.position : end;
				while (boundaries.length && (boundaries.at(-1) >= end || boundaries.at(-1) > limit)) boundaries.pop();
				end = boundaries.pop() ?? 0;
			}
			parent.children.splice(index, 1, ...output);
			return [unist_util_visit.SKIP, index + output.length];
		});
	};
};
//#endregion
//#region src/components/composites/markdown/plugins/rehype-footnotes.ts
function rehypeFootnotes({ prefix, clobberPrefix }) {
	return (tree) => {
		(0, unist_util_visit.visit)(tree, "element", (node) => {
			const properties = node.properties;
			if (node.tagName === "section" && "dataFootnotes" in properties) node.tagName = "footnote-section";
			if (properties.id === `${clobberPrefix}footnote-label`) properties.id = `${clobberPrefix}${prefix}label`;
			if (node.tagName !== "a" || !("dataFootnoteRef" in properties) && !("dataFootnoteBackref" in properties)) return;
			if (typeof properties.href !== "string" || !properties.href.startsWith(`#${prefix}`)) return;
			properties.href = `#${encodeURIComponent(clobberPrefix + properties.href.slice(1))}`;
			if ("dataFootnoteRef" in properties) properties.ariaDescribedBy = [`${clobberPrefix}${prefix}label`];
			node.tagName = "footnote-link";
		});
	};
}
//#endregion
//#region src/components/composites/markdown/plugins/rehype-preserve-file-links.ts
const FILE_LINK_MARKER_PROPERTY = "dataMarkdownFileHref";
const URI_SCHEME_PATTERN$1 = /^[a-z][a-z0-9+.-]*:/i;
const WINDOWS_DRIVE_PATH_PATTERN = /^[a-z]:[/\\]/i;
const ASCII_CONTROL_CHARACTER_MAX_CODE = 31;
const ASCII_DELETE_CHARACTER_CODE = 127;
function containsAsciiControlCharacter(value) {
	for (const character of value) {
		const code = character.charCodeAt(0);
		if (code <= ASCII_CONTROL_CHARACTER_MAX_CODE || code === ASCII_DELETE_CHARACTER_CODE) return true;
	}
	return false;
}
function isFileLinkHref(href) {
	if (typeof href !== "string" || !href || href.startsWith("#") || href.startsWith("//") || href.startsWith(" ") || containsAsciiControlCharacter(href)) return false;
	return WINDOWS_DRIVE_PATH_PATTERN.test(href) || !URI_SCHEME_PATTERN$1.test(href);
}
function rehypePrepareFileLinks() {
	return (tree) => {
		(0, unist_util_visit.visit)(tree, "element", (node) => {
			delete node.properties[FILE_LINK_MARKER_PROPERTY];
			if (node.tagName === "a" && typeof node.properties.href === "string") {
				if (node.properties.href.startsWith("//")) node.properties.href = `https:${node.properties.href}`;
			}
			if (node.tagName === "img" && typeof node.properties.src === "string" && node.properties.src.startsWith("//")) node.properties.src = `https:${node.properties.src}`;
			if (node.tagName !== "a" || !isFileLinkHref(node.properties.href)) return;
			node.tagName = "span";
			node.properties[FILE_LINK_MARKER_PROPERTY] = node.properties.href;
			delete node.properties.href;
		});
	};
}
function rehypeRestoreFileLinks() {
	return (tree) => {
		(0, unist_util_visit.visit)(tree, "element", (node) => {
			const href = node.properties[FILE_LINK_MARKER_PROPERTY];
			if (node.tagName !== "span" || typeof href !== "string") return;
			node.tagName = "a";
			node.properties.href = href;
			delete node.properties[FILE_LINK_MARKER_PROPERTY];
		});
	};
}
//#endregion
//#region src/components/composites/markdown/plugins/rehype-preserve-relative-images.ts
function isRelativeImageSrc(src) {
	return typeof src === "string" && src.length > 0 && src.trim() === src && !/^[/?#]|^[a-z][a-z0-9+.-]*:|[\\\p{Cc}]|%2f|%5c/iu.test(src);
}
function createRelativeImagePreservation() {
	const sources = /* @__PURE__ */ new WeakMap();
	return {
		prepare: () => (tree) => {
			(0, unist_util_visit.visit)(tree, "element", (node) => {
				if (node.tagName !== "img" || !isRelativeImageSrc(node.properties.src)) return;
				sources.set(node, node.properties.src);
				node.tagName = "span";
				delete node.properties.src;
			});
		},
		restore: () => (tree) => {
			(0, unist_util_visit.visit)(tree, "element", (node) => {
				const src = sources.get(node);
				if (src === void 0) return;
				node.tagName = "img";
				node.properties.src = src;
				sources.delete(node);
			});
		}
	};
}
//#endregion
//#region src/components/composites/markdown/utils/sanitize.ts
/**
* Markdown sanitize schema + SVG element/attribute allow-lists.
*
* Moved verbatim from src/renderer/src/components/chat/messages/markdown/Markdown.tsx
* (lines 39-225). Extended `defaultSchema` allows the SVG subset Streamdown's
* Mermaid plugin (and inline SVG content) emits, plus `<sup data-citation>`
* for the citation pipeline.
*/
const SVG_ELEMENT_REGEX = /<svg[\s>]/i;
const DISALLOWED_ELEMENTS = ["iframe", "script"];
const SAFE_COLOR_VALUE = String.raw`(?:#[\da-f]{3,8}|(?:rgb|hsl)a?\([\d.%+,\s-]+\)|[a-z]+)`;
const SAFE_INLINE_COLOR_STYLE = new RegExp(String.raw`^\s*(?:(?:color|background-color)\s*:\s*${SAFE_COLOR_VALUE}\s*;?\s*){1,2}$`, "i");
const SVG_ELEMENTS = [
	"svg",
	"defs",
	"desc",
	"title",
	"symbol",
	"use",
	"g",
	"circle",
	"clipPath",
	"ellipse",
	"filter",
	"feBlend",
	"feColorMatrix",
	"feComposite",
	"feDropShadow",
	"feFlood",
	"feGaussianBlur",
	"feMerge",
	"feMergeNode",
	"feMorphology",
	"feOffset",
	"feTile",
	"feTurbulence",
	"line",
	"linearGradient",
	"marker",
	"mask",
	"path",
	"pattern",
	"polygon",
	"polyline",
	"radialGradient",
	"rect",
	"stop",
	"text",
	"textPath",
	"tspan"
];
const SVG_ATTRIBUTES = [
	"aria-label",
	"ariaHidden",
	"baseFrequency",
	"className",
	"clipPath",
	"clip-path",
	"clipRule",
	"clip-rule",
	"colorInterpolationFilters",
	"color-interpolation-filters",
	"cx",
	"cy",
	"d",
	"data-needs-measurement",
	"dominantBaseline",
	"dominant-baseline",
	"dx",
	"dy",
	"fill",
	"fillOpacity",
	"fill-opacity",
	"fillRule",
	"fill-rule",
	"filter",
	"floodColor",
	"flood-color",
	"floodOpacity",
	"flood-opacity",
	"fontFamily",
	"font-family",
	"fontSize",
	"font-size",
	"fontStyle",
	"font-style",
	"fontWeight",
	"font-weight",
	"gradientTransform",
	"gradientUnits",
	"height",
	"href",
	"id",
	"in",
	"in2",
	"k1",
	"k2",
	"k3",
	"k4",
	"lengthAdjust",
	"markerEnd",
	"marker-end",
	"markerHeight",
	"markerMid",
	"marker-mid",
	"markerStart",
	"marker-start",
	"markerWidth",
	"mask",
	"mode",
	"numOctaves",
	"offset",
	"opacity",
	"operator",
	"orient",
	"pathLength",
	"patternContentUnits",
	"patternTransform",
	"patternUnits",
	"points",
	"preserveAspectRatio",
	"r",
	"refX",
	"refY",
	"result",
	"role",
	"rotate",
	"rx",
	"ry",
	"scale",
	"seed",
	"spreadMethod",
	"stdDeviation",
	"stitchTiles",
	"stopColor",
	"stop-color",
	"stopOpacity",
	"stop-opacity",
	"stroke",
	"strokeDasharray",
	"stroke-dasharray",
	"strokeDashoffset",
	"stroke-dashoffset",
	"strokeLinecap",
	"stroke-linecap",
	"strokeLinejoin",
	"stroke-linejoin",
	"strokeMiterlimit",
	"stroke-miterlimit",
	"strokeOpacity",
	"stroke-opacity",
	"strokeWidth",
	"stroke-width",
	"surfaceScale",
	"targetX",
	"targetY",
	"textAnchor",
	"text-anchor",
	"textLength",
	"transform",
	"type",
	"values",
	"viewBox",
	"width",
	"x",
	"y",
	"x1",
	"x2",
	"xlinkHref",
	"xLinkHref",
	"xlink:href",
	"xmlns",
	"xmlnsXlink",
	"xmlns:xlink",
	"y1",
	"y2"
];
function mergeUnique(...groups) {
	return Array.from(new Set(groups.flatMap((group) => group ?? [])));
}
function sanitizeAttributeName(attribute) {
	return Array.isArray(attribute) ? attribute[0] : attribute;
}
function createMarkdownSanitizeSchema(schema, additionalLinkProtocols) {
	const svgAttributes = Object.fromEntries(SVG_ELEMENTS.map((tagName) => [tagName, mergeUnique(schema.attributes?.[tagName], SVG_ATTRIBUTES)]));
	const safeLinkProtocols = mergeUnique(schema.protocols?.href, ["http", "https"], additionalLinkProtocols);
	return {
		...schema,
		tagNames: mergeUnique(schema.tagNames, [
			"mark",
			"progress",
			"small",
			"span",
			"u"
		], SVG_ELEMENTS),
		strip: mergeUnique(schema.strip, ["style"]),
		attributes: {
			...schema.attributes,
			div: mergeUnique(schema.attributes?.div, [[
				"className",
				"markdown-alert",
				"markdown-alert-note",
				"markdown-alert-tip",
				"markdown-alert-important",
				"markdown-alert-warning",
				"markdown-alert-caution"
			]]),
			p: mergeUnique(schema.attributes?.p, [["className", "markdown-alert-title"]]),
			span: mergeUnique(schema.attributes?.span, [
				"data-composer-token-index",
				"dataComposerTokenIndex",
				"data-composer-token-block",
				"dataComposerTokenBlock",
				["style", SAFE_INLINE_COLOR_STYLE]
			]),
			progress: mergeUnique(schema.attributes?.progress, ["max", "value"]),
			sup: mergeUnique(schema.attributes?.sup?.filter((attribute) => sanitizeAttributeName(attribute) !== "dataCitation"), [["dataCitation", /^[1-9]\d*$/]]),
			...svgAttributes
		},
		protocols: {
			...schema.protocols,
			href: safeLinkProtocols,
			xlinkHref: safeLinkProtocols,
			xLinkHref: safeLinkProtocols,
			"xlink:href": safeLinkProtocols,
			src: mergeUnique(schema.protocols?.src, ["data"])
		}
	};
}
//#endregion
//#region src/components/composites/markdown/utils/normalize-link-scheme.ts
const URI_SCHEME_PATTERN = /^[A-Za-z][A-Za-z0-9+.-]*:/;
function rehypeNormalizeLinkScheme() {
	return (tree) => {
		(0, unist_util_visit.visit)(tree, "element", (node) => {
			const properties = node.properties;
			if (node.tagName !== "a" && properties.xlinkHref === void 0 && properties.xLinkHref === void 0) return;
			for (const property of [
				"href",
				"xlinkHref",
				"xLinkHref"
			]) {
				const value = properties[property];
				if (typeof value === "string") properties[property] = value.replace(URI_SCHEME_PATTERN, (scheme) => scheme.toLowerCase());
			}
		});
	};
}
//#endregion
//#region src/components/composites/markdown/internal.tsx
/**
* Shared rendering body for `<Markdown>` and `<StreamingMarkdown>`. Builds
* the rehype pipeline (defaultRehypePlugins → extended sanitize schema →
* conditional SVG scaling → SVG ID prefixing → harden → heading IDs →
* caller-supplied `extraRehypePlugins`) and hands `children`
* to Streamdown verbatim. Any pre-processing (LaTeX bracket conversion,
* SVG cleanup, citation tag injection) is the caller's responsibility —
* the package stays provider-agnostic.
*/
const STREAMDOWN_DEFAULT_REMARK_PLUGINS = Object.entries(streamdown.defaultRemarkPlugins).map(([name, plugin]) => {
	if (name !== "gfm" || !Array.isArray(plugin)) return plugin;
	const [gfmPlugin, options] = plugin;
	return [gfmPlugin, {
		...options,
		singleTilde: false
	}];
});
function MarkdownBlock({ content, ...props }) {
	const markdownCtx = (0, react.useMemo)(() => ({ content }), [content]);
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(MarkdownBlockContext, {
		value: markdownCtx,
		children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(streamdown.Block, {
			content,
			...props
		})
	});
}
function resolveDefaultRehypePlugins() {
	const plugins = streamdown.defaultRehypePlugins;
	const sanitize = plugins.sanitize;
	const harden = plugins.harden;
	if (!plugins.raw || !harden || !Array.isArray(sanitize) || sanitize.length < 2) throw new Error("Unexpected Streamdown defaultRehypePlugins shape");
	const [hardenFn, hardenOptions] = Array.isArray(harden) ? harden : [harden, void 0];
	return {
		raw: plugins.raw,
		sanitizeFn: sanitize[0],
		sanitizeSchema: sanitize[1],
		hardenFn,
		hardenOptions: hardenOptions ?? {}
	};
}
function isSamePluggableList(a, b) {
	if (a === b) return true;
	if (!a || !b || a.length !== b.length) return false;
	return a.every((plugin, index) => plugin === b[index]);
}
function isSameComponents(a, b) {
	if (a === b) return true;
	if (!a || !b) return false;
	const keys = Object.keys(a);
	if (keys.length !== Object.keys(b).length) return false;
	return keys.every((key) => a[key] === b[key]);
}
function useStableReference(value, isEqual) {
	const ref = (0, react.useRef)(value);
	if (!isEqual(ref.current, value)) ref.current = value;
	return ref.current;
}
function MarkdownCore({ id, children, components, plugins, extraRehypePlugins, extraRemarkPlugins, animated, mode, parseIncompleteMarkdown, parseMarkdownIntoBlocksFn, className, disallowedElements = DISALLOWED_ELEMENTS, footnoteLabel = "Footnotes", preserveFileLinkHrefs = false, additionalLinkProtocols, preserveRelativeImageSrcs = false }) {
	const hasSvgElement = (0, react.useMemo)(() => SVG_ELEMENT_REGEX.test(children), [children]);
	const stableComponents = useStableReference(components, isSameComponents);
	const footnotePrefix = `footnote-${id}-`;
	const renderedComponents = (0, react.useMemo)(() => ({
		...stableComponents,
		"footnote-link": FootnoteLink,
		"footnote-section": FootnoteSection
	}), [stableComponents]);
	const stableExtraRehypePlugins = useStableReference(extraRehypePlugins, isSamePluggableList);
	const stableExtraRemarkPlugins = useStableReference(extraRemarkPlugins, isSamePluggableList);
	const remarkPlugins = (0, react.useMemo)(() => {
		const list = [
			...STREAMDOWN_DEFAULT_REMARK_PLUGINS,
			remark_definition_list.default,
			remark_mark_highlight.remarkMark,
			remark_github_blockquote_alert.default
		];
		if (stableExtraRemarkPlugins?.length) list.push(...stableExtraRemarkPlugins);
		return list;
	}, [stableExtraRemarkPlugins]);
	const rehypePlugins = (0, react.useMemo)(() => {
		const { raw, sanitizeFn, sanitizeSchema, hardenFn, hardenOptions } = resolveDefaultRehypePlugins();
		const relativeImages = createRelativeImagePreservation();
		const extendedSchema = createMarkdownSanitizeSchema(sanitizeSchema, additionalLinkProtocols);
		const effectiveSchema = preserveFileLinkHrefs ? {
			...extendedSchema,
			attributes: {
				...extendedSchema.attributes,
				span: [
					...extendedSchema.attributes?.span ?? [],
					...extendedSchema.attributes?.a ?? [],
					FILE_LINK_MARKER_PROPERTY
				]
			}
		} : extendedSchema;
		const result = [raw, ...preserveFileLinkHrefs ? [rehypePrepareFileLinks] : []];
		result.push(rehypeNormalizeLinkScheme, [sanitizeFn, effectiveSchema], rehypePreserveAnchorTargets, ...hasSvgElement ? [rehypeScalableSvg] : [], [rehypePrefixSvgReferences, effectiveSchema.clobberPrefix], ...preserveRelativeImageSrcs ? [relativeImages.prepare] : [], [hardenFn, {
			...hardenOptions,
			linkBlockPolicy: "text-only",
			imageBlockPolicy: "text-only"
		}], ...preserveRelativeImageSrcs ? [relativeImages.restore] : [], ...preserveFileLinkHrefs ? [rehypeRestoreFileLinks] : [], [rehypeHeadingIds, { prefix: `heading-${id}` }], [rehypeFootnotes, {
			prefix: footnotePrefix,
			clobberPrefix: effectiveSchema.clobberPrefix ?? "user-content-"
		}]);
		if (stableExtraRehypePlugins?.length) result.push(...stableExtraRehypePlugins);
		return result;
	}, [
		hasSvgElement,
		id,
		footnotePrefix,
		stableExtraRehypePlugins,
		preserveFileLinkHrefs,
		preserveRelativeImageSrcs,
		additionalLinkProtocols
	]);
	const urlTransform = (0, react.useCallback)((value, key, node) => {
		if (key === "src" && /^data:image\/(?:png|jpeg);/i.test(value)) return value;
		return (0, streamdown.defaultUrlTransform)(value, key, node);
	}, []);
	const remarkRehypeOptions = (0, react.useMemo)(() => ({
		footnoteLabel,
		clobberPrefix: footnotePrefix,
		footnoteLabelTagName: "h4",
		footnoteBackContent: "↩",
		handlers: remark_definition_list.defListHastHandlers
	}), [footnoteLabel, footnotePrefix]);
	const markdownCtx = (0, react.useMemo)(() => ({ content: children }), [children]);
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(MarkdownBlockContext, {
		value: markdownCtx,
		children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
			className: ["markdown", className].filter(Boolean).join(" "),
			children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(streamdown.Streamdown, {
				BlockComponent: MarkdownBlock,
				mode,
				plugins,
				rehypePlugins,
				remarkPlugins,
				components: renderedComponents,
				disallowedElements,
				urlTransform,
				parseIncompleteMarkdown,
				parseMarkdownIntoBlocksFn,
				normalizeHtmlIndentation: true,
				remarkRehypeOptions,
				animated: animated || void 0,
				isAnimating: !!animated && mode === "streaming",
				children
			})
		})
	});
}
//#endregion
//#region src/components/composites/markdown/markdown.tsx
function Markdown({ id, children, components, plugins, rehypePlugins, remarkPlugins, disallowedElements, className, footnoteLabel, preserveFileLinkHrefs, additionalLinkProtocols, preserveRelativeImageSrcs }) {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(MarkdownCore, {
		id,
		mode: "static",
		components,
		plugins,
		extraRehypePlugins: rehypePlugins,
		extraRemarkPlugins: remarkPlugins,
		disallowedElements,
		className,
		footnoteLabel,
		preserveFileLinkHrefs,
		additionalLinkProtocols,
		preserveRelativeImageSrcs,
		children
	});
}
//#endregion
//#region src/components/composites/markdown/presets.ts
/**
* Plugin presets for Streamdown's `plugins` prop.
*
* Defaults to `code` + `cjk` (the most commonly needed for chat / docs UIs).
* Math is opt-in at render time via `withMath()`, but its plugin is bundled with
* this module. Mermaid presets live in `mermaid-presets.ts` so they stay out of
* the bundle unless imported.
*/
const cjkWithLiteralTildes = (() => {
	const remarkPluginsAfter = _streamdown_cjk.cjk.remarkPluginsAfter.map((plugin, index, plugins) => index === plugins.length - 1 ? [plugin, { singleTilde: false }] : plugin);
	return {
		..._streamdown_cjk.cjk,
		remarkPluginsAfter,
		remarkPlugins: [..._streamdown_cjk.cjk.remarkPluginsBefore, ...remarkPluginsAfter]
	};
})();
/** Code (Highlights highlighting) + CJK line-break tweaks. */
const defaultMarkdownPlugins = {
	code: createCodeHighlightPlugin(),
	cjk: cjkWithLiteralTildes
};
/** KaTeX math plugin. `singleDollar` enables `$x$` inline math (off by default). */
function withMath(opts) {
	const math = (0, _streamdown_math.createMathPlugin)({ singleDollarTextMath: opts?.singleDollar ?? false });
	return opts?.streaming ? {
		...math,
		rehypePlugin: [rehypeStreamingMath, math.rehypePlugin]
	} : math;
}
//#endregion
//#region src/components/composites/markdown/mermaid-presets.ts
/** Mermaid diagram plugin backed by Merman, themed from the document's design tokens at render time. */
function withMermaid() {
	return {
		name: "mermaid",
		type: "diagram",
		language: "mermaid",
		getMermaid: () => ({
			initialize: () => {},
			render: async (id, source) => ({ svg: await require_theme.renderMermaidSvg(source, {
				diagramId: id,
				theme: require_theme.resolveMermaidTheme(document.documentElement)
			}) })
		})
	};
}
/**
* Composer preset bundling all four plugins (code + cjk + math + mermaid).
* Suitable for consumers that render the full markdown surface.
*/
function withFullMarkdown(opts) {
	return {
		...defaultMarkdownPlugins,
		math: withMath({ singleDollar: opts?.singleDollarMath ?? false }),
		mermaid: withMermaid()
	};
}
/**
* @deprecated Use `withFullMarkdown`. Kept as a compatibility alias for
* downstream branches that still import this preset from the markdown barrel.
*/
const withChatPlugins = withFullMarkdown;
//#endregion
//#region src/components/composites/markdown/streaming-markdown.tsx
const DEFAULT_ANIMATED = {
	animation: "fadeIn",
	duration: 250,
	easing: "ease-out",
	stagger: 0
};
function StreamingMarkdown({ id, children, components, plugins, rehypePlugins, remarkPlugins, disallowedElements, className, footnoteLabel, animated, parseIncompleteMarkdown = true, parseMarkdownIntoBlocksFn, preserveFileLinkHrefs, additionalLinkProtocols, preserveRelativeImageSrcs }) {
	const resolvedAnimated = (0, react.useMemo)(() => animated === false ? false : animated ?? DEFAULT_ANIMATED, [animated]);
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(MarkdownCore, {
		id,
		mode: "streaming",
		parseIncompleteMarkdown,
		parseMarkdownIntoBlocksFn,
		components,
		plugins,
		extraRehypePlugins: rehypePlugins,
		extraRemarkPlugins: remarkPlugins,
		animated: resolvedAnimated,
		disallowedElements,
		className: [className, (!resolvedAnimated || (resolvedAnimated.animation ?? "fadeIn") === "fadeIn") && "markdown-fade-in"].filter(Boolean).join(" "),
		footnoteLabel,
		preserveFileLinkHrefs,
		additionalLinkProtocols,
		preserveRelativeImageSrcs,
		children
	});
}
//#endregion
//#region src/components/primitives/context-menu.tsx
const menuContentStyles = require_avatar.cn("z-50 max-h-(--radix-context-menu-content-available-height) min-w-[8rem] origin-(--radix-context-menu-content-transform-origin) overflow-x-hidden overflow-y-auto rounded-md border bg-popover p-1 text-popover-foreground shadow-md [-webkit-app-region:no-drag]", "data-[state=closed]:animate-out data-[state=open]:animate-in", "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0", "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95");
const menuSubContentStyles = require_avatar.cn("z-50 min-w-[8rem] origin-(--radix-context-menu-content-transform-origin) overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-lg [-webkit-app-region:no-drag]", "data-[state=closed]:animate-out data-[state=open]:animate-in", "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0", "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95");
const menuItemVariants$1 = (0, class_variance_authority.cva)(require_avatar.cn("relative flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none", "focus:bg-accent focus:text-accent-foreground", "data-disabled:pointer-events-none data-disabled:opacity-50", "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4", "[&_svg:not([class*='text-'])]:text-muted-foreground"), {
	variants: {
		variant: {
			default: "",
			destructive: "text-destructive focus:bg-destructive/10 focus:text-destructive dark:focus:bg-destructive/20 data-[variant=destructive]:[&_svg:not([class*='text-'])]:text-destructive!"
		},
		inset: {
			true: "pl-8",
			false: ""
		}
	},
	defaultVariants: {
		variant: "default",
		inset: false
	}
});
const ContextMenuOpeningPointerUpGuardContext = react.createContext(null);
function ContextMenu({ onOpenChange, ...props }) {
	const shouldStopOpeningPointerUpRef = react.useRef(false);
	const clearOpeningPointerUpListenerRef = react.useRef(null);
	const clearOpeningPointerUpTimerRef = react.useRef(null);
	const clearOpeningPointerUp = react.useCallback(() => {
		shouldStopOpeningPointerUpRef.current = false;
		clearOpeningPointerUpListenerRef.current?.();
		clearOpeningPointerUpListenerRef.current = null;
		if (clearOpeningPointerUpTimerRef.current !== null) {
			window.clearTimeout(clearOpeningPointerUpTimerRef.current);
			clearOpeningPointerUpTimerRef.current = null;
		}
	}, []);
	const pointerUpGuard = react.useMemo(() => ({
		consumeOpeningPointerUp: () => {
			const shouldStop = shouldStopOpeningPointerUpRef.current;
			clearOpeningPointerUp();
			return shouldStop;
		},
		markOpeningPointerUp: () => {
			shouldStopOpeningPointerUpRef.current = true;
			clearOpeningPointerUpListenerRef.current?.();
			const handleOpeningPointerUp = () => clearOpeningPointerUp();
			window.addEventListener("pointerup", handleOpeningPointerUp, { once: true });
			clearOpeningPointerUpListenerRef.current = () => {
				window.removeEventListener("pointerup", handleOpeningPointerUp);
			};
			if (clearOpeningPointerUpTimerRef.current !== null) window.clearTimeout(clearOpeningPointerUpTimerRef.current);
			clearOpeningPointerUpTimerRef.current = window.setTimeout(clearOpeningPointerUp, 1e3);
		}
	}), [clearOpeningPointerUp]);
	const handleOpenChange = react.useCallback((open) => {
		if (!open) clearOpeningPointerUp();
		onOpenChange?.(open);
	}, [clearOpeningPointerUp, onOpenChange]);
	react.useEffect(() => clearOpeningPointerUp, [clearOpeningPointerUp]);
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ContextMenuOpeningPointerUpGuardContext, {
		value: pointerUpGuard,
		children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_radix_ui_react_context_menu.Root, {
			"data-slot": "context-menu",
			onOpenChange: handleOpenChange,
			...props
		})
	});
}
function ContextMenuTrigger({ onContextMenu, disabled, ...props }) {
	const pointerUpGuard = react.use(ContextMenuOpeningPointerUpGuardContext);
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_radix_ui_react_context_menu.Trigger, {
		"data-slot": "context-menu-trigger",
		disabled,
		onContextMenu: (event) => {
			if (!disabled) pointerUpGuard?.markOpeningPointerUp();
			onContextMenu?.(event);
		},
		...props
	});
}
function ContextMenuGroup({ ...props }) {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_radix_ui_react_context_menu.Group, {
		"data-slot": "context-menu-group",
		...props
	});
}
function ContextMenuPortal({ container, ...props }) {
	const defaultPortalContainer = usePortalContainer();
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_radix_ui_react_context_menu.Portal, {
		"data-slot": "context-menu-portal",
		container: container ?? defaultPortalContainer ?? void 0,
		...props
	});
}
function ContextMenuSub({ ...props }) {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_radix_ui_react_context_menu.Sub, {
		"data-slot": "context-menu-sub",
		...props
	});
}
function ContextMenuRadioGroup({ ...props }) {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_radix_ui_react_context_menu.RadioGroup, {
		"data-slot": "context-menu-radio-group",
		...props
	});
}
function stopOpeningPointerUp(event, pointerUpGuard) {
	const isOpeningPointerUp = pointerUpGuard?.consumeOpeningPointerUp() ?? false;
	if (event.button !== 2 && !isOpeningPointerUp) return;
	event.preventDefault();
	event.stopPropagation();
}
function ContextMenuSubTrigger({ className, inset, children, ...props }) {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(_radix_ui_react_context_menu.SubTrigger, {
		"data-slot": "context-menu-sub-trigger",
		"data-inset": inset,
		className: require_avatar.cn(menuItemVariants$1({ inset }), "data-[state=open]:bg-accent data-[state=open]:text-accent-foreground", className),
		...props,
		children: [children, /* @__PURE__ */ (0, react_jsx_runtime.jsx)(lucide_react.ChevronRightIcon, { className: "ml-auto size-4" })]
	});
}
function ContextMenuSubContent({ className, onPointerUpCapture, ...props }) {
	const pointerUpGuard = react.use(ContextMenuOpeningPointerUpGuardContext);
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_radix_ui_react_context_menu.SubContent, {
		"data-slot": "context-menu-sub-content",
		className: require_avatar.cn(menuSubContentStyles, "data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2", "data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2", className),
		onPointerUpCapture: (event) => {
			onPointerUpCapture?.(event);
			stopOpeningPointerUp(event, pointerUpGuard);
		},
		...props
	});
}
function ContextMenuContent({ className, onPointerUpCapture, portalContainer, ...props }) {
	const pointerUpGuard = react.use(ContextMenuOpeningPointerUpGuardContext);
	const defaultPortalContainer = usePortalContainer();
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_radix_ui_react_context_menu.Portal, {
		container: portalContainer ?? defaultPortalContainer ?? void 0,
		children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_radix_ui_react_context_menu.Content, {
			"data-slot": "context-menu-content",
			className: require_avatar.cn(menuContentStyles, "data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2", "data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2", className),
			onPointerUpCapture: (event) => {
				onPointerUpCapture?.(event);
				stopOpeningPointerUp(event, pointerUpGuard);
			},
			...props
		})
	});
}
function ContextMenuItem({ className, inset, variant, ...props }) {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_radix_ui_react_context_menu.Item, {
		"data-slot": "context-menu-item",
		"data-inset": inset,
		"data-variant": variant,
		className: require_avatar.cn(menuItemVariants$1({
			variant,
			inset
		}), className),
		...props
	});
}
function ContextMenuCheckboxItem({ className, children, checked, ...props }) {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(_radix_ui_react_context_menu.CheckboxItem, {
		"data-slot": "context-menu-checkbox-item",
		className: require_avatar.cn(menuItemVariants$1({ inset: true }), "pr-2", className),
		checked,
		...props,
		children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
			className: "pointer-events-none absolute left-2 flex size-4 items-center justify-center",
			children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_radix_ui_react_context_menu.ItemIndicator, { children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(lucide_react.CheckIcon, { className: "size-4" }) })
		}), children]
	});
}
function ContextMenuRadioItem({ className, children, ...props }) {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(_radix_ui_react_context_menu.RadioItem, {
		"data-slot": "context-menu-radio-item",
		className: require_avatar.cn(menuItemVariants$1({ inset: true }), "pr-2", className),
		...props,
		children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
			className: "pointer-events-none absolute left-2 flex size-4 items-center justify-center",
			children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_radix_ui_react_context_menu.ItemIndicator, { children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(lucide_react.CircleIcon, { className: "size-2 fill-current" }) })
		}), children]
	});
}
function ContextMenuLabel({ className, inset, ...props }) {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_radix_ui_react_context_menu.Label, {
		"data-slot": "context-menu-label",
		className: require_avatar.cn("px-2 py-1.5 text-sm font-medium", inset && "pl-8", className),
		...props
	});
}
function ContextMenuSeparator({ className, ...props }) {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_radix_ui_react_context_menu.Separator, {
		"data-slot": "context-menu-separator",
		className: require_avatar.cn("-mx-1 my-1 h-px bg-border", className),
		...props
	});
}
function ContextMenuShortcut({ className, ...props }) {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
		"data-slot": "context-menu-shortcut",
		className: require_avatar.cn("ml-auto text-xs tracking-widest text-muted-foreground", className),
		...props
	});
}
/**
* Convenience component for consistent menu-item content layout: icon + label
* plus an optional trailing badge and either a keyboard shortcut OR a submenu
* chevron (the two are mutually exclusive — see the discriminated union above).
*/
function ContextMenuItemContent(props) {
	const { icon, children, badge, className } = props;
	const shortcut = "shortcut" in props ? props.shortcut : void 0;
	const hasSubmenu = "hasSubmenu" in props ? props.hasSubmenu : false;
	return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
		className: require_avatar.cn("flex min-w-0 flex-1 items-center gap-2", className),
		children: [icon && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
			className: "size-4 shrink-0",
			children: icon
		}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
			className: "min-w-0 flex-1 truncate",
			children
		})]
	}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
		className: "ml-auto flex items-center gap-1",
		children: [
			badge,
			shortcut && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ContextMenuShortcut, { children: shortcut }),
			hasSubmenu && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(lucide_react.ChevronRightIcon, { className: "size-4 text-muted-foreground" })
		]
	})] });
}
//#endregion
//#region src/components/composites/image-preview/image-preview-context-menu.tsx
function ImagePreviewContextMenu({ actions = [], children, context, item, onActionError }) {
	if (actions.length === 0) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(react_jsx_runtime.Fragment, { children });
	return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(ContextMenu, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ContextMenuTrigger, {
		asChild: true,
		children
	}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ContextMenuContent, { children: actions.map((action) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(ContextMenuItem, {
		disabled: action.disabled,
		onSelect: (event) => {
			event.preventDefault();
			Promise.resolve().then(() => action.onSelect(item, context)).catch((error) => onActionError?.(error, action, item));
		},
		children: [action.icon, action.label]
	}, action.id)) })] });
}
//#endregion
//#region src/components/composites/image-preview/image-preview-toolbar.tsx
const ToolbarButton = ({ children, disabled, label, onClick, pressed }) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Tooltip, {
	content: label,
	delay: 300,
	children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
		"aria-label": label,
		"aria-pressed": pressed,
		className: "size-9 rounded-full text-muted-foreground hover:text-foreground disabled:opacity-40",
		disabled,
		onClick,
		size: "icon",
		type: "button",
		variant: "ghost",
		children
	})
});
function ImagePreviewToolbar({ actions = [], className, context, item, labels, onActionError, transformControls }) {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
		className: require_avatar.cn("flex items-center gap-1 rounded-xl border border-border bg-popover p-1 text-popover-foreground shadow-md", className),
		onClick: (event) => event.stopPropagation(),
		children: [
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ToolbarButton, {
				disabled: !transformControls.canZoomOut,
				label: labels.zoomOut,
				onClick: transformControls.zoomOut,
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(lucide_react.ZoomOut, { className: "size-4" })
			}),
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ToolbarButton, {
				disabled: !transformControls.canZoomIn,
				label: labels.zoomIn,
				onClick: transformControls.zoomIn,
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(lucide_react.ZoomIn, { className: "size-4" })
			}),
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ToolbarButton, {
				label: labels.rotateLeft,
				onClick: transformControls.rotateLeft,
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(lucide_react.RotateCcwSquare, { className: "size-4" })
			}),
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ToolbarButton, {
				label: labels.rotateRight,
				onClick: transformControls.rotateRight,
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(lucide_react.RotateCwSquare, { className: "size-4" })
			}),
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ToolbarButton, {
				label: labels.flipHorizontal,
				onClick: transformControls.flipHorizontal,
				pressed: transformControls.transform.flipX,
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(lucide_react.FlipHorizontal, { className: "size-4" })
			}),
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ToolbarButton, {
				label: labels.flipVertical,
				onClick: transformControls.flipVertical,
				pressed: transformControls.transform.flipY,
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(lucide_react.FlipVertical, { className: "size-4" })
			}),
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ToolbarButton, {
				label: labels.reset,
				onClick: transformControls.reset,
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(lucide_react.RefreshCcw, { className: "size-4" })
			}),
			actions.map((action) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ToolbarButton, {
				disabled: action.disabled,
				label: action.label,
				onClick: () => {
					Promise.resolve().then(() => action.onSelect(item, context)).catch((error) => onActionError?.(error, action, item));
				},
				children: action.icon
			}, action.id))
		]
	});
}
//#endregion
//#region src/components/composites/image-preview/image-preview-image.tsx
function ImagePreviewImage({ className, fitScale = 1, item, style, transform, ...props }) {
	const transformValue = [
		`translate3d(${transform.offsetX}px, ${transform.offsetY}px, 0)`,
		`rotate(${transform.rotation}deg)`,
		`scale(${fitScale * transform.zoom})`,
		`scaleX(${transform.flipX ? -1 : 1})`,
		`scaleY(${transform.flipY ? -1 : 1})`
	].join(" ");
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("img", {
		alt: item.alt ?? item.title ?? "",
		className: require_avatar.cn("block max-h-full max-w-full object-contain select-none", className),
		draggable: false,
		src: item.src,
		style: {
			...style,
			transform: transformValue,
			transformOrigin: "center"
		},
		...props
	});
}
//#endregion
//#region src/components/composites/image-preview/image-preview-viewport.tsx
const EMPTY_SIZE = {
	height: 0,
	width: 0
};
const clamp$1 = (value, min, max) => Math.min(max, Math.max(min, value));
const getItemKey = (item) => `${item.id}\0${item.src}`;
const touchSpan = (points) => {
	const [first, second] = [...points.values()];
	return {
		span: Math.hypot(first.x - second.x, first.y - second.y),
		midX: (first.x + second.x) / 2,
		midY: (first.y + second.y) / 2
	};
};
const getGeometry = (imageSize, viewportSize, transform) => {
	if (imageSize.width <= 0 || imageSize.height <= 0 || viewportSize.width <= 0 || viewportSize.height <= 0) return {
		fitScale: 1,
		maxOffsetX: 0,
		maxOffsetY: 0
	};
	const swapsDimensions = transform.rotation % 180 !== 0;
	const rotatedWidth = swapsDimensions ? imageSize.height : imageSize.width;
	const rotatedHeight = swapsDimensions ? imageSize.width : imageSize.height;
	const fitScale = Math.min(1, viewportSize.width / rotatedWidth, viewportSize.height / rotatedHeight);
	const renderedWidth = rotatedWidth * fitScale * transform.zoom;
	const renderedHeight = rotatedHeight * fitScale * transform.zoom;
	return {
		fitScale,
		maxOffsetX: Math.max(0, (renderedWidth - viewportSize.width) / 2),
		maxOffsetY: Math.max(0, (renderedHeight - viewportSize.height) / 2)
	};
};
const clampOffsets = (transform, imageSize, viewportSize) => {
	const { maxOffsetX, maxOffsetY } = getGeometry(imageSize, viewportSize, transform);
	return {
		offsetX: clamp$1(transform.offsetX, -maxOffsetX, maxOffsetX),
		offsetY: clamp$1(transform.offsetY, -maxOffsetY, maxOffsetY)
	};
};
function ImagePreviewViewport({ actionContext, actions = [], className, imageClassName, item, onActionError, onBackdropClick, onError, onLoad, transformControls, ...props }) {
	const viewportRef = react.useRef(null);
	const dragRef = react.useRef(null);
	const touchPointsRef = react.useRef(/* @__PURE__ */ new Map());
	const pinchRef = react.useRef(null);
	const [isDragging, setIsDragging] = react.useState(false);
	const [viewportSize, setViewportSize] = react.useState(EMPTY_SIZE);
	const [loadedImage, setLoadedImage] = react.useState(null);
	const itemKey = getItemKey(item);
	const imageSize = loadedImage?.itemKey === itemKey ? loadedImage.size : EMPTY_SIZE;
	const { transform, update } = transformControls;
	const geometry = getGeometry(imageSize, viewportSize, transform);
	const canPan = geometry.maxOffsetX > 0 || geometry.maxOffsetY > 0;
	const isGeometryReady = imageSize.width > 0 && imageSize.height > 0 && viewportSize.width > 0 && viewportSize.height > 0;
	react.useLayoutEffect(() => {
		const viewport = viewportRef.current;
		if (!viewport) return;
		const updateSize = () => {
			const rect = viewport.getBoundingClientRect();
			setViewportSize((current) => current.width === rect.width && current.height === rect.height ? current : {
				width: rect.width,
				height: rect.height
			});
		};
		updateSize();
		if (typeof ResizeObserver === "undefined") return;
		const observer = new ResizeObserver(updateSize);
		observer.observe(viewport);
		return () => observer.disconnect();
	}, []);
	react.useLayoutEffect(() => {
		const offsets = clampOffsets(transform, imageSize, viewportSize);
		update(offsets);
	}, [
		imageSize,
		transform,
		update,
		viewportSize
	]);
	const zoomAt = react.useCallback((nextZoom, clientX, clientY) => {
		const viewport = viewportRef.current;
		if (!viewport) return;
		const rect = viewport.getBoundingClientRect();
		const anchorX = clientX - rect.left - rect.width / 2;
		const anchorY = clientY - rect.top - rect.height / 2;
		update((current) => {
			const zoom = clamp$1(nextZoom, transformControls.minZoom, transformControls.maxZoom);
			const ratio = zoom / current.zoom;
			const next = {
				...current,
				offsetX: anchorX - (anchorX - current.offsetX) * ratio,
				offsetY: anchorY - (anchorY - current.offsetY) * ratio,
				zoom
			};
			return {
				...next,
				...clampOffsets(next, imageSize, viewportSize)
			};
		});
	}, [
		imageSize,
		transformControls.maxZoom,
		transformControls.minZoom,
		update,
		viewportSize
	]);
	const handleWheel = react.useCallback((event) => {
		event.preventDefault();
		const nextZoom = transform.zoom * Math.exp(-event.deltaY * .002);
		zoomAt(nextZoom, event.clientX, event.clientY);
	}, [transform.zoom, zoomAt]);
	const handleTouchPointerDown = react.useCallback((event) => {
		if (event.pointerType !== "touch") return;
		touchPointsRef.current.set(event.pointerId, {
			x: event.clientX,
			y: event.clientY
		});
		if (touchPointsRef.current.size !== 2) return;
		dragRef.current = null;
		setIsDragging(false);
		pinchRef.current = {
			span: touchSpan(touchPointsRef.current).span,
			zoom: transform.zoom
		};
	}, [transform.zoom]);
	const handleTouchPointerMove = react.useCallback((event) => {
		if (!touchPointsRef.current.has(event.pointerId)) return;
		touchPointsRef.current.set(event.pointerId, {
			x: event.clientX,
			y: event.clientY
		});
		const pinch = pinchRef.current;
		if (!pinch || touchPointsRef.current.size !== 2) return;
		const { span, midX, midY } = touchSpan(touchPointsRef.current);
		if (pinch.span > 0) zoomAt(pinch.zoom * span / pinch.span, midX, midY);
	}, [zoomAt]);
	const handleTouchPointerEnd = react.useCallback((event) => {
		touchPointsRef.current.delete(event.pointerId);
		if (touchPointsRef.current.size < 2) pinchRef.current = null;
	}, []);
	const handlePointerDown = react.useCallback((event) => {
		event.stopPropagation();
		if (event.button !== 0 || !canPan || pinchRef.current) return;
		dragRef.current = {
			offsetX: transform.offsetX,
			offsetY: transform.offsetY,
			pointerId: event.pointerId,
			startX: event.clientX,
			startY: event.clientY
		};
		event.currentTarget.setPointerCapture(event.pointerId);
		setIsDragging(true);
		event.preventDefault();
	}, [
		canPan,
		transform.offsetX,
		transform.offsetY
	]);
	const handlePointerMove = react.useCallback((event) => {
		const drag = dragRef.current;
		if (!drag || drag.pointerId !== event.pointerId) return;
		const next = {
			...transform,
			offsetX: drag.offsetX + event.clientX - drag.startX,
			offsetY: drag.offsetY + event.clientY - drag.startY
		};
		update(clampOffsets(next, imageSize, viewportSize));
	}, [
		imageSize,
		transform,
		update,
		viewportSize
	]);
	const stopDragging = react.useCallback((event) => {
		const drag = dragRef.current;
		if (!drag || drag.pointerId !== event.pointerId) return;
		if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
		dragRef.current = null;
		setIsDragging(false);
	}, []);
	const image = /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ImagePreviewImage, {
		className: require_avatar.cn("max-h-none max-w-none shrink-0", canPan && (isDragging ? "cursor-grabbing transition-none" : "cursor-grab"), imageClassName),
		fitScale: geometry.fitScale,
		item,
		onClick: (event) => event.stopPropagation(),
		onDoubleClick: (event) => {
			event.stopPropagation();
			zoomAt(transform.zoom > transformControls.minZoom ? transformControls.minZoom : 2, event.clientX, event.clientY);
		},
		onError,
		onLoad: (event) => {
			setLoadedImage({
				itemKey,
				size: {
					height: event.currentTarget.naturalHeight,
					width: event.currentTarget.naturalWidth
				}
			});
			onLoad?.(event);
		},
		onPointerCancel: stopDragging,
		onPointerDown: handlePointerDown,
		onPointerMove: handlePointerMove,
		onPointerUp: stopDragging,
		style: {
			...imageSize.width > 0 ? {
				height: imageSize.height,
				width: imageSize.width
			} : {},
			visibility: isGeometryReady ? "visible" : "hidden"
		},
		transform
	}, itemKey);
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
		...props,
		ref: viewportRef,
		className: require_avatar.cn("relative flex h-full w-full touch-none items-center justify-center overflow-hidden", className),
		"data-testid": "image-preview-viewport",
		onClick: (event) => {
			if (event.target === event.currentTarget) onBackdropClick?.();
		},
		onPointerCancelCapture: handleTouchPointerEnd,
		onPointerDownCapture: handleTouchPointerDown,
		onPointerMoveCapture: handleTouchPointerMove,
		onPointerUpCapture: handleTouchPointerEnd,
		onWheel: handleWheel,
		children: actionContext && actions.length > 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ImagePreviewContextMenu, {
			actions,
			context: actionContext,
			item,
			onActionError,
			children: image
		}) : image
	});
}
//#endregion
//#region src/components/composites/image-preview/types.ts
const DEFAULT_IMAGE_PREVIEW_LABELS = {
	close: "Close",
	flipHorizontal: "Flip horizontal",
	flipVertical: "Flip vertical",
	next: "Next image",
	previous: "Previous image",
	reset: "Reset",
	rotateLeft: "Rotate left",
	rotateRight: "Rotate right",
	zoomIn: "Zoom in",
	zoomOut: "Zoom out"
};
//#endregion
//#region src/components/composites/image-preview/use-image-preview-transform.ts
const DEFAULT_TRANSFORM = {
	flipX: false,
	flipY: false,
	offsetX: 0,
	offsetY: 0,
	rotation: 0,
	zoom: 1
};
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const normalizeRotate = (value) => (value % 360 + 360) % 360;
const toFiniteNumber = (value, fallback) => typeof value === "number" && Number.isFinite(value) ? value : fallback;
const normalizeTransform = (transform, minZoom, maxZoom) => ({
	flipX: transform?.flipX ?? DEFAULT_TRANSFORM.flipX,
	flipY: transform?.flipY ?? DEFAULT_TRANSFORM.flipY,
	offsetX: toFiniteNumber(transform?.offsetX, DEFAULT_TRANSFORM.offsetX),
	offsetY: toFiniteNumber(transform?.offsetY, DEFAULT_TRANSFORM.offsetY),
	rotation: normalizeRotate(toFiniteNumber(transform?.rotation, DEFAULT_TRANSFORM.rotation)),
	zoom: clamp(toFiniteNumber(transform?.zoom, DEFAULT_TRANSFORM.zoom), minZoom, maxZoom)
});
const transformsEqual = (left, right) => left.flipX === right.flipX && left.flipY === right.flipY && left.offsetX === right.offsetX && left.offsetY === right.offsetY && left.rotation === right.rotation && left.zoom === right.zoom;
function useImagePreviewTransform({ initialTransform, maxZoom = 5, minZoom = 1, zoomStep = .25 } = {}) {
	if (minZoom > maxZoom) throw new Error("useImagePreviewTransform requires minZoom <= maxZoom");
	if (zoomStep <= 0 || !Number.isFinite(zoomStep)) throw new Error("useImagePreviewTransform requires zoomStep > 0");
	const initialValue = react.useMemo(() => normalizeTransform(initialTransform, minZoom, maxZoom), [
		initialTransform,
		maxZoom,
		minZoom
	]);
	const [transform, setTransform] = react.useState(initialValue);
	const update = react.useCallback((nextUpdate) => {
		setTransform((current) => {
			const patch = typeof nextUpdate === "function" ? nextUpdate(current) : nextUpdate;
			const next = normalizeTransform({
				...current,
				...patch
			}, minZoom, maxZoom);
			return transformsEqual(current, next) ? current : next;
		});
	}, [maxZoom, minZoom]);
	const reset = react.useCallback(() => {
		setTransform(initialValue);
	}, [initialValue]);
	const zoomIn = react.useCallback(() => {
		update((current) => ({ zoom: current.zoom + zoomStep }));
	}, [update, zoomStep]);
	const zoomOut = react.useCallback(() => {
		update((current) => ({ zoom: current.zoom - zoomStep }));
	}, [update, zoomStep]);
	const rotateLeft = react.useCallback(() => {
		update((current) => ({
			offsetX: 0,
			offsetY: 0,
			rotation: current.rotation - 90
		}));
	}, [update]);
	const rotateRight = react.useCallback(() => {
		update((current) => ({
			offsetX: 0,
			offsetY: 0,
			rotation: current.rotation + 90
		}));
	}, [update]);
	const flipHorizontal = react.useCallback(() => {
		update((current) => ({
			flipX: !current.flipX,
			rotation: -current.rotation
		}));
	}, [update]);
	const flipVertical = react.useCallback(() => {
		update((current) => ({
			flipY: !current.flipY,
			rotation: -current.rotation
		}));
	}, [update]);
	return {
		canZoomIn: transform.zoom < maxZoom,
		canZoomOut: transform.zoom > minZoom,
		flipHorizontal,
		flipVertical,
		maxZoom,
		minZoom,
		reset,
		rotateLeft,
		rotateRight,
		transform,
		update,
		zoomIn,
		zoomOut
	};
}
//#endregion
//#region src/components/composites/image-preview/image-preview-dialog.tsx
const clampIndex = (index, length) => {
	if (length <= 0) return 0;
	return Math.min(length - 1, Math.max(0, index));
};
function ImagePreviewDialog({ actions = [], activeIndex, className, contentClassName, defaultActiveIndex = 0, imageClassName, items, labels, onActiveIndexChange, onActionError, onOpenChange, open, overlayClassName, toolbarActions = [] }) {
	const mergedLabels = react.useMemo(() => ({
		...DEFAULT_IMAGE_PREVIEW_LABELS,
		...labels
	}), [labels]);
	const [uncontrolledIndex, setUncontrolledIndex] = react.useState(defaultActiveIndex);
	const transformControls = useImagePreviewTransform();
	const { reset } = transformControls;
	const currentIndex = clampIndex(activeIndex ?? uncontrolledIndex, items.length);
	const item = items[currentIndex];
	const hasMultipleItems = items.length > 1;
	react.useEffect(() => {
		if (open) reset();
	}, [
		currentIndex,
		open,
		reset
	]);
	react.useEffect(() => {
		if (activeIndex == null) setUncontrolledIndex((current) => clampIndex(current, items.length));
	}, [activeIndex, items.length]);
	const setActiveIndex = react.useCallback((nextIndex) => {
		const clampedIndex = clampIndex(nextIndex, items.length);
		if (activeIndex == null) setUncontrolledIndex(clampedIndex);
		onActiveIndexChange?.(clampedIndex);
	}, [
		activeIndex,
		items.length,
		onActiveIndexChange
	]);
	const showPrevious = react.useCallback(() => {
		setActiveIndex(Math.max(0, currentIndex - 1));
	}, [currentIndex, setActiveIndex]);
	const showNext = react.useCallback(() => {
		setActiveIndex(Math.min(items.length - 1, currentIndex + 1));
	}, [
		currentIndex,
		items.length,
		setActiveIndex
	]);
	const close = react.useCallback(() => {
		onOpenChange(false);
	}, [onOpenChange]);
	if (!item) return null;
	const actionContext = {
		close,
		index: currentIndex,
		items,
		resetTransform: reset,
		transform: transformControls.transform
	};
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Dialog, {
		open,
		onOpenChange,
		children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(DialogContent, {
			"aria-describedby": void 0,
			className: require_avatar.cn("fixed top-0 left-0 z-[80] h-screen w-screen max-w-none translate-x-0 translate-y-0 overflow-hidden rounded-none border-0 bg-transparent p-0 shadow-none data-[state=closed]:animate-none data-[state=open]:animate-none sm:max-w-none", className),
			"data-testid": "image-preview-dialog",
			onKeyDown: (event) => {
				if (!hasMultipleItems) return;
				if (event.key === "ArrowLeft") {
					event.preventDefault();
					showPrevious();
				}
				if (event.key === "ArrowRight") {
					event.preventDefault();
					showNext();
				}
			},
			overlayClassName: require_avatar.cn("bg-black/70 data-[state=closed]:animate-none data-[state=open]:animate-none", overlayClassName),
			showCloseButton: false,
			children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "relative h-full w-full",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(DialogTitle, {
						className: "sr-only",
						children: mergedLabels.dialogTitle ?? mergedLabels.close
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
						"aria-label": mergedLabels.close,
						className: "absolute top-[calc(1rem+var(--image-preview-titlebar-height,0px))] right-4 z-20 size-9 rounded-none bg-transparent p-0 text-white shadow-none transition-none hover:bg-transparent hover:text-white",
						onClick: close,
						size: "icon",
						type: "button",
						variant: "ghost",
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(lucide_react.X, { className: "size-5" })
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: require_avatar.cn("absolute inset-0 px-6 pt-14 pb-20 sm:px-20 sm:pt-16 sm:pb-24", contentClassName),
						onClick: (event) => {
							if (event.target === event.currentTarget) close();
						},
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ImagePreviewViewport, {
							actionContext,
							actions,
							imageClassName,
							item,
							onActionError,
							onBackdropClick: close,
							transformControls
						})
					}),
					hasMultipleItems && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
						"aria-label": mergedLabels.previous,
						className: "absolute top-1/2 left-4 z-10 size-10 -translate-y-1/2 rounded-full border-border bg-popover text-popover-foreground shadow-md hover:bg-accent hover:text-accent-foreground disabled:opacity-30",
						disabled: currentIndex === 0,
						onClick: showPrevious,
						size: "icon",
						type: "button",
						variant: "outline",
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(lucide_react.ChevronLeft, { className: "size-5" })
					}),
					hasMultipleItems && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
						"aria-label": mergedLabels.next,
						className: "absolute top-1/2 right-4 z-10 size-10 -translate-y-1/2 rounded-full border-border bg-popover text-popover-foreground shadow-md hover:bg-accent hover:text-accent-foreground disabled:opacity-30",
						disabled: currentIndex === items.length - 1,
						onClick: showNext,
						size: "icon",
						type: "button",
						variant: "outline",
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(lucide_react.ChevronRight, { className: "size-5" })
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: "absolute bottom-6 left-1/2 z-10 -translate-x-1/2 sm:bottom-8",
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ImagePreviewToolbar, {
							actions: toolbarActions,
							context: actionContext,
							item,
							labels: mergedLabels,
							onActionError,
							transformControls
						})
					})
				]
			})
		})
	});
}
//#endregion
//#region src/components/composites/image-preview/image-preview-trigger.tsx
function ImagePreviewTrigger({ alt, className, dialogProps, item, items, onClick, preview = true, ...props }) {
	const [open, setOpen] = react.useState(false);
	const previewItems = react.useMemo(() => items ?? [item], [item, items]);
	const initialIndex = react.useMemo(() => Math.max(0, previewItems.findIndex((previewItem) => previewItem.id === item.id)), [item.id, previewItems]);
	const [activeIndex, setActiveIndex] = react.useState(initialIndex);
	return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("img", {
		alt: alt ?? item.alt ?? item.title ?? "",
		className: require_avatar.cn(preview && "cursor-zoom-in", className),
		onClick: (event) => {
			onClick?.(event);
			if (!event.defaultPrevented && preview) {
				setActiveIndex(initialIndex);
				setOpen(true);
			}
		},
		src: item.src,
		...props
	}), preview && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ImagePreviewDialog, {
		...dialogProps,
		activeIndex,
		items: previewItems,
		onActiveIndexChange: setActiveIndex,
		onOpenChange: setOpen,
		open
	})] });
}
//#endregion
//#region src/components/composites/menu-list/menu-item.tsx
const menuItemVariants = (0, class_variance_authority.cva)(require_avatar.cn("group relative flex w-full items-center gap-2.5 rounded-lg font-normal", "border border-transparent", "transition-all duration-150", "outline-none select-none", "focus-visible:bg-accent", "disabled:pointer-events-none disabled:opacity-40", "[&_svg]:pointer-events-none [&_svg]:shrink-0"), {
	variants: {
		variant: {
			default: require_avatar.cn("text-foreground", "hover:bg-accent", "data-[active=true]:bg-accent", "data-[active=true]:border-transparent"),
			ghost: require_avatar.cn("text-foreground", "hover:bg-accent", "data-[active=true]:bg-accent")
		},
		size: {
			default: "px-2.5 py-1.5 text-sm",
			sm: "px-2.5 py-1 text-xs"
		}
	},
	defaultVariants: {
		variant: "default",
		size: "default"
	}
});
function MenuItem({ className, variant, size, icon, label, labelClassName, description, descriptionLines, descriptionClassName, active, disabled, suffix, asChild, ref, ...props }) {
	const Comp = asChild ? _radix_ui_react_slot.Slot : "button";
	const descriptionStyle = descriptionLines && descriptionLines > 0 ? {
		display: "-webkit-box",
		WebkitBoxOrient: "vertical",
		WebkitLineClamp: descriptionLines
	} : void 0;
	return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(Comp, {
		ref,
		type: asChild ? void 0 : "button",
		"data-active": active || void 0,
		"data-slot": "menu-item",
		disabled: disabled || void 0,
		className: require_avatar.cn(menuItemVariants({
			variant,
			size
		}), className),
		...props,
		children: [
			icon && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
				className: "flex shrink-0 items-center justify-center",
				children: icon
			}),
			/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
				className: require_avatar.cn("min-w-0 text-left", suffix && "flex-1"),
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: require_avatar.cn("block truncate", labelClassName),
					children: label
				}), description && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: require_avatar.cn("mt-0.5 block text-[10px] text-muted-foreground", descriptionLines ? "overflow-hidden" : "", descriptionClassName),
					style: descriptionStyle,
					children: description
				})]
			}),
			suffix && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
				className: "ml-auto flex shrink-0 items-center",
				children: suffix
			})
		]
	});
}
MenuItem.displayName = "MenuItem";
function MenuList({ className, ref, ...props }) {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
		ref,
		"data-slot": "menu-list",
		className: require_avatar.cn("flex flex-col gap-1", className),
		...props
	});
}
MenuList.displayName = "MenuList";
function MenuDivider({ className, ref, ...props }) {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
		ref,
		"data-slot": "menu-divider",
		role: "separator",
		className: require_avatar.cn("my-1 h-px bg-border", className),
		...props
	});
}
MenuDivider.displayName = "MenuDivider";
//#endregion
//#region src/components/composites/page-header/page-header.tsx
function PageHeader({ title, titleClassName, action, bordered, className, ...props }) {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
		"data-slot": "page-header",
		className: require_avatar.cn("mt-2 mb-2 flex h-8 shrink-0 items-center justify-between gap-2 pr-3 pl-5", bordered && "border-b border-border", className),
		...props,
		children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h2", {
			className: require_avatar.cn("min-w-0 flex-1 truncate text-sm leading-4 font-medium text-foreground", titleClassName),
			children: title
		}), action]
	});
}
PageHeader.displayName = "PageHeader";
//#endregion
//#region src/components/composites/sortable/item-renderer.tsx
function ItemRenderer({ ref, index, item, renderItem, dragging, dragDisabled, dragOverlay, ghost, dragHandleProps, itemStyle }) {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
		ref,
		"data-index": index,
		role: dragDisabled ? "group" : void 0,
		tabIndex: dragDisabled ? -1 : void 0,
		className: "box-border origin-top-left touch-manipulation",
		style: {
			...itemStyle,
			...dragOverlay ? {
				"--scale": 1.02,
				zIndex: 999,
				position: "relative"
			} : {}
		},
		children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
			style: {
				position: "relative",
				boxSizing: "border-box",
				touchAction: "manipulation",
				transformOrigin: "50% 50%",
				transform: dragOverlay ? "scale(var(--scale))" : "scale(var(--scale, 1))",
				zIndex: dragging && !dragOverlay ? 0 : void 0,
				opacity: dragging && !dragOverlay ? ghost ? .25 : 0 : 1,
				cursor: dragOverlay ? "inherit" : itemStyle?.cursor ?? "pointer",
				pointerEvents: dragOverlay ? "none" : void 0
			},
			children: renderItem(item, {
				dragging: !!dragging,
				overlay: !!dragOverlay,
				dragHandleProps
			})
		})
	});
}
//#endregion
//#region src/components/composites/sortable/sortable-item.tsx
function SortableItem({ item, id, index, renderItem, disabled = false, dragDisabled = false, useDragOverlay = true, showGhost = true, itemStyle, collisionDetector, dragHandle = false }) {
	const { ref, handleRef, isDragSource } = (0, _dnd_kit_react_sortable.useSortable)({
		id,
		index,
		disabled: !disabled && dragDisabled ? {
			draggable: true,
			droppable: false
		} : disabled,
		collisionDetector,
		transition: itemStyle?.transition === "none" ? null : void 0
	});
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ItemRenderer, {
		ref,
		item,
		index,
		renderItem,
		dragging: isDragSource,
		dragDisabled,
		dragOverlay: !useDragOverlay && isDragSource,
		ghost: showGhost && useDragOverlay && isDragSource,
		dragHandleProps: dragHandle ? { ref: handleRef } : void 0,
		itemStyle
	});
}
//#endregion
//#region src/components/composites/sortable/sortable.tsx
function preventActivation(event, source) {
	const target = event.target;
	const noDnd = target.closest("[data-no-dnd]");
	if (noDnd && source.element?.contains(noDnd)) return true;
	if (target.closest("[data-dnd-row-control]")) return false;
	return _dnd_kit_react.PointerSensor.defaults.preventActivation?.(event, source) ?? false;
}
function activationConstraints(event) {
	if (event.pointerType === "touch") return [new _dnd_kit_dom.PointerActivationConstraints.Delay({
		value: 250,
		tolerance: 5
	})];
	return [new _dnd_kit_dom.PointerActivationConstraints.Distance({ value: 8 })];
}
const SENSORS = [_dnd_kit_react.PointerSensor.configure({
	activationConstraints,
	preventActivation
}), _dnd_kit_react.KeyboardSensor];
const RESTRICT_TO_SCROLLABLE_ANCESTOR = _dnd_kit_dom_modifiers.RestrictToElement.configure({ element: ({ source }) => source?.element ? (0, _dnd_kit_dom_utilities.getFirstScrollableAncestor)(source.element) : null });
/**
* Pointer capture hides the gesture from the row, so a long-press timer it holds (Radix ContextMenu)
* would fire after the finger moved or lifted and open a modal menu. The timer clears on `pointermove`.
*/
function releaseRowLongPress(activatorEvent) {
	if (!(activatorEvent instanceof PointerEvent) || activatorEvent.pointerType === "mouse") return;
	const { target, pointerType, clientX, clientY } = activatorEvent;
	target?.dispatchEvent(new PointerEvent("pointermove", {
		bubbles: true,
		pointerType,
		clientX,
		clientY
	}));
}
function createPlugins({ screenReaderInstructions, announcements }) {
	const options = {
		screenReaderInstructions,
		announcements: announcements && {
			dragstart: ({ operation: { source } }) => source ? announcements.onDragStart({ activeId: source.id }) : void 0,
			dragover: ({ operation: { source, target } }) => source && source.id !== target?.id ? announcements.onDragOver({
				activeId: source.id,
				overId: target?.id ?? null
			}) : void 0,
			dragend: ({ operation: { source }, canceled }) => {
				if (!source) return void 0;
				return (canceled ? announcements.onDragCancel : announcements.onDragEnd)({ activeId: source.id });
			}
		}
	};
	const configured = _dnd_kit_dom.Accessibility.configure(options);
	return (defaults) => defaults.map((plugin) => plugin === _dnd_kit_dom.Accessibility ? configured : plugin);
}
/**
* An overlay that steals focus without hiding the page (Windows `Win+Shift+S`) swallows the
* `pointerup`, so the dragged item would stay glued to the cursor, swallowing every later click.
*/
function CancelDragOnWindowBlur() {
	const manager = (0, _dnd_kit_react.useDragDropManager)();
	(0, react.useEffect)(() => {
		if (!manager) return;
		const cancelDrag = () => {
			manager.actions.stop({ canceled: true });
			manager.sensors.forEach((sensor) => sensor.destroy());
		};
		window.addEventListener("blur", cancelDrag);
		return () => window.removeEventListener("blur", cancelDrag);
	}, [manager]);
	return null;
}
function Sortable({ items, itemKey, onSortEnd, onDragStart: customOnDragStart, onDragEnd: customOnDragEnd, onDragCancel: customOnDragCancel, renderItem, layout = "list", horizontal = false, useDragOverlay = true, collisionDetection, showGhost = false, className, disabled = false, isItemDragDisabled, listStyle, itemStyle, gap, restrictions, dragHandle = false, accessibility }) {
	const getId = (0, react.useCallback)((item) => typeof itemKey === "function" ? itemKey(item) : item[itemKey], [itemKey]);
	const itemIds = (0, react.useMemo)(() => items.map(getId), [items, getId]);
	const itemById = (0, react.useMemo)(() => new Map(items.map((item, index) => [itemIds[index], item])), [items, itemIds]);
	const [previewIds, setPreviewIds] = (0, react.useState)(null);
	const latestPreviewIds = (0, react.useRef)(null);
	const longPressReleased = (0, react.useRef)(false);
	const orderedItems = (0, react.useMemo)(() => previewIds?.flatMap((id) => {
		const item = itemById.get(id);
		return item === void 0 ? [] : [item];
	}) ?? items, [
		itemById,
		items,
		previewIds
	]);
	const updatePreview = (ids) => {
		latestPreviewIds.current = ids;
		setPreviewIds(ids);
	};
	const handleDragStart = ({ operation: { source } }) => {
		longPressReleased.current = false;
		if (source) customOnDragStart?.({ activeId: source.id });
	};
	const handleDragMove = ({ operation: { activatorEvent } }) => {
		if (longPressReleased.current) return;
		longPressReleased.current = true;
		releaseRowLongPress(activatorEvent);
	};
	const handleDragOver = (event, manager) => {
		event.preventDefault();
		if (manager.dragOperation.controller?.signal.aborted) return;
		const { source, target } = event.operation;
		if (!source || !target || source.id === target.id) return;
		const order = latestPreviewIds.current ?? itemIds;
		const fromIndex = order.indexOf(source.id);
		const toIndex = order.indexOf(target.id);
		if (fromIndex === -1 || toIndex === -1) return;
		manager.collisionObserver.disable();
		updatePreview((0, _dnd_kit_helpers.arrayMove)(order, fromIndex, toIndex));
		manager.renderer.rendering.then(() => manager.actions.setDropTarget(source.id)).then(() => manager.collisionObserver.enable());
	};
	const handleDragEnd = ({ canceled, operation: { source, activatorEvent } }) => {
		const order = latestPreviewIds.current;
		updatePreview(null);
		releaseRowLongPress(activatorEvent);
		if (canceled) {
			customOnDragCancel?.();
			return;
		}
		customOnDragEnd?.();
		if (source && order) {
			const oldIndex = itemIds.indexOf(source.id);
			const newIndex = order.filter((id) => itemById.has(id)).indexOf(source.id);
			if (oldIndex !== newIndex) onSortEnd({
				oldIndex,
				newIndex
			});
		}
	};
	const { windowEdges = false, scrollableAncestor = false } = restrictions ?? {};
	const modifiers = (0, react.useMemo)(() => [
		...layout === "list" ? [horizontal ? _dnd_kit_abstract_modifiers.RestrictToHorizontalAxis : _dnd_kit_abstract_modifiers.RestrictToVerticalAxis] : [],
		...windowEdges ? [_dnd_kit_dom_modifiers.RestrictToWindow] : [],
		...scrollableAncestor ? [RESTRICT_TO_SCROLLABLE_ANCESTOR] : []
	], [
		layout,
		horizontal,
		windowEdges,
		scrollableAncestor
	]);
	const plugins = (0, react.useMemo)(() => accessibility ? createPlugins(accessibility) : void 0, [accessibility]);
	return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(_dnd_kit_react.DragDropProvider, {
		sensors: SENSORS,
		modifiers,
		plugins,
		onDragStart: handleDragStart,
		onDragMove: handleDragMove,
		onDragOver: handleDragOver,
		onDragEnd: handleDragEnd,
		children: [
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)(CancelDragOnWindowBlur, {}),
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: require_avatar.cn(layout === "grid" ? "grid w-full grid-cols-[repeat(auto-fill,minmax(280px,1fr))] max-md:grid-cols-1" : require_avatar.cn("flex", horizontal ? "flex-row items-center" : "w-full flex-col items-stretch"), className),
				"data-layout": layout,
				"data-direction": horizontal ? "horizontal" : "vertical",
				style: {
					...listStyle,
					gap
				},
				children: orderedItems.map((item, index) => {
					const id = getId(item);
					return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(SortableItem, {
						id,
						index,
						item,
						renderItem,
						disabled,
						dragDisabled: isItemDragDisabled?.(item),
						useDragOverlay,
						showGhost,
						itemStyle,
						collisionDetector: collisionDetection === "closest-center" ? _dnd_kit_collision.closestCenter : void 0,
						dragHandle
					}, id);
				})
			}),
			useDragOverlay && (0, react_dom.createPortal)(/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_dnd_kit_react.DragOverlay, { children: (source) => {
				const item = itemById.get(source.id);
				return item === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ItemRenderer, {
					item,
					renderItem,
					itemStyle,
					dragOverlay: true
				});
			} }), document.body)
		]
	});
}
//#endregion
//#region src/components/composites/sortable/utils.ts
/**
* Pointer sensor that also cancels the drag when the window loses focus.
*
* dnd-kit only cancels on `resize` and `visibilitychange`. An overlay that steals focus without
* hiding the page (Windows `Win+Shift+S`) swallows the `pointerup`, so neither fires and the dragged
* item stays glued to the cursor, swallowing every later click.
*/
var BlurCancelPointerSensor = class extends _dnd_kit_core.PointerSensor {
	constructor(props) {
		const view = (0, _dnd_kit_utilities.getWindow)(props.event.target);
		const blurListener = { current: null };
		const stopListeningForBlur = () => {
			if (!blurListener.current) return;
			view.removeEventListener("blur", blurListener.current);
			blurListener.current = null;
		};
		super({
			...props,
			onCancel: () => {
				stopListeningForBlur();
				props.onCancel();
			},
			onEnd: () => {
				stopListeningForBlur();
				props.onEnd();
			}
		});
		blurListener.current = () => this.handleCancel();
		view.addEventListener("blur", blurListener.current);
	}
};
//#endregion
//#region src/components/composites/reorderable-list/index.tsx
function ReorderableList({ items, visibleItems = items, getId, renderItem, onReorder, layout = "list", direction = "vertical", disabled = false, isItemDragDisabled, className, listStyle, itemStyle, gap, useDragOverlay = true, showGhost = true, dragHandle = false, accessibility, restrictions, onDragStateChange, onReorderError }) {
	const visibleIndexById = (0, react.useMemo)(() => {
		return new Map(visibleItems.map((item, index) => [getId(item), index]));
	}, [getId, visibleItems]);
	const handleSortEnd = (0, react.useCallback)(({ oldIndex, newIndex }) => {
		if (disabled) return;
		const nextItems = require_reorder_visible_subset.reorderVisibleSubset({
			items,
			visibleItems,
			fromIndex: oldIndex,
			toIndex: newIndex,
			getId
		});
		if (nextItems !== items) Promise.resolve(onReorder(nextItems)).catch((error) => {
			if (onReorderError) {
				onReorderError(error);
				return;
			}
			globalThis.console.error("ReorderableList onReorder failed", error);
		});
	}, [
		disabled,
		getId,
		items,
		onReorder,
		onReorderError,
		visibleItems
	]);
	const handleDragStart = (0, react.useCallback)(() => {
		if (!disabled) onDragStateChange?.(true);
	}, [disabled, onDragStateChange]);
	const handleDragEnd = (0, react.useCallback)(() => {
		onDragStateChange?.(false);
	}, [onDragStateChange]);
	const handleDragCancel = (0, react.useCallback)(() => {
		onDragStateChange?.(false);
	}, [onDragStateChange]);
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Sortable, {
		items: visibleItems,
		itemKey: getId,
		onSortEnd: handleSortEnd,
		onDragStart: handleDragStart,
		onDragEnd: handleDragEnd,
		onDragCancel: handleDragCancel,
		renderItem: (item, state) => renderItem(item, visibleIndexById.get(getId(item)) ?? -1, state),
		layout,
		horizontal: direction === "horizontal",
		className,
		disabled,
		isItemDragDisabled,
		listStyle,
		itemStyle,
		gap,
		restrictions,
		useDragOverlay,
		showGhost,
		dragHandle,
		accessibility
	});
}
//#endregion
//#region src/components/composites/composite-input/composite-input.tsx
const inputGroupVariants = (0, class_variance_authority.cva)([
	"h-auto",
	"rounded-md",
	"has-[[data-slot=input-group-control]:focus-visible]:border-ring"
], {
	variants: { disabled: {
		false: null,
		true: [
			"bg-background-subtle",
			"border-input",
			"cursor-not-allowed"
		]
	} },
	defaultVariants: { disabled: false }
});
const inputVariants = (0, class_variance_authority.cva)([
	"p-0",
	"h-fit",
	"min-w-0"
], {
	variants: {
		size: {
			sm: ["text-sm", "leading-4"],
			md: ["leading-4.5"],
			lg: ["text-lg", "leading-5"]
		},
		variant: {
			default: [],
			button: [],
			email: [],
			select: []
		},
		disabled: {
			false: null,
			true: [
				"text-foreground-disabled",
				"placeholder:text-foreground-disabled",
				"disabled:opacity-100"
			]
		}
	},
	defaultVariants: {
		size: "md",
		variant: "default",
		disabled: false
	}
});
const inputWrapperVariants = (0, class_variance_authority.cva)([
	"flex",
	"flex-1",
	"items-center",
	"gap-2"
], {
	variants: {
		size: {
			sm: ["p-3"],
			md: [
				"p-3",
				"h-5.5",
				"box-content"
			],
			lg: ["px-4", "py-3"]
		},
		variant: {
			default: [],
			button: "border-r-[1px]",
			email: [],
			select: []
		},
		disabled: {
			false: null,
			true: "border-border-subtle"
		}
	},
	defaultVariants: { disabled: false }
});
const iconVariants = (0, class_variance_authority.cva)([], {
	variants: {
		size: {
			sm: "size-4.5",
			md: "size-5",
			lg: "size-6"
		},
		disabled: {
			false: null,
			true: "text-foreground-disabled"
		}
	},
	defaultVariants: {
		size: "md",
		disabled: false
	}
});
const iconButtonVariants = (0, class_variance_authority.cva)(["cursor-pointer text-muted-foreground transition-colors", "hover:shadow-none"], {
	variants: { disabled: {
		false: null,
		true: []
	} },
	defaultVariants: { disabled: false }
});
const buttonVariants = (0, class_variance_authority.cva)([
	"py-3",
	"flex flex-col",
	"cursor-pointer text-muted-foreground transition-colors",
	"hover:shadow-none"
], {
	variants: {
		size: {
			sm: "px-3",
			md: "px-3",
			lg: "px-4"
		},
		disabled: {
			false: null,
			true: ["pointer-events-none"]
		}
	},
	defaultVariants: {
		size: "md",
		disabled: false
	}
});
const buttonLabelVariants = (0, class_variance_authority.cva)([], {
	variants: {
		size: {
			sm: "text-sm leading-4",
			md: "leading-4.5",
			lg: "text-lg leading-5 tracking-normal"
		},
		disabled: {
			false: null,
			true: ["text-foreground-disabled"]
		}
	},
	defaultVariants: {
		size: "md",
		disabled: false
	}
});
const prefixVariants = (0, class_variance_authority.cva)([
	"font-medium",
	"border-r-[1px]",
	"text-muted-foreground"
], {
	variants: {
		size: {
			sm: ["text-sm leading-4", "p-3"],
			md: ["leading-4.5", "p-3"],
			lg: ["leading-5 tracking-normal", "px-4 py-3"]
		},
		disabled: {
			false: null,
			true: "text-foreground-disabled"
		}
	},
	defaultVariants: {
		size: "md",
		disabled: false
	}
});
const selectPrefixVariants = (0, class_variance_authority.cva)([
	"font-medium",
	"border-r-[1px]",
	"text-muted-foreground",
	"p-0"
], {
	variants: {
		size: {
			sm: "text-sm leading-4",
			md: "leading-4.5",
			lg: "leading-5 tracking-normal"
		},
		disabled: {
			false: null,
			true: "text-foreground-disabled"
		}
	},
	defaultVariants: {
		size: "md",
		disabled: false
	}
});
const selectTriggerVariants = (0, class_variance_authority.cva)([
	"box-content border-none bg-transparent pl-3 aria-expanded:border-none aria-expanded:ring-0",
	"*:data-[slot=select-value]:text-foreground",
	"[&_svg]:text-secondary-foreground!"
], { variants: { size: {
	sm: [
		"h-5",
		"py-3 pr-3 pl-6",
		"*:data-[slot=select-value]:text-sm"
	],
	md: ["h-5", "py-[13px] pr-3 pl-6"],
	lg: [
		"h-6",
		"py-3 pr-4 pl-7",
		"*:data-[slot=select-value]:text-lg"
	]
} } });
const selectTriggerLabelVariants = (0, class_variance_authority.cva)([], { variants: { size: {
	sm: "text-sm leading-4",
	md: "leading-4.5",
	lg: "text-lg leading-5 tracking-normal"
} } });
function ShowPasswordButton({ type, setType, size = "md", disabled }) {
	const togglePassword = (0, react.useCallback)(() => {
		if (disabled) return;
		if (type === "password") setType("text");
		else if (type === "text") setType("password");
	}, [
		disabled,
		setType,
		type
	]);
	const iconClassName = iconVariants({
		size,
		disabled
	});
	return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(InputGroupButton, {
		onClick: togglePassword,
		disabled,
		className: iconButtonVariants({ disabled }),
		children: [type === "text" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(lucide_react.EyeIcon, { className: iconClassName }), type === "password" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(lucide_react.EyeOffIcon, { className: iconClassName })]
	});
}
function CompositeInput({ type = "text", size = "md", variant = "default", disabled = false, buttonProps, prefix, selectProps, className, ...rest }) {
	const isPassword = type === "password";
	const [htmlType, setHtmlType] = (0, react.useState)("password");
	const buttonContent = (0, react.useMemo)(() => {
		if (buttonProps === void 0) {
			console.warn("CustomizedInput: 'button' variant requires a 'button' prop to be provided.");
			return null;
		} else return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(InputGroupButton, {
			className: buttonVariants({
				size,
				disabled
			}),
			onClick: buttonProps.onClick,
			children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: buttonLabelVariants({
					size,
					disabled
				}),
				children: buttonProps.label
			})
		});
	}, [
		buttonProps,
		disabled,
		size
	]);
	const emailContent = (0, react.useMemo)(() => {
		if (!prefix) {
			console.warn("CompositeInput: \"email\" variant requires a \"prefix\" prop to be provided.");
			return null;
		} else return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
			className: prefixVariants({
				size,
				disabled
			}),
			children: prefix
		});
	}, [
		disabled,
		prefix,
		size
	]);
	const selectContent = (0, react.useMemo)(() => {
		if (!selectProps) {
			console.warn("CompositeInput: \"select\" variant requires a \"selectProps\" prop to be provided.");
			return null;
		} else return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
			className: selectPrefixVariants({
				size,
				disabled
			}),
			children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(Select, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(SelectTrigger, {
				className: selectTriggerVariants({ size }),
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(SelectValue, {
					placeholder: selectProps.placeholder,
					className: selectTriggerLabelVariants({ size })
				})
			}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(SelectContent, { children: selectProps.groups.map((group, index) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(SelectGroup, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(SelectLabel, { children: group.label }), group.items.map((item) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(SelectItem, {
				value: item.value,
				children: item.label
			}, item.value))] }, index)) })] })
		});
	}, [
		disabled,
		selectProps,
		size
	]);
	return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(InputGroup, {
		className: inputGroupVariants({ disabled }),
		children: [
			variant === "email" && emailContent,
			variant === "select" && selectContent,
			/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: inputWrapperVariants({
					size,
					variant,
					disabled
				}),
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(InputGroupInput, {
					type: isPassword ? htmlType : type,
					disabled: require_utils.toUndefinedIfNull(disabled),
					className: require_avatar.cn(inputVariants({
						size,
						variant,
						disabled
					}), className),
					...rest
				}), (variant === "default" || variant === "button") && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(InputGroupAddon, {
					className: "p-0",
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(lucide_react.Edit2Icon, { className: iconVariants({
						size,
						disabled
					}) })
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(InputGroupAddon, {
					align: "inline-end",
					className: "p-0",
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ShowPasswordButton, {
						type: htmlType,
						setType: setHtmlType,
						size,
						disabled: !!disabled
					})
				})] })]
			}),
			variant === "button" && buttonContent
		]
	});
}
//#endregion
//#region src/components/composites/tree-view/flatten-tree.ts
/**
* Walks a tree of nodes depth-first, producing a flat list with depth tags.
* Children of nodes whose id is not in `expandedIds` are skipped.
*/
function flattenTree(data, adapter, expandedIds) {
	const out = [];
	const visitedIds = /* @__PURE__ */ new Set();
	const walk = (nodes, depth) => {
		for (const node of nodes) {
			const id = adapter.getId(node);
			if (visitedIds.has(id)) continue;
			visitedIds.add(id);
			out.push({
				id,
				node,
				depth
			});
			if (expandedIds.has(id)) {
				const children = adapter.getChildren(node);
				if (children && children.length > 0) walk(children, depth + 1);
			}
		}
	};
	walk(data, 0);
	return out;
}
//#endregion
//#region src/components/composites/tree-view/contexts.ts
const TreeActionsContext = (0, react.createContext)(null);
const TreeSelectionContext = (0, react.createContext)(null);
function ensure(value, name) {
	if (value === null) throw new Error(`${name} must be used inside <TreeView />`);
	return value;
}
function useTreeActions() {
	return ensure((0, react.use)(TreeActionsContext), "useTreeActions");
}
function useTreeSelection() {
	return ensure((0, react.use)(TreeSelectionContext), "useTreeSelection");
}
//#endregion
//#region src/components/composites/tree-view/tree-row.tsx
function TreeRowInner(props) {
	const { id, node, depth, hasChildren, isDragging, isDragOver, dragPosition, renderRow } = props;
	const { toggleExpanded, selectNode, getDragHandleProps } = useTreeActions();
	const { expandedIds, selectedId } = useTreeSelection();
	const isExpanded = expandedIds.has(id);
	const isSelected = selectedId === id;
	const toggle = (0, react.useCallback)(() => {
		if (hasChildren) toggleExpanded(id);
	}, [
		hasChildren,
		id,
		toggleExpanded
	]);
	const select = (0, react.useCallback)(() => {
		selectNode(id);
	}, [id, selectNode]);
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(react_jsx_runtime.Fragment, { children: renderRow({
		node,
		depth,
		isExpanded,
		isSelected,
		isDragging,
		isDragOver,
		dragPosition,
		toggleExpanded: toggle,
		selectNode: select,
		dragHandleProps: getDragHandleProps(id)
	}) });
}
const TreeRow = (0, react.memo)(TreeRowInner);
//#endregion
//#region src/components/composites/tree-view/use-expanded-state.ts
const EMPTY_SET = /* @__PURE__ */ new Set();
function useExpandedState(options) {
	const { expandedIds: controlled, defaultExpandedIds, onExpandedChange } = options;
	const isControlled = controlled !== void 0;
	const [internal, setInternal] = (0, react.useState)(defaultExpandedIds ?? EMPTY_SET);
	const internalRef = (0, react.useRef)(internal);
	internalRef.current = internal;
	const current = isControlled ? controlled : internal;
	return {
		expandedIds: current,
		toggle: (0, react.useCallback)((id) => {
			const next = new Set(isControlled ? controlled : internalRef.current);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			if (!isControlled) {
				internalRef.current = next;
				setInternal(next);
			}
			onExpandedChange?.(next);
		}, [
			controlled,
			isControlled,
			onExpandedChange
		]),
		isExpanded: (0, react.useCallback)((id) => current.has(id), [current])
	};
}
//#endregion
//#region src/components/composites/tree-view/use-selection-state.ts
function useSelectionState(options) {
	const { selectedId: controlled, defaultSelectedId, onSelectedChange } = options;
	const isControlled = controlled !== void 0;
	const [internal, setInternal] = (0, react.useState)(defaultSelectedId ?? null);
	const current = isControlled ? controlled ?? null : internal;
	return {
		selectedId: current,
		select: (0, react.useCallback)((id) => {
			if (!isControlled) setInternal(id);
			onSelectedChange?.(id);
		}, [isControlled, onSelectedChange]),
		isSelected: (0, react.useCallback)((id) => current === id, [current])
	};
}
//#endregion
//#region src/components/composites/tree-view/use-tree-drag-and-drop.ts
const NOOP = () => {};
const DISABLED_HANDLE = {
	draggable: false,
	onDragStart: NOOP,
	onDragOver: NOOP,
	onDragLeave: NOOP,
	onDrop: NOOP,
	onDragEnd: NOOP
};
function useTreeDragAndDrop(options) {
	const { onMove, canHaveChildren } = options;
	const enabled = typeof onMove === "function";
	const [draggedId, setDraggedId] = (0, react.useState)(null);
	const [dragOverId, setDragOverId] = (0, react.useState)(null);
	const [dragPosition, setDragPosition] = (0, react.useState)(null);
	const positionRef = (0, react.useRef)(null);
	const draggedIdRef = (0, react.useRef)(null);
	const clear = (0, react.useCallback)(() => {
		draggedIdRef.current = null;
		setDraggedId(null);
		setDragOverId(null);
		setDragPosition(null);
		positionRef.current = null;
	}, []);
	const handleDragStart = (0, react.useCallback)((nodeId) => (e) => {
		draggedIdRef.current = nodeId;
		setDraggedId(nodeId);
		e.dataTransfer.effectAllowed = "move";
		e.dataTransfer.setData("text/plain", nodeId);
		const el = e.currentTarget;
		if (el?.parentElement) {
			const rect = el.getBoundingClientRect();
			const ghost = el.cloneNode(true);
			ghost.style.width = `${rect.width}px`;
			ghost.style.opacity = "0.7";
			ghost.style.position = "absolute";
			ghost.style.top = "-1000px";
			document.body.appendChild(ghost);
			e.dataTransfer.setDragImage(ghost, 10, 10);
			setTimeout(() => {
				if (ghost.parentNode) document.body.removeChild(ghost);
			}, 0);
		}
	}, []);
	const handleDragOver = (0, react.useCallback)((nodeId) => (e) => {
		e.preventDefault();
		e.dataTransfer.dropEffect = "move";
		if (draggedIdRef.current === nodeId) return;
		setDragOverId(nodeId);
		const rect = e.currentTarget.getBoundingClientRect();
		const mouseY = e.clientY;
		const thresholdTop = rect.top + rect.height * .3;
		const thresholdBottom = rect.bottom - rect.height * .3;
		const allowInside = canHaveChildren ? canHaveChildren(nodeId) : true;
		let next;
		if (mouseY < thresholdTop) next = "before";
		else if (mouseY > thresholdBottom) next = "after";
		else next = allowInside ? "inside" : "after";
		positionRef.current = next;
		setDragPosition(next);
	}, [canHaveChildren]);
	const handleDragLeave = (0, react.useCallback)(() => {
		setDragOverId(null);
		setDragPosition(null);
		positionRef.current = null;
	}, []);
	const handleDrop = (0, react.useCallback)((nodeId) => (e) => {
		e.preventDefault();
		const sourceId = draggedIdRef.current;
		const fallbackPosition = canHaveChildren?.(nodeId) === false ? "after" : "inside";
		const finalPosition = positionRef.current ?? fallbackPosition;
		if (sourceId && sourceId !== nodeId && onMove) onMove(sourceId, nodeId, finalPosition);
		clear();
	}, [
		canHaveChildren,
		onMove,
		clear
	]);
	const handleDragEnd = (0, react.useCallback)(() => {
		clear();
	}, [clear]);
	const getDragHandleProps = (0, react.useMemo)(() => {
		const handleCache = /* @__PURE__ */ new Map();
		return (nodeId) => {
			if (!enabled) return DISABLED_HANDLE;
			const cached = handleCache.get(nodeId);
			if (cached) return cached;
			const handleProps = {
				draggable: true,
				onDragStart: handleDragStart(nodeId),
				onDragOver: handleDragOver(nodeId),
				onDragLeave: handleDragLeave,
				onDrop: handleDrop(nodeId),
				onDragEnd: handleDragEnd
			};
			handleCache.set(nodeId, handleProps);
			return handleProps;
		};
	}, [
		enabled,
		handleDragStart,
		handleDragOver,
		handleDragLeave,
		handleDrop,
		handleDragEnd
	]);
	return {
		draggedId: enabled ? draggedId : null,
		dragOverId: enabled ? dragOverId : null,
		dragPosition: enabled ? dragPosition : null,
		getDragHandleProps
	};
}
//#endregion
//#region src/components/composites/tree-view/tree-view.tsx
/**
* Data-agnostic tree renderer.
*
* Caller supplies:
* - `data`: root-level nodes.
* - `adapter`: how to read id / children / canHaveChildren / isSticky from a node.
* - `renderRow`: a render-prop that receives the node and its row state.
*
* Interactions are all opt-in:
* - Selection enables when `selectedId` or `onSelectedChange` is provided.
* - DnD enables only when `onMove` is provided. Without it, rows are not draggable.
*
* This is a headless renderer: callers own row markup, tree roles, roving
* focus, keyboard navigation, and rejecting descendant drops in `onMove`.
*
* Virtualization is delegated to an optional `renderList` slot — TreeView produces
* the flat list + sticky metadata but never imports a virtualizer itself.
*/
function TreeView(props) {
	const { data, adapter, expandedIds: controlledExpanded, defaultExpandedIds, onExpandedChange, selectedId: controlledSelected, defaultSelectedId, onSelectedChange, renderRow, onMove, renderList, className, emptyState } = props;
	const expanded = useExpandedState({
		expandedIds: controlledExpanded,
		defaultExpandedIds,
		onExpandedChange
	});
	const selection = useSelectionState({
		selectedId: controlledSelected,
		defaultSelectedId,
		onSelectedChange
	});
	const flat = (0, react.useMemo)(() => flattenTree(data, adapter, expanded.expandedIds), [
		data,
		adapter,
		expanded.expandedIds
	]);
	const flatById = (0, react.useMemo)(() => {
		const map = /* @__PURE__ */ new Map();
		for (const item of flat) map.set(item.id, item);
		return map;
	}, [flat]);
	const drag = useTreeDragAndDrop({
		onMove,
		canHaveChildren: (0, react.useCallback)((id) => {
			const found = flatById.get(id);
			if (!found) return false;
			const fn = adapter.canHaveChildren;
			return fn ? fn(found.node) : true;
		}, [adapter, flatById])
	});
	const actionsValue = (0, react.useMemo)(() => ({
		toggleExpanded: expanded.toggle,
		selectNode: selection.select,
		getDragHandleProps: drag.getDragHandleProps
	}), [
		expanded.toggle,
		selection.select,
		drag.getDragHandleProps
	]);
	const selectionValue = (0, react.useMemo)(() => ({
		expandedIds: expanded.expandedIds,
		selectedId: selection.selectedId
	}), [expanded.expandedIds, selection.selectedId]);
	const renderItem = (0, react.useCallback)((index) => {
		const item = flat[index];
		if (!item) return null;
		const children = adapter.getChildren(item.node);
		const hasChildren = !!(children && children.length > 0) || adapter.canHaveChildren?.(item.node) === true;
		return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(TreeRow, {
			id: item.id,
			node: item.node,
			depth: item.depth,
			hasChildren,
			isDragging: drag.draggedId === item.id,
			isDragOver: drag.dragOverId === item.id,
			dragPosition: drag.dragOverId === item.id ? drag.dragPosition : null,
			renderRow
		}, item.id);
	}, [
		flat,
		adapter,
		renderRow,
		drag.draggedId,
		drag.dragOverId,
		drag.dragPosition
	]);
	const isSticky = (0, react.useCallback)((index) => {
		const item = flat[index];
		if (!item) return false;
		return adapter.isSticky ? adapter.isSticky(item.node) : false;
	}, [adapter, flat]);
	const getItemDepth = (0, react.useCallback)((index) => flat[index]?.depth ?? 0, [flat]);
	if (flat.length === 0 && emptyState !== void 0) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
		className: require_avatar.cn("flex h-full w-full items-center justify-center", className),
		children: emptyState
	});
	const body = renderList ? renderList({
		flat,
		isSticky,
		getItemDepth,
		renderItem
	}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
		className: require_avatar.cn("flex flex-col", className),
		children: flat.map((_item, index) => renderItem(index))
	});
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(TreeActionsContext, {
		value: actionsValue,
		children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(TreeSelectionContext, {
			value: selectionValue,
			children: body
		})
	});
}
//#endregion
//#region src/components/primitives/accordion.tsx
function Accordion({ ...props }) {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_radix_ui_react_accordion.Root, {
		"data-slot": "accordion",
		...props
	});
}
function AccordionItem({ className, ...props }) {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_radix_ui_react_accordion.Item, {
		"data-slot": "accordion-item",
		className: require_avatar.cn("border-b border-border/60 first:border-t last:border-b-0", className),
		...props
	});
}
function AccordionTrigger({ className, children, ...props }) {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_radix_ui_react_accordion.Header, {
		className: "flex",
		children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(_radix_ui_react_accordion.Trigger, {
			"data-slot": "accordion-trigger",
			className: require_avatar.cn("flex flex-1 items-center justify-between gap-4 rounded-md py-4 text-left text-sm leading-4 font-semibold text-foreground/90", "transition-colors outline-none", "focus-visible:bg-accent/50", "disabled:pointer-events-none disabled:opacity-50", "[&[data-state=open]>svg]:rotate-180", className),
			...props,
			children: [children, /* @__PURE__ */ (0, react_jsx_runtime.jsx)(lucide_react.ChevronDownIcon, { className: "pointer-events-none size-4 shrink-0 text-foreground/60 transition-transform duration-200" })]
		})
	});
}
function AccordionContent({ className, contentClassName, children, ...props }) {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_radix_ui_react_accordion.Content, {
		"data-slot": "accordion-content",
		className: require_avatar.cn("overflow-hidden text-sm leading-5 text-foreground/60 data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down", contentClassName),
		...props,
		children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
			className: require_avatar.cn("pt-2 pb-4", className),
			children
		})
	});
}
//#endregion
//#region src/components/primitives/alert.tsx
const alertVariants = (0, class_variance_authority.cva)(require_avatar.cn("relative flex w-full items-start gap-3 rounded-md border px-3 py-2.5 text-sm leading-5 shadow-xs", "[&_svg]:pointer-events-none [&_svg]:shrink-0"), {
	variants: { type: {
		info: "border-info-border bg-info-subtle text-info-subtle-foreground",
		success: "border-success-border bg-success-subtle text-success-subtle-foreground",
		warning: "border-warning-border bg-warning-subtle text-warning-subtle-foreground",
		error: "border-error-border bg-error-subtle text-error-subtle-foreground"
	} },
	defaultVariants: { type: "info" }
});
const alertIconVariants = (0, class_variance_authority.cva)("", {
	variants: { type: {
		info: "text-info",
		success: "text-success",
		warning: "text-warning",
		error: "text-error"
	} },
	defaultVariants: { type: "info" }
});
const alertIconContainerVariants = (0, class_variance_authority.cva)("mt-0.5 flex shrink-0 items-center", {
	variants: { type: {
		info: "text-info [&_.lucide:not(.lucide-custom)]:!text-info",
		success: "text-success [&_.lucide:not(.lucide-custom)]:!text-success",
		warning: "text-warning [&_.lucide:not(.lucide-custom)]:!text-warning",
		error: "text-error [&_.lucide:not(.lucide-custom)]:!text-error"
	} },
	defaultVariants: { type: "info" }
});
const alertIcons = {
	info: lucide_react.Info,
	success: lucide_react.CheckCircle2,
	warning: lucide_react.TriangleAlert,
	error: lucide_react.XCircle
};
function Alert({ className, type = "info", message, description, action, icon, showIcon = false, children, role, ref, ...props }) {
	const Icon = alertIcons[type ?? "info"];
	return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
		ref,
		role: role ?? (type === "error" ? "alert" : "status"),
		"data-slot": "alert",
		"data-type": type,
		className: require_avatar.cn(alertVariants({ type }), className),
		...props,
		children: [
			showIcon && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
				"data-slot": "alert-icon",
				"data-type": type,
				className: alertIconContainerVariants({ type }),
				children: icon ?? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Icon, {
					size: 16,
					className: require_avatar.cn("lucide-custom", alertIconVariants({ type }))
				})
			}),
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				"data-slot": "alert-content",
				className: "min-w-0 flex-1",
				children: children ?? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [message && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					"data-slot": "alert-message",
					className: "font-medium",
					children: message
				}), description && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					"data-slot": "alert-description",
					className: "mt-1 text-xs leading-5 opacity-90",
					children: description
				})] })
			}),
			action && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				"data-slot": "alert-action",
				className: "ml-2 flex shrink-0 items-center",
				children: action
			})
		]
	});
}
Alert.displayName = "Alert";
//#endregion
//#region src/components/primitives/badge.tsx
const badgeVariants = (0, class_variance_authority.cva)("inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap transition-[color,box-shadow] focus-visible:border-primary aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&>svg]:pointer-events-none [&>svg]:size-3", {
	variants: { variant: {
		default: "border-transparent bg-background-subtle text-secondary-foreground [a&]:hover:bg-primary/90",
		secondary: "border-transparent bg-secondary text-secondary-foreground [a&]:hover:bg-secondary/90",
		destructive: "border-transparent bg-[red]/10 text-destructive focus-visible:border-destructive dark:bg-destructive/60 [a&]:hover:bg-destructive/90",
		outline: "text-foreground [a&]:hover:bg-accent [a&]:hover:text-accent-foreground"
	} },
	defaultVariants: { variant: "default" }
});
function Badge({ className, variant, asChild = false, ...props }) {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(asChild ? _radix_ui_react_slot.Slot : "span", {
		"data-slot": "badge",
		className: require_avatar.cn(badgeVariants({ variant }), className),
		...props
	});
}
//#endregion
//#region src/components/primitives/breadcrumb.tsx
function Breadcrumb({ ...props }) {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("nav", {
		"aria-label": "breadcrumb",
		"data-slot": "breadcrumb",
		...props
	});
}
function BreadcrumbList({ className, ...props }) {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("ol", {
		"data-slot": "breadcrumb-list",
		className: require_avatar.cn("flex flex-wrap items-center gap-2 text-sm break-words text-muted-foreground sm:gap-2.5", className),
		...props
	});
}
function BreadcrumbItem({ className, ...props }) {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("li", {
		"data-slot": "breadcrumb-item",
		className: require_avatar.cn("inline-flex items-center gap-1.5", className),
		...props
	});
}
function BreadcrumbLink({ asChild, className, ...props }) {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(asChild ? _radix_ui_react_slot.Slot : "a", {
		"data-slot": "breadcrumb-link",
		className: require_avatar.cn("transition-colors hover:text-foreground", className),
		...props
	});
}
function BreadcrumbPage({ className, ...props }) {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
		"data-slot": "breadcrumb-page",
		role: "link",
		"aria-disabled": "true",
		"aria-current": "page",
		className: require_avatar.cn("font-normal text-foreground", className),
		...props
	});
}
function BreadcrumbSeparator({ children, className, ...props }) {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("li", {
		"data-slot": "breadcrumb-separator",
		role: "presentation",
		"aria-hidden": "true",
		className: require_avatar.cn("[&>svg]:size-3.5", className),
		...props,
		children: children ?? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(lucide_react.ChevronRight, {})
	});
}
function BreadcrumbEllipsis({ className, ...props }) {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
		"data-slot": "breadcrumb-ellipsis",
		role: "presentation",
		"aria-hidden": "true",
		className: require_avatar.cn("flex size-9 items-center justify-center", className),
		...props,
		children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(lucide_react.MoreHorizontal, { className: "size-4" }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
			className: "sr-only",
			children: "More"
		})]
	});
}
//#endregion
//#region src/components/primitives/separator.tsx
function Separator({ className, orientation = "horizontal", decorative = true, ...props }) {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_radix_ui_react_separator.Root, {
		"data-slot": "separator",
		decorative,
		orientation,
		className: require_avatar.cn("shrink-0 bg-border data-[orientation=horizontal]:h-px data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full data-[orientation=vertical]:w-px", className),
		...props
	});
}
//#endregion
//#region src/components/primitives/button-group.tsx
const buttonGroupVariants = (0, class_variance_authority.cva)("flex w-fit items-stretch *:focus-visible:relative *:focus-visible:z-10 has-[>[data-slot=button-group]]:gap-2 [&>[data-slot=button-group-item]>[data-slot=button][data-variant=default]]:relative [&>[data-slot=button-group-item]>[data-slot=button][data-variant=default]]:z-1 [&>[data-slot=button-group-item]>[data-slot=button][data-variant=default]]:bg-primary/10 [&>[data-slot=button-group-item]>[data-slot=button][data-variant=default]]:text-primary [&>[data-slot=button-group-item]>[data-slot=button][data-variant=default]]:shadow-[inset_0_0_0_1px_var(--primary)]/20 [&>[data-slot=button-group-item]>[data-slot=button][data-variant=default]]:hover:bg-primary/15 [&>[data-slot=button][data-variant=default]]:relative [&>[data-slot=button][data-variant=default]]:z-1 [&>[data-slot=button][data-variant=default]]:bg-primary/10 [&>[data-slot=button][data-variant=default]]:text-primary [&>[data-slot=button][data-variant=default]]:shadow-[inset_0_0_0_1px_var(--primary)]/20 [&>[data-slot=button][data-variant=default]]:hover:bg-primary/15 has-[select[aria-hidden=true]:last-child]:[&>[data-slot=select-trigger]:last-of-type]:rounded-r-md [&>[data-slot=select-trigger]:not([class*='w-'])]:w-fit [&>input]:flex-1", {
	variants: {
		orientation: {
			horizontal: "",
			vertical: "flex-col"
		},
		attached: {
			true: "",
			false: "gap-2"
		}
	},
	compoundVariants: [{
		orientation: "horizontal",
		attached: true,
		className: "[&>*:not(:first-child)]:-ml-px [&>*:not(:first-child)]:rounded-l-none [&>*:not(:first-child)]:border-l-0 [&>*:not(:last-child)]:rounded-r-none [&>[data-slot=button-group-item]:not(:first-child)>:is([data-slot=button],[data-slot=input],[data-slot=select-trigger])]:rounded-l-none [&>[data-slot=button-group-item]:not(:first-child)>:is([data-slot=button],[data-slot=input],[data-slot=select-trigger])]:border-l-0 [&>[data-slot=button-group-item]:not(:last-child)>:is([data-slot=button],[data-slot=input],[data-slot=select-trigger])]:rounded-r-none"
	}, {
		orientation: "vertical",
		attached: true,
		className: "flex-col [&>*:not(:first-child)]:-mt-px [&>*:not(:first-child)]:rounded-t-none [&>*:not(:first-child)]:border-t-0 [&>*:not(:last-child)]:rounded-b-none [&>[data-slot=button-group-item]:not(:first-child)>:is([data-slot=button],[data-slot=input],[data-slot=select-trigger])]:rounded-t-none [&>[data-slot=button-group-item]:not(:first-child)>:is([data-slot=button],[data-slot=input],[data-slot=select-trigger])]:border-t-0 [&>[data-slot=button-group-item]:not(:last-child)>:is([data-slot=button],[data-slot=input],[data-slot=select-trigger])]:rounded-b-none"
	}],
	defaultVariants: {
		orientation: "horizontal",
		attached: true
	}
});
function ButtonGroup({ className, orientation, attached, ...props }) {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
		role: "group",
		"data-slot": "button-group",
		"data-orientation": orientation,
		"data-attached": attached,
		className: require_avatar.cn(buttonGroupVariants({
			orientation,
			attached
		}), className),
		...props
	});
}
function ButtonGroupItem({ className, ...props }) {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
		"data-slot": "button-group-item",
		className: require_avatar.cn("relative flex min-w-0", className),
		...props
	});
}
function ButtonGroupText({ className, asChild = false, ...props }) {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(asChild ? _radix_ui_react_slot.Slot : "div", {
		className: require_avatar.cn("flex items-center gap-2 rounded-md border bg-muted px-4 text-sm font-medium shadow-xs [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4", className),
		...props
	});
}
function ButtonGroupSeparator({ className, orientation = "vertical", ...props }) {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Separator, {
		"data-slot": "button-group-separator",
		orientation,
		className: require_avatar.cn("relative m-0! self-stretch bg-input data-[orientation=vertical]:h-auto", className),
		...props
	});
}
//#endregion
//#region src/components/primitives/command.tsx
function Command({ className, ...props }) {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(cmdk.Command, {
		"data-slot": "command",
		className: require_avatar.cn("flex h-full w-full flex-col overflow-hidden rounded-md bg-popover text-popover-foreground", className),
		...props
	});
}
function CommandDialog({ title = "Command Palette", description = "Search for a command to run...", children, className, showCloseButton = true, ...props }) {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(Dialog, {
		...props,
		children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)(DialogHeader, {
			className: "sr-only",
			children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(DialogTitle, { children: title }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(DialogDescription, { children: description })]
		}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(DialogContent, {
			className: require_avatar.cn("overflow-hidden p-0", className),
			showCloseButton,
			children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Command, {
				className: "**:data-[slot=command-input-wrapper]:h-12 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group]]:px-2 [&_[cmdk-group]:not([hidden])_~[cmdk-group]]:pt-0 [&_[cmdk-input-wrapper]_svg]:h-5 [&_[cmdk-input-wrapper]_svg]:w-5 [&_[cmdk-input]]:h-12 [&_[cmdk-item]]:px-2 [&_[cmdk-item]]:py-3 [&_[cmdk-item]_svg]:h-5 [&_[cmdk-item]_svg]:w-5",
				children
			})
		})]
	});
}
function CommandInput({ className, ...props }) {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
		"data-slot": "command-input-wrapper",
		className: "flex h-9 items-center gap-2 border-b px-3",
		children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(lucide_react.SearchIcon, { className: "size-4 shrink-0 opacity-50" }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(cmdk.Command.Input, {
			"data-slot": "command-input",
			className: require_avatar.cn("flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-hidden placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50", className),
			...props
		})]
	});
}
function CommandList({ className, ...props }) {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(cmdk.Command.List, {
		"data-slot": "command-list",
		className: require_avatar.cn("max-h-[300px] scroll-py-1 overflow-x-hidden overflow-y-auto", className),
		...props
	});
}
function CommandEmpty({ ...props }) {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(cmdk.Command.Empty, {
		"data-slot": "command-empty",
		className: "py-6 text-center text-sm",
		...props
	});
}
function CommandGroup({ className, ...props }) {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(cmdk.Command.Group, {
		"data-slot": "command-group",
		className: require_avatar.cn("overflow-hidden p-1 text-foreground [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground", className),
		...props
	});
}
function CommandSeparator({ className, ...props }) {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(cmdk.Command.Separator, {
		"data-slot": "command-separator",
		className: require_avatar.cn("-mx-1 h-px bg-border", className),
		...props
	});
}
function CommandItem({ className, ...props }) {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(cmdk.Command.Item, {
		"data-slot": "command-item",
		className: require_avatar.cn("relative flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50 data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 [&_svg:not([class*='text-'])]:text-muted-foreground", className),
		...props
	});
}
function CommandShortcut({ className, ...props }) {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
		"data-slot": "command-shortcut",
		className: require_avatar.cn("ml-auto text-xs tracking-widest text-muted-foreground", className),
		...props
	});
}
//#endregion
//#region src/components/primitives/combobox.tsx
const comboboxTriggerVariants = (0, class_variance_authority.cva)(require_avatar.cn("inline-flex items-center justify-between rounded-md border-1 text-sm font-normal transition-colors outline-none", "bg-muted/20", "text-foreground"), {
	variants: {
		state: {
			default: "border-border focus-visible:border-ring",
			error: "border border-destructive!",
			disabled: "pointer-events-none cursor-not-allowed opacity-50"
		},
		size: {
			sm: "gap-1 px-2 text-xs",
			default: "gap-2 px-3",
			lg: "gap-2 px-4"
		}
	},
	defaultVariants: {
		state: "default",
		size: "default"
	}
});
const comboboxItemVariants = (0, class_variance_authority.cva)("relative flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors outline-none select-none", {
	variants: { state: {
		default: "hover:bg-accent data-[selected=true]:bg-accent",
		selected: "bg-primary/10 text-primary",
		disabled: "pointer-events-none cursor-not-allowed opacity-50"
	} },
	defaultVariants: { state: "default" }
});
const comboboxInputSizeClasses = {
	sm: "h-8 px-2 text-xs",
	default: "h-9 px-3 text-sm",
	lg: "h-10 px-4 text-sm"
};
function ComboboxOptionList({ emptyText, isSelected, manualFilterEnabled, multiple, onSelect, options, renderOptionContent, visibleOptions }) {
	const renderOption = (option, fallbackToLabel) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(CommandItem, {
		value: fallbackToLabel ? option.value || option.label : option.value,
		keywords: [
			option.label,
			option.description ?? "",
			option.group ?? ""
		],
		disabled: option.disabled,
		"aria-checked": multiple ? isSelected(option.value) : void 0,
		onSelect: () => onSelect(option.value),
		className: require_avatar.cn(comboboxItemVariants({ state: option.disabled ? "disabled" : "default" })),
		children: renderOptionContent(option)
	}, option.value);
	const renderOptionGroups = (groupOptions, fallbackToLabel) => {
		const groups = /* @__PURE__ */ new Map();
		for (const option of groupOptions) {
			const optionsInGroup = groups.get(option.group) ?? [];
			optionsInGroup.push(option);
			groups.set(option.group, optionsInGroup);
		}
		return Array.from(groups.entries()).map(([group, optionsInGroup], index) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(CommandGroup, {
			heading: group,
			children: optionsInGroup.map((option) => renderOption(option, fallbackToLabel))
		}, `${group ?? "ungrouped"}:${index}`));
	};
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(CommandList, {
		"aria-multiselectable": multiple || void 0,
		children: manualFilterEnabled ? visibleOptions.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
			className: "py-6 text-center text-sm text-muted-foreground",
			children: emptyText
		}) : renderOptionGroups(visibleOptions, true) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(CommandEmpty, { children: emptyText }), renderOptionGroups(options, false)] })
	});
}
function Combobox({ options, value: controlledValue, defaultValue, onChange, multiple = false, renderOption, renderValue, searchable = true, searchPlacement = "content", searchPlaceholder = "Search...", emptyText = "No results found.", getRemoveTagAriaLabel = (optionLabel) => `Remove ${optionLabel}`, onSearch, filterOption, error = false, disabled = false, open: controlledOpen, onOpenChange, placeholder = "Please Select", className, popoverClassName, popoverAlign, portalContainer, triggerStyle, width, size, "aria-label": ariaLabel, name, "aria-labelledby": ariaLabelledBy }) {
	const [internalOpen, setInternalOpen] = react.useState(false);
	const [internalValue, setInternalValue] = react.useState(defaultValue ?? (multiple ? [] : ""));
	const [triggerSearch, setTriggerSearch] = react.useState("");
	const [contentSearch, setContentSearch] = react.useState("");
	const [activeValue, setActiveValue] = react.useState("");
	const triggerInputRef = react.useRef(null);
	const defaultValueLabelId = react.useId();
	const defaultTriggerLabelledBy = ariaLabelledBy ? `${ariaLabelledBy} ${defaultValueLabelId}` : void 0;
	const open = controlledOpen ?? internalOpen;
	const setOpen = react.useCallback((nextOpen) => {
		if (onOpenChange) onOpenChange(nextOpen);
		else setInternalOpen(nextOpen);
	}, [onOpenChange]);
	const value = controlledValue ?? internalValue;
	const setValue = (newValue) => {
		if (controlledValue === void 0) setInternalValue(newValue);
		onChange?.(newValue);
	};
	const selectedOption = !multiple ? options.find((opt) => opt.value === value) : void 0;
	react.useEffect(() => {
		if (open && !multiple && typeof value === "string") setActiveValue(value);
	}, [
		open,
		multiple,
		value
	]);
	const triggerSearchEnabled = searchable && searchPlacement === "trigger" && !multiple;
	const contentSearchEnabled = searchable && !triggerSearchEnabled;
	const manualFilterEnabled = triggerSearchEnabled || contentSearchEnabled && Boolean(filterOption);
	const activeSearch = triggerSearchEnabled ? triggerSearch : contentSearch;
	const normalizedSearch = activeSearch.trim().toLowerCase();
	const visibleOptions = react.useMemo(() => {
		if (!manualFilterEnabled || !normalizedSearch) return options;
		return options.filter((option) => {
			if (filterOption) return filterOption(option, activeSearch);
			return [
				option.label,
				option.value,
				option.description,
				option.group
			].filter(Boolean).join(" ").toLowerCase().includes(normalizedSearch);
		});
	}, [
		activeSearch,
		filterOption,
		manualFilterEnabled,
		normalizedSearch,
		options
	]);
	const handleOpenChange = (nextOpen) => {
		setOpen(nextOpen);
		if (!nextOpen) {
			if (triggerSearch || contentSearch) onSearch?.("");
			setTriggerSearch("");
			setContentSearch("");
			return;
		}
		if (triggerSearchEnabled) setTriggerSearch("");
	};
	const handleSelect = (selectedValue) => {
		if (multiple) {
			const currentValues = value || [];
			const newValues = currentValues.includes(selectedValue) ? currentValues.filter((v) => v !== selectedValue) : [...currentValues, selectedValue];
			setValue(newValues);
		} else {
			if (selectedValue !== value) setValue(selectedValue);
			handleOpenChange(false);
		}
	};
	const handleRemoveTag = (tagValue, e) => {
		e.preventDefault();
		e.stopPropagation();
		if (multiple) setValue((value || []).filter((v) => v !== tagValue));
	};
	const handleRemoveTagKeyDown = (tagValue, e) => {
		if (e.key === "Enter" || e.key === " ") handleRemoveTag(tagValue, e);
	};
	const isSelected = (optionValue) => {
		if (multiple) return (value || []).includes(optionValue);
		return value === optionValue;
	};
	const handleTriggerInputFocus = (event) => {
		if (!triggerSearchEnabled) return;
		if (!open) handleOpenChange(true);
		event.currentTarget.select();
	};
	const handleTriggerInputMouseDown = () => {
		if (!triggerSearchEnabled || open) return;
		handleOpenChange(true);
	};
	const handleTriggerInputClick = (event) => {
		if (!triggerSearchEnabled) return;
		event.preventDefault();
		event.currentTarget.focus();
		if (!open) handleOpenChange(true);
	};
	const handleTriggerInputChange = (event) => {
		const nextSearch = event.target.value;
		setTriggerSearch(nextSearch);
		onSearch?.(nextSearch);
		if (!open) setOpen(true);
	};
	const handleTriggerInputKeyDown = (event) => {
		if (!triggerSearchEnabled) return;
		if (event.key === "Escape") {
			handleOpenChange(false);
			return;
		}
		if (event.key === "Enter") {
			if (!normalizedSearch) {
				event.preventDefault();
				handleOpenChange(false);
				return;
			}
			const firstEnabledOption = visibleOptions.find((option) => !option.disabled);
			if (firstEnabledOption) {
				event.preventDefault();
				handleSelect(firstEnabledOption.value);
			}
			return;
		}
		if (event.key === "ArrowDown") {
			event.preventDefault();
			if (!open) handleOpenChange(true);
		}
	};
	const handleContentSearchChange = (nextSearch) => {
		setContentSearch(nextSearch);
		onSearch?.(nextSearch);
	};
	const renderTriggerContent = () => {
		if (renderValue) return renderValue(value, options);
		if (multiple) {
			const selectedValues = value || [];
			if (selectedValues.length === 0) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
				className: "text-muted-foreground",
				children: placeholder
			});
			const selectedOptions = options.filter((opt) => selectedValues.includes(opt.value));
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: "flex min-w-0 flex-1 flex-wrap gap-1",
				children: selectedOptions.map((option) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
					className: require_avatar.cn("bg-primary/10 text-primary", "gap-1 px-2 py-0.5", "inline-flex items-center rounded", "text-xs"),
					children: [option.label, /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
						type: "button",
						"aria-label": getRemoveTagAriaLabel(option.label),
						className: "inline-flex size-3 cursor-pointer items-center justify-center opacity-70 hover:text-foreground hover:opacity-100",
						onClick: (e) => handleRemoveTag(option.value, e),
						onKeyDown: (e) => handleRemoveTagKeyDown(option.value, e),
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(lucide_react.X, { className: "size-3" })
					})]
				}, option.value))
			});
		}
		const selectedOption = options.find((opt) => opt.value === value);
		if (selectedOption) return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
			className: "flex min-w-0 flex-1 items-center gap-2 truncate",
			children: [selectedOption.icon, /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
				className: "truncate",
				children: selectedOption.label
			})]
		});
		return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
			className: "text-muted-foreground",
			children: placeholder
		});
	};
	const renderTriggerInput = () => {
		const triggerInputValue = open ? triggerSearch : selectedOption?.label ?? "";
		const triggerInputPlaceholder = open ? selectedOption?.label ?? placeholder : placeholder;
		return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(PopoverAnchor, {
			asChild: true,
			children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "relative",
				style: { width: triggerWidth },
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(PopoverTrigger, {
					asChild: true,
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Input$1, {
						ref: triggerInputRef,
						type: "text",
						value: triggerInputValue,
						placeholder: triggerInputPlaceholder,
						disabled,
						"aria-label": ariaLabel,
						"aria-labelledby": ariaLabelledBy,
						"aria-expanded": open,
						"aria-invalid": error,
						role: "combobox",
						autoComplete: "off",
						spellCheck: false,
						onFocus: handleTriggerInputFocus,
						onMouseDown: handleTriggerInputMouseDown,
						onClick: handleTriggerInputClick,
						onChange: handleTriggerInputChange,
						onKeyDown: handleTriggerInputKeyDown,
						style: triggerStyle,
						className: require_avatar.cn("w-full rounded-md border-1 bg-muted/20 pr-8 shadow-none transition-colors", "focus-visible:border-ring", error && "border-destructive!", disabled && "cursor-not-allowed opacity-50", comboboxInputSizeClasses[size ?? "default"], className)
					})
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(lucide_react.ChevronDown, { className: require_avatar.cn("pointer-events-none absolute top-1/2 right-3 size-4 shrink-0 -translate-y-1/2 opacity-50 transition-transform", open && "rotate-180") })]
			})
		});
	};
	const renderMultiTrigger = () => {
		const inputSize = size ?? "default";
		return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(PopoverTrigger, {
			asChild: true,
			children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				role: "combobox",
				tabIndex: disabled ? -1 : 0,
				"aria-label": ariaLabel,
				"aria-labelledby": ariaLabelledBy,
				"aria-expanded": open,
				"aria-invalid": error,
				"aria-disabled": disabled,
				style: {
					width: triggerWidth,
					...triggerStyle
				},
				className: require_avatar.cn(comboboxTriggerVariants({
					state,
					size
				}), comboboxInputSizeClasses[inputSize], "cursor-pointer", className),
				onKeyDown: (event) => {
					if (disabled) return;
					if (event.key === "Enter" || event.key === " " || event.key === "ArrowDown") {
						event.preventDefault();
						handleOpenChange(true);
					}
				},
				children: [renderTriggerContent(), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(lucide_react.ChevronDown, { className: "size-4 shrink-0 opacity-50" })]
			})
		});
	};
	const renderOptionContent = (option) => {
		if (renderOption) return renderOption(option);
		return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
			option.icon && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
				className: "shrink-0",
				children: option.icon
			}),
			/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "min-w-0 flex-1",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: "truncate",
					children: option.label
				}), option.description && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: "truncate text-xs text-muted-foreground",
					children: option.description
				})]
			}),
			isSelected(option.value) && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(lucide_react.Check, { className: "size-4 shrink-0 text-primary" })
		] });
	};
	const state = disabled ? "disabled" : error ? "error" : "default";
	const triggerWidth = width ? typeof width === "number" ? `${width}px` : width : void 0;
	const popoverWidth = typeof triggerWidth === "string" && triggerWidth.trim().endsWith("%") ? "var(--radix-popover-trigger-width)" : triggerWidth;
	return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(Popover, {
		open,
		onOpenChange: handleOpenChange,
		children: [
			triggerSearchEnabled ? renderTriggerInput() : multiple ? renderMultiTrigger() : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(PopoverTrigger, {
				asChild: true,
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(Button, {
					variant: "outline",
					size,
					disabled,
					style: {
						width: triggerWidth,
						...triggerStyle
					},
					className: require_avatar.cn(comboboxTriggerVariants({
						state,
						size
					}), className),
					"aria-label": ariaLabel,
					"aria-labelledby": defaultTriggerLabelledBy,
					"aria-expanded": open,
					"aria-invalid": error,
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						id: defaultValueLabelId,
						className: "contents",
						children: renderTriggerContent()
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(lucide_react.ChevronDown, { className: "size-4 shrink-0 opacity-50" })]
				})
			}),
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)(PopoverContent, {
				className: require_avatar.cn("rounded-md p-0", popoverClassName),
				align: popoverAlign,
				portalContainer,
				style: { width: popoverWidth },
				onOpenAutoFocus: (event) => {
					if (!triggerSearchEnabled) return;
					event.preventDefault();
					triggerInputRef.current?.focus();
				},
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(Command, {
					shouldFilter: !manualFilterEnabled,
					...!multiple ? {
						value: activeValue,
						onValueChange: setActiveValue
					} : {},
					children: [contentSearchEnabled && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(CommandInput, {
						placeholder: searchPlaceholder,
						className: "h-9 rounded-none",
						onValueChange: handleContentSearchChange
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ComboboxOptionList, {
						emptyText,
						isSelected,
						manualFilterEnabled,
						multiple,
						onSelect: handleSelect,
						options,
						renderOptionContent,
						visibleOptions
					})]
				})
			}),
			name && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
				type: "hidden",
				name,
				value: multiple ? JSON.stringify(value) : value
			})
		]
	});
}
//#endregion
//#region src/components/primitives/drawer.tsx
function Drawer({ ...props }) {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(vaul.Drawer.Root, {
		"data-slot": "drawer",
		...props
	});
}
function DrawerTrigger({ ...props }) {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(vaul.Drawer.Trigger, {
		"data-slot": "drawer-trigger",
		...props
	});
}
function DrawerPortal({ ...props }) {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(vaul.Drawer.Portal, {
		"data-slot": "drawer-portal",
		...props
	});
}
function DrawerClose({ ...props }) {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(vaul.Drawer.Close, {
		"data-slot": "drawer-close",
		...props
	});
}
function DrawerOverlay({ className, ...props }) {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(vaul.Drawer.Overlay, {
		"data-slot": "drawer-overlay",
		className: require_avatar.cn("fixed inset-0 z-50 bg-black/50 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0", className),
		...props
	});
}
function DrawerContent({ className, children, ...props }) {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(DrawerPortal, {
		"data-slot": "drawer-portal",
		children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(DrawerOverlay, {}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(vaul.Drawer.Content, {
			"data-slot": "drawer-content",
			className: require_avatar.cn("group/drawer-content fixed z-50 flex h-auto flex-col bg-background", "data-[vaul-drawer-direction=top]:inset-x-0 data-[vaul-drawer-direction=top]:top-0 data-[vaul-drawer-direction=top]:mb-24 data-[vaul-drawer-direction=top]:max-h-[80vh] data-[vaul-drawer-direction=top]:rounded-b-lg data-[vaul-drawer-direction=top]:border-b", "data-[vaul-drawer-direction=bottom]:inset-x-0 data-[vaul-drawer-direction=bottom]:bottom-0 data-[vaul-drawer-direction=bottom]:mt-24 data-[vaul-drawer-direction=bottom]:max-h-[80vh] data-[vaul-drawer-direction=bottom]:rounded-t-lg data-[vaul-drawer-direction=bottom]:border-t", "data-[vaul-drawer-direction=right]:inset-y-0 data-[vaul-drawer-direction=right]:right-0 data-[vaul-drawer-direction=right]:w-3/4 data-[vaul-drawer-direction=right]:border-l data-[vaul-drawer-direction=right]:sm:max-w-sm", "data-[vaul-drawer-direction=left]:inset-y-0 data-[vaul-drawer-direction=left]:left-0 data-[vaul-drawer-direction=left]:w-3/4 data-[vaul-drawer-direction=left]:border-r data-[vaul-drawer-direction=left]:sm:max-w-sm", className),
			...props,
			children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", { className: "mx-auto mt-4 hidden h-2 w-25 shrink-0 rounded-full bg-muted group-data-[vaul-drawer-direction=bottom]/drawer-content:block" }), children]
		})]
	});
}
function DrawerHeader({ className, ...props }) {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
		"data-slot": "drawer-header",
		className: require_avatar.cn("flex flex-col gap-0.5 p-4 group-data-[vaul-drawer-direction=bottom]/drawer-content:text-center group-data-[vaul-drawer-direction=top]/drawer-content:text-center md:gap-1.5 md:text-left", className),
		...props
	});
}
function DrawerFooter({ className, ...props }) {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
		"data-slot": "drawer-footer",
		className: require_avatar.cn("mt-auto flex flex-col gap-2 p-4", className),
		...props
	});
}
function DrawerTitle({ className, ...props }) {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(vaul.Drawer.Title, {
		"data-slot": "drawer-title",
		className: require_avatar.cn("font-semibold text-foreground", className),
		...props
	});
}
function DrawerDescription({ className, ...props }) {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(vaul.Drawer.Description, {
		"data-slot": "drawer-description",
		className: require_avatar.cn("text-sm text-muted-foreground", className),
		...props
	});
}
//#endregion
//#region src/components/primitives/dropdown-menu.tsx
function DropdownMenu({ ...props }) {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_radix_ui_react_dropdown_menu.Root, {
		"data-slot": "dropdown-menu",
		...props
	});
}
function DropdownMenuPortal({ container, ...props }) {
	const defaultPortalContainer = usePortalContainer();
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_radix_ui_react_dropdown_menu.Portal, {
		"data-slot": "dropdown-menu-portal",
		container: container ?? defaultPortalContainer ?? void 0,
		...props
	});
}
function DropdownMenuTrigger({ ...props }) {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_radix_ui_react_dropdown_menu.Trigger, {
		"data-slot": "dropdown-menu-trigger",
		...props
	});
}
function DropdownMenuContent({ className, sideOffset = 4, portalContainer, ...props }) {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(DropdownMenuPortal, {
		container: portalContainer,
		children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_radix_ui_react_dropdown_menu.Content, {
			"data-slot": "dropdown-menu-content",
			sideOffset,
			className: require_avatar.cn("z-50 max-h-(--radix-dropdown-menu-content-available-height) min-w-[8rem] origin-(--radix-dropdown-menu-content-transform-origin) overflow-x-hidden overflow-y-auto rounded-md border bg-popover p-1 text-popover-foreground shadow-md [-webkit-app-region:no-drag] data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95", className),
			...props
		})
	});
}
function DropdownMenuGroup({ ...props }) {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_radix_ui_react_dropdown_menu.Group, {
		"data-slot": "dropdown-menu-group",
		...props
	});
}
function DropdownMenuItem({ className, inset, variant = "default", ...props }) {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_radix_ui_react_dropdown_menu.Item, {
		"data-slot": "dropdown-menu-item",
		"data-inset": inset,
		"data-variant": variant,
		className: require_avatar.cn("relative flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[inset]:pl-8 data-[variant=destructive]:text-destructive data-[variant=destructive]:focus:bg-destructive/10 data-[variant=destructive]:focus:text-destructive dark:data-[variant=destructive]:focus:bg-destructive/20 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 [&_svg:not([class*='text-'])]:text-muted-foreground data-[variant=destructive]:[&_svg:not([class*='text-'])]:text-destructive!", className),
		...props
	});
}
function DropdownMenuCheckboxItem({ className, children, checked, ...props }) {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(_radix_ui_react_dropdown_menu.CheckboxItem, {
		"data-slot": "dropdown-menu-checkbox-item",
		className: require_avatar.cn("relative flex cursor-default items-center gap-2 rounded-sm py-1.5 pr-2 pl-8 text-sm outline-hidden select-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4", className),
		checked,
		...props,
		children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
			className: "pointer-events-none absolute left-2 flex size-3.5 items-center justify-center",
			children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_radix_ui_react_dropdown_menu.ItemIndicator, { children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(lucide_react.CheckIcon, { className: "size-4" }) })
		}), children]
	});
}
function DropdownMenuRadioGroup({ ...props }) {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_radix_ui_react_dropdown_menu.RadioGroup, {
		"data-slot": "dropdown-menu-radio-group",
		...props
	});
}
function DropdownMenuRadioItem({ className, children, ...props }) {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(_radix_ui_react_dropdown_menu.RadioItem, {
		"data-slot": "dropdown-menu-radio-item",
		className: require_avatar.cn("relative flex cursor-default items-center gap-2 rounded-sm py-1.5 pr-2 pl-8 text-sm outline-hidden select-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4", className),
		...props,
		children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
			className: "pointer-events-none absolute left-2 flex size-3.5 items-center justify-center",
			children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_radix_ui_react_dropdown_menu.ItemIndicator, { children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(lucide_react.CircleIcon, { className: "size-2 fill-current" }) })
		}), children]
	});
}
function DropdownMenuLabel({ className, inset, ...props }) {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_radix_ui_react_dropdown_menu.Label, {
		"data-slot": "dropdown-menu-label",
		"data-inset": inset,
		className: require_avatar.cn("px-2 py-1.5 text-sm font-medium data-[inset]:pl-8", className),
		...props
	});
}
function DropdownMenuSeparator({ className, ...props }) {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_radix_ui_react_dropdown_menu.Separator, {
		"data-slot": "dropdown-menu-separator",
		className: require_avatar.cn("-mx-1 my-1 h-px bg-border", className),
		...props
	});
}
function DropdownMenuShortcut({ className, ...props }) {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
		"data-slot": "dropdown-menu-shortcut",
		className: require_avatar.cn("ml-auto text-xs tracking-widest text-muted-foreground", className),
		...props
	});
}
function DropdownMenuSub({ ...props }) {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_radix_ui_react_dropdown_menu.Sub, {
		"data-slot": "dropdown-menu-sub",
		...props
	});
}
function DropdownMenuSubTrigger({ className, inset, children, ...props }) {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(_radix_ui_react_dropdown_menu.SubTrigger, {
		"data-slot": "dropdown-menu-sub-trigger",
		"data-inset": inset,
		className: require_avatar.cn("flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none focus:bg-accent focus:text-accent-foreground data-[inset]:pl-8 data-[state=open]:bg-accent data-[state=open]:text-accent-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 [&_svg:not([class*='text-'])]:text-muted-foreground", className),
		...props,
		children: [children, /* @__PURE__ */ (0, react_jsx_runtime.jsx)(lucide_react.ChevronRightIcon, { className: "ml-auto size-4" })]
	});
}
function DropdownMenuSubContent({ className, ...props }) {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_radix_ui_react_dropdown_menu.SubContent, {
		"data-slot": "dropdown-menu-sub-content",
		className: require_avatar.cn("z-50 min-w-[8rem] origin-(--radix-dropdown-menu-content-transform-origin) overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-lg [-webkit-app-region:no-drag] data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95", className),
		...props
	});
}
//#endregion
//#region src/components/primitives/field.tsx
function FieldSet({ className, ...props }) {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("fieldset", {
		"data-slot": "field-set",
		className: require_avatar.cn("flex flex-col gap-6", "has-[>[data-slot=checkbox-group]]:gap-3 has-[>[data-slot=radio-group]]:gap-3", className),
		...props
	});
}
function FieldLegend({ className, variant = "legend", ...props }) {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("legend", {
		"data-slot": "field-legend",
		"data-variant": variant,
		className: require_avatar.cn("mb-3 font-medium", "data-[variant=legend]:text-base", "data-[variant=label]:text-sm", className),
		...props
	});
}
function FieldGroup({ className, ...props }) {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
		"data-slot": "field-group",
		className: require_avatar.cn("group/field-group @container/field-group flex w-full flex-col gap-7 data-[slot=checkbox-group]:gap-3 [&>[data-slot=field-group]]:gap-4", className),
		...props
	});
}
const fieldVariants = (0, class_variance_authority.cva)("group/field flex w-full gap-3 data-[invalid=true]:text-destructive", {
	variants: { orientation: {
		vertical: ["flex-col [&>*]:w-full [&>.sr-only]:w-auto"],
		horizontal: [
			"flex-row items-center",
			"[&>[data-slot=field-label]]:flex-auto",
			"has-[>[data-slot=field-content]]:items-start has-[>[data-slot=field-content]]:[&>[role=checkbox],[role=radio]]:mt-px"
		],
		responsive: [
			"flex-col @md/field-group:flex-row @md/field-group:items-center [&>*]:w-full @md/field-group:[&>*]:w-auto [&>.sr-only]:w-auto",
			"@md/field-group:[&>[data-slot=field-label]]:flex-auto",
			"@md/field-group:has-[>[data-slot=field-content]]:items-start @md/field-group:has-[>[data-slot=field-content]]:[&>[role=checkbox],[role=radio]]:mt-px"
		]
	} },
	defaultVariants: { orientation: "vertical" }
});
function Field({ className, orientation = "vertical", ...props }) {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
		role: "group",
		"data-slot": "field",
		"data-orientation": orientation,
		className: require_avatar.cn(fieldVariants({ orientation }), className),
		...props
	});
}
function FieldContent({ className, ...props }) {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
		"data-slot": "field-content",
		className: require_avatar.cn("group/field-content flex flex-1 flex-col gap-1.5 leading-snug", className),
		...props
	});
}
function FieldLabel({ className, ...props }) {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Label, {
		"data-slot": "field-label",
		className: require_avatar.cn("group/field-label peer/field-label flex w-fit gap-2 leading-snug group-data-[disabled=true]/field:opacity-50", "has-[>[data-slot=field]]:w-full has-[>[data-slot=field]]:flex-col has-[>[data-slot=field]]:rounded-md has-[>[data-slot=field]]:border [&>*]:data-[slot=field]:p-4", "has-data-[state=checked]:border-border-selected has-data-[state=checked]:bg-primary/5 dark:has-data-[state=checked]:bg-primary/10", className),
		...props
	});
}
function FieldTitle({ className, ...props }) {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
		"data-slot": "field-label",
		className: require_avatar.cn("flex w-fit items-center gap-2 text-sm leading-snug font-medium group-data-[disabled=true]/field:opacity-50", className),
		...props
	});
}
function FieldDescription({ className, ...props }) {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
		"data-slot": "field-description",
		className: require_avatar.cn("text-sm leading-normal font-normal text-muted-foreground group-has-[[data-orientation=horizontal]]/field:text-balance", "last:mt-0 nth-last-2:-mt-1 [[data-variant=legend]+&]:-mt-1.5", "[&>a]:text-link [&>a]:underline [&>a]:underline-offset-4", className),
		...props
	});
}
function FieldSeparator({ children, className, ...props }) {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
		"data-slot": "field-separator",
		"data-content": !!children,
		className: require_avatar.cn("relative -my-2 h-5 text-sm group-data-[variant=outline]/field-group:-mb-2", className),
		...props,
		children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Separator, { className: "absolute inset-0 top-1/2" }), children && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
			className: "relative mx-auto block w-fit bg-background px-2 text-muted-foreground",
			"data-slot": "field-separator-content",
			children
		})]
	});
}
function FieldError({ className, children, errors, ...props }) {
	const content = react.useMemo(() => {
		if (children) return children;
		if (!errors?.length) return null;
		const uniqueErrors = [...new Map(errors.map((error) => [error?.message, error])).values()];
		if (uniqueErrors?.length === 1) return uniqueErrors[0]?.message;
		return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("ul", {
			className: "ml-4 flex list-disc flex-col gap-1",
			children: uniqueErrors.map((error, index) => error?.message && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("li", { children: error.message }, index))
		});
	}, [children, errors]);
	if (!content) return null;
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
		role: "alert",
		"data-slot": "field-error",
		className: require_avatar.cn("text-sm font-normal text-destructive", className),
		...props,
		children: content
	});
}
//#endregion
//#region src/components/primitives/hover-card.tsx
function HoverCard({ ...props }) {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_radix_ui_react_hover_card.Root, {
		"data-slot": "hover-card",
		...props
	});
}
function HoverCardTrigger({ ...props }) {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_radix_ui_react_hover_card.Trigger, {
		"data-slot": "hover-card-trigger",
		...props
	});
}
function HoverCardContent({ className, align = "center", sideOffset = 4, portalContainer, ...props }) {
	const defaultPortalContainer = usePortalContainer();
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_radix_ui_react_hover_card.Portal, {
		container: portalContainer ?? defaultPortalContainer ?? void 0,
		children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_radix_ui_react_hover_card.Content, {
			"data-slot": "hover-card-content",
			align,
			sideOffset,
			className: require_avatar.cn("z-[80] w-80 origin-(--radix-hover-card-content-transform-origin) rounded-lg border-[0.5px] bg-popover p-4 text-popover-foreground shadow-lg outline-hidden [-webkit-app-region:no-drag] data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95", className),
			...props
		})
	});
}
//#endregion
//#region src/components/primitives/item.tsx
function ItemGroup({ className, ...props }) {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
		role: "list",
		"data-slot": "item-group",
		className: require_avatar.cn("group/item-group flex flex-col", className),
		...props
	});
}
function ItemSeparator({ className, ...props }) {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Separator, {
		"data-slot": "item-separator",
		orientation: "horizontal",
		className: require_avatar.cn("my-0", className),
		...props
	});
}
const itemVariants = (0, class_variance_authority.cva)("group/item flex flex-wrap items-center rounded-md border border-transparent text-sm transition-colors duration-100 outline-none focus-visible:border-primary [a]:transition-colors [a]:hover:bg-accent/50 [a]:focus-visible:bg-accent/50", {
	variants: {
		variant: {
			default: "bg-transparent",
			outline: "border-border",
			muted: "bg-muted/50"
		},
		size: {
			default: "gap-4 p-4",
			sm: "gap-2.5 px-4 py-3"
		}
	},
	defaultVariants: {
		variant: "default",
		size: "default"
	}
});
function Item({ className, variant = "default", size = "default", asChild = false, ...props }) {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(asChild ? _radix_ui_react_slot.Slot : "div", {
		"data-slot": "item",
		"data-variant": variant,
		"data-size": size,
		className: require_avatar.cn(itemVariants({
			variant,
			size,
			className
		})),
		...props
	});
}
const itemMediaVariants = (0, class_variance_authority.cva)("flex shrink-0 items-center justify-center gap-2 group-has-[[data-slot=item-description]]/item:translate-y-0.5 group-has-[[data-slot=item-description]]/item:self-start [&_svg]:pointer-events-none", {
	variants: { variant: {
		default: "bg-transparent",
		icon: "size-8 rounded-sm border bg-muted [&_svg:not([class*='size-'])]:size-4",
		image: "size-10 overflow-hidden rounded-sm [&_img]:size-full [&_img]:object-cover"
	} },
	defaultVariants: { variant: "default" }
});
function ItemMedia({ className, variant = "default", ...props }) {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
		"data-slot": "item-media",
		"data-variant": variant,
		className: require_avatar.cn(itemMediaVariants({
			variant,
			className
		})),
		...props
	});
}
function ItemContent({ className, ...props }) {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
		"data-slot": "item-content",
		className: require_avatar.cn("flex flex-1 flex-col gap-1 [&+[data-slot=item-content]]:flex-none", className),
		...props
	});
}
function ItemTitle({ className, ...props }) {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
		"data-slot": "item-title",
		className: require_avatar.cn("flex w-fit items-center gap-2 text-sm leading-snug font-medium", className),
		...props
	});
}
function ItemDescription({ className, ...props }) {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
		"data-slot": "item-description",
		className: require_avatar.cn("line-clamp-2 text-sm leading-normal font-normal text-balance text-muted-foreground", "[&>a]:text-link [&>a]:underline [&>a]:underline-offset-4", className),
		...props
	});
}
function ItemActions({ className, ...props }) {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
		"data-slot": "item-actions",
		className: require_avatar.cn("flex items-center gap-2", className),
		...props
	});
}
function ItemHeader({ className, ...props }) {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
		"data-slot": "item-header",
		className: require_avatar.cn("flex basis-full items-center justify-between gap-2", className),
		...props
	});
}
function ItemFooter({ className, ...props }) {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
		"data-slot": "item-footer",
		className: require_avatar.cn("flex basis-full items-center justify-between gap-2", className),
		...props
	});
}
//#endregion
//#region src/components/primitives/kbd.tsx
function Kbd({ className, ...props }) {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("kbd", {
		"data-slot": "kbd",
		className: require_avatar.cn("pointer-events-none inline-flex w-fit min-w-5 items-center justify-center gap-1 rounded-md bg-primary/10 p-1 font-sans text-xs font-medium text-primary select-none", "[&_svg:not([class*='size-'])]:size-3", "[[data-slot=tooltip-content]_&]:bg-background/20 [[data-slot=tooltip-content]_&]:text-background dark:[[data-slot=tooltip-content]_&]:bg-background/10", className),
		...props
	});
}
function KbdGroup({ className, ...props }) {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("kbd", {
		"data-slot": "kbd-group",
		className: require_avatar.cn("inline-flex items-center gap-1", className),
		...props
	});
}
//#endregion
//#region src/components/primitives/pagination.tsx
function Pagination({ className, ...props }) {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("nav", {
		role: "navigation",
		"aria-label": "pagination",
		"data-slot": "pagination",
		className: require_avatar.cn("mx-auto flex w-full justify-center", className),
		...props
	});
}
function PaginationContent({ className, ...props }) {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("ul", {
		"data-slot": "pagination-content",
		className: require_avatar.cn("flex flex-row items-center gap-1", className),
		...props
	});
}
function PaginationItem({ ...props }) {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("li", {
		"data-slot": "pagination-item",
		...props
	});
}
function PaginationLink({ className, isActive, size = "icon", ...props }) {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("a", {
		"aria-current": isActive ? "page" : void 0,
		"data-slot": "pagination-link",
		"data-active": isActive,
		className: require_avatar.cn(buttonVariants$1({
			variant: isActive ? "outline" : "ghost",
			size
		}), "rounded-md text-foreground hover:bg-primary/10 hover:text-primary hover:shadow-none", isActive && "bg-background text-primary", className),
		...props
	});
}
function PaginationPrevious({ className, children = "Previous", ...props }) {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(PaginationLink, {
		"aria-label": "Go to previous page",
		size: "default",
		className: require_avatar.cn("gap-1 px-2.5 sm:pl-2.5", className),
		...props,
		children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(lucide_react.ChevronLeftIcon, {}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
			className: "hidden sm:block",
			children
		})]
	});
}
function PaginationNext({ className, children = "Next", ...props }) {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(PaginationLink, {
		"aria-label": "Go to next page",
		size: "default",
		className: require_avatar.cn("gap-1 px-2.5 sm:pr-2.5", className),
		...props,
		children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
			className: "hidden sm:block",
			children
		}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(lucide_react.ChevronRightIcon, {})]
	});
}
function PaginationEllipsis({ className, ...props }) {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
		"aria-hidden": true,
		"data-slot": "pagination-ellipsis",
		className: require_avatar.cn("flex size-9 items-center justify-center", className),
		...props,
		children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(lucide_react.MoreHorizontalIcon, { className: "size-4" }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
			className: "sr-only",
			children: "More pages"
		})]
	});
}
//#endregion
//#region src/components/primitives/resizable.tsx
function ResizablePanelGroup({ className, direction = "horizontal", onLayout, onLayoutChanged, ...props }) {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(react_resizable_panels.Group, {
		"data-slot": "resizable-panel-group",
		orientation: direction,
		onLayoutChanged: onLayoutChanged ?? onLayout,
		className: require_avatar.cn("h-full w-full", className),
		...props
	});
}
function ResizablePanel(props) {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(react_resizable_panels.Panel, { ...props });
}
function ResizableHandle({ children, className, withHandle, ...props }) {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(react_resizable_panels.Separator, {
		"data-slot": "resizable-handle",
		className: require_avatar.cn("group relative flex h-full w-px shrink-0 items-center justify-center bg-border transition-colors", "after:absolute after:inset-y-0 after:left-1/2 after:w-3 after:-translate-x-1/2", "hover:bg-border-strong focus-visible:bg-border-strong focus-visible:outline-none", "data-[separator=active]:bg-primary/50 data-[separator=focus]:bg-border-strong", "aria-[orientation=horizontal]:h-px aria-[orientation=horizontal]:w-full", "aria-[orientation=horizontal]:after:inset-x-0 aria-[orientation=horizontal]:after:top-1/2", "aria-[orientation=horizontal]:after:h-3 aria-[orientation=horizontal]:after:w-full", "aria-[orientation=horizontal]:after:-translate-x-0 aria-[orientation=horizontal]:after:-translate-y-1/2", "[&[aria-orientation=horizontal]>div]:rotate-90", className),
		...props,
		children: children ?? (withHandle && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
			className: "z-10 flex h-4 w-3 items-center justify-center rounded-xs border border-border bg-background shadow-xs",
			children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(lucide_react.GripVertical, { className: "size-2.5 text-muted-foreground" })
		}))
	});
}
//#endregion
//#region src/components/primitives/segmented-control.tsx
function SegmentedControl({ options, value, defaultValue, onValueChange, disabled = false, size = "default", className, ...props }) {
	const [internalValue, setInternalValue] = react.useState(defaultValue ?? options[0]?.value);
	const selectedValue = value ?? internalValue;
	const handleSelect = (option) => {
		if (disabled || option.disabled || option.value === selectedValue) return;
		if (value === void 0) setInternalValue(option.value);
		onValueChange?.(option.value);
	};
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
		role: "radiogroup",
		"data-slot": "segmented-control",
		"data-size": size,
		"aria-disabled": disabled,
		className: require_avatar.cn("inline-flex items-center rounded-full border border-border/60 bg-muted/60 p-0.5", disabled && "pointer-events-none opacity-50", className),
		...props,
		children: options.map((option) => {
			const selected = option.value === selectedValue;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
				type: "button",
				role: "radio",
				"aria-checked": selected,
				disabled: disabled || option.disabled,
				onClick: () => handleSelect(option),
				className: require_avatar.cn("inline-flex shrink-0 items-center justify-center rounded-full font-medium whitespace-nowrap text-muted-foreground transition-[background-color,color,box-shadow] outline-none", "hover:text-foreground focus-visible:bg-accent focus-visible:text-foreground disabled:pointer-events-none disabled:opacity-50", size === "sm" ? "h-7 gap-1.5 px-2.5 text-xs" : "h-8 gap-2 px-3 text-sm", selected && "bg-background text-foreground shadow-xs"),
				children: option.label
			}, option.value);
		})
	});
}
//#endregion
//#region src/components/primitives/shadcn-io/dropzone/index.tsx
const renderBytes = (bytes) => {
	const units = [
		"B",
		"KB",
		"MB",
		"GB",
		"TB",
		"PB"
	];
	let size = bytes;
	let unitIndex = 0;
	while (size >= 1024 && unitIndex < units.length - 1) {
		size /= 1024;
		unitIndex++;
	}
	return `${size.toFixed(2)}${units[unitIndex]}`;
};
const DropzoneContext = (0, react.createContext)(void 0);
const Dropzone = ({ accept, maxFiles = 1, maxSize, minSize, onDrop, onError, disabled, src, className, children, "aria-label": ariaLabel, "data-ui": dataUi, onClick, ...props }) => {
	const { getRootProps, getInputProps, isDragActive } = (0, react_dropzone.useDropzone)({
		accept,
		maxFiles,
		maxSize,
		minSize,
		onError,
		disabled,
		onDrop: (acceptedFiles, fileRejections, event) => {
			if (fileRejections.length > 0) {
				const message = fileRejections[0]?.errors[0]?.message ?? "File upload rejected";
				onError?.(new Error(message));
				return;
			}
			onDrop?.(acceptedFiles, fileRejections, event);
		},
		...props
	});
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(DropzoneContext, {
		value: {
			src,
			accept,
			maxSize,
			minSize,
			maxFiles
		},
		children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(Button, {
			"data-ui": dataUi,
			className: require_avatar.cn("relative h-auto w-full flex-col overflow-hidden p-8", isDragActive && "ring-1 ring-primary/40 outline-none", className),
			disabled,
			type: "button",
			variant: "outline",
			...getRootProps({
				"aria-label": ariaLabel,
				onClick,
				role: "button"
			}),
			children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
				...getInputProps(),
				disabled
			}), children]
		})
	}, JSON.stringify(src));
};
const useDropzoneContext = () => {
	const context = (0, react.use)(DropzoneContext);
	if (!context) throw new Error("useDropzoneContext must be used within a Dropzone");
	return context;
};
const maxLabelItems = 3;
const DropzoneContent = ({ children, className }) => {
	const { src } = useDropzoneContext();
	if (!src) return null;
	if (children) return children;
	return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
		className: require_avatar.cn("flex flex-col items-center justify-center", className),
		children: [
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: "flex size-8 items-center justify-center rounded-md bg-muted text-muted-foreground",
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(lucide_react.UploadIcon, { size: 16 })
			}),
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
				className: "my-2 w-full truncate text-sm font-medium",
				children: src.length > maxLabelItems ? `${new Intl.ListFormat("en").format(src.slice(0, maxLabelItems).map((file) => file.name))} and ${src.length - maxLabelItems} more` : new Intl.ListFormat("en").format(src.map((file) => file.name))
			}),
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
				className: "w-full text-xs text-wrap text-muted-foreground",
				children: "Drag and drop or click to replace"
			})
		]
	});
};
const DropzoneEmptyState = ({ children, className }) => {
	const { src, accept, maxSize, minSize, maxFiles } = useDropzoneContext();
	if (src) return null;
	if (children) return children;
	let caption = "";
	if (accept) {
		caption += "Accepts ";
		caption += new Intl.ListFormat("en").format(Object.keys(accept));
	}
	if (minSize && maxSize) caption += ` between ${renderBytes(minSize)} and ${renderBytes(maxSize)}`;
	else if (minSize) caption += ` at least ${renderBytes(minSize)}`;
	else if (maxSize) caption += ` less than ${renderBytes(maxSize)}`;
	return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
		className: require_avatar.cn("flex flex-col items-center justify-center", className),
		children: [
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: "flex size-8 items-center justify-center rounded-md bg-muted text-muted-foreground",
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(lucide_react.UploadIcon, { size: 16 })
			}),
			/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("p", {
				className: "my-2 w-full truncate text-sm font-medium text-wrap",
				children: ["Upload ", maxFiles === 1 ? "a file" : "files"]
			}),
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
				className: "w-full truncate text-xs text-wrap text-muted-foreground",
				children: "Drag and drop or click to upload"
			}),
			caption && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("p", {
				className: "text-xs text-wrap text-muted-foreground",
				children: [caption, "."]
			})
		]
	});
};
//#endregion
//#region src/components/primitives/skeleton.tsx
function Skeleton({ className, ...props }) {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
		"data-slot": "skeleton",
		className: require_avatar.cn("animate-pulse rounded-md bg-accent", className),
		...props
	});
}
//#endregion
//#region src/components/primitives/slider.tsx
const sliderTrackVariants = (0, class_variance_authority.cva)(require_avatar.cn("relative grow overflow-hidden rounded-full bg-primary/10", "data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full"), {
	variants: { size: {
		sm: "data-[orientation=horizontal]:h-1 data-[orientation=vertical]:w-1",
		md: "data-[orientation=horizontal]:h-1.5 data-[orientation=vertical]:w-1.5",
		lg: "data-[orientation=horizontal]:h-2 data-[orientation=vertical]:w-2"
	} },
	defaultVariants: { size: "md" }
});
const sliderThumbVariants = (0, class_variance_authority.cva)(require_avatar.cn("block shrink-0 rounded-full border border-background bg-primary shadow-xs transition-[color,box-shadow]", "ring-primary/30 hover:ring-4 focus-visible:ring-2 focus-visible:outline-hidden focus-visible:ring-inset", "disabled:pointer-events-none disabled:opacity-50"), {
	variants: { size: {
		sm: "size-3.5",
		md: "size-4",
		lg: "size-5"
	} },
	defaultVariants: { size: "md" }
});
const sliderMarkLabelVariants = (0, class_variance_authority.cva)("absolute top-0 leading-none whitespace-nowrap text-muted-foreground", {
	variants: { size: {
		sm: "text-[10px]",
		md: "text-xs",
		lg: "text-sm"
	} },
	defaultVariants: { size: "md" }
});
const sliderValueLabelVariants = (0, class_variance_authority.cva)(require_avatar.cn("pointer-events-none absolute left-1/2 -translate-x-1/2 -translate-y-full", "rounded bg-primary px-1.5 py-0.5 text-primary-foreground", "scale-0 opacity-0 transition-all group-hover:scale-100 group-hover:opacity-100"), {
	variants: { size: {
		sm: "-top-1 text-[10px]",
		md: "-top-1.5 text-xs",
		lg: "-top-2 text-sm"
	} },
	defaultVariants: { size: "md" }
});
function Slider({ className, defaultValue, value, min = 0, max = 100, size, marks, orientation = "horizontal", showValueLabel, formatValueLabel, getThumbAriaLabel, getThumbAriaValueText, onValueChange, ...props }) {
	const [localValues, setLocalValues] = react.useState(() => Array.isArray(value) ? value : Array.isArray(defaultValue) ? defaultValue : [min]);
	react.useEffect(() => {
		if (Array.isArray(value)) setLocalValues(value);
	}, [value]);
	const isVertical = orientation === "vertical";
	const sliderElement = /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(_radix_ui_react_slider.Root, {
		"data-slot": "slider",
		"data-size": size,
		defaultValue,
		value,
		min,
		max,
		orientation,
		onValueChange: (newValues) => {
			setLocalValues(newValues);
			onValueChange?.(newValues);
		},
		className: require_avatar.cn("relative flex w-full touch-none items-center select-none data-[disabled]:opacity-50 data-[orientation=vertical]:h-full data-[orientation=vertical]:min-h-44 data-[orientation=vertical]:w-auto data-[orientation=vertical]:flex-col", !marks?.length && className),
		...props,
		children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_radix_ui_react_slider.Track, {
			"data-slot": "slider-track",
			className: sliderTrackVariants({ size }),
			children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_radix_ui_react_slider.Range, {
				"data-slot": "slider-range",
				className: require_avatar.cn("absolute bg-primary data-[orientation=horizontal]:h-full data-[orientation=vertical]:w-full")
			})
		}), localValues.map((val, index) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_radix_ui_react_slider.Thumb, {
			"data-slot": "slider-thumb",
			"aria-label": getThumbAriaLabel?.(index),
			"aria-valuetext": getThumbAriaValueText?.(val, index),
			className: require_avatar.cn(sliderThumbVariants({ size }), showValueLabel && "group"),
			children: showValueLabel && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
				"data-slot": "slider-value-label",
				className: sliderValueLabelVariants({ size }),
				children: formatValueLabel ? formatValueLabel(val) : val
			})
		}, index))]
	});
	if (!marks?.length) return sliderElement;
	return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
		"data-slot": "slider-container",
		className: require_avatar.cn("relative", isVertical ? "flex h-full items-stretch" : "", className),
		children: [sliderElement, /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
			"data-slot": "slider-marks",
			className: require_avatar.cn("relative", isVertical ? "ml-2 flex h-full flex-col justify-between" : "mt-1.5 h-4 w-full"),
			children: marks.map((mark) => {
				const range = max - min;
				if (range === 0) return null;
				const percentage = (mark.value - min) / range * 100;
				const transform = percentage <= 0 ? "translateX(0)" : percentage >= 100 ? "translateX(-100%)" : "translateX(-50%)";
				return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					"data-slot": "slider-mark",
					className: sliderMarkLabelVariants({ size }),
					style: isVertical ? {
						top: `${100 - percentage}%`,
						transform: "translateY(-50%)"
					} : {
						left: `${percentage}%`,
						transform
					},
					children: mark.label
				}, mark.value);
			})
		})]
	});
}
//#endregion
//#region src/components/primitives/tabs.tsx
const TabsContext = react.createContext({
	variant: "default",
	orientation: "horizontal"
});
function Tabs({ className, variant = "default", orientation = "horizontal", ...props }) {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(TabsContext, {
		value: {
			variant,
			orientation
		},
		children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_radix_ui_react_tabs.Root, {
			"data-slot": "tabs",
			orientation,
			className: require_avatar.cn("flex flex-col gap-2", orientation === "vertical" && "flex-row", className),
			...props
		})
	});
}
const tabsListVariants = (0, class_variance_authority.cva)("inline-flex items-center justify-center", {
	variants: {
		variant: {
			default: "h-9 w-fit rounded-lg bg-muted p-[3px] text-muted-foreground",
			line: "justify-start gap-4 border-b-0 bg-transparent p-0",
			underline: "justify-start gap-0 border-b-0 bg-transparent p-0",
			workflow: "justify-start gap-3 border-b-0 bg-transparent p-0"
		},
		orientation: {
			horizontal: "flex-row",
			vertical: "h-fit flex-col"
		}
	},
	compoundVariants: [{
		variant: "default",
		orientation: "vertical",
		class: "h-fit w-fit flex-col"
	}, {
		variant: "line",
		orientation: "vertical",
		class: "flex-col items-stretch pb-0"
	}],
	defaultVariants: {
		variant: "default",
		orientation: "horizontal"
	}
});
function TabsList({ className, ...props }) {
	const { variant, orientation } = react.use(TabsContext);
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_radix_ui_react_tabs.List, {
		"data-slot": "tabs-list",
		className: require_avatar.cn(tabsListVariants({
			variant,
			orientation
		}), className),
		...props
	});
}
const tabsTriggerVariants = (0, class_variance_authority.cva)([
	"inline-flex items-center justify-center text-sm font-medium whitespace-nowrap",
	"disabled:pointer-events-none disabled:opacity-50",
	"transition-all outline-none",
	"[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*=\"size-\"])]:size-4"
], {
	variants: {
		variant: {
			default: [
				"h-[calc(100%-1px)] flex-1 gap-1.5 rounded-md px-2 py-1",
				"border border-transparent text-foreground",
				"dark:text-muted-foreground",
				"focus-visible:border-primary focus-visible:bg-accent",
				"data-[state=active]:bg-background data-[state=active]:shadow-sm",
				"dark:data-[state=active]:border-input dark:data-[state=active]:bg-input/30 dark:data-[state=active]:text-foreground"
			],
			line: [
				"relative gap-2 px-2 py-2",
				"font-normal text-muted-foreground hover:text-foreground",
				"focus-visible:text-foreground focus-visible:underline focus-visible:underline-offset-4",
				"data-[state=active]:text-primary",
				"after:absolute after:rounded-full after:bg-transparent",
				"data-[state=active]:after:bg-primary"
			],
			underline: [
				"relative gap-1.5 px-2.5 py-2",
				"font-normal text-muted-foreground hover:text-foreground",
				"focus-visible:text-foreground focus-visible:underline focus-visible:underline-offset-4",
				"data-[state=active]:text-foreground",
				"after:absolute after:rounded-none after:bg-transparent",
				"data-[state=active]:after:bg-primary"
			],
			workflow: [
				"relative gap-1.5 px-1 py-1.5 text-sm font-normal",
				"text-muted-foreground hover:text-foreground",
				"rounded-sm focus-visible:text-foreground focus-visible:underline focus-visible:underline-offset-4",
				"data-[state=active]:font-semibold data-[state=active]:text-foreground",
				"data-[state=active]:underline data-[state=active]:decoration-1 data-[state=active]:underline-offset-4",
				"[&:not(:first-child)]:before:content-['›']",
				"[&:not(:first-child)]:before:mr-3 [&:not(:first-child)]:before:text-base",
				"[&:not(:first-child)]:before:font-normal [&:not(:first-child)]:before:no-underline",
				"[&:not(:first-child)]:before:text-muted-foreground"
			]
		},
		orientation: {
			horizontal: "",
			vertical: "rounded-full"
		}
	},
	compoundVariants: [
		{
			variant: "line",
			orientation: "horizontal",
			class: "after:bottom-0 after:left-0 after:h-[2px] after:w-full data-[state=active]:after:h-[4px]"
		},
		{
			variant: "line",
			orientation: "vertical",
			class: ["justify-center after:bottom-0 after:left-0 after:h-[4px] after:w-full after:bg-transparent data-[state=active]:after:bg-primary", "hover:bg-primary/10 hover:text-primary"]
		},
		{
			variant: "underline",
			orientation: "horizontal",
			class: "after:bottom-0 after:left-0 after:h-0.5 after:w-full"
		}
	],
	defaultVariants: {
		variant: "default",
		orientation: "horizontal"
	}
});
function TabsTrigger({ className, ...props }) {
	const { variant, orientation } = react.use(TabsContext);
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_radix_ui_react_tabs.Trigger, {
		"data-slot": "tabs-trigger",
		className: require_avatar.cn(tabsTriggerVariants({
			variant,
			orientation
		}), className),
		...props
	});
}
function TabsContent({ className, ...props }) {
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_radix_ui_react_tabs.Content, {
		"data-slot": "tabs-content",
		className: require_avatar.cn("flex-1 outline-none", className),
		...props
	});
}
//#endregion
//#region src/components/primitives/toast.tsx
const DEFAULT_TIMEOUT = 3e3;
const DEFAULT_TOAST_LABELS = {
	close: "Close",
	details: "View details",
	error: "Error",
	errorDescription: "An error occurred",
	loading: "Loading...",
	success: "Success"
};
const getToastKey = (key) => String(key ?? `toast-${Date.now()}-${Math.random()}`);
const resolveToastLabels = (labels) => typeof labels === "function" ? labels() : labels;
const getToastLabels = (labels) => ({
	...DEFAULT_TOAST_LABELS,
	...resolveToastLabels(labels)
});
const createToastStore = () => {
	let toastQueue = [];
	const listeners = /* @__PURE__ */ new Set();
	const timers = /* @__PURE__ */ new Map();
	const deadlines = /* @__PURE__ */ new Map();
	const remaining = /* @__PURE__ */ new Map();
	let paused = false;
	const loadingTokens = /* @__PURE__ */ new Map();
	const notify = () => {
		listeners.forEach((listener) => listener());
	};
	const subscribe = (listener) => {
		listeners.add(listener);
		if (listeners.size > 1) console.error("multiple ToastViewport mounted in one window; every toast will render once per host");
		return () => {
			listeners.delete(listener);
		};
	};
	const getSnapshot = () => toastQueue;
	const clearTimer = (key) => {
		const timer = timers.get(key);
		if (timer) {
			clearTimeout(timer);
			timers.delete(key);
		}
	};
	const remove = (key) => {
		const toast = toastQueue.find((item) => item.key === key);
		clearTimer(key);
		loadingTokens.delete(key);
		deadlines.delete(key);
		remaining.delete(key);
		toastQueue = toastQueue.filter((item) => item.key !== key);
		toast?.onClose?.();
		notify();
	};
	const schedule = (toast) => {
		clearTimer(toast.key);
		deadlines.delete(toast.key);
		remaining.delete(toast.key);
		if (toast.timeout === 0 || toast.type === "loading") return;
		const timeout = toast.timeout ?? DEFAULT_TIMEOUT;
		if (paused) {
			remaining.set(toast.key, timeout);
			return;
		}
		deadlines.set(toast.key, Date.now() + timeout);
		timers.set(toast.key, setTimeout(() => {
			remove(toast.key);
		}, timeout));
	};
	const setPaused = (value) => {
		if (paused === value) return;
		paused = value;
		if (paused) {
			deadlines.forEach((deadline, key) => {
				remaining.set(key, Math.max(0, deadline - Date.now()));
				clearTimer(key);
			});
			deadlines.clear();
		} else {
			toastQueue.forEach((toast) => {
				const timeout = remaining.get(toast.key);
				if (timeout === void 0) return;
				deadlines.set(toast.key, Date.now() + timeout);
				timers.set(toast.key, setTimeout(() => remove(toast.key), timeout));
			});
			remaining.clear();
		}
	};
	const upsert = (toast) => {
		const existingIndex = toastQueue.findIndex((item) => item.key === toast.key);
		if (existingIndex >= 0) toastQueue = toastQueue.map((item, index) => index === existingIndex ? toast : item);
		else toastQueue = [...toastQueue, toast];
		schedule(toast);
		notify();
	};
	const closeAll = () => {
		toastQueue.forEach((toast) => {
			clearTimer(toast.key);
			loadingTokens.delete(toast.key);
			toast.onClose?.();
		});
		deadlines.clear();
		remaining.clear();
		toastQueue = [];
		notify();
	};
	return {
		closeAll,
		getLoadingToken: (key) => loadingTokens.get(key),
		getSnapshot,
		remove,
		setPaused,
		setLoadingToken: (key, token) => loadingTokens.set(key, token),
		subscribe,
		unsetLoadingToken: (key) => loadingTokens.delete(key),
		upsert
	};
};
const defaultToastStore = createToastStore();
const ToastLabelsContext = (0, react.createContext)(void 0);
const upsertToast = (toast, store = defaultToastStore) => {
	store.upsert(toast);
};
const createToast = (type, store = defaultToastStore) => {
	return (arg) => {
		const config = typeof arg === "string" ? { title: arg } : arg;
		const key = getToastKey(config.key);
		store.unsetLoadingToken(key);
		upsertToast({
			...config,
			key,
			type
		}, store);
		return key;
	};
};
const createLoadingToast = (labels, store = defaultToastStore) => (args) => {
	const toastLabels = getToastLabels(labels);
	const { title, description, icon, onError, promise, timeout, ...restConfig } = args;
	const key = getToastKey(args.key);
	const token = Symbol(key);
	store.setLoadingToken(key, token);
	upsertToast({
		...restConfig,
		description,
		icon,
		key,
		title: title || toastLabels.loading,
		timeout: 0,
		type: "loading"
	}, store);
	promise?.then((result) => {
		if (store.getLoadingToken(key) !== token) return result;
		store.unsetLoadingToken(key);
		upsertToast({
			...restConfig,
			description,
			key,
			title: title || toastLabels.success,
			timeout: timeout ?? 2e3,
			type: "success"
		}, store);
		return result;
	}).catch((err) => {
		if (store.getLoadingToken(key) !== token) return;
		store.unsetLoadingToken(key);
		onError?.(err);
		upsertToast({
			...restConfig,
			description: err?.message || description || toastLabels.errorDescription,
			key,
			title: title || toastLabels.error,
			timeout: timeout ?? 0,
			type: "error"
		}, store);
	});
	return key;
};
const createToastUtilities = (labels, store = defaultToastStore) => ({
	closeAll: store.closeAll,
	closeToast: (key) => store.remove(key),
	error: createToast("error", store),
	getToastQueue: () => ({ toasts: store.getSnapshot() }),
	info: createToast("info", store),
	loading: createLoadingToast(labels, store),
	success: createToast("success", store),
	warning: createToast("warning", store)
});
const error = createToast("error");
const success = createToast("success");
const warning = createToast("warning");
const info = createToast("info");
const loading = createLoadingToast();
const closeToast = (key) => {
	defaultToastStore.remove(key);
};
const closeAll = () => {
	defaultToastStore.closeAll();
};
const getToastQueue = () => ({ toasts: defaultToastStore.getSnapshot() });
const getToastUtilities = (labels) => createToastUtilities(labels);
const useToasts = (labels) => {
	const contextLabels = (0, react.use)(ToastLabelsContext);
	const toastLabels = labels ?? contextLabels;
	return (0, react.useMemo)(() => createToastUtilities(toastLabels), [toastLabels]);
};
/**
* Convenience combo of i18n labels + a viewport, all bound to the single module
* `defaultToastStore`. It deliberately does NOT fork its own store: the module
* toast functions (`error`/`success`/… and `window.toast`) also write to
* `defaultToastStore`, so a per-provider fork would leave the command entry and
* the rendered viewport on different stores (the quickAssistant black-hole bug
* class). Every ToastViewport in every window reads the same store.
*/
const ToastProvider = ({ children, labels }) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(ToastLabelsContext, {
	value: labels,
	children: [children, /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ToastViewport, { labels })]
});
const typeIconMap = {
	error: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(lucide_react.AlertCircle, { className: "size-4 text-destructive" }),
	success: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(lucide_react.CheckCircle2, { className: "size-4 text-success" }),
	warning: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(lucide_react.AlertTriangle, { className: "size-4 text-warning" }),
	info: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(lucide_react.Info, { className: "size-4 text-info" }),
	loading: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(lucide_react.LoaderCircle, { className: "size-4 animate-spin text-muted-foreground" })
};
const getToastA11yProps = (type) => {
	if (type === "warning" || type === "error") return {
		"aria-live": "assertive",
		role: "alert"
	};
	return {
		"aria-live": "polite",
		role: "status"
	};
};
const ToastItem = ({ labels, store, toast }) => {
	const action = toast.action;
	const secondaryAction = toast.secondaryAction;
	const icon = toast.icon ?? typeIconMap[toast.type];
	const a11yProps = getToastA11yProps(toast.type);
	return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
		...a11yProps,
		className: require_avatar.cn("pointer-events-auto flex w-[min(420px,calc(100vw-2rem))] items-start gap-3 [-webkit-app-region:no-drag]", "rounded-md border border-border bg-popover px-4 py-3 text-popover-foreground shadow-lg", action && "w-[min(480px,calc(100vw-2rem))]", toast.className),
		style: toast.style,
		onClick: toast.onClick,
		children: [
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: "flex min-h-7 shrink-0 items-center justify-center",
				children: icon
			}),
			/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "min-w-0 flex-1",
				children: [
					toast.title && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						title: typeof toast.title === "string" ? toast.title : void 0,
						className: require_avatar.cn("min-h-7 py-1 text-sm leading-5 font-medium", toast.details ? "break-words" : "truncate"),
						children: toast.title
					}),
					toast.description && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: require_avatar.cn("text-xs leading-5 break-words text-muted-foreground", (toast.title || !action) && "mt-0.5", action && !toast.title && "min-h-7 py-1"),
						children: toast.description
					}),
					toast.details && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("details", {
						className: "mt-1 text-xs text-muted-foreground",
						onClick: (event) => event.stopPropagation(),
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("summary", {
							className: "cursor-pointer",
							title: toast.details,
							children: labels.details ?? DEFAULT_TOAST_LABELS.details
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("pre", {
							className: "mt-1 max-h-40 overflow-auto font-mono break-words whitespace-pre-wrap",
							children: toast.details
						})]
					})
				]
			}),
			secondaryAction && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
				type: "button",
				className: "shrink-0",
				size: "sm",
				variant: "link",
				onClick: (event) => {
					event.stopPropagation();
					store.remove(toast.key);
					secondaryAction.onClick();
				},
				children: secondaryAction.label
			}),
			action && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Button, {
				type: "button",
				className: "shrink-0",
				size: "sm",
				variant: "outline",
				onClick: (event) => {
					event.stopPropagation();
					store.remove(toast.key);
					action.onClick();
				},
				children: action.label
			}),
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				className: "flex min-h-7 shrink-0 items-center",
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
					type: "button",
					"aria-label": labels.close,
					className: "-mr-1 flex size-5 shrink-0 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
					onClick: (event) => {
						event.stopPropagation();
						store.remove(toast.key);
					},
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(lucide_react.X, { className: "size-3.5" })
				})
			})
		]
	});
};
const ToastViewport = ({ labels, store = defaultToastStore }) => {
	const toasts = (0, react.useSyncExternalStore)(store.subscribe, store.getSnapshot, store.getSnapshot);
	const toastLabels = getToastLabels(labels);
	const reducedMotion = (0, motion_react.useReducedMotion)();
	const transition = {
		duration: reducedMotion ? 0 : .25,
		ease: "easeOut"
	};
	const viewportRef = (0, react.useRef)(null);
	const [hovered, setHovered] = (0, react.useState)(false);
	const [focused, setFocused] = (0, react.useState)(false);
	const expanded = hovered || focused;
	(0, react.useEffect)(() => {
		store.setPaused(expanded && toasts.length > 0);
		return () => store.setPaused(false);
	}, [
		expanded,
		store,
		toasts.length
	]);
	(0, react.useEffect)(() => {
		setFocused(viewportRef.current?.contains(document.activeElement) ?? false);
		if (toasts.length === 0) setHovered(false);
	}, [toasts.length]);
	if (toasts.length === 0) return null;
	return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
		ref: viewportRef,
		"aria-label": "notifications",
		className: require_avatar.cn("pointer-events-auto fixed top-5 left-1/2 z-[10000] -translate-x-1/2 [-webkit-app-region:no-drag]", expanded ? "flex max-h-[calc(100vh-2.5rem)] flex-col items-center gap-2 overflow-y-auto p-2" : "grid pb-4"),
		onMouseEnter: () => setHovered(true),
		onMouseLeave: () => setHovered(false),
		onFocus: () => setFocused(true),
		onBlur: (event) => {
			if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false);
		},
		role: "region",
		children: [...toasts].reverse().map((toast, index) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)(motion_react.motion.div, {
			layout: reducedMotion ? false : "position",
			transition,
			inert: !expanded && index > 0,
			className: require_avatar.cn(!expanded && "col-start-1 row-start-1"),
			style: { zIndex: toasts.length - index },
			children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(motion_react.motion.div, {
				initial: false,
				animate: {
					y: expanded ? 0 : Math.min(index, 2) * 8,
					scale: expanded ? 1 : 1 - Math.min(index, 2) * .04,
					opacity: expanded || index < 3 ? 1 : 0
				},
				transition,
				className: "origin-top",
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ToastItem, {
					labels: toastLabels,
					store,
					toast
				})
			})
		}, toast.key))
	});
};
//#endregion
//#region src/components/primitives/tree-select.tsx
const treeSelectTriggerVariants = (0, class_variance_authority.cva)(require_avatar.cn("inline-flex items-center justify-between rounded-md border-1 text-sm font-normal transition-colors outline-none", "bg-input", "text-foreground"), {
	variants: {
		state: {
			default: "border-border focus-visible:border-primary",
			error: "border border-destructive",
			disabled: "pointer-events-none cursor-not-allowed opacity-50"
		},
		size: {
			sm: "h-8 gap-1 px-2 text-xs",
			default: "h-9 gap-2 px-3",
			lg: "h-10 gap-2 px-4"
		}
	},
	defaultVariants: {
		state: "default",
		size: "default"
	}
});
function getOptionLabel(option) {
	return option.label ?? option.title ?? option.value;
}
function nodeToText(node) {
	if (typeof node === "string" || typeof node === "number") return String(node);
	if (Array.isArray(node)) return node.map(nodeToText).join(" ");
	return "";
}
function getOptionSearchText(option) {
	return [
		option.searchText,
		nodeToText(option.label),
		nodeToText(option.title),
		option.value
	].filter(Boolean).join(" ").toLowerCase();
}
function findOption(options, value) {
	for (const option of options) {
		if (option.value === value) return option;
		const child = option.children ? findOption(option.children, value) : void 0;
		if (child) return child;
	}
}
function collectExpandableValues(options) {
	const values = [];
	for (const option of options) if (option.children?.length) {
		values.push(option.value);
		values.push(...collectExpandableValues(option.children));
	}
	return values;
}
function toVisibleTree(options, search, filterOption) {
	const normalizedSearch = search.trim().toLowerCase();
	return options.reduce((nodes, option) => {
		const children = option.children ? toVisibleTree(option.children, search, filterOption) : [];
		if ((!normalizedSearch ? true : filterOption ? filterOption(option, search) : getOptionSearchText(option).includes(normalizedSearch)) || children.length > 0) nodes.push({
			option,
			children
		});
		return nodes;
	}, []);
}
function TreeSelect({ treeData, value: controlledValue, defaultValue, onChange, renderOption, renderValue, searchable = true, searchPlaceholder = "Search...", emptyText = "No results found.", filterOption, defaultExpandAll = false, defaultExpandedValues, expandedValues: controlledExpandedValues, onExpandedValuesChange, expandLabel = "Expand", collapseLabel = "Collapse", placeholder = "Please Select", disabled = false, error = false, className, popoverClassName, triggerStyle, width, maxHeight = 320, size, name }) {
	const [internalOpen, setInternalOpen] = react.useState(false);
	const [internalValue, setInternalValue] = react.useState(defaultValue);
	const [search, setSearch] = react.useState("");
	const [internalExpandedValues, setInternalExpandedValues] = react.useState(() => {
		if (defaultExpandedValues) return defaultExpandedValues;
		return defaultExpandAll ? collectExpandableValues(treeData) : [];
	});
	const searchInputRef = react.useRef(null);
	const value = controlledValue ?? internalValue;
	const selectedOption = value !== void 0 ? findOption(treeData, value) : void 0;
	const expandedValues = controlledExpandedValues ?? internalExpandedValues;
	const expandedSet = react.useMemo(() => new Set(expandedValues), [expandedValues]);
	const visibleTree = react.useMemo(() => toVisibleTree(treeData, search, filterOption), [
		filterOption,
		search,
		treeData
	]);
	const triggerWidth = width ? typeof width === "number" ? `${width}px` : width : void 0;
	const state = disabled ? "disabled" : error ? "error" : "default";
	const hasSearch = search.trim().length > 0;
	const setExpandedValues = react.useCallback((nextValues) => {
		if (controlledExpandedValues === void 0) setInternalExpandedValues(nextValues);
		onExpandedValuesChange?.(nextValues);
	}, [controlledExpandedValues, onExpandedValuesChange]);
	const toggleExpanded = react.useCallback((optionValue) => {
		const nextValues = expandedSet.has(optionValue) ? expandedValues.filter((value) => value !== optionValue) : [...expandedValues, optionValue];
		setExpandedValues(nextValues);
	}, [
		expandedSet,
		expandedValues,
		setExpandedValues
	]);
	const handleOpenChange = (nextOpen) => {
		setInternalOpen(nextOpen);
		if (!nextOpen) setSearch("");
	};
	const handleSelect = (option) => {
		if (option.disabled) return;
		if (option.selectable === false) {
			if (option.children?.length) toggleExpanded(option.value);
			return;
		}
		if (controlledValue === void 0) setInternalValue(option.value);
		onChange?.(option.value, option);
		handleOpenChange(false);
	};
	const renderTriggerContent = () => {
		if (!selectedOption) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
			className: "truncate text-muted-foreground",
			children: placeholder
		});
		if (renderValue) return renderValue(selectedOption);
		return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
			className: "flex min-w-0 flex-1 items-center gap-2 truncate",
			children: [selectedOption.icon && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
				className: "shrink-0",
				children: selectedOption.icon
			}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
				className: "truncate",
				children: getOptionLabel(selectedOption)
			})]
		});
	};
	const renderOptionContent = (option, renderState) => {
		if (renderOption) return renderOption(option, renderState);
		return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
			option.icon && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
				className: "shrink-0",
				children: option.icon
			}),
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
				className: "min-w-0 flex-1 truncate",
				children: getOptionLabel(option)
			}),
			renderState.selected && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(lucide_react.Check, { className: "size-4 shrink-0 text-primary" })
		] });
	};
	const renderNodes = (nodes, depth = 0) => nodes.map(({ option, children }) => {
		const hasChildren = children.length > 0 || Boolean(option.children?.length);
		const expanded = hasSearch || expandedSet.has(option.value);
		const selected = value === option.value;
		const rowState = {
			depth,
			expanded,
			hasChildren,
			selected
		};
		const rowKey = option.key ?? option.value;
		return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
			className: "flex items-center gap-1",
			style: { paddingLeft: depth * 14 },
			children: [hasChildren ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
				type: "button",
				"aria-label": expanded ? collapseLabel : expandLabel,
				"aria-expanded": expanded,
				onClick: () => toggleExpanded(option.value),
				className: "flex size-6 shrink-0 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(lucide_react.ChevronRight, { className: require_avatar.cn("size-4 transition-transform", expanded && "rotate-90") })
			}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: "size-6 shrink-0" }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
				type: "button",
				role: "treeitem",
				"aria-selected": selected,
				disabled: option.disabled,
				onClick: () => handleSelect(option),
				className: require_avatar.cn("flex min-w-0 flex-1 items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors outline-none", selected ? "bg-primary/10 text-primary" : "text-foreground hover:bg-accent/60", option.disabled && "pointer-events-none opacity-50", option.selectable === false && "text-muted-foreground"),
				children: renderOptionContent(option, rowState)
			})]
		}), hasChildren && expanded && children.length > 0 && renderNodes(children, depth + 1)] }, rowKey);
	});
	return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(Popover, {
		open: internalOpen,
		onOpenChange: handleOpenChange,
		children: [
			/* @__PURE__ */ (0, react_jsx_runtime.jsx)(PopoverTrigger, {
				asChild: true,
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(Button, {
					type: "button",
					variant: "outline",
					size,
					disabled,
					style: {
						width: triggerWidth,
						...triggerStyle
					},
					className: require_avatar.cn(treeSelectTriggerVariants({
						state,
						size
					}), className),
					role: "combobox",
					"aria-expanded": internalOpen,
					"aria-invalid": error,
					children: [renderTriggerContent(), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(lucide_react.ChevronDown, { className: require_avatar.cn("size-4 shrink-0 opacity-50 transition-transform", internalOpen && "rotate-180") })]
				})
			}),
			/* @__PURE__ */ (0, react_jsx_runtime.jsxs)(PopoverContent, {
				align: "start",
				className: require_avatar.cn("w-(--radix-popover-trigger-width) rounded-md p-1", popoverClassName),
				style: { width: triggerWidth },
				onOpenAutoFocus: (event) => {
					if (!searchable) return;
					event.preventDefault();
					searchInputRef.current?.focus();
				},
				children: [searchable && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					className: "border-b p-1",
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(Input$1, {
						ref: searchInputRef,
						value: search,
						onChange: (event) => setSearch(event.target.value),
						placeholder: searchPlaceholder,
						className: "h-8 shadow-none"
					})
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ScrollArea, {
					type: "auto",
					viewportProps: { role: "tree" },
					contentProps: { className: "py-1" },
					style: { maxHeight },
					children: visibleTree.length > 0 ? renderNodes(visibleTree) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: "px-2 py-6 text-center text-sm text-muted-foreground",
						children: emptyText
					})
				})]
			}),
			name && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
				type: "hidden",
				name,
				value: value ?? ""
			})
		]
	});
}
//#endregion
Object.defineProperty(exports, "Accordion", {
	enumerable: true,
	get: function() {
		return Accordion;
	}
});
Object.defineProperty(exports, "AccordionContent", {
	enumerable: true,
	get: function() {
		return AccordionContent;
	}
});
Object.defineProperty(exports, "AccordionItem", {
	enumerable: true,
	get: function() {
		return AccordionItem;
	}
});
Object.defineProperty(exports, "AccordionTrigger", {
	enumerable: true,
	get: function() {
		return AccordionTrigger;
	}
});
Object.defineProperty(exports, "Alert", {
	enumerable: true,
	get: function() {
		return Alert;
	}
});
Object.defineProperty(exports, "Badge", {
	enumerable: true,
	get: function() {
		return Badge;
	}
});
Object.defineProperty(exports, "BarVisualizer", {
	enumerable: true,
	get: function() {
		return BarVisualizer;
	}
});
Object.defineProperty(exports, "BlurCancelPointerSensor", {
	enumerable: true,
	get: function() {
		return BlurCancelPointerSensor;
	}
});
Object.defineProperty(exports, "Box", {
	enumerable: true,
	get: function() {
		return Box;
	}
});
Object.defineProperty(exports, "Breadcrumb", {
	enumerable: true,
	get: function() {
		return Breadcrumb;
	}
});
Object.defineProperty(exports, "BreadcrumbEllipsis", {
	enumerable: true,
	get: function() {
		return BreadcrumbEllipsis;
	}
});
Object.defineProperty(exports, "BreadcrumbItem", {
	enumerable: true,
	get: function() {
		return BreadcrumbItem;
	}
});
Object.defineProperty(exports, "BreadcrumbLink", {
	enumerable: true,
	get: function() {
		return BreadcrumbLink;
	}
});
Object.defineProperty(exports, "BreadcrumbList", {
	enumerable: true,
	get: function() {
		return BreadcrumbList;
	}
});
Object.defineProperty(exports, "BreadcrumbPage", {
	enumerable: true,
	get: function() {
		return BreadcrumbPage;
	}
});
Object.defineProperty(exports, "BreadcrumbSeparator", {
	enumerable: true,
	get: function() {
		return BreadcrumbSeparator;
	}
});
Object.defineProperty(exports, "Button", {
	enumerable: true,
	get: function() {
		return Button;
	}
});
Object.defineProperty(exports, "ButtonGroup", {
	enumerable: true,
	get: function() {
		return ButtonGroup;
	}
});
Object.defineProperty(exports, "ButtonGroupItem", {
	enumerable: true,
	get: function() {
		return ButtonGroupItem;
	}
});
Object.defineProperty(exports, "ButtonGroupSeparator", {
	enumerable: true,
	get: function() {
		return ButtonGroupSeparator;
	}
});
Object.defineProperty(exports, "ButtonGroupText", {
	enumerable: true,
	get: function() {
		return ButtonGroupText;
	}
});
Object.defineProperty(exports, "Calendar", {
	enumerable: true,
	get: function() {
		return Calendar;
	}
});
Object.defineProperty(exports, "Center", {
	enumerable: true,
	get: function() {
		return Center;
	}
});
Object.defineProperty(exports, "Checkbox", {
	enumerable: true,
	get: function() {
		return Checkbox;
	}
});
Object.defineProperty(exports, "CircularProgress", {
	enumerable: true,
	get: function() {
		return CircularProgress;
	}
});
Object.defineProperty(exports, "ColFlex", {
	enumerable: true,
	get: function() {
		return ColFlex;
	}
});
Object.defineProperty(exports, "Combobox", {
	enumerable: true,
	get: function() {
		return Combobox;
	}
});
Object.defineProperty(exports, "Command", {
	enumerable: true,
	get: function() {
		return Command;
	}
});
Object.defineProperty(exports, "CommandDialog", {
	enumerable: true,
	get: function() {
		return CommandDialog;
	}
});
Object.defineProperty(exports, "CommandEmpty", {
	enumerable: true,
	get: function() {
		return CommandEmpty;
	}
});
Object.defineProperty(exports, "CommandGroup", {
	enumerable: true,
	get: function() {
		return CommandGroup;
	}
});
Object.defineProperty(exports, "CommandInput", {
	enumerable: true,
	get: function() {
		return CommandInput;
	}
});
Object.defineProperty(exports, "CommandItem", {
	enumerable: true,
	get: function() {
		return CommandItem;
	}
});
Object.defineProperty(exports, "CommandList", {
	enumerable: true,
	get: function() {
		return CommandList;
	}
});
Object.defineProperty(exports, "CommandSeparator", {
	enumerable: true,
	get: function() {
		return CommandSeparator;
	}
});
Object.defineProperty(exports, "CommandShortcut", {
	enumerable: true,
	get: function() {
		return CommandShortcut;
	}
});
Object.defineProperty(exports, "CompositeInput", {
	enumerable: true,
	get: function() {
		return CompositeInput;
	}
});
Object.defineProperty(exports, "ConfirmDialog", {
	enumerable: true,
	get: function() {
		return ConfirmDialog;
	}
});
Object.defineProperty(exports, "ContextMenu", {
	enumerable: true,
	get: function() {
		return ContextMenu;
	}
});
Object.defineProperty(exports, "ContextMenuCheckboxItem", {
	enumerable: true,
	get: function() {
		return ContextMenuCheckboxItem;
	}
});
Object.defineProperty(exports, "ContextMenuContent", {
	enumerable: true,
	get: function() {
		return ContextMenuContent;
	}
});
Object.defineProperty(exports, "ContextMenuGroup", {
	enumerable: true,
	get: function() {
		return ContextMenuGroup;
	}
});
Object.defineProperty(exports, "ContextMenuItem", {
	enumerable: true,
	get: function() {
		return ContextMenuItem;
	}
});
Object.defineProperty(exports, "ContextMenuItemContent", {
	enumerable: true,
	get: function() {
		return ContextMenuItemContent;
	}
});
Object.defineProperty(exports, "ContextMenuLabel", {
	enumerable: true,
	get: function() {
		return ContextMenuLabel;
	}
});
Object.defineProperty(exports, "ContextMenuPortal", {
	enumerable: true,
	get: function() {
		return ContextMenuPortal;
	}
});
Object.defineProperty(exports, "ContextMenuRadioGroup", {
	enumerable: true,
	get: function() {
		return ContextMenuRadioGroup;
	}
});
Object.defineProperty(exports, "ContextMenuRadioItem", {
	enumerable: true,
	get: function() {
		return ContextMenuRadioItem;
	}
});
Object.defineProperty(exports, "ContextMenuSeparator", {
	enumerable: true,
	get: function() {
		return ContextMenuSeparator;
	}
});
Object.defineProperty(exports, "ContextMenuShortcut", {
	enumerable: true,
	get: function() {
		return ContextMenuShortcut;
	}
});
Object.defineProperty(exports, "ContextMenuSub", {
	enumerable: true,
	get: function() {
		return ContextMenuSub;
	}
});
Object.defineProperty(exports, "ContextMenuSubContent", {
	enumerable: true,
	get: function() {
		return ContextMenuSubContent;
	}
});
Object.defineProperty(exports, "ContextMenuSubTrigger", {
	enumerable: true,
	get: function() {
		return ContextMenuSubTrigger;
	}
});
Object.defineProperty(exports, "ContextMenuTrigger", {
	enumerable: true,
	get: function() {
		return ContextMenuTrigger;
	}
});
Object.defineProperty(exports, "CopyButton", {
	enumerable: true,
	get: function() {
		return CopyButton;
	}
});
Object.defineProperty(exports, "DEFAULT_IMAGE_PREVIEW_LABELS", {
	enumerable: true,
	get: function() {
		return DEFAULT_IMAGE_PREVIEW_LABELS;
	}
});
Object.defineProperty(exports, "DISALLOWED_ELEMENTS", {
	enumerable: true,
	get: function() {
		return DISALLOWED_ELEMENTS;
	}
});
Object.defineProperty(exports, "DataTable", {
	enumerable: true,
	get: function() {
		return DataTable;
	}
});
Object.defineProperty(exports, "DateTimePicker", {
	enumerable: true,
	get: function() {
		return DateTimePicker;
	}
});
Object.defineProperty(exports, "DescriptionSwitch", {
	enumerable: true,
	get: function() {
		return DescriptionSwitch;
	}
});
Object.defineProperty(exports, "Dialog", {
	enumerable: true,
	get: function() {
		return Dialog;
	}
});
Object.defineProperty(exports, "DialogClose", {
	enumerable: true,
	get: function() {
		return DialogClose;
	}
});
Object.defineProperty(exports, "DialogContent", {
	enumerable: true,
	get: function() {
		return DialogContent;
	}
});
Object.defineProperty(exports, "DialogDescription", {
	enumerable: true,
	get: function() {
		return DialogDescription;
	}
});
Object.defineProperty(exports, "DialogFooter", {
	enumerable: true,
	get: function() {
		return DialogFooter;
	}
});
Object.defineProperty(exports, "DialogHeader", {
	enumerable: true,
	get: function() {
		return DialogHeader;
	}
});
Object.defineProperty(exports, "DialogOverlay", {
	enumerable: true,
	get: function() {
		return DialogOverlay;
	}
});
Object.defineProperty(exports, "DialogPortal", {
	enumerable: true,
	get: function() {
		return DialogPortal;
	}
});
Object.defineProperty(exports, "DialogPortalContainerProvider", {
	enumerable: true,
	get: function() {
		return DialogPortalContainerProvider;
	}
});
Object.defineProperty(exports, "DialogTitle", {
	enumerable: true,
	get: function() {
		return DialogTitle;
	}
});
Object.defineProperty(exports, "DialogTrigger", {
	enumerable: true,
	get: function() {
		return DialogTrigger;
	}
});
Object.defineProperty(exports, "Divider", {
	enumerable: true,
	get: function() {
		return Divider;
	}
});
Object.defineProperty(exports, "DividerWithText", {
	enumerable: true,
	get: function() {
		return DividerWithText;
	}
});
Object.defineProperty(exports, "Drawer", {
	enumerable: true,
	get: function() {
		return Drawer;
	}
});
Object.defineProperty(exports, "DrawerClose", {
	enumerable: true,
	get: function() {
		return DrawerClose;
	}
});
Object.defineProperty(exports, "DrawerContent", {
	enumerable: true,
	get: function() {
		return DrawerContent;
	}
});
Object.defineProperty(exports, "DrawerDescription", {
	enumerable: true,
	get: function() {
		return DrawerDescription;
	}
});
Object.defineProperty(exports, "DrawerFooter", {
	enumerable: true,
	get: function() {
		return DrawerFooter;
	}
});
Object.defineProperty(exports, "DrawerHeader", {
	enumerable: true,
	get: function() {
		return DrawerHeader;
	}
});
Object.defineProperty(exports, "DrawerOverlay", {
	enumerable: true,
	get: function() {
		return DrawerOverlay;
	}
});
Object.defineProperty(exports, "DrawerPortal", {
	enumerable: true,
	get: function() {
		return DrawerPortal;
	}
});
Object.defineProperty(exports, "DrawerTitle", {
	enumerable: true,
	get: function() {
		return DrawerTitle;
	}
});
Object.defineProperty(exports, "DrawerTrigger", {
	enumerable: true,
	get: function() {
		return DrawerTrigger;
	}
});
Object.defineProperty(exports, "DropdownMenu", {
	enumerable: true,
	get: function() {
		return DropdownMenu;
	}
});
Object.defineProperty(exports, "DropdownMenuCheckboxItem", {
	enumerable: true,
	get: function() {
		return DropdownMenuCheckboxItem;
	}
});
Object.defineProperty(exports, "DropdownMenuContent", {
	enumerable: true,
	get: function() {
		return DropdownMenuContent;
	}
});
Object.defineProperty(exports, "DropdownMenuGroup", {
	enumerable: true,
	get: function() {
		return DropdownMenuGroup;
	}
});
Object.defineProperty(exports, "DropdownMenuItem", {
	enumerable: true,
	get: function() {
		return DropdownMenuItem;
	}
});
Object.defineProperty(exports, "DropdownMenuLabel", {
	enumerable: true,
	get: function() {
		return DropdownMenuLabel;
	}
});
Object.defineProperty(exports, "DropdownMenuPortal", {
	enumerable: true,
	get: function() {
		return DropdownMenuPortal;
	}
});
Object.defineProperty(exports, "DropdownMenuRadioGroup", {
	enumerable: true,
	get: function() {
		return DropdownMenuRadioGroup;
	}
});
Object.defineProperty(exports, "DropdownMenuRadioItem", {
	enumerable: true,
	get: function() {
		return DropdownMenuRadioItem;
	}
});
Object.defineProperty(exports, "DropdownMenuSeparator", {
	enumerable: true,
	get: function() {
		return DropdownMenuSeparator;
	}
});
Object.defineProperty(exports, "DropdownMenuShortcut", {
	enumerable: true,
	get: function() {
		return DropdownMenuShortcut;
	}
});
Object.defineProperty(exports, "DropdownMenuSub", {
	enumerable: true,
	get: function() {
		return DropdownMenuSub;
	}
});
Object.defineProperty(exports, "DropdownMenuSubContent", {
	enumerable: true,
	get: function() {
		return DropdownMenuSubContent;
	}
});
Object.defineProperty(exports, "DropdownMenuSubTrigger", {
	enumerable: true,
	get: function() {
		return DropdownMenuSubTrigger;
	}
});
Object.defineProperty(exports, "DropdownMenuTrigger", {
	enumerable: true,
	get: function() {
		return DropdownMenuTrigger;
	}
});
Object.defineProperty(exports, "Dropzone", {
	enumerable: true,
	get: function() {
		return Dropzone;
	}
});
Object.defineProperty(exports, "DropzoneContent", {
	enumerable: true,
	get: function() {
		return DropzoneContent;
	}
});
Object.defineProperty(exports, "DropzoneEmptyState", {
	enumerable: true,
	get: function() {
		return DropzoneEmptyState;
	}
});
Object.defineProperty(exports, "Ellipsis", {
	enumerable: true,
	get: function() {
		return Ellipsis;
	}
});
Object.defineProperty(exports, "EmojiIcon", {
	enumerable: true,
	get: function() {
		return EmojiIcon;
	}
});
Object.defineProperty(exports, "EmptyState", {
	enumerable: true,
	get: function() {
		return EmptyState;
	}
});
Object.defineProperty(exports, "EntitySelector", {
	enumerable: true,
	get: function() {
		return EntitySelector;
	}
});
Object.defineProperty(exports, "ErrorBoundaryCustomized", {
	enumerable: true,
	get: function() {
		return ErrorBoundaryCustomized;
	}
});
Object.defineProperty(exports, "Field", {
	enumerable: true,
	get: function() {
		return Field;
	}
});
Object.defineProperty(exports, "FieldContent", {
	enumerable: true,
	get: function() {
		return FieldContent;
	}
});
Object.defineProperty(exports, "FieldDescription", {
	enumerable: true,
	get: function() {
		return FieldDescription;
	}
});
Object.defineProperty(exports, "FieldError", {
	enumerable: true,
	get: function() {
		return FieldError;
	}
});
Object.defineProperty(exports, "FieldGroup", {
	enumerable: true,
	get: function() {
		return FieldGroup;
	}
});
Object.defineProperty(exports, "FieldLabel", {
	enumerable: true,
	get: function() {
		return FieldLabel;
	}
});
Object.defineProperty(exports, "FieldLegend", {
	enumerable: true,
	get: function() {
		return FieldLegend;
	}
});
Object.defineProperty(exports, "FieldSeparator", {
	enumerable: true,
	get: function() {
		return FieldSeparator;
	}
});
Object.defineProperty(exports, "FieldSet", {
	enumerable: true,
	get: function() {
		return FieldSet;
	}
});
Object.defineProperty(exports, "FieldTitle", {
	enumerable: true,
	get: function() {
		return FieldTitle;
	}
});
Object.defineProperty(exports, "Flex", {
	enumerable: true,
	get: function() {
		return Flex;
	}
});
Object.defineProperty(exports, "Form", {
	enumerable: true,
	get: function() {
		return Form;
	}
});
Object.defineProperty(exports, "FormControl", {
	enumerable: true,
	get: function() {
		return FormControl;
	}
});
Object.defineProperty(exports, "FormDescription", {
	enumerable: true,
	get: function() {
		return FormDescription;
	}
});
Object.defineProperty(exports, "FormField", {
	enumerable: true,
	get: function() {
		return FormField;
	}
});
Object.defineProperty(exports, "FormItem", {
	enumerable: true,
	get: function() {
		return FormItem;
	}
});
Object.defineProperty(exports, "FormLabel", {
	enumerable: true,
	get: function() {
		return FormLabel;
	}
});
Object.defineProperty(exports, "FormMessage", {
	enumerable: true,
	get: function() {
		return FormMessage;
	}
});
Object.defineProperty(exports, "HelpTooltip", {
	enumerable: true,
	get: function() {
		return HelpTooltip;
	}
});
Object.defineProperty(exports, "HorizontalScrollContainer", {
	enumerable: true,
	get: function() {
		return HorizontalScrollContainer;
	}
});
Object.defineProperty(exports, "HoverCard", {
	enumerable: true,
	get: function() {
		return HoverCard;
	}
});
Object.defineProperty(exports, "HoverCardContent", {
	enumerable: true,
	get: function() {
		return HoverCardContent;
	}
});
Object.defineProperty(exports, "HoverCardTrigger", {
	enumerable: true,
	get: function() {
		return HoverCardTrigger;
	}
});
Object.defineProperty(exports, "ImagePreviewContextMenu", {
	enumerable: true,
	get: function() {
		return ImagePreviewContextMenu;
	}
});
Object.defineProperty(exports, "ImagePreviewDialog", {
	enumerable: true,
	get: function() {
		return ImagePreviewDialog;
	}
});
Object.defineProperty(exports, "ImagePreviewImage", {
	enumerable: true,
	get: function() {
		return ImagePreviewImage;
	}
});
Object.defineProperty(exports, "ImagePreviewToolbar", {
	enumerable: true,
	get: function() {
		return ImagePreviewToolbar;
	}
});
Object.defineProperty(exports, "ImagePreviewTrigger", {
	enumerable: true,
	get: function() {
		return ImagePreviewTrigger;
	}
});
Object.defineProperty(exports, "ImagePreviewViewport", {
	enumerable: true,
	get: function() {
		return ImagePreviewViewport;
	}
});
Object.defineProperty(exports, "IndicatorLight", {
	enumerable: true,
	get: function() {
		return IndicatorLight;
	}
});
Object.defineProperty(exports, "InfoTooltip", {
	enumerable: true,
	get: function() {
		return InfoTooltip;
	}
});
Object.defineProperty(exports, "Input", {
	enumerable: true,
	get: function() {
		return Input$1;
	}
});
Object.defineProperty(exports, "InputGroup", {
	enumerable: true,
	get: function() {
		return InputGroup;
	}
});
Object.defineProperty(exports, "InputGroupAddon", {
	enumerable: true,
	get: function() {
		return InputGroupAddon;
	}
});
Object.defineProperty(exports, "InputGroupButton", {
	enumerable: true,
	get: function() {
		return InputGroupButton;
	}
});
Object.defineProperty(exports, "InputGroupInput", {
	enumerable: true,
	get: function() {
		return InputGroupInput;
	}
});
Object.defineProperty(exports, "InputGroupInputNumber", {
	enumerable: true,
	get: function() {
		return InputGroupInputNumber;
	}
});
Object.defineProperty(exports, "InputGroupText", {
	enumerable: true,
	get: function() {
		return InputGroupText;
	}
});
Object.defineProperty(exports, "InputGroupTextarea", {
	enumerable: true,
	get: function() {
		return InputGroupTextarea;
	}
});
Object.defineProperty(exports, "InputNumber", {
	enumerable: true,
	get: function() {
		return InputNumber;
	}
});
Object.defineProperty(exports, "Item", {
	enumerable: true,
	get: function() {
		return Item;
	}
});
Object.defineProperty(exports, "ItemActions", {
	enumerable: true,
	get: function() {
		return ItemActions;
	}
});
Object.defineProperty(exports, "ItemContent", {
	enumerable: true,
	get: function() {
		return ItemContent;
	}
});
Object.defineProperty(exports, "ItemDescription", {
	enumerable: true,
	get: function() {
		return ItemDescription;
	}
});
Object.defineProperty(exports, "ItemFooter", {
	enumerable: true,
	get: function() {
		return ItemFooter;
	}
});
Object.defineProperty(exports, "ItemGroup", {
	enumerable: true,
	get: function() {
		return ItemGroup;
	}
});
Object.defineProperty(exports, "ItemHeader", {
	enumerable: true,
	get: function() {
		return ItemHeader;
	}
});
Object.defineProperty(exports, "ItemMedia", {
	enumerable: true,
	get: function() {
		return ItemMedia;
	}
});
Object.defineProperty(exports, "ItemSeparator", {
	enumerable: true,
	get: function() {
		return ItemSeparator;
	}
});
Object.defineProperty(exports, "ItemTitle", {
	enumerable: true,
	get: function() {
		return ItemTitle;
	}
});
Object.defineProperty(exports, "Kbd", {
	enumerable: true,
	get: function() {
		return Kbd;
	}
});
Object.defineProperty(exports, "KbdGroup", {
	enumerable: true,
	get: function() {
		return KbdGroup;
	}
});
Object.defineProperty(exports, "Label", {
	enumerable: true,
	get: function() {
		return Label;
	}
});
Object.defineProperty(exports, "LazyCodeEditor", {
	enumerable: true,
	get: function() {
		return LazyCodeEditor;
	}
});
Object.defineProperty(exports, "Markdown", {
	enumerable: true,
	get: function() {
		return Markdown;
	}
});
Object.defineProperty(exports, "MarkdownBlockContext", {
	enumerable: true,
	get: function() {
		return MarkdownBlockContext;
	}
});
Object.defineProperty(exports, "MenuDivider", {
	enumerable: true,
	get: function() {
		return MenuDivider;
	}
});
Object.defineProperty(exports, "MenuItem", {
	enumerable: true,
	get: function() {
		return MenuItem;
	}
});
Object.defineProperty(exports, "MenuList", {
	enumerable: true,
	get: function() {
		return MenuList;
	}
});
Object.defineProperty(exports, "NormalTooltip", {
	enumerable: true,
	get: function() {
		return NormalTooltip;
	}
});
Object.defineProperty(exports, "PageHeader", {
	enumerable: true,
	get: function() {
		return PageHeader;
	}
});
Object.defineProperty(exports, "PageSidePanel", {
	enumerable: true,
	get: function() {
		return PageSidePanel;
	}
});
Object.defineProperty(exports, "PageSidePanelItem", {
	enumerable: true,
	get: function() {
		return PageSidePanelItem;
	}
});
Object.defineProperty(exports, "PageSidePanelSection", {
	enumerable: true,
	get: function() {
		return PageSidePanelSection;
	}
});
Object.defineProperty(exports, "Pagination", {
	enumerable: true,
	get: function() {
		return Pagination;
	}
});
Object.defineProperty(exports, "PaginationContent", {
	enumerable: true,
	get: function() {
		return PaginationContent;
	}
});
Object.defineProperty(exports, "PaginationEllipsis", {
	enumerable: true,
	get: function() {
		return PaginationEllipsis;
	}
});
Object.defineProperty(exports, "PaginationItem", {
	enumerable: true,
	get: function() {
		return PaginationItem;
	}
});
Object.defineProperty(exports, "PaginationLink", {
	enumerable: true,
	get: function() {
		return PaginationLink;
	}
});
Object.defineProperty(exports, "PaginationNext", {
	enumerable: true,
	get: function() {
		return PaginationNext;
	}
});
Object.defineProperty(exports, "PaginationPrevious", {
	enumerable: true,
	get: function() {
		return PaginationPrevious;
	}
});
Object.defineProperty(exports, "Popover", {
	enumerable: true,
	get: function() {
		return Popover;
	}
});
Object.defineProperty(exports, "PopoverAnchor", {
	enumerable: true,
	get: function() {
		return PopoverAnchor;
	}
});
Object.defineProperty(exports, "PopoverContent", {
	enumerable: true,
	get: function() {
		return PopoverContent;
	}
});
Object.defineProperty(exports, "PopoverTrigger", {
	enumerable: true,
	get: function() {
		return PopoverTrigger;
	}
});
Object.defineProperty(exports, "PortalContainerProvider", {
	enumerable: true,
	get: function() {
		return PortalContainerProvider;
	}
});
Object.defineProperty(exports, "RadioGroup", {
	enumerable: true,
	get: function() {
		return RadioGroup;
	}
});
Object.defineProperty(exports, "RadioGroupItem", {
	enumerable: true,
	get: function() {
		return RadioGroupItem;
	}
});
Object.defineProperty(exports, "ReorderableList", {
	enumerable: true,
	get: function() {
		return ReorderableList;
	}
});
Object.defineProperty(exports, "RequiredMark", {
	enumerable: true,
	get: function() {
		return RequiredMark;
	}
});
Object.defineProperty(exports, "ResizableHandle", {
	enumerable: true,
	get: function() {
		return ResizableHandle;
	}
});
Object.defineProperty(exports, "ResizablePanel", {
	enumerable: true,
	get: function() {
		return ResizablePanel;
	}
});
Object.defineProperty(exports, "ResizablePanelGroup", {
	enumerable: true,
	get: function() {
		return ResizablePanelGroup;
	}
});
Object.defineProperty(exports, "RowFlex", {
	enumerable: true,
	get: function() {
		return RowFlex;
	}
});
Object.defineProperty(exports, "SVG_ATTRIBUTES", {
	enumerable: true,
	get: function() {
		return SVG_ATTRIBUTES;
	}
});
Object.defineProperty(exports, "SVG_ELEMENTS", {
	enumerable: true,
	get: function() {
		return SVG_ELEMENTS;
	}
});
Object.defineProperty(exports, "SVG_ELEMENT_REGEX", {
	enumerable: true,
	get: function() {
		return SVG_ELEMENT_REGEX;
	}
});
Object.defineProperty(exports, "ScrollArea", {
	enumerable: true,
	get: function() {
		return ScrollArea;
	}
});
Object.defineProperty(exports, "SearchInput", {
	enumerable: true,
	get: function() {
		return SearchInput;
	}
});
Object.defineProperty(exports, "SegmentedControl", {
	enumerable: true,
	get: function() {
		return SegmentedControl;
	}
});
Object.defineProperty(exports, "Select", {
	enumerable: true,
	get: function() {
		return Select;
	}
});
Object.defineProperty(exports, "SelectContent", {
	enumerable: true,
	get: function() {
		return SelectContent;
	}
});
Object.defineProperty(exports, "SelectDropdown", {
	enumerable: true,
	get: function() {
		return SelectDropdown;
	}
});
Object.defineProperty(exports, "SelectGroup", {
	enumerable: true,
	get: function() {
		return SelectGroup;
	}
});
Object.defineProperty(exports, "SelectItem", {
	enumerable: true,
	get: function() {
		return SelectItem;
	}
});
Object.defineProperty(exports, "SelectLabel", {
	enumerable: true,
	get: function() {
		return SelectLabel;
	}
});
Object.defineProperty(exports, "SelectScrollDownButton", {
	enumerable: true,
	get: function() {
		return SelectScrollDownButton;
	}
});
Object.defineProperty(exports, "SelectScrollUpButton", {
	enumerable: true,
	get: function() {
		return SelectScrollUpButton;
	}
});
Object.defineProperty(exports, "SelectSeparator", {
	enumerable: true,
	get: function() {
		return SelectSeparator;
	}
});
Object.defineProperty(exports, "SelectTrigger", {
	enumerable: true,
	get: function() {
		return SelectTrigger;
	}
});
Object.defineProperty(exports, "SelectValue", {
	enumerable: true,
	get: function() {
		return SelectValue;
	}
});
Object.defineProperty(exports, "Separator", {
	enumerable: true,
	get: function() {
		return Separator;
	}
});
Object.defineProperty(exports, "Skeleton", {
	enumerable: true,
	get: function() {
		return Skeleton;
	}
});
Object.defineProperty(exports, "Slider", {
	enumerable: true,
	get: function() {
		return Slider;
	}
});
Object.defineProperty(exports, "Sortable", {
	enumerable: true,
	get: function() {
		return Sortable;
	}
});
Object.defineProperty(exports, "SpaceBetweenRowFlex", {
	enumerable: true,
	get: function() {
		return SpaceBetweenRowFlex;
	}
});
Object.defineProperty(exports, "Spinner", {
	enumerable: true,
	get: function() {
		return Spinner;
	}
});
Object.defineProperty(exports, "StreamingMarkdown", {
	enumerable: true,
	get: function() {
		return StreamingMarkdown;
	}
});
Object.defineProperty(exports, "Switch", {
	enumerable: true,
	get: function() {
		return Switch;
	}
});
Object.defineProperty(exports, "Table", {
	enumerable: true,
	get: function() {
		return Table;
	}
});
Object.defineProperty(exports, "TableBody", {
	enumerable: true,
	get: function() {
		return TableBody;
	}
});
Object.defineProperty(exports, "TableCaption", {
	enumerable: true,
	get: function() {
		return TableCaption;
	}
});
Object.defineProperty(exports, "TableCell", {
	enumerable: true,
	get: function() {
		return TableCell;
	}
});
Object.defineProperty(exports, "TableFooter", {
	enumerable: true,
	get: function() {
		return TableFooter;
	}
});
Object.defineProperty(exports, "TableHead", {
	enumerable: true,
	get: function() {
		return TableHead;
	}
});
Object.defineProperty(exports, "TableHeader", {
	enumerable: true,
	get: function() {
		return TableHeader;
	}
});
Object.defineProperty(exports, "TableRow", {
	enumerable: true,
	get: function() {
		return TableRow;
	}
});
Object.defineProperty(exports, "Tabs", {
	enumerable: true,
	get: function() {
		return Tabs;
	}
});
Object.defineProperty(exports, "TabsContent", {
	enumerable: true,
	get: function() {
		return TabsContent;
	}
});
Object.defineProperty(exports, "TabsList", {
	enumerable: true,
	get: function() {
		return TabsList;
	}
});
Object.defineProperty(exports, "TabsTrigger", {
	enumerable: true,
	get: function() {
		return TabsTrigger;
	}
});
Object.defineProperty(exports, "ToastProvider", {
	enumerable: true,
	get: function() {
		return ToastProvider;
	}
});
Object.defineProperty(exports, "ToastViewport", {
	enumerable: true,
	get: function() {
		return ToastViewport;
	}
});
Object.defineProperty(exports, "Tooltip", {
	enumerable: true,
	get: function() {
		return Tooltip;
	}
});
Object.defineProperty(exports, "TooltipContent", {
	enumerable: true,
	get: function() {
		return TooltipContent;
	}
});
Object.defineProperty(exports, "TooltipProvider", {
	enumerable: true,
	get: function() {
		return TooltipProvider;
	}
});
Object.defineProperty(exports, "TooltipRoot", {
	enumerable: true,
	get: function() {
		return TooltipRoot;
	}
});
Object.defineProperty(exports, "TooltipSurface", {
	enumerable: true,
	get: function() {
		return TooltipSurface;
	}
});
Object.defineProperty(exports, "TooltipTrigger", {
	enumerable: true,
	get: function() {
		return TooltipTrigger;
	}
});
Object.defineProperty(exports, "TreeSelect", {
	enumerable: true,
	get: function() {
		return TreeSelect;
	}
});
Object.defineProperty(exports, "TreeView", {
	enumerable: true,
	get: function() {
		return TreeView;
	}
});
Object.defineProperty(exports, "WarnTooltip", {
	enumerable: true,
	get: function() {
		return WarnTooltip;
	}
});
Object.defineProperty(exports, "alertVariants", {
	enumerable: true,
	get: function() {
		return alertVariants;
	}
});
Object.defineProperty(exports, "badgeVariants", {
	enumerable: true,
	get: function() {
		return badgeVariants;
	}
});
Object.defineProperty(exports, "buttonGroupVariants", {
	enumerable: true,
	get: function() {
		return buttonGroupVariants;
	}
});
Object.defineProperty(exports, "buttonVariants", {
	enumerable: true,
	get: function() {
		return buttonVariants$1;
	}
});
Object.defineProperty(exports, "checkboxVariants", {
	enumerable: true,
	get: function() {
		return checkboxVariants;
	}
});
Object.defineProperty(exports, "closeAll", {
	enumerable: true,
	get: function() {
		return closeAll;
	}
});
Object.defineProperty(exports, "closeToast", {
	enumerable: true,
	get: function() {
		return closeToast;
	}
});
Object.defineProperty(exports, "createCodeHighlightPlugin", {
	enumerable: true,
	get: function() {
		return createCodeHighlightPlugin;
	}
});
Object.defineProperty(exports, "createMarkdownSanitizeSchema", {
	enumerable: true,
	get: function() {
		return createMarkdownSanitizeSchema;
	}
});
Object.defineProperty(exports, "createSlugger", {
	enumerable: true,
	get: function() {
		return createSlugger;
	}
});
Object.defineProperty(exports, "custom_tag_default", {
	enumerable: true,
	get: function() {
		return custom_tag_default;
	}
});
Object.defineProperty(exports, "defaultMarkdownPlugins", {
	enumerable: true,
	get: function() {
		return defaultMarkdownPlugins;
	}
});
Object.defineProperty(exports, "emoji_avatar_default", {
	enumerable: true,
	get: function() {
		return emoji_avatar_default;
	}
});
Object.defineProperty(exports, "error", {
	enumerable: true,
	get: function() {
		return error;
	}
});
Object.defineProperty(exports, "extractTextFromNode", {
	enumerable: true,
	get: function() {
		return extractTextFromNode;
	}
});
Object.defineProperty(exports, "flattenTree", {
	enumerable: true,
	get: function() {
		return flattenTree;
	}
});
Object.defineProperty(exports, "getCherryCmTheme", {
	enumerable: true,
	get: function() {
		return getCherryCmTheme;
	}
});
Object.defineProperty(exports, "getCmThemeByName", {
	enumerable: true,
	get: function() {
		return getCmThemeByName;
	}
});
Object.defineProperty(exports, "getCmThemeNames", {
	enumerable: true,
	get: function() {
		return getCmThemeNames;
	}
});
Object.defineProperty(exports, "getToastQueue", {
	enumerable: true,
	get: function() {
		return getToastQueue;
	}
});
Object.defineProperty(exports, "getToastUtilities", {
	enumerable: true,
	get: function() {
		return getToastUtilities;
	}
});
Object.defineProperty(exports, "image_tool_button_default", {
	enumerable: true,
	get: function() {
		return image_tool_button_default;
	}
});
Object.defineProperty(exports, "info", {
	enumerable: true,
	get: function() {
		return info;
	}
});
Object.defineProperty(exports, "loading", {
	enumerable: true,
	get: function() {
		return loading;
	}
});
Object.defineProperty(exports, "menuItemVariants", {
	enumerable: true,
	get: function() {
		return menuItemVariants;
	}
});
Object.defineProperty(exports, "prepareCodeChanges", {
	enumerable: true,
	get: function() {
		return prepareCodeChanges;
	}
});
Object.defineProperty(exports, "radioGroupItemVariants", {
	enumerable: true,
	get: function() {
		return radioGroupItemVariants;
	}
});
Object.defineProperty(exports, "rehypeHeadingIds", {
	enumerable: true,
	get: function() {
		return rehypeHeadingIds;
	}
});
Object.defineProperty(exports, "rehypePrefixSvgReferences", {
	enumerable: true,
	get: function() {
		return rehypePrefixSvgReferences;
	}
});
Object.defineProperty(exports, "rehypePreserveAnchorTargets", {
	enumerable: true,
	get: function() {
		return rehypePreserveAnchorTargets;
	}
});
Object.defineProperty(exports, "rehypeScalableSvg", {
	enumerable: true,
	get: function() {
		return rehypeScalableSvg;
	}
});
Object.defineProperty(exports, "rehypeStreamingMath", {
	enumerable: true,
	get: function() {
		return rehypeStreamingMath;
	}
});
Object.defineProperty(exports, "success", {
	enumerable: true,
	get: function() {
		return success;
	}
});
Object.defineProperty(exports, "textarea_exports", {
	enumerable: true,
	get: function() {
		return textarea_exports;
	}
});
Object.defineProperty(exports, "useExpandedState", {
	enumerable: true,
	get: function() {
		return useExpandedState;
	}
});
Object.defineProperty(exports, "useFormField", {
	enumerable: true,
	get: function() {
		return useFormField;
	}
});
Object.defineProperty(exports, "useImagePreviewTransform", {
	enumerable: true,
	get: function() {
		return useImagePreviewTransform;
	}
});
Object.defineProperty(exports, "useMarkdownBlockContext", {
	enumerable: true,
	get: function() {
		return useMarkdownBlockContext;
	}
});
Object.defineProperty(exports, "usePortalContainer", {
	enumerable: true,
	get: function() {
		return usePortalContainer;
	}
});
Object.defineProperty(exports, "useSelectionState", {
	enumerable: true,
	get: function() {
		return useSelectionState;
	}
});
Object.defineProperty(exports, "useToasts", {
	enumerable: true,
	get: function() {
		return useToasts;
	}
});
Object.defineProperty(exports, "useTreeDragAndDrop", {
	enumerable: true,
	get: function() {
		return useTreeDragAndDrop;
	}
});
Object.defineProperty(exports, "warning", {
	enumerable: true,
	get: function() {
		return warning;
	}
});
Object.defineProperty(exports, "withChatPlugins", {
	enumerable: true,
	get: function() {
		return withChatPlugins;
	}
});
Object.defineProperty(exports, "withFullMarkdown", {
	enumerable: true,
	get: function() {
		return withFullMarkdown;
	}
});
Object.defineProperty(exports, "withMath", {
	enumerable: true,
	get: function() {
		return withMath;
	}
});
Object.defineProperty(exports, "withMermaid", {
	enumerable: true,
	get: function() {
		return withMermaid;
	}
});
