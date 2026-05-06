import { exerciseLibrary } from "./exerciseLibrary";
import { inferMovementCandidatesFromLegacyLibrary } from "./movementAdapter";

export const getLegacyExerciseMovementCandidates = () =>
  inferMovementCandidatesFromLegacyLibrary(exerciseLibrary);

export const summarizeLegacyExerciseMigrationReadiness = () => {
  const candidates = getLegacyExerciseMovementCandidates();

  return candidates.reduce(
    (summary, candidate) => {
      summary.total += 1;
      summary[candidate.confidence] += 1;

      if (candidate.coreMovementId) {
        summary.byCoreMovement[candidate.coreMovementId] =
          (summary.byCoreMovement[candidate.coreMovementId] || 0) + 1;
      }

      return summary;
    },
    {
      total: 0,
      high: 0,
      medium: 0,
      low: 0,
      byCoreMovement: {} as Record<string, number>,
    },
  );
};
