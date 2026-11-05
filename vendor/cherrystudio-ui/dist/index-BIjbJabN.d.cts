//#region src/utils/dialog.d.ts
/** Close-animation duration of DialogContent's closed-state animation class. */
declare const DIALOG_CLOSE_DURATION_MS = 200;
/** Delay before imperative hosts unmount a closing Dialog. */
declare const DIALOG_UNMOUNT_DELAY_MS = 200;
//#endregion
//#region src/utils/index.d.ts
/**
 * Converts `null` to `undefined`, otherwise returns the input value.
 * Useful when interfacing with APIs or libraries that treat `null` and `undefined` differently.
 * @param data - The value that might be `null`
 * @returns `undefined` if `data` is `null`, otherwise the original value
 */
declare const toUndefinedIfNull: <T>(data: T | null) => T | undefined;
/**
 * Converts `undefined` to `null`, otherwise returns the input value.
 * Handy for ensuring consistent representation of absent values.
 * @param data - The value that might be `undefined`
 * @returns `null` if `data` is `undefined`, otherwise the original value
 */
declare const toNullIfUndefined: <T>(data: T | undefined) => T | null;
//#endregion
export { DIALOG_UNMOUNT_DELAY_MS as i, toUndefinedIfNull as n, DIALOG_CLOSE_DURATION_MS as r, toNullIfUndefined as t };