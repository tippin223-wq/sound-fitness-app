"use client";

import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import UserMenu from "@/components/UserMenu";

const navItems = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Schedule", href: "/dashboard/training-calendar" },
  { label: "Progress", href: "/dashboard/progress" },
  { label: "Messaging", href: "/dashboard/coach-messaging" },
  { label: "Builder", href: "/dashboard/workout-builder" },
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
      <div className="mx-auto flex w-full max-w-[1120px] items-center justify-between px-5 py-4">
        {/* LEFT: LOGO */}
        <Link href="/" className="flex items-center gap-3">
          <img
            src="/sound-fitness-logo.png"
            alt="Sound Fitness"
            className="h-10 w-10 object-contain"
          />

          <div className="leading-[0.9]">
            <div className="text-xl font-black uppercase tracking-[0.08em] text-white">
              SOUND
            </div>
            <div className="text-[10px] font-black uppercase tracking-[0.38em] text-sky-400">
              FITNESS
            </div>
          </div>
        </Link>

        {/* RIGHT SIDE */}
        <div className="flex items-center gap-3">
          {/* NAV DROPDOWN */}
          <div ref={menuRef} className="relative">
            <button
              onClick={() => setOpen(!open)}
              className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-[11px] font-black uppercase tracking-[0.16em] text-slate-300 hover:border-sky-400/50 hover:bg-sky-500/10"
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
