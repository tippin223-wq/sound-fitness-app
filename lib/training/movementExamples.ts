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
    "execution-style:unilateral",
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
    "execution-style:unilateral",
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

export const ACCESSORY_VARIATION_EXAMPLES = [
  variation("leg-extension", [
    "apparatus:machine",
    "angle-position:seated",
    "training-intent:hypertrophy",
  ]),
  variation("leg-curl", [
    "apparatus:machine",
    "angle-position:seated",
    "tempo:slow-eccentric",
    "training-intent:hypertrophy",
  ]),
  variation("biceps-curl", [
    "apparatus:dumbbell",
    "execution-style:alternating",
    "training-intent:hypertrophy",
  ]),
  variation("triceps-extension", [
    "apparatus:cable",
    "angle-position:standing",
    "training-intent:hypertrophy",
  ]),
  variation("tibialis-raise", [
    "apparatus:bodyweight",
    "angle-position:standing",
    "training-intent:rehab",
  ]),
  variation("step-up", [
    "apparatus:dumbbell",
    "training-intent:stability",
  ]),
];

export const KINETIC_ENGINE_VARIATION_EXAMPLES = [
  variation("clean-pull", [
    "apparatus:barbell",
    "tempo:explosive",
    "load-behavior:ballistic",
    "training-intent:power",
  ]),
  variation("kettlebell-swing", [
    "tempo:explosive",
    "load-behavior:ballistic",
    "training-intent:power",
  ]),
  variation("turkish-get-up", [
    "apparatus:kettlebell",
    "load-behavior:skill-complex",
    "training-intent:stability",
  ]),
  variation("bottoms-up-press", [
    "apparatus:kettlebell",
    "load-behavior:skill-complex",
    "training-intent:stability",
  ]),
];

export const EXPANDED_MOVEMENT_EXAMPLE_GROUPS = [
  {
    title: "Chest Press",
    description: "Horizontal pressing generated from one core movement.",
    examples: CHEST_PRESS_VARIATION_EXAMPLES,
  },
  {
    title: "Rows",
    description: "Horizontal pulling variations across apparatus and tempo.",
    examples: ROW_VARIATION_EXAMPLES,
  },
  {
    title: "Accessories",
    description: "Isolation and step patterns used in real programming.",
    examples: ACCESSORY_VARIATION_EXAMPLES,
  },
  {
    title: "Kinetic Engine",
    description: "Power, kettlebell, and skill-complex progressions.",
    examples: KINETIC_ENGINE_VARIATION_EXAMPLES,
  },
];

export const NORMALIZED_MOVEMENT_EXAMPLES = [
  ...CHEST_PRESS_VARIATION_EXAMPLES,
  ...ROW_VARIATION_EXAMPLES,
  ...ACCESSORY_VARIATION_EXAMPLES,
  ...KINETIC_ENGINE_VARIATION_EXAMPLES,
];

export const LEGACY_ADAPTED_MOVEMENT_EXAMPLES =
  NORMALIZED_MOVEMENT_EXAMPLES.map((example) =>
    movementVariationToExerciseCatalogItem(example),
  );
