"use client";
import { useSyncExternalStore } from "react";
import { usePlanningDay } from "@/lib/planning/usePlanningDay";
import Link from "next/link";
import { readGoals, requireSavedGoals } from "@/lib/planning/goals";
import { recommendPlan, type RecommendationProfile } from "@/lib/planning/recommendation";
import { readSoundFitnessProfileRecord } from "@/lib/profile-storage";
import { ROUTES } from "@/lib/routes";
import { readWorkoutBuilderTemplates } from "@/lib/localData/workoutBuilderData";
import { ambiguousWorkoutTemplateIds, rankWorkoutTemplates, workoutTemplateRecommendationIssue } from "@/lib/planning/templateRecommendations";
import { planningSnapshot, subscribePlanning } from "@/lib/planning/store";
export default function PlanRecommendationCard() {
  usePlanningDay();
  useSyncExternalStore(subscribePlanning, planningSnapshot, planningSnapshot);
  const goals = readGoals();
  let saved = false; let goalError = "";
  try { requireSavedGoals(); saved = true; }
  catch (cause) { goalError = cause instanceof Error ? cause.message : "Review your Goals before creating a plan."; }
  const profile = readSoundFitnessProfileRecord() as RecommendationProfile;
  const recommendation = recommendPlan(profile, goals);
  const templates = saved ? readWorkoutBuilderTemplates() : [];
  const ambiguousIds = ambiguousWorkoutTemplateIds(templates);
  const unavailableTemplates = templates.filter(template => workoutTemplateRecommendationIssue(template));
  const matches = saved ? rankWorkoutTemplates(templates, profile, recommendation.primaryFocus).slice(0, 3) : [];
  const coverage = saved ? recommendation.days.filter(day => day.training).map(day => ({
    ...day,
    matches: rankWorkoutTemplates(templates, profile, day.focus).filter(match => match.focusSupported && match.equipmentConfirmed),
  })) : [];
  const coveredDays = coverage.filter(day => day.matches.length > 0).length;
  return <section aria-label="Recommended plan" className="space-y-3 rounded-3xl border border-cyan-300/20 bg-slate-950/60 p-5">
    <h2 className="text-xl font-bold">{saved ? "Recommended starting plan" : goals.updatedAt ? "Review your saved goals" : "Set your goals first"}</h2>
    {!saved && goalError && <p role="status" className="text-sm text-amber-200">{goalError}</p>}
    {saved ? <><p className="font-bold text-cyan-200">{recommendation.title}</p><ul className="list-disc space-y-1 pl-5 text-sm text-slate-300">{recommendation.reasons.map(reason => <li key={reason}>{reason}</li>)}</ul><p className="text-sm">{recommendation.days.filter(day => day.training).map(day => `${day.day}: ${day.focus}`).join(" · ")}</p><Link className="inline-block rounded-xl bg-cyan-300 px-4 py-3 font-bold text-slate-950" href={`${ROUTES.dashboard.createMyPlan}?recommended=1`}>Use recommended structure</Link><p className="text-xs text-slate-400">A starting structure to review and customize. You choose and assign workouts before training.</p></> : <><p>Save a primary goal and weekly targets to get a recommendation based on your age and training context.</p><Link className="inline-block text-cyan-200" href={ROUTES.dashboard.goals}>Set goals</Link></>}
    {recommendation.age === null && <Link className="block text-sm text-cyan-200" href={ROUTES.dashboard.profile}>Add age in Profile</Link>}
    {saved && <div className="space-y-3 border-t border-white/10 pt-3">
      {ambiguousIds.size > 0 && <p role="status" className="text-sm text-amber-200">{ambiguousIds.size} saved workout ID(s) have multiple originals. These workouts are excluded from coverage and suggestions. Review the workout library before assigning recommendations; the originals have not changed.</p>}
      {unavailableTemplates.length > 0 && <p role="status" className="text-sm text-amber-200">{unavailableTemplates.length} saved workout(s) need data or sync-conflict review and are excluded from suggestions and coverage. Original workouts are preserved. <Link className="underline" href={ROUTES.workoutBuilder.home}>Review saved workouts</Link></p>}
      <h3 className="font-bold">Saved workout coverage · {coveredDays}/{coverage.length} training days</h3>
      <p className="text-xs text-slate-400">Coverage requires exercise evidence for each day’s complete focus and confirmed equipment. It previews the recommended structure; saving assignments is a separate action.</p>
      <ul className="space-y-2">
        {coverage.map(day => <li key={day.day} className="rounded-xl border border-white/10 p-3 text-sm">
          <p className="font-bold">{day.day} · {day.focus}</p>
          {day.matches.length ? <p className="text-cyan-200">{day.matches[0].template.title} · {day.matches.length} eligible saved {day.matches.length === 1 ? "workout" : "workouts"}</p>
            : <p className="text-amber-200">Needs a saved workout with this focus and confirmed equipment. Choose one manually in My Plan or build one.</p>}
        </li>)}
      </ul>
      {coveredDays < coverage.length && <Link className="inline-block text-sm text-cyan-200" href={ROUTES.workoutBuilder.home}>Build a saved workout</Link>}
    </div>}
    {saved && <div className="space-y-2 border-t border-white/10 pt-3"><h3 className="font-bold">Saved workouts to review</h3>{matches.length ? matches.map(match => <p key={match.template.id} className="text-sm"><strong>{match.template.title}</strong> · {match.reasons.join(" ")}</p>) : <p className="text-sm text-slate-400">No saved workout suggestions for the primary focus yet.</p>}</div>}
  </section>;
}
