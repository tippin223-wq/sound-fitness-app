"use client";

import React, { useMemo, useState } from "react";
import { ROUTES } from "@/lib/routes";

type Section =
  | "Public / Onboarding"
  | "Member App"
  | "Coach Portal"
  | "Admin Portal"
  | "Dev Tools"
  | "Legacy / Hidden";

type Status =
  | "Canonical"
  | "Active Secondary"
  | "Redirect Wrapper"
  | "Hidden / Deprecated"
  | "Safe To Delete Later"
  | "Future"
  | "Dev Tool";

type PageNode = {
  title: string;
  href: string;
  description: string;
  section: Section;
  status: Status;
  target?: string;
  children?: PageNode[];
};

const sectionStyles: Record<Section, string> = {
  "Public / Onboarding":
    "border-blue-400/30 bg-blue-500/10 text-blue-300",
  "Member App": "border-sky-400/30 bg-sky-500/10 text-sky-300",
  "Coach Portal": "border-cyan-400/30 bg-cyan-500/10 text-cyan-300",
  "Admin Portal": "border-amber-400/30 bg-amber-500/10 text-amber-300",
  "Dev Tools": "border-violet-400/30 bg-violet-500/10 text-violet-300",
  "Legacy / Hidden":
    "border-slate-400/20 bg-slate-500/10 text-slate-300",
};

const statusStyles: Record<Status, string> = {
  Canonical: "border-emerald-400/25 bg-emerald-500/10 text-emerald-300",
  "Active Secondary": "border-sky-400/25 bg-sky-500/10 text-sky-300",
  "Redirect Wrapper": "border-cyan-400/25 bg-cyan-500/10 text-cyan-300",
  "Hidden / Deprecated":
    "border-slate-400/20 bg-slate-500/10 text-slate-400",
  "Safe To Delete Later":
    "border-red-400/25 bg-red-500/10 text-red-300",
  Future: "border-fuchsia-400/25 bg-fuchsia-500/10 text-fuchsia-300",
  "Dev Tool": "border-violet-400/25 bg-violet-500/10 text-violet-300",
};

const route = (
  title: string,
  href: string,
  section: Section,
  status: Status,
  description: string,
  target?: string,
  children?: PageNode[],
): PageNode => ({
  title,
  href,
  section,
  status,
  description,
  target,
  children,
});

const siteMap: PageNode[] = [
  route(
    "Public and Auth",
    ROUTES.public.home,
    "Public / Onboarding",
    "Active Secondary",
    "Public entry, auth, and onboarding routes.",
    undefined,
    [
      route(
        "Member Login",
        ROUTES.auth.login,
        "Public / Onboarding",
        "Active Secondary",
        "Public member login route.",
      ),
      route(
        "Admin Login",
        ROUTES.admin.login,
        "Public / Onboarding",
        "Active Secondary",
        "Public admin login route.",
      ),
      route(
        "Coach Login",
        ROUTES.coach.login,
        "Public / Onboarding",
        "Active Secondary",
        "Public coach login route.",
      ),
      route(
        "Onboarding",
        ROUTES.onboarding.home,
        "Public / Onboarding",
        "Active Secondary",
        "New member setup flow before dashboard use.",
      ),
    ],
  ),
  route(
    "Member Command Center",
    ROUTES.dashboard.home,
    "Member App",
    "Canonical",
    "Main member hub that answers what to do next and where to go.",
    undefined,
    [
      route(
        "Dashboard",
        ROUTES.dashboard.home,
        "Member App",
        "Canonical",
        "Main member command center.",
      ),
      route(
        "Sessions",
        ROUTES.dashboard.sessions,
        "Member App",
        "Canonical",
        "Workout command center for starting, resuming, templates, history, and links.",
      ),
      route(
        "Workout Session Logger",
        ROUTES.dashboard.sessionWorkout,
        "Member App",
        "Canonical",
        "Canonical workout logging route for sets, reps, weight, and completion.",
      ),
      route(
        "Workout Builder",
        ROUTES.workoutBuilder.home,
        "Member App",
        "Canonical",
        "Canonical builder route for selected exercises, template save/load, plan assignment, and start workout.",
      ),
      route(
        "Exercise Library",
        ROUTES.dashboard.exerciseLibrary,
        "Member App",
        "Canonical",
        "Canonical normalized exercise catalog, custom exercises, Add Stats, and builder selection path.",
      ),
      route(
        "My Plan",
        ROUTES.dashboard.myPlan,
        "Member App",
        "Canonical",
        "Weekly plan hub with timeline weeks, assignments, duplicate week, and start workout.",
      ),
      route(
        "Stats",
        ROUTES.dashboard.stats,
        "Member App",
        "Canonical",
        "Canonical workout stats and recent logged exercise performance.",
      ),
      route(
        "Video Review",
        ROUTES.dashboard.videoReview,
        "Member App",
        "Canonical",
        "Focused video submission and coach feedback for form checks.",
      ),
    ],
  ),
  route(
    "Member Secondary Routes",
    ROUTES.dashboard.profile,
    "Member App",
    "Active Secondary",
    "Useful member pages that remain available but are not the main workout spine.",
    undefined,
    [
      route(
        "Profile",
        ROUTES.dashboard.profile,
        "Member App",
        "Active Secondary",
        "Member account, profile, and preferences.",
      ),
      route(
        "Coach Messaging",
        ROUTES.dashboard.coachMessaging,
        "Member App",
        "Active Secondary",
        "Member-to-coach messaging.",
      ),
      route(
        "Session History",
        ROUTES.dashboard.sessionHistory,
        "Member App",
        "Active Secondary",
        "Historical session review route.",
      ),
      route(
        "Session Booking",
        ROUTES.dashboard.sessionBooking,
        "Member App",
        "Active Secondary",
        "Booking and package-related session route.",
      ),
      route(
        "Session Notes",
        ROUTES.dashboard.sessionNotes,
        "Member App",
        "Active Secondary",
        "Notes route for session context.",
      ),
      route(
        "Workout Complete",
        ROUTES.dashboard.workoutComplete,
        "Member App",
        "Active Secondary",
        "Post-workout completion route.",
      ),
      route(
        "Create My Plan",
        ROUTES.dashboard.createMyPlan,
        "Member App",
        "Active Secondary",
        "Plan creation route that supports the My Plan hub.",
      ),
      route(
        "Exercise Demo",
        ROUTES.workoutBuilder.exerciseDemo,
        "Member App",
        "Active Secondary",
        "Exercise detail/demo route under the canonical library.",
      ),
      route(
        "Nutrition",
        ROUTES.nutrition.home,
        "Member App",
        "Active Secondary",
        "Nutrition hub and recipes.",
      ),
      route(
        "Recovery",
        ROUTES.dashboard.recovery,
        "Member App",
        "Active Secondary",
        "Recovery, mobility, and readiness pages.",
      ),
      route(
        "Progress",
        ROUTES.dashboard.progress,
        "Member App",
        "Active Secondary",
        "Older progress hub retained alongside canonical Stats.",
      ),
      route(
        "Social",
        ROUTES.dashboard.social,
        "Member App",
        "Active Secondary",
        "Member social feed and posts.",
      ),
      route(
        "Payments",
        ROUTES.dashboard.payments,
        "Member App",
        "Active Secondary",
        "Payments and packages.",
      ),
      route(
        "Calendar",
        ROUTES.dashboard.calendar,
        "Member App",
        "Active Secondary",
        "Calendar view for training and sessions.",
      ),
    ],
  ),
  route(
    "Coach Portal",
    ROUTES.coach.dashboard,
    "Coach Portal",
    "Canonical",
    "Coach-facing protected dashboard.",
    undefined,
    [
      route(
        "Coach Dashboard",
        ROUTES.coach.dashboard,
        "Coach Portal",
        "Canonical",
        "Canonical coach dashboard.",
      ),
      route(
        "Coach Root",
        ROUTES.coach.home,
        "Coach Portal",
        "Redirect Wrapper",
        "Compatibility route that forwards to the canonical coach dashboard.",
        ROUTES.coach.dashboard,
      ),
      route(
        "Coach Login Dashboard",
        ROUTES.coach.legacyDashboard,
        "Coach Portal",
        "Redirect Wrapper",
        "Legacy post-login dashboard path.",
        ROUTES.coach.dashboard,
      ),
    ],
  ),
  route(
    "Admin Portal",
    ROUTES.admin.home,
    "Admin Portal",
    "Active Secondary",
    "Business, CRM, content, reports, and operational tools.",
    undefined,
    [
      route(
        "Admin Home",
        ROUTES.admin.home,
        "Admin Portal",
        "Active Secondary",
        "Admin landing route.",
      ),
      route(
        "Admin Dashboard",
        ROUTES.admin.dashboard,
        "Admin Portal",
        "Active Secondary",
        "Admin business overview.",
      ),
      route(
        "Clients",
        ROUTES.admin.clients,
        "Admin Portal",
        "Active Secondary",
        "Admin client management.",
      ),
      route(
        "Leads",
        ROUTES.admin.leads,
        "Admin Portal",
        "Active Secondary",
        "Lead pipeline.",
      ),
      route(
        "CRM Dashboard",
        ROUTES.admin.crmDashboard,
        "Admin Portal",
        "Active Secondary",
        "CRM overview.",
      ),
      route(
        "Post Hub",
        ROUTES.admin.postHub,
        "Admin Portal",
        "Active Secondary",
        "Content and marketing hub.",
      ),
      route(
        "Site Map",
        ROUTES.admin.siteMap,
        "Admin Portal",
        "Active Secondary",
        "This route structure audit page.",
      ),
    ],
  ),
  route(
    "Dev Tools",
    ROUTES.admin.devMovementIntelligence,
    "Dev Tools",
    "Dev Tool",
    "Internal validation and preview routes.",
    undefined,
    [
      route(
        "Movement Intelligence",
        ROUTES.admin.devMovementIntelligence,
        "Dev Tools",
        "Dev Tool",
        "Normalized movement taxonomy, mapping, validation, and catalog preview.",
      ),
    ],
  ),
  route(
    "Removed Workout Routes",
    ROUTES.workoutBuilder.home,
    "Legacy / Hidden",
    "Safe To Delete Later",
    "Deprecated builder saved/tracking pages, duplicate session saved-workouts, and older builder child pages have been removed from the app route tree.",
    undefined,
    [
      route(
        "Canonical Replacement",
        ROUTES.dashboard.sessions,
        "Legacy / Hidden",
        "Safe To Delete Later",
        "Use Sessions, Workout Builder, Exercise Library, Stats, and the workout logger as the only active workout system.",
        ROUTES.dashboard.sessions,
      ),
    ],
  ),
  route(
    "Future Route Areas",
    ROUTES.nutrition.home,
    "Member App",
    "Future",
    "Useful concepts that should get deeper data design before large feature expansion.",
    undefined,
    [
      route(
        "Nutrition Logic",
        ROUTES.nutrition.home,
        "Member App",
        "Future",
        "Keep route available, but centralize models before expanding meal planning.",
      ),
      route(
        "Recovery Logic",
        ROUTES.dashboard.recovery,
        "Member App",
        "Future",
        "Keep route available, but wire readiness and pain logs deliberately.",
      ),
      route(
        "Coach Client Workflows",
        ROUTES.coach.dashboard,
        "Coach Portal",
        "Future",
        "Coach portal needs real client views, notes, messaging, and programming assignment later.",
      ),
    ],
  ),
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
        node.status.toLowerCase().includes(lower) ||
        node.target?.toLowerCase().includes(lower);

      return match || children.length ? { ...node, children } : null;
    })
    .filter(Boolean) as PageNode[];
}

function TreeNode({ node, depth = 0 }: { node: PageNode; depth?: number }) {
  const [open, setOpen] = useState(depth < 1);
  const hasChildren = Boolean(node.children?.length);
  const isMuted =
    node.status === "Hidden / Deprecated" ||
    node.status === "Redirect Wrapper" ||
    node.status === "Safe To Delete Later";

  return (
    <div style={{ marginLeft: depth * 18 }} className="mt-3">
      <div
        className={`rounded-[26px] border p-4 shadow-xl shadow-black/10 backdrop-blur transition ${
          isMuted
            ? "border-white/5 bg-slate-950/25"
            : "border-white/10 bg-slate-950/45 hover:border-sky-400/35 hover:bg-white/[0.06]"
        }`}
      >
        <div className="grid gap-3 sm:grid-cols-[36px_1fr_auto] sm:items-start">
          <button
            onClick={() => setOpen((value) => !value)}
            className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-white/5 text-sm font-black text-white hover:bg-white/10"
            aria-label={hasChildren ? "Toggle section" : "Route item"}
          >
            {hasChildren ? (open ? "v" : ">") : "-"}
          </button>

          <div>
            <a
              href={node.href}
              className="text-lg font-black tracking-tight text-white hover:text-sky-300"
            >
              {node.title}
            </a>
            <p className="mt-1 text-sm leading-6 text-slate-400">
              {node.description}
            </p>

            <div className="mt-3 flex flex-wrap gap-2">
              <span
                className={`rounded-full border px-3 py-1 text-[11px] font-black uppercase tracking-[0.12em] ${sectionStyles[node.section]}`}
              >
                {node.section}
              </span>
              <span
                className={`rounded-full border px-3 py-1 text-xs font-bold ${statusStyles[node.status]}`}
              >
                {node.status}
              </span>
              <code className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">
                {node.href}
              </code>
            </div>

            {node.target ? (
              <div className="mt-3 rounded-2xl border border-cyan-400/15 bg-cyan-500/10 p-3 text-sm text-cyan-100">
                Redirects / points to{" "}
                <a href={node.target} className="font-bold underline">
                  {node.target}
                </a>
              </div>
            ) : null}
          </div>

          <div className="text-right text-xs text-slate-500">
            {hasChildren ? `${node.children?.length} routes` : "Route"}
          </div>
        </div>
      </div>

      {hasChildren && open ? (
        <div>
          {node.children!.map((child) => (
            <TreeNode key={`${child.href}-${child.title}`} node={child} depth={depth + 1} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export default function SiteMapPage() {
  const [query, setQuery] = useState("");
  const [sectionFilter, setSectionFilter] = useState<"All" | Section>("All");

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

  const counts = useMemo(() => {
    return {
      total: allPages.length,
      canonical: allPages.filter((page) => page.status === "Canonical").length,
      secondary: allPages.filter((page) => page.status === "Active Secondary")
        .length,
      redirects: allPages.filter((page) => page.status === "Redirect Wrapper")
        .length,
      deprecated: allPages.filter(
        (page) =>
          page.status === "Hidden / Deprecated" ||
          page.status === "Safe To Delete Later",
      ).length,
    };
  }, [allPages]);

  const sectionCounts = useMemo(() => {
    return allPages.reduce<Record<string, number>>((acc, page) => {
      acc[page.section] = (acc[page.section] || 0) + 1;
      return acc;
    }, {});
  }, [allPages]);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.14),_transparent_30%),radial-gradient(circle_at_80%_10%,_rgba(16,185,129,0.12),_transparent_26%),linear-gradient(180deg,#020617_0%,#0f172a_100%)] text-white">
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <section className="rounded-[34px] border border-white/10 bg-white/[0.055] p-6 shadow-2xl shadow-black/25 backdrop-blur lg:p-8">
          <div className="grid gap-6 xl:grid-cols-[1fr_420px] xl:items-end">
            <div>
              <div className="text-[11px] uppercase tracking-[0.24em] text-sky-300">
                Sound Fitness Architecture
              </div>
              <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl lg:text-6xl">
                Canonical Site Map
              </h1>
              <p className="mt-4 max-w-3xl text-base leading-7 text-slate-300">
                Current route map for canonical systems, active secondary pages,
                hidden legacy wrappers, internal dev tools, and future cleanup
                candidates.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-[24px] border border-emerald-400/20 bg-emerald-500/10 p-4">
                <div className="text-3xl font-black text-emerald-300">
                  {counts.canonical}
                </div>
                <div className="text-xs text-slate-400">Canonical</div>
              </div>
              <div className="rounded-[24px] border border-sky-400/20 bg-sky-500/10 p-4">
                <div className="text-3xl font-black text-sky-300">
                  {counts.secondary}
                </div>
                <div className="text-xs text-slate-400">Secondary</div>
              </div>
              <div className="rounded-[24px] border border-cyan-400/20 bg-cyan-500/10 p-4">
                <div className="text-3xl font-black text-cyan-300">
                  {counts.redirects}
                </div>
                <div className="text-xs text-slate-400">Redirects</div>
              </div>
              <div className="rounded-[24px] border border-slate-400/20 bg-slate-500/10 p-4">
                <div className="text-3xl font-black text-slate-300">
                  {counts.deprecated}
                </div>
                <div className="text-xs text-slate-400">Deprecated</div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
          {sections.map((section) => (
            <button
              key={section}
              onClick={() => setSectionFilter(section)}
              className={`rounded-[26px] border p-4 text-left shadow-xl shadow-black/10 backdrop-blur ${sectionStyles[section]}`}
            >
              <div className="text-3xl font-black">
                {sectionCounts[section]}
              </div>
              <div className="mt-1 text-xs font-bold">{section}</div>
            </button>
          ))}
        </section>

        <section className="grid gap-3 lg:grid-cols-[1fr_280px_160px]">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search routes, status, sections, redirect targets..."
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
            className="rounded-[22px] border border-white/10 bg-white/5 px-5 py-4 text-sm font-bold text-white hover:bg-white/10"
          >
            Show All
          </button>
        </section>

        <section className="rounded-[34px] border border-white/10 bg-white/[0.055] p-6 shadow-2xl shadow-black/20 backdrop-blur">
          <div className="mb-5">
            <div className="text-[11px] uppercase tracking-[0.22em] text-cyan-300">
              Controlled Route Map
            </div>
            <h2 className="mt-2 text-2xl font-black tracking-tight">
              Page Tree
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Canonical routes should receive new product work. Redirect
              wrappers prevent stale internal links from becoming dead ends.
            </p>
          </div>

          <div>
            {filteredTree.map((node) => (
              <TreeNode key={`${node.href}-${node.title}`} node={node} />
            ))}
          </div>

          <div className="mt-6 rounded-[26px] border border-white/10 bg-slate-950/45 p-5 text-sm leading-6 text-slate-300">
            <strong className="text-white">Cleanup order:</strong> keep
            canonical routes stable, let redirect wrappers age through at least
            one usage cycle, then delete wrappers that have no analytics hits,
            external links, saved bookmarks, or unique UI left to migrate.
          </div>
        </section>
      </div>
    </main>
  );
}
