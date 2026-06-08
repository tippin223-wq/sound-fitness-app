import Link from "next/link";
import SoundAchievementBadgeRow, {
  type AchievementBadgeItem,
} from "@/components/dashboard/SoundAchievementBadgeRow";
import UserMenuPlaceholderPage from "@/components/dashboard/UserMenuPlaceholderPage";
import { ROUTES } from "@/lib/routes";

const featuredAchievements = [
  {
    category: "intensity",
    href: ROUTES.dashboard.stats,
    icon: "🏋️",
    label: "Volume Milestone",
    meta: "Strength work",
    status: "completed",
    statusLabel: "Earned",
  },
  {
    category: "consistency",
    href: ROUTES.dashboard.sessions,
    icon: "🔥",
    label: "5 Day Streak",
    meta: "Consistency",
    status: "active",
    statusLabel: "Building",
  },
  {
    category: "intensity",
    href: ROUTES.performance.home,
    icon: "⚡",
    label: "Performance Spark",
    meta: "Power trend",
    status: "active",
    statusLabel: "Recent",
  },
  {
    category: "recovery",
    href: ROUTES.dashboard.recovery,
    icon: "🧘",
    label: "Recovery Stable",
    meta: "Readiness",
    status: "completed",
    statusLabel: "Stable",
  },
  {
    category: "recovery",
    href: ROUTES.nutritionPortal.home,
    icon: "🍽️",
    label: "Fuel Rhythm",
    meta: "Meal prep",
    status: "default",
    statusLabel: "Ready",
  },
  {
    category: "consistency",
    href: ROUTES.dashboard.goals,
    icon: "🎯",
    label: "Goal Locked",
    meta: "Plan direction",
    status: "completed",
    statusLabel: "Set",
  },
] satisfies AchievementBadgeItem[];

const lockedAchievements = [
  {
    category: "consistency",
    href: ROUTES.dashboard.achievements,
    icon: "🔥",
    label: "30 Day Chain",
    meta: "Future streak",
    status: "locked",
    statusLabel: "Locked",
  },
  {
    category: "intensity",
    href: ROUTES.dashboard.achievements,
    icon: "🏋️",
    label: "Phase Crusher",
    meta: "Program win",
    status: "locked",
    statusLabel: "Locked",
  },
  {
    category: "recovery",
    href: ROUTES.dashboard.achievements,
    icon: "💧",
    label: "Hydration Week",
    meta: "Fuel habit",
    status: "locked",
    statusLabel: "Locked",
  },
  {
    category: "intensity",
    href: ROUTES.dashboard.achievements,
    icon: "🏆",
    label: "PR Week",
    meta: "Testing win",
    status: "locked",
    statusLabel: "Locked",
  },
] satisfies AchievementBadgeItem[];

export default function AchievementsPage() {
  return (
    <UserMenuPlaceholderPage
      badge="User Menu"
      title="Achievements"
      description="Badges, milestones, streaks, and Sound Points progress will live here as your training history grows."
      hero={
        <section className="overflow-hidden rounded-[34px] border border-white/10 bg-[radial-gradient(circle_at_16%_0%,rgba(34,211,238,0.15),transparent_34%),radial-gradient(circle_at_88%_12%,rgba(250,204,21,0.16),transparent_31%),linear-gradient(135deg,rgba(15,23,42,0.78),rgba(2,6,23,0.6))] p-5 shadow-[0_34px_120px_rgba(0,0,0,0.45)] backdrop-blur-xl sm:p-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-[11px] font-black uppercase tracking-[0.26em] text-amber-100">
                Sound Achievement System
              </p>
              <h1 className="mt-3 text-4xl font-black tracking-tight text-white sm:text-5xl">
                Achievements
              </h1>
              <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-300 sm:text-base sm:leading-7">
                Badges now use the Sound Fitness crest silhouette so training
                wins, streaks, recovery, nutrition, and goal milestones feel
                like part of one progression system.
              </p>
            </div>

            <Link
              href={ROUTES.dashboard.home}
              className="rounded-2xl border border-cyan-300/25 bg-cyan-300/10 px-5 py-3 text-center text-xs font-black uppercase tracking-[0.14em] text-cyan-100 transition hover:border-cyan-200/50 hover:bg-cyan-300 hover:text-slate-950"
            >
              Back to Dashboard
            </Link>
          </div>

          <SoundAchievementBadgeRow
            actionHref={ROUTES.dashboard.stats}
            actionLabel="Open stats"
            className="mt-7"
            eyebrow="Recent Sound badges"
            items={featuredAchievements}
            title="Earned and active"
          />

          <SoundAchievementBadgeRow
            className="mt-5"
            compact
            eyebrow="Coming next"
            items={lockedAchievements}
            title="Locked achievements"
          />
        </section>
      }
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
