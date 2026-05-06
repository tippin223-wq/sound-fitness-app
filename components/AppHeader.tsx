"use client";

import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import UserMenu from "@/components/UserMenu";
import { ROUTES } from "@/lib/routes";

const navItems = [
  { label: "Dashboard", href: ROUTES.dashboard.home },
  { label: "Schedule", href: ROUTES.dashboard.trainingCalendar },
  { label: "Progress", href: ROUTES.dashboard.progress },
  { label: "Messaging", href: ROUTES.dashboard.coachMessaging },
  { label: "Builder", href: ROUTES.workoutBuilder.home },
];

export default function AppHeader() {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#020713]/90 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-[1120px] items-center justify-between gap-2 px-3 py-3 sm:px-5 sm:py-4">
        {/* LEFT: LOGO */}
        <Link
          href={ROUTES.public.home}
          className="flex min-w-0 shrink-0 items-center gap-2 sm:gap-3"
        >
          <img
            src="/sound-fitness-logo.png"
            alt="Sound Fitness"
            className="h-9 w-9 object-contain sm:h-10 sm:w-10"
          />

          <div className="leading-[0.9]">
            <div className="text-lg font-black uppercase tracking-[0.06em] text-white sm:text-xl sm:tracking-[0.08em]">
              SOUND
            </div>
            <div className="text-[9px] font-black uppercase tracking-[0.28em] text-sky-400 sm:text-[10px] sm:tracking-[0.38em]">
              FITNESS
            </div>
          </div>
        </Link>

        {/* RIGHT SIDE */}
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          {/* NAV DROPDOWN */}
          <div ref={menuRef} className="relative">
            <button
              onClick={() => setOpen(!open)}
              className="min-h-[44px] rounded-xl border border-white/10 bg-white/[0.04] px-3 py-3 text-[10px] font-black uppercase tracking-[0.12em] text-slate-300 hover:border-sky-400/50 hover:bg-sky-500/10 sm:px-4 sm:text-[11px] sm:tracking-[0.16em]"
            >
              Menu ▾
            </button>

            {open && (
              <div className="absolute right-0 mt-3 w-56 rounded-2xl border border-white/10 bg-[#020713] shadow-2xl shadow-black/60">
                <div className="p-2">
                  {navItems.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className="block rounded-xl px-4 py-3 text-sm font-bold text-white hover:bg-sky-500/10"
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* USER MENU */}
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
