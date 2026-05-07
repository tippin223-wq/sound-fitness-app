"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ROUTES } from "@/lib/routes";
import { supabase } from "@/lib/supabaseClient";

type ProtectedHeaderRole = "member" | "admin" | "coach";

type HeaderNavItem = {
  label: string;
  href: string;
};

type HeaderConfig = {
  roleLabel: string;
  brandHref: string;
  loginHref: string;
  navItems: HeaderNavItem[];
};

const HEADER_CONFIG: Record<ProtectedHeaderRole, HeaderConfig> = {
  member: {
    roleLabel: "Member",
    brandHref: ROUTES.dashboard.home,
    loginHref: ROUTES.auth.login,
    navItems: [
      { label: "Dashboard", href: ROUTES.dashboard.home },
      { label: "Workout", href: ROUTES.dashboard.sessionWorkout },
      { label: "Stats", href: ROUTES.dashboard.stats },
      { label: "Builder", href: ROUTES.workoutBuilder.home },
      { label: "Library", href: ROUTES.workoutBuilder.exerciseLibrary },
      { label: "Sessions", href: ROUTES.dashboard.sessions },
      { label: "Progress", href: ROUTES.dashboard.progress },
      { label: "Nutrition", href: ROUTES.nutrition.home },
    ],
  },
  admin: {
    roleLabel: "Admin",
    brandHref: ROUTES.admin.home,
    loginHref: ROUTES.admin.login,
    navItems: [
      { label: "Admin", href: ROUTES.admin.home },
      { label: "Dashboard", href: ROUTES.admin.dashboard },
      { label: "Leads", href: ROUTES.admin.leads },
      { label: "CRM", href: ROUTES.admin.crmDashboard },
      { label: "Clients", href: ROUTES.admin.clients },
      { label: "Content", href: ROUTES.admin.postHub },
      { label: "Site Map", href: ROUTES.admin.siteMap },
      {
        label: "Movement Dev",
        href: ROUTES.admin.devMovementIntelligence,
      },
    ],
  },
  coach: {
    roleLabel: "Coach",
    brandHref: ROUTES.coach.home,
    loginHref: ROUTES.coach.login,
    navItems: [
      { label: "Coach Home", href: ROUTES.coach.home },
      { label: "Coach Dashboard", href: ROUTES.coach.dashboard },
    ],
  },
};

const ROOT_ROUTES = [
  ROUTES.dashboard.home,
  ROUTES.admin.home,
  ROUTES.coach.home,
] as string[];

function isActivePath(pathname: string, href: string) {
  if (ROOT_ROUTES.includes(href)) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function ProtectedHeader({
  role,
}: {
  role: ProtectedHeaderRole;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [openMenu, setOpenMenu] = useState<"nav" | "account" | null>(null);
  const [userEmail, setUserEmail] = useState("");

  const config = HEADER_CONFIG[role];
  const primaryNavItems = config.navItems.slice(0, role === "coach" ? 2 : 4);

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
    async function loadUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      setUserEmail(user?.email || "");
    }

    loadUser();
  }, []);

  async function signOut() {
    setOpenMenu(null);
    await supabase.auth.signOut();
    setUserEmail("");
    router.push(config.loginHref);
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#020713]/90 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-3 py-3 sm:px-5 sm:py-4">
        <Link
          href={config.brandHref}
          className="flex min-w-0 shrink-0 items-center gap-2 sm:gap-3"
        >
          <img
            src="/sound-fitness-logo.png"
            alt="Sound Fitness"
            className="h-9 w-9 shrink-0 object-contain sm:h-10 sm:w-10"
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
          ref={menuRef}
          className="flex min-w-0 items-center justify-end gap-2 sm:gap-3"
        >
          <nav className="hidden items-center gap-1 lg:flex">
            {primaryNavItems.map((item) => {
              const active = isActivePath(pathname, item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`rounded-xl px-3 py-2 text-[11px] font-black uppercase tracking-[0.12em] transition ${
                    active
                      ? "bg-sky-500/15 text-sky-200"
                      : "text-slate-300 hover:bg-sky-500/10 hover:text-white"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="relative">
            <button
              type="button"
              aria-expanded={openMenu === "nav"}
              onClick={() =>
                setOpenMenu((current) => (current === "nav" ? null : "nav"))
              }
              className="min-h-[44px] rounded-xl border border-white/10 bg-white/[0.04] px-3 py-3 text-[10px] font-black uppercase tracking-[0.12em] text-slate-300 transition hover:border-sky-400/50 hover:bg-sky-500/10 sm:px-4 sm:text-[11px] sm:tracking-[0.16em]"
            >
              Menu
            </button>

            {openMenu === "nav" && (
              <div className="absolute right-0 mt-3 max-h-[70vh] w-72 max-w-[calc(100vw-1.5rem)] overflow-y-auto rounded-2xl border border-white/10 bg-[#020713] shadow-2xl shadow-black/60">
                <div className="p-2">
                  {config.navItems.map((item) => {
                    const active = isActivePath(pathname, item.href);

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        aria-current={active ? "page" : undefined}
                        onClick={() => setOpenMenu(null)}
                        className={`block rounded-xl px-4 py-3 text-sm font-bold transition ${
                          active
                            ? "bg-sky-500/15 text-sky-100"
                            : "text-white hover:bg-sky-500/10"
                        }`}
                      >
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="relative">
            <button
              type="button"
              aria-expanded={openMenu === "account"}
              onClick={() =>
                setOpenMenu((current) =>
                  current === "account" ? null : "account",
                )
              }
              className="min-h-[44px] rounded-xl bg-sky-500 px-3 py-3 text-[10px] font-black uppercase tracking-[0.12em] text-white shadow-[0_0_24px_rgba(14,165,233,0.28)] transition hover:bg-sky-400 sm:px-4 sm:text-[11px] sm:tracking-[0.16em]"
            >
              Account
            </button>

            {openMenu === "account" && (
              <div className="absolute right-0 mt-3 w-72 max-w-[calc(100vw-1.5rem)] rounded-2xl border border-white/10 bg-[#020713] p-2 shadow-2xl shadow-black/60">
                <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
                  <div className="text-[10px] font-black uppercase tracking-[0.16em] text-sky-300">
                    {config.roleLabel}
                  </div>
                  <div className="mt-1 truncate text-sm font-bold text-white">
                    {userEmail || "Signed in"}
                  </div>
                </div>

                <div className="mt-2 grid gap-1">
                  <Link
                    href={config.brandHref}
                    onClick={() => setOpenMenu(null)}
                    className="rounded-xl px-4 py-3 text-sm font-bold text-white hover:bg-sky-500/10"
                  >
                    Home
                  </Link>

                  {role === "member" && (
                    <Link
                      href={ROUTES.dashboard.profile}
                      onClick={() => setOpenMenu(null)}
                      className="rounded-xl px-4 py-3 text-sm font-bold text-white hover:bg-sky-500/10"
                    >
                      Profile
                    </Link>
                  )}

                  <button
                    type="button"
                    onClick={signOut}
                    className="rounded-xl px-4 py-3 text-left text-sm font-bold text-red-200 hover:bg-red-500/10"
                  >
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
