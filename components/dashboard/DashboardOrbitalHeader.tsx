"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import DashboardTabIcon from "@/components/dashboard/DashboardTabIcon";
import { useProfile } from "@/components/profile/ProfileProvider";
import {
  getProfileDisplay,
  readSoundFitnessPoints,
  subscribeToProfileUpdates,
} from "@/lib/profile-storage";
import { ROUTES } from "@/lib/routes";
import { supabase } from "@/lib/supabaseClient";

type DashboardOrbitalHeaderLink = {
  href: string;
  icon: string;
  label: string;
  match?: string[];
  meta: string;
  pointsMultiplier: number;
  tone: string;
};

type AuthProfile = {
  email?: string | null;
  user_metadata?: unknown;
};

const dashboardOrbitalHeaderLinks: DashboardOrbitalHeaderLink[] = [
  {
    href: ROUTES.dashboard.home,
    icon: "Dashboard",
    label: "Command",
    match: [ROUTES.dashboard.home],
    meta: "Dashboard",
    pointsMultiplier: 1,
    tone:
      "border-slate-200/30 bg-slate-100/10 text-slate-100 hover:border-cyan-100/45 hover:bg-cyan-300/14",
  },
  {
    href: ROUTES.dashboard.profile,
    icon: "Profile",
    label: "Profile",
    match: [ROUTES.dashboard.profile],
    meta: "Identity",
    pointsMultiplier: 0.94,
    tone:
      "border-cyan-200/30 bg-cyan-300/10 text-cyan-100 hover:border-cyan-100/45 hover:bg-cyan-300/16",
  },
  {
    href: ROUTES.dashboard.goals,
    icon: "Goals",
    label: "Goals",
    match: [ROUTES.dashboard.goals],
    meta: "Direction",
    pointsMultiplier: 0.68,
    tone:
      "border-amber-200/32 bg-amber-300/12 text-amber-100 hover:border-amber-100/45 hover:bg-amber-300/18",
  },
  {
    href: ROUTES.dashboard.sessions,
    icon: "Workout",
    label: "Workout",
    match: [
      ROUTES.dashboard.sessions,
      ROUTES.dashboard.myPlan,
      ROUTES.workoutBuilder.home,
    ],
    meta: "Sessions",
    pointsMultiplier: 1,
    tone:
      "border-cyan-100/50 bg-cyan-300 text-slate-950 shadow-[0_0_26px_rgba(34,211,238,0.24)]",
  },
  {
    href: ROUTES.dashboard.exerciseLibrary,
    icon: "Library",
    label: "Library",
    match: [
      ROUTES.dashboard.exerciseLibrary,
      ROUTES.workoutBuilder.exerciseLibrary,
    ],
    meta: "Exercises",
    pointsMultiplier: 0.82,
    tone:
      "border-teal-200/30 bg-teal-300/10 text-teal-100 hover:border-teal-100/45 hover:bg-teal-300/16",
  },
  {
    href: ROUTES.nutritionPortal.home,
    icon: "Nutrition",
    label: "Nutrition",
    match: [ROUTES.nutritionPortal.home],
    meta: "Fuel",
    pointsMultiplier: 0.38,
    tone:
      "border-emerald-200/28 bg-emerald-300/10 text-emerald-100 hover:border-emerald-100/45 hover:bg-emerald-300/16",
  },
  {
    href: ROUTES.dashboard.recovery,
    icon: "Recovery",
    label: "Recovery",
    match: [ROUTES.dashboard.recovery, "/recovery"],
    meta: "Readiness",
    pointsMultiplier: 0.24,
    tone:
      "border-sky-200/28 bg-sky-300/10 text-sky-100 hover:border-sky-100/45 hover:bg-sky-300/16",
  },
  {
    href: ROUTES.performance.home,
    icon: "Performance",
    label: "Performance",
    match: [ROUTES.performance.home, ROUTES.dashboard.performance],
    meta: "Athletic",
    pointsMultiplier: 0.46,
    tone:
      "border-yellow-200/30 bg-yellow-300/10 text-yellow-100 hover:border-yellow-100/45 hover:bg-yellow-300/16",
  },
  {
    href: ROUTES.learning.home,
    icon: "Education",
    label: "Education",
    match: [ROUTES.learning.home],
    meta: "Learning",
    pointsMultiplier: 0.12,
    tone:
      "border-violet-200/28 bg-violet-300/10 text-violet-100 hover:border-violet-100/45 hover:bg-violet-300/16",
  },
  {
    href: ROUTES.soundworld.home,
    icon: "Sound World",
    label: "Sound World",
    match: [ROUTES.soundworld.home],
    meta: "Community",
    pointsMultiplier: 0.08,
    tone:
      "border-pink-200/28 bg-pink-300/10 text-pink-100 hover:border-pink-100/45 hover:bg-pink-300/16",
  },
];

const profileHubLinks = [
  {
    href: ROUTES.dashboard.profile,
    icon: "Profile",
    label: "Profile Hub",
    meta: "Identity and body context",
  },
  {
    href: ROUTES.dashboard.goals,
    icon: "Goals",
    label: "Goals",
    meta: "Direction and milestones",
  },
  {
    href: ROUTES.dashboard.myPlan,
    icon: "Plan",
    label: "My Plan",
    meta: "Weekly structure",
  },
  {
    href: ROUTES.dashboard.stats,
    icon: "Stats",
    label: "Stats",
    meta: "Training signals",
  },
  {
    href: ROUTES.dashboard.achievements,
    icon: "Achievements",
    label: "Achievements",
    meta: "Rewards and badges",
  },
  {
    href: ROUTES.dashboard.coachMessaging,
    icon: "Messages",
    label: "Messages",
    meta: "Coach context",
  },
];

const accountLinks = [
  {
    href: ROUTES.dashboard.settings,
    icon: "App",
    label: "Settings",
    meta: "Dashboard defaults",
  },
  {
    href: ROUTES.dashboard.payments,
    icon: "Packages",
    label: "Packages",
    meta: "Billing and visits",
  },
  {
    href: ROUTES.dashboard.help,
    icon: "Logic",
    label: "Help",
    meta: "Support and guidance",
  },
];

function matchDashboardHeaderPath(pathname: string, link: DashboardOrbitalHeaderLink) {
  const candidates = link.match || [link.href];

  return candidates.some(
    (candidate) => pathname === candidate || pathname.startsWith(`${candidate}/`),
  );
}

function getProfileFirstName(name: string) {
  return name.trim().split(/\s+/)[0] || "Member";
}

export default function DashboardOrbitalHeader({
  className = "",
}: {
  className?: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { profile } = useProfile();
  const profileMenuRef = useRef<HTMLDivElement | null>(null);
  const [authProfile, setAuthProfile] = useState<AuthProfile | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [slideDirection, setSlideDirection] = useState<"left" | "right">(
    "right",
  );
  const [profileHubOpen, setProfileHubOpen] = useState(false);
  const [soundPoints, setSoundPoints] = useState(0);

  const pathnameActiveIndex = useMemo(() => {
    const matchedIndex = dashboardOrbitalHeaderLinks.findIndex((link) =>
      matchDashboardHeaderPath(pathname, link),
    );

    return matchedIndex >= 0 ? matchedIndex : 0;
  }, [pathname]);

  useEffect(() => {
    setActiveIndex(pathnameActiveIndex);
  }, [pathnameActiveIndex]);

  useEffect(() => {
    let isActive = true;

    async function loadAuthProfile() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!isActive) return;

      setAuthProfile(
        user
          ? {
              email: user.email,
              user_metadata: user.user_metadata,
            }
          : null,
      );
    }

    void loadAuthProfile();

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    const updatePoints = () => setSoundPoints(readSoundFitnessPoints());

    updatePoints();
    return subscribeToProfileUpdates(updatePoints);
  }, []);

  useEffect(() => {
    setProfileHubOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!profileHubOpen) return;

    const handlePointerDown = (event: globalThis.MouseEvent) => {
      const target = event.target;

      if (
        target instanceof Node &&
        !profileMenuRef.current?.contains(target)
      ) {
        setProfileHubOpen(false);
      }
    };
    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") setProfileHubOpen(false);
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [profileHubOpen]);

  const profileDisplay = getProfileDisplay(profile, authProfile);
  const firstName = getProfileFirstName(profileDisplay.name);
  const soundTokens = Math.max(0, Math.round(soundPoints / 15));
  const activeLink =
    dashboardOrbitalHeaderLinks[
      ((activeIndex % dashboardOrbitalHeaderLinks.length) +
        dashboardOrbitalHeaderLinks.length) %
        dashboardOrbitalHeaderLinks.length
    ] || dashboardOrbitalHeaderLinks[0];
  const activePoints = Math.round(
    Math.max(soundPoints, 0) * activeLink.pointsMultiplier,
  );

  const rotateHeaderRail = (direction: "left" | "right") => {
    setSlideDirection(direction);
    setActiveIndex((currentIndex) =>
      direction === "left"
        ? (currentIndex - 1 + dashboardOrbitalHeaderLinks.length) %
          dashboardOrbitalHeaderLinks.length
        : (currentIndex + 1) % dashboardOrbitalHeaderLinks.length,
    );
  };

  const closeProfileHub = () => setProfileHubOpen(false);

  const signOut = async () => {
    closeProfileHub();
    await supabase.auth.signOut();
    router.push(ROUTES.auth.login);
    router.refresh();
  };

  return (
    <header
      className={`sticky top-0 z-[150] w-full overflow-visible rounded-[26px] border border-cyan-100/18 bg-[radial-gradient(circle_at_16%_0%,rgba(34,211,238,0.18),transparent_34%),radial-gradient(circle_at_88%_12%,rgba(251,191,36,0.10),transparent_30%),linear-gradient(135deg,rgba(15,23,42,0.88),rgba(2,6,23,0.80))] shadow-[0_20px_70px_rgba(0,0,0,0.34),0_0_34px_rgba(34,211,238,0.10),inset_0_1px_0_rgba(255,255,255,0.10)] backdrop-blur-xl ${className}`}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-6 top-0 h-px rounded-full bg-gradient-to-r from-transparent via-cyan-100/55 to-transparent"
      />
      <div className="relative flex min-h-[84px] w-full items-center gap-2 px-2.5 py-3 sm:gap-4 sm:px-4 md:px-5">
        <Link
          aria-label="Open Sound Fitness dashboard"
          className="flex min-h-[58px] min-w-0 shrink-0 items-center gap-3 rounded-[24px] border border-transparent bg-transparent px-2 py-2 transition hover:border-cyan-100/24 hover:bg-cyan-300/8"
          href={ROUTES.dashboard.home}
        >
          <Image
            alt="Sound Fitness"
            className="h-10 w-10 shrink-0 rounded-full object-contain"
            height={40}
            src="/sound-fitness-logo.png"
            width={40}
          />
          <span className="hidden min-w-0 leading-[0.9] sm:block">
            <span className="block text-sm font-black uppercase tracking-[0.12em] text-white">
              Sound
            </span>
            <span className="block text-[9px] font-black uppercase tracking-[0.34em] text-cyan-300">
              Fitness
            </span>
          </span>
          <span className="hidden rounded-full border border-cyan-200/28 bg-cyan-300/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.13em] text-cyan-100 lg:inline-flex">
            Member
          </span>
        </Link>

        <div className="min-w-0 flex-1" />

        <div
          aria-label="Dashboard selector"
          className="flex w-fit max-w-[calc(100vw-7.5rem)] shrink-0 select-none items-center gap-1 bg-transparent p-0 shadow-none md:max-w-[min(56vw,540px)] lg:max-w-none"
        >
          <button
            aria-label="Previous dashboard"
            className="grid h-11 w-9 shrink-0 place-items-center rounded-2xl border border-transparent bg-transparent text-xs font-black text-cyan-100/80 transition hover:-translate-x-0.5 hover:border-amber-200/28 hover:bg-amber-300/8 hover:text-amber-100 active:scale-95"
            onClick={() => rotateHeaderRail("left")}
            type="button"
          >
            &lt;
          </button>
          <Link
            aria-current={matchDashboardHeaderPath(pathname, activeLink) ? "page" : undefined}
            className={`flex min-h-[58px] w-auto min-w-max shrink-0 items-center gap-3 rounded-[22px] border border-transparent bg-transparent px-2.5 py-2 text-left text-cyan-50 shadow-none transition hover:-translate-y-0.5 hover:bg-white/[0.04] ${
              slideDirection === "right"
                ? "animate-[sessions-dashboard-chip-slide-from-right_220ms_ease-out]"
                : "animate-[sessions-dashboard-chip-slide-from-left_220ms_ease-out]"
            }`}
            draggable={false}
            href={activeLink.href}
            key={`${activeLink.label}-${slideDirection}`}
            onDragStart={(event) => event.preventDefault()}
          >
            <span
              aria-hidden="true"
              className={`relative grid h-11 w-11 shrink-0 place-items-center rounded-2xl border text-[11px] font-black shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_0_16px_rgba(255,255,255,0.06)] ${activeLink.tone}`}
            >
              <DashboardTabIcon
                label={activeLink.label}
                name={activeLink.icon}
              />
              {matchDashboardHeaderPath(pathname, activeLink) ? (
                <span className="absolute -bottom-1 -right-1 grid h-4 w-4 place-items-center rounded-full border border-cyan-100/45 bg-slate-950/82 shadow-[0_0_14px_rgba(34,211,238,0.24)]">
                  <span className="h-1.5 w-1.5 rounded-full border border-cyan-100/60 bg-cyan-200 shadow-[0_0_14px_rgba(103,232,249,0.58)]" />
                </span>
              ) : null}
            </span>
            <span className="shrink-0 whitespace-nowrap">
              <span className="block text-[8px] font-black uppercase tracking-[0.14em] opacity-70">
                {activeLink.meta}
              </span>
              <span className="mt-0.5 block text-[10px] font-black uppercase tracking-[0.12em] sm:text-[11px]">
                {activeLink.label}
              </span>
            </span>
            <span
              className={`hidden shrink-0 rounded-2xl border px-3 py-2 text-right sm:block ${activeLink.tone}`}
            >
              <span className="block text-[8px] font-black uppercase tracking-[0.1em] opacity-75">
                pts
              </span>
              <span className="block text-sm font-black leading-none [text-shadow:0_1px_12px_rgba(0,0,0,0.34)]">
                {activePoints.toLocaleString()}
              </span>
            </span>
          </Link>
          <button
            aria-label="Next dashboard"
            className="grid h-11 w-9 shrink-0 place-items-center rounded-2xl border border-transparent bg-transparent text-xs font-black text-cyan-100/80 transition hover:translate-x-0.5 hover:border-amber-200/28 hover:bg-amber-300/8 hover:text-amber-100 active:scale-95"
            onClick={() => rotateHeaderRail("right")}
            type="button"
          >
            &gt;
          </button>
        </div>

        <div className="relative hidden shrink-0 md:block" ref={profileMenuRef}>
          <button
            aria-expanded={profileHubOpen}
            aria-haspopup="menu"
            aria-label="Open profile hub"
            className={`flex min-h-[58px] items-center gap-3 rounded-[22px] border border-transparent bg-transparent px-2 py-2 text-left shadow-none transition hover:-translate-y-0.5 ${
              profileHubOpen
                ? "text-cyan-50"
                : "text-slate-200 hover:bg-white/[0.04]"
            }`}
            onClick={() => setProfileHubOpen((open) => !open)}
            type="button"
          >
            <span className="grid h-10 w-10 place-items-center overflow-hidden rounded-full border border-cyan-200/28 bg-slate-950 text-xs font-black uppercase text-cyan-100 shadow-[0_0_18px_rgba(34,211,238,0.14)]">
              {profileDisplay.avatarUrl ? (
                <img
                  alt={`${firstName} profile`}
                  className="h-full w-full object-cover"
                  src={profileDisplay.avatarUrl}
                />
              ) : (
                <Image
                  alt={`${firstName} profile`}
                  className="h-full w-full object-contain p-0.5"
                  height={40}
                  src="/sound-fitness-logo.png"
                  width={40}
                />
              )}
            </span>
            <span className="hidden min-w-0 leading-none lg:block">
              <span className="block max-w-[110px] truncate text-[10px] font-black uppercase tracking-[0.12em] text-white">
                {firstName}
              </span>
            </span>
            <span className="flex items-center gap-3">
              <span className="flex items-center gap-1.5">
                <span className="sr-only">Sound Points</span>
                <DashboardTabIcon
                  className="h-5 w-5 text-amber-200 drop-shadow-[0_0_12px_rgba(250,204,21,0.28)]"
                  name="Performance"
                />
                <span className="text-sm font-black leading-none text-white">
                  {soundPoints.toLocaleString()}
                </span>
              </span>
              <span className="hidden items-center gap-1.5 xl:flex">
                <span className="sr-only">Sound Tokens</span>
                <Image
                  alt=""
                  aria-hidden="true"
                  className="h-5 w-5 rounded-full border border-cyan-200/24 bg-slate-950 object-contain p-0.5 shadow-[0_0_12px_rgba(34,211,238,0.20)]"
                  height={20}
                  src="/sound-fitness-logo.png"
                  width={20}
                />
                <span className="text-sm font-black leading-none text-white">
                  {soundTokens.toLocaleString()}
                </span>
              </span>
            </span>
          </button>

          <div
            className={`absolute right-0 top-full z-[160] mt-2 w-[min(94vw,760px)] overflow-hidden rounded-[30px] border border-cyan-100/18 bg-slate-950/97 p-4 shadow-[0_22px_72px_rgba(0,0,0,0.62),0_0_38px_rgba(34,211,238,0.12)] ring-1 ring-white/[0.04] backdrop-blur-2xl transition-all duration-200 ${
              profileHubOpen
                ? "visible translate-y-0 scale-100 opacity-100"
                : "invisible translate-y-2 scale-[0.985] opacity-0"
            }`}
            role="menu"
          >
            <div className="rounded-[26px] border border-cyan-200/18 bg-[radial-gradient(circle_at_12%_0%,rgba(34,211,238,0.18),transparent_34%),radial-gradient(circle_at_88%_12%,rgba(251,191,36,0.12),transparent_30%),rgba(255,255,255,0.035)] p-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex min-w-0 items-center gap-4">
                  <span className="grid h-14 w-14 place-items-center overflow-hidden rounded-full border border-cyan-100/30 bg-slate-950 text-sm font-black uppercase text-cyan-100 shadow-[0_0_28px_rgba(34,211,238,0.18)]">
                    {profileDisplay.avatarUrl ? (
                      <img
                        alt={`${firstName} profile`}
                        className="h-full w-full object-cover"
                        src={profileDisplay.avatarUrl}
                      />
                    ) : (
                      profileDisplay.initials
                    )}
                  </span>
                  <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-100">
                      Profile Reward Hub
                    </p>
                    <p className="mt-1 truncate text-lg font-black text-white">
                      {profileDisplay.name}
                    </p>
                    <p className="mt-0.5 truncate text-sm text-slate-400">
                      {profileDisplay.email || "Signed in"}
                    </p>
                  </div>
                </div>
                <div className="hidden shrink-0 gap-2 sm:grid sm:grid-cols-2">
                  <div className="rounded-2xl border border-amber-200/22 bg-amber-300/10 px-3 py-2 text-right">
                    <div className="text-[8px] font-black uppercase tracking-[0.14em] text-amber-100/70">
                      Points
                    </div>
                    <div className="text-lg font-black text-white">
                      {soundPoints.toLocaleString()}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-cyan-200/18 bg-cyan-300/10 px-3 py-2 text-right">
                    <div className="text-[8px] font-black uppercase tracking-[0.14em] text-cyan-100/70">
                      Tokens
                    </div>
                    <div className="text-lg font-black text-white">
                      {soundTokens.toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-3 grid gap-3 md:grid-cols-[minmax(0,1.35fr)_minmax(220px,0.9fr)]">
              <section className="rounded-[24px] border border-white/10 bg-white/[0.035] p-3">
                <p className="px-1 text-[9px] font-black uppercase tracking-[0.18em] text-cyan-100/70">
                  My Hub
                </p>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  {profileHubLinks.map((item) => (
                    <Link
                      className="group flex min-h-[58px] items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/58 px-3 py-2 text-left transition hover:-translate-y-0.5 hover:border-cyan-100/35 hover:bg-cyan-300/10"
                      href={item.href}
                      key={item.label}
                      onClick={closeProfileHub}
                      role="menuitem"
                    >
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-2xl border border-cyan-200/20 bg-cyan-300/10 text-cyan-100">
                        <DashboardTabIcon
                          className="h-4 w-4"
                          label={item.label}
                          name={item.icon}
                        />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-[11px] font-black uppercase tracking-[0.11em] text-white">
                          {item.label}
                        </span>
                        <span className="mt-0.5 block truncate text-[10px] font-semibold text-slate-400">
                          {item.meta}
                        </span>
                      </span>
                    </Link>
                  ))}
                </div>
              </section>

              <section className="rounded-[24px] border border-white/10 bg-white/[0.035] p-3">
                <p className="px-1 text-[9px] font-black uppercase tracking-[0.18em] text-amber-100/70">
                  Account
                </p>
                <div className="mt-2 grid gap-2">
                  {accountLinks.map((item) => (
                    <Link
                      className="group flex min-h-[54px] items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/58 px-3 py-2 text-left transition hover:-translate-y-0.5 hover:border-amber-100/35 hover:bg-amber-300/10"
                      href={item.href}
                      key={item.label}
                      onClick={closeProfileHub}
                      role="menuitem"
                    >
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-2xl border border-amber-200/20 bg-amber-300/10 text-amber-100">
                        <DashboardTabIcon
                          className="h-4 w-4"
                          label={item.label}
                          name={item.icon}
                        />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-[11px] font-black uppercase tracking-[0.11em] text-white">
                          {item.label}
                        </span>
                        <span className="mt-0.5 block truncate text-[10px] font-semibold text-slate-400">
                          {item.meta}
                        </span>
                      </span>
                    </Link>
                  ))}
                  <button
                    className="min-h-[54px] rounded-2xl border border-red-300/20 bg-red-500/10 px-3 py-2 text-left text-[11px] font-black uppercase tracking-[0.11em] text-red-100 transition hover:bg-red-500/15"
                    onClick={signOut}
                    role="menuitem"
                    type="button"
                  >
                    Logout
                  </button>
                </div>
              </section>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
