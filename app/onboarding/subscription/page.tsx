"use client";

import { useState } from "react";

export default function SubscriptionPage() {
  const [plan, setPlan] = useState("Online Coaching Plus");

  const plans = [
    {
      name: "Online Coaching",
      price: "$199/mo",
      detail: "Workouts, check-ins, and progress tracking.",
    },
    {
      name: "Online Coaching Plus",
      price: "$299/mo",
      detail: "Adds nutrition support and coach messaging.",
    },
    {
      name: "Hybrid Coaching",
      price: "$499/mo",
      detail: "Online coaching plus limited in-person support.",
    },
  ];

  const billingHistory = [
    {
      date: "Apr 1",
      item: "Online Coaching Plus",
      amount: "$299",
      status: "Paid",
    },
    {
      date: "Mar 1",
      item: "Online Coaching Plus",
      amount: "$299",
      status: "Paid",
    },
    {
      date: "Feb 1",
      item: "Online Coaching Plus",
      amount: "$299",
      status: "Paid",
    },
  ];

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.16),_transparent_30%),linear-gradient(180deg,#020617_0%,#0f172a_100%)] px-5 py-8 text-white">
      <section className="mx-auto max-w-7xl space-y-6">
        <div className="rounded-[36px] border border-white/10 bg-white/[0.05] p-6 shadow-2xl">
          <p className="text-[11px] uppercase tracking-[0.28em] text-sky-300">
            Subscription Management
          </p>

          <h1 className="mt-3 text-4xl font-bold">
            Manage your coaching plan.
          </h1>

          <p className="mt-3 max-w-2xl text-slate-300">
            Review your active plan, billing status, renewal date, and available
            coaching options.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-[26px] border border-emerald-400/20 bg-emerald-500/10 p-5">
            <p className="text-sm text-emerald-300">Status</p>
            <p className="mt-2 text-3xl font-bold">Active</p>
          </div>

          <div className="rounded-[26px] border border-white/10 bg-white/[0.05] p-5">
            <p className="text-sm text-slate-400">Current Plan</p>
            <p className="mt-2 text-2xl font-bold text-sky-300">{plan}</p>
          </div>

          <div className="rounded-[26px] border border-white/10 bg-white/[0.05] p-5">
            <p className="text-sm text-slate-400">Next Renewal</p>
            <p className="mt-2 text-2xl font-bold">May 1</p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="rounded-[32px] border border-white/10 bg-white/[0.05] p-6 shadow-2xl">
            <p className="text-[11px] uppercase tracking-[0.24em] text-emerald-300">
              Available Plans
            </p>

            <h2 className="mt-3 text-2xl font-bold">
              Adjust your level of support
            </h2>

            <div className="mt-5 space-y-4">
              {plans.map((item) => (
                <button
                  key={item.name}
                  onClick={() => setPlan(item.name)}
                  className={`w-full rounded-[26px] border p-5 text-left transition ${
                    plan === item.name
                      ? "border-sky-400 bg-sky-500/15"
                      : "border-white/10 bg-slate-950/60 hover:bg-white/10"
                  }`}
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h3 className="text-xl font-bold">{item.name}</h3>
                      <p className="mt-2 text-sm text-slate-400">
                        {item.detail}
                      </p>
                    </div>

                    <p className="text-2xl font-bold text-sky-300">
                      {item.price}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </section>

          <section className="rounded-[32px] border border-sky-400/20 bg-sky-500/10 p-6 shadow-2xl">
            <p className="text-[11px] uppercase tracking-[0.24em] text-sky-300">
              Plan Summary
            </p>

            <h2 className="mt-3 text-2xl font-bold">{plan}</h2>

            <div className="mt-5 space-y-3">
              {[
                ["Billing", "Monthly"],
                ["Payment Method", "Card ending 4242"],
                ["Renewal", "May 1"],
                ["Coach Access", "Included"],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="flex items-center justify-between rounded-2xl bg-slate-950/60 p-4"
                >
                  <span className="text-sm text-slate-400">{label}</span>
                  <span className="text-sm font-semibold text-white">
                    {value}
                  </span>
                </div>
              ))}
            </div>

            <button className="mt-6 w-full rounded-2xl bg-sky-500 px-5 py-4 font-bold text-slate-950 hover:bg-sky-400">
              Update Plan
            </button>

            <button className="mt-3 w-full rounded-2xl border border-rose-400/20 bg-rose-500/10 px-5 py-4 font-semibold text-rose-300 hover:bg-rose-500/20">
              Cancel Subscription
            </button>
          </section>
        </div>

        <section className="rounded-[32px] border border-white/10 bg-white/[0.05] p-6 shadow-2xl">
          <p className="text-[11px] uppercase tracking-[0.24em] text-amber-300">
            Billing History
          </p>

          <div className="mt-5 space-y-3">
            {billingHistory.map((item) => (
              <div
                key={item.date}
                className="grid gap-3 rounded-[24px] border border-white/10 bg-slate-950/60 p-4 sm:grid-cols-4"
              >
                <p className="text-sm text-slate-400">{item.date}</p>
                <p className="font-semibold">{item.item}</p>
                <p className="font-semibold text-sky-300">{item.amount}</p>
                <p className="font-semibold text-emerald-300">{item.status}</p>
              </div>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}
