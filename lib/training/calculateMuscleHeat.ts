//region 🔥 SOUND FITNESS MUSCLE HEAT CALCULATOR

import {
  exerciseMuscleMap,
  type MuscleSlug,
} from "@/components/anatomy/exerciseMuscleMap";

//region 🧠 TYPES
export type CompletedSet = {
  exerciseId: string;
  sets: number;
  completedAt: string | Date;
};

export type MuscleHeatResult = {
  slug: MuscleSlug;
  effectiveSets: number;
  recoverableSets: number;
  heatScore: number; // 0–100
  status: "undertrained" | "productive" | "high" | "recovery_caution";
};
//endregion

//region ⚙️ DEFAULT RECOVERY CAPACITY
export const defaultRecoverableSets: Record<MuscleSlug, number> = {
  chest: 16,
  deltoids: 14,
  biceps: 12,
  triceps: 12,
  forearm: 10,
  abs: 16,
  obliques: 12,
  quadriceps: 18,
  hamstring: 14,
  gluteal: 16,
  calves: 14,
  trapezius: 12,
  "upper-back": 18,
  "lower-back": 10,
  adductors: 10,
  tibialis: 8,
  "hip-flexors": 8,
};
//endregion

//region 🧮 HELPERS
function daysAgo(date: string | Date) {
  const completed = new Date(date).getTime();
  const now = Date.now();

  return (now - completed) / (1000 * 60 * 60 * 24);
}

function getRecoveryDecayMultiplier(ageInDays: number) {
  if (ageInDays <= 1) return 1;
  if (ageInDays <= 2) return 0.75;
  if (ageInDays <= 3) return 0.5;
  if (ageInDays <= 4) return 0.25;
  return 0;
}

function getHeatStatus(score: number): MuscleHeatResult["status"] {
  if (score <= 35) return "undertrained";
  if (score <= 65) return "productive";
  if (score <= 85) return "high";
  return "recovery_caution";
}
//endregion

//region 🔥 MAIN CALCULATOR
export function calculateMuscleHeat({
  completedSets,
  recoveryWindowDays = 4,
  recoverableSets = defaultRecoverableSets,
}: {
  completedSets: CompletedSet[];
  recoveryWindowDays?: number;
  recoverableSets?: Record<MuscleSlug, number>;
}): Record<MuscleSlug, MuscleHeatResult> {
  const effectiveSetsByMuscle = Object.keys(recoverableSets).reduce(
    (acc, slug) => {
      acc[slug as MuscleSlug] = 0;
      return acc;
    },
    {} as Record<MuscleSlug, number>,
  );

  completedSets.forEach((completedSet) => {
    const age = daysAgo(completedSet.completedAt);

    if (age > recoveryWindowDays) return;

    const exerciseWeights = exerciseMuscleMap[completedSet.exerciseId];

    if (!exerciseWeights) return;

    const decayMultiplier = getRecoveryDecayMultiplier(age);

    Object.entries(exerciseWeights).forEach(([muscleSlug, weight]) => {
      const slug = muscleSlug as MuscleSlug;
      const effectiveSets =
        completedSet.sets * Number(weight || 0) * decayMultiplier;

      effectiveSetsByMuscle[slug] =
        (effectiveSetsByMuscle[slug] || 0) + effectiveSets;
    });
  });

  return Object.entries(recoverableSets).reduce(
    (acc, [slug, capacity]) => {
      const muscleSlug = slug as MuscleSlug;
      const effectiveSets = effectiveSetsByMuscle[muscleSlug] || 0;
      const heatScore = Math.min(
        Math.round((effectiveSets / capacity) * 100),
        100,
      );

      acc[muscleSlug] = {
        slug: muscleSlug,
        effectiveSets: Number(effectiveSets.toFixed(2)),
        recoverableSets: capacity,
        heatScore,
        status: getHeatStatus(heatScore),
      };

      return acc;
    },
    {} as Record<MuscleSlug, MuscleHeatResult>,
  );
}
//endregion

//region 🧪 MOCK TEST DATA
export const mockCompletedSets: CompletedSet[] = [
  {
    exerciseId: "bench_press",
    sets: 4,
    completedAt: new Date(),
  },
  {
    exerciseId: "row",
    sets: 4,
    completedAt: new Date(),
  },
  {
    exerciseId: "squat",
    sets: 5,
    completedAt: new Date(Date.now() - 1000 * 60 * 60 * 24),
  },
  {
    exerciseId: "plank",
    sets: 3,
    completedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2),
  },
];
//endregion

//endregion
