export function localDate(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function validDateOnly(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00`);
  return Number.isFinite(date.getTime()) && localDate(date) === value;
}

// Legacy date-only records describe a local calendar day, not midnight UTC.
// Unknown dates stay unknown instead of appearing as activity performed today.
export function activityTimestamp(value: unknown): number {
  if (typeof value === "number") return Number.isFinite(new Date(value).getTime()) ? value : NaN;
  if (typeof value !== "string" || !value.trim()) return NaN;
  const text = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    return validDateOnly(text) ? new Date(`${text}T00:00:00`).getTime() : NaN;
  }
  const calendarPrefix = /^(\d{4}-\d{2}-\d{2})(?:T|\s)/.exec(text);
  if (calendarPrefix && !validDateOnly(calendarPrefix[1])) return NaN;
  return new Date(text).getTime();
}
