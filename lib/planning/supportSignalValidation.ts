import { validDateOnly, activityTimestamp } from "./dates";

export const SUPPORT_RECORDS_KEY = "soundFitnessSupportSignalRecords";
export const supportKinds = ["sleep", "stress", "soreness", "fatigue", "recovery", "core"] as const;
export type SupportKind = typeof supportKinds[number];
export type SupportRecord = { id: string; kind: SupportKind; date: string; value: number; notes: string; recordedAt: string };
export function validSupportValue(kind: SupportKind, value: number) {
  return Number.isFinite(value) && (kind === "recovery" ? value > 0 && value <= 1440 : Number.isInteger(value) && value >= (kind === "core" ? 0 : 1) && value <= (kind === "core" ? 200 : 10));
}
export function validSupportHistory(value: unknown): value is SupportRecord[] {
  return Array.isArray(value) && value.every(row => row && typeof row === "object" && !Array.isArray(row)
    && typeof row.id === "string" && row.id.length > 0 && row.id.length <= 100
    && supportKinds.includes(row.kind) && validDateOnly(row.date) && validSupportValue(row.kind, row.value)
    && typeof row.notes === "string" && row.notes.length <= 1000
    && typeof row.recordedAt === "string" && Number.isFinite(activityTimestamp(row.recordedAt)))
    && new Set(value.map(row => row.id)).size === value.length;
}
