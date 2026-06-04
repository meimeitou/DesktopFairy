/** @see cherry-studio/src/main/services/selection/selectionConfig.ts */

const SELECTION_PREDEFINED_BLACKLIST = {
  MAC: ['com.apple.finder'],
  WINDOWS: [],
};

/** Never run selection assist inside our own process — avoids AX/clipboard loops in chat UI. */
const SELECTION_SELF_APP_MAC = [
  'com.desktop.fairy',
  'com.github.electron',
  'com.github.Electron',
  'com.todesktop.',
  'com.electron.',
  'desktop-fairy',
  'DesktopFairy',
];

const SELECTION_FINETUNED_LIST = {
  EXCLUDE_CLIPBOARD_CURSOR_DETECT: {
    MAC: [],
    WINDOWS: [],
  },
  INCLUDE_CLIPBOARD_DELAY_READ: {
    MAC: [],
    WINDOWS: [],
  },
};

module.exports = {
  SELECTION_PREDEFINED_BLACKLIST,
  SELECTION_SELF_APP_MAC,
  SELECTION_FINETUNED_LIST,
};
