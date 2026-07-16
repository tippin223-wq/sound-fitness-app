"use client";

import SoundFitnessAvatar from "@/components/dashboard/SoundFitnessAvatar";
import Link from "next/link";
import type { ReactNode } from "react";

type BodyStatTone = "blue" | "cyan" | "emerald" | "gold" | "purple" | "rose";

type BodyStatCardDefinition = {
  icon: string;
  label: string;
  progress: number;
  status: string;
  tone: BodyStatTone;
  value: string;
};

type BodyCommandCenterCardProps = {
  bodyMapHref: string;
  commandCenterSlot?: ReactNode;
};

const bodyCommandTrainingStats: BodyStatCardDefinition[] = [
  {
    icon: "LC",
    label: "Lower Compound",
    progress: 76,
    status: "Squat / Hinge",
    tone: "cyan",
    value: "76%",
  },
  {
    icon: "LI",
    label: "Lower Isolation",
    progress: 64,
    status: "Single Joint",
    tone: "blue",
    value: "64%",
  },
  {
    icon: "UP",
    label: "Upper Push",
    progress: 78,
    status: "Pressing",
    tone: "cyan",
    value: "78%",
  },
  {
    icon: "UL",
    label: "Upper Pull",
    progress: 72,
    status: "Rows / Pulls",
    tone: "blue",
    value: "72%",
  },
  {
    icon: "AI",
    label: "Arm Isolation",
    progress: 58,
    status: "Cuff / Arms",
    tone: "rose",
    value: "58%",
  },
  {
    icon: "AT",
    label: "Athletic",
    progress: 62,
    status: "Power / Carry",
    tone: "gold",
    value: "62%",
  },
  {
    icon: "CN",
    label: "Conditioning",
    progress: 66,
    status: "Capacity",
    tone: "emerald",
    value: "66%",
  },
  {
    icon: "IM",
    label: "Integrated",
    progress: 69,
    status: "Full Body",
    tone: "purple",
    value: "69%",
  },
  {
    icon: "CV",
    label: "Cervical",
    progress: 55,
    status: "Neck Control",
    tone: "rose",
    value: "55%",
  },
];

const bodyCommandSupportStats: BodyStatCardDefinition[] = [
  {
    icon: "R",
    label: "Recovery",
    progress: 82,
    status: "On Track",
    tone: "emerald",
    value: "82%",
  },
  {
    icon: "M",
    label: "Mobility",
    progress: 68,
    status: "Needs Work",
    tone: "purple",
    value: "68%",
  },
  {
    icon: "C",
    label: "Core",
    progress: 91,
    status: "Excellent",
    tone: "gold",
    value: "91%",
  },
  {
    icon: "F",
    label: "Fuel",
    progress: 76,
    status: "Steady",
    tone: "emerald",
    value: "76%",
  },
  {
    icon: "RD",
    label: "Readiness",
    progress: 70,
    status: "Watch",
    tone: "blue",
    value: "70%",
  },
];

const statToneClasses: Record<
  BodyStatTone,
  {
    fill: string;
    icon: string;
    rail: string;
    text: string;
  }
> = {
  blue: {
    fill: "from-sky-200 via-blue-300 to-cyan-300",
    icon: "border-sky-100/26 bg-sky-300/10 text-sky-100",
    rail: "bg-sky-950/52",
    text: "text-sky-100",
  },
  cyan: {
    fill: "from-cyan-200 via-sky-300 to-cyan-400",
    icon: "border-cyan-100/30 bg-cyan-300/12 text-cyan-100",
    rail: "bg-cyan-950/58",
    text: "text-cyan-100",
  },
  emerald: {
    fill: "from-emerald-200 via-teal-300 to-cyan-300",
    icon: "border-emerald-100/30 bg-emerald-300/12 text-emerald-100",
    rail: "bg-emerald-950/56",
    text: "text-emerald-100",
  },
  gold: {
    fill: "from-amber-200 via-yellow-200 to-cyan-200",
    icon: "border-amber-100/30 bg-amber-300/12 text-amber-100",
    rail: "bg-amber-950/46",
    text: "text-amber-100",
  },
  purple: {
    fill: "from-fuchsia-200 via-violet-300 to-sky-300",
    icon: "border-fuchsia-100/30 bg-fuchsia-300/12 text-fuchsia-100",
    rail: "bg-fuchsia-950/48",
    text: "text-fuchsia-100",
  },
  rose: {
    fill: "from-rose-200 via-pink-300 to-cyan-200",
    icon: "border-rose-100/26 bg-rose-300/10 text-rose-100",
    rail: "bg-rose-950/44",
    text: "text-rose-100",
  },
};

function BodyStatCard({
  compact = false,
  stat,
}: {
  compact?: boolean;
  stat: BodyStatCardDefinition;
}) {
  const tone = statToneClasses[stat.tone];

  return (
    <div className={`relative ${compact ? "py-0.5" : "py-1.5"}`}>
      <div className={`flex items-center ${compact ? "gap-1.5" : "gap-2.5"}`}>
        <span
          aria-hidden="true"
          className={`grid shrink-0 place-items-center rounded-[9px] border font-black shadow-[0_0_14px_rgba(34,211,238,0.1)] ${compact ? "h-5 w-6 text-[7px]" : "h-7 w-7 text-[9px]"} ${tone.icon}`}
        >
          {stat.icon}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex min-w-0 items-baseline gap-1.5">
            <span className="block truncate text-[8px] font-black uppercase tracking-[0.12em] text-slate-200">
              {stat.label}
            </span>
            <span className={`${compact ? "text-[7px]" : "text-[9px]"} block truncate font-black uppercase tracking-[0.08em] text-slate-500`}>
              {stat.status}
            </span>
          </span>
        </span>
        <span className={`shrink-0 font-black ${compact ? "text-[11px]" : "text-base"} ${tone.text}`}>
          {stat.value}
        </span>
      </div>
      <div className={`relative overflow-hidden rounded-full ${tone.rail} ${compact ? "mt-1 h-1" : "mt-2 h-2"}`}>
        <div
          className={`h-full rounded-full bg-gradient-to-r ${tone.fill} shadow-[0_0_14px_rgba(34,211,238,0.35)]`}
          style={{ width: `${stat.progress}%` }}
        />
      </div>
    </div>
  );
}

function BodyStatStack({
  label,
  stats,
}: {
  label: string;
  stats: BodyStatCardDefinition[];
}) {
  return (
    <div className="min-w-0">
      <div className="mb-1 flex items-center gap-2">
        <span className="h-px flex-1 bg-cyan-100/16" />
        <span className="shrink-0 text-[7px] font-black uppercase tracking-[0.18em] text-cyan-100/58">
          {label}
        </span>
        <span className="h-px flex-1 bg-cyan-100/16" />
      </div>
      <div className="grid gap-1.5 min-[760px]:grid-cols-2 min-[760px]:gap-x-3">
        {stats.map((stat) => (
          <BodyStatCard compact key={stat.label} stat={stat} />
        ))}
      </div>
    </div>
  );
}

function AvatarStatusCard({ bodyMapHref }: { bodyMapHref: string }) {
  return (
    <div className="relative z-20 mx-auto w-full max-w-[300px] overflow-hidden rounded-[16px] border border-cyan-100/18 bg-slate-950/66 p-2.5 text-left shadow-[0_18px_40px_rgba(0,0,0,0.26),0_0_24px_rgba(34,211,238,0.12),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl">
      <div className="pointer-events-none absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-cyan-100/64 to-transparent" />
      <div className="text-[8px] font-black uppercase tracking-[0.2em] text-cyan-100/70">
        Realistic Avatar State
      </div>
      <div className="mt-1 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-base font-black leading-none text-white">
            Human Coach Avatar
          </div>
          <div className="mt-1 truncate text-[9px] font-bold uppercase tracking-[0.12em] text-slate-400">
            Face / Pose / Motion Rig
          </div>
        </div>
        <Link
          className="inline-flex shrink-0 items-center gap-1 rounded-full border border-cyan-100/30 bg-cyan-300/12 px-2 py-1 text-[7px] font-black uppercase tracking-[0.1em] text-cyan-50 transition hover:border-cyan-100/58 hover:bg-cyan-300/20"
          href={bodyMapHref}
        >
          Avatar Lab
        </Link>
      </div>
    </div>
  );
}

const avatarDetailTags = ["Natural shading", "No zone overlay", "Motion ready"];

function AvatarDetailLegend() {
  return (
    <div className="mx-auto flex w-full max-w-[360px] flex-wrap items-center justify-center gap-1.5 rounded-full border border-white/10 bg-slate-950/48 px-2.5 py-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.07)] backdrop-blur">
      {avatarDetailTags.map((item) => (
        <span
          className="inline-flex items-center gap-1.5 text-[7px] font-black uppercase tracking-[0.1em] text-slate-300"
          key={item}
        >
          <span
            aria-hidden="true"
            className="h-1.5 w-1.5 rounded-full bg-cyan-200 shadow-[0_0_13px_rgba(34,211,238,0.78)]"
          />
          {item}
        </span>
      ))}
    </div>
  );
}

function HyperRealAvatarFigure() {
  return (
    <SoundFitnessAvatar
      animationPreset="idle"
      className="mx-auto h-[clamp(188px,29dvh,330px)] min-h-[164px] w-full max-w-[460px] rounded-[22px]"
      emotePreset="wave"
      exerciseLabel="Realistic Avatar"
      showSkeletonOverlay={false}
    />
  );
}

export default function BodyCommandCenterCard({
  bodyMapHref,
  commandCenterSlot,
}: BodyCommandCenterCardProps) {
  return (
    <div
      aria-label="Body Command Center"
      className="dashboard-hero-card dashboard-hero-card--body-command relative z-10 flex h-full min-h-0 w-full max-w-full flex-col overflow-x-hidden overflow-y-auto overscroll-contain rounded-[30px] border border-cyan-100/22 bg-[radial-gradient(circle_at_50%_-8%,rgba(34,211,238,0.24),transparent_34%),radial-gradient(circle_at_9%_32%,rgba(56,189,248,0.18),transparent_30%),radial-gradient(circle_at_90%_22%,rgba(251,191,36,0.13),transparent_27%),linear-gradient(135deg,rgba(8,13,26,0.98),rgba(2,6,23,0.94))] p-3 shadow-[0_30px_82px_rgba(0,0,0,0.54),0_0_54px_rgba(34,211,238,0.16),inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-xl [scrollbar-color:rgba(34,211,238,0.36)_rgba(15,23,42,0.42)] [scrollbar-width:thin] max-[759px]:min-h-[420px] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-cyan-300/34 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-track]:bg-slate-950/40"
    >
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(125,211,252,0.075)_1px,transparent_1px),linear-gradient(180deg,rgba(125,211,252,0.055)_1px,transparent_1px)] bg-[length:38px_38px] opacity-55" />
      <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-cyan-100/80 to-transparent" />
      <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-cyan-300/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-28 left-1/2 h-56 w-72 -translate-x-1/2 rounded-full bg-amber-300/8 blur-3xl" />

      <div className="relative z-10 flex flex-wrap items-start justify-between gap-3">
        {commandCenterSlot ? (
          <div className="min-w-[min(100%,18rem)] flex-1">{commandCenterSlot}</div>
        ) : null}
        <div className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-cyan-100/26 bg-cyan-300/12 px-3 py-1.5 text-[8px] font-black uppercase tracking-[0.14em] text-cyan-50 shadow-[0_0_24px_rgba(34,211,238,0.16)]">
          <span
            aria-hidden="true"
            className="grid h-4 w-4 place-items-center rounded-full border border-cyan-100/34 bg-slate-950/60"
          >
            <svg className="h-2.5 w-2.5" viewBox="0 0 16 16">
              <path
                d="M12.9 5.6A5 5 0 1 0 13 10"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeWidth="1.8"
              />
              <path
                d="M12.7 2.8v3.8H8.9"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.8"
              />
            </svg>
          </span>
          Emote Loop
        </div>
      </div>

      <div className="relative z-10 mt-3 grid min-h-0 flex-1 gap-3">
        <div className="grid min-h-0 gap-2 min-[760px]:grid-cols-[minmax(0,1fr)_minmax(220px,0.56fr)] max-[759px]:grid-cols-1">
          <div className="relative grid min-h-0 gap-1.5 max-[759px]:order-1">
            <AvatarStatusCard bodyMapHref={bodyMapHref} />
            <HyperRealAvatarFigure />
            <AvatarDetailLegend />
          </div>

          <div className="flex min-h-0 flex-col justify-center gap-2 overflow-x-hidden overflow-y-auto pr-1 [scrollbar-width:none] max-[759px]:order-2 [&::-webkit-scrollbar]:hidden">
            <BodyStatStack
              label="Training Categories"
              stats={bodyCommandTrainingStats}
            />
            <BodyStatStack label="Support Signals" stats={bodyCommandSupportStats} />
          </div>
        </div>
      </div>

      <div className="relative z-10 mt-2 flex justify-center">
        <Link
          className="inline-flex min-h-10 w-full items-center justify-center gap-3 rounded-[16px] border border-cyan-100/42 bg-slate-950/58 px-5 text-xs font-black uppercase tracking-[0.18em] text-cyan-50 shadow-[0_18px_38px_rgba(0,0,0,0.3),0_0_30px_rgba(34,211,238,0.2),inset_0_1px_0_rgba(255,255,255,0.1)] transition hover:-translate-y-0.5 hover:border-cyan-100/70 hover:bg-cyan-300/16 active:scale-[0.99] min-[760px]:max-w-[360px]"
          href={bodyMapHref}
        >
          OPEN AVATAR LAB
          <span aria-hidden="true" className="grid h-5 w-5 place-items-center">
            <svg className="h-4 w-4" viewBox="0 0 16 16">
              <path
                d="M3 8h9M8.5 3.5 13 8l-4.5 4.5"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.8"
              />
            </svg>
          </span>
        </Link>
      </div>
    </div>
  );
}
