import type { TrainingAreaPreferences } from "@/lib/trainingAreaCare";
import { physicalReadiness } from "@/lib/physicalReadiness";
import styles from "./ProfileHero.module.css";

export default function PhysicalReadinessMeter({preferences}: {preferences?: TrainingAreaPreferences}) {
  const {score, highestPain, unrated} = physicalReadiness(preferences);
  const color = score === null ? "#64748b" : score >= 70 ? "#67e8f9" : score >= 40 ? "#fbbf24" : "#f87171";
  const explanation = score === null ? unrated ? `Rate ${unrated} selected area${unrated === 1 ? "" : "s"} to show physical readiness.` : "Answer Areas to go easy on to show physical readiness."
    : highestPain === 0 ? "No areas of concern reported. Based only on your body-area answers."
    : `Pain-based score: 100 minus 10 times your highest area pain rating (${highestPain}/10). Sleep, stress and other life factors are excluded.`;
  return <div className={styles.physicalReadiness} title={explanation}>
    <span className={styles.physicalReadinessTitle}>Physical readiness</span>
    <div className={styles.physicalReadinessRing} style={{background: `conic-gradient(${color} ${score ?? 0}%, #33415570 0)`}} role={score === null ? "img" : "meter"} aria-label={score === null ? "Physical readiness: not rated" : "Pain-based physical readiness"} aria-valuemin={score === null ? undefined : 0} aria-valuemax={score === null ? undefined : 100} aria-valuenow={score ?? undefined} aria-valuetext={score === null ? undefined : `${score} percent, based only on reported area pain`} tabIndex={0}>
      <span style={{color}}>{score === null ? "—" : `${score}%`}</span>
    </div>
    <span className={styles.physicalReadinessCaption}>{score === null ? "Not rated" : "Pain-based"}</span>
  </div>;
}
