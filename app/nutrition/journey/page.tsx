import Link from "next/link";
import {
  ContentCard,
  NutritionBackLink,
  NutritionBreadcrumbs,
  journeyStages,
} from "../_components/NutritionPortal";

export default function NutritionJourneyPage() {
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <NutritionBreadcrumbs items={["Nutrition", "Journey"]} />
        <NutritionBackLink href="/nutrition" />
      </div>

      <section className="overflow-hidden rounded-[34px] border border-white/10 bg-[radial-gradient(circle_at_18%_0%,rgba(34,211,238,0.2),transparent_34%),radial-gradient(circle_at_82%_8%,rgba(251,191,36,0.14),transparent_30%),linear-gradient(135deg,rgba(15,23,42,0.96),rgba(2,6,23,0.98))] p-6 shadow-[0_30px_120px_rgba(0,0,0,0.58)] lg:p-8">
        <p className="text-[11px] font-black uppercase tracking-[0.3em] text-cyan-200">
          Nutrition Training Journey
        </p>
        <h1 className="mt-4 text-4xl font-black tracking-tight text-white sm:text-6xl">
          Build nutrition skill in phases.
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-7 text-slate-300">
          Move from awareness to consistency, then into performance fueling,
          recovery nutrition, and advanced strategy. This page is the learning
          spine for the full portal.
        </p>
        <Link
          href="/nutrition/meals/templates"
          className="mt-6 inline-flex rounded-2xl bg-cyan-300 px-5 py-4 text-xs font-black uppercase tracking-[0.16em] text-slate-950 transition hover:bg-cyan-200"
        >
          Continue Next Lesson
        </Link>
      </section>

      <section className="grid gap-4 lg:grid-cols-7">
        {journeyStages.map((stage, index) => {
          const unlocked = stage.status !== "Locked";
          return (
            <ContentCard
              key={stage.title}
              className={`min-h-[230px] ${
                unlocked
                  ? "border-cyan-300/18 bg-cyan-300/8"
                  : "opacity-70"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="rounded-full border border-white/10 bg-slate-950/70 px-3 py-1 text-xs font-black text-white">
                  {index + 1}
                </span>
                <span
                  className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] ${
                    stage.status === "Next"
                      ? "border-amber-300/25 bg-amber-300/10 text-amber-100"
                      : unlocked
                        ? "border-cyan-300/25 bg-cyan-300/10 text-cyan-100"
                        : "border-white/10 bg-white/[0.035] text-slate-500"
                  }`}
                >
                  {stage.status}
                </span>
              </div>
              <h2 className="mt-5 text-lg font-black text-white">{stage.title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                {stage.helper}
              </p>
              <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-950/80">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-cyan-300 to-amber-300"
                  style={{ width: unlocked ? (stage.status === "Next" ? "42%" : "100%") : "8%" }}
                />
              </div>
            </ContentCard>
          );
        })}
      </section>

      <section className="grid gap-5 lg:grid-cols-3">
        <ContentCard>
          <p className="text-xl font-black text-white">Milestone System</p>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            Milestones can later unlock lessons, meal templates, and nutrition
            streak rewards.
          </p>
        </ContentCard>
        <ContentCard>
          <p className="text-xl font-black text-white">Phase Progression</p>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            Future phases can align nutrition strategy with plan blocks,
            deloads, and performance weeks.
          </p>
        </ContentCard>
        <ContentCard>
          <p className="text-xl font-black text-white">Locked Sections</p>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            Locked cards make the portal scalable without overwhelming new
            users on day one.
          </p>
        </ContentCard>
      </section>
    </div>
  );
}
