import Link from "next/link";
import {
  ActionGrid,
  DataTypeBadges,
  ImportCard,
  ImportHero,
  PipelinePreview,
  StatsBreadcrumbs,
  StatsShell,
  UploadZone,
  WearableGrid,
  quickAddCards,
  recentImports,
} from "../_components/StatsImportComponents";

export default function AddStatsPage() {
  return (
    <StatsShell>
      <StatsBreadcrumbs items={["Stats", "Add"]} />
      <ImportHero />

      <ImportCard>
        <p className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan-200">
          Quick Add Cards
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {quickAddCards.map((card) => (
            <Link
              href={card.href}
              key={card.title}
              className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4 transition hover:-translate-y-0.5 hover:border-cyan-300/35 hover:bg-cyan-300/10"
            >
              <p className="text-base font-black text-white">{card.title}</p>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                {card.helper}
              </p>
            </Link>
          ))}
        </div>
      </ImportCard>

      <section className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <ImportCard>
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan-200">
            Primary Actions
          </p>
          <div className="mt-4">
            <ActionGrid />
          </div>
        </ImportCard>

        <ImportCard>
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-amber-100">
            Supported Data Types
          </p>
          <div className="mt-4">
            <DataTypeBadges />
          </div>
        </ImportCard>
      </section>

      <ImportCard>
        <p className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan-200">
          Upload Zone
        </p>
        <div className="mt-4">
          <UploadZone />
        </div>
      </ImportCard>

      <ImportCard className="border-amber-300/18 bg-amber-300/10">
        <p className="text-[10px] font-black uppercase tracking-[0.24em] text-amber-100">
          AI Conversion Pipeline Preview
        </p>
        <p className="mt-2 text-sm leading-6 text-slate-300">
          AI imports are estimates. Review before saving. Nothing is auto-saved
          from uploads or connected apps.
        </p>
        <div className="mt-5">
          <PipelinePreview />
        </div>
      </ImportCard>

      <ImportCard>
        <p className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan-200">
          Connected Apps / Wearables
        </p>
        <div className="mt-4">
          <WearableGrid />
        </div>
      </ImportCard>

      <ImportCard>
        <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-500">
          Recent Imports
        </p>
        <div className="mt-4 overflow-hidden rounded-2xl border border-white/10">
          {recentImports.map((item) => (
            <div
              key={`${item.source}-${item.type}`}
              className="grid gap-2 border-b border-white/10 bg-white/[0.03] p-4 text-sm last:border-b-0 md:grid-cols-[1fr_0.7fr_0.7fr_0.7fr_auto] md:items-center"
            >
              <span className="font-black text-white">{item.source}</span>
              <span className="text-slate-400">{item.type}</span>
              <span className="text-slate-400">{item.date}</span>
              <span className="text-amber-100">{item.status}</span>
              <Link
                href="/stats/import-review"
                className="rounded-xl border border-cyan-300/20 bg-cyan-300/10 px-3 py-2 text-center text-xs font-black uppercase tracking-[0.12em] text-cyan-100"
              >
                Review
              </Link>
            </div>
          ))}
        </div>
      </ImportCard>
    </StatsShell>
  );
}
