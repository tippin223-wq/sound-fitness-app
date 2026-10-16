import { unitWorkloadLabel, type UnitWorkloadSummary } from "@/lib/planning/unitWorkload";

export default function StatsUnitWorkload({ reports, unit }: { reports: { weekly: UnitWorkloadSummary; lifetime: UnitWorkloadSummary }; unit: "lb" | "kg" }) {
  return <section className="rounded-[28px] border border-cyan-300/20 bg-slate-950/60 p-5" aria-label="Load volume with recorded units">
    <h2 className="text-xl font-bold text-white">Load volume with recorded units</h2>
    <p className="mt-2 text-sm text-slate-300">Load × reps × sets, using only entries with recorded lb/kg loads and complete positive reps and sets. Other entries remain in History and do not become zero loads.</p>
    <div className="mt-4 grid gap-3 sm:grid-cols-2">
      {([{ label: "This week", summary: reports.weekly }, { label: "Lifetime", summary: reports.lifetime }]).map(({ label, summary }) => <article key={label} className="rounded-2xl border border-white/10 p-4">
        <h3 className="text-sm font-semibold text-cyan-200">{label}</h3>
        <p className="mt-2 text-2xl font-bold text-white">{unitWorkloadLabel(summary, unit)}</p>
        <p className="mt-2 text-sm text-slate-300">{summary.knownEntries} of {summary.eligibleEntries} reporting entries contribute.</p>
        <p className="mt-1 text-sm text-amber-200">{summary.overflow ? "Total exceeds the supported numeric range; review the original entries." : summary.unknownEntries > 0 ? `${summary.unknownEntries} entries have unknown units or incomplete load/reps/sets data. This is a partial total.` : summary.complete ? "All reporting entries in this period have complete load data." : "No complete load data in this period."}</p>
      </article>)}
    </div>
  </section>;
}
