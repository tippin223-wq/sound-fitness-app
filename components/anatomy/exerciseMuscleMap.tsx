export type MuscleSlug =
  | "chest"
  | "deltoids"
  | "biceps"
  | "triceps"
  | "forearm"
  | "abs"
  | "obliques"
  | "quadriceps"
  | "hamstring"
  | "gluteal"
  | "calves"
  | "trapezius"
  | "upper-back"
  | "lower-back"
  | "adductors"
  | "tibialis"
  | "hip_flexors";

export type ExerciseMuscleMap = Record<
  string,
  Partial<Record<MuscleSlug, number>>
>;

export const exerciseMuscleMap: ExerciseMuscleMap = {
  bench_press: {
    chest: 1,
    deltoids: 0.5,
    triceps: 0.5,
  },
  incline_press: {
    chest: 1,
    deltoids: 0.6,
    triceps: 0.4,
  },
  overhead_press: {
    deltoids: 1,
    triceps: 0.6,
    "upper-back": 0.3,
  },
  dips: {
    chest: 0.7,
    triceps: 1,
    deltoids: 0.3,
  },
  pull_up: {
    "upper-back": 1,
    biceps: 0.6,
    forearm: 0.4,
  },
  lat_pulldown: {
    "upper-back": 1,
    biceps: 0.5,
  },
  row: {
    "upper-back": 1,
    trapezius: 0.6,
    biceps: 0.5,
  },
  face_pull: {
    deltoids: 0.6,
    trapezius: 0.8,
  },
  bicep_curl: {
    biceps: 1,
    forearm: 0.5,
  },
  hammer_curl: {
    biceps: 0.7,
    forearm: 0.8,
  },
  tricep_pushdown: {
    triceps: 1,
  },
  squat: {
    quadriceps: 1,
    gluteal: 0.6,
    adductors: 0.4,
    "lower-back": 0.3,
  },
  split_squat: {
    quadriceps: 1,
    gluteal: 0.6,
    adductors: 0.3,
  },
  deadlift: {
    gluteal: 1,
    hamstring: 1,
    "lower-back": 0.8,
    trapezius: 0.5,
  },
  leg_curl: {
    hamstring: 1,
  },
  leg_extension: {
    quadriceps: 1,
  },
  calf_raise: {
    calves: 1,
  },
  crunch: {
    abs: 1,
  },
  leg_raise: {
    abs: 0.8,
    hip_flexors: 0.6,
  },
  plank: {
    abs: 0.8,
    obliques: 0.6,
    "lower-back": 0.4,
  },
};
