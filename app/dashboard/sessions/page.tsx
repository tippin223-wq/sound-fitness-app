"use client";

import { useState } from "react";

export default function SessionsPage() {
  const [selectedPackage, setSelectedPackage] = useState("12 Session Pack");

  const packages = [
    {
      name: "4 Session Pack",
      total: 4,
      used: 1,
      price: "$440",
      status: "Starter",
    },
    {
      name: "12 Session Pack",
      total: 12,
      used: 5,
      price: "$1,260",
      status: "Active",
    },
    {
      name: "24 Session Pack",
      total: 24,
      used: 9,
      price: "$2,400",
      status: "Best Value",
    },
  ];

  const active =
    packages.find((pkg) => pkg.name === selectedPackage) || packages[1];
  const remaining = active.total - active.used;
  const percentUsed = `${Math.round((active.used / active.total) * 100)}%`;

  const recentSessions = [
    {
      date: "Apr 22",
      type: "In-Home Strength",
      focus: "Lower Body + Core",
      status: "Completed",
    },
    {
      date: "Apr 18",
      type: "In-Home Strength",
      focus: "Upper Body + Mobility",
      status: "Completed",
    },
    {
      date: "Apr 15",
      type: "Assisted Stretch",
      focus: "Hips + Hamstrings",
      status: "Completed",
    },
    {
      date: "Apr 26",
      type: "Online Coaching",
      focus: "Workout Review",
      status: "Upcoming",
    },
  ];

  const statusStyles = {
    Completed: "border-emerald-400/20 bg-emerald-500/10 text-emerald-300",
    Upcoming: "border-sky-400/20 bg-sky-500/10 text-sky-300",
  };

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.16),_transparent_30%),linear-gradient(180deg,#020617_0%,#0f172a_100%)] px-5 py-8 text-white">
      <section className="mx-auto max-w-7xl space-y-6">
        <div className="rounded-[36px] border border-white/10 bg-white/[0.05] p-6 shadow-2xl">
          <p className="text-[11px] uppercase tracking-[0.28em] text-sky-300">
            Session Tracker
          </p>

          <h1 className="mt-3 text-4xl font-bold">
            Track sessions used, remaining, and upcoming.
          </h1>

          <p className="mt-3 max-w-2xl text-slate-300">
            Keep training packages clear so clients know what they purchased,
            what they’ve used, and when it’s time to renew.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-[26px] border border-white/10 bg-white/[0.05] p-5">
            <p className="text-sm text-slate-400">Package</p>
            <p className="mt-2 text-2xl font-bold text-sky-300">
              {active.name}
            </p>
          </div>

          <div className="rounded-[26px] border border-emerald-400/20 bg-emerald-500/10 p-5">
            <p className="text-sm text-emerald-300">Remaining</p>
            <p className="mt-2 text-3xl font-bold">{remaining}</p>
          </div>

          <div className="rounded-[26px] border border-white/10 bg-white/[0.05] p-5">
            <p className="text-sm text-slate-400">Used</p>
            <p className="mt-2 text-3xl font-bold">{active.used}</p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <section className="rounded-[32px] border border-white/10 bg-white/[0.05] p-6 shadow-2xl">
            <p className="text-[11px] uppercase tracking-[0.24em] text-emerald-300">
              Package Selection
            </p>

            <h2 className="mt-3 text-2xl font-bold">Choose active package</h2>

            <div className="mt-5 space-y-4">
              {packages.map((pkg) => {
                const remainingSessions = pkg.total - pkg.used;

                return (
                  <button
                    key={pkg.name}
                    onClick={() => setSelectedPackage(pkg.name)}
                    className={`w-full rounded-[26px] border p-5 text-left transition ${
                      selectedPackage === pkg.name
                        ? "border-sky-400 bg-sky-500/15"
                        : "border-white/10 bg-slate-950/60 hover:bg-white/10"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-xl font-bold">{pkg.name}</h3>
                        <p className="mt-2 text-sm text-slate-400">
                          {pkg.used} used • {remainingSessions} remaining
                        </p>
                      </div>

                      <p className="text-xl font-bold text-sky-300">
                        {pkg.price}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="rounded-[32px] border border-sky-400/20 bg-sky-500/10 p-6 shadow-2xl">
            <p className="text-[11px] uppercase tracking-[0.24em] text-sky-300">
              Usage Progress
            </p>

            <h2 className="mt-3 text-2xl font-bold">
              {active.used} of {active.total} sessions used
            </h2>

            <div className="mt-6 h-4 overflow-hidden rounded-full bg-slate-950/70">
              <div
                className="h-full rounded-full bg-sky-400"
                style={{ width: percentUsed }}
              />
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl bg-slate-950/60 p-4">
                <p className="text-sm text-slate-400">Purchased</p>
                <p className="mt-2 text-2xl font-bold">{active.total}</p>
              </div>

              <div className="rounded-2xl bg-slate-950/60 p-4">
                <p className="text-sm text-slate-400">Remaining</p>
                <p className="mt-2 text-2xl font-bold text-emerald-300">
                  {remaining}
                </p>
              </div>
            </div>

            <button className="mt-6 w-full rounded-2xl bg-sky-500 px-5 py-4 font-bold text-slate-950 hover:bg-sky-400">
              Renew / Buy More Sessions
            </button>
          </section>
        </div>

        <section className="rounded-[32px] border border-white/10 bg-white/[0.05] p-6 shadow-2xl">
          <p className="text-[11px] uppercase tracking-[0.24em] text-amber-300">
            Session History
          </p>

          <h2 className="mt-3 text-2xl font-bold">
            Recent and upcoming sessions
          </h2>

          <div className="mt-5 space-y-3">
            {recentSessions.map((session) => (
              <div
                key={`${session.date}-${session.focus}`}
                className="grid gap-3 rounded-[24px] border border-white/10 bg-slate-950/60 p-4 md:grid-cols-4 md:items-center"
              >
                <p className="text-sm text-slate-400">{session.date}</p>
                <p className="font-semibold">{session.type}</p>
                <p className="text-sm text-slate-300">{session.focus}</p>

                <span
                  className={`w-fit rounded-full border px-3 py-1 text-xs font-semibold ${
                    statusStyles[session.status as keyof typeof statusStyles]
                  }`}
                >
                  {session.status}
                </span>
              </div>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}
