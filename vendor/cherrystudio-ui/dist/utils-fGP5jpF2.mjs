//#region src/utils/dialog.ts
/** Close-animation duration of DialogContent's closed-state animation class. */
const DIALOG_CLOSE_DURATION_MS = 200;
/** Delay before imperative hosts unmount a closing Dialog. */
const DIALOG_UNMOUNT_DELAY_MS = 200;
//#endregion
//#region src/utils/index.ts
/**
* Converts `null` to `undefined`, otherwise returns the input value.
* Useful when interfacing with APIs or libraries that treat `null` and `undefined` differently.
* @param data - The value that might be `null`
* @returns `undefined` if `data` is `null`, otherwise the original value
*/
const toUndefinedIfNull = (data) => {
	if (data === null) return void 0;
	else return data;
};
/**
* Converts `undefined` to `null`, otherwise returns the input value.
* Handy for ensuring consistent representation of absent values.
* @param data - The value that might be `undefined`
* @returns `null` if `data` is `undefined`, otherwise the original value
*/
const toNullIfUndefined = (data) => {
	if (data === void 0) return null;
	else return data;
};
//#endregion
export { DIALOG_UNMOUNT_DELAY_MS as i, toUndefinedIfNull as n, DIALOG_CLOSE_DURATION_MS as r, toNullIfUndefined as t };
