"use client";

import { useState } from "react";

export default function SessionNotesPage() {
  const [note, setNote] = useState("");

  const sessions = [
    {
      client: "Marcus T.",
      date: "Apr 24",
      focus: "Lower Body + Core",
      notes: "Step-ups improved. Less knee discomfort. Keep height same.",
    },
    {
      client: "Jenna R.",
      date: "Apr 22",
      focus: "Upper Body",
      notes: "Struggled with push-ups. Add incline progression.",
    },
  ];

  const prompts = [
    "What improved this session?",
    "Any pain or discomfort?",
    "What needs to be adjusted next time?",
    "Energy level (1–10)?",
    "Next progression step?",
  ];

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.16),_transparent_30%),linear-gradient(180deg,#020617_0%,#0f172a_100%)] px-5 py-8 text-white">
      <section className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div className="rounded-[36px] border border-white/10 bg-white/[0.05] p-6 shadow-2xl">
          <p className="text-[11px] uppercase tracking-[0.28em] text-sky-300">
            Session Notes
          </p>

          <h1 className="mt-3 text-4xl font-bold">
            Coach smarter every session.
          </h1>

          <p className="mt-3 max-w-2xl text-slate-300">
            Track what happened, what changed, and what to do next so progress
            stays consistent and intentional.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          {/* LEFT SIDE */}
          <div className="space-y-6">
            {/* Prompts */}
            <div className="rounded-[32px] border border-white/10 bg-white/[0.05] p-6">
              <p className="text-[11px] uppercase tracking-[0.24em] text-emerald-300">
                Quick Prompts
              </p>

              <div className="mt-5 space-y-3">
                {prompts.map((p) => (
                  <button
                    key={p}
                    onClick={() => setNote(note + p + " ")}
                    className="w-full text-left rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm hover:bg-white/10"
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {/* Tip */}
            <div className="rounded-[32px] border border-sky-400/20 bg-sky-500/10 p-6">
              <h2 className="text-xl font-bold">Why this matters</h2>
              <p className="mt-3 text-sm text-slate-200">
                Notes = better programming, better retention, and easier
                renewals. You’re building a story of progress.
              </p>
            </div>
          </div>

          {/* RIGHT SIDE */}
          <div className="space-y-6">
            {/* New Note */}
            <div className="rounded-[36px] border border-white/10 bg-white/[0.05] p-6">
              <h2 className="text-2xl font-bold">New Session Note</h2>

              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Write session details, performance, pain notes, and next steps..."
                className="mt-4 w-full min-h-40 rounded-2xl bg-slate-950/70 border border-white/10 p-4 outline-none"
              />

              <button
                onClick={() => setNote("")}
                className="mt-4 w-full bg-sky-500 text-black font-bold py-3 rounded-2xl"
              >
                Save Note
              </button>
            </div>

            {/* History */}
            <div className="rounded-[36px] border border-white/10 bg-white/[0.05] p-6">
              <p className="text-[11px] uppercase tracking-[0.24em] text-amber-300">
                Recent Sessions
              </p>

              <div className="mt-5 space-y-4">
                {sessions.map((s, i) => (
                  <div
                    key={i}
                    className="rounded-2xl border border-white/10 bg-slate-950/60 p-4"
                  >
                    <div className="flex justify-between text-sm text-slate-400">
                      <span>{s.client}</span>
                      <span>{s.date}</span>
                    </div>

                    <p className="mt-2 font-semibold text-sky-300">{s.focus}</p>

                    <p className="mt-2 text-sm text-slate-200">{s.notes}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
