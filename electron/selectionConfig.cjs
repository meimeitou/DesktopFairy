/** @see cherry-studio/src/main/configs/SelectionConfig.ts */

const SELECTION_PREDEFINED_BLACKLIST = {
  MAC: ['com.apple.finder'],
  WINDOWS: [],
};

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
  SELECTION_FINETUNED_LIST,
};
