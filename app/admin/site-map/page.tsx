"use client";

import React, { useMemo, useState } from "react";

type Section =
  | "Public"
  | "Onboarding"
  | "Dashboard"
  | "Online Training"
  | "Admin";

type Status = "Live" | "Build Next" | "Recommended" | "Needs Review";

type PageNode = {
  title: string;
  href: string;
  description: string;
  section: Section;
  status: Status;
  linksTo?: string[];
  children?: PageNode[];
};

const sectionStyles: Record<Section, string> = {
  Public: "border-blue-400/30 bg-blue-500/10 text-blue-300",
  Onboarding: "border-emerald-400/30 bg-emerald-500/10 text-emerald-300",
  Dashboard: "border-sky-400/30 bg-sky-500/10 text-sky-300",
  "Online Training": "border-violet-400/30 bg-violet-500/10 text-violet-300",
  Admin: "border-amber-400/30 bg-amber-500/10 text-amber-300",
};

const statusStyles: Record<Status, string> = {
  Live: "border-emerald-400/20 bg-emerald-500/10 text-emerald-300",
  "Build Next": "border-sky-400/20 bg-sky-500/10 text-sky-300",
  Recommended: "border-slate-400/20 bg-slate-500/10 text-slate-400 opacity-70",
  "Needs Review": "border-amber-400/20 bg-amber-500/10 text-amber-300",
};

const siteMap: PageNode[] = [
  {
    title: "Public / Login",
    href: "/",
    section: "Public",
    status: "Live",
    description: "Main app entry, login, and start point.",
    linksTo: ["/onboarding", "/dashboard", "/online-program"],
  },
  {
    title: "Onboarding",
    href: "/onboarding",
    section: "Onboarding",
    status: "Live",
    description: "New client setup before dashboard access.",
    linksTo: ["/onboarding/assessment", "/onboarding/subscription"],
    children: [
      {
        title: "Assessment",
        href: "/onboarding/assessment",
        section: "Onboarding",
        status: "Live",
        description: "Goals, injuries, training history, schedule, readiness.",
        linksTo: ["/onboarding/subscription"],
      },
      {
        title: "Subscription",
        href: "/onboarding/subscription",
        section: "Onboarding",
        status: "Live",
        description: "Package, payment, or membership selection.",
        linksTo: ["/onboarding/intake-check-in"],
      },
      {
        title: "Intake Check-In",
        href: "/onboarding/intake-check-in",
        section: "Onboarding",
        status: "Live",
        description: "First readiness check before training begins.",
        linksTo: ["/onboarding/confirmation"],
      },
      {
        title: "Confirmation",
        href: "/onboarding/confirmation",
        section: "Onboarding",
        status: "Live",
        description: "Thank-you page with next steps.",
        linksTo: ["/dashboard"],
      },
      {
        title: "Waiver / Agreement",
        href: "/onboarding/agreement",
        section: "Onboarding",
        status: "Recommended",
        description: "Recommended service agreement and consent step.",
        linksTo: ["/onboarding/confirmation"],
      },
    ],
  },
  {
    title: "Dashboard",
    href: "/dashboard",
    section: "Dashboard",
    status: "Live",
    description: "Main client dashboard after login.",
    linksTo: [
      "/dashboard/profile",
      "/dashboard/sessions",
      "/dashboard/progress",
      "/dashboard/social",
      "/dashboard/payments",
    ],
    children: [
      {
        title: "Profile",
        href: "/dashboard/profile",
        section: "Dashboard",
        status: "Live",
        description: "Client bio, goals, preferences, notes, and contact info.",
        linksTo: ["/dashboard/progress", "/dashboard/sessions"],
      },
      {
        title: "Sessions",
        href: "/dashboard/sessions",
        section: "Dashboard",
        status: "Live",
        description: "Booking, session history, and upcoming appointments.",
        linksTo: ["/dashboard/training-calendar", "/dashboard/payments"],
      },
      {
        title: "Progress",
        href: "/dashboard/progress",
        section: "Dashboard",
        status: "Live",
        description:
          "Workout stats, goals, movement progress, body focus, Momentum Points.",
        linksTo: ["/dashboard/social", "/dashboard/social/post"],
        children: [
          {
            title: "Habit Tracker",
            href: "/dashboard/progress/habit-tracker",
            section: "Dashboard",
            status: "Live",
            description: "Track habits that support training progress.",
          },
          {
            title: "Weekly Check-In",
            href: "/dashboard/progress/check-in",
            section: "Dashboard",
            status: "Live",
            description: "Weekly readiness, recovery, wins, and notes.",
          },
        ],
      },
      {
        title: "Social Hub",
        href: "/dashboard/social",
        section: "Dashboard",
        status: "Live",
        description:
          "Private client feed with photos, replies, workout wins, and rewards.",
        linksTo: ["/dashboard/social/post", "/dashboard/progress"],
      },
      {
        title: "Post a Win",
        href: "/dashboard/social/post",
        section: "Dashboard",
        status: "Live",
        description:
          "Create a workout win post with photo/video, caption, and Momentum Points.",
        linksTo: ["/dashboard/social", "/dashboard/progress"],
      },
      {
        title: "Recovery",
        href: "/dashboard/recovery",
        section: "Dashboard",
        status: "Live",
        description:
          "Mobility, recovery, assisted stretch, and readiness support.",
      },
      {
        title: "Nutrition",
        href: "/dashboard/nutrition",
        section: "Dashboard",
        status: "Live",
        description:
          "Recipes, meal prep, grocery lists, and nutrition support.",
        children: [
          {
            title: "Meal Prep",
            href: "/dashboard/nutrition/meal-prep",
            section: "Dashboard",
            status: "Live",
            description: "Meal prep planning and repeatable meals.",
          },
          {
            title: "Chicken Rice Bowl",
            href: "/dashboard/nutrition/recipes/chicken-rice-bowl",
            section: "Dashboard",
            status: "Live",
            description: "Guided recipe page.",
          },
        ],
      },
      {
        title: "Payments",
        href: "/dashboard/payments",
        section: "Dashboard",
        status: "Live",
        description: "Client packages, payments, renewals, and checkout links.",
      },
      {
        title: "Training Calendar",
        href: "/dashboard/training-calendar",
        section: "Dashboard",
        status: "Live",
        description: "Training schedule and upcoming sessions.",
      },
      {
        title: "Coach Messaging",
        href: "/dashboard/coach-messaging",
        section: "Dashboard",
        status: "Live",
        description: "Client-to-coach messages.",
      },
      {
        title: "Messaging",
        href: "/dashboard/messaging",
        section: "Dashboard",
        status: "Recommended",
        description:
          "Recommended alias or replacement route for coach messaging.",
      },
      {
        title: "Rewards",
        href: "/dashboard/rewards",
        section: "Dashboard",
        status: "Recommended",
        description: "Standalone Momentum rewards redemption page.",
        linksTo: ["/dashboard/social", "/dashboard/payments"],
      },
    ],
  },
  {
    title: "Online Training",
    href: "/online-program",
    section: "Online Training",
    status: "Live",
    description: "Remote coaching dashboard.",
    linksTo: ["/online-program/weekly-plan", "/online-program/workouts"],
    children: [
      {
        title: "Current Phase",
        href: "/online-program/current-phase",
        section: "Online Training",
        status: "Live",
        description: "Current training block, goal, focus, and progress.",
      },
      {
        title: "Weekly Plan",
        href: "/online-program/weekly-plan",
        section: "Online Training",
        status: "Live",
        description: "Week-at-a-glance training schedule.",
      },
      {
        title: "Program Workouts",
        href: "/online-program/workouts",
        section: "Online Training",
        status: "Live",
        description: "Assigned online program workouts.",
        children: [
          {
            title: "Workout Detail",
            href: "/online-program/workouts/detail",
            section: "Online Training",
            status: "Live",
            description: "Workout plan, exercises, and coach cues.",
            children: [
              {
                title: "Exercise Demo",
                href: "/online-program/workouts/detail/exercise-demo",
                section: "Online Training",
                status: "Live",
                description: "Video demo, cues, mistakes, and modifications.",
              },
              {
                title: "Log Sets",
                href: "/online-program/workouts/detail/log-sets",
                section: "Online Training",
                status: "Live",
                description: "Log weight, reps, RPE, and notes.",
              },
              {
                title: "Complete Workout",
                href: "/online-program/workouts/detail/complete",
                section: "Online Training",
                status: "Live",
                description: "Workout recap, feedback, and next steps.",
              },
            ],
          },
        ],
      },
      {
        title: "Program Progress",
        href: "/online-program/progress",
        section: "Online Training",
        status: "Live",
        description: "Strength, completion, and streak tracking.",
        children: [
          {
            title: "Strength Tracking",
            href: "/online-program/progress/strength",
            section: "Online Training",
            status: "Live",
            description: "Track movement and lift progress.",
          },
          {
            title: "Completion %",
            href: "/online-program/progress/completion",
            section: "Online Training",
            status: "Live",
            description: "Track program adherence.",
          },
          {
            title: "Streak",
            href: "/online-program/progress/streak",
            section: "Online Training",
            status: "Live",
            description: "Track weekly consistency.",
          },
        ],
      },
      {
        title: "Messages",
        href: "/online-program/messages",
        section: "Online Training",
        status: "Live",
        description: "Online program messaging.",
      },
      {
        title: "Saved Workouts",
        href: "/online-program/saved-workouts",
        section: "Online Training",
        status: "Live",
        description: "Client-facing saved workout library.",
      },
    ],
  },
  {
    title: "Workout Builder",
    href: "/workout-builder",
    section: "Admin",
    status: "Live",
    description: "Coach tool for creating workouts, templates, and logs.",
    children: [
      {
        title: "Exercise Library",
        href: "/workout-builder/exercise-library",
        section: "Admin",
        status: "Live",
        description: "Exercise database and demo library.",
        children: [
          {
            title: "Exercise Demo",
            href: "/workout-builder/exercise-library/exercise-demo",
            section: "Admin",
            status: "Live",
            description: "Builder-side demo and coaching cue page.",
          },
        ],
      },
      {
        title: "Build Workout",
        href: "/workout-builder/build",
        section: "Admin",
        status: "Live",
        description: "Create workouts from selected exercises.",
        children: [
          {
            title: "Add Exercises",
            href: "/workout-builder/build/add-exercises",
            section: "Admin",
            status: "Live",
            description: "Search and select exercises.",
          },
          {
            title: "Sets / Reps",
            href: "/workout-builder/build/sets-reps",
            section: "Admin",
            status: "Live",
            description: "Program volume, reps, tempo, and rest.",
          },
          {
            title: "Save Workout",
            href: "/workout-builder/build/save",
            section: "Admin",
            status: "Live",
            description:
              "Save as template, client workout, or program workout.",
          },
        ],
      },
      {
        title: "Saved Workouts",
        href: "/workout-builder/saved",
        section: "Admin",
        status: "Live",
        description: "Reusable workout template library.",
      },
    ],
  },
  {
    title: "Coach",
    href: "/coach",
    section: "Admin",
    status: "Live",
    description: "Coach-only operations and client management.",
    children: [
      {
        title: "Session Notes",
        href: "/coach/session-notes",
        section: "Admin",
        status: "Live",
        description: "Private coaching notes and session records.",
      },
      {
        title: "Client Programming",
        href: "/coach/programming",
        section: "Admin",
        status: "Recommended",
        description: "Recommended coach-side program assignment system.",
      },
    ],
  },
  {
    title: "Admin",
    href: "/admin",
    section: "Admin",
    status: "Live",
    description:
      "Business command center for leads, marketing, and operations.",
    linksTo: ["/admin/site-map", "/admin/post-hub", "/admin/lead-map"],
    children: [
      {
        title: "Admin Dashboard",
        href: "/admin/dashboard",
        section: "Admin",
        status: "Live",
        description: "Admin business overview, priorities, and metrics.",
      },
      {
        title: "AI Prompt Center",
        href: "/admin/ai-prompt",
        section: "Admin",
        status: "Live",
        description: "Master context, reusable prompts, and AI handoff.",
      },
      {
        title: "Post Hub",
        href: "/admin/post-hub",
        section: "Admin",
        status: "Live",
        description:
          "Content hub for posts, emails, blogs, scripts, and platforms.",
      },
      {
        title: "Social Portal",
        href: "/admin/social-portal",
        section: "Admin",
        status: "Live",
        description: "Social links and marketing workflow hub.",
      },
      {
        title: "Lead Map",
        href: "/admin/lead-map",
        section: "Admin",
        status: "Live",
        description: "Track leads by address, city, source, and status.",
      },
      {
        title: "Leads",
        href: "/admin/leads",
        section: "Admin",
        status: "Live",
        description: "Lead list, pipeline, source, value, and next action.",
      },
      {
        title: "Lead Profile",
        href: "/admin/lead-profile",
        section: "Admin",
        status: "Live",
        description: "Individual prospect profile and follow-up notes.",
      },
      {
        title: "Clients",
        href: "/admin/clients",
        section: "Admin",
        status: "Live",
        description: "Admin-side client management.",
      },
      {
        title: "CRM Dashboard",
        href: "/admin/crm-dashboard",
        section: "Admin",
        status: "Live",
        description: "Lead, referral, follow-up, and sales pipeline overview.",
      },
      {
        title: "Follow-Ups",
        href: "/admin/follow-ups",
        section: "Admin",
        status: "Live",
        description: "Daily lead, client, referral, and renewal follow-ups.",
      },
      {
        title: "Invoices",
        href: "/admin/invoices",
        section: "Admin",
        status: "Live",
        description: "Invoices, payments, balances, and package records.",
      },
      {
        title: "Referrals",
        href: "/admin/referrals",
        section: "Admin",
        status: "Live",
        description:
          "Referral sources, doctors, clients, partners, and outreach.",
      },
      {
        title: "Reports",
        href: "/admin/reports",
        section: "Admin",
        status: "Live",
        description:
          "Revenue, leads, retention, conversion, and growth reports.",
      },
      {
        title: "Sales",
        href: "/admin/sales",
        section: "Admin",
        status: "Live",
        description:
          "Offers, packages, upsells, objections, and close tracking.",
      },
      {
        title: "Templates",
        href: "/admin/templates",
        section: "Admin",
        status: "Live",
        description: "Reusable messages, scripts, forms, contracts, and notes.",
      },
      {
        title: "Site Map",
        href: "/admin/site-map",
        section: "Admin",
        status: "Live",
        description: "Editable architecture map and page tracker.",
      },
    ],
  },
];

function flatten(nodes: PageNode[]): PageNode[] {
  return nodes.flatMap((node) => [
    node,
    ...(node.children ? flatten(node.children) : []),
  ]);
}

function filterTree(nodes: PageNode[], term: string): PageNode[] {
  if (!term.trim()) return nodes;
  const lower = term.toLowerCase();

  return nodes
    .map((node) => {
      const children = node.children ? filterTree(node.children, term) : [];

      const match =
        node.title.toLowerCase().includes(lower) ||
        node.href.toLowerCase().includes(lower) ||
        node.description.toLowerCase().includes(lower) ||
        node.section.toLowerCase().includes(lower) ||
        node.status.toLowerCase().includes(lower);

      if (match || children.length) {
        return { ...node, children };
      }

      return null;
    })
    .filter(Boolean) as PageNode[];
}

function TreeNode({
  node,
  depth = 0,
  checked,
  setChecked,
  notes,
  setNotes,
  linkNotes,
  setLinkNotes,
}: {
  node: PageNode;
  depth?: number;
  checked: Record<string, boolean>;
  setChecked: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  notes: Record<string, string>;
  setNotes: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  linkNotes: Record<string, string>;
  setLinkNotes: React.Dispatch<React.SetStateAction<Record<string, string>>>;
}) {
  const [open, setOpen] = useState(false);
  const hasChildren = Boolean(node.children?.length);
  const isRecommended = node.status === "Recommended";

  return (
    <div style={{ marginLeft: depth * 22 }} className="mt-3">
      <div
        className={`rounded-[24px] border p-4 shadow-xl shadow-black/10 backdrop-blur transition hover:border-sky-400/40 ${
          isRecommended
            ? "border-white/5 bg-slate-950/25 opacity-70"
            : "border-white/10 bg-slate-950/45 hover:bg-white/[0.07]"
        }`}
      >
        <div className="grid gap-3 sm:grid-cols-[32px_32px_1fr_auto] sm:items-start">
          <input
            type="checkbox"
            checked={Boolean(checked[node.href])}
            onChange={(e) =>
              setChecked((prev) => ({
                ...prev,
                [node.href]: e.target.checked,
              }))
            }
            className="mt-2 h-5 w-5 accent-sky-500"
          />

          <button
            onClick={() => setOpen((value) => !value)}
            className="grid h-8 w-8 place-items-center rounded-xl border border-white/10 bg-white/5 text-sm font-bold text-white hover:bg-white/10"
          >
            {hasChildren ? (open ? "▾" : "▸") : "•"}
          </button>

          <div>
            <a
              href={node.href}
              className="text-lg font-bold tracking-tight text-white hover:text-sky-300"
            >
              {node.title}
            </a>

            <p className="mt-1 text-sm leading-6 text-slate-400">
              {node.description}
            </p>

            <div className="mt-3 flex flex-wrap gap-2">
              <span
                className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] ${sectionStyles[node.section]}`}
              >
                {node.section}
              </span>

              <span
                className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusStyles[node.status]}`}
              >
                {node.status}
              </span>

              <code className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">
                {node.href}
              </code>
            </div>

            <div className="mt-4 grid gap-3 lg:grid-cols-2">
              <textarea
                value={notes[node.href] || ""}
                onChange={(e) =>
                  setNotes((prev) => ({
                    ...prev,
                    [node.href]: e.target.value,
                  }))
                }
                placeholder="Notes for this page..."
                rows={3}
                className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-sky-400/40"
              />

              <textarea
                value={linkNotes[node.href] || ""}
                onChange={(e) =>
                  setLinkNotes((prev) => ({
                    ...prev,
                    [node.href]: e.target.value,
                  }))
                }
                placeholder="Annotate which buttons, CTAs, or pages this links to..."
                rows={3}
                className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-sky-400/40"
              />
            </div>

            {node.linksTo?.length ? (
              <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.035] p-3">
                <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500">
                  Links To
                </div>

                <div className="mt-2 flex flex-wrap gap-2">
                  {node.linksTo.map((link) => (
                    <a
                      key={link}
                      href={link}
                      className="rounded-full border border-sky-400/20 bg-sky-500/10 px-3 py-1 text-xs text-sky-300 hover:bg-sky-500/15"
                    >
                      {link}
                    </a>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          <div className="text-right text-xs text-slate-500">
            {hasChildren ? `${node.children?.length} child pages` : "Page"}
          </div>
        </div>
      </div>

      {hasChildren && open && (
        <div>
          {node.children!.map((child) => (
            <TreeNode
              key={`${child.href}-${child.title}`}
              node={child}
              depth={depth + 1}
              checked={checked}
              setChecked={setChecked}
              notes={notes}
              setNotes={setNotes}
              linkNotes={linkNotes}
              setLinkNotes={setLinkNotes}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function SiteMapPage() {
  const [query, setQuery] = useState("");
  const [sectionFilter, setSectionFilter] = useState<"All" | Section>("All");
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [linkNotes, setLinkNotes] = useState<Record<string, string>>({});

  const allPages = useMemo(() => flatten(siteMap), []);
  const sections = useMemo(
    () => Array.from(new Set(allPages.map((page) => page.section))),
    [allPages],
  );

  const filteredBySection = useMemo(() => {
    if (sectionFilter === "All") return siteMap;
    return siteMap.filter((node) => node.section === sectionFilter);
  }, [sectionFilter]);

  const filteredTree = useMemo(
    () => filterTree(filteredBySection, query),
    [filteredBySection, query],
  );

  const sectionCounts = useMemo(() => {
    return allPages.reduce<Record<string, number>>((acc, page) => {
      acc[page.section] = (acc[page.section] || 0) + 1;
      return acc;
    }, {});
  }, [allPages]);

  const completedCount = Object.values(checked).filter(Boolean).length;
  const recommendedCount = allPages.filter(
    (page) => page.status === "Recommended",
  ).length;
  const liveCount = allPages.filter((page) => page.status === "Live").length;

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.14),_transparent_30%),radial-gradient(circle_at_80%_10%,_rgba(249,115,22,0.14),_transparent_26%),linear-gradient(180deg,#020617_0%,#0f172a_100%)] text-white">
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <section className="rounded-[34px] border border-white/10 bg-white/[0.055] p-6 shadow-2xl shadow-black/25 backdrop-blur lg:p-8">
          <div className="grid gap-6 xl:grid-cols-[1fr_360px] xl:items-end">
            <div>
              <div className="text-[11px] uppercase tracking-[0.24em] text-sky-300">
                Sound Fitness Architecture
              </div>

              <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
                Admin Site Map
              </h1>

              <p className="mt-4 max-w-3xl text-base leading-7 text-slate-300">
                Color-coded map for the five major areas: Public, Onboarding,
                Dashboard, Online Training, and Admin. Check pages off, add
                notes, annotate links, and track recommended future pages.
              </p>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <a
                  href="/dashboard"
                  className="rounded-[24px] bg-sky-500 px-5 py-4 text-center text-sm font-semibold text-slate-950 shadow-lg shadow-sky-500/20 hover:bg-sky-400"
                >
                  Dashboard
                </a>

                <a
                  href="/dashboard/social"
                  className="rounded-[24px] border border-white/10 bg-white/5 px-5 py-4 text-center text-sm font-medium text-slate-200 hover:bg-white/10"
                >
                  Social Hub
                </a>

                <a
                  href="/admin"
                  className="rounded-[24px] border border-white/10 bg-white/5 px-5 py-4 text-center text-sm font-medium text-slate-200 hover:bg-white/10"
                >
                  Admin
                </a>
              </div>
            </div>

            <div className="grid gap-3">
              <div className="rounded-[28px] border border-white/10 bg-slate-950/40 p-5">
                <div className="text-5xl font-bold tracking-tight">
                  {completedCount}/{allPages.length}
                </div>
                <div className="mt-2 text-[11px] uppercase tracking-[0.2em] text-slate-400">
                  Checked Pages
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-[24px] border border-emerald-400/20 bg-emerald-500/10 p-4">
                  <div className="text-2xl font-bold text-emerald-300">
                    {liveCount}
                  </div>
                  <div className="text-xs text-slate-400">Live / Existing</div>
                </div>

                <div className="rounded-[24px] border border-slate-400/20 bg-slate-500/10 p-4">
                  <div className="text-2xl font-bold text-slate-300">
                    {recommendedCount}
                  </div>
                  <div className="text-xs text-slate-400">Recommended</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-5">
          {sections.map((section) => (
            <button
              key={section}
              onClick={() => setSectionFilter(section)}
              className={`rounded-[26px] border p-4 text-left shadow-xl shadow-black/10 backdrop-blur ${sectionStyles[section]}`}
            >
              <div className="text-3xl font-bold">{sectionCounts[section]}</div>
              <div className="mt-1 text-xs font-semibold">{section}</div>
            </button>
          ))}
        </section>

        <section className="grid gap-3 lg:grid-cols-[1fr_260px_160px]">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search pages, routes, descriptions, status..."
            className="rounded-[22px] border border-white/10 bg-white/[0.055] px-5 py-4 text-sm text-white outline-none placeholder:text-slate-500 focus:border-sky-400/40"
          />

          <select
            value={sectionFilter}
            onChange={(event) =>
              setSectionFilter(event.target.value as "All" | Section)
            }
            className="rounded-[22px] border border-white/10 bg-slate-950/70 px-5 py-4 text-sm text-white outline-none focus:border-sky-400/40"
          >
            <option>All</option>
            {sections.map((section) => (
              <option key={section}>{section}</option>
            ))}
          </select>

          <button
            onClick={() => setSectionFilter("All")}
            className="rounded-[22px] border border-white/10 bg-white/5 px-5 py-4 text-sm font-medium text-white hover:bg-white/10"
          >
            Show All
          </button>
        </section>

        <section className="rounded-[34px] border border-white/10 bg-white/[0.055] p-6 shadow-2xl shadow-black/20 backdrop-blur">
          <div className="mb-5">
            <div className="text-[11px] uppercase tracking-[0.22em] text-cyan-300">
              Default Closed Hierarchy
            </div>
            <h2 className="mt-2 text-2xl font-bold tracking-tight">
              Page Tree
            </h2>
          </div>

          <div>
            {filteredTree.map((node) => (
              <TreeNode
                key={`${node.href}-${node.title}`}
                node={node}
                checked={checked}
                setChecked={setChecked}
                notes={notes}
                setNotes={setNotes}
                linkNotes={linkNotes}
                setLinkNotes={setLinkNotes}
              />
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
