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
  const reading = (kind: Exclude<SupportKind, "bloodPressure" | "caffeine"> | "fuel" | "hydration", unit: string): BodyCommandReading => {
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
  const scanCount = Array.isArray(profile.bodyScanImports) ? profile.bodyScanImports.length : 0;
  const photoCount = Array.isArray(measurements?.progressPhotos) ? measurements.progressPhotos.length : 0;
  const currentSignal = (kind: "sleep" | "stress" | "soreness" | "fatigue") => day?.[kind] ?? (kind !== "fatigue" && health.latestCheckIn?.date === today ? health.latestCheckIn[kind] : null);
  const dailyInputs = (["sleep", "stress", "soreness", "fatigue"] as const).map(kind => {
    const amount = currentSignal(kind);
    return amount == null || !supportValid ? null : kind === "sleep" ? amount * 10 : (10 - amount) * 10;
  }).filter((value): value is number => value !== null);
  const readiness = dailyInputs.length ? Math.round(dailyInputs.reduce((sum, value) => sum + value, 0) / dailyInputs.length) : null;
  const pressure = supportValid ? (values[SUPPORT_RECORDS_KEY] as import("./supportSignalValidation").SupportRecord[] | undefined)?.filter(row => row.kind === "bloodPressure" && row.date <= today && Date.parse(row.recordedAt) <= now.getTime()).sort((a,b) => b.date.localeCompare(a.date) || b.recordedAt.localeCompare(a.recordedAt))[0] : undefined;
  const caffeineRows = supportValid ? (values[SUPPORT_RECORDS_KEY] as import("./supportSignalValidation").SupportRecord[] | undefined)?.filter(row => row.kind === "caffeine" && row.date === today && Date.parse(row.recordedAt) <= now.getTime()) ?? [] : [];
  const caffeineTotal = caffeineRows.reduce((sum, row) => sum + row.value, 0);
  const benchmarkCount = Array.isArray(profile.benchmarks) ? profile.benchmarks.filter(row => row && typeof row === "object" && Boolean((row as { current?: unknown }).current)).length : 0;
  const measurementCount = measurements ? Object.entries(measurements).filter(([key,value]) => !["unit", "lastUpdated", "progressPhotos", "notes"].includes(key) && (typeof value === "number" || typeof value === "string") && String(value).trim()).length : 0;
  return {
    readiness: { value: readiness === null ? "—/100" : `${readiness}/100`, detail: readiness === null ? "Record signals" : "Today’s estimate", description: "Readiness combines today’s recorded sleep, stress, soreness and fatigue. Missing inputs are excluded; this is a wellness summary, not a medical assessment.", recorded: readiness !== null },
    measurements: { value: String(measurementCount), detail: "Measurements & scans", description: "Enter measurements or upload body composition results, including InBody and other bioelectrical impedance scans.", recorded: measurementCount > 0 || scanCount > 0 },
    benchmarks: { value: String(benchmarkCount), detail: "View benchmarks", description: "Browse your saved exercise benchmarks and record a new baseline.", recorded: benchmarkCount > 0 },
    caffeine: { value: supportValid ? `${caffeineRows.length ? caffeineTotal.toLocaleString("en-US") : "—"} mg` : "— mg", detail: supportValid ? "Log caffeine" : "Review records", description: !supportValid ? "Review saved support records" : caffeineRows.length ? `${caffeineTotal} mg caffeine logged today across ${caffeineRows.length} entries. Open to add intake or review history.` : "No caffeine recorded today. Log intake in milligrams (mg).", recorded: caffeineRows.length > 0 },
    bodyScan: { value: String(scanCount), detail: scanCount ? "View scans" : "Add scan", description: "Record or import InBody and other body composition results.", recorded: scanCount > 0 },
    bloodPressure: { value: pressure ? `${pressure.value}/${pressure.diastolic}` : "—/—", detail: pressure ? `${pressure.date} · mmHg` : "Record · mmHg", description: "Record systolic and diastolic blood pressure together, in mmHg.", recorded: Boolean(pressure) },
    protein: macro("protein"), carbs: macro("carbs"), fat: macro("fat"),
    meals: { value: String(nutrition.mealCount), detail: "Log food", description: `${nutrition.mealCount} meals logged today. Open Nutrition to review meals or log food.`, recorded: nutrition.mealCount > 0 },
    weight: { value: `${weight || "—"} ${weightUnit}`, detail: "View weight", description: "Review your weight, body metrics, trends and scan history here.", recorded: Boolean(weight) },
    photos: { value: String(photoCount), detail: "View photos", description: "Review and add progress photos here.", recorded: photoCount > 0 },
    sleep: reading("sleep", "/10"), stress: reading("stress", "/10"), soreness: reading("soreness", "/10"),
    fatigue: reading("fatigue", "/10"), recovery: reading("recovery", "min"), core: reading("core", "sets"),
    fuel: reading("fuel", "kcal"), hydration: reading("hydration", "L"),
  };
}
export type BodyCommandEvidence = ReturnType<typeof readBodyCommandEvidence>;
export const bodyCommandEvidenceSnapshot = () => JSON.stringify(readBodyCommandEvidence());
export const serverBodyCommandEvidence = () => JSON.stringify(readBodyCommandEvidence(new Date(2000, 0, 1), {}));
