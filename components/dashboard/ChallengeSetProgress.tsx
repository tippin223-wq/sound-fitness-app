"use client";

import { usePublishedContent } from "@/lib/usePublishedContent";
import dynamic from "next/dynamic";
import { memo, useEffect, useSyncExternalStore } from "react";
import { supabase } from "@/lib/supabaseClient";
import { publishWeeklyRewards } from "@/lib/planning/weeklyRewardBalances";
import { currentChallengeSet, type ChallengeMetrics } from "@/lib/planning/challengeSets";
import { readChallengeActivity } from "@/lib/planning/challengeActivity";
import { subscribePlanning } from "@/lib/planning/store";
import styles from "./HeroMeterCards.module.css";

const Coin = dynamic(() => import("./DashboardTreasureChest3D").then(module => module.DashboardSpinningSoundCoin3D), { ssr: false });
const Bolt = dynamic(() => import("./DashboardLightningBolt3D"), { ssr: false });
const Sapphire = dynamic(() => import("./DashboardTornadoEmeralds3D").then(module => module.DashboardGemStage3D), { ssr: false });

const snapshot = () => JSON.stringify(readChallengeActivity());
const serverSnapshot = () => "{}";

function ChallengeSetProgress({ category }: { category: string }) {
  const activity = useSyncExternalStore(subscribePlanning, snapshot, serverSnapshot);
  const metrics = JSON.parse(activity) as ChallengeMetrics;
  useEffect(() => {
    let live = true;
    const refresh = async () => {
      const { data: before } = await supabase.auth.getSession();
      const owner = before.session?.user.id;
      if (!live || !owner) return;
      const { data, error } = await supabase.rpc("member_reward_balances");
      const { data: after } = await supabase.auth.getSession();
      if (live && !error && after.session?.user.id === owner) publishWeeklyRewards(owner, data);
    };
    const timer = window.setTimeout(() => { void refresh().catch(() => {}); }, 750);
    return () => { live = false; window.clearTimeout(timer); };
  }, [activity]);
  const published = usePublishedContent("challenges");
  const current = currentChallengeSet(category, metrics, published);
  const rewardScale = current.index + 1;
  return <div className={styles.challengeSetLayout}><div className={styles.challengeSetTasks}>
    {current.challenges.map((challenge, slot) => <div className={styles.challengeItem} key={challenge.metric}>
      <h4><input type="checkbox" checked={challenge.complete} disabled aria-label={`${challenge.label}: ${challenge.complete ? "completed" : "not completed"}`} aria-disabled="true" title="Updates automatically from recorded activity" className={styles.challengeCheckbox} /><span>{String(slot + 1).padStart(2, "0")}</span>{challenge.label}</h4>
      <div className={styles.challengeProgress}>
        <span title={challenge.source}>{challenge.complete ? "✓ Complete" : challenge.issue || (challenge.value === null ? "Awaiting tracking" : `${challenge.value} / ${challenge.target}`)}</span>
        {challenge.progress !== null && <progress aria-label={challenge.label} max={100} value={challenge.progress} />}
      </div>
    </div>)}
  </div><aside className={styles.challengeSetRewards} aria-label="Challenge set rewards">
    <h4>Set rewards</h4>
    <p>Complete all three</p>
    <div className={styles.challengeRewardRow}><div><span className={styles.challengeCurrencyArtwork} aria-hidden="true"><Coin className="h-full w-full" paused /></span><strong>{100 * rewardScale}</strong><span>Coins</span></div>
    <div><span className={styles.challengeCurrencyArtwork} aria-hidden="true"><Bolt className="h-full w-full" paused /></span><strong>{25 * rewardScale}</strong><span>Bolts</span></div>
    <div><span className={styles.challengeCurrencyArtwork} aria-hidden="true"><Sapphire className="h-full w-full" paused tones={["blue"]} framingScale={3} /></span><strong>{2 * rewardScale}</strong><span>Sapphires</span></div></div>
  </aside></div>;
}
export default memo(ChallengeSetProgress);
