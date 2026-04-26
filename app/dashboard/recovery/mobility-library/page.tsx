"use client";

import { useState } from "react";

export default function MobilityLibraryPage() {
  const [filter, setFilter] = useState("All");

  const drills = [
    {
      name: "Hip Flexor Stretch",
      area: "Hips",
      time: "45 sec",
      purpose: "Open hips",
    },
    {
      name: "90/90 Hip Switch",
      area: "Hips",
      time: "8 reps",
      purpose: "Hip rotation",
    },
    {
      name: "Thoracic Rotation",
      area: "Upper Back",
      time: "8/side",
      purpose: "Better rotation",
    },
    {
      name: "Cat Cow",
      area: "Spine",
      time: "10 reps",
      purpose: "Spinal control",
    },
    {
      name: "Ankle Rocks",
      area: "Ankles",
      time: "10/side",
      purpose: "Squat depth",
    },
    {
      name: "Wall Slides",
      area: "Shoulders",
      time: "10 reps",
      purpose: "Shoulder motion",
    },
    {
      name: "Band Shoulder Dislocates",
      area: "Shoulders",
      time: "12 reps",
      purpose: "Overhead mobility",
    },
    {
      name: "Hamstring Floss",
      area: "Hamstrings",
      time: "10/side",
      purpose: "Posterior chain",
    },
  ];

  const areas = [
    "All",
    "Hips",
    "Upper Back",
    "Spine",
    "Ankles",
    "Shoulders",
    "Hamstrings",
  ];

  const filtered = drills.filter((drill) => {
    return filter === "All" || drill.area === filter;
  });

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.16),_transparent_30%),linear-gradient(180deg,#020617_0%,#0f172a_100%)] px-5 py-8 text-white">
      <section className="mx-auto max-w-7xl space-y-6">
        <div className="rounded-[36px] border border-white/10 bg-white/[0.05] p-6 shadow-2xl backdrop-blur">
          <p className="text-[11px] uppercase tracking-[0.28em] text-sky-300">
            Mobility Library
          </p>

          <h1 className="mt-3 text-4xl font-bold">
            Move better before you train harder.
          </h1>

          <p className="mt-3 max-w-2xl text-slate-300">
            Browse simple mobility drills for hips, shoulders, spine, ankles,
            and recovery days. Use these before workouts or as standalone reset
            work.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          {[
            ["Mobility Drills", drills.length],
            ["Main Areas", areas.length - 1],
            ["Best Use", "Warm-up"],
          ].map(([label, value]) => (
            <div
              key={label}
              className="rounded-[26px] border border-white/10 bg-white/[0.05] p-5 shadow-xl"
            >
              <p className="text-sm text-slate-400">{label}</p>
              <p className="mt-2 text-3xl font-bold text-sky-300">{value}</p>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          {areas.map((area) => (
            <button
              key={area}
              onClick={() => setFilter(area)}
              className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                filter === area
                  ? "bg-sky-500 text-slate-950"
                  : "border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
              }`}
            >
              {area}
            </button>
          ))}
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {filtered.map((drill) => (
            <div
              key={drill.name}
              className="rounded-[28px] border border-white/10 bg-white/[0.05] p-5 shadow-xl transition hover:bg-white/10"
            >
              <p className="text-sm text-slate-400">{drill.area}</p>

              <h2 className="mt-2 text-xl font-bold">{drill.name}</h2>

              <div className="mt-5 space-y-3">
                <div className="rounded-2xl bg-slate-950/60 p-3">
                  <p className="text-xs text-slate-500">Dose</p>
                  <p className="mt-1 font-bold text-white">{drill.time}</p>
                </div>

                <div className="rounded-2xl bg-slate-950/60 p-3">
                  <p className="text-xs text-slate-500">Purpose</p>
                  <p className="mt-1 font-bold text-white">{drill.purpose}</p>
                </div>
              </div>

              <button className="mt-5 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-slate-200 hover:bg-white/10">
                View Drill →
              </button>
            </div>
          ))}
        </div>

        <section className="rounded-[32px] border border-sky-400/20 bg-sky-500/10 p-6 shadow-xl">
          <p className="text-[11px] uppercase tracking-[0.24em] text-sky-300">
            Coach Note
          </p>

          <h2 className="mt-3 text-2xl font-bold">
            Mobility should support training, not replace it.
          </h2>

          <p className="mt-3 max-w-3xl text-slate-200">
            Use mobility drills to improve positions, reduce stiffness, and make
            strength work feel smoother. The goal is better movement you can
            use.
          </p>
        </section>
      </section>
    </main>
  );
}
