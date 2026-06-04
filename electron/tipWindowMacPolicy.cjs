/**
 * Accessory (LSUIElement) apps cannot float panel windows over other apps' key windows.
 * Cherry Studio runs as a regular app; DesktopFairy uses accessory + tray.
 * Briefly elevate activation policy while the selection tip is visible.
 */
const { app } = require('electron');

let overlayElevated = false;

function elevateForSelectionOverlay() {
  if (process.platform !== 'darwin' || overlayElevated) return;
  overlayElevated = true;
  app.setActivationPolicy('regular');
  // Keep regular activation during overlay; hiding the dock can demote panel z-order.
}

function restoreAfterSelectionOverlay() {
  if (process.platform !== 'darwin' || !overlayElevated) return;
  overlayElevated = false;
  app.setActivationPolicy('accessory');
  if (app.dock?.hide) app.dock.hide();
}

function isOverlayElevated() {
  return overlayElevated;
}

module.exports = {
  elevateForSelectionOverlay,
  restoreAfterSelectionOverlay,
  isOverlayElevated,
};
