import type {
  ExerciseModifierId,
  ExerciseVariation,
  IntegratedMovement,
  ModifierCategoryId,
} from "../types";
import { EXERCISE_MODIFIER_BY_ID } from "../modifiers/modifierCategories";
import { MOVEMENT_PATTERN_BY_ID } from "../patterns/coreMovementPatterns";

const nameCategoryOrder: ModifierCategoryId[] = [
  "angle",
  "equipment",
  "grip",
  "stance",
  "loadPosition",
  "bodyPosition",
  "structure",
  "tempo",
  "rom",
  "stability",
  "athleticIntent",
];

const unique = <T,>(items: T[]) => Array.from(new Set(items));

export const getVariationModifierIds = (
  variation: ExerciseVariation | IntegratedMovement,
  selectedModifierIds: ExerciseModifierId[] = [],
) =>
  unique([
    ...variation.requiredModifierIds,
    ...(variation.requiredModifierOptions || []).flatMap(
      (option) => option.anyOf[0] || [],
    ),
    ...selectedModifierIds,
  ]);

export const generateExerciseName = (
  variation: ExerciseVariation | IntegratedMovement,
  selectedModifierIds: ExerciseModifierId[] = [],
) => {
  if (!selectedModifierIds.length) return variation.displayName;

  const patternLabel =
    MOVEMENT_PATTERN_BY_ID[variation.primaryPatternId]?.label ||
    variation.primaryPatternId;
  const modifierIds = getVariationModifierIds(variation, selectedModifierIds);
  const labels = nameCategoryOrder
    .flatMap((categoryId) =>
      modifierIds
        .map((modifierId) => EXERCISE_MODIFIER_BY_ID[modifierId])
        .filter(
          (modifier) =>
            modifier?.categoryId === categoryId &&
            modifier.includeInGeneratedName !== false,
        )
        .map((modifier) => modifier.shortLabel || modifier.label),
    )
    .filter((label) => label !== patternLabel);

  return unique([...labels, patternLabel]).join(" ").trim();
};
