import type {
  ApparatusId,
  CoreMovement,
  CoreMovementId,
  ExerciseModifier,
  ExerciseModifierCategoryId,
  ExerciseModifierId,
  ExerciseVariation,
  TrainingIntentId,
} from "@/types";
import {
  CORE_MOVEMENT_BY_ID,
  EXERCISE_MODIFIER_BY_ID,
} from "./movementTaxonomy";

export type MovementVariationInput = {
  coreMovementId: CoreMovementId;
  modifierIds?: ExerciseModifierId[];
  cue?: string;
  source?: ExerciseVariation["source"];
};

export type MovementLabelOptions = {
  apparatusLabel?: "short" | "full";
  includeTrainingIntent?: boolean;
};

const singleSelectionCategories = new Set<ExerciseModifierCategoryId>([
  "apparatus",
  "angle-position",
  "limb-usage",
  "stability",
  "tempo",
  "assistance-resistance",
  "range-of-motion",
]);

const labelCategoryOrder: ExerciseModifierCategoryId[] = [
  "tempo",
  "assistance-resistance",
  "range-of-motion",
  "angle-position",
  "limb-usage",
  "stability",
  "apparatus",
  "training-intent",
];

const toSlug = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const compactUnique = <T>(items: T[]) => Array.from(new Set(items));

const getKnownModifiers = (modifierIds: ExerciseModifierId[]) =>
  modifierIds
    .map((id) => EXERCISE_MODIFIER_BY_ID[id])
    .filter(Boolean) as ExerciseModifier[];

export const normalizeMovementModifierIds = (
  coreMovement: CoreMovement,
  modifierIds: ExerciseModifierId[] = [],
) => {
  const normalized = [...coreMovement.defaultModifierIds];

  modifierIds.forEach((modifierId) => {
    const modifier = EXERCISE_MODIFIER_BY_ID[modifierId];
    if (!modifier) return;

    if (singleSelectionCategories.has(modifier.categoryId)) {
      const existingIndex = normalized.findIndex(
        (id) =>
          EXERCISE_MODIFIER_BY_ID[id]?.categoryId === modifier.categoryId,
      );

      if (existingIndex >= 0) normalized.splice(existingIndex, 1);
    }

    normalized.push(modifierId);
  });

  return compactUnique(normalized);
};

export const getModifiersByDisplayOrder = (
  modifierIds: ExerciseModifierId[],
) => {
  return getKnownModifiers(modifierIds).sort((a, b) => {
    const categoryDiff =
      labelCategoryOrder.indexOf(a.categoryId) -
      labelCategoryOrder.indexOf(b.categoryId);

    if (categoryDiff !== 0) return categoryDiff;
    return a.displayOrder - b.displayOrder;
  });
};

const getModifierDisplayToken = (
  modifier: ExerciseModifier,
  options: MovementLabelOptions,
) => {
  if (modifier.includeInDisplayName === false) return null;
  if (modifier.categoryId === "training-intent" && !options.includeTrainingIntent) {
    return null;
  }
  if (
    modifier.categoryId === "apparatus" &&
    options.apparatusLabel === "short" &&
    modifier.shortLabel
  ) {
    return modifier.shortLabel;
  }

  return modifier.displayPrefix || modifier.label;
};

export const generateMovementLabel = (
  coreMovement: CoreMovement,
  modifierIds: ExerciseModifierId[],
  options: MovementLabelOptions = {},
) => {
  const labelOptions = {
    apparatusLabel: "short",
    includeTrainingIntent: false,
    ...options,
  } satisfies Required<MovementLabelOptions>;

  const tokens = getModifiersByDisplayOrder(modifierIds)
    .map((modifier) => getModifierDisplayToken(modifier, labelOptions))
    .filter(Boolean) as string[];

  return compactUnique([...tokens, coreMovement.label]).join(" ");
};

export const getVariationModifierIdsByCategory = (
  variation: ExerciseVariation,
  categoryId: ExerciseModifierCategoryId,
) =>
  variation.modifierIds.filter(
    (id) => EXERCISE_MODIFIER_BY_ID[id]?.categoryId === categoryId,
  );

export const getPrimaryApparatusId = (
  modifierIds: ExerciseModifierId[],
): ApparatusId | null => {
  const apparatusModifier = getKnownModifiers(modifierIds).find(
    (modifier) => modifier.categoryId === "apparatus",
  );

  if (!apparatusModifier) return null;
  return apparatusModifier.slug as ApparatusId;
};

export const getVariationIntentIds = (
  coreMovement: CoreMovement,
  modifierIds: ExerciseModifierId[],
) => {
  const intentIds = getKnownModifiers(modifierIds)
    .filter((modifier) => modifier.categoryId === "training-intent")
    .map((modifier) => modifier.slug as TrainingIntentId);

  return intentIds.length > 0 ? intentIds : coreMovement.defaultIntentIds;
};

export const createExerciseVariation = (
  input: MovementVariationInput,
  options: MovementLabelOptions = {},
): ExerciseVariation => {
  const coreMovement = CORE_MOVEMENT_BY_ID[input.coreMovementId];
  if (!coreMovement) {
    throw new Error(`Unknown core movement: ${input.coreMovementId}`);
  }

  const modifierIds = normalizeMovementModifierIds(
    coreMovement,
    input.modifierIds,
  );
  const displayName = generateMovementLabel(coreMovement, modifierIds, options);
  const modifierSearchTokens = getKnownModifiers(modifierIds).flatMap(
    (modifier) => [
      modifier.slug,
      modifier.label,
      modifier.shortLabel || "",
      ...(modifier.aliases || []),
    ],
  );

  return {
    id: `movement-${toSlug(coreMovement.id)}-${modifierIds
      .map((id) => toSlug(id.split(":")[1] || id))
      .join("-")}`,
    coreMovementId: coreMovement.id,
    movementPatternId: coreMovement.patternId,
    modifierIds,
    displayName,
    generatedLabel: displayName,
    searchTokens: compactUnique([
      coreMovement.label,
      ...coreMovement.aliases,
      ...modifierSearchTokens,
    ])
      .filter(Boolean)
      .map((token) => token.toLowerCase()),
    bodyRegion: coreMovement.bodyRegion,
    primaryMuscles: coreMovement.primaryMuscles,
    secondaryMuscles: coreMovement.secondaryMuscles,
    primaryApparatusId: getPrimaryApparatusId(modifierIds),
    intentIds: getVariationIntentIds(coreMovement, modifierIds),
    cue: input.cue || coreMovement.defaultCue,
    source: input.source || "generated",
  };
};
