export default function WorkoutCalendarPage() {
  const month = "April 2026";

  const summary = {
    planned: 16,
    completed: 11,
    nextWorkout: "Tomorrow • Upper Body Strength",
    weeklyGoal: "4 workouts",
  };

  const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const days = [
    { day: "30", muted: true },
    { day: "31", muted: true },
    { day: "1", type: "completed", label: "Lower Body" },
    { day: "2", type: "planned", label: "Mobility" },
    { day: "3", type: "completed", label: "Upper Body" },
    { day: "4", type: "rest", label: "Recovery" },
    { day: "5", type: "planned", label: "Core" },
    { day: "6", type: "completed", label: "Lower Body" },
    { day: "7", type: "planned", label: "Upper Body" },
    { day: "8", type: "rest", label: "Recovery" },
    { day: "9", type: "completed", label: "Mobility" },
    { day: "10", type: "completed", label: "Strength" },
    { day: "11", type: "rest", label: "Recovery" },
    { day: "12", type: "planned", label: "Lower Body" },
    { day: "13", type: "completed", label: "Upper Body" },
    { day: "14", type: "planned", label: "Core" },
    { day: "15", type: "completed", label: "Lower Body" },
    { day: "16", type: "planned", label: "Upper Body" },
    { day: "17", type: "today", label: "Today" },
    { day: "18", type: "planned", label: "Mobility" },
    { day: "19", type: "rest", label: "Recovery" },
    { day: "20", type: "planned", label: "Lower Body" },
    { day: "21", type: "planned", label: "Upper Body" },
    { day: "22", type: "planned", label: "Core" },
    { day: "23", type: "rest", label: "Recovery" },
    { day: "24", type: "planned", label: "Strength" },
    { day: "25", type: "planned", label: "Mobility" },
    { day: "26", type: "rest", label: "Recovery" },
    { day: "27", type: "planned", label: "Lower Body" },
    { day: "28", type: "planned", label: "Upper Body" },
    { day: "29", type: "planned", label: "Core" },
    { day: "30", type: "planned", label: "Strength" },
    { day: "1", muted: true },
    { day: "2", muted: true },
    { day: "3", muted: true },
  ];

  const upcoming = [
    {
      day: "Thu",
      title: "Upper Body Strength",
      time: "6:30 PM",
      notes: "Push / Pull / Carry",
    },
    {
      day: "Fri",
      title: "Mobility Reset",
      time: "7:00 AM",
      notes: "Hips / T-spine / breathing",
    },
    {
      day: "Sun",
      title: "Core + Recovery",
      time: "9:00 AM",
      notes: "Plank / Pallof / stretch",
    },
  ];

  const templates = [
    "Lower Body Strength",
    "Upper Body Strength",
    "Mobility Reset",
    "Core + Recovery",
  ];

  const dayStyles = {
    completed: "border-emerald-400/20 bg-emerald-500/10 text-emerald-300",
    planned: "border-sky-400/20 bg-sky-500/10 text-sky-300",
    rest: "border-white/10 bg-slate-950/55 text-slate-400",
    today: "border-amber-400/30 bg-amber-500/10 text-amber-300",
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.14),_transparent_30%),linear-gradient(180deg,#020617_0%,#0f172a_100%)] text-white">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <div className="grid gap-6 xl:grid-cols-[1.12fr_0.88fr]">
          <div className="space-y-6">
            <section className="rounded-[32px] border border-white/10 bg-white/[0.05] p-6 shadow-2xl shadow-black/20 backdrop-blur lg:p-8">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <div className="text-[11px] uppercase tracking-[0.24em] text-sky-300">
                    Workout Planning
                  </div>
                  <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">
                    Training Calendar
                  </h1>
                  <p className="mt-3 max-w-2xl text-base text-slate-300">
                    Plan the week, stay consistent, and keep workouts aligned
                    with recovery and momentum.
                  </p>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <button className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-medium text-slate-200 hover:bg-white/10">
                    Month View
                  </button>
                  <button className="rounded-2xl bg-sky-500 px-5 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-sky-500/20 hover:bg-sky-400">
                    Plan Workout
                  </button>
                </div>
              </div>
            </section>

            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-[28px] border border-white/10 bg-white/[0.05] p-5 shadow-xl shadow-black/15 backdrop-blur">
                <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">
                  Planned This Month
                </div>
                <div className="mt-3 text-3xl font-bold tracking-tight">
                  {summary.planned}
                </div>
                <div className="mt-2 text-sm text-slate-400">
                  Total scheduled sessions.
                </div>
              </div>
              <div className="rounded-[28px] border border-white/10 bg-white/[0.05] p-5 shadow-xl shadow-black/15 backdrop-blur">
                <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">
                  Completed
                </div>
                <div className="mt-3 text-3xl font-bold tracking-tight">
                  {summary.completed}
                </div>
                <div className="mt-2 text-sm text-slate-400">
                  Finished so far this month.
                </div>
              </div>
              <div className="rounded-[28px] border border-white/10 bg-white/[0.05] p-5 shadow-xl shadow-black/15 backdrop-blur">
                <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">
                  Next Workout
                </div>
                <div className="mt-3 text-xl font-bold tracking-tight">
                  Tomorrow
                </div>
                <div className="mt-2 text-sm text-slate-400">
                  {summary.nextWorkout}
                </div>
              </div>
              <div className="rounded-[28px] border border-white/10 bg-white/[0.05] p-5 shadow-xl shadow-black/15 backdrop-blur">
                <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">
                  Weekly Goal
                </div>
                <div className="mt-3 text-3xl font-bold tracking-tight">4x</div>
                <div className="mt-2 text-sm text-slate-400">
                  {summary.weeklyGoal}
                </div>
              </div>
            </section>

            <section className="rounded-[32px] border border-white/10 bg-white/[0.05] p-6 shadow-2xl shadow-black/20 backdrop-blur">
              <div className="mb-5 flex items-center justify-between gap-3">
                <div>
                  <div className="text-[11px] uppercase tracking-[0.22em] text-violet-300">
                    Calendar View
                  </div>
                  <h2 className="mt-2 text-2xl font-bold tracking-tight">
                    {month}
                  </h2>
                </div>
                <div className="flex gap-2">
                  <button className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-200 hover:bg-white/10">
                    ←
                  </button>
                  <button className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-200 hover:bg-white/10">
                    →
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-7 gap-2 text-center text-xs uppercase tracking-[0.18em] text-slate-500">
                {weekdays.map((day) => (
                  <div key={day} className="px-2 py-2">
                    {day}
                  </div>
                ))}
              </div>

              <div className="mt-2 grid grid-cols-7 gap-2">
                {days.map((item, index) => (
                  <button
                    key={`${item.day}-${index}`}
                    className={`min-h-[94px] rounded-[22px] border p-3 text-left transition ${
                      item.muted
                        ? "border-white/5 bg-white/[0.02] text-slate-600"
                        : dayStyles[item.type as keyof typeof dayStyles] ||
                          "border-white/10 bg-slate-950/55 text-white"
                    }`}
                  >
                    <div className="text-sm font-semibold">{item.day}</div>
                    {item.label ? (
                      <div className="mt-3 text-xs leading-5">{item.label}</div>
                    ) : null}
                  </button>
                ))}
              </div>
            </section>
          </div>

          <div className="space-y-6">
            <section className="rounded-[32px] border border-white/10 bg-white/[0.05] p-6 shadow-2xl shadow-black/20 backdrop-blur">
              <div className="text-[11px] uppercase tracking-[0.22em] text-emerald-300">
                Upcoming Sessions
              </div>
              <h2 className="mt-2 text-2xl font-bold tracking-tight">
                What’s next
              </h2>

              <div className="mt-5 space-y-3">
                {upcoming.map((item) => (
                  <div
                    key={item.day + item.title}
                    className="rounded-[24px] border border-white/10 bg-slate-950/55 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm uppercase tracking-[0.18em] text-slate-500">
                          {item.day}
                        </div>
                        <div className="mt-1 text-lg font-semibold text-white">
                          {item.title}
                        </div>
                        <div className="mt-2 text-sm text-slate-400">
                          {item.notes}
                        </div>
                      </div>
                      <div className="rounded-full border border-sky-400/20 bg-sky-500/10 px-3 py-1 text-xs font-semibold text-sky-300">
                        {item.time}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-[32px] border border-white/10 bg-white/[0.05] p-6 shadow-2xl shadow-black/20 backdrop-blur">
              <div className="text-[11px] uppercase tracking-[0.22em] text-cyan-300">
                Quick Plan
              </div>
              <h2 className="mt-2 text-2xl font-bold tracking-tight">
                Drop in a template
              </h2>

              <div className="mt-5 space-y-3">
                {templates.map((template) => (
                  <button
                    key={template}
                    className="w-full rounded-[24px] border border-white/10 bg-slate-950/55 px-4 py-4 text-left text-sm font-medium text-white hover:bg-slate-900"
                  >
                    {template}
                  </button>
                ))}
              </div>
            </section>

            <section className="rounded-[32px] border border-white/10 bg-white/[0.05] p-6 shadow-2xl shadow-black/20 backdrop-blur">
              <div className="text-[11px] uppercase tracking-[0.22em] text-amber-300">
                Legend
              </div>
              <h2 className="mt-2 text-2xl font-bold tracking-tight">
                Calendar status
              </h2>

              <div className="mt-5 space-y-3">
                <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/55 px-4 py-3">
                  <div className="h-3 w-3 rounded-full bg-emerald-400" />
                  <div className="text-sm text-slate-200">
                    Completed workout
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/55 px-4 py-3">
                  <div className="h-3 w-3 rounded-full bg-sky-400" />
                  <div className="text-sm text-slate-200">Planned workout</div>
                </div>
                <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/55 px-4 py-3">
                  <div className="h-3 w-3 rounded-full bg-amber-400" />
                  <div className="text-sm text-slate-200">Today</div>
                </div>
                <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/55 px-4 py-3">
                  <div className="h-3 w-3 rounded-full bg-slate-500" />
                  <div className="text-sm text-slate-200">
                    Recovery / rest day
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
