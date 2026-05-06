import type {
  ApparatusId,
  CoreMovement,
  CoreMovementId,
  ExerciseCatalogItem,
  ExerciseModifierCategoryId,
  ExerciseModifierId,
  MovementPatternId,
} from "@/types";
import { exerciseLibrary } from "./exerciseLibrary";
import {
  ALL_EXERCISE_MODIFIERS,
  CORE_MOVEMENTS,
  CORE_MOVEMENT_BY_ID,
  EXERCISE_MODIFIER_BY_ID,
  MOVEMENT_PATTERN_BY_ID,
} from "./movementTaxonomy";

export type LegacyExerciseMappingConfidence =
  | "high"
  | "medium"
  | "low"
  | "unmapped";

export type LegacyExerciseMovementMapping = {
  legacyId: string;
  legacyName: string;
  legacyPattern: string;
  legacyEquipment: string;
  coreMovementId: CoreMovementId | null;
  movementPatternId: MovementPatternId | null;
  apparatus: ApparatusId | null;
  modifierIds: ExerciseModifierId[];
  modifiersByCategory: Partial<
    Record<ExerciseModifierCategoryId, ExerciseModifierId[]>
  >;
  confidenceScore: number;
  confidence: LegacyExerciseMappingConfidence;
  notes: string[];
  warnings: string[];
};

export type LegacyExerciseSimilarGroup = {
  key: string;
  reason: string;
  exercises: LegacyExerciseMovementMapping[];
};

export type LegacyExerciseMappingReport = {
  total: number;
  mapped: LegacyExerciseMovementMapping[];
  unmapped: LegacyExerciseMovementMapping[];
  lowConfidence: LegacyExerciseMovementMapping[];
  duplicateOrSimilar: LegacyExerciseSimilarGroup[];
  summary: {
    high: number;
    medium: number;
    low: number;
    unmapped: number;
    unsupportedEquipment: number;
  };
};

export type NormalizedCatalogMigrationAction =
  | "merge"
  | "keep-variation"
  | "review";

export type NormalizedCatalogMigrationRecommendation = {
  action: NormalizedCatalogMigrationAction;
  reason: string;
};

export type NormalizedCatalogExercise = LegacyExerciseMovementMapping & {
  variationSignature: string;
};

export type NormalizedCatalogRecommendationGroup = {
  familyId: string;
  familyLabel: string;
  canonicalMovementId: CoreMovementId | null;
  movementPatternId: MovementPatternId | null;
  signature: string;
  apparatus: ApparatusId | null;
  modifierIds: ExerciseModifierId[];
  recommendation: NormalizedCatalogMigrationRecommendation;
  exercises: NormalizedCatalogExercise[];
};

export type NormalizedCatalogFamily = {
  familyId: string;
  familyLabel: string;
  canonicalMovementId: CoreMovementId | null;
  movementPatternId: MovementPatternId | null;
  apparatuses: ApparatusId[];
  sharedModifierIds: ExerciseModifierId[];
  exercises: NormalizedCatalogExercise[];
  recommendationGroups: NormalizedCatalogRecommendationGroup[];
};

export type NormalizedExerciseCatalogPreview = {
  summary: {
    legacyExercises: number;
    families: number;
    mergeCandidates: number;
    reviewGroups: number;
    keepSeparateGroups: number;
    duplicateSignatures: number;
  };
  families: NormalizedCatalogFamily[];
  mergeCandidates: NormalizedCatalogRecommendationGroup[];
  reviewGroups: NormalizedCatalogRecommendationGroup[];
  keepSeparateGroups: NormalizedCatalogRecommendationGroup[];
};

type CoreRule = {
  coreMovementId: CoreMovementId;
  patterns: RegExp[];
  note?: string;
};

const normalize = (value: string) => value.trim().toLowerCase();

const normalizeKey = (value: string) =>
  normalize(value)
    .replace(/\bdb\b/g, "dumbbell")
    .replace(/\bbb\b/g, "barbell")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const textFor = (exercise: ExerciseCatalogItem) =>
  normalize(
    [
      exercise.id,
      exercise.name,
      exercise.body,
      exercise.muscles,
      exercise.pattern,
      exercise.goal,
      exercise.equipment,
    ].join(" "),
  );

const ruleTextFor = (exercise: ExerciseCatalogItem) =>
  normalize(
    [
      exercise.id,
      exercise.name,
      exercise.pattern,
      exercise.goal,
      exercise.equipment,
    ].join(" "),
  );

const coreRules: CoreRule[] = [
  {
    coreMovementId: "mobility-flow",
    patterns: [/greatest stretch/, /hip mobility flow/, /90\/90 hip/, /mobility drill/],
  },
  {
    coreMovementId: "jump-landing",
    patterns: [/box jump/, /broad jump/],
  },
  {
    coreMovementId: "medicine-ball-slam",
    patterns: [/med ball slam/, /medicine ball slam/],
  },
  {
    coreMovementId: "burpee",
    patterns: [/burpee/],
  },
  {
    coreMovementId: "sled-drive",
    patterns: [/sled push/, /sled pull/, /sled drag/],
  },
  {
    coreMovementId: "kettlebell-swing",
    patterns: [/kettlebell swing/, /\bkb swing\b/],
  },
  {
    coreMovementId: "kettlebell-clean",
    patterns: [/kettlebell clean/, /\bkb clean\b/],
  },
  {
    coreMovementId: "clean-pull",
    patterns: [/clean pull/],
  },
  {
    coreMovementId: "high-pull",
    patterns: [/high pull/],
  },
  {
    coreMovementId: "split-squat",
    patterns: [/split squat/, /bulgarian split squat/],
  },
  {
    coreMovementId: "step-up",
    patterns: [/step-up/, /step up/],
  },
  {
    coreMovementId: "step-down",
    patterns: [/step-down/, /step down/],
  },
  {
    coreMovementId: "hip-thrust-glute-bridge",
    patterns: [/hip thrust/, /glute bridge/, /frog pump/, /kickback/],
    note: "Mapped to the closest normalized hip extension seed.",
  },
  {
    coreMovementId: "leg-extension",
    patterns: [/leg extension/, /knee extension/],
  },
  {
    coreMovementId: "leg-curl",
    patterns: [/leg curl/, /hamstring curl/],
  },
  {
    coreMovementId: "calf-raise",
    patterns: [/calf raise/],
  },
  {
    coreMovementId: "tibialis-raise",
    patterns: [/tibialis/, /toe raise/, /shin raise/, /dorsiflexion/],
  },
  {
    coreMovementId: "hip-abduction",
    patterns: [/abduction/, /abductor/],
  },
  {
    coreMovementId: "hip-adduction",
    patterns: [/adduction/, /adductor/, /copenhagen/],
  },
  {
    coreMovementId: "biceps-curl",
    patterns: [/curl/],
  },
  {
    coreMovementId: "triceps-extension",
    patterns: [/triceps/, /pressdown/, /skull crusher/],
  },
  {
    coreMovementId: "lateral-raise",
    patterns: [/lateral raise/, /front raise/],
    note: "Front raise currently maps to shoulder abduction until shoulder flexion is modeled.",
  },
  {
    coreMovementId: "rear-delt-raise",
    patterns: [/rear delt/, /reverse fly/, /yt raise/, /yt raises/],
  },
  {
    coreMovementId: "face-pull",
    patterns: [/face pull/],
  },
  {
    coreMovementId: "shrug",
    patterns: [/shrug/],
  },
  {
    coreMovementId: "pull-up",
    patterns: [/pull-up/, /pull up/, /chin-up/, /chin up/],
  },
  {
    coreMovementId: "pulldown",
    patterns: [/pulldown/, /pull down/],
  },
  {
    coreMovementId: "row",
    patterns: [/row/],
  },
  {
    coreMovementId: "shoulder-press",
    patterns: [/shoulder press/, /overhead press/, /arnold press/, /landmine press/],
  },
  {
    coreMovementId: "chest-press",
    patterns: [/bench press/, /push-up/, /push up/, /chest pass/, /incline db press/],
  },
  {
    coreMovementId: "squat",
    patterns: [/squat/, /thruster/],
  },
  {
    coreMovementId: "hinge",
    patterns: [/deadlift/, /\brdl\b/, /romanian deadlift/, /pull through/],
  },
  {
    coreMovementId: "lunge",
    patterns: [/lunge/],
  },
  {
    coreMovementId: "brace-plank",
    patterns: [/plank/, /dead bug/, /rollout/, /ab wheel/],
  },
  {
    coreMovementId: "anti-rotation",
    patterns: [/pallof/, /anti-rotation/, /cable hold/],
  },
  {
    coreMovementId: "rotation",
    patterns: [/wood chop/, /rotation/, /thoracic rotation/, /halo/],
  },
  {
    coreMovementId: "carry",
    patterns: [/carry/, /anti-lateral flexion/],
  },
];

const legacyPatternMap: Record<string, MovementPatternId> = {
  "horizontal push": "horizontal-push",
  "horizontal pull": "horizontal-pull",
  "vertical push": "vertical-push",
  "vertical pull": "vertical-pull",
  squat: "squat",
  hinge: "hinge",
  lunge: "lunge",
  carry: "carry",
  rotation: "rotation",
  "anti-rotation": "anti-rotation",
  "anti-extension": "brace",
  "anti-lateral flexion": "carry",
  mobility: "gait",
  jump: "step-gait-jump",
  power: "olympic-pull-catch",
  conditioning: "locomotion-conditioning",
  "power push": "horizontal-push",
  "squat to press": "squat",
  pull: "horizontal-pull",
  stability: "brace",
};

const apparatusMap: Record<string, ApparatusId> = {
  dumbbell: "dumbbell",
  dumbbells: "dumbbell",
  db: "dumbbell",
  barbell: "barbell",
  bb: "barbell",
  cable: "cable",
  machine: "machine",
  kettlebell: "kettlebell",
  bodyweight: "bodyweight",
  band: "band",
  "smith machine": "smith-machine",
  "trap bar": "trap-bar",
  suspension: "suspension",
  landmine: "landmine",
  bench: "bench",
  box: "box",
  "medicine ball": "medicine-ball",
  "med ball": "medicine-ball",
  "pull-up bar": "pull-up-bar",
  "pull up bar": "pull-up-bar",
  sled: "sled",
  "stability ball": "stability-ball",
  "swiss ball": "stability-ball",
  "ab wheel": "ab-wheel",
};

const unsupportedEquipment = new Set<string>();

const intentMap: Record<string, ExerciseModifierId> = {
  hypertrophy: "training-intent:hypertrophy",
  strength: "training-intent:strength",
  power: "training-intent:power",
  conditioning: "training-intent:endurance",
  endurance: "training-intent:endurance",
  recovery: "training-intent:rehab",
  rehab: "training-intent:rehab",
  mobility: "training-intent:mobility",
  stability: "training-intent:stability",
};

const addModifier = (
  modifierIds: ExerciseModifierId[],
  modifierId: ExerciseModifierId,
) => {
  if (!modifierIds.includes(modifierId)) modifierIds.push(modifierId);
};

const matchCoreMovement = (exercise: ExerciseCatalogItem) => {
  const text = textFor(exercise);
  const ruleText = ruleTextFor(exercise);

  for (const rule of coreRules) {
    if (rule.patterns.some((pattern) => pattern.test(ruleText))) {
      return {
        coreMovement: CORE_MOVEMENT_BY_ID[rule.coreMovementId],
        note: rule.note,
      };
    }
  }

  const aliasMatch = CORE_MOVEMENTS.find((movement) => {
    const candidates = [movement.label, ...movement.aliases].map(normalize);
    return candidates.some((candidate) => text.includes(candidate));
  });

  return {
    coreMovement: aliasMatch || null,
    note: undefined,
  };
};

const inferPattern = (
  exercise: ExerciseCatalogItem,
  coreMovement: CoreMovement | null,
) => {
  if (coreMovement) return coreMovement.patternId;

  return legacyPatternMap[normalize(exercise.pattern)] || null;
};

const inferApparatus = (exercise: ExerciseCatalogItem) => {
  const equipment = normalize(exercise.equipment);
  const direct = apparatusMap[equipment];
  if (direct) return direct;

  const text = textFor(exercise);
  const textMatch = Object.entries(apparatusMap).find(([label]) =>
    text.includes(label),
  );

  return textMatch?.[1] || null;
};

const inferModifierIds = (
  exercise: ExerciseCatalogItem,
  coreMovement: CoreMovement | null,
  apparatus: ApparatusId | null,
) => {
  const text = textFor(exercise);
  const modifierIds: ExerciseModifierId[] = [];

  if (coreMovement) {
    coreMovement.defaultModifierIds.forEach((modifierId) =>
      addModifier(modifierIds, modifierId),
    );
  }

  if (apparatus) addModifier(modifierIds, `apparatus:${apparatus}`);

  if (text.includes("incline")) addModifier(modifierIds, "angle-position:incline");
  if (text.includes("decline")) addModifier(modifierIds, "angle-position:decline");
  if (text.includes("seated")) addModifier(modifierIds, "angle-position:seated");
  if (text.includes("standing")) addModifier(modifierIds, "angle-position:standing");
  if (text.includes("half-kneeling")) {
    addModifier(modifierIds, "angle-position:half-kneeling");
  }
  if (text.includes("split stance")) {
    addModifier(modifierIds, "angle-position:split-stance");
  }

  if (
    ["single arm", "single-arm", "one arm", "1-arm", "suitcase"].some(
      (token) => text.includes(token),
    )
  ) {
    addModifier(modifierIds, "limb-usage:unilateral");
  }
  if (["single-leg", "single leg"].some((token) => text.includes(token))) {
    addModifier(modifierIds, "limb-usage:unilateral");
    addModifier(modifierIds, "stability:single-leg");
  }
  if (text.includes("walking")) addModifier(modifierIds, "limb-usage:alternating");
  if (text.includes("offset")) addModifier(modifierIds, "limb-usage:offset");

  if (text.includes("assisted")) {
    addModifier(modifierIds, "assistance-resistance:assisted");
  }
  if (text.includes("weighted")) {
    addModifier(modifierIds, "assistance-resistance:weighted");
  }

  const intentModifier = intentMap[normalize(exercise.goal)];
  if (intentModifier) addModifier(modifierIds, intentModifier);

  if (
    [
      "swing",
      "clean",
      "snatch",
      "jump",
      "slam",
      "power",
      "chest pass",
    ].some((token) => text.includes(token))
  ) {
    addModifier(modifierIds, "load-behavior:ballistic");
  }
  if (text.includes("carry")) addModifier(modifierIds, "load-behavior:loaded-carry");
  if (text.includes("burpee") || text.includes("sled")) {
    addModifier(modifierIds, "load-behavior:cyclical");
  }

  return modifierIds.filter((modifierId) => Boolean(EXERCISE_MODIFIER_BY_ID[modifierId]));
};

const groupModifiersByCategory = (modifierIds: ExerciseModifierId[]) => {
  return modifierIds.reduce<
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
};

const scoreMapping = ({
  coreMovement,
  pattern,
  apparatus,
  modifierIds,
  warnings,
}: {
  coreMovement: CoreMovement | null;
  pattern: MovementPatternId | null;
  apparatus: ApparatusId | null;
  modifierIds: ExerciseModifierId[];
  warnings: string[];
}) => {
  let score = 0;
  if (coreMovement) score += 45;
  if (pattern) score += 15;
  if (apparatus) score += 15;
  if (modifierIds.length >= 3) score += 15;
  if (modifierIds.some((id) => id.startsWith("training-intent:"))) score += 5;
  if (modifierIds.some((id) => id.startsWith("load-behavior:"))) score += 5;

  score -= warnings.length * 8;

  return Math.max(0, Math.min(100, score));
};

const getConfidence = (
  score: number,
  coreMovementId: CoreMovementId | null,
): LegacyExerciseMappingConfidence => {
  if (!coreMovementId) return "unmapped";
  if (score >= 80) return "high";
  if (score >= 60) return "medium";
  return "low";
};

export const mapLegacyExerciseToMovement = (
  exercise: ExerciseCatalogItem,
): LegacyExerciseMovementMapping => {
  const notes: string[] = [];
  const warnings: string[] = [];
  const { coreMovement, note } = matchCoreMovement(exercise);
  const movementPatternId = inferPattern(exercise, coreMovement);
  const apparatus = inferApparatus(exercise);
  const equipment = normalize(exercise.equipment);

  if (note) notes.push(note);
  if (!coreMovement) {
    warnings.push("No normalized core movement match found.");
  }
  if (!movementPatternId) {
    warnings.push("No normalized movement pattern match found.");
  }
  if (!apparatus) {
    if (unsupportedEquipment.has(equipment)) {
      warnings.push(
        `Legacy equipment "${exercise.equipment}" is not in the normalized apparatus taxonomy yet.`,
      );
    } else {
      warnings.push(`Could not infer normalized apparatus from "${exercise.equipment}".`);
    }
  }
  if (normalize(exercise.pattern) === "isolation" && coreMovement) {
    notes.push("Legacy isolation pattern is now represented by a joint action pattern.");
  }
  if (normalize(exercise.goal) === "conditioning") {
    notes.push("Legacy conditioning goal maps to endurance intent for now.");
  }

  const modifierIds = inferModifierIds(exercise, coreMovement, apparatus);
  const confidenceScore = scoreMapping({
    coreMovement,
    pattern: movementPatternId,
    apparatus,
    modifierIds,
    warnings,
  });
  const coreMovementId = coreMovement?.id || null;

  return {
    legacyId: exercise.id,
    legacyName: exercise.name,
    legacyPattern: exercise.pattern,
    legacyEquipment: exercise.equipment,
    coreMovementId,
    movementPatternId,
    apparatus,
    modifierIds,
    modifiersByCategory: groupModifiersByCategory(modifierIds),
    confidenceScore,
    confidence: getConfidence(confidenceScore, coreMovementId),
    notes,
    warnings,
  };
};

export const mapLegacyExerciseLibraryToMovements = (
  exercises: ExerciseCatalogItem[] = exerciseLibrary,
) => exercises.map(mapLegacyExerciseToMovement);

const similarKeyForMapping = (mapping: LegacyExerciseMovementMapping) =>
  [
    mapping.coreMovementId || "unmapped",
    mapping.movementPatternId || "no-pattern",
    mapping.apparatus || "no-apparatus",
  ].join("|");

const findDuplicateOrSimilarMappings = (
  mappings: LegacyExerciseMovementMapping[],
) => {
  const groups = mappings.reduce<Record<string, LegacyExerciseMovementMapping[]>>(
    (acc, mapping) => {
      if (!mapping.coreMovementId) return acc;

      const key = similarKeyForMapping(mapping);
      acc[key] = [...(acc[key] || []), mapping];
      return acc;
    },
    {},
  );

  return Object.entries(groups)
    .filter(([, items]) => items.length > 1)
    .map(([key, exercises]) => ({
      key,
      reason: "Same normalized core movement, movement pattern, and apparatus.",
      exercises,
    }));
};

export const getLegacyExerciseMappingReport = (
  exercises: ExerciseCatalogItem[] = exerciseLibrary,
): LegacyExerciseMappingReport => {
  const mappings = mapLegacyExerciseLibraryToMovements(exercises);
  const unmapped = mappings.filter((mapping) => !mapping.coreMovementId);
  const lowConfidence = mappings.filter(
    (mapping) =>
      mapping.confidence === "low" || mapping.confidence === "unmapped",
  );

  return {
    total: mappings.length,
    mapped: mappings.filter((mapping) => Boolean(mapping.coreMovementId)),
    unmapped,
    lowConfidence,
    duplicateOrSimilar: findDuplicateOrSimilarMappings(mappings),
    summary: {
      high: mappings.filter((mapping) => mapping.confidence === "high").length,
      medium: mappings.filter((mapping) => mapping.confidence === "medium")
        .length,
      low: mappings.filter((mapping) => mapping.confidence === "low").length,
      unmapped: unmapped.length,
      unsupportedEquipment: mappings.filter((mapping) =>
        mapping.warnings.some((warning) =>
          warning.includes("is not in the normalized apparatus taxonomy"),
        ),
      ).length,
    },
  };
};

const variationDetailTokens = [
  "assisted",
  "barbell",
  "bench",
  "bent over",
  "box",
  "bulgarian",
  "cable",
  "chest supported",
  "chin",
  "conventional",
  "curtsy",
  "decline",
  "deficit",
  "dumbbell",
  "front",
  "goblet",
  "half-kneeling",
  "incline",
  "landmine",
  "lateral",
  "machine",
  "one arm",
  "overhead",
  "reverse",
  "romanian",
  "seated",
  "single",
  "split",
  "standing",
  "step",
  "trap bar",
  "walking",
  "weighted",
];

const distinct = <T,>(items: T[]) => Array.from(new Set(items));

const sortByLabel = <T extends { legacyName?: string; familyLabel?: string }>(
  left: T,
  right: T,
) =>
  (left.familyLabel || left.legacyName || "").localeCompare(
    right.familyLabel || right.legacyName || "",
  );

const catalogFamilyKeyForMapping = (mapping: LegacyExerciseMovementMapping) =>
  normalizeKey(
    [
      mapping.coreMovementId || "unmapped",
      mapping.movementPatternId || "no-pattern",
    ].join("-"),
  );

const catalogVariationSignatureForMapping = (
  mapping: LegacyExerciseMovementMapping,
) =>
  [
    mapping.apparatus || "no-apparatus",
    ...mapping.modifierIds
      .filter((modifierId) => !modifierId.startsWith("training-intent:"))
      .sort(),
  ].join("|");

const hasVariationDetail = (legacyName: string) => {
  const normalizedName = normalize(legacyName);
  return variationDetailTokens.some((token) => normalizedName.includes(token));
};

const canonicalLegacyNameKey = (legacyName: string) => normalizeKey(legacyName);

const getFamilyLabel = (mapping: LegacyExerciseMovementMapping) => {
  const movementLabel = mapping.coreMovementId
    ? CORE_MOVEMENT_BY_ID[mapping.coreMovementId]?.label || mapping.coreMovementId
    : "Unmapped Movement";
  const patternLabel = mapping.movementPatternId
    ? MOVEMENT_PATTERN_BY_ID[mapping.movementPatternId]?.label ||
      mapping.movementPatternId
    : "No Pattern";

  return `${movementLabel} / ${patternLabel}`;
};

const recommendCatalogGroup = (
  exercises: NormalizedCatalogExercise[],
  familySignatureCount: number,
): NormalizedCatalogMigrationRecommendation => {
  if (exercises.length > 1) {
    const canonicalNameKeys = distinct(
      exercises.map((exercise) => canonicalLegacyNameKey(exercise.legacyName)),
    );
    const hasVariationSpecificNames = exercises.some((exercise) =>
      hasVariationDetail(exercise.legacyName),
    );

    if (canonicalNameKeys.length === 1) {
      return {
        action: "merge",
        reason:
          "These legacy entries appear to be duplicate names for the same normalized movement signature.",
      };
    }

    return {
      action: "review",
      reason:
        hasVariationSpecificNames
          ? "These entries share the same normalized signature, but the legacy names imply setup differences that may need richer modifiers before merging."
          : "These entries share the same normalized signature, but their names are different enough to review before merging.",
    };
  }

  if (familySignatureCount > 1) {
    return {
      action: "keep-variation",
      reason:
        "This entry has a distinct apparatus or modifier signature inside the movement family.",
    };
  }

  return {
    action: "keep-variation",
    reason:
      "This is the only legacy entry in the normalized movement family right now.",
  };
};

const getSharedModifierIds = (exercises: NormalizedCatalogExercise[]) => {
  if (exercises.length === 0) return [];

  return exercises[0].modifierIds
    .filter((modifierId) =>
      exercises.every((exercise) => exercise.modifierIds.includes(modifierId)),
    )
    .sort();
};

const createRecommendationGroups = (
  family: Omit<NormalizedCatalogFamily, "recommendationGroups">,
) => {
  const groups = family.exercises.reduce<
    Record<string, NormalizedCatalogExercise[]>
  >((acc, exercise) => {
    acc[exercise.variationSignature] = [
      ...(acc[exercise.variationSignature] || []),
      exercise,
    ];
    return acc;
  }, {});

  const signatureCount = Object.keys(groups).length;

  return Object.entries(groups)
    .map(([signature, exercises]) => {
      const sortedExercises = [...exercises].sort(sortByLabel);
      const firstExercise = sortedExercises[0];

      return {
        familyId: family.familyId,
        familyLabel: family.familyLabel,
        canonicalMovementId: family.canonicalMovementId,
        movementPatternId: family.movementPatternId,
        signature,
        apparatus: firstExercise.apparatus,
        modifierIds: firstExercise.modifierIds,
        recommendation: recommendCatalogGroup(sortedExercises, signatureCount),
        exercises: sortedExercises,
      };
    })
    .sort((left, right) => {
      const actionOrder: Record<NormalizedCatalogMigrationAction, number> = {
        merge: 0,
        review: 1,
        "keep-variation": 2,
      };

      return (
        actionOrder[left.recommendation.action] -
          actionOrder[right.recommendation.action] ||
        left.signature.localeCompare(right.signature)
      );
    });
};

export const getNormalizedExerciseCatalogPreview = (
  exercises: ExerciseCatalogItem[] = exerciseLibrary,
): NormalizedExerciseCatalogPreview => {
  const report = getLegacyExerciseMappingReport(exercises);
  const catalogExercises = report.mapped.map<NormalizedCatalogExercise>(
    (mapping) => ({
      ...mapping,
      variationSignature: catalogVariationSignatureForMapping(mapping),
    }),
  );
  const familyGroups = catalogExercises.reduce<
    Record<string, NormalizedCatalogExercise[]>
  >((acc, exercise) => {
    const familyKey = catalogFamilyKeyForMapping(exercise);
    acc[familyKey] = [...(acc[familyKey] || []), exercise];
    return acc;
  }, {});

  const families = Object.entries(familyGroups)
    .map(([familyId, familyExercises]) => {
      const sortedExercises = [...familyExercises].sort(sortByLabel);
      const firstExercise = sortedExercises[0];
      const apparatuses = distinct(
        sortedExercises
          .map((exercise) => exercise.apparatus)
          .filter(Boolean) as ApparatusId[],
      ).sort();
      const baseFamily = {
        familyId,
        familyLabel: getFamilyLabel(firstExercise),
        canonicalMovementId: firstExercise.coreMovementId,
        movementPatternId: firstExercise.movementPatternId,
        apparatuses,
        sharedModifierIds: getSharedModifierIds(sortedExercises),
        exercises: sortedExercises,
      };

      return {
        ...baseFamily,
        recommendationGroups: createRecommendationGroups(baseFamily),
      };
    })
    .sort(sortByLabel);

  const recommendationGroups = families.flatMap(
    (family) => family.recommendationGroups,
  );
  const mergeCandidates = recommendationGroups.filter(
    (group) => group.recommendation.action === "merge",
  );
  const reviewGroups = recommendationGroups.filter(
    (group) => group.recommendation.action === "review",
  );
  const keepSeparateGroups = recommendationGroups.filter(
    (group) => group.recommendation.action === "keep-variation",
  );

  return {
    summary: {
      legacyExercises: catalogExercises.length,
      families: families.length,
      mergeCandidates: mergeCandidates.length,
      reviewGroups: reviewGroups.length,
      keepSeparateGroups: keepSeparateGroups.length,
      duplicateSignatures: recommendationGroups.filter(
        (group) => group.exercises.length > 1,
      ).length,
    },
    families,
    mergeCandidates,
    reviewGroups,
    keepSeparateGroups,
  };
};
