import type {
  CoreMovement,
  CoreMovementId,
  ExerciseCatalogItem,
  ExerciseModifierId,
  ExerciseVariation,
  LegacyExerciseMovementCandidate,
} from "@/types";
import {
  ALL_EXERCISE_MODIFIERS,
  APPARATUS_MODIFIERS,
  CORE_MOVEMENTS,
  CORE_MOVEMENT_BY_ID,
  EXERCISE_MODIFIER_BY_ID,
  MOVEMENT_PATTERN_BY_ID,
} from "./movementTaxonomy";

const defaultMovementImage =
  "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?q=80&w=900";

const legacyMuscleSeparator = " • ";

const titleCase = (value: string) =>
  value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const normalizeText = (value: string) => value.trim().toLowerCase();

const getOptionalShortLabel = (modifier: object) =>
  "shortLabel" in modifier && typeof modifier.shortLabel === "string"
    ? modifier.shortLabel
    : "";

const getOptionalAliases = (modifier: object) =>
  "aliases" in modifier && Array.isArray(modifier.aliases)
    ? modifier.aliases
    : [];

const getOptionalDisplayPrefix = (modifier: object) =>
  "displayPrefix" in modifier && typeof modifier.displayPrefix === "string"
    ? modifier.displayPrefix
    : "";

const getLegacyGoal = (variation: ExerciseVariation) => {
  const intent = variation.intentIds[0];
  return intent ? titleCase(intent) : "Strength";
};

const getLegacyEquipment = (variation: ExerciseVariation) => {
  if (!variation.primaryApparatusId) return "Bodyweight";

  const modifier =
    EXERCISE_MODIFIER_BY_ID[`apparatus:${variation.primaryApparatusId}`];

  return modifier?.label || titleCase(variation.primaryApparatusId);
};

export const movementVariationToExerciseCatalogItem = (
  variation: ExerciseVariation,
  overrides: Partial<ExerciseCatalogItem> = {},
): ExerciseCatalogItem => {
  const coreMovement = CORE_MOVEMENT_BY_ID[variation.coreMovementId];
  const pattern = MOVEMENT_PATTERN_BY_ID[variation.movementPatternId];

  return {
    id: variation.id,
    name: variation.displayName,
    body: variation.bodyRegion,
    muscles: [
      ...variation.primaryMuscles,
      ...variation.secondaryMuscles,
    ].join(legacyMuscleSeparator),
    pattern: pattern.legacyPattern,
    goal: getLegacyGoal(variation),
    equipment: getLegacyEquipment(variation),
    level: coreMovement.defaultLevel,
    image: defaultMovementImage,
    cue: variation.cue,
    ...overrides,
  };
};

const findCoreMovementForLegacyExercise = (
  exercise: ExerciseCatalogItem,
): CoreMovement | null => {
  const haystack = normalizeText(
    `${exercise.name} ${exercise.body} ${exercise.pattern} ${exercise.muscles}`,
  );

  return (
    CORE_MOVEMENTS.find((movement) => {
      const labels = [movement.label, ...movement.aliases].map(normalizeText);
      return labels.some((label) => haystack.includes(label));
    }) ||
    CORE_MOVEMENTS.find((movement) => {
      const pattern = MOVEMENT_PATTERN_BY_ID[movement.patternId];
      return (
        normalizeText(pattern.legacyPattern) === normalizeText(exercise.pattern)
      );
    }) ||
    null
  );
};

const inferModifierIdsFromLegacyExercise = (
  exercise: ExerciseCatalogItem,
): ExerciseModifierId[] => {
  const haystack = normalizeText(
    `${exercise.name} ${exercise.equipment} ${exercise.goal} ${exercise.level}`,
  );
  const modifierIds: ExerciseModifierId[] = [];

  APPARATUS_MODIFIERS.forEach((modifier) => {
    const labels = [
      modifier.slug,
      modifier.label,
      getOptionalShortLabel(modifier),
      ...getOptionalAliases(modifier),
    ]
      .filter(Boolean)
      .map(normalizeText);

    if (labels.some((label) => haystack.includes(label))) {
      modifierIds.push(modifier.id);
    }
  });

  ALL_EXERCISE_MODIFIERS.filter(
    (modifier) => modifier.categoryId !== "apparatus",
  ).forEach((modifier) => {
    const labels = [
      modifier.slug,
      modifier.label,
      getOptionalDisplayPrefix(modifier),
      ...getOptionalAliases(modifier),
    ]
      .filter(Boolean)
      .map(normalizeText);

    if (labels.some((label) => haystack.includes(label))) {
      modifierIds.push(modifier.id);
    }
  });

  if (
    ["single-arm", "1-arm", "one arm", "single-leg", "single leg"].some(
      (token) => haystack.includes(token),
    )
  ) {
    modifierIds.push("execution-style:unilateral");
  }

  return Array.from(new Set(modifierIds));
};

export const inferMovementCandidateFromLegacyExercise = (
  exercise: ExerciseCatalogItem,
): LegacyExerciseMovementCandidate => {
  const coreMovement = findCoreMovementForLegacyExercise(exercise);
  const modifierIds = inferModifierIdsFromLegacyExercise(exercise);
  const notes: string[] = [];

  if (!coreMovement) {
    notes.push("No confident core movement match found from name or pattern.");
  }

  if (!modifierIds.some((id) => id.startsWith("apparatus:"))) {
    notes.push("No apparatus modifier inferred from equipment or name.");
  }

  const confidence = coreMovement
    ? modifierIds.some((id) => id.startsWith("apparatus:"))
      ? "high"
      : "medium"
    : "low";

  return {
    exercise,
    coreMovementId: (coreMovement?.id || null) as CoreMovementId | null,
    modifierIds,
    confidence,
    notes,
  };
};

export const inferMovementCandidatesFromLegacyLibrary = (
  exercises: ExerciseCatalogItem[],
) => exercises.map(inferMovementCandidateFromLegacyExercise);
