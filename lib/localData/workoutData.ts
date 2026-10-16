import type { LocalExerciseStatEntry } from "@/types";
import { readPlanning, writePlanning, planningSnapshot, subscribePlanning } from "@/lib/planning/store";

export const LOCAL_WORKOUT_STORAGE_KEYS = {
  exerciseStats: "soundFitnessExerciseStats",
  customExercises: "soundFitnessCustomExercises",
} as const;

export type LocalCustomExerciseRecord = {
  id: string;
  name: string;
  body: string;
  muscles: string;
  pattern: string;
  goal: string;
  equipment: string;
  level: string;
  image?: string;
  cue?: string;
  custom?: boolean;
};

const canUseLocalStorage = () =>
  typeof window !== "undefined" && Boolean(window.localStorage);

const readLocalArray = <T>(key: string) => {
  const saved = readPlanning<unknown>(key, []);
  return Array.isArray(saved) ? saved as T[] : [];
};

const writeLocalArray = <T>(key: string, items: T[]) => {
  if (!canUseLocalStorage()) return;

  writePlanning(key, items);
};

export const readExerciseStats = () =>
  readLocalArray<LocalExerciseStatEntry>(
    LOCAL_WORKOUT_STORAGE_KEYS.exerciseStats,
  );

export const writeExerciseStats = (stats: LocalExerciseStatEntry[]) => {
  writeLocalArray(LOCAL_WORKOUT_STORAGE_KEYS.exerciseStats, stats);
};

export function readExerciseStatsForSave(): LocalExerciseStatEntry[] {
  const values = planningSnapshot();
  const original = Object.hasOwn(values, LOCAL_WORKOUT_STORAGE_KEYS.exerciseStats) ? values[LOCAL_WORKOUT_STORAGE_KEYS.exerciseStats] : [];
  if (!Array.isArray(original)) throw new Error("Saved exercise statistics need review before adding entries. Original statistics and your open values are preserved.");
  return original as LocalExerciseStatEntry[];
}

export const prependExerciseStats = (
  stats: LocalExerciseStatEntry | LocalExerciseStatEntry[],
) => {
  const newStats = Array.isArray(stats) ? stats : [stats];
  const updatedStats = [...newStats, ...readExerciseStatsForSave()];

  writeExerciseStats(updatedStats);
  return updatedStats;
};

export const saveWorkoutSessionExerciseStats = (
  stats: LocalExerciseStatEntry[],
) =>
  prependExerciseStats(
    stats.map((stat) => ({
      ...stat,
      source: "workout-session",
    })),
  );

export const readWorkoutSessionExerciseStats = () =>
  readExerciseStats().filter((stat) => stat.source === "workout-session");

export const readCustomExercises = <T = LocalCustomExerciseRecord>() =>
  readLocalArray<T>(LOCAL_WORKOUT_STORAGE_KEYS.customExercises);

export const writeCustomExercises = <T>(exercises: T[]) => {
  writeLocalArray(LOCAL_WORKOUT_STORAGE_KEYS.customExercises, exercises);
};

export const subscribeToLocalWorkoutData = (callback: () => void) => {
  if (typeof window === "undefined") return () => {};

  const storageKeys = Object.values(LOCAL_WORKOUT_STORAGE_KEYS) as string[];
  const handleStorage = (event: StorageEvent) => {
    if (!event.key || storageKeys.includes(event.key)) {
      callback();
    }
  };

  window.addEventListener("storage", handleStorage);
  const unsubscribe = subscribePlanning(callback);

  return () => { unsubscribe(); window.removeEventListener("storage", handleStorage); };
};
