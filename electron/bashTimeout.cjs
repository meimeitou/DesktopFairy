/**
 * Bash tool timeout resolution — pi contract (seconds).
 * Default 300s; 0 disables the deadline; positive values clamp to 1..3600.
 */

const DEFAULT_BASH_TIMEOUT_SEC = 300;
const MAX_BASH_TIMEOUT_SEC = 3600;

/**
 * Resolve tool `timeout` (seconds) to an integer.
 * Non-finite or negative values fall back to the default (300).
 * 0 disables the deadline; positive values round and clamp to 1..3600.
 */
function resolveBashTimeoutSec(raw) {
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) {
    return DEFAULT_BASH_TIMEOUT_SEC;
  }
  if (n === 0) return 0;
  return Math.min(Math.max(Math.round(n), 1), MAX_BASH_TIMEOUT_SEC);
}

function formatTimeoutLabel(sec) {
  const s = Math.max(0, Math.round(Number(sec) || 0));
  if (s > 0 && s % 60 === 0) return `${s / 60} minute(s)`;
  return `${s} second(s)`;
}

module.exports = {
  DEFAULT_BASH_TIMEOUT_SEC,
  MAX_BASH_TIMEOUT_SEC,
  resolveBashTimeoutSec,
  formatTimeoutLabel,
};
