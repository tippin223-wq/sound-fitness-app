"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import dynamic from "next/dynamic";
import type { DashboardTornadoGemTone } from "@/components/dashboard/DashboardTornadoEmeralds3D";
const Bolt = dynamic(() => import("@/components/dashboard/DashboardLightningBolt3D"), { ssr: false });
const Coin = dynamic(() => import("@/components/dashboard/DashboardTreasureChest3D").then(module => module.DashboardSpinningSoundCoin3D), { ssr: false });
const Gems = dynamic(() => import("@/components/dashboard/DashboardTornadoEmeralds3D").then(module => module.DashboardGemStage3D), { ssr: false });
import { dashboardRewardEvidenceSnapshot, serverDashboardRewardEvidence, type DashboardRewardEvidence } from "@/lib/planning/dashboardRewardEvidence";
import { subscribePlanning } from "@/lib/planning/store";

export default function ProfileRewardBalance({ active }: { active: boolean }) {
  const raw = useSyncExternalStore(subscribePlanning, dashboardRewardEvidenceSnapshot, serverDashboardRewardEvidence);
  const balances = JSON.parse(raw) as DashboardRewardEvidence;
  const [index, setIndex] = useState(0);
  useEffect(() => {
    if (!active) return;
    setIndex(0);
    const timer = window.setInterval(() => setIndex(value => (value + 1) % 6), 6000);
    return () => window.clearInterval(timer);
  }, [active]);
  const items = [
    { label: "Bolts", value: balances.pointsLabel, color: "#38bdf8" },
    { label: "Coins", value: balances.tokensLabel, color: "#fbbf24" },
    { label: "Sapphires", value: balances.sapphireLabel, color: "#38bdf8" },
    { label: "Topaz", value: balances.topazLabel, color: "#fbbf24" },
    { label: "Rubies", value: balances.rubyLabel, color: "#fb7185" },
    { label: "Emeralds", value: balances.emeraldsLabel, color: "#34d399" },
  ];
  const item = items[active ? index : 0];
  const amount = /^\d[\d,]*$/.test(item.value) ? item.value : "0";
  return <span className="mt-1 flex items-center gap-2" aria-label={`${item.label}: ${amount}`}>
    <span aria-hidden="true" className="relative block h-10 w-12 shrink-0">
      {item.label === "Coins" ? <Coin className="h-full w-full" paused={!active} /> : item.label === "Bolts" ? <Bolt className="h-full w-full" paused={!active} /> : <Gems framingScale={3} className="h-full w-full" paused={!active} tones={[({ Sapphires: "blue", Topaz: "yellow", Rubies: "red", Emeralds: "green" } as Record<string, DashboardTornadoGemTone>)[item.label]]} />}
    </span>
    <span className="min-w-0"><span className="block text-xs font-black text-white">{amount}</span><span className="block text-[8px] font-bold" style={{ color: item.color }}>{item.label}</span></span>
  </span>;
}
