"use client";

import TrainingJourneyNavigator from "@/components/dashboard/TrainingJourneyNavigator";

import { useSyncExternalStore } from "react";
import { planningKeys, planningSnapshot, readPlanning, subscribePlanning } from "@/lib/planning/store";
import { readAvailableWorkoutLogs } from "@/lib/planning/logs";
import { cloudHistorySnapshot, serverCloudHistory } from "@/lib/planning/availableLogs";
import { refreshCloudWorkoutHistory } from "@/lib/planning/cloudHistory";
import { inspectWorkoutPlans } from "@/lib/localData/workoutPlanData";
import { inspectWeeklyCheckInRecords } from "@/lib/planning/checkIns";
import { inspectJournalRecords } from "@/lib/planning/journal";
import { inspectPainRecords } from "@/lib/planning/painLogs";
import { buildProgressSummary } from "@/lib/planning/progress";
import { captureWorkoutHistoryRecovery } from "@/lib/planning/workoutHistoryRecovery";
import WorkoutHistoryReviewNotice from "@/components/dashboard/WorkoutHistoryReviewNotice";

const currentMinute = () => Math.floor(Date.now() / 60000);
const serverMinute = () => 0;
function subscribeProgressClock(callback: () => void) {
  const timer = setInterval(callback, 60000);
  window.addEventListener("focus", callback);
  return () => { clearInterval(timer); window.removeEventListener("focus", callback); };
}
export default function DashboardProgressPage() {
  useSyncExternalStore(subscribePlanning, planningSnapshot, planningSnapshot);
  const cloud = useSyncExternalStore(subscribePlanning, cloudHistorySnapshot, serverCloudHistory);
  const minute = useSyncExternalStore(subscribeProgressClock, currentMinute, serverMinute);
  if (!minute) return <p role="status" className="p-6 text-slate-300">Loading your progress…</p>;
  const recovery = captureWorkoutHistoryRecovery();
  if (recovery.issues.length) return <WorkoutHistoryReviewNotice area="Progress reporting" issues={recovery.issues} />;
  const planSource = inspectWorkoutPlans();
  const checkIns = inspectWeeklyCheckInRecords(); const journal = inspectJournalRecords(); const pain = inspectPainRecords();
  const { workoutSnapshot, weeklyTraining, bodyFocus, goals, feedbackProgress, feedbackReview, planReview, nextAction, recentWorkouts, weekStart, weekEnd } = buildProgressSummary({ logs: readAvailableWorkoutLogs(), goals: readPlanning(planningKeys.goals, {}), plans: planSource.plans, planIssue: planSource.issue, checkIns: checkIns.history, journal: journal.entries, painLogs: pain.logs, feedbackIssues: { checkIns: checkIns.issue, journal: journal.issue, painLogs: pain.issue } });
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.14),_transparent_30%),linear-gradient(180deg,#020617_0%,#0f172a_100%)] text-white">
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <TrainingJourneyNavigator currentStep="progress" variant="full" />
        <div className="flex flex-wrap items-center gap-3 text-sm text-slate-300"><p role="status">{cloud.status}</p><button type="button" disabled={cloud.status.startsWith("Loading")} onClick={() => void refreshCloudWorkoutHistory()} className="text-sky-300 disabled:text-slate-500">Refresh Cloud History</button></div>

        {planReview && <section role="alert" aria-label="Saved plans need review" className="rounded-2xl border border-amber-300/30 p-5 text-amber-200">
          <p>{planReview}</p><p className="mt-2">Scheduled completion is paused. Valid logged workouts and feedback remain available.</p>
          <a href="/dashboard/calendar" className="mt-3 block underline">Review and export original plans in Calendar</a>
        </section>}

        {feedbackReview.length > 0 && <section role="alert" aria-label="Feedback records need review" className="rounded-2xl border border-amber-300/30 p-5 text-amber-200">
          <p>Some saved feedback needs review. Affected totals are paused; original records remain saved.</p>
          <ul className="mt-3 space-y-2">{feedbackReview.map(item => <li key={item.href}><a href={item.href} className="underline">Review {item.label}</a><p className="mt-1 text-sm">{item.issue}</p></li>)}</ul>
        </section>}

        <section className="overflow-hidden rounded-[36px] border border-white/10 bg-white/[0.05] shadow-2xl shadow-black/20 backdrop-blur">
          <div className="grid gap-6 p-6 lg:grid-cols-[1.1fr_0.9fr] lg:p-8">
            <div>
              <div className="text-[11px] uppercase tracking-[0.26em] text-sky-300">
                Dashboard / Progress
              </div>

              <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">
                Your recorded progress.
              </h1>

              <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300">
                Review logged workouts, saved weekly targets, check-ins, and journal entries.
                Current week: {weekStart} through {weekEnd}.
              </p>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <a
                  href="/dashboard/my-plan"
                  className="rounded-2xl bg-sky-500 px-5 py-3 text-center text-sm font-semibold text-slate-950 shadow-lg shadow-sky-500/20 hover:bg-sky-400"
                >
                  Open My Plan
                </a>

                <a
                  href="/dashboard/social"
                  className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-center text-sm font-medium text-slate-200 hover:bg-white/10"
                >
                  Open Social Hub
                </a>

                <a
                  href="/dashboard/social/post"
                  className="rounded-2xl border border-yellow-400/20 bg-yellow-500/10 px-5 py-3 text-center text-sm font-medium text-yellow-300 hover:bg-yellow-500/15"
                >
                  Share a Win
                </a>
              </div>
            </div>

            <div className="rounded-[30px] border border-sky-400/20 bg-sky-500/10 p-5">
              <div className="text-[11px] uppercase tracking-[0.22em] text-sky-300">
                Recent Workout Snapshot
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3">
                {workoutSnapshot.map((stat) => (
                  <div
                    key={stat.label}
                    className="rounded-[22px] border border-white/10 bg-slate-950/55 p-4"
                  >
                    <div className="text-[10px] uppercase tracking-[0.16em] text-slate-500">
                      {stat.label}
                    </div>
                    <div className="mt-2 text-xl font-bold text-white">
                      {stat.value}
                    </div>
                    <div className="mt-1 text-xs text-slate-400">
                      {stat.sub}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
          {workoutSnapshot.map((stat) => (
            <div
              key={stat.label}
              className="rounded-[28px] border border-white/10 bg-white/[0.05] p-5 shadow-xl shadow-black/15 backdrop-blur"
            >
              <div className="text-[10px] uppercase tracking-[0.16em] text-slate-500">
                {stat.label}
              </div>
              <div className="mt-2 text-2xl font-bold text-white">
                {stat.value}
              </div>
              <div className="mt-1 text-xs text-slate-400">{stat.sub}</div>
            </div>
          ))}
        </section>

        <div className="mt-6 grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-6">
            <section className="rounded-[32px] border border-white/10 bg-white/[0.05] p-6">
              <h2 className="text-2xl font-bold">Recent logged workouts</h2>
              {!recentWorkouts.length && <p className="mt-4 text-slate-300">No completed workouts logged yet.</p>}
              {recentWorkouts.map(workout => <div key={workout.id} className="mt-4 rounded-2xl border border-white/10 p-4">
                <h3 className="font-semibold">{workout.title}</h3>
                <p className="mt-2 text-sm text-slate-300">{workout.date} · {workout.sets} logged sets</p>
              </div>)}
              <a href="/dashboard/sessions/history" className="mt-4 inline-block text-sky-300">Open workout history</a>
            </section>

            <section className="rounded-[32px] border border-white/10 bg-white/[0.05] p-6 shadow-2xl shadow-black/20 backdrop-blur">
              <div>
                <div className="text-[11px] uppercase tracking-[0.22em] text-violet-300">
                  Weekly Rhythm
                </div>
                <h2 className="mt-2 text-2xl font-bold tracking-tight">
                  Training week at a glance
                </h2>
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-7">
                {weeklyTraining.map((day) => (
                  <div
                    key={day.date}
                    className="rounded-[24px] border border-white/10 bg-slate-950/55 p-4"
                  >
                    <div className="text-xs uppercase tracking-[0.18em] text-slate-500">
                      {day.day}
                    </div>

                    <div className="mt-3 text-sm font-semibold text-white">
                      {day.title}
                    </div>

                    <div className="mt-2 rounded-full border border-sky-400/20 bg-sky-500/10 px-3 py-1 text-xs text-sky-300">
                      {day.status}
                    </div>

                    <div className="mt-3 text-xs text-slate-400">
                      {day.score}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-[32px] border border-white/10 bg-white/[0.05] p-6 shadow-2xl shadow-black/20 backdrop-blur">
              <div>
                <div className="text-[11px] uppercase tracking-[0.22em] text-cyan-300">
                  Logged Exercise Volume
                </div>
                <h2 className="mt-2 text-2xl font-bold tracking-tight">
                  This week’s logged sets
                </h2>
              </div>

              <div className="mt-5 space-y-4">
                {!bodyFocus.length && <p className="text-slate-300">No exercise sets logged this week.</p>}
                {bodyFocus.map((area) => (
                  <div
                    key={area.id}
                    className="rounded-[24px] border border-white/10 bg-slate-950/55 p-4"
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <div>
                        <div className="text-sm font-semibold text-white">
                          {area.area}
                        </div>
                        <div className="text-xs text-slate-500">
                          {area.note}
                        </div>
                      </div>

                      <div className="text-sm font-bold text-sky-300">
                        {area.volume}%
                      </div>
                    </div>

                    <div className="h-2 w-full rounded-full bg-white/10">
                      <div
                        className="h-2 rounded-full bg-sky-400"
                        style={{ width: `${area.volume}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <div className="space-y-6">
            <section className="rounded-[32px] border border-white/10 bg-white/[0.05] p-6 shadow-2xl shadow-black/20 backdrop-blur xl:sticky xl:top-6">
              <div className="text-[11px] uppercase tracking-[0.22em] text-yellow-300">
                Feedback + Reflection
              </div>

              <h2 className="mt-2 text-2xl font-bold tracking-tight">
                Your saved feedback
              </h2>

              <div className="mt-5 grid gap-3">
                {feedbackProgress.map((item) => (
                  <div
                    key={item.label}
                    className="rounded-[24px] border border-white/10 bg-slate-950/55 p-4"
                  >
                    <div className="text-[10px] uppercase tracking-[0.16em] text-slate-500">
                      {item.label}
                    </div>
                    <div className="mt-2 text-2xl font-bold text-yellow-300">
                      {item.value}
                    </div>
                    <div className="mt-1 text-xs text-slate-400">
                      {item.sub}
                    </div>
                  </div>
                ))}
              </div>

              <a
                href="/dashboard/progress/check-in"
                className="mt-5 block rounded-2xl bg-sky-500 px-4 py-3 text-center text-sm font-semibold text-slate-950 shadow-lg shadow-sky-500/20 hover:bg-sky-400"
              >
                Open Weekly Check-In
              </a>
              <a href="/dashboard/progress/journal" className="mt-3 block text-center text-sm text-sky-300">Open Training Journal</a>
              <a href="/dashboard/progress/pain-tracking" className="mt-3 block text-center text-sm text-sky-300">Open Pain Reports</a>
              <a href="/dashboard/progress/habit-tracker" className="mt-3 block text-center text-sm text-sky-300">Open Habit Tracker</a>
            </section>

            <section className="rounded-[32px] border border-white/10 bg-white/[0.05] p-6 shadow-2xl shadow-black/20 backdrop-blur">
              <div className="text-[11px] uppercase tracking-[0.22em] text-amber-300">
                Active Goals
              </div>

              <h2 className="mt-2 text-2xl font-bold tracking-tight">
                What to focus on next
              </h2>

              <div className="mt-5 space-y-4">
                {!goals.length && <a href="/dashboard/goals" className="text-sky-300">Set your weekly goals</a>}
                {goals.map((goal) => (
                  <div
                    key={goal.title}
                    className="rounded-[24px] border border-white/10 bg-slate-950/55 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-white">
                          {goal.title}
                        </div>
                        <div className="mt-1 text-xs text-slate-500">
                          {goal.status}
                        </div>
                      </div>

                      <div className="text-sm font-bold text-sky-300">
                        {goal.progress}%
                      </div>
                    </div>

                    <div className="mt-3 h-2 w-full rounded-full bg-white/10">
                      <div
                        className="h-2 rounded-full bg-sky-400"
                        style={{ width: `${goal.progress}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-[32px] border border-white/10 bg-white/[0.05] p-6 shadow-2xl shadow-black/20 backdrop-blur">
              <div className="text-[11px] uppercase tracking-[0.22em] text-rose-300">
                Planning Next Step
              </div>

              <h2 className="mt-2 text-2xl font-bold tracking-tight">
                Your next best move
              </h2>

              <p className="mt-4 text-sm leading-6 text-slate-300">
                {nextAction}
              </p>

              <div className="mt-5 grid gap-3">
                <a
                  href="/dashboard/my-plan"
                  className="rounded-[22px] border border-white/10 bg-slate-950/55 px-4 py-4 text-sm font-medium text-white hover:border-sky-400/40 hover:bg-sky-500/10"
                >
                  Open My Plan
                </a>

                <a
                  href="/dashboard/social"
                  className="rounded-[22px] border border-white/10 bg-slate-950/55 px-4 py-4 text-sm font-medium text-white hover:border-sky-400/40 hover:bg-sky-500/10"
                >
                  View Community Feed
                </a>

                <a
                  href="/dashboard/sessions/history"
                  className="rounded-[22px] border border-white/10 bg-slate-950/55 px-4 py-4 text-sm font-medium text-white hover:border-sky-400/40 hover:bg-sky-500/10"
                >
                  View Session History
                </a>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
