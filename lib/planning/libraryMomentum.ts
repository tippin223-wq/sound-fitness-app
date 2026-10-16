/** Set progress is descriptive; it cannot establish fatigue or readiness. */
export function libraryMomentum(percent: number, target: number | null = null) {
  const available = Number.isFinite(percent) && percent >= 0 && target !== null && Number.isSafeInteger(target) && target > 0;
  if (!available) return { id: "not-set", label: "Target not set", recommendation: "Set progress needs a saved area target.", percentLabel: "—", fillPercent: 0 };
  const id = percent <= 20 ? "ice" : percent <= 45 ? "building" : percent <= 75 ? "productive" : percent <= 90 ? "hot" : "too-hot";
  const label = percent <= 20 ? "0–20% of target" : percent <= 45 ? "20–45% of target" : percent <= 75 ? "45–75% of target" : percent <= 90 ? "75–90% of target" : "Over 90% of target";
  return { id, label, recommendation: "Recorded set progress does not assess recovery or readiness.", percentLabel: `${Math.round(percent)}%`, fillPercent: Math.min(100, percent) };
}
