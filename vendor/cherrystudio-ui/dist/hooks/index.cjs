Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
const require_reorder_visible_subset = require("../reorder-visible-subset-By99U52z.cjs");
let react = require("react");
let _dnd_kit_core = require("@dnd-kit/core");
//#region src/hooks/use-dnd-reorder.ts
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
function useDndReorder({ originalList, filteredList, onUpdate, itemKey }) {
	const getId = (0, react.useCallback)((item) => typeof itemKey === "function" ? itemKey(item) : item[itemKey], [itemKey]);
	const itemIndexMap = (0, react.useMemo)(() => {
		const map = /* @__PURE__ */ new Map();
		originalList.forEach((item, index) => {
			map.set(getId(item), index);
		});
		return map;
	}, [originalList, getId]);
	const getItemKey = (0, react.useCallback)((index) => {
		const item = filteredList[index];
		if (!item) return index;
		return itemIndexMap.get(getId(item)) ?? index;
	}, [
		filteredList,
		itemIndexMap,
		getId
	]);
	return {
		onSortEnd: (0, react.useCallback)(({ oldIndex, newIndex }) => {
			const nextList = require_reorder_visible_subset.reorderVisibleSubset({
				items: originalList,
				visibleItems: filteredList,
				fromIndex: oldIndex,
				toIndex: newIndex,
				getId: (item) => getId(item)
			});
			if (nextList !== originalList) onUpdate(nextList);
		}, [
			filteredList,
			getId,
			onUpdate,
			originalList
		]),
		itemKey: getItemKey
	};
}
//#endregion
//#region src/hooks/use-dnd-state.ts
/**
* 提供 dnd-kit 的全局拖拽状态管理
*
* @returns 当前拖拽状态信息
*/
function useDndState() {
	const { active, over } = (0, _dnd_kit_core.useDndContext)();
	return {
		isDragging: active !== null,
		draggedId: active?.id ?? null,
		overId: over?.id ?? null,
		isOver: over !== null
	};
}
//#endregion
exports.useDndReorder = useDndReorder;
exports.useDndState = useDndState;
