"use client";

import { useState } from "react";

export default function PainTrackingPage() {
  const [painLevel, setPainLevel] = useState(3);

  const areas = [
    {
      area: "Knees",
      status: "Improving",
      note: "Less discomfort during step-ups.",
    },
    {
      area: "Low Back",
      status: "Watch",
      note: "Feels tight after longer sitting.",
    },
    {
      area: "Shoulders",
      status: "Stable",
      note: "No pain during pressing today.",
    },
  ];

  const statusStyles = {
    Improving: "border-emerald-400/20 bg-emerald-500/10 text-emerald-300",
    Watch: "border-amber-400/20 bg-amber-500/10 text-amber-300",
    Stable: "border-sky-400/20 bg-sky-500/10 text-sky-300",
  };

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.16),_transparent_30%),linear-gradient(180deg,#020617_0%,#0f172a_100%)] px-5 py-8 text-white">
      <section className="mx-auto max-w-6xl space-y-6">
        <div className="rounded-[36px] border border-white/10 bg-white/[0.05] p-6 shadow-2xl backdrop-blur">
          <p className="text-[11px] uppercase tracking-[0.28em] text-sky-300">
            Pain Tracking
          </p>

          <h1 className="mt-3 text-4xl font-bold">
            Track discomfort before it becomes a setback.
          </h1>

          <p className="mt-3 max-w-2xl text-slate-300">
            Log pain levels, body areas, patterns, and notes so training can
            adjust intelligently instead of guessing.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <section className="rounded-[32px] border border-white/10 bg-white/[0.05] p-6 shadow-2xl">
            <p className="text-[11px] uppercase tracking-[0.24em] text-amber-300">
              Today’s Pain Level
            </p>

            <h2 className="mt-3 text-2xl font-bold">
              How does your body feel?
            </h2>

            <div className="mt-6 rounded-[28px] border border-white/10 bg-slate-950/60 p-6 text-center">
              <p className="text-6xl font-bold text-sky-300">{painLevel}</p>
              <p className="mt-2 text-sm text-slate-400">out of 10</p>

              <input
                type="range"
                min="0"
                max="10"
                value={painLevel}
                onChange={(e) => setPainLevel(Number(e.target.value))}
                className="mt-6 w-full accent-sky-500"
              />

              <div className="mt-3 flex justify-between text-xs text-slate-500">
                <span>No pain</span>
                <span>Severe</span>
              </div>
            </div>

            <textarea
              placeholder="Add notes: where, when, what made it better or worse..."
              className="mt-5 min-h-32 w-full rounded-[24px] border border-white/10 bg-slate-950/70 p-4 text-white outline-none focus:border-sky-400"
            />

            <button className="mt-4 w-full rounded-2xl bg-sky-500 px-5 py-4 font-bold text-slate-950 hover:bg-sky-400">
              Save Pain Log
            </button>
          </section>

          <section className="rounded-[32px] border border-white/10 bg-white/[0.05] p-6 shadow-2xl">
            <p className="text-[11px] uppercase tracking-[0.24em] text-emerald-300">
              Body Area Notes
            </p>

            <h2 className="mt-3 text-2xl font-bold">Current movement flags</h2>

            <div className="mt-5 space-y-3">
              {areas.map((item) => (
                <div
                  key={item.area}
                  className="rounded-[24px] border border-white/10 bg-slate-950/60 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-bold">{item.area}</h3>
                      <p className="mt-2 text-sm text-slate-400">{item.note}</p>
                    </div>

                    <span
                      className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                        statusStyles[item.status as keyof typeof statusStyles]
                      }`}
                    >
                      {item.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 rounded-[28px] border border-sky-400/20 bg-sky-500/10 p-5">
              <h3 className="text-lg font-bold">Coach Guidance</h3>
              <p className="mt-2 text-sm text-slate-200">
                Pain tracking helps modify workouts early. If discomfort rises,
                reduce intensity, adjust range of motion, and focus on
                controlled movements before progressing.
              </p>
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
