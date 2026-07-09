/**
 * Bash / shell tool timeout resolution — aligned with Claude Code Bash tool.
 * @see https://docs.anthropic.com/en/docs/claude-code (timeout in ms, default 2m, max 10m)
 */

/** Claude Code default: 120_000 ms (2 minutes) */
const DEFAULT_BASH_TIMEOUT_MS = 120_000;

/** Claude Code maximum: 600_000 ms (10 minutes) */
const MAX_BASH_TIMEOUT_MS = 600_000;

/**
 * Resolve tool `timeout` to milliseconds.
 *
 * Spec (Claude Code): milliseconds. Models often pass seconds (e.g. 300 = 5 min).
 * Heuristic: values < 1000 are treated as seconds; >= 1000 as milliseconds.
 */
function resolveBashTimeoutMs(raw) {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) {
    return DEFAULT_BASH_TIMEOUT_MS;
  }

  let ms;
  if (n < 1000) {
    ms = n * 1000;
  } else {
    ms = n;
  }

  return Math.min(Math.max(ms, 1000), MAX_BASH_TIMEOUT_MS);
}

function formatTimeoutLabel(ms) {
  if (ms % 60_000 === 0) return `${ms / 60_000} minute(s)`;
  if (ms % 1000 === 0) return `${ms / 1000} second(s)`;
  return `${ms}ms`;
}

module.exports = {
  DEFAULT_BASH_TIMEOUT_MS,
  MAX_BASH_TIMEOUT_MS,
  resolveBashTimeoutMs,
  formatTimeoutLabel,
};
