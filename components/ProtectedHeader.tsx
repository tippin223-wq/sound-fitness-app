"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ROUTES } from "@/lib/routes";
import { supabase } from "@/lib/supabaseClient";

type ProtectedHeaderRole = "member" | "admin" | "coach";
type Accent = "amber" | "cyan" | "emerald" | "fuchsia" | "orange" | "sky" | "violet";

type MenuItem = {
  accent?: Accent;
  badge?: string;
  disabled?: boolean;
  emoji?: string;
  helper?: string;
  href?: string;
  label: string;
};

type UserProfile = {
  displayName: string;
  email: string;
  initials: string;
  profileImage: string;
};

const soon = "Coming Soon";

const dashboardItems: MenuItem[] = [
  {
    emoji: "📅",
    label: "Sessions",
    href: ROUTES.dashboard.sessions,
    helper: "Workout dashboard, active sessions, and history.",
    accent: "cyan",
    badge: "Primary",
  },
  {
    emoji: "🥗",
    label: "Nutrition",
    href: ROUTES.nutritionPortal.home,
    helper: "Fuel dashboard, meals, macros, hydration, and grocery.",
    accent: "emerald",
  },
  {
    emoji: "⚡",
    label: "Performance",
    href: ROUTES.dashboard.performance,
    helper: "Power, sprint, agility, carries, and conditioning.",
    accent: "orange",
  },
  {
    emoji: "🩹",
    label: "Recovery",
    href: ROUTES.dashboard.recovery,
    helper: "Cooldowns, mobility, soreness, and readiness support.",
    accent: "sky",
  },
  // TODO: Add Learning Dashboard when a dedicated /dashboard/learning route exists.
  {
    emoji: "🎓",
    label: "Learning",
    disabled: true,
    helper: "Future lessons, references, and coaching education.",
    accent: "violet",
    badge: soon,
  },
  // TODO: Add SoundWorld / Games Dashboard when a clear route exists.
  {
    emoji: "🎮",
    label: "SoundWorld",
    disabled: true,
    helper: "Future gamified training and community world.",
    accent: "fuchsia",
    badge: soon,
  },
];

const hubItems: MenuItem[] = [
  {
    emoji: "📊",
    label: "Stats",
    href: ROUTES.dashboard.stats,
    helper: "Training numbers, weekly volume, PRs, trends, and history.",
    accent: "cyan",
  },
  {
    emoji: "🎯",
    label: "Goals",
    href: ROUTES.dashboard.goals,
    helper: "Desired outcomes and app-wide training direction.",
    accent: "amber",
  },
  // TODO: Add Insights when a dedicated /dashboard/insights route exists.
  {
    emoji: "🧠",
    label: "Insights",
    disabled: true,
    helper: "Future cross-page coach intelligence and next actions.",
    accent: "violet",
    badge: soon,
  },
  {
    emoji: "🗂",
    label: "Plan",
    href: ROUTES.dashboard.plan,
    helper: "Weekly structure, templates, and plan-to-calendar flow.",
    accent: "sky",
  },
  // TODO: Add Achievements when /dashboard/achievements exists.
  {
    emoji: "🏆",
    label: "Achievements",
    disabled: true,
    helper: "Future milestones, badges, and progress wins.",
    accent: "orange",
    badge: soon,
  },
  {
    emoji: "💬",
    label: "Messages",
    href: ROUTES.dashboard.coachMessaging,
    helper: "Coach messaging, questions, and training context.",
    accent: "emerald",
  },
];

const accountItems: MenuItem[] = [
  {
    emoji: "👤",
    label: "Profile",
    href: ROUTES.dashboard.profile,
    helper: "Training identity, goals, body metrics, and avatar.",
    accent: "cyan",
  },
  // TODO: Add Settings link when /dashboard/settings exists.
  {
    emoji: "⚙️",
    label: "Settings",
    disabled: true,
    helper: "Future app-level preferences.",
    accent: "violet",
    badge: soon,
  },
  {
    emoji: "💳",
    label: "Billing",
    href: ROUTES.dashboard.payments,
    helper: "Payments and invoice history.",
    accent: "amber",
  },
  // TODO: Add Help link when /dashboard/help or /dashboard/support exists.
  {
    emoji: "💬",
    label: "Help",
    disabled: true,
    helper: "Future help and support center.",
    accent: "emerald",
    badge: soon,
  },
];

const accentStyles: Record<
  Accent,
  { bg: string; border: string; dot: string; glow: string; text: string }
> = {
  amber: {
    bg: "bg-amber-300/10",
    border: "border-amber-300/30",
    dot: "bg-amber-300",
    glow: "shadow-[0_0_24px_rgba(251,191,36,0.16)]",
    text: "text-amber-100",
  },
  cyan: {
    bg: "bg-cyan-300/10",
    border: "border-cyan-300/35",
    dot: "bg-cyan-300",
    glow: "shadow-[0_0_24px_rgba(34,211,238,0.18)]",
    text: "text-cyan-100",
  },
  emerald: {
    bg: "bg-emerald-300/10",
    border: "border-emerald-300/30",
    dot: "bg-emerald-300",
    glow: "shadow-[0_0_24px_rgba(52,211,153,0.14)]",
    text: "text-emerald-100",
  },
  fuchsia: {
    bg: "bg-fuchsia-300/10",
    border: "border-fuchsia-300/30",
    dot: "bg-fuchsia-300",
    glow: "shadow-[0_0_24px_rgba(217,70,239,0.14)]",
    text: "text-fuchsia-100",
  },
  orange: {
    bg: "bg-orange-300/10",
    border: "border-orange-300/30",
    dot: "bg-orange-300",
    glow: "shadow-[0_0_24px_rgba(251,146,60,0.15)]",
    text: "text-orange-100",
  },
  sky: {
    bg: "bg-sky-300/10",
    border: "border-sky-300/30",
    dot: "bg-sky-300",
    glow: "shadow-[0_0_24px_rgba(14,165,233,0.14)]",
    text: "text-sky-100",
  },
  violet: {
    bg: "bg-violet-300/10",
    border: "border-violet-300/30",
    dot: "bg-violet-300",
    glow: "shadow-[0_0_24px_rgba(139,92,246,0.14)]",
    text: "text-violet-100",
  },
};

const ROOT_ROUTES = [
  ROUTES.dashboard.home,
  ROUTES.admin.home,
  ROUTES.coach.home,
] as string[];

const userRoutePrefixes = [
  ROUTES.dashboard.stats,
  ROUTES.dashboard.goals,
  ROUTES.dashboard.plan,
  ROUTES.dashboard.coachMessaging,
  ROUTES.dashboard.profile,
  ROUTES.dashboard.payments,
  "/dashboard/settings",
  "/dashboard/billing",
  "/dashboard/help",
  "/dashboard/support",
];

function safeJsonParse(value: string | null): unknown {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function readNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function readSoundPoints() {
  if (typeof window === "undefined") return 0;
  let direct: unknown = null;
  let profile: Record<string, unknown> = {};

  try {
    direct = safeJsonParse(window.localStorage.getItem("soundFitnessPoints"));
    profile = asRecord(
      safeJsonParse(window.localStorage.getItem("soundFitnessProfile")),
    );
  } catch {
    return 0;
  }

  const directRecord = asRecord(direct);
  const candidates = [
    readNumber(direct),
    readNumber(directRecord.points),
    readNumber(directRecord.total),
    readNumber(directRecord.available),
    readNumber(profile.soundPoints),
  ];
  return Math.max(0, Math.round(candidates.find((item) => item !== null) ?? 0));
}

function getInitials(name: string, email: string) {
  const source = name.trim() || email.split("@")[0] || "Member";
  const words = source
    .replace(/[_-]+/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  const initials =
    words.length >= 2 ? `${words[0][0]}${words[1][0]}` : source.slice(0, 2);
  return initials.toUpperCase();
}

function createFallbackProfile(email = ""): UserProfile {
  return {
    displayName: email ? email.split("@")[0] : "Member",
    email,
    initials: getInitials("Member", email),
    profileImage: "",
  };
}

function readStoredProfile(email: string): UserProfile {
  if (typeof window === "undefined") {
    return createFallbackProfile(email);
  }

  let profile: Record<string, unknown> = {};

  try {
    profile = asRecord(
      safeJsonParse(window.localStorage.getItem("soundFitnessProfile")),
    );
  } catch {
    return createFallbackProfile(email);
  }

  const displayName =
    typeof profile.displayName === "string" && profile.displayName.trim()
      ? profile.displayName.trim()
      : email
        ? email.split("@")[0]
        : "Member";
  const profileImage =
    typeof profile.profileImage === "string" ? profile.profileImage : "";

  return {
    displayName,
    email,
    initials: getInitials(displayName, email),
    profileImage,
  };
}

function formatPoints(points: number) {
  return new Intl.NumberFormat("en-US").format(points);
}

function isActivePath(pathname: string, href: string) {
  const [baseHref] = href.split("?");
  if (ROOT_ROUTES.includes(baseHref)) return pathname === baseHref;
  return pathname === baseHref || pathname.startsWith(`${baseHref}/`);
}

function isMenuItemActive(pathname: string, item: MenuItem) {
  return Boolean(item.href && isActivePath(pathname, item.href));
}

function isUserMenuActive(pathname: string) {
  return userRoutePrefixes.some((href) => isActivePath(pathname, href));
}

function isDashboardMenuActive(pathname: string) {
  return dashboardItems.some((item) => item.href && isActivePath(pathname, item.href));
}

function Badge({
  children,
  tone = "neutral",
}: {
  children: string;
  tone?: "active" | "neutral" | "points";
}) {
  const className =
    tone === "points"
      ? "border-amber-300/25 bg-amber-300/12 text-amber-100"
      : tone === "active"
        ? "border-emerald-300/25 bg-emerald-300/10 text-emerald-100"
        : "border-white/10 bg-white/[0.045] text-slate-400";

  return (
    <span
      className={`shrink-0 rounded-full border px-2 py-1 text-[9px] font-black uppercase tracking-[0.12em] ${className}`}
    >
      {children}
    </span>
  );
}

function UserAvatar({
  profile,
  size = "md",
}: {
  profile: UserProfile;
  size?: "lg" | "md";
}) {
  const sizeClass = size === "lg" ? "h-16 w-16 text-xl" : "h-11 w-11 text-sm";

  return (
    <span
      className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-cyan-100/25 bg-cyan-300/12 font-black text-cyan-100 shadow-[0_0_26px_rgba(34,211,238,0.18)] ${sizeClass}`}
    >
      {profile.profileImage ? (
        <img
          alt={`${profile.displayName || "Member"} avatar`}
          className="h-full w-full object-cover"
          src={profile.profileImage}
        />
      ) : (
        <span>{profile.initials}</span>
      )}
    </span>
  );
}

function MenuItemCard({
  active,
  item,
  onNavigate,
}: {
  active: boolean;
  item: MenuItem;
  onNavigate?: () => void;
}) {
  const accent = accentStyles[item.accent || "cyan"];
  const className = `group block min-h-[70px] rounded-2xl border p-3 text-left transition duration-200 ${
    active
      ? `${accent.border} ${accent.bg} ${accent.glow}`
      : item.disabled
        ? "cursor-not-allowed border-white/10 bg-white/[0.025] opacity-65"
        : "border-white/10 bg-slate-950/58 hover:-translate-y-0.5 hover:scale-[1.01] hover:border-cyan-300/30 hover:bg-cyan-300/8 hover:shadow-[0_14px_34px_rgba(0,0,0,0.28)]"
  }`;
  const content = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sm font-black text-white">
            <span
              className={`h-2.5 w-2.5 shrink-0 rounded-full ${accent.dot} shadow-[0_0_12px_currentColor]`}
            />
            {item.emoji ? <span aria-hidden="true">{item.emoji}</span> : null}
            <span className="truncate">{item.label}</span>
          </div>
          {item.helper ? (
            <p className="mt-1 text-xs leading-5 text-slate-500">
              {item.helper}
            </p>
          ) : null}
        </div>
        {item.badge || item.disabled ? (
          <Badge tone={item.badge === "Primary" ? "active" : "neutral"}>
            {item.badge || soon}
          </Badge>
        ) : null}
      </div>
    </>
  );

  if (item.href && !item.disabled) {
    return (
      <Link
        aria-current={active ? "page" : undefined}
        className={className}
        href={item.href}
        onClick={onNavigate}
      >
        {content}
      </Link>
    );
  }

  return (
    <button className={className} disabled type="button">
      {content}
    </button>
  );
}

function MenuSection({
  items,
  onNavigate,
  pathname,
  title,
}: {
  items: MenuItem[];
  onNavigate?: () => void;
  pathname: string;
  title: string;
}) {
  return (
    <section className="rounded-[26px] border border-white/10 bg-white/[0.028] p-3">
      <p className="px-1 pb-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
        {title}
      </p>
      <div className="grid gap-2 md:grid-cols-2">
        {items.map((item) => (
          <MenuItemCard
            active={isMenuItemActive(pathname, item)}
            item={item}
            key={`${title}-${item.label}`}
            onNavigate={onNavigate}
          />
        ))}
      </div>
    </section>
  );
}

function DashboardsDropdown({
  onNavigate,
  open,
  pathname,
}: {
  onNavigate: () => void;
  open: boolean;
  pathname: string;
}) {
  return (
    <div
      className={`absolute right-0 top-full z-50 mt-2 w-[min(92vw,700px)] rounded-[28px] border border-white/10 bg-slate-950/97 p-4 opacity-0 shadow-[0_22px_58px_rgba(0,0,0,0.62)] ring-1 ring-white/[0.035] backdrop-blur-2xl transition-all duration-200 ${
        open
          ? "visible translate-y-0 scale-100 opacity-100"
          : "invisible translate-y-2 scale-[0.985] group-hover:visible group-hover:translate-y-0 group-hover:scale-100 group-hover:opacity-100 group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:scale-100 group-focus-within:opacity-100"
      }`}
    >
      <div className="rounded-[24px] border border-sky-300/25 bg-sky-300/10 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-sky-100">
          🧭 Dashboards
        </p>
        <p className="mt-2 max-w-2xl text-xs leading-5 text-slate-400">
          Pick the command center for today’s work: sessions, nutrition,
          performance, recovery, learning, or future SoundWorld systems.
        </p>
      </div>
      <div className="mt-3">
        <MenuSection
          items={dashboardItems}
          onNavigate={onNavigate}
          pathname={pathname}
          title="Dashboards"
        />
      </div>
    </div>
  );
}

function UserDropdown({
  onNavigate,
  onSignOut,
  open,
  pathname,
  profile,
  soundPoints,
  userEmail,
}: {
  onNavigate: () => void;
  onSignOut: () => void;
  open: boolean;
  pathname: string;
  profile: UserProfile;
  soundPoints: number;
  userEmail: string;
}) {
  return (
    <div
      className={`absolute right-0 top-full z-50 mt-2 max-h-[78vh] w-[min(92vw,640px)] overflow-y-auto rounded-[28px] border border-white/10 bg-slate-950/97 p-4 opacity-0 shadow-[0_22px_58px_rgba(0,0,0,0.62)] ring-1 ring-white/[0.035] backdrop-blur-2xl transition-all duration-200 ${
        open
          ? "visible translate-y-0 scale-100 opacity-100"
          : "invisible translate-y-2 scale-[0.985]"
      }`}
    >
      <div className="rounded-[24px] border border-amber-300/20 bg-[radial-gradient(circle_at_12%_0%,rgba(251,191,36,0.18),transparent_34%),rgba(255,255,255,0.035)] p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-4">
            <UserAvatar profile={profile} size="lg" />
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-100">
                User Menu
              </p>
              <p className="mt-1 truncate text-lg font-black text-white">
                {profile.displayName || "Member"}
              </p>
              <p className="mt-0.5 truncate text-sm text-slate-400">
                {profile.email || userEmail || "Signed in"}
              </p>
            </div>
          </div>
          <Badge tone="points">{`${formatPoints(soundPoints)} pts`}</Badge>
        </div>
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <MenuSection
          items={hubItems}
          onNavigate={onNavigate}
          pathname={pathname}
          title="My Hub"
        />
        <MenuSection
          items={accountItems}
          onNavigate={onNavigate}
          pathname={pathname}
          title="Account"
        />
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <Link
          className="rounded-2xl border border-cyan-300/20 bg-cyan-300/10 px-4 py-3 text-sm font-black text-cyan-100 transition hover:border-cyan-200/50"
          href={ROUTES.dashboard.profile}
          onClick={onNavigate}
        >
          Edit Profile
        </Link>
        <button
          className="rounded-2xl border border-red-300/20 bg-red-500/10 px-4 py-3 text-left text-sm font-black text-red-100 transition hover:bg-red-500/15"
          onClick={onSignOut}
          type="button"
        >
          🚪 Logout
        </button>
      </div>
    </div>
  );
}

function MobileDrawer({
  onClose,
  onSignOut,
  pathname,
  profile,
  soundPoints,
  userEmail,
}: {
  onClose: () => void;
  onSignOut: () => void;
  pathname: string;
  profile: UserProfile;
  soundPoints: number;
  userEmail: string;
}) {
  return (
    <div className="fixed left-2 right-2 top-[72px] z-50 max-h-[calc(100vh-88px)] overflow-y-auto rounded-[30px] border border-white/10 bg-slate-950/97 p-4 shadow-[0_0_70px_rgba(0,0,0,0.62)] backdrop-blur-2xl sm:left-4 sm:right-4 md:left-auto md:right-6 md:w-[min(92vw,620px)]">
      <div className="rounded-[28px] border border-cyan-300/20 bg-[radial-gradient(circle_at_12%_0%,rgba(34,211,238,0.18),transparent_36%),rgba(255,255,255,0.035)] p-4">
        <div className="flex items-center gap-4">
          <UserAvatar profile={profile} size="lg" />
          <div className="min-w-0">
            <p className="truncate text-lg font-black text-white">
              {profile.displayName || "Member"}
            </p>
            <p className="mt-1 truncate text-sm text-slate-400">
              {profile.email || userEmail || "Signed in"}
            </p>
            <Link
              className="mt-3 inline-flex rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-cyan-100"
              href={ROUTES.dashboard.profile}
              onClick={onClose}
            >
              Edit Profile
            </Link>
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-3">
        <MenuSection
          items={[
            {
              emoji: "🏋️",
              label: "Workout",
              href: ROUTES.dashboard.sessions,
              helper: "Start, resume, or manage today’s workout.",
              accent: "cyan",
            },
          ]}
          onNavigate={onClose}
          pathname={pathname}
          title="Primary Action"
        />
        <MenuSection
          items={dashboardItems}
          onNavigate={onClose}
          pathname={pathname}
          title="Dashboards"
        />
        <MenuSection
          items={hubItems}
          onNavigate={onClose}
          pathname={pathname}
          title="My Hub"
        />
        <MenuSection
          items={accountItems}
          onNavigate={onClose}
          pathname={pathname}
          title="Account"
        />
        <button
          className="min-h-[56px] rounded-2xl border border-red-300/20 bg-red-500/10 px-4 py-3 text-left text-sm font-black text-red-100 transition hover:bg-red-500/15"
          onClick={onSignOut}
          type="button"
        >
          🚪 Logout
        </button>
      </div>
    </div>
  );
}

function SimpleRoleLink({
  active,
  item,
}: {
  active: boolean;
  item: MenuItem;
}) {
  const accent = accentStyles[item.accent || "cyan"];
  return (
    <Link
      className={`rounded-2xl border px-4 py-3 text-[11px] font-black uppercase tracking-[0.11em] transition ${
        active
          ? `${accent.border} ${accent.bg} ${accent.text} ${accent.glow}`
          : "border-white/10 bg-slate-950/58 text-slate-300 hover:border-cyan-300/30 hover:bg-cyan-300/8 hover:text-white"
      }`}
      href={item.href || ROUTES.dashboard.home}
    >
      {item.label}
    </Link>
  );
}

export default function ProtectedHeader({
  role,
}: {
  role: ProtectedHeaderRole;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [openMenu, setOpenMenu] = useState<"dashboards" | "mobile" | "user" | null>(null);
  const [profile, setProfile] = useState<UserProfile>(() => createFallbackProfile(""));
  const [soundPoints, setSoundPoints] = useState(0);
  const [userEmail, setUserEmail] = useState("");

  const config =
    role === "member"
      ? {
          brandHref: ROUTES.dashboard.home,
          loginHref: ROUTES.auth.login,
          roleLabel: "Member",
        }
      : role === "admin"
        ? {
            brandHref: ROUTES.admin.home,
            loginHref: ROUTES.admin.login,
            roleLabel: "Admin",
          }
        : {
            brandHref: ROUTES.coach.home,
            loginHref: ROUTES.coach.login,
            roleLabel: "Coach",
          };

  const simpleRoleLinks: MenuItem[] =
    role === "admin"
      ? [
          { label: "Admin", href: ROUTES.admin.home, accent: "cyan" },
          { label: "Dashboard", href: ROUTES.admin.dashboard, accent: "sky" },
          { label: "Leads", href: ROUTES.admin.leads, accent: "emerald" },
          { label: "CRM", href: ROUTES.admin.crmDashboard, accent: "violet" },
          { label: "Clients", href: ROUTES.admin.clients, accent: "amber" },
          { label: "Content", href: ROUTES.admin.postHub, accent: "orange" },
          { label: "Site Map", href: ROUTES.admin.siteMap, accent: "fuchsia" },
        ]
      : [
          { label: "Coach Home", href: ROUTES.coach.home, accent: "cyan" },
          { label: "Coach Dashboard", href: ROUTES.coach.dashboard, accent: "sky" },
        ];

  const dashboardsActive =
    isActivePath(pathname, ROUTES.dashboard.home) || isDashboardMenuActive(pathname);
  const userActive = isUserMenuActive(pathname);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenu(null);
      }
    }

    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpenMenu(null);
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    async function loadUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const email = user?.email || "";
      const metadata = asRecord(user?.user_metadata);
      const authName =
        typeof metadata.full_name === "string"
          ? metadata.full_name
          : typeof metadata.name === "string"
            ? metadata.name
            : "";
      const authAvatar =
        typeof metadata.avatar_url === "string" ? metadata.avatar_url : "";

      setUserEmail(email);
      setProfile((current) => {
        const stored = readStoredProfile(email);
        const displayName =
          stored.displayName === "Member" && authName
            ? authName
            : stored.displayName;
        const profileImage = stored.profileImage || authAvatar || current.profileImage;
        return {
          displayName,
          email,
          initials: getInitials(displayName, email),
          profileImage,
        };
      });
    }

    loadUser();
  }, []);

  useEffect(() => {
    const updateLocalProfile = () => {
      setSoundPoints(readSoundPoints());
      setProfile((current) => {
        const stored = readStoredProfile(current.email || userEmail);
        return {
          ...stored,
          email: current.email || stored.email,
          initials: getInitials(stored.displayName, current.email || stored.email),
        };
      });
    };

    updateLocalProfile();
    window.addEventListener("storage", updateLocalProfile);
    window.addEventListener("focus", updateLocalProfile);
    return () => {
      window.removeEventListener("storage", updateLocalProfile);
      window.removeEventListener("focus", updateLocalProfile);
    };
  }, [userEmail]);

  async function signOut() {
    setOpenMenu(null);
    await supabase.auth.signOut();
    setUserEmail("");
    router.push(config.loginHref);
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#020713]/92 backdrop-blur-2xl">
      <div className="mx-auto flex w-full max-w-[1840px] items-center justify-between gap-4 px-4 py-3 md:px-6 xl:px-8 2xl:px-10">
        <Link
          className="flex min-w-0 shrink-0 items-center gap-2 sm:gap-3"
          href={config.brandHref}
        >
          <img
            alt="Sound Fitness"
            className="h-9 w-9 shrink-0 object-contain sm:h-10 sm:w-10"
            src="/sound-fitness-logo.png"
          />
          <div className="min-w-0 leading-[0.9]">
            <div className="text-lg font-black uppercase tracking-[0.06em] text-white sm:text-xl sm:tracking-[0.08em]">
              SOUND
            </div>
            <div className="text-[9px] font-black uppercase tracking-[0.28em] text-sky-400 sm:text-[10px] sm:tracking-[0.38em]">
              FITNESS
            </div>
          </div>
          <span className="hidden rounded-full border border-sky-400/30 bg-sky-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-sky-200 sm:inline-flex">
            {config.roleLabel}
          </span>
        </Link>

        <div
          className="flex min-w-0 flex-1 items-center justify-end gap-2 xl:gap-3"
          ref={menuRef}
        >
          {role === "member" ? (
            <>
              <nav className="mr-auto hidden min-w-0 items-center gap-2 rounded-[24px] border border-white/10 bg-slate-950/54 p-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_18px_52px_rgba(0,0,0,0.32)] xl:flex">
                <Link
                  aria-current={isActivePath(pathname, ROUTES.dashboard.sessions) ? "page" : undefined}
                  className="inline-flex min-h-[50px] items-center gap-2 rounded-[18px] border border-cyan-200/50 bg-gradient-to-r from-cyan-300 to-sky-400 px-5 py-2.5 text-[11px] font-black uppercase tracking-[0.12em] text-slate-950 shadow-[0_0_32px_rgba(34,211,238,0.28)] transition hover:-translate-y-0.5 hover:scale-[1.015] hover:from-cyan-200 hover:to-sky-300"
                  href={ROUTES.dashboard.sessions}
                >
                  🏋️ Workout
                </Link>
              </nav>

              <div
                className="group relative hidden xl:block"
                onMouseEnter={() => setOpenMenu("dashboards")}
              >
                <div
                  className={`inline-flex min-h-[50px] overflow-hidden rounded-[20px] border text-[11px] font-black uppercase tracking-[0.12em] transition-all duration-200 ${
                    dashboardsActive
                      ? "border-sky-300/35 bg-sky-300/10 text-sky-100 shadow-[0_0_24px_rgba(14,165,233,0.14)]"
                      : "border-white/10 bg-slate-950/58 text-slate-300 hover:-translate-y-0.5 hover:scale-[1.01] hover:border-cyan-300/30 hover:bg-cyan-300/8 hover:text-white"
                  }`}
                >
                  <Link
                    className="inline-flex items-center gap-2 px-5 py-2.5"
                    href={ROUTES.dashboard.home}
                    onClick={() => setOpenMenu(null)}
                  >
                    🧭 Dashboards
                  </Link>
                  <button
                    aria-expanded={openMenu === "dashboards"}
                    aria-haspopup="menu"
                    aria-label="Open dashboards menu"
                    className="inline-flex min-w-[44px] items-center justify-center border-l border-white/10 px-3 text-cyan-200/80 transition hover:bg-cyan-300/10 hover:text-cyan-100"
                    onClick={() =>
                      setOpenMenu((current) =>
                        current === "dashboards" ? null : "dashboards",
                      )
                    }
                    type="button"
                  >
                    ▾
                  </button>
                </div>
                <DashboardsDropdown
                  onNavigate={() => setOpenMenu(null)}
                  open={openMenu === "dashboards"}
                  pathname={pathname}
                />
              </div>
            </>
          ) : (
            <nav className="mr-auto hidden min-w-0 items-center gap-2 rounded-[24px] border border-white/10 bg-slate-950/54 p-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_18px_52px_rgba(0,0,0,0.32)] xl:flex">
              {simpleRoleLinks.map((item) => (
                <SimpleRoleLink
                  active={Boolean(item.href && isActivePath(pathname, item.href))}
                  item={item}
                  key={item.label}
                />
              ))}
            </nav>
          )}

          <div className="relative xl:hidden">
            <button
              aria-expanded={openMenu === "mobile"}
              className="inline-flex min-h-[48px] items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-slate-300 transition hover:border-sky-400/50 hover:bg-sky-500/10 sm:px-4"
              onClick={() =>
                setOpenMenu((current) => (current === "mobile" ? null : "mobile"))
              }
              type="button"
            >
              <UserAvatar profile={profile} />
              <span className="hidden sm:inline">Menu</span>
            </button>

            {openMenu === "mobile" ? (
              <MobileDrawer
                onClose={() => setOpenMenu(null)}
                onSignOut={signOut}
                pathname={pathname}
                profile={profile}
                soundPoints={soundPoints}
                userEmail={userEmail}
              />
            ) : null}
          </div>

          <div className="relative">
            <button
              aria-expanded={openMenu === "user"}
              className={`hidden min-h-[52px] items-center gap-3 rounded-full border py-1.5 pl-2 pr-4 text-left transition xl:inline-flex ${
                userActive
                  ? "border-cyan-300/40 bg-cyan-300/10 text-cyan-100 shadow-[0_0_24px_rgba(34,211,238,0.16)]"
                  : "border-white/10 bg-white/[0.04] text-slate-200 hover:border-amber-300/35 hover:bg-amber-300/10 hover:text-amber-100"
              }`}
              onClick={() =>
                setOpenMenu((current) => (current === "user" ? null : "user"))
              }
              type="button"
            >
              <UserAvatar profile={profile} />
              <span className="hidden min-w-0 lg:block">
                <span className="block max-w-[140px] truncate text-xs font-black uppercase tracking-[0.12em]">
                  {profile.displayName || "Member"}
                </span>
                <span className="mt-0.5 block text-[10px] font-bold text-amber-100/80">
                  ⭐ {formatPoints(soundPoints)} pts
                </span>
              </span>
              <span className="text-cyan-200/70">▾</span>
            </button>

            {openMenu === "user" ? (
              <UserDropdown
                onNavigate={() => setOpenMenu(null)}
                onSignOut={signOut}
                open={openMenu === "user"}
                pathname={pathname}
                profile={profile}
                soundPoints={soundPoints}
                userEmail={userEmail}
              />
            ) : null}
          </div>
        </div>
      </div>
      {role === "member" ? (
        <div className="hidden border-t border-white/5 bg-white/[0.018] px-4 py-1.5 text-center text-[10px] font-black uppercase tracking-[0.18em] text-slate-500 xl:block">
          🏋️ Workout • 🧭 Dashboards • 👤 User Menu
        </div>
      ) : null}
    </header>
  );
}
