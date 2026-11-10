import { localDate } from "./dates";
import { planningAccountGeneration, planningOwner, planningSnapshot, planningStatus, writePlanning } from "./store";
import { SUPPORT_RECORDS_KEY, validSupportHistory, type SupportRecord } from "./supportSignalValidation";
export function inspectSupportRecords() {
  const values = planningSnapshot();
  const raw = Object.hasOwn(values, SUPPORT_RECORDS_KEY) ? values[SUPPORT_RECORDS_KEY] : [];
  return validSupportHistory(raw) ? { rows: raw, issue: "" } : { rows: [] as SupportRecord[], issue: "Saved support records need review. Original records are preserved." };
}
export function saveSupportRecord(input: Omit<SupportRecord, "recordedAt">, account: string | null, generation: number, now = new Date()) {
  if (!account || account !== planningOwner() || generation !== planningAccountGeneration()) throw Error("Your account changed. Reopen this meter before saving.");
  if (planningStatus.startsWith("Sync conflict")) throw Error("Resolve the account sync conflict before saving.");
  const history = inspectSupportRecords();
  if (history.issue) throw Error(history.issue);
  const row = { ...input, notes: input.notes.trim(), recordedAt: now.toISOString() };
  if (!validSupportHistory([row]) || row.date > localDate(now)) throw Error("Enter a valid amount and a date through today.");
  const existing = history.rows.find(item => item.id === row.id);
  if (existing) {
    if (["kind", "date", "value", "diastolic", "notes"].every(key => existing[key as keyof SupportRecord] === row[key as keyof SupportRecord])) return existing;
    throw Error("This record changed. Reopen the meter before saving another entry.");
  }
  writePlanning(SUPPORT_RECORDS_KEY, [...history.rows, row]);
  return row;
}
