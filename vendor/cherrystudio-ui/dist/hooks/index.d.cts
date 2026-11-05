import { Key } from "react";
//#region src/hooks/use-dnd-reorder.d.ts
interface UseDndReorderParams<T> {
  /** 原始的、完整的数据列表 */
  originalList: T[];
  /** 当前在界面上渲染的、可能被过滤的列表 */
  filteredList: T[];
  /** 用于更新原始列表状态的函数 */
  onUpdate: (newList: T[]) => void;
  /** 用于从列表项中获取唯一ID的属性名或函数 */
  itemKey: keyof T | ((item: T) => Key);
}
/**
 * 增强拖拽排序能力，处理"过滤后列表"与"原始列表"的索引映射问题。
 *
 * 底层算法委托给 {@link reorderVisibleSubset}（同一个 UI 包里的纯函数实现），
 * 这里只负责把视图层的 `{ oldIndex, newIndex }` 适配进去 + 通过 `useMemo` /
 * `useCallback` 给视图侧的 `itemKey(index)` 提供稳定引用。两份算法实现的
 * 历史复刻在 PR #14631 review #4287764522 (S9) 被指出，由此合并。
 *
 * @template T 列表项的类型
 * @param params - { originalList, filteredList, onUpdate, itemKey }
 * @returns 返回可以直接传递给 Sortable 的 onSortEnd 回调
 */
declare function useDndReorder<T>({ originalList, filteredList, onUpdate, itemKey }: UseDndReorderParams<T>): {
  onSortEnd: ({ oldIndex, newIndex }: {
    oldIndex: number;
    newIndex: number;
  }) => void;
  itemKey: (index: number) => Key;
};
//#endregion
//#region src/hooks/use-dnd-state.d.ts
interface DndState {
  /** 是否有元素正在拖拽 */
  isDragging: boolean;
  /** 当前拖拽元素的ID */
  draggedId: string | number | null;
  /** 当前悬停位置的ID */
  overId: string | number | null;
  /** 是否正在悬停在某个可放置区域 */
  isOver: boolean;
}
/**
 * 提供 dnd-kit 的全局拖拽状态管理
 *
 * @returns 当前拖拽状态信息
 */
declare function useDndState(): DndState;
//#endregion
export { useDndReorder, useDndState };