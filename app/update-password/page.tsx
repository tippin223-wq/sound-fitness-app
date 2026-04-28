"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function UpdatePasswordPage() {
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleUpdatePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setMessage("");
    setErrorMessage("");

    if (password.length < 8) {
      setErrorMessage("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match.");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.updateUser({
      password,
    });

    setLoading(false);

    if (error) {
      setErrorMessage(
        "Password update failed. Please request a new reset link.",
      );
      return;
    }

    setMessage("Password updated successfully. Redirecting to login...");

    setTimeout(() => {
      router.replace("/login");
    }, 1800);
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

      <section className="relative mx-auto grid min-h-[calc(100vh-120px)] max-w-7xl items-center gap-10 px-5 pb-12 sm:px-8 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="absolute left-[10%] top-[12%] hidden h-[500px] w-[500px] rounded-full bg-sky-500/10 blur-3xl lg:block" />

        <div className="relative hidden lg:block">
          <div className="inline-flex items-center gap-2 rounded-full border border-sky-400/30 bg-sky-500/10 px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-white">
            <span className="h-2 w-2 rounded-full bg-sky-400" />
            Secure Password Update
          </div>

          <h1 className="mt-7 max-w-2xl text-6xl font-black uppercase leading-[0.9] tracking-tight text-white">
            Create new
            <br />
            access.
            <br />
            <span className="text-sky-500">Stay protected.</span>
          </h1>

          <p className="mt-6 max-w-xl text-lg leading-8 text-slate-300">
            Choose a strong password to protect your Sound Fitness account,
            training dashboard, progress history, and coach communication.
          </p>

          <div className="mt-8 grid max-w-xl gap-4">
            {[
              [
                "🔐",
                "Encrypted Auth",
                "Supabase securely handles password updates.",
              ],
              [
                "🛡️",
                "Private Account",
                "Protect your training data and progress.",
              ],
              ["📈", "Keep Momentum", "Get back into your dashboard quickly."],
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
                🔑
              </div>

              <div className="text-[11px] font-black uppercase tracking-[0.24em] text-sky-400">
                Update Password
              </div>

              <h2 className="mt-4 text-4xl font-black uppercase tracking-tight">
                New password
              </h2>

              <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-slate-400">
                Enter and confirm your new password below.
              </p>
            </div>

            <form onSubmit={handleUpdatePassword} className="mt-8 space-y-4">
              <div>
                <label
                  htmlFor="password"
                  className="mb-2 block text-xs font-black uppercase tracking-[0.16em] text-slate-300"
                >
                  New Password
                </label>

                <input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="At least 8 characters"
                  autoComplete="new-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  className="w-full rounded-xl border border-white/15 bg-[#050b16] px-4 py-4 text-sm text-white outline-none placeholder:text-slate-500 transition focus:border-sky-400"
                />
              </div>

              <div>
                <label
                  htmlFor="confirmPassword"
                  className="mb-2 block text-xs font-black uppercase tracking-[0.16em] text-slate-300"
                >
                  Confirm Password
                </label>

                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  placeholder="Re-enter new password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  required
                  className="w-full rounded-xl border border-white/15 bg-[#050b16] px-4 py-4 text-sm text-white outline-none placeholder:text-slate-500 transition focus:border-sky-400"
                />
              </div>

              {errorMessage && (
                <div className="rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                  {errorMessage}
                </div>
              )}

              {message && (
                <div className="rounded-xl border border-sky-400/30 bg-sky-500/10 px-4 py-3 text-sm text-sky-100">
                  {message}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="block w-full rounded-xl bg-sky-500 px-6 py-4 text-center text-sm font-black uppercase tracking-[0.16em] text-white shadow-[0_0_35px_rgba(14,165,233,0.35)] transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Updating..." : "Update Password →"}
              </button>

              <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4 text-center">
                <p className="text-sm text-slate-400">
                  Already updated your password?
                </p>

                <Link
                  href="/login"
                  className="mt-2 inline-flex text-sm font-black uppercase tracking-[0.14em] text-sky-400 hover:text-sky-300"
                >
                  Back to Member Sign In
                </Link>
              </div>
            </form>

            <div className="mt-8 border-t border-white/10 pt-5">
              <p className="text-center text-xs leading-6 text-slate-500">
                Password updates are handled securely through your Sound Fitness
                authentication system.
              </p>
            </div>
          </div>
        </section>
      </section>

      <footer className="mx-auto flex max-w-7xl flex-col items-center justify-center gap-3 border-t border-white/10 px-5 py-6 text-xs text-slate-500 sm:px-8">
        <div>© 2026 Sound Fitness. All rights reserved.</div>
      </footer>
    </main>
  );
}
