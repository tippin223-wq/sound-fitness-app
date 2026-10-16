import { mergePhaseRecords } from "./phaseRecords";
import { planningAccountGeneration, planningKeys, planningOwner, planningRecordVersion, readPlanning, writePlanning } from "./store";
import { requireSavedGoals } from "./goals";

export function capturePhaseGoalEditor() {
  return { account: planningOwner(), generation: planningAccountGeneration(), version: planningRecordVersion(planningKeys.goals) };
}
export function assertPhaseGoalEditor(editor: ReturnType<typeof capturePhaseGoalEditor>) {
  if (!editor.account || editor.account !== planningOwner() || editor.generation !== planningAccountGeneration()) throw new Error("Your account changed. Reload Phases before saving this draft.");
  if (editor.version !== planningRecordVersion(planningKeys.goals)) throw new Error("Goals changed while this phase draft was open. Use saved Goals to update its goal and volume, then review before saving. Your draft is preserved.");
  return requireSavedGoals();
}

export type PhaseUndo = { account: string; generation: number; previous: unknown; previousVersion: string; version: string };
const phaseSnapshotVersion = (value: unknown) => JSON.stringify(value, (_key, item) =>
  item && typeof item === "object" && !Array.isArray(item) ? Object.fromEntries(Object.entries(item).sort(([a], [b]) => a.localeCompare(b))) : item) ?? "undefined";
function assertEditor(account: string | null, version: string, generation: number) {
  if (!account || planningOwner() !== account || generation !== planningAccountGeneration()) throw new Error("Your account changed. Reload Phases before saving.");
  if (planningRecordVersion(planningKeys.phases) !== version) throw new Error("Saved phases changed. Your builder draft is still here; review the latest Phase Library before trying again.");
}
/** One complete collection write, checked against the library that supplied the action. */
export function commitPhaseRecords(next: unknown, account: string | null, version: string, generation: number): PhaseUndo {
  assertEditor(account, version, generation);
  const previous = structuredClone(readPlanning<unknown>(planningKeys.phases, null));
  const merged = mergePhaseRecords(previous, next);
  writePlanning(planningKeys.phases, structuredClone(merged));
  return { account: account!, generation, previous, previousVersion: phaseSnapshotVersion(previous), version: planningRecordVersion(planningKeys.phases) };
}
export function undoPhaseRemoval(undo: PhaseUndo) {
  assertEditor(undo.account, undo.version, undo.generation);
  if (phaseSnapshotVersion(undo.previous) !== undo.previousVersion) throw new Error("The original phase undo snapshot changed. Review the Phase Library before restoring; current records are preserved.");
  writePlanning(planningKeys.phases, structuredClone(undo.previous));
}
