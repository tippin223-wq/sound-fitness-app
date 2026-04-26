export default function MealPrepPage() {
  const summary = {
    mealsPlanned: 12,
    proteinReady: "148g/day",
    prepTime: "95 min",
    nextPrep: "Sunday • 1:00 PM",
  };

  const prepBlocks = [
    {
      title: "Protein Base",
      items: ["Chicken thighs", "93/7 ground turkey", "Greek yogurt cups"],
      note: "Enough for 4–5 days of easy protein coverage.",
    },
    {
      title: "Carb Base",
      items: ["Rice", "Roasted potatoes", "Overnight oats jars"],
      note: "Mix fast carbs and easy reheat staples.",
    },
    {
      title: "Produce + Extras",
      items: [
        "Frozen vegetables",
        "Spinach",
        "Berries",
        "Salsa",
        "Shredded cheese",
      ],
      note: "Keep this simple so meals stay fast and repeatable.",
    },
  ];

  const meals = [
    {
      name: "Chicken Rice Bowl",
      type: "Lunch",
      protein: "42g",
      calories: "520",
      servings: 4,
      ingredients: "Chicken thighs, rice, frozen vegetables, salsa",
    },
    {
      name: "Turkey Potato Skillet",
      type: "Dinner",
      protein: "38g",
      calories: "560",
      servings: 4,
      ingredients: "Ground turkey, potatoes, peppers, onion, cheese",
    },
    {
      name: "Greek Yogurt Power Bowl",
      type: "Breakfast",
      protein: "30g",
      calories: "410",
      servings: 5,
      ingredients: "Greek yogurt, berries, granola, honey",
    },
    {
      name: "Protein Oats Jar",
      type: "Breakfast / Snack",
      protein: "27g",
      calories: "390",
      servings: 4,
      ingredients: "Oats, protein powder, milk, peanut butter, banana",
    },
  ];

  const grocery = [
    {
      category: "Proteins",
      items: ["4 lb chicken thighs", "3 lb ground turkey", "10 Greek yogurts"],
    },
    {
      category: "Carbs",
      items: ["Rice", "Potatoes", "Old fashioned oats", "Granola"],
    },
    {
      category: "Produce",
      items: ["Frozen broccoli", "Bell peppers", "Onion", "Bananas", "Berries"],
    },
    {
      category: "Extras",
      items: ["Salsa", "Shredded cheese", "Olive oil", "Seasonings"],
    },
  ];

  const workflow = [
    "Start rice and potatoes first",
    "Cook all proteins while carbs are running",
    "Portion lunches first, then dinners",
    "Finish with breakfast jars and snack prep",
  ];

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.12),_transparent_28%),linear-gradient(180deg,#020617_0%,#0f172a_100%)] text-white">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <div className="space-y-6">
          <section className="rounded-[32px] border border-white/10 bg-white/[0.05] p-6 shadow-2xl shadow-black/20 backdrop-blur lg:p-8">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <div className="text-[11px] uppercase tracking-[0.24em] text-sky-300">
                  Meal Prep System
                </div>
                <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">
                  Prep once, eat with purpose
                </h1>
                <p className="mt-3 max-w-2xl text-base text-slate-300">
                  Build a week of high-protein meals fast, keep shopping simple,
                  and make nutrition easier to follow than to avoid.
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <button className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-medium text-slate-200 hover:bg-white/10">
                  Generate Grocery List
                </button>
                <button className="rounded-2xl bg-sky-500 px-5 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-sky-500/20 hover:bg-sky-400">
                  Start Prep Plan
                </button>
              </div>
            </div>
          </section>

          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-[28px] border border-white/10 bg-white/[0.05] p-5 shadow-xl shadow-black/15 backdrop-blur">
              <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">
                Meals Planned
              </div>
              <div className="mt-3 text-3xl font-bold tracking-tight">
                {summary.mealsPlanned}
              </div>
              <div className="mt-2 text-sm text-slate-400">
                Meals mapped for the week.
              </div>
            </div>
            <div className="rounded-[28px] border border-white/10 bg-white/[0.05] p-5 shadow-xl shadow-black/15 backdrop-blur">
              <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">
                Protein Coverage
              </div>
              <div className="mt-3 text-3xl font-bold tracking-tight">
                {summary.proteinReady}
              </div>
              <div className="mt-2 text-sm text-slate-400">
                Average daily support.
              </div>
            </div>
            <div className="rounded-[28px] border border-white/10 bg-white/[0.05] p-5 shadow-xl shadow-black/15 backdrop-blur">
              <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">
                Prep Time
              </div>
              <div className="mt-3 text-3xl font-bold tracking-tight">
                {summary.prepTime}
              </div>
              <div className="mt-2 text-sm text-slate-400">
                Estimated full session.
              </div>
            </div>
            <div className="rounded-[28px] border border-white/10 bg-white/[0.05] p-5 shadow-xl shadow-black/15 backdrop-blur">
              <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">
                Next Prep
              </div>
              <div className="mt-3 text-xl font-bold tracking-tight">
                Sunday
              </div>
              <div className="mt-2 text-sm text-slate-400">
                {summary.nextPrep}
              </div>
            </div>
          </section>

          <div className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
            <div className="space-y-6">
              <section className="rounded-[32px] border border-white/10 bg-white/[0.05] p-6 shadow-2xl shadow-black/20 backdrop-blur">
                <div className="text-[11px] uppercase tracking-[0.22em] text-emerald-300">
                  Prep Foundations
                </div>
                <h2 className="mt-2 text-2xl font-bold tracking-tight">
                  Build from simple blocks
                </h2>

                <div className="mt-5 grid gap-4 md:grid-cols-3">
                  {prepBlocks.map((block) => (
                    <div
                      key={block.title}
                      className="rounded-[26px] border border-white/10 bg-slate-950/55 p-5"
                    >
                      <div className="text-lg font-semibold text-white">
                        {block.title}
                      </div>
                      <div className="mt-4 space-y-2 text-sm text-slate-300">
                        {block.items.map((item) => (
                          <div key={item}>• {item}</div>
                        ))}
                      </div>
                      <div className="mt-4 text-sm text-slate-400">
                        {block.note}
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="rounded-[32px] border border-white/10 bg-white/[0.05] p-6 shadow-2xl shadow-black/20 backdrop-blur">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[11px] uppercase tracking-[0.22em] text-violet-300">
                      Prepared Meals
                    </div>
                    <h2 className="mt-2 text-2xl font-bold tracking-tight">
                      What’s on deck this week
                    </h2>
                  </div>
                  <button className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-white/10">
                    Add meal
                  </button>
                </div>

                <div className="mt-5 space-y-3">
                  {meals.map((meal) => (
                    <div
                      key={meal.name}
                      className="rounded-[26px] border border-white/10 bg-slate-950/55 p-5"
                    >
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-3">
                            <h3 className="text-xl font-semibold text-white">
                              {meal.name}
                            </h3>
                            <span className="rounded-full border border-sky-400/20 bg-sky-500/10 px-3 py-1 text-xs font-semibold text-sky-300">
                              {meal.type}
                            </span>
                          </div>
                          <div className="mt-3 text-sm text-slate-300">
                            {meal.ingredients}
                          </div>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-3 lg:min-w-[320px]">
                          <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
                            <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                              Protein
                            </div>
                            <div className="mt-1 text-sm font-semibold text-white">
                              {meal.protein}
                            </div>
                          </div>
                          <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
                            <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                              Calories
                            </div>
                            <div className="mt-1 text-sm font-semibold text-white">
                              {meal.calories}
                            </div>
                          </div>
                          <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
                            <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                              Servings
                            </div>
                            <div className="mt-1 text-sm font-semibold text-white">
                              {meal.servings}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>

            <div className="space-y-6">
              <section className="rounded-[32px] border border-white/10 bg-white/[0.05] p-6 shadow-2xl shadow-black/20 backdrop-blur">
                <div className="text-[11px] uppercase tracking-[0.22em] text-cyan-300">
                  Prep Workflow
                </div>
                <h2 className="mt-2 text-2xl font-bold tracking-tight">
                  Do it in the right order
                </h2>

                <div className="mt-5 space-y-3">
                  {workflow.map((step, index) => (
                    <div
                      key={step}
                      className="flex gap-3 rounded-[24px] border border-white/10 bg-slate-950/55 px-4 py-4"
                    >
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sky-500 text-sm font-bold text-slate-950">
                        {index + 1}
                      </div>
                      <div className="pt-1 text-sm text-slate-200">{step}</div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="rounded-[32px] border border-white/10 bg-white/[0.05] p-6 shadow-2xl shadow-black/20 backdrop-blur">
                <div className="text-[11px] uppercase tracking-[0.22em] text-amber-300">
                  Grocery List
                </div>
                <h2 className="mt-2 text-2xl font-bold tracking-tight">
                  Shop once, move faster all week
                </h2>

                <div className="mt-5 space-y-4">
                  {grocery.map((group) => (
                    <div
                      key={group.category}
                      className="rounded-[24px] border border-white/10 bg-slate-950/55 p-4"
                    >
                      <div className="text-base font-semibold text-white">
                        {group.category}
                      </div>
                      <div className="mt-3 space-y-2 text-sm text-slate-300">
                        {group.items.map((item) => (
                          <div key={item}>• {item}</div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="rounded-[32px] border border-white/10 bg-white/[0.05] p-6 shadow-2xl shadow-black/20 backdrop-blur">
                <div className="text-[11px] uppercase tracking-[0.22em] text-sky-300">
                  Next Action
                </div>
                <h2 className="mt-2 text-2xl font-bold tracking-tight">
                  Keep the week easy
                </h2>

                <div className="mt-5 rounded-[26px] border border-sky-400/20 bg-sky-500/10 p-5">
                  <div className="text-lg font-semibold text-white">
                    Prep proteins first, then lock breakfast jars
                  </div>
                  <div className="mt-2 text-sm text-slate-100">
                    This gives you the highest payoff fast and covers the meals
                    most likely to get skipped when life gets busy.
                  </div>
                </div>

                <div className="mt-5 flex flex-col gap-3">
                  <button className="rounded-[24px] bg-sky-500 px-5 py-4 text-sm font-semibold text-slate-950 shadow-lg shadow-sky-500/20 hover:bg-sky-400">
                    Start Sunday Prep
                  </button>
                  <button className="rounded-[24px] border border-white/10 bg-white/5 px-5 py-4 text-sm font-medium text-slate-200 hover:bg-white/10">
                    Open Nutrition Portal
                  </button>
                </div>
              </section>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
