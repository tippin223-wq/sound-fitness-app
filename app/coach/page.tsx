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
];

const todaysSchedule = [
  {
    time: "9:00 AM",
    client: "Kristina M.",
    service: "Strength Training",
    status: "Confirmed",
  },
  {
    time: "4:30 PM",
    client: "Pending",
    service: "Offer Pending",
    status: "Pending",
  },
];

export default function CoachDashboardPage() {
  return (
    <main className="min-h-screen bg-[#020713] text-white">
      {/* BACKGROUND */}
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_20%_0%,rgba(0,132,255,0.22),transparent_30%),linear-gradient(180deg,#020713_0%,#06111f_48%,#020713_100%)]" />

      {/* HERO */}
      <section className="mx-auto max-w-7xl px-5 py-8">
        <h1 className="text-4xl font-black sm:text-6xl">Coach Dashboard</h1>
        <p className="mt-3 text-slate-400">
          Accept sessions. Manage your day. Make money.
        </p>
      </section>

      {/* MAIN GRID */}
      <section className="mx-auto grid max-w-7xl gap-6 px-5 pb-12 lg:grid-cols-[1.2fr_0.8fr]">
        {/* LEFT SIDE */}
        <div className="space-y-6">
          {/* MAP */}
          <div className="relative h-[400px] rounded-3xl border border-sky-400/30 bg-[#020713] overflow-hidden">
            {/* Fake map grid */}
            <div className="absolute inset-0 opacity-20 bg-[linear-gradient(#0ea5e9_1px,transparent_1px),linear-gradient(90deg,#0ea5e9_1px,transparent_1px)] bg-[size:40px_40px]" />

            {/* Pins */}
            {appointmentOffers.map((offer) => (
              <div
                key={offer.id}
                className={`absolute ${offer.position} -translate-x-1/2 -translate-y-1/2`}
              >
                <div className="h-10 w-10 flex items-center justify-center rounded-full bg-sky-500 font-bold">
                  {offer.pay}
                </div>
              </div>
            ))}
          </div>

          {/* OFFER FEED */}
          <div className="rounded-3xl border border-white/10 p-4 bg-[#020713]">
            <h2 className="text-xl font-black mb-4">Available Sessions</h2>

            <div className="space-y-4">
              {appointmentOffers.map((offer) => (
                <div
                  key={offer.id}
                  className="rounded-xl border border-white/10 p-4"
                >
                  <div className="flex justify-between">
                    <div>
                      <div className="font-bold">{offer.client}</div>
                      <div className="text-sky-400 text-xs">
                        {offer.service}
                      </div>
                    </div>
                    <div className="font-bold">{offer.pay}</div>
                  </div>

                  <div className="mt-3 text-xs text-slate-400">
                    {offer.time} · {offer.location}
                  </div>

                  <div className="mt-3 flex gap-2">
                    <button className="flex-1 bg-sky-500 py-2 rounded-lg text-xs font-bold">
                      Accept
                    </button>
                    <button className="flex-1 border border-white/20 py-2 rounded-lg text-xs font-bold">
                      Decline
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT SIDE */}
        <div className="space-y-6">
          {/* SCHEDULE */}
          <div className="rounded-3xl border border-white/10 p-4">
            <h2 className="text-xl font-black mb-4">Today</h2>

            {todaysSchedule.map((item) => (
              <div key={item.time} className="mb-3">
                <div className="font-bold">{item.time}</div>
                <div className="text-sm text-slate-400">{item.client}</div>
              </div>
            ))}
          </div>

          {/* QUICK TOOLS */}
          <div className="rounded-3xl border border-white/10 p-4">
            <h2 className="text-xl font-black mb-4">Tools</h2>

            <div className="space-y-2">
              <Link href={ROUTES.coach.dashboard} className="block">
                📅 Schedule
              </Link>
              <Link href={ROUTES.coach.dashboard} className="block">
                💬 Messages
              </Link>
              <Link href={ROUTES.coach.dashboard} className="block">
                💸 Earnings
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
