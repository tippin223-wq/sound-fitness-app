import Link from "next/link";
import {
  ActionLink,
  ContentCard,
  MetricCard,
  ModuleCard,
  NutritionBreadcrumbs,
  coreModuleLinks,
  journeyStages,
} from "./_components/NutritionPortal";

const utilityStats = [
  { label: "Streak", value: "5 days", helper: "Protein minimum hit" },
  { label: "Calories Remaining", value: "640", helper: "Placeholder target" },
  { label: "Hydration", value: "64 / 96 oz", helper: "Add water today" },
];

const dailyActions = [
  { label: "Log Meal", href: "/nutrition/meals/builder", helper: "Add food quickly." },
  { label: "Add Water", href: "/nutrition/hydration", helper: "Update hydration." },
  { label: "Scan Food", href: "/nutrition/meals/builder", helper: "Scanner placeholder." },
  { label: "AI Meal Suggestion", href: "/nutrition/recommendations", helper: "Get a next meal." },
  { label: "Grocery Builder", href: "/nutrition/grocery", helper: "Plan food for the week." },
];

const analytics = [
  { label: "Calories", value: "1,820", helper: "Logged estimate" },
  { label: "Protein", value: "124 g", helper: "82% of target" },
  { label: "Carbs", value: "188 g", helper: "Training fuel" },
  { label: "Fats", value: "56 g", helper: "Daily balance" },
  { label: "Hydration", value: "67%", helper: "Needs another bottle" },
  { label: "Consistency", value: "78%", helper: "Weekly adherence" },
];

const recommendations = [
  "Increase protein today with a lean dinner or Greek yogurt stack.",
  "Hydration was low yesterday. Start with water before coffee.",
  "Use a carb + protein meal 60-120 minutes before your next hard workout.",
];

export default function NutritionDashboardPage() {
  const nextStage = journeyStages.find((stage) => stage.status === "Next") || journeyStages[0];

  return (
    <div className="space-y-5">
      <NutritionBreadcrumbs items={["Nutrition"]} />

      <section className="grid gap-3 md:grid-cols-3">
        {utilityStats.map((stat) => (
          <MetricCard key={stat.label} {...stat} />
        ))}
      </section>

      <section className="overflow-hidden rounded-[36px] border border-white/10 bg-[radial-gradient(circle_at_18%_0%,rgba(34,211,238,0.22),transparent_36%),radial-gradient(circle_at_88%_8%,rgba(251,191,36,0.15),transparent_32%),linear-gradient(135deg,rgba(15,23,42,0.96),rgba(2,6,23,0.98))] p-6 shadow-[0_35px_130px_rgba(0,0,0,0.62)] lg:p-8">
        <div className="grid gap-6 xl:grid-cols-[1fr_0.48fr] xl:items-end">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.32em] text-cyan-200">
              Nutrition Operating System
            </p>
            <h1 className="mt-4 text-5xl font-black tracking-tight text-white sm:text-6xl">
              Fuel Dashboard
            </h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-slate-300">
              Fuel performance. Recover faster. Connect meals, hydration,
              macros, grocery planning, and nutrition insights into one modular
              command center.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            <Link
              href="/nutrition/meals/builder"
              className="rounded-3xl bg-cyan-300 px-5 py-4 text-sm font-black uppercase tracking-[0.16em] text-slate-950 transition hover:-translate-y-0.5 hover:bg-cyan-200"
            >
              Quick Add Meal
            </Link>
            <Link
              href="/nutrition/journey"
              className="rounded-3xl border border-white/10 bg-white/[0.045] px-5 py-4 text-sm font-black uppercase tracking-[0.16em] text-white transition hover:border-amber-300/35 hover:bg-amber-300/10"
            >
              Continue Journey
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[0.8fr_1.2fr]">
        <ContentCard className="border-cyan-300/18 bg-cyan-300/8">
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan-200">
            Training Journey
          </p>
          <h2 className="mt-3 text-2xl font-black text-white">
            {nextStage.title}
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-300">
            {nextStage.helper}
          </p>
          <div className="mt-5 h-3 overflow-hidden rounded-full bg-slate-950/80">
            <div className="h-full w-[42%] rounded-full bg-gradient-to-r from-cyan-300 to-amber-300" />
          </div>
          <p className="mt-3 text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
            Milestone progress: 42%
          </p>
          <Link
            href="/nutrition/journey"
            className="mt-5 inline-flex rounded-2xl border border-cyan-300/25 bg-cyan-300/10 px-4 py-3 text-xs font-black uppercase tracking-[0.14em] text-cyan-100 transition hover:border-cyan-200/50"
          >
            Continue Journey
          </Link>
        </ContentCard>

        <ContentCard>
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-amber-100">
            Daily Actions
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {dailyActions.map((action) => (
              <ActionLink key={action.href} link={action} />
            ))}
          </div>
        </ContentCard>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        {analytics.map((metric) => (
          <MetricCard key={metric.label} {...metric} />
        ))}
      </section>

      <section className="grid gap-5 xl:grid-cols-[1fr_0.4fr]">
        <ContentCard>
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan-200">
            Core Modules
          </p>
          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {coreModuleLinks.map((link) => (
              <ModuleCard key={link.href} link={link} />
            ))}
          </div>
        </ContentCard>

        <ContentCard className="border-amber-300/18 bg-amber-300/10">
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-amber-100">
            AI Recommendations
          </p>
          <div className="mt-4 grid gap-3">
            {recommendations.map((recommendation) => (
              <div
                className="rounded-2xl border border-white/10 bg-slate-950/52 p-4 text-sm leading-6 text-amber-50/85"
                key={recommendation}
              >
                {recommendation}
              </div>
            ))}
          </div>
          <Link
            href="/nutrition/recommendations"
            className="mt-5 inline-flex rounded-2xl border border-amber-300/25 bg-amber-300/10 px-4 py-3 text-xs font-black uppercase tracking-[0.14em] text-amber-100 transition hover:border-amber-200/50"
          >
            Open Recommendations
          </Link>
        </ContentCard>
      </section>

      <section className="grid gap-3 md:grid-cols-4">
        {[
          { label: "Build Meal", href: "/nutrition/meals/builder", helper: "Create now." },
          { label: "Meal Plan", href: "/nutrition/meal-plan", helper: "Organize week." },
          { label: "Shopping List", href: "/nutrition/shopping-list", helper: "Prepare store run." },
          { label: "Nutrition Library", href: "/nutrition/library", helper: "Search resources." },
        ].map((link) => (
          <ModuleCard key={link.href} link={link} />
        ))}
      </section>
    </div>
  );
}
