import { planningOwner, planningAccountGeneration, planningRecordVersion, readPlanning, writePlanning } from "./store";
import { activityTimestamp } from "./dates";

export const WORKOUT_SYNC_RECEIPT_KEY = "soundFitnessWorkoutSyncReceipt";
type Receipt = { schemaVersion: 1; completedAt: string; syncedTemplates: number; syncedLogs: number; skippedItems: number };
function validReceipt(value: unknown): value is Receipt {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const item = value as Record<string, unknown>;
  return item.schemaVersion === 1 && typeof item.completedAt === "string" && Number.isFinite(activityTimestamp(item.completedAt))
    && [item.syncedTemplates, item.syncedLogs, item.skippedItems].every(count => Number.isSafeInteger(count) && Number(count) >= 0);
}
export function readWorkoutSyncReceipt(): Receipt | null {
  const original = readPlanning<unknown>(WORKOUT_SYNC_RECEIPT_KEY, null);
  return validReceipt(original) ? structuredClone(original) : null;
}

/** A component-owned operation lock; account transitions and cleanup invalidate in-flight work. */
export function createWorkoutSyncOperation() {
  let active = true, busy = false, sequence = 0;
  let account = planningOwner(), generation = planningAccountGeneration();
  const reviewAccount = () => {
    const next = planningOwner(), nextGeneration = planningAccountGeneration();
    if (next === account && nextGeneration === generation) return false;
    account = next; generation = nextGeneration; busy = false; sequence++; return true;
  };
  type Ticket = { account: string; generation: number; sequence: number; receiptVersion: string };
  const current = (ticket: Ticket) => active && busy && ticket.sequence === sequence && ticket.account === account && account === planningOwner() && ticket.generation === generation && generation === planningAccountGeneration();
  return {
    reviewAccount,
    activate() { active = true; sequence++; busy = false; reviewAccount(); },
    cancel() { active = false; sequence++; busy = false; },
    begin(): Ticket | null {
      if (!active) return null;
      reviewAccount();
      if (busy || !account || account === "local-preview") return null;
      busy = true;
      return { account, generation, sequence: ++sequence, receiptVersion: planningRecordVersion(WORKOUT_SYNC_RECEIPT_KEY) };
    },
    current,
    finish(ticket: Ticket) { if (!current(ticket)) return false; busy = false; return true; },
    record(ticket: Ticket, counts: Omit<Receipt, "schemaVersion" | "completedAt">, completedAt = new Date().toISOString()) {
      if (!current(ticket) || planningRecordVersion(WORKOUT_SYNC_RECEIPT_KEY) !== ticket.receiptVersion) throw new Error("Account or sync receipt changed. Review the current backup status; saved workouts are preserved.");
      const original = readPlanning<unknown>(WORKOUT_SYNC_RECEIPT_KEY, null);
      if (original != null && !validReceipt(original)) throw new Error("Saved sync receipt needs review. Its original data is preserved.");
      const receipt: Receipt = { schemaVersion: 1, completedAt, ...counts };
      if (!validReceipt(receipt)) throw new Error("Backup confirmation has an unsupported structure. The original receipt is preserved.");
      writePlanning(WORKOUT_SYNC_RECEIPT_KEY, structuredClone(receipt));
      return receipt;
    },
  };
}
