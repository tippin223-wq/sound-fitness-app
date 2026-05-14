import {
  ImportCard,
  ImportHero,
  StatsBreadcrumbs,
  StatsShell,
  WearableGrid,
} from "../../_components/StatsImportComponents";

export default function ConnectStatsPage() {
  return (
    <StatsShell>
      <StatsBreadcrumbs items={["Stats", "Add", "Connect"]} />
      <ImportHero
        title="Connect Wearables"
        subtitle="Prepare future integrations for health apps, wearables, cardio platforms, and recovery tools."
      />

      <ImportCard className="border-amber-300/18 bg-amber-300/10">
        <p className="text-[10px] font-black uppercase tracking-[0.24em] text-amber-100">
          Placeholder Integrations
        </p>
        <p className="mt-2 text-sm leading-6 text-slate-300">
          These cards are architecture placeholders only. No app connection is
          active until OAuth/API wiring is implemented.
        </p>
      </ImportCard>

      <ImportCard>
        <WearableGrid />
      </ImportCard>
    </StatsShell>
  );
}
