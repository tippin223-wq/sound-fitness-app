"use client";

import SoundFitnessAvatar from "@/components/dashboard/SoundFitnessAvatar";
import Link from "next/link";

type BodyStatTone = "cyan" | "emerald" | "purple" | "gold";

type BodyStatCardDefinition = {
  icon: string;
  label: string;
  progress: number;
  status: string;
  tone: BodyStatTone;
  value: string;
};

type MuscleFocusTone = "primary" | "secondary" | "stabilizer" | "muted";

type MuscleFocusItem = {
  label: string;
  tone: MuscleFocusTone;
};

type BodyCommandCenterCardProps = {
  bodyMapHref: string;
};

const bodyCommandStats: BodyStatCardDefinition[] = [
  {
    icon: "S",
    label: "Strength",
    progress: 74,
    status: "Advanced",
    tone: "cyan",
    value: "74%",
  },
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
];

const muscleFocusLegend: MuscleFocusItem[] = [
  { label: "Primary", tone: "primary" },
  { label: "Secondary", tone: "secondary" },
  { label: "Stabilizer", tone: "stabilizer" },
  { label: "Not Targeted", tone: "muted" },
];

const statToneClasses: Record<
  BodyStatTone,
  {
    border: string;
    glow: string;
    icon: string;
    text: string;
  }
> = {
  cyan: {
    border: "border-cyan-100/24",
    glow: "shadow-[0_0_24px_rgba(34,211,238,0.16)]",
    icon: "border-cyan-100/30 bg-cyan-300/12 text-cyan-100",
    text: "text-cyan-100",
  },
  emerald: {
    border: "border-emerald-100/22",
    glow: "shadow-[0_0_24px_rgba(52,211,153,0.14)]",
    icon: "border-emerald-100/30 bg-emerald-300/12 text-emerald-100",
    text: "text-emerald-100",
  },
  gold: {
    border: "border-amber-100/26",
    glow: "shadow-[0_0_24px_rgba(251,191,36,0.14)]",
    icon: "border-amber-100/30 bg-amber-300/12 text-amber-100",
    text: "text-amber-100",
  },
  purple: {
    border: "border-fuchsia-100/22",
    glow: "shadow-[0_0_24px_rgba(217,70,239,0.12)]",
    icon: "border-fuchsia-100/30 bg-fuchsia-300/12 text-fuchsia-100",
    text: "text-fuchsia-100",
  },
};

const muscleLegendToneClasses: Record<MuscleFocusTone, string> = {
  muted: "bg-slate-500/42 shadow-[0_0_10px_rgba(148,163,184,0.28)]",
  primary: "bg-amber-300 shadow-[0_0_13px_rgba(250,204,21,0.9)]",
  secondary: "bg-cyan-300 shadow-[0_0_13px_rgba(34,211,238,0.86)]",
  stabilizer: "bg-emerald-300 shadow-[0_0_13px_rgba(52,211,153,0.78)]",
};

function BodyStatCard({ stat }: { stat: BodyStatCardDefinition }) {
  const tone = statToneClasses[stat.tone];

  return (
    <div
      className={`relative overflow-hidden rounded-[16px] border ${tone.border} bg-slate-950/50 p-2.5 ${tone.glow} backdrop-blur-xl`}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(255,255,255,0.12),transparent_30%),linear-gradient(135deg,rgba(15,23,42,0.16),rgba(2,6,23,0.42))]" />
      <div className="relative z-10 flex items-center gap-2.5">
        <span
          aria-hidden="true"
          className={`grid h-8 w-8 shrink-0 place-items-center rounded-[13px] border text-[10px] font-black ${tone.icon}`}
        >
          {stat.icon}
        </span>
        <span className="min-w-0">
          <span className="block truncate text-[9px] font-black uppercase tracking-[0.16em] text-slate-500">
            {stat.label}
          </span>
          <span className="mt-0.5 block truncate text-[10px] font-black uppercase tracking-[0.12em] text-slate-300">
            {stat.status}
          </span>
        </span>
        <span className={`ml-auto shrink-0 text-lg font-black ${tone.text}`}>
          {stat.value}
        </span>
      </div>
      <div className="relative z-10 mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-800/90">
        <div
          className="h-full rounded-full bg-gradient-to-r from-cyan-300 via-sky-300 to-amber-200 shadow-[0_0_14px_rgba(34,211,238,0.35)]"
          style={{ width: `${stat.progress}%` }}
        />
      </div>
    </div>
  );
}

function AvatarStatusCard({ bodyMapHref }: { bodyMapHref: string }) {
  return (
    <div className="relative z-20 mx-auto w-full max-w-[300px] overflow-hidden rounded-[16px] border border-cyan-100/18 bg-slate-950/66 p-2.5 text-left shadow-[0_18px_40px_rgba(0,0,0,0.26),0_0_24px_rgba(34,211,238,0.12),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl">
      <div className="pointer-events-none absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-cyan-100/64 to-transparent" />
      <div className="text-[8px] font-black uppercase tracking-[0.2em] text-cyan-100/70">
        3D Avatar State
      </div>
      <div className="mt-1 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-base font-black leading-none text-white">
            Sound Hero Avatar
          </div>
          <div className="mt-1 truncate text-[9px] font-bold uppercase tracking-[0.12em] text-slate-400">
            Emotes / Armor / Body Map
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

function MuscleFocusLegend() {
  return (
    <div className="mx-auto flex w-full max-w-[360px] flex-wrap items-center justify-center gap-1.5 rounded-full border border-white/10 bg-slate-950/48 px-2.5 py-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.07)] backdrop-blur">
      {muscleFocusLegend.map((item) => (
        <span
          className="inline-flex items-center gap-1.5 text-[7px] font-black uppercase tracking-[0.1em] text-slate-300"
          key={item.label}
        >
          <span
            aria-hidden="true"
            className={`h-1.5 w-1.5 rounded-full ${muscleLegendToneClasses[item.tone]}`}
          />
          {item.label}
        </span>
      ))}
    </div>
  );
}

function HologramAnatomyFigure() {
  return (
    <SoundFitnessAvatar
      activeZones={["shoulders", "chest", "core"]}
      animationPreset="idle"
      className="mx-auto h-[204px] min-h-[164px] w-full max-w-[372px] rounded-[22px]"
      emotePreset="wave"
      exerciseLabel="3D Hero Avatar"
      showAnatomyHighlights
      showSkeletonOverlay={false}
      showZoneLabels
    />
  );
}

export default function BodyCommandCenterCard({
  bodyMapHref,
}: BodyCommandCenterCardProps) {
  const leftStats = bodyCommandStats.slice(0, 2);
  const rightStats = bodyCommandStats.slice(2);

  return (
    <div className="dashboard-hero-card dashboard-hero-card--body-command relative z-10 flex h-full min-h-0 w-full max-w-full flex-col overflow-hidden rounded-[30px] border border-cyan-100/22 bg-[radial-gradient(circle_at_50%_-8%,rgba(34,211,238,0.24),transparent_34%),radial-gradient(circle_at_9%_32%,rgba(56,189,248,0.18),transparent_30%),radial-gradient(circle_at_90%_22%,rgba(251,191,36,0.13),transparent_27%),linear-gradient(135deg,rgba(8,13,26,0.98),rgba(2,6,23,0.94))] p-3 shadow-[0_30px_82px_rgba(0,0,0,0.54),0_0_54px_rgba(34,211,238,0.16),inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-xl max-[759px]:min-h-[420px] max-[759px]:overflow-y-auto">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(125,211,252,0.075)_1px,transparent_1px),linear-gradient(180deg,rgba(125,211,252,0.055)_1px,transparent_1px)] bg-[length:38px_38px] opacity-55" />
      <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-cyan-100/80 to-transparent" />
      <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-cyan-300/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-28 left-1/2 h-56 w-72 -translate-x-1/2 rounded-full bg-amber-300/8 blur-3xl" />

      <div className="relative z-10 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[9px] font-black uppercase tracking-[0.24em] text-amber-100/82">
            3D Avatar Command Rig
          </div>
          <h2 className="mt-1 break-words text-[clamp(1.55rem,3.25vw,2.65rem)] font-black uppercase leading-none tracking-normal text-white [text-shadow:0_0_24px_rgba(34,211,238,0.2)]">
            BODY COMMAND CENTER
          </h2>
        </div>
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

      <div className="relative z-10 mt-2 grid min-h-0 flex-1 gap-2 min-[760px]:grid-cols-[minmax(118px,0.82fr)_minmax(0,1.68fr)_minmax(118px,0.82fr)] max-[759px]:grid-cols-1">
        <div className="grid min-h-0 gap-2 max-[759px]:order-2 max-[759px]:grid-cols-2 max-[520px]:grid-cols-1">
          {leftStats.map((stat) => (
            <BodyStatCard key={stat.label} stat={stat} />
          ))}
        </div>

        <div className="relative grid min-h-0 gap-1.5 max-[759px]:order-1">
          <AvatarStatusCard bodyMapHref={bodyMapHref} />
          <HologramAnatomyFigure />
          <MuscleFocusLegend />
        </div>

        <div className="grid min-h-0 gap-2 max-[759px]:order-3 max-[759px]:grid-cols-2 max-[520px]:grid-cols-1">
          {rightStats.map((stat) => (
            <BodyStatCard key={stat.label} stat={stat} />
          ))}
        </div>
      </div>

      <div className="relative z-10 mt-2 flex justify-center">
        <Link
          className="inline-flex min-h-10 w-full items-center justify-center gap-3 rounded-[16px] border border-cyan-100/42 bg-slate-950/58 px-5 text-xs font-black uppercase tracking-[0.18em] text-cyan-50 shadow-[0_18px_38px_rgba(0,0,0,0.3),0_0_30px_rgba(34,211,238,0.2),inset_0_1px_0_rgba(255,255,255,0.1)] transition hover:-translate-y-0.5 hover:border-cyan-100/70 hover:bg-cyan-300/16 active:scale-[0.99] min-[760px]:max-w-[360px]"
          href={bodyMapHref}
        >
          OPEN BODY MAP
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
