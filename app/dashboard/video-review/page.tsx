import Link from "next/link";
import { ROUTES } from "@/lib/routes";
import { getExerciseCatalogWithLegacyFallback } from "@/lib/training/normalizedExerciseCatalog";
import type { ExerciseCatalogItem } from "@/types";

const fallbackExercise: ExerciseCatalogItem = {
  id: "chest-press",
  name: "Chest Press",
  body: "Upper Body",
  muscles: "Chest, shoulders, triceps",
  pattern: "Horizontal Push",
  goal: "Strength",
  equipment: "Dumbbell",
  level: "Beginner",
  image: "",
  cue: "Keep the ribs down and press with a smooth controlled path.",
};

const pendingReviews = [
  {
    title: "Incline DB Chest Press",
    linkedSession: "Upper Body Strength",
    status: "Awaiting coach review",
    submittedAt: "Today",
  },
  {
    title: "Goblet Squat",
    linkedSession: "Lower Body Template",
    status: "Needs clearer side angle",
    submittedAt: "Yesterday",
  },
];

const coachFeedback = [
  {
    title: "Row setup",
    note: "Better shoulder position this week. Keep the torso quiet before adding load.",
    action: "Repeat next session",
  },
  {
    title: "Split squat depth",
    note: "Depth is improving. Use a slightly shorter stance and pause the bottom rep.",
    action: "Add to notes",
  },
];

const linkedWorkouts = [
  {
    title: "Start workout logger",
    detail: "Record the session that this video review belongs to.",
    href: ROUTES.dashboard.sessionWorkout,
  },
  {
    title: "Open workout builder",
    detail: "Attach form-check work to saved templates and exercise choices.",
    href: ROUTES.workoutBuilder.home,
  },
  {
    title: "Message coach",
    detail: "Send context, questions, and follow-up notes with your review.",
    href: ROUTES.dashboard.coachMessaging,
  },
];

export default function VideoReviewPage() {
  const exercises = getExerciseCatalogWithLegacyFallback();
  const featuredExercise =
    exercises.find((exercise) =>
      exercise.name.toLowerCase().includes("chest press"),
    ) ||
    exercises.find((exercise) => exercise.name.toLowerCase().includes("row")) ||
    exercises[0] ||
    fallbackExercise;

  const exerciseOptions = exercises.length ? exercises : [fallbackExercise];

  return (
    <main className="min-h-screen bg-[#020713] text-white">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_18%_0%,rgba(14,165,233,0.18),transparent_30%),radial-gradient(circle_at_82%_12%,rgba(16,185,129,0.12),transparent_26%),linear-gradient(180deg,#020713_0%,#06111f_48%,#020713_100%)]" />

      <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-8 lg:py-8">
        <section className="rounded-[30px] border border-white/10 bg-white/[0.045] p-5 shadow-2xl shadow-black/20 backdrop-blur sm:rounded-[34px] sm:p-7 lg:p-8">
          <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <div className="text-[11px] font-black uppercase tracking-[0.24em] text-sky-400">
                Video Review
              </div>
              <h1 className="mt-3 max-w-3xl text-3xl font-black uppercase tracking-tight sm:text-5xl">
                Submit form checks without duplicating the workout flow.
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
                Use this MVP hub to connect an exercise video, related workout,
                coach feedback, and progress notes. Workout logging still lives
                in the canonical session flow.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
              <Link
                href={ROUTES.dashboard.sessionWorkout}
                className="min-h-[48px] rounded-2xl bg-sky-500 px-5 py-4 text-center text-xs font-black uppercase tracking-[0.14em] text-white shadow-[0_0_32px_rgba(14,165,233,0.3)] transition hover:bg-sky-400"
              >
                Open Workout Logger
              </Link>
              <Link
                href={ROUTES.dashboard.stats}
                className="min-h-[48px] rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-4 text-center text-xs font-black uppercase tracking-[0.14em] text-slate-200 transition hover:border-sky-400/50 hover:bg-sky-500/10"
              >
                View Stats
              </Link>
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <div className="space-y-6">
            <section className="rounded-[28px] border border-sky-400/25 bg-white/[0.05] p-5 shadow-2xl shadow-black/20 backdrop-blur sm:rounded-[34px] sm:p-6">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="text-[11px] font-black uppercase tracking-[0.22em] text-sky-300">
                    Submit Video
                  </div>
                  <h2 className="mt-2 text-2xl font-black tracking-tight">
                    Form check draft
                  </h2>
                </div>
                <span className="w-fit rounded-full border border-emerald-300/20 bg-emerald-400/10 px-3 py-2 text-[11px] font-black uppercase tracking-[0.14em] text-emerald-200">
                  Local mock
                </span>
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <label className="grid gap-2 text-sm font-bold text-slate-200">
                  Related Exercise
                  <select
                    name="exercise"
                    defaultValue={featuredExercise.id}
                    className="min-h-[48px] rounded-2xl border border-white/10 bg-slate-950/70 px-4 text-sm text-white outline-none focus:border-sky-400/50"
                  >
                    {exerciseOptions.map((exercise) => (
                      <option key={exercise.id} value={exercise.id}>
                        {exercise.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="grid gap-2 text-sm font-bold text-slate-200">
                  Linked Workout/Session
                  <select
                    name="linkedSession"
                    defaultValue="active-session"
                    className="min-h-[48px] rounded-2xl border border-white/10 bg-slate-950/70 px-4 text-sm text-white outline-none focus:border-sky-400/50"
                  >
                    <option value="active-session">Active workout session</option>
                    <option value="last-completed">Last completed session</option>
                    <option value="saved-template">Saved workout template</option>
                    <option value="coach-note">Coach requested review</option>
                  </select>
                </label>

                <label className="grid gap-2 text-sm font-bold text-slate-200 md:col-span-2">
                  Video Link
                  <input
                    name="videoUrl"
                    type="url"
                    placeholder="Paste a private YouTube, Drive, or Loom link"
                    className="min-h-[48px] rounded-2xl border border-white/10 bg-slate-950/70 px-4 text-sm text-white outline-none placeholder:text-slate-500 focus:border-sky-400/50"
                  />
                </label>

                <label className="grid gap-2 text-sm font-bold text-slate-200 md:col-span-2">
                  Notes For Coach
                  <textarea
                    name="notes"
                    rows={5}
                    placeholder="What should your coach look at? Add load, reps, pain notes, or a timestamp."
                    className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-sky-400/50"
                  />
                </label>
              </div>

              <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  className="min-h-[48px] rounded-2xl bg-gradient-to-r from-sky-400 to-cyan-300 px-5 py-4 text-sm font-black uppercase tracking-[0.14em] text-slate-950 shadow-[0_0_34px_rgba(14,165,233,0.28)]"
                >
                  Submit Video
                </button>
                <button
                  type="button"
                  className="min-h-[48px] rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-4 text-sm font-black uppercase tracking-[0.14em] text-white transition hover:border-sky-400/50 hover:bg-sky-500/10"
                >
                  Save Draft
                </button>
              </div>
            </section>

            <section className="rounded-[28px] border border-white/10 bg-white/[0.045] p-5 shadow-2xl shadow-black/20 backdrop-blur sm:rounded-[34px] sm:p-6">
              <div className="text-[11px] font-black uppercase tracking-[0.22em] text-amber-300">
                Pending Reviews
              </div>
              <h2 className="mt-2 text-2xl font-black tracking-tight">
                Waiting for coach eyes
              </h2>

              <div className="mt-5 grid gap-3">
                {pendingReviews.map((review) => (
                  <div
                    key={`${review.title}-${review.status}`}
                    className="rounded-2xl border border-white/10 bg-slate-950/55 p-4"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <h3 className="text-base font-black text-white">
                          {review.title}
                        </h3>
                        <p className="mt-1 text-sm text-slate-400">
                          {review.linkedSession} - {review.submittedAt}
                        </p>
                      </div>
                      <span className="w-fit rounded-full border border-amber-300/20 bg-amber-400/10 px-3 py-2 text-[11px] font-black uppercase tracking-[0.12em] text-amber-200">
                        {review.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <div className="space-y-6">
            <section className="rounded-[28px] border border-white/10 bg-white/[0.045] p-5 shadow-2xl shadow-black/20 backdrop-blur sm:rounded-[34px] sm:p-6">
              <div className="text-[11px] font-black uppercase tracking-[0.22em] text-emerald-300">
                Coach Feedback
              </div>
              <h2 className="mt-2 text-2xl font-black tracking-tight">
                Recent form notes
              </h2>

              <div className="mt-5 space-y-3">
                {coachFeedback.map((feedback) => (
                  <div
                    key={feedback.title}
                    className="rounded-2xl border border-emerald-300/15 bg-emerald-400/10 p-4"
                  >
                    <h3 className="text-base font-black text-white">
                      {feedback.title}
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-slate-200">
                      {feedback.note}
                    </p>
                    <div className="mt-3 text-xs font-black uppercase tracking-[0.16em] text-emerald-200">
                      {feedback.action}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-[28px] border border-white/10 bg-white/[0.045] p-5 shadow-2xl shadow-black/20 backdrop-blur sm:rounded-[34px] sm:p-6">
              <div className="text-[11px] font-black uppercase tracking-[0.22em] text-cyan-300">
                Related Exercise
              </div>
              <h2 className="mt-2 text-2xl font-black tracking-tight">
                {featuredExercise.name}
              </h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {[
                  ["Body", featuredExercise.body],
                  ["Pattern", featuredExercise.pattern],
                  ["Equipment", featuredExercise.equipment],
                  ["Goal", featuredExercise.goal],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="rounded-2xl border border-white/10 bg-slate-950/55 p-3"
                  >
                    <div className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
                      {label}
                    </div>
                    <div className="mt-1 text-sm font-bold text-white">
                      {value}
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-4 rounded-2xl border border-sky-300/15 bg-sky-400/10 p-4 text-sm leading-6 text-slate-200">
                {featuredExercise.cue}
              </p>
              <Link
                href={ROUTES.workoutBuilder.exerciseLibrary}
                className="mt-4 inline-flex min-h-[44px] items-center rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-xs font-black uppercase tracking-[0.14em] text-white transition hover:border-sky-400/50 hover:bg-sky-500/10"
              >
                Open Exercise Library
              </Link>
            </section>

            <section className="rounded-[28px] border border-white/10 bg-white/[0.045] p-5 shadow-2xl shadow-black/20 backdrop-blur sm:rounded-[34px] sm:p-6">
              <div className="text-[11px] font-black uppercase tracking-[0.22em] text-violet-300">
                Linked Workout/Session
              </div>
              <h2 className="mt-2 text-2xl font-black tracking-tight">
                Keep feedback connected
              </h2>

              <div className="mt-5 grid gap-3">
                {linkedWorkouts.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="group rounded-2xl border border-white/10 bg-slate-950/55 p-4 transition hover:border-sky-400/35 hover:bg-sky-500/10"
                  >
                    <div className="text-sm font-black text-white">
                      {item.title}
                    </div>
                    <p className="mt-1 text-sm leading-6 text-slate-400">
                      {item.detail}
                    </p>
                    <div className="mt-2 text-xs font-black uppercase tracking-[0.16em] text-sky-400 transition group-hover:translate-x-1">
                      Open
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}
