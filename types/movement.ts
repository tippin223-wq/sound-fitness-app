import type { ExerciseCatalogItem, ExerciseGoal, ExerciseLevel } from "./exercise";

export type MovementPatternCategoryId =
  | "lower-body-compound"
  | "lower-body-isolation"
  | "upper-push"
  | "upper-pull"
  | "arm-isolation"
  | "core"
  | "athletic"
  | "mobility"
  | "cervical-isolation"
  | "integrated";

export type MovementPatternId =
  | "horizontal-push"
  | "horizontal-pull"
  | "vertical-push"
  | "vertical-pull"
  | "squat"
  | "hinge"
  | "lunge"
  | "step-up"
  | "hip-thrust-bridge"
  | "gait"
  | "knee-extension"
  | "knee-flexion"
  | "hip-extension"
  | "hip-abduction"
  | "hip-adduction"
  | "hip-external-rotation"
  | "hip-internal-rotation"
  | "calf-raise"
  | "tibialis-raise"
  | "plantarflexion"
  | "dorsiflexion"
  | "chest-press"
  | "shoulder-press"
  | "chest-fly"
  | "lateral-raise"
  | "row"
  | "pullover"
  | "reverse-fly"
  | "curl"
  | "triceps-extension"
  | "elbow-flexion"
  | "elbow-extension"
  | "wrist-flexion"
  | "wrist-extension"
  | "wrist-rotation"
  | "shoulder-abduction"
  | "shoulder-external-rotation"
  | "shoulder-internal-rotation"
  | "scapular-control"
  | "scapular-retraction"
  | "scapular-protraction"
  | "step-gait-jump"
  | "ballistic-hinge"
  | "ballistic-throw-slam"
  | "olympic-pull-catch"
  | "mobility-flow"
  | "locomotion-conditioning"
  | "sled-drive"
  | "rotation"
  | "anti-rotation"
  | "flexion"
  | "anti-extension"
  | "anti-lateral-flexion"
  | "carry"
  | "crawl"
  | "jump"
  | "sprint"
  | "throw"
  | "brace"
  | "mobility"
  | "breathing-bracing"
  | "neck-flexion"
  | "neck-extension"
  | "neck-rotation"
  | "integrated-movement";

export type CoreMovementId =
  | "chest-press"
  | "chest-fly"
  | "row"
  | "squat"
  | "hinge"
  | "lunge"
  | "shoulder-press"
  | "vertical-pull"
  | "pullover"
  | "pulldown"
  | "pull-up"
  | "carry"
  | "crawl"
  | "jump"
  | "sprint"
  | "throw"
  | "rotation"
  | "anti-rotation"
  | "flexion"
  | "anti-extension"
  | "anti-lateral-flexion"
  | "brace-plank"
  | "knee-extension"
  | "knee-flexion"
  | "leg-extension"
  | "leg-curl"
  | "hip-thrust-bridge"
  | "hip-thrust-glute-bridge"
  | "calf-raise"
  | "tibialis-raise"
  | "hip-abduction"
  | "hip-adduction"
  | "hip-internal-rotation"
  | "hip-external-rotation"
  | "biceps-curl"
  | "curl"
  | "triceps-extension"
  | "wrist-flexion"
  | "wrist-extension"
  | "wrist-rotation"
  | "lateral-raise"
  | "reverse-fly"
  | "rear-delt-raise"
  | "face-pull"
  | "shoulder-internal-rotation"
  | "shoulder-external-rotation"
  | "scapular-control"
  | "shrug"
  | "step-up"
  | "step-down"
  | "split-squat"
  | "clean-pull"
  | "high-pull"
  | "kettlebell-swing"
  | "kettlebell-clean"
  | "kettlebell-snatch"
  | "turkish-get-up"
  | "kettlebell-halo"
  | "bottoms-up-press"
  | "mobility-flow"
  | "mobility"
  | "breathing-bracing"
  | "neck-flexion"
  | "neck-extension"
  | "neck-rotation"
  | "jump-landing"
  | "medicine-ball-slam"
  | "burpee"
  | "sled-drive"
  | "integrated-movement";

export type ApparatusId =
  | "dumbbell"
  | "barbell"
  | "cable"
  | "machine"
  | "kettlebell"
  | "bodyweight"
  | "band"
  | "smith-machine"
  | "trap-bar"
  | "trx"
  | "suspension"
  | "landmine"
  | "bench"
  | "box"
  | "medicine-ball"
  | "pull-up-bar"
  | "sled"
  | "sliders"
  | "stability-ball"
  | "ab-wheel";

export type AnglePositionId =
  | "incline"
  | "decline"
  | "flat"
  | "floor"
  | "hands-elevated"
  | "feet-elevated"
  | "frog-stance"
  | "seated"
  | "standing"
  | "kneeling"
  | "half-kneeling"
  | "split-stance"
  | "tall-kneeling"
  | "supine"
  | "prone"
  | "lying"
  | "side-lying"
  | "bent-over"
  | "chest-supported"
  | "bench-supported"
  | "plank"
  | "rear-foot-elevated"
  | "front-foot-elevated"
  | "goblet"
  | "front-loaded"
  | "back-loaded"
  | "overhead"
  | "preacher"
  | "side-support"
  | "quadruped"
  | "90-90"
  | "hanging";

export type LimbUsageId =
  | "bilateral"
  | "unilateral"
  | "alternating"
  | "staggered"
  | "offset"
  | "standard-stance"
  | "narrow-stance"
  | "conventional-stance"
  | "sumo-stance"
  | "wide-stance"
  | "close-grip"
  | "wide-grip"
  | "neutral-grip"
  | "overhand-grip"
  | "underhand-grip"
  | "single-arm"
  | "single-leg";

export type DirectionId =
  | "vertical"
  | "forward"
  | "reverse"
  | "walking"
  | "lateral"
  | "rotational"
  | "crossover";

export type StabilityId =
  | "unstable"
  | "swiss-ball"
  | "bosu"
  | "suspension"
  | "balance-focused"
  | "offset-stability"
  | "stability-pad"
  | "reactive-surface"
  | "dynamic-stability";

export type TempoId =
  | "explosive"
  | "paused"
  | "eccentric-only"
  | "slow-eccentric"
  | "isometric"
  | "tempo-controlled";

export type AssistanceResistanceId =
  | "assisted"
  | "band-assisted"
  | "chaotic"
  | "chains"
  | "partner-assisted";

export type RangeOfMotionId =
  | "full-rom"
  | "shortened-partial"
  | "lengthened-partial"
  | "deficit"
  | "dead-stop"
  | "rom-limiter";

export type TrainingIntentId =
  | "hypertrophy"
  | "strength"
  | "power"
  | "endurance"
  | "rehab"
  | "mobility"
  | "stability"
  | "athletic-performance";

export type LoadBehaviorId =
  | "constant-load"
  | "variable-resistance"
  | "accommodating-curve"
  | "ascending-strength-curve"
  | "descending-strength-curve"
  | "ballistic"
  | "cyclical"
  | "grind"
  | "loaded-carry"
  | "skill-complex";

export type ExerciseModifierCategoryId =
  | "apparatus"
  | "angle-position"
  | "limb-usage"
  | "direction"
  | "stability"
  | "tempo"
  | "assistance-resistance"
  | "range-of-motion"
  | "training-intent"
  | "load-behavior";

export type ExerciseModifierId =
  | `apparatus:${ApparatusId}`
  | `angle-position:${AnglePositionId}`
  | `limb-usage:${LimbUsageId}`
  | `direction:${DirectionId}`
  | `stability:${StabilityId}`
  | `tempo:${TempoId}`
  | `assistance-resistance:${AssistanceResistanceId}`
  | `range-of-motion:${RangeOfMotionId}`
  | `training-intent:${TrainingIntentId}`
  | `load-behavior:${LoadBehaviorId}`;

export type MovementPattern = {
  id: MovementPatternId;
  label: string;
  category?: MovementPatternCategoryId;
  legacyPattern: string;
  description: string;
  plane?: "sagittal" | "frontal" | "transverse" | "multi-planar";
};

export type ExerciseModifierCategory = {
  id: ExerciseModifierCategoryId;
  label: string;
  description: string;
  displayOrder: number;
};

export type ExerciseModifier = {
  id: ExerciseModifierId;
  categoryId: ExerciseModifierCategoryId;
  slug: string;
  label: string;
  shortLabel?: string;
  displayPrefix?: string;
  aliases?: string[];
  includeInDisplayName?: boolean;
  displayOrder: number;
};

export type Apparatus = ExerciseModifier & {
  categoryId: "apparatus";
  apparatusId: ApparatusId;
  loadingStyle:
    | "external-load"
    | "bodyweight"
    | "machine-guided"
    | "elastic"
    | "suspension"
    | "support"
    | "sled";
};

export type CoreMovement = {
  id: CoreMovementId;
  label: string;
  patternId: MovementPatternId;
  bodyRegion: string;
  primaryMuscles: string[];
  secondaryMuscles: string[];
  aliases: string[];
  defaultCue: string;
  defaultLevel: ExerciseLevel;
  defaultIntentIds: TrainingIntentId[];
  compatibleModifierCategoryIds: ExerciseModifierCategoryId[];
  defaultModifierIds: ExerciseModifierId[];
};

export type ExerciseVariationId = string;

export type ExerciseVariation = {
  id: ExerciseVariationId;
  coreMovementId: CoreMovementId;
  movementPatternId: MovementPatternId;
  modifierIds: ExerciseModifierId[];
  displayName: string;
  generatedLabel: string;
  searchTokens: string[];
  bodyRegion: string;
  primaryMuscles: string[];
  secondaryMuscles: string[];
  primaryApparatusId: ApparatusId | null;
  intentIds: TrainingIntentId[];
  cue: string;
  source: "generated" | "curated" | "legacy-adapter";
};

export type ExercisePrescription = {
  id?: string;
  variationId?: ExerciseVariationId;
  coreMovementId: CoreMovementId;
  movementPatternId?: MovementPatternId;
  modifierIds?: ExerciseModifierId[];
  sets?: number;
  reps?: string;
  load?: string;
  intensity?: string;
  tempo?: string;
  restSeconds?: number;
  goal?: ExerciseGoal | TrainingIntentId;
  notes?: string;
  progressionRuleId?: string;
  substitutionGroupId?: string;
  recoveryTags?: string[];
};

export type LegacyExerciseMovementCandidate = {
  exercise: ExerciseCatalogItem;
  coreMovementId: CoreMovementId | null;
  modifierIds: ExerciseModifierId[];
  confidence: "high" | "medium" | "low";
  notes: string[];
};
