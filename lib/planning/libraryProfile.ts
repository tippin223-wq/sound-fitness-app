import { getProfileDisplay } from "@/lib/profile-storage";
import { planningKeys, readPlanning } from "./store";
import { readEligibleGoals } from "./goals";
import { profileAge, profileTrainingExperience, profileRecoveryReports } from "./recommendation";
import { goalNumber } from "./goalNumbers";

export type ExerciseLibraryProfileSummary = {
  avatarUrl: string | null; bio: string; currentFocus: string; displayName: string;
  email: string; preferredTrainingStyle: string; primaryGoal: string; secondaryGoal: string; trainingLevel: string;
  readinessLabel: string; weeklyTargetLabel: string;
};
export const defaultExerciseLibraryProfileSummary: ExerciseLibraryProfileSummary = {
  avatarUrl: null, bio: "Add profile details", currentFocus: "Add profile details", displayName: "Athlete", email: "",
  preferredTrainingStyle: "Add profile details", primaryGoal: "No goal set", secondaryGoal: "Add profile details", trainingLevel: "",
  readinessLabel: "Readiness not reported in Profile", weeklyTargetLabel: "Set a weekly set target in Goals",
};
const text = (value: unknown) => typeof value === "string" ? value.trim() : "";

/** Show saved observations, without inferring recovery from a training-volume ratio. */
export function libraryReadinessLabel(bodyStatus: unknown) {
  const reports = profileRecoveryReports(bodyStatus);
  const values = [reports.pain === null ? null : `pain ${reports.pain}/10`, reports.soreness === null ? null : `soreness ${reports.soreness}/10`, reports.sleep === null ? null : `sleep ${reports.sleep} h`].filter((value): value is string => value !== null);
  return values.length ? `Saved readiness (${values.length}/3): ${values.join(" · ")}` : "Readiness not reported in Profile";
}

/** Current account planning data only; legacy bios cannot override saved Goals. */
export function readLibraryProfileSummary(now = new Date()): ExerciseLibraryProfileSummary {
  const value = readPlanning<unknown>(planningKeys.profile, null);
  const profile = value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
  const display = getProfileDisplay(profile);
  const goals = readEligibleGoals(now);
  const experience = profileTrainingExperience({ trainingAge: text(profile.trainingAge), experienceLevel: text(profile.experienceLevel) });
  const age = profileAge({ birthday: text(profile.birthday), age: text(profile.age) }, now);
  const styles = Array.isArray(profile.trainingStyles) ? [...new Set(profile.trainingStyles.map(text).filter(Boolean))] : [];
  const bio = [age === null ? "" : `Age ${age}`, experience.conflicting ? "Review training experience in Profile" : experience.level || "", [text(profile.city), text(profile.state)].filter(Boolean).join(", ")].filter(Boolean).join(" / ");
  return {
    avatarUrl: display.avatarUrl || null, bio: bio || "Add profile details",
    currentFocus: goals?.primaryGoal || "Set goals first", displayName: display.name, email: display.email,
    preferredTrainingStyle: styles.join(", ") || "Add profile details", primaryGoal: goals?.primaryGoal || "No goal set",
    secondaryGoal: goals?.secondaryGoal || "Add profile details", trainingLevel: experience.conflicting ? "" : experience.level || "",
    readinessLabel: libraryReadinessLabel(profile.bodyStatus),
    weeklyTargetLabel: goals && goalNumber(goals.targetWeeklySets) !== null ? `Saved Goals target: ${goalNumber(goals.targetWeeklySets)} sets/week` : "Set a weekly set target in Goals",
  };
}
