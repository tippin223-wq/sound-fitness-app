import Link from "next/link";
import { ROUTES } from "@/lib/routes";

export default function ConfirmationPage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.16),_transparent_30%),linear-gradient(180deg,#020617_0%,#0f172a_100%)] px-5 py-10 text-white">
      <section className="mx-auto max-w-4xl space-y-6">
        <div className="rounded-[36px] border border-emerald-400/20 bg-emerald-500/10 p-8 text-center shadow-2xl">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-400 text-4xl text-slate-950 shadow-lg">
            ✓
          </div>

          <p className="mt-6 text-[11px] uppercase tracking-[0.28em] text-emerald-300">
            Booking Request Sent
          </p>

          <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">
            You’re on the path.
          </h1>

          <p className="mx-auto mt-4 max-w-2xl text-slate-200">
            Your booking request has been received. Next, your coach will
            confirm the session details and help you start with a clear plan.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {[
            [
              "1",
              "Request received",
              "Your preferred time and session type were submitted.",
            ],
            [
              "2",
              "Coach confirms",
              "We’ll review the details and lock in the best next step.",
            ],
            [
              "3",
              "Start strong",
              "You’ll know exactly what to do before your session begins.",
            ],
          ].map(([number, title, text]) => (
            <div
              key={title}
              className="rounded-[28px] border border-white/10 bg-white/[0.05] p-5 shadow-xl"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-500 font-bold text-slate-950">
                {number}
              </div>

              <h2 className="mt-4 text-lg font-bold">{title}</h2>
              <p className="mt-2 text-sm text-slate-400">{text}</p>
            </div>
          ))}
        </div>

        <div className="rounded-[32px] border border-white/10 bg-white/[0.05] p-6 shadow-2xl">
          <p className="text-[11px] uppercase tracking-[0.24em] text-sky-300">
            While You Wait
          </p>

          <h2 className="mt-3 text-2xl font-bold">
            Get ready for your first session
          </h2>

          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {[
              "Wear comfortable clothes you can move in",
              "Have water nearby",
              "Think about your top 1–2 goals",
              "Write down any injuries, pain, or limitations",
            ].map((item) => (
              <div
                key={item}
                className="rounded-2xl border border-white/10 bg-slate-950/60 p-4 text-sm text-slate-200"
              >
                ✅ {item}
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Link
            href={ROUTES.dashboard.home}
            className="rounded-2xl bg-sky-500 px-5 py-4 text-center font-bold text-slate-950 shadow-lg shadow-sky-500/20 hover:bg-sky-400"
          >
            Go to Dashboard
          </Link>

          <Link
            href={ROUTES.onboarding.assessment}
            className="rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-center font-semibold text-slate-200 hover:bg-white/10"
          >
            Complete Assessment
          </Link>
        </div>
      </section>
    </main>
  );
}
