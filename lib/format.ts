/** Relative, human-friendly time for dashboards. */
export function formatRelativeTime(input: string | Date): string {
  const date = typeof input === "string" ? new Date(input) : input;
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / 60000);

  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;

  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/** Medium date + short time, e.g. "Aug 31, 2026, 9:41 AM". */
export function formatDateTime(input: string | Date): string {
  const date = typeof input === "string" ? new Date(input) : input;
  return date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

/** Short date, e.g. "Aug 31, 2026". */
export function formatDate(input: string | Date): string {
  const date = typeof input === "string" ? new Date(input) : input;
  return date.toLocaleDateString(undefined, { dateStyle: "medium" });
}

/** Time-of-day only, e.g. "9:41 AM". */
export function formatTime(input: string | Date): string {
  const date = typeof input === "string" ? new Date(input) : input;
  return date.toLocaleTimeString(undefined, { timeStyle: "short" });
}
