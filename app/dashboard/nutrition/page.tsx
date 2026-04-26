export default function NutritionPortalPage() {
  const summary = {
    protein: "132g / 160g",
    water: "72 oz / 100 oz",
    mealsLogged: 3,
    focus: "Protein + consistency",
  };

  const todayMeals = [
    {
      meal: "Breakfast",
      item: "Greek yogurt bowl + berries + granola",
      protein: "28g",
      status: "Logged",
    },
    {
      meal: "Lunch",
      item: "Chicken rice bowl with veggies",
      protein: "42g",
      status: "Logged",
    },
    {
      meal: "Snack",
      item: "Protein shake + banana",
      protein: "30g",
      status: "Logged",
    },
    {
      meal: "Dinner",
      item: "Still open",
      protein: "—",
      status: "Planned",
    },
  ];

  const habits = [
    { name: "Protein Target", status: "On Track" },
    { name: "Hydration", status: "Needs Attention" },
    { name: "Meal Timing", status: "Solid" },
    { name: "Prep for Tomorrow", status: "Planned" },
  ];

  const suggestions = [
    {
      title: "Easy 30g Dinner",
      detail: "Lean ground turkey, rice, and frozen vegetables.",
      badge: "Fast",
    },
    {
      title: "High-Protein Snack",
      detail: "Cottage cheese + fruit + a handful of cereal.",
      badge: "Simple",
    },
    {
      title: "Hydration Push",
      detail: "Finish 28 oz by evening to hit your target.",
      badge: "Recovery",
    },
  ];

  const habitStyles = {
    "On Track": "border-emerald-400/20 bg-emerald-500/10 text-emerald-300",
    "Needs Attention": "border-amber-400/20 bg-amber-500/10 text-amber-300",
    Solid: "border-sky-400/20 bg-sky-500/10 text-sky-300",
    Planned: "border-violet-400/20 bg-violet-500/10 text-violet-300",
  };

  const mealStatusStyles = {
    Logged: "border-emerald-400/20 bg-emerald-500/10 text-emerald-300",
    Planned: "border-sky-400/20 bg-sky-500/10 text-sky-300",
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
                    Nutrition Portal
                  </div>
                  <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">
                    Eat to support the plan
                  </h1>
                  <p className="mt-3 max-w-2xl text-base text-slate-300">
                    Keep nutrition simple, track the habits that matter most,
                    and make sure recovery and performance are backed by what
                    you eat.
                  </p>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <button className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-medium text-slate-200 hover:bg-white/10">
                    Log Meal
                  </button>
                  <button className="rounded-2xl bg-sky-500 px-5 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-sky-500/20 hover:bg-sky-400">
                    View Meal Plan
                  </button>
                </div>
              </div>
            </section>

            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-[28px] border border-white/10 bg-white/[0.05] p-5 shadow-xl shadow-black/15 backdrop-blur">
                <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">
                  Protein
                </div>
                <div className="mt-3 text-3xl font-bold tracking-tight">
                  {summary.protein}
                </div>
                <div className="mt-2 text-sm text-slate-400">
                  Main lever for recovery today.
                </div>
              </div>
              <div className="rounded-[28px] border border-white/10 bg-white/[0.05] p-5 shadow-xl shadow-black/15 backdrop-blur">
                <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">
                  Hydration
                </div>
                <div className="mt-3 text-3xl font-bold tracking-tight">
                  {summary.water}
                </div>
                <div className="mt-2 text-sm text-slate-400">
                  Still room to finish strong.
                </div>
              </div>
              <div className="rounded-[28px] border border-white/10 bg-white/[0.05] p-5 shadow-xl shadow-black/15 backdrop-blur">
                <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">
                  Meals Logged
                </div>
                <div className="mt-3 text-3xl font-bold tracking-tight">
                  {summary.mealsLogged}
                </div>
                <div className="mt-2 text-sm text-slate-400">
                  Today’s progress so far.
                </div>
              </div>
              <div className="rounded-[28px] border border-white/10 bg-white/[0.05] p-5 shadow-xl shadow-black/15 backdrop-blur">
                <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">
                  Nutrition Focus
                </div>
                <div className="mt-3 text-xl font-bold tracking-tight">
                  Consistency
                </div>
                <div className="mt-2 text-sm text-slate-400">
                  {summary.focus}
                </div>
              </div>
            </section>

            <section className="rounded-[32px] border border-white/10 bg-white/[0.05] p-6 shadow-2xl shadow-black/20 backdrop-blur">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-[11px] uppercase tracking-[0.22em] text-emerald-300">
                    Today’s Meals
                  </div>
                  <h2 className="mt-2 text-2xl font-bold tracking-tight">
                    Meal rhythm
                  </h2>
                </div>
                <button className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-white/10">
                  View all meals
                </button>
              </div>

              <div className="mt-5 space-y-3">
                {todayMeals.map((item) => (
                  <div
                    key={item.meal}
                    className="rounded-[24px] border border-white/10 bg-slate-950/55 p-4"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <div className="text-sm uppercase tracking-[0.18em] text-slate-500">
                          {item.meal}
                        </div>
                        <div className="mt-1 text-lg font-semibold text-white">
                          {item.item}
                        </div>
                        <div className="mt-2 text-sm text-slate-400">
                          Protein: {item.protein}
                        </div>
                      </div>
                      <div
                        className={`rounded-full border px-3 py-1 text-xs font-semibold ${mealStatusStyles[item.status]}`}
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
                Helpful Suggestions
              </div>
              <h2 className="mt-2 text-2xl font-bold tracking-tight">
                Best next nutrition move
              </h2>

              <div className="mt-5 grid gap-4 md:grid-cols-3">
                {suggestions.map((item) => (
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
                Daily Targets
              </div>
              <h2 className="mt-2 text-2xl font-bold tracking-tight">
                What matters today
              </h2>

              <div className="mt-5 space-y-3">
                {habits.map((habit) => (
                  <div
                    key={habit.name}
                    className="flex items-center justify-between gap-3 rounded-[24px] border border-white/10 bg-slate-950/55 px-4 py-4"
                  >
                    <div>
                      <div className="text-base font-semibold text-white">
                        {habit.name}
                      </div>
                    </div>
                    <div
                      className={`rounded-full border px-3 py-1 text-xs font-semibold ${habitStyles[habit.status]}`}
                    >
                      {habit.status}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-[32px] border border-white/10 bg-white/[0.05] p-6 shadow-2xl shadow-black/20 backdrop-blur">
              <div className="text-[11px] uppercase tracking-[0.22em] text-amber-300">
                Coach View
              </div>
              <h2 className="mt-2 text-2xl font-bold tracking-tight">
                Nutrition guidance
              </h2>

              <div className="mt-5 rounded-[26px] border border-sky-400/20 bg-sky-500/10 p-5">
                <div className="text-lg font-semibold text-white">
                  Protein is the highest priority tonight
                </div>
                <div className="mt-2 text-sm text-slate-100">
                  You’re close to target. A solid protein-based dinner gets you
                  most of the way there while supporting tomorrow’s training.
                </div>
              </div>

              <div className="mt-5 flex flex-col gap-3">
                <button className="rounded-[24px] bg-sky-500 px-5 py-4 text-sm font-semibold text-slate-950 shadow-lg shadow-sky-500/20 hover:bg-sky-400">
                  Log Dinner
                </button>
                <button className="rounded-[24px] border border-white/10 bg-white/5 px-5 py-4 text-sm font-medium text-slate-200 hover:bg-white/10">
                  Open Meal Prep Guide
                </button>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
