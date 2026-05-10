import type { ExerciseVariation, IntegratedMovement } from "../types";
import { EXERCISE_ALIASES } from "../aliases/exerciseAliases";
import { EXERCISE_MODIFIER_BY_ID } from "../modifiers/modifierCategories";
import { MOVEMENT_PATTERN_BY_ID } from "../patterns/coreMovementPatterns";
import { EXERCISE_SYSTEM_VARIATIONS } from "../data/catalog";
import { getAllModifierIds, getAllPatternIds } from "../utils/matching";

export type SemanticSearchTarget = {
  id?: string;
  name: string;
  aliases?: string[];
  movementPatterns?: string[];
  modifiers?: string[];
  muscleGroups?: string[];
  tags?: string[];
};

const queryExpansions: Record<string, string[]> = {
  "push up": ["push-up", "pushup", "chest press", "bodyweight floor"],
  pushup: ["push-up", "push up", "chest press", "bodyweight floor"],
  hinge: ["deadlift", "rdl", "romanian deadlift", "swing", "good morning"],
  "anti rotation": ["anti-rotation", "pallof", "renegade row", "suitcase carry"],
  "anti-rotation": ["anti rotation", "pallof", "renegade row", "suitcase carry"],
  "hip rotation": [
    "hip internal rotation",
    "hip external rotation",
    "clamshell",
    "hip ir",
    "hip er",
  ],
  "internal rotation": [
    "hip internal rotation",
    "shoulder internal rotation",
    "rotator cuff",
  ],
  "external rotation": [
    "hip external rotation",
    "shoulder external rotation",
    "rotator cuff",
    "clamshell",
  ],
  tibialis: ["tibialis raise", "tib raise", "toe raise", "shin raise", "ankle dorsiflexion"],
  "tib raise": ["tibialis raise", "toe raise", "shin raise", "ankle dorsiflexion"],
  "ankle dorsiflexion": ["tibialis raise", "tib raise", "toe raise", "shin raise"],
  "lateral raise": ["shoulder abduction", "side raise", "dumbbell lateral raise"],
  "reverse fly": ["rear delt fly", "rear delt raise", "horizontal abduction"],
  "rear delt": ["reverse fly", "rear delt fly", "rear delt raise"],
  "scapular control": ["face pull", "scapular retraction", "scapular protraction"],
  scapular: ["scapular control", "face pull", "scapular retraction"],
  "rotator cuff": [
    "shoulder external rotation",
    "shoulder internal rotation",
    "face pull",
  ],
  bracing: ["breathing bracing", "dead bug breathing", "core brace"],
  breathing: ["breathing bracing", "dead bug breathing", "bracing"],
  neck: ["neck flexion", "neck extension", "neck rotation", "cervical"],
  "neck flexion": ["cervical flexion", "neck"],
  "neck extension": ["cervical extension", "neck"],
  "neck rotation": ["cervical rotation", "neck"],
  cervical: ["neck flexion", "neck extension", "neck rotation"],
  trx: ["suspension trainer", "suspension training", "trx row", "trx push up"],
  suspension: ["trx", "suspension trainer", "suspension training"],
  "suspension trainer": ["trx", "suspension training"],
  "suspension training": ["trx", "suspension trainer"],
};

export const normalizeSemanticText = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[’']/g, "")
    .replace(/[-_/]+/g, " ")
    .replace(/[^a-z0-9\s]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const compact = (items: string[]) =>
  Array.from(new Set(items.map(normalizeSemanticText).filter(Boolean)));

const getAliasTokens = (exerciseId: string) =>
  EXERCISE_ALIASES.filter((alias) => alias.exerciseId === exerciseId).map(
    (alias) => alias.alias,
  );

export const buildSemanticTokensForVariation = (
  variation: ExerciseVariation | IntegratedMovement,
) =>
  compact([
    variation.displayName,
    variation.id,
    ...getAliasTokens(variation.id),
    ...(variation.aliases || []),
    ...getAllPatternIds(variation).map(
      (patternId) => MOVEMENT_PATTERN_BY_ID[patternId]?.label || patternId,
    ),
    ...getAllModifierIds(variation).map(
      (modifierId) => EXERCISE_MODIFIER_BY_ID[modifierId]?.label || modifierId,
    ),
    ...variation.primaryMuscles,
    ...(variation.secondaryMuscles || []),
    ...(variation.semanticTags || []),
  ]);

const variationByNormalizedName = new Map(
  EXERCISE_SYSTEM_VARIATIONS.flatMap((variation) => {
    const names = [
      variation.displayName,
      variation.id,
      ...(variation.aliases || []),
      ...getAliasTokens(variation.id),
    ];

    return compact(names).map((name) => [name, variation] as const);
  }),
);

export const getSemanticSearchTokensForExerciseName = (exerciseName: string) => {
  const variation = variationByNormalizedName.get(
    normalizeSemanticText(exerciseName),
  );

  return variation ? buildSemanticTokensForVariation(variation) : [];
};

export const buildSemanticTargetText = (target: SemanticSearchTarget) =>
  compact([
    target.name,
    ...(target.aliases || []),
    ...(target.movementPatterns || []),
    ...(target.modifiers || []),
    ...(target.muscleGroups || []),
    ...(target.tags || []),
    ...getSemanticSearchTokensForExerciseName(target.name),
  ]).join(" ");

export const expandSemanticQuery = (query: string) => {
  const normalized = normalizeSemanticText(query);
  return compact([
    normalized,
    ...(queryExpansions[normalized] || []),
    ...normalized.split(" "),
  ]);
};

export const semanticExerciseMatchesQuery = (
  query: string,
  target: SemanticSearchTarget,
) => {
  const normalizedQuery = normalizeSemanticText(query);
  if (!normalizedQuery) return true;

  const haystack = buildSemanticTargetText(target);
  const expandedQueries = expandSemanticQuery(normalizedQuery);

  if (expandedQueries.some((expanded) => haystack.includes(expanded))) {
    return true;
  }

  const queryTerms = normalizedQuery.split(" ").filter(Boolean);
  return queryTerms.every((term) => haystack.includes(term));
};

export const searchExerciseSystemCatalog = (
  query: string,
  catalog: Array<ExerciseVariation | IntegratedMovement> = EXERCISE_SYSTEM_VARIATIONS,
) =>
  catalog.filter((variation) =>
    semanticExerciseMatchesQuery(query, {
      id: variation.id,
      name: variation.displayName,
      aliases: [...(variation.aliases || []), ...getAliasTokens(variation.id)],
      movementPatterns: getAllPatternIds(variation),
      modifiers: getAllModifierIds(variation),
      muscleGroups: [
        ...variation.primaryMuscles,
        ...(variation.secondaryMuscles || []),
      ],
      tags: variation.semanticTags,
    }),
  );
