import { readDashboardHealthEvidence } from "./dashboardHealthEvidence";
import { planningSnapshot } from "./store";
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
  return {
    sleep: reading("sleep", "/10"), stress: reading("stress", "/10"), soreness: reading("soreness", "/10"),
    fatigue: reading("fatigue", "/10"), recovery: reading("recovery", "min"), core: reading("core", "sets"),
    fuel: reading("fuel", "kcal"), hydration: reading("hydration", "L"),
  };
}
export type BodyCommandEvidence = ReturnType<typeof readBodyCommandEvidence>;
export const bodyCommandEvidenceSnapshot = () => JSON.stringify(readBodyCommandEvidence());
export const serverBodyCommandEvidence = () => JSON.stringify(readBodyCommandEvidence(new Date(2000, 0, 1), {}));
