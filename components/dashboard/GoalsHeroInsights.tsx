"use client";

import { Flag, CalendarCheck, ChartNoAxesCombined } from "lucide-react";
import type { GoalState } from "@/lib/planning/goals";
import styles from "@/app/dashboard/goals/goals.module.css";

export default function GoalsHeroInsights({goals, onQuestion}: {
  goals: Partial<GoalState>; onQuestion: (index: number) => void;
}) {
  const hasDirection = Boolean(goals.planDirections?.length);
  const actions = [
    {Icon: Flag, title: "Set a clear destination", detail: hasDirection && goals.goalDeadline
      ? "Keep your chosen priorities, measurable targets and review date clear. Use your Goal Bank to track the goals you’re working toward."
      : "Choose your priorities, decide what success looks like and set a review date.", action: "Define your goals", question: 0},
    {Icon: CalendarCheck, title: "Build a repeatable routine", detail: "Turn your goals into a plan you can follow consistently. Balance training, nutrition and recovery around your availability.", action: "Set your weekly commitment", question: 4},
    {Icon: ChartNoAxesCombined, title: "Track, review and adjust", detail: "Record your sessions and relevant support signals. Review progress against your targets, adjust when needed and celebrate completed goals.", action: "Review plan settings", question: 7},
  ];
  return <section className={styles.goalActionSummary} aria-labelledby="goal-action-summary-title">
    <h2 id="goal-action-summary-title">Goal summary</h2>
    <div className={styles.goalActionCards}>
      {actions.map(({Icon, title, detail, action, question}) => <button type="button" key={title} className={styles.goalActionCard} onClick={() => onQuestion(question)}>
        <Icon aria-hidden="true" className={styles.goalActionIcon} />
        <span className={styles.goalActionCopy}><strong>{title}</strong><span className={styles.goalActionDetail}>{detail}</span><span className={styles.goalActionLink}>{action} →</span></span>
      </button>)}
    </div>
  </section>;
}
