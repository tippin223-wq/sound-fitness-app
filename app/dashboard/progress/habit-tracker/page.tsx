export default function OnlineTrainingPage() {
  const summary = {
    workouts: "4 this week",
    streak: "3 weeks",
    nextWorkout: "Lower Body Strength",
    focus: "Consistency + form",
  };

  const weeklyPlan = [
    { day: "Monday", workout: "Lower Body Strength", status: "Complete" },
    { day: "Tuesday", workout: "Mobility + Core", status: "Complete" },
    { day: "Thursday", workout: "Upper Body Strength", status: "Today" },
    { day: "Saturday", workout: "Conditioning + Stretch", status: "Planned" },
  ];

  const tools = [
    {
      title: "Workout Library",
      detail: "Access guided workouts and movement demos.",
      badge: "Train",
    },
    {
      title: "Progress Dashboard",
      detail: "Track streaks, strength, wins, and body areas.",
      badge: "Track",
    },
    {
      title: "Coach Messaging",
      detail: "Send updates, ask questions, and get support.",
      badge: "Support",
    },
  ];

  const statusStyles: Record<string, string> = {
    Complete: "border-emerald-400/20 bg-emerald-500/10 text-emerald-300",
    Today: "border-sky-400/20 bg-sky-500/10 text-sky-300",
    Planned: "border-violet-400/20 bg-violet-500/10 text-violet-300",
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.12),_transparent_28%),linear-gradient(180deg,#020617_0%,#0f172a_100%)] text-white">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <div className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
          <div className="space-y-6">
            <section className="rounded-[32px] border border-white/10 bg-white/[0.05] p-6 shadow-2xl shadow-black/20 backdrop-blur lg:p-8">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <div className="text-[11px] uppercase tracking-[0.24em] text-sky-300">
                    Video Review + Training Support
                  </div>
                  <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">
                    Your training plan, all in one place
                  </h1>
                  <p className="mt-3 max-w-2xl text-base text-slate-300">
                    Follow your workouts, track progress, message your coach,
                    and keep momentum between sessions.
                  </p>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <button className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-medium text-slate-200 hover:bg-white/10">
                    Message Coach
                  </button>
                  <button className="rounded-2xl bg-sky-500 px-5 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-sky-500/20 hover:bg-sky-400">
                    Start Workout
                  </button>
                </div>
              </div>
            </section>

            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {[
                ["This Week", summary.workouts],
                ["Current Streak", summary.streak],
                ["Next Workout", summary.nextWorkout],
                ["Training Focus", summary.focus],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="rounded-[28px] border border-white/10 bg-white/[0.05] p-5 shadow-xl shadow-black/15 backdrop-blur"
                >
                  <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">
                    {label}
                  </div>
                  <div className="mt-3 text-2xl font-bold tracking-tight">
                    {value}
                  </div>
                </div>
              ))}
            </section>

            <section className="rounded-[32px] border border-white/10 bg-white/[0.05] p-6 shadow-2xl shadow-black/20 backdrop-blur">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-[11px] uppercase tracking-[0.22em] text-emerald-300">
                    Weekly Plan
                  </div>
                  <h2 className="mt-2 text-2xl font-bold tracking-tight">
                    Your scheduled workouts
                  </h2>
                </div>
              </div>

              <div className="mt-5 space-y-3">
                {weeklyPlan.map((item) => (
                  <div
                    key={item.day}
                    className="rounded-[24px] border border-white/10 bg-slate-950/55 p-4"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <div className="text-sm uppercase tracking-[0.18em] text-slate-500">
                          {item.day}
                        </div>
                        <div className="mt-1 text-lg font-semibold text-white">
                          {item.workout}
                        </div>
                      </div>
                      <div
                        className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusStyles[item.status]}`}
                      >
                        {item.status}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-[32px] border border-white/10 bg-white/[0.05] p-6 shadow-2xl shadow-black/20 backdrop-blur">
              <div className="text-[11px] uppercase tracking-[0.22em] text-violet-300">
                Training Tools
              </div>
              <h2 className="mt-2 text-2xl font-bold tracking-tight">
                Everything you need to stay consistent
              </h2>

              <div className="mt-5 grid gap-4 md:grid-cols-3">
                {tools.map((item) => (
                  <div
                    key={item.title}
                    className="rounded-[26px] border border-white/10 bg-slate-950/55 p-5"
                  >
                    <div className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-slate-300">
                      {item.badge}
                    </div>
                    <div className="mt-4 text-lg font-semibold text-white">
                      {item.title}
                    </div>
                    <div className="mt-2 text-sm text-slate-400">
                      {item.detail}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <div className="space-y-6">
            <section className="rounded-[32px] border border-white/10 bg-white/[0.05] p-6 shadow-2xl shadow-black/20 backdrop-blur">
              <div className="text-[11px] uppercase tracking-[0.22em] text-cyan-300">
                Today’s Focus
              </div>
              <h2 className="mt-2 text-2xl font-bold tracking-tight">
                Upper Body Strength
              </h2>

              <div className="mt-5 rounded-[26px] border border-sky-400/20 bg-sky-500/10 p-5">
                <div className="text-lg font-semibold text-white">
                  Main goal: smooth controlled reps
                </div>
                <div className="mt-2 text-sm text-slate-100">
                  Prioritize clean technique, steady tempo, and full range of
                  motion over chasing heavier weight today.
                </div>
              </div>

              <div className="mt-5 flex flex-col gap-3">
                <button className="rounded-[24px] bg-sky-500 px-5 py-4 text-sm font-semibold text-slate-950 shadow-lg shadow-sky-500/20 hover:bg-sky-400">
                  Open Today’s Workout
                </button>
                <button className="rounded-[24px] border border-white/10 bg-white/5 px-5 py-4 text-sm font-medium text-slate-200 hover:bg-white/10">
                  View Exercise Library
                </button>
              </div>
            </section>

            <section className="rounded-[32px] border border-white/10 bg-white/[0.05] p-6 shadow-2xl shadow-black/20 backdrop-blur">
              <div className="text-[11px] uppercase tracking-[0.22em] text-amber-300">
                Coach Notes
              </div>
              <h2 className="mt-2 text-2xl font-bold tracking-tight">
                Keep the plan simple
              </h2>

              <p className="mt-4 text-sm leading-6 text-slate-300">
                Video review works best when the next step is obvious. Complete
                the workout, log your notes, and send any form questions so the
                plan can keep adjusting to you.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
