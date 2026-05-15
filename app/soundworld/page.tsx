import Link from "next/link";
import AppHeader from "@/components/AppHeader";
import { ProfileProvider } from "@/components/profile/ProfileProvider";
import { ROUTES } from "@/lib/routes";

export const metadata = {
  title: "SoundWorld | Sound Fitness",
  description: "Gamified training quests, streaks, badges, and fitness worlds.",
};

type Accent = "amber" | "cyan" | "emerald" | "fuchsia" | "orange" | "sky" | "violet";

const toneStyles: Record<
  Accent,
  { border: string; glow: string; icon: string; line: string; text: string }
> = {
  amber: {
    border: "hover:border-amber-300/45",
    glow: "hover:shadow-[0_0_34px_rgba(251,191,36,0.14)]",
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
    border: "hover:border-fuchsia-300/45",
    glow: "hover:shadow-[0_0_34px_rgba(217,70,239,0.14)]",
    icon: "bg-fuchsia-300/12 text-fuchsia-100",
    line: "from-fuchsia-300 to-violet-300",
    text: "text-fuchsia-100",
  },
  orange: {
    border: "hover:border-orange-300/45",
    glow: "hover:shadow-[0_0_34px_rgba(251,146,60,0.14)]",
    icon: "bg-orange-300/12 text-orange-100",
    line: "from-orange-300 to-amber-300",
    text: "text-orange-100",
  },
  sky: {
    border: "hover:border-sky-300/45",
    glow: "hover:shadow-[0_0_34px_rgba(14,165,233,0.13)]",
    icon: "bg-sky-300/12 text-sky-100",
    line: "from-sky-300 to-cyan-300",
    text: "text-sky-100",
  },
  violet: {
    border: "hover:border-violet-300/45",
    glow: "hover:shadow-[0_0_34px_rgba(139,92,246,0.14)]",
    icon: "bg-violet-300/12 text-violet-100",
    line: "from-violet-300 to-fuchsia-300",
    text: "text-violet-100",
  },
};

const playerStats = [
  { label: "Level", value: "7", helper: "Prototype player rank" },
  { label: "Sound Points", value: "1,240", helper: "Placeholder rewards balance" },
  { label: "Streak", value: "5 days", helper: "Training momentum" },
  { label: "Current Quest", value: "Week Builder", helper: "Complete three sessions" },
] as const;

const gamePortals = [
  {
    title: "Strength Arena",
    description: "Turn strength sessions into progressive arena challenges.",
    label: "Power",
    accent: "cyan",
  },
  {
    title: "Recovery Temple",
    description: "Complete cooldowns, breathwork, mobility, and readiness quests.",
    label: "Reset",
    accent: "sky",
  },
  {
    title: "Fuel Lab",
    description: "Connect meals, hydration, protein, and grocery wins.",
    label: "Fuel",
    accent: "emerald",
  },
  {
    title: "Cardio Circuit",
    description: "Build steps, runs, rides, intervals, and endurance streaks.",
    label: "Engine",
    accent: "orange",
  },
  {
    title: "Mobility Garden",
    description: "Unlock range-of-motion paths and movement-prep consistency.",
    label: "Flow",
    accent: "violet",
  },
  {
    title: "Boss Battles",
    description: "Future milestone tests for consistency, PRs, and challenges.",
    label: "Boss",
    accent: "fuchsia",
  },
] as const;
// TODO: Route game portal cards to dedicated mini-game modules when those routes exist.

const quests = [
  {
    title: "Complete 3 workouts this week",
    reward: "+120 points",
    progress: "1 / 3",
  },
  {
    title: "Hit protein goal 4 days",
    reward: "+90 points",
    progress: "2 / 4",
  },
  {
    title: "Log recovery check-in",
    reward: "+40 points",
    progress: "Ready",
  },
  {
    title: "Finish a mobility session",
    reward: "+50 points",
    progress: "0 / 1",
  },
] as const;

const rewards = [
  "Consistency badges",
  "Strength milestones",
  "Recovery unlocks",
  "Sound credits placeholder",
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
        <p className="text-[10px] font-black uppercase tracking-[0.24em] text-fuchsia-200">
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

function PortalCard({
  accent,
  description,
  label,
  title,
}: {
  accent: Accent;
  description: string;
  label: string;
  title: string;
}) {
  const tone = toneStyles[accent];

  return (
    <Link
      className={`group relative overflow-hidden rounded-[28px] border border-white/10 bg-slate-950/54 p-5 transition duration-300 ${tone.border} ${tone.glow} hover:-translate-y-1 hover:bg-white/[0.06] active:scale-[0.99]`}
      href={ROUTES.soundworld.home}
    >
      <span className={`absolute inset-x-5 top-0 h-[2px] rounded-full bg-gradient-to-r ${tone.line}`} />
      <div className="flex items-start justify-between gap-3">
        <span
          className={`rounded-2xl border border-white/10 px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] ${tone.icon}`}
        >
          {label}
        </span>
        <span className={`text-xs font-black uppercase tracking-[0.14em] ${tone.text}`}>
          Preview
        </span>
      </div>
      <h3 className="mt-5 text-lg font-black tracking-tight text-white">
        {title}
      </h3>
      <p className="mt-2 text-sm leading-6 text-slate-400">{description}</p>
    </Link>
  );
}

export default function SoundWorldDashboardPage() {
  return (
    <ProfileProvider>
      <AppHeader />
      <main className="min-h-screen bg-[#020713] text-white">
        <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_16%_0%,rgba(217,70,239,0.2),transparent_32%),radial-gradient(circle_at_84%_8%,rgba(251,191,36,0.16),transparent_28%),linear-gradient(180deg,#020713_0%,#07111f_52%,#020713_100%)]" />

        <div className="mx-auto w-full max-w-[1500px] space-y-6 px-4 py-6 sm:px-6 lg:px-8">
          <section className="overflow-hidden rounded-[36px] border border-white/10 bg-[radial-gradient(circle_at_16%_0%,rgba(217,70,239,0.24),transparent_34%),radial-gradient(circle_at_88%_10%,rgba(251,191,36,0.16),transparent_32%),linear-gradient(135deg,rgba(15,23,42,0.96),rgba(2,6,23,0.98))] p-6 shadow-[0_35px_130px_rgba(0,0,0,0.62)] lg:p-8">
            <div className="grid gap-6 xl:grid-cols-[1fr_0.42fr] xl:items-end">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.32em] text-fuchsia-200">
                  Gamified Fitness World
                </p>
                <h1 className="mt-4 text-5xl font-black tracking-tight text-white sm:text-6xl">
                  SoundWorld
                </h1>
                <p className="mt-4 max-w-3xl text-base leading-7 text-slate-300">
                  Turn training into a world of quests, streaks, badges, and
                  fitness games.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                <Link
                  className="rounded-3xl bg-fuchsia-300 px-5 py-4 text-center text-sm font-black uppercase tracking-[0.16em] text-slate-950 shadow-[0_0_36px_rgba(217,70,239,0.25)] transition hover:-translate-y-0.5 hover:bg-fuchsia-200"
                  href={ROUTES.soundworld.home}
                >
                  Enter SoundWorld
                </Link>
                <Link
                  className="rounded-3xl border border-white/10 bg-white/[0.045] px-5 py-4 text-center text-sm font-black uppercase tracking-[0.16em] text-white transition hover:border-cyan-300/35 hover:bg-cyan-300/10"
                  href={ROUTES.dashboard.home}
                >
                  Back to Dashboard
                </Link>
              </div>
            </div>
          </section>

          <section className="grid gap-5 xl:grid-cols-[0.82fr_1.18fr]">
            <article className="rounded-[34px] border border-fuchsia-300/20 bg-fuchsia-300/8 p-5 shadow-[0_28px_90px_rgba(217,70,239,0.08)] backdrop-blur-xl lg:p-6">
              <SectionHeader
                eyebrow="Player Status"
                title="Current player"
                description="Safe placeholder stats until game state is wired."
              />
              <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-[30px] border border-cyan-100/25 bg-cyan-300/12 text-3xl font-black text-cyan-100 shadow-[0_0_34px_rgba(34,211,238,0.16)]">
                  SF
                </div>
                <div className="grid flex-1 gap-3 sm:grid-cols-2">
                  {playerStats.map((stat) => (
                    <div
                      className="rounded-[22px] border border-white/10 bg-slate-950/56 p-4"
                      key={stat.label}
                    >
                      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
                        {stat.label}
                      </p>
                      <p className="mt-2 text-2xl font-black text-white">
                        {stat.value}
                      </p>
                      <p className="mt-1 text-xs font-semibold text-slate-400">
                        {stat.helper}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </article>

            <section className="rounded-[34px] border border-white/10 bg-white/[0.035] p-5 shadow-[0_28px_90px_rgba(0,0,0,0.32)] backdrop-blur-xl lg:p-6">
              <SectionHeader
                eyebrow="Game Portals"
                title="Choose your world"
                description="Clickable preview cards stay inside the safe dashboard shell."
              />
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {gamePortals.map((portal) => (
                  <PortalCard key={portal.title} {...portal} />
                ))}
              </div>
            </section>
          </section>

          <section className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
            <article className="rounded-[34px] border border-white/10 bg-white/[0.035] p-5 shadow-[0_28px_90px_rgba(0,0,0,0.3)] backdrop-blur-xl lg:p-6">
              <SectionHeader
                eyebrow="Quests"
                title="Active quests"
                description="These examples show how workout, nutrition, and recovery habits can become game goals."
              />
              <div className="grid gap-3 md:grid-cols-2">
                {quests.map((quest) => (
                  <div
                    className="rounded-[24px] border border-white/10 bg-slate-950/54 p-4"
                    key={quest.title}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="text-base font-black text-white">
                        {quest.title}
                      </h3>
                      <span className="rounded-full border border-amber-300/20 bg-amber-300/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-amber-100">
                        {quest.progress}
                      </span>
                    </div>
                    <p className="mt-3 text-sm font-black uppercase tracking-[0.12em] text-fuchsia-100">
                      {quest.reward}
                    </p>
                  </div>
                ))}
              </div>
            </article>

            <article className="rounded-[34px] border border-amber-300/18 bg-amber-300/8 p-5 shadow-[0_28px_90px_rgba(251,191,36,0.08)] backdrop-blur-xl lg:p-6">
              <SectionHeader
                eyebrow="Rewards"
                title="Unlocks"
                description="Reward systems are placeholders until points and achievements are connected."
              />
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                {rewards.map((reward) => (
                  <div
                    className="rounded-[22px] border border-white/10 bg-slate-950/56 px-4 py-3 text-sm font-bold text-amber-50/85"
                    key={reward}
                  >
                    {reward}
                  </div>
                ))}
              </div>
            </article>
          </section>

          <section className="overflow-hidden rounded-[34px] border border-white/10 bg-[radial-gradient(circle_at_12%_0%,rgba(217,70,239,0.18),transparent_34%),radial-gradient(circle_at_88%_18%,rgba(34,211,238,0.13),transparent_30%),linear-gradient(135deg,rgba(15,23,42,0.82),rgba(2,6,23,0.96))] p-5 shadow-[0_28px_90px_rgba(0,0,0,0.36)] backdrop-blur-xl lg:p-6">
            <div className="grid gap-6 lg:grid-cols-[1fr_0.52fr] lg:items-center">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan-200">
                  Future World Map
                </p>
                <h2 className="mt-3 text-3xl font-black tracking-tight text-white">
                  SoundWorld map placeholder
                </h2>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">
                  This area is reserved for a larger world map, portals, game
                  states, unlock paths, and future interactive training
                  experiences.
                </p>
                {/* TODO: Replace this placeholder with Unreal/SoundWorld integration once runtime, auth, and save-state contracts are ready. */}
              </div>
              <div className="rounded-[30px] border border-white/10 bg-slate-950/58 p-5">
                <div className="grid grid-cols-3 gap-3">
                  {["Arena", "Temple", "Lab", "Circuit", "Garden", "Boss"].map(
                    (node) => (
                      <div
                        className="rounded-2xl border border-white/10 bg-white/[0.045] px-3 py-5 text-center text-[10px] font-black uppercase tracking-[0.12em] text-slate-300"
                        key={node}
                      >
                        {node}
                      </div>
                    ),
                  )}
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>
    </ProfileProvider>
  );
}
