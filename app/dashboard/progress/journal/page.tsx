"use client";

import { useState } from "react";

export default function JournalPage() {
  const [entry, setEntry] = useState("");

  const entries = [
    {
      date: "Today",
      text: "Felt strong during lower body day. Step-ups were smoother, less knee discomfort.",
    },
    {
      date: "Yesterday",
      text: "Energy was low, but still got through the workout. Need better sleep tonight.",
    },
  ];

  const prompts = [
    "How did your workout feel?",
    "What improved today?",
    "Any pain or tightness?",
    "Energy level (1–10)?",
    "Biggest win today?",
  ];

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.16),_transparent_30%),linear-gradient(180deg,#020617_0%,#0f172a_100%)] px-5 py-8 text-white">
      <section className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        {/* LEFT SIDE */}
        <div className="space-y-6">
          <div className="rounded-[36px] border border-white/10 bg-white/[0.05] p-6 shadow-2xl">
            <p className="text-[11px] uppercase tracking-[0.28em] text-sky-300">
              Training Journal
            </p>

            <h1 className="mt-3 text-4xl font-bold">
              Capture what actually happened.
            </h1>

            <p className="mt-3 text-slate-300">
              Progress isn’t just numbers. Track how you felt, what improved,
              and what needs attention.
            </p>
          </div>

          <div className="rounded-[32px] border border-white/10 bg-white/[0.05] p-6 shadow-xl">
            <p className="text-[11px] uppercase tracking-[0.24em] text-emerald-300">
              Quick Prompts
            </p>

            <div className="mt-5 space-y-3">
              {prompts.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => setEntry(prompt + " ")}
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-left text-sm font-semibold text-slate-200 hover:bg-white/10"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-[32px] border border-sky-400/20 bg-sky-500/10 p-6 shadow-xl">
            <h2 className="text-xl font-bold">Why this matters</h2>

            <p className="mt-3 text-sm text-slate-200">
              Writing things down helps you notice patterns: better workouts,
              recurring pain, energy trends, and what’s actually working.
            </p>
          </div>
        </div>

        {/* RIGHT SIDE */}
        <div className="space-y-6">
          {/* NEW ENTRY */}
          <div className="rounded-[36px] border border-white/10 bg-white/[0.05] p-6 shadow-2xl">
            <h2 className="text-2xl font-bold">New Entry</h2>

            <textarea
              value={entry}
              onChange={(e) => setEntry(e.target.value)}
              placeholder="Write about your workout, how you felt, what improved..."
              className="mt-4 min-h-40 w-full resize-none rounded-[26px] border border-white/10 bg-slate-950/70 p-4 text-white outline-none placeholder:text-slate-500 focus:border-sky-400"
            />

            <button
              onClick={() => setEntry("")}
              className="mt-4 w-full rounded-2xl bg-sky-500 px-5 py-4 font-bold text-slate-950 hover:bg-sky-400"
            >
              Save Entry
            </button>
          </div>

          {/* PAST ENTRIES */}
          <div className="rounded-[36px] border border-white/10 bg-white/[0.05] p-6 shadow-2xl">
            <p className="text-[11px] uppercase tracking-[0.24em] text-amber-300">
              Recent Entries
            </p>

            <div className="mt-5 space-y-4">
              {entries.map((entry, index) => (
                <div
                  key={index}
                  className="rounded-[26px] border border-white/10 bg-slate-950/60 p-4"
                >
                  <p className="text-xs text-slate-500">{entry.date}</p>
                  <p className="mt-2 text-sm text-slate-200">{entry.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
