const fs = require('fs');
const path = require('path');

function ensureDir(dirPath) {
  try {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  } catch (e) {
    console.warn('Failed to create directory:', dirPath, e);
  }
}

function getLogFilePath(logsDir, topicId) {
  return path.join(logsDir(), topicId, 'messages.jsonl');
}

function appendChatLog(logsDir, topicId, entry) {
  if (!topicId || !entry || typeof entry !== 'object') return;
  try {
    const filePath = getLogFilePath(logsDir, topicId);
    ensureDir(path.dirname(filePath));
    const line = JSON.stringify({ ...entry, timestamp: entry.timestamp || Date.now() });
    fs.appendFileSync(filePath, `${line}\n`);
  } catch (e) {
    console.warn('Failed to append chat log:', topicId, e);
  }
}

function readChatLog(logsDir, topicId) {
  if (!topicId) return [];
  try {
    const filePath = getLogFilePath(logsDir, topicId);
    if (!fs.existsSync(filePath)) return [];
    const text = fs.readFileSync(filePath, 'utf8');
    return text
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        try {
          return JSON.parse(line);
        } catch {
          return null;
        }
      })
      .filter(Boolean);
  } catch (e) {
    console.warn('Failed to read chat log:', topicId, e);
    return [];
  }
}

module.exports = {
  appendChatLog,
  readChatLog,
};
