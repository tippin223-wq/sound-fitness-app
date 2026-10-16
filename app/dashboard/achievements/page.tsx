"use client";

import Link from "next/link";
import { useMemo, useSyncExternalStore } from "react";
import SoundAchievementBadgeRow, { type AchievementBadgeItem } from "@/components/dashboard/SoundAchievementBadgeRow";
import { achievementEvidenceSnapshot, serverAchievementEvidence } from "@/lib/planning/achievementEvidence";
import { subscribeDashboardPlanEvidence } from "@/lib/planning/dashboardPlanEvidence";
import { ROUTES } from "@/lib/routes";

export default function AchievementsPage() {
  const snapshot = useSyncExternalStore(subscribeDashboardPlanEvidence, achievementEvidenceSnapshot, serverAchievementEvidence);
  const milestones = useMemo(() => JSON.parse(snapshot) as AchievementBadgeItem[], [snapshot]);
  const recorded = milestones.filter(item => item.status === "completed").length;
  return (
    <main className="min-h-screen bg-[#020713] px-4 py-8 text-white sm:px-8">
      <section className="mx-auto max-w-7xl rounded-[34px] border border-white/10 bg-white/[0.04] p-5 sm:p-7">
        <h1 className="text-4xl font-black tracking-tight">Achievements</h1>
        <p className="mt-4 text-slate-300">{recorded} of {milestones.length} milestones recorded. These reflect your current saved goals, active plan, and completed workout history.</p>
        <p className="mt-3 text-sm text-slate-400">Award history and point claims are unavailable. Recorded milestones do not award points or certify strength, nutrition, sleep, or recovery outcomes.</p>
        <SoundAchievementBadgeRow className="mt-7" eyebrow="Saved activity" title="Recorded milestones" items={milestones} />
        <Link className="mt-6 inline-block text-cyan-200 underline" href={ROUTES.dashboard.home}>Back to Dashboard</Link>
      </section>
    </main>
  );
}
