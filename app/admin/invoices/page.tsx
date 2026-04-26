"use client";

import { useState } from "react";

export default function InvoicesPage() {
  const [filter, setFilter] = useState("All");

  const invoices = [
    {
      client: "Marcus T.",
      item: "12 Session Package",
      amount: "$1,260",
      status: "Draft",
      due: "Today",
    },
    {
      client: "Jenna R.",
      item: "4 Session Package",
      amount: "$440",
      status: "Sent",
      due: "Apr 28",
    },
    {
      client: "Claude",
      item: "12 Session Renewal",
      amount: "$1,380",
      status: "Paid",
      due: "Apr 20",
    },
    {
      client: "Ravi",
      item: "4 Session Package",
      amount: "$360",
      status: "Overdue",
      due: "Apr 18",
    },
  ];

  const filters = ["All", "Draft", "Sent", "Paid", "Overdue"];

  const statusStyles: any = {
    Draft: "border-slate-400/20 bg-white/5 text-slate-300",
    Sent: "border-sky-400/20 bg-sky-500/10 text-sky-300",
    Paid: "border-emerald-400/20 bg-emerald-500/10 text-emerald-300",
    Overdue: "border-rose-400/20 bg-rose-500/10 text-rose-300",
  };

  const visibleInvoices = invoices.filter((invoice) => {
    return filter === "All" || invoice.status === filter;
  });

  const totalPaid = invoices
    .filter((invoice) => invoice.status === "Paid")
    .reduce(
      (sum, invoice) => sum + Number(invoice.amount.replace(/[$,]/g, "")),
      0,
    );

  const outstanding = invoices
    .filter((invoice) => invoice.status !== "Paid")
    .reduce(
      (sum, invoice) => sum + Number(invoice.amount.replace(/[$,]/g, "")),
      0,
    );

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.16),_transparent_30%),linear-gradient(180deg,#020617_0%,#0f172a_100%)] px-5 py-8 text-white">
      <section className="mx-auto max-w-7xl space-y-6">
        <div className="rounded-[36px] border border-white/10 bg-white/[0.05] p-6 shadow-2xl">
          <p className="text-[11px] uppercase tracking-[0.28em] text-sky-300">
            Payments & Invoices
          </p>

          <h1 className="mt-3 text-4xl font-bold">Track money clearly.</h1>

          <p className="mt-3 max-w-2xl text-slate-300">
            See paid invoices, outstanding balances, overdue payments, and
            package invoices that need to be sent.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-4">
          <div className="rounded-[26px] border border-white/10 bg-white/[0.05] p-5">
            <p className="text-sm text-slate-400">Total Invoices</p>
            <p className="mt-2 text-3xl font-bold">{invoices.length}</p>
          </div>

          <div className="rounded-[26px] border border-emerald-400/20 bg-emerald-500/10 p-5">
            <p className="text-sm text-emerald-300">Paid</p>
            <p className="mt-2 text-3xl font-bold">
              ${totalPaid.toLocaleString()}
            </p>
          </div>

          <div className="rounded-[26px] border border-amber-400/20 bg-amber-500/10 p-5">
            <p className="text-sm text-amber-300">Outstanding</p>
            <p className="mt-2 text-3xl font-bold">
              ${outstanding.toLocaleString()}
            </p>
          </div>

          <div className="rounded-[26px] border border-rose-400/20 bg-rose-500/10 p-5">
            <p className="text-sm text-rose-300">Overdue</p>
            <p className="mt-2 text-3xl font-bold">
              {invoices.filter((i) => i.status === "Overdue").length}
            </p>
          </div>
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
            {visibleInvoices.map((invoice) => (
              <div
                key={`${invoice.client}-${invoice.item}`}
                className="grid gap-3 rounded-[24px] border border-white/10 bg-slate-950/60 p-4 md:grid-cols-5 md:items-center"
              >
                <div>
                  <p className="font-bold">{invoice.client}</p>
                  <p className="mt-1 text-sm text-slate-400">{invoice.item}</p>
                </div>

                <p className="text-xl font-bold text-sky-300">
                  {invoice.amount}
                </p>

                <span
                  className={`w-fit rounded-full border px-3 py-1 text-xs font-semibold ${statusStyles[invoice.status]}`}
                >
                  {invoice.status}
                </span>

                <p className="text-sm text-slate-400">Due: {invoice.due}</p>

                <div className="flex gap-2">
                  <button className="rounded-xl bg-sky-500 px-3 py-2 text-xs font-bold text-slate-950 hover:bg-sky-400">
                    Send
                  </button>
                  <button className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-white/10">
                    View
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
