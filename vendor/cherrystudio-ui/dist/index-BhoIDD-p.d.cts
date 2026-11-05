import { f as LanguageConfig } from "./code-block-BGVLuO2n.cjs";
import { l as SnapshotExecutor } from "./code-highlight-BGdxxDHR.cjs";
import "./types-DxnHswzd.cjs";
import { HighlightStyle } from "@codemirror/language";
import * as _codemirror_state from "@codemirror/state";
import { ChangeDesc, ChangeSet, EditorSelection, EditorState, EditorStateConfig, Extension, Facet, Line, Range, RangeSet, RangeValue, SelectionRange, StateEffect, StateField, Transaction, TransactionSpec } from "@codemirror/state";
import * as React$2 from "react";
import React$1, { CSSProperties, ComponentProps, ComponentType, FC, HTMLAttributes, MouseEvent as MouseEvent$1, MouseEventHandler, ReactElement, ReactNode } from "react";
import * as AvatarPrimitive from "@radix-ui/react-avatar";
import { Content, Portal, Provider, Root, Trigger } from "@radix-ui/react-tooltip";
import { ColumnDef } from "@tanstack/react-table";
import { DayPicker } from "react-day-picker";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import { VariantProps } from "class-variance-authority";
import { Slot } from "@radix-ui/react-slot";
import { ControllerProps, FieldPath, FieldValues } from "react-hook-form";
import * as LabelPrimitive from "@radix-ui/react-label";
import { LucideProps } from "lucide-react";
import { AnimateOptions, CodeHighlighterPlugin, Components, PluginConfig } from "streamdown";
import { Pluggable, Plugin } from "unified";
import { PointerSensor, PointerSensorProps } from "@dnd-kit/core";
import * as AccordionPrimitive from "@radix-ui/react-accordion";
import * as SeparatorPrimitive from "@radix-ui/react-separator";
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { Command } from "cmdk";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import * as ContextMenuPrimitive from "@radix-ui/react-context-menu";
import { Drawer } from "vaul";
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import * as HoverCardPrimitive from "@radix-ui/react-hover-card";
import * as RadioGroupPrimitive from "@radix-ui/react-radio-group";
import * as ResizablePrimitive from "react-resizable-panels";
import * as ScrollAreaPrimitive from "@radix-ui/react-scroll-area";
import * as SelectPrimitive from "@radix-ui/react-select";
import { DropEvent, DropzoneOptions, FileRejection, useDropzone } from "react-dropzone";
import * as SliderPrimitive from "@radix-ui/react-slider";
import * as TabsPrimitive from "@radix-ui/react-tabs";
//#endregion
//#region src/components/primitives/bar-visualizer.d.ts
type BarVisualizerState = 'listening' | 'speaking' | 'thinking';
interface BarVisualizerProps extends HTMLAttributes<HTMLDivElement> {
  analyser?: AnalyserNode;
  state?: BarVisualizerState;
  barCount?: number;
  minHeight?: number;
  maxHeight?: number;
}
declare function BarVisualizer({ analyser, state, barCount, minHeight, maxHeight, className, ...props }: BarVisualizerProps): import("react/jsx-runtime").JSX.Element;
//#endregion
//#region src/components/primitives/avatar.d.ts
declare function Avatar({ className, size, children, ...props }: React$2.ComponentProps<typeof AvatarPrimitive.Root> & {
  size?: 'default' | 'sm' | 'lg';
}): import("react/jsx-runtime").JSX.Element;
declare function AvatarImage({ className, ...props }: React$2.ComponentProps<typeof AvatarPrimitive.Image>): import("react/jsx-runtime").JSX.Element;
declare function AvatarFallback({ className, ...props }: React$2.ComponentProps<typeof AvatarPrimitive.Fallback>): import("react/jsx-runtime").JSX.Element;
declare function AvatarBadge({ className, ...props }: React$2.ComponentProps<'span'>): import("react/jsx-runtime").JSX.Element;
declare function AvatarGroup({ className, ...props }: React$2.ComponentProps<'div'>): import("react/jsx-runtime").JSX.Element;
declare function AvatarGroupCount({ className, ...props }: React$2.ComponentProps<'div'>): import("react/jsx-runtime").JSX.Element;
//#endregion
//#region src/components/primitives/circular-progress.d.ts
type CircularProgressProps = {
  value: number;
  renderLabel?: (progress: number) => number | string;
  size?: number;
  strokeWidth?: number;
  circleStrokeWidth?: number;
  progressStrokeWidth?: number;
  shape?: 'square' | 'round';
  className?: string;
  progressClassName?: string;
  labelClassName?: string;
  showLabel?: boolean;
};
declare const CircularProgress: ({ value, renderLabel, className, progressClassName, labelClassName, showLabel, shape, size, strokeWidth, circleStrokeWidth, progressStrokeWidth }: CircularProgressProps) => import("react/jsx-runtime").JSX.Element;
//#endregion
//#region src/components/primitives/copy-button.d.ts
interface CopyButtonProps {
  tooltip?: string;
  label?: string;
  size?: number;
  className?: string;
  [key: string]: any;
}
declare const CopyButton: FC<CopyButtonProps>;
//#endregion
//#region src/components/primitives/custom-tag.d.ts
interface CustomTagProps {
  icon?: React.ReactNode;
  children?: React.ReactNode | string;
  color: string;
  size?: number;
  style?: CSSProperties;
  tooltip?: string;
  closable?: boolean;
  onClose?: () => void;
  onClick?: MouseEventHandler<HTMLDivElement>;
  onContextMenu?: MouseEventHandler<HTMLDivElement>;
  disabled?: boolean;
  inactive?: boolean;
  className?: string;
}
declare const _default$2: import("react").NamedExoticComponent<CustomTagProps>;
//#endregion
//#region src/components/primitives/divider.d.ts
interface DividerProps extends React$2.HTMLAttributes<HTMLDivElement> {
  orientation?: 'horizontal' | 'vertical';
}
/**
 * A simple divider component for visual separation.
 * For more complex use cases with text, use DividerWithText instead.
 */
declare const Divider: React$2.FC<DividerProps>;
//#endregion
//#region src/components/primitives/divider-with-text.d.ts
interface DividerWithTextProps {
  text: string;
  style?: CSSProperties;
  className?: string;
}
declare const DividerWithText: React$1.FC<DividerWithTextProps>;
//#endregion
//#region src/components/primitives/emoji-icon.d.ts
interface EmojiIconProps {
  emoji: string;
  className?: string;
  /** Fixed-mode side length in px. Ignored when `fluid` is true. */
  size?: number;
  /** @deprecated Emoji artwork now scales with `size`. */
  fontSize?: number;
  /** Fill the parent (h-full w-full) instead of using a fixed px size. */
  fluid?: boolean;
}
declare const EmojiIcon: FC<EmojiIconProps>;
//#endregion
//#region ../../node_modules/.pnpm/react-error-boundary@6.0.1_react-dom@19.2.3_react@19.2.3__react@19.2.3/node_modules/react-error-boundary/dist/react-error-boundary.d.ts
declare type FallbackProps = {
  error: Error;
  resetErrorBoundary: (...args: unknown[]) => void;
};
//#endregion
//#region src/components/primitives/error-boundary/index.d.ts
interface CustomFallbackProps extends FallbackProps {
  onDebugClick?: () => void | Promise<void>;
  onReloadClick?: () => void | Promise<void>;
  debugButtonText?: string;
  reloadButtonText?: string;
  errorMessage?: string;
}
interface ErrorBoundaryCustomizedProps {
  children: ReactNode;
  fallbackComponent?: ComponentType<CustomFallbackProps>;
  onDebugClick?: () => void | Promise<void>;
  onReloadClick?: () => void | Promise<void>;
  debugButtonText?: string;
  reloadButtonText?: string;
  errorMessage?: string;
}
declare const ErrorBoundaryCustomized: ({ children, fallbackComponent, onDebugClick, onReloadClick, debugButtonText, reloadButtonText, errorMessage }: ErrorBoundaryCustomizedProps) => import("react/jsx-runtime").JSX.Element;
//#endregion
//#region src/components/primitives/indicator-light.d.ts
interface IndicatorLightProps {
  color: string;
  size?: number;
  shadow?: boolean;
  style?: React$1.CSSProperties;
  animation?: boolean;
  className?: string;
}
declare const IndicatorLight: React$1.FC<IndicatorLightProps>;
//#endregion
//#region src/components/primitives/portal-container.d.ts
type PortalContainer = HTMLElement | null;
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
declare function PortalContainerProvider({ container, tooltipContainer, tooltipZIndex, children }: {
  container: PortalContainer;
  tooltipContainer?: PortalContainer;
  tooltipZIndex?: string;
  children: React$2.ReactNode;
}): import("react/jsx-runtime").JSX.Element;
declare function usePortalContainer(): PortalContainer;
/**
 * Dialogs use a page-level portal target so they remain attached to their owning
 * tab without inheriting the transformed content node of a parent dialog.
 */
declare function DialogPortalContainerProvider({ container, children }: {
  container: PortalContainer;
  children: React$2.ReactNode;
}): import("react/jsx-runtime").JSX.Element;
//#endregion
//#region src/components/primitives/spinner.d.ts
interface Props$1 {
  text: React.ReactNode;
  className?: string;
}
declare function Spinner({ text, className }: Props$1): import("react/jsx-runtime").JSX.Element;
//#endregion
//#region ../../node_modules/.pnpm/@radix-ui+react-primitive@2.1.3_@types+react-dom@19.2.3_@types+react@19.2.7__@types+rea_5f3d28fea11cf58eed3830d0189b6e2d/node_modules/@radix-ui/react-primitive/dist/index.d.mts
declare const NODES: readonly ["a", "button", "div", "form", "h2", "h3", "img", "input", "label", "li", "nav", "ol", "p", "select", "span", "svg", "ul"];
type Primitives = { [E in (typeof NODES)[number]]: PrimitiveForwardRefComponent<E>; };
type PrimitivePropsWithRef<E extends React$2.ElementType> = React$2.ComponentPropsWithRef<E> & {
  asChild?: boolean;
};
interface PrimitiveForwardRefComponent<E extends React$2.ElementType> extends React$2.ForwardRefExoticComponent<PrimitivePropsWithRef<E>> {}
declare const Primitive: Primitives;
//#endregion
//#region ../../node_modules/.pnpm/@radix-ui+react-switch@1.2.6_@types+react-dom@19.2.3_@types+react@19.2.7__@types+react@_59174930405145abcf9f3e2ca1e923f1/node_modules/@radix-ui/react-switch/dist/index.d.mts
type PrimitiveButtonProps = React$2.ComponentPropsWithoutRef<typeof Primitive.button>;
interface SwitchProps$1 extends PrimitiveButtonProps {
  checked?: boolean;
  defaultChecked?: boolean;
  required?: boolean;
  onCheckedChange?(checked: boolean): void;
}
declare const Root$2: React$2.ForwardRefExoticComponent<SwitchProps$1 & React$2.RefAttributes<HTMLButtonElement>>;
//#endregion
//#region src/components/primitives/switch.d.ts
interface SwitchProps extends Omit<React$2.ComponentProps<typeof Root$2>, 'children'> {
  /** When true, displays a loading animation in the switch thumb. Defaults to false when undefined. */
  loading?: boolean;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  classNames?: {
    root?: string;
    thumb?: string;
    thumbSvg?: string;
  };
}
declare function Switch({ loading, size, className, classNames, ...props }: SwitchProps): import("react/jsx-runtime").JSX.Element;
declare namespace Switch {
  var displayName: string;
}
interface DescriptionSwitchProps extends SwitchProps {
  /** Text label displayed next to the switch. */
  label: string;
  /** Optional helper text shown below the label. */
  description?: string;
  /** Switch position relative to label. Defaults to 'right'. */
  position?: 'left' | 'right';
}
declare const DescriptionSwitch: ({ label, description, position, size, ...props }: DescriptionSwitchProps) => import("react/jsx-runtime").JSX.Element;
//#endregion
//#region src/components/primitives/tooltip.d.ts
/** Marks a subtree as the anchoring surface for tooltips; inactive surfaces disable their tooltips. */
declare const TooltipSurface: ({ active, children }: {
  active?: boolean;
  children?: React$2.ReactNode;
}) => import("react/jsx-runtime").JSX.Element;
type TooltipProviderProps = React$2.ComponentProps<typeof Provider>;
type TooltipRootProps = React$2.ComponentProps<typeof Root>;
type TooltipTriggerProps = React$2.ComponentProps<typeof Trigger>;
type TooltipContentProps = React$2.ComponentProps<typeof Content> & {
  portalContainer?: React$2.ComponentProps<typeof Portal>['container'];
  showArrow?: boolean;
};
declare function TooltipProvider({ delayDuration, ...props }: TooltipProviderProps): import("react/jsx-runtime").JSX.Element;
declare function TooltipRoot({ delayDuration, open: openProp, defaultOpen, onOpenChange, ...props }: TooltipRootProps): import("react/jsx-runtime").JSX.Element;
declare function TooltipTrigger({ onFocus, ...props }: TooltipTriggerProps): import("react/jsx-runtime").JSX.Element;
declare function TooltipContent({ className, sideOffset, children, portalContainer, showArrow, forceMount, style, ...props }: TooltipContentProps): import("react/jsx-runtime").JSX.Element | null;
interface TooltipProps {
  children?: React$2.ReactNode;
  content?: React$2.ReactNode;
  title?: React$2.ReactNode;
  placement?: string;
  delay?: number;
  sideOffset?: TooltipContentProps['sideOffset'];
  showArrow?: boolean;
  fullWidthTrigger?: boolean;
  classNames?: {
    content?: string;
    placeholder?: string;
  };
  className?: string;
  isDisabled?: boolean;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  onClick?: React$2.MouseEventHandler<HTMLDivElement>;
  portalContainer?: React$2.ComponentProps<typeof Portal>['container'];
  /** Let the child own the trigger element and its semantics. */
  asChild?: boolean;
}
declare const Tooltip$1: ({ children, content, title, placement, delay, sideOffset, showArrow, fullWidthTrigger, classNames, className, isDisabled, isOpen, onOpenChange, onClick, portalContainer, asChild }: TooltipProps) => string | number | bigint | boolean | import("react/jsx-runtime").JSX.Element | Iterable<React$2.ReactNode> | Promise<string | number | bigint | boolean | React$2.ReactPortal | React$2.ReactElement<unknown, string | React$2.JSXElementConstructor<any>> | Iterable<React$2.ReactNode> | null | undefined> | null | undefined;
interface NormalTooltipProps extends TooltipRootProps {
  content: React$2.ReactNode;
  side?: TooltipContentProps['side'];
  align?: TooltipContentProps['align'];
  sideOffset?: TooltipContentProps['sideOffset'];
  className?: string;
  asChild?: boolean;
  triggerProps?: Omit<TooltipTriggerProps, 'children'>;
  contentProps?: TooltipContentProps;
  showArrow?: boolean;
}
declare const NormalTooltip: ({ children, content, side, align, sideOffset, asChild, triggerProps, contentProps, showArrow, ...tooltipProps }: NormalTooltipProps) => import("react/jsx-runtime").JSX.Element;
//#endregion
//#region src/components/composites/confirm-dialog/index.d.ts
interface ConfirmDialogProps {
  /** Controls the open state of the dialog */
  open?: boolean;
  /** Callback when open state changes */
  onOpenChange?: (open: boolean) => void;
  /** Dialog title */
  title: React$2.ReactNode;
  /** Dialog description */
  description?: React$2.ReactNode;
  /** Custom content below description */
  content?: React$2.ReactNode;
  /** Confirm button text */
  confirmText?: string;
  /** Cancel button text */
  cancelText?: string;
  /** Disabled state for cancel button */
  cancelDisabled?: boolean;
  /** Return false to keep the dialog open; void or true closes it. */
  onConfirm?: () => boolean | void | Promise<boolean | void>;
  /** Whether this is a destructive action (e.g., delete) */
  destructive?: boolean;
  /** Loading state for confirm button */
  confirmLoading?: boolean;
  /** Disabled state for confirm button */
  confirmDisabled?: boolean;
  /** Optional className for DialogContent */
  contentClassName?: string;
  /** Optional className for DialogOverlay */
  overlayClassName?: string;
}
declare function ConfirmDialog({ open, onOpenChange, title, description, content, confirmText, cancelText, cancelDisabled, onConfirm, destructive, confirmLoading, confirmDisabled, contentClassName, overlayClassName }: ConfirmDialogProps): import("react/jsx-runtime").JSX.Element;
//#endregion
//#region src/components/composites/data-table/index.d.ts
type DataTableKey = React$2.Key;
type DataTableColumnMeta = {
  className?: string;
  headerClassName?: string;
  width?: number | string;
  maxWidth?: number | string;
  align?: 'left' | 'center' | 'right';
};
type DataTableSelectionBase<TData> = {
  getCheckboxProps?: (record: TData) => {
    disabled?: boolean;
    ariaLabel?: string;
  };
  columnWidth?: number | string;
};
type DataTableSelection<TData> = (DataTableSelectionBase<TData> & {
  type: 'single';
  selectedRowKey: DataTableKey | null;
  onChange: (selectedRowKey: DataTableKey | null, selectedRow: TData | null) => void;
}) | (DataTableSelectionBase<TData> & {
  type: 'multiple';
  selectedRowKeys: DataTableKey[];
  onChange: (selectedRowKeys: DataTableKey[], selectedRows: TData[]) => void;
});
type DataTableProps<TData> = {
  data: TData[];
  columns: ColumnDef<TData, unknown>[];
  rowKey: keyof TData | ((record: TData) => DataTableKey);
  selection?: DataTableSelection<TData>;
  headerLeft?: React$2.ReactNode;
  headerRight?: React$2.ReactNode;
  emptyText?: React$2.ReactNode;
  maxHeight?: number | string;
  maxWidth?: number | string;
  tableLayout?: 'auto' | 'fixed';
  rowClassName?: string | ((record: TData, index: number) => string);
  onRowClick?: (record: TData, index: number) => void;
  renderExpandedRow?: (record: TData, index: number) => React$2.ReactNode;
  getCanExpand?: (record: TData) => boolean;
  expandedRowKeys?: DataTableKey[];
  onExpandedRowChange?: (expandedRowKeys: DataTableKey[]) => void;
  className?: string;
};
declare function DataTable<TData>({ data, columns, rowKey, selection, headerLeft, headerRight, emptyText, maxHeight, maxWidth, tableLayout, rowClassName, onRowClick, renderExpandedRow, getCanExpand, expandedRowKeys, onExpandedRowChange, className }: DataTableProps<TData>): import("react/jsx-runtime").JSX.Element;
//#endregion
//#region src/components/primitives/calendar.d.ts
type CalendarProps = React$2.ComponentProps<typeof DayPicker>;
declare function Calendar({ className, classNames, components, showOutsideDays, captionLayout, ...props }: CalendarProps): import("react/jsx-runtime").JSX.Element;
//#endregion
//#region src/components/composites/date-time-picker/index.d.ts
type DateTimeGranularity = 'day' | 'hour' | 'minute' | 'second';
type DateTimePickerLabels = {
  hour?: string;
  minute?: string;
  second?: string;
};
type DateTimePickerValueProps = {
  value: Date | null | undefined;
  onChange: (date: Date | undefined) => void;
  defaultValue?: never;
} | {
  value?: never;
  defaultValue?: Date | null;
  onChange?: (date: Date | undefined) => void;
};
type DateTimePickerOpenProps = {
  open: boolean | undefined;
  onOpenChange: (open: boolean) => void;
  defaultOpen?: never;
} | {
  open?: never;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
};
type DateTimePickerBaseProps = {
  granularity?: DateTimeGranularity;
  format?: string;
  placeholder?: React$2.ReactNode;
  disabled?: boolean;
  className?: string;
  triggerClassName?: string;
  popoverClassName?: string;
  calendarProps?: Omit<CalendarProps, 'mode' | 'selected' | 'onSelect' | 'month' | 'onMonthChange'>;
  labels?: DateTimePickerLabels;
};
type DateTimePickerProps = DateTimePickerBaseProps & DateTimePickerValueProps & DateTimePickerOpenProps;
declare function DateTimePicker({ value, defaultValue, onChange, open, defaultOpen, onOpenChange, granularity, format, placeholder, disabled, className, triggerClassName, popoverClassName, calendarProps, labels }: DateTimePickerProps): import("react/jsx-runtime").JSX.Element;
//#endregion
//#region src/components/composites/ellipsis/index.d.ts
type Props = {
  maxLine?: number;
  className?: string;
  ref?: React.Ref<HTMLDivElement>;
} & HTMLAttributes<HTMLDivElement>;
declare const Ellipsis: (props: Props) => import("react/jsx-runtime").JSX.Element;
//#endregion
//#region src/components/composites/emoji-avatar/index.d.ts
interface EmojiAvatarProps {
  children: string;
  size?: number;
  fontSize?: number;
  onClick?: React$1.MouseEventHandler<HTMLDivElement>;
  className?: string;
  style?: React$1.CSSProperties;
}
declare const _default$1: React$1.MemoExoticComponent<{
  ({ children, size, fontSize, onClick, className, style }: EmojiAvatarProps): import("react/jsx-runtime").JSX.Element;
  displayName: string;
}>;
//#endregion
//#region src/components/composites/empty-state/index.d.ts
/**
 * @deprecated Presets no longer affect rendering — every preset renders the
 * same unified empty illustration, so all modules read as one product. Kept
 * for call-site compatibility only; existing `preset` usages are slated for
 * removal in a follow-up.
 */
type EmptyStatePreset = 'no-model' | 'no-assistant' | 'no-agent' | 'no-knowledge' | 'no-file' | 'no-note' | 'no-miniapp' | 'no-code-tool' | 'no-resource' | 'no-translate' | 'no-result' | 'no-topic' | 'no-session';
type EmptyStateIcon = ComponentType<{
  size?: number;
  className?: string;
  strokeWidth?: number;
}>;
/** Variants of the unified empty illustration, all drawn in one visual family. */
type EmptyStateIllustration = 'inbox' | 'book';
interface EmptyStateProps {
  /** @deprecated No-op — the unified illustration renders regardless. Slated for removal. */
  preset?: EmptyStatePreset;
  /** Which unified illustration to render (ignored when `icon` is set). */
  illustration?: EmptyStateIllustration;
  icon?: EmptyStateIcon;
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
  compact?: boolean;
  className?: string;
}
declare function EmptyState({ illustration, icon: IconOverride, title, description, actionLabel, onAction, secondaryLabel, onSecondary, compact, className }: EmptyStateProps): import("react/jsx-runtime").JSX.Element;
//#endregion
//#region src/components/primitives/popover.d.ts
declare function Popover({ ...props }: React$2.ComponentProps<typeof PopoverPrimitive.Root>): import("react/jsx-runtime").JSX.Element;
declare function PopoverTrigger({ ...props }: React$2.ComponentProps<typeof PopoverPrimitive.Trigger>): import("react/jsx-runtime").JSX.Element;
declare function PopoverContent({ className, align, sideOffset, forceMount, portalContainer, ...props }: React$2.ComponentProps<typeof PopoverPrimitive.Content> & {
  portalContainer?: React$2.ComponentProps<typeof PopoverPrimitive.Portal>['container'];
}): import("react/jsx-runtime").JSX.Element;
declare function PopoverAnchor({ ...props }: React$2.ComponentProps<typeof PopoverPrimitive.Anchor>): import("react/jsx-runtime").JSX.Element;
//#endregion
//#region src/components/composites/entity-selector/types.d.ts
type EntityItemBase = {
  id: string;
  disabled?: boolean;
};
type EntitySelectorMultiSelect = {
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  label: ReactNode;
  hint?: ReactNode;
  disabled?: boolean;
};
type EntitySelectorRowContext = {
  isSelected: boolean;
  isMultiMode: boolean;
  isActive: boolean;
  /** Fires the configured selection behavior (toggle in multi-mode, select + close in single-mode). */
  onSelect: () => void;
  /** Bind to row's `onContextMenu`. Only present when `renderItemContextMenu` is configured. */
  onContextMenu?: (e: MouseEvent$1) => void;
};
type EntitySelectorContextMenuFactory<T> = (item: T, ctx: {
  close: () => void;
}) => ReactNode | null;
type EntitySelectorSearch = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
};
type EntitySelectorPopoverContentProps = Omit<ComponentProps<typeof PopoverContent>, 'children' | 'asChild'>;
/**
 * Named group of items with an optional header node. Use `sections` instead of flat `items` when
 * the list needs non-item rows interleaved (e.g. a "Pinned" heading above the pinned rows).
 * Section headers are presentational — they are not focusable, not selectable, and do not
 * participate in keyboard navigation or active-descendant tracking.
 * Keyboard navigation walks across all sections in order as if it were a flat list.
 */
type EntitySelectorSection<T extends EntityItemBase> = {
  /** Stable key for React reconciliation. */
  key: string;
  /** Rendered immediately before this section's items. Hidden when the section has zero items. */
  header?: ReactNode;
  items: T[];
};
type EntitySelectorItemsPayload<T extends EntityItemBase> = {
  items: T[];
  sections?: undefined;
} | {
  items?: undefined;
  sections: EntitySelectorSection<T>[];
} | {
  items?: undefined;
  sections?: undefined;
};
type EntitySelectorBaseProps<T extends EntityItemBase> = {
  /** Controlled open state; pair with `onOpenChange`. Omit for uncontrolled. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /**
   * Trigger node, rendered outside the popover. Must be a single ReactElement (not a fragment,
   * string, or null) because Radix's `<PopoverTrigger asChild>` clones the child to attach
   * pointer / aria props — passing anything else crashes at runtime.
   */
  trigger: ReactElement;
  /** 'single' = single value; 'multi' = array of values. */
  mode: 'single' | 'multi';
  value: string | string[] | null;
  onChange: (value: string | string[]) => void;
  /** Required row renderer. The composite owns the row's click + hover + context-menu plumbing; visuals are yours. */
  renderItem: (item: T, ctx: EntitySelectorRowContext) => ReactNode;
  /** Search input config (controlled). Omit to hide the search input entirely. The caller does the filtering. */
  search?: EntitySelectorSearch;
  /** Whether the search input auto-focuses when the popover opens. Default: true. */
  autoFocusSearch?: boolean;
  /** Filter panel slot. When provided, the filter toggle button appears inside the search input. */
  filterPanel?: ReactNode;
  /** Show the filter toggle button in the active state (e.g. when the consumer's filter has any value applied). */
  filterActive?: boolean;
  /** Multi-select toolbar (toggle + label/hint slots). */
  multiSelect?: EntitySelectorMultiSelect;
  /**
   * Right-click menu content factory. Return a node or null to suppress the menu.
   * The composite handles portal, positioning, and outside-click / escape / scroll dismissal — the slot owns visuals.
   * Use `ctx.close()` to dismiss the menu programmatically.
   */
  renderItemContextMenu?: EntitySelectorContextMenuFactory<T>;
  /** Distance (px) the context-menu keeps from viewport edges. Default: 8. */
  contextMenuViewportMargin?: number;
  /** Sticky footer slot (any node). Hidden when omitted. */
  footer?: ReactNode;
  /** Max scrollable list height in CSS units. Default: 320. */
  maxListHeight?: number | string;
  /** Node shown when items is empty and loading is false. Omit to render nothing. */
  emptyState?: ReactNode;
  loading?: boolean;
  /** Node shown while loading. Omit to render nothing. */
  loadingState?: ReactNode;
  /** Width of the popover content. Default: 320. */
  width?: number | string;
  /** ClassName forwarded to the popover content root. */
  className?: string;
  /**
   * Passthrough props for the underlying Radix PopoverContent.
   * Defaults applied by the composite: `align="start"`, `sideOffset={6}`.
   * `onInteractOutside` is composed with the composite's right-click-menu guard — your handler runs after.
   * `className` is merged with the composite's base classes.
   */
  popoverContentProps?: EntitySelectorPopoverContentProps;
};
/**
 * Exactly one of `items` or `sections` must be provided. `items` is the flat form;
 * `sections` groups items with optional per-group headers.
 */
type EntitySelectorProps<T extends EntityItemBase> = EntitySelectorBaseProps<T> & EntitySelectorItemsPayload<T>;
//#endregion
//#region src/components/composites/entity-selector/entity-selector.d.ts
declare function EntitySelector<T extends EntityItemBase>(props: EntitySelectorProps<T>): import("react/jsx-runtime").JSX.Element;
//#endregion
//#region src/components/composites/flex/index.d.ts
interface BoxProps extends React$1.ComponentProps<'div'> {}
declare const Box: ({ children, className, ...props }: BoxProps & {
  children?: React$1.ReactNode;
}) => import("react/jsx-runtime").JSX.Element;
interface FlexProps extends BoxProps {}
declare const Flex: ({ children, className, ...props }: FlexProps & {
  children?: React$1.ReactNode;
}) => import("react/jsx-runtime").JSX.Element;
declare const RowFlex: ({ children, className, ...props }: FlexProps & {
  children?: React$1.ReactNode;
}) => import("react/jsx-runtime").JSX.Element;
declare const SpaceBetweenRowFlex: ({ children, className, ...props }: FlexProps & {
  children?: React$1.ReactNode;
}) => import("react/jsx-runtime").JSX.Element;
declare const ColFlex: ({ children, className, ...props }: FlexProps & {
  children?: React$1.ReactNode;
}) => import("react/jsx-runtime").JSX.Element;
declare const Center: ({ children, className, ...props }: FlexProps & {
  children?: React$1.ReactNode;
}) => import("react/jsx-runtime").JSX.Element;
//#endregion
//#region src/components/composites/horizontal-scroll-container/index.d.ts
interface HorizontalScrollContainerProps {
  children: React$2.ReactNode;
  scrollDistance?: number;
  scrollLeftLabel: string;
  scrollRightLabel: string;
  className?: string;
  gap?: string;
  expandable?: boolean;
}
declare const HorizontalScrollContainer: React$2.FC<HorizontalScrollContainerProps>;
//#endregion
//#region src/components/composites/page-side-panel/index.d.ts
/**
 * A page-owned floating side panel. It portals into the nearest portal container
 * provided by `PortalContainerProvider` (e.g. a route tab root) when present,
 * otherwise to `document.body`. Scoped to a container it positions `absolute`
 * within it; at `document.body` it stays `fixed` to the viewport.
 *
 * For edge-attached modal sheets, use the shadcn `Drawer` primitive instead.
 */
type PageSidePanelPlacement = 'left' | 'right';
interface PageSidePanelProps {
  open: boolean;
  onClose: () => void;
  children?: React$2.ReactNode;
  title?: React$2.ReactNode;
  header?: React$2.ReactNode;
  footer?: React$2.ReactNode;
  side?: PageSidePanelPlacement;
  showCloseButton?: boolean;
  closeLabel?: string;
  backdropClassName?: string;
  contentClassName?: string;
  headerClassName?: string;
  bodyClassName?: string;
  footerClassName?: string;
  closeButtonClassName?: string;
}
declare function PageSidePanel({ open, onClose, children, title, header, footer, side, showCloseButton, closeLabel, backdropClassName, contentClassName, headerClassName, bodyClassName, footerClassName, closeButtonClassName }: PageSidePanelProps): import("react/jsx-runtime").JSX.Element;
interface PageSidePanelSectionProps extends Omit<React$2.HTMLAttributes<HTMLDivElement>, 'title'> {
  title: React$2.ReactNode;
  actions?: React$2.ReactNode;
  children: React$2.ReactNode;
}
declare function PageSidePanelSection({ title, actions, children, className, ...props }: PageSidePanelSectionProps): import("react/jsx-runtime").JSX.Element;
interface PageSidePanelItemProps extends Omit<React$2.HTMLAttributes<HTMLDivElement>, 'title'> {
  title: React$2.ReactNode;
  description?: React$2.ReactNode;
  action?: React$2.ReactNode;
  children?: React$2.ReactNode;
}
declare function PageSidePanelItem({ title, description, action, children, className, ...props }: PageSidePanelItemProps): import("react/jsx-runtime").JSX.Element;
//#endregion
//#region src/components/primitives/input.d.ts
interface InputProps extends React$2.ComponentProps<'input'> {}
declare function Input$1({ className, type, ...props }: InputProps): import("react/jsx-runtime").JSX.Element;
//#endregion
//#region src/components/primitives/button.d.ts
declare const buttonVariants: (props?: ({
  variant?: "link" | "emphasis" | "default" | "destructive" | "outline" | "secondary" | "ghost" | null | undefined;
  size?: "lg" | "sm" | "icon" | "default" | "icon-sm" | "icon-lg" | "icon-navbar" | null | undefined;
} & import("class-variance-authority/types").ClassProp) | undefined) => string;
declare function Button({ className, variant, size, asChild, loading, loadingIcon, loadingIconClassName, disabled, children, ...props }: React$2.ComponentProps<'button'> & VariantProps<typeof buttonVariants> & {
  asChild?: boolean;
  loading?: boolean;
  loadingIcon?: React$2.ReactNode;
  loadingIconClassName?: string;
}): import("react/jsx-runtime").JSX.Element;
type ButtonVariant = NonNullable<VariantProps<typeof buttonVariants>['variant']>;
//#endregion
//#region src/components/primitives/input-number.d.ts
/**
 * A number field that owns the text being typed, so partial input like `"1."`,
 * `"-"` or `"3.9"` survives while the caret is in it.
 *
 * Because it owns that text it must settle it when the caret leaves: on
 * blur/Enter the field normalizes what was typed — clamped into `[min, max]`,
 * truncated when `step` is an integer — and hands the result to `onBlur`.
 * **Settling is not configurable**; a field cannot be left showing `"1."`.
 * An incomplete numeric prefix that is still not a number on commit restores
 * the value from the start of the edit; only an actually empty field settles
 * to `null`.
 *
 * What `onBlur` hands over is a fact — "this is the value the field settled
 * on" — and the meaning is the caller's: persist it, ignore it, diff it against
 * something else. But the field renders `value`, never its own result, so the
 * normalized value reaches the screen only once the caller routes it back.
 * `onValueChange` never normalizes, which makes `onBlur` the callback nearly
 * every caller needs.
 *
 * Both callbacks take the value, not the DOM event: the raw `FocusEvent` would
 * be misleading here anyway, since `event.target.value` at that point is still
 * the text the user typed.
 *
 * `min`/`max` mean *clamp into this range on commit*, which is only meaningful
 * where the number is a magnitude — where larger and smaller say something, so a
 * bound is a sensible answer to a value beyond it. Where the number is an
 * identifier (a port, an id) its size means nothing and clamping would invent a
 * value nobody chose: pass no range and validate in the caller instead.
 *
 * A minus sign is therefore always typable. Whether the value may be negative is
 * a range question, settled on commit like any other, not a keystroke question.
 *
 * `min > max` is a call-site bug: no number satisfies it, so the field settles on
 * none. Committing yields `null` and the arrows refuse to step, which empties the
 * field on every commit — visible enough to find in development, where a silent
 * pick between the two bounds would not be. It warns on every render too.
 *
 * The field is a spin button: ArrowUp/ArrowDown step by `step`, straight into
 * `[min, max]` — an arrow press is a whole gesture, not a half-typed number, so
 * the caret cannot be trapped and the next *allowed* value is what was asked
 * for. Stepping reports like typing does and still settles on blur/Enter. The
 * range rides along in `aria-value*`, without which a screen-reader user has no
 * way to know a bound exists until the silent clamp on blur moves their number.
 * The wheel is deliberately left alone: over a `type="text"` field it scrolls
 * the page, which is what someone scrolling past a form means.
 *
 * Escape discards the edit and stops there. It restores what the edit started
 * from — reported through `onValueChange`, since a live-coupled caller has
 * already been told the typed value — and does not bubble, because the app exits
 * fullscreen on any Escape reaching `window` and this one is already spent.
 */
interface InputNumberProps extends Omit<React$2.ComponentProps<typeof Input$1>, 'type' | 'inputMode' | 'value' | 'onChange' | 'onBlur' | 'size'> {
  value: number | null;
  /**
   * Fires when the text becomes a value, un-normalized — clamping mid-edit would
   * trap the caret below `min` (typing `50` into a `min={10}` field would stop
   * at the first `5`). Use it for live coupling: form state, a slider, etc.
   *
   * Deliberately not `onChange`: it stays silent while the text is on its way to
   * being a value — `"-"`, `"1e"`, `"1e-"` — so it is not one event per
   * keystroke. Those are not empty either, and calling them `null` would make a
   * caller that substitutes a default write that default mid-keystroke. Only an
   * emptied field is `null`.
   */
  onValueChange?: (value: number | null) => void;
  /**
   * Fires on blur/Enter with the normalized value; route it back into `value` to render it.
   *
   * Return the commit's promise when it is async and the field will hold the settled
   * value until it settles, marking itself `aria-busy`/`data-busy` meanwhile. Without
   * that, a caller whose `value` only catches up after a round trip renders the *old*
   * value in between — the field drops its own copy on blur, before the caller has a
   * new one. Returning nothing keeps the synchronous behaviour.
   *
   * Any caller that persists the value wants this one — it is the only callback
   * that hands over a settled value. It both normalizes (so without it
   * `min`/`max`/`step` never reach a committed value — declaring `min`/`max` and
   * skipping this is worse than decorative: they still publish an `aria` range
   * that nothing enforces) and restores an abandoned incomplete edit (`-`, `1e`)
   * to what it started from. That second job has nothing to do with the bounds,
   * so declaring none of the three is not a licence to skip this: a caller that
   * persists through `onValueChange` alone keeps whatever the emptying before
   * the incomplete text wrote. Only a consumer that is purely live-coupled —
   * a slider tracking the field, with no state of its own to settle — can do
   * without it.
   */
  onBlur?: (value: number | null) => void | Promise<unknown>;
  /** The floor a committed or stepped value is clamped up to, negatives included. Also published as `aria-valuemin`. */
  min?: number;
  /** The ceiling a committed or stepped value is clamped down to. Also published as `aria-valuemax`. */
  max?: number;
  /**
   * The spacing of the grid the arrows move along, anchored at `min` when one is
   * declared — `min={0.5} step={1}` steps 0.5, 1.5, 2.5, as a native number input does.
   *
   * It doubles as the field's precision: an integer `step` means the value is an
   * integer, which sets `inputMode` and truncates on commit. Commit does **not** snap
   * to the grid — a typed `7` survives under `step={5}`. Rejecting off-grid values is
   * a validation decision, and this field only clamps; anything richer belongs to the
   * caller.
   */
  step?: number;
  size?: 'small' | 'middle' | 'large';
}
declare function InputNumber({ value, onValueChange, min, max, step, size, className, onFocus, onBlur, onKeyDown, ...props }: InputNumberProps): import("react/jsx-runtime").JSX.Element;
declare namespace textarea_d_exports {
  export { CharCount, Input, TextareaCharCountProps, TextareaInputProps };
}
interface TextareaInputProps extends Omit<React$2.ComponentPropsWithoutRef<'textarea'>, 'value' | 'defaultValue'> {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  hasError?: boolean;
  ref?: React$2.Ref<HTMLTextAreaElement>;
}
declare function TextareaInput({ value: valueProp, defaultValue, onValueChange, hasError, className, ref, ...props }: TextareaInputProps): import("react/jsx-runtime").JSX.Element;
declare namespace TextareaInput {
  var displayName: string;
}
interface TextareaCharCountProps extends React$2.ComponentPropsWithoutRef<'div'> {
  value?: string;
  maxLength?: number;
}
declare function TextareaCharCount({ value, maxLength, className, ...props }: TextareaCharCountProps): import("react/jsx-runtime").JSX.Element;
declare namespace TextareaCharCount {
  var displayName: string;
}
declare const Input: typeof TextareaInput;
declare const CharCount: typeof TextareaCharCount;
//#endregion
//#region src/components/primitives/input-group.d.ts
declare const inputGroupVariants: (props?: ({
  size?: "sm" | "default" | null | undefined;
} & import("class-variance-authority/types").ClassProp) | undefined) => string;
declare function InputGroup({ className, size, ...props }: React$2.ComponentProps<'div'> & VariantProps<typeof inputGroupVariants>): import("react/jsx-runtime").JSX.Element;
declare const inputGroupAddonVariants: (props?: ({
  align?: "inline-start" | "inline-end" | "block-start" | "block-end" | null | undefined;
} & import("class-variance-authority/types").ClassProp) | undefined) => string;
declare function InputGroupAddon({ className, align, ...props }: React$2.ComponentProps<'div'> & VariantProps<typeof inputGroupAddonVariants>): import("react/jsx-runtime").JSX.Element;
declare const inputGroupButtonVariants: (props?: ({
  size?: "xs" | "sm" | "icon-sm" | "icon-xs" | null | undefined;
} & import("class-variance-authority/types").ClassProp) | undefined) => string;
declare function InputGroupButton({ className, type, variant, size, ...props }: Omit<React$2.ComponentProps<typeof Button>, 'size'> & VariantProps<typeof inputGroupButtonVariants>): import("react/jsx-runtime").JSX.Element;
declare function InputGroupText({ className, ...props }: React$2.ComponentProps<'span'>): import("react/jsx-runtime").JSX.Element;
declare function InputGroupInput({ className, ...props }: InputProps): import("react/jsx-runtime").JSX.Element;
declare function InputGroupInputNumber({ className, ...props }: InputNumberProps): import("react/jsx-runtime").JSX.Element;
declare function InputGroupTextarea({ className, ...props }: TextareaInputProps): import("react/jsx-runtime").JSX.Element;
//#endregion
//#region src/components/composites/search-input/index.d.ts
type SearchInputClearProps = {
  /**
   * Clear handler. When provided, a clear button appears while the
   * controlled input holds a non-empty value. Clicking it invokes this
   * callback; the caller owns resetting `value`.
   */
  onClear: () => void;
  /** Accessible label for the clear button. Pass an i18n string from the caller. */
  clearLabel: string;
} | {
  onClear?: undefined;
  clearLabel?: never;
};
type SearchInputProps = Omit<InputProps, 'type' | 'size'> & SearchInputClearProps & {
  /** Field height, forwarded to the underlying `InputGroup` (`default` = h-9, `sm` = h-7). */
  size?: React$2.ComponentProps<typeof InputGroup>['size'];
  /** Classes for the wrapping input group; merged after size variants so a height override like `h-8` wins. */
  containerClassName?: string;
};
/**
 * Search field built on `InputGroup`: a leading search icon, a text input, and
 * an optional trailing clear button. Controlled via `value` / `onChange`.
 */
declare function SearchInput({ className, value, disabled, onClear, clearLabel, size, containerClassName, ...props }: SearchInputProps): import("react/jsx-runtime").JSX.Element;
//#endregion
//#region src/components/composites/select-dropdown/index.d.ts
interface SelectDropdownProps<T extends {
  id: string;
}> {
  items: T[];
  selectedId: string | null | undefined;
  onSelect: (id: string) => void;
  renderSelected: (item: T) => ReactNode;
  renderItem: (item: T, isSelected: boolean) => ReactNode;
  renderTriggerLeading?: ReactNode;
  onRemove?: (id: string) => void;
  removeLabel?: string;
  placeholder?: string;
  emptyText?: string;
  maxHeight?: number;
  virtualize?: boolean;
  itemHeight?: number;
  /** Pre-rendered rows outside visible area; raise this if you see blank frames during fast scroll. */
  overscan?: number;
  /**
   * Extra classes appended to the trigger button.
   * Use `data-[state=open]:*` selectors to override the open-state border/ring
   * (defaults follow `--color-primary`, which tracks the user theme color).
   */
  triggerClassName?: string;
}
declare function SelectDropdown<T extends {
  id: string;
}>({ items, selectedId, onSelect, renderSelected, renderItem, renderTriggerLeading, onRemove, removeLabel, placeholder, emptyText, maxHeight, virtualize, itemHeight, overscan, triggerClassName }: SelectDropdownProps<T>): import("react/jsx-runtime").JSX.Element;
//#endregion
//#region ../../node_modules/.pnpm/style-mod@4.1.3/node_modules/style-mod/src/style-mod.d.ts
declare class StyleModule {
  constructor(spec: {
    [selector: string]: StyleSpec;
  }, options?: {
    finish?(sel: string): string;
  });
  getRules(): string;
  static mount(root: Document | ShadowRoot | DocumentOrShadowRoot, module: StyleModule | ReadonlyArray<StyleModule>, options?: {
    nonce?: string;
  }): void;
  static newName(): string;
}
type StyleSpec = {
  [propOrSelector: string]: string | number | StyleSpec | null;
};
//#endregion
//#region ../../node_modules/.pnpm/@codemirror+view@6.39.16/node_modules/@codemirror/view/dist/index.d.ts
/**
Used to indicate [text direction](https://codemirror.net/6/docs/ref/#view.EditorView.textDirection).
*/
declare enum Direction {
  /**
    Left-to-right.
    */
  LTR = 0,
  /**
    Right-to-left.
    */
  RTL = 1
}
/**
Represents a contiguous range of text that has a single direction
(as in left-to-right or right-to-left).
*/
declare class BidiSpan {
  /**
    The start of the span (relative to the start of the line).
    */
  readonly from: number;
  /**
    The end of the span.
    */
  readonly to: number;
  /**
    The ["bidi
    level"](https://unicode.org/reports/tr9/#Basic_Display_Algorithm)
    of the span (in this context, 0 means
    left-to-right, 1 means right-to-left, 2 means left-to-right
    number inside right-to-left text).
    */
  readonly level: number;
  /**
    The direction of this span.
    */
  get dir(): Direction;
}
type Attrs = {
  [name: string]: string;
};
/**
Basic rectangle type.
*/
interface Rect {
  readonly left: number;
  readonly right: number;
  readonly top: number;
  readonly bottom: number;
}
type ScrollStrategy = "nearest" | "start" | "end" | "center";
interface MarkDecorationSpec {
  /**
    Whether the mark covers its start and end position or not. This
    influences whether content inserted at those positions becomes
    part of the mark. Defaults to false.
    */
  inclusive?: boolean;
  /**
    Specify whether the start position of the marked range should be
    inclusive. Overrides `inclusive`, when both are present.
    */
  inclusiveStart?: boolean;
  /**
    Whether the end should be inclusive.
    */
  inclusiveEnd?: boolean;
  /**
    Add attributes to the DOM elements that hold the text in the
    marked range.
    */
  attributes?: {
    [key: string]: string;
  };
  /**
    Shorthand for `{attributes: {class: value}}`.
    */
  class?: string;
  /**
    Add a wrapping element around the text in the marked range. Note
    that there will not necessarily be a single element covering the
    entire range—other decorations with lower precedence might split
    this one if they partially overlap it, and line breaks always
    end decoration elements.
    */
  tagName?: string;
  /**
    When using sets of decorations in
    [`bidiIsolatedRanges`](https://codemirror.net/6/docs/ref/##view.EditorView^bidiIsolatedRanges),
    this property provides the direction of the isolates. When null
    or not given, it indicates the range has `dir=auto`, and its
    direction should be derived from the first strong directional
    character in it.
    */
  bidiIsolate?: Direction | null;
  /**
    Decoration specs allow extra properties, which can be retrieved
    through the decoration's [`spec`](https://codemirror.net/6/docs/ref/#view.Decoration.spec)
    property.
    */
  [other: string]: any;
}
interface WidgetDecorationSpec {
  /**
    The type of widget to draw here.
    */
  widget: WidgetType;
  /**
    Which side of the given position the widget is on. When this is
    positive, the widget will be drawn after the cursor if the
    cursor is on the same position. Otherwise, it'll be drawn before
    it. When multiple widgets sit at the same position, their `side`
    values will determine their ordering—those with a lower value
    come first. Defaults to 0. May not be more than 10000 or less
    than -10000.
    */
  side?: number;
  /**
    By default, to avoid unintended mixing of block and inline
    widgets, block widgets with a positive `side` are always drawn
    after all inline widgets at that position, and those with a
    non-positive side before inline widgets. Setting this option to
    `true` for a block widget will turn this off and cause it to be
    rendered between the inline widgets, ordered by `side`.
    */
  inlineOrder?: boolean;
  /**
    Determines whether this is a block widgets, which will be drawn
    between lines, or an inline widget (the default) which is drawn
    between the surrounding text.
    
    Note that block-level decorations should not have vertical
    margins, and if you dynamically change their height, you should
    make sure to call
    [`requestMeasure`](https://codemirror.net/6/docs/ref/#view.EditorView.requestMeasure), so that the
    editor can update its information about its vertical layout.
    */
  block?: boolean;
  /**
    Other properties are allowed.
    */
  [other: string]: any;
}
interface ReplaceDecorationSpec {
  /**
    An optional widget to drawn in the place of the replaced
    content.
    */
  widget?: WidgetType;
  /**
    Whether this range covers the positions on its sides. This
    influences whether new content becomes part of the range and
    whether the cursor can be drawn on its sides. Defaults to false
    for inline replacements, and true for block replacements.
    */
  inclusive?: boolean;
  /**
    Set inclusivity at the start.
    */
  inclusiveStart?: boolean;
  /**
    Set inclusivity at the end.
    */
  inclusiveEnd?: boolean;
  /**
    Whether this is a block-level decoration. Defaults to false.
    */
  block?: boolean;
  /**
    Other properties are allowed.
    */
  [other: string]: any;
}
interface LineDecorationSpec {
  /**
    DOM attributes to add to the element wrapping the line.
    */
  attributes?: {
    [key: string]: string;
  };
  /**
    Shorthand for `{attributes: {class: value}}`.
    */
  class?: string;
  /**
    Other properties are allowed.
    */
  [other: string]: any;
}
/**
Widgets added to the content are described by subclasses of this
class. Using a description object like that makes it possible to
delay creating of the DOM structure for a widget until it is
needed, and to avoid redrawing widgets even if the decorations
that define them are recreated.
*/
declare abstract class WidgetType {
  /**
    Build the DOM structure for this widget instance.
    */
  abstract toDOM(view: EditorView): HTMLElement;
  /**
    Compare this instance to another instance of the same type.
    (TypeScript can't express this, but only instances of the same
    specific class will be passed to this method.) This is used to
    avoid redrawing widgets when they are replaced by a new
    decoration of the same type. The default implementation just
    returns `false`, which will cause new instances of the widget to
    always be redrawn.
    */
  eq(widget: WidgetType): boolean;
  /**
    Update a DOM element created by a widget of the same type (but
    different, non-`eq` content) to reflect this widget. May return
    true to indicate that it could update, false to indicate it
    couldn't (in which case the widget will be redrawn). The default
    implementation just returns false.
    */
  updateDOM(dom: HTMLElement, view: EditorView): boolean;
  /**
    The estimated height this widget will have, to be used when
    estimating the height of content that hasn't been drawn. May
    return -1 to indicate you don't know. The default implementation
    returns -1.
    */
  get estimatedHeight(): number;
  /**
    For inline widgets that are displayed inline (as opposed to
    `inline-block`) and introduce line breaks (through `<br>` tags
    or textual newlines), this must indicate the amount of line
    breaks they introduce. Defaults to 0.
    */
  get lineBreaks(): number;
  /**
    Can be used to configure which kinds of events inside the widget
    should be ignored by the editor. The default is to ignore all
    events.
    */
  ignoreEvent(event: Event): boolean;
  /**
    Override the way screen coordinates for positions at/in the
    widget are found. `pos` will be the offset into the widget, and
    `side` the side of the position that is being queried—less than
    zero for before, greater than zero for after, and zero for
    directly at that position.
    */
  coordsAt(dom: HTMLElement, pos: number, side: number): Rect | null;
  /**
    This is called when the an instance of the widget is removed
    from the editor view.
    */
  destroy(dom: HTMLElement): void;
}
/**
A decoration set represents a collection of decorated ranges,
organized for efficient access and mapping. See
[`RangeSet`](https://codemirror.net/6/docs/ref/#state.RangeSet) for its methods.
*/
type DecorationSet = RangeSet<Decoration>;
/**
The different types of blocks that can occur in an editor view.
*/
declare enum BlockType {
  /**
    A line of text.
    */
  Text = 0,
  /**
    A block widget associated with the position after it.
    */
  WidgetBefore = 1,
  /**
    A block widget associated with the position before it.
    */
  WidgetAfter = 2,
  /**
    A block widget [replacing](https://codemirror.net/6/docs/ref/#view.Decoration^replace) a range of content.
    */
  WidgetRange = 3
}
/**
A decoration provides information on how to draw or style a piece
of content. You'll usually use it wrapped in a
[`Range`](https://codemirror.net/6/docs/ref/#state.Range), which adds a start and end position.
@nonabstract
*/
declare abstract class Decoration extends RangeValue {
  /**
    The config object used to create this decoration. You can
    include additional properties in there to store metadata about
    your decoration.
    */
  readonly spec: any;
  protected constructor(
  /**
    @internal
    */
  startSide: number,
  /**
    @internal
    */
  endSide: number,
  /**
    @internal
    */
  widget: WidgetType | null,
  /**
    The config object used to create this decoration. You can
    include additional properties in there to store metadata about
    your decoration.
    */
  spec: any);
  abstract eq(other: Decoration): boolean;
  /**
    Create a mark decoration, which influences the styling of the
    content in its range. Nested mark decorations will cause nested
    DOM elements to be created. Nesting order is determined by
    precedence of the [facet](https://codemirror.net/6/docs/ref/#view.EditorView^decorations), with
    the higher-precedence decorations creating the inner DOM nodes.
    Such elements are split on line boundaries and on the boundaries
    of lower-precedence decorations.
    */
  static mark(spec: MarkDecorationSpec): Decoration;
  /**
    Create a widget decoration, which displays a DOM element at the
    given position.
    */
  static widget(spec: WidgetDecorationSpec): Decoration;
  /**
    Create a replace decoration which replaces the given range with
    a widget, or simply hides it.
    */
  static replace(spec: ReplaceDecorationSpec): Decoration;
  /**
    Create a line decoration, which can add DOM attributes to the
    line starting at the given position.
    */
  static line(spec: LineDecorationSpec): Decoration;
  /**
    Build a [`DecorationSet`](https://codemirror.net/6/docs/ref/#view.DecorationSet) from the given
    decorated range or ranges. If the ranges aren't already sorted,
    pass `true` for `sort` to make the library sort them for you.
    */
  static set(of: Range<Decoration> | readonly Range<Decoration>[], sort?: boolean): DecorationSet;
  /**
    The empty set of decorations.
    */
  static none: DecorationSet;
}
interface BlockWrapperSpec {
  /**
    Tag name of the wrapping element.
    */
  tagName: string;
  /**
    DOM attributes to add to the wrapping element.
    */
  attributes?: {
    [key: string]: string;
  };
}
/**
A block wrapper defines a DOM node that wraps lines or other block
wrappers at the top of the document. It affects any line or block
widget that starts inside its range, including blocks starting
directly at `from` but not including `to`.
*/
declare class BlockWrapper extends RangeValue {
  readonly tagName: string;
  readonly attributes: Attrs;
  private constructor();
  eq(other: RangeValue): boolean;
  /**
    Create a block wrapper object with the given tag name and
    attributes.
    */
  static create(spec: BlockWrapperSpec): BlockWrapper;
  /**
    Create a range set from the given block wrapper ranges.
    */
  static set(of: Range<BlockWrapper> | readonly Range<BlockWrapper>[], sort?: boolean): RangeSet<BlockWrapper>;
}
/**
Command functions are used in key bindings and other types of user
actions. Given an editor view, they check whether their effect can
apply to the editor, and if it can, perform it as a side effect
(which usually means [dispatching](https://codemirror.net/6/docs/ref/#view.EditorView.dispatch) a
transaction) and return `true`.
*/
type Command$2 = (target: EditorView) => boolean;
declare class ScrollTarget {
  readonly range: SelectionRange;
  readonly y: ScrollStrategy;
  readonly x: ScrollStrategy;
  readonly yMargin: number;
  readonly xMargin: number;
  readonly isSnapshot: boolean;
  constructor(range: SelectionRange, y?: ScrollStrategy, x?: ScrollStrategy, yMargin?: number, xMargin?: number, isSnapshot?: boolean);
  map(changes: ChangeDesc): ScrollTarget;
  clip(state: EditorState): ScrollTarget;
}
/**
Log or report an unhandled exception in client code. Should
probably only be used by extension code that allows client code to
provide functions, and calls those functions in a context where an
exception can't be propagated to calling code in a reasonable way
(for example when in an event handler).

Either calls a handler registered with
[`EditorView.exceptionSink`](https://codemirror.net/6/docs/ref/#view.EditorView^exceptionSink),
`window.onerror`, if defined, or `console.error` (in which case
it'll pass `context`, when given, as first argument).
*/
declare function logException(state: EditorState, exception: any, context?: string): void;
/**
This is the interface plugin objects conform to.
*/
interface PluginValue extends Object {
  /**
    Notifies the plugin of an update that happened in the view. This
    is called _before_ the view updates its own DOM. It is
    responsible for updating the plugin's internal state (including
    any state that may be read by plugin fields) and _writing_ to
    the DOM for the changes in the update. To avoid unnecessary
    layout recomputations, it should _not_ read the DOM layout—use
    [`requestMeasure`](https://codemirror.net/6/docs/ref/#view.EditorView.requestMeasure) to schedule
    your code in a DOM reading phase if you need to.
    */
  update?(update: ViewUpdate): void;
  /**
    Called when the document view is updated (due to content,
    decoration, or viewport changes). Should not try to immediately
    start another view update. Often useful for calling
    [`requestMeasure`](https://codemirror.net/6/docs/ref/#view.EditorView.requestMeasure).
    */
  docViewUpdate?(view: EditorView): void;
  /**
    Called when the plugin is no longer going to be used. Should
    revert any changes the plugin made to the DOM.
    */
  destroy?(): void;
}
/**
Provides additional information when defining a [view
plugin](https://codemirror.net/6/docs/ref/#view.ViewPlugin).
*/
interface PluginSpec<V extends PluginValue> {
  /**
    Register the given [event
    handlers](https://codemirror.net/6/docs/ref/#view.EditorView^domEventHandlers) for the plugin.
    When called, these will have their `this` bound to the plugin
    value.
    */
  eventHandlers?: DOMEventHandlers<V>;
  /**
    Registers [event observers](https://codemirror.net/6/docs/ref/#view.EditorView^domEventObservers)
    for the plugin. Will, when called, have their `this` bound to
    the plugin value.
    */
  eventObservers?: DOMEventHandlers<V>;
  /**
    Specify that the plugin provides additional extensions when
    added to an editor configuration.
    */
  provide?: (plugin: ViewPlugin<V, any>) => Extension;
  /**
    Allow the plugin to provide decorations. When given, this should
    be a function that take the plugin value and return a
    [decoration set](https://codemirror.net/6/docs/ref/#view.DecorationSet). See also the caveat about
    [layout-changing decorations](https://codemirror.net/6/docs/ref/#view.EditorView^decorations) that
    depend on the view.
    */
  decorations?: (value: V) => DecorationSet;
}
/**
View plugins associate stateful values with a view. They can
influence the way the content is drawn, and are notified of things
that happen in the view. They optionally take an argument, in
which case you need to call [`of`](https://codemirror.net/6/docs/ref/#view.ViewPlugin.of) to create
an extension for the plugin. When the argument type is undefined,
you can use the plugin instance as an extension directly.
*/
declare class ViewPlugin<V extends PluginValue, Arg = undefined> {
  /**
    When `Arg` is undefined, instances of this class act as
    extensions. Otherwise, you have to call `of` to create an
    extension value.
    */
  extension: Arg extends undefined ? Extension : null;
  private baseExtensions;
  private constructor();
  /**
    Create an extension for this plugin with the given argument.
    */
  of(arg: Arg): Extension;
  /**
    Define a plugin from a constructor function that creates the
    plugin's value, given an editor view.
    */
  static define<V extends PluginValue, Arg = undefined>(create: (view: EditorView, arg: Arg) => V, spec?: PluginSpec<V>): ViewPlugin<V, Arg>;
  /**
    Create a plugin for a class whose constructor takes a single
    editor view as argument.
    */
  static fromClass<V extends PluginValue, Arg = undefined>(cls: {
    new (view: EditorView, arg: Arg): V;
  }, spec?: PluginSpec<V>): ViewPlugin<V, Arg>;
}
interface MeasureRequest<T> {
  /**
    Called in a DOM read phase to gather information that requires
    DOM layout. Should _not_ mutate the document.
    */
  read(view: EditorView): T;
  /**
    Called in a DOM write phase to update the document. Should _not_
    do anything that triggers DOM layout.
    */
  write?(measure: T, view: EditorView): void;
  /**
    When multiple requests with the same key are scheduled, only the
    last one will actually be run.
    */
  key?: any;
}
type AttrSource = Attrs | ((view: EditorView) => Attrs | null);
/**
View [plugins](https://codemirror.net/6/docs/ref/#view.ViewPlugin) are given instances of this
class, which describe what happened, whenever the view is updated.
*/
declare class ViewUpdate {
  /**
    The editor view that the update is associated with.
    */
  readonly view: EditorView;
  /**
    The new editor state.
    */
  readonly state: EditorState;
  /**
    The transactions involved in the update. May be empty.
    */
  readonly transactions: readonly Transaction[];
  /**
    The changes made to the document by this update.
    */
  readonly changes: ChangeSet;
  /**
    The previous editor state.
    */
  readonly startState: EditorState;
  private constructor();
  /**
    Tells you whether the [viewport](https://codemirror.net/6/docs/ref/#view.EditorView.viewport) or
    [visible ranges](https://codemirror.net/6/docs/ref/#view.EditorView.visibleRanges) changed in this
    update.
    */
  get viewportChanged(): boolean;
  /**
    Returns true when
    [`viewportChanged`](https://codemirror.net/6/docs/ref/#view.ViewUpdate.viewportChanged) is true
    and the viewport change is not just the result of mapping it in
    response to document changes.
    */
  get viewportMoved(): boolean;
  /**
    Indicates whether the height of a block element in the editor
    changed in this update.
    */
  get heightChanged(): boolean;
  /**
    Returns true when the document was modified or the size of the
    editor, or elements within the editor, changed.
    */
  get geometryChanged(): boolean;
  /**
    True when this update indicates a focus change.
    */
  get focusChanged(): boolean;
  /**
    Whether the document changed in this update.
    */
  get docChanged(): boolean;
  /**
    Whether the selection was explicitly set in this update.
    */
  get selectionSet(): boolean;
}
/**
Interface that objects registered with
[`EditorView.mouseSelectionStyle`](https://codemirror.net/6/docs/ref/#view.EditorView^mouseSelectionStyle)
must conform to.
*/
interface MouseSelectionStyle {
  /**
    Return a new selection for the mouse gesture that starts with
    the event that was originally given to the constructor, and ends
    with the event passed here. In case of a plain click, those may
    both be the `mousedown` event, in case of a drag gesture, the
    latest `mousemove` event will be passed.
    
    When `extend` is true, that means the new selection should, if
    possible, extend the start selection. If `multiple` is true, the
    new selection should be added to the original selection.
    */
  get: (curEvent: MouseEvent, extend: boolean, multiple: boolean) => EditorSelection;
  /**
    Called when the view is updated while the gesture is in
    progress. When the document changes, it may be necessary to map
    some data (like the original selection or start position)
    through the changes.
    
    This may return `true` to indicate that the `get` method should
    get queried again after the update, because something in the
    update could change its result. Be wary of infinite loops when
    using this (where `get` returns a new selection, which will
    trigger `update`, which schedules another `get` in response).
    */
  update: (update: ViewUpdate) => boolean | void;
}
type MakeSelectionStyle = (view: EditorView, event: MouseEvent) => MouseSelectionStyle | null;
/**
Record used to represent information about a block-level element
in the editor view.
*/
declare class BlockInfo {
  /**
    The start of the element in the document.
    */
  readonly from: number;
  /**
    The length of the element.
    */
  readonly length: number;
  /**
    The top position of the element (relative to the top of the
    document).
    */
  readonly top: number;
  /**
    Its height.
    */
  readonly height: number;
  /**
    The type of element this is. When querying lines, this may be
    an array of all the blocks that make up the line.
    */
  get type(): BlockType | readonly BlockInfo[];
  /**
    The end of the element as a document position.
    */
  get to(): number;
  /**
    The bottom position of the element.
    */
  get bottom(): number;
  /**
    If this is a widget block, this will return the widget
    associated with it.
    */
  get widget(): WidgetType | null;
  /**
    If this is a textblock, this holds the number of line breaks
    that appear in widgets inside the block.
    */
  get widgetLineBreaks(): number;
}
/**
The type of object given to the [`EditorView`](https://codemirror.net/6/docs/ref/#view.EditorView)
constructor.
*/
interface EditorViewConfig extends EditorStateConfig {
  /**
    The view's initial state. If not given, a new state is created
    by passing this configuration object to
    [`EditorState.create`](https://codemirror.net/6/docs/ref/#state.EditorState^create), using its
    `doc`, `selection`, and `extensions` field (if provided).
    */
  state?: EditorState;
  /**
    When given, the editor is immediately appended to the given
    element on creation. (Otherwise, you'll have to place the view's
    [`dom`](https://codemirror.net/6/docs/ref/#view.EditorView.dom) element in the document yourself.)
    */
  parent?: Element | DocumentFragment;
  /**
    If the view is going to be mounted in a shadow root or document
    other than the one held by the global variable `document` (the
    default), you should pass it here. If you provide `parent`, but
    not this option, the editor will automatically look up a root
    from the parent.
    */
  root?: Document | ShadowRoot;
  /**
    Pass an effect created with
    [`EditorView.scrollIntoView`](https://codemirror.net/6/docs/ref/#view.EditorView^scrollIntoView) or
    [`EditorView.scrollSnapshot`](https://codemirror.net/6/docs/ref/#view.EditorView.scrollSnapshot)
    here to set an initial scroll position.
    */
  scrollTo?: StateEffect<any>;
  /**
    Override the way transactions are
    [dispatched](https://codemirror.net/6/docs/ref/#view.EditorView.dispatch) for this editor view.
    Your implementation, if provided, should probably call the
    view's [`update` method](https://codemirror.net/6/docs/ref/#view.EditorView.update).
    */
  dispatchTransactions?: (trs: readonly Transaction[], view: EditorView) => void;
  /**
    **Deprecated** single-transaction version of
    `dispatchTransactions`. Will force transactions to be dispatched
    one at a time when used.
    */
  dispatch?: (tr: Transaction, view: EditorView) => void;
}
/**
An editor view represents the editor's user interface. It holds
the editable DOM surface, and possibly other elements such as the
line number gutter. It handles events and dispatches state
transactions for editing actions.
*/
declare class EditorView {
  /**
    The current editor state.
    */
  get state(): EditorState;
  /**
    To be able to display large documents without consuming too much
    memory or overloading the browser, CodeMirror only draws the
    code that is visible (plus a margin around it) to the DOM. This
    property tells you the extent of the current drawn viewport, in
    document positions.
    */
  get viewport(): {
    from: number;
    to: number;
  };
  /**
    When there are, for example, large collapsed ranges in the
    viewport, its size can be a lot bigger than the actual visible
    content. Thus, if you are doing something like styling the
    content in the viewport, it is preferable to only do so for
    these ranges, which are the subset of the viewport that is
    actually drawn.
    */
  get visibleRanges(): readonly {
    from: number;
    to: number;
  }[];
  /**
    Returns false when the editor is entirely scrolled out of view
    or otherwise hidden.
    */
  get inView(): boolean;
  /**
    Indicates whether the user is currently composing text via
    [IME](https://en.wikipedia.org/wiki/Input_method), and at least
    one change has been made in the current composition.
    */
  get composing(): boolean;
  /**
    Indicates whether the user is currently in composing state. Note
    that on some platforms, like Android, this will be the case a
    lot, since just putting the cursor on a word starts a
    composition there.
    */
  get compositionStarted(): boolean;
  private dispatchTransactions;
  private _root;
  /**
    The document or shadow root that the view lives in.
    */
  get root(): DocumentOrShadowRoot;
  /**
    The DOM element that wraps the entire editor view.
    */
  readonly dom: HTMLElement;
  /**
    The DOM element that can be styled to scroll. (Note that it may
    not have been, so you can't assume this is scrollable.)
    */
  readonly scrollDOM: HTMLElement;
  /**
    The editable DOM element holding the editor content. You should
    not, usually, interact with this content directly though the
    DOM, since the editor will immediately undo most of the changes
    you make. Instead, [dispatch](https://codemirror.net/6/docs/ref/#view.EditorView.dispatch)
    [transactions](https://codemirror.net/6/docs/ref/#state.Transaction) to modify content, and
    [decorations](https://codemirror.net/6/docs/ref/#view.Decoration) to style it.
    */
  readonly contentDOM: HTMLElement;
  private announceDOM;
  private plugins;
  private pluginMap;
  private editorAttrs;
  private contentAttrs;
  private styleModules;
  private bidiCache;
  private destroyed;
  /**
    Construct a new view. You'll want to either provide a `parent`
    option, or put `view.dom` into your document after creating a
    view, so that the user can see the editor.
    */
  constructor(config?: EditorViewConfig);
  /**
    All regular editor state updates should go through this. It
    takes a transaction, array of transactions, or transaction spec
    and updates the view to show the new state produced by that
    transaction. Its implementation can be overridden with an
    [option](https://codemirror.net/6/docs/ref/#view.EditorView.constructor^config.dispatchTransactions).
    This function is bound to the view instance, so it does not have
    to be called as a method.
    
    Note that when multiple `TransactionSpec` arguments are
    provided, these define a single transaction (the specs will be
    merged), not a sequence of transactions.
    */
  dispatch(tr: Transaction): void;
  dispatch(trs: readonly Transaction[]): void;
  dispatch(...specs: TransactionSpec[]): void;
  /**
    Update the view for the given array of transactions. This will
    update the visible document and selection to match the state
    produced by the transactions, and notify view plugins of the
    change. You should usually call
    [`dispatch`](https://codemirror.net/6/docs/ref/#view.EditorView.dispatch) instead, which uses this
    as a primitive.
    */
  update(transactions: readonly Transaction[]): void;
  /**
    Reset the view to the given state. (This will cause the entire
    document to be redrawn and all view plugins to be reinitialized,
    so you should probably only use it when the new state isn't
    derived from the old state. Otherwise, use
    [`dispatch`](https://codemirror.net/6/docs/ref/#view.EditorView.dispatch) instead.)
    */
  setState(newState: EditorState): void;
  private updatePlugins;
  private docViewUpdate;
  /**
    Get the CSS classes for the currently active editor themes.
    */
  get themeClasses(): string;
  private updateAttrs;
  private showAnnouncements;
  private mountStyles;
  private readMeasured;
  /**
    Schedule a layout measurement, optionally providing callbacks to
    do custom DOM measuring followed by a DOM write phase. Using
    this is preferable reading DOM layout directly from, for
    example, an event handler, because it'll make sure measuring and
    drawing done by other components is synchronized, avoiding
    unnecessary DOM layout computations.
    */
  requestMeasure<T>(request?: MeasureRequest<T>): void;
  /**
    Get the value of a specific plugin, if present. Note that
    plugins that crash can be dropped from a view, so even when you
    know you registered a given plugin, it is recommended to check
    the return value of this method.
    */
  plugin<T extends PluginValue>(plugin: ViewPlugin<T, any>): T | null;
  /**
    The top position of the document, in screen coordinates. This
    may be negative when the editor is scrolled down. Points
    directly to the top of the first line, not above the padding.
    */
  get documentTop(): number;
  /**
    Reports the padding above and below the document.
    */
  get documentPadding(): {
    top: number;
    bottom: number;
  };
  /**
    If the editor is transformed with CSS, this provides the scale
    along the X axis. Otherwise, it will just be 1. Note that
    transforms other than translation and scaling are not supported.
    */
  get scaleX(): number;
  /**
    Provide the CSS transformed scale along the Y axis.
    */
  get scaleY(): number;
  /**
    Find the text line or block widget at the given vertical
    position (which is interpreted as relative to the [top of the
    document](https://codemirror.net/6/docs/ref/#view.EditorView.documentTop)).
    */
  elementAtHeight(height: number): BlockInfo;
  /**
    Find the line block (see
    [`lineBlockAt`](https://codemirror.net/6/docs/ref/#view.EditorView.lineBlockAt)) at the given
    height, again interpreted relative to the [top of the
    document](https://codemirror.net/6/docs/ref/#view.EditorView.documentTop).
    */
  lineBlockAtHeight(height: number): BlockInfo;
  /**
    Get the extent and vertical position of all [line
    blocks](https://codemirror.net/6/docs/ref/#view.EditorView.lineBlockAt) in the viewport. Positions
    are relative to the [top of the
    document](https://codemirror.net/6/docs/ref/#view.EditorView.documentTop);
    */
  get viewportLineBlocks(): BlockInfo[];
  /**
    Find the line block around the given document position. A line
    block is a range delimited on both sides by either a
    non-[hidden](https://codemirror.net/6/docs/ref/#view.Decoration^replace) line break, or the
    start/end of the document. It will usually just hold a line of
    text, but may be broken into multiple textblocks by block
    widgets.
    */
  lineBlockAt(pos: number): BlockInfo;
  /**
    The editor's total content height.
    */
  get contentHeight(): number;
  /**
    Move a cursor position by [grapheme
    cluster](https://codemirror.net/6/docs/ref/#state.findClusterBreak). `forward` determines whether
    the motion is away from the line start, or towards it. In
    bidirectional text, the line is traversed in visual order, using
    the editor's [text direction](https://codemirror.net/6/docs/ref/#view.EditorView.textDirection).
    When the start position was the last one on the line, the
    returned position will be across the line break. If there is no
    further line, the original position is returned.
    
    By default, this method moves over a single cluster. The
    optional `by` argument can be used to move across more. It will
    be called with the first cluster as argument, and should return
    a predicate that determines, for each subsequent cluster,
    whether it should also be moved over.
    */
  moveByChar(start: SelectionRange, forward: boolean, by?: (initial: string) => (next: string) => boolean): SelectionRange;
  /**
    Move a cursor position across the next group of either
    [letters](https://codemirror.net/6/docs/ref/#state.EditorState.charCategorizer) or non-letter
    non-whitespace characters.
    */
  moveByGroup(start: SelectionRange, forward: boolean): SelectionRange;
  /**
    Get the cursor position visually at the start or end of a line.
    Note that this may differ from the _logical_ position at its
    start or end (which is simply at `line.from`/`line.to`) if text
    at the start or end goes against the line's base text direction.
    */
  visualLineSide(line: Line, end: boolean): SelectionRange;
  /**
    Move to the next line boundary in the given direction. If
    `includeWrap` is true, line wrapping is on, and there is a
    further wrap point on the current line, the wrap point will be
    returned. Otherwise this function will return the start or end
    of the line.
    */
  moveToLineBoundary(start: SelectionRange, forward: boolean, includeWrap?: boolean): SelectionRange;
  /**
    Move a cursor position vertically. When `distance` isn't given,
    it defaults to moving to the next line (including wrapped
    lines). Otherwise, `distance` should provide a positive distance
    in pixels.
    
    When `start` has a
    [`goalColumn`](https://codemirror.net/6/docs/ref/#state.SelectionRange.goalColumn), the vertical
    motion will use that as a target horizontal position. Otherwise,
    the cursor's own horizontal position is used. The returned
    cursor will have its goal column set to whichever column was
    used.
    */
  moveVertically(start: SelectionRange, forward: boolean, distance?: number): SelectionRange;
  /**
    Find the DOM parent node and offset (child offset if `node` is
    an element, character offset when it is a text node) at the
    given document position.
    
    Note that for positions that aren't currently in
    `visibleRanges`, the resulting DOM position isn't necessarily
    meaningful (it may just point before or after a placeholder
    element).
    */
  domAtPos(pos: number, side?: -1 | 1): {
    node: Node;
    offset: number;
  };
  /**
    Find the document position at the given DOM node. Can be useful
    for associating positions with DOM events. Will raise an error
    when `node` isn't part of the editor content.
    */
  posAtDOM(node: Node, offset?: number): number;
  /**
    Get the document position at the given screen coordinates. For
    positions not covered by the visible viewport's DOM structure,
    this will return null, unless `false` is passed as second
    argument, in which case it'll return an estimated position that
    would be near the coordinates if it were rendered.
    */
  posAtCoords(coords: {
    x: number;
    y: number;
  }, precise: false): number;
  posAtCoords(coords: {
    x: number;
    y: number;
  }): number | null;
  /**
    Like [`posAtCoords`](https://codemirror.net/6/docs/ref/#view.EditorView.posAtCoords), but also
    returns which side of the position the coordinates are closest
    to. For example, for coordinates on the left side of a
    left-to-right character, the position before that letter is
    returned, with `assoc` 1, whereas on the right side, you'd get
    the position after the character, with `assoc` -1.
    */
  posAndSideAtCoords(coords: {
    x: number;
    y: number;
  }, precise: false): {
    pos: number;
    assoc: -1 | 1;
  };
  posAndSideAtCoords(coords: {
    x: number;
    y: number;
  }): {
    pos: number;
    assoc: -1 | 1;
  } | null;
  /**
    Get the screen coordinates at the given document position.
    `side` determines whether the coordinates are based on the
    element before (-1) or after (1) the position (if no element is
    available on the given side, the method will transparently use
    another strategy to get reasonable coordinates).
    */
  coordsAtPos(pos: number, side?: -1 | 1): Rect | null;
  /**
    Return the rectangle around a given character. If `pos` does not
    point in front of a character that is in the viewport and
    rendered (i.e. not replaced, not a line break), this will return
    null. For space characters that are a line wrap point, this will
    return the position before the line break.
    */
  coordsForChar(pos: number): Rect | null;
  /**
    The default width of a character in the editor. May not
    accurately reflect the width of all characters (given variable
    width fonts or styling of invididual ranges).
    */
  get defaultCharacterWidth(): number;
  /**
    The default height of a line in the editor. May not be accurate
    for all lines.
    */
  get defaultLineHeight(): number;
  /**
    The text direction
    ([`direction`](https://developer.mozilla.org/en-US/docs/Web/CSS/direction)
    CSS property) of the editor's content element.
    */
  get textDirection(): Direction;
  /**
    Find the text direction of the block at the given position, as
    assigned by CSS. If
    [`perLineTextDirection`](https://codemirror.net/6/docs/ref/#view.EditorView^perLineTextDirection)
    isn't enabled, or the given position is outside of the viewport,
    this will always return the same as
    [`textDirection`](https://codemirror.net/6/docs/ref/#view.EditorView.textDirection). Note that
    this may trigger a DOM layout.
    */
  textDirectionAt(pos: number): Direction;
  /**
    Whether this editor [wraps lines](https://codemirror.net/6/docs/ref/#view.EditorView.lineWrapping)
    (as determined by the
    [`white-space`](https://developer.mozilla.org/en-US/docs/Web/CSS/white-space)
    CSS property of its content element).
    */
  get lineWrapping(): boolean;
  /**
    Returns the bidirectional text structure of the given line
    (which should be in the current document) as an array of span
    objects. The order of these spans matches the [text
    direction](https://codemirror.net/6/docs/ref/#view.EditorView.textDirection)—if that is
    left-to-right, the leftmost spans come first, otherwise the
    rightmost spans come first.
    */
  bidiSpans(line: Line): readonly BidiSpan[];
  /**
    Check whether the editor has focus.
    */
  get hasFocus(): boolean;
  /**
    Put focus on the editor.
    */
  focus(): void;
  /**
    Update the [root](https://codemirror.net/6/docs/ref/##view.EditorViewConfig.root) in which the editor lives. This is only
    necessary when moving the editor's existing DOM to a new window or shadow root.
    */
  setRoot(root: Document | ShadowRoot): void;
  /**
    Clean up this editor view, removing its element from the
    document, unregistering event handlers, and notifying
    plugins. The view instance can no longer be used after
    calling this.
    */
  destroy(): void;
  /**
    Returns an effect that can be
    [added](https://codemirror.net/6/docs/ref/#state.TransactionSpec.effects) to a transaction to
    cause it to scroll the given position or range into view.
    */
  static scrollIntoView(pos: number | SelectionRange, options?: {
    /**
        By default (`"nearest"`) the position will be vertically
        scrolled only the minimal amount required to move the given
        position into view. You can set this to `"start"` to move it
        to the top of the view, `"end"` to move it to the bottom, or
        `"center"` to move it to the center.
        */
    y?: ScrollStrategy;
    /**
        Effect similar to
        [`y`](https://codemirror.net/6/docs/ref/#view.EditorView^scrollIntoView^options.y), but for the
        horizontal scroll position.
        */
    x?: ScrollStrategy;
    /**
        Extra vertical distance to add when moving something into
        view. Not used with the `"center"` strategy. Defaults to 5.
        Must be less than the height of the editor.
        */
    yMargin?: number;
    /**
        Extra horizontal distance to add. Not used with the `"center"`
        strategy. Defaults to 5. Must be less than the width of the
        editor.
        */
    xMargin?: number;
  }): StateEffect<unknown>;
  /**
    Return an effect that resets the editor to its current (at the
    time this method was called) scroll position. Note that this
    only affects the editor's own scrollable element, not parents.
    See also
    [`EditorViewConfig.scrollTo`](https://codemirror.net/6/docs/ref/#view.EditorViewConfig.scrollTo).
    
    The effect should be used with a document identical to the one
    it was created for. Failing to do so is not an error, but may
    not scroll to the expected position. You can
    [map](https://codemirror.net/6/docs/ref/#state.StateEffect.map) the effect to account for changes.
    */
  scrollSnapshot(): StateEffect<ScrollTarget>;
  /**
    Enable or disable tab-focus mode, which disables key bindings
    for Tab and Shift-Tab, letting the browser's default
    focus-changing behavior go through instead. This is useful to
    prevent trapping keyboard users in your editor.
    
    Without argument, this toggles the mode. With a boolean, it
    enables (true) or disables it (false). Given a number, it
    temporarily enables the mode until that number of milliseconds
    have passed or another non-Tab key is pressed.
    */
  setTabFocusMode(to?: boolean | number): void;
  /**
    Facet to add a [style
    module](https://github.com/marijnh/style-mod#documentation) to
    an editor view. The view will ensure that the module is
    mounted in its [document
    root](https://codemirror.net/6/docs/ref/#view.EditorView.constructor^config.root).
    */
  static styleModule: Facet<StyleModule, readonly StyleModule[]>;
  /**
    Returns an extension that can be used to add DOM event handlers.
    The value should be an object mapping event names to handler
    functions. For any given event, such functions are ordered by
    extension precedence, and the first handler to return true will
    be assumed to have handled that event, and no other handlers or
    built-in behavior will be activated for it. These are registered
    on the [content element](https://codemirror.net/6/docs/ref/#view.EditorView.contentDOM), except
    for `scroll` handlers, which will be called any time the
    editor's [scroll element](https://codemirror.net/6/docs/ref/#view.EditorView.scrollDOM) or one of
    its parent nodes is scrolled.
    */
  static domEventHandlers(handlers: DOMEventHandlers<any>): Extension;
  /**
    Create an extension that registers DOM event observers. Contrary
    to event [handlers](https://codemirror.net/6/docs/ref/#view.EditorView^domEventHandlers),
    observers can't be prevented from running by a higher-precedence
    handler returning true. They also don't prevent other handlers
    and observers from running when they return true, and should not
    call `preventDefault`.
    */
  static domEventObservers(observers: DOMEventHandlers<any>): Extension;
  /**
    An input handler can override the way changes to the editable
    DOM content are handled. Handlers are passed the document
    positions between which the change was found, and the new
    content. When one returns true, no further input handlers are
    called and the default behavior is prevented.
    
    The `insert` argument can be used to get the default transaction
    that would be applied for this input. This can be useful when
    dispatching the custom behavior as a separate transaction.
    */
  static inputHandler: Facet<(view: EditorView, from: number, to: number, text: string, insert: () => Transaction) => boolean, readonly ((view: EditorView, from: number, to: number, text: string, insert: () => Transaction) => boolean)[]>;
  /**
    Functions provided in this facet will be used to transform text
    pasted or dropped into the editor.
    */
  static clipboardInputFilter: Facet<(text: string, state: EditorState) => string, readonly ((text: string, state: EditorState) => string)[]>;
  /**
    Transform text copied or dragged from the editor.
    */
  static clipboardOutputFilter: Facet<(text: string, state: EditorState) => string, readonly ((text: string, state: EditorState) => string)[]>;
  /**
    Scroll handlers can override how things are scrolled into view.
    If they return `true`, no further handling happens for the
    scrolling. If they return false, the default scroll behavior is
    applied. Scroll handlers should never initiate editor updates.
    */
  static scrollHandler: Facet<(view: EditorView, range: SelectionRange, options: {
    x: ScrollStrategy;
    y: ScrollStrategy;
    xMargin: number;
    yMargin: number;
  }) => boolean, readonly ((view: EditorView, range: SelectionRange, options: {
    x: ScrollStrategy;
    y: ScrollStrategy;
    xMargin: number;
    yMargin: number;
  }) => boolean)[]>;
  /**
    This facet can be used to provide functions that create effects
    to be dispatched when the editor's focus state changes.
    */
  static focusChangeEffect: Facet<(state: EditorState, focusing: boolean) => StateEffect<any> | null, readonly ((state: EditorState, focusing: boolean) => StateEffect<any> | null)[]>;
  /**
    By default, the editor assumes all its content has the same
    [text direction](https://codemirror.net/6/docs/ref/#view.Direction). Configure this with a `true`
    value to make it read the text direction of every (rendered)
    line separately.
    */
  static perLineTextDirection: Facet<boolean, boolean>;
  /**
    Allows you to provide a function that should be called when the
    library catches an exception from an extension (mostly from view
    plugins, but may be used by other extensions to route exceptions
    from user-code-provided callbacks). This is mostly useful for
    debugging and logging. See [`logException`](https://codemirror.net/6/docs/ref/#view.logException).
    */
  static exceptionSink: Facet<(exception: any) => void, readonly ((exception: any) => void)[]>;
  /**
    A facet that can be used to register a function to be called
    every time the view updates.
    */
  static updateListener: Facet<(update: ViewUpdate) => void, readonly ((update: ViewUpdate) => void)[]>;
  /**
    Facet that controls whether the editor content DOM is editable.
    When its highest-precedence value is `false`, the element will
    not have its `contenteditable` attribute set. (Note that this
    doesn't affect API calls that change the editor content, even
    when those are bound to keys or buttons. See the
    [`readOnly`](https://codemirror.net/6/docs/ref/#state.EditorState.readOnly) facet for that.)
    */
  static editable: Facet<boolean, boolean>;
  /**
    Allows you to influence the way mouse selection happens. The
    functions in this facet will be called for a `mousedown` event
    on the editor, and can return an object that overrides the way a
    selection is computed from that mouse click or drag.
    */
  static mouseSelectionStyle: Facet<MakeSelectionStyle, readonly MakeSelectionStyle[]>;
  /**
    Facet used to configure whether a given selection drag event
    should move or copy the selection. The given predicate will be
    called with the `mousedown` event, and can return `true` when
    the drag should move the content.
    */
  static dragMovesSelection: Facet<(event: MouseEvent) => boolean, readonly ((event: MouseEvent) => boolean)[]>;
  /**
    Facet used to configure whether a given selecting click adds a
    new range to the existing selection or replaces it entirely. The
    default behavior is to check `event.metaKey` on macOS, and
    `event.ctrlKey` elsewhere.
    */
  static clickAddsSelectionRange: Facet<(event: MouseEvent) => boolean, readonly ((event: MouseEvent) => boolean)[]>;
  /**
    A facet that determines which [decorations](https://codemirror.net/6/docs/ref/#view.Decoration)
    are shown in the view. Decorations can be provided in two
    ways—directly, or via a function that takes an editor view.
    
    Only decoration sets provided directly are allowed to influence
    the editor's vertical layout structure. The ones provided as
    functions are called _after_ the new viewport has been computed,
    and thus **must not** introduce block widgets or replacing
    decorations that cover line breaks.
    
    If you want decorated ranges to behave like atomic units for
    cursor motion and deletion purposes, also provide the range set
    containing the decorations to
    [`EditorView.atomicRanges`](https://codemirror.net/6/docs/ref/#view.EditorView^atomicRanges).
    */
  static decorations: Facet<DecorationSet | ((view: EditorView) => DecorationSet), readonly (DecorationSet | ((view: EditorView) => DecorationSet))[]>;
  /**
    [Block wrappers](https://codemirror.net/6/docs/ref/#view.BlockWrapper) provide a way to add DOM
    structure around editor lines and block widgets. Sets of
    wrappers are provided in a similar way to decorations, and are
    nested in a similar way when they overlap. A wrapper affects all
    lines and block widgets that start inside its range.
    */
  static blockWrappers: Facet<_codemirror_state.RangeSet<BlockWrapper> | ((view: EditorView) => _codemirror_state.RangeSet<BlockWrapper>), readonly (_codemirror_state.RangeSet<BlockWrapper> | ((view: EditorView) => _codemirror_state.RangeSet<BlockWrapper>))[]>;
  /**
    Facet that works much like
    [`decorations`](https://codemirror.net/6/docs/ref/#view.EditorView^decorations), but puts its
    inputs at the very bottom of the precedence stack, meaning mark
    decorations provided here will only be split by other, partially
    overlapping `outerDecorations` ranges, and wrap around all
    regular decorations. Use this for mark elements that should, as
    much as possible, remain in one piece.
    */
  static outerDecorations: Facet<DecorationSet | ((view: EditorView) => DecorationSet), readonly (DecorationSet | ((view: EditorView) => DecorationSet))[]>;
  /**
    Used to provide ranges that should be treated as atoms as far as
    cursor motion is concerned. This causes methods like
    [`moveByChar`](https://codemirror.net/6/docs/ref/#view.EditorView.moveByChar) and
    [`moveVertically`](https://codemirror.net/6/docs/ref/#view.EditorView.moveVertically) (and the
    commands built on top of them) to skip across such regions when
    a selection endpoint would enter them. This does _not_ prevent
    direct programmatic [selection
    updates](https://codemirror.net/6/docs/ref/#state.TransactionSpec.selection) from moving into such
    regions.
    */
  static atomicRanges: Facet<(view: EditorView) => _codemirror_state.RangeSet<any>, readonly ((view: EditorView) => _codemirror_state.RangeSet<any>)[]>;
  /**
    When range decorations add a `unicode-bidi: isolate` style, they
    should also include a
    [`bidiIsolate`](https://codemirror.net/6/docs/ref/#view.MarkDecorationSpec.bidiIsolate) property
    in their decoration spec, and be exposed through this facet, so
    that the editor can compute the proper text order. (Other values
    for `unicode-bidi`, except of course `normal`, are not
    supported.)
    */
  static bidiIsolatedRanges: Facet<DecorationSet | ((view: EditorView) => DecorationSet), readonly (DecorationSet | ((view: EditorView) => DecorationSet))[]>;
  /**
    Facet that allows extensions to provide additional scroll
    margins (space around the sides of the scrolling element that
    should be considered invisible). This can be useful when the
    plugin introduces elements that cover part of that element (for
    example a horizontally fixed gutter).
    */
  static scrollMargins: Facet<(view: EditorView) => Partial<Rect> | null, readonly ((view: EditorView) => Partial<Rect> | null)[]>;
  /**
    Create a theme extension. The first argument can be a
    [`style-mod`](https://github.com/marijnh/style-mod#documentation)
    style spec providing the styles for the theme. These will be
    prefixed with a generated class for the style.
    
    Because the selectors will be prefixed with a scope class, rule
    that directly match the editor's [wrapper
    element](https://codemirror.net/6/docs/ref/#view.EditorView.dom)—to which the scope class will be
    added—need to be explicitly differentiated by adding an `&` to
    the selector for that element—for example
    `&.cm-focused`.
    
    When `dark` is set to true, the theme will be marked as dark,
    which will cause the `&dark` rules from [base
    themes](https://codemirror.net/6/docs/ref/#view.EditorView^baseTheme) to be used (as opposed to
    `&light` when a light theme is active).
    */
  static theme(spec: {
    [selector: string]: StyleSpec;
  }, options?: {
    dark?: boolean;
  }): Extension;
  /**
    This facet records whether a dark theme is active. The extension
    returned by [`theme`](https://codemirror.net/6/docs/ref/#view.EditorView^theme) automatically
    includes an instance of this when the `dark` option is set to
    true.
    */
  static darkTheme: Facet<boolean, boolean>;
  /**
    Create an extension that adds styles to the base theme. Like
    with [`theme`](https://codemirror.net/6/docs/ref/#view.EditorView^theme), use `&` to indicate the
    place of the editor wrapper element when directly targeting
    that. You can also use `&dark` or `&light` instead to only
    target editors with a dark or light theme.
    */
  static baseTheme(spec: {
    [selector: string]: StyleSpec;
  }): Extension;
  /**
    Provides a Content Security Policy nonce to use when creating
    the style sheets for the editor. Holds the empty string when no
    nonce has been provided.
    */
  static cspNonce: Facet<string, string>;
  /**
    Facet that provides additional DOM attributes for the editor's
    editable DOM element.
    */
  static contentAttributes: Facet<AttrSource, readonly AttrSource[]>;
  /**
    Facet that provides DOM attributes for the editor's outer
    element.
    */
  static editorAttributes: Facet<AttrSource, readonly AttrSource[]>;
  /**
    An extension that enables line wrapping in the editor (by
    setting CSS `white-space` to `pre-wrap` in the content).
    */
  static lineWrapping: Extension;
  /**
    State effect used to include screen reader announcements in a
    transaction. These will be added to the DOM in a visually hidden
    element with `aria-live="polite"` set, and should be used to
    describe effects that are visually obvious but may not be
    noticed by screen reader users (such as moving to the next
    search match).
    */
  static announce: _codemirror_state.StateEffectType<string>;
  /**
    Retrieve an editor view instance from the view's DOM
    representation.
    */
  static findFromDOM(dom: HTMLElement): EditorView | null;
}
/**
Helper type that maps event names to event object types, or the
`any` type for unknown events.
*/
interface DOMEventMap extends HTMLElementEventMap {
  [other: string]: any;
}
/**
Event handlers are specified with objects like this. For event
types known by TypeScript, this will infer the event argument type
to hold the appropriate event object type. For unknown events, it
is inferred to `any`, and should be explicitly set if you want type
checking.
*/
type DOMEventHandlers<This> = { [event in keyof DOMEventMap]?: (this: This, event: DOMEventMap[event], view: EditorView) => boolean | void; };
/**
Key bindings associate key names with
[command](https://codemirror.net/6/docs/ref/#view.Command)-style functions.

Key names may be strings like `"Shift-Ctrl-Enter"`—a key identifier
prefixed with zero or more modifiers. Key identifiers are based on
the strings that can appear in
[`KeyEvent.key`](https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/key).
Use lowercase letters to refer to letter keys (or uppercase letters
if you want shift to be held). You may use `"Space"` as an alias
for the `" "` name.

Modifiers can be given in any order. `Shift-` (or `s-`), `Alt-` (or
`a-`), `Ctrl-` (or `c-` or `Control-`) and `Cmd-` (or `m-` or
`Meta-`) are recognized.

When a key binding contains multiple key names separated by
spaces, it represents a multi-stroke binding, which will fire when
the user presses the given keys after each other.

You can use `Mod-` as a shorthand for `Cmd-` on Mac and `Ctrl-` on
other platforms. So `Mod-b` is `Ctrl-b` on Linux but `Cmd-b` on
macOS.
*/
interface KeyBinding {
  /**
    The key name to use for this binding. If the platform-specific
    property (`mac`, `win`, or `linux`) for the current platform is
    used as well in the binding, that one takes precedence. If `key`
    isn't defined and the platform-specific binding isn't either,
    a binding is ignored.
    */
  key?: string;
  /**
    Key to use specifically on macOS.
    */
  mac?: string;
  /**
    Key to use specifically on Windows.
    */
  win?: string;
  /**
    Key to use specifically on Linux.
    */
  linux?: string;
  /**
    The command to execute when this binding is triggered. When the
    command function returns `false`, further bindings will be tried
    for the key.
    */
  run?: Command$2;
  /**
    When given, this defines a second binding, using the (possibly
    platform-specific) key name prefixed with `Shift-` to activate
    this command.
    */
  shift?: Command$2;
  /**
    When this property is present, the function is called for every
    key that is not a multi-stroke prefix.
    */
  any?: (view: EditorView, event: KeyboardEvent) => boolean;
  /**
    By default, key bindings apply when focus is on the editor
    content (the `"editor"` scope). Some extensions, mostly those
    that define their own panels, might want to allow you to
    register bindings local to that panel. Such bindings should use
    a custom scope name. You may also assign multiple scope names to
    a binding, separating them by spaces.
    */
  scope?: string;
  /**
    When set to true (the default is false), this will always
    prevent the further handling for the bound key, even if the
    command(s) return false. This can be useful for cases where the
    native behavior of the key is annoying or irrelevant but the
    command doesn't always apply (such as, Mod-u for undo selection,
    which would cause the browser to view source instead when no
    selection can be undone).
    */
  preventDefault?: boolean;
  /**
    When set to true, `stopPropagation` will be called on keyboard
    events that have their `preventDefault` called in response to
    this key binding (see also
    [`preventDefault`](https://codemirror.net/6/docs/ref/#view.KeyBinding.preventDefault)).
    */
  stopPropagation?: boolean;
}
/**
Facet used for registering keymaps.

You can add multiple keymaps to an editor. Their priorities
determine their precedence (the ones specified early or with high
priority get checked first). When a handler has returned `true`
for a given key, no further handlers are called.
*/
declare const keymap: Facet<readonly KeyBinding[], readonly (readonly KeyBinding[])[]>;
/**
Run the key handlers registered for a given scope. The event
object should be a `"keydown"` event. Returns true if any of the
handlers handled it.
*/
declare function runScopeHandlers(view: EditorView, event: KeyboardEvent, scope: string): boolean;
type SelectionConfig = {
  /**
    The length of a full cursor blink cycle, in milliseconds.
    Defaults to 1200. Can be set to 0 to disable blinking.
    */
  cursorBlinkRate?: number;
  /**
    Whether to show a cursor for non-empty ranges. Defaults to
    true.
    */
  drawRangeCursor?: boolean;
};
/**
Returns an extension that hides the browser's native selection and
cursor, replacing the selection with a background behind the text
(with the `cm-selectionBackground` class), and the
cursors with elements overlaid over the code (using
`cm-cursor-primary` and `cm-cursor-secondary`).

This allows the editor to display secondary selection ranges, and
tends to produce a type of selection more in line with that users
expect in a text editor (the native selection styling will often
leave gaps between lines and won't fill the horizontal space after
a line when the selection continues past it).

It does have a performance cost, in that it requires an extra DOM
layout cycle for many updates (the selection is drawn based on DOM
layout information that's only available after laying out the
content).
*/
declare function drawSelection(config?: SelectionConfig): Extension;
/**
Retrieve the [`drawSelection`](https://codemirror.net/6/docs/ref/#view.drawSelection) configuration
for this state. (Note that this will return a set of defaults even
if `drawSelection` isn't enabled.)
*/
declare function getDrawSelectionConfig(state: EditorState): SelectionConfig;
/**
Draws a cursor at the current drop position when something is
dragged over the editor.
*/
declare function dropCursor(): Extension;
interface SpecialCharConfig {
  /**
    An optional function that renders the placeholder elements.
    
    The `description` argument will be text that clarifies what the
    character is, which should be provided to screen readers (for
    example with the
    [`aria-label`](https://www.w3.org/TR/wai-aria/#aria-label)
    attribute) and optionally shown to the user in other ways (such
    as the
    [`title`](https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/title)
    attribute).
    
    The given placeholder string is a suggestion for how to display
    the character visually.
    */
  render?: ((code: number, description: string | null, placeholder: string) => HTMLElement) | null;
  /**
    Regular expression that matches the special characters to
    highlight. Must have its 'g'/global flag set.
    */
  specialChars?: RegExp;
  /**
    Regular expression that can be used to add characters to the
    default set of characters to highlight.
    */
  addSpecialChars?: RegExp | null;
}
/**
Returns an extension that installs highlighting of special
characters.
*/
declare function highlightSpecialChars(
/**
Configuration options.
*/
config?: SpecialCharConfig): Extension;
/**
Returns an extension that makes sure the content has a bottom
margin equivalent to the height of the editor, minus one line
height, so that every line in the document can be scrolled to the
top of the editor.

This is only meaningful when the editor is scrollable, and should
not be enabled in editors that take the size of their content.
*/
declare function scrollPastEnd(): Extension;
/**
Mark lines that have a cursor on them with the `"cm-activeLine"`
DOM class.
*/
declare function highlightActiveLine(): Extension;
/**
Extension that enables a placeholder—a piece of example content
to show when the editor is empty.
*/
declare function placeholder$1(content: string | HTMLElement | ((view: EditorView) => HTMLElement)): Extension;
/**
Markers shown in a [layer](https://codemirror.net/6/docs/ref/#view.layer) must conform to this
interface. They are created in a measuring phase, and have to
contain all their positioning information, so that they can be
drawn without further DOM layout reading.

Markers are automatically absolutely positioned. Their parent
element has the same top-left corner as the document, so they
should be positioned relative to the document.
*/
interface LayerMarker {
  /**
    Compare this marker to a marker of the same type. Used to avoid
    unnecessary redraws.
    */
  eq(other: LayerMarker): boolean;
  /**
    Draw the marker to the DOM.
    */
  draw(): HTMLElement;
  /**
    Update an existing marker of this type to this marker.
    */
  update?(dom: HTMLElement, oldMarker: LayerMarker): boolean;
}
/**
Implementation of [`LayerMarker`](https://codemirror.net/6/docs/ref/#view.LayerMarker) that creates
a rectangle at a given set of coordinates.
*/
declare class RectangleMarker implements LayerMarker {
  private className;
  /**
    The left position of the marker (in pixels, document-relative).
    */
  readonly left: number;
  /**
    The top position of the marker.
    */
  readonly top: number;
  /**
    The width of the marker, or null if it shouldn't get a width assigned.
    */
  readonly width: number | null;
  /**
    The height of the marker.
    */
  readonly height: number;
  /**
    Create a marker with the given class and dimensions. If `width`
    is null, the DOM element will get no width style.
    */
  constructor(className: string,
  /**
    The left position of the marker (in pixels, document-relative).
    */
  left: number,
  /**
    The top position of the marker.
    */
  top: number,
  /**
    The width of the marker, or null if it shouldn't get a width assigned.
    */
  width: number | null,
  /**
    The height of the marker.
    */
  height: number);
  draw(): HTMLDivElement;
  update(elt: HTMLElement, prev: RectangleMarker): boolean;
  private adjust;
  eq(p: RectangleMarker): boolean;
  /**
    Create a set of rectangles for the given selection range,
    assigning them theclass`className`. Will create a single
    rectangle for empty ranges, and a set of selection-style
    rectangles covering the range's content (in a bidi-aware
    way) for non-empty ones.
    */
  static forRange(view: EditorView, className: string, range: SelectionRange): readonly RectangleMarker[];
}
interface LayerConfig {
  /**
    Determines whether this layer is shown above or below the text.
    */
  above: boolean;
  /**
    When given, this class is added to the DOM element that will
    wrap the markers.
    */
  class?: string;
  /**
    Called on every view update. Returning true triggers a marker
    update (a call to `markers` and drawing of those markers).
    */
  update(update: ViewUpdate, layer: HTMLElement): boolean;
  /**
    Whether to update this layer every time the document view
    changes. Defaults to true.
    */
  updateOnDocViewUpdate?: boolean;
  /**
    Build a set of markers for this layer, and measure their
    dimensions.
    */
  markers(view: EditorView): readonly LayerMarker[];
  /**
    If given, this is called when the layer is created.
    */
  mount?(layer: HTMLElement, view: EditorView): void;
  /**
    If given, called when the layer is removed from the editor or
    the entire editor is destroyed.
    */
  destroy?(layer: HTMLElement, view: EditorView): void;
}
/**
Define a layer.
*/
declare function layer(config: LayerConfig): Extension;
/**
Helper class used to make it easier to maintain decorations on
visible code that matches a given regular expression. To be used
in a [view plugin](https://codemirror.net/6/docs/ref/#view.ViewPlugin). Instances of this object
represent a matching configuration.
*/
declare class MatchDecorator {
  private regexp;
  private addMatch;
  private boundary;
  private maxLength;
  /**
    Create a decorator.
    */
  constructor(config: {
    /**
        The regular expression to match against the content. Will only
        be matched inside lines (not across them). Should have its 'g'
        flag set.
        */
    regexp: RegExp;
    /**
        The decoration to apply to matches, either directly or as a
        function of the match.
        */
    decoration?: Decoration | ((match: RegExpExecArray, view: EditorView, pos: number) => Decoration | null);
    /**
        Customize the way decorations are added for matches. This
        function, when given, will be called for matches and should
        call `add` to create decorations for them. Note that the
        decorations should appear *in* the given range, and the
        function should have no side effects beyond calling `add`.
        
        The `decoration` option is ignored when `decorate` is
        provided.
        */
    decorate?: (add: (from: number, to: number, decoration: Decoration) => void, from: number, to: number, match: RegExpExecArray, view: EditorView) => void;
    /**
        By default, changed lines are re-matched entirely. You can
        provide a boundary expression, which should match single
        character strings that can never occur in `regexp`, to reduce
        the amount of re-matching.
        */
    boundary?: RegExp;
    /**
        Matching happens by line, by default, but when lines are
        folded or very long lines are only partially drawn, the
        decorator may avoid matching part of them for speed. This
        controls how much additional invisible content it should
        include in its matches. Defaults to 1000.
        */
    maxLength?: number;
  });
  /**
    Compute the full set of decorations for matches in the given
    view's viewport. You'll want to call this when initializing your
    plugin.
    */
  createDeco(view: EditorView): _codemirror_state.RangeSet<Decoration>;
  /**
    Update a set of decorations for a view update. `deco` _must_ be
    the set of decorations produced by _this_ `MatchDecorator` for
    the view state before the update.
    */
  updateDeco(update: ViewUpdate, deco: DecorationSet): DecorationSet;
  private updateRange;
}
/**
Create an extension that enables rectangular selections. By
default, it will react to left mouse drag with the Alt key held
down. When such a selection occurs, the text within the rectangle
that was dragged over will be selected, as one selection
[range](https://codemirror.net/6/docs/ref/#state.SelectionRange) per line.
*/
declare function rectangularSelection(options?: {
  /**
    A custom predicate function, which takes a `mousedown` event and
    returns true if it should be used for rectangular selection.
    */
  eventFilter?: (event: MouseEvent) => boolean;
}): Extension;
/**
Returns an extension that turns the pointer cursor into a
crosshair when a given modifier key, defaulting to Alt, is held
down. Can serve as a visual hint that rectangular selection is
going to happen when paired with
[`rectangularSelection`](https://codemirror.net/6/docs/ref/#view.rectangularSelection).
*/
declare function crosshairCursor(options?: {
  key?: "Alt" | "Control" | "Shift" | "Meta";
}): Extension;
/**
Creates an extension that configures tooltip behavior.
*/
declare function tooltips(config?: {
  /**
    By default, tooltips use `"fixed"`
    [positioning](https://developer.mozilla.org/en-US/docs/Web/CSS/position),
    which has the advantage that tooltips don't get cut off by
    scrollable parent elements. However, CSS rules like `contain:
    layout` can break fixed positioning in child nodes, which can be
    worked about by using `"absolute"` here.
    
    On iOS, which at the time of writing still doesn't properly
    support fixed positioning, the library always uses absolute
    positioning.
    
    If the tooltip parent element sits in a transformed element, the
    library also falls back to absolute positioning.
    */
  position?: "fixed" | "absolute";
  /**
    The element to put the tooltips into. By default, they are put
    in the editor (`cm-editor`) element, and that is usually what
    you want. But in some layouts that can lead to positioning
    issues, and you need to use a different parent to work around
    those.
    */
  parent?: HTMLElement;
  /**
    By default, when figuring out whether there is room for a
    tooltip at a given position, the extension considers the entire
    space between 0,0 and
    `documentElement.clientWidth`/`clientHeight` to be available for
    showing tooltips. You can provide a function here that returns
    an alternative rectangle.
    */
  tooltipSpace?: (view: EditorView) => Rect;
}): Extension;
/**
Describes a tooltip. Values of this type, when provided through
the [`showTooltip`](https://codemirror.net/6/docs/ref/#view.showTooltip) facet, control the
individual tooltips on the editor.
*/
interface Tooltip {
  /**
    The document position at which to show the tooltip.
    */
  pos: number;
  /**
    The end of the range annotated by this tooltip, if different
    from `pos`.
    */
  end?: number;
  /**
    A constructor function that creates the tooltip's [DOM
    representation](https://codemirror.net/6/docs/ref/#view.TooltipView).
    */
  create(view: EditorView): TooltipView;
  /**
    Whether the tooltip should be shown above or below the target
    position. Not guaranteed to be respected for hover tooltips
    since all hover tooltips for the same range are always
    positioned together. Defaults to false.
    */
  above?: boolean;
  /**
    Whether the `above` option should be honored when there isn't
    enough space on that side to show the tooltip inside the
    viewport. Defaults to false.
    */
  strictSide?: boolean;
  /**
    When set to true, show a triangle connecting the tooltip element
    to position `pos`.
    */
  arrow?: boolean;
  /**
    By default, tooltips are hidden when their position is outside
    of the visible editor content. Set this to false to turn that
    off.
    */
  clip?: boolean;
}
/**
Describes the way a tooltip is displayed.
*/
interface TooltipView {
  /**
    The DOM element to position over the editor.
    */
  dom: HTMLElement;
  /**
    Adjust the position of the tooltip relative to its anchor
    position. A positive `x` value will move the tooltip
    horizontally along with the text direction (so right in
    left-to-right context, left in right-to-left). A positive `y`
    will move the tooltip up when it is above its anchor, and down
    otherwise.
    */
  offset?: {
    x: number;
    y: number;
  };
  /**
    By default, a tooltip's screen position will be based on the
    text position of its `pos` property. This method can be provided
    to make the tooltip view itself responsible for finding its
    screen position.
    */
  getCoords?: (pos: number) => Rect;
  /**
    By default, tooltips are moved when they overlap with other
    tooltips. Set this to `true` to disable that behavior for this
    tooltip.
    */
  overlap?: boolean;
  /**
    Called after the tooltip is added to the DOM for the first time.
    */
  mount?(view: EditorView): void;
  /**
    Update the DOM element for a change in the view's state.
    */
  update?(update: ViewUpdate): void;
  /**
    Called when the tooltip is removed from the editor or the editor
    is destroyed.
    */
  destroy?(): void;
  /**
    Called when the tooltip has been (re)positioned. The argument is
    the [space](https://codemirror.net/6/docs/ref/#view.tooltips^config.tooltipSpace) available to the
    tooltip.
    */
  positioned?(space: Rect): void;
  /**
    By default, the library will restrict the size of tooltips so
    that they don't stick out of the available space. Set this to
    false to disable that.
    */
  resize?: boolean;
}
/**
Facet to which an extension can add a value to show a tooltip.
*/
declare const showTooltip: Facet<Tooltip | null, readonly (Tooltip | null)[]>;
/**
The type of function that can be used as a [hover tooltip
source](https://codemirror.net/6/docs/ref/#view.hoverTooltip^source).
*/
type HoverTooltipSource = (view: EditorView, pos: number, side: -1 | 1) => Tooltip | readonly Tooltip[] | null | Promise<Tooltip | readonly Tooltip[] | null>;
/**
Set up a hover tooltip, which shows up when the pointer hovers
over ranges of text. The callback is called when the mouse hovers
over the document text. It should, if there is a tooltip
associated with position `pos`, return the tooltip description
(either directly or in a promise). The `side` argument indicates
on which side of the position the pointer is—it will be -1 if the
pointer is before the position, 1 if after the position.

Note that all hover tooltips are hosted within a single tooltip
container element. This allows multiple tooltips over the same
range to be "merged" together without overlapping.

The return value is a valid [editor extension](https://codemirror.net/6/docs/ref/#state.Extension)
but also provides an `active` property holding a state field that
can be used to read the currently active tooltips produced by this
extension.
*/
declare function hoverTooltip(source: HoverTooltipSource, options?: {
  /**
    Controls whether a transaction hides the tooltip. The default
    is to not hide.
    */
  hideOn?: (tr: Transaction, tooltip: Tooltip) => boolean;
  /**
    When enabled (this defaults to false), close the tooltip
    whenever the document changes or the selection is set.
    */
  hideOnChange?: boolean | "touch";
  /**
    Hover time after which the tooltip should appear, in
    milliseconds. Defaults to 300ms.
    */
  hoverTime?: number;
}): Extension & {
  active: StateField<readonly Tooltip[]>;
};
/**
Get the active tooltip view for a given tooltip, if available.
*/
declare function getTooltip(view: EditorView, tooltip: Tooltip): TooltipView | null;
/**
Returns true if any hover tooltips are currently active.
*/
declare function hasHoverTooltips(state: EditorState): boolean;
/**
Transaction effect that closes all hover tooltips.
*/
declare const closeHoverTooltips: StateEffect<null>;
/**
Tell the tooltip extension to recompute the position of the active
tooltips. This can be useful when something happens (such as a
re-positioning or CSS change affecting the editor) that could
invalidate the existing tooltip positions.
*/
declare function repositionTooltips(view: EditorView): void;
type PanelConfig = {
  /**
    By default, panels will be placed inside the editor's DOM
    structure. You can use this option to override where panels with
    `top: true` are placed.
    */
  topContainer?: HTMLElement;
  /**
    Override where panels with `top: false` are placed.
    */
  bottomContainer?: HTMLElement;
};
/**
Configures the panel-managing extension.
*/
declare function panels(config?: PanelConfig): Extension;
/**
Object that describes an active panel.
*/
interface Panel {
  /**
    The element representing this panel. The library will add the
    `"cm-panel"` DOM class to this.
    */
  dom: HTMLElement;
  /**
    Optionally called after the panel has been added to the editor.
    */
  mount?(): void;
  /**
    Update the DOM for a given view update.
    */
  update?(update: ViewUpdate): void;
  /**
    Called when the panel is removed from the editor or the editor
    is destroyed.
    */
  destroy?(): void;
  /**
    Whether the panel should be at the top or bottom of the editor.
    Defaults to false.
    */
  top?: boolean;
}
/**
Get the active panel created by the given constructor, if any.
This can be useful when you need access to your panels' DOM
structure.
*/
declare function getPanel(view: EditorView, panel: PanelConstructor): Panel | null;
/**
A function that initializes a panel. Used in
[`showPanel`](https://codemirror.net/6/docs/ref/#view.showPanel).
*/
type PanelConstructor = (view: EditorView) => Panel;
/**
Opening a panel is done by providing a constructor function for
the panel through this facet. (The panel is closed again when its
constructor is no longer provided.) Values of `null` are ignored.
*/
declare const showPanel: Facet<PanelConstructor | null, readonly (PanelConstructor | null)[]>;
type DialogConfig = {
  /**
    A function to render the content of the dialog. The result
    should contain at least one `<form>` element. Submit handlers
    and a handler for the Escape key will be added to the form.
    
    If this is not given, the `label`, `input`, and `submitLabel`
    fields will be used to create a simple form for you.
    */
  content?: (view: EditorView, close: () => void) => HTMLElement;
  /**
    When `content` isn't given, this provides the text shown in the
    dialog.
    */
  label?: string;
  /**
    The attributes for an input element shown next to the label. If
    not given, no input element is added.
    */
  input?: {
    [attr: string]: string;
  };
  /**
    The label for the button that submits the form. Defaults to
    `"OK"`.
    */
  submitLabel?: string;
  /**
    Extra classes to add to the panel.
    */
  class?: string;
  /**
    A query selector to find the field that should be focused when
    the dialog is opened. When set to true, this picks the first
    `<input>` or `<button>` element in the form.
    */
  focus?: string | boolean;
  /**
    By default, dialogs are shown below the editor. Set this to
    `true` to have it show up at the top.
    */
  top?: boolean;
};
/**
Show a panel above or below the editor to show the user a message
or prompt them for input. Returns an effect that can be dispatched
to close the dialog, and a promise that resolves when the dialog
is closed or a form inside of it is submitted.

You are encouraged, if your handling of the result of the promise
dispatches a transaction, to include the `close` effect in it. If
you don't, this function will automatically dispatch a separate
transaction right after.
*/
declare function showDialog(view: EditorView, config: DialogConfig): {
  close: StateEffect<unknown>;
  result: Promise<HTMLFormElement | null>;
};
/**
Find the [`Panel`](https://codemirror.net/6/docs/ref/#view.Panel) for an open dialog, using a class
name as identifier.
*/
declare function getDialog(view: EditorView, className: string): Panel | null;
/**
A gutter marker represents a bit of information attached to a line
in a specific gutter. Your own custom markers have to extend this
class.
*/
declare abstract class GutterMarker extends RangeValue {
  /**
    Compare this marker to another marker of the same type.
    */
  eq(other: GutterMarker): boolean;
  /**
    Render the DOM node for this marker, if any.
    */
  toDOM?(view: EditorView): Node;
  /**
    This property can be used to add CSS classes to the gutter
    element that contains this marker.
    */
  elementClass: string;
  /**
    Called if the marker has a `toDOM` method and its representation
    was removed from a gutter.
    */
  destroy(dom: Node): void;
}
/**
Facet used to add a class to all gutter elements for a given line.
Markers given to this facet should _only_ define an
[`elementclass`](https://codemirror.net/6/docs/ref/#view.GutterMarker.elementClass), not a
[`toDOM`](https://codemirror.net/6/docs/ref/#view.GutterMarker.toDOM) (or the marker will appear
in all gutters for the line).
*/
declare const gutterLineClass: Facet<RangeSet<GutterMarker>, readonly RangeSet<GutterMarker>[]>;
/**
Facet used to add a class to all gutter elements next to a widget.
Should not provide widgets with a `toDOM` method.
*/
declare const gutterWidgetClass: Facet<(view: EditorView, widget: WidgetType, block: BlockInfo) => GutterMarker | null, readonly ((view: EditorView, widget: WidgetType, block: BlockInfo) => GutterMarker | null)[]>;
type Handlers = {
  [event: string]: (view: EditorView, line: BlockInfo, event: Event) => boolean;
};
interface GutterConfig {
  /**
    An extra CSS class to be added to the wrapper (`cm-gutter`)
    element.
    */
  class?: string;
  /**
    Controls whether empty gutter elements should be rendered.
    Defaults to false.
    */
  renderEmptyElements?: boolean;
  /**
    Retrieve a set of markers to use in this gutter.
    */
  markers?: (view: EditorView) => (RangeSet<GutterMarker> | readonly RangeSet<GutterMarker>[]);
  /**
    Can be used to optionally add a single marker to every line.
    */
  lineMarker?: (view: EditorView, line: BlockInfo, otherMarkers: readonly GutterMarker[]) => GutterMarker | null;
  /**
    Associate markers with block widgets in the document.
    */
  widgetMarker?: (view: EditorView, widget: WidgetType, block: BlockInfo) => GutterMarker | null;
  /**
    If line or widget markers depend on additional state, and should
    be updated when that changes, pass a predicate here that checks
    whether a given view update might change the line markers.
    */
  lineMarkerChange?: null | ((update: ViewUpdate) => boolean);
  /**
    Add a hidden spacer element that gives the gutter its base
    width.
    */
  initialSpacer?: null | ((view: EditorView) => GutterMarker);
  /**
    Update the spacer element when the view is updated.
    */
  updateSpacer?: null | ((spacer: GutterMarker, update: ViewUpdate) => GutterMarker);
  /**
    Supply event handlers for DOM events on this gutter.
    */
  domEventHandlers?: Handlers;
  /**
    By default, gutters are shown horizontally before the editor
    content (to the left in a left-to-right layout). Set this to
    `"after"` to show a gutter on the other side of the content.
    */
  side?: "before" | "after";
}
/**
Define an editor gutter. The order in which the gutters appear is
determined by their extension priority.
*/
declare function gutter(config: GutterConfig): Extension;
/**
The gutter-drawing plugin is automatically enabled when you add a
gutter, but you can use this function to explicitly configure it.

Unless `fixed` is explicitly set to `false`, the gutters are
fixed, meaning they don't scroll along with the content
horizontally (except on Internet Explorer, which doesn't support
CSS [`position:
sticky`](https://developer.mozilla.org/en-US/docs/Web/CSS/position#sticky)).
*/
declare function gutters(config?: {
  fixed?: boolean;
}): Extension;
interface LineNumberConfig {
  /**
    How to display line numbers. Defaults to simply converting them
    to string.
    */
  formatNumber?: (lineNo: number, state: EditorState) => string;
  /**
    Supply event handlers for DOM events on this gutter.
    */
  domEventHandlers?: Handlers;
}
/**
Facet used to provide markers to the line number gutter.
*/
declare const lineNumberMarkers: Facet<RangeSet<GutterMarker>, readonly RangeSet<GutterMarker>[]>;
/**
Facet used to create markers in the line number gutter next to widgets.
*/
declare const lineNumberWidgetMarker: Facet<(view: EditorView, widget: WidgetType, block: BlockInfo) => GutterMarker | null, readonly ((view: EditorView, widget: WidgetType, block: BlockInfo) => GutterMarker | null)[]>;
/**
Create a line number gutter extension.
*/
declare function lineNumbers(config?: LineNumberConfig): Extension;
/**
Returns an extension that adds a `cm-activeLineGutter` class to
all gutter elements on the [active
line](https://codemirror.net/6/docs/ref/#view.highlightActiveLine).
*/
declare function highlightActiveLineGutter(): Extension;
/**
Returns an extension that highlights whitespace, adding a
`cm-highlightSpace` class to stretches of spaces, and a
`cm-highlightTab` class to individual tab characters. By default,
the former are shown as faint dots, and the latter as arrows.
*/
declare function highlightWhitespace(): Extension;
/**
Returns an extension that adds a `cm-trailingSpace` class to all
trailing whitespace.
*/
declare function highlightTrailingWhitespace(): Extension;
//#endregion
//#region ../../node_modules/.pnpm/@uiw+codemirror-extensions-basic-setup@4.25.7_@codemirror+autocomplete@6.20.1_@codemirr_c956a800fa7abbabb07b2a2a14d4c5fe/node_modules/@uiw/codemirror-extensions-basic-setup/cjs/index.d.ts
interface BasicSetupOptions extends MinimalSetupOptions {
  lineNumbers?: boolean;
  highlightActiveLineGutter?: boolean;
  foldGutter?: boolean;
  dropCursor?: boolean;
  allowMultipleSelections?: boolean;
  indentOnInput?: boolean;
  bracketMatching?: boolean;
  closeBrackets?: boolean;
  autocompletion?: boolean;
  rectangularSelection?: boolean;
  crosshairCursor?: boolean;
  highlightActiveLine?: boolean;
  highlightSelectionMatches?: boolean;
  closeBracketsKeymap?: boolean;
  searchKeymap?: boolean;
  foldKeymap?: boolean;
  completionKeymap?: boolean;
  lintKeymap?: boolean;
  /**
   * Facet for overriding the unit by which indentation happens. Should be a string consisting either entirely of spaces or entirely of tabs. When not set, this defaults to 2 spaces
   * https://codemirror.net/docs/ref/#language.indentUnit
   * @default 2
   */
  tabSize?: number;
}
/**
This is an extension value that just pulls together a number of
extensions that you might want in a basic editor. It is meant as a
convenient helper to quickly set up CodeMirror without installing
and importing a lot of separate packages.

Specifically, it includes...

 - [the default command bindings](https://codemirror.net/6/docs/ref/#commands.defaultKeymap)
 - [line numbers](https://codemirror.net/6/docs/ref/#view.lineNumbers)
 - [special character highlighting](https://codemirror.net/6/docs/ref/#view.highlightSpecialChars)
 - [the undo history](https://codemirror.net/6/docs/ref/#commands.history)
 - [a fold gutter](https://codemirror.net/6/docs/ref/#language.foldGutter)
 - [custom selection drawing](https://codemirror.net/6/docs/ref/#view.drawSelection)
 - [drop cursor](https://codemirror.net/6/docs/ref/#view.dropCursor)
 - [multiple selections](https://codemirror.net/6/docs/ref/#state.EditorState^allowMultipleSelections)
 - [reindentation on input](https://codemirror.net/6/docs/ref/#language.indentOnInput)
 - [the default highlight style](https://codemirror.net/6/docs/ref/#language.defaultHighlightStyle) (as fallback)
 - [bracket matching](https://codemirror.net/6/docs/ref/#language.bracketMatching)
 - [bracket closing](https://codemirror.net/6/docs/ref/#autocomplete.closeBrackets)
 - [autocompletion](https://codemirror.net/6/docs/ref/#autocomplete.autocompletion)
 - [rectangular selection](https://codemirror.net/6/docs/ref/#view.rectangularSelection) and [crosshair cursor](https://codemirror.net/6/docs/ref/#view.crosshairCursor)
 - [active line highlighting](https://codemirror.net/6/docs/ref/#view.highlightActiveLine)
 - [active line gutter highlighting](https://codemirror.net/6/docs/ref/#view.highlightActiveLineGutter)
 - [selection match highlighting](https://codemirror.net/6/docs/ref/#search.highlightSelectionMatches)
 - [search](https://codemirror.net/6/docs/ref/#search.searchKeymap)
 - [linting](https://codemirror.net/6/docs/ref/#lint.lintKeymap)

(You'll probably want to add some language package to your setup
too.)

This extension does not allow customization. The idea is that,
once you decide you want to configure your editor more precisely,
you take this package's source (which is just a bunch of imports
and an array literal), copy it into your own code, and adjust it
as desired.
*/
declare const basicSetup: (options?: BasicSetupOptions) => Extension[];
interface MinimalSetupOptions {
  highlightSpecialChars?: boolean;
  history?: boolean;
  drawSelection?: boolean;
  syntaxHighlighting?: boolean;
  defaultKeymap?: boolean;
  historyKeymap?: boolean;
}
/**
A minimal set of extensions to create a functional editor. Only
includes [the default keymap](https://codemirror.net/6/docs/ref/#commands.defaultKeymap), [undo
history](https://codemirror.net/6/docs/ref/#commands.history), [special character
highlighting](https://codemirror.net/6/docs/ref/#view.highlightSpecialChars), [custom selection
drawing](https://codemirror.net/6/docs/ref/#view.drawSelection), and [default highlight
style](https://codemirror.net/6/docs/ref/#language.defaultHighlightStyle).
*/
declare const minimalSetup: (options?: MinimalSetupOptions) => Extension[];
//#endregion
//#region ../../node_modules/.pnpm/@uiw+react-codemirror@4.25.7_@babel+runtime@7.29.7_@codemirror+autocomplete@6.20.1_@cod_1534a1796e572d79d7155c9efe7d6527/node_modules/@uiw/react-codemirror/cjs/utils.d.ts
interface Statistics {
  /** total length of the document */
  length: number;
  /** Get the number of lines in the editor. */
  lineCount: number;
  /** Get the currently line description around the given position. */
  line: Line;
  /** Get the proper [line-break](https://codemirror.net/docs/ref/#state.EditorState^lineSeparator) string for this state. */
  lineBreak: string;
  /** Returns true when the editor is [configured](https://codemirror.net/6/docs/ref/#state.EditorState^readOnly) to be read-only. */
  readOnly: boolean;
  /** The size (in columns) of a tab in the document, determined by the [`tabSize`](https://codemirror.net/6/docs/ref/#state.EditorState^tabSize) facet. */
  tabSize: number;
  /** Cursor Position */
  selection: EditorSelection;
  /** Make sure the selection only has one range. */
  selectionAsSingle: SelectionRange;
  /** Retrieves a list of all current selections. */
  ranges: readonly SelectionRange[];
  /** Get the currently selected code. */
  selectionCode: string;
  /**
   * The length of the given array should be the same as the number of active selections.
   * Replaces the content of the selections with the strings in the array.
   */
  selections: string[];
  /** Return true if any text is selected. */
  selectedText: boolean;
}
declare const getStatistics: (view: ViewUpdate) => Statistics;
//#endregion
//#region ../../node_modules/.pnpm/@uiw+react-codemirror@4.25.7_@babel+runtime@7.29.7_@codemirror+autocomplete@6.20.1_@cod_1534a1796e572d79d7155c9efe7d6527/node_modules/@uiw/react-codemirror/cjs/useCodeMirror.d.ts
declare const ExternalChange: import("@codemirror/state").AnnotationType<boolean>;
interface UseCodeMirror extends ReactCodeMirrorProps {
  container?: HTMLDivElement | null;
}
declare function useCodeMirror(props: UseCodeMirror): {
  state: EditorState | undefined;
  setState: import("react").Dispatch<import("react").SetStateAction<EditorState | undefined>>;
  view: EditorView | undefined;
  setView: import("react").Dispatch<import("react").SetStateAction<EditorView | undefined>>;
  container: HTMLDivElement | null | undefined;
  setContainer: import("react").Dispatch<import("react").SetStateAction<HTMLDivElement | null | undefined>>;
};
//#endregion
//#region ../../node_modules/.pnpm/@codemirror+theme-one-dark@6.1.3/node_modules/@codemirror/theme-one-dark/dist/index.d.ts
/**
The colors used in the theme, as CSS color strings.
*/
declare const color: {
  chalky: string;
  coral: string;
  cyan: string;
  invalid: string;
  ivory: string;
  stone: string;
  malibu: string;
  sage: string;
  whiskey: string;
  violet: string;
  darkBackground: string;
  highlightBackground: string;
  background: string;
  tooltipBackground: string;
  selection: string;
  cursor: string;
};
/**
The editor theme styles for One Dark.
*/
declare const oneDarkTheme: Extension;
/**
The highlighting style for code in the One Dark theme.
*/
declare const oneDarkHighlightStyle: HighlightStyle;
/**
Extension to enable the One Dark theme (both the editor theme and
the highlight style).
*/
declare const oneDark: Extension;
//#endregion
//#region ../../node_modules/.pnpm/@uiw+react-codemirror@4.25.7_@babel+runtime@7.29.7_@codemirror+autocomplete@6.20.1_@cod_1534a1796e572d79d7155c9efe7d6527/node_modules/@uiw/react-codemirror/cjs/theme/light.d.ts
declare const defaultLightThemeOption: import("@codemirror/state").Extension;
//#endregion
//#region ../../node_modules/.pnpm/@uiw+react-codemirror@4.25.7_@babel+runtime@7.29.7_@codemirror+autocomplete@6.20.1_@cod_1534a1796e572d79d7155c9efe7d6527/node_modules/@uiw/react-codemirror/cjs/getDefaultExtensions.d.ts
interface DefaultExtensionsOptions {
  indentWithTab?: boolean;
  basicSetup?: boolean | BasicSetupOptions;
  placeholder?: string | HTMLElement;
  theme?: 'light' | 'dark' | 'none' | Extension;
  readOnly?: boolean;
  editable?: boolean;
}
declare const getDefaultExtensions: (optios?: DefaultExtensionsOptions) => Extension[];
declare namespace index_d_exports {
  export { BasicSetupOptions, BidiSpan, BlockInfo, BlockType, BlockWrapper, Command$2 as Command, DOMEventHandlers, DOMEventMap, Decoration, DecorationSet, DefaultExtensionsOptions, Direction, EditorView, EditorViewConfig, ExternalChange, GutterMarker, HoverTooltipSource, KeyBinding, LayerMarker, MatchDecorator, MinimalSetupOptions, MouseSelectionStyle, Panel, PanelConstructor, PluginSpec, PluginValue, ReactCodeMirrorProps, ReactCodeMirrorRef, Rect, RectangleMarker, Statistics, Tooltip, TooltipView, UseCodeMirror, ViewPlugin, ViewUpdate, WidgetType, basicSetup, closeHoverTooltips, color, crosshairCursor, ReactCodeMirror as default, defaultLightThemeOption, drawSelection, dropCursor, getDefaultExtensions, getDialog, getDrawSelectionConfig, getPanel, getStatistics, getTooltip, gutter, gutterLineClass, gutterWidgetClass, gutters, hasHoverTooltips, highlightActiveLine, highlightActiveLineGutter, highlightSpecialChars, highlightTrailingWhitespace, highlightWhitespace, hoverTooltip, keymap, layer, lineNumberMarkers, lineNumberWidgetMarker, lineNumbers, logException, minimalSetup, oneDark, oneDarkHighlightStyle, oneDarkTheme, panels, placeholder$1 as placeholder, rectangularSelection, repositionTooltips, runScopeHandlers, scrollPastEnd, showDialog, showPanel, showTooltip, tooltips, useCodeMirror };
}
import * as import__codemirror_state from "@codemirror/state";
interface ReactCodeMirrorProps extends Omit<EditorStateConfig, 'doc' | 'extensions'>, Omit<React$1.HTMLAttributes<HTMLDivElement>, 'onChange' | 'placeholder'> {
  /** value of the auto created model in the editor. */
  value?: string;
  height?: string;
  minHeight?: string;
  maxHeight?: string;
  width?: string;
  minWidth?: string;
  maxWidth?: string;
  /** focus on the editor. */
  autoFocus?: boolean;
  /** Enables a placeholder—a piece of example content to show when the editor is empty. */
  placeholder?: string | HTMLElement;
  /**
   * `light` / `dark` / `Extension` Defaults to `light`.
   * @default light
   */
  theme?: 'light' | 'dark' | 'none' | Extension;
  /**
   * Whether to optional basicSetup by default
   * @default true
   */
  basicSetup?: boolean | BasicSetupOptions;
  /**
   * This disables editing of the editor content by the user.
   * @default true
   */
  editable?: boolean;
  /**
   * This disables editing of the editor content by the user.
   * @default false
   */
  readOnly?: boolean;
  /**
   * Controls whether pressing the `Tab` key inserts a tab character and indents the text (`true`)
   * or behaves according to the browser's default behavior (`false`).
   * @default true
   */
  indentWithTab?: boolean;
  /** Fired whenever a change occurs to the document. */
  onChange?(value: string, viewUpdate: ViewUpdate): void;
  /** Some data on the statistics editor. */
  onStatistics?(data: Statistics): void;
  /** Fired whenever any state change occurs within the editor, including non-document changes like lint results. */
  onUpdate?(viewUpdate: ViewUpdate): void;
  /** The first time the editor executes the event. */
  onCreateEditor?(view: EditorView, state: EditorState): void;
  /**
   * Extension values can be [provided](https://codemirror.net/6/docs/ref/#state.EditorStateConfig.extensions) when creating a state to attach various kinds of configuration and behavior information.
   * They can either be built-in extension-providing objects,
   * such as [state fields](https://codemirror.net/6/docs/ref/#state.StateField) or [facet providers](https://codemirror.net/6/docs/ref/#state.Facet.of),
   * or objects with an extension in its `extension` property. Extensions can be nested in arrays arbitrarily deep—they will be flattened when processed.
   */
  extensions?: Extension[];
  /**
   * If the view is going to be mounted in a shadow root or document other than the one held by the global variable document (the default), you should pass it here.
   * Originally from the [config of EditorView](https://codemirror.net/6/docs/ref/#view.EditorView.constructor%5Econfig.root)
   */
  root?: ShadowRoot | Document;
  /**
   * Create a state from its JSON representation serialized with [toJSON](https://codemirror.net/docs/ref/#state.EditorState.toJSON) function
   */
  initialState?: {
    json: any;
    fields?: Record<string, StateField<any>>;
  };
}
interface ReactCodeMirrorRef {
  editor?: HTMLDivElement | null;
  state?: EditorState;
  view?: EditorView;
}
declare const ReactCodeMirror: React$1.ForwardRefExoticComponent<ReactCodeMirrorProps & React$1.RefAttributes<ReactCodeMirrorRef>>;
//#endregion
//#region src/components/composites/code-editor/types.d.ts
type CodeMirrorTheme = 'light' | 'dark' | 'none' | index_d_exports.Extension;
interface CodeEditorHandles {
  save?: () => void;
  scrollToLine?: (lineNumber: number, options?: {
    highlight?: boolean;
  }) => void;
  getContent?: () => string;
  getSelection?: () => {
    from: number;
    to: number;
    text: string;
  } | null;
  /** Replace a document range with literal text; return false when editing is unavailable or the range is invalid. */
  replaceRange?: (range: {
    from: number;
    to: number;
  }, text: string) => boolean;
  insertText?: (text: string) => boolean;
  focus?: () => void;
}
interface CodeEditorProps {
  /** Retain document, selection, undo history and folds across compatible mounts. */
  stateRef?: React.RefObject<EditorState | null>;
  /** Syntax classes shared with a caller's read-only viewer. */
  syntaxHighlightStyle?: HighlightStyle;
  /** Content shown while the editor implementation loads. */
  fallback?: React.ReactNode;
  ref?: React.Ref<CodeEditorHandles>;
  /** Value used in controlled mode, e.g., code blocks. */
  value: string;
  /** Placeholder when the editor content is empty. */
  placeholder?: string | HTMLElement;
  /** Whether the editor should focus after its EditorView is created. */
  autoFocus?: boolean;
  /**
   * Code language string.
   * - Case-insensitive.
   * - Supports common names: javascript, json, python, etc.
   * - Supports aliases: c#/csharp, objective-c++/obj-c++/objc++, etc.
   * - Supports file extensions: .cpp/cpp, .js/js, .py/py, etc.
   */
  language: string;
  /**
   * Language configuration for extension mapping.
   * If not provided, will use a default minimal configuration.
   * @optional
   */
  languageConfig?: LanguageConfig;
  /** Fired when ref.save() is called or the save shortcut is triggered. */
  onSave?: (newContent: string) => void;
  /** Fired when the editor content changes. */
  onChange?: (newContent: string) => void;
  /** Fired when the editor loses focus. */
  onBlur?: (newContent: string) => void;
  /** Fired when the editor height changes. */
  onHeightChange?: (scrollHeight: number) => void;
  /**
   * Fixed editor height, not exceeding maxHeight.
   * Only works when expanded is false.
   */
  height?: string;
  /**
   * Maximum editor height.
   * Only works when expanded is false.
   */
  maxHeight?: string;
  /** Minimum editor height. */
  minHeight?: string;
  /** Editor options that extend BasicSetupOptions. */
  options?: {
    /**
     * Whether to enable special treatment for stream response.
     * @default false
     */
    stream?: boolean;
    /**
     * Whether to enable linting.
     * @default false
     */
    lint?: boolean;
    /**
     * Whether to enable keymap.
     * @default false
     */
    keymap?: boolean;
  } & BasicSetupOptions;
  /** Additional extensions for CodeMirror. */
  extensions?: index_d_exports.Extension[];
  /**
   * CodeMirror theme name: 'light', 'dark', 'none', Extension.
   * @default 'light'
   */
  theme?: CodeMirrorTheme;
  /**
   * Font size that overrides the app setting.
   * @default 16
   */
  fontSize?: number;
  /** Style overrides for the editor, passed directly to CodeMirror's style property. */
  style?: React.CSSProperties;
  /** CSS class name appended to the default `code-editor` class. */
  className?: string;
  /**
   * Whether the editor view is editable.
   * @default true
   */
  editable?: boolean;
  /**
   * Set the editor state to read only but keep some user interactions, e.g., keymaps.
   * @default false
   */
  readOnly?: boolean;
  /**
   * Whether the editor is expanded.
   * If true, the height and maxHeight props are ignored.
   * @default true
   */
  expanded?: boolean;
  /**
   * Whether the code lines are wrapped.
   * @default true
   */
  wrapped?: boolean;
  /**
   * Keep the internal editor scroller pinned to the document bottom while content grows.
   * Intended for streaming, collapsed code blocks.
   * @default false
   */
  autoScrollToBottom?: boolean;
}
//#endregion
//#region src/components/composites/code-editor/lazy-code-editor.d.ts
declare function LazyCodeEditor({ value, fallback, ...props }: CodeEditorProps): import("react/jsx-runtime").JSX.Element;
//#endregion
//#region src/components/composites/code-editor/utils.d.ts
/**
 * Get the list of CodeMirror theme names
 * - Include auto, light, dark
 * - Include all themes in @uiw/codemirror-themes-all
 *
 * A more robust approach might be to hardcode the theme list
 * @returns theme name list
 */
declare function getCmThemeNames(): Promise<string[]>;
/**
 * Get the CodeMirror theme object by theme name
 * @param name theme name
 * @returns theme object
 */
declare function getCmThemeByName(name: string): Promise<CodeMirrorTheme>;
/** The Cherry default CodeMirror theme, loaded on demand like the other themes. */
declare function getCherryCmTheme(dark: boolean): Promise<index_d_exports.Extension>;
//#endregion
//#region src/components/primitives/label.d.ts
/**
 * Decorative "required field" asterisk. Standalone-usable (e.g. next to a
 * schema property name) and the single source of truth for the marker that
 * `Label` renders when `required` is set.
 */
declare function RequiredMark({ className, ...props }: React$2.ComponentProps<'span'>): import("react/jsx-runtime").JSX.Element;
declare function Label({ className, required, children, ...props }: React$2.ComponentProps<typeof LabelPrimitive.Root> & {
  required?: boolean;
}): import("react/jsx-runtime").JSX.Element;
//#endregion
//#region src/components/composites/form/index.d.ts
declare const Form: <TFieldValues extends FieldValues, TContext = any, TTransformedValues = TFieldValues>(props: import("react-hook-form").FormProviderProps<TFieldValues, TContext, TTransformedValues>) => React$2.JSX.Element;
declare function FormField<TFieldValues extends FieldValues = FieldValues, TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>, TTransformedValues = TFieldValues>({ ...props }: ControllerProps<TFieldValues, TName, TTransformedValues>): import("react/jsx-runtime").JSX.Element;
declare const useFormField: () => {
  invalid: boolean;
  isDirty: boolean;
  isTouched: boolean;
  isValidating: boolean;
  error?: import("react-hook-form").FieldError;
  id: string;
  name: string;
  formItemId: string;
  formDescriptionId: string;
  formMessageId: string;
};
declare function FormItem({ className, ...props }: React$2.ComponentProps<'div'>): import("react/jsx-runtime").JSX.Element;
declare function FormLabel({ className, ...props }: React$2.ComponentProps<typeof Label>): import("react/jsx-runtime").JSX.Element;
declare function FormControl({ ...props }: React$2.ComponentProps<typeof Slot>): import("react/jsx-runtime").JSX.Element;
declare function FormDescription({ className, ...props }: React$2.ComponentProps<'p'>): import("react/jsx-runtime").JSX.Element;
declare function FormMessage({ className, ...props }: React$2.ComponentProps<'p'>): import("react/jsx-runtime").JSX.Element | null;
//#endregion
//#region src/components/composites/icon-tooltips/types.d.ts
interface IconTooltipProps extends Omit<TooltipProps, 'asChild' | 'children' | 'onClick'> {
  /** Localized accessible name for the focusable icon trigger. */
  ariaLabel?: string;
  iconProps?: LucideProps;
  onClick?: MouseEventHandler<HTMLButtonElement>;
}
//#endregion
//#region src/components/composites/icon-tooltips/help-tooltip.d.ts
/**
 * A tooltip with a help icon.
 * Used for providing help or guidance.
 */
declare const HelpTooltip: (props: IconTooltipProps) => import("react/jsx-runtime").JSX.Element;
//#endregion
//#region src/components/composites/icon-tooltips/info-tooltip.d.ts
/**
 * A tooltip with an info icon.
 * Used for providing additional information or context.
 */
declare const InfoTooltip: (props: IconTooltipProps) => import("react/jsx-runtime").JSX.Element;
//#endregion
//#region src/components/composites/icon-tooltips/warn-tooltip.d.ts
/**
 * A tooltip with a warning icon.
 * Used for displaying warnings or cautions.
 */
declare const WarnTooltip: (props: IconTooltipProps) => import("react/jsx-runtime").JSX.Element;
//#endregion
//#region src/components/composites/image-tool-button/index.d.ts
interface ImageToolButtonProps {
  tooltip: string;
  icon: React.ReactNode;
  onPress: () => void;
}
declare const _default: import("react").MemoExoticComponent<({ tooltip, icon, onPress }: ImageToolButtonProps) => import("react/jsx-runtime").JSX.Element>;
//#endregion
//#region src/components/composites/markdown/context.d.ts
/**
 * Carries the raw markdown source to sub-components rendered inside a
 * `<Markdown>` (e.g. `Table` needs the original markdown to support
 * "copy as markdown"). Renderer-level chat components consume this via
 * `useMarkdownBlockContext`.
 */
interface MarkdownBlockContextValue {
  content: string;
}
declare const MarkdownBlockContext: import("react").Context<MarkdownBlockContextValue | null>;
declare function useMarkdownBlockContext(): MarkdownBlockContextValue | null;
//#endregion
//#region src/components/composites/markdown/markdown.d.ts
interface MarkdownProps {
  /** Stable identity used as heading-ID prefix + block memoization key. */
  id: string;
  /** Markdown source. */
  children: string;
  /** Component overrides forwarded to Streamdown. */
  components?: Partial<Components>;
  /** Streamdown plugin presets (code / cjk / math / mermaid). */
  plugins?: PluginConfig;
  /** Extra rehype plugins appended after the core sanitize + heading-ID pipeline. */
  rehypePlugins?: Pluggable[];
  /** Extra remark plugins appended after Streamdown defaults + remarkAlert. */
  remarkPlugins?: Pluggable[];
  disallowedElements?: readonly string[];
  className?: string;
  /** Override the default 'Footnotes' label for i18n. */
  footnoteLabel?: string;
  /** Preserve local file hrefs for a custom anchor while retaining URL hardening. */
  preserveFileLinkHrefs?: boolean;
  /** Extra href schemes permitted by the caller. */
  additionalLinkProtocols?: readonly string[];
  /** Preserve relative image destinations for a custom image renderer. */
  preserveRelativeImageSrcs?: boolean;
}
declare function Markdown({ id, children, components, plugins, rehypePlugins, remarkPlugins, disallowedElements, className, footnoteLabel, preserveFileLinkHrefs, additionalLinkProtocols, preserveRelativeImageSrcs }: MarkdownProps): ReactElement;
//#endregion
//#region src/components/composites/markdown/plugins/code-highlight.d.ts
declare function createCodeHighlightPlugin({ execute, themes }?: {
  execute?: SnapshotExecutor;
  themes?: [string, string];
}): CodeHighlighterPlugin;
//#endregion
//#region ../../node_modules/.pnpm/@types+unist@3.0.3/node_modules/@types/unist/index.d.ts
// ## Interfaces
/**
 * Info associated with nodes by the ecosystem.
 *
 * This space is guaranteed to never be specified by unist or specifications
 * implementing unist.
 * But you can use it in utilities and plugins to store data.
 *
 * This type can be augmented to register custom data.
 * For example:
 *
 * ```ts
 * declare module 'unist' {
 *   interface Data {
 *     // `someNode.data.myId` is typed as `number | undefined`
 *     myId?: number | undefined
 *   }
 * }
 * ```
 */
interface Data$1 {}
/**
 * One place in a source file.
 */
interface Point {
  /**
   * Line in a source file (1-indexed integer).
   */
  line: number;
  /**
   * Column in a source file (1-indexed integer).
   */
  column: number;
  /**
   * Character in a source file (0-indexed integer).
   */
  offset?: number | undefined;
}
/**
 * Position of a node in a source document.
 *
 * A position is a range between two points.
 */
interface Position {
  /**
   * Place of the first character of the parsed source region.
   */
  start: Point;
  /**
   * Place of the first character after the parsed source region.
   */
  end: Point;
}
/**
 * Abstract unist node.
 *
 * The syntactic unit in unist syntax trees are called nodes.
 *
 * This interface is supposed to be extended.
 * If you can use {@link Literal} or {@link Parent}, you should.
 * But for example in markdown, a `thematicBreak` (`***`), is neither literal
 * nor parent, but still a node.
 */
interface Node$2 {
  /**
   * Node type.
   */
  type: string;
  /**
   * Info from the ecosystem.
   */
  data?: Data$1 | undefined;
  /**
   * Position of a node in a source document.
   *
   * Nodes that are generated (not in the original source document) must not
   * have a position.
   */
  position?: Position | undefined;
}
//#endregion
//#region ../../node_modules/.pnpm/@types+hast@3.0.4/node_modules/@types/hast/index.d.ts
// ## Interfaces
/**
 * Info associated with hast nodes by the ecosystem.
 *
 * This space is guaranteed to never be specified by unist or hast.
 * But you can use it in utilities and plugins to store data.
 *
 * This type can be augmented to register custom data.
 * For example:
 *
 * ```ts
 * declare module 'hast' {
 *   interface Data {
 *     // `someNode.data.myId` is typed as `number | undefined`
 *     myId?: number | undefined
 *   }
 * }
 * ```
 */
interface Data extends Data$1 {}
/**
 * Info associated with an element.
 */
interface Properties {
  [PropertyName: string]: boolean | number | string | null | undefined | Array<string | number>;
}
// ## Content maps
/**
 * Union of registered hast nodes that can occur in {@link Element}.
 *
 * To register mote custom hast nodes, add them to {@link ElementContentMap}.
 * They will be automatically added here.
 */
type ElementContent = ElementContentMap[keyof ElementContentMap];
/**
 * Registry of all hast nodes that can occur as children of {@link Element}.
 *
 * For a union of all {@link Element} children, see {@link ElementContent}.
 */
interface ElementContentMap {
  comment: Comment;
  element: Element$1;
  text: Text;
}
/**
 * Union of registered hast nodes that can occur in {@link Root}.
 *
 * To register custom hast nodes, add them to {@link RootContentMap}.
 * They will be automatically added here.
 */
type RootContent = RootContentMap[keyof RootContentMap];
/**
 * Registry of all hast nodes that can occur as children of {@link Root}.
 *
 * > 👉 **Note**: {@link Root} does not need to be an entire document.
 * > it can also be a fragment.
 *
 * For a union of all {@link Root} children, see {@link RootContent}.
 */
interface RootContentMap {
  comment: Comment;
  doctype: Doctype;
  element: Element$1;
  text: Text;
}
// ## Abstract nodes
/**
 * Abstract hast node.
 *
 * This interface is supposed to be extended.
 * If you can use {@link Literal} or {@link Parent}, you should.
 * But for example in HTML, a `Doctype` is neither literal nor parent, but
 * still a node.
 *
 * To register custom hast nodes, add them to {@link RootContentMap} and other
 * places where relevant (such as {@link ElementContentMap}).
 *
 * For a union of all registered hast nodes, see {@link Nodes}.
 */
interface Node$1 extends Node$2 {
  /**
   * Info from the ecosystem.
   */
  data?: Data | undefined;
}
/**
 * Abstract hast node that contains the smallest possible value.
 *
 * This interface is supposed to be extended if you make custom hast nodes.
 *
 * For a union of all registered hast literals, see {@link Literals}.
 */
interface Literal extends Node$1 {
  /**
   * Plain-text value.
   */
  value: string;
}
/**
 * Abstract hast node that contains other hast nodes (*children*).
 *
 * This interface is supposed to be extended if you make custom hast nodes.
 *
 * For a union of all registered hast parents, see {@link Parents}.
 */
interface Parent extends Node$1 {
  /**
   * List of children.
   */
  children: RootContent[];
}
// ## Concrete nodes
/**
 * HTML comment.
 */
interface Comment extends Literal {
  /**
   * Node type of HTML comments in hast.
   */
  type: "comment";
  /**
   * Data associated with the comment.
   */
  data?: CommentData | undefined;
}
/**
 * Info associated with hast comments by the ecosystem.
 */
interface CommentData extends Data {}
/**
 * HTML document type.
 */
interface Doctype extends Node$2 {
  /**
   * Node type of HTML document types in hast.
   */
  type: "doctype";
  /**
   * Data associated with the doctype.
   */
  data?: DoctypeData | undefined;
}
/**
 * Info associated with hast doctypes by the ecosystem.
 */
interface DoctypeData extends Data {}
/**
 * HTML element.
 */
interface Element$1 extends Parent {
  /**
   * Node type of elements.
   */
  type: "element";
  /**
   * Tag name (such as `'body'`) of the element.
   */
  tagName: string;
  /**
   * Info associated with the element.
   */
  properties: Properties;
  /**
   * Children of element.
   */
  children: ElementContent[];
  /**
   * When the `tagName` field is `'template'`, a `content` field can be
   * present.
   */
  content?: Root$1 | undefined;
  /**
   * Data associated with the element.
   */
  data?: ElementData | undefined;
}
/**
 * Info associated with hast elements by the ecosystem.
 */
interface ElementData extends Data {}
/**
 * Document fragment or a whole document.
 *
 * Should be used as the root of a tree and must not be used as a child.
 *
 * Can also be used as the value for the content field on a `'template'` element.
 */
interface Root$1 extends Parent {
  /**
   * Node type of hast root.
   */
  type: "root";
  /**
   * Children of root.
   */
  children: RootContent[];
  /**
   * Data associated with the hast root.
   */
  data?: RootData | undefined;
}
/**
 * Info associated with hast root nodes by the ecosystem.
 */
interface RootData extends Data {}
/**
 * HTML character data (plain text).
 */
interface Text extends Literal {
  /**
   * Node type of HTML character data (plain text) in hast.
   */
  type: "text";
  /**
   * Data associated with the text.
   */
  data?: TextData | undefined;
}
/**
 * Info associated with hast texts by the ecosystem.
 */
interface TextData extends Data {}
//#endregion
//#region src/components/composites/markdown/plugins/rehype-heading-ids.d.ts
/**
 * 基于 GitHub 风格的标题 slug 生成器（去重逻辑）
 * - 小写
 * - 去除前后空白
 * - 移除部分标点
 * - 将空白与非字母数字字符合并为单个 '-'
 * - 多次出现的相同 slug 加上递增后缀（-1, -2...）
 */
interface HeadingSlugger {
  slug: (text: string) => string;
}
interface RehypeHeadingIdsOptions {
  prefix?: string;
}
declare function createSlugger(): HeadingSlugger;
declare function extractTextFromNode(node: Node$1 | Text | Element$1 | null | undefined): string;
declare function rehypeHeadingIds(options?: RehypeHeadingIdsOptions): (tree: Root$1) => void;
//#endregion
//#region src/components/composites/markdown/plugins/rehype-prefix-svg-refs.d.ts
/**
 * Rehype plugin: prefix SVG IDs and rewrite intra-SVG references.
 *
 * Moved verbatim from src/renderer/src/components/chat/messages/markdown/Markdown.tsx
 * (lines 227-297). Pairs with the sanitize plugin's `clobberPrefix` so that
 * an SVG's `id="foo"` becomes `id="user-content-foo"` (clobbered to avoid
 * colliding with the host page), and all `url(#foo)` references inside the
 * same SVG follow suit.
 */
declare function rehypePrefixSvgReferences(clobberPrefix?: string): (tree: any) => void;
//#endregion
//#region src/components/composites/markdown/plugins/rehype-preserve-anchor-targets.d.ts
declare function rehypePreserveAnchorTargets(): (tree: Root$1) => void;
//#endregion
//#region src/components/composites/markdown/plugins/rehype-scalable-svg.d.ts
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
declare function rehypeScalableSvg(): (tree: Root$1) => void;
//#endregion
//#region src/components/composites/markdown/plugins/rehype-streaming-math.d.ts
/** Render only a closed, KaTeX-valid prefix while a math source is growing. */
declare const rehypeStreamingMath: Plugin<[Pluggable], Root$1>;
//#endregion
//#region src/components/composites/markdown/mermaid-presets.d.ts
interface WithFullMarkdownOptions {
  singleDollarMath?: boolean;
}
/** Mermaid diagram plugin backed by Merman, themed from the document's design tokens at render time. */
declare function withMermaid(): PluginConfig['mermaid'];
/**
 * Composer preset bundling all four plugins (code + cjk + math + mermaid).
 * Suitable for consumers that render the full markdown surface.
 */
declare function withFullMarkdown(opts?: WithFullMarkdownOptions): PluginConfig;
/**
 * @deprecated Use `withFullMarkdown`. Kept as a compatibility alias for
 * downstream branches that still import this preset from the markdown barrel.
 */
declare const withChatPlugins: typeof withFullMarkdown;
//#endregion
//#region src/components/composites/markdown/presets.d.ts
interface WithMathOptions {
  singleDollar?: boolean;
  /** Render the longest closed, valid prefix; keep final input errors visible when false. */
  streaming?: boolean;
}
/** Code (Highlights highlighting) + CJK line-break tweaks. */
declare const defaultMarkdownPlugins: PluginConfig;
/** KaTeX math plugin. `singleDollar` enables `$x$` inline math (off by default). */
declare function withMath(opts?: WithMathOptions): PluginConfig['math'];
//#endregion
//#region src/components/composites/markdown/streaming-markdown.d.ts
interface StreamingMarkdownProps {
  /** Stable identity used as heading-ID prefix. */
  id: string;
  /** Markdown source (the streaming tail). */
  children: string;
  components?: Partial<Components>;
  plugins?: PluginConfig;
  rehypePlugins?: Pluggable[];
  remarkPlugins?: Pluggable[];
  disallowedElements?: readonly string[];
  className?: string;
  footnoteLabel?: string;
  animated?: false | AnimateOptions;
  parseIncompleteMarkdown?: boolean;
  /** Keep custom syntax intact when splitting the stream into renderable blocks. */
  parseMarkdownIntoBlocksFn?: (source: string) => string[];
  /** Preserve local file hrefs for a custom anchor while retaining URL hardening. */
  preserveFileLinkHrefs?: boolean;
  /** Extra href schemes permitted by the caller. */
  additionalLinkProtocols?: readonly string[];
  /** Preserve relative image destinations for a custom image renderer. */
  preserveRelativeImageSrcs?: boolean;
}
declare function StreamingMarkdown({ id, children, components, plugins, rehypePlugins, remarkPlugins, disallowedElements, className, footnoteLabel, animated, parseIncompleteMarkdown, parseMarkdownIntoBlocksFn, preserveFileLinkHrefs, additionalLinkProtocols, preserveRelativeImageSrcs }: StreamingMarkdownProps): ReactElement;
//#endregion
//#region src/components/composites/markdown/types.d.ts
/**
 * Generic render source status. Kept as `string` so app-specific layers can
 * pass their own status alphabet without coupling this package to chat types.
 */
type MarkdownStatus = string;
/**
 * Lightweight interface for Markdown rendering source.
 * Provides the common id/content/status shape without owning status semantics.
 */
interface MarkdownSource<TStatus extends MarkdownStatus = MarkdownStatus> {
  id: string;
  content: string;
  status: TStatus;
}
//#endregion
//#region src/components/composites/markdown/utils/sanitize.d.ts
/**
 * Markdown sanitize schema + SVG element/attribute allow-lists.
 *
 * Moved verbatim from src/renderer/src/components/chat/messages/markdown/Markdown.tsx
 * (lines 39-225). Extended `defaultSchema` allows the SVG subset Streamdown's
 * Mermaid plugin (and inline SVG content) emits, plus `<sup data-citation>`
 * for the citation pipeline.
 */
declare const SVG_ELEMENT_REGEX: RegExp;
declare const DISALLOWED_ELEMENTS: string[];
declare const SVG_ELEMENTS: string[];
declare const SVG_ATTRIBUTES: string[];
type SanitizeAttribute = string | [string, ...unknown[]];
interface MarkdownSanitizeSchema {
  tagNames?: string[];
  attributes?: Record<string, SanitizeAttribute[] | undefined>;
  protocols?: Record<string, string[] | null | undefined>;
  strip?: string[];
  clobberPrefix?: string;
  [key: string]: unknown;
}
declare function createMarkdownSanitizeSchema(schema: MarkdownSanitizeSchema, additionalLinkProtocols?: readonly string[]): MarkdownSanitizeSchema;
//#endregion
//#region src/components/composites/image-preview/types.d.ts
interface ImagePreviewItem {
  id: string;
  src: string;
  alt?: string;
  title?: string;
  metadata?: unknown;
}
interface ImagePreviewTransform {
  flipX: boolean;
  flipY: boolean;
  zoom: number;
  rotation: number;
  offsetX: number;
  offsetY: number;
}
interface ImagePreviewLabels {
  close: string;
  flipHorizontal: string;
  flipVertical: string;
  next: string;
  previous: string;
  reset: string;
  rotateLeft: string;
  rotateRight: string;
  zoomIn: string;
  zoomOut: string;
  dialogTitle?: string;
}
interface ImagePreviewActionContext {
  close: () => void;
  index: number;
  items: ImagePreviewItem[];
  resetTransform: () => void;
  transform: ImagePreviewTransform;
}
interface ImagePreviewAction {
  id: string;
  label: string;
  icon?: React$2.ReactNode;
  disabled?: boolean;
  onSelect: (item: ImagePreviewItem, context: ImagePreviewActionContext) => void | Promise<void>;
}
type ImagePreviewActionErrorHandler = (error: unknown, action: ImagePreviewAction, item: ImagePreviewItem) => void;
declare const DEFAULT_IMAGE_PREVIEW_LABELS: ImagePreviewLabels;
//#endregion
//#region src/components/composites/image-preview/image-preview-context-menu.d.ts
interface ImagePreviewContextMenuProps {
  actions?: ImagePreviewAction[];
  children: React$2.ReactNode;
  context: ImagePreviewActionContext;
  item: ImagePreviewItem;
  onActionError?: ImagePreviewActionErrorHandler;
}
declare function ImagePreviewContextMenu({ actions, children, context, item, onActionError }: ImagePreviewContextMenuProps): import("react/jsx-runtime").JSX.Element;
//#endregion
//#region src/components/composites/image-preview/image-preview-dialog.d.ts
interface ImagePreviewDialogProps {
  actions?: ImagePreviewAction[];
  activeIndex?: number;
  className?: string;
  contentClassName?: string;
  defaultActiveIndex?: number;
  imageClassName?: string;
  items: ImagePreviewItem[];
  labels?: Partial<ImagePreviewLabels>;
  onActiveIndexChange?: (index: number) => void;
  onActionError?: ImagePreviewActionErrorHandler;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  overlayClassName?: string;
  toolbarActions?: ImagePreviewAction[];
}
declare function ImagePreviewDialog({ actions, activeIndex, className, contentClassName, defaultActiveIndex, imageClassName, items, labels, onActiveIndexChange, onActionError, onOpenChange, open, overlayClassName, toolbarActions }: ImagePreviewDialogProps): import("react/jsx-runtime").JSX.Element | null;
//#endregion
//#region src/components/composites/image-preview/image-preview-image.d.ts
interface ImagePreviewImageProps extends Omit<React$2.ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  fitScale?: number;
  item: ImagePreviewItem;
  transform: ImagePreviewTransform;
}
declare function ImagePreviewImage({ className, fitScale, item, style, transform, ...props }: ImagePreviewImageProps): import("react/jsx-runtime").JSX.Element;
//#endregion
//#region src/components/composites/image-preview/use-image-preview-transform.d.ts
interface ImagePreviewTransformOptions {
  initialTransform?: Partial<ImagePreviewTransform>;
  maxZoom?: number;
  minZoom?: number;
  zoomStep?: number;
}
type ImagePreviewTransformUpdate = Partial<ImagePreviewTransform> | ((current: ImagePreviewTransform) => Partial<ImagePreviewTransform>);
interface ImagePreviewTransformControls {
  canZoomIn: boolean;
  canZoomOut: boolean;
  flipHorizontal: () => void;
  flipVertical: () => void;
  maxZoom: number;
  minZoom: number;
  reset: () => void;
  rotateLeft: () => void;
  rotateRight: () => void;
  transform: ImagePreviewTransform;
  update: (update: ImagePreviewTransformUpdate) => void;
  zoomIn: () => void;
  zoomOut: () => void;
}
declare function useImagePreviewTransform({ initialTransform, maxZoom, minZoom, zoomStep }?: ImagePreviewTransformOptions): ImagePreviewTransformControls;
//#endregion
//#region src/components/composites/image-preview/image-preview-toolbar.d.ts
interface ImagePreviewToolbarProps {
  actions?: ImagePreviewAction[];
  className?: string;
  context: ImagePreviewActionContext;
  item: ImagePreviewItem;
  labels: ImagePreviewLabels;
  onActionError?: ImagePreviewActionErrorHandler;
  transformControls: ImagePreviewTransformControls;
}
declare function ImagePreviewToolbar({ actions, className, context, item, labels, onActionError, transformControls }: ImagePreviewToolbarProps): import("react/jsx-runtime").JSX.Element;
//#endregion
//#region src/components/composites/image-preview/image-preview-trigger.d.ts
interface ImagePreviewTriggerProps extends Omit<React$2.ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  dialogProps?: Omit<ImagePreviewDialogProps, 'activeIndex' | 'items' | 'onActiveIndexChange' | 'onOpenChange' | 'open'>;
  item: ImagePreviewItem;
  items?: ImagePreviewItem[];
  preview?: boolean;
}
declare function ImagePreviewTrigger({ alt, className, dialogProps, item, items, onClick, preview, ...props }: ImagePreviewTriggerProps): import("react/jsx-runtime").JSX.Element;
//#endregion
//#region src/components/composites/image-preview/image-preview-viewport.d.ts
interface ImagePreviewViewportProps extends Omit<React$2.HTMLAttributes<HTMLDivElement>, 'onError' | 'onLoad'> {
  actionContext?: ImagePreviewActionContext;
  actions?: ImagePreviewAction[];
  imageClassName?: string;
  item: ImagePreviewItem;
  onActionError?: ImagePreviewActionErrorHandler;
  onBackdropClick?: () => void;
  onError?: React$2.ReactEventHandler<HTMLImageElement>;
  onLoad?: React$2.ReactEventHandler<HTMLImageElement>;
  transformControls: ImagePreviewTransformControls;
}
declare function ImagePreviewViewport({ actionContext, actions, className, imageClassName, item, onActionError, onBackdropClick, onError, onLoad, transformControls, ...props }: ImagePreviewViewportProps): import("react/jsx-runtime").JSX.Element;
//#endregion
//#region src/components/composites/menu-list/menu-item.d.ts
declare const menuItemVariants$1: (props?: ({
  variant?: "default" | "ghost" | null | undefined;
  size?: "sm" | "default" | null | undefined;
} & import("class-variance-authority/types").ClassProp) | undefined) => string;
type MenuItemProps = React$2.ComponentProps<'button'> & VariantProps<typeof menuItemVariants$1> & {
  icon?: React$2.ReactNode;
  label: string;
  labelClassName?: string;
  description?: React$2.ReactNode;
  descriptionLines?: number;
  descriptionClassName?: string;
  active?: boolean;
  suffix?: React$2.ReactNode;
  asChild?: boolean;
};
declare function MenuItem({ className, variant, size, icon, label, labelClassName, description, descriptionLines, descriptionClassName, active, disabled, suffix, asChild, ref, ...props }: MenuItemProps): import("react/jsx-runtime").JSX.Element;
declare namespace MenuItem {
  var displayName: string;
}
type MenuListProps = React$2.ComponentProps<'div'>;
declare function MenuList({ className, ref, ...props }: MenuListProps): import("react/jsx-runtime").JSX.Element;
declare namespace MenuList {
  var displayName: string;
}
type MenuDividerProps = React$2.ComponentProps<'div'>;
declare function MenuDivider({ className, ref, ...props }: MenuDividerProps): import("react/jsx-runtime").JSX.Element;
declare namespace MenuDivider {
  var displayName: string;
}
//#endregion
//#region src/components/composites/page-header/page-header.d.ts
type PageHeaderProps = Omit<React$2.ComponentProps<'div'>, 'title'> & {
  title: React$2.ReactNode;
  titleClassName?: string;
  action?: React$2.ReactNode;
  bordered?: boolean;
};
declare function PageHeader({ title, titleClassName, action, bordered, className, ...props }: PageHeaderProps): import("react/jsx-runtime").JSX.Element;
declare namespace PageHeader {
  var displayName: string;
}
//#endregion
//#region src/components/composites/sortable/types.d.ts
type SortableItemId = string | number;
/**
 * Attach `ref` to a dedicated drag handle element so it becomes the activator instead
 * of the whole row. Only provided when the Sortable/ReorderableList runs in `dragHandle`
 * mode; the in-list row is then left non-interactive.
 */
interface SortableDragHandleProps {
  ref: (element: Element | null) => void;
}
interface SortableAccessibility {
  screenReaderInstructions?: {
    draggable: string;
  };
  announcements?: {
    onDragStart: (event: {
      activeId: SortableItemId;
    }) => string | undefined;
    onDragOver: (event: {
      activeId: SortableItemId;
      overId: SortableItemId | null;
    }) => string | undefined;
    onDragEnd: (event: {
      activeId: SortableItemId;
    }) => string | undefined;
    onDragCancel: (event: {
      activeId: SortableItemId;
    }) => string | undefined;
  };
}
type RenderItemType<T> = (item: T, props: {
  dragging: boolean;
  overlay: boolean;
  dragHandleProps?: SortableDragHandleProps;
}) => React.ReactNode;
//#endregion
//#region src/components/composites/sortable/sortable.d.ts
interface SortableProps<T> {
  /** Array of sortable items */
  items: T[];
  /** Function or key to get unique identifier for each item */
  itemKey: keyof T | ((item: T) => SortableItemId);
  /** Callback when sorting is complete, receives old and new indices */
  onSortEnd: (event: {
    oldIndex: number;
    newIndex: number;
  }) => void;
  /** Callback when drag starts */
  onDragStart?: (event: {
    activeId: SortableItemId;
  }) => void;
  /** Callback when drag ends */
  onDragEnd?: () => void;
  /** Callback when drag is cancelled */
  onDragCancel?: () => void;
  /** Function to render individual item, receives item data and drag state */
  renderItem: RenderItemType<T>;
  /** Layout type - 'list' for vertical/horizontal list, 'grid' for grid layout */
  layout?: 'list' | 'grid';
  /** Whether sorting is horizontal */
  horizontal?: boolean;
  /** Whether to use drag overlay
   * If you want to hide ghost item, set showGhost to false rather than useDragOverlay.
   */
  useDragOverlay?: boolean;
  /** Collision detection algorithm for rows of very different sizes; defaults to pointer + shape intersection */
  collisionDetection?: 'closest-center';
  /** Whether to show ghost item, only works when useDragOverlay is true */
  showGhost?: boolean;
  /** Item list class name */
  className?: string;
  /** Disable dragging for the whole collection */
  disabled?: boolean;
  /** Refuse to drag individual rows; they still accept drops */
  isItemDragDisabled?: (item: T) => boolean;
  /** Item list style */
  listStyle?: React$1.CSSProperties;
  /** Item style */
  itemStyle?: React$1.CSSProperties;
  /** Item gap */
  gap?: number | string;
  /** Restrictions, shortcuts for some modifiers */
  restrictions?: {
    /** Keep the dragged item inside the window */
    windowEdges?: boolean;
    /** Keep the dragged item inside its nearest scrollable ancestor */
    scrollableAncestor?: boolean;
  };
  /**
   * Route the drag activator to a dedicated handle instead of the whole row.
   * `renderItem` then receives `dragHandleProps`; attach its `ref` to the handle element,
   * keeping the row itself non-interactive (better for nested controls / a11y).
   */
  dragHandle?: boolean;
  /** Localized `announcements` and `screenReaderInstructions`, so drag feedback isn't the default English + item id. */
  accessibility?: SortableAccessibility;
}
declare function Sortable<T>({ items, itemKey, onSortEnd, onDragStart: customOnDragStart, onDragEnd: customOnDragEnd, onDragCancel: customOnDragCancel, renderItem, layout, horizontal, useDragOverlay, collisionDetection, showGhost, className, disabled, isItemDragDisabled, listStyle, itemStyle, gap, restrictions, dragHandle, accessibility }: SortableProps<T>): import("react/jsx-runtime").JSX.Element;
//#endregion
//#region src/components/composites/sortable/utils.d.ts
/**
 * Pointer sensor that also cancels the drag when the window loses focus.
 *
 * dnd-kit only cancels on `resize` and `visibilitychange`. An overlay that steals focus without
 * hiding the page (Windows `Win+Shift+S`) swallows the `pointerup`, so neither fires and the dragged
 * item stays glued to the cursor, swallowing every later click.
 */
declare class BlurCancelPointerSensor extends PointerSensor {
  constructor(props: PointerSensorProps);
}
//#endregion
//#region src/components/composites/reorderable-list/index.d.ts
type ReorderableItemId = string | number;
interface ReorderableListProps<T> {
  items: T[];
  visibleItems?: T[];
  getId: (item: T) => ReorderableItemId;
  renderItem: (item: T, index: number, state: {
    dragging: boolean;
    dragHandleProps?: SortableDragHandleProps;
  }) => ReactNode;
  onReorder: (nextItems: T[]) => void | Promise<void>;
  layout?: 'list' | 'grid';
  direction?: 'vertical' | 'horizontal';
  disabled?: boolean;
  /** Refuse to drag individual rows; they still accept drops. */
  isItemDragDisabled?: (item: T) => boolean;
  className?: string;
  listStyle?: CSSProperties;
  itemStyle?: CSSProperties;
  gap?: number | string;
  useDragOverlay?: boolean;
  showGhost?: boolean;
  /** Route the drag activator to a handle (via renderItem's `dragHandleProps`). */
  dragHandle?: boolean;
  /** Localized drag announcements / screen-reader instructions. */
  accessibility?: SortableAccessibility;
  restrictions?: {
    windowEdges?: boolean;
    scrollableAncestor?: boolean;
  };
  onDragStateChange?: (dragging: boolean) => void;
  onReorderError?: (error: unknown) => void;
}
declare function ReorderableList<T>({ items, visibleItems, getId, renderItem, onReorder, layout, direction, disabled, isItemDragDisabled, className, listStyle, itemStyle, gap, useDragOverlay, showGhost, dragHandle, accessibility, restrictions, onDragStateChange, onReorderError }: ReorderableListProps<T>): import("react/jsx-runtime").JSX.Element;
//#endregion
//#region src/components/composites/composite-input/composite-input.d.ts
declare const inputVariants: (props?: ({
  size?: "md" | "lg" | "sm" | null | undefined;
  variant?: "button" | "select" | "email" | "default" | null | undefined;
  disabled?: boolean | null | undefined;
} & import("class-variance-authority/types").ClassProp) | undefined) => string;
interface SelectItem$1 {
  label: ReactNode;
  value: string;
}
interface SelectGroup$1 {
  label: ReactNode;
  items: SelectItem$1[];
}
interface CompositeInputProps extends Omit<InputProps, 'size' | 'disabled' | 'prefix'>, VariantProps<typeof inputVariants> {
  buttonProps?: {
    label?: ReactNode;
    onClick: React.DOMAttributes<HTMLButtonElement>['onClick'];
  };
  prefix?: ReactNode;
  selectProps?: {
    groups: SelectGroup$1[];
    placeholder?: string;
  };
}
declare function CompositeInput({ type, size, variant, disabled, buttonProps, prefix, selectProps, className, ...rest }: CompositeInputProps): import("react/jsx-runtime").JSX.Element;
//#endregion
//#region src/components/composites/tree-view/types.d.ts
type DragPosition = 'before' | 'inside' | 'after';
interface TreeNodeAdapter<T> {
  getId: (node: T) => string;
  getChildren: (node: T) => T[] | undefined;
  /** When false, the node cannot accept 'inside' drops (used for leaves). Default: true. */
  canHaveChildren?: (node: T) => boolean;
  /** When true, the row is treated as a sticky header at its depth. */
  isSticky?: (node: T) => boolean;
}
interface FlatTreeItem<T> {
  id: string;
  node: T;
  depth: number;
}
interface TreeDragHandleProps {
  draggable: boolean;
  onDragStart: (e: React$1.DragEvent) => void;
  onDragOver: (e: React$1.DragEvent) => void;
  onDragLeave: (e: React$1.DragEvent) => void;
  onDrop: (e: React$1.DragEvent) => void;
  onDragEnd: (e: React$1.DragEvent) => void;
}
interface RenderRowArgs<T> {
  node: T;
  depth: number;
  isExpanded: boolean;
  isSelected: boolean;
  isDragging: boolean;
  isDragOver: boolean;
  dragPosition: DragPosition | null;
  toggleExpanded: () => void;
  selectNode: () => void;
  /** Spread on the draggable element. Listeners are no-ops when DnD is disabled (no onMove prop). */
  dragHandleProps: TreeDragHandleProps;
}
type RenderRowFn<T> = (args: RenderRowArgs<T>) => React$1.ReactNode;
interface TreeListSlotArgs<T> {
  flat: ReadonlyArray<FlatTreeItem<T>>;
  isSticky: (index: number) => boolean;
  getItemDepth: (index: number) => number;
  renderItem: (index: number) => React$1.ReactNode;
}
interface TreeViewProps<T> {
  data: T[];
  adapter: TreeNodeAdapter<T>;
  expandedIds?: ReadonlySet<string>;
  defaultExpandedIds?: ReadonlySet<string>;
  onExpandedChange?: (next: ReadonlySet<string>) => void;
  selectedId?: string | null;
  defaultSelectedId?: string | null;
  onSelectedChange?: (id: string | null) => void;
  renderRow: RenderRowFn<T>;
  /**
   * When omitted, DnD is fully disabled — no listeners attached, draggable=false.
   *
   * TreeView guards self-drops, external drops, and leaf `inside` fallback, but
   * callers still own structural move validation such as rejecting descendant
   * targets before mutating their tree data.
   */
  onMove?: (sourceId: string, targetId: string, position: DragPosition) => void;
  /** Optional virtualizer slot. When omitted, rows render as a plain flat list. */
  renderList?: (args: TreeListSlotArgs<T>) => React$1.ReactNode;
  className?: string;
  emptyState?: React$1.ReactNode;
}
//#endregion
//#region src/components/composites/tree-view/flatten-tree.d.ts
/**
 * Walks a tree of nodes depth-first, producing a flat list with depth tags.
 * Children of nodes whose id is not in `expandedIds` are skipped.
 */
declare function flattenTree<T>(data: readonly T[], adapter: TreeNodeAdapter<T>, expandedIds: ReadonlySet<string>): FlatTreeItem<T>[];
//#endregion
//#region src/components/composites/tree-view/tree-view.d.ts
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
declare function TreeView<T>(props: TreeViewProps<T>): import("react/jsx-runtime").JSX.Element;
//#endregion
//#region src/components/composites/tree-view/use-expanded-state.d.ts
interface UseExpandedStateOptions {
  expandedIds?: ReadonlySet<string>;
  defaultExpandedIds?: ReadonlySet<string>;
  onExpandedChange?: (next: ReadonlySet<string>) => void;
}
interface UseExpandedStateReturn {
  expandedIds: ReadonlySet<string>;
  toggle: (id: string) => void;
  isExpanded: (id: string) => boolean;
}
declare function useExpandedState(options: UseExpandedStateOptions): UseExpandedStateReturn;
//#endregion
//#region src/components/composites/tree-view/use-selection-state.d.ts
interface UseSelectionStateOptions {
  selectedId?: string | null;
  defaultSelectedId?: string | null;
  onSelectedChange?: (id: string | null) => void;
}
interface UseSelectionStateReturn {
  selectedId: string | null;
  select: (id: string | null) => void;
  isSelected: (id: string) => boolean;
}
declare function useSelectionState(options: UseSelectionStateOptions): UseSelectionStateReturn;
//#endregion
//#region src/components/composites/tree-view/use-tree-drag-and-drop.d.ts
interface UseTreeDragAndDropOptions {
  /**
   * Move callback. When undefined, all returned listeners are no-ops and draggable is false.
   *
   * The hook guards self-drops and external drops. Callers still own structural
   * validation before mutating tree data, including rejecting moves where
   * `targetId` is a descendant of `sourceId`; accepting those moves can create
   * cycles or orphan nodes in the caller's tree.
   */
  onMove?: (sourceId: string, targetId: string, position: DragPosition) => void;
  /** Whether the target node accepts 'inside' drops. Default: true for everything. */
  canHaveChildren?: (nodeId: string) => boolean;
}
interface UseTreeDragAndDropReturn {
  draggedId: string | null;
  dragOverId: string | null;
  dragPosition: DragPosition | null;
  /** Returns the listener bundle bound for a specific row. Listeners are no-ops when DnD is disabled. */
  getDragHandleProps: (nodeId: string) => TreeDragHandleProps;
}
declare function useTreeDragAndDrop(options: UseTreeDragAndDropOptions): UseTreeDragAndDropReturn;
//#endregion
//#region src/components/primitives/accordion.d.ts
declare function Accordion({ ...props }: React$2.ComponentProps<typeof AccordionPrimitive.Root>): import("react/jsx-runtime").JSX.Element;
declare function AccordionItem({ className, ...props }: React$2.ComponentProps<typeof AccordionPrimitive.Item>): import("react/jsx-runtime").JSX.Element;
declare function AccordionTrigger({ className, children, ...props }: React$2.ComponentProps<typeof AccordionPrimitive.Trigger>): import("react/jsx-runtime").JSX.Element;
type AccordionContentProps = React$2.ComponentProps<typeof AccordionPrimitive.Content> & {
  contentClassName?: string;
};
declare function AccordionContent({ className, contentClassName, children, ...props }: AccordionContentProps): import("react/jsx-runtime").JSX.Element;
//#endregion
//#region src/components/primitives/alert.d.ts
declare const alertVariants: (props?: ({
  type?: "info" | "success" | "warning" | "error" | null | undefined;
} & import("class-variance-authority/types").ClassProp) | undefined) => string;
type AlertProps = Omit<React$2.ComponentProps<'div'>, 'title'> & VariantProps<typeof alertVariants> & {
  message?: React$2.ReactNode;
  description?: React$2.ReactNode;
  action?: React$2.ReactNode;
  icon?: React$2.ReactNode;
  showIcon?: boolean;
};
declare function Alert({ className, type, message, description, action, icon, showIcon, children, role, ref, ...props }: AlertProps): import("react/jsx-runtime").JSX.Element;
declare namespace Alert {
  var displayName: string;
}
//#endregion
//#region src/components/primitives/badge.d.ts
declare const badgeVariants: (props?: ({
  variant?: "default" | "destructive" | "outline" | "secondary" | null | undefined;
} & import("class-variance-authority/types").ClassProp) | undefined) => string;
declare function Badge({ className, variant, asChild, ...props }: React$2.ComponentProps<'span'> & VariantProps<typeof badgeVariants> & {
  asChild?: boolean;
}): import("react/jsx-runtime").JSX.Element;
//#endregion
//#region src/components/primitives/breadcrumb.d.ts
declare function Breadcrumb({ ...props }: React$2.ComponentProps<'nav'>): import("react/jsx-runtime").JSX.Element;
declare function BreadcrumbList({ className, ...props }: React$2.ComponentProps<'ol'>): import("react/jsx-runtime").JSX.Element;
declare function BreadcrumbItem({ className, ...props }: React$2.ComponentProps<'li'>): import("react/jsx-runtime").JSX.Element;
declare function BreadcrumbLink({ asChild, className, ...props }: React$2.ComponentProps<'a'> & {
  asChild?: boolean;
}): import("react/jsx-runtime").JSX.Element;
declare function BreadcrumbPage({ className, ...props }: React$2.ComponentProps<'span'>): import("react/jsx-runtime").JSX.Element;
declare function BreadcrumbSeparator({ children, className, ...props }: React$2.ComponentProps<'li'>): import("react/jsx-runtime").JSX.Element;
declare function BreadcrumbEllipsis({ className, ...props }: React$2.ComponentProps<'span'>): import("react/jsx-runtime").JSX.Element;
//#endregion
//#region src/components/primitives/separator.d.ts
declare function Separator({ className, orientation, decorative, ...props }: React$2.ComponentProps<typeof SeparatorPrimitive.Root>): import("react/jsx-runtime").JSX.Element;
//#endregion
//#region src/components/primitives/button-group.d.ts
declare const buttonGroupVariants: (props?: ({
  orientation?: "horizontal" | "vertical" | null | undefined;
  attached?: boolean | null | undefined;
} & import("class-variance-authority/types").ClassProp) | undefined) => string;
declare function ButtonGroup({ className, orientation, attached, ...props }: React.ComponentProps<'div'> & VariantProps<typeof buttonGroupVariants>): import("react/jsx-runtime").JSX.Element;
declare function ButtonGroupItem({ className, ...props }: React.ComponentProps<'div'>): import("react/jsx-runtime").JSX.Element;
declare function ButtonGroupText({ className, asChild, ...props }: React.ComponentProps<'div'> & {
  asChild?: boolean;
}): import("react/jsx-runtime").JSX.Element;
declare function ButtonGroupSeparator({ className, orientation, ...props }: React.ComponentProps<typeof Separator>): import("react/jsx-runtime").JSX.Element;
//#endregion
//#region src/components/primitives/checkbox.d.ts
type CheckedState = CheckboxPrimitive.CheckedState;
declare const checkboxVariants: (props?: ({
  size?: "md" | "lg" | "sm" | null | undefined;
} & import("class-variance-authority/types").ClassProp) | undefined) => string;
declare function Checkbox({ className, size, ...props }: React$2.ComponentProps<typeof CheckboxPrimitive.Root> & VariantProps<typeof checkboxVariants>): import("react/jsx-runtime").JSX.Element;
//#endregion
//#region src/components/primitives/combobox.d.ts
declare const comboboxTriggerVariants: (props?: ({
  state?: "disabled" | "default" | "error" | null | undefined;
  size?: "lg" | "sm" | "default" | null | undefined;
} & import("class-variance-authority/types").ClassProp) | undefined) => string;
type ComboboxOption<TExtra extends object = Record<never, never>> = {
  value: string;
  label: string;
  group?: string;
  disabled?: boolean;
  icon?: React$2.ReactNode;
  description?: string;
} & TExtra;
type ComboboxSearchPlacement = 'content' | 'trigger';
interface ComboboxProps<TExtra extends object = Record<never, never>> extends Omit<VariantProps<typeof comboboxTriggerVariants>, 'state'> {
  options: ComboboxOption<TExtra>[];
  value?: string | string[];
  defaultValue?: string | string[];
  onChange?: (value: string | string[]) => void;
  multiple?: boolean;
  renderOption?: (option: ComboboxOption<TExtra>) => React$2.ReactNode;
  renderValue?: (value: string | string[], options: ComboboxOption<TExtra>[]) => React$2.ReactNode;
  searchable?: boolean;
  searchPlacement?: ComboboxSearchPlacement;
  searchPlaceholder?: string;
  emptyText?: string;
  /** Aria-label for the remove tag button. Receives the selected option label. */
  getRemoveTagAriaLabel?: (optionLabel: string) => string;
  onSearch?: (search: string) => void;
  filterOption?: (option: ComboboxOption<TExtra>, search: string) => boolean;
  error?: boolean;
  disabled?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  placeholder?: string;
  className?: string;
  popoverClassName?: string;
  popoverAlign?: React$2.ComponentProps<typeof PopoverContent>['align'];
  portalContainer?: React$2.ComponentProps<typeof PopoverContent>['portalContainer'];
  triggerStyle?: React$2.CSSProperties;
  width?: string | number;
  'aria-label'?: React$2.AriaAttributes['aria-label'];
  name?: string;
  'aria-labelledby'?: React$2.AriaAttributes['aria-labelledby'];
}
declare function Combobox<TExtra extends object = Record<never, never>>({ options, value: controlledValue, defaultValue, onChange, multiple, renderOption, renderValue, searchable, searchPlacement, searchPlaceholder, emptyText, getRemoveTagAriaLabel, onSearch, filterOption, error, disabled, open: controlledOpen, onOpenChange, placeholder, className, popoverClassName, popoverAlign, portalContainer, triggerStyle, width, size, 'aria-label': ariaLabel, name, 'aria-labelledby': ariaLabelledBy }: ComboboxProps<TExtra>): import("react/jsx-runtime").JSX.Element;
//#endregion
//#region src/components/primitives/dialog.d.ts
declare function Dialog({ ...props }: React$2.ComponentProps<typeof DialogPrimitive.Root>): import("react/jsx-runtime").JSX.Element;
declare function DialogTrigger({ ...props }: React$2.ComponentProps<typeof DialogPrimitive.Trigger>): import("react/jsx-runtime").JSX.Element;
declare function DialogPortal({ container, ...props }: React$2.ComponentProps<typeof DialogPrimitive.Portal>): import("react/jsx-runtime").JSX.Element;
declare function DialogClose({ ...props }: React$2.ComponentProps<typeof DialogPrimitive.Close>): import("react/jsx-runtime").JSX.Element;
declare function DialogOverlay({ className, onPointerDown, ...props }: React$2.ComponentProps<typeof DialogPrimitive.Overlay>): import("react/jsx-runtime").JSX.Element;
type DialogContentSize = 'sm' | 'default' | 'lg' | 'xl';
type DialogContentMotion = 'directional' | 'fade-scale';
type DialogContentProps = React$2.ComponentProps<typeof DialogPrimitive.Content> & {
  closeLabel?: string;
  closeOnOverlayClick?: boolean;
  motion?: DialogContentMotion;
  overlayClassName?: string;
  showCloseButton?: boolean;
  size?: DialogContentSize;
};
declare function DialogContent({ className, children, closeLabel, closeOnOverlayClick, showCloseButton, motion, overlayClassName, onPointerDown, size, style, ref, ...props }: DialogContentProps): import("react/jsx-runtime").JSX.Element;
declare function DialogHeader({ className, ...props }: React$2.ComponentProps<'div'>): import("react/jsx-runtime").JSX.Element;
declare function DialogFooter({ className, ...props }: React$2.ComponentProps<'div'>): import("react/jsx-runtime").JSX.Element;
declare function DialogTitle({ className, ...props }: React$2.ComponentProps<typeof DialogPrimitive.Title>): import("react/jsx-runtime").JSX.Element;
declare function DialogDescription({ className, ...props }: React$2.ComponentProps<typeof DialogPrimitive.Description>): import("react/jsx-runtime").JSX.Element;
//#endregion
//#region src/components/primitives/command.d.ts
declare function Command$1({ className, ...props }: React$2.ComponentProps<typeof Command>): import("react/jsx-runtime").JSX.Element;
declare function CommandDialog({ title, description, children, className, showCloseButton, ...props }: React$2.ComponentProps<typeof Dialog> & {
  title?: string;
  description?: string;
  className?: string;
  showCloseButton?: boolean;
}): import("react/jsx-runtime").JSX.Element;
declare function CommandInput({ className, ...props }: React$2.ComponentProps<typeof Command.Input>): import("react/jsx-runtime").JSX.Element;
declare function CommandList({ className, ...props }: React$2.ComponentProps<typeof Command.List>): import("react/jsx-runtime").JSX.Element;
declare function CommandEmpty({ ...props }: React$2.ComponentProps<typeof Command.Empty>): import("react/jsx-runtime").JSX.Element;
declare function CommandGroup({ className, ...props }: React$2.ComponentProps<typeof Command.Group>): import("react/jsx-runtime").JSX.Element;
declare function CommandSeparator({ className, ...props }: React$2.ComponentProps<typeof Command.Separator>): import("react/jsx-runtime").JSX.Element;
declare function CommandItem({ className, ...props }: React$2.ComponentProps<typeof Command.Item>): import("react/jsx-runtime").JSX.Element;
declare function CommandShortcut({ className, ...props }: React$2.ComponentProps<'span'>): import("react/jsx-runtime").JSX.Element;
//#endregion
//#region src/components/primitives/context-menu.d.ts
declare const menuItemVariants: (props?: ({
  variant?: "default" | "destructive" | null | undefined;
  inset?: boolean | null | undefined;
} & import("class-variance-authority/types").ClassProp) | undefined) => string;
declare function ContextMenu({ onOpenChange, ...props }: React$2.ComponentProps<typeof ContextMenuPrimitive.Root>): import("react/jsx-runtime").JSX.Element;
declare function ContextMenuTrigger({ onContextMenu, disabled, ...props }: React$2.ComponentProps<typeof ContextMenuPrimitive.Trigger>): import("react/jsx-runtime").JSX.Element;
declare function ContextMenuGroup({ ...props }: React$2.ComponentProps<typeof ContextMenuPrimitive.Group>): import("react/jsx-runtime").JSX.Element;
declare function ContextMenuPortal({ container, ...props }: React$2.ComponentProps<typeof ContextMenuPrimitive.Portal>): import("react/jsx-runtime").JSX.Element;
declare function ContextMenuSub({ ...props }: React$2.ComponentProps<typeof ContextMenuPrimitive.Sub>): import("react/jsx-runtime").JSX.Element;
declare function ContextMenuRadioGroup({ ...props }: React$2.ComponentProps<typeof ContextMenuPrimitive.RadioGroup>): import("react/jsx-runtime").JSX.Element;
declare function ContextMenuSubTrigger({ className, inset, children, ...props }: React$2.ComponentProps<typeof ContextMenuPrimitive.SubTrigger> & Pick<VariantProps<typeof menuItemVariants>, 'inset'>): import("react/jsx-runtime").JSX.Element;
declare function ContextMenuSubContent({ className, onPointerUpCapture, ...props }: React$2.ComponentProps<typeof ContextMenuPrimitive.SubContent>): import("react/jsx-runtime").JSX.Element;
type ContextMenuContentProps = React$2.ComponentProps<typeof ContextMenuPrimitive.Content> & {
  portalContainer?: React$2.ComponentProps<typeof ContextMenuPrimitive.Portal>['container'];
};
declare function ContextMenuContent({ className, onPointerUpCapture, portalContainer, ...props }: ContextMenuContentProps): import("react/jsx-runtime").JSX.Element;
declare function ContextMenuItem({ className, inset, variant, ...props }: React$2.ComponentProps<typeof ContextMenuPrimitive.Item> & VariantProps<typeof menuItemVariants>): import("react/jsx-runtime").JSX.Element;
declare function ContextMenuCheckboxItem({ className, children, checked, ...props }: React$2.ComponentProps<typeof ContextMenuPrimitive.CheckboxItem>): import("react/jsx-runtime").JSX.Element;
declare function ContextMenuRadioItem({ className, children, ...props }: React$2.ComponentProps<typeof ContextMenuPrimitive.RadioItem>): import("react/jsx-runtime").JSX.Element;
declare function ContextMenuLabel({ className, inset, ...props }: React$2.ComponentProps<typeof ContextMenuPrimitive.Label> & {
  inset?: boolean;
}): import("react/jsx-runtime").JSX.Element;
declare function ContextMenuSeparator({ className, ...props }: React$2.ComponentProps<typeof ContextMenuPrimitive.Separator>): import("react/jsx-runtime").JSX.Element;
declare function ContextMenuShortcut({ className, ...props }: React$2.ComponentProps<'span'>): import("react/jsx-runtime").JSX.Element;
type ContextMenuItemContentBase = {
  icon?: React$2.ReactNode;
  children: React$2.ReactNode;
  badge?: React$2.ReactNode;
  className?: string;
};
type ContextMenuItemContentLeaf = ContextMenuItemContentBase & {
  shortcut?: string;
  hasSubmenu?: never;
};
type ContextMenuItemContentSubmenu = ContextMenuItemContentBase & {
  hasSubmenu: true;
  shortcut?: never;
};
type ContextMenuItemContentProps = ContextMenuItemContentLeaf | ContextMenuItemContentSubmenu;
/**
 * Convenience component for consistent menu-item content layout: icon + label
 * plus an optional trailing badge and either a keyboard shortcut OR a submenu
 * chevron (the two are mutually exclusive — see the discriminated union above).
 */
declare function ContextMenuItemContent(props: ContextMenuItemContentProps): import("react/jsx-runtime").JSX.Element;
//#endregion
//#region src/components/primitives/drawer.d.ts
declare function Drawer$1({ ...props }: React$2.ComponentProps<typeof Drawer.Root>): import("react/jsx-runtime").JSX.Element;
declare function DrawerTrigger({ ...props }: React$2.ComponentProps<typeof Drawer.Trigger>): import("react/jsx-runtime").JSX.Element;
declare function DrawerPortal({ ...props }: React$2.ComponentProps<typeof Drawer.Portal>): import("react/jsx-runtime").JSX.Element;
declare function DrawerClose({ ...props }: React$2.ComponentProps<typeof Drawer.Close>): import("react/jsx-runtime").JSX.Element;
declare function DrawerOverlay({ className, ...props }: React$2.ComponentProps<typeof Drawer.Overlay>): import("react/jsx-runtime").JSX.Element;
declare function DrawerContent({ className, children, ...props }: React$2.ComponentProps<typeof Drawer.Content>): import("react/jsx-runtime").JSX.Element;
declare function DrawerHeader({ className, ...props }: React$2.ComponentProps<'div'>): import("react/jsx-runtime").JSX.Element;
declare function DrawerFooter({ className, ...props }: React$2.ComponentProps<'div'>): import("react/jsx-runtime").JSX.Element;
declare function DrawerTitle({ className, ...props }: React$2.ComponentProps<typeof Drawer.Title>): import("react/jsx-runtime").JSX.Element;
declare function DrawerDescription({ className, ...props }: React$2.ComponentProps<typeof Drawer.Description>): import("react/jsx-runtime").JSX.Element;
//#endregion
//#region src/components/primitives/dropdown-menu.d.ts
declare function DropdownMenu({ ...props }: React$2.ComponentProps<typeof DropdownMenuPrimitive.Root>): import("react/jsx-runtime").JSX.Element;
declare function DropdownMenuPortal({ container, ...props }: React$2.ComponentProps<typeof DropdownMenuPrimitive.Portal>): import("react/jsx-runtime").JSX.Element;
declare function DropdownMenuTrigger({ ...props }: React$2.ComponentProps<typeof DropdownMenuPrimitive.Trigger>): import("react/jsx-runtime").JSX.Element;
type DropdownMenuContentProps = React$2.ComponentProps<typeof DropdownMenuPrimitive.Content> & {
  portalContainer?: React$2.ComponentProps<typeof DropdownMenuPrimitive.Portal>['container'];
};
declare function DropdownMenuContent({ className, sideOffset, portalContainer, ...props }: DropdownMenuContentProps): import("react/jsx-runtime").JSX.Element;
declare function DropdownMenuGroup({ ...props }: React$2.ComponentProps<typeof DropdownMenuPrimitive.Group>): import("react/jsx-runtime").JSX.Element;
declare function DropdownMenuItem({ className, inset, variant, ...props }: React$2.ComponentProps<typeof DropdownMenuPrimitive.Item> & {
  inset?: boolean;
  variant?: 'default' | 'destructive';
}): import("react/jsx-runtime").JSX.Element;
declare function DropdownMenuCheckboxItem({ className, children, checked, ...props }: React$2.ComponentProps<typeof DropdownMenuPrimitive.CheckboxItem>): import("react/jsx-runtime").JSX.Element;
declare function DropdownMenuRadioGroup({ ...props }: React$2.ComponentProps<typeof DropdownMenuPrimitive.RadioGroup>): import("react/jsx-runtime").JSX.Element;
declare function DropdownMenuRadioItem({ className, children, ...props }: React$2.ComponentProps<typeof DropdownMenuPrimitive.RadioItem>): import("react/jsx-runtime").JSX.Element;
declare function DropdownMenuLabel({ className, inset, ...props }: React$2.ComponentProps<typeof DropdownMenuPrimitive.Label> & {
  inset?: boolean;
}): import("react/jsx-runtime").JSX.Element;
declare function DropdownMenuSeparator({ className, ...props }: React$2.ComponentProps<typeof DropdownMenuPrimitive.Separator>): import("react/jsx-runtime").JSX.Element;
declare function DropdownMenuShortcut({ className, ...props }: React$2.ComponentProps<'span'>): import("react/jsx-runtime").JSX.Element;
declare function DropdownMenuSub({ ...props }: React$2.ComponentProps<typeof DropdownMenuPrimitive.Sub>): import("react/jsx-runtime").JSX.Element;
declare function DropdownMenuSubTrigger({ className, inset, children, ...props }: React$2.ComponentProps<typeof DropdownMenuPrimitive.SubTrigger> & {
  inset?: boolean;
}): import("react/jsx-runtime").JSX.Element;
declare function DropdownMenuSubContent({ className, ...props }: React$2.ComponentProps<typeof DropdownMenuPrimitive.SubContent>): import("react/jsx-runtime").JSX.Element;
//#endregion
//#region src/components/primitives/field.d.ts
declare function FieldSet({ className, ...props }: React$2.ComponentProps<'fieldset'>): import("react/jsx-runtime").JSX.Element;
declare function FieldLegend({ className, variant, ...props }: React$2.ComponentProps<'legend'> & {
  variant?: 'legend' | 'label';
}): import("react/jsx-runtime").JSX.Element;
declare function FieldGroup({ className, ...props }: React$2.ComponentProps<'div'>): import("react/jsx-runtime").JSX.Element;
declare const fieldVariants: (props?: ({
  orientation?: "horizontal" | "vertical" | "responsive" | null | undefined;
} & import("class-variance-authority/types").ClassProp) | undefined) => string;
declare function Field({ className, orientation, ...props }: React$2.ComponentProps<'div'> & VariantProps<typeof fieldVariants>): import("react/jsx-runtime").JSX.Element;
declare function FieldContent({ className, ...props }: React$2.ComponentProps<'div'>): import("react/jsx-runtime").JSX.Element;
declare function FieldLabel({ className, ...props }: React$2.ComponentProps<typeof Label>): import("react/jsx-runtime").JSX.Element;
declare function FieldTitle({ className, ...props }: React$2.ComponentProps<'div'>): import("react/jsx-runtime").JSX.Element;
declare function FieldDescription({ className, ...props }: React$2.ComponentProps<'p'>): import("react/jsx-runtime").JSX.Element;
declare function FieldSeparator({ children, className, ...props }: React$2.ComponentProps<'div'> & {
  children?: React$2.ReactNode;
}): import("react/jsx-runtime").JSX.Element;
declare function FieldError({ className, children, errors, ...props }: React$2.ComponentProps<'div'> & {
  errors?: Array<{
    message?: string;
  } | undefined>;
}): import("react/jsx-runtime").JSX.Element | null;
//#endregion
//#region src/components/primitives/hover-card.d.ts
declare function HoverCard({ ...props }: React$2.ComponentProps<typeof HoverCardPrimitive.Root>): import("react/jsx-runtime").JSX.Element;
declare function HoverCardTrigger({ ...props }: React$2.ComponentProps<typeof HoverCardPrimitive.Trigger>): import("react/jsx-runtime").JSX.Element;
declare function HoverCardContent({ className, align, sideOffset, portalContainer, ...props }: React$2.ComponentProps<typeof HoverCardPrimitive.Content> & {
  portalContainer?: React$2.ComponentProps<typeof HoverCardPrimitive.Portal>['container'];
}): import("react/jsx-runtime").JSX.Element;
//#endregion
//#region src/components/primitives/item.d.ts
declare function ItemGroup({ className, ...props }: React$2.ComponentProps<'div'>): import("react/jsx-runtime").JSX.Element;
declare function ItemSeparator({ className, ...props }: React$2.ComponentProps<typeof Separator>): import("react/jsx-runtime").JSX.Element;
declare const itemVariants: (props?: ({
  variant?: "default" | "outline" | "muted" | null | undefined;
  size?: "sm" | "default" | null | undefined;
} & import("class-variance-authority/types").ClassProp) | undefined) => string;
declare function Item({ className, variant, size, asChild, ...props }: React$2.ComponentProps<'div'> & VariantProps<typeof itemVariants> & {
  asChild?: boolean;
}): import("react/jsx-runtime").JSX.Element;
declare const itemMediaVariants: (props?: ({
  variant?: "image" | "icon" | "default" | null | undefined;
} & import("class-variance-authority/types").ClassProp) | undefined) => string;
declare function ItemMedia({ className, variant, ...props }: React$2.ComponentProps<'div'> & VariantProps<typeof itemMediaVariants>): import("react/jsx-runtime").JSX.Element;
declare function ItemContent({ className, ...props }: React$2.ComponentProps<'div'>): import("react/jsx-runtime").JSX.Element;
declare function ItemTitle({ className, ...props }: React$2.ComponentProps<'div'>): import("react/jsx-runtime").JSX.Element;
declare function ItemDescription({ className, ...props }: React$2.ComponentProps<'p'>): import("react/jsx-runtime").JSX.Element;
declare function ItemActions({ className, ...props }: React$2.ComponentProps<'div'>): import("react/jsx-runtime").JSX.Element;
declare function ItemHeader({ className, ...props }: React$2.ComponentProps<'div'>): import("react/jsx-runtime").JSX.Element;
declare function ItemFooter({ className, ...props }: React$2.ComponentProps<'div'>): import("react/jsx-runtime").JSX.Element;
//#endregion
//#region src/components/primitives/kbd.d.ts
declare function Kbd({ className, ...props }: React.ComponentProps<'kbd'>): import("react/jsx-runtime").JSX.Element;
declare function KbdGroup({ className, ...props }: React.ComponentProps<'div'>): import("react/jsx-runtime").JSX.Element;
//#endregion
//#region src/components/primitives/pagination.d.ts
declare function Pagination({ className, ...props }: React$2.ComponentProps<'nav'>): import("react/jsx-runtime").JSX.Element;
declare function PaginationContent({ className, ...props }: React$2.ComponentProps<'ul'>): import("react/jsx-runtime").JSX.Element;
declare function PaginationItem({ ...props }: React$2.ComponentProps<'li'>): import("react/jsx-runtime").JSX.Element;
type PaginationLinkProps = {
  isActive?: boolean;
} & Pick<React$2.ComponentProps<typeof Button>, 'size'> & React$2.ComponentProps<'a'>;
declare function PaginationLink({ className, isActive, size, ...props }: PaginationLinkProps): import("react/jsx-runtime").JSX.Element;
declare function PaginationPrevious({ className, children, ...props }: React$2.ComponentProps<typeof PaginationLink>): import("react/jsx-runtime").JSX.Element;
declare function PaginationNext({ className, children, ...props }: React$2.ComponentProps<typeof PaginationLink>): import("react/jsx-runtime").JSX.Element;
declare function PaginationEllipsis({ className, ...props }: React$2.ComponentProps<'span'>): import("react/jsx-runtime").JSX.Element;
//#endregion
//#region src/components/primitives/radio-group.d.ts
declare const radioGroupItemVariants: (props?: ({
  size?: "md" | "lg" | "sm" | null | undefined;
} & import("class-variance-authority/types").ClassProp) | undefined) => string;
declare function RadioGroup({ className, ...props }: React$2.ComponentProps<typeof RadioGroupPrimitive.Root>): import("react/jsx-runtime").JSX.Element;
declare function RadioGroupItem({ className, size, ...props }: React$2.ComponentProps<typeof RadioGroupPrimitive.Item> & VariantProps<typeof radioGroupItemVariants>): import("react/jsx-runtime").JSX.Element;
//#endregion
//#region src/components/primitives/resizable.d.ts
type PrimitiveGroupProps = React$2.ComponentProps<typeof ResizablePrimitive.Group>;
type PrimitivePanelProps = React$2.ComponentProps<typeof ResizablePrimitive.Panel>;
type PrimitiveSeparatorProps = React$2.ComponentProps<typeof ResizablePrimitive.Separator>;
type ResizablePanelGroupProps = Partial<Pick<PrimitiveGroupProps, 'children' | 'className' | 'defaultLayout' | 'disabled' | 'id' | 'onLayoutChange' | 'onLayoutChanged' | 'style'>> & {
  direction?: PrimitiveGroupProps['orientation'];
  onLayout?: PrimitiveGroupProps['onLayoutChanged'];
};
type ResizablePanelProps = Partial<Pick<PrimitivePanelProps, 'children' | 'className' | 'collapsedSize' | 'collapsible' | 'defaultSize' | 'disabled' | 'groupResizeBehavior' | 'id' | 'maxSize' | 'minSize' | 'onResize' | 'panelRef' | 'style'>>;
type ResizableHandleProps = Partial<Pick<PrimitiveSeparatorProps, 'aria-label' | 'children' | 'className' | 'disabled' | 'id' | 'style'>> & {
  withHandle?: boolean;
};
declare function ResizablePanelGroup({ className, direction, onLayout, onLayoutChanged, ...props }: ResizablePanelGroupProps): import("react/jsx-runtime").JSX.Element;
declare function ResizablePanel(props: ResizablePanelProps): import("react/jsx-runtime").JSX.Element;
declare function ResizableHandle({ children, className, withHandle, ...props }: ResizableHandleProps): import("react/jsx-runtime").JSX.Element;
type ResizablePanelHandle = ResizablePrimitive.PanelImperativeHandle;
//#endregion
//#region src/components/primitives/scroll-area.d.ts
type ScrollAreaProps = ComponentProps<typeof ScrollAreaPrimitive.Root> & {
  orientation?: 'vertical' | 'horizontal' | 'both';
  viewportProps?: ComponentProps<'div'> & {
    [key: `data-${string}`]: string | number | boolean | undefined;
  };
  contentProps?: ComponentProps<'div'>;
};
declare function ScrollArea({ className, children, hidden, type, scrollHideDelay, orientation, viewportProps, contentProps, ...props }: ScrollAreaProps): import("react/jsx-runtime").JSX.Element;
//#endregion
//#region src/components/primitives/segmented-control.d.ts
interface SegmentedControlOption<TValue extends string = string> {
  value: TValue;
  label: React$2.ReactNode;
  disabled?: boolean;
}
interface SegmentedControlProps<TValue extends string = string> extends Omit<React$2.ComponentPropsWithoutRef<'div'>, 'defaultValue' | 'onChange'> {
  options: readonly SegmentedControlOption<TValue>[];
  value?: TValue;
  defaultValue?: TValue;
  onValueChange?: (value: TValue) => void;
  disabled?: boolean;
  size?: 'sm' | 'default';
}
declare function SegmentedControl<TValue extends string = string>({ options, value, defaultValue, onValueChange, disabled, size, className, ...props }: SegmentedControlProps<TValue>): import("react/jsx-runtime").JSX.Element;
//#endregion
//#region src/components/primitives/select.d.ts
declare const selectTriggerVariants: (props?: ({
  state?: "disabled" | "default" | "error" | null | undefined;
  size?: "sm" | "default" | null | undefined;
} & import("class-variance-authority/types").ClassProp) | undefined) => string;
declare function Select({ defaultOpen, onOpenChange, open: openProp, ...props }: React$2.ComponentProps<typeof SelectPrimitive.Root>): import("react/jsx-runtime").JSX.Element;
declare function SelectGroup({ ...props }: React$2.ComponentProps<typeof SelectPrimitive.Group>): import("react/jsx-runtime").JSX.Element;
declare function SelectValue({ ...props }: React$2.ComponentProps<typeof SelectPrimitive.Value>): import("react/jsx-runtime").JSX.Element;
declare function SelectTrigger({ className, size, children, ref, ...props }: React$2.ComponentProps<typeof SelectPrimitive.Trigger> & Omit<VariantProps<typeof selectTriggerVariants>, 'state'> & {
  size?: 'sm' | 'default';
}): import("react/jsx-runtime").JSX.Element;
declare function SelectContent({ className, children, position, align, portalContainer, ref, ...props }: React$2.ComponentProps<typeof SelectPrimitive.Content> & {
  portalContainer?: React$2.ComponentProps<typeof SelectPrimitive.Portal>['container'];
}): import("react/jsx-runtime").JSX.Element;
declare function SelectLabel({ className, ...props }: React$2.ComponentProps<typeof SelectPrimitive.Label>): import("react/jsx-runtime").JSX.Element;
declare function SelectItem({ className, children, ...props }: React$2.ComponentProps<typeof SelectPrimitive.Item>): import("react/jsx-runtime").JSX.Element;
declare function SelectSeparator({ className, ...props }: React$2.ComponentProps<typeof SelectPrimitive.Separator>): import("react/jsx-runtime").JSX.Element;
declare function SelectScrollUpButton({ className, ...props }: React$2.ComponentProps<typeof SelectPrimitive.ScrollUpButton>): import("react/jsx-runtime").JSX.Element;
declare function SelectScrollDownButton({ className, ...props }: React$2.ComponentProps<typeof SelectPrimitive.ScrollDownButton>): import("react/jsx-runtime").JSX.Element;
//#endregion
//#region src/components/primitives/shadcn-io/dropzone/index.d.ts
type DropzoneProps = Omit<DropzoneOptions, 'onDrop'> & {
  src?: File[];
  className?: string;
  'aria-label'?: string;
  'data-ui'?: string;
  onClick?: MouseEventHandler<HTMLButtonElement>;
  onDrop?: (acceptedFiles: File[], fileRejections: FileRejection[], event: DropEvent) => void;
  children?: ReactNode;
};
declare const Dropzone: ({ accept, maxFiles, maxSize, minSize, onDrop, onError, disabled, src, className, children, "aria-label": ariaLabel, "data-ui": dataUi, onClick, ...props }: DropzoneProps) => import("react/jsx-runtime").JSX.Element;
type DropzoneContentProps = {
  children?: ReactNode;
  className?: string;
};
declare const DropzoneContent: ({ children, className }: DropzoneContentProps) => string | number | bigint | true | import("react/jsx-runtime").JSX.Element | Iterable<ReactNode> | Promise<string | number | bigint | boolean | import("react").ReactPortal | import("react").ReactElement<unknown, string | import("react").JSXElementConstructor<any>> | Iterable<ReactNode> | null | undefined> | null;
type DropzoneEmptyStateProps = {
  children?: ReactNode;
  className?: string;
};
declare const DropzoneEmptyState: ({ children, className }: DropzoneEmptyStateProps) => string | number | bigint | true | import("react/jsx-runtime").JSX.Element | Iterable<ReactNode> | Promise<string | number | bigint | boolean | import("react").ReactPortal | import("react").ReactElement<unknown, string | import("react").JSXElementConstructor<any>> | Iterable<ReactNode> | null | undefined> | null;
//#endregion
//#region src/components/primitives/skeleton.d.ts
declare function Skeleton({ className, ...props }: React.ComponentProps<'div'>): import("react/jsx-runtime").JSX.Element;
//#endregion
//#region src/components/primitives/slider.d.ts
type SliderMark = {
  value: number;
  label: React$2.ReactNode;
};
declare const sliderTrackVariants: (props?: ({
  size?: "md" | "lg" | "sm" | null | undefined;
} & import("class-variance-authority/types").ClassProp) | undefined) => string;
declare function Slider({ className, defaultValue, value, min, max, size, marks, orientation, showValueLabel, formatValueLabel, getThumbAriaLabel, getThumbAriaValueText, onValueChange, ...props }: React$2.ComponentProps<typeof SliderPrimitive.Root> & VariantProps<typeof sliderTrackVariants> & {
  marks?: SliderMark[];
  showValueLabel?: boolean;
  formatValueLabel?: (value: number) => React$2.ReactNode;
  getThumbAriaLabel?: (index: number) => string;
  getThumbAriaValueText?: (value: number, index: number) => string;
}): import("react/jsx-runtime").JSX.Element;
//#endregion
//#region src/components/primitives/table.d.ts
declare function Table({ className, ...props }: React$2.ComponentProps<'table'>): import("react/jsx-runtime").JSX.Element;
declare function TableHeader({ className, ...props }: React$2.ComponentProps<'thead'>): import("react/jsx-runtime").JSX.Element;
declare function TableBody({ className, ...props }: React$2.ComponentProps<'tbody'>): import("react/jsx-runtime").JSX.Element;
declare function TableFooter({ className, ...props }: React$2.ComponentProps<'tfoot'>): import("react/jsx-runtime").JSX.Element;
declare function TableRow({ className, ...props }: React$2.ComponentProps<'tr'>): import("react/jsx-runtime").JSX.Element;
declare function TableHead({ className, ...props }: React$2.ComponentProps<'th'>): import("react/jsx-runtime").JSX.Element;
declare function TableCell({ className, ...props }: React$2.ComponentProps<'td'>): import("react/jsx-runtime").JSX.Element;
declare function TableCaption({ className, ...props }: React$2.ComponentProps<'caption'>): import("react/jsx-runtime").JSX.Element;
//#endregion
//#region src/components/primitives/tabs.d.ts
declare function Tabs({ className, variant, orientation, ...props }: React$2.ComponentProps<typeof TabsPrimitive.Root> & {
  variant?: 'default' | 'line' | 'underline' | 'workflow';
}): import("react/jsx-runtime").JSX.Element;
declare function TabsList({ className, ...props }: React$2.ComponentProps<typeof TabsPrimitive.List>): import("react/jsx-runtime").JSX.Element;
declare function TabsTrigger({ className, ...props }: React$2.ComponentProps<typeof TabsPrimitive.Trigger>): import("react/jsx-runtime").JSX.Element;
declare function TabsContent({ className, ...props }: React$2.ComponentProps<typeof TabsPrimitive.Content>): import("react/jsx-runtime").JSX.Element;
//#endregion
//#region src/components/primitives/toast.d.ts
type ToastType = 'error' | 'success' | 'warning' | 'info' | 'loading';
interface ToastAction {
  label: React$1.ReactNode;
  onClick: () => void | Promise<void>;
}
interface ToastConfig {
  action?: ToastAction;
  /** Lower-emphasis control rendered before `action`, for a secondary way out (e.g. a link to where the item went). */
  secondaryAction?: ToastAction;
  title?: React$1.ReactNode;
  description?: React$1.ReactNode;
  details?: string;
  icon?: React$1.ReactNode;
  key?: string | number;
  timeout?: number;
  onClick?: React$1.MouseEventHandler<HTMLDivElement>;
  onClose?: () => void;
  className?: string;
  style?: React$1.CSSProperties;
}
interface LoadingToastConfig<T = unknown> extends ToastConfig {
  onError?: (error: unknown) => void;
  promise?: Promise<T>;
}
interface ToastRecord extends ToastConfig {
  key: string;
  type: ToastType;
}
interface ToastLabels {
  close: string;
  details?: string;
  error: React$1.ReactNode;
  errorDescription: React$1.ReactNode;
  loading: React$1.ReactNode;
  success: React$1.ReactNode;
}
/**
 * Labels may be a plain partial object or a getter. A getter is resolved at the
 * moment a toast fires / a viewport renders, so callers that read i18n through a
 * getter always see the current language instead of a value snapshotted at
 * module load (the old English-defaults bug).
 */
type ToastLabelsInput = Partial<ToastLabels> | (() => Partial<ToastLabels>);
type ToastUtilities = ReturnType<typeof getToastUtilities>;
type ToastStore = ReturnType<typeof createToastStore>;
declare const createToastStore: () => {
  closeAll: () => void;
  getLoadingToken: (key: string) => symbol | undefined;
  getSnapshot: () => ToastRecord[];
  remove: (key: string) => void;
  setPaused: (value: boolean) => void;
  setLoadingToken: (key: string, token: symbol) => Map<string, symbol>;
  subscribe: (listener: () => void) => () => void;
  unsetLoadingToken: (key: string) => boolean;
  upsert: (toast: ToastRecord) => void;
};
declare const error$1: (arg: ToastConfig | string) => string;
declare const success: (arg: ToastConfig | string) => string;
declare const warning: (arg: ToastConfig | string) => string;
declare const info: (arg: ToastConfig | string) => string;
declare const loading$1: <T>(args: LoadingToastConfig<T>) => string;
declare const closeToast: (key: string) => void;
declare const closeAll: () => void;
declare const getToastQueue: () => {
  toasts: ToastRecord[];
};
declare const getToastUtilities: (labels?: ToastLabelsInput) => {
  readonly closeAll: () => void;
  readonly closeToast: (key: string) => void;
  readonly error: (arg: ToastConfig | string) => string;
  readonly getToastQueue: () => {
    toasts: ToastRecord[];
  };
  readonly info: (arg: ToastConfig | string) => string;
  readonly loading: <T>(args: LoadingToastConfig<T>) => string;
  readonly success: (arg: ToastConfig | string) => string;
  readonly warning: (arg: ToastConfig | string) => string;
};
declare const useToasts: (labels?: ToastLabelsInput) => {
  readonly closeAll: () => void;
  readonly closeToast: (key: string) => void;
  readonly error: (arg: ToastConfig | string) => string;
  readonly getToastQueue: () => {
    toasts: ToastRecord[];
  };
  readonly info: (arg: ToastConfig | string) => string;
  readonly loading: <T>(args: LoadingToastConfig<T>) => string;
  readonly success: (arg: ToastConfig | string) => string;
  readonly warning: (arg: ToastConfig | string) => string;
};
/**
 * Convenience combo of i18n labels + a viewport, all bound to the single module
 * `defaultToastStore`. It deliberately does NOT fork its own store: the module
 * toast functions (`error`/`success`/… and `window.toast`) also write to
 * `defaultToastStore`, so a per-provider fork would leave the command entry and
 * the rendered viewport on different stores (the quickAssistant black-hole bug
 * class). Every ToastViewport in every window reads the same store.
 */
declare const ToastProvider: ({ children, labels }: {
  children: React$1.ReactNode;
  labels?: ToastLabelsInput;
}) => import("react/jsx-runtime").JSX.Element;
declare const ToastViewport: ({ labels, store }: {
  labels?: ToastLabelsInput;
  store?: ToastStore;
}) => import("react/jsx-runtime").JSX.Element | null;
//#endregion
//#region src/components/primitives/tree-select.d.ts
declare const treeSelectTriggerVariants: (props?: ({
  state?: "disabled" | "default" | "error" | null | undefined;
  size?: "lg" | "sm" | "default" | null | undefined;
} & import("class-variance-authority/types").ClassProp) | undefined) => string;
interface TreeSelectOption {
  value: string;
  title?: React$2.ReactNode;
  label?: React$2.ReactNode;
  children?: TreeSelectOption[];
  disabled?: boolean;
  selectable?: boolean;
  icon?: React$2.ReactNode;
  isLeaf?: boolean;
  key?: React$2.Key;
  searchText?: string;
}
interface TreeSelectRenderState {
  depth: number;
  expanded: boolean;
  hasChildren: boolean;
  selected: boolean;
}
interface TreeSelectProps extends Omit<VariantProps<typeof treeSelectTriggerVariants>, 'state'> {
  treeData: TreeSelectOption[];
  value?: string;
  defaultValue?: string;
  onChange?: (value: string, option: TreeSelectOption) => void;
  renderOption?: (option: TreeSelectOption, state: TreeSelectRenderState) => React$2.ReactNode;
  renderValue?: (option: TreeSelectOption) => React$2.ReactNode;
  searchable?: boolean;
  searchPlaceholder?: string;
  emptyText?: string;
  filterOption?: (option: TreeSelectOption, search: string) => boolean;
  /** Initial-only default expansion. Use expandedValues for controlled runtime updates. */
  defaultExpandAll?: boolean;
  defaultExpandedValues?: string[];
  expandedValues?: string[];
  onExpandedValuesChange?: (values: string[]) => void;
  expandLabel?: string;
  collapseLabel?: string;
  placeholder?: string;
  disabled?: boolean;
  error?: boolean;
  className?: string;
  popoverClassName?: string;
  triggerStyle?: React$2.CSSProperties;
  width?: string | number;
  maxHeight?: number;
  name?: string;
}
declare function TreeSelect({ treeData, value: controlledValue, defaultValue, onChange, renderOption, renderValue, searchable, searchPlaceholder, emptyText, filterOption, defaultExpandAll, defaultExpandedValues, expandedValues: controlledExpandedValues, onExpandedValuesChange, expandLabel, collapseLabel, placeholder, disabled, error, className, popoverClassName, triggerStyle, width, maxHeight, size, name }: TreeSelectProps): import("react/jsx-runtime").JSX.Element;
//#endregion
export { SelectScrollDownButton as $, PageSidePanelSectionProps as $a, rehypeHeadingIds as $i, DialogPortal as $n, usePortalContainer as $o, SortableDragHandleProps as $r, DropdownMenuGroup as $t, Table as A, SearchInput as Aa, ImagePreviewLabels as Ai, ContextMenuRadioItem as An, Calendar as Ao, AccordionTrigger as Ar, ItemDescription as At, Skeleton as B, InputNumber as Ba, StreamingMarkdown as Bi, CommandGroup as Bn, Tooltip$1 as Bo, TreeDragHandleProps as Br, Field as Bt, success as C, getCmThemeNames as Ca, ImagePreviewDialogProps as Ci, ContextMenuContent as Cn, EmptyStateProps as Co, badgeVariants as Cr, PaginationNext as Ct, TabsContent as D, CodeMirrorTheme as Da, ImagePreviewAction as Di, ContextMenuLabel as Dn, DateTimePicker as Do, Accordion as Dr, Item as Dt, Tabs as E, CodeEditorProps as Ea, DEFAULT_IMAGE_PREVIEW_LABELS as Ei, ContextMenuItemContent as En, DateTimeGranularity as Eo, alertVariants as Er, KbdGroup as Et, TableHead as F, InputGroupInput as Fa, SVG_ELEMENTS as Fi, ContextMenuSubTrigger as Fn, DataTableProps as Fo, flattenTree as Fr, ItemSeparator as Ft, DropzoneEmptyStateProps as G, Input$1 as Ga, withFullMarkdown as Gi, CommandShortcut as Gn, TooltipSurface as Go, CompositeInputProps as Gr, FieldLabel as Gt, DropzoneContent as H, Button as Ha, defaultMarkdownPlugins as Hi, CommandItem as Hn, TooltipProps as Ho, TreeNodeAdapter as Hr, FieldDescription as Ht, TableHeader as I, InputGroupInputNumber as Ia, SVG_ELEMENT_REGEX as Ii, ContextMenuTrigger as In, DataTableSelection as Io, DragPosition as Ir, ItemTitle as It, Select as J, PageSidePanelItem as Ja, rehypeScalableSvg as Ji, DialogContent as Jn, Switch as Jo, ReorderableList as Jr, FieldSet as Jt, DropzoneProps as K, InputProps as Ka, withMermaid as Ki, Dialog as Kn, TooltipTrigger as Ko, SelectGroup$1 as Kr, FieldLegend as Kt, TableRow as L, InputGroupText as La, createMarkdownSanitizeSchema as Li, Command$1 as Ln, ConfirmDialog as Lo, FlatTreeItem as Lr, HoverCard as Lt, TableCaption as M, InputGroup as Ma, DISALLOWED_ELEMENTS as Mi, ContextMenuShortcut as Mn, ColumnDef as Mo, useSelectionState as Mr, ItemGroup as Mt, TableCell as N, InputGroupAddon as Na, MarkdownSanitizeSchema as Ni, ContextMenuSub as Nn, DataTable as No, useExpandedState as Nr, ItemHeader as Nt, TabsList as O, SelectDropdown as Oa, ImagePreviewActionContext as Oi, ContextMenuPortal as On, DateTimePickerLabels as Oo, AccordionContent as Or, ItemActions as Ot, TableFooter as P, InputGroupButton as Pa, SVG_ATTRIBUTES as Pi, ContextMenuSubContent as Pn, DataTableColumnMeta as Po, TreeView as Pr, ItemMedia as Pt, SelectLabel as Q, PageSidePanelSection as Qa, extractTextFromNode as Qi, DialogOverlay as Qn, PortalContainerProvider as Qo, SortableAccessibility as Qr, DropdownMenuContent as Qt, Slider as R, InputGroupTextarea as Ra, MarkdownSource as Ri, CommandDialog as Rn, ConfirmDialogProps as Ro, RenderRowArgs as Rr, HoverCardContent as Rt, loading$1 as S, getCmThemeByName as Sa, ImagePreviewDialog as Si, ContextMenuCheckboxItem as Sn, EmptyStatePreset as So, Badge as Sr, PaginationLink as St, warning as T, CodeEditorHandles as Ta, ImagePreviewContextMenuProps as Ti, ContextMenuItem as Tn, Ellipsis as To, AlertProps as Tr, Kbd as Tt, DropzoneContentProps as U, ButtonVariant as Ua, withMath as Ui, CommandList as Un, TooltipProvider as Uo, TreeViewProps as Ur, FieldError as Ut, Dropzone as V, InputNumberProps as Va, StreamingMarkdownProps as Vi, CommandInput as Vn, TooltipContent as Vo, TreeListSlotArgs as Vr, FieldContent as Vt, DropzoneEmptyState as W, buttonVariants as Wa, withChatPlugins as Wi, CommandSeparator as Wn, TooltipRoot as Wo, CompositeInput as Wr, FieldGroup as Wt, SelectGroup as X, PageSidePanelPlacement as Xa, rehypePrefixSvgReferences as Xi, DialogFooter as Xn, DialogPortalContainerProvider as Xo, BlurCancelPointerSensor as Xr, DropdownMenu as Xt, SelectContent as Y, PageSidePanelItemProps as Ya, rehypePreserveAnchorTargets as Yi, DialogDescription as Yn, Spinner as Yo, ReorderableListProps as Yr, FieldTitle as Yt, SelectItem as Z, PageSidePanelProps as Za, createSlugger as Zi, DialogHeader as Zn, PortalContainer as Zo, Sortable as Zr, DropdownMenuCheckboxItem as Zt, closeToast as _, FormMessage as _a, ImagePreviewTransformOptions as _i, DrawerOverlay as _n, PopoverAnchor as _o, BreadcrumbItem as _r, AvatarGroupCount as _s, radioGroupItemVariants as _t, LoadingToastConfig as a, useMarkdownBlockContext as aa, MenuItem as ai, DropdownMenuSeparator as an, RowFlex as ao, ComboboxSearchPlacement as ar, DividerWithText as as, SegmentedControlOption as at, getToastUtilities as b, RequiredMark as ba, ImagePreviewImage as bi, DrawerTrigger as bn, EmptyState as bo, BreadcrumbPage as br, BarVisualizerProps as bs, PaginationEllipsis as bt, ToastLabels as c, InfoTooltip as ca, MenuListProps as ci, DropdownMenuSubContent as cn, EntityItemBase as co, checkboxVariants as cr, CustomTagProps as cs, ResizableHandle as ct, ToastRecord as d, Form as da, ImagePreviewViewportProps as di, Drawer$1 as dn, EntitySelectorPopoverContentProps as do, ButtonGroupSeparator as dr, CircularProgress as ds, ResizablePanelGroup as dt, createCodeHighlightPlugin as ea, SortableItemId as ei, DropdownMenuItem as en, HorizontalScrollContainer as eo, DialogTitle as er, IndicatorLight as es, SelectScrollUpButton as et, ToastStore as f, FormControl as fa, ImagePreviewTrigger as fi, DrawerClose as fn, EntitySelectorProps as fo, ButtonGroupText as fr, CircularProgressProps as fs, ResizablePanelGroupProps as ft, closeAll as g, FormLabel as ga, ImagePreviewTransformControls as gi, DrawerHeader as gn, Popover as go, BreadcrumbEllipsis as gr, AvatarGroup as gs, RadioGroupItem as gt, ToastViewport as h, FormItem as ha, ImagePreviewToolbarProps as hi, DrawerFooter as hn, EntitySelectorSection as ho, Breadcrumb as hr, AvatarFallback as hs, RadioGroup as ht, TreeSelectRenderState as i, MarkdownBlockContextValue as ia, MenuDividerProps as ii, DropdownMenuRadioItem as in, Flex as io, ComboboxProps as ir, EmojiIcon as is, SegmentedControl as it, TableBody as j, SearchInputProps as ja, ImagePreviewTransform as ji, ContextMenuSeparator as jn, CalendarProps as jo, useTreeDragAndDrop as jr, ItemFooter as jt, TabsTrigger as k, SelectDropdownProps as ka, ImagePreviewItem as ki, ContextMenuRadioGroup as kn, DateTimePickerProps as ko, AccordionItem as kr, ItemContent as kt, ToastLabelsInput as l, HelpTooltip as la, menuItemVariants$1 as li, DropdownMenuSubTrigger as ln, EntitySelectorContextMenuFactory as lo, ButtonGroup as lr, _default$2 as ls, ResizableHandleProps as lt, ToastUtilities as m, FormField as ma, ImagePreviewToolbar as mi, DrawerDescription as mn, EntitySelectorSearch as mo, Separator as mr, AvatarBadge as ms, ResizablePanelProps as mt, TreeSelectOption as n, MarkdownProps as na, PageHeaderProps as ni, DropdownMenuPortal as nn, Center as no, Combobox as nr, ErrorBoundaryCustomized as ns, SelectTrigger as nt, ToastAction as o, _default as oa, MenuItemProps as oi, DropdownMenuShortcut as on, SpaceBetweenRowFlex as oo, Checkbox as or, Divider as os, SegmentedControlProps as ot, ToastType as p, FormDescription as pa, ImagePreviewTriggerProps as pi, DrawerContent as pn, EntitySelectorRowContext as po, buttonGroupVariants as pr, Avatar as ps, ResizablePanelHandle as pt, useDropzone as q, PageSidePanel as qa, rehypeStreamingMath as qi, DialogClose as qn, DescriptionSwitch as qo, SelectItem$1 as qr, FieldSeparator as qt, TreeSelectProps as r, MarkdownBlockContext as ra, MenuDivider as ri, DropdownMenuRadioGroup as rn, ColFlex as ro, ComboboxOption as rr, ErrorBoundaryCustomizedProps as rs, SelectValue as rt, ToastConfig as s, WarnTooltip as sa, MenuList as si, DropdownMenuSub as sn, EntitySelector as so, CheckedState as sr, DividerProps as ss, ScrollArea as st, TreeSelect as t, Markdown as ta, PageHeader as ti, DropdownMenuLabel as tn, Box as to, DialogTrigger as tr, CustomFallbackProps as ts, SelectSeparator as tt, ToastProvider as u, IconTooltipProps as ua, ImagePreviewViewport as ui, DropdownMenuTrigger as un, EntitySelectorMultiSelect as uo, ButtonGroupItem as ur, CopyButton as us, ResizablePanel as ut, error$1 as v, useFormField as va, ImagePreviewTransformUpdate as vi, DrawerPortal as vn, PopoverContent as vo, BreadcrumbLink as vr, AvatarImage as vs, Pagination as vt, useToasts as w, LazyCodeEditor as wa, ImagePreviewContextMenu as wi, ContextMenuGroup as wn, _default$1 as wo, Alert as wr, PaginationPrevious as wt, info as x, getCherryCmTheme as xa, ImagePreviewImageProps as xi, ContextMenu as xn, EmptyStateIllustration as xo, BreadcrumbSeparator as xr, BarVisualizerState as xs, PaginationItem as xt, getToastQueue as y, Label as ya, useImagePreviewTransform as yi, DrawerTitle as yn, PopoverTrigger as yo, BreadcrumbList as yr, BarVisualizer as ys, PaginationContent as yt, SliderMark as z, textarea_d_exports as za, MarkdownStatus as zi, CommandEmpty as zn, NormalTooltip as zo, RenderRowFn as zr, HoverCardTrigger as zt };