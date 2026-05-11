import type {
  Apparatus,
  ApparatusId,
  CoreMovementId,
  ExerciseModifier,
  ExerciseModifierCategoryId,
  ExerciseModifierId,
  MovementPatternId,
} from "@/types";
import {
  ALL_EXERCISE_MODIFIERS,
  APPARATUS_MODIFIERS,
  CORE_MOVEMENTS,
  CORE_MOVEMENT_BY_ID,
  EXERCISE_MODIFIER_BY_ID,
  STANDARD_RANGE_OF_MOTION_MODIFIER_IDS,
} from "./movementTaxonomy";
import {
  CORE_MOVEMENT_PATTERN_CARD_DEFINITIONS,
  getCoreMovementPatternSemanticVariations,
} from "./coreMovementPatternCards";

export type MovementCompatibilityContext = {
  id: string;
  label: string;
  description: string;
};

export type MovementCompatibilityRule = {
  coreMovementId: CoreMovementId;
  allowedApparatusIds: ApparatusId[];
  allowedMovementPatternIds: MovementPatternId[];
  allowedModifierCategoryIds: ExerciseModifierCategoryId[];
  allowedAnglePositionModifierIds: ExerciseModifierId[];
  allowedLimbUsageModifierIds: ExerciseModifierId[];
  allowedExecutionStyleModifierIds: ExerciseModifierId[];
  allowedDirectionModifierIds: ExerciseModifierId[];
  allowedStabilityModifierIds: ExerciseModifierId[];
  allowedTempoModifierIds: ExerciseModifierId[];
  allowedAssistanceResistanceModifierIds: ExerciseModifierId[];
  allowedRangeOfMotionModifierIds: ExerciseModifierId[];
  allowedLoadBehaviorModifierIds: ExerciseModifierId[];
  forbiddenApparatusIds: ApparatusId[];
  forbiddenModifierIds: ExerciseModifierId[];
  requiredContext: MovementCompatibilityContext[];
  notes: string[];
};

export type MovementCompatibilityIssue = {
  code:
    | "unknown-core-movement"
    | "missing-rule"
    | "movement-pattern"
    | "modifier-category"
    | "modifier"
    | "apparatus";
  message: string;
  modifierId?: ExerciseModifierId;
  apparatusId?: ApparatusId;
  movementPatternId?: MovementPatternId;
};

export type MovementCompatibilityWarning = {
  code: "context";
  message: string;
};

export type ExerciseVariationValidationInput = {
  coreMovementId: CoreMovementId;
  movementPatternId?: MovementPatternId;
  modifierIds?: ExerciseModifierId[];
  primaryApparatusId?: ApparatusId | null;
  contextIds?: string[];
};

export type ExerciseVariationValidationResult = {
  isValid: boolean;
  issues: MovementCompatibilityIssue[];
  warnings: MovementCompatibilityWarning[];
  rule: MovementCompatibilityRule | null;
};

type RuleInput = Omit<
  MovementCompatibilityRule,
  | "forbiddenApparatusIds"
  | "forbiddenModifierIds"
  | "allowedDirectionModifierIds"
  | "allowedExecutionStyleModifierIds"
> & {
  allowedDirectionModifierIds?: ExerciseModifierId[];
  allowedExecutionStyleModifierIds?: ExerciseModifierId[];
  forbiddenApparatusIds?: ApparatusId[];
  forbiddenModifierIds?: ExerciseModifierId[];
};

type CompatibilityExample = {
  id: string;
  label: string;
  expectedValid: boolean;
  variation: ExerciseVariationValidationInput;
};

const modifierCategories: ExerciseModifierCategoryId[] = [
  "apparatus",
  "angle-position",
  "limb-usage",
  "execution-style",
  "direction",
  "stability",
  "tempo",
  "assistance-resistance",
  "range-of-motion",
  "training-intent",
  "load-behavior",
];

const allApparatusIds = APPARATUS_MODIFIERS.map(
  (modifier) => modifier.apparatusId,
) as ApparatusId[];

const compactUnique = <T,>(items: T[]) => Array.from(new Set(items));

const commonLoadApparatusIds: ApparatusId[] = [
  "bodyweight",
  "dumbbell",
  "kettlebell",
  "barbell",
  "ez-bar",
  "cable",
  "band",
  "machine",
  "smith-machine",
  "landmine",
  "weight-plate",
  "trx",
  "sandbag",
  "safety-bar",
];

const squatLoadApparatusIds: ApparatusId[] = [
  ...commonLoadApparatusIds,
  "trap-bar",
  "box",
];

const hingeLoadApparatusIds: ApparatusId[] = [
  ...commonLoadApparatusIds,
  "trap-bar",
];

const lungeLoadApparatusIds: ApparatusId[] = [
  ...commonLoadApparatusIds,
  "sliders",
];

const stepUpLoadApparatusIds: ApparatusId[] = [
  ...commonLoadApparatusIds,
  "box",
  "bench",
];

const carryLoadApparatusIds: ApparatusId[] = [
  ...commonLoadApparatusIds,
  "trap-bar",
  "sled",
];

const hipAccessoryLoadApparatusIds: ApparatusId[] = [
  ...commonLoadApparatusIds,
  "sliders",
];

const hipThrustBridgeLoadApparatusIds: ApparatusId[] = [
  ...commonLoadApparatusIds,
  "bench",
  "box",
];

const hipThrustBridgeCompatibilityCoreIds = new Set<CoreMovementId>([
  "hip-thrust-bridge",
  "hip-thrust-glute-bridge",
]);
const sideRelationshipResistanceCoreIds = new Set<CoreMovementId>([
  "anti-extension",
  "crawl",
]);

const apparatusModifierId = (apparatusId: ApparatusId) =>
  `apparatus:${apparatusId}` as ExerciseModifierId;

const allTrainingIntentModifierIds = ALL_EXERCISE_MODIFIERS.filter(
  (modifier) => modifier.categoryId === "training-intent",
).map((modifier) => modifier.id);

const allDirectionModifierIds = ALL_EXERCISE_MODIFIERS.filter(
  (modifier) => modifier.categoryId === "direction",
).map((modifier) => modifier.id);

const allExecutionStyleModifierIds = ALL_EXERCISE_MODIFIERS.filter(
  (modifier) => modifier.categoryId === "execution-style",
).map((modifier) => modifier.id);
const executionStyleCoreMovementIds = new Set<CoreMovementId>([
  "shoulder-press",
  "biceps-curl",
  "curl",
  "lunge",
  "step-up",
]);

const angle = {
  incline: "angle-position:incline",
  decline: "angle-position:decline",
  flat: "angle-position:flat",
  floor: "angle-position:floor",
  handsElevated: "angle-position:hands-elevated",
  feetElevated: "angle-position:feet-elevated",
  frogStance: "angle-position:frog-stance",
  seated: "angle-position:seated",
  standing: "angle-position:standing",
  kneeling: "angle-position:kneeling",
  halfKneeling: "angle-position:half-kneeling",
  splitStance: "angle-position:split-stance",
  tallKneeling: "angle-position:tall-kneeling",
  supine: "angle-position:supine",
  prone: "angle-position:prone",
  sideLying: "angle-position:side-lying",
  bentOver: "angle-position:bent-over",
  chestSupported: "angle-position:chest-supported",
  benchSupported: "angle-position:bench-supported",
  romanChair: "angle-position:roman-chair",
  plank: "angle-position:plank",
  goblet: "angle-position:goblet",
  frontLoaded: "angle-position:front-loaded",
  backLoaded: "angle-position:back-loaded",
  overhead: "angle-position:overhead",
  ninetyNinety: "angle-position:90-90",
  hanging: "angle-position:hanging",
} as const satisfies Record<string, ExerciseModifierId>;

const limb = {
  bilateral: "limb-usage:bilateral",
  unilateral: "limb-usage:unilateral",
  alternating: "limb-usage:alternating",
  staggered: "limb-usage:staggered",
  kickstand: "limb-usage:kickstand",
  offset: "limb-usage:offset",
  standard: "limb-usage:standard-stance",
  narrow: "limb-usage:narrow-stance",
  conventional: "limb-usage:conventional-stance",
  sumo: "limb-usage:sumo-stance",
  wide: "limb-usage:wide-stance",
  closeGrip: "limb-usage:close-grip",
  wideGrip: "limb-usage:wide-grip",
  neutralGrip: "limb-usage:neutral-grip",
  overhandGrip: "limb-usage:overhand-grip",
  underhandGrip: "limb-usage:underhand-grip",
  singleArm: "limb-usage:single-arm",
  singleLeg: "limb-usage:single-leg",
} as const satisfies Record<string, ExerciseModifierId>;

const execution = {
  bilateral: "execution-style:bilateral",
  unilateral: "execution-style:unilateral",
  alternating: "execution-style:alternating",
  contralateral: "execution-style:contralateral",
  ipsilateral: "execution-style:ipsilateral",
  singleArm: "execution-style:single-arm",
  singleLeg: "execution-style:single-leg",
  offset: "execution-style:offset",
} as const satisfies Record<string, ExerciseModifierId>;

const direction = {
  forward: "direction:forward",
  lateral: "direction:lateral",
  crossover: "direction:crossover",
} as const satisfies Record<string, ExerciseModifierId>;

const stability = {
  stable: "stability:stable" as ExerciseModifierId,
  unstable: "stability:unstable",
  swissBall: "stability:swiss-ball",
  bosu: "stability:bosu",
  suspension: "stability:suspension",
  singleLeg: "stability:single-leg" as ExerciseModifierId,
  balanceFocused: "stability:balance-focused",
  offsetStability: "stability:offset-stability",
  stabilityPad: "stability:stability-pad",
  reactiveSurface: "stability:reactive-surface",
  dynamicStability: "stability:dynamic-stability",
} as const satisfies Record<string, ExerciseModifierId>;

const tempo = {
  explosive: "tempo:explosive",
  paused: "tempo:paused",
  eccentricOnly: "tempo:eccentric-only",
  slowEccentric: "tempo:slow-eccentric",
  isometric: "tempo:isometric",
  controlled: "tempo:tempo-controlled",
} as const satisfies Record<string, ExerciseModifierId>;

const assistance = {
  assisted: "assistance-resistance:assisted",
  bandAssisted: "assistance-resistance:band-assisted" as ExerciseModifierId,
  accommodating: "assistance-resistance:accommodating-resistance" as ExerciseModifierId,
  chaotic: "assistance-resistance:chaotic",
  chains: "assistance-resistance:chains",
  variableResistance: "assistance-resistance:variable-resistance",
  contralateral: "assistance-resistance:contralateral",
  ipsilateral: "assistance-resistance:ipsilateral",
  deloaded: "assistance-resistance:deloaded" as ExerciseModifierId,
  partnerAssisted: "assistance-resistance:partner-assisted" as ExerciseModifierId,
} as const satisfies Record<string, ExerciseModifierId>;

const rom = {
  full: "range-of-motion:full-rom",
  shortenedPartial: "range-of-motion:shortened-partial",
  lengthenedPartial: "range-of-motion:lengthened-partial",
  deficit: "range-of-motion:deficit",
  deadStop: "range-of-motion:dead-stop",
  romLimiter: "range-of-motion:rom-limiter",
} as const satisfies Record<string, ExerciseModifierId>;

const load = {
  constant: "load-behavior:constant-load",
  variable: "load-behavior:variable-resistance",
  accommodating: "load-behavior:accommodating-curve",
  ascending: "load-behavior:ascending-strength-curve",
  descending: "load-behavior:descending-strength-curve",
  ballistic: "load-behavior:ballistic",
  cyclical: "load-behavior:cyclical",
  grind: "load-behavior:grind",
  carry: "load-behavior:loaded-carry",
  skill: "load-behavior:skill-complex",
} as const satisfies Record<string, ExerciseModifierId>;

const empty: ExerciseModifierId[] = [];
const allTempo = Object.values(tempo);
const controlledTempo = [
  tempo.paused,
  tempo.eccentricOnly,
  tempo.slowEccentric,
  tempo.isometric,
  tempo.controlled,
];
const strengthLoad = [
  load.constant,
  load.variable,
  load.accommodating,
  load.grind,
];
const accessoryLoad = [
  load.constant,
  load.variable,
  load.ascending,
  load.descending,
];
const partialRom = [rom.shortenedPartial, rom.lengthenedPartial];
const fullPartialRom = [rom.full, ...partialRom];
const pressRom = [rom.full, ...partialRom, rom.romLimiter];
const lowerRom = [rom.full, ...partialRom, rom.deficit, rom.romLimiter];
const commonResistance = [
  assistance.chains,
  assistance.chaotic,
  assistance.assisted,
  assistance.variableResistance,
  assistance.contralateral,
  assistance.ipsilateral,
];
const freeWeightResistance = [
  assistance.chaotic,
  assistance.chains,
  assistance.assisted,
  assistance.variableResistance,
];
const activeAssistanceResistanceModifierIds = new Set<ExerciseModifierId>([
  assistance.assisted,
  assistance.chains,
  assistance.chaotic,
  assistance.variableResistance,
  assistance.contralateral,
  assistance.ipsilateral,
]);

const benchContext = {
  id: "bench-support",
  label: "Bench / Pad Support",
  description:
    "Requires a stable bench, pad, or floor setup when angle or prone/supine modifiers are used.",
};
const anchorContext = {
  id: "anchor-point",
  label: "Cable / Band Anchor",
  description:
    "Requires a safe cable stack, band anchor, or attachment point aligned to the variation.",
};
const landingContext = {
  id: "landing-surface",
  label: "Landing Surface",
  description:
    "Requires a stable floor or box height appropriate for the athlete's landing ability.",
};
const overheadContext = {
  id: "overhead-clearance",
  label: "Overhead Clearance",
  description:
    "Requires enough overhead space and shoulder control for loaded overhead positions.",
};
const sledContext = {
  id: "sled-lane",
  label: "Sled Lane",
  description:
    "Requires a clear pushing or pulling lane with enough traction and stopping distance.",
};

const isModifierAllowedByInput = (
  input: RuleInput,
  modifier: ExerciseModifier,
) => {
  if (!input.allowedModifierCategoryIds.includes(modifier.categoryId)) {
    return false;
  }

  if (modifier.categoryId === "training-intent") return true;
  if (modifier.categoryId === "apparatus") {
    return input.allowedApparatusIds.includes(modifier.slug as ApparatusId);
  }
  if (modifier.categoryId === "angle-position") {
    return input.allowedAnglePositionModifierIds.includes(modifier.id);
  }
  if (modifier.categoryId === "limb-usage") {
    return input.allowedLimbUsageModifierIds.includes(modifier.id);
  }
  if (modifier.categoryId === "execution-style") {
    return (
      input.allowedExecutionStyleModifierIds || allExecutionStyleModifierIds
    ).includes(modifier.id);
  }
  if (modifier.categoryId === "direction") {
    return (input.allowedDirectionModifierIds || allDirectionModifierIds).includes(
      modifier.id,
    );
  }
  if (modifier.categoryId === "stability") {
    return input.allowedStabilityModifierIds.includes(modifier.id);
  }
  if (modifier.categoryId === "tempo") {
    return input.allowedTempoModifierIds.includes(modifier.id);
  }
  if (modifier.categoryId === "assistance-resistance") {
    return input.allowedAssistanceResistanceModifierIds.includes(modifier.id);
  }
  if (modifier.categoryId === "range-of-motion") {
    return input.allowedRangeOfMotionModifierIds.includes(modifier.id);
  }
  if (modifier.categoryId === "load-behavior") {
    return input.allowedLoadBehaviorModifierIds.includes(modifier.id);
  }

  return false;
};

const expandAllowedStabilityModifierIds = (
  modifierIds: ExerciseModifierId[],
) => {
  return compactUnique(
    modifierIds.filter((modifierId) => modifierId === stability.bosu),
  );
};

const expandAllowedAssistanceResistanceModifierIds = (
  modifierIds: ExerciseModifierId[],
) => {
  return compactUnique(
    modifierIds
      .map((modifierId) => {
        if (modifierId === assistance.bandAssisted) return assistance.assisted;
        if (modifierId === assistance.accommodating) {
          return assistance.variableResistance;
        }
        return modifierId;
      })
      .filter((modifierId) =>
        activeAssistanceResistanceModifierIds.has(modifierId),
      ),
  );
};

const expandAllowedRangeOfMotionModifierIds = (
  modifierIds: ExerciseModifierId[],
) => {
  const ids = compactUnique(
    modifierIds.map((modifierId) => {
      if (
        modifierId === ("range-of-motion:partial-rom" as ExerciseModifierId) ||
        modifierId === ("range-of-motion:extended-rom" as ExerciseModifierId)
      ) {
        return rom.full;
      }
      if (
        modifierId === ("range-of-motion:limited-rom" as ExerciseModifierId) ||
        modifierId === ("range-of-motion:box-rom" as ExerciseModifierId) ||
        modifierId === ("range-of-motion:box-rom-modifier" as ExerciseModifierId) ||
        modifierId === ("range-of-motion:pin-press" as ExerciseModifierId) ||
        modifierId === ("range-of-motion:rack-pull" as ExerciseModifierId) ||
        modifierId === ("range-of-motion:block-pull" as ExerciseModifierId)
      ) {
        return rom.romLimiter;
      }

      return modifierId;
    }),
  );

  if (!ids.length) return [];

  return compactUnique([
    ...ids,
    ...STANDARD_RANGE_OF_MOTION_MODIFIER_IDS,
  ]);
};

const legacyExecutionStyleModifierMap: Partial<
  Record<ExerciseModifierId, ExerciseModifierId>
> = {
  "limb-usage:unilateral": "execution-style:unilateral",
  "limb-usage:alternating": "execution-style:alternating",
};

const canonicalizeLegacyExecutionStyleModifierId = (
  modifierId: ExerciseModifierId,
) => legacyExecutionStyleModifierMap[modifierId] || modifierId;

const defineRule = (input: RuleInput): MovementCompatibilityRule => {
  const canonicalAllowedLimbUsageModifierIds = compactUnique(
    input.allowedLimbUsageModifierIds.map(canonicalizeLegacyExecutionStyleModifierId),
  );
  const inheritedExecutionStyleModifierIds = canonicalAllowedLimbUsageModifierIds
    .filter(
      (modifierId) =>
        EXERCISE_MODIFIER_BY_ID[modifierId]?.categoryId === "execution-style",
    );
  const allowedLimbUsageModifierIds = canonicalAllowedLimbUsageModifierIds
    .filter(
      (modifierId) =>
        EXERCISE_MODIFIER_BY_ID[modifierId]?.categoryId === "limb-usage",
    );
  const allowsExecutionStyle = executionStyleCoreMovementIds.has(
    input.coreMovementId,
  );
  const activeExecutionStyleModifierIds = compactUnique([
    ...inheritedExecutionStyleModifierIds,
    ...(input.allowedExecutionStyleModifierIds || []),
  ]).filter((modifierId) => allExecutionStyleModifierIds.includes(modifierId));
  const normalizedInput = {
    ...input,
    allowedLimbUsageModifierIds,
    allowedExecutionStyleModifierIds: allowsExecutionStyle
      ? activeExecutionStyleModifierIds
      : [],
    allowedStabilityModifierIds: expandAllowedStabilityModifierIds(
      input.allowedStabilityModifierIds,
    ),
    allowedAssistanceResistanceModifierIds:
      expandAllowedAssistanceResistanceModifierIds(
        input.allowedAssistanceResistanceModifierIds,
      ),
    allowedRangeOfMotionModifierIds: expandAllowedRangeOfMotionModifierIds(
      input.allowedRangeOfMotionModifierIds,
    ),
  };
  const allowedApparatusIds = compactUnique(input.allowedApparatusIds);
  const explicitForbiddenApparatusIds = input.forbiddenApparatusIds || [];
  const forbiddenApparatusIds = compactUnique([
    ...allApparatusIds.filter(
      (apparatusId) => !allowedApparatusIds.includes(apparatusId),
    ),
    ...explicitForbiddenApparatusIds,
  ]);
  const allowedApparatusModifierIds = allowedApparatusIds.map(apparatusModifierId);
  const explicitForbiddenModifierIds = input.forbiddenModifierIds || [];
  const forbiddenModifierIds = compactUnique([
    ...ALL_EXERCISE_MODIFIERS.filter(
      (modifier) => !isModifierAllowedByInput(normalizedInput, modifier),
    ).map((modifier) => modifier.id),
    ...forbiddenApparatusIds.map(apparatusModifierId),
    ...explicitForbiddenModifierIds,
  ]).filter((modifierId) => !allowedApparatusModifierIds.includes(modifierId));

  return {
    ...input,
    allowedApparatusIds,
    allowedMovementPatternIds: compactUnique(input.allowedMovementPatternIds),
    allowedModifierCategoryIds: compactUnique(input.allowedModifierCategoryIds),
    allowedAnglePositionModifierIds: compactUnique(
      input.allowedAnglePositionModifierIds,
    ),
    allowedLimbUsageModifierIds: compactUnique(
      normalizedInput.allowedLimbUsageModifierIds,
    ),
    allowedExecutionStyleModifierIds: compactUnique(
      normalizedInput.allowedExecutionStyleModifierIds || [],
    ),
    allowedDirectionModifierIds: compactUnique(
      input.allowedDirectionModifierIds || allDirectionModifierIds,
    ),
    allowedStabilityModifierIds:
      normalizedInput.allowedStabilityModifierIds,
    allowedTempoModifierIds: compactUnique(input.allowedTempoModifierIds),
    allowedAssistanceResistanceModifierIds:
      normalizedInput.allowedAssistanceResistanceModifierIds,
    allowedRangeOfMotionModifierIds:
      normalizedInput.allowedRangeOfMotionModifierIds,
    allowedLoadBehaviorModifierIds: compactUnique(
      input.allowedLoadBehaviorModifierIds,
    ),
    forbiddenApparatusIds,
    forbiddenModifierIds,
    requiredContext: input.requiredContext || [],
    notes: input.notes || [],
  };
};

const baseCategories = modifierCategories;

export const CORE_MOVEMENT_COMPATIBILITY_RULES: Partial<
  Record<CoreMovementId, MovementCompatibilityRule>
> = {
  "chest-press": defineRule({
    coreMovementId: "chest-press",
    allowedApparatusIds: commonLoadApparatusIds,
    allowedMovementPatternIds: ["horizontal-push", "scapular-protraction"],
    allowedModifierCategoryIds: baseCategories,
    allowedAnglePositionModifierIds: [
      angle.flat,
      angle.floor,
      angle.incline,
      angle.decline,
      angle.handsElevated,
      angle.feetElevated,
      angle.seated,
      angle.standing,
      angle.kneeling,
      angle.halfKneeling,
      angle.tallKneeling,
      angle.supine,
    ],
    allowedLimbUsageModifierIds: [
      limb.standard,
      limb.narrow,
      limb.bilateral,
      limb.unilateral,
      limb.alternating,
      limb.offset,
      limb.closeGrip,
      limb.wideGrip,
      limb.neutralGrip,
    ],
    allowedStabilityModifierIds: [
      stability.stable,
      stability.suspension,
      stability.balanceFocused,
    ],
    allowedTempoModifierIds: allTempo,
    allowedAssistanceResistanceModifierIds: [
      assistance.assisted,
      assistance.bandAssisted,
      ...freeWeightResistance,
    ],
    allowedRangeOfMotionModifierIds: pressRom,
    allowedLoadBehaviorModifierIds: [...strengthLoad, load.ballistic],
    requiredContext: [benchContext, anchorContext],
    notes: ["Explosive horizontal throws should eventually move to a throw/slam family."],
  }),
  "chest-fly": defineRule({
    coreMovementId: "chest-fly",
    allowedApparatusIds: commonLoadApparatusIds,
    allowedMovementPatternIds: ["chest-fly"],
    allowedModifierCategoryIds: baseCategories,
    allowedAnglePositionModifierIds: [
      angle.flat,
      angle.incline,
      angle.decline,
      angle.standing,
      angle.bentOver,
      angle.seated,
      angle.chestSupported,
    ],
    allowedLimbUsageModifierIds: [
      limb.bilateral,
      limb.unilateral,
      limb.wideGrip,
      limb.closeGrip,
    ],
    allowedStabilityModifierIds: [stability.stable, stability.suspension],
    allowedTempoModifierIds: controlledTempo,
    allowedAssistanceResistanceModifierIds: commonResistance,
    allowedRangeOfMotionModifierIds: fullPartialRom,
    allowedLoadBehaviorModifierIds: [load.constant, load.variable, load.descending],
    requiredContext: [benchContext, anchorContext],
    notes: ["Fly path details can become dedicated low-to-high/high-to-low modifiers later."],
  }),
  "reverse-fly": defineRule({
    coreMovementId: "reverse-fly",
    allowedApparatusIds: commonLoadApparatusIds,
    allowedMovementPatternIds: ["reverse-fly", "scapular-retraction", "horizontal-pull"],
    allowedModifierCategoryIds: baseCategories,
    allowedAnglePositionModifierIds: [
      angle.flat,
      angle.incline,
      angle.decline,
      angle.standing,
      angle.bentOver,
      angle.seated,
      angle.chestSupported,
    ],
    allowedLimbUsageModifierIds: [
      limb.bilateral,
      limb.unilateral,
      limb.wideGrip,
      limb.closeGrip,
    ],
    allowedStabilityModifierIds: [stability.stable, stability.suspension],
    allowedTempoModifierIds: controlledTempo,
    allowedAssistanceResistanceModifierIds: commonResistance,
    allowedRangeOfMotionModifierIds: fullPartialRom,
    allowedLoadBehaviorModifierIds: [load.constant, load.variable, load.descending],
    requiredContext: [benchContext, anchorContext],
    notes: ["Rear-delt path labels can become dedicated reverse/rear-delt modifiers later."],
  }),
  row: defineRule({
    coreMovementId: "row",
    allowedApparatusIds: [...commonLoadApparatusIds, "bench"],
    allowedMovementPatternIds: ["horizontal-pull", "scapular-retraction"],
    allowedModifierCategoryIds: baseCategories,
    allowedAnglePositionModifierIds: [
      angle.seated,
      angle.standing,
      angle.halfKneeling,
      angle.splitStance,
      angle.bentOver,
      angle.chestSupported,
      angle.plank,
      angle.prone,
      angle.incline,
    ],
    allowedLimbUsageModifierIds: [
      limb.bilateral,
      limb.unilateral,
      limb.alternating,
      limb.offset,
      limb.neutralGrip,
      limb.underhandGrip,
      limb.overhandGrip,
      limb.wideGrip,
      limb.closeGrip,
      limb.singleArm,
    ],
    allowedStabilityModifierIds: [
      stability.stable,
      stability.suspension,
      stability.swissBall,
      stability.balanceFocused,
    ],
    allowedTempoModifierIds: allTempo,
    allowedAssistanceResistanceModifierIds: commonResistance,
    allowedRangeOfMotionModifierIds: fullPartialRom,
    allowedLoadBehaviorModifierIds: strengthLoad,
    requiredContext: [benchContext, anchorContext],
    notes: ["Rows may need a future support-context modifier for chest support."],
  }),
  squat: defineRule({
    coreMovementId: "squat",
    allowedApparatusIds: squatLoadApparatusIds,
    allowedMovementPatternIds: ["squat"],
    allowedModifierCategoryIds: baseCategories,
    allowedAnglePositionModifierIds: [
      angle.standing,
      angle.splitStance,
      angle.flat,
      angle.goblet,
      angle.frontLoaded,
      angle.backLoaded,
      angle.overhead,
    ],
    allowedLimbUsageModifierIds: [
      limb.standard,
      limb.bilateral,
      limb.staggered,
      limb.offset,
      limb.unilateral,
      limb.sumo,
      limb.wide,
      limb.singleLeg,
    ],
    allowedStabilityModifierIds: [
      stability.stable,
      stability.singleLeg,
      stability.balanceFocused,
    ],
    allowedTempoModifierIds: allTempo,
    allowedAssistanceResistanceModifierIds: commonResistance,
    allowedRangeOfMotionModifierIds: lowerRom,
    allowedLoadBehaviorModifierIds: [...strengthLoad, load.ascending],
    requiredContext: [landingContext],
    notes: ["Step, split-squat, and jump variations have their own core families."],
  }),
  hinge: defineRule({
    coreMovementId: "hinge",
    allowedApparatusIds: hingeLoadApparatusIds,
    allowedMovementPatternIds: ["hinge", "hip-extension"],
    allowedModifierCategoryIds: baseCategories,
    allowedAnglePositionModifierIds: [
      angle.standing,
      angle.seated,
      angle.splitStance,
      angle.backLoaded,
      angle.romanChair,
    ],
    allowedLimbUsageModifierIds: [
      limb.conventional,
      limb.narrow,
      limb.sumo,
      limb.wide,
      limb.bilateral,
      limb.unilateral,
      limb.staggered,
      limb.kickstand,
      limb.offset,
      limb.singleLeg,
    ],
    allowedStabilityModifierIds: [
      stability.stable,
      stability.singleLeg,
      stability.balanceFocused,
    ],
    allowedTempoModifierIds: allTempo,
    allowedAssistanceResistanceModifierIds: commonResistance,
    allowedRangeOfMotionModifierIds: [
      rom.full,
      ...partialRom,
      rom.deficit,
    ],
    allowedLoadBehaviorModifierIds: [...strengthLoad, load.ascending, load.ballistic],
    requiredContext: [],
    notes: ["Ballistic hinge variations should prefer the kettlebell swing family."],
  }),
  lunge: defineRule({
    coreMovementId: "lunge",
    allowedApparatusIds: lungeLoadApparatusIds,
    allowedMovementPatternIds: ["lunge", "gait"],
    allowedModifierCategoryIds: baseCategories,
    allowedAnglePositionModifierIds: [angle.standing, angle.splitStance],
    allowedLimbUsageModifierIds: [
      limb.unilateral,
      limb.alternating,
      limb.offset,
    ],
    allowedExecutionStyleModifierIds: [
      execution.unilateral,
      execution.alternating,
    ],
    allowedStabilityModifierIds: [
      stability.stable,
      stability.singleLeg,
      stability.balanceFocused,
    ],
    allowedTempoModifierIds: allTempo,
    allowedAssistanceResistanceModifierIds: commonResistance,
    allowedRangeOfMotionModifierIds: lowerRom,
    allowedLoadBehaviorModifierIds: [load.constant, load.variable, load.grind],
    requiredContext: [landingContext],
    notes: ["Split-squat and step-up families should handle fixed split stance and box-based options."],
  }),
  "shoulder-press": defineRule({
    coreMovementId: "shoulder-press",
    allowedApparatusIds: commonLoadApparatusIds,
    allowedMovementPatternIds: ["vertical-push"],
    allowedModifierCategoryIds: baseCategories,
    allowedAnglePositionModifierIds: [
      angle.seated,
      angle.standing,
      angle.halfKneeling,
      angle.tallKneeling,
      angle.splitStance,
    ],
    allowedLimbUsageModifierIds: [
      limb.bilateral,
      limb.unilateral,
      limb.alternating,
      limb.offset,
    ],
    allowedStabilityModifierIds: [
      stability.stable,
      stability.balanceFocused,
      stability.singleLeg,
    ],
    allowedTempoModifierIds: allTempo,
    allowedAssistanceResistanceModifierIds: commonResistance,
    allowedRangeOfMotionModifierIds: pressRom,
    allowedLoadBehaviorModifierIds: [...strengthLoad, load.ballistic],
    requiredContext: [overheadContext],
    notes: ["Bottoms-up variations have their own higher-skill core family."],
  }),
  pulldown: defineRule({
    coreMovementId: "pulldown",
    allowedApparatusIds: ["cable", "machine", "band"],
    allowedMovementPatternIds: ["vertical-pull"],
    allowedModifierCategoryIds: baseCategories,
    allowedAnglePositionModifierIds: [
      angle.seated,
      angle.standing,
      angle.halfKneeling,
      angle.tallKneeling,
    ],
    allowedLimbUsageModifierIds: [
      limb.bilateral,
      limb.unilateral,
      limb.alternating,
    ],
    allowedStabilityModifierIds: [stability.stable, stability.balanceFocused],
    allowedTempoModifierIds: controlledTempo,
    allowedAssistanceResistanceModifierIds: [assistance.deloaded],
    allowedRangeOfMotionModifierIds: fullPartialRom,
    allowedLoadBehaviorModifierIds: [load.constant, load.variable],
    requiredContext: [anchorContext],
    notes: ["Bodyweight vertical pulling should use the pull-up family."],
  }),
  "pull-up": defineRule({
    coreMovementId: "pull-up",
    allowedApparatusIds: ["bodyweight", "pull-up-bar", "band", "machine"],
    allowedMovementPatternIds: ["vertical-pull"],
    allowedModifierCategoryIds: baseCategories,
    allowedAnglePositionModifierIds: empty,
    allowedLimbUsageModifierIds: [limb.bilateral],
    allowedStabilityModifierIds: [stability.stable],
    allowedTempoModifierIds: controlledTempo,
    allowedAssistanceResistanceModifierIds: [
      assistance.assisted,
      assistance.bandAssisted,
      assistance.deloaded,
    ],
    allowedRangeOfMotionModifierIds: [rom.full, ...partialRom],
    allowedLoadBehaviorModifierIds: [load.constant, load.grind],
    requiredContext: [overheadContext],
    notes: ["Suspension pulling is currently modeled as row, not pull-up."],
  }),
  carry: defineRule({
    coreMovementId: "carry",
    allowedApparatusIds: carryLoadApparatusIds,
    allowedMovementPatternIds: ["carry", "gait"],
    allowedModifierCategoryIds: baseCategories,
    allowedAnglePositionModifierIds: [angle.standing],
    allowedLimbUsageModifierIds: [
      limb.bilateral,
      limb.unilateral,
      limb.offset,
      limb.alternating,
    ],
    allowedStabilityModifierIds: [stability.stable, stability.balanceFocused],
    allowedTempoModifierIds: [tempo.isometric, tempo.controlled],
    allowedAssistanceResistanceModifierIds: commonResistance,
    allowedRangeOfMotionModifierIds: empty,
    allowedLoadBehaviorModifierIds: [load.carry, load.constant],
    requiredContext: [sledContext],
    notes: ["Carries require distance/time context in prescription logic."],
  }),
  rotation: defineRule({
    coreMovementId: "rotation",
    allowedApparatusIds: [
      ...commonLoadApparatusIds,
      "medicine-ball",
      "slam-ball",
    ],
    allowedMovementPatternIds: ["rotation"],
    allowedModifierCategoryIds: baseCategories,
    allowedAnglePositionModifierIds: [
      angle.standing,
      angle.seated,
      angle.halfKneeling,
      angle.tallKneeling,
      angle.splitStance,
      angle.supine,
    ],
    allowedLimbUsageModifierIds: [
      limb.bilateral,
      limb.unilateral,
      limb.alternating,
      limb.offset,
    ],
    allowedStabilityModifierIds: [stability.stable, stability.balanceFocused],
    allowedTempoModifierIds: allTempo,
    allowedAssistanceResistanceModifierIds: commonResistance,
    allowedRangeOfMotionModifierIds: fullPartialRom,
    allowedLoadBehaviorModifierIds: [
      load.constant,
      load.ballistic,
      load.skill,
      load.variable,
    ],
    requiredContext: [anchorContext],
    notes: ["Medicine ball throws may later split into throw/slam subfamilies."],
  }),
  "anti-rotation": defineRule({
    coreMovementId: "anti-rotation",
    allowedApparatusIds: [
      ...commonLoadApparatusIds,
      "medicine-ball",
      "weight-plate",
    ],
    allowedMovementPatternIds: ["anti-rotation"],
    allowedModifierCategoryIds: baseCategories,
    allowedAnglePositionModifierIds: [
      angle.standing,
      angle.seated,
      angle.halfKneeling,
      angle.tallKneeling,
      angle.splitStance,
    ],
    allowedLimbUsageModifierIds: [limb.bilateral, limb.unilateral, limb.offset],
    allowedStabilityModifierIds: [stability.stable, stability.balanceFocused],
    allowedTempoModifierIds: [tempo.isometric, tempo.controlled],
    allowedAssistanceResistanceModifierIds: commonResistance,
    allowedRangeOfMotionModifierIds: empty,
    allowedLoadBehaviorModifierIds: [load.constant, load.skill],
    requiredContext: [anchorContext],
    notes: ["Anti-rotation prescriptions should eventually include hold duration."],
  }),
  "brace-plank": defineRule({
    coreMovementId: "brace-plank",
    allowedApparatusIds: [
      "bodyweight",
      "ab-wheel",
      "stability-ball",
      "trx",
      "suspension",
      "band",
      "bench",
    ],
    allowedMovementPatternIds: ["brace", "scapular-protraction"],
    allowedModifierCategoryIds: baseCategories,
    allowedAnglePositionModifierIds: [
      angle.prone,
      angle.supine,
      angle.tallKneeling,
      angle.halfKneeling,
      angle.standing,
    ],
    allowedLimbUsageModifierIds: [
      limb.bilateral,
      limb.unilateral,
      limb.alternating,
      limb.offset,
    ],
    allowedStabilityModifierIds: [
      stability.stable,
      stability.unstable,
      stability.swissBall,
      stability.suspension,
      stability.balanceFocused,
    ],
    allowedTempoModifierIds: [tempo.isometric, tempo.controlled, tempo.slowEccentric],
    allowedAssistanceResistanceModifierIds: [
      assistance.assisted,
      assistance.bandAssisted,
      assistance.deloaded,
    ],
    allowedRangeOfMotionModifierIds: fullPartialRom,
    allowedLoadBehaviorModifierIds: [load.skill, load.constant],
    requiredContext: [anchorContext],
    notes: ["Loaded anti-extension and rollout work should stay here for now."],
  }),
  "leg-extension": defineRule({
    coreMovementId: "leg-extension",
    allowedApparatusIds: ["machine", "band", "cable", "bodyweight"],
    allowedMovementPatternIds: ["knee-extension"],
    allowedModifierCategoryIds: baseCategories,
    allowedAnglePositionModifierIds: [angle.seated, angle.standing],
    allowedLimbUsageModifierIds: [limb.bilateral, limb.unilateral, limb.alternating],
    allowedStabilityModifierIds: [stability.stable],
    allowedTempoModifierIds: controlledTempo,
    allowedAssistanceResistanceModifierIds: [assistance.deloaded],
    allowedRangeOfMotionModifierIds: fullPartialRom,
    allowedLoadBehaviorModifierIds: [load.constant, load.ascending, load.variable],
    requiredContext: [anchorContext],
    notes: ["Free-weight knee extensions are not supported until a clearer setup taxonomy exists."],
  }),
  "leg-curl": defineRule({
    coreMovementId: "leg-curl",
    allowedApparatusIds: ["machine", "band", "cable", "stability-ball"],
    allowedMovementPatternIds: ["knee-flexion"],
    allowedModifierCategoryIds: baseCategories,
    allowedAnglePositionModifierIds: [
      angle.seated,
      angle.prone,
      angle.standing,
      angle.supine,
    ],
    allowedLimbUsageModifierIds: [limb.bilateral, limb.unilateral, limb.alternating],
    allowedStabilityModifierIds: [stability.stable, stability.swissBall],
    allowedTempoModifierIds: controlledTempo,
    allowedAssistanceResistanceModifierIds: [assistance.deloaded],
    allowedRangeOfMotionModifierIds: fullPartialRom,
    allowedLoadBehaviorModifierIds: [load.constant, load.variable],
    requiredContext: [benchContext, anchorContext],
    notes: ["Stability-ball curls are allowed as support-surface variations."],
  }),
  "hip-thrust-glute-bridge": defineRule({
    coreMovementId: "hip-thrust-glute-bridge",
    allowedApparatusIds: hipThrustBridgeLoadApparatusIds,
    allowedMovementPatternIds: ["hip-extension", "hinge"],
    allowedModifierCategoryIds: baseCategories,
    allowedAnglePositionModifierIds: [
      angle.floor,
      angle.feetElevated,
      angle.frogStance,
      angle.seated,
      angle.standing,
      angle.kneeling,
      angle.halfKneeling,
      angle.splitStance,
      angle.benchSupported,
      angle.backLoaded,
    ],
    allowedLimbUsageModifierIds: [
      limb.bilateral,
      limb.unilateral,
      limb.alternating,
      limb.standard,
      limb.narrow,
      limb.wide,
      limb.singleLeg,
    ],
    allowedStabilityModifierIds: [
      stability.stable,
      stability.singleLeg,
      stability.bosu,
      stability.swissBall,
      stability.stabilityPad,
      stability.balanceFocused,
      stability.offsetStability,
      stability.dynamicStability,
    ],
    allowedTempoModifierIds: controlledTempo,
    allowedAssistanceResistanceModifierIds: commonResistance,
    allowedRangeOfMotionModifierIds: fullPartialRom,
    allowedLoadBehaviorModifierIds: [load.constant, load.ascending, load.variable],
    requiredContext: [benchContext],
    notes: ["Kickback-style hip extension may need its own accessory subfamily later."],
  }),
  "calf-raise": defineRule({
    coreMovementId: "calf-raise",
    allowedApparatusIds: [...commonLoadApparatusIds, "box", "bench"],
    allowedMovementPatternIds: ["plantarflexion"],
    allowedModifierCategoryIds: baseCategories,
    allowedAnglePositionModifierIds: [angle.standing, angle.seated],
    allowedLimbUsageModifierIds: [limb.bilateral, limb.unilateral, limb.alternating],
    allowedStabilityModifierIds: [
      stability.stable,
      stability.singleLeg,
      stability.balanceFocused,
    ],
    allowedTempoModifierIds: controlledTempo,
    allowedAssistanceResistanceModifierIds: commonResistance,
    allowedRangeOfMotionModifierIds: [rom.full, ...partialRom, rom.deficit],
    allowedLoadBehaviorModifierIds: [load.constant, load.variable],
    requiredContext: [benchContext],
    notes: ["Deficit calf raises require an explicit stable step or platform context."],
  }),
  "tibialis-raise": defineRule({
    coreMovementId: "tibialis-raise",
    allowedApparatusIds: ["bodyweight", "band", "machine"],
    allowedMovementPatternIds: ["dorsiflexion"],
    allowedModifierCategoryIds: baseCategories,
    allowedAnglePositionModifierIds: [angle.standing, angle.seated],
    allowedLimbUsageModifierIds: [limb.bilateral, limb.unilateral, limb.alternating],
    allowedStabilityModifierIds: [stability.stable, stability.balanceFocused],
    allowedTempoModifierIds: controlledTempo,
    allowedAssistanceResistanceModifierIds: [assistance.deloaded],
    allowedRangeOfMotionModifierIds: fullPartialRom,
    allowedLoadBehaviorModifierIds: [load.constant],
    requiredContext: [anchorContext],
    notes: ["Wall-supported bodyweight raises are represented as bodyweight for now."],
  }),
  "hip-abduction": defineRule({
    coreMovementId: "hip-abduction",
    allowedApparatusIds: hipAccessoryLoadApparatusIds,
    allowedMovementPatternIds: ["hip-abduction"],
    allowedModifierCategoryIds: baseCategories,
    allowedAnglePositionModifierIds: [
      angle.seated,
      angle.standing,
      angle.sideLying,
      angle.supine,
      angle.prone,
    ],
    allowedLimbUsageModifierIds: [limb.bilateral, limb.unilateral, limb.alternating],
    allowedStabilityModifierIds: [
      stability.stable,
      stability.singleLeg,
      stability.balanceFocused,
    ],
    allowedTempoModifierIds: controlledTempo,
    allowedAssistanceResistanceModifierIds: [assistance.deloaded],
    allowedRangeOfMotionModifierIds: fullPartialRom,
    allowedDirectionModifierIds: [direction.lateral],
    allowedLoadBehaviorModifierIds: [load.constant, load.variable],
    requiredContext: [anchorContext],
    notes: ["Standing, side-lying, machine, cable, band, and slider abduction variations are supported."],
  }),
  "hip-adduction": defineRule({
    coreMovementId: "hip-adduction",
    allowedApparatusIds: [...hipAccessoryLoadApparatusIds, "bench"],
    allowedMovementPatternIds: ["hip-adduction"],
    allowedModifierCategoryIds: baseCategories,
    allowedAnglePositionModifierIds: [
      angle.seated,
      angle.standing,
      angle.supine,
      angle.prone,
    ],
    allowedLimbUsageModifierIds: [limb.bilateral, limb.unilateral, limb.alternating],
    allowedStabilityModifierIds: [
      stability.stable,
      stability.singleLeg,
      stability.balanceFocused,
    ],
    allowedTempoModifierIds: controlledTempo,
    allowedAssistanceResistanceModifierIds: [assistance.deloaded],
    allowedRangeOfMotionModifierIds: fullPartialRom,
    allowedLoadBehaviorModifierIds: [load.constant, load.variable],
    requiredContext: [benchContext, anchorContext],
    notes: ["Copenhagen variations use bench support until a dedicated support modifier exists."],
  }),
  "biceps-curl": defineRule({
    coreMovementId: "biceps-curl",
    allowedApparatusIds: [...commonLoadApparatusIds, "bench"],
    allowedMovementPatternIds: ["elbow-flexion"],
    allowedModifierCategoryIds: baseCategories,
    allowedAnglePositionModifierIds: [
      angle.standing,
      angle.seated,
      angle.incline,
      angle.prone,
    ],
    allowedLimbUsageModifierIds: [limb.bilateral, limb.unilateral, limb.alternating],
    allowedStabilityModifierIds: [stability.stable, stability.balanceFocused],
    allowedTempoModifierIds: controlledTempo,
    allowedAssistanceResistanceModifierIds: commonResistance,
    allowedRangeOfMotionModifierIds: fullPartialRom,
    allowedLoadBehaviorModifierIds: [load.constant, load.variable, load.descending],
    requiredContext: [benchContext, anchorContext],
    notes: ["Curl grip type is not modeled yet."],
  }),
  "triceps-extension": defineRule({
    coreMovementId: "triceps-extension",
    allowedApparatusIds: [...commonLoadApparatusIds, "bench"],
    allowedMovementPatternIds: ["elbow-extension"],
    allowedModifierCategoryIds: baseCategories,
    allowedAnglePositionModifierIds: [
      angle.standing,
      angle.seated,
      angle.supine,
      angle.incline,
      angle.halfKneeling,
      angle.tallKneeling,
    ],
    allowedLimbUsageModifierIds: [limb.bilateral, limb.unilateral, limb.alternating],
    allowedStabilityModifierIds: [stability.stable, stability.balanceFocused],
    allowedTempoModifierIds: controlledTempo,
    allowedAssistanceResistanceModifierIds: commonResistance,
    allowedRangeOfMotionModifierIds: fullPartialRom,
    allowedLoadBehaviorModifierIds: [load.constant, load.variable, load.descending],
    requiredContext: [benchContext, anchorContext],
    notes: ["Pressdowns, skull crushers, and overhead extensions share this family for now."],
  }),
  "lateral-raise": defineRule({
    coreMovementId: "lateral-raise",
    allowedApparatusIds: commonLoadApparatusIds,
    allowedMovementPatternIds: ["shoulder-abduction"],
    allowedModifierCategoryIds: baseCategories,
    allowedAnglePositionModifierIds: [
      angle.standing,
      angle.seated,
      angle.halfKneeling,
      angle.sideLying,
    ],
    allowedLimbUsageModifierIds: [limb.bilateral, limb.unilateral, limb.alternating],
    allowedStabilityModifierIds: [stability.stable, stability.balanceFocused],
    allowedTempoModifierIds: controlledTempo,
    allowedAssistanceResistanceModifierIds: [assistance.deloaded],
    allowedRangeOfMotionModifierIds: fullPartialRom,
    allowedLoadBehaviorModifierIds: [load.constant, load.descending, load.variable],
    requiredContext: [anchorContext],
    notes: ["Front raises are still mapped here until shoulder flexion exists."],
  }),
  "rear-delt-raise": defineRule({
    coreMovementId: "rear-delt-raise",
    allowedApparatusIds: [...commonLoadApparatusIds, "bench"],
    allowedMovementPatternIds: ["scapular-retraction", "horizontal-pull"],
    allowedModifierCategoryIds: baseCategories,
    allowedAnglePositionModifierIds: [
      angle.standing,
      angle.seated,
      angle.prone,
      angle.incline,
    ],
    allowedLimbUsageModifierIds: [limb.bilateral, limb.unilateral, limb.alternating],
    allowedStabilityModifierIds: [
      stability.stable,
      stability.swissBall,
      stability.balanceFocused,
    ],
    allowedTempoModifierIds: controlledTempo,
    allowedAssistanceResistanceModifierIds: [assistance.deloaded],
    allowedRangeOfMotionModifierIds: fullPartialRom,
    allowedLoadBehaviorModifierIds: [load.constant, load.descending, load.variable],
    requiredContext: [benchContext, anchorContext],
    notes: ["Reverse fly and YT raise details may need more scapular modifiers later."],
  }),
  "face-pull": defineRule({
    coreMovementId: "face-pull",
    allowedApparatusIds: ["cable", "band"],
    allowedMovementPatternIds: [
      "scapular-retraction",
      "horizontal-pull",
      "shoulder-external-rotation",
    ],
    allowedModifierCategoryIds: baseCategories,
    allowedAnglePositionModifierIds: [
      angle.standing,
      angle.seated,
      angle.halfKneeling,
      angle.tallKneeling,
    ],
    allowedLimbUsageModifierIds: [limb.bilateral, limb.unilateral],
    allowedStabilityModifierIds: [stability.stable, stability.balanceFocused],
    allowedTempoModifierIds: controlledTempo,
    allowedAssistanceResistanceModifierIds: [assistance.deloaded],
    allowedRangeOfMotionModifierIds: fullPartialRom,
    allowedLoadBehaviorModifierIds: [load.constant, load.variable],
    requiredContext: [anchorContext],
    notes: ["External rotation emphasis is not a separate modifier yet."],
  }),
  shrug: defineRule({
    coreMovementId: "shrug",
    allowedApparatusIds: [...commonLoadApparatusIds, "trap-bar"],
    allowedMovementPatternIds: ["scapular-retraction"],
    allowedModifierCategoryIds: baseCategories,
    allowedAnglePositionModifierIds: [angle.standing, angle.seated],
    allowedLimbUsageModifierIds: [limb.bilateral, limb.unilateral],
    allowedStabilityModifierIds: [stability.stable],
    allowedTempoModifierIds: controlledTempo,
    allowedAssistanceResistanceModifierIds: commonResistance,
    allowedRangeOfMotionModifierIds: fullPartialRom,
    allowedLoadBehaviorModifierIds: [load.constant, load.grind],
    requiredContext: [],
    notes: ["Loaded carries with shrug emphasis should stay in carry unless the rep action is primary."],
  }),
  "step-up": defineRule({
    coreMovementId: "step-up",
    allowedApparatusIds: stepUpLoadApparatusIds,
    allowedMovementPatternIds: ["step-gait-jump", "gait"],
    allowedModifierCategoryIds: baseCategories,
    allowedAnglePositionModifierIds: [angle.standing],
    allowedLimbUsageModifierIds: [limb.unilateral, limb.alternating],
    allowedExecutionStyleModifierIds: [
      execution.unilateral,
      execution.alternating,
    ],
    allowedDirectionModifierIds: [
      direction.forward,
      direction.lateral,
      direction.crossover,
    ],
    allowedStabilityModifierIds: [
      stability.stable,
      stability.singleLeg,
      stability.balanceFocused,
    ],
    allowedTempoModifierIds: controlledTempo,
    allowedAssistanceResistanceModifierIds: commonResistance,
    allowedRangeOfMotionModifierIds: [rom.full, ...partialRom, rom.deficit],
    allowedLoadBehaviorModifierIds: [load.constant, load.variable],
    requiredContext: [landingContext],
    notes: ["Box height is required prescription context but not modeled as a modifier yet."],
  }),
  "step-down": defineRule({
    coreMovementId: "step-down",
    allowedApparatusIds: stepUpLoadApparatusIds,
    allowedMovementPatternIds: ["step-gait-jump", "gait"],
    allowedModifierCategoryIds: baseCategories,
    allowedAnglePositionModifierIds: [angle.standing],
    allowedLimbUsageModifierIds: [limb.unilateral, limb.alternating],
    allowedStabilityModifierIds: [
      stability.stable,
      stability.singleLeg,
      stability.balanceFocused,
    ],
    allowedTempoModifierIds: controlledTempo,
    allowedAssistanceResistanceModifierIds: [assistance.deloaded],
    allowedRangeOfMotionModifierIds: [rom.full, ...partialRom, rom.deficit],
    allowedLoadBehaviorModifierIds: [load.constant],
    requiredContext: [landingContext],
    notes: ["Eccentric-control prescription should be captured in tempo."],
  }),
  "split-squat": defineRule({
    coreMovementId: "split-squat",
    allowedApparatusIds: [...lungeLoadApparatusIds, "bench"],
    allowedMovementPatternIds: ["lunge"],
    allowedModifierCategoryIds: baseCategories,
    allowedAnglePositionModifierIds: [angle.standing, angle.splitStance],
    allowedLimbUsageModifierIds: [limb.staggered, limb.unilateral, limb.offset],
    allowedStabilityModifierIds: [
      stability.stable,
      stability.singleLeg,
      stability.balanceFocused,
    ],
    allowedTempoModifierIds: allTempo,
    allowedAssistanceResistanceModifierIds: commonResistance,
    allowedRangeOfMotionModifierIds: lowerRom,
    allowedLoadBehaviorModifierIds: [load.constant, load.variable, load.grind],
    requiredContext: [benchContext],
    notes: ["Rear-foot elevated context should be made explicit before production migration."],
  }),
  "clean-pull": defineRule({
    coreMovementId: "clean-pull",
    allowedApparatusIds: ["barbell", "dumbbell", "kettlebell", "trap-bar"],
    allowedMovementPatternIds: ["olympic-pull-catch"],
    allowedModifierCategoryIds: baseCategories,
    allowedAnglePositionModifierIds: [angle.standing],
    allowedLimbUsageModifierIds: [limb.bilateral, limb.unilateral],
    allowedStabilityModifierIds: [stability.stable],
    allowedTempoModifierIds: [tempo.explosive],
    allowedAssistanceResistanceModifierIds: [assistance.deloaded],
    allowedRangeOfMotionModifierIds: [rom.full, ...partialRom, rom.deficit],
    allowedLoadBehaviorModifierIds: [load.ballistic],
    requiredContext: [],
    notes: ["High-skill Olympic derivatives require coaching-level progression checks."],
  }),
  "high-pull": defineRule({
    coreMovementId: "high-pull",
    allowedApparatusIds: ["barbell", "dumbbell", "kettlebell"],
    allowedMovementPatternIds: ["olympic-pull-catch"],
    allowedModifierCategoryIds: baseCategories,
    allowedAnglePositionModifierIds: [angle.standing],
    allowedLimbUsageModifierIds: [limb.bilateral, limb.unilateral],
    allowedStabilityModifierIds: [stability.stable],
    allowedTempoModifierIds: [tempo.explosive],
    allowedAssistanceResistanceModifierIds: [assistance.deloaded],
    allowedRangeOfMotionModifierIds: fullPartialRom,
    allowedLoadBehaviorModifierIds: [load.ballistic],
    requiredContext: [overheadContext],
    notes: ["Catch variations are not modeled yet."],
  }),
  "kettlebell-swing": defineRule({
    coreMovementId: "kettlebell-swing",
    allowedApparatusIds: ["kettlebell"],
    allowedMovementPatternIds: ["ballistic-hinge"],
    allowedModifierCategoryIds: baseCategories,
    allowedAnglePositionModifierIds: [angle.standing],
    allowedLimbUsageModifierIds: [limb.bilateral, limb.unilateral, limb.alternating],
    allowedStabilityModifierIds: [stability.stable],
    allowedTempoModifierIds: [tempo.explosive],
    allowedAssistanceResistanceModifierIds: empty,
    allowedRangeOfMotionModifierIds: empty,
    allowedLoadBehaviorModifierIds: [load.ballistic],
    requiredContext: [],
    notes: ["Reject seated, incline, and machine variants because the hinge must stay ballistic and standing."],
  }),
  "kettlebell-clean": defineRule({
    coreMovementId: "kettlebell-clean",
    allowedApparatusIds: ["kettlebell"],
    allowedMovementPatternIds: ["olympic-pull-catch", "ballistic-hinge"],
    allowedModifierCategoryIds: baseCategories,
    allowedAnglePositionModifierIds: [angle.standing],
    allowedLimbUsageModifierIds: [limb.unilateral, limb.bilateral, limb.alternating],
    allowedStabilityModifierIds: [stability.stable],
    allowedTempoModifierIds: [tempo.explosive],
    allowedAssistanceResistanceModifierIds: empty,
    allowedRangeOfMotionModifierIds: empty,
    allowedLoadBehaviorModifierIds: [load.ballistic, load.skill],
    requiredContext: [],
    notes: ["Rack position quality should become required coaching context later."],
  }),
  "kettlebell-snatch": defineRule({
    coreMovementId: "kettlebell-snatch",
    allowedApparatusIds: ["kettlebell"],
    allowedMovementPatternIds: ["olympic-pull-catch"],
    allowedModifierCategoryIds: baseCategories,
    allowedAnglePositionModifierIds: [angle.standing],
    allowedLimbUsageModifierIds: [limb.unilateral, limb.bilateral, limb.alternating],
    allowedStabilityModifierIds: [stability.stable],
    allowedTempoModifierIds: [tempo.explosive],
    allowedAssistanceResistanceModifierIds: empty,
    allowedRangeOfMotionModifierIds: empty,
    allowedLoadBehaviorModifierIds: [load.ballistic, load.skill],
    requiredContext: [overheadContext],
    notes: ["Snatch variations need shoulder-readiness checks before AI prescription."],
  }),
  "turkish-get-up": defineRule({
    coreMovementId: "turkish-get-up",
    allowedApparatusIds: ["kettlebell", "dumbbell", "bodyweight"],
    allowedMovementPatternIds: ["step-gait-jump", "mobility-flow"],
    allowedModifierCategoryIds: baseCategories,
    allowedAnglePositionModifierIds: [
      angle.supine,
      angle.halfKneeling,
      angle.tallKneeling,
      angle.standing,
    ],
    allowedLimbUsageModifierIds: [limb.unilateral],
    allowedStabilityModifierIds: [
      stability.stable,
      stability.balanceFocused,
      stability.singleLeg,
    ],
    allowedTempoModifierIds: [tempo.isometric, tempo.controlled],
    allowedAssistanceResistanceModifierIds: [assistance.deloaded],
    allowedRangeOfMotionModifierIds: fullPartialRom,
    allowedLoadBehaviorModifierIds: [load.skill],
    requiredContext: [overheadContext],
    notes: ["Reject machine and sled because the get-up is a floor-to-stand skill complex."],
  }),
  "kettlebell-halo": defineRule({
    coreMovementId: "kettlebell-halo",
    allowedApparatusIds: ["kettlebell", "dumbbell"],
    allowedMovementPatternIds: ["rotation"],
    allowedModifierCategoryIds: baseCategories,
    allowedAnglePositionModifierIds: [
      angle.standing,
      angle.seated,
      angle.halfKneeling,
      angle.tallKneeling,
    ],
    allowedLimbUsageModifierIds: [limb.bilateral],
    allowedStabilityModifierIds: [stability.stable, stability.balanceFocused],
    allowedTempoModifierIds: [tempo.controlled, tempo.slowEccentric],
    allowedAssistanceResistanceModifierIds: [assistance.deloaded],
    allowedRangeOfMotionModifierIds: fullPartialRom,
    allowedLoadBehaviorModifierIds: [load.skill],
    requiredContext: [overheadContext],
    notes: ["Shoulder mobility readiness should be checked before loading."],
  }),
  "bottoms-up-press": defineRule({
    coreMovementId: "bottoms-up-press",
    allowedApparatusIds: ["kettlebell"],
    allowedMovementPatternIds: ["vertical-push"],
    allowedModifierCategoryIds: baseCategories,
    allowedAnglePositionModifierIds: [
      angle.standing,
      angle.seated,
      angle.halfKneeling,
      angle.tallKneeling,
    ],
    allowedLimbUsageModifierIds: [limb.unilateral, limb.bilateral],
    allowedStabilityModifierIds: [
      stability.stable,
      stability.balanceFocused,
      stability.singleLeg,
    ],
    allowedTempoModifierIds: [tempo.controlled, tempo.isometric],
    allowedAssistanceResistanceModifierIds: [assistance.deloaded],
    allowedRangeOfMotionModifierIds: pressRom,
    allowedLoadBehaviorModifierIds: [load.skill],
    requiredContext: [overheadContext],
    notes: ["Grip and wrist-control readiness should be modeled before broad prescription."],
  }),
  "mobility-flow": defineRule({
    coreMovementId: "mobility-flow",
    allowedApparatusIds: ["bodyweight", "band", "bench", "box"],
    allowedMovementPatternIds: [
      "mobility-flow",
      "gait",
      "rotation",
      "hip-external-rotation",
      "hip-internal-rotation",
    ],
    allowedModifierCategoryIds: baseCategories,
    allowedAnglePositionModifierIds: [
      angle.standing,
      angle.halfKneeling,
      angle.tallKneeling,
      angle.supine,
      angle.prone,
      angle.splitStance,
      angle.seated,
    ],
    allowedLimbUsageModifierIds: [
      limb.bilateral,
      limb.unilateral,
      limb.alternating,
      limb.staggered,
    ],
    allowedStabilityModifierIds: [
      stability.stable,
      stability.balanceFocused,
      stability.singleLeg,
    ],
    allowedTempoModifierIds: [tempo.controlled, tempo.isometric],
    allowedAssistanceResistanceModifierIds: [assistance.assisted, assistance.deloaded],
    allowedRangeOfMotionModifierIds: fullPartialRom,
    allowedLoadBehaviorModifierIds: [load.skill],
    requiredContext: [],
    notes: ["Mobility flows need region-specific tags before advanced recovery logic."],
  }),
  "jump-landing": defineRule({
    coreMovementId: "jump-landing",
    allowedApparatusIds: ["bodyweight", "box"],
    allowedMovementPatternIds: ["step-gait-jump"],
    allowedModifierCategoryIds: baseCategories,
    allowedAnglePositionModifierIds: [angle.standing],
    allowedLimbUsageModifierIds: [limb.bilateral],
    allowedStabilityModifierIds: [stability.stable, stability.balanceFocused],
    allowedTempoModifierIds: [tempo.explosive],
    allowedAssistanceResistanceModifierIds: empty,
    allowedRangeOfMotionModifierIds: fullPartialRom,
    allowedLoadBehaviorModifierIds: [load.ballistic],
    requiredContext: [landingContext],
    notes: ["Reject seated or machine variants because jumps require free landing mechanics."],
  }),
  "medicine-ball-slam": defineRule({
    coreMovementId: "medicine-ball-slam",
    allowedApparatusIds: ["medicine-ball", "slam-ball"],
    allowedMovementPatternIds: ["ballistic-throw-slam"],
    allowedModifierCategoryIds: baseCategories,
    allowedAnglePositionModifierIds: [angle.standing, angle.halfKneeling],
    allowedLimbUsageModifierIds: [limb.bilateral, limb.unilateral, limb.alternating],
    allowedStabilityModifierIds: [stability.stable],
    allowedTempoModifierIds: [tempo.explosive],
    allowedAssistanceResistanceModifierIds: empty,
    allowedRangeOfMotionModifierIds: fullPartialRom,
    allowedLoadBehaviorModifierIds: [load.ballistic],
    requiredContext: [landingContext],
    notes: ["Throw direction and rebound context are not modeled yet."],
  }),
  burpee: defineRule({
    coreMovementId: "burpee",
    allowedApparatusIds: ["bodyweight", "box"],
    allowedMovementPatternIds: ["locomotion-conditioning"],
    allowedModifierCategoryIds: baseCategories,
    allowedAnglePositionModifierIds: [angle.standing, angle.prone],
    allowedLimbUsageModifierIds: [limb.bilateral],
    allowedStabilityModifierIds: [stability.stable],
    allowedTempoModifierIds: [tempo.explosive, tempo.controlled],
    allowedAssistanceResistanceModifierIds: [assistance.deloaded],
    allowedRangeOfMotionModifierIds: fullPartialRom,
    allowedLoadBehaviorModifierIds: [load.cyclical],
    requiredContext: [landingContext],
    notes: ["Burpees should eventually carry impact and fatigue tags."],
  }),
  "sled-drive": defineRule({
    coreMovementId: "sled-drive",
    allowedApparatusIds: ["sled"],
    allowedMovementPatternIds: ["sled-drive", "gait"],
    allowedModifierCategoryIds: baseCategories,
    allowedAnglePositionModifierIds: [angle.standing],
    allowedLimbUsageModifierIds: [limb.bilateral, limb.alternating],
    allowedStabilityModifierIds: [stability.stable],
    allowedTempoModifierIds: [tempo.explosive, tempo.controlled],
    allowedAssistanceResistanceModifierIds: [assistance.deloaded],
    allowedRangeOfMotionModifierIds: empty,
    allowedLoadBehaviorModifierIds: [load.cyclical, load.grind],
    requiredContext: [sledContext],
    notes: ["Push versus pull direction should become a modifier or prescription detail."],
  }),
};

const canonicalizeApparatusId = (apparatusId: ApparatusId): ApparatusId | null => {
  if (apparatusId === "suspension") return "trx";
  if (apparatusId === "stability-ball") return null;
  return apparatusId;
};

const canonicalizeModifierId = (
  modifierId: ExerciseModifierId,
): ExerciseModifierId | null => {
  if (
    modifierId === "apparatus:suspension" ||
    modifierId === ("apparatus:suspension-trainer" as ExerciseModifierId) ||
    modifierId === ("apparatus:suspension-training" as ExerciseModifierId)
  ) {
    return "apparatus:trx";
  }
  if (modifierId === "apparatus:stability-ball") return null;
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
  if (modifierId === ("stability:stable" as ExerciseModifierId)) {
    return null;
  }
  if (modifierId === ("stability:single-leg" as ExerciseModifierId)) {
    return "limb-usage:single-leg";
  }
  if (modifierId === "limb-usage:bilateral") {
    return null;
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
    return null;
  }
  if (modifierId === "limb-usage:sumo-stance") {
    return "limb-usage:wide-stance";
  }
  if (modifierId === ("execution-style:bilateral" as ExerciseModifierId)) {
    return null;
  }
  if (modifierId === ("execution-style:contralateral" as ExerciseModifierId)) {
    return "assistance-resistance:contralateral";
  }
  if (modifierId === ("execution-style:ipsilateral" as ExerciseModifierId)) {
    return "assistance-resistance:ipsilateral";
  }
  if (modifierId === ("execution-style:single-arm" as ExerciseModifierId)) {
    return null;
  }
  if (modifierId === ("execution-style:single-leg" as ExerciseModifierId)) {
    return "limb-usage:single-leg";
  }
  if (modifierId === ("execution-style:offset" as ExerciseModifierId)) {
    return null;
  }
  if (modifierId === ("stability:chaotic" as ExerciseModifierId)) {
    return "assistance-resistance:chaotic";
  }
  if (
    modifierId !== "stability:bosu" &&
    EXERCISE_MODIFIER_BY_ID[modifierId]?.categoryId === "stability"
  ) {
    return null;
  }
  if (modifierId === ("assistance-resistance:band-assisted" as ExerciseModifierId)) {
    return "assistance-resistance:assisted";
  }
  if (modifierId === ("assistance-resistance:weighted" as ExerciseModifierId)) {
    return null;
  }
  if (
    modifierId === ("assistance-resistance:accommodating-resistance" as ExerciseModifierId)
  ) {
    return "assistance-resistance:variable-resistance";
  }
  if (
    modifierId === ("assistance-resistance:deloaded" as ExerciseModifierId) ||
    modifierId === ("assistance-resistance:partner-assisted" as ExerciseModifierId)
  ) {
    return null;
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

const canonicalizeModifierIdForMovement = (
  coreMovementId: CoreMovementId,
  modifierId: ExerciseModifierId,
) => {
  const canonicalModifierId = canonicalizeModifierId(modifierId);

  if (
    hipThrustBridgeCompatibilityCoreIds.has(coreMovementId) &&
    canonicalModifierId === angle.supine
  ) {
    return angle.floor;
  }

  if (coreMovementId === "lunge" && canonicalModifierId === limb.staggered) {
    return limb.standard;
  }

  return canonicalModifierId;
};

const canonicalizeModifierIds = (modifierIds: ExerciseModifierId[]) =>
  compactUnique(
    modifierIds
      .map(canonicalizeModifierId)
      .filter((modifierId): modifierId is ExerciseModifierId => Boolean(modifierId)),
  );

const getModifierIdsByCategory = (
  modifierIds: ExerciseModifierId[],
  categoryId: ExerciseModifierCategoryId,
) =>
  canonicalizeModifierIds(modifierIds).filter(
    (modifierId) => EXERCISE_MODIFIER_BY_ID[modifierId]?.categoryId === categoryId,
  );

const getApparatusIdsFromModifierIds = (modifierIds: ExerciseModifierId[]) =>
  compactUnique(
    canonicalizeModifierIds(modifierIds)
      .map((modifierId) => EXERCISE_MODIFIER_BY_ID[modifierId])
      .filter((modifier) => modifier?.categoryId === "apparatus")
      .map((modifier) => canonicalizeApparatusId(modifier.slug as ApparatusId))
      .filter((apparatusId): apparatusId is ApparatusId => Boolean(apparatusId)),
  );

const canonicalizeApparatusIds = (apparatusIds: ApparatusId[] = []) =>
  compactUnique(
    apparatusIds
      .map(canonicalizeApparatusId)
      .filter((apparatusId): apparatusId is ApparatusId => Boolean(apparatusId)),
  );

const mergeFinalizedCompatibilityRule = (
  card: (typeof CORE_MOVEMENT_PATTERN_CARD_DEFINITIONS)[number],
) => {
  const existingRule = CORE_MOVEMENT_COMPATIBILITY_RULES[card.coreMovementId];
  const semanticModifierIds = getCoreMovementPatternSemanticVariations(card.id)
    .flatMap((variation) => [
      ...variation.modifierIds,
      ...variation.allowedApparatusIds,
      ...variation.definingModifierIds,
      ...variation.matchModifierSets.flat(),
    ]);
  const modifierIds = canonicalizeModifierIds([
    ...card.modifierIds,
    ...semanticModifierIds,
  ]);
  const coreMovement = CORE_MOVEMENT_BY_ID[card.coreMovementId];
  const existingApparatusIds = canonicalizeApparatusIds(
    existingRule?.allowedApparatusIds || [],
  );

  return defineRule({
    coreMovementId: card.coreMovementId,
    allowedApparatusIds: compactUnique([
      ...existingApparatusIds,
      ...getApparatusIdsFromModifierIds(modifierIds),
    ]),
    allowedMovementPatternIds: compactUnique(
      [
        ...(existingRule?.allowedMovementPatternIds || []),
        card.movementPatternId,
        coreMovement?.patternId,
      ].filter((id): id is MovementPatternId => Boolean(id)),
    ),
    allowedModifierCategoryIds: baseCategories,
    allowedAnglePositionModifierIds: compactUnique([
      ...(existingRule?.allowedAnglePositionModifierIds || []),
      ...getModifierIdsByCategory(modifierIds, "angle-position"),
    ]),
    allowedLimbUsageModifierIds: compactUnique([
      ...(existingRule?.allowedLimbUsageModifierIds || []),
      ...getModifierIdsByCategory(modifierIds, "limb-usage"),
    ]),
    allowedExecutionStyleModifierIds: compactUnique([
      ...(existingRule?.allowedExecutionStyleModifierIds || []),
      ...getModifierIdsByCategory(modifierIds, "execution-style"),
    ]),
    allowedDirectionModifierIds: compactUnique([
      ...(existingRule?.allowedDirectionModifierIds || []),
      ...getModifierIdsByCategory(modifierIds, "direction"),
    ]),
    allowedStabilityModifierIds: compactUnique([
      ...(existingRule?.allowedStabilityModifierIds || []),
      ...getModifierIdsByCategory(modifierIds, "stability"),
    ]),
    allowedTempoModifierIds: compactUnique([
      ...(existingRule?.allowedTempoModifierIds || []),
      ...getModifierIdsByCategory(modifierIds, "tempo"),
    ]),
    allowedAssistanceResistanceModifierIds: compactUnique([
      ...(existingRule?.allowedAssistanceResistanceModifierIds || []),
      ...getModifierIdsByCategory(modifierIds, "assistance-resistance"),
      ...(sideRelationshipResistanceCoreIds.has(card.coreMovementId)
        ? [assistance.contralateral, assistance.ipsilateral]
        : []),
    ]),
    allowedRangeOfMotionModifierIds: compactUnique([
      ...(existingRule?.allowedRangeOfMotionModifierIds || []),
      ...getModifierIdsByCategory(modifierIds, "range-of-motion"),
    ]),
    allowedLoadBehaviorModifierIds: compactUnique([
      ...(existingRule?.allowedLoadBehaviorModifierIds || []),
      ...getModifierIdsByCategory(modifierIds, "load-behavior"),
    ]),
    requiredContext: existingRule?.requiredContext || [],
    notes: existingRule?.notes || [
      "Generated from finalized core movement semantic variation definitions.",
    ],
  });
};

CORE_MOVEMENT_PATTERN_CARD_DEFINITIONS.forEach((card) => {
  CORE_MOVEMENT_COMPATIBILITY_RULES[card.coreMovementId] =
    mergeFinalizedCompatibilityRule(card);
});

const getModifierIdsForRule = (rule: MovementCompatibilityRule) =>
  compactUnique([
    ...rule.allowedApparatusIds.map(apparatusModifierId),
    ...rule.allowedAnglePositionModifierIds,
    ...rule.allowedLimbUsageModifierIds,
    ...rule.allowedExecutionStyleModifierIds,
    ...rule.allowedDirectionModifierIds,
    ...rule.allowedStabilityModifierIds,
    ...rule.allowedTempoModifierIds,
    ...rule.allowedAssistanceResistanceModifierIds,
    ...rule.allowedRangeOfMotionModifierIds,
    ...rule.allowedLoadBehaviorModifierIds,
    ...(rule.allowedModifierCategoryIds.includes("training-intent")
      ? allTrainingIntentModifierIds
      : []),
  ]);

const getRuleForMovement = (coreMovementId: CoreMovementId) =>
  CORE_MOVEMENT_COMPATIBILITY_RULES[coreMovementId] || null;

const getSelectedApparatusIds = (
  input: ExerciseVariationValidationInput,
): ApparatusId[] => {
  const apparatusFromModifiers = (input.modifierIds || [])
    .map((modifierId) => canonicalizeModifierId(modifierId) || modifierId)
    .map((modifierId) => EXERCISE_MODIFIER_BY_ID[modifierId])
    .filter((modifier) => modifier?.categoryId === "apparatus")
    .map((modifier) => canonicalizeApparatusId(modifier.slug as ApparatusId))
    .filter((apparatusId): apparatusId is ApparatusId => Boolean(apparatusId));

  return compactUnique([
    ...apparatusFromModifiers,
    ...(input.primaryApparatusId
      ? canonicalizeApparatusIds([input.primaryApparatusId])
      : []),
  ]);
};

const getAllowedIdsForModifierCategory = (
  rule: MovementCompatibilityRule,
  categoryId: ExerciseModifierCategoryId,
) => {
  if (categoryId === "apparatus") {
    return rule.allowedApparatusIds.map(apparatusModifierId);
  }
  if (categoryId === "angle-position") return rule.allowedAnglePositionModifierIds;
  if (categoryId === "limb-usage") return rule.allowedLimbUsageModifierIds;
  if (categoryId === "execution-style") {
    return rule.allowedExecutionStyleModifierIds;
  }
  if (categoryId === "direction") return rule.allowedDirectionModifierIds;
  if (categoryId === "stability") return rule.allowedStabilityModifierIds;
  if (categoryId === "tempo") return rule.allowedTempoModifierIds;
  if (categoryId === "assistance-resistance") {
    return rule.allowedAssistanceResistanceModifierIds;
  }
  if (categoryId === "range-of-motion") {
    return rule.allowedRangeOfMotionModifierIds;
  }
  if (categoryId === "load-behavior") return rule.allowedLoadBehaviorModifierIds;
  if (categoryId === "training-intent") return allTrainingIntentModifierIds;

  return [];
};

const getModifierLabel = (modifierId: ExerciseModifierId) =>
  EXERCISE_MODIFIER_BY_ID[modifierId]?.label || modifierId;

export const validateExerciseVariation = (
  input: ExerciseVariationValidationInput,
): ExerciseVariationValidationResult => {
  const issues: MovementCompatibilityIssue[] = [];
  const warnings: MovementCompatibilityWarning[] = [];
  const coreMovement = CORE_MOVEMENT_BY_ID[input.coreMovementId];

  if (!coreMovement) {
    return {
      isValid: false,
      issues: [
        {
          code: "unknown-core-movement",
          message: `Unknown core movement "${input.coreMovementId}".`,
        },
      ],
      warnings,
      rule: null,
    };
  }

  const rule = getRuleForMovement(input.coreMovementId);
  if (!rule) {
    return {
      isValid: false,
      issues: [
        {
          code: "missing-rule",
          message: `No compatibility rule is defined for ${coreMovement.label}.`,
        },
      ],
      warnings,
      rule: null,
    };
  }

  const movementPatternId = input.movementPatternId || coreMovement.patternId;
  if (!rule.allowedMovementPatternIds.includes(movementPatternId)) {
    issues.push({
      code: "movement-pattern",
      movementPatternId,
      message: `${coreMovement.label} does not allow movement pattern "${movementPatternId}".`,
    });
  }

  getSelectedApparatusIds(input).forEach((apparatusId) => {
    if (
      rule.forbiddenApparatusIds.includes(apparatusId) ||
      !rule.allowedApparatusIds.includes(apparatusId)
    ) {
      issues.push({
        code: "apparatus",
        apparatusId,
        message: `${coreMovement.label} does not allow apparatus "${apparatusId}".`,
      });
    }
  });

  (input.modifierIds || []).forEach((rawModifierId) => {
    const modifierId =
      canonicalizeModifierIdForMovement(input.coreMovementId, rawModifierId) ||
      rawModifierId;
    const modifier = EXERCISE_MODIFIER_BY_ID[modifierId];
    if (!modifier) {
      issues.push({
        code: "modifier",
        modifierId,
        message: `Unknown modifier "${modifierId}".`,
      });
      return;
    }

    if (!rule.allowedModifierCategoryIds.includes(modifier.categoryId)) {
      issues.push({
        code: "modifier-category",
        modifierId,
        message: `${coreMovement.label} does not allow modifier category "${modifier.categoryId}".`,
      });
      return;
    }

    if (modifier.categoryId === "apparatus") return;

    const allowedModifierIds = getAllowedIdsForModifierCategory(
      rule,
      modifier.categoryId,
    );

    if (
      rule.forbiddenModifierIds.includes(modifierId) ||
      !allowedModifierIds.includes(modifierId)
    ) {
      issues.push({
        code: "modifier",
        modifierId,
        message: `${coreMovement.label} does not allow modifier "${getModifierLabel(
          modifierId,
        )}".`,
      });
    }
  });

  if (input.contextIds && rule.requiredContext.length > 0) {
    rule.requiredContext
      .filter((context) => !input.contextIds?.includes(context.id))
      .forEach((context) => {
        warnings.push({
          code: "context",
          message: `${coreMovement.label} may require context: ${context.label}.`,
        });
      });
  }

  return {
    isValid: issues.length === 0,
    issues,
    warnings,
    rule,
  };
};

export const getCompatibleModifiersForMovement = (
  coreMovementId: CoreMovementId,
  categoryId?: ExerciseModifierCategoryId,
) => {
  const rule = getRuleForMovement(coreMovementId);
  if (!rule) return [];

  const modifierIds = categoryId
    ? getAllowedIdsForModifierCategory(rule, categoryId)
    : getModifierIdsForRule(rule);

  return modifierIds
    .map((modifierId) => EXERCISE_MODIFIER_BY_ID[modifierId])
    .filter(Boolean) as ExerciseModifier[];
};

export const getCompatibleApparatusForMovement = (
  coreMovementId: CoreMovementId,
) => {
  const rule = getRuleForMovement(coreMovementId);
  if (!rule) return [];

  return rule.allowedApparatusIds
    .map((apparatusId) =>
      APPARATUS_MODIFIERS.find((modifier) => modifier.apparatusId === apparatusId),
    )
    .filter(Boolean) as Apparatus[];
};

export const explainIncompatibleCombination = (
  input: ExerciseVariationValidationInput,
) => {
  const result = validateExerciseVariation(input);
  if (result.isValid) return "This movement variation is compatible.";

  return result.issues[0]?.message || "This movement variation is not compatible.";
};

export const MOVEMENT_COMPATIBILITY_VALIDATION_EXAMPLES = [
  {
    id: "pull-up-rejects-ab-wheel",
    label: "Pull-up rejects ab wheel",
    expectedValid: false,
    variation: {
      coreMovementId: "pull-up",
      movementPatternId: "vertical-pull",
      modifierIds: [apparatusModifierId("ab-wheel"), limb.bilateral],
    },
  },
  {
    id: "ab-wheel-rejects-pull-up-bar",
    label: "Ab wheel rejects pull-up bar",
    expectedValid: false,
    variation: {
      coreMovementId: "brace-plank",
      movementPatternId: "brace",
      modifierIds: [apparatusModifierId("pull-up-bar"), angle.tallKneeling],
    },
  },
  {
    id: "kettlebell-swing-rejects-incline-seated-machine",
    label: "Kettlebell swing rejects incline, seated, and machine",
    expectedValid: false,
    variation: {
      coreMovementId: "kettlebell-swing",
      movementPatternId: "ballistic-hinge",
      modifierIds: [
        apparatusModifierId("machine"),
        angle.incline,
        angle.seated,
        limb.bilateral,
        load.ballistic,
      ],
    },
  },
  {
    id: "leg-extension-rejects-kettlebell",
    label: "Leg extension rejects kettlebell",
    expectedValid: false,
    variation: {
      coreMovementId: "leg-extension",
      movementPatternId: "knee-extension",
      modifierIds: [apparatusModifierId("kettlebell"), angle.seated],
    },
  },
  {
    id: "turkish-get-up-rejects-machine",
    label: "Turkish get-up rejects machine",
    expectedValid: false,
    variation: {
      coreMovementId: "turkish-get-up",
      movementPatternId: "step-gait-jump",
      modifierIds: [apparatusModifierId("machine"), limb.unilateral, load.skill],
    },
  },
  {
    id: "turkish-get-up-rejects-sled",
    label: "Turkish get-up rejects sled",
    expectedValid: false,
    variation: {
      coreMovementId: "turkish-get-up",
      movementPatternId: "step-gait-jump",
      modifierIds: [apparatusModifierId("sled"), limb.unilateral, load.skill],
    },
  },
  {
    id: "box-jump-rejects-seated-machine",
    label: "Box jump rejects seated machine",
    expectedValid: false,
    variation: {
      coreMovementId: "jump-landing",
      movementPatternId: "step-gait-jump",
      modifierIds: [apparatusModifierId("machine"), angle.seated, load.ballistic],
    },
  },
  {
    id: "valid-pull-up",
    label: "Valid pull-up",
    expectedValid: true,
    variation: {
      coreMovementId: "pull-up",
      movementPatternId: "vertical-pull",
      modifierIds: [
        apparatusModifierId("pull-up-bar"),
        limb.bilateral,
        stability.stable,
        rom.full,
      ],
    },
  },
  {
    id: "valid-ab-wheel-rollout",
    label: "Valid ab wheel rollout",
    expectedValid: true,
    variation: {
      coreMovementId: "brace-plank",
      movementPatternId: "brace",
      modifierIds: [
        apparatusModifierId("ab-wheel"),
        angle.tallKneeling,
        stability.stable,
        load.skill,
      ],
    },
  },
  {
    id: "valid-kettlebell-swing",
    label: "Valid kettlebell swing",
    expectedValid: true,
    variation: {
      coreMovementId: "kettlebell-swing",
      movementPatternId: "ballistic-hinge",
      modifierIds: [
        apparatusModifierId("kettlebell"),
        angle.standing,
        limb.bilateral,
        stability.stable,
        tempo.explosive,
        load.ballistic,
      ],
    },
  },
  {
    id: "valid-leg-extension",
    label: "Valid leg extension",
    expectedValid: true,
    variation: {
      coreMovementId: "leg-extension",
      movementPatternId: "knee-extension",
      modifierIds: [
        apparatusModifierId("machine"),
        angle.seated,
        limb.bilateral,
        stability.stable,
        rom.full,
        load.ascending,
      ],
    },
  },
  {
    id: "valid-turkish-get-up",
    label: "Valid Turkish get-up",
    expectedValid: true,
    variation: {
      coreMovementId: "turkish-get-up",
      movementPatternId: "step-gait-jump",
      modifierIds: [
        apparatusModifierId("kettlebell"),
        angle.supine,
        limb.unilateral,
        stability.balanceFocused,
        load.skill,
      ],
    },
  },
  {
    id: "valid-box-jump",
    label: "Valid box jump",
    expectedValid: true,
    variation: {
      coreMovementId: "jump-landing",
      movementPatternId: "step-gait-jump",
      modifierIds: [
        apparatusModifierId("box"),
        angle.standing,
        limb.bilateral,
        stability.stable,
        tempo.explosive,
        load.ballistic,
      ],
    },
  },
] satisfies CompatibilityExample[];

export const runMovementCompatibilityValidationExamples = () =>
  MOVEMENT_COMPATIBILITY_VALIDATION_EXAMPLES.map((example) => {
    const result = validateExerciseVariation(example.variation);

    return {
      ...example,
      result,
      passed: result.isValid === example.expectedValid,
      explanation: explainIncompatibleCombination(example.variation),
    };
  });

export const getMovementCompatibilityCoverageReport = () => {
  const rows = CORE_MOVEMENTS.map((movement) => {
    const rule = getRuleForMovement(movement.id);
    const defaultResult = validateExerciseVariation({
      coreMovementId: movement.id,
      movementPatternId: movement.patternId,
      modifierIds: movement.defaultModifierIds,
      primaryApparatusId:
        movement.defaultModifierIds
          .map((modifierId) => EXERCISE_MODIFIER_BY_ID[modifierId])
          .find((modifier) => modifier?.categoryId === "apparatus")?.slug as
          | ApparatusId
          | undefined,
    });

    return {
      coreMovementId: movement.id,
      label: movement.label,
      hasRule: Boolean(rule),
      defaultVariationValid: defaultResult.isValid,
      defaultIssues: defaultResult.issues,
      allowedApparatusCount: rule?.allowedApparatusIds.length || 0,
      allowedPatternCount: rule?.allowedMovementPatternIds.length || 0,
      allowedModifierCount: rule ? getModifierIdsForRule(rule).length : 0,
      forbiddenApparatusCount: rule?.forbiddenApparatusIds.length || 0,
      forbiddenModifierCount: rule?.forbiddenModifierIds.length || 0,
      requiredContextCount: rule?.requiredContext.length || 0,
    };
  });

  return {
    totalCoreMovements: CORE_MOVEMENTS.length,
    rulesDefined: rows.filter((row) => row.hasRule).length,
    missingRuleIds: rows
      .filter((row) => !row.hasRule)
      .map((row) => row.coreMovementId),
    defaultVariationsValid: rows.filter((row) => row.defaultVariationValid).length,
    defaultVariationFailures: rows.filter((row) => !row.defaultVariationValid),
    rows,
  };
};
