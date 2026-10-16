import { readWorkoutCompletionEvidence } from "./logs";
import { planningKeys, readPlanning, writePlanningValues } from "./store";
import { assertActiveSessionReviewed, workoutSessionDraftIssue } from "./activeSessionRecovery";
import { createPreservedDefaultDraftKey } from "./workoutDrafts";

export function activateDefaultWorkout() {
  const key = "loggerDraft:default";
  const draft = readPlanning<unknown>(key, null);
  const id = typeof draft === "string" ? draft : draft && typeof draft === "object" && "id" in draft ? draft.id : null;
  // A completion without its matching finalization marker may have newer draft values.
  const records = readWorkoutCompletionEvidence(false);
  const matches = typeof id === "string" ? records.filter(log => log.id === id) : [];
  if (matches.length > 1) throw new Error("Saved workout identity is duplicated. Review the originals in History before starting; your draft is preserved.");
  assertActiveSessionReviewed();
  const targetIssue = workoutSessionDraftIssue(draft, 8, null, null);
  if (targetIssue) throw new Error(`The saved default workout draft needs review. Export your planning backup before replacing it. ${targetIssue}`);
  const completion = matches[0];
  const reset = Boolean(completion && (typeof draft === "string" || (draft && typeof draft === "object" && "completedAt" in draft && draft.completedAt === completion.completedAt)));
  writePlanningValues({
    [planningKeys.context]: null,
    soundFitnessWorkoutBuilderActiveSessionTemplate: null,
    ...(reset ? { ...(draft && typeof draft === "object" ? { [createPreservedDefaultDraftKey()]: structuredClone(draft) } : {}), [key]: null } : {}),
  });
  return { reset };
}
