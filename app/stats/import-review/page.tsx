import Link from "next/link";
import {
  ImportCard,
  ImportHero,
  StatsBreadcrumbs,
  StatsShell,
} from "../_components/StatsImportComponents";

const previewRows = [
  {
    category: "Workout",
    field: "Bench Press",
    value: "3 sets x 8 reps x 135 lb",
    confidence: "82%",
    warning: "Confirm weight units",
  },
  {
    category: "Nutrition",
    field: "Lunch estimate",
    value: "640 kcal / 42g protein",
    confidence: "64%",
    warning: "Photo estimate",
  },
  {
    category: "Recovery",
    field: "Sleep",
    value: "7h 12m",
    confidence: "91%",
    warning: "Source not connected",
  },
];

export default function ImportReviewPage() {
  return (
    <StatsShell>
      <StatsBreadcrumbs items={["Stats", "Import Review"]} />
      <ImportHero
        title="AI Import Review"
        subtitle="Imported data lands here first so you can edit, confirm, or cancel before saving."
      />

      <ImportCard className="border-amber-300/18 bg-amber-300/10">
        <p className="text-[10px] font-black uppercase tracking-[0.24em] text-amber-100">
          Review Before Saving
        </p>
        <p className="mt-2 text-sm leading-6 text-slate-300">
          AI imports are estimates. Review before saving. Progress photos are
          treated as timeline entries, not body-composition claims unless you
          confirm the data yourself.
        </p>
      </ImportCard>

      <ImportCard>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan-200">
              Extracted Data Preview
            </p>
            <h2 className="mt-2 text-2xl font-black text-white">
              Source: placeholder upload
            </h2>
          </div>
          <span className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1.5 text-xs font-black uppercase tracking-[0.12em] text-cyan-100">
            User confirmation required
          </span>
        </div>

        <div className="mt-5 overflow-hidden rounded-2xl border border-white/10">
          {previewRows.map((row) => (
            <div
              key={`${row.category}-${row.field}`}
              className="grid gap-3 border-b border-white/10 bg-white/[0.03] p-4 last:border-b-0 lg:grid-cols-[0.7fr_0.8fr_1.2fr_0.5fr_1fr]"
            >
              <span className="text-sm font-black text-white">
                {row.category}
              </span>
              <input
                defaultValue={row.field}
                className="rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-white outline-none"
              />
              <input
                defaultValue={row.value}
                className="rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-white outline-none"
              />
              <span className="rounded-xl border border-cyan-300/20 bg-cyan-300/10 px-3 py-2 text-center text-sm font-black text-cyan-100">
                {row.confidence}
              </span>
              <span className="rounded-xl border border-amber-300/20 bg-amber-300/10 px-3 py-2 text-sm text-amber-100">
                {row.warning}
              </span>
            </div>
          ))}
        </div>

        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          {/* TODO: Confirm Import should write only after reviewed rows map to stable app data contracts. */}
          <button
            type="button"
            disabled
            className="cursor-not-allowed rounded-2xl bg-cyan-300/40 px-5 py-3 text-xs font-black uppercase tracking-[0.14em] text-slate-950"
          >
            Confirm Import Coming Soon
          </button>
          <Link
            href="/stats/add"
            className="rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-3 text-center text-xs font-black uppercase tracking-[0.14em] text-white transition hover:border-cyan-300/35"
          >
            Cancel
          </Link>
        </div>
      </ImportCard>
    </StatsShell>
  );
}
