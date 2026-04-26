"use client";

import { useState } from "react";

export default function ClientDirectoryPage() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");

  const clients = [
    {
      name: "Marcus T.",
      status: "Lead",
      plan: "-",
      sessions: "-",
      value: "$1,260",
    },
    {
      name: "Jenna R.",
      status: "Active",
      plan: "4 Sessions",
      sessions: "3 left",
      value: "$440",
    },
    {
      name: "Claude",
      status: "Active",
      plan: "12 Sessions",
      sessions: "5 left",
      value: "$1,380",
    },
    {
      name: "Ravi",
      status: "At Risk",
      plan: "4 Sessions",
      sessions: "1 left",
      value: "$180",
    },
    {
      name: "Kristina",
      status: "Completed",
      plan: "12 Sessions",
      sessions: "0",
      value: "$1,260",
    },
  ];

  const filters = ["All", "Lead", "Active", "At Risk", "Completed"];

  const filtered = clients.filter((c) => {
    return (
      (filter === "All" || c.status === filter) &&
      c.name.toLowerCase().includes(search.toLowerCase())
    );
  });

  const statusStyles: any = {
    Lead: "text-sky-300 bg-sky-500/10 border-sky-400/20",
    Active: "text-emerald-300 bg-emerald-500/10 border-emerald-400/20",
    "At Risk": "text-amber-300 bg-amber-500/10 border-amber-400/20",
    Completed: "text-slate-400 bg-white/5 border-white/10",
  };

  return (
    <main className="min-h-screen bg-[#020617] text-white px-5 py-8">
      <section className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="rounded-3xl bg-white/5 border border-white/10 p-6">
          <h1 className="text-4xl font-bold">Client Directory</h1>
          <p className="text-slate-400 mt-2">
            View and manage all leads and clients in one place.
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 md:items-center md:justify-between">
          <input
            placeholder="Search clients..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full md:w-80 rounded-xl bg-slate-900 px-4 py-3 border border-white/10 outline-none"
          />

          <div className="flex gap-2 flex-wrap">
            {filters.map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold ${
                  filter === f
                    ? "bg-sky-500 text-black"
                    : "bg-white/5 border border-white/10 text-slate-300"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="rounded-2xl border border-white/10 overflow-hidden">
          <div className="grid grid-cols-5 bg-white/5 p-4 text-sm font-semibold text-slate-400">
            <span>Name</span>
            <span>Status</span>
            <span>Plan</span>
            <span>Sessions</span>
            <span>Value</span>
          </div>

          {filtered.map((client) => (
            <div
              key={client.name}
              className="grid grid-cols-5 p-4 border-t border-white/10 hover:bg-white/5 cursor-pointer"
            >
              <span className="font-semibold">{client.name}</span>

              <span>
                <span
                  className={`px-2 py-1 rounded-full border text-xs font-semibold ${statusStyles[client.status]}`}
                >
                  {client.status}
                </span>
              </span>

              <span>{client.plan}</span>
              <span>{client.sessions}</span>
              <span className="text-sky-300 font-semibold">{client.value}</span>
            </div>
          ))}

          {filtered.length === 0 && (
            <div className="p-6 text-center text-slate-400">
              No clients found.
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
