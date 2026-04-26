import Link from "next/link";

export default function UserHomeDashboardPage() {
  const user = {
    firstName: "Joey",
    nextWorkout: "Lower Body Strength",
    nextWorkoutTime: "Today • 6:30 PM",
    streak: 6,
    weeklyGoal: 4,
    completedThisWeek: 3,
    energy: "High",
  };

  const portalCards = [
    {
      title: "Sessions",
      href: "/dashboard/sessions",
      icon: "📅",
      text: "Bookings, upcoming sessions, and session history.",
      stat: "Tonight",
    },
    {
      title: "Progress",
      href: "/dashboard/progress",
      icon: "📈",
      text: "Goals, check-ins, strength wins, pain tracking, and streaks.",
      stat: "3/4 this week",
    },
    {
      title: "Recovery",
      href: "/dashboard/recovery",
      icon: "🌿",
      text: "Mobility library, soreness notes, and recovery recommendations.",
      stat: "Mobility due",
    },
    {
      title: "Nutrition",
      href: "/dashboard/nutrition",
      icon: "🥗",
      text: "Recipes, grocery lists, meal prep, and habit targets.",
      stat: "Protein focus",
    },
    {
      title: "Payments",
      href: "/dashboard/payments",
      icon: "💳",
      text: "Packages, invoices, renewal options, and purchase history.",
      stat: "Active plan",
    },
    {
      title: "Profile",
      href: "/dashboard/profile",
      icon: "👤",
      text: "Personal details, goals, injuries, preferences, and settings.",
      stat: "Update anytime",
    },
    {
      title: "Coach Messaging",
      href: "/dashboard/coach-messaging",
      icon: "💬",
      text: "Questions, updates, reminders, and coach communication.",
      stat: "1 unread",
    },
    {
      title: "Training Calendar",
      href: "/dashboard/training-calendar",
      icon: "🗓️",
      text: "Weekly schedule, upcoming workouts, and training rhythm.",
      stat: "6-day streak",
    },
    {
      title: "Social",
      href: "/dashboard/social",
      icon: "🔥",
      text: "Wins, milestones, community-style updates, and motivation.",
      stat: "New badge",
    },
  ];

  const quickStats = [
    ["Current Streak", `${user.streak} days`, "Consistency is building."],
    [
      "Workouts This Week",
      `${user.completedThisWeek}/${user.weeklyGoal}`,
      "One more to hit goal.",
    ],
    ["Energy Check", user.energy, "Best time to train: evening."],
    ["Next Session", "Tonight", user.nextWorkoutTime],
  ];

  const todayPlan = [
    ["Warm-Up Flow", "3 movements • 5 min", "Prep"],
    ["Goblet Squat Progression", "Main lift focus", "Strength"],
    ["Post-Workout Reflection", "1 min check-in", "Recovery"],
  ];

  return (
    <main className="min-h-screen bg-[#020713] text-white">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_20%_0%,rgba(14,165,233,0.18),transparent_32%),radial-gradient(circle_at_80%_10%,rgba(56,189,248,0.12),transparent_28%),linear-gradient(180deg,#020713_0%,#06111f_48%,#020713_100%)]" />

      <div className="mx-auto max-w-7xl px-5 py-6 sm:px-8 lg:py-8">
        <header className="mb-8 flex flex-col gap-4 rounded-[30px] border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-black/20 backdrop-blur md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-[11px] font-black uppercase tracking-[0.24em] text-sky-400">
              Sound Fitness Member Portal
            </div>
            <h1 className="mt-3 text-4xl font-black uppercase tracking-tight sm:text-5xl">
              Welcome back,{" "}
              <span className="text-sky-400">{user.firstName}</span>
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
              Your workouts, sessions, recovery, nutrition, payments, messages,
              and progress are all organized here.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href="/dashboard/sessions"
              className="rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-3 text-center text-xs font-black uppercase tracking-[0.16em] text-white transition hover:border-sky-400/50 hover:bg-sky-500/10"
            >
              View Sessions
            </Link>
            <Link
              href="/dashboard/progress"
              className="rounded-2xl bg-sky-500 px-5 py-3 text-center text-xs font-black uppercase tracking-[0.16em] text-white shadow-[0_0_35px_rgba(14,165,233,0.35)] transition hover:bg-sky-400"
            >
              View Progress →
            </Link>
          </div>
        </header>

        <section className="mb-8 grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-[34px] border border-sky-400/30 bg-white/[0.05] p-6 shadow-2xl shadow-black/25 backdrop-blur lg:p-8">
            <div className="text-[11px] font-black uppercase tracking-[0.24em] text-sky-400">
              Up Next
            </div>
            <h2 className="mt-4 text-4xl font-black tracking-tight">
              {user.nextWorkout}
            </h2>
            <p className="mt-2 text-slate-300">{user.nextWorkoutTime}</p>

            <div className="mt-6 rounded-[26px] border border-sky-400/25 bg-sky-500/10 p-5">
              <div className="text-xs font-black uppercase tracking-[0.2em] text-sky-300">
                Today’s Focus
              </div>
              <p className="mt-3 text-sm leading-6 text-white">
                Lower body strength, clean tempo, better control, and a smooth
                post-workout reflection.
              </p>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-3">
              {todayPlan.map(([title, detail, badge]) => (
                <div
                  key={title}
                  className="rounded-[24px] border border-white/10 bg-slate-950/55 p-4"
                >
                  <div className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-slate-300">
                    {badge}
                  </div>
                  <h3 className="mt-4 text-base font-bold">{title}</h3>
                  <p className="mt-2 text-sm text-slate-400">{detail}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
            {quickStats.map(([label, value, sub]) => (
              <div
                key={label}
                className="rounded-[28px] border border-white/10 bg-white/[0.05] p-5 shadow-xl shadow-black/15 backdrop-blur"
              >
                <div className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">
                  {label}
                </div>
                <div className="mt-3 text-3xl font-black tracking-tight">
                  {value}
                </div>
                <div className="mt-2 text-sm text-slate-400">{sub}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-8">
          <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="text-[11px] font-black uppercase tracking-[0.24em] text-sky-400">
                Portal Navigation
              </div>
              <h2 className="mt-2 text-3xl font-black uppercase tracking-tight">
                Everything in your dashboard
              </h2>
            </div>
            <p className="max-w-md text-sm leading-6 text-slate-400">
              Each section has its own page so the member experience feels like
              a real app, not a pile of links.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {portalCards.map((card) => (
              <Link
                key={card.title}
                href={card.href}
                className="group relative overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.045] p-5 shadow-2xl shadow-black/20 backdrop-blur transition duration-300 hover:-translate-y-1 hover:border-sky-400/45 hover:bg-sky-500/10"
              >
                <div className="absolute right-0 top-0 h-28 w-28 rounded-full bg-sky-500/10 blur-2xl transition group-hover:bg-sky-400/20" />

                <div className="relative flex items-start justify-between gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-sky-400/30 bg-sky-500/10 text-2xl shadow-[0_0_25px_rgba(14,165,233,0.18)]">
                    {card.icon}
                  </div>

                  <div className="rounded-full border border-white/10 bg-slate-950/60 px-3 py-1 text-[11px] font-bold text-sky-300">
                    {card.stat}
                  </div>
                </div>

                <h3 className="relative mt-5 text-xl font-black uppercase tracking-tight">
                  {card.title}
                </h3>

                <p className="relative mt-3 min-h-[48px] text-sm leading-6 text-slate-400">
                  {card.text}
                </p>

                <div className="relative mt-5 text-sm font-black uppercase tracking-[0.16em] text-sky-400 transition group-hover:translate-x-1">
                  Open Section →
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className="grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="rounded-[32px] border border-white/10 bg-white/[0.05] p-6 shadow-2xl shadow-black/20 backdrop-blur">
            <div className="text-[11px] font-black uppercase tracking-[0.22em] text-emerald-300">
              Weekly Rhythm
            </div>
            <h2 className="mt-2 text-2xl font-black tracking-tight">
              This week at a glance
            </h2>

            <div className="mt-5 grid grid-cols-7 gap-2">
              {[
                ["Mon", "Done", true],
                ["Tue", "Done", true],
                ["Wed", "Recovery", false],
                ["Thu", "Tonight", true],
                ["Fri", "Plan", false],
                ["Sat", "Optional", false],
                ["Sun", "Mobility", false],
              ].map(([day, label, active]) => (
                <div key={String(day)} className="text-center">
                  <div className="mb-2 text-xs uppercase tracking-[0.18em] text-slate-500">
                    {day}
                  </div>
                  <div
                    className={`rounded-2xl border px-2 py-4 text-xs font-bold ${
                      active
                        ? "border-sky-400/25 bg-sky-500/10 text-sky-300"
                        : "border-white/10 bg-slate-950/55 text-slate-400"
                    }`}
                  >
                    {label}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[32px] border border-white/10 bg-white/[0.05] p-6 shadow-2xl shadow-black/20 backdrop-blur">
            <div className="text-[11px] font-black uppercase tracking-[0.22em] text-violet-300">
              Momentum Feed
            </div>
            <h2 className="mt-2 text-2xl font-black tracking-tight">
              Latest activity
            </h2>

            <div className="mt-5 space-y-3">
              {[
                [
                  "Workout completed",
                  "Upper Body Strength • Yesterday",
                  "100%",
                ],
                ["Progress updated", "Goblet squat improved by 5 lb", "+5 lb"],
                [
                  "Coach note",
                  "Focus on tempo and knee tracking tonight",
                  "New",
                ],
              ].map(([title, text, tag]) => (
                <div
                  key={title}
                  className="flex items-center justify-between gap-4 rounded-[24px] border border-white/10 bg-slate-950/55 p-4"
                >
                  <div>
                    <div className="font-bold text-white">{title}</div>
                    <div className="mt-1 text-sm text-slate-400">{text}</div>
                  </div>
                  <div className="rounded-full border border-sky-400/20 bg-sky-500/10 px-3 py-1 text-xs font-black text-sky-300">
                    {tag}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
