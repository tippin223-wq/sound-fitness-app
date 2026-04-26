"use client";

import { useState } from "react";

export default function FollowUpsPage() {
  const [filter, setFilter] = useState("Today");

  const tasks = [
    {
      person: "Marcus T.",
      task: "Text to confirm free intro availability",
      due: "Today",
      priority: "High",
      type: "Lead",
    },
    {
      person: "Jenna R.",
      task: "Follow up after assessment",
      due: "Today",
      priority: "High",
      type: "Lead",
    },
    {
      person: "Claude",
      task: "Ask about renewing 12-session package",
      due: "Tomorrow",
      priority: "Medium",
      type: "Client",
    },
    {
      person: "Ravi",
      task: "Send next package offer",
      due: "This Week",
      priority: "Medium",
      type: "Client",
    },
    {
      person: "Kristina",
      task: "Request progress update before Saturday",
      due: "This Week",
      priority: "Low",
      type: "Client",
    },
  ];

  const filters = ["All", "Today", "Tomorrow", "This Week"];

  const priorityStyles: any = {
    High: "border-rose-400/20 bg-rose-500/10 text-rose-300",
    Medium: "border-amber-400/20 bg-amber-500/10 text-amber-300",
    Low: "border-emerald-400/20 bg-emerald-500/10 text-emerald-300",
  };

  const visibleTasks = tasks.filter((task) => {
    return filter === "All" || task.due === filter;
  });

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.16),_transparent_30%),linear-gradient(180deg,#020617_0%,#0f172a_100%)] px-5 py-8 text-white">
      <section className="mx-auto max-w-7xl space-y-6">
        <div className="rounded-[36px] border border-white/10 bg-white/[0.05] p-6 shadow-2xl">
          <p className="text-[11px] uppercase tracking-[0.28em] text-sky-300">
            Follow-Up Tasks
          </p>

          <h1 className="mt-3 text-4xl font-bold">Never let a lead go cold.</h1>

          <p className="mt-3 max-w-2xl text-slate-300">
            Track the next text, call, reminder, renewal message, or check-in
            needed to keep clients moving forward.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-4">
          {[
            ["Total Tasks", tasks.length],
            ["Due Today", tasks.filter((t) => t.due === "Today").length],
            [
              "High Priority",
              tasks.filter((t) => t.priority === "High").length,
            ],
            [
              "Client Follow-Ups",
              tasks.filter((t) => t.type === "Client").length,
            ],
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
          {filters.map((item) => (
            <button
              key={item}
              onClick={() => setFilter(item)}
              className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                filter === item
                  ? "bg-sky-500 text-slate-950"
                  : "border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
              }`}
            >
              {item}
            </button>
          ))}
        </div>

        <section className="rounded-[32px] border border-white/10 bg-white/[0.05] p-6 shadow-2xl">
          <div className="space-y-3">
            {visibleTasks.map((task) => (
              <div
                key={`${task.person}-${task.task}`}
                className="rounded-[26px] border border-white/10 bg-slate-950/60 p-5"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="text-sm text-slate-400">{task.type}</p>
                    <h2 className="mt-1 text-xl font-bold">{task.person}</h2>
                    <p className="mt-2 text-sm text-slate-300">{task.task}</p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full border border-sky-400/20 bg-sky-500/10 px-3 py-1 text-xs font-semibold text-sky-300">
                      {task.due}
                    </span>

                    <span
                      className={`rounded-full border px-3 py-1 text-xs font-semibold ${priorityStyles[task.priority]}`}
                    >
                      {task.priority}
                    </span>
                  </div>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  <button className="rounded-2xl bg-sky-500 px-4 py-3 text-sm font-bold text-slate-950 hover:bg-sky-400">
                    Mark Complete
                  </button>

                  <button className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-slate-200 hover:bg-white/10">
                    Open Profile
                  </button>

                  <button className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-slate-200 hover:bg-white/10">
                    Snooze
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}
