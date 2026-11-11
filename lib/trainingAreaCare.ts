export type TrainingAreaPreferences = {
  areas: string[]; movements: string[]; adjustments: string[];
  areaCareLevels?: Record<string, number>;
  noAreasOfConcern?: boolean;
};

export function painLevelColor(level: number | undefined): string {
  return level === undefined ? "#64748b" : level >= 7 ? "#f87171" : level >= 4 ? "#fbbf24" : "#67e8f9";
}

/** Match an authored avatar region to the exact side of a reported area. */
export function avatarAreaPainLevel(preferences: Partial<TrainingAreaPreferences> | undefined, region: string, name: string): number | undefined {
  if (preferences?.noAreasOfConcern) return undefined;
  const areasByRegion: Record<string, string[]> = {
    neck: ["Neck"], frontDelt: ["Shoulders"], lateralDelt: ["Shoulders"], rearDelt: ["Shoulders"],
    biceps: ["Upper arms", "Elbows"], triceps: ["Upper arms", "Elbows"], forearms: ["Forearms", "Wrists / hands"],
    chest: ["Chest"], upperChest: ["Chest"], midChest: ["Chest"], lowerChest: ["Chest"],
    lats: ["Back"], traps: ["Back"], rhomboids: ["Back"], lowerBack: ["Back"],
    abs: ["Core"], obliques: ["Core"], glutes: ["Hips"], hipRotators: ["Hips"],
    quads: ["Thighs", "Knees"], hamstrings: ["Thighs", "Knees"], calves: ["Calves / shins", "Ankles / feet"], tibialis: ["Calves / shins", "Ankles / feet"],
  };
  const side = name.startsWith("left ") ? "Left" : name.startsWith("right ") ? "Right" : null;
  const areas = Array.isArray(preferences?.areas) ? preferences.areas : [];
  const levels = areas.filter(area => (areasByRegion[region] || []).some(base => area === base || (side && area === `${side} ${base}`))).map(area => preferences?.areaCareLevels?.[area]).filter((level): level is number => typeof level === "number" && Number.isInteger(level) && level >= 1 && level <= 10);
  return levels.length ? Math.max(...levels) : undefined;
}

export function trainingAreaCareLabel(level: number | undefined): string {
  if (level === undefined) return "Set care level";
  if (level === 10) return "Avoid involving this area";
  if (level >= 7) return "High care · major adjustments";
  if (level >= 4) return "Moderate care · modify as needed";
  return "Light care · use precautions";
}

export function trainingAreaCareContext(preferences: Partial<TrainingAreaPreferences> | undefined): string[] {
  if (!preferences || preferences.noAreasOfConcern || !Array.isArray(preferences.areas)) return [];
  return preferences.areas.filter(area => typeof area === "string" && area.trim()).map(area => {
    const raw = preferences.areaCareLevels?.[area];
    const level = typeof raw === "number" && Number.isInteger(raw) && raw >= 1 && raw <= 10 ? raw : undefined;
    return level === undefined ? `${area}: care requested; confirm the care level before choosing exercises.`
      : `${area}: ${level}/10 care — ${trainingAreaCareLabel(level).toLowerCase()}.`;
  });
}
