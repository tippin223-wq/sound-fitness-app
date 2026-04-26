"use client";

import { useState } from "react";

export default function SalesPage() {
  const [selected, setSelected] = useState("12 Sessions");

  const packages = [
    {
      name: "4 Sessions",
      price: "$440",
      per: "$110/session",
      closeRate: "High for beginners",
    },
    {
      name: "12 Sessions",
      price: "$1,260",
      per: "$105/session",
      closeRate: "Best starter offer",
    },
    {
      name: "24 Sessions",
      price: "$2,400",
      per: "$100/session",
      closeRate: "Best value",
    },
  ];

  const deals = [
    {
      name: "Marcus T.",
      stage: "Intro Booked",
      offer: "12 Sessions",
      value: "$1,260",
    },
    {
      name: "Jenna R.",
      stage: "Trial Done",
      offer: "4 Sessions",
      value: "$440",
    },
    {
      name: "Ravi",
      stage: "Package Offered",
      offer: "24 Sessions",
      value: "$2,400",
    },
  ];

  const stageStyles: any = {
    "Intro Booked": "text-sky-300",
    "Trial Done": "text-amber-300",
    "Package Offered": "text-emerald-300",
  };

  return (
    <main className="min-h-screen bg-[#020617] text-white px-5 py-8">
      <section className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="rounded-3xl bg-white/5 border border-white/10 p-6">
          <h1 className="text-4xl font-bold">Sales & Packages</h1>
          <p className="text-slate-400 mt-2">
            Present offers, track deals, and close clients.
          </p>
        </div>

        {/* Packages */}
        <div className="grid gap-5 md:grid-cols-3">
          {packages.map((pkg) => (
            <button
              key={pkg.name}
              onClick={() => setSelected(pkg.name)}
              className={`rounded-2xl p-5 text-left border transition ${
                selected === pkg.name
                  ? "bg-sky-500/20 border-sky-400"
                  : "bg-slate-900 border-white/10 hover:bg-white/10"
              }`}
            >
              <h2 className="text-xl font-bold">{pkg.name}</h2>
              <p className="text-slate-400 mt-2">{pkg.per}</p>

              <p className="text-3xl font-bold text-sky-300 mt-4">
                {pkg.price}
              </p>

              <p className="text-sm mt-2 text-slate-400">{pkg.closeRate}</p>
            </button>
          ))}
        </div>

        {/* Deal Pipeline */}
        <div className="rounded-2xl border border-white/10 p-6">
          <h2 className="text-2xl font-bold">Active Deals</h2>

          <div className="mt-5 space-y-3">
            {deals.map((deal) => (
              <div
                key={deal.name}
                className="flex items-center justify-between bg-slate-900 p-4 rounded-xl border border-white/10"
              >
                <div>
                  <p className="font-bold">{deal.name}</p>
                  <p className="text-sm text-slate-400">{deal.offer}</p>
                </div>

                <p
                  className={`text-sm font-semibold ${stageStyles[deal.stage]}`}
                >
                  {deal.stage}
                </p>

                <p className="text-sky-300 font-bold">{deal.value}</p>

                <button className="ml-4 bg-sky-500 text-black px-3 py-1 rounded-lg text-sm">
                  Close
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Close */}
        <div className="rounded-2xl bg-sky-500/10 border border-sky-400/20 p-6">
          <h2 className="text-2xl font-bold">Quick Close</h2>

          <p className="text-slate-300 mt-2">
            Send the selected package directly to a lead.
          </p>

          <div className="mt-4 flex gap-3">
            <button className="bg-sky-500 text-black px-5 py-3 rounded-xl font-bold">
              Send {selected} Offer
            </button>

            <button className="bg-white/5 border border-white/10 px-5 py-3 rounded-xl">
              Copy Link
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
