import type { ExerciseModifierId } from "@/types";
import { movementVariationToExerciseCatalogItem } from "./movementAdapter";
import { createExerciseVariation } from "./movementGeneration";

const variation = (
  coreMovementId: Parameters<typeof createExerciseVariation>[0]["coreMovementId"],
  modifierIds: ExerciseModifierId[],
) =>
  createExerciseVariation(
    {
      coreMovementId,
      modifierIds,
    },
    { apparatusLabel: "short" },
  );

export const CHEST_PRESS_VARIATION_EXAMPLES = [
  variation("chest-press", [
    "angle-position:flat",
    "apparatus:dumbbell",
    "training-intent:strength",
  ]),
  variation("chest-press", [
    "angle-position:incline",
    "apparatus:dumbbell",
    "training-intent:hypertrophy",
  ]),
  variation("chest-press", [
    "apparatus:machine",
    "training-intent:strength",
  ]),
  variation("chest-press", [
    "limb-usage:unilateral",
    "apparatus:cable",
    "training-intent:stability",
  ]),
  variation("chest-press", [
    "assistance-resistance:assisted",
    "apparatus:machine",
    "training-intent:rehab",
  ]),
  variation("chest-press", [
    "tempo:eccentric-only",
    "training-intent:strength",
  ]),
];

export const ROW_VARIATION_EXAMPLES = [
  variation("row", ["apparatus:dumbbell", "training-intent:strength"]),
  variation("row", [
    "limb-usage:unilateral",
    "apparatus:dumbbell",
    "training-intent:hypertrophy",
  ]),
  variation("row", [
    "angle-position:seated",
    "apparatus:cable",
    "training-intent:hypertrophy",
  ]),
  variation("row", ["apparatus:machine", "training-intent:strength"]),
  variation("row", [
    "tempo:paused",
    "apparatus:cable",
    "training-intent:stability",
  ]),
  variation("row", [
    "tempo:eccentric-only",
    "training-intent:strength",
  ]),
];

export const NORMALIZED_MOVEMENT_EXAMPLES = [
  ...CHEST_PRESS_VARIATION_EXAMPLES,
  ...ROW_VARIATION_EXAMPLES,
];

export const LEGACY_ADAPTED_MOVEMENT_EXAMPLES =
  NORMALIZED_MOVEMENT_EXAMPLES.map((example) =>
    movementVariationToExerciseCatalogItem(example),
  );
