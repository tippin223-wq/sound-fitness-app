import type { TrainingAreaPreferences } from "./trainingAreaCare";

/** A self-reported pain proxy, not a measure of fitness or medical clearance. */
export function physicalReadiness(preferences: TrainingAreaPreferences | undefined): {score: number | null; highestPain: number | null; unrated: number} {
  if (preferences?.noAreasOfConcern) return {score: 100, highestPain: 0, unrated: 0};
  const areas = Array.isArray(preferences?.areas) ? [...new Set(preferences.areas)] : [];
  if (!areas.length) return {score: null, highestPain: null, unrated: 0};
  const levels = areas.map(area => preferences?.areaCareLevels?.[area]).filter((value): value is number => typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 10);
  const highestPain = levels.length ? Math.max(...levels) : null;
  const unrated = areas.length - levels.length;
  return {score: unrated || highestPain === null ? null : 100 - highestPain * 10, highestPain, unrated};
}
