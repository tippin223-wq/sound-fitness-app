"use client";

import { usePublishedContent } from "@/lib/usePublishedContent";
import Link from "next/link";
import { memo, useSyncExternalStore } from "react";
import { currentChallengeSet, type ChallengeMetrics } from "@/lib/planning/challengeSets";
import { readChallengeActivity } from "@/lib/planning/challengeActivity";
import { subscribePlanning } from "@/lib/planning/store";
import styles from "./HeroMeterCards.module.css";

const snapshot = () => JSON.stringify(readChallengeActivity());
const serverSnapshot = () => "{}";

function ChallengeSetProgress({ category }: { category: string }) {
  const metrics = JSON.parse(useSyncExternalStore(subscribePlanning, snapshot, serverSnapshot)) as ChallengeMetrics;
  const published = usePublishedContent("challenges");
  const current = currentChallengeSet(category, metrics, published);
  return <>
    <div className={styles.challengeSetSummary} aria-live="polite">
      <strong>{current.challenges.filter(challenge => challenge.complete).length} of 3</strong>
    </div>
    {current.challenges.map((challenge, slot) => <div className={styles.challengeItem} key={challenge.metric}>
      <h4><span>{String(slot + 1).padStart(2, "0")}</span>{challenge.label}</h4>
      <div className={styles.challengeProgress}>
        <span title={challenge.source}>{challenge.complete ? "✓ Complete" : challenge.issue || (challenge.value === null ? "Awaiting tracking" : `${challenge.value} / ${challenge.target}`)}</span>
        {challenge.value !== null && <Link href={challenge.href} onClick={event => event.stopPropagation()}>Open log →</Link>}
        {challenge.progress !== null && <progress aria-label={challenge.label} max={100} value={challenge.progress} />}
      </div>
    </div>)}
  </>;
}
export default memo(ChallengeSetProgress);
