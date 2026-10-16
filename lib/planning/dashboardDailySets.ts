import { activityTimestamp, localDate } from "./dates";
import { statsExerciseMetrics } from "./statsEvidence";

/** Count recorded sets; weekly targets and exercise names do not establish a daily prescription. */
export function dashboardDailySets(records: readonly unknown[], now = new Date()) {
  let total = 0, excluded = 0, overflow = false;
  const marks: { filled: boolean; group: string; id: string }[] = [];
  records.forEach((value, occurrence) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) { excluded++; return; }
    const record = value as Record<string, unknown>, timestamp = activityTimestamp(record.date);
    if (!Number.isFinite(timestamp)) { excluded++; return; }
    if (timestamp > now.getTime() || localDate(new Date(timestamp)) !== localDate(now)) return;
    const metrics = statsExerciseMetrics(record);
    if (!metrics) { excluded++; return; }
    if (!Number.isSafeInteger(total + metrics.sets)) { overflow = true; excluded++; return; }
    total += metrics.sets;
    const visible = Math.min(metrics.sets, Math.max(0, 80 - marks.length));
    for (let set = 0; set < visible; set++) marks.push({ filled: true, group: "recorded", id: `recorded-${occurrence}-${set}` });
  });
  const sets = overflow ? null : total;
  return { sets, target: null, progress: null, marks: overflow ? [] : marks, excluded,
    label: sets === null ? "Unavailable" : sets.toLocaleString() + (excluded ? " (partial)" : ""),
    detail: `${sets === null ? "Daily total needs review." : `${sets.toLocaleString()} recorded sets today.`} Daily target unavailable.${excluded ? ` ${excluded} malformed or undated entries excluded; originals are preserved.` : ""}${total > 80 && !overflow ? " Visual tally limited to 80 marks; the count includes all valid sets." : ""}` };
}
