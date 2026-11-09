import { validMealHistory } from "./mealValidation";
import { nutritionDay } from "./nutritionSummary";
import { readDashboardHealthEvidence } from "./dashboardHealthEvidence";
import { planningKeys, planningSnapshot } from "./store";
import { localDate } from "./dates";
import { SUPPORT_RECORDS_KEY, validSupportHistory, type SupportKind } from "./supportSignalValidation";

export type BodyCommandReading = { value: string; detail: string; description: string; recorded: boolean };
/** Recorded totals are partial journal evidence; no target, muscle allocation or recovery dose is inferred. */
export function readBodyCommandEvidence(now = new Date(), values: Readonly<Record<string, unknown>> = planningSnapshot()) {
  const health = readDashboardHealthEvidence(now, values);
  const today = localDate(now);
  const day = health.checkInDays.find(row => row.date === today);
  const supportValid = validSupportHistory(values[SUPPORT_RECORDS_KEY] ?? []);
  const reading = (kind: SupportKind | "fuel" | "hydration", unit: string): BodyCommandReading => {
    const issue = kind === "fuel" || kind === "hydration" ? health.nutritionIssue : !supportValid ? "Review saved support records" : "";
    const legacyRating = (kind === "sleep" || kind === "stress" || kind === "soreness") && health.latestCheckIn?.date === today ? health.latestCheckIn[kind] : null;
    const amount = day?.[kind] ?? legacyRating;
    const prompt = kind === "hydration" ? "Log water" : kind === "fuel" ? "Log food" : "Record now";
    const suffix = unit === "/10" ? unit : ` ${unit}`;
    const displayAmount = amount === null ? "—" : (kind === "hydration" ? amount / 1000 : amount).toLocaleString("en-US", { maximumFractionDigits: kind === "hydration" ? 2 : 0 });
    if (issue) return { value: `—${suffix}`, detail: "Review records", description: issue, recorded: false };
    return {
      value: `${displayAmount}${suffix}`,
      detail: kind === "hydration" || kind === "fuel" || amount === null ? prompt : "Today",
      description: amount === null ? `No ${kind} recorded today. ${prompt}.` : `${kind}: ${displayAmount} ${unit} recorded today, ${today}. ${kind === "hydration" ? "Log more water throughout the day." : "Open to review or update today's records."}`,
      recorded: amount !== null,
    };
  };
  const meals = values[planningKeys.meals] ?? [];
  const nutrition = nutritionDay(validMealHistory(meals) ? meals.filter(meal => Date.parse(meal.recordedAt) <= now.getTime() && Date.parse(meal.updatedAt) <= now.getTime()) : [], [], today);
  const macro = (kind: "protein" | "carbs" | "fat"): BodyCommandReading => {
    const total = nutrition.nutrients[kind];
    return { value: `${total.value ?? 0} g`, detail: "Log food", description: health.nutritionIssue || `${kind}: ${total.value ?? 0} g logged today. Open Nutrition to review meals or log food.`, recorded: !health.nutritionIssue && total.reported > 0 };
  };
  const profile = (values[planningKeys.profile] ?? {}) as Record<string, unknown>;
  const weight = typeof profile.currentWeight === "string" || typeof profile.currentWeight === "number" ? String(profile.currentWeight) : "";
  const measurements = profile.measurements as { progressPhotos?: unknown[] } | undefined;
  const weightUnit = (profile.appPersonalization as { preferredUnitSystem?: string } | undefined)?.preferredUnitSystem === "kg" ? "kg" : "lb";
  const photoCount = Array.isArray(measurements?.progressPhotos) ? measurements.progressPhotos.length : 0;
  return {
    protein: macro("protein"), carbs: macro("carbs"), fat: macro("fat"),
    meals: { value: String(nutrition.mealCount), detail: "Log food", description: `${nutrition.mealCount} meals logged today. Open Nutrition to review meals or log food.`, recorded: nutrition.mealCount > 0 },
    weight: { value: `${weight || "—"} ${weightUnit}`, detail: "View weight", description: "Review your weight and body measurements in your profile.", recorded: Boolean(weight) },
    photos: { value: String(photoCount), detail: "View photos", description: "Review and add progress photos in your profile.", recorded: photoCount > 0 },
    sleep: reading("sleep", "/10"), stress: reading("stress", "/10"), soreness: reading("soreness", "/10"),
    fatigue: reading("fatigue", "/10"), recovery: reading("recovery", "min"), core: reading("core", "sets"),
    fuel: reading("fuel", "kcal"), hydration: reading("hydration", "L"),
  };
}
export type BodyCommandEvidence = ReturnType<typeof readBodyCommandEvidence>;
export const bodyCommandEvidenceSnapshot = () => JSON.stringify(readBodyCommandEvidence());
export const serverBodyCommandEvidence = () => JSON.stringify(readBodyCommandEvidence(new Date(2000, 0, 1), {}));
