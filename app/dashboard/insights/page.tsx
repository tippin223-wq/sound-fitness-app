import Link from "next/link";
import SoundAchievementBadgeRow, {
  type AchievementBadgeItem,
} from "@/components/dashboard/SoundAchievementBadgeRow";
import UserMenuPlaceholderPage from "@/components/dashboard/UserMenuPlaceholderPage";
import { ROUTES } from "@/lib/routes";

const hubLinks = [
  {
    href: ROUTES.dashboard.stats,
    icon: "📈",
    label: "Stats",
    snapshot: "Trends live",
    description: "Training volume, body metrics, and performance logs.",
    className:
      "border-cyan-300/34 bg-cyan-300/10 text-cyan-50 shadow-[0_0_26px_rgba(34,211,238,0.14)]",
  },
  {
    href: ROUTES.dashboard.goals,
    icon: "🎯",
    label: "Goals",
    snapshot: "Direction set",
    description: "Plan direction, priorities, milestones, and next steps.",
    className:
      "border-sky-300/30 bg-sky-300/10 text-sky-50 shadow-[0_0_24px_rgba(14,165,233,0.12)]",
  },
  {
    href: ROUTES.dashboard.achievements,
    icon: "🏆",
    label: "Achievements",
    snapshot: "Prestige XP",
    description: "Badges, streaks, milestones, and Sound rewards.",
    className:
      "border-amber-300/34 bg-amber-300/10 text-amber-50 shadow-[0_0_26px_rgba(250,204,21,0.16)]",
  },
  {
    href: ROUTES.dashboard.myPlan,
    icon: "📅",
    label: "Plan",
    snapshot: "Weekly map",
    description: "Program structure, upcoming sessions, and planning flow.",
    className:
      "border-emerald-300/28 bg-emerald-300/10 text-emerald-50 shadow-[0_0_24px_rgba(16,185,129,0.11)]",
  },
  {
    href: ROUTES.dashboard.coachMessaging,
    icon: "💬",
    label: "Messages",
    snapshot: "Coach loop",
    description: "Questions, notes, feedback, and coaching momentum.",
    className:
      "border-violet-300/28 bg-violet-300/10 text-violet-50 shadow-[0_0_24px_rgba(139,92,246,0.12)]",
  },
] as const;

const insightAchievementPreview = [
  {
    category: "consistency",
    href: ROUTES.dashboard.achievements,
    icon: "🎯",
    label: "Goal Locked",
    meta: "Direction set",
    status: "active",
    statusLabel: "Active",
  },
  {
    category: "recovery",
    href: ROUTES.dashboard.achievements,
    icon: "⚡",
    label: "Recovery Stable",
    meta: "Ready trend",
    status: "completed",
    statusLabel: "Stable",
  },
  {
    category: "intensity",
    href: ROUTES.dashboard.achievements,
    icon: "📈",
    label: "Trend Active",
    meta: "Stats online",
    status: "completed",
    statusLabel: "Online",
  },
] satisfies AchievementBadgeItem[];

export default function InsightsPage() {
  return (
    <UserMenuPlaceholderPage
      badge="User Menu"
      title="Insights"
      description="AI-assisted patterns, coaching notes, and trend summaries will collect here as you log sessions, meals, recovery, and performance data."
      hero={
        <section className="overflow-hidden rounded-[34px] border border-white/10 bg-[radial-gradient(circle_at_16%_0%,rgba(34,211,238,0.17),transparent_34%),radial-gradient(circle_at_88%_12%,rgba(250,204,21,0.12),transparent_30%),linear-gradient(135deg,rgba(15,23,42,0.76),rgba(2,6,23,0.58))] p-5 shadow-[0_34px_120px_rgba(0,0,0,0.45)] backdrop-blur-xl sm:p-7">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-200/22 bg-cyan-300/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-cyan-100">
                <span className="h-2 w-2 rounded-full bg-emerald-300 shadow-[0_0_12px_rgba(110,231,183,0.7)]" />
                My Hub
              </div>
              <h1 className="mt-4 text-4xl font-black tracking-tight text-white sm:text-5xl">
                Insights
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base sm:leading-7">
                Your progression systems connected in one place. Track trends,
                goals, recovery, and coaching momentum from a single command
                center.
              </p>

              <div className="mt-5 flex flex-wrap gap-2">
                {["3 active streaks", "AI focus: consistency", "Next: review plan"].map(
                  (item) => (
                    <span
                      key={item}
                      className="rounded-full border border-white/10 bg-slate-950/44 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.13em] text-slate-300"
                    >
                      {item}
                    </span>
                  ),
                )}
              </div>
            </div>

            <div className="rounded-[26px] border border-amber-200/18 bg-slate-950/42 p-4 shadow-inner shadow-white/5 xl:w-[330px]">
              <div className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-100">
                AI recommendation
              </div>
              <p className="mt-2 text-sm font-bold leading-6 text-white">
                Review stats and goals before your next plan adjustment.
              </p>
              <SoundAchievementBadgeRow
                compact
                className="mt-3"
                items={insightAchievementPreview}
                title="Achievement preview"
              />
            </div>
          </div>

          <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {hubLinks.map((item, index) => (
              <Link
                key={item.label}
                href={item.href}
                aria-current={index === 0 ? "page" : undefined}
                className={`group relative overflow-hidden rounded-[24px] border p-4 transition duration-300 hover:-translate-y-1 hover:border-cyan-100/50 hover:bg-white/[0.075] active:scale-[0.99] ${item.className}`}
              >
                <span className="absolute inset-x-4 top-0 h-px rounded-full bg-gradient-to-r from-transparent via-white/55 to-transparent opacity-70" />
                <div className="flex items-start justify-between gap-3">
                  <span className="grid h-12 w-12 place-items-center rounded-2xl border border-white/10 bg-slate-950/42 text-2xl shadow-inner shadow-white/5 transition group-hover:scale-105">
                    {item.icon}
                  </span>
                  {index === 0 ? (
                    <span className="rounded-full border border-cyan-100/30 bg-cyan-300/16 px-2 py-1 text-[8px] font-black uppercase tracking-[0.12em] text-cyan-50">
                      Active
                    </span>
                  ) : null}
                </div>
                <h2 className="mt-4 text-base font-black uppercase tracking-tight text-white">
                  {item.label}
                </h2>
                <p className="mt-1 text-[10px] font-black uppercase tracking-[0.13em] text-slate-400">
                  {item.snapshot}
                </p>
                <p className="mt-3 text-xs font-semibold leading-5 text-slate-300">
                  {item.description}
                </p>
              </Link>
            ))}
          </div>
        </section>
      }
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
