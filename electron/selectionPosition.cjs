const { screen } = require('electron');

const INVALID = -99999;

const isInvalidCoord = (n) =>
  n == null || !Number.isFinite(Number(n)) || Number(n) === INVALID;

const toPoint = (p) => {
  if (!p) return null;
  const x = Number(p.x);
  const y = Number(p.y);
  if (isInvalidCoord(x) || isInvalidCoord(y)) return null;
  return { x: Math.round(x), y: Math.round(y) };
};

const isSamePoint = (a, b) => a.x === b.x && a.y === b.y;

const isSameLineWithRectPoint = (startTop, startBottom, endTop, endBottom) =>
  startTop.y === endTop.y && startBottom.y === endBottom.y;

/**
 * Resolve anchor point + orientation from selection-hook data.
 * Ported from cherry-studio SelectionService.processTextSelection (macOS-focused).
 */
function resolveRefPoint(selectionData, SelectionHook) {
  const PosLevel = SelectionHook?.PositionLevel;
  let refPoint = { x: 0, y: 0 };
  let refOrientation = 'bottomRight';
  let isLogical = false;

  const invalidMouseEnd =
    isInvalidCoord(selectionData?.mousePosEnd?.x) ||
    isInvalidCoord(selectionData?.mousePosEnd?.y);

  switch (selectionData?.posLevel) {
    case PosLevel?.NONE: {
      const cursorPoint = screen.getCursorScreenPoint();
      refPoint = { x: cursorPoint.x, y: cursorPoint.y };
      refOrientation = 'bottomMiddle';
      isLogical = true;
      break;
    }
    case PosLevel?.MOUSE_SINGLE: {
      if (invalidMouseEnd) {
        const cursorPoint = screen.getCursorScreenPoint();
        refPoint = { x: cursorPoint.x, y: cursorPoint.y };
        refOrientation = 'bottomMiddle';
        isLogical = true;
      } else {
        refOrientation = 'bottomMiddle';
        refPoint = {
          x: selectionData.mousePosEnd.x,
          y: selectionData.mousePosEnd.y + 16,
        };
      }
      break;
    }
    case PosLevel?.MOUSE_DUAL: {
      if (invalidMouseEnd) {
        const cursorPoint = screen.getCursorScreenPoint();
        refPoint = { x: cursorPoint.x, y: cursorPoint.y };
        refOrientation = 'bottomMiddle';
        isLogical = true;
        break;
      }
      const yDistance = selectionData.mousePosEnd.y - selectionData.mousePosStart.y;
      const xDistance = selectionData.mousePosEnd.x - selectionData.mousePosStart.x;

      if (Math.abs(yDistance) > 14) {
        if (yDistance > 0) {
          refOrientation = 'bottomLeft';
          refPoint = {
            x: selectionData.mousePosEnd.x,
            y: selectionData.mousePosEnd.y + 16,
          };
        } else {
          refOrientation = 'topRight';
          refPoint = {
            x: selectionData.mousePosEnd.x,
            y: selectionData.mousePosEnd.y - 16,
          };
        }
      } else if (xDistance > 0) {
        refOrientation = 'bottomLeft';
        refPoint = {
          x: selectionData.mousePosEnd.x,
          y: Math.max(selectionData.mousePosEnd.y, selectionData.mousePosStart.y) + 16,
        };
      } else {
        refOrientation = 'bottomRight';
        refPoint = {
          x: selectionData.mousePosEnd.x,
          y: Math.min(selectionData.mousePosEnd.y, selectionData.mousePosStart.y) + 16,
        };
      }
      break;
    }
    case PosLevel?.SEL_FULL:
    case PosLevel?.SEL_DETAILED: {
      const isNoMouse =
        selectionData.mousePosStart.x === 0 &&
        selectionData.mousePosStart.y === 0 &&
        selectionData.mousePosEnd.x === 0 &&
        selectionData.mousePosEnd.y === 0;

      const endBottom = toPoint(selectionData.endBottom);
      const startBottom = toPoint(selectionData.startBottom);
      const endTop = toPoint(selectionData.endTop);
      const startTop = toPoint(selectionData.startTop);

      if (isNoMouse && endBottom) {
        refOrientation = 'bottomLeft';
        refPoint = { x: endBottom.x, y: endBottom.y + 4 };
        break;
      }

      if (invalidMouseEnd && endBottom) {
        refOrientation = 'bottomLeft';
        refPoint = { x: endBottom.x, y: endBottom.y + 4 };
        break;
      }

      const isDoubleClick = isSamePoint(selectionData.mousePosStart, selectionData.mousePosEnd);

      if (
        startTop &&
        startBottom &&
        endTop &&
        endBottom &&
        isSameLineWithRectPoint(startTop, startBottom, endTop, endBottom)
      ) {
        if (isDoubleClick) {
          refOrientation = 'bottomLeft';
          refPoint = { x: endBottom.x, y: endBottom.y + 4 };
        } else if (selectionData.mousePosEnd.x >= selectionData.mousePosStart.x) {
          refOrientation = 'bottomLeft';
          refPoint = { x: endBottom.x, y: endBottom.y + 4 };
        } else {
          refOrientation = 'bottomRight';
          refPoint = { x: startBottom.x, y: startBottom.y + 4 };
        }
        break;
      }

      const direction = selectionData.mousePosEnd.y - selectionData.mousePosStart.y;
      if (direction > 0 && endBottom) {
        refOrientation = 'bottomLeft';
        refPoint = { x: endBottom.x, y: endBottom.y + 4 };
      } else if (startTop) {
        refOrientation = 'topRight';
        refPoint = { x: startTop.x, y: startTop.y - 4 };
      }
      break;
    }
    default: {
      const cursorPoint = screen.getCursorScreenPoint();
      refPoint = { x: cursorPoint.x, y: cursorPoint.y };
      refOrientation = 'bottomMiddle';
      isLogical = true;
    }
  }

  if (!isLogical) {
    refPoint = {
      x: Math.round(refPoint.x),
      y: Math.round(refPoint.y),
    };
  } else {
    refPoint = {
      x: Math.round(refPoint.x),
      y: Math.round(refPoint.y),
    };
  }

  if (isInvalidCoord(refPoint.x) || isInvalidCoord(refPoint.y)) {
    const cursorPoint = screen.getCursorScreenPoint();
    refPoint = { x: Math.round(cursorPoint.x), y: Math.round(cursorPoint.y) };
    refOrientation = 'bottomMiddle';
  }

  return { refPoint, refOrientation };
}

/** Ported from cherry-studio calculateToolbarPosition */
function calculateToolbarPosition(refPoint, orientation, toolbarWidth, toolbarHeight) {
  const posPoint = { x: 0, y: 0 };

  switch (orientation) {
    case 'topLeft':
      posPoint.x = refPoint.x - toolbarWidth;
      posPoint.y = refPoint.y - toolbarHeight;
      break;
    case 'topRight':
      posPoint.x = refPoint.x;
      posPoint.y = refPoint.y - toolbarHeight;
      break;
    case 'topMiddle':
      posPoint.x = refPoint.x - toolbarWidth / 2;
      posPoint.y = refPoint.y - toolbarHeight;
      break;
    case 'bottomLeft':
      posPoint.x = refPoint.x - toolbarWidth;
      posPoint.y = refPoint.y;
      break;
    case 'bottomRight':
      posPoint.x = refPoint.x;
      posPoint.y = refPoint.y;
      break;
    case 'bottomMiddle':
      posPoint.x = refPoint.x - toolbarWidth / 2;
      posPoint.y = refPoint.y;
      break;
    case 'middleLeft':
      posPoint.x = refPoint.x - toolbarWidth;
      posPoint.y = refPoint.y - toolbarHeight / 2;
      break;
    case 'middleRight':
      posPoint.x = refPoint.x;
      posPoint.y = refPoint.y - toolbarHeight / 2;
      break;
    case 'center':
      posPoint.x = refPoint.x - toolbarWidth / 2;
      posPoint.y = refPoint.y - toolbarHeight / 2;
      break;
    default:
      posPoint.x = refPoint.x - toolbarWidth / 2;
      posPoint.y = refPoint.y - toolbarHeight / 2;
  }

  const display = screen.getDisplayNearestPoint(refPoint);
  const exceedsTop = posPoint.y < display.workArea.y;
  const exceedsBottom =
    posPoint.y > display.workArea.y + display.workArea.height - toolbarHeight;

  posPoint.x = Math.round(
    Math.max(
      display.workArea.x,
      Math.min(posPoint.x, display.workArea.x + display.workArea.width - toolbarWidth)
    )
  );
  posPoint.y = Math.round(
    Math.max(
      display.workArea.y,
      Math.min(posPoint.y, display.workArea.y + display.workArea.height - toolbarHeight)
    )
  );

  if (exceedsTop) posPoint.y += 32;
  if (exceedsBottom) posPoint.y -= 32;

  return posPoint;
}

module.exports = {
  resolveRefPoint,
  calculateToolbarPosition,
  INVALID,
};
