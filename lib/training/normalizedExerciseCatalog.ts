import type {
  ApparatusId,
  CoreMovementId,
  ExerciseCatalogItem,
  ExerciseModifierCategoryId,
  ExerciseModifierId,
  MovementPatternId,
} from "@/types";
import { exerciseLibrary, getExerciseImage } from "./exerciseLibrary";
import {
  CORE_MOVEMENT_PATTERN_CARD_DEFINITIONS,
  coreMovementPatternCardToExercise,
  getCoreMovementPatternSemanticVariations,
  getCoreMovementPatternVariationNames,
  type CoreMovementPatternCardDefinition,
  type CoreMovementSemanticVariation,
} from "./coreMovementPatternCards";
import {
  type ExerciseVariationValidationResult,
  validateExerciseVariation,
} from "./movementCompatibility";
import {
  CORE_MOVEMENT_BY_ID,
  EXERCISE_MODIFIER_BY_ID,
  MOVEMENT_PATTERN_BY_ID,
} from "./movementTaxonomy";
import {
  type LegacyExerciseMappingReport,
  type LegacyExerciseMovementMapping,
  getLegacyExerciseMappingReport,
  mapLegacyExerciseToMovement,
} from "./legacyExerciseMapping";

export type NormalizedExerciseCatalogSource = "legacy-mapped" | "core-pattern";

export type NormalizedExerciseCatalogItem = {
  id: string;
  legacyExerciseId: string;
  legacyExerciseName: string;
  source: NormalizedExerciseCatalogSource;
  legacyExercise: ExerciseCatalogItem;
  mapping: LegacyExerciseMovementMapping;
  coreMovementId: CoreMovementId;
  coreMovementLabel: string;
  movementPatternId: MovementPatternId;
  movementPatternLabel: string;
  semanticVariationNames: string[];
  semanticVariations: CoreMovementSemanticVariation[];
  apparatus: ApparatusId | null;
  modifierIds: ExerciseModifierId[];
  modifiersByCategory: Partial<
    Record<ExerciseModifierCategoryId, ExerciseModifierId[]>
  >;
  compatibility: ExerciseVariationValidationResult;
  confidenceScore: number;
  confidence: LegacyExerciseMovementMapping["confidence"];
  familyId: string;
  familyLabel: string;
  searchTokens: string[];
  notes: string[];
  warnings: string[];
};

export type LegacyExerciseWithNormalizedMetadata = {
  legacyExercise: ExerciseCatalogItem;
  mapping: LegacyExerciseMovementMapping;
  normalizedItem: NormalizedExerciseCatalogItem | null;
  compatibility: ExerciseVariationValidationResult | null;
  isValidNormalizedItem: boolean;
  fallbackExercise: ExerciseCatalogItem;
};

export type NormalizedExerciseCatalogFamily = {
  familyId: string;
  familyLabel: string;
  coreMovementId: CoreMovementId;
  movementPatternId: MovementPatternId;
  apparatuses: ApparatusId[];
  modifierIds: ExerciseModifierId[];
  legacyExerciseNames: string[];
  items: NormalizedExerciseCatalogItem[];
};

export type NormalizedExerciseCatalogFilterOptions = {
  coreMovements: Array<{ id: CoreMovementId; label: string; count: number }>;
  movementPatterns: Array<{ id: MovementPatternId; label: string; count: number }>;
  apparatus: Array<{ id: ApparatusId; label: string; count: number }>;
  modifierCategories: Array<{
    id: ExerciseModifierCategoryId;
    label: string;
    count: number;
  }>;
  modifiers: Array<{ id: ExerciseModifierId; label: string; count: number }>;
  bodyRegions: Array<{ id: string; label: string; count: number }>;
  goals: Array<{ id: string; label: string; count: number }>;
  levels: Array<{ id: string; label: string; count: number }>;
};

export type NormalizedExerciseCatalogReport = {
  totalItems: number;
  validItems: number;
  invalidItems: number;
  lowConfidenceMappings: number;
  duplicateSimilarGroups: number;
  fallbackItems: number;
  invalid: LegacyExerciseWithNormalizedMetadata[];
  lowConfidence: LegacyExerciseWithNormalizedMetadata[];
  duplicateSimilar: LegacyExerciseMappingReport["duplicateOrSimilar"];
};

export type NormalizedExerciseCatalog = {
  legacyWithNormalizedMetadata: LegacyExerciseWithNormalizedMetadata[];
  items: NormalizedExerciseCatalogItem[];
  families: NormalizedExerciseCatalogFamily[];
  filterOptions: NormalizedExerciseCatalogFilterOptions;
  report: NormalizedExerciseCatalogReport;
};

const normalize = (value: string) => value.trim().toLowerCase();

const normalizeKey = (value: string) =>
  normalize(value)
    .replace(/\bdb\b/g, "dumbbell")
    .replace(/\bbb\b/g, "barbell")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const unique = <T,>(items: T[]) => Array.from(new Set(items));

const singleSelectionCategories = new Set<ExerciseModifierCategoryId>([
  "apparatus",
  "angle-position",
  "limb-usage",
  "execution-style",
  "direction",
  "stability",
  "tempo",
  "assistance-resistance",
  "range-of-motion",
  "load-behavior",
]);

const sortByLabel = <T extends { label: string }>(left: T, right: T) =>
  left.label.localeCompare(right.label);

const compactSearchTokens = (tokens: string[]) =>
  unique(tokens.map(normalize).filter(Boolean)).sort();

const toCountOptions = <TId extends string>(
  counts: Map<TId, number>,
  getLabel: (id: TId) => string,
) =>
  Array.from(counts.entries())
    .map(([id, count]) => ({
      id,
      label: getLabel(id),
      count,
    }))
    .sort(sortByLabel);

const increment = <TId extends string>(counts: Map<TId, number>, id: TId) => {
  counts.set(id, (counts.get(id) || 0) + 1);
};

const getFamilyId = (
  coreMovementId: CoreMovementId,
  movementPatternId: MovementPatternId,
) => normalizeKey(`${coreMovementId}-${movementPatternId}`);

const getFamilyLabel = (
  coreMovementId: CoreMovementId,
  movementPatternId: MovementPatternId,
) => {
  const coreMovementLabel =
    CORE_MOVEMENT_BY_ID[coreMovementId]?.label || coreMovementId;
  const movementPatternLabel =
    MOVEMENT_PATTERN_BY_ID[movementPatternId]?.label || movementPatternId;

  return `${coreMovementLabel} / ${movementPatternLabel}`;
};

const getFallbackExercise = (exercise: ExerciseCatalogItem) => ({
  ...exercise,
  image: exercise.image || getExerciseImage(exercise.body, exercise.id),
});

const getModifierCategoryLabel = (categoryId: ExerciseModifierCategoryId) =>
  categoryId
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const getModifierSearchTokens = (modifierId: ExerciseModifierId) => {
  const modifier = EXERCISE_MODIFIER_BY_ID[modifierId];

  return modifier ? [modifier.label, ...(modifier.aliases || [])] : [modifierId];
};

const groupModifierIdsByCategory = (modifierIds: ExerciseModifierId[]) =>
  modifierIds.reduce<
    Partial<Record<ExerciseModifierCategoryId, ExerciseModifierId[]>>
  >((groups, modifierId) => {
    const modifier = EXERCISE_MODIFIER_BY_ID[modifierId];
    if (!modifier) return groups;

    groups[modifier.categoryId] = [
      ...(groups[modifier.categoryId] || []),
      modifierId,
    ];

    return groups;
  }, {});

const normalizeSingleSelectionModifierIds = (
  modifierIds: ExerciseModifierId[],
) => {
  const normalized: ExerciseModifierId[] = [];

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

  return unique(normalized);
};

const getPrimaryApparatusFromModifierIds = (
  modifierIds: ExerciseModifierId[],
): ApparatusId | null => {
  for (const modifierId of modifierIds) {
    const modifier = EXERCISE_MODIFIER_BY_ID[modifierId];
    if (
      modifier?.categoryId === "apparatus" &&
      "apparatusId" in modifier &&
      modifier.apparatusId
    ) {
      return modifier.apparatusId as ApparatusId;
    }
  }

  return null;
};

const getApparatusIdsFromModifierIds = (
  modifierIds: ExerciseModifierId[],
): ApparatusId[] =>
  unique(
    modifierIds
      .map((modifierId) => EXERCISE_MODIFIER_BY_ID[modifierId])
      .filter((modifier) => modifier?.categoryId === "apparatus")
      .map((modifier) => modifier.slug as ApparatusId),
  );

const getFilterApparatusIdsForItem = (
  item: NormalizedExerciseCatalogItem,
): ApparatusId[] =>
  unique([
    ...(item.apparatus ? [item.apparatus] : []),
    ...getApparatusIdsFromModifierIds(item.modifierIds),
    ...item.semanticVariations.flatMap((variation) =>
      getApparatusIdsFromModifierIds([
        ...variation.modifierIds,
        ...variation.allowedApparatusIds,
      ]),
    ),
  ]);

const getCorePatternCardDedupKey = (
  definition: CoreMovementPatternCardDefinition,
) =>
  normalizeKey(
    [
      definition.category,
      definition.movementPatternId,
      definition.name,
    ].join("-"),
  );

const getDedupedCorePatternDefinitions = () => {
  const seen = new Set<string>();

  return CORE_MOVEMENT_PATTERN_CARD_DEFINITIONS.filter((definition) => {
    const key = getCorePatternCardDedupKey(definition);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const createCoreMovementPatternItem = (
  definition: CoreMovementPatternCardDefinition,
): NormalizedExerciseCatalogItem => {
  const legacyExercise = coreMovementPatternCardToExercise(definition);
  const modifierIds = normalizeSingleSelectionModifierIds(definition.modifierIds);
  const modifiersByCategory = groupModifierIdsByCategory(modifierIds);
  const apparatus = getPrimaryApparatusFromModifierIds(modifierIds);
  const coreMovement = CORE_MOVEMENT_BY_ID[definition.coreMovementId];
  const movementPattern = MOVEMENT_PATTERN_BY_ID[definition.movementPatternId];
  const semanticVariationNames = getCoreMovementPatternVariationNames(
    definition.id,
  );
  const semanticVariations = getCoreMovementPatternSemanticVariations(
    definition.id,
  );
  const compatibility = validateExerciseVariation({
    coreMovementId: definition.coreMovementId,
    movementPatternId: definition.movementPatternId,
    modifierIds,
    primaryApparatusId: apparatus,
  });
  const mapping: LegacyExerciseMovementMapping = {
    legacyId: legacyExercise.id,
    legacyName: legacyExercise.name,
    legacyPattern: legacyExercise.pattern,
    legacyEquipment: legacyExercise.equipment,
    coreMovementId: definition.coreMovementId,
    movementPatternId: definition.movementPatternId,
    apparatus,
    modifierIds,
    modifiersByCategory,
    confidenceScore: 1,
    confidence: "high",
    notes: [`Core movement card: ${definition.category}`, definition.description],
    warnings: compatibility.isValid
      ? []
      : compatibility.issues.map((issue) => issue.message),
  };

  return {
    id: normalizeKey(["normalized", definition.id].join("-")),
    legacyExerciseId: legacyExercise.id,
    legacyExerciseName: legacyExercise.name,
    source: "core-pattern",
    legacyExercise,
    mapping,
    coreMovementId: definition.coreMovementId,
    coreMovementLabel: coreMovement?.label || definition.name,
    movementPatternId: definition.movementPatternId,
    movementPatternLabel: movementPattern?.label || definition.name,
    semanticVariationNames,
    semanticVariations,
    apparatus,
    modifierIds,
    modifiersByCategory,
    compatibility,
    confidenceScore: 1,
    confidence: "high",
    familyId: getFamilyId(definition.coreMovementId, definition.movementPatternId),
    familyLabel: `${definition.name} / ${definition.category}`,
    searchTokens: compactSearchTokens([
      legacyExercise.name,
      legacyExercise.body,
      legacyExercise.muscles,
      legacyExercise.pattern,
      legacyExercise.goal,
      legacyExercise.equipment,
      definition.category,
      definition.description,
      coreMovement?.label || "",
      ...(coreMovement?.aliases || []),
      movementPattern?.label || "",
      ...(movementPattern ? [movementPattern.description] : []),
      ...semanticVariationNames,
      ...semanticVariations.flatMap((variation) => [
        ...variation.aliases,
        ...variation.modifierIds.flatMap(getModifierSearchTokens),
        ...variation.allowedApparatusIds.flatMap(getModifierSearchTokens),
      ]),
      ...definition.aliases,
      ...modifierIds.flatMap(getModifierSearchTokens),
      definition.integrated ? "integrated" : "",
    ]),
    notes: mapping.notes,
    warnings: mapping.warnings,
  };
};

export const getCoreMovementPatternCatalogItems = () =>
  getDedupedCorePatternDefinitions().map(createCoreMovementPatternItem);

const getNormalizedCatalogId = (
  legacyExercise: ExerciseCatalogItem,
  mapping: LegacyExerciseMovementMapping,
) =>
  normalizeKey(
    [
      "normalized",
      mapping.coreMovementId || "unmapped",
      mapping.movementPatternId || "no-pattern",
      mapping.apparatus || "no-apparatus",
      legacyExercise.id,
    ].join("-"),
  );

const createNormalizedItem = (
  legacyExercise: ExerciseCatalogItem,
  mapping: LegacyExerciseMovementMapping,
  modifierIds: ExerciseModifierId[],
  compatibility: ExerciseVariationValidationResult,
): NormalizedExerciseCatalogItem | null => {
  if (
    !compatibility.isValid ||
    !mapping.coreMovementId ||
    !mapping.movementPatternId
  ) {
    return null;
  }

  const coreMovement = CORE_MOVEMENT_BY_ID[mapping.coreMovementId];
  const movementPattern = MOVEMENT_PATTERN_BY_ID[mapping.movementPatternId];
  const modifiersByCategory = groupModifierIdsByCategory(modifierIds);
  const modifierLabels = modifierIds.flatMap(getModifierSearchTokens);

  return {
    id: getNormalizedCatalogId(legacyExercise, mapping),
    legacyExerciseId: legacyExercise.id,
    legacyExerciseName: legacyExercise.name,
    source: "legacy-mapped",
    legacyExercise,
    mapping,
    coreMovementId: mapping.coreMovementId,
    coreMovementLabel: coreMovement?.label || mapping.coreMovementId,
    movementPatternId: mapping.movementPatternId,
    movementPatternLabel: movementPattern?.label || mapping.movementPatternId,
    semanticVariationNames: [],
    semanticVariations: [],
    apparatus: mapping.apparatus,
    modifierIds,
    modifiersByCategory,
    compatibility,
    confidenceScore: mapping.confidenceScore,
    confidence: mapping.confidence,
    familyId: getFamilyId(mapping.coreMovementId, mapping.movementPatternId),
    familyLabel: getFamilyLabel(mapping.coreMovementId, mapping.movementPatternId),
    searchTokens: compactSearchTokens([
      legacyExercise.name,
      legacyExercise.body,
      legacyExercise.muscles,
      legacyExercise.pattern,
      legacyExercise.goal,
      legacyExercise.equipment,
      coreMovement?.label || "",
      ...(coreMovement?.aliases || []),
      movementPattern?.label || "",
      ...modifierLabels,
    ]),
    notes: mapping.notes,
    warnings: mapping.warnings,
  };
};

export const attachNormalizedMetadataToLegacyExercise = (
  legacyExercise: ExerciseCatalogItem,
): LegacyExerciseWithNormalizedMetadata => {
  const mapping = mapLegacyExerciseToMovement(legacyExercise);
  const modifierIds = normalizeSingleSelectionModifierIds(mapping.modifierIds);
  const compatibility =
    mapping.coreMovementId && mapping.movementPatternId
      ? validateExerciseVariation({
          coreMovementId: mapping.coreMovementId,
          movementPatternId: mapping.movementPatternId,
          modifierIds,
          primaryApparatusId: mapping.apparatus,
        })
      : null;
  const normalizedItem = compatibility
    ? createNormalizedItem(legacyExercise, mapping, modifierIds, compatibility)
    : null;

  return {
    legacyExercise,
    mapping,
    normalizedItem,
    compatibility,
    isValidNormalizedItem: Boolean(normalizedItem),
    fallbackExercise: getFallbackExercise(legacyExercise),
  };
};

export const getLegacyExercisesWithNormalizedMetadata = (
  exercises: ExerciseCatalogItem[] = exerciseLibrary,
) => exercises.map(attachNormalizedMetadataToLegacyExercise);

export const normalizedCatalogItemToExercise = (
  item: NormalizedExerciseCatalogItem,
): ExerciseCatalogItem => ({
  ...item.legacyExercise,
  id: item.legacyExercise.id,
  name: item.legacyExercise.name,
  body: item.legacyExercise.body || CORE_MOVEMENT_BY_ID[item.coreMovementId]?.bodyRegion || "",
  muscles:
    item.legacyExercise.muscles ||
    CORE_MOVEMENT_BY_ID[item.coreMovementId]?.primaryMuscles.join(" • ") ||
    "",
  pattern: item.legacyExercise.pattern || item.movementPatternLabel,
  goal: item.legacyExercise.goal,
  equipment: item.legacyExercise.equipment,
  level: item.legacyExercise.level,
  image:
    item.legacyExercise.image ||
    getExerciseImage(item.legacyExercise.body, item.legacyExercise.id),
  cue:
    item.legacyExercise.cue ||
    CORE_MOVEMENT_BY_ID[item.coreMovementId]?.defaultCue ||
    "",
});

export const normalizedCatalogItemsToExercises = (
  items: NormalizedExerciseCatalogItem[],
) => items.map(normalizedCatalogItemToExercise);

const groupNormalizedCatalogItems = (
  items: NormalizedExerciseCatalogItem[],
): NormalizedExerciseCatalogFamily[] => {
  const families = items.reduce<Record<string, NormalizedExerciseCatalogItem[]>>(
    (acc, item) => {
      acc[item.familyId] = [...(acc[item.familyId] || []), item];
      return acc;
    },
    {},
  );

  return Object.entries(families)
    .map(([, familyItems]) => {
      const sortedItems = [...familyItems].sort((left, right) =>
        left.legacyExerciseName.localeCompare(right.legacyExerciseName),
      );
      const first = sortedItems[0];

      return {
        familyId: first.familyId,
        familyLabel: first.familyLabel,
        coreMovementId: first.coreMovementId,
        movementPatternId: first.movementPatternId,
        apparatuses: unique(
          sortedItems
            .map((item) => item.apparatus)
            .filter(Boolean) as ApparatusId[],
        ).sort(),
        modifierIds: unique(sortedItems.flatMap((item) => item.modifierIds)).sort(),
        legacyExerciseNames: sortedItems.map((item) => item.legacyExerciseName),
        items: sortedItems,
      };
    })
    .sort((left, right) => left.familyLabel.localeCompare(right.familyLabel));
};

const createFilterOptions = (
  items: NormalizedExerciseCatalogItem[],
): NormalizedExerciseCatalogFilterOptions => {
  const coreMovementCounts = new Map<CoreMovementId, number>();
  const movementPatternCounts = new Map<MovementPatternId, number>();
  const apparatusCounts = new Map<ApparatusId, number>();
  const modifierCategoryCounts = new Map<ExerciseModifierCategoryId, number>();
  const modifierCounts = new Map<ExerciseModifierId, number>();
  const bodyRegionCounts = new Map<string, number>();
  const goalCounts = new Map<string, number>();
  const levelCounts = new Map<string, number>();

  items.forEach((item) => {
    increment(coreMovementCounts, item.coreMovementId);
    increment(movementPatternCounts, item.movementPatternId);
    getFilterApparatusIdsForItem(item).forEach((apparatusId) =>
      increment(apparatusCounts, apparatusId),
    );
    increment(bodyRegionCounts, item.legacyExercise.body);
    increment(goalCounts, item.legacyExercise.goal);
    increment(levelCounts, item.legacyExercise.level);

    item.modifierIds.forEach((modifierId) => {
      const modifier = EXERCISE_MODIFIER_BY_ID[modifierId];
      if (!modifier) return;

      increment(modifierCounts, modifierId);
      increment(modifierCategoryCounts, modifier.categoryId);
    });
  });

  return {
    coreMovements: toCountOptions(
      coreMovementCounts,
      (id) => CORE_MOVEMENT_BY_ID[id]?.label || id,
    ),
    movementPatterns: toCountOptions(
      movementPatternCounts,
      (id) => MOVEMENT_PATTERN_BY_ID[id]?.label || id,
    ),
    apparatus: toCountOptions(
      apparatusCounts,
      (id) => EXERCISE_MODIFIER_BY_ID[`apparatus:${id}`]?.label || id,
    ),
    modifierCategories: toCountOptions(
      modifierCategoryCounts,
      getModifierCategoryLabel,
    ),
    modifiers: toCountOptions(
      modifierCounts,
      (id) => EXERCISE_MODIFIER_BY_ID[id]?.label || id,
    ),
    bodyRegions: toCountOptions(bodyRegionCounts, (id) => id),
    goals: toCountOptions(goalCounts, (id) => id),
    levels: toCountOptions(levelCounts, (id) => id),
  };
};

const createCatalogReport = (
  entries: LegacyExerciseWithNormalizedMetadata[],
  mappingReport: LegacyExerciseMappingReport,
): NormalizedExerciseCatalogReport => {
  const invalid = entries.filter((entry) => !entry.isValidNormalizedItem);
  const lowConfidence = entries.filter(
    (entry) =>
      entry.mapping.confidence === "low" || entry.mapping.confidence === "unmapped",
  );

  return {
    totalItems: entries.length,
    validItems: entries.filter((entry) => entry.isValidNormalizedItem).length,
    invalidItems: invalid.length,
    lowConfidenceMappings: lowConfidence.length,
    duplicateSimilarGroups: mappingReport.duplicateOrSimilar.length,
    fallbackItems: invalid.length,
    invalid,
    lowConfidence,
    duplicateSimilar: mappingReport.duplicateOrSimilar,
  };
};

export const getNormalizedExerciseCatalog = (
  exercises: ExerciseCatalogItem[] = exerciseLibrary,
): NormalizedExerciseCatalog => {
  const corePatternItems = getCoreMovementPatternCatalogItems();
  const legacyWithNormalizedMetadata =
    getLegacyExercisesWithNormalizedMetadata(exercises);
  const legacyItems = legacyWithNormalizedMetadata
    .map((entry) => entry.normalizedItem)
    .filter(Boolean) as NormalizedExerciseCatalogItem[];
  const items = [...corePatternItems, ...legacyItems];
  const mappingReport = getLegacyExerciseMappingReport(exercises);

  return {
    legacyWithNormalizedMetadata,
    items,
    families: groupNormalizedCatalogItems(items),
    filterOptions: createFilterOptions(items),
    report: createCatalogReport(legacyWithNormalizedMetadata, mappingReport),
  };
};

export const getCompatibilityValidatedNormalizedCatalogItems = (
  exercises: ExerciseCatalogItem[] = exerciseLibrary,
) => getNormalizedExerciseCatalog(exercises).items;

export const getNormalizedExerciseCatalogFamilies = (
  exercises: ExerciseCatalogItem[] = exerciseLibrary,
) => getNormalizedExerciseCatalog(exercises).families;

export const getNormalizedExerciseCatalogFilterOptions = (
  exercises: ExerciseCatalogItem[] = exerciseLibrary,
) => getNormalizedExerciseCatalog(exercises).filterOptions;

export const getNormalizedExerciseCatalogReport = (
  exercises: ExerciseCatalogItem[] = exerciseLibrary,
) => getNormalizedExerciseCatalog(exercises).report;

export const getExerciseCatalogWithLegacyFallback = (
  exercises: ExerciseCatalogItem[] = exerciseLibrary,
) => {
  const catalog = getNormalizedExerciseCatalog(exercises);
  const corePatternExercises = catalog.items
    .filter((item) => item.source === "core-pattern")
    .map(normalizedCatalogItemToExercise);
  const legacyExercises = catalog.legacyWithNormalizedMetadata.map((entry) =>
    entry.normalizedItem
      ? normalizedCatalogItemToExercise(entry.normalizedItem)
      : entry.fallbackExercise,
  );

  return [...corePatternExercises, ...legacyExercises];
};
