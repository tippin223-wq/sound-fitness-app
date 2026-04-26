export default function UserHomeDashboardPage() {
  const user = {
    firstName: "Joey",
    greeting: "Ready to make today count?",
    nextWorkout: "Lower Body Strength",
    nextWorkoutTime: "Today • 6:30 PM",
    streak: 6,
    weeklyGoal: 4,
    completedThisWeek: 3,
    energy: "High",
  };

  const quickStats = [
    {
      label: "Current Streak",
      value: `${user.streak} days`,
      sub: "Consistency is building.",
    },
    {
      label: "Workouts This Week",
      value: `${user.completedThisWeek}/${user.weeklyGoal}`,
      sub: "One more to hit goal.",
    },
    {
      label: "Energy Check",
      value: user.energy,
      sub: "Best time to train: evening.",
    },
    { label: "Next Session", value: "Tonight", sub: user.nextWorkoutTime },
  ];

  const todaysFocus = [
    { title: "Warm-Up Flow", detail: "3 movements • 5 min", badge: "Prep" },
    {
      title: "Goblet Squat Progression",
      detail: "Main lift focus",
      badge: "Strength",
    },
    {
      title: "Post-Workout Reflection",
      detail: "1 min check-in",
      badge: "Recovery",
    },
  ];

  const recentWorkouts = [
    {
      name: "Upper Body Strength",
      date: "Yesterday",
      duration: "32 min",
      completion: "100%",
    },
    {
      name: "Mobility + Core Reset",
      date: "2 days ago",
      duration: "24 min",
      completion: "100%",
    },
    {
      name: "Lower Body Strength",
      date: "4 days ago",
      duration: "35 min",
      completion: "92%",
    },
  ];

  const movementProgress = [
    { movement: "Goblet Squat", change: "+5 lb", status: "up" },
    { movement: "Plank", change: "+10 sec", status: "up" },
    { movement: "RDL Control", change: "Cleaner reps", status: "same" },
  ];

  const schedule = [
    { day: "Mon", label: "Completed", active: true },
    { day: "Tue", label: "Completed", active: true },
    { day: "Wed", label: "Recovery", active: false },
    { day: "Thu", label: "Tonight", active: true },
    { day: "Fri", label: "Planned", active: false },
    { day: "Sat", label: "Optional", active: false },
    { day: "Sun", label: "Mobility", active: false },
  ];

  const statusStyles = {
    up: "border-emerald-400/20 bg-emerald-500/10 text-emerald-300",
    same: "border-white/10 bg-white/5 text-slate-300",
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.14),_transparent_30%),linear-gradient(180deg,#020617_0%,#0f172a_100%)] text-white">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-6">
            <section className="overflow-hidden rounded-[32px] border border-white/10 bg-white/[0.05] shadow-2xl shadow-black/20 backdrop-blur">
              <div className="grid gap-6 p-6 lg:grid-cols-[1.15fr_0.85fr] lg:p-8">
                <div>
                  <div className="text-[11px] uppercase tracking-[0.24em] text-sky-300">
                    Sound Fitness Dashboard
                  </div>
                  <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">
                    Hey {user.firstName}
                  </h1>
                  <p className="mt-3 max-w-xl text-base text-slate-300">
                    {user.greeting} Your next session is lined up, your progress
                    is moving, and your momentum is real.
                  </p>

                  <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                    <button className="rounded-2xl bg-sky-500 px-5 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-sky-500/20 hover:bg-sky-400">
                      Start Next Workout
                    </button>
                    <button className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-medium text-slate-200 hover:bg-white/10">
                      View Full Progress
                    </button>
                  </div>
                </div>

                <div className="rounded-[28px] border border-white/10 bg-slate-950/55 p-5">
                  <div className="text-[11px] uppercase tracking-[0.2em] text-slate-400">
                    Up next
                  </div>
                  <div className="mt-3 text-2xl font-bold">
                    {user.nextWorkout}
                  </div>
                  <div className="mt-2 text-sm text-slate-300">
                    {user.nextWorkoutTime}
                  </div>

                  <div className="mt-6 rounded-2xl border border-sky-400/20 bg-sky-500/10 p-4">
                    <div className="text-xs uppercase tracking-[0.18em] text-sky-300">
                      Today’s focus
                    </div>
                    <div className="mt-2 text-sm text-white">
                      Lower body strength, clean tempo, and stronger end-range
                      control.
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {quickStats.map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-[28px] border border-white/10 bg-white/[0.05] p-5 shadow-xl shadow-black/15 backdrop-blur"
                >
                  <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">
                    {stat.label}
                  </div>
                  <div className="mt-3 text-3xl font-bold tracking-tight">
                    {stat.value}
                  </div>
                  <div className="mt-2 text-sm text-slate-400">{stat.sub}</div>
                </div>
              ))}
            </section>

            <section className="rounded-[32px] border border-white/10 bg-white/[0.05] p-6 shadow-2xl shadow-black/20 backdrop-blur">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <div className="text-[11px] uppercase tracking-[0.22em] text-emerald-300">
                    Today
                  </div>
                  <h2 className="mt-2 text-2xl font-bold tracking-tight">
                    Session roadmap
                  </h2>
                </div>
                <div className="text-sm text-slate-400">
                  What matters most in the next workout
                </div>
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-3">
                {todaysFocus.map((item) => (
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

            <section className="rounded-[32px] border border-white/10 bg-white/[0.05] p-6 shadow-2xl shadow-black/20 backdrop-blur">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-[11px] uppercase tracking-[0.22em] text-violet-300">
                    Recent Training
                  </div>
                  <h2 className="mt-2 text-2xl font-bold tracking-tight">
                    Last completed workouts
                  </h2>
                </div>
                <button className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-white/10">
                  View history
                </button>
              </div>

              <div className="mt-5 space-y-3">
                {recentWorkouts.map((workout) => (
                  <div
                    key={workout.name + workout.date}
                    className="rounded-[24px] border border-white/10 bg-slate-950/55 p-4"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <div className="text-lg font-semibold text-white">
                          {workout.name}
                        </div>
                        <div className="mt-1 text-sm text-slate-400">
                          {workout.date} • {workout.duration}
                        </div>
                      </div>
                      <div className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300">
                        {workout.completion}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <div className="space-y-6">
            <section className="rounded-[32px] border border-white/10 bg-white/[0.05] p-6 shadow-2xl shadow-black/20 backdrop-blur">
              <div className="text-[11px] uppercase tracking-[0.22em] text-amber-300">
                Weekly Rhythm
              </div>
              <h2 className="mt-2 text-2xl font-bold tracking-tight">
                This week at a glance
              </h2>

              <div className="mt-5 grid grid-cols-7 gap-2">
                {schedule.map((item) => (
                  <div key={item.day} className="text-center">
                    <div className="mb-2 text-xs uppercase tracking-[0.18em] text-slate-500">
                      {item.day}
                    </div>
                    <div
                      className={`rounded-2xl border px-2 py-4 text-xs font-semibold ${item.active ? "border-sky-400/20 bg-sky-500/10 text-sky-300" : "border-white/10 bg-slate-950/55 text-slate-400"}`}
                    >
                      {item.label}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-[32px] border border-white/10 bg-white/[0.05] p-6 shadow-2xl shadow-black/20 backdrop-blur">
              <div className="text-[11px] uppercase tracking-[0.22em] text-cyan-300">
                Progress Signals
              </div>
              <h2 className="mt-2 text-2xl font-bold tracking-tight">
                What’s improving
              </h2>

              <div className="mt-5 space-y-3">
                {movementProgress.map((item) => (
                  <div
                    key={item.movement}
                    className="rounded-[24px] border border-white/10 bg-slate-950/55 p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-base font-semibold text-white">
                          {item.movement}
                        </div>
                        <div className="mt-1 text-sm text-slate-400">
                          Compared to last session
                        </div>
                      </div>
                      <div
                        className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusStyles[item.status]}`}
                      >
                        {item.change}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-[32px] border border-white/10 bg-white/[0.05] p-6 shadow-2xl shadow-black/20 backdrop-blur">
              <div className="text-[11px] uppercase tracking-[0.22em] text-emerald-300">
                Quick Actions
              </div>
              <h2 className="mt-2 text-2xl font-bold tracking-tight">
                Keep moving forward
              </h2>

              <div className="mt-5 grid gap-3">
                <button className="rounded-[24px] border border-white/10 bg-slate-950/55 px-4 py-4 text-left text-sm font-medium text-white hover:bg-slate-900">
                  Start today’s workout
                </button>
                <button className="rounded-[24px] border border-white/10 bg-slate-950/55 px-4 py-4 text-left text-sm font-medium text-white hover:bg-slate-900">
                  View saved workouts
                </button>
                <button className="rounded-[24px] border border-white/10 bg-slate-950/55 px-4 py-4 text-left text-sm font-medium text-white hover:bg-slate-900">
                  Check progress history
                </button>
                <button className="rounded-[24px] border border-white/10 bg-slate-950/55 px-4 py-4 text-left text-sm font-medium text-white hover:bg-slate-900">
                  Update recovery notes
                </button>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
