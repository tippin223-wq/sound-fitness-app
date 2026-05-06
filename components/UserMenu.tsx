"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { ROUTES } from "@/lib/routes";

export default function UserMenu() {
  const router = useRouter();
  const menuRef = useRef<HTMLDivElement | null>(null);

  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    async function loadUser() {
      const { data } = await supabase.auth.getUser();
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
      <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:items-center sm:justify-center sm:gap-3">
        <Link
          href={ROUTES.auth.login}
          className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-white/15 bg-white/[0.03] px-3 py-3 text-center text-[10px] font-black uppercase tracking-[0.12em] text-white transition hover:border-sky-400/50 hover:bg-sky-500/10 sm:px-5 sm:text-xs sm:tracking-[0.18em]"
        >
          Member Sign In
        </Link>

        <Link
          href={ROUTES.onboarding.home}
          className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-sky-500 px-3 py-3 text-center text-[10px] font-black uppercase tracking-[0.12em] text-white shadow-[0_0_35px_rgba(14,165,233,0.35)] transition hover:bg-sky-400 sm:px-5 sm:text-xs sm:tracking-[0.18em]"
        >
          Start Free Intro
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
        className="flex items-center gap-3 rounded-2xl border border-sky-400/30 bg-sky-500/10 px-4 py-3 text-left transition hover:border-sky-300/60 hover:bg-sky-500/15"
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-500 text-sm font-black text-white shadow-[0_0_25px_rgba(14,165,233,0.35)]">
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
        <div className="absolute right-0 top-full z-50 mt-3 w-72 overflow-hidden rounded-2xl border border-white/10 bg-[#020713] shadow-2xl shadow-black/60">
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
