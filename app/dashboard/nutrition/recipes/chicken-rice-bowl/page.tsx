import Link from "next/link";

export default function ClientSiteMapPage() {
  const sections = [
    {
      title: "Entry + Home",
      pages: [
        {
          name: "Client Dashboard",
          url: "/client/dashboard",
          status: "Built",
          connectsTo: ["Online Training", "Progress", "Calendar", "Messages"],
          purpose:
            "Main landing page after login. Shows next workout, quick stats, session status, and shortcuts.",
        },
        {
          name: "Client Onboarding",
          url: "/client/onboarding",
          status: "Needed",
          connectsTo: ["Assessment", "Goals", "Booking"],
          purpose:
            "First-time user flow. Explains what to do next and collects setup info.",
        },
      ],
    },
    {
      title: "Training Flow",
      pages: [
        {
          name: "Online Training",
          url: "/client/online-training",
          status: "Built",
          connectsTo: ["Training Calendar", "Exercise Library", "Progress"],
          purpose:
            "Training hub. Shows current plan, today’s workout, training tools, and coach notes.",
        },
        {
          name: "Training Calendar",
          url: "/client/training-calendar",
          status: "Built",
          connectsTo: ["Workout Detail", "Booking", "Progress"],
          purpose:
            "Weekly/monthly workout schedule. Shows upcoming workouts, sessions, and reminders.",
        },
        {
          name: "Workout Detail",
          url: "/client/workout-detail",
          status: "Needed",
          connectsTo: ["Exercise Demo", "Progress", "Journal"],
          purpose:
            "Actual workout screen. Shows exercises, sets, reps, rest, notes, and completion button.",
        },
        {
          name: "Exercise Library",
          url: "/client/exercise-library",
          status: "Built",
          connectsTo: ["Exercise Demo"],
          purpose:
            "Searchable movement library with filters by muscle group or training goal.",
        },
        {
          name: "Exercise Demo",
          url: "/client/exercise/[id]",
          status: "Needed",
          connectsTo: ["Workout Detail", "Coach Messaging"],
          purpose:
            "Individual exercise page with video, cues, regressions, progressions, and common mistakes.",
        },
      ],
    },
    {
      title: "Progress + Accountability",
      pages: [
        {
          name: "Progress Tracking",
          url: "/client/progress",
          status: "Built",
          connectsTo: ["Journal", "Pain Tracking", "Goals"],
          purpose:
            "Tracks workouts, streaks, body area progress, wins, and coach notes.",
        },
        {
          name: "Journal",
          url: "/client/journal",
          status: "Built",
          connectsTo: ["Progress", "Coach Messaging"],
          purpose:
            "Client reflection area for workout notes, energy, pain, wins, and mindset.",
        },
        {
          name: "Goals",
          url: "/client/goals",
          status: "Built",
          connectsTo: ["Progress", "Dashboard"],
          purpose:
            "Primary goals, milestones, next actions, and what the client is working toward.",
        },
        {
          name: "Weekly Check-In",
          url: "/dashboard/progress/check-in",
          status: "Needed",
          connectsTo: ["Progress", "Coach Messaging", "Recovery"],
          purpose:
            "Weekly form for energy, soreness, wins, struggles, nutrition, and schedule feedback.",
        },
      ],
    },
    {
      title: "Nutrition",
      pages: [
        {
          name: "Nutrition Portal",
          url: "/client/nutrition-portal",
          status: "Built",
          connectsTo: ["Recipe Library", "Grocery List", "Meal Prep"],
          purpose:
            "Nutrition overview with protein, hydration, meals logged, habits, and coach guidance.",
        },
        {
          name: "Recipe Library",
          url: "/client/recipe-library",
          status: "Built",
          connectsTo: ["Recipe Detail", "Grocery List"],
          purpose:
            "High-protein meals, snacks, fast meals, and prep-friendly recipes.",
        },
        {
          name: "Recipe Detail",
          url: "/client/recipe/[id]",
          status: "Needed",
          connectsTo: ["Grocery List", "Nutrition Portal"],
          purpose:
            "Individual recipe with ingredients, steps, macros, swaps, and prep notes.",
        },
        {
          name: "Grocery List",
          url: "/client/grocery-list",
          status: "Built",
          connectsTo: ["Recipe Library", "Meal Prep"],
          purpose:
            "Checkable grocery list organized by protein, carbs, vegetables, and extras.",
        },
        {
          name: "Meal Prep",
          url: "/client/meal-prep",
          status: "Built",
          connectsTo: ["Recipe Library", "Grocery List"],
          purpose: "Meal prep guide and simple food systems for consistency.",
        },
      ],
    },
    {
      title: "Recovery + Pain",
      pages: [
        {
          name: "Recovery Portal",
          url: "/client/recovery-portal",
          status: "Built",
          connectsTo: [
            "Mobility Library",
            "Pain Tracking",
            "Recovery Recommendations",
          ],
          purpose: "Recovery hub for soreness, sleep, mobility, and readiness.",
        },
        {
          name: "Mobility Library",
          url: "/client/mobility-library",
          status: "Built",
          connectsTo: ["Mobility Drill"],
          purpose:
            "Stretch and mobility drill library for hips, shoulders, spine, ankles, and recovery.",
        },
        {
          name: "Mobility Drill Detail",
          url: "/client/mobility/[id]",
          status: "Needed",
          connectsTo: ["Recovery Portal", "Pain Tracking"],
          purpose:
            "Individual drill page with instructions, dose, purpose, and modifications.",
        },
        {
          name: "Pain Tracking",
          url: "/client/pain-tracking",
          status: "Built",
          connectsTo: ["Recovery Recommendations", "Coach Messaging"],
          purpose:
            "Log pain level, body areas, patterns, and notes before issues become setbacks.",
        },
        {
          name: "Recovery Recommendations",
          url: "/client/recovery-recommendations",
          status: "Built",
          connectsTo: ["Mobility Library", "Pain Tracking"],
          purpose:
            "Suggested recovery actions based on soreness, pain, sleep, hydration, and training load.",
        },
      ],
    },
    {
      title: "Communication + Scheduling",
      pages: [
        {
          name: "Coach Messaging",
          url: "/client/coach-messaging",
          status: "Built",
          connectsTo: ["Exercise Demo", "Pain Tracking", "Journal"],
          purpose:
            "Client-to-coach messaging for form questions, pain updates, wins, and support.",
        },
        {
          name: "Booking",
          url: "/client/booking",
          status: "Built",
          connectsTo: ["Confirmation", "Training Calendar"],
          purpose: "Book or request a session time.",
        },
        {
          name: "Confirmation",
          url: "/client/confirmation",
          status: "Built",
          connectsTo: ["Dashboard", "Assessment"],
          purpose: "Post-booking confirmation and next steps.",
        },
      ],
    },
    {
      title: "Account + Payments",
      pages: [
        {
          name: "Profile",
          url: "/client/profile",
          status: "Built",
          connectsTo: ["Settings", "Progress"],
          purpose:
            "Client bio, goals, plan, session count, and body workload heat map.",
        },
        {
          name: "Sessions",
          url: "/client/sessions",
          status: "Built",
          connectsTo: ["Payments", "Booking"],
          purpose:
            "Shows sessions used, remaining, upcoming, and renewal prompts.",
        },
        {
          name: "Payments",
          url: "/client/payments",
          status: "Built",
          connectsTo: ["Subscription", "Sessions"],
          purpose: "Package selection, add-ons, and checkout summary.",
        },
        {
          name: "Subscription",
          url: "/client/subscription",
          status: "Built",
          connectsTo: ["Payments", "Sessions"],
          purpose: "Manage online, hybrid, and in-home training plans.",
        },
        {
          name: "Settings",
          url: "/client/settings",
          status: "Needed",
          connectsTo: ["Profile"],
          purpose:
            "Account info, notifications, equipment, injuries, preferences, and password.",
        },
      ],
    },
  ];

  const allPages = sections.flatMap((section) => section.pages);
  const built = allPages.filter((page) => page.status === "Built").length;
  const needed = allPages.filter((page) => page.status === "Needed").length;

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.14),_transparent_28%),linear-gradient(180deg,#020617_0%,#0f172a_100%)] px-5 py-8 text-white">
      <section className="mx-auto max-w-7xl space-y-8">
        <div className="rounded-[36px] border border-white/10 bg-white/[0.05] p-6 shadow-2xl backdrop-blur">
          <p className="text-[11px] uppercase tracking-[0.28em] text-sky-300">
            Client App Blueprint
          </p>

          <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">
            Client page connection map.
          </h1>

          <p className="mt-3 max-w-3xl text-slate-300">
            A tree-style view of how the client app should connect, what belongs
            on each page, and which pages still need to be built.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-[28px] border border-white/10 bg-white/[0.05] p-5">
            <p className="text-sm text-slate-400">Total Client Pages</p>
            <p className="mt-2 text-3xl font-bold">{allPages.length}</p>
          </div>

          <div className="rounded-[28px] border border-emerald-400/20 bg-emerald-500/10 p-5">
            <p className="text-sm text-emerald-300">Built</p>
            <p className="mt-2 text-3xl font-bold">{built}</p>
          </div>

          <div className="rounded-[28px] border border-slate-400/20 bg-slate-500/10 p-5">
            <p className="text-sm text-slate-300">Still Needed</p>
            <p className="mt-2 text-3xl font-bold">{needed}</p>
          </div>
        </div>

        <section className="rounded-[36px] border border-sky-400/20 bg-sky-500/10 p-6 shadow-xl">
          <h2 className="text-2xl font-bold">Main client flow</h2>

          <div className="mt-5 overflow-x-auto">
            <div className="min-w-[900px] rounded-[28px] border border-white/10 bg-slate-950/50 p-6">
              <div className="flex items-center justify-between gap-4 text-center text-sm font-semibold">
                {[
                  "Dashboard",
                  "Training",
                  "Progress",
                  "Nutrition",
                  "Recovery",
                  "Messaging",
                  "Payments",
                ].map((item, index) => (
                  <div key={item} className="flex flex-1 items-center gap-4">
                    <div className="w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3">
                      {item}
                    </div>
                    {index < 6 && <span className="text-sky-300">→</span>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {sections.map((section) => (
          <section
            key={section.title}
            className="rounded-[36px] border border-white/10 bg-white/[0.05] p-6 shadow-2xl backdrop-blur"
          >
            <div className="mb-6">
              <p className="text-[11px] uppercase tracking-[0.24em] text-sky-300">
                Client Section
              </p>
              <h2 className="mt-2 text-3xl font-bold">{section.title}</h2>
            </div>

            <div className="relative space-y-4 border-l border-white/10 pl-6">
              {section.pages.map((page) => (
                <div key={page.url} className="relative">
                  <div className="absolute -left-[31px] top-6 h-3 w-3 rounded-full bg-sky-400" />

                  <div
                    className={`rounded-[28px] border p-5 transition ${
                      page.status === "Built"
                        ? "border-white/10 bg-slate-950/60"
                        : "border-slate-500/20 bg-slate-700/20 opacity-60"
                    }`}
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-3">
                          <h3 className="text-xl font-bold">{page.name}</h3>

                          <span
                            className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                              page.status === "Built"
                                ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-300"
                                : "border-slate-400/20 bg-slate-500/10 text-slate-300"
                            }`}
                          >
                            {page.status}
                          </span>
                        </div>

                        <Link
                          href={page.url}
                          className={`mt-2 block text-sm ${
                            page.status === "Built"
                              ? "text-sky-300 hover:text-sky-200"
                              : "text-slate-500"
                          }`}
                        >
                          {page.url}
                        </Link>

                        <p className="mt-4 text-sm leading-6 text-slate-300">
                          {page.purpose}
                        </p>
                      </div>

                      <div className="w-full rounded-[22px] border border-white/10 bg-white/[0.04] p-4 lg:max-w-sm">
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                          Connects To
                        </p>

                        <div className="mt-3 flex flex-wrap gap-2">
                          {page.connectsTo.map((item) => (
                            <span
                              key={item}
                              className="rounded-full border border-sky-400/20 bg-sky-500/10 px-3 py-1 text-xs font-semibold text-sky-300"
                            >
                              {item}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}

        <section className="rounded-[36px] border border-amber-400/20 bg-amber-500/10 p-6 shadow-xl">
          <h2 className="text-2xl font-bold">Pages to build next</h2>

          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {allPages
              .filter((page) => page.status === "Needed")
              .map((page) => (
                <div
                  key={page.url}
                  className="rounded-[24px] border border-white/10 bg-slate-950/50 p-4"
                >
                  <p className="font-bold">{page.name}</p>
                  <p className="mt-1 text-sm text-slate-400">{page.url}</p>
                </div>
              ))}
          </div>
        </section>
      </section>
    </main>
  );
}
