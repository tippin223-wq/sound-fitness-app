"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef } from "react";

export type AchievementBadgeCategory =
  | "consistency"
  | "intensity"
  | "recovery";

export type AchievementBadgeStatus =
  | "active"
  | "completed"
  | "default"
  | "locked";

export type AchievementBadgeItem = {
  actionLabel?: string;
  category: AchievementBadgeCategory;
  description?: string;
  href?: string;
  icon: string;
  label: string;
  meta?: string;
  progress?: number;
  rarity?: "bronze" | "cyan" | "elite" | "gold" | "silver";
  status?: AchievementBadgeStatus;
  statusLabel?: string;
  variant?: "badge" | "cta";
};

type SoundAchievementBadgeRowProps = {
  actionHref?: string;
  actionLabel?: string;
  className?: string;
  compact?: boolean;
  controlsAlwaysVisible?: boolean;
  eyebrow?: string;
  items: AchievementBadgeItem[];
  title?: string;
};

const badgeShape = {
  clipPath:
    "polygon(50% 0%, 64% 12%, 88% 17%, 85% 66%, 50% 100%, 15% 66%, 12% 17%, 36% 12%)",
} as const;

const innerBadgeShape = {
  clipPath:
    "polygon(50% 5%, 62% 16%, 82% 20%, 79% 62%, 50% 88%, 21% 62%, 18% 20%, 38% 16%)",
} as const;

const categoryStyles: Record<
  AchievementBadgeCategory,
  {
    badge: string;
    card: string;
    glow: string;
    iconGlow: string;
    iconWell: string;
    rail: string;
    ring: string;
    trim: string;
  }
> = {
  consistency: {
    badge:
      "from-emerald-200/36 via-lime-300/18 to-slate-950 border-emerald-100/44 text-emerald-50",
    card: "border-emerald-300/24 bg-emerald-300/9 text-emerald-50",
    glow: "shadow-[0_0_30px_rgba(16,185,129,0.18)]",
    iconGlow: "bg-emerald-200/22 shadow-[0_0_22px_rgba(110,231,183,0.28)]",
    iconWell: "from-emerald-950/86 via-emerald-900/52 to-lime-300/12",
    rail: "bg-emerald-300/65",
    ring: "rgba(110,231,183,0.92)",
    trim: "via-emerald-100/66",
  },
  intensity: {
    badge:
      "from-rose-200/42 via-red-300/22 to-slate-950 border-rose-100/52 text-rose-50",
    card: "border-rose-300/28 bg-rose-300/10 text-rose-50",
    glow: "shadow-[0_0_34px_rgba(248,113,113,0.22)]",
    iconGlow: "bg-rose-200/24 shadow-[0_0_24px_rgba(248,113,113,0.32)]",
    iconWell: "from-rose-950/86 via-red-900/52 to-rose-300/14",
    rail: "bg-rose-300/70",
    ring: "rgba(248,113,113,0.96)",
    trim: "via-rose-100/72",
  },
  recovery: {
    badge:
      "from-yellow-100/42 via-amber-200/22 to-slate-950 border-yellow-100/52 text-yellow-50",
    card: "border-yellow-300/28 bg-yellow-300/10 text-yellow-50",
    glow: "shadow-[0_0_34px_rgba(250,204,21,0.2)]",
    iconGlow: "bg-yellow-100/24 shadow-[0_0_24px_rgba(250,204,21,0.32)]",
    iconWell: "from-amber-950/86 via-yellow-900/50 to-yellow-300/14",
    rail: "bg-yellow-300/70",
    ring: "rgba(250,204,21,0.95)",
    trim: "via-yellow-100/72",
  },
};

const rarityTrim: Record<NonNullable<AchievementBadgeItem["rarity"]>, string> = {
  bronze: "after:bg-gradient-to-r after:from-transparent after:via-orange-200/42 after:to-transparent",
  cyan: "after:bg-gradient-to-r after:from-transparent after:via-cyan-100/55 after:to-transparent",
  elite: "after:bg-gradient-to-r after:from-transparent after:via-fuchsia-100/58 after:to-transparent",
  gold: "after:bg-gradient-to-r after:from-transparent after:via-amber-100/60 after:to-transparent",
  silver: "after:bg-gradient-to-r after:from-transparent after:via-slate-100/55 after:to-transparent",
};

const statusStyles: Record<AchievementBadgeStatus, string> = {
  active:
    "ring-1 ring-cyan-100/20 shadow-[0_0_30px_rgba(34,211,238,0.2)]",
  completed:
    "ring-1 ring-amber-100/16 shadow-[0_0_30px_rgba(250,204,21,0.13)]",
  default: "",
  locked: "opacity-55 grayscale-[0.45]",
};

const clampProgress = (value: number) => Math.min(Math.max(value, 0), 100);

const normalizeAchievementCategory = (
  category: unknown,
): AchievementBadgeCategory => {
  if (category === "recovery" || category === "nutrition") return "recovery";
  if (category === "consistency" || category === "goal" || category === "streak") {
    return "consistency";
  }
  if (category === "intensity" || category === "performance" || category === "volume") {
    return "intensity";
  }

  return "intensity";
};

const getAchievementProgress = (item: AchievementBadgeItem) => {
  if (typeof item.progress === "number") return clampProgress(item.progress);
  if (item.status === "completed") return 100;
  if (item.status === "locked") return 0;
  if (item.status === "active") return 50;
  return 0;
};

export function SoundLogoAchievementBadge({
  compact = false,
  item,
}: {
  compact?: boolean;
  item: AchievementBadgeItem;
}) {
  const category = normalizeAchievementCategory(item.category);
  const tone = categoryStyles[category];
  const status = item.status || "default";
  const progress = getAchievementProgress(item);
  const completed = status === "completed" || progress >= 100;
  const locked = status === "locked";
  const rarity =
    item.rarity ||
    (completed
      ? "gold"
      : status === "active"
        ? "cyan"
        : locked
          ? "silver"
          : "bronze");
  const size = compact ? "h-[54px] w-12 text-lg" : "h-[72px] w-16 text-2xl";
  const iconWellSize = compact ? "h-8 w-8" : "h-11 w-11";
  const logoSize = compact ? "62px" : "82px";
  const ringSize = compact ? "h-[68px] w-[68px]" : "h-[92px] w-[92px]";
  const ringColor = locked
    ? "rgba(148,163,184,0.22)"
    : completed
      ? "rgba(250,204,21,0.98)"
      : tone.ring;
  const ringTrack = locked ? "rgba(15,23,42,0.88)" : "rgba(148,163,184,0.16)";
  const ringLabel = completed
    ? "✓"
    : locked
      ? "🔒"
      : `${Math.round(progress)}%`;

  return (
    <span
      aria-hidden="true"
      className={`relative grid shrink-0 place-items-center rounded-full p-[3px] ${ringSize} ${
        completed
          ? "shadow-[0_0_30px_rgba(250,204,21,0.22)]"
          : status === "active"
            ? "shadow-[0_0_28px_rgba(34,211,238,0.18)]"
            : ""
      }`}
      style={{
        background: `conic-gradient(${ringColor} ${progress * 3.6}deg, ${ringTrack} 0deg)`,
      }}
    >
      <span
        className={`absolute inset-[6px] rounded-full border ${
          completed
            ? "border-amber-100/24 bg-amber-200/8"
            : locked
              ? "border-slate-500/12 bg-slate-950/62"
              : "border-cyan-100/14 bg-slate-950/58"
        }`}
      />
      <span
        className={`relative grid place-items-center overflow-hidden border bg-gradient-to-br ${size} ${tone.badge} ${tone.glow} after:absolute after:left-[-55%] after:top-[13%] after:h-[78%] after:w-[44%] after:-rotate-12 after:opacity-0 after:blur-[1px] after:transition after:delay-150 after:duration-700 group-hover/badge:after:translate-x-[310%] group-hover/badge:after:opacity-70 ${rarityTrim[rarity]}`}
        style={badgeShape}
      >
        <span className="absolute inset-0 bg-[radial-gradient(circle_at_50%_36%,rgba(255,255,255,0.22),transparent_20%),linear-gradient(135deg,rgba(255,255,255,0.16),transparent_36%,rgba(0,0,0,0.42)_82%)]" />
        <span
          className="absolute inset-[3px] border border-slate-950/70 bg-slate-950/44 shadow-[inset_0_1px_0_rgba(255,255,255,0.16),inset_0_-16px_24px_rgba(0,0,0,0.3)]"
          style={innerBadgeShape}
        />
        <Image
          src="/sound-fitness-logo.png"
          alt=""
          width={compact ? 62 : 82}
          height={compact ? 62 : 82}
          sizes={logoSize}
          className="absolute left-1/2 top-1/2 max-w-none -translate-x-1/2 -translate-y-1/2 scale-125 object-cover opacity-[0.055] saturate-150 contrast-125"
        />
        <span
          className={`absolute ${iconWellSize} rounded-[18px] border border-white/18 bg-gradient-to-br ${tone.iconWell} shadow-[inset_0_2px_4px_rgba(255,255,255,0.13),inset_0_-10px_16px_rgba(0,0,0,0.42),0_0_16px_rgba(255,255,255,0.06)]`}
        />
        <span
          className={`absolute ${compact ? "h-7 w-7" : "h-9 w-9"} rounded-full blur-md ${tone.iconGlow}`}
        />
        <span
          className={`absolute inset-x-[18%] top-[14%] h-px bg-gradient-to-r from-transparent ${tone.trim} to-transparent opacity-90`}
        />
        <span
          className={`relative z-10 grid ${compact ? "h-8 w-8" : "h-10 w-10"} place-items-center rounded-full text-center leading-none drop-shadow-[0_2px_8px_rgba(0,0,0,0.72)] [text-shadow:0_1px_0_rgba(255,255,255,0.18),0_3px_10px_rgba(0,0,0,0.8)]`}
        >
          {item.icon}
        </span>
        {locked ? (
          <span className="absolute inset-0 bg-slate-950/28" style={badgeShape} />
        ) : null}
      </span>
      <span
        className={`absolute -bottom-1 right-0 grid ${
          completed ? "h-6 w-6" : "min-w-[2rem] px-1.5"
        } place-items-center rounded-full border text-[9px] font-black leading-none shadow-[0_0_14px_rgba(0,0,0,0.28)] ${
          completed
            ? "border-amber-100/55 bg-amber-200 text-slate-950"
            : locked
              ? "border-white/10 bg-slate-950 text-slate-500"
              : "border-cyan-100/35 bg-slate-950 text-cyan-100"
        }`}
      >
        {ringLabel}
      </span>
    </span>
  );
}

function AchievementCard({
  compact,
  item,
}: {
  compact: boolean;
  item: AchievementBadgeItem;
}) {
  const category = normalizeAchievementCategory(item.category);
  const tone = categoryStyles[category];
  const status = item.status || "default";
  const progress = getAchievementProgress(item);
  const isCta = item.variant === "cta";
  const completed = status === "completed" || progress >= 100;
  const locked = status === "locked";
  const progressLabel = completed
    ? "COMPLETED"
    : locked
      ? "LOCKED"
      : `${Math.round(progress)}% COMPLETE`;
  if (isCta) {
    const ctaContent = (
      <>
        <span className="absolute inset-x-4 top-0 h-px rounded-full bg-gradient-to-r from-transparent via-amber-100/75 to-cyan-100/65" />
        <span className="pointer-events-none absolute -right-10 -top-10 h-24 w-24 rounded-full bg-amber-300/12 blur-2xl transition group-hover/badge:bg-amber-300/18" />
        <SoundLogoAchievementBadge
          compact={compact}
          item={{
            ...item,
            progress: item.progress ?? 100,
            rarity: item.rarity ?? "gold",
            status: item.status ?? "active",
          }}
        />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[11px] font-black uppercase tracking-[0.12em] text-white">
            {item.label}
          </span>
          <span className="mt-0.5 block text-[10px] font-bold leading-4 text-slate-300">
            {item.description || item.meta}
          </span>
          <span className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-amber-100/35 bg-amber-300/14 px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.12em] text-amber-100 shadow-[0_0_18px_rgba(250,204,21,0.12)]">
            {item.actionLabel || "Open"}
            <span aria-hidden="true" className="text-[10px] leading-none">
              -&gt;
            </span>
          </span>
        </span>
      </>
    );
    const ctaClassName = `group/badge relative flex shrink-0 items-center gap-3 overflow-hidden rounded-2xl border border-amber-200/32 bg-[radial-gradient(circle_at_18%_0%,rgba(250,204,21,0.16),transparent_38%),radial-gradient(circle_at_92%_15%,rgba(34,211,238,0.13),transparent_34%),rgba(15,23,42,0.72)] text-amber-50 shadow-[0_0_34px_rgba(250,204,21,0.13),inset_0_1px_0_rgba(255,255,255,0.09)] transition duration-300 hover:-translate-y-0.5 hover:border-cyan-100/42 hover:bg-white/[0.075] hover:shadow-[0_0_42px_rgba(34,211,238,0.16)] active:scale-[0.99] ${
      compact ? "min-w-[198px] px-3 py-2" : "min-w-[272px] px-3.5 py-3"
    }`;

    if (item.href) {
      return (
        <Link href={item.href} className={ctaClassName}>
          {ctaContent}
        </Link>
      );
    }

    return <div className={ctaClassName}>{ctaContent}</div>;
  }

  const className = `group/badge relative flex shrink-0 items-center gap-3 overflow-hidden rounded-2xl border transition duration-300 hover:-translate-y-0.5 hover:bg-white/[0.07] active:scale-[0.99] ${
    compact ? "min-w-[184px] px-3 py-2" : "min-w-[250px] px-3.5 py-3"
  } ${tone.card} ${statusStyles[status]}`;
  const content = (
    <>
      <span
        className={`absolute inset-x-4 top-0 h-px rounded-full ${tone.rail} opacity-80`}
      />
      <SoundLogoAchievementBadge compact={compact} item={item} />
      <span className="min-w-0">
        <span className="block truncate text-[11px] font-black uppercase tracking-[0.12em] text-white">
          {item.label}
        </span>
        {item.meta ? (
          <span className="mt-0.5 block truncate text-[10px] font-bold text-slate-300">
            {item.meta}
          </span>
        ) : null}
        {item.statusLabel ? (
          <span className="mt-1 block truncate text-[9px] font-black uppercase tracking-[0.11em] text-white/55">
            {item.statusLabel}
          </span>
        ) : null}
        <span
          className={`mt-1.5 inline-flex rounded-full border px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.11em] ${
            completed
              ? "border-amber-100/30 bg-amber-300/16 text-amber-100"
              : locked
                ? "border-white/10 bg-white/[0.035] text-slate-500"
                : "border-cyan-100/24 bg-cyan-300/12 text-cyan-100"
          }`}
        >
          {progressLabel}
        </span>
      </span>
    </>
  );

  if (item.href) {
    return (
      <Link href={item.href} className={className}>
        {content}
      </Link>
    );
  }

  return <div className={className}>{content}</div>;
}

export default function SoundAchievementBadgeRow({
  actionHref,
  actionLabel = "View all",
  className = "",
  compact = false,
  controlsAlwaysVisible = false,
  eyebrow,
  items,
  title,
}: SoundAchievementBadgeRowProps) {
  const rowRef = useRef<HTMLDivElement | null>(null);
  const showHeader = Boolean(title || eyebrow || actionHref);

  const scrollBadges = (direction: "left" | "right") => {
    rowRef.current?.scrollBy({
      behavior: "smooth",
      left: direction === "left" ? -320 : 320,
    });
  };

  return (
    <div className={`group/achievement-row max-w-full overflow-hidden ${className}`}>
      {showHeader ? (
        <div className="mb-2 flex items-center justify-between gap-4">
          <div className="min-w-0">
            {eyebrow ? (
              <div className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">
                {eyebrow}
              </div>
            ) : null}
            {title ? (
              <div className="truncate text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                {title}
              </div>
            ) : null}
          </div>

          <div className="flex shrink-0 items-center gap-3">
            {actionHref ? (
              <Link
                href={actionHref}
                className="text-[10px] font-black uppercase tracking-[0.16em] text-amber-200 transition hover:text-amber-100"
              >
                {actionLabel}
              </Link>
            ) : null}
            <div
              className={`flex gap-2 transition delay-150 duration-300 ${
                controlsAlwaysVisible
                  ? "opacity-100"
                  : "opacity-70 sm:opacity-0 sm:group-hover/achievement-row:opacity-100 sm:group-focus-within/achievement-row:opacity-100"
              }`}
            >
              <button
                type="button"
                aria-label="Scroll achievements left"
                onClick={() => scrollBadges("left")}
                className="grid h-8 w-8 place-items-center rounded-xl border border-white/10 bg-slate-950/70 text-[10px] font-black text-slate-300 shadow-[0_0_18px_rgba(0,0,0,0.22)] transition hover:border-cyan-200/40 hover:bg-cyan-300/12 hover:text-cyan-100"
              >
                &lt;
              </button>
              <button
                type="button"
                aria-label="Scroll achievements right"
                onClick={() => scrollBadges("right")}
                className="grid h-8 w-8 place-items-center rounded-xl border border-white/10 bg-slate-950/70 text-[10px] font-black text-slate-300 shadow-[0_0_18px_rgba(0,0,0,0.22)] transition hover:border-amber-200/45 hover:bg-amber-300/12 hover:text-amber-100"
              >
                &gt;
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div
        ref={rowRef}
        className="flex max-w-full gap-2 overflow-x-auto overscroll-x-contain pb-2 scroll-smooth [scrollbar-width:none] [touch-action:pan-x] [&::-webkit-scrollbar]:hidden"
      >
        {items.map((item) => (
          <AchievementCard
            compact={compact}
            item={item}
            key={`${item.label}-${item.category}`}
          />
        ))}
      </div>
    </div>
  );
}
