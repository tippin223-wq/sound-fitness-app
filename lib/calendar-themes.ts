/* THE CALENDAR'S LOOK, AS DATA.
 *
 * Split out of components/calendar-theme so the SERVER can hold the same
 * list. The member's choice is stored in their record now, and a store that
 * cannot say which ids exist would either take any string the browser sent or
 * duplicate the list and drift from it. Neither is worth a file this small.
 *
 * Nothing here imports React on purpose - it is read by a "use client"
 * component, by a server-only store, and by a route handler.
 */

import { SEASONAL_CALENDAR_PHOTOS_BY_MONTH } from "@/lib/calendar-seasonal-photos";

export type CalendarTheme = {
  id: string;
  label: string;
  /** The photo behind the grid, from /public/images. */
  src: string;
  /** Borders, the open day, the day being hovered - picked out of the photo
      so the frame and the picture agree. */
  accent: string;
  /** Today's ring, which is deliberately not the accent: "today" and "the day
      you have open" are different things and need telling apart. */
  today: string;
  /** Seasonal is resolved from the viewed month and year at render time. */
  seasonal?: boolean;
};

export const CALENDAR_MONTH_COLORS = [
  "#9edcff", // January · ice
  "#f6a9cf", // February · rose
  "#8fe0bd", // March · new green
  "#c8b5ff", // April · lilac rain
  "#8ee59d", // May · leaf
  "#f5d276", // June · sun
  "#ff9f78", // July · coral
  "#ffc06b", // August · amber
  "#e8a56e", // September · copper
  "#ff8a5b", // October · ember
  "#d7a0df", // November · plum
  "#a8e6ef", // December · frost
] as const;

export function calendarMonthColor(monthIndex: number) {
  return CALENDAR_MONTH_COLORS[monthIndex] ?? CALENDAR_MONTH_COLORS[0];
}

export const CALENDAR_THEMES: CalendarTheme[] = [
  {
    id: "seasonal",
    label: "Seasonal · auto",
    src: SEASONAL_CALENDAR_PHOTOS_BY_MONTH[0][0],
    accent: CALENDAR_MONTH_COLORS[0],
    today: "#ffffff",
    seasonal: true,
  },
  {
    id: "training",
    label: "Training",
    src: "/images/hero-training.jpg",
    accent: "#8ed8f8",
    today: "#ffbd78",
  },
  {
    id: "seattle",
    label: "Seattle",
    src: "/images/locations/seattle.jpg",
    accent: "#ffbd78",
    today: "#8ed8f8",
  },
  {
    id: "lake",
    label: "Lake Sammamish",
    src: "/images/locations/lake-sammamish.jpg",
    accent: "#86efac",
    today: "#ffbd78",
  },
  {
    id: "stretch",
    label: "Assisted stretch",
    src: "/images/services/assisted-stretch.jpg",
    accent: "#80d2ff",
    today: "#ffbd78",
  },
  {
    id: "recovery",
    label: "Recovery",
    src: "/images/services/mobility-recovery.jpg",
    accent: "#f484d6",
    today: "#ffbd78",
  },
];

export const DEFAULT_CALENDAR_THEME_ID = "training";

/** Resolve the one photograph needed for the viewed month. Ten variants per
 * month are keyed by the final digit of the year, producing a deterministic
 * 120-photo sequence that repeats only after ten years. The month accent is
 * applied to every theme, not just Seasonal, so changing a preferred photo
 * never opts the member out of the calendar's month language. */
export function resolveCalendarTheme(
  theme: CalendarTheme,
  monthKey: string,
): CalendarTheme {
  const [rawYear, rawMonth] = monthKey.split("-").map(Number);
  const monthIndex = Math.min(11, Math.max(0, (rawMonth || 1) - 1));
  const yearSlot = ((rawYear || 0) % 10 + 10) % 10;
  const accent = calendarMonthColor(monthIndex);

  return {
    ...theme,
    src: theme.seasonal
      ? SEASONAL_CALENDAR_PHOTOS_BY_MONTH[monthIndex][yearSlot]
      : theme.src,
    accent,
  };
}

/* HOW STRONGLY THE PHOTO SHOWS THROUGH.
 *
 * 0.4 was the hard-coded opacity-40 this replaces, so a member who never
 * touches the slider sees exactly what they saw before.
 *
 * THE CAP USED TO BE 0.75 AND THAT WAS THE WRONG DIAL. The reasoning was
 * sound - a month grid is small text over a photograph and the numbers have
 * to stay readable - but the photo's opacity was never what was holding it
 * back. A scrim sits ABOVE the picture at 0.72-0.9 alpha, so what actually
 * reaches the eye is opacity x (1 - scrim): at the old maximum that was 21%
 * of the photograph at the top corner and 7.5% at the bottom. The slider
 * already read 100% there. Joey asked for more and was right that there was
 * more to give; raising the cap alone would have moved 21% to 28%.
 *
 * So the cap is 1 and the SCRIM is what now yields - see CALENDAR_SCRIM. The
 * floor is 0, which is still a legitimate answer: no picture at all. */
export const DEFAULT_CALENDAR_OPACITY = 0.4;
export const CALENDAR_OPACITY_MAX = 1;

/* THE DARK WASH BETWEEN THE PHOTO AND THE TYPE.
 *
 * Two stops of a 150deg gradient, given as alphas so they can be computed.
 * It eases from `rest` to `full` as the member turns the photo up, which is
 * what makes "more visible" actually mean something.
 *
 * `rest` is exactly what shipped, and it applies at and below the default -
 * a member who never touches the slider sees no change at all.
 *
 * `full` IS A CONTRAST FLOOR, NOT A TASTE CALL. The calendar sets white and
 * near-white type over this, and the worst case is a white pixel in a bright
 * photograph at full strength. Measured as real sRGB luminance over all three
 * channels, white text lands at:
 *
 *     alpha 0.55 -> 4.23:1   under
 *     alpha 0.58 -> 4.68:1   clears
 *     alpha 0.62 -> 5.39:1
 *
 * 0.55 is the number a grey approximation gives and it is WRONG here: this
 * wash is blue (4,16,36), and blue carries so little luminance that the eye
 * reads the result lighter than a grey of the same alpha. Trusting the
 * shortcut shipped a floor a tenth of a ratio under the line.
 *
 * Everything above the floor is preference. The floor itself is not, and
 * lowering it is how this quietly breaks for whoever picks the sunniest
 * photograph - which is exactly who turns the slider up. */
export const CALENDAR_SCRIM = {
  restTop: 0.72,
  restBottom: 0.9,
  fullTop: 0.58,
  fullBottom: 0.62,
};

/* HOW FAR THE MEMBER HAS PUSHED THE PHOTO, 0 at the default and 1 at full.
   Nothing eases until past the default, so the calendar a member has always
   seen is the calendar they keep. */
function strengthProgress(opacity: number) {
  const span = CALENDAR_OPACITY_MAX - DEFAULT_CALENDAR_OPACITY;

  return Math.min(1, Math.max(0, (opacity - DEFAULT_CALENDAR_OPACITY) / span));
}

/** The scrim gradient for a given photo strength. Held here rather than in
    the component so a guardrail can check the floor without rendering. */
export function calendarScrim(opacity: number) {
  const t = strengthProgress(opacity);
  const top = CALENDAR_SCRIM.restTop - (CALENDAR_SCRIM.restTop - CALENDAR_SCRIM.fullTop) * t;
  const bottom =
    CALENDAR_SCRIM.restBottom - (CALENDAR_SCRIM.restBottom - CALENDAR_SCRIM.fullBottom) * t;

  return `linear-gradient(150deg, rgba(4, 16, 36, ${top.toFixed(3)}), rgba(2, 7, 19, ${bottom.toFixed(3)}))`;
}

/* THE TYPE FIRMS UP AS THE PICTURE COMES FORWARD.
 *
 * An ordinary day number is white at half strength - the quiet end of a scale
 * whose loud end is a day with something booked. Half-strength white is fine
 * over a wash at 0.9 and is NOT fine over one at 0.58: measured against a
 * white pixel in a photograph it lands near 2:1, which is not a contrast
 * ratio so much as a rumour of one.
 *
 * The obvious answer is to stop lowering the scrim, and it costs the whole
 * point of the change - holding 4.5:1 with half-strength ink means a floor
 * around 0.8, which is most of the way back to where this started. The type
 * is the other half of the ratio and nothing says it has to stay still: at
 * full strength the numbers go fully opaque, which buys the contrast back
 * without buying back the murk. A member who turns the photograph up gets a
 * bolder calendar over it, which is what they were asking for anyway. */
export const CALENDAR_INK = { rest: 0.5, full: 1 };

/** The ordinary day number's colour at a given photo strength. */
export function calendarDayInk(opacity: number) {
  const alpha =
    CALENDAR_INK.rest + (CALENDAR_INK.full - CALENDAR_INK.rest) * strengthProgress(opacity);

  return `rgb(255 255 255 / ${alpha.toFixed(3)})`;
}

export function isCalendarThemeId(value: unknown): value is string {
  return CALENDAR_THEMES.some((theme) => theme.id === value);
}

/** Out-of-range and non-numeric both land on the default rather than on 0: a
    calendar with no photo is a choice, not something a bad value should
    silently make for the member. */
export function clampCalendarOpacity(value: unknown) {
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric)) return DEFAULT_CALENDAR_OPACITY;

  return Math.min(CALENDAR_OPACITY_MAX, Math.max(0, numeric));
}
