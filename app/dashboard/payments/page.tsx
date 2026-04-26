"use client";

import { useState } from "react";

export default function PaymentsPage() {
  const [selected, setSelected] = useState("12 Sessions");

  const packages = [
    {
      name: "4 Sessions",
      price: "$440",
      detail: "$110/session",
      bestFor: "Getting started",
    },
    {
      name: "12 Sessions",
      price: "$1,260",
      detail: "$105/session",
      bestFor: "Best starting package",
    },
    {
      name: "24 Sessions",
      price: "$2,400",
      detail: "$100/session",
      bestFor: "Best value",
    },
  ];

  const addOns = [
    "Online accountability",
    "Nutrition support",
    "Assisted stretch session",
    "Custom workout plan",
  ];

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.16),_transparent_30%),linear-gradient(180deg,#020617_0%,#0f172a_100%)] px-5 py-8 text-white">
      <section className="mx-auto max-w-7xl space-y-6">
        <div className="rounded-[36px] border border-white/10 bg-white/[0.05] p-6 shadow-2xl">
          <p className="text-[11px] uppercase tracking-[0.28em] text-sky-300">
            Payments
          </p>

          <h1 className="mt-3 text-4xl font-bold">
            Choose your training package.
          </h1>

          <p className="mt-3 max-w-2xl text-slate-300">
            Pick the package that fits your goals, schedule, and level of
            support. You can add coaching upgrades before checkout.
          </p>
        </div>

        <div className="grid gap-5 lg:grid-cols-3">
          {packages.map((pkg) => (
            <button
              key={pkg.name}
              onClick={() => setSelected(pkg.name)}
              className={`rounded-[32px] border p-6 text-left shadow-xl transition ${
                selected === pkg.name
                  ? "border-sky-400 bg-sky-500/15"
                  : "border-white/10 bg-white/[0.05] hover:bg-white/10"
              }`}
            >
              <p className="text-sm text-slate-400">{pkg.bestFor}</p>
              <h2 className="mt-3 text-2xl font-bold">{pkg.name}</h2>
              <p className="mt-4 text-4xl font-bold text-sky-300">
                {pkg.price}
              </p>
              <p className="mt-2 text-slate-400">{pkg.detail}</p>
            </button>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_0.8fr]">
          <section className="rounded-[32px] border border-white/10 bg-white/[0.05] p-6 shadow-2xl">
            <p className="text-[11px] uppercase tracking-[0.24em] text-emerald-300">
              Optional Add-Ons
            </p>

            <h2 className="mt-3 text-2xl font-bold">Upgrade your support</h2>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {addOns.map((item) => (
                <label
                  key={item}
                  className="flex cursor-pointer items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/60 p-4 hover:bg-white/10"
                >
                  <input type="checkbox" className="h-5 w-5 accent-sky-500" />
                  <span className="text-sm font-semibold text-slate-200">
                    {item}
                  </span>
                </label>
              ))}
            </div>
          </section>

          <section className="rounded-[32px] border border-sky-400/20 bg-sky-500/10 p-6 shadow-2xl">
            <p className="text-[11px] uppercase tracking-[0.24em] text-sky-300">
              Checkout Summary
            </p>

            <h2 className="mt-3 text-2xl font-bold">{selected}</h2>

            <p className="mt-3 text-slate-300">
              Secure checkout will be connected through Stripe.
            </p>

            <div className="mt-5 space-y-3">
              <div className="flex justify-between rounded-2xl bg-slate-950/60 p-4">
                <span className="text-slate-400">Package</span>
                <span className="font-semibold">{selected}</span>
              </div>

              <div className="flex justify-between rounded-2xl bg-slate-950/60 p-4">
                <span className="text-slate-400">Payment Status</span>
                <span className="font-semibold text-amber-300">Pending</span>
              </div>
            </div>

            <button className="mt-6 w-full rounded-2xl bg-sky-500 px-5 py-4 font-bold text-slate-950 hover:bg-sky-400">
              Continue to Checkout
            </button>

            <p className="mt-4 text-center text-xs text-slate-400">
              No charge happens until Stripe checkout is connected.
            </p>
          </section>
        </div>
      </section>
    </main>
  );
}
