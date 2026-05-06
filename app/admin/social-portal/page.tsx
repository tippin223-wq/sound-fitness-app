"use client";

import React, { useMemo, useState } from "react";
import { ROUTES } from "@/lib/routes";

type PlatformStatus = "Active" | "Needs Post" | "Review" | "Setup";
type CampaignStatus = "Running" | "Planning" | "Paused" | "Test";

const socials = [
  {
    name: "Instagram",
    type: "Social",
    status: "Needs Post",
    url: "https://www.instagram.com/",
    priority: "High",
    note: "Main trust + content engine",
  },
  {
    name: "Facebook Page",
    type: "Social",
    status: "Active",
    url: "https://www.facebook.com/",
    priority: "Medium",
    note: "Local credibility + reposts",
  },
  {
    name: "Nextdoor",
    type: "Local",
    status: "Review",
    url: "https://nextdoor.com/",
    priority: "High",
    note: "Neighborhood trust + local leads",
  },
  {
    name: "Google Business",
    type: "Local SEO",
    status: "Active",
    url: "https://business.google.com/",
    priority: "High",
    note: "Reviews, search visibility, local intent",
  },
  {
    name: "YouTube Studio",
    type: "Video",
    status: "Setup",
    url: "https://studio.youtube.com/",
    priority: "Medium",
    note: "Long-form demos + trust",
  },
  {
    name: "TikTok",
    type: "Video",
    status: "Setup",
    url: "https://www.tiktok.com/",
    priority: "Low",
    note: "Optional reach channel",
  },
];

const leadPlatforms = [
  {
    name: "Lead Map",
    url: "/admin/lead-map",
    count: 12,
    source: "Internal CRM",
    action: "Review hot areas",
  },
  {
    name: "Website Admin",
    url: "/dashboard",
    count: 4,
    source: "Website",
    action: "Check form leads",
  },
  {
    name: "Gmail",
    url: "https://mail.google.com/",
    count: 3,
    source: "Email",
    action: "Reply to inquiries",
  },
  {
    name: "Stripe",
    url: "https://dashboard.stripe.com/",
    count: 2,
    source: "Payments",
    action: "Check purchases",
  },
  {
    name: "Google Reviews",
    url: "https://business.google.com/",
    count: 1,
    source: "Reputation",
    action: "Review/respond",
  },
];

const campaigns = [
  {
    name: "Education Hill 55+ Strength",
    area: "Redmond",
    status: "Running",
    goal: "Fall prevention + in-home strength leads",
    nextAction: "Post Nextdoor proof/process post",
  },
  {
    name: "Kirkland In-Home Training",
    area: "Kirkland",
    status: "Planning",
    goal: "Book free intro sessions",
    nextAction: "Create testimonial carousel",
  },
  {
    name: "Continuation Program",
    area: "Seattle / Eastside",
    status: "Test",
    goal: "Medical-adjacent referrals",
    nextAction: "Create physician one-pager post",
  },
  {
    name: "Pain-Free Strength at Home",
    area: "Bellevue",
    status: "Paused",
    goal: "Busy adult lead generation",
    nextAction: "Refresh CTA and landing page",
  },
];

const contentIdeas = [
  {
    type: "Teach",
    title: "Why lighter weights can build more muscle when form improves",
    platform: "Instagram / Blog",
    status: "Ready",
  },
  {
    type: "Reframe",
    title: "You do not need a gym to get strong",
    platform: "Nextdoor / Facebook",
    status: "Draft",
  },
  {
    type: "Proof",
    title: "Client win: better balance, stronger stairs, less fear",
    platform: "Instagram",
    status: "Needs asset",
  },
  {
    type: "Invite",
    title: "Free intro session for Eastside in-home training",
    platform: "Google Business / Facebook",
    status: "Ready",
  },
];

const weeklyRhythm = [
  { day: "Monday", theme: "Teach", task: "Educational post from blog topic" },
  {
    day: "Wednesday",
    theme: "Reframe",
    task: "Myth, objection, or belief shift",
  },
  {
    day: "Friday",
    theme: "Proof",
    task: "Client story, process, or behind-the-scenes",
  },
  {
    day: "Sunday",
    theme: "Invite",
    task: "Soft CTA for free intro / assessment",
  },
];

const localAreas = [
  { area: "Kirkland", focus: "In-home strength + busy adults", leads: 5 },
  { area: "Redmond", focus: "Education Hill + 55+", leads: 7 },
  { area: "Bellevue", focus: "Higher-income in-home training", leads: 3 },
  { area: "Seattle", focus: "Continuation + mobility", leads: 4 },
  { area: "Woodinville", focus: "Homeowners + premium service", leads: 2 },
];

export default function SoundSocialPortalPage() {
  const [platformFilter, setPlatformFilter] = useState("All");
  const [campaignFilter, setCampaignFilter] = useState("All");

  const filteredSocials = useMemo(() => {
    if (platformFilter === "All") return socials;
    return socials.filter((item) => item.status === platformFilter);
  }, [platformFilter]);

  const filteredCampaigns = useMemo(() => {
    if (campaignFilter === "All") return campaigns;
    return campaigns.filter((item) => item.status === campaignFilter);
  }, [campaignFilter]);

  const totalLeadCount = leadPlatforms.reduce(
    (sum, item) => sum + item.count,
    0,
  );
  const totalAreaLeads = localAreas.reduce((sum, item) => sum + item.leads, 0);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.14),_transparent_30%),radial-gradient(circle_at_80%_10%,_rgba(249,115,22,0.14),_transparent_26%),linear-gradient(180deg,#020617_0%,#0f172a_100%)] text-white">
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <section className="rounded-[34px] border border-white/10 bg-white/[0.055] p-6 shadow-2xl shadow-black/25 backdrop-blur lg:p-8">
          <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
            <div>
              <div className="text-[11px] uppercase tracking-[0.24em] text-sky-300">
                Sound Fitness Admin
              </div>
              <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
                Sound Social Portal
              </h1>
              <p className="mt-4 max-w-3xl text-base leading-7 text-slate-300">
                Your marketing cockpit: social links, lead sources, campaigns,
                local areas, content ideas, weekly rhythm, and quick actions in
                one place.
              </p>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <a
                  href="/admin/lead-map"
                  className="rounded-[24px] bg-sky-500 px-5 py-4 text-center text-sm font-semibold text-slate-950 shadow-lg shadow-sky-500/20 hover:bg-sky-400"
                >
                  Open Lead Map
                </a>
                <a
                  href="https://business.google.com/"
                  className="rounded-[24px] border border-white/10 bg-white/5 px-5 py-4 text-center text-sm font-medium text-slate-200 hover:bg-white/10"
                >
                  Google Business
                </a>
                <a
                  href="https://www.instagram.com/"
                  className="rounded-[24px] border border-white/10 bg-white/5 px-5 py-4 text-center text-sm font-medium text-slate-200 hover:bg-white/10"
                >
                  Instagram
                </a>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 rounded-[30px] border border-white/10 bg-slate-950/40 p-4">
              <MiniStat label="Tracked Leads" value={totalLeadCount} />
              <MiniStat label="Area Leads" value={totalAreaLeads} />
              <MiniStat label="Campaigns" value={campaigns.length} />
              <MiniStat label="Platforms" value={socials.length} />
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-4">
          <InsightCard
            label="Today’s Move"
            value="Post + follow up"
            detail="Create one trust post, then check lead map."
          />
          <InsightCard
            label="Best Channel"
            value="Google + Nextdoor"
            detail="Highest local intent for in-home training."
          />
          <InsightCard
            label="Top Area"
            value="Redmond"
            detail="Education Hill campaign should stay active."
          />
          <InsightCard
            label="CTA"
            value="Free Intro"
            detail="Keep the ask simple and low-friction."
          />
        </section>

        <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <section className="space-y-6">
            <Panel eyebrow="Quick Access" title="Social + lead platforms">
              <div className="mb-4 flex flex-wrap gap-2">
                {["All", "Active", "Needs Post", "Review", "Setup"].map(
                  (filter) => (
                    <button
                      key={filter}
                      onClick={() => setPlatformFilter(filter)}
                      className={`rounded-full border px-3 py-2 text-xs font-semibold ${
                        platformFilter === filter
                          ? "border-transparent bg-sky-500 text-slate-950"
                          : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
                      }`}
                    >
                      {filter}
                    </button>
                  ),
                )}
              </div>

              <div className="grid gap-3">
                {filteredSocials.map((item) => (
                  <a
                    key={item.name}
                    href={item.url}
                    className="rounded-[24px] border border-white/10 bg-slate-950/45 p-4 transition hover:border-sky-400/40 hover:bg-white/[0.07]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-semibold text-white">
                          {item.name}
                        </div>
                        <div className="mt-1 text-sm text-slate-400">
                          {item.note}
                        </div>
                        <div className="mt-2 text-xs uppercase tracking-[0.16em] text-slate-500">
                          {item.type} • {item.priority} priority
                        </div>
                      </div>
                      <StatusPill status={item.status as PlatformStatus} />
                    </div>
                  </a>
                ))}
              </div>
            </Panel>

            <Panel eyebrow="Lead Platforms" title="Where to check for leads">
              <div className="grid gap-3">
                {leadPlatforms.map((item) => (
                  <a
                    key={item.name}
                    href={item.url}
                    className="rounded-[24px] border border-white/10 bg-slate-950/45 p-4 transition hover:border-emerald-400/40 hover:bg-white/[0.07]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-semibold">{item.name}</div>
                        <div className="mt-1 text-sm text-slate-400">
                          {item.action}
                        </div>
                        <div className="mt-2 text-xs uppercase tracking-[0.16em] text-slate-500">
                          {item.source}
                        </div>
                      </div>
                      <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm font-bold text-emerald-300">
                        {item.count}
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            </Panel>

            <Panel eyebrow="Weekly Rhythm" title="Posting cadence">
              <div className="grid gap-3">
                {weeklyRhythm.map((item) => (
                  <div
                    key={item.day}
                    className="rounded-[24px] border border-white/10 bg-slate-950/45 p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-xs uppercase tracking-[0.18em] text-slate-500">
                          {item.day}
                        </div>
                        <div className="mt-1 font-semibold">{item.theme}</div>
                      </div>
                      <div className="max-w-[65%] text-right text-sm text-slate-300">
                        {item.task}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Panel>
          </section>

          <section className="space-y-6">
            <Panel eyebrow="Campaign Command" title="Local campaigns">
              <div className="mb-4 flex flex-wrap gap-2">
                {["All", "Running", "Planning", "Test", "Paused"].map(
                  (filter) => (
                    <button
                      key={filter}
                      onClick={() => setCampaignFilter(filter)}
                      className={`rounded-full border px-3 py-2 text-xs font-semibold ${
                        campaignFilter === filter
                          ? "border-transparent bg-orange-500 text-white"
                          : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
                      }`}
                    >
                      {filter}
                    </button>
                  ),
                )}
              </div>

              <div className="grid gap-3">
                {filteredCampaigns.map((item) => (
                  <div
                    key={item.name}
                    className="rounded-[26px] border border-white/10 bg-slate-950/45 p-5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-semibold text-white">
                          {item.name}
                        </div>
                        <div className="mt-1 text-sm text-slate-400">
                          {item.goal}
                        </div>
                        <div className="mt-3 rounded-[20px] border border-sky-400/20 bg-sky-500/10 p-3 text-sm text-slate-200">
                          Next: {item.nextAction}
                        </div>
                      </div>
                      <CampaignPill status={item.status as CampaignStatus} />
                    </div>
                    <div className="mt-3 text-xs uppercase tracking-[0.16em] text-slate-500">
                      {item.area}
                    </div>
                  </div>
                ))}
              </div>
            </Panel>

            <Panel eyebrow="Content Queue" title="Post ideas">
              <div className="grid gap-3">
                {contentIdeas.map((item) => (
                  <div
                    key={item.title}
                    className="rounded-[24px] border border-white/10 bg-slate-950/45 p-4"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="text-xs uppercase tracking-[0.18em] text-violet-300">
                          {item.type}
                        </div>
                        <div className="mt-1 font-semibold">{item.title}</div>
                        <div className="mt-2 text-sm text-slate-400">
                          {item.platform}
                        </div>
                      </div>
                      <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-slate-300">
                        {item.status}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Panel>

            <Panel eyebrow="Local Intelligence" title="Neighborhood focus">
              <div className="grid gap-3">
                {localAreas
                  .sort((a, b) => b.leads - a.leads)
                  .map((item) => (
                    <div
                      key={item.area}
                      className="rounded-[24px] border border-white/10 bg-slate-950/45 p-4"
                    >
                      <div className="flex justify-between gap-3">
                        <div>
                          <div className="font-semibold">{item.area}</div>
                          <div className="mt-1 text-sm text-slate-400">
                            {item.focus}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xl font-bold text-sky-300">
                            {item.leads}
                          </div>
                          <div className="text-[10px] uppercase tracking-[0.16em] text-slate-500">
                            leads
                          </div>
                        </div>
                      </div>
                      <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
                        <div
                          className="h-full rounded-full bg-sky-500"
                          style={{
                            width: `${Math.min(100, item.leads * 12)}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
              </div>
            </Panel>
          </section>
        </section>

        <section className="rounded-[34px] border border-white/10 bg-white/[0.055] p-6 shadow-2xl shadow-black/20 backdrop-blur">
          <div className="grid gap-6 lg:grid-cols-[1fr_420px] lg:items-center">
            <div>
              <div className="text-[11px] uppercase tracking-[0.24em] text-amber-300">
                Operating Rule
              </div>
              <h2 className="mt-2 text-3xl font-bold tracking-tight">
                Every post should point somewhere.
              </h2>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">
                Teach content builds trust. Reframe content changes beliefs.
                Proof content reduces doubt. Invite content creates leads. This
                portal keeps those pieces connected to the lead map and sales
                follow-up.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <a
                href={ROUTES.admin.leadMap}
                className="rounded-[24px] bg-sky-500 px-5 py-4 text-center text-sm font-semibold text-slate-950 shadow-lg shadow-sky-500/20 hover:bg-sky-400"
              >
                Track New Lead
              </a>
              <a
                href={ROUTES.admin.siteMap}
                className="rounded-[24px] border border-white/10 bg-white/5 px-5 py-4 text-center text-sm font-medium text-slate-200 hover:bg-white/10"
              >
                Open Site Map
              </a>
              <a
                href={ROUTES.dashboard.home}
                className="rounded-[24px] border border-white/10 bg-white/5 px-5 py-4 text-center text-sm font-medium text-slate-200 hover:bg-white/10"
              >
                Client Dashboard
              </a>
              <a
                href={ROUTES.workoutBuilder.home}
                className="rounded-[24px] border border-white/10 bg-white/5 px-5 py-4 text-center text-sm font-medium text-slate-200 hover:bg-white/10"
              >
                Workout Builder
              </a>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function Panel({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[34px] border border-white/10 bg-white/[0.055] p-6 shadow-2xl shadow-black/20 backdrop-blur">
      <div className="mb-5">
        <div className="text-[11px] uppercase tracking-[0.22em] text-sky-300">
          {eyebrow}
        </div>
        <h2 className="mt-2 text-2xl font-bold tracking-tight">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function MiniStat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-[22px] border border-white/10 bg-white/5 p-4">
      <div className="text-2xl font-bold">{value}</div>
      <div className="mt-1 text-[10px] uppercase tracking-[0.16em] text-slate-400">
        {label}
      </div>
    </div>
  );
}

function InsightCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string | number;
  detail: string;
}) {
  return (
    <div className="rounded-[28px] border border-white/10 bg-white/[0.055] p-5 shadow-xl shadow-black/15 backdrop-blur">
      <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">
        {label}
      </div>
      <div className="mt-3 text-xl font-bold tracking-tight text-white">
        {value}
      </div>
      <div className="mt-1 text-sm text-slate-400">{detail}</div>
    </div>
  );
}

function StatusPill({ status }: { status: PlatformStatus }) {
  const styles: Record<PlatformStatus, string> = {
    Active: "border-emerald-400/20 bg-emerald-500/10 text-emerald-300",
    "Needs Post": "border-amber-400/20 bg-amber-500/10 text-amber-300",
    Review: "border-sky-400/20 bg-sky-500/10 text-sky-300",
    Setup: "border-violet-400/20 bg-violet-500/10 text-violet-300",
  };

  return (
    <span
      className={`rounded-full border px-3 py-1 text-xs font-semibold ${styles[status]}`}
    >
      {status}
    </span>
  );
}

function CampaignPill({ status }: { status: CampaignStatus }) {
  const styles: Record<CampaignStatus, string> = {
    Running: "border-emerald-400/20 bg-emerald-500/10 text-emerald-300",
    Planning: "border-sky-400/20 bg-sky-500/10 text-sky-300",
    Paused: "border-slate-400/20 bg-slate-500/10 text-slate-300",
    Test: "border-orange-400/20 bg-orange-500/10 text-orange-300",
  };

  return (
    <span
      className={`rounded-full border px-3 py-1 text-xs font-semibold ${styles[status]}`}
    >
      {status}
    </span>
  );
}
