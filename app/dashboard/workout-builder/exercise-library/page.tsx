"use client";

import { useState } from "react";

export default function ExerciseLibraryPage() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");

  const exercises = [
    { name: "Goblet Squat", group: "Legs" },
    { name: "Romanian Deadlift", group: "Legs" },
    { name: "Push-Up", group: "Chest" },
    { name: "Incline DB Press", group: "Chest" },
    { name: "Bent Over Row", group: "Back" },
    { name: "Lat Pulldown", group: "Back" },
    { name: "Plank", group: "Core" },
    { name: "Dead Bug", group: "Core" },
    { name: "Shoulder Press", group: "Shoulders" },
    { name: "Lateral Raise", group: "Shoulders" },
    { name: "Hip Mobility Flow", group: "Mobility" },
    { name: "Thoracic Rotation", group: "Mobility" },
  ];

  const groups = [
    "All",
    "Legs",
    "Chest",
    "Back",
    "Core",
    "Shoulders",
    "Mobility",
  ];

  const filtered = exercises.filter((ex) => {
    return (
      (filter === "All" || ex.group === filter) &&
      ex.name.toLowerCase().includes(search.toLowerCase())
    );
  });

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.16),_transparent_30%),linear-gradient(180deg,#020617_0%,#0f172a_100%)] px-5 py-8 text-white">
      <section className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div className="rounded-[36px] border border-white/10 bg-white/[0.05] p-6 shadow-2xl backdrop-blur">
          <p className="text-[11px] uppercase tracking-[0.28em] text-sky-300">
            Exercise Library
          </p>

          <h1 className="mt-3 text-4xl font-bold">Train with clarity.</h1>

          <p className="mt-3 max-w-2xl text-slate-300">
            Every movement has purpose. Browse exercises, learn technique, and
            make every rep count.
          </p>
        </div>

        {/* Search + Filter */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <input
            placeholder="Search exercises..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full md:w-80 rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none focus:border-sky-400"
          />

          <div className="flex flex-wrap gap-2">
            {groups.map((g) => (
              <button
                key={g}
                onClick={() => setFilter(g)}
                className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                  filter === g
                    ? "bg-sky-500 text-slate-950"
                    : "bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10"
                }`}
              >
                {g}
              </button>
            ))}
          </div>
        </div>

        {/* Exercise Grid */}
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {filtered.map((ex) => (
            <div
              key={ex.name}
              className="rounded-[26px] border border-white/10 bg-white/[0.05] p-5 shadow-xl backdrop-blur hover:bg-white/10 transition cursor-pointer"
            >
              <p className="text-sm text-slate-400">{ex.group}</p>
              <h2 className="mt-2 text-lg font-bold">{ex.name}</h2>

              <button className="mt-4 text-sm text-sky-300 hover:text-sky-200">
                View Demo →
              </button>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {filtered.length === 0 && (
          <div className="text-center text-slate-400 mt-10">
            No exercises found.
          </div>
        )}
      </section>
    </main>
  );
}
