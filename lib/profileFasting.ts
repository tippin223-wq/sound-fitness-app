export type FastingPeriod = {id: string; kind: "Regular" | "Occasional"; start: string; end: string; notes: string};
export type FastingPreferences = {
  fastingStatus?: "No" | "Yes" | "Sometimes"; fastingStart?: string; fastingEnd?: string; fastingNotes?: string; fastingPeriods?: FastingPeriod[];
};
export function readFastingPeriods(value: FastingPreferences): FastingPeriod[] {
  if (value.fastingStatus === "No") return [];
  if (Array.isArray(value.fastingPeriods)) return value.fastingPeriods;
  if (!value.fastingStatus) return [];
  return [{id: "existing-fasting-period", kind: value.fastingStatus === "Yes" ? "Regular" : "Occasional", start: value.fastingStart || "", end: value.fastingEnd || "", notes: value.fastingNotes || ""}];
}
export function updateFastingPeriods<T extends FastingPreferences>(value: T, periods: FastingPeriod[], noFasting = false): T {
  return {...value, fastingPeriods: periods, fastingStatus: noFasting ? "No" : periods.length ? periods.some(period => period.kind === "Occasional") ? "Sometimes" : "Yes" : undefined,
    fastingStart: periods[0]?.start || "", fastingEnd: periods[0]?.end || "", fastingNotes: periods[0]?.notes || ""};
}
