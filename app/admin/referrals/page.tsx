"use client";

import { useState } from "react";

export default function ReferralsPage() {
  const [filter, setFilter] = useState("All");

  const referrals = [
    {
      name: "Sarah M.",
      source: "Claude",
      type: "Client Referral",
      status: "New",
      value: "$1,260",
      nextAction: "Send intro text",
    },
    {
      name: "Dr. Nguyen",
      source: "Local clinic",
      type: "Clinic Partner",
      status: "Contacted",
      value: "Partner",
      nextAction: "Follow up with one-pager",
    },
    {
      name: "Jenna R.",
      source: "Google Review",
      type: "Online Referral",
      status: "Booked",
      value: "$440",
      nextAction: "Confirm intro",
    },
    {
      name: "Mike T.",
      source: "Kristina",
      type: "Client Referral",
      status: "Closed",
      value: "$1,260",
      nextAction: "Ask for testimonial",
    },
  ];

  const filters = ["All", "New", "Contacted", "Booked", "Closed"];

  const statusStyles: any = {
    New: "border-sky-400/20 bg-sky-500/10 text-sky-300",
    Contacted: "border-amber-400/20 bg-amber-500/10 text-amber-300",
    Booked: "border-violet-400/20 bg-violet-500/10 text-violet-300",
    Closed: "border-emerald-400/20 bg-emerald-500/10 text-emerald-300",
  };

  const visible = referrals.filter((r) => {
    return filter === "All" || r.status === filter;
  });

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.16),_transparent_30%),linear-gradient(180deg,#020617_0%,#0f172a_100%)] px-5 py-8 text-white">
      <section className="mx-auto max-w-7xl space-y-6">
        <div className="rounded-[36px] border border-white/10 bg-white/[0.05] p-6 shadow-2xl">
          <p className="text-[11px] uppercase tracking-[0.28em] text-sky-300">
            Referral Tracker
          </p>

          <h1 className="mt-3 text-4xl font-bold">
            Turn trust into new clients.
          </h1>

          <p className="mt-3 max-w-2xl text-slate-300">
            Track client referrals, online referrals, clinic partners, and the
            next action needed to turn each referral into revenue.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-4">
          {[
            ["Total Referrals", referrals.length],
            ["New", referrals.filter((r) => r.status === "New").length],
            ["Booked", referrals.filter((r) => r.status === "Booked").length],
            ["Closed", referrals.filter((r) => r.status === "Closed").length],
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
            {visible.map((referral) => (
              <div
                key={`${referral.name}-${referral.source}`}
                className="grid gap-4 rounded-[24px] border border-white/10 bg-slate-950/60 p-4 md:grid-cols-6 md:items-center"
              >
                <div>
                  <p className="font-bold">{referral.name}</p>
                  <p className="text-sm text-slate-400">{referral.type}</p>
                </div>

                <div>
                  <p className="text-xs text-slate-500">Source</p>
                  <p className="font-semibold text-slate-200">
                    {referral.source}
                  </p>
                </div>

                <p className="font-bold text-sky-300">{referral.value}</p>

                <span
                  className={`w-fit rounded-full border px-3 py-1 text-xs font-semibold ${statusStyles[referral.status]}`}
                >
                  {referral.status}
                </span>

                <p className="text-sm text-slate-300">{referral.nextAction}</p>

                <button className="rounded-xl bg-sky-500 px-3 py-2 text-xs font-bold text-slate-950 hover:bg-sky-400">
                  Open
                </button>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-[32px] border border-sky-400/20 bg-sky-500/10 p-6 shadow-xl">
          <p className="text-[11px] uppercase tracking-[0.24em] text-sky-300">
            Coach Note
          </p>

          <h2 className="mt-3 text-2xl font-bold">
            Referrals should be followed up fast.
          </h2>

          <p className="mt-3 max-w-3xl text-slate-200">
            The warmer the referral, the less selling you need to do. Move fast,
            make it personal, and always thank the person who referred them.
          </p>
        </section>
      </section>
    </main>
  );
}
