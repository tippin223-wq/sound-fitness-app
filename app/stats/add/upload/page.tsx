import Link from "next/link";
import {
  ImportCard,
  ImportHero,
  PipelinePreview,
  StatsBreadcrumbs,
  StatsShell,
  UploadZone,
} from "../../_components/StatsImportComponents";

export default function UploadStatsPage() {
  return (
    <StatsShell>
      <StatsBreadcrumbs items={["Stats", "Add", "Upload"]} />
      <ImportHero
        title="Upload Stats"
        subtitle="Stage photos, screenshots, spreadsheets, PDFs, and exports before AI review."
      />

      <ImportCard>
        <UploadZone />
      </ImportCard>

      <section className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <ImportCard>
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan-200">
            Detected Data Categories
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {["Workout", "Nutrition", "Body", "Recovery", "Performance"].map(
              (category) => (
                <div
                  key={category}
                  className="rounded-2xl border border-white/10 bg-white/[0.04] p-4"
                >
                  <p className="text-sm font-black text-white">{category}</p>
                  <p className="mt-2 text-xs leading-5 text-slate-500">
                    Detection appears here after upload parsing is wired.
                  </p>
                </div>
              ),
            )}
          </div>
        </ImportCard>

        <ImportCard className="border-amber-300/18 bg-amber-300/10">
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-amber-100">
            Review Required
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-300">
            AI imports are estimates. Review before saving.
          </p>
          <div className="mt-5">
            <PipelinePreview />
          </div>
          {/* TODO: Enable this once upload storage and AI extraction endpoints exist. */}
          <Link
            href="/stats/import-review"
            className="mt-5 inline-flex rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-3 text-xs font-black uppercase tracking-[0.14em] text-slate-300 transition hover:border-cyan-300/35 hover:text-white"
          >
            Send to AI Review
          </Link>
        </ImportCard>
      </section>
    </StatsShell>
  );
}
