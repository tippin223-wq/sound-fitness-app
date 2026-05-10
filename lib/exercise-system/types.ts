export type DifficultyTier = "beginner" | "intermediate" | "advanced";

export type MuscleGroup =
  | "adductors"
  | "abs"
  | "biceps"
  | "calves"
  | "chest"
  | "forearms"
  | "glutes"
  | "grip"
  | "hamstrings"
  | "hip-flexors"
  | "lats"
  | "lower-back"
  | "neck"
  | "obliques"
  | "quads"
  | "rear-delts"
  | "rotator-cuff"
  | "shoulders"
  | "tibialis-anterior"
  | "traps"
  | "triceps"
  | "upper-back";

export type MovementPatternGroup =
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
  | "squat"
  | "hinge"
  | "lunge"
  | "step-up"
  | "hip-thrust-bridge"
  | "knee-extension"
  | "knee-flexion"
  | "hip-abduction"
  | "hip-adduction"
  | "hip-internal-rotation"
  | "hip-external-rotation"
  | "calf-raise"
  | "tibialis-raise"
  | "chest-press"
  | "shoulder-press"
  | "chest-fly"
  | "lateral-raise"
  | "row"
  | "vertical-pull"
  | "pullover"
  | "reverse-fly"
  | "curl"
  | "triceps-extension"
  | "wrist-flexion"
  | "wrist-extension"
  | "wrist-rotation"
  | "shoulder-internal-rotation"
  | "shoulder-external-rotation"
  | "scapular-control"
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
  | "mobility"
  | "breathing-bracing"
  | "neck-flexion"
  | "neck-extension"
  | "neck-rotation"
  | "integrated-movement";

export type ModifierCategoryId =
  | "equipment"
  | "grip"
  | "stance"
  | "executionStyle"
  | "loadPosition"
  | "bodyPosition"
  | "structure"
  | "direction"
  | "angle"
  | "rom"
  | "tempo"
  | "stability"
  | "assistanceResistance"
  | "athleticIntent"
  | "movementIntent";

export type ExerciseModifierId = `${ModifierCategoryId}:${string}`;

export type ExerciseRelationshipType =
  | "variation-of"
  | "substitution"
  | "progression"
  | "regression"
  | "secondary-pattern"
  | "fatigue-overlap";

export type MovementPattern = {
  id: MovementPatternId;
  label: string;
  group: MovementPatternGroup;
  description: string;
  primaryMuscles: MuscleGroup[];
  secondaryMuscles?: MuscleGroup[];
  aliases?: string[];
  fatigueTags?: string[];
};

export type ModifierCategory = {
  id: ModifierCategoryId;
  label: string;
  description: string;
  selectionMode: "single" | "multi";
  displayOrder: number;
};

export type ExerciseModifier = {
  id: ExerciseModifierId;
  categoryId: ModifierCategoryId;
  label: string;
  shortLabel?: string;
  aliases?: string[];
  semanticTags?: string[];
  displayOrder: number;
  includeInGeneratedName?: boolean;
};

export type ExerciseAlias = {
  exerciseId: string;
  alias: string;
  kind: "common" | "abbreviation" | "spelling" | "semantic";
};

export type RequiredModifierOption = {
  id: string;
  categoryId: ModifierCategoryId;
  label: string;
  anyOf: ExerciseModifierId[];
};

export type MovementPatternReference = {
  patternId: MovementPatternId;
  role: "primary" | "secondary" | "tertiary";
  note?: string;
};

export type ExerciseVariation = {
  id: string;
  displayName: string;
  primaryPatternId: MovementPatternId;
  secondaryPatternIds?: MovementPatternId[];
  tertiaryPatternIds?: MovementPatternId[];
  requiredModifierIds: ExerciseModifierId[];
  requiredModifierOptions?: RequiredModifierOption[];
  optionalModifierIds?: ExerciseModifierId[];
  difficultyTier: DifficultyTier;
  primaryMuscles: MuscleGroup[];
  secondaryMuscles?: MuscleGroup[];
  aliases?: string[];
  semanticTags?: string[];
  contraindicationTags?: string[];
};

export type IntegratedMovement = ExerciseVariation & {
  primaryPattern: MovementPatternReference;
  secondaryPattern?: MovementPatternReference;
  tertiaryPattern?: MovementPatternReference;
  patternChain: MovementPatternReference[];
};

export type Exercise = {
  id: string;
  name: string;
  variation: ExerciseVariation | IntegratedMovement;
  aliases: ExerciseAlias[];
  relationships: ExerciseRelationship[];
};

export type ExerciseRelationship = {
  id: string;
  fromExerciseId: string;
  toExerciseId: string;
  type: ExerciseRelationshipType;
  score: number;
  reason: string;
};

export type ProgressionNode = {
  id: string;
  exerciseId: string;
  label: string;
  difficultyTier: DifficultyTier;
  regressionIds: string[];
  progressionIds: string[];
  notes?: string;
};

export type NestedExerciseFilterGroup = {
  operator: "and" | "or";
  patternIds?: MovementPatternId[];
  modifierIds?: ExerciseModifierId[];
  muscleGroups?: MuscleGroup[];
  includeIntegrated?: boolean;
  groups?: NestedExerciseFilterGroup[];
};
