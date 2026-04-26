export default function PostWorkoutProgressPage() {
  const session = {
    title: "Workout Complete",
    workoutName: "Lower Body Strength Day",
    completedAt: "Today • 7:42 AM",
    duration: "34 min",
    adherence: "8 of 8 steps completed",
    feeling: "Strong",
    streak: 6,
    notes:
      "Felt better on goblet squats today. RDL balance improved. Next time, increase goblet squat load slightly.",
  };

  const stats = [
    { label: "Workouts This Week", value: "3" },
    { label: "Current Streak", value: `${session.streak} days` },
    { label: "Session Duration", value: session.duration },
    { label: "Completion", value: "100%" },
  ];

  const movementProgress = [
    {
      name: "DB Goblet Squat",
      previous: "35 lb x 8",
      current: "40 lb x 8",
      change: "+5 lb",
      status: "up",
    },
    {
      name: "DB Romanian Deadlift",
      previous: "30 lb x 10",
      current: "30 lb x 10",
      change: "Same load",
      status: "same",
    },
    {
      name: "Step-Up",
      previous: "Bodyweight x 10/side",
      current: "10 lb x 10/side",
      change: "+Load",
      status: "up",
    },
    {
      name: "Plank",
      previous: "25 sec",
      current: "30 sec",
      change: "+5 sec",
      status: "up",
    },
  ];

  const weeklyHistory = [
    { day: "Mon", complete: true },
    { day: "Tue", complete: true },
    { day: "Wed", complete: false },
    { day: "Thu", complete: true },
    { day: "Fri", complete: true },
    { day: "Sat", complete: false },
    { day: "Sun", complete: true },
  ];

  const nextSteps = [
    "Log soreness and energy before tonight.",
    "Increase goblet squat slightly next session.",
    "Keep the same RDL load and clean up control.",
  ];

  const statusStyles = {
    up: "border-emerald-400/20 bg-emerald-500/10 text-emerald-300",
    same: "border-white/10 bg-white/5 text-slate-300",
    down: "border-orange-400/20 bg-orange-500/10 text-orange-300",
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.12),_transparent_28%),linear-gradient(180deg,#020617_0%,#0f172a_100%)] text-white">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6">
            <section className="rounded-[30px] border border-white/10 bg-white/[0.05] p-6 shadow-2xl shadow-black/20 backdrop-blur">
              <div className="text-[11px] uppercase tracking-[0.24em] text-emerald-300">
                Session Complete
              </div>
              <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">
                {session.title}
              </h1>
              <p className="mt-3 text-base text-slate-300">
                {session.workoutName}
              </p>

              <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {stats.map((stat) => (
                  <div
                    key={stat.label}
                    className="rounded-2xl border border-white/10 bg-slate-950/55 px-4 py-4"
                  >
                    <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">
                      {stat.label}
                    </div>
                    <div className="mt-2 text-2xl font-bold text-white">
                      {stat.value}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-[30px] border border-white/10 bg-white/[0.05] p-6 shadow-2xl shadow-black/20 backdrop-blur">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-[11px] uppercase tracking-[0.22em] text-sky-300">
                    Movement Progress
                  </div>
                  <h2 className="mt-2 text-2xl font-bold tracking-tight">
                    Today vs last session
                  </h2>
                </div>
                <button className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-white/10">
                  View full history
                </button>
              </div>

              <div className="mt-5 space-y-3">
                {movementProgress.map((item) => (
                  <div
                    key={item.name}
                    className="rounded-2xl border border-white/10 bg-slate-950/55 p-4"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <div className="text-lg font-semibold text-white">
                          {item.name}
                        </div>
                        <div className="mt-1 text-sm text-slate-400">
                          Previous: {item.previous}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div className="text-base font-semibold text-white">
                            {item.current}
                          </div>
                          <div className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-500">
                            Current
                          </div>
                        </div>
                        <div
                          className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusStyles[item.status]}`}
                        >
                          {item.change}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-[30px] border border-white/10 bg-white/[0.05] p-6 shadow-2xl shadow-black/20 backdrop-blur">
              <div className="text-[11px] uppercase tracking-[0.22em] text-violet-300">
                Coach Notes
              </div>
              <h2 className="mt-2 text-2xl font-bold tracking-tight">
                Session reflection
              </h2>
              <div className="mt-4 rounded-2xl border border-white/10 bg-slate-950/55 p-5 text-base leading-7 text-slate-200">
                {session.notes}
              </div>
            </section>
          </div>

          <div className="space-y-6">
            <section className="rounded-[30px] border border-white/10 bg-white/[0.05] p-6 shadow-2xl shadow-black/20 backdrop-blur">
              <div className="text-[11px] uppercase tracking-[0.22em] text-cyan-300">
                Summary
              </div>
              <h2 className="mt-2 text-2xl font-bold tracking-tight">
                How today went
              </h2>

              <div className="mt-5 space-y-4">
                <div className="rounded-2xl border border-white/10 bg-slate-950/55 p-4">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">
                    Completed
                  </div>
                  <div className="mt-2 text-base font-semibold text-white">
                    {session.completedAt}
                  </div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-slate-950/55 p-4">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">
                    Adherence
                  </div>
                  <div className="mt-2 text-base font-semibold text-white">
                    {session.adherence}
                  </div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-slate-950/55 p-4">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">
                    Post-workout feeling
                  </div>
                  <div className="mt-2 text-base font-semibold text-white">
                    {session.feeling}
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-[30px] border border-white/10 bg-white/[0.05] p-6 shadow-2xl shadow-black/20 backdrop-blur">
              <div className="text-[11px] uppercase tracking-[0.22em] text-amber-300">
                Consistency
              </div>
              <h2 className="mt-2 text-2xl font-bold tracking-tight">
                Weekly streak
              </h2>

              <div className="mt-5 grid grid-cols-7 gap-2">
                {weeklyHistory.map((item) => (
                  <div key={item.day} className="text-center">
                    <div className="mb-2 text-xs uppercase tracking-[0.18em] text-slate-500">
                      {item.day}
                    </div>
                    <div
                      className={`flex h-14 items-center justify-center rounded-2xl border text-sm font-semibold ${
                        item.complete
                          ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-300"
                          : "border-white/10 bg-slate-950/55 text-slate-500"
                      }`}
                    >
                      {item.complete ? "✓" : "—"}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-[30px] border border-white/10 bg-white/[0.05] p-6 shadow-2xl shadow-black/20 backdrop-blur">
              <div className="text-[11px] uppercase tracking-[0.22em] text-emerald-300">
                Next Steps
              </div>
              <h2 className="mt-2 text-2xl font-bold tracking-tight">
                Keep momentum
              </h2>

              <div className="mt-5 space-y-3">
                {nextSteps.map((step) => (
                  <div
                    key={step}
                    className="rounded-2xl border border-white/10 bg-slate-950/55 px-4 py-4 text-sm text-slate-200"
                  >
                    {step}
                  </div>
                ))}
              </div>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <button className="rounded-2xl bg-sky-500 px-4 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-sky-500/20 hover:bg-sky-400">
                  View Next Workout
                </button>
                <button className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-slate-200 hover:bg-white/10">
                  Return to Dashboard
                </button>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
