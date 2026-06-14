"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getSupabaseUser, supabase } from "@/lib/supabaseClient";
import { ROUTES } from "@/lib/routes";
import { ArrowRight, LogIn, Sparkles } from "lucide-react";

export default function UserMenu() {
  const router = useRouter();
  const menuRef = useRef<HTMLDivElement | null>(null);

  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    async function loadUser() {
      const { data } = await getSupabaseUser();
      setUserEmail(data.user?.email ?? null);
    }

    loadUser();

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUserEmail(session?.user?.email ?? null);
      },
    );

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
    setOpen(false);
    setUserEmail(null);
    router.push(ROUTES.public.home);
    router.refresh();
  }

  if (!userEmail) {
    return (
      <div className="relative grid w-full isolate grid-cols-2 gap-1.5 overflow-hidden rounded-[1.65rem] border border-sky-200/18 bg-[linear-gradient(135deg,rgba(14,34,60,0.82),rgba(2,8,22,0.9)_48%,rgba(4,19,38,0.86))] p-1.5 shadow-[0_24px_70px_rgba(0,0,0,0.32),0_0_0_1px_rgba(14,165,233,0.09),inset_0_1px_0_rgba(255,255,255,0.11)] backdrop-blur-xl sm:w-auto sm:min-w-[430px]">
        <span className="pointer-events-none absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-cyan-100/70 to-transparent" />
        <span className="pointer-events-none absolute -left-10 top-1/2 h-24 w-24 -translate-y-1/2 rounded-full bg-cyan-300/10 blur-2xl" />
        <span className="pointer-events-none absolute -right-8 top-0 h-20 w-28 rounded-full bg-sky-400/14 blur-2xl" />

        <Link
          href={ROUTES.auth.login}
          className="group relative inline-flex min-h-[54px] items-center justify-center gap-2 overflow-hidden rounded-[1.25rem] border border-white/10 bg-white/[0.045] px-2.5 py-2.5 text-center text-[10px] font-black uppercase tracking-[0.09em] text-slate-100 shadow-[0_10px_24px_rgba(2,6,23,0.18),inset_0_1px_0_rgba(255,255,255,0.08)] transition duration-200 hover:-translate-y-0.5 hover:border-sky-200/40 hover:bg-sky-300/10 hover:text-white hover:shadow-[0_16px_34px_rgba(2,6,23,0.24),inset_0_1px_0_rgba(255,255,255,0.12)] focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300/60 sm:px-4 sm:text-[11px] sm:tracking-[0.13em]"
        >
          <span className="pointer-events-none absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-sky-100/55 to-transparent opacity-0 transition group-hover:opacity-100" />
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-sky-100/18 bg-sky-300/10 text-sky-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.14)] transition group-hover:bg-sky-300/16">
            <LogIn
              aria-hidden="true"
              className="h-4 w-4 transition group-hover:translate-x-0.5"
              strokeWidth={2.6}
            />
          </span>
          <span className="min-w-0">Member Sign In</span>
        </Link>

        <Link
          href={ROUTES.onboarding.assessment}
          className="group relative inline-flex min-h-[54px] items-center justify-center gap-2 overflow-hidden rounded-[1.25rem] border border-cyan-100/28 bg-[linear-gradient(135deg,#0ea5e9,#22d3ee_48%,#38bdf8)] px-2.5 py-2.5 text-center text-[10px] font-black uppercase tracking-[0.09em] text-white shadow-[0_18px_42px_rgba(14,165,233,0.34),inset_0_1px_0_rgba(255,255,255,0.24)] transition duration-200 hover:-translate-y-0.5 hover:border-cyan-50/45 hover:brightness-110 hover:shadow-[0_22px_52px_rgba(34,211,238,0.42),inset_0_1px_0_rgba(255,255,255,0.32)] focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-100/75 sm:px-4 sm:text-[11px] sm:tracking-[0.13em]"
        >
          <span className="pointer-events-none absolute inset-y-0 left-0 w-1/2 -translate-x-full bg-gradient-to-r from-transparent via-white/22 to-transparent transition duration-700 group-hover:translate-x-[220%]" />
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/28 bg-white/18 text-cyan-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.28)]">
            <Sparkles
              aria-hidden="true"
              className="h-4 w-4"
              strokeWidth={2.6}
            />
          </span>
          <span className="min-w-0">Start Free Intro</span>
          <ArrowRight
            aria-hidden="true"
            className="hidden h-4 w-4 shrink-0 transition group-hover:translate-x-0.5 sm:block"
            strokeWidth={2.8}
          />
        </Link>
      </div>
    );
  }

  const initial = userEmail.charAt(0).toUpperCase();

  return (
    <div ref={menuRef} className="relative z-50">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex min-h-[44px] items-center gap-2 rounded-2xl border border-sky-400/30 bg-sky-500/10 px-2 py-2 text-left transition hover:border-sky-300/60 hover:bg-sky-500/15 sm:gap-3 sm:px-4 sm:py-3"
      >
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-sky-500 text-sm font-black text-white shadow-[0_0_25px_rgba(14,165,233,0.35)] sm:h-10 sm:w-10">
          {initial}
        </div>

        <div className="hidden sm:block">
          <div className="text-xs font-black uppercase tracking-[0.14em] text-white">
            Member
          </div>
          <div className="max-w-[190px] truncate text-xs text-slate-400">
            {userEmail}
          </div>
        </div>

        <span className="text-xs text-slate-400">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-3 w-72 max-w-[88vw] overflow-hidden rounded-2xl border border-white/10 bg-[#020713] shadow-2xl shadow-black/60">
          <div className="border-b border-white/10 px-5 py-4">
            <div className="text-xs font-black uppercase tracking-[0.18em] text-sky-400">
              Signed In
            </div>
            <div className="mt-2 truncate text-sm text-slate-300">
              {userEmail}
            </div>
          </div>

          <div className="p-2">
            <Link
              href={ROUTES.dashboard.home}
              onClick={() => setOpen(false)}
              className="block rounded-xl px-4 py-3 text-sm font-bold text-white transition hover:bg-sky-500/10"
            >
              Dashboard
            </Link>

            <Link
              href={ROUTES.dashboard.profile}
              onClick={() => setOpen(false)}
              className="block rounded-xl px-4 py-3 text-sm font-bold text-white transition hover:bg-sky-500/10"
            >
              Account Settings
            </Link>

            <Link
              href={ROUTES.dashboard.payments}
              onClick={() => setOpen(false)}
              className="block rounded-xl px-4 py-3 text-sm font-bold text-white transition hover:bg-sky-500/10"
            >
              Billing
            </Link>

            <button
              type="button"
              onClick={signOut}
              className="mt-2 block w-full rounded-xl px-4 py-3 text-left text-sm font-black text-red-300 transition hover:bg-red-500/10"
            >
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
