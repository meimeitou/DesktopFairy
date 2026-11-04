const fs = require('fs');
const { migrateTerminalFiles } = require('./terminalAssistantMigration.cjs');
const { backfillBuiltinAgents } = require('./settingsBackfill.cjs');

function initializeStartupSettings(settingsFile, topicsFile) {
  let migrationError = null;
  try { migrateTerminalFiles(settingsFile, topicsFile); } catch (error) { migrationError = error; }
  let disk = {};
  try { disk = JSON.parse(fs.readFileSync(settingsFile, 'utf8')); } catch { /* defaults in memory */ }
  return { settings: backfillBuiltinAgents(disk || {}), migrationError };
}

/** Block topic reads as well: their legacy fallback may write a new empty index. */
function guardSessionIpc(ipcMain, getMigrationError) {
  return {
    handle(channel, handler) {
      ipcMain.handle(channel, (...args) => {
        if (getMigrationError()) throw new Error('配置迁移未完成，会话访问已暂停。请修复数据文件后重启应用。');
        return handler(...args);
      });
    },
  };
}

module.exports = { initializeStartupSettings, guardSessionIpc };
