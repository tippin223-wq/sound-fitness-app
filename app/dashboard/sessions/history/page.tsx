export default function WorkoutHistoryPage() {
  const summary = {
    totalWorkouts: 48,
    thisMonth: 12,
    streak: 6,
    avgDuration: "33 min",
  };

  const filters = ["All", "Strength", "Mobility", "Recovery", "Completed"];

  const history = [
    {
      id: 1,
      title: "Lower Body Strength",
      date: "Today • 7:42 AM",
      duration: "34 min",
      completion: "100%",
      focus: "Squat / Hinge / Core",
      status: "Completed",
    },
    {
      id: 2,
      title: "Upper Body Strength",
      date: "Yesterday • 6:15 PM",
      duration: "32 min",
      completion: "100%",
      focus: "Push / Pull / Carry",
      status: "Completed",
    },
    {
      id: 3,
      title: "Mobility + Core Reset",
      date: "2 days ago • 8:05 AM",
      duration: "24 min",
      completion: "100%",
      focus: "Mobility / Core",
      status: "Completed",
    },
    {
      id: 4,
      title: "Lower Body Strength",
      date: "4 days ago • 7:03 AM",
      duration: "35 min",
      completion: "92%",
      focus: "Squat / Lunge / Core",
      status: "Modified",
    },
    {
      id: 5,
      title: "Recovery Flow",
      date: "6 days ago • 8:20 PM",
      duration: "18 min",
      completion: "100%",
      focus: "Breathing / Mobility",
      status: "Completed",
    },
  ];

  const statusStyles = {
    Completed: "border-emerald-400/20 bg-emerald-500/10 text-emerald-300",
    Modified: "border-amber-400/20 bg-amber-500/10 text-amber-300",
    Skipped: "border-white/10 bg-white/5 text-slate-300",
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.14),_transparent_28%),linear-gradient(180deg,#020617_0%,#0f172a_100%)] text-white">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <div className="space-y-6">
          <section className="rounded-[32px] border border-white/10 bg-white/[0.05] p-6 shadow-2xl shadow-black/20 backdrop-blur lg:p-8">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <div className="text-[11px] uppercase tracking-[0.24em] text-sky-300">
                  Sound Fitness
                </div>
                <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">
                  Workout History
                </h1>
                <p className="mt-3 max-w-2xl text-base text-slate-300">
                  Review past sessions, revisit what worked, and track how
                  consistency is stacking up over time.
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <button className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-medium text-slate-200 hover:bg-white/10">
                  Export History
                </button>
                <button className="rounded-2xl bg-sky-500 px-5 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-sky-500/20 hover:bg-sky-400">
                  Start New Workout
                </button>
              </div>
            </div>
          </section>

          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-[28px] border border-white/10 bg-white/[0.05] p-5 shadow-xl shadow-black/15 backdrop-blur">
              <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">
                Total Workouts
              </div>
              <div className="mt-3 text-3xl font-bold tracking-tight">
                {summary.totalWorkouts}
              </div>
              <div className="mt-2 text-sm text-slate-400">
                All time completed sessions.
              </div>
            </div>
            <div className="rounded-[28px] border border-white/10 bg-white/[0.05] p-5 shadow-xl shadow-black/15 backdrop-blur">
              <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">
                This Month
              </div>
              <div className="mt-3 text-3xl font-bold tracking-tight">
                {summary.thisMonth}
              </div>
              <div className="mt-2 text-sm text-slate-400">
                Sessions finished this month.
              </div>
            </div>
            <div className="rounded-[28px] border border-white/10 bg-white/[0.05] p-5 shadow-xl shadow-black/15 backdrop-blur">
              <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">
                Current Streak
              </div>
              <div className="mt-3 text-3xl font-bold tracking-tight">
                {summary.streak} days
              </div>
              <div className="mt-2 text-sm text-slate-400">
                Momentum is building.
              </div>
            </div>
            <div className="rounded-[28px] border border-white/10 bg-white/[0.05] p-5 shadow-xl shadow-black/15 backdrop-blur">
              <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">
                Avg Duration
              </div>
              <div className="mt-3 text-3xl font-bold tracking-tight">
                {summary.avgDuration}
              </div>
              <div className="mt-2 text-sm text-slate-400">
                Typical completed workout.
              </div>
            </div>
          </section>

          <section className="rounded-[32px] border border-white/10 bg-white/[0.05] p-6 shadow-2xl shadow-black/20 backdrop-blur">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="text-[11px] uppercase tracking-[0.22em] text-violet-300">
                  Session Archive
                </div>
                <h2 className="mt-2 text-2xl font-bold tracking-tight">
                  Past workouts
                </h2>
              </div>

              <div className="flex flex-wrap gap-2">
                {filters.map((filter, index) => (
                  <button
                    key={filter}
                    className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                      index === 0
                        ? "bg-sky-500 text-slate-950"
                        : "border border-white/10 bg-white/5 text-slate-200 hover:bg-white/10"
                    }`}
                  >
                    {filter}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-5 rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3 text-sm text-slate-400">
              Search, date filters, and client-specific history can plug in here
              next.
            </div>

            <div className="mt-5 space-y-3">
              {history.map((item) => (
                <div
                  key={item.id}
                  className="rounded-[26px] border border-white/10 bg-slate-950/55 p-5 transition hover:border-sky-400/30 hover:bg-slate-950/70"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-3">
                        <h3 className="text-xl font-semibold text-white">
                          {item.title}
                        </h3>
                        <span
                          className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusStyles[item.status]}`}
                        >
                          {item.status}
                        </span>
                      </div>
                      <div className="mt-2 text-sm text-slate-400">
                        {item.date}
                      </div>
                      <div className="mt-3 text-sm text-slate-300">
                        Focus: {item.focus}
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-3 lg:min-w-[360px]">
                      <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
                        <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                          Duration
                        </div>
                        <div className="mt-1 text-sm font-semibold text-white">
                          {item.duration}
                        </div>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
                        <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                          Completion
                        </div>
                        <div className="mt-1 text-sm font-semibold text-white">
                          {item.completion}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-slate-200 hover:bg-white/10">
                          Review
                        </button>
                        <button className="w-full rounded-2xl bg-sky-500 px-4 py-3 text-sm font-semibold text-slate-950 hover:bg-sky-400">
                          Repeat
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
