/** 相对时间标签：刚刚 / N 分钟前 / N 小时前 / HH:MM / 昨天 / N 天前 / M/D */
export function formatTime(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  const diff = now.getTime() - ts;
  const oneDay = 86400000;

  if (diff < 60000) return "刚刚";
  if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`;
  if (diff < oneDay) return `${Math.floor(diff / 3600000)} 小时前`;
  if (d.toDateString() === now.toDateString()) {
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  }
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return "昨天";
  if (diff < oneDay * 7) return `${Math.floor(diff / oneDay)} 天前`;
  return `${d.getMonth() + 1}/${d.getDate()}`;
}
