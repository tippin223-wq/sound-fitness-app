export default function SavedWorkoutsPage() {
  const summary = {
    total: 18,
    favorites: 6,
    recent: 4,
    templates: 8,
  };

  const categories = [
    "All",
    "Strength",
    "Mobility",
    "Recovery",
    "Templates",
    "Favorites",
  ];

  const savedWorkouts = [
    {
      id: 1,
      title: "Lower Body Strength A",
      type: "Strength",
      updated: "Today • 8:10 AM",
      duration: "35 min",
      exercises: 8,
      favorite: true,
      note: "Goblet squat focused with hinge + core finish.",
    },
    {
      id: 2,
      title: "Upper Body Strength B",
      type: "Strength",
      updated: "Yesterday • 6:42 PM",
      duration: "32 min",
      exercises: 7,
      favorite: true,
      note: "Push / pull balance with carry finisher.",
    },
    {
      id: 3,
      title: "Mobility Reset Flow",
      type: "Mobility",
      updated: "2 days ago • 7:15 AM",
      duration: "20 min",
      exercises: 6,
      favorite: false,
      note: "Low-intensity reset for hips, shoulders, and breathing.",
    },
    {
      id: 4,
      title: "55+ Full Body Starter",
      type: "Template",
      updated: "3 days ago • 5:30 PM",
      duration: "28 min",
      exercises: 7,
      favorite: true,
      note: "Simple full-body builder with controlled tempo and safe volume.",
    },
    {
      id: 5,
      title: "Recovery Day Circuit",
      type: "Recovery",
      updated: "5 days ago • 8:05 PM",
      duration: "18 min",
      exercises: 5,
      favorite: false,
      note: "Short movement circuit for low-stress recovery days.",
    },
    {
      id: 6,
      title: "Beginner Dumbbell Full Body",
      type: "Template",
      updated: "1 week ago",
      duration: "30 min",
      exercises: 8,
      favorite: false,
      note: "Balanced beginner workout with squat, push, pull, and core.",
    },
  ];

  const typeStyles: Record<string, string> = {
    Strength: "border-sky-400/20 bg-sky-500/10 text-sky-300",
    Mobility: "border-emerald-400/20 bg-emerald-500/10 text-emerald-300",
    Recovery: "border-amber-400/20 bg-amber-500/10 text-amber-300",
    Template: "border-violet-400/20 bg-violet-500/10 text-violet-300",
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.14),_transparent_28%),linear-gradient(180deg,#020617_0%,#0f172a_100%)] text-white">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <div className="space-y-6">
          <section className="rounded-[32px] border border-white/10 bg-white/[0.05] p-6 shadow-2xl shadow-black/20 backdrop-blur lg:p-8">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <div className="text-[11px] uppercase tracking-[0.24em] text-sky-300">
                  Sound Fitness Library
                </div>
                <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">
                  Saved Workouts
                </h1>
                <p className="mt-3 max-w-2xl text-base text-slate-300">
                  Keep your best sessions organized so they are easy to repeat,
                  edit, assign, and launch whenever you need them.
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <button className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-medium text-slate-200 hover:bg-white/10">
                  Import Template
                </button>
                <button className="rounded-2xl bg-sky-500 px-5 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-sky-500/20 hover:bg-sky-400">
                  Create Workout
                </button>
              </div>
            </div>
          </section>

          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-[28px] border border-white/10 bg-white/[0.05] p-5 shadow-xl shadow-black/15 backdrop-blur">
              <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">
                Total Saved
              </div>
              <div className="mt-3 text-3xl font-bold tracking-tight">
                {summary.total}
              </div>
              <div className="mt-2 text-sm text-slate-400">
                Workouts currently stored.
              </div>
            </div>
            <div className="rounded-[28px] border border-white/10 bg-white/[0.05] p-5 shadow-xl shadow-black/15 backdrop-blur">
              <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">
                Favorites
              </div>
              <div className="mt-3 text-3xl font-bold tracking-tight">
                {summary.favorites}
              </div>
              <div className="mt-2 text-sm text-slate-400">
                Your go-to sessions.
              </div>
            </div>
            <div className="rounded-[28px] border border-white/10 bg-white/[0.05] p-5 shadow-xl shadow-black/15 backdrop-blur">
              <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">
                Recently Used
              </div>
              <div className="mt-3 text-3xl font-bold tracking-tight">
                {summary.recent}
              </div>
              <div className="mt-2 text-sm text-slate-400">
                Played this week.
              </div>
            </div>
            <div className="rounded-[28px] border border-white/10 bg-white/[0.05] p-5 shadow-xl shadow-black/15 backdrop-blur">
              <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">
                Templates
              </div>
              <div className="mt-3 text-3xl font-bold tracking-tight">
                {summary.templates}
              </div>
              <div className="mt-2 text-sm text-slate-400">
                Reusable starting points.
              </div>
            </div>
          </section>

          <section className="rounded-[32px] border border-white/10 bg-white/[0.05] p-6 shadow-2xl shadow-black/20 backdrop-blur">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="text-[11px] uppercase tracking-[0.22em] text-violet-300">
                  Workout Vault
                </div>
                <h2 className="mt-2 text-2xl font-bold tracking-tight">
                  Browse your saved sessions
                </h2>
              </div>

              <div className="flex flex-wrap gap-2">
                {categories.map((category, index) => (
                  <button
                    key={category}
                    className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                      index === 0
                        ? "bg-sky-500 text-slate-950"
                        : "border border-white/10 bg-white/5 text-slate-200 hover:bg-white/10"
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-5 rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3 text-sm text-slate-400">
              Search, duplicate, assign-to-client, and sort-by-most-used can
              plug in here next.
            </div>

            <div className="mt-5 space-y-3">
              {savedWorkouts.map((workout) => (
                <div
                  key={workout.id}
                  className="rounded-[26px] border border-white/10 bg-slate-950/55 p-5 transition hover:border-sky-400/30 hover:bg-slate-950/70"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-3">
                        <h3 className="text-xl font-semibold text-white">
                          {workout.title}
                        </h3>
                        <span
                          className={`rounded-full border px-3 py-1 text-xs font-semibold ${typeStyles[workout.type]}`}
                        >
                          {workout.type}
                        </span>
                        {workout.favorite ? (
                          <span className="rounded-full border border-amber-400/20 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-300">
                            Favorite
                          </span>
                        ) : null}
                      </div>
                      <div className="mt-2 text-sm text-slate-400">
                        Updated {workout.updated}
                      </div>
                      <div className="mt-3 text-sm text-slate-300">
                        {workout.note}
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-3 lg:min-w-[390px]">
                      <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
                        <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                          Duration
                        </div>
                        <div className="mt-1 text-sm font-semibold text-white">
                          {workout.duration}
                        </div>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
                        <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                          Exercises
                        </div>
                        <div className="mt-1 text-sm font-semibold text-white">
                          {workout.exercises}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-slate-200 hover:bg-white/10">
                          Edit
                        </button>
                        <button className="w-full rounded-2xl bg-sky-500 px-4 py-3 text-sm font-semibold text-slate-950 hover:bg-sky-400">
                          Start
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
