"use client";

import { useState } from "react";

export default function LeadsPage() {
  const stages = [
    "New Lead",
    "Contacted",
    "Intro Booked",
    "Trial Done",
    "Package Offered",
    "Closed",
  ];

  const initialLeads = [
    { name: "Marcus T.", stage: "New Lead", value: "$1,260" },
    { name: "Jenna R.", stage: "Intro Booked", value: "$440" },
    { name: "Ravi", stage: "Package Offered", value: "$1,080" },
    { name: "Claude", stage: "Closed", value: "$1,380" },
  ];

  const [leads, setLeads] = useState(initialLeads);

  function moveLead(index: number, direction: number) {
    const updated = [...leads];
    const currentStageIndex = stages.indexOf(updated[index].stage);

    const newIndex = currentStageIndex + direction;
    if (newIndex >= 0 && newIndex < stages.length) {
      updated[index].stage = stages[newIndex];
      setLeads(updated);
    }
  }

  return (
    <main className="min-h-screen bg-[#020617] text-white px-5 py-8">
      <section className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="rounded-3xl bg-white/5 border border-white/10 p-6">
          <h1 className="text-4xl font-bold">Leads Pipeline</h1>
          <p className="text-slate-400 mt-2">
            Move leads through your sales process. This is where money is made.
          </p>
        </div>

        {/* Pipeline */}
        <div className="grid gap-4 md:grid-cols-6">
          {stages.map((stage) => (
            <div
              key={stage}
              className="rounded-2xl bg-white/5 border border-white/10 p-4 space-y-3"
            >
              <h2 className="text-lg font-bold text-sky-300">{stage}</h2>

              {leads
                .map((lead, index) => ({ ...lead, index }))
                .filter((lead) => lead.stage === stage)
                .map((lead) => (
                  <div
                    key={lead.name}
                    className="rounded-xl bg-slate-900 p-3 border border-white/10"
                  >
                    <p className="font-semibold">{lead.name}</p>
                    <p className="text-sm text-slate-400">{lead.value}</p>

                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={() => moveLead(lead.index, -1)}
                        className="flex-1 text-xs bg-white/5 rounded-lg py-1"
                      >
                        ←
                      </button>

                      <button
                        onClick={() => moveLead(lead.index, 1)}
                        className="flex-1 text-xs bg-sky-500 text-black rounded-lg py-1"
                      >
                        →
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
