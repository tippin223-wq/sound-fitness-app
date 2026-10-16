import { readDashboardHealthEvidence } from "./dashboardHealthEvidence";
import { planningSnapshot } from "./store";

export type BodyCommandReading = { value: string; detail: string; description: string; recorded: boolean };
/** Recorded totals are partial journal evidence; no target, muscle allocation or recovery dose is inferred. */
export function readBodyCommandEvidence(now = new Date(), values: Readonly<Record<string, unknown>> = planningSnapshot()) {
  const health = readDashboardHealthEvidence(now, values);
  const unavailable = (description: string): BodyCommandReading => ({ value: "—", detail: "Unavailable", description, recorded: false });
  const rating = (key: "sleep" | "stress" | "soreness") => health.latestCheckIn
    ? { value: `${health.latestCheckIn[key]}/10`, detail: "Self-report", description: `Latest saved weekly ${key} rating on ${health.latestCheckIn.date}. A self-report score, not a daily average or target.`, recorded: true }
    : unavailable(health.recoveryIssue || "No saved weekly check-in in the last 7 days.");
  return {
    sleep: rating("sleep"), stress: rating("stress"), soreness: rating("soreness"),
    fuel: health.reportedCalories === null ? unavailable(health.nutritionIssue || "No recorded calorie values in the last 7 days.")
      : { value: health.reportedCalories.toLocaleString("en-US"), detail: "Logged kcal", description: `${health.reportedCalories} reported calories across ${health.calorieDays} recorded days in the last 7 days. Partial journal total; complete daily intake and calorie targets are not established.`, recorded: true },
    hydration: health.recordedWaterMl === null ? unavailable(health.nutritionIssue || "No water records in the last 7 days.")
      : { value: String(Math.round(health.recordedWaterMl)), detail: "Logged ml", description: `${Math.round(health.recordedWaterMl)} ml in saved water entries across ${health.waterDays} recorded days in the last 7 days. Partial journal total; hydration adequacy and daily targets are not established.`, recorded: true },
    fatigue: unavailable("Fatigue duration is not recorded or linked to this card."),
    recovery: unavailable("Actual recovery-session durations are not linked to this card."),
    core: unavailable("Core-specific recorded sets and plan targets have not been mapped."),
  };
}
export type BodyCommandEvidence = ReturnType<typeof readBodyCommandEvidence>;
export const bodyCommandEvidenceSnapshot = () => JSON.stringify(readBodyCommandEvidence());
export const serverBodyCommandEvidence = () => JSON.stringify(readBodyCommandEvidence(new Date(2000, 0, 1), {}));
