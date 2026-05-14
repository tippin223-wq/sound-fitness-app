import {
  ImportCard,
  ImportHero,
  StatsBreadcrumbs,
  StatsShell,
} from "../../_components/StatsImportComponents";

const sections = [
  {
    title: "Workout",
    fields: ["Exercise", "Sets", "Reps", "Weight", "RPE", "Duration", "Session notes"],
  },
  {
    title: "Nutrition",
    fields: ["Calories", "Protein", "Carbs", "Fats", "Water", "Meal notes"],
  },
  {
    title: "Body",
    fields: ["Body weight", "Waist", "Progress photo note", "Pain/soreness"],
  },
  {
    title: "Recovery",
    fields: ["Sleep", "Soreness", "Mobility", "Readiness", "HRV", "Resting HR"],
  },
  {
    title: "Performance",
    fields: ["Steps", "Distance", "Pace", "Heart-rate zones", "Calories burned"],
  },
];

export default function ManualStatsEntryPage() {
  return (
    <StatsShell>
      <StatsBreadcrumbs items={["Stats", "Add", "Manual"]} />
      <ImportHero
        title="Manual Entry"
        subtitle="Type workout, nutrition, body, recovery, and performance stats into safe placeholder forms."
      />

      <section className="grid gap-5 xl:grid-cols-2">
        {sections.map((section) => (
          <ImportCard key={section.title}>
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan-200">
              {section.title}
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {section.fields.map((field) => (
                <label key={field} className="block">
                  <span className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">
                    {field}
                  </span>
                  <input
                    type="text"
                    placeholder="Placeholder"
                    className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-300/40"
                  />
                </label>
              ))}
            </div>
            {/* TODO: Wire save into existing local stats/profile stores after data contract is confirmed. */}
            <button
              type="button"
              disabled
              className="mt-5 cursor-not-allowed rounded-2xl border border-white/10 bg-white/[0.035] px-5 py-3 text-xs font-black uppercase tracking-[0.14em] text-slate-500"
            >
              Save Draft Coming Soon
            </button>
          </ImportCard>
        ))}
      </section>
    </StatsShell>
  );
}
