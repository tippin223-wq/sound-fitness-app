import { readEligibleGoals } from "./goals";
import { goalNumber } from "./goalNumbers";

export function readLibraryWeeklySetTarget(now = new Date()) {
  const goals = readEligibleGoals(now);
  const target = goals ? goalNumber(goals.targetWeeklySets) : null;
  return target !== null && Number.isSafeInteger(target) && target > 0 ? target : null;
}

export function librarySetProgress(sets: number, target: number | null) {
  const available = Number.isSafeInteger(sets) && sets >= 0 && target !== null && Number.isSafeInteger(target) && target > 0;
  const percent = available ? sets / target * 100 : 0;
  const status = !available ? "not-set" : percent <= 40 ? "undertrained" : percent <= 74 ? "almost-there" : percent <= 110 ? "trained" : "risk";
  return { available, percent, fillPercent: Math.min(100, percent), status } as const;
}

export function librarySetTargetLabel(sets: number, target: number | null) {
  const progress = librarySetProgress(sets, target);
  const count = Number.isSafeInteger(sets) && sets >= 0 ? sets.toLocaleString() : "Unknown";
  return progress.available ? `${count} / ${target} sets` : `${count} sets · target not set`;
}
