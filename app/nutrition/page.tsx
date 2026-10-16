"use client";

import Link from "next/link";
import { useNutritionSummary } from "./_components/useNutritionSummary";
import { formatNutrition, nutrientLabels, NutritionRecoveryNotice } from "./_components/NutritionSummary";
import { nutrientFields } from "@/lib/planning/meals";
import {
  ActionLink,
  ContentCard,
  MetricCard,
  ModuleCard,
  NutritionBreadcrumbs,
  coreModuleLinks,
  journeyStages,
} from "./_components/NutritionPortal";

const dailyActions = [
  { label: "Log Meal", href: "/nutrition/meals/builder", helper: "Add food quickly." },
  { label: "Add Water", href: "/nutrition/hydration", helper: "Update hydration." },
  { label: "Meal History", href: "/nutrition/meals/history", helper: "Review saved meals." },
  { label: "Nutrition History", href: "/nutrition/progress", helper: "Review reported intake." },
  { label: "Grocery Preview", href: "/nutrition/grocery", helper: "Explore the planning preview." },
];

const soundKitchenUrl =
  process.env.NEXT_PUBLIC_SOUND_KITCHEN_URL ??
  (process.env.NODE_ENV === "development" ? "http://localhost:3201" : "/nutrition");

export default function NutritionDashboardPage() {
  const { today, day, week, targets, issues } = useNutritionSummary();
  if (today && issues.length) return <NutritionRecoveryNotice issues={issues} />;
  if (!today || !day) return <p role="status">Loading your reported nutrition…</p>;
  const nextStage = journeyStages.find((stage) => stage.status === "Next") || journeyStages[0];
  const utilityStats = [
    { label: "Meals Today", value: String(day.mealCount), helper: `Saved meals · ${today}` },
    { label: "Protein Goal", value: targets.proteinG === null ? "Not set" : `${targets.proteinG} g`, helper: "Your current saved daily goal" },
    { label: "Water Goal", value: targets.waterOz === null ? "Not set" : `${targets.waterOz} US fl oz`, helper: "Your current saved daily goal" },
  ];
  const analytics = [
    ...nutrientFields.map(key => ({ label: nutrientLabels[key], value: formatNutrition(day.nutrients[key].value, key === "calories" ? "kcal" : "g"), helper: `${day.nutrients[key].reported}/${day.mealCount} meals report this value` })),
    { label: "Water Today", value: formatNutrition(day.waterMl, "ml"), helper: `${day.waterCount} reported entries` },
    { label: "Days With Records", value: `${week.filter(row => row.mealCount || row.waterCount).length}/7`, helper: "Recorded days, without inferring adherence" },
  ];
  const recommendations = [
    day.mealCount ? "Review saved meals and correct any quantities or missing nutrition values." : "Log your first meal to start today's reported intake.",
    day.waterCount ? "Review water entries if you need to correct an amount." : "Add water you have already drunk to start today's water log.",
    targets.proteinG === null || targets.waterOz === null ? "Set your own protein and water targets on Goals when ready." : "Your current saved targets are available on Goals.",
  ];

  return (
    <div className="space-y-5">
      <NutritionBreadcrumbs items={["Nutrition"]} />
      <p className="text-sm text-slate-300">Today: {today}. Totals include saved entries only; unknown values stay unreported and partial logging may not represent full daily intake.</p>

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
            <a
              href={soundKitchenUrl}
              className="rounded-3xl border border-emerald-300/20 bg-emerald-300/10 px-5 py-4 text-sm font-black uppercase tracking-[0.16em] text-emerald-100 transition hover:-translate-y-0.5 hover:border-emerald-200/45 hover:bg-emerald-300/15"
            >
              Open Sound Kitchen Menu
            </a>
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

      <section className="overflow-hidden rounded-[34px] border border-cyan-300/20 bg-[radial-gradient(circle_at_12%_0%,rgba(34,211,238,0.2),transparent_34%),radial-gradient(circle_at_88%_18%,rgba(251,191,36,0.13),transparent_30%),linear-gradient(135deg,rgba(8,47,73,0.34),rgba(2,6,23,0.9))] p-5 shadow-[0_28px_90px_rgba(34,211,238,0.08)] backdrop-blur-xl lg:p-6">
        <div className="grid gap-5 lg:grid-cols-[1fr_0.38fr] lg:items-center">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.26em] text-cyan-200">
              Step-by-step nutrition path
            </p>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-white">
              Fuel Journey
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">
              Your step-by-step nutrition path for building consistency,
              fueling workouts, and improving recovery.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <Link
              href="/nutrition/journey"
              className="rounded-3xl bg-cyan-300 px-5 py-4 text-center text-sm font-black uppercase tracking-[0.16em] text-slate-950 transition hover:-translate-y-0.5 hover:bg-cyan-200"
            >
              Continue Fuel Journey
            </Link>
            <div className="rounded-3xl border border-white/10 bg-slate-950/55 px-5 py-4">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                Preview Stage
              </p>
              <p className="mt-1 text-sm font-black text-white">
                {nextStage.title}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[0.8fr_1.2fr]">
        <ContentCard className="border-cyan-300/18 bg-cyan-300/8">
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan-200">
            Journey Preview
          </p>
          <h2 className="mt-3 text-2xl font-black text-white">
            {nextStage.title}
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-300">
            {nextStage.helper}
          </p>
          <p className="mt-3 text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
            Explore the journey preview. Completion is not yet measured from your records.
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
            Next Actions
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
            href="/dashboard/goals"
            className="mt-5 inline-flex rounded-2xl border border-amber-300/25 bg-amber-300/10 px-4 py-3 text-xs font-black uppercase tracking-[0.14em] text-amber-100 transition hover:border-amber-200/50"
          >
            Review Goals
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
