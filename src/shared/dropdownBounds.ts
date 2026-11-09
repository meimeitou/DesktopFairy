/**
 * 下拉面板（absolute 定位）会被最近的 overflow 祖先（弹窗体、滚动容器）裁剪，
 * z-index 无法解决。打开时用触发器与该祖先的边界计算上下可用空间，
 * 让调用方据此压缩面板高度 / 选择展开方向。
 */
export function measureDropdownSpace(triggerEl: HTMLElement): {
  spaceAbove: number;
  spaceBelow: number;
} {
  let topEdge = 0;
  let bottomEdge = window.innerHeight;
  for (
    let el: HTMLElement | null = triggerEl.parentElement;
    el && typeof el.getBoundingClientRect === "function";
    el = el.parentElement
  ) {
    const style =
      typeof getComputedStyle === "function"
        ? getComputedStyle(el)
        : ({ overflowY: "" } as CSSStyleDeclaration);
    const { overflowY } = style;
    if (
      overflowY === "auto" ||
      overflowY === "scroll" ||
      overflowY === "hidden"
    ) {
      const rect = el.getBoundingClientRect();
      topEdge = rect.top;
      bottomEdge = rect.bottom;
      break;
    }
  }
  const rect = triggerEl.getBoundingClientRect();
  const gap = 8; // 面板与触发器的间距 + 余量
  return {
    spaceAbove: rect.top - topEdge - gap,
    spaceBelow: bottomEdge - rect.bottom - gap,
  };
}
