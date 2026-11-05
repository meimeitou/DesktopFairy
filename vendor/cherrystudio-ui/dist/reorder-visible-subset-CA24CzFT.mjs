//#region src/components/composites/reorderable-list/reorder-visible-subset.ts
function reorderVisibleSubset({ items, visibleItems = items, fromIndex, toIndex, getId }) {
	if (fromIndex === toIndex) return items;
	const sourceItem = visibleItems[fromIndex];
	const targetItem = visibleItems[toIndex];
	if (!sourceItem || !targetItem) return items;
	const indexById = new Map(items.map((item, index) => [getId(item), index]));
	const sourceIndex = indexById.get(getId(sourceItem));
	const targetIndex = indexById.get(getId(targetItem));
	if (sourceIndex === void 0 || targetIndex === void 0 || sourceIndex === targetIndex) return items;
	const nextItems = [...items];
	const [movedItem] = nextItems.splice(sourceIndex, 1);
	if (!movedItem) return items;
	nextItems.splice(targetIndex, 0, movedItem);
	return nextItems;
}
//#endregion
export { reorderVisibleSubset as t };
