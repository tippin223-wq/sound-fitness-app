import type { Exercise, ExerciseVariation, IntegratedMovement } from "../types";
import { getAliasesForExercise } from "../aliases/exerciseAliases";
import { EXERCISE_VARIATIONS } from "./exerciseVariations";
import { INTEGRATED_MOVEMENTS } from "./integratedMovements";

export const EXERCISE_SYSTEM_VARIATIONS = [
  ...EXERCISE_VARIATIONS,
  ...INTEGRATED_MOVEMENTS,
] satisfies Array<ExerciseVariation | IntegratedMovement>;

export const EXERCISE_SYSTEM_VARIATION_BY_ID = Object.fromEntries(
  EXERCISE_SYSTEM_VARIATIONS.map((item) => [item.id, item]),
) as unknown as Record<string, ExerciseVariation | IntegratedMovement>;

export const EXERCISE_SYSTEM_CATALOG: Exercise[] =
  EXERCISE_SYSTEM_VARIATIONS.map((variation) => ({
    id: variation.id,
    name: variation.displayName,
    variation,
    aliases: getAliasesForExercise(variation.id),
    relationships: [],
  }));

export const getExerciseSystemVariation = (exerciseId: string) =>
  EXERCISE_SYSTEM_VARIATION_BY_ID[exerciseId] || null;
