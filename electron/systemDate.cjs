const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];

function formatTimezoneOffset(date) {
  const offsetMin = -date.getTimezoneOffset();
  const sign = offsetMin >= 0 ? '+' : '-';
  const abs = Math.abs(offsetMin);
  const hours = Math.floor(abs / 60);
  const mins = abs % 60;
  return mins
    ? `UTC${sign}${hours}:${String(mins).padStart(2, '0')}`
    : `UTC${sign}${hours}`;
}

/** Local calendar date for system prompt. Rebuilt on every request. */
function formatSystemDateLine(now = new Date()) {
  const date = now instanceof Date ? now : new Date(now);
  return (
    `当前系统日期：${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日` +
    `星期${WEEKDAYS[date.getDay()]}（${formatTimezoneOffset(date)}）`
  );
}

function prependSystemDate(messages, now) {
  const line = formatSystemDateLine(now);
  const rest = Array.isArray(messages) ? messages : [];
  const first = rest[0];
  if (first?.role === 'system' && typeof first.content === 'string') {
    return [{ ...first, content: `${line}\n\n${first.content}` }, ...rest.slice(1)];
  }
  return [{ role: 'system', content: line }, ...rest];
}

module.exports = { formatSystemDateLine, prependSystemDate };
