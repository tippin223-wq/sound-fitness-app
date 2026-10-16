"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { loadMemberSessionBalances, type SessionBalances } from "@/lib/member-services";
import { planningOwner, planningSnapshot, subscribePlanning } from "@/lib/planning/store";

export default function PaymentsPage() {
  const [selected, setSelected] = useState("12 Sessions");
  useSyncExternalStore(subscribePlanning, planningSnapshot, planningSnapshot);
  const account = planningOwner();
  const [refresh, setRefresh] = useState(0);
  const [result, setResult] = useState<{ account: string | null; refresh: number; balances: SessionBalances | null; error: string } | null>(null);
  useEffect(() => {
    if (!account) return;
    let cancelled = false;
    void loadMemberSessionBalances().then(balances => {
      if (!cancelled && planningOwner() === account) setResult({ account, refresh, balances, error: "" });
    }).catch(cause => {
      if (!cancelled && planningOwner() === account) setResult({ account, refresh, balances: null, error: cause instanceof Error ? cause.message : "Balances could not be loaded. Try again." });
    });
    return () => { cancelled = true; };
  }, [account, refresh]);
  const current = result?.account === account && result?.refresh === refresh ? result : null;
  const loading = Boolean(account && !current);

  const packages = [
    {
      name: "4 Sessions",
      detail: "Package preview",
    },
    {
      name: "12 Sessions",
      detail: "Package preview",
    },
    {
      name: "24 Sessions",
      detail: "Package preview",
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
            Your session balances.
          </h1>

          <p className="mt-3 max-w-2xl text-slate-300">
            View the session credits recorded in your website account. Manage packages and billing in the website client hub; you may need to sign in there.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <button type="button" disabled={loading || !account} onClick={() => setRefresh(value => value + 1)} className="rounded-xl border border-white/20 px-4 py-3 disabled:opacity-50">Refresh balances</button>
            <a href="https://thesoundfitness.com/client-hub" target="_blank" rel="noopener noreferrer" className="rounded-xl bg-sky-300 px-4 py-3 font-bold text-slate-950">Open website client hub</a>
            <a href="https://thesoundfitness.com/client-hub/payments" target="_blank" rel="noopener noreferrer" className="rounded-xl border border-sky-300/40 px-4 py-3 font-bold text-sky-200">View website invoices &amp; payment details</a>
          </div>
          {loading && <p role="status" className="mt-3">Loading session balances…</p>}
          {current?.error && <p role="alert" className="mt-3 text-amber-200">{current.error}</p>}
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {([['training', 'Training'], ['stretch', 'Assisted stretch'], ['nutrition', 'Nutrition intro']] as const).map(([key, label]) => <div key={key} className="rounded-2xl border border-white/10 bg-slate-950/60 p-4"><p className="text-sm text-slate-300">{label} credits</p><p className="mt-2 text-3xl font-bold text-sky-200">{loading ? "Loading…" : current?.balances?.[key] ?? "Unavailable"}</p></div>)}
          </div>
          <p className="mt-3 text-xs text-slate-400">Balances refresh from your account. The website Payments &amp; Packages page provides paid invoices, payment-method management, purchases, and session totals. It opens in a new tab and may require website sign-in.</p>
        </div>

        <h2 className="text-2xl font-bold">Package selection preview</h2>
        <p className="text-sm text-slate-400">Explore the selection layout below. Package availability, current prices, and checkout require the website catalog.</p>
        <div className="grid gap-5 lg:grid-cols-3">
          {packages.map((pkg) => (
            <button
              type="button"
              aria-pressed={selected === pkg.name}
              key={pkg.name}
              onClick={() => setSelected(pkg.name)}
              className={`rounded-[32px] border p-6 text-left shadow-xl transition ${
                selected === pkg.name
                  ? "border-sky-400 bg-sky-500/15"
                  : "border-white/10 bg-white/[0.05] hover:bg-white/10"
              }`}
            >
              <h2 className="mt-3 text-2xl font-bold">{pkg.name}</h2>
              <p className="mt-2 text-slate-400">{pkg.detail}</p>
            </button>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_0.8fr]">
          <section className="rounded-[32px] border border-white/10 bg-white/[0.05] p-6 shadow-2xl">
            <p className="text-[11px] uppercase tracking-[0.24em] text-emerald-300">
              Add-On Preview
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
              Selection Preview
            </p>

            <h2 className="mt-3 text-2xl font-bold">{selected}</h2>

            <p className="mt-3 text-slate-300">
              App package checkout is not connected yet. Your selection stays in this page preview.
            </p>

            <div className="mt-5 space-y-3">
              <div className="flex justify-between rounded-2xl bg-slate-950/60 p-4">
                <span className="text-slate-400">Package</span>
                <span className="font-semibold">{selected}</span>
              </div>

              <div className="flex justify-between rounded-2xl bg-slate-950/60 p-4">
                <span className="text-slate-400">App checkout</span>
                <span className="font-semibold text-amber-300">Unavailable</span>
              </div>
            </div>

            <button type="button" disabled aria-describedby="package-checkout-status" className="mt-6 w-full rounded-2xl bg-sky-500/30 px-5 py-4 font-bold text-slate-300">
              App checkout unavailable
            </button>

            <p id="package-checkout-status" className="mt-4 text-center text-xs text-slate-400">
              Use the website client hub to review current account and package options.
            </p>
          </section>
        </div>
      </section>
    </main>
  );
}
