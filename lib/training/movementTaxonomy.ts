import type {
  Apparatus,
  CoreMovement,
  ExerciseModifier,
  ExerciseModifierCategory,
  ExerciseModifierCategoryId,
  ExerciseModifierId,
  MovementPattern,
  MovementPatternId,
} from "@/types";

export const MOVEMENT_PATTERNS = [
  {
    id: "horizontal-push",
    label: "Horizontal Push",
    legacyPattern: "Push",
    description: "Pressing away from the torso in a mostly horizontal path.",
    plane: "sagittal",
  },
  {
    id: "horizontal-pull",
    label: "Horizontal Pull",
    legacyPattern: "Pull",
    description: "Pulling toward the torso in a mostly horizontal path.",
    plane: "sagittal",
  },
  {
    id: "vertical-push",
    label: "Vertical Push",
    legacyPattern: "Push",
    description: "Pressing overhead or upward against resistance.",
    plane: "sagittal",
  },
  {
    id: "vertical-pull",
    label: "Vertical Pull",
    legacyPattern: "Pull",
    description: "Pulling down or up through a vertical line of force.",
    plane: "sagittal",
  },
  {
    id: "squat",
    label: "Squat",
    legacyPattern: "Squat",
    description: "Knee-dominant lower-body flexion and extension.",
    plane: "sagittal",
  },
  {
    id: "hinge",
    label: "Hinge",
    legacyPattern: "Hinge",
    description: "Hip-dominant posterior-chain loading.",
    plane: "sagittal",
  },
  {
    id: "lunge",
    label: "Lunge",
    legacyPattern: "Lunge",
    description: "Split-stance lower-body loading with gait carryover.",
    plane: "multi-planar",
  },
  {
    id: "gait",
    label: "Gait",
    legacyPattern: "Carry",
    description: "Walking, stepping, marching, and locomotion patterns.",
    plane: "multi-planar",
  },
  {
    id: "rotation",
    label: "Rotation",
    legacyPattern: "Rotation",
    description: "Producing force through trunk or hip rotation.",
    plane: "transverse",
  },
  {
    id: "anti-rotation",
    label: "Anti-Rotation",
    legacyPattern: "Core",
    description: "Resisting unwanted rotation while maintaining position.",
    plane: "transverse",
  },
  {
    id: "carry",
    label: "Carry",
    legacyPattern: "Carry",
    description: "Loaded locomotion, grip, posture, and trunk stiffness.",
    plane: "multi-planar",
  },
  {
    id: "brace",
    label: "Brace",
    legacyPattern: "Core",
    description: "Static or dynamic trunk stiffness and anti-extension work.",
    plane: "multi-planar",
  },
] as const satisfies readonly MovementPattern[];

export const MOVEMENT_PATTERN_BY_ID = Object.fromEntries(
  MOVEMENT_PATTERNS.map((pattern) => [pattern.id, pattern]),
) as unknown as Record<MovementPatternId, MovementPattern>;

export const EXERCISE_MODIFIER_CATEGORIES = [
  {
    id: "apparatus",
    label: "Apparatus",
    description: "Primary tool or loading source used for the variation.",
    displayOrder: 10,
  },
  {
    id: "angle-position",
    label: "Angle / Position",
    description: "Bench angle, body position, or stance setup.",
    displayOrder: 20,
  },
  {
    id: "limb-usage",
    label: "Limb Usage",
    description: "How limbs share or alternate the work.",
    displayOrder: 30,
  },
  {
    id: "stability",
    label: "Stability",
    description: "Balance demand or support surface constraint.",
    displayOrder: 40,
  },
  {
    id: "tempo",
    label: "Tempo",
    description: "Rep speed, pauses, and contraction emphasis.",
    displayOrder: 50,
  },
  {
    id: "assistance-resistance",
    label: "Assistance / Resistance",
    description: "Extra help, load, or resistance profile.",
    displayOrder: 60,
  },
  {
    id: "range-of-motion",
    label: "Range Of Motion",
    description: "Depth, endpoint, and path constraints.",
    displayOrder: 70,
  },
  {
    id: "training-intent",
    label: "Intent / Training Emphasis",
    description: "Why the variation is being prescribed.",
    displayOrder: 80,
  },
] as const satisfies readonly ExerciseModifierCategory[];

export const EXERCISE_MODIFIER_CATEGORY_BY_ID = Object.fromEntries(
  EXERCISE_MODIFIER_CATEGORIES.map((category) => [category.id, category]),
) as unknown as Record<ExerciseModifierCategoryId, ExerciseModifierCategory>;

export const APPARATUS_MODIFIERS = [
  {
    id: "apparatus:dumbbell",
    categoryId: "apparatus",
    apparatusId: "dumbbell",
    slug: "dumbbell",
    label: "Dumbbell",
    shortLabel: "DB",
    aliases: ["db", "dumbbells"],
    displayOrder: 10,
    loadingStyle: "external-load",
  },
  {
    id: "apparatus:barbell",
    categoryId: "apparatus",
    apparatusId: "barbell",
    slug: "barbell",
    label: "Barbell",
    aliases: ["bb"],
    displayOrder: 20,
    loadingStyle: "external-load",
  },
  {
    id: "apparatus:cable",
    categoryId: "apparatus",
    apparatusId: "cable",
    slug: "cable",
    label: "Cable",
    displayOrder: 30,
    loadingStyle: "machine-guided",
  },
  {
    id: "apparatus:machine",
    categoryId: "apparatus",
    apparatusId: "machine",
    slug: "machine",
    label: "Machine",
    displayOrder: 40,
    loadingStyle: "machine-guided",
  },
  {
    id: "apparatus:kettlebell",
    categoryId: "apparatus",
    apparatusId: "kettlebell",
    slug: "kettlebell",
    label: "Kettlebell",
    shortLabel: "KB",
    aliases: ["kb"],
    displayOrder: 50,
    loadingStyle: "external-load",
  },
  {
    id: "apparatus:bodyweight",
    categoryId: "apparatus",
    apparatusId: "bodyweight",
    slug: "bodyweight",
    label: "Bodyweight",
    displayOrder: 60,
    loadingStyle: "bodyweight",
  },
  {
    id: "apparatus:band",
    categoryId: "apparatus",
    apparatusId: "band",
    slug: "band",
    label: "Band",
    displayOrder: 70,
    loadingStyle: "elastic",
  },
  {
    id: "apparatus:smith-machine",
    categoryId: "apparatus",
    apparatusId: "smith-machine",
    slug: "smith-machine",
    label: "Smith Machine",
    displayOrder: 80,
    loadingStyle: "machine-guided",
  },
  {
    id: "apparatus:trap-bar",
    categoryId: "apparatus",
    apparatusId: "trap-bar",
    slug: "trap-bar",
    label: "Trap Bar",
    displayOrder: 90,
    loadingStyle: "external-load",
  },
  {
    id: "apparatus:suspension",
    categoryId: "apparatus",
    apparatusId: "suspension",
    slug: "suspension",
    label: "Suspension",
    aliases: ["trx"],
    displayOrder: 100,
    loadingStyle: "suspension",
  },
  {
    id: "apparatus:landmine",
    categoryId: "apparatus",
    apparatusId: "landmine",
    slug: "landmine",
    label: "Landmine",
    displayOrder: 110,
    loadingStyle: "external-load",
  },
] as const satisfies readonly Apparatus[];

export const ANGLE_POSITION_MODIFIERS = [
  ["incline", "Incline"],
  ["decline", "Decline"],
  ["flat", "Flat"],
  ["seated", "Seated"],
  ["standing", "Standing"],
  ["half-kneeling", "Half-Kneeling"],
  ["split-stance", "Split-Stance"],
  ["tall-kneeling", "Tall-Kneeling"],
  ["supine", "Supine"],
  ["prone", "Prone"],
].map(([slug, label], index) => ({
  id: `angle-position:${slug}`,
  categoryId: "angle-position",
  slug,
  label,
  displayOrder: (index + 1) * 10,
})) as ExerciseModifier[];

export const LIMB_USAGE_MODIFIERS = [
  {
    id: "limb-usage:bilateral",
    categoryId: "limb-usage",
    slug: "bilateral",
    label: "Bilateral",
    includeInDisplayName: false,
    displayOrder: 10,
  },
  {
    id: "limb-usage:unilateral",
    categoryId: "limb-usage",
    slug: "unilateral",
    label: "Unilateral",
    displayPrefix: "Single-Arm",
    aliases: ["single arm", "single-leg"],
    displayOrder: 20,
  },
  {
    id: "limb-usage:alternating",
    categoryId: "limb-usage",
    slug: "alternating",
    label: "Alternating",
    displayOrder: 30,
  },
  {
    id: "limb-usage:staggered",
    categoryId: "limb-usage",
    slug: "staggered",
    label: "Staggered",
    displayOrder: 40,
  },
  {
    id: "limb-usage:offset",
    categoryId: "limb-usage",
    slug: "offset",
    label: "Offset",
    displayOrder: 50,
  },
] as const satisfies readonly ExerciseModifier[];

export const STABILITY_MODIFIERS = [
  {
    id: "stability:stable",
    categoryId: "stability",
    slug: "stable",
    label: "Stable",
    includeInDisplayName: false,
    displayOrder: 10,
  },
  ["unstable", "Unstable"],
  ["swiss-ball", "Swiss Ball"],
  ["bosu", "BOSU"],
  ["suspension", "Suspension"],
  ["single-leg", "Single-Leg"],
  ["balance-focused", "Balance-Focused"],
].map((modifier, index) =>
  Array.isArray(modifier)
    ? {
        id: `stability:${modifier[0]}`,
        categoryId: "stability",
        slug: modifier[0],
        label: modifier[1],
        displayOrder: (index + 1) * 10,
      }
    : modifier,
) as ExerciseModifier[];

export const TEMPO_MODIFIERS = [
  ["explosive", "Explosive"],
  ["paused", "Paused"],
  ["eccentric-only", "Eccentric-Only"],
  ["slow-eccentric", "Slow Eccentric"],
  ["isometric", "Isometric"],
  ["tempo-controlled", "Tempo-Controlled"],
].map(([slug, label], index) => ({
  id: `tempo:${slug}`,
  categoryId: "tempo",
  slug,
  label,
  displayOrder: (index + 1) * 10,
})) as ExerciseModifier[];

export const ASSISTANCE_RESISTANCE_MODIFIERS = [
  ["assisted", "Assisted"],
  ["band-assisted", "Band-Assisted"],
  ["weighted", "Weighted"],
  ["accommodating-resistance", "Accommodating Resistance"],
  ["deloaded", "Deloaded"],
  ["partner-assisted", "Partner-Assisted"],
].map(([slug, label], index) => ({
  id: `assistance-resistance:${slug}`,
  categoryId: "assistance-resistance",
  slug,
  label,
  displayOrder: (index + 1) * 10,
})) as ExerciseModifier[];

export const RANGE_OF_MOTION_MODIFIERS = [
  {
    id: "range-of-motion:full-rom",
    categoryId: "range-of-motion",
    slug: "full-rom",
    label: "Full ROM",
    includeInDisplayName: false,
    displayOrder: 10,
  },
  ["partial-rom", "Partial ROM"],
  ["deficit", "Deficit"],
  ["dead-stop", "Dead Stop"],
  ["pin-press", "Pin Press"],
  ["extended-rom", "Extended ROM"],
].map((modifier, index) =>
  Array.isArray(modifier)
    ? {
        id: `range-of-motion:${modifier[0]}`,
        categoryId: "range-of-motion",
        slug: modifier[0],
        label: modifier[1],
        displayOrder: (index + 1) * 10,
      }
    : modifier,
) as ExerciseModifier[];

export const TRAINING_INTENT_MODIFIERS = [
  ["hypertrophy", "Hypertrophy"],
  ["strength", "Strength"],
  ["power", "Power"],
  ["endurance", "Endurance"],
  ["rehab", "Rehab"],
  ["mobility", "Mobility"],
  ["stability", "Stability"],
  ["athletic-performance", "Athletic Performance"],
].map(([slug, label], index) => ({
  id: `training-intent:${slug}`,
  categoryId: "training-intent",
  slug,
  label,
  includeInDisplayName: false,
  displayOrder: (index + 1) * 10,
})) as ExerciseModifier[];

export const ALL_EXERCISE_MODIFIERS = [
  ...APPARATUS_MODIFIERS,
  ...ANGLE_POSITION_MODIFIERS,
  ...LIMB_USAGE_MODIFIERS,
  ...STABILITY_MODIFIERS,
  ...TEMPO_MODIFIERS,
  ...ASSISTANCE_RESISTANCE_MODIFIERS,
  ...RANGE_OF_MOTION_MODIFIERS,
  ...TRAINING_INTENT_MODIFIERS,
] as const satisfies readonly ExerciseModifier[];

export const EXERCISE_MODIFIER_BY_ID = Object.fromEntries(
  ALL_EXERCISE_MODIFIERS.map((modifier) => [modifier.id, modifier]),
) as unknown as Record<ExerciseModifierId, ExerciseModifier>;

const commonModifierCategories: ExerciseModifierCategoryId[] = [
  "apparatus",
  "angle-position",
  "limb-usage",
  "stability",
  "tempo",
  "assistance-resistance",
  "range-of-motion",
  "training-intent",
];

export const CORE_MOVEMENTS = [
  {
    id: "chest-press",
    label: "Chest Press",
    patternId: "horizontal-push",
    bodyRegion: "Chest",
    primaryMuscles: ["Pecs", "Triceps"],
    secondaryMuscles: ["Anterior Delts", "Core"],
    aliases: ["bench press", "press", "push-up"],
    defaultCue:
      "Brace, keep the shoulder blades controlled, and press without losing rib position.",
    defaultLevel: "beginner",
    defaultIntentIds: ["strength", "hypertrophy"],
    compatibleModifierCategoryIds: commonModifierCategories,
    defaultModifierIds: [
      "limb-usage:bilateral",
      "stability:stable",
      "range-of-motion:full-rom",
    ],
  },
  {
    id: "row",
    label: "Row",
    patternId: "horizontal-pull",
    bodyRegion: "Back",
    primaryMuscles: ["Lats", "Mid Back"],
    secondaryMuscles: ["Rear Delts", "Biceps", "Core"],
    aliases: ["db row", "cable row", "machine row"],
    defaultCue:
      "Pull from the elbow, keep the ribs stacked, and finish without shrugging.",
    defaultLevel: "beginner",
    defaultIntentIds: ["strength", "hypertrophy"],
    compatibleModifierCategoryIds: commonModifierCategories,
    defaultModifierIds: [
      "limb-usage:bilateral",
      "stability:stable",
      "range-of-motion:full-rom",
    ],
  },
  {
    id: "squat",
    label: "Squat",
    patternId: "squat",
    bodyRegion: "Legs",
    primaryMuscles: ["Quads", "Glutes"],
    secondaryMuscles: ["Core", "Adductors"],
    aliases: ["goblet squat", "front squat", "back squat"],
    defaultCue:
      "Brace, sit between the hips, and keep pressure through the whole foot.",
    defaultLevel: "beginner",
    defaultIntentIds: ["strength", "hypertrophy"],
    compatibleModifierCategoryIds: commonModifierCategories,
    defaultModifierIds: [
      "limb-usage:bilateral",
      "stability:stable",
      "range-of-motion:full-rom",
    ],
  },
  {
    id: "hinge",
    label: "Hinge",
    patternId: "hinge",
    bodyRegion: "Posterior Chain",
    primaryMuscles: ["Hamstrings", "Glutes"],
    secondaryMuscles: ["Low Back", "Core"],
    aliases: ["deadlift", "rdl", "romanian deadlift"],
    defaultCue:
      "Push the hips back, keep the load close, and stand tall through the glutes.",
    defaultLevel: "beginner",
    defaultIntentIds: ["strength", "hypertrophy"],
    compatibleModifierCategoryIds: commonModifierCategories,
    defaultModifierIds: [
      "limb-usage:bilateral",
      "stability:stable",
      "range-of-motion:full-rom",
    ],
  },
  {
    id: "lunge",
    label: "Lunge",
    patternId: "lunge",
    bodyRegion: "Legs",
    primaryMuscles: ["Quads", "Glutes"],
    secondaryMuscles: ["Hamstrings", "Core", "Hip Stabilizers"],
    aliases: ["split squat", "reverse lunge", "walking lunge"],
    defaultCue:
      "Own the front foot, keep the torso tall, and move with control.",
    defaultLevel: "beginner",
    defaultIntentIds: ["stability", "hypertrophy"],
    compatibleModifierCategoryIds: commonModifierCategories,
    defaultModifierIds: [
      "limb-usage:staggered",
      "stability:stable",
      "range-of-motion:full-rom",
    ],
  },
  {
    id: "shoulder-press",
    label: "Shoulder Press",
    patternId: "vertical-push",
    bodyRegion: "Shoulders",
    primaryMuscles: ["Shoulders", "Triceps"],
    secondaryMuscles: ["Upper Back", "Core"],
    aliases: ["overhead press", "military press"],
    defaultCue:
      "Stack ribs over pelvis, press overhead, and avoid leaning back.",
    defaultLevel: "beginner",
    defaultIntentIds: ["strength", "hypertrophy"],
    compatibleModifierCategoryIds: commonModifierCategories,
    defaultModifierIds: [
      "limb-usage:bilateral",
      "stability:stable",
      "range-of-motion:full-rom",
    ],
  },
  {
    id: "pulldown",
    label: "Pulldown",
    patternId: "vertical-pull",
    bodyRegion: "Back",
    primaryMuscles: ["Lats", "Biceps"],
    secondaryMuscles: ["Mid Back", "Rear Delts"],
    aliases: ["lat pulldown"],
    defaultCue:
      "Drive elbows down, keep the chest proud, and avoid yanking from the neck.",
    defaultLevel: "beginner",
    defaultIntentIds: ["strength", "hypertrophy"],
    compatibleModifierCategoryIds: commonModifierCategories,
    defaultModifierIds: [
      "apparatus:cable",
      "limb-usage:bilateral",
      "stability:stable",
      "range-of-motion:full-rom",
    ],
  },
  {
    id: "pull-up",
    label: "Pull-Up",
    patternId: "vertical-pull",
    bodyRegion: "Back",
    primaryMuscles: ["Lats", "Biceps"],
    secondaryMuscles: ["Core", "Mid Back"],
    aliases: ["chin-up", "assisted pull-up"],
    defaultCue:
      "Start from control, pull the elbows down, and finish without craning the neck.",
    defaultLevel: "intermediate",
    defaultIntentIds: ["strength"],
    compatibleModifierCategoryIds: commonModifierCategories,
    defaultModifierIds: [
      "apparatus:bodyweight",
      "limb-usage:bilateral",
      "stability:stable",
      "range-of-motion:full-rom",
    ],
  },
  {
    id: "carry",
    label: "Carry",
    patternId: "carry",
    bodyRegion: "Full Body",
    primaryMuscles: ["Core", "Grip"],
    secondaryMuscles: ["Traps", "Glutes", "Shoulders"],
    aliases: ["farmer carry", "suitcase carry"],
    defaultCue:
      "Walk tall, keep the ribs down, and resist leaning as you move.",
    defaultLevel: "beginner",
    defaultIntentIds: ["strength", "stability"],
    compatibleModifierCategoryIds: commonModifierCategories,
    defaultModifierIds: [
      "apparatus:dumbbell",
      "limb-usage:bilateral",
      "stability:stable",
    ],
  },
  {
    id: "rotation",
    label: "Rotation",
    patternId: "rotation",
    bodyRegion: "Core",
    primaryMuscles: ["Obliques", "Hips"],
    secondaryMuscles: ["Shoulders", "Glutes"],
    aliases: ["wood chop", "rotational throw"],
    defaultCue:
      "Rotate from the trunk and hips while keeping control through the finish.",
    defaultLevel: "beginner",
    defaultIntentIds: ["power", "athletic-performance"],
    compatibleModifierCategoryIds: commonModifierCategories,
    defaultModifierIds: [
      "limb-usage:bilateral",
      "stability:stable",
      "range-of-motion:full-rom",
    ],
  },
  {
    id: "anti-rotation",
    label: "Anti-Rotation",
    patternId: "anti-rotation",
    bodyRegion: "Core",
    primaryMuscles: ["Obliques", "Deep Core"],
    secondaryMuscles: ["Glutes", "Shoulders"],
    aliases: ["pallof press", "anti-rotation press"],
    defaultCue:
      "Press away and resist rotation without letting the ribs flare.",
    defaultLevel: "beginner",
    defaultIntentIds: ["stability", "rehab"],
    compatibleModifierCategoryIds: commonModifierCategories,
    defaultModifierIds: [
      "apparatus:cable",
      "limb-usage:bilateral",
      "stability:stable",
    ],
  },
  {
    id: "brace-plank",
    label: "Brace / Plank",
    patternId: "brace",
    bodyRegion: "Core",
    primaryMuscles: ["Deep Core", "Abs"],
    secondaryMuscles: ["Glutes", "Shoulders"],
    aliases: ["plank", "dead bug", "brace"],
    defaultCue:
      "Stack ribs over pelvis, breathe calmly, and keep tension without gripping.",
    defaultLevel: "beginner",
    defaultIntentIds: ["stability", "rehab"],
    compatibleModifierCategoryIds: commonModifierCategories,
    defaultModifierIds: [
      "apparatus:bodyweight",
      "limb-usage:bilateral",
      "stability:stable",
    ],
  },
] as const satisfies readonly CoreMovement[];

export const CORE_MOVEMENT_BY_ID = Object.fromEntries(
  CORE_MOVEMENTS.map((movement) => [movement.id, movement]),
) as unknown as Record<CoreMovement["id"], CoreMovement>;

export const getModifier = (id: ExerciseModifierId) =>
  EXERCISE_MODIFIER_BY_ID[id];

export const getModifiersByCategory = (categoryId: ExerciseModifierCategoryId) =>
  ALL_EXERCISE_MODIFIERS.filter(
    (modifier) => modifier.categoryId === categoryId,
  );
