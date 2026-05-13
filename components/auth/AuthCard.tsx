import Link from "next/link";
import type { ReactNode } from "react";

type AuthCardProps = {
  eyebrow?: string;
  title: string;
  subtitle: string;
  icon?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
};

export default function AuthCard({
  eyebrow = "Sound Fitness Access",
  title,
  subtitle,
  icon = "SF",
  children,
  footer,
}: AuthCardProps) {
  return (
    <main className="min-h-screen overflow-hidden bg-[#020713] text-white">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_18%_0%,rgba(14,165,233,0.22),transparent_30%),radial-gradient(circle_at_80%_8%,rgba(251,191,36,0.13),transparent_28%),linear-gradient(180deg,#020713_0%,#07111f_50%,#020713_100%)]" />

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
            Premium Training Portal
          </div>

          <h1 className="mt-7 max-w-2xl text-6xl font-black uppercase leading-[0.9] tracking-tight text-white">
            Build the
            <br />
            next version
            <br />
            <span className="text-sky-500">of you.</span>
          </h1>

          <p className="mt-6 max-w-xl text-lg leading-8 text-slate-300">
            Workouts, nutrition, recovery, and progress tracking connect into
            one coaching system so each choice has context.
          </p>

          <div className="mt-8 grid max-w-xl gap-4">
            {[
              ["Workouts", "Sessions, builders, plans, and calendar flow."],
              ["Nutrition", "Meal direction, hydration, grocery, and macros."],
              ["Recovery", "Readiness, mobility, soreness, and safe options."],
            ].map(([label, text]) => (
              <div
                key={label}
                className="rounded-2xl border border-white/10 bg-white/[0.035] p-4"
              >
                <h3 className="text-sm font-black uppercase tracking-[0.12em] text-white">
                  {label}
                </h3>
                <p className="mt-1 text-sm leading-6 text-slate-400">{text}</p>
              </div>
            ))}
          </div>
        </div>

        <section className="relative mx-auto w-full max-w-xl overflow-hidden rounded-[32px] border border-sky-400/40 bg-slate-950/76 p-6 shadow-[0_0_80px_rgba(14,165,233,0.22)] backdrop-blur sm:p-8">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(14,165,233,0.2),transparent_35%)]" />
          <div className="relative">
            <div className="text-center">
              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-3xl border border-sky-400/40 bg-sky-500/10 text-xl font-black text-sky-100 shadow-[0_0_35px_rgba(14,165,233,0.25)]">
                {icon}
              </div>
              <div className="text-[11px] font-black uppercase tracking-[0.24em] text-sky-400">
                {eyebrow}
              </div>
              <h2 className="mt-4 text-3xl font-black uppercase tracking-tight sm:text-4xl">
                {title}
              </h2>
              <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-slate-400">
                {subtitle}
              </p>
            </div>

            <div className="mt-8">{children}</div>

            {footer ? (
              <div className="mt-8 border-t border-white/10 pt-5">
                {footer}
              </div>
            ) : null}
          </div>
        </section>
      </section>
    </main>
  );
}
