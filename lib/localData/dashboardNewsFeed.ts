import { ROUTES, type InternalHref } from "@/lib/routes";

/**
 * Sound Fitness news feed — the page that opens off the LEFT edge of the
 * dashboard hero deck (virtual card index -1), like the news feed a phone
 * launcher keeps one swipe left of the home screen.
 *
 * Two kinds today: Sound Fitness `event`s (bookable, dated) and fitness
 * `world` headlines (original one-line summaries with a source NAME only —
 * never an outlet's own copy). `getDashboardNewsFeed()` is the loader seam:
 * swap its body for a route-handler fetch or a Supabase read later and the
 * dashboard keeps working unchanged.
 */

export type DashboardNewsFeedKind = "event" | "world";
/** Subset of the dashboard page's DashboardCardTone — indexes its tone styles. */
export type DashboardNewsFeedTone = "amber" | "cyan" | "emerald" | "sky" | "violet";
export type DashboardNewsFeedFilter = "all" | "events" | "world";

export type DashboardNewsFeedEvent = {
  /** ISO 8601 with offset. */
  startsAt: string;
  endsAt?: string;
  location: string;
  capacity?: number;
  /** Undefined = open enrolment, 0 = waitlist. */
  spotsLeft?: number;
  price?: string;
};

export type DashboardNewsFeedItem = {
  id: string;
  kind: DashboardNewsFeedKind;
  tone: DashboardNewsFeedTone;
  title: string;
  summary: string;
  /** ISO 8601 with offset. */
  publishedAt: string;
  /** Outlet / organisation / author name only. */
  source?: string;
  href?: InternalHref;
  hrefLabel?: string;
  event?: DashboardNewsFeedEvent;
};

export type DashboardNewsFeed = {
  updatedAt: string;
  items: DashboardNewsFeedItem[];
};

export const DASHBOARD_NEWS_FEED_FILTERS = [
  { id: "all", label: "All", kinds: ["event", "world"] },
  { id: "events", label: "Events", kinds: ["event"] },
  { id: "world", label: "World", kinds: ["world"] },
] as const satisfies ReadonlyArray<{
  id: DashboardNewsFeedFilter;
  label: string;
  kinds: readonly DashboardNewsFeedKind[];
}>;

/** Studio clock. Events are announced in Sound Fitness local time. */
export const DASHBOARD_NEWS_TIME_ZONE = "America/Los_Angeles";

export const DASHBOARD_NEWS_FEED_SEED: DashboardNewsFeed = {
  updatedAt: "2026-09-03T07:00:00-07:00",
  items: [
    {
      id: "evt-waterfront-5k",
      kind: "event",
      tone: "emerald",
      title: "Waterfront 5K + Bootcamp Finisher",
      summary:
        "Easy-pace group 5K along the water, then a 20-minute bodyweight finisher and coffee.",
      publishedAt: "2026-09-02T09:00:00-07:00",
      source: "Sound Fitness",
      href: ROUTES.dashboard.sessionBooking,
      hrefLabel: "Book",
      event: {
        startsAt: "2026-09-12T08:00:00-07:00",
        endsAt: "2026-09-12T09:30:00-07:00",
        location: "Ruston Way waterfront",
        capacity: 40,
        spotsLeft: 11,
        price: "Free for members",
      },
    },
    {
      id: "evt-mobility-clinic",
      kind: "event",
      tone: "cyan",
      title: "Hips & Shoulders Mobility Clinic",
      summary:
        "Ninety minutes on the two joints that decide how your squat and press feel.",
      publishedAt: "2026-09-01T12:00:00-07:00",
      source: "Sound Fitness",
      href: ROUTES.dashboard.sessionBooking,
      hrefLabel: "Book",
      event: {
        startsAt: "2026-09-19T10:00:00-07:00",
        endsAt: "2026-09-19T11:30:00-07:00",
        location: "Sound Fitness studio",
        capacity: 16,
        spotsLeft: 3,
        price: "$15 drop-in, free with a plan",
      },
    },
    {
      id: "evt-deadlift-day",
      kind: "event",
      tone: "amber",
      title: "Member Deadlift Day",
      summary:
        "Work up to a clean heavy single with coach eyes on every rep; the PR board updates live.",
      publishedAt: "2026-08-30T15:00:00-07:00",
      source: "Sound Fitness",
      href: ROUTES.dashboard.sessionBooking,
      hrefLabel: "Book",
      event: {
        startsAt: "2026-09-26T09:00:00-07:00",
        endsAt: "2026-09-26T12:00:00-07:00",
        location: "Sound Fitness studio",
        capacity: 24,
        spotsLeft: 24,
        price: "Members only",
      },
    },
    {
      id: "evt-fall-open-house",
      kind: "event",
      tone: "sky",
      title: "Fall Kickoff Open House",
      summary:
        "Bring a friend: free assessments, a demo class every hour, and fall plan pricing.",
      publishedAt: "2026-08-28T10:00:00-07:00",
      source: "Sound Fitness",
      href: ROUTES.dashboard.calendar,
      hrefLabel: "Details",
      event: {
        startsAt: "2026-10-04T12:00:00-07:00",
        endsAt: "2026-10-04T15:00:00-07:00",
        location: "Sound Fitness studio",
        price: "Free, open to guests",
      },
    },
    {
      id: "world-strength-longevity",
      kind: "world",
      tone: "cyan",
      source: "Strength research roundup",
      title:
        "Twice-weekly strength training tied to lower all-cause mortality in a new cohort analysis",
      summary:
        "A large cohort analysis reports two resistance sessions a week track with better long-term survival, independent of cardio volume.",
      publishedAt: "2026-09-03T06:30:00-07:00",
    },
    {
      id: "world-shoe-rules",
      kind: "world",
      tone: "sky",
      source: "Road running bulletin",
      title:
        "Governing body tightens shoe stack-height rules ahead of fall marathon season",
      summary:
        "Updated equipment rules cap midsole thickness for road events, retiring a few current racing models from elite starts.",
      publishedAt: "2026-09-02T14:10:00-07:00",
    },
    {
      id: "world-wearable-recovery",
      kind: "world",
      tone: "violet",
      source: "Wearables industry brief",
      title:
        "Wearable makers race to ship recovery scores while validation studies lag",
      summary:
        "Readiness metrics are now standard on flagship wearables, but independent accuracy testing remains thin.",
      publishedAt: "2026-09-02T08:45:00-07:00",
    },
    {
      id: "world-heat-guidance",
      kind: "world",
      tone: "amber",
      source: "Public health advisory",
      title:
        "New heat-illness guidance urges longer acclimatisation for late-summer training",
      summary:
        "Updated recommendations call for a 10-14 day ramp when heat waves overlap with hard training blocks.",
      publishedAt: "2026-09-01T11:20:00-07:00",
    },
    {
      id: "world-creatine-cognition",
      kind: "world",
      tone: "emerald",
      source: "Nutrition science digest",
      title:
        "Creatine's cognitive benefits gain support in a fresh meta-analysis",
      summary:
        "Pooled trials suggest a modest boost to memory tasks under sleep loss, adding to the supplement's strength case.",
      publishedAt: "2026-08-31T09:00:00-07:00",
    },
  ],
};

/**
 * Loader seam. Today: the static seed. Later: a route-handler fetch or a
 * Supabase `dashboard_news` read; callers keep `useState(() => getDashboardNewsFeed())`
 * as the initial value and add one effect that replaces it.
 */
export const getDashboardNewsFeed = (): DashboardNewsFeed =>
  DASHBOARD_NEWS_FEED_SEED;

export const filterDashboardNewsFeed = (
  items: readonly DashboardNewsFeedItem[],
  filter: DashboardNewsFeedFilter,
) => {
  const kinds: readonly DashboardNewsFeedKind[] =
    DASHBOARD_NEWS_FEED_FILTERS.find((entry) => entry.id === filter)?.kinds ??
    DASHBOARD_NEWS_FEED_FILTERS[0].kinds;
  return items.filter((item) => kinds.includes(item.kind));
};

const isUpcomingEvent = (item: DashboardNewsFeedItem, now: Date) =>
  Boolean(item.event) && new Date(item.event!.startsAt).getTime() >= now.getTime();

/** The soonest event that has not started yet, or null. `now` is passed in so render never calls `new Date()`. */
export const getDashboardNewsNextEvent = (
  items: readonly DashboardNewsFeedItem[],
  now: Date,
) =>
  items
    .filter((item) => isUpcomingEvent(item, now))
    .sort((a, b) => a.event!.startsAt.localeCompare(b.event!.startsAt))[0] ??
  null;

/** "Up next" event first, then newest first. */
export const sortDashboardNewsFeed = (
  items: readonly DashboardNewsFeedItem[],
  now: Date,
) => {
  const nextEvent = getDashboardNewsNextEvent(items, now);
  return [...items].sort((a, b) => {
    if (nextEvent) {
      if (a.id === nextEvent.id) return -1;
      if (b.id === nextEvent.id) return 1;
    }
    return b.publishedAt.localeCompare(a.publishedAt);
  });
};

const newsBadgeFormatter = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "short",
  timeZone: DASHBOARD_NEWS_TIME_ZONE,
  weekday: "short",
});

const newsTimeFormatter = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
  timeZone: DASHBOARD_NEWS_TIME_ZONE,
});

/** Weekday / day / month pieces for the 44px date badge; dashes for an unparseable date. */
export const formatDashboardNewsEventBadge = (iso: string) => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return { day: "--", month: "", weekday: "" };
  }
  const parts = newsBadgeFormatter.formatToParts(date);
  const read = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  return { day: read("day"), month: read("month"), weekday: read("weekday") };
};

/** "8:00 AM – 9:30 AM" (or just the start). */
export const formatDashboardNewsEventWindow = (event: DashboardNewsFeedEvent) => {
  const start = new Date(event.startsAt);
  if (Number.isNaN(start.getTime())) return "Time to be confirmed";
  const startLabel = newsTimeFormatter.format(start);
  if (!event.endsAt) return startLabel;
  const end = new Date(event.endsAt);
  if (Number.isNaN(end.getTime())) return startLabel;
  return `${startLabel} – ${newsTimeFormatter.format(end)}`;
};

/** Spots chip copy + tone: open enrolment, waitlist, nearly full, or "n of capacity". */
export const formatDashboardNewsSpots = (
  event: DashboardNewsFeedEvent,
): { label: string; tone: DashboardNewsFeedTone } => {
  if (event.spotsLeft === undefined) return { label: "Open", tone: "emerald" };
  if (event.spotsLeft <= 0) return { label: "Waitlist", tone: "amber" };
  if (event.spotsLeft <= 3) return { label: `${event.spotsLeft} left`, tone: "amber" };
  if (event.capacity) {
    return { label: `${event.spotsLeft} of ${event.capacity} left`, tone: "cyan" };
  }
  return { label: `${event.spotsLeft} left`, tone: "cyan" };
};
