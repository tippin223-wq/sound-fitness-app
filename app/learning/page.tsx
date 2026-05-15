import Link from "next/link";
import AppHeader from "@/components/AppHeader";
import { ProfileProvider } from "@/components/profile/ProfileProvider";
import { ROUTES } from "@/lib/routes";

export const metadata = {
  title: "Learning Dashboard | Sound Fitness",
  description: "Fitness education, skill tracks, lessons, and app guidance.",
};

type Accent = "amber" | "cyan" | "emerald" | "fuchsia" | "sky" | "violet";

const learningJourneyHref = ROUTES.learning.home;
// TODO: Replace learningJourneyHref with /learning/journey when a dedicated learning journey route exists.

const accentStyles: Record<
  Accent,
  { border: string; glow: string; icon: string; line: string; text: string }
> = {
  amber: {
    border: "hover:border-amber-300/45",
    glow: "hover:shadow-[0_0_34px_rgba(251,191,36,0.13)]",
    icon: "bg-amber-300/12 text-amber-100",
    line: "from-amber-300 to-orange-300",
    text: "text-amber-100",
  },
  cyan: {
    border: "hover:border-cyan-300/45",
    glow: "hover:shadow-[0_0_34px_rgba(34,211,238,0.15)]",
    icon: "bg-cyan-300/12 text-cyan-100",
    line: "from-cyan-300 to-sky-300",
    text: "text-cyan-100",
  },
  emerald: {
    border: "hover:border-emerald-300/45",
    glow: "hover:shadow-[0_0_34px_rgba(16,185,129,0.13)]",
    icon: "bg-emerald-300/12 text-emerald-100",
    line: "from-emerald-300 to-cyan-300",
    text: "text-emerald-100",
  },
  fuchsia: {
    border: "hover:border-fuchsia-300/40",
    glow: "hover:shadow-[0_0_34px_rgba(217,70,239,0.12)]",
    icon: "bg-fuchsia-300/12 text-fuchsia-100",
    line: "from-fuchsia-300 to-violet-300",
    text: "text-fuchsia-100",
  },
  sky: {
    border: "hover:border-sky-300/45",
    glow: "hover:shadow-[0_0_34px_rgba(14,165,233,0.13)]",
    icon: "bg-sky-300/12 text-sky-100",
    line: "from-sky-300 to-cyan-300",
    text: "text-sky-100",
  },
  violet: {
    border: "hover:border-violet-300/40",
    glow: "hover:shadow-[0_0_34px_rgba(139,92,246,0.12)]",
    icon: "bg-violet-300/12 text-violet-100",
    line: "from-violet-300 to-cyan-300",
    text: "text-violet-100",
  },
};

const learningTracks = [
  {
    title: "Strength Fundamentals",
    description: "Learn movement patterns, progression, effort, and recovery basics.",
    href: ROUTES.dashboard.sessions,
    label: "Strength",
    accent: "cyan",
  },
  {
    title: "Movement Technique",
    description: "Build better form awareness with cues, setup, and common fixes.",
    href: ROUTES.dashboard.exerciseLibrary,
    label: "Technique",
    accent: "sky",
  },
  {
    title: "Nutrition Basics",
    description: "Understand calories, protein, hydration, and meal timing.",
    href: ROUTES.nutritionPortal.home,
    label: "Fuel",
    accent: "emerald",
  },
  {
    title: "Recovery & Mobility",
    description: "Recognize recovery signs and choose better reset sessions.",
    href: ROUTES.dashboard.recovery,
    label: "Recover",
    accent: "amber",
  },
  {
    title: "Performance Training",
    description: "Explore power, conditioning, speed, and athletic qualities.",
    href: "/performance",
    label: "Output",
    accent: "fuchsia",
  },
  {
    title: "App Tutorials",
    description: "Learn how dashboards, builders, goals, and imports connect.",
    href: ROUTES.dashboard.profile,
    label: "Guide",
    accent: "violet",
  },
] as const;

const recommendedLessons = [
  {
    title: "How to use RPE",
    detail: "Use effort ratings to choose loads without guessing.",
    minutes: "6 min",
  },
  {
    title: "How to track volume",
    detail: "Understand sets, weekly targets, and productive work.",
    minutes: "8 min",
  },
  {
    title: "Protein basics",
    detail: "Set a simple protein floor and repeat it consistently.",
    minutes: "5 min",
  },
  {
    title: "Recovery signs",
    detail: "Spot fatigue signals before they pile up.",
    minutes: "7 min",
  },
  {
    title: "Squat form fundamentals",
    detail: "Learn stance, bracing, depth, and repeatable setup.",
    minutes: "9 min",
  },
] as const;

const progressStats = [
  { label: "Lessons Completed", value: "12", helper: "Placeholder learning log" },
  { label: "Learning Streak", value: "4 days", helper: "Study momentum" },
  { label: "Skill Points", value: "340", helper: "Future Sound Points link" },
  { label: "Unlocked Modules", value: "3", helper: "Starter track preview" },
] as const;

const libraryLinks = [
  {
    title: "Exercise Education",
    description: "Exercise database, anatomy, movement cues, and patterns.",
    href: ROUTES.dashboard.exerciseLibrary,
    accent: "cyan",
  },
  {
    title: "Nutrition Education",
    description: "Foods, recipes, macros, hydration, and grocery planning.",
    href: ROUTES.nutritionPortal.library,
    accent: "emerald",
  },
  {
    title: "Recovery Education",
    description: "Mobility, soreness, cooldowns, and readiness concepts.",
    href: ROUTES.dashboard.recovery,
    accent: "sky",
  },
  {
    title: "Performance Education",
    description: "Power, conditioning, testing, and athletic metrics.",
    href: "/performance",
    accent: "amber",
  },
] as const;

function SectionHeader({
  eyebrow,
  title,
  description,
}: {
  description?: string;
  eyebrow: string;
  title: string;
}) {
  return (
    <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan-200">
          {eyebrow}
        </p>
        <h2 className="mt-2 text-2xl font-black tracking-tight text-white">
          {title}
        </h2>
      </div>
      {description ? (
        <p className="max-w-xl text-sm leading-6 text-slate-400">
          {description}
        </p>
      ) : null}
    </div>
  );
}

function LearningCard({
  accent,
  description,
  href,
  label,
  title,
}: {
  accent: Accent;
  description: string;
  href: string;
  label: string;
  title: string;
}) {
  const tone = accentStyles[accent];

  return (
    <Link
      className={`group relative overflow-hidden rounded-[28px] border border-white/10 bg-slate-950/52 p-5 transition duration-300 ${tone.border} ${tone.glow} hover:-translate-y-1 hover:bg-white/[0.06] active:scale-[0.99]`}
      href={href}
    >
      <span className={`absolute inset-x-5 top-0 h-[2px] rounded-full bg-gradient-to-r ${tone.line}`} />
      <div className="flex items-start justify-between gap-3">
        <span
          className={`rounded-2xl border border-white/10 px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] ${tone.icon}`}
        >
          {label}
        </span>
        <span className={`text-xs font-black uppercase tracking-[0.14em] ${tone.text}`}>
          Open
        </span>
      </div>
      <h3 className="mt-5 text-lg font-black tracking-tight text-white">
        {title}
      </h3>
      <p className="mt-2 text-sm leading-6 text-slate-400">{description}</p>
    </Link>
  );
}

export default function LearningDashboardPage() {
  return (
    <ProfileProvider>
      <AppHeader />
      <main className="min-h-screen bg-[#020713] text-white">
        <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_14%_0%,rgba(139,92,246,0.2),transparent_32%),radial-gradient(circle_at_84%_10%,rgba(34,211,238,0.16),transparent_28%),linear-gradient(180deg,#020713_0%,#07111f_50%,#020713_100%)]" />

        <div className="mx-auto w-full max-w-[1500px] space-y-6 px-4 py-6 sm:px-6 lg:px-8">
          <section className="overflow-hidden rounded-[36px] border border-white/10 bg-[radial-gradient(circle_at_16%_0%,rgba(139,92,246,0.22),transparent_34%),radial-gradient(circle_at_88%_10%,rgba(34,211,238,0.16),transparent_32%),linear-gradient(135deg,rgba(15,23,42,0.96),rgba(2,6,23,0.98))] p-6 shadow-[0_35px_130px_rgba(0,0,0,0.62)] lg:p-8">
            <div className="grid gap-6 xl:grid-cols-[1fr_0.42fr] xl:items-end">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.32em] text-violet-200">
                  Education Command Center
                </p>
                <h1 className="mt-4 text-5xl font-black tracking-tight text-white sm:text-6xl">
                  Learning Dashboard
                </h1>
                <p className="mt-4 max-w-3xl text-base leading-7 text-slate-300">
                  Build skill, understand training, and unlock better results.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                <Link
                  className="rounded-3xl bg-cyan-300 px-5 py-4 text-center text-sm font-black uppercase tracking-[0.16em] text-slate-950 shadow-[0_0_36px_rgba(34,211,238,0.25)] transition hover:-translate-y-0.5 hover:bg-cyan-200"
                  href={learningJourneyHref}
                >
                  Continue Learning Journey
                </Link>
                <Link
                  className="rounded-3xl border border-white/10 bg-white/[0.045] px-5 py-4 text-center text-sm font-black uppercase tracking-[0.16em] text-white transition hover:border-violet-300/35 hover:bg-violet-300/10"
                  href={ROUTES.dashboard.home}
                >
                  Back to Dashboard
                </Link>
              </div>
            </div>
          </section>

          <section className="grid gap-5 lg:grid-cols-[0.82fr_1.18fr]">
            <article className="rounded-[34px] border border-violet-300/20 bg-violet-300/8 p-5 shadow-[0_28px_90px_rgba(139,92,246,0.08)] backdrop-blur-xl lg:p-6">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-violet-100">
                Learning Journey
              </p>
              <h2 className="mt-3 text-3xl font-black tracking-tight text-white">
                Skill path
              </h2>
              <p className="mt-3 text-sm leading-6 text-slate-300">
                A guided learning route can connect technique, training logic,
                nutrition, recovery, and app tutorials as real lesson data comes
                online.
              </p>
              <div className="mt-5 h-3 overflow-hidden rounded-full bg-slate-950/80">
                <div className="h-full w-[34%] rounded-full bg-gradient-to-r from-violet-300 to-cyan-300" />
              </div>
              <p className="mt-3 text-xs font-black uppercase tracking-[0.14em] text-slate-500">
                Placeholder journey progress: 34%
              </p>
              <Link
                className="mt-5 inline-flex rounded-2xl border border-violet-300/25 bg-violet-300/10 px-4 py-3 text-xs font-black uppercase tracking-[0.14em] text-violet-100 transition hover:border-violet-200/50"
                href={learningJourneyHref}
              >
                Continue Journey
              </Link>
            </article>

            <section className="rounded-[34px] border border-white/10 bg-white/[0.035] p-5 shadow-[0_28px_90px_rgba(0,0,0,0.32)] backdrop-blur-xl lg:p-6">
              <SectionHeader
                eyebrow="Learning Tracks"
                title="Choose a skill lane"
                description="Premium cards stay wired to existing app areas until dedicated lesson routes are added."
              />
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {learningTracks.map((track) => (
                  <LearningCard key={track.title} {...track} />
                ))}
              </div>
            </section>
          </section>

          <section className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
            <article className="rounded-[34px] border border-white/10 bg-white/[0.035] p-5 shadow-[0_28px_90px_rgba(0,0,0,0.3)] backdrop-blur-xl lg:p-6">
              <SectionHeader
                eyebrow="Recommended Lessons"
                title="Next useful lessons"
                description="Safe placeholder lessons for the future education engine."
              />
              <div className="grid gap-3 md:grid-cols-2">
                {recommendedLessons.map((lesson) => (
                  <div
                    className="rounded-[24px] border border-white/10 bg-slate-950/54 p-4"
                    key={lesson.title}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="text-base font-black text-white">
                        {lesson.title}
                      </h3>
                      <span className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-cyan-100">
                        {lesson.minutes}
                      </span>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-slate-400">
                      {lesson.detail}
                    </p>
                  </div>
                ))}
              </div>
            </article>

            <article className="rounded-[34px] border border-cyan-300/18 bg-cyan-300/8 p-5 shadow-[0_28px_90px_rgba(34,211,238,0.08)] backdrop-blur-xl lg:p-6">
              <SectionHeader
                eyebrow="Progress"
                title="Learning momentum"
                description="Mock data only until lesson events are persisted."
              />
              <div className="grid gap-3 sm:grid-cols-2">
                {progressStats.map((stat) => (
                  <div
                    className="rounded-[24px] border border-white/10 bg-slate-950/56 p-4"
                    key={stat.label}
                  >
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
                      {stat.label}
                    </p>
                    <p className="mt-2 text-3xl font-black text-white">
                      {stat.value}
                    </p>
                    <p className="mt-1 text-xs font-semibold text-slate-400">
                      {stat.helper}
                    </p>
                  </div>
                ))}
              </div>
            </article>
          </section>

          <section className="rounded-[34px] border border-white/10 bg-white/[0.035] p-5 shadow-[0_28px_90px_rgba(0,0,0,0.32)] backdrop-blur-xl lg:p-6">
            <SectionHeader
              eyebrow="Library Access"
              title="Education source rooms"
              description="Connect learning back to the major Sound Fitness systems."
            />
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {libraryLinks.map((link) => {
                const tone = accentStyles[link.accent];
                return (
                  <Link
                    className={`group rounded-[26px] border border-white/10 bg-slate-950/52 p-5 transition duration-300 ${tone.border} ${tone.glow} hover:-translate-y-1 hover:bg-white/[0.06]`}
                    href={link.href}
                    key={link.title}
                  >
                    <div className={`h-[2px] w-16 rounded-full bg-gradient-to-r ${tone.line}`} />
                    <h3 className="mt-5 text-lg font-black text-white">
                      {link.title}
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-slate-400">
                      {link.description}
                    </p>
                    <p className={`mt-4 text-xs font-black uppercase tracking-[0.14em] ${tone.text}`}>
                      Open Library
                    </p>
                  </Link>
                );
              })}
            </div>
          </section>
        </div>
      </main>
    </ProfileProvider>
  );
}
