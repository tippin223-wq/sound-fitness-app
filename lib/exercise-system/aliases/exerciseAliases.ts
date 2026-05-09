import type { ExerciseAlias } from "../types";
import { EXERCISE_VARIATIONS } from "../data/exerciseVariations";
import { INTEGRATED_MOVEMENTS } from "../data/integratedMovements";

const explicitAliases: ExerciseAlias[] = [
  { exerciseId: "push-up", alias: "push up", kind: "spelling" },
  { exerciseId: "push-up", alias: "pushup", kind: "spelling" },
  { exerciseId: "diamond-push-up", alias: "close grip push up", kind: "common" },
  { exerciseId: "incline-push-up", alias: "elevated push up", kind: "common" },
  { exerciseId: "decline-push-up", alias: "feet elevated push up", kind: "common" },
  { exerciseId: "romanian-deadlift", alias: "rdl", kind: "abbreviation" },
  { exerciseId: "trap-bar-deadlift", alias: "hex bar deadlift", kind: "common" },
  { exerciseId: "pallof-press", alias: "anti rotation press", kind: "semantic" },
  { exerciseId: "renegade-row", alias: "anti rotation row", kind: "semantic" },
  { exerciseId: "suitcase-carry", alias: "anti rotation carry", kind: "semantic" },
  { exerciseId: "turkish-get-up", alias: "tgu", kind: "abbreviation" },
  { exerciseId: "med-ball-rotational-throw", alias: "rotational throw", kind: "semantic" },
];

const generatedAliases: ExerciseAlias[] = [
  ...EXERCISE_VARIATIONS,
  ...INTEGRATED_MOVEMENTS,
].flatMap((exercise) =>
  (exercise.aliases || []).map<ExerciseAlias>((alias) => ({
    exerciseId: exercise.id,
    alias,
    kind: "common",
  })),
);

export const EXERCISE_ALIASES = [...explicitAliases, ...generatedAliases];

export const getAliasesForExercise = (exerciseId: string) =>
  EXERCISE_ALIASES.filter((alias) => alias.exerciseId === exerciseId);
