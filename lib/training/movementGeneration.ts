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
  "angle-position",
  "execution-style",
  "direction",
  "stability",
  "tempo",
  "assistance-resistance",
  "range-of-motion",
  "load-behavior",
]);

const labelCategoryOrder: ExerciseModifierCategoryId[] = [
  "tempo",
  "assistance-resistance",
  "range-of-motion",
  "execution-style",
  "angle-position",
  "limb-usage",
  "direction",
  "stability",
  "apparatus",
  "load-behavior",
  "training-intent",
];

const toSlug = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const compactUnique = <T>(items: T[]) => Array.from(new Set(items));

const canonicalizeMovementModifierId = (
  modifierId: ExerciseModifierId,
): ExerciseModifierId => {
  if (
    modifierId === "apparatus:suspension" ||
    modifierId === ("apparatus:suspension-trainer" as ExerciseModifierId) ||
    modifierId === ("apparatus:suspension-training" as ExerciseModifierId)
  ) {
    return "apparatus:trx";
  }
  if (modifierId === "apparatus:stability-ball") return modifierId;
  if (
    modifierId === ("apparatus:ez-curl-bar" as ExerciseModifierId) ||
    modifierId === ("apparatus:curl-bar" as ExerciseModifierId)
  ) {
    return "apparatus:ez-bar";
  }
  if (
    modifierId === ("apparatus:safety-squat-bar" as ExerciseModifierId) ||
    modifierId === ("apparatus:ssb" as ExerciseModifierId)
  ) {
    return "apparatus:safety-bar";
  }
  if (modifierId === ("apparatus:dead-ball" as ExerciseModifierId)) {
    return "apparatus:slam-ball";
  }
  if (modifierId === ("apparatus:sand-bag" as ExerciseModifierId)) {
    return "apparatus:sandbag";
  }
  if (
    modifierId === ("apparatus:slider" as ExerciseModifierId) ||
    modifierId === ("apparatus:glider" as ExerciseModifierId) ||
    modifierId === ("apparatus:gliders" as ExerciseModifierId) ||
    modifierId === ("apparatus:furniture-slider" as ExerciseModifierId) ||
    modifierId === ("apparatus:furniture-sliders" as ExerciseModifierId)
  ) {
    return "apparatus:sliders";
  }
  if (
    modifierId === ("apparatus:plate" as ExerciseModifierId) ||
    modifierId === ("apparatus:olympic-plate" as ExerciseModifierId) ||
    modifierId === ("apparatus:iron-plate" as ExerciseModifierId) ||
    modifierId === ("apparatus:bumper-plate" as ExerciseModifierId)
  ) {
    return "apparatus:weight-plate";
  }
  if (modifierId === ("stability:single-leg" as ExerciseModifierId)) {
    return "limb-usage:single-leg";
  }
  if (modifierId === "limb-usage:bilateral") {
    return modifierId;
  }
  if (modifierId === "limb-usage:unilateral") {
    return "execution-style:unilateral";
  }
  if (modifierId === "limb-usage:alternating") {
    return "execution-style:alternating";
  }
  if (modifierId === "limb-usage:single-arm") {
    return "execution-style:unilateral";
  }
  if (modifierId === "limb-usage:single-leg") {
    return "limb-usage:single-leg";
  }
  if (modifierId === "limb-usage:offset") {
    return modifierId;
  }
  if (modifierId === "limb-usage:sumo-stance") {
    return "limb-usage:wide-stance";
  }
  if (modifierId === ("execution-style:contralateral" as ExerciseModifierId)) {
    return "assistance-resistance:contralateral";
  }
  if (modifierId === ("execution-style:ipsilateral" as ExerciseModifierId)) {
    return "assistance-resistance:ipsilateral";
  }
  if (modifierId === ("execution-style:single-leg" as ExerciseModifierId)) {
    return "limb-usage:single-leg";
  }
  if (modifierId === ("stability:chaotic" as ExerciseModifierId)) {
    return "assistance-resistance:chaotic";
  }
  if (
    modifierId === ("range-of-motion:partial-rom" as ExerciseModifierId) ||
    modifierId === ("range-of-motion:extended-rom" as ExerciseModifierId)
  ) {
    return "range-of-motion:full-rom";
  }
  if (
    modifierId === ("range-of-motion:limited-rom" as ExerciseModifierId) ||
    modifierId === ("range-of-motion:box-rom" as ExerciseModifierId) ||
    modifierId === ("range-of-motion:box-rom-modifier" as ExerciseModifierId) ||
    modifierId === ("range-of-motion:pin-press" as ExerciseModifierId) ||
    modifierId === ("range-of-motion:rack-pull" as ExerciseModifierId) ||
    modifierId === ("range-of-motion:block-pull" as ExerciseModifierId)
  ) {
    return "range-of-motion:rom-limiter";
  }
  return modifierId;
};

const getKnownModifiers = (modifierIds: ExerciseModifierId[]) =>
  modifierIds
    .map(canonicalizeMovementModifierId)
    .map((id) => EXERCISE_MODIFIER_BY_ID[id])
    .filter(Boolean) as ExerciseModifier[];

const shouldSkipApparatusDisplay = (
  coreMovement: CoreMovement,
  modifier: ExerciseModifier,
) => {
  if (modifier.categoryId !== "apparatus") return false;

  const coreLabel = coreMovement.label.toLowerCase();
  return coreLabel.includes(modifier.label.toLowerCase());
};

export const normalizeMovementModifierIds = (
  coreMovement: CoreMovement,
  modifierIds: ExerciseModifierId[] = [],
) => {
  const normalized = [...coreMovement.defaultModifierIds];

  modifierIds.forEach((rawModifierId) => {
    const modifierId = canonicalizeMovementModifierId(rawModifierId);
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
  coreMovement: CoreMovement,
  modifier: ExerciseModifier,
  options: MovementLabelOptions,
) => {
  if (modifier.includeInDisplayName === false) return null;
  if (shouldSkipApparatusDisplay(coreMovement, modifier)) return null;
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
    .map((modifier) =>
      getModifierDisplayToken(coreMovement, modifier, labelOptions),
    )
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
