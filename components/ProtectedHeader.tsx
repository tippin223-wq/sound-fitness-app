"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useProfile } from "@/components/profile/ProfileProvider";
import { ROUTES } from "@/lib/routes";
import { getSupabaseUser, supabase } from "@/lib/supabaseClient";
import {
  asRecord,
  getProfileInitials,
  readSoundFitnessPoints,
} from "@/lib/profile-storage";

type ProtectedHeaderRole = "member" | "admin" | "coach";
type Accent = "amber" | "cyan" | "emerald" | "fuchsia" | "orange" | "sky" | "violet";

type MenuItem = {
  activeHrefs?: string[];
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
    emoji: "🧭",
    label: "Dashboard",
    href: ROUTES.dashboard.home,
    activeHrefs: [ROUTES.dashboard.home],
    helper:
      "Main app dashboard for training, recovery, nutrition, stats, and journey navigation.",
    accent: "cyan",
    badge: "Primary",
  },
  {
    emoji: "▶️",
    label: "Sessions",
    href: ROUTES.dashboard.sessions,
    activeHrefs: [ROUTES.dashboard.sessions],
    helper: "Session dashboard, workout launch, templates, and training tools.",
    accent: "cyan",
  },
  {
    emoji: "🥗",
    label: "Nutrition",
    href: ROUTES.nutritionPortal.home,
    activeHrefs: [ROUTES.nutritionPortal.home, ROUTES.nutrition.home],
    helper: "Fuel dashboard, meals, macros, hydration, and grocery.",
    accent: "emerald",
  },
  {
    emoji: "⚡",
    label: "Performance",
    href: ROUTES.performance.home,
    activeHrefs: [ROUTES.performance.home, ROUTES.dashboard.performance],
    helper: "Cardio, athletic testing, strength metrics, speed, power, endurance, and PRs.",
    accent: "orange",
  },
  {
    emoji: "🩹",
    label: "Recovery",
    href: "/recovery",
    activeHrefs: [ROUTES.dashboard.recovery, "/recovery"],
    helper: "Cooldowns, mobility, soreness, and readiness support.",
    accent: "sky",
  },
  {
    emoji: "🎓",
    label: "Learning",
    href: ROUTES.learning.home,
    activeHrefs: [ROUTES.learning.home],
    helper: "Lessons, references, skill tracks, and coaching education.",
    accent: "violet",
  },
  {
    emoji: "🎮",
    label: "SoundWorld",
    href: ROUTES.soundworld.home,
    activeHrefs: [ROUTES.soundworld.home],
    helper: "Quests, badges, rewards, and gamified training worlds.",
    accent: "fuchsia",
  },
];

const hubItems: MenuItem[] = [
  {
    emoji: "📊",
    label: "Stats",
    href: ROUTES.dashboard.stats,
    helper: "Progress, PRs, and training trends.",
    accent: "cyan",
  },
  {
    emoji: "🎯",
    label: "Goals",
    href: ROUTES.dashboard.goals,
    helper: "Outcomes and training direction.",
    accent: "amber",
  },
  {
    emoji: "🧠",
    label: "Insights",
    href: ROUTES.dashboard.insights,
    helper: "Coach intelligence and next actions.",
    accent: "violet",
  },
  {
    emoji: "🗂",
    label: "Plan",
    href: ROUTES.dashboard.plan,
    helper: "Weekly structure and templates.",
    accent: "sky",
  },
  {
    emoji: "🏆",
    label: "Achievements",
    href: ROUTES.dashboard.achievements,
    helper: "Milestones, badges, and wins.",
    accent: "orange",
  },
  {
    emoji: "💬",
    label: "Messages",
    href: ROUTES.dashboard.coachMessaging,
    helper: "Coach messages and questions.",
    accent: "emerald",
  },
];

const accountItems: MenuItem[] = [
  {
    emoji: "👤",
    label: "Profile",
    href: ROUTES.dashboard.profile,
    helper: "Training identity, body metrics, preferences, and avatar.",
    accent: "cyan",
  },
  {
    emoji: "⚙️",
    label: "Settings",
    href: ROUTES.dashboard.settings,
    helper: "App preferences and account controls.",
    accent: "violet",
  },
  {
    emoji: "💳",
    label: "Billing",
    href: ROUTES.dashboard.payments,
    helper: "Payments and invoice history.",
    accent: "amber",
  },
  {
    emoji: "💬",
    label: "Help",
    href: ROUTES.dashboard.help,
    helper: "Support, FAQs, and app guidance.",
    accent: "emerald",
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
  ROUTES.performance.home,
  ROUTES.dashboard.home,
  ROUTES.admin.home,
  ROUTES.coach.home,
] as string[];

const userRoutePrefixes = [
  ROUTES.dashboard.stats,
  ROUTES.dashboard.goals,
  ROUTES.dashboard.insights,
  ROUTES.dashboard.plan,
  ROUTES.dashboard.achievements,
  ROUTES.dashboard.coachMessaging,
  ROUTES.dashboard.profile,
  ROUTES.dashboard.settings,
  ROUTES.dashboard.payments,
  ROUTES.dashboard.help,
  "/dashboard/billing",
  "/dashboard/support",
  ROUTES.performance.home,
];

function formatPoints(points: number) {
  return new Intl.NumberFormat("en-US").format(points);
}

function readHeaderText(...values: unknown[]) {
  const found = values.find(
    (value) => typeof value === "string" && value.trim().length > 0,
  );
  return typeof found === "string" ? found.trim() : "";
}

function isActivePath(pathname: string, href: string) {
  const [baseHref] = href.split("?");
  if (ROOT_ROUTES.includes(baseHref)) return pathname === baseHref;
  return pathname === baseHref || pathname.startsWith(`${baseHref}/`);
}

function isMenuItemActive(pathname: string, item: MenuItem) {
  const hrefs = [item.href, ...(item.activeHrefs || [])].filter(
    (href): href is string => Boolean(href),
  );
  return hrefs.some((href) => isActivePath(pathname, href));
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
  const className = `group block min-h-[82px] rounded-2xl border p-4 text-left transition duration-200 ${
    active
      ? `${accent.border} ${accent.bg} ${accent.glow}`
      : item.disabled
        ? "cursor-not-allowed border-white/10 bg-white/[0.025] opacity-65"
        : "border-white/10 bg-slate-950/58 hover:-translate-y-0.5 hover:scale-[1.01] hover:border-cyan-300/30 hover:bg-cyan-300/8 hover:shadow-[0_14px_34px_rgba(0,0,0,0.28)]"
  }`;
  const content = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2.5 text-sm font-black leading-tight text-white">
            <span
              className={`h-2.5 w-2.5 shrink-0 rounded-full ${accent.dot} shadow-[0_0_12px_currentColor]`}
            />
            {item.emoji ? <span aria-hidden="true">{item.emoji}</span> : null}
            <span className="min-w-0 leading-tight">{item.label}</span>
          </div>
          {item.helper ? (
            <p className="mt-2 text-xs leading-5 text-slate-400">
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
      {title ? (
        <p className="px-1 pb-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
          {title}
        </p>
      ) : null}
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
      className={`absolute right-0 top-full z-50 mt-2 w-[min(92vw,700px)] rounded-[28px] border border-white/10 bg-slate-950/97 p-3 opacity-0 shadow-[0_22px_58px_rgba(0,0,0,0.62)] ring-1 ring-white/[0.035] backdrop-blur-2xl transition-all duration-200 ${
        open
          ? "visible translate-y-0 scale-100 opacity-100"
          : "invisible translate-y-2 scale-[0.985] group-hover:visible group-hover:translate-y-0 group-hover:scale-100 group-hover:opacity-100 group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:scale-100 group-focus-within:opacity-100"
      }`}
    >
      <div className="mt-0">
        <MenuSection
          items={dashboardItems}
          onNavigate={onNavigate}
          pathname={pathname}
          title=""
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
      className={`absolute right-0 top-full z-50 mt-2 max-h-[78vh] w-[min(94vw,760px)] overflow-y-auto rounded-[28px] border border-white/10 bg-slate-950/97 p-4 opacity-0 shadow-[0_22px_58px_rgba(0,0,0,0.62)] ring-1 ring-white/[0.035] backdrop-blur-2xl transition-all duration-200 ${
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

      <div className="mt-3 grid gap-3 md:grid-cols-[minmax(0,1.35fr)_minmax(240px,0.9fr)]">
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
              emoji: "▶️",
              label: "Dashboard",
              href: ROUTES.dashboard.home,
              helper: "Open the main dashboard and command center.",
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
  const { profile } = useProfile();
  const router = useRouter();
  const pathname = usePathname();
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [openMenu, setOpenMenu] = useState<"dashboards" | "mobile" | "user" | null>(null);
  const [authUser, setAuthUser] = useState({
    avatarUrl: "",
    email: "",
    name: "",
  });
  const [soundPoints, setSoundPoints] = useState(0);

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
  const profileRecord = asRecord(profile);
  const profileEmail = readHeaderText(profileRecord.email);
  const displayName =
    readHeaderText(
      profileRecord.displayName,
      profileRecord.username,
      profileRecord.fullName,
      profileEmail ? profileEmail.split("@")[0] : "",
      authUser.email ? authUser.email.split("@")[0] : "",
    ) || "Member";
  const email = readHeaderText(profileEmail, authUser.email);
  const avatar = readHeaderText(profileRecord.avatarUrl, profileRecord.profileImage);
  const visibleProfile: UserProfile = {
    displayName,
    email,
    initials: getProfileInitials(displayName, email),
    profileImage: avatar,
  };

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
      } = await getSupabaseUser();

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

      setAuthUser({ avatarUrl: authAvatar, email, name: authName });
      setSoundPoints(readSoundFitnessPoints());
    }

    loadUser();
  }, []);

  useEffect(() => {
    setSoundPoints(readSoundFitnessPoints());
  }, [profile]);

  async function signOut() {
    setOpenMenu(null);
    await supabase.auth.signOut();
    setAuthUser({ avatarUrl: "", email: "", name: "" });
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
                  aria-current={isMenuItemActive(pathname, dashboardItems[0]) ? "page" : undefined}
                  className="inline-flex min-h-[50px] items-center gap-2 rounded-[18px] border border-cyan-200/50 bg-gradient-to-r from-cyan-300 to-sky-400 px-5 py-2.5 text-[11px] font-black uppercase tracking-[0.12em] text-slate-950 shadow-[0_0_32px_rgba(34,211,238,0.28)] transition hover:-translate-y-0.5 hover:scale-[1.015] hover:from-cyan-200 hover:to-sky-300"
                  href={ROUTES.dashboard.home}
                >
                  🧭 Dashboard
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
              <UserAvatar profile={visibleProfile} />
              <span className="hidden sm:inline">Menu</span>
            </button>

            {openMenu === "mobile" ? (
              <MobileDrawer
                onClose={() => setOpenMenu(null)}
                onSignOut={signOut}
                pathname={pathname}
                profile={visibleProfile}
                soundPoints={soundPoints}
                userEmail={authUser.email}
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
              <UserAvatar profile={visibleProfile} />
              <span className="hidden min-w-0 lg:block">
                <span className="block max-w-[140px] truncate text-xs font-black uppercase tracking-[0.12em]">
                  {visibleProfile.displayName || "Member"}
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
                profile={visibleProfile}
                soundPoints={soundPoints}
                userEmail={authUser.email}
              />
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
}
