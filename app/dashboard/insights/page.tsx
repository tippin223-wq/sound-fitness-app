import UserMenuPlaceholderPage from "@/components/dashboard/UserMenuPlaceholderPage";

export default function InsightsPage() {
  return (
    <UserMenuPlaceholderPage
      badge="User Menu"
      title="Insights"
      description="AI-assisted patterns, coaching notes, and trend summaries will collect here as you log sessions, meals, recovery, and performance data."
      sections={[
        {
          title: "Training Insights",
          description: "Patterns from workouts, weekly volume, exercise balance, and consistency.",
          items: [
            "Volume and movement-pattern trends",
            "Undertrained and overworked areas",
            "Workout consistency signals",
          ],
        },
        {
          title: "Nutrition Insights",
          description: "Fuel patterns connected to training outcomes and recovery.",
          items: [
            "Protein and meal timing notes",
            "Hydration and consistency patterns",
            "Goal-aware nutrition nudges",
          ],
        },
        {
          title: "Recovery Insights",
          description: "Readiness, soreness, cooldowns, and recovery warnings.",
          items: [
            "Muscles running hot",
            "Suggested recovery actions",
            "Alternate ready regions",
          ],
        },
        {
          title: "Performance Insights",
          description: "Strength, conditioning, capacity, and milestone signals.",
          items: [
            "PR opportunities",
            "Performance trend summaries",
            "Testing week suggestions",
          ],
        },
        {
          title: "Recommended Next Action",
          description: "A future coach card will choose the most useful next step.",
          items: [
            "More personalized insights will appear as data grows.",
            "Review stats, recovery, and goals before changing the plan.",
          ],
        },
      ]}
    />
  );
}
