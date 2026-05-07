import Link from "next/link";
import { ROUTES } from "@/lib/routes";

const appointmentOffers = [
  {
    id: 1,
    client: "Maya R.",
    service: "In-Home Strength Training",
    time: "Today · 4:30 PM",
    location: "Redmond · Education Hill",
    pay: "$85",
    distance: "3.2 mi",
    duration: "60 min",
    notes: "Beginner strength, knee-friendly session.",
    position: "left-[62%] top-[34%]",
  },
  {
    id: 2,
    client: "Daniel K.",
    service: "Assisted Stretch",
    time: "Today · 6:00 PM",
    location: "Kirkland · Totem Lake",
    pay: "$70",
    distance: "5.8 mi",
    duration: "45 min",
    notes: "Hip mobility and low-back tension.",
    position: "left-[42%] top-[58%]",
  },
  {
    id: 3,
    client: "Angela P.",
    service: "Continuation Program",
    time: "Tomorrow · 10:00 AM",
    location: "Bellevue · Crossroads",
    pay: "$95",
    distance: "8.1 mi",
    duration: "60 min",
    notes: "Post-rehab strength continuation.",
    position: "left-[72%] top-[68%]",
  },
];

const coachTools = [
  {
    title: "My Schedule",
    icon: "📅",
    text: "View accepted appointments, availability, and upcoming sessions.",
    href: ROUTES.coach.dashboard,
  },
  {
    title: "Clients",
    icon: "👥",
    text: "See client notes, goals, history, and session preferences.",
    href: ROUTES.coach.dashboard,
  },
  {
    title: "Session Notes",
    icon: "📝",
    text: "Log workouts, mobility work, pain notes, and coaching wins.",
    href: ROUTES.coach.dashboard,
  },
  {
    title: "Workout Builder",
    icon: "🏋️",
    text: "Build custom workouts and save templates for clients.",
    href: ROUTES.coach.dashboard,
  },
  {
    title: "Messages",
    icon: "💬",
    text: "Respond to client questions, updates, and schedule changes.",
    href: ROUTES.coach.dashboard,
  },
  {
    title: "Earnings",
    icon: "💸",
    text: "Track completed sessions, pending payouts, and weekly totals.",
    href: ROUTES.coach.dashboard,
  },
];

const todaysSchedule = [
  {
    time: "9:00 AM",
    client: "Kristina M.",
    service: "Strength Training",
    status: "Confirmed",
  },
  {
    time: "12:30 PM",
    client: "Open",
    service: "Available Block",
    status: "Available",
  },
  {
    time: "4:30 PM",
    client: "Maya R.",
    service: "Offer Pending",
    status: "Pending",
  },
];

export default function CoachDashboardPage() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#020713] text-white">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_20%_0%,rgba(0,132,255,0.22),transparent_30%),radial-gradient(circle_at_80%_10%,rgba(56,189,248,0.12),transparent_28%),linear-gradient(180deg,#020713_0%,#06111f_48%,#020713_100%)]" />

      <section className="mx-auto max-w-7xl px-5 pb-8 pt-8 sm:px-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-sky-400/30 bg-sky-500/10 px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-white">
              <span className="h-2 w-2 rounded-full bg-sky-400" />
              Coach Dashboard
            </div>

            <h1 className="mt-6 text-4xl font-black uppercase leading-[0.95] tracking-tight text-white sm:text-6xl">
              Accept sessions.
              <br />
              <span className="text-sky-500">Coach smarter.</span>
            </h1>

            <p className="mt-5 max-w-2xl text-base leading-7 text-slate-300">
              View nearby appointment offers, accept sessions, track your day,
              manage clients, and keep every coaching detail organized.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3 rounded-[24px] border border-sky-400/25 bg-white/[0.04] p-4 shadow-2xl shadow-black/25 backdrop-blur">
            <div className="text-center">
              <div className="text-2xl font-black text-white">$255</div>
              <div className="mt-1 text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                Today
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-black text-white">4</div>
              <div className="mt-1 text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                Offers
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-black text-white">92%</div>
              <div className="mt-1 text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                Rating
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-5 pb-12 sm:px-8 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-6">
          <div className="relative min-h-[430px] overflow-hidden rounded-[32px] border border-sky-400/30 bg-slate-950/70 shadow-[0_0_70px_rgba(14,165,233,0.18)] backdrop-blur">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,rgba(14,165,233,0.22),transparent_24%),linear-gradient(135deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[length:100%_100%,38px_38px]" />

            <div className="absolute inset-0 opacity-50">
              <div className="absolute left-[12%] top-[22%] h-[2px] w-[72%] rotate-[18deg] bg-sky-400/30" />
              <div className="absolute left-[18%] top-[66%] h-[2px] w-[62%] -rotate-[14deg] bg-sky-400/20" />
              <div className="absolute left-[34%] top-[10%] h-[80%] w-[2px] rotate-[8deg] bg-sky-400/20" />
              <div className="absolute left-[65%] top-[8%] h-[78%] w-[2px] -rotate-[10deg] bg-sky-400/20" />
            </div>

            <div className="relative z-10 flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-[11px] font-black uppercase tracking-[0.24em] text-sky-400">
                  Appointment Map
                </div>
                <h2 className="mt-2 text-2xl font-black tracking-tight text-white">
                  Nearby Session Offers
                </h2>
              </div>

              <button className="rounded-xl border border-white/15 bg-white/[0.04] px-4 py-3 text-xs font-black uppercase tracking-[0.14em] text-white">
                Filter Offers
              </button>
            </div>

            {appointmentOffers.map((offer) => (
              <div
                key={offer.id}
                className={`absolute ${offer.position} z-20 -translate-x-1/2 -translate-y-1/2`}
              >
                <div className="relative">
                  <div className="absolute left-1/2 top-1/2 h-16 w-16 -translate-x-1/2 -translate-y-1/2 rounded-full bg-sky-400/20 blur-xl" />
                  <div className="relative flex h-12 w-12 items-center justify-center rounded-full border-4 border-[#020713] bg-sky-500 text-lg font-black text-white shadow-[0_0_35px_rgba(14,165,233,0.65)]">
                    ${offer.pay.replace("$", "")}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-[28px] border border-sky-400/25 bg-white/[0.04] p-5 shadow-2xl shadow-black/25 backdrop-blur">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <div className="text-[11px] font-black uppercase tracking-[0.24em] text-sky-400">
                  Offer Feed
                </div>
                <h2 className="mt-2 text-2xl font-black text-white">
                  Available Appointments
                </h2>
              </div>

              <div className="text-xs text-slate-400">
                Accepting an offer adds it to your schedule.
              </div>
            </div>

            <div className="mt-5 grid gap-4">
              {appointmentOffers.map((offer) => (
                <div
                  key={offer.id}
                  className="rounded-[22px] border border-white/10 bg-[#020713]/90 p-4 shadow-2xl shadow-black/30 backdrop-blur"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="text-sm font-black text-white">
                        {offer.client}
                      </div>
                      <div className="mt-1 text-xs text-sky-300">
                        {offer.service}
                      </div>

                      <div className="mt-4 grid gap-2 text-xs text-slate-400 sm:grid-cols-3">
                        <div>🕒 {offer.time}</div>
                        <div>📍 {offer.location}</div>
                        <div>
                          🚗 {offer.distance} · {offer.duration}
                        </div>
                      </div>

                      <p className="mt-4 text-xs leading-5 text-slate-300">
                        {offer.notes}
                      </p>
                    </div>

                    <div className="flex shrink-0 flex-col gap-2 sm:w-36">
                      <div className="rounded-xl bg-sky-500 px-3 py-2 text-center text-sm font-black text-white">
                        {offer.pay}
                      </div>

                      <button className="rounded-xl bg-sky-500 px-3 py-3 text-[10px] font-black uppercase tracking-[0.14em] text-white transition hover:bg-sky-400">
                        Accept
                      </button>

                      <button className="rounded-xl border border-white/15 bg-white/[0.03] px-3 py-3 text-[10px] font-black uppercase tracking-[0.14em] text-white transition hover:border-red-400/50 hover:bg-red-500/10">
                        Decline
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <aside className="space-y-6">
          <div className="rounded-[28px] border border-sky-400/25 bg-white/[0.04] p-6 shadow-2xl shadow-black/25 backdrop-blur">
            <div className="text-[11px] font-black uppercase tracking-[0.24em] text-sky-400">
              Today
            </div>
            <h2 className="mt-2 text-2xl font-black text-white">
              Schedule Snapshot
            </h2>

            <div className="mt-5 space-y-3">
              {todaysSchedule.map((item) => (
                <div
                  key={`${item.time}-${item.client}`}
                  className="rounded-2xl border border-white/10 bg-[#020713]/70 p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-black text-white">
                      {item.time}
                    </div>
                    <div
                      className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] ${
                        item.status === "Confirmed"
                          ? "bg-emerald-500/15 text-emerald-300"
                          : item.status === "Available"
                            ? "bg-sky-500/15 text-sky-300"
                            : "bg-yellow-500/15 text-yellow-300"
                      }`}
                    >
                      {item.status}
                    </div>
                  </div>
                  <div className="mt-2 text-sm text-slate-300">
                    {item.client}
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    {item.service}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[28px] border border-sky-400/25 bg-white/[0.04] p-6 shadow-2xl shadow-black/25 backdrop-blur">
            <div className="text-[11px] font-black uppercase tracking-[0.24em] text-sky-400">
              Coach Quick Tools
            </div>
            <h2 className="mt-2 text-2xl font-black text-white">
              Session Control
            </h2>

            <div className="mt-5 grid gap-3">
              <Link
                href={ROUTES.coach.dashboard}
                className="rounded-xl border border-white/15 bg-white/[0.03] px-4 py-3 text-sm font-black text-white hover:border-sky-400/50 hover:bg-sky-500/10"
              >
                📅 Manage Availability
              </Link>

              <Link
                href={ROUTES.coach.dashboard}
                className="rounded-xl border border-white/15 bg-white/[0.03] px-4 py-3 text-sm font-black text-white hover:border-sky-400/50 hover:bg-sky-500/10"
              >
                📝 Add Session Notes
              </Link>

              <Link
                href={ROUTES.coach.dashboard}
                className="rounded-xl border border-white/15 bg-white/[0.03] px-4 py-3 text-sm font-black text-white hover:border-sky-400/50 hover:bg-sky-500/10"
              >
                💬 Message Clients
              </Link>

              <Link
                href={ROUTES.coach.dashboard}
                className="rounded-xl border border-white/15 bg-white/[0.03] px-4 py-3 text-sm font-black text-white hover:border-sky-400/50 hover:bg-sky-500/10"
              >
                💸 View Earnings
              </Link>
            </div>
          </div>
        </aside>
      </section>

      <section className="mx-auto max-w-7xl px-5 pb-12 sm:px-8">
        <div className="text-center">
          <div className="text-[11px] font-black uppercase tracking-[0.24em] text-sky-400">
            Coach Tools
          </div>
          <h2 className="mt-4 text-3xl font-black uppercase tracking-tight sm:text-4xl">
            Everything a coach needs
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-slate-400">
            Keep sessions, clients, notes, workouts, messaging, and earnings in
            one clean system.
          </p>
        </div>

        <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {coachTools.map((tool) => (
            <Link
              key={tool.title}
              href={tool.href}
              className="group rounded-[24px] border border-sky-400/20 bg-[#020713] p-6 shadow-2xl shadow-black/25 transition duration-300 hover:-translate-y-1 hover:border-sky-400/60 hover:bg-[#041222]"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-sky-400/45 bg-sky-500/10 text-2xl shadow-[0_0_30px_rgba(14,165,233,0.18)]">
                {tool.icon}
              </div>

              <h3 className="mt-5 text-xl font-black uppercase leading-[1] text-white">
                {tool.title}
              </h3>

              <p className="mt-4 min-h-[48px] text-sm leading-6 text-slate-400">
                {tool.text}
              </p>

              <div className="mt-5 text-xl text-sky-400 transition duration-300 group-hover:translate-x-1">
                →
              </div>
            </Link>
          ))}
        </div>
      </section>

      <footer className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 border-t border-white/10 px-5 py-8 text-xs text-slate-500 sm:px-8 md:flex-row">
        <div>© 2026 Sound Fitness Coach Portal.</div>

        <div className="flex items-center gap-4">
          <Link href={ROUTES.auth.login} className="hover:text-sky-300">
            Member Login
          </Link>
          <span>•</span>
          <Link href={ROUTES.admin.login} className="hover:text-sky-300">
            Admin Login
          </Link>
        </div>
      </footer>
    </main>
  );
}
