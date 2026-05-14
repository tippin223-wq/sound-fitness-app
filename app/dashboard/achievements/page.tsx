import UserMenuPlaceholderPage from "@/components/dashboard/UserMenuPlaceholderPage";

export default function AchievementsPage() {
  return (
    <UserMenuPlaceholderPage
      badge="User Menu"
      title="Achievements"
      description="Badges, milestones, streaks, and Sound Points progress will live here as your training history grows."
      sections={[
        {
          title: "Current Streak",
          description: "A quick view of consistency across workouts, nutrition, recovery, and check-ins.",
          items: ["Workout streak", "Nutrition streak", "Recovery streak"],
        },
        {
          title: "Recent Badges",
          description: "Newly earned milestones will appear here after logging activity.",
          items: ["First logged workout", "First meal plan", "First recovery session"],
        },
        {
          title: "Strength Milestones",
          description: "Strength wins, PRs, and movement-specific milestones.",
          items: ["Bench milestone", "Squat milestone", "Pulling milestone"],
        },
        {
          title: "Nutrition Milestones",
          description: "Fueling consistency, protein targets, hydration, and meal planning.",
          items: ["Protein consistency", "Hydration week", "Meal prep streak"],
        },
        {
          title: "Recovery Milestones",
          description: "Mobility, cooldowns, soreness management, and readiness wins.",
          items: ["Mobility streak", "Cooldown completed", "Recovery week"],
        },
        {
          title: "Locked Achievements",
          description: "Future achievements stay visible so users can see what is coming next.",
          items: ["30-day consistency", "Phase completed", "Sound Points rewards"],
        },
      ]}
    />
  );
}
