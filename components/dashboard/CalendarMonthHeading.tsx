"use client";

import { CloudSun, Flower2, Heart, Leaf, Snowflake, Sprout, Sun, Sunset, TreePine, Waves, Wind } from "lucide-react";
import type { CSSProperties, SVGProps } from "react";
import { calendarMonthColor } from "@/lib/calendar-themes";

function PumpkinIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M12 7c-1-2-.5-4 1.5-5M12 6c2-3 4-3 5-2-1 2-3 3-5 2" />
      <path d="M12 7C6 3 2 8 2 14c0 5 4 8 10 7 6 1 10-2 10-7 0-6-4-11-10-7Z" />
      <ellipse cx="12" cy="14" rx="5" ry="7" />
      <path d="M12 7v14" />
    </svg>
  );
}

const MONTH_ICONS = [Snowflake, Heart, Sprout, CloudSun, Flower2, Sun, Waves, Sunset, Leaf, PumpkinIcon, Wind, TreePine] as const;

/** Decorative month artwork, shared by calendar headings and compact date marks. */
export function CalendarMonthIcon({ month, ...props }: SVGProps<SVGSVGElement> & { month: number }) {
  const Icon = MONTH_ICONS[month];
  return Icon ? <Icon aria-hidden="true" {...props} /> : null;
}

/** Compact endpoints retain their own month color across month/year boundaries. */
export function CalendarWeekHeading({ start, end }: { start: Date; end: Date }) {
  const label = `${start.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })} through ${end.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`;
  return <span aria-live="polite" aria-label={label} className="inline-flex min-h-8 items-center justify-center gap-2 text-base font-black sm:text-lg">
    {[start, end].map((date, index) => {
      const accent = calendarMonthColor(date.getMonth());
      return <span key={index} className="inline-flex items-center gap-2 whitespace-nowrap">
        {index === 1 && <span aria-hidden="true" className="text-sm font-semibold text-slate-400">–</span>}
        <span aria-hidden="true" className="inline-flex items-center gap-1.5">
          <span className="relative isolate uppercase tracking-[0.05em]" style={{ color: accent, textShadow: `0 0 16px ${accent}66` }}>
            <CalendarMonthIcon month={date.getMonth()} className="pointer-events-none absolute left-1/2 top-1/2 -z-10 size-10 -translate-x-1/2 -translate-y-1/2" style={{ opacity: .2, filter: `drop-shadow(0 0 10px ${accent}80)` }} />
            {date.toLocaleDateString("en-US", { month: "short" })}
          </span>
          <span className="tabular-nums text-cyan-50">{date.getDate()}</span>
        </span>
      </span>;
    })}
  </span>;
}
const ZODIAC = [
  { name: "Rat", icon: "🐭" }, { name: "Ox", icon: "🐂" },
  { name: "Tiger", icon: "🐯" }, { name: "Rabbit", icon: "🐰" },
  { name: "Dragon", icon: "🐲" }, { name: "Snake", icon: "🐍" },
  { name: "Horse", icon: "🐴" }, { name: "Goat", icon: "🐐" },
  { name: "Monkey", icon: "🐵" }, { name: "Rooster", icon: "🐓" },
  { name: "Dog", icon: "🐶" }, { name: "Pig", icon: "🐷" },
] as const;

/** Shared calendar heading. Month is zero-based, matching Date.getMonth(). */
export function CalendarMonthHeading({ month, year, locale = "en-US", compact = false }: { month: number; year: number; locale?: string; compact?: boolean }) {
  const accent = calendarMonthColor(month);
  const MonthIcon = MONTH_ICONS[month];
  const monthName = new Intl.DateTimeFormat(locale, { month: "long", timeZone: "UTC" }).format(new Date(Date.UTC(year, month, 1)));
  const zodiac = ZODIAC[((year - 2020) % 12 + 12) % 12];
  return (
    <span aria-live="polite" className={`inline-flex flex-wrap items-center justify-center gap-x-2 gap-y-0 ${compact ? "min-h-8" : "min-h-14"}`}>
      <span className={`relative isolate font-black uppercase tracking-[0.05em] ${compact ? "text-base sm:text-lg" : "text-lg sm:text-2xl"}`} style={{ color: accent, textShadow: `0 0 18px ${accent}66` }}>
        <MonthIcon aria-hidden="true" className={`pointer-events-none absolute left-1/2 top-1/2 -z-10 -translate-x-1/2 -translate-y-1/2 ${compact ? "size-10 sm:size-12" : "size-20 sm:size-24"}`} style={{ opacity: 0.2, filter: `drop-shadow(0 0 14px ${accent}80)` }} />
        <span className="relative z-10">{monthName}</span>
      </span>
      <span className={`relative z-10 inline-flex items-center font-semibold tracking-[0.16em] text-white/72 ${compact ? "gap-1 text-xs" : "flex-col text-sm sm:text-base"}`}>
        <span role="img" aria-label={`${year} Chinese New Year: Year of the ${zodiac.name}`} data-sf-tooltip={`${year} · Year of the ${zodiac.name}`} tabIndex={0} className={`inline-block -rotate-6 leading-none tracking-normal drop-shadow-[0_2px_6px_rgba(255,189,120,.35)] transition-transform hover:rotate-6 hover:scale-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#ffbd78] ${compact ? "text-lg" : "mb-0.5 text-2xl"}`} style={{ "--sf-tooltip-color": "#ffbd78" } as CSSProperties}>{zodiac.icon}</span>
        <span>{year}</span>
      </span>
    </span>
  );
}
