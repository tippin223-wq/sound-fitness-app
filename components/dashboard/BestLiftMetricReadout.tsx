"use client";
import { useEffect, useState } from "react";

type RecordValue = { weightLabel: string; repsLabel: string; setsLabel: string; volumeLabel: string; dateLabel: string };
export default function BestLiftMetricReadout({record, active}: {record: RecordValue; active: boolean}) {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    if (!active) return;
    const timer = window.setInterval(() => { if (!document.hidden) setIndex(value => (value + 1) % 4); }, 5000);
    return () => window.clearInterval(timer);
  }, [active]);
  const metrics = [["Weight", record.weightLabel], ["Reps", record.repsLabel], ["Sets", record.setsLabel], ["Volume", record.volumeLabel]];
  const [label, value] = metrics[index];
  return <span className="dashboard-best-lift-metric" aria-live="polite"><span>{label}</span><strong>{value}</strong><small>{record.dateLabel === "—" || record.dateLabel === "Not recorded" ? "Record your first lift" : record.dateLabel}</small></span>;
}
