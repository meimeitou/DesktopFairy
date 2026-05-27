let MacOCR = null;
let loadError = null;

const loadMacOCR = () => {
  if (MacOCR || loadError) return MacOCR;
  if (process.platform !== 'darwin') {
    loadError = new Error('macOS OCR is only available on darwin');
    return null;
  }
  try {
    MacOCR = require('@cherrystudio/mac-system-ocr');
  } catch (error) {
    loadError = error;
    console.warn('[ocr] mac-system-ocr not available:', error.message);
  }
  return MacOCR;
};

const isOcrAvailable = () => {
  if (process.platform !== 'darwin') return false;
  return !!loadMacOCR();
};

const recognizeImagePath = async (filePath) => {
  const ocr = loadMacOCR();
  if (!ocr) {
    throw new Error('macOS OCR module is not available');
  }

  const result = await ocr.recognizeFromPath(filePath, {
    languages: 'zh-Hans, en-US',
    recognitionLevel: ocr.RECOGNITION_LEVEL_ACCURATE,
  });

  return {
    text: String(result?.text || ''),
    confidence: Number(result?.confidence) || 0,
  };
};

module.exports = {
  isOcrAvailable,
  recognizeImagePath,
};
