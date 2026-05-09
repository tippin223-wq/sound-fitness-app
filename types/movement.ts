import type { ExerciseCatalogItem, ExerciseGoal, ExerciseLevel } from "./exercise";

export type MovementPatternId =
  | "horizontal-push"
  | "horizontal-pull"
  | "vertical-push"
  | "vertical-pull"
  | "squat"
  | "hinge"
  | "lunge"
  | "gait"
  | "knee-extension"
  | "knee-flexion"
  | "hip-extension"
  | "hip-abduction"
  | "hip-adduction"
  | "hip-external-rotation"
  | "hip-internal-rotation"
  | "plantarflexion"
  | "dorsiflexion"
  | "elbow-flexion"
  | "elbow-extension"
  | "shoulder-abduction"
  | "shoulder-external-rotation"
  | "shoulder-internal-rotation"
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
  | "carry"
  | "brace";

export type CoreMovementId =
  | "chest-press"
  | "row"
  | "squat"
  | "hinge"
  | "lunge"
  | "shoulder-press"
  | "pulldown"
  | "pull-up"
  | "carry"
  | "rotation"
  | "anti-rotation"
  | "brace-plank"
  | "leg-extension"
  | "leg-curl"
  | "hip-thrust-glute-bridge"
  | "calf-raise"
  | "tibialis-raise"
  | "hip-abduction"
  | "hip-adduction"
  | "biceps-curl"
  | "triceps-extension"
  | "lateral-raise"
  | "rear-delt-raise"
  | "face-pull"
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
  | "jump-landing"
  | "medicine-ball-slam"
  | "burpee"
  | "sled-drive";

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
  | "suspension"
  | "landmine"
  | "bench"
  | "box"
  | "medicine-ball"
  | "pull-up-bar"
  | "sled"
  | "stability-ball"
  | "ab-wheel";

export type AnglePositionId =
  | "incline"
  | "decline"
  | "flat"
  | "seated"
  | "standing"
  | "half-kneeling"
  | "split-stance"
  | "tall-kneeling"
  | "supine"
  | "prone";

export type LimbUsageId =
  | "bilateral"
  | "unilateral"
  | "alternating"
  | "staggered"
  | "offset";

export type StabilityId =
  | "stable"
  | "unstable"
  | "swiss-ball"
  | "bosu"
  | "suspension"
  | "single-leg"
  | "balance-focused";

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
  | "weighted"
  | "accommodating-resistance"
  | "deloaded"
  | "partner-assisted";

export type RangeOfMotionId =
  | "full-rom"
  | "partial-rom"
  | "deficit"
  | "dead-stop"
  | "pin-press"
  | "extended-rom";

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
  | `stability:${StabilityId}`
  | `tempo:${TempoId}`
  | `assistance-resistance:${AssistanceResistanceId}`
  | `range-of-motion:${RangeOfMotionId}`
  | `training-intent:${TrainingIntentId}`
  | `load-behavior:${LoadBehaviorId}`;

export type MovementPattern = {
  id: MovementPatternId;
  label: string;
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
