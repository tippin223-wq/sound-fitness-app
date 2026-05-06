"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Role = "member" | "coach" | "admin";

export default function LoginPage() {
  const router = useRouter();
  const pathname =
    typeof window !== "undefined" ? window.location.pathname : "/login";

  const portal = useMemo(() => {
    if (pathname.startsWith("/admin")) {
      return {
        label: "Admin Sign In",
        title: "Admin Access",
        subtitle:
          "Access your Sound Fitness admin portal and manage the business.",
        button: "Enter Admin Portal →",
        allowedRoles: ["admin"] as Role[],
      };
    }

    if (pathname.startsWith("/coach")) {
      return {
        label: "Coach Sign In",
        title: "Coach Access",
        subtitle:
          "Access your coaching tools, members, sessions, and messages.",
        button: "Enter Coach Portal →",
        allowedRoles: ["coach", "admin"] as Role[],
      };
    }

    return {
      label: "Member Sign In",
      title: "Welcome Back",
      subtitle:
        "Access your Sound Fitness dashboard and keep your momentum going.",
      button: "Enter Member Dashboard →",
      allowedRoles: ["member"] as Role[],
    };
  }, [pathname]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  function getRedirectPath(role: Role) {
    const next =
      typeof window !== "undefined"
        ? new URLSearchParams(window.location.search).get("next")
        : null;

    if (next) return next;

    if (role === "admin") return "/admin";
    if (role === "coach") return "/coach/dashboard";
    return "/dashboard";
  }

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setErrorMessage("");
    setIsLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.user) {
      setIsLoading(false);
      setErrorMessage("Email or password is incorrect.");
      return;
    }

    // 🔥 IMPORTANT: get role
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", data.user.id)
      .single();

    if (profileError || !profile?.role) {
      setIsLoading(false);
      setErrorMessage("Account profile not found.");
      return;
    }

    const role = profile.role as Role;

    // 🚫 block wrong portal usage
    if (!portal.allowedRoles.includes(role)) {
      await supabase.auth.signOut();
      setIsLoading(false);
      setErrorMessage("Use the correct portal for this account.");
      return;
    }

    // ✅ FINAL REDIRECT FIX
    const destination = getRedirectPath(role);

    router.replace(destination);
    router.refresh();
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#020713] text-white">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_20%_0%,rgba(0,132,255,0.22),transparent_30%),radial-gradient(circle_at_80%_10%,rgba(56,189,248,0.12),transparent_28%),linear-gradient(180deg,#020713_0%,#06111f_48%,#020713_100%)]" />

      <header className="relative z-10">
        <div className="mx-auto flex max-w-7xl items-center justify-center px-5 py-8 sm:px-8">
          <Link href="/" className="flex items-center gap-3 text-center">
            <img
              src="/sound-fitness-logo.png"
              alt="Sound Fitness"
              className="h-14 w-14 object-contain"
            />

            <div className="leading-[0.9]">
              <div className="bg-gradient-to-r from-white via-slate-200 to-white bg-clip-text text-3xl font-black uppercase tracking-[0.08em] text-transparent sm:text-4xl">
                SOUND
              </div>

              <div className="relative mt-[-2px] text-xs font-black uppercase tracking-[0.42em] text-sky-400">
                FITNESS
                <div className="absolute left-1/2 top-full mt-1 h-[2px] w-[85%] -translate-x-1/2 bg-gradient-to-r from-transparent via-sky-400 to-transparent opacity-60" />
              </div>
            </div>
          </Link>
        </div>
      </header>

      <section className="relative mx-auto grid min-h-[calc(100vh-120px)] max-w-7xl items-center gap-10 px-5 pb-12 sm:px-8 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="absolute left-[10%] top-[10%] hidden h-[500px] w-[500px] rounded-full bg-sky-500/10 blur-3xl lg:block" />

        <div className="relative hidden lg:block">
          <div className="inline-flex items-center gap-2 rounded-full border border-sky-400/30 bg-sky-500/10 px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-white">
            <span className="h-2 w-2 rounded-full bg-sky-400" />
            {portal.label}
          </div>

          <h1 className="mt-7 max-w-2xl text-6xl font-black uppercase leading-[0.9] tracking-tight text-white">
            Pick up
            <br />
            where you
            <br />
            <span className="text-sky-500">left off.</span>
          </h1>

          <p className="mt-6 max-w-xl text-lg leading-8 text-slate-300">
            {portal.subtitle}
          </p>

          <div className="mt-8 grid max-w-xl gap-4">
            {[
              [
                "📅",
                "Upcoming Sessions",
                "See scheduled training and intro sessions.",
              ],
              [
                "📈",
                "Progress Tracking",
                "Review workouts, goals, habits, and wins.",
              ],
              [
                "💬",
                "Coach Messaging",
                "Keep communication organized in one place.",
              ],
              [
                "🏋️",
                "Training Dashboard",
                "Access your plan, notes, and next steps.",
              ],
            ].map(([icon, title, text]) => (
              <div
                key={title}
                className="flex gap-4 rounded-2xl border border-white/10 bg-white/[0.035] p-4"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-sky-400/30 bg-sky-500/10 text-2xl">
                  {icon}
                </div>

                <div>
                  <h3 className="text-sm font-black uppercase tracking-[0.12em] text-white">
                    {title}
                  </h3>
                  <p className="mt-1 text-sm leading-6 text-slate-400">
                    {text}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <section className="relative mx-auto w-full max-w-xl rounded-[32px] border border-sky-400/40 bg-slate-950/70 p-6 shadow-[0_0_80px_rgba(14,165,233,0.22)] backdrop-blur sm:p-8">
          <div className="absolute inset-0 rounded-[32px] bg-[radial-gradient(circle_at_top_right,rgba(14,165,233,0.2),transparent_35%)]" />

          <div className="relative">
            <div className="text-center">
              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-3xl border border-sky-400/40 bg-sky-500/10 text-3xl shadow-[0_0_35px_rgba(14,165,233,0.25)]">
                🔐
              </div>

              <div className="text-[11px] font-black uppercase tracking-[0.24em] text-sky-400">
                {portal.label}
              </div>

              <h2 className="mt-4 text-4xl font-black uppercase tracking-tight">
                {portal.title}
              </h2>

              <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-slate-400">
                {portal.subtitle}
              </p>
            </div>

            <form
              onSubmit={handleLogin}
              className="mt-8 space-y-4"
              data-lpignore="true"
            >
              <div>
                <label
                  htmlFor="email"
                  className="mb-2 block text-xs font-black uppercase tracking-[0.16em] text-slate-300"
                >
                  Email
                </label>

                <input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="you@example.com"
                  autoComplete="email"
                  data-lpignore="true"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  className="w-full rounded-xl border border-white/15 bg-[#050b16] px-4 py-4 text-sm text-white outline-none placeholder:text-slate-500 transition focus:border-sky-400"
                />
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between gap-4">
                  <label
                    htmlFor="password"
                    className="block text-xs font-black uppercase tracking-[0.16em] text-slate-300"
                  >
                    Password
                  </label>

                  <Link
                    href="/forgot-password"
                    className="text-xs font-black uppercase tracking-[0.12em] text-sky-400 transition hover:text-sky-300"
                  >
                    Forgot Password?
                  </Link>
                </div>

                <input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="Enter password"
                  autoComplete="current-password"
                  data-lpignore="true"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  className="w-full rounded-xl border border-white/15 bg-[#050b16] px-4 py-4 text-sm text-white outline-none placeholder:text-slate-500 transition focus:border-sky-400"
                />
              </div>

              <div className="flex items-center justify-between pt-1">
                <label
                  htmlFor="remember"
                  className="flex cursor-pointer items-center gap-3 text-sm text-slate-400"
                >
                  <input
                    id="remember"
                    name="remember"
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(event) => setRememberMe(event.target.checked)}
                    className="h-4 w-4 rounded border-white/20 bg-[#050b16] accent-sky-500"
                  />
                  Remember me
                </label>

                <span className="hidden text-xs text-slate-500 sm:inline">
                  Secure portal access
                </span>
              </div>

              {errorMessage && (
                <div className="rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                  {errorMessage}
                </div>
              )}

              {!rememberMe && (
                <div className="rounded-xl border border-yellow-400/20 bg-yellow-500/10 px-4 py-3 text-xs leading-5 text-yellow-100">
                  Heads up: Supabase keeps sessions by default. We’ll make this
                  checkbox fully control session persistence in the next auth
                  pass.
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="block w-full rounded-xl bg-sky-500 px-6 py-4 text-center text-sm font-black uppercase tracking-[0.16em] text-white shadow-[0_0_35px_rgba(14,165,233,0.35)] transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isLoading ? "Signing In..." : portal.button}
              </button>

              <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4 text-center">
                <p className="text-sm text-slate-400">New here?</p>

                <Link
                  href="/onboarding"
                  className="mt-2 inline-flex text-sm font-black uppercase tracking-[0.14em] text-sky-400 hover:text-sky-300"
                >
                  Start Free Intro
                </Link>
              </div>
            </form>

            <div className="mt-8 border-t border-white/10 pt-5">
              <p className="text-center text-xs leading-6 text-slate-500">
                Your training data, messages, and progress tools live inside
                your private Sound Fitness portal.
              </p>
            </div>
          </div>
        </section>
      </section>

      <footer className="mx-auto flex max-w-7xl flex-col items-center justify-center gap-3 border-t border-white/10 px-5 py-6 text-xs text-slate-500 sm:px-8">
        <div>© 2026 Sound Fitness. All rights reserved.</div>

        <div className="flex items-center gap-4">
          <Link href="/coach/login" className="hover:text-sky-300">
            Coach Sign In
          </Link>
          <span>•</span>
          <Link href="/admin/login" className="hover:text-sky-300">
            Admin Sign In
          </Link>
        </div>
      </footer>
    </main>
  );
}
