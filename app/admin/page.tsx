"use client";

import { useEffect, useState } from "react";

type AdminLink = {
  id: string;
  title: string;
  href: string;
  badge: string;
  desc: string;
  color: string;
};

const defaultAdminSystems: AdminLink[] = [
  {
    id: "admin-dashboard",
    title: "Admin Dashboard",
    href: "/admin/dashboard",
    badge: "Home",
    desc: "Main business overview, priorities, metrics, and command center.",
    color: "text-sky-300",
  },
  {
    id: "ai-prompt",
    title: "AI Prompt Center",
    href: "/admin/ai-prompt",
    badge: "AI",
    desc: "Master context, reusable prompts, workflows, and ChatGPT handoff.",
    color: "text-violet-300",
  },
  {
    id: "post-hub",
    title: "Post Hub",
    href: "/admin/post-hub",
    badge: "Content",
    desc: "Curate posts, hooks, captions, scripts, blogs, emails, and platform content.",
    color: "text-pink-300",
  },
  {
    id: "social-portal",
    title: "Social Portal",
    href: "/admin/social-portal",
    badge: "Social",
    desc: "Links and workflow hub for Instagram, Facebook, Nextdoor, YouTube, and more.",
    color: "text-fuchsia-300",
  },
  {
    id: "leads",
    title: "Leads",
    href: "/admin/leads",
    badge: "Pipeline",
    desc: "All active leads with status, source, value, priority, and follow-up date.",
    color: "text-rose-300",
  },
  {
    id: "lead-map",
    title: "Lead Map",
    href: "/admin/lead-map",
    badge: "Map",
    desc: "Visual lead tracking by address, neighborhood, status, and opportunity.",
    color: "text-sky-300",
  },
  {
    id: "site-map",
    title: "Site Map",
    href: "/admin/site-map",
    badge: "Build",
    desc: "Admin-side map of the app, website, dashboards, onboarding, and tools.",
    color: "text-indigo-300",
  },
  {
    id: "clients",
    title: "Clients",
    href: "/admin/clients",
    badge: "Coach",
    desc: "Client list, profiles, goals, notes, sessions, and program status.",
    color: "text-emerald-300",
  },
  {
    id: "crm-dashboard",
    title: "CRM Dashboard",
    href: "/admin/crm-dashboard",
    badge: "CRM",
    desc: "Pipeline overview for leads, follow-ups, referrals, and sales.",
    color: "text-cyan-300",
  },
  {
    id: "follow-ups",
    title: "Follow-Ups",
    href: "/admin/follow-ups",
    badge: "Action",
    desc: "Daily follow-up list for leads, clients, referrals, and renewals.",
    color: "text-amber-300",
  },
  {
    id: "invoices",
    title: "Invoices",
    href: "/admin/invoices",
    badge: "Money",
    desc: "Track invoices, paid balances, unpaid balances, and package history.",
    color: "text-green-300",
  },
  {
    id: "reports",
    title: "Reports",
    href: "/admin/reports",
    badge: "Data",
    desc: "Business reports for revenue, leads, conversion, retention, and growth.",
    color: "text-blue-300",
  },
  {
    id: "sales",
    title: "Sales",
    href: "/admin/sales",
    badge: "Close",
    desc: "Offers, packages, upsells, objections, and sales workflow tracking.",
    color: "text-lime-300",
  },
  {
    id: "templates",
    title: "Templates",
    href: "/admin/templates",
    badge: "Assets",
    desc: "Reusable messages, emails, contracts, scripts, client notes, and page blocks.",
    color: "text-teal-300",
  },
];

const priorityFlow = [
  "Website / App Forms",
  "Leads",
  "Lead Profile",
  "Follow-Ups",
  "Sales",
  "Invoices",
  "Clients",
  "Reports",
];

const colors = [
  "text-sky-300",
  "text-violet-300",
  "text-pink-300",
  "text-emerald-300",
  "text-cyan-300",
  "text-amber-300",
  "text-rose-300",
  "text-indigo-300",
  "text-lime-300",
  "text-teal-300",
];

export default function AdminHomePage() {
  const [adminSystems, setAdminSystems] =
    useState<AdminLink[]>(defaultAdminSystems);

  const [draft, setDraft] = useState<AdminLink>({
    id: "",
    title: "",
    href: "",
    badge: "",
    desc: "",
    color: "text-sky-300",
  });

  useEffect(() => {
    const saved = localStorage.getItem("sound-admin-links");
    if (saved) setAdminSystems(JSON.parse(saved));
  }, []);

  useEffect(() => {
    localStorage.setItem("sound-admin-links", JSON.stringify(adminSystems));
  }, [adminSystems]);

  function saveLink() {
    if (!draft.title.trim() || !draft.href.trim()) return;

    if (draft.id) {
      setAdminSystems((prev) =>
        prev.map((item) => (item.id === draft.id ? draft : item)),
      );
    } else {
      setAdminSystems((prev) => [
        ...prev,
        { ...draft, id: crypto.randomUUID() },
      ]);
    }

    setDraft({
      id: "",
      title: "",
      href: "",
      badge: "",
      desc: "",
      color: "text-sky-300",
    });
  }

  function editLink(item: AdminLink) {
    setDraft(item);
  }

  function removeLink(id: string) {
    setAdminSystems((prev) => prev.filter((item) => item.id !== id));
  }

  const metrics = [
    {
      label: "Admin Systems",
      value: adminSystems.length,
      sub: "Connected under /admin",
    },
    { label: "Revenue Loop", value: "8", sub: "Lead → client → renewal" },
    { label: "AI Workflows", value: "Live", sub: "Prompt center ready" },
    {
      label: "Content Engine",
      value: "Post Hub",
      sub: "All platforms connected",
    },
  ];

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.16),_transparent_32%),linear-gradient(180deg,#020617_0%,#0f172a_100%)] text-white">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <section className="overflow-hidden rounded-[36px] border border-white/10 bg-white/[0.05] shadow-2xl shadow-black/20 backdrop-blur">
          <div className="grid gap-6 p-6 lg:grid-cols-[1.15fr_0.85fr] lg:p-8">
            <div>
              <div className="text-[11px] uppercase tracking-[0.26em] text-sky-300">
                Sound Fitness App / Admin
              </div>

              <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">
                Admin Command Center
              </h1>

              <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300">
                Your internal dashboard for leads, clients, AI prompts, content,
                social media, site structure, CRM, invoices, reports, sales, and
                operating systems.
              </p>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <a
                  href="/admin/post-hub"
                  className="rounded-2xl bg-sky-500 px-5 py-3 text-center text-sm font-semibold text-slate-950 shadow-lg shadow-sky-500/20 hover:bg-sky-400"
                >
                  Open Post Hub
                </a>

                <a
                  href="/admin/leads"
                  className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-center text-sm font-medium text-slate-200 hover:bg-white/10"
                >
                  Open Leads Portal
                </a>

                <a
                  href="/admin/social-portal"
                  className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-center text-sm font-medium text-slate-200 hover:bg-white/10"
                >
                  Open Social Portal
                </a>
              </div>
            </div>

            <div className="rounded-[30px] border border-sky-400/20 bg-sky-500/10 p-5">
              <div className="text-[11px] uppercase tracking-[0.22em] text-sky-300">
                Admin Purpose
              </div>

              <h2 className="mt-3 text-2xl font-bold">
                Everything connects here
              </h2>

              <p className="mt-3 text-sm leading-6 text-slate-300">
                This page acts like the control room. Add links as new admin
                pages get built so you never lose track of the system.
              </p>
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {metrics.map((item) => (
            <div
              key={item.label}
              className="rounded-[28px] border border-white/10 bg-white/[0.05] p-5 shadow-xl shadow-black/15 backdrop-blur"
            >
              <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">
                {item.label}
              </div>
              <div className="mt-3 text-3xl font-bold tracking-tight">
                {item.value}
              </div>
              <div className="mt-2 text-sm text-slate-400">{item.sub}</div>
            </div>
          ))}
        </section>

        <div className="mt-6 grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <section className="rounded-[32px] border border-white/10 bg-white/[0.05] p-6 shadow-2xl shadow-black/20 backdrop-blur">
            <div>
              <div className="text-[11px] uppercase tracking-[0.22em] text-violet-300">
                Admin Pages
              </div>
              <h2 className="mt-2 text-2xl font-bold tracking-tight">
                Everything inside /admin
              </h2>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {adminSystems.map((item) => (
                <div
                  key={item.id}
                  className="group rounded-[26px] border border-white/10 bg-slate-950/55 p-5 transition hover:border-sky-400/40 hover:bg-sky-500/10"
                >
                  <a href={item.href}>
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-lg font-semibold text-white">
                            {item.title}
                          </h3>
                          <span
                            className={`rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] uppercase tracking-[0.16em] ${item.color}`}
                          >
                            {item.badge}
                          </span>
                        </div>

                        <p className="mt-3 text-sm leading-6 text-slate-400">
                          {item.desc}
                        </p>

                        <p className="mt-2 text-xs text-slate-500">
                          {item.href}
                        </p>
                      </div>

                      <div className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-300 group-hover:border-sky-400/30 group-hover:text-sky-300">
                        →
                      </div>
                    </div>
                  </a>

                  <div className="mt-4 flex gap-2">
                    <button
                      onClick={() => editLink(item)}
                      className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-200 hover:bg-white/10"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => removeLink(item.id)}
                      className="rounded-xl border border-red-400/20 bg-red-500/10 px-3 py-2 text-xs text-red-300 hover:bg-red-500/15"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <div className="space-y-6">
            <section className="rounded-[32px] border border-white/10 bg-white/[0.05] p-6 shadow-2xl shadow-black/20 backdrop-blur">
              <div className="text-[11px] uppercase tracking-[0.22em] text-emerald-300">
                Add Link
              </div>
              <h2 className="mt-2 text-2xl font-bold tracking-tight">
                Admin link manager
              </h2>

              <div className="mt-5 space-y-3">
                <input
                  value={draft.title}
                  onChange={(e) =>
                    setDraft((prev) => ({ ...prev, title: e.target.value }))
                  }
                  placeholder="Page title"
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/55 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-sky-400/50"
                />

                <input
                  value={draft.href}
                  onChange={(e) =>
                    setDraft((prev) => ({ ...prev, href: e.target.value }))
                  }
                  placeholder="/admin/site-map"
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/55 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-sky-400/50"
                />

                <input
                  value={draft.badge}
                  onChange={(e) =>
                    setDraft((prev) => ({ ...prev, badge: e.target.value }))
                  }
                  placeholder="Badge"
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/55 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-sky-400/50"
                />

                <textarea
                  value={draft.desc}
                  onChange={(e) =>
                    setDraft((prev) => ({ ...prev, desc: e.target.value }))
                  }
                  rows={3}
                  placeholder="Description"
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/55 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-sky-400/50"
                />

                <select
                  value={draft.color}
                  onChange={(e) =>
                    setDraft((prev) => ({ ...prev, color: e.target.value }))
                  }
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/55 px-4 py-3 text-sm text-white outline-none focus:border-sky-400/50"
                >
                  {colors.map((color) => (
                    <option key={color}>{color}</option>
                  ))}
                </select>

                <div className="grid gap-3 sm:grid-cols-2">
                  <button
                    onClick={saveLink}
                    className="rounded-2xl bg-sky-500 px-4 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-sky-500/20 hover:bg-sky-400"
                  >
                    {draft.id ? "Save Link" : "Add Link"}
                  </button>

                  <button
                    onClick={() =>
                      setDraft({
                        id: "",
                        title: "",
                        href: "",
                        badge: "",
                        desc: "",
                        color: "text-sky-300",
                      })
                    }
                    className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-white hover:bg-white/10"
                  >
                    Clear
                  </button>
                </div>
              </div>
            </section>

            <section className="rounded-[32px] border border-white/10 bg-white/[0.05] p-6 shadow-2xl shadow-black/20 backdrop-blur">
              <div className="text-[11px] uppercase tracking-[0.22em] text-amber-300">
                Quick Launch
              </div>
              <h2 className="mt-2 text-2xl font-bold tracking-tight">
                Most important portals
              </h2>

              <div className="mt-5 grid gap-3">
                <a
                  href="/admin/post-hub"
                  className="rounded-[22px] border border-white/10 bg-slate-950/55 px-4 py-4 text-sm font-medium text-white hover:border-pink-400/40 hover:bg-pink-500/10"
                >
                  🧠 Post Hub
                </a>
                <a
                  href="/admin/ai-prompt"
                  className="rounded-[22px] border border-white/10 bg-slate-950/55 px-4 py-4 text-sm font-medium text-white hover:border-violet-400/40 hover:bg-violet-500/10"
                >
                  ✨ AI Prompt Center
                </a>
                <a
                  href="/admin/social-portal"
                  className="rounded-[22px] border border-white/10 bg-slate-950/55 px-4 py-4 text-sm font-medium text-white hover:border-pink-400/40 hover:bg-pink-500/10"
                >
                  📣 Social Portal
                </a>
                <a
                  href="/admin/lead-map"
                  className="rounded-[22px] border border-white/10 bg-slate-950/55 px-4 py-4 text-sm font-medium text-white hover:border-sky-400/40 hover:bg-sky-500/10"
                >
                  🗺️ Lead Map
                </a>
                <a
                  href="/admin/leads"
                  className="rounded-[22px] border border-white/10 bg-slate-950/55 px-4 py-4 text-sm font-medium text-white hover:border-rose-400/40 hover:bg-rose-500/10"
                >
                  🔥 Leads Portal
                </a>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
