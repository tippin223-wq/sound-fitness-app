import UserMenu from "@/components/UserMenu";
import { ROUTES } from "@/lib/routes";
import Image from "next/image";
import Link from "next/link";

const appFeatures = [
  {
    title: "Training Plan",
    text: "See your workouts, phases, session notes, and next steps without losing the thread between visits.",
  },
  {
    title: "Progress Tracking",
    text: "Keep strength, habits, wins, soreness, mobility, and check-ins organized in one place.",
  },
  {
    title: "Coach Messaging",
    text: "Ask questions, send updates, and keep coaching decisions connected to your real week.",
  },
  {
    title: "Nutrition & Recovery",
    text: "Tie meals, hydration, readiness, and recovery habits into the plan you are actually following.",
  },
];

const trainingServices = [
  {
    title: "In-Home Strength",
    text: "Personal coaching for strength, confidence, and technique in the space you already have.",
  },
  {
    title: "Assisted Stretch",
    text: "Hands-on mobility and recovery sessions built around comfort, range, and better movement.",
  },
  {
    title: "Mobility & Pain-Aware Training",
    text: "Programs that respect limitations while helping you rebuild capacity and consistency.",
  },
  {
    title: "Online & Hybrid Support",
    text: "Use the app to stay coached when travel, schedule, or training location changes.",
  },
];

const assessmentSteps = [
  "Fill out the in-home pre-assessment form.",
  "We review your goals, pain points, equipment, space, and schedule.",
  "You get a better first-session recommendation before we come to you.",
];

const previewRows = [
  ["Today", "Lower body strength + mobility"],
  ["Next", "Coach review after your session"],
  ["Focus", "Low-back friendly progression"],
  ["Check-in", "Sleep, soreness, energy, wins"],
];

export default function HomePage() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#020713] text-white">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_12%_4%,rgba(14,165,233,0.20),transparent_30%),radial-gradient(circle_at_86%_12%,rgba(250,204,21,0.13),transparent_26%),radial-gradient(circle_at_50%_100%,rgba(16,185,129,0.10),transparent_34%),linear-gradient(180deg,#020713_0%,#06111f_48%,#020713_100%)]" />

      <header className="relative z-20 border-b border-white/10 bg-[#020713]/88 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-4 px-5 py-4 sm:px-8 lg:flex-row lg:justify-between">
          <Link
            href={ROUTES.public.home}
            className="flex min-w-0 items-center justify-center gap-3 text-center lg:justify-start"
          >
            <Image
              src="/sound-fitness-logo.png"
              alt="Sound Fitness"
              width={56}
              height={56}
              className="h-12 w-12 shrink-0 object-contain sm:h-14 sm:w-14"
            />

            <div className="min-w-0 leading-[0.9]">
              <div className="bg-gradient-to-r from-white via-slate-200 to-white bg-clip-text text-2xl font-black uppercase tracking-[0.07em] text-transparent sm:text-4xl">
                SOUND
              </div>

              <div className="relative mt-[-2px] text-[10px] font-black uppercase tracking-[0.34em] text-sky-400 sm:text-xs sm:tracking-[0.42em]">
                FITNESS
                <div className="absolute left-1/2 top-full mt-1 h-[2px] w-[85%] -translate-x-1/2 bg-gradient-to-r from-transparent via-sky-400 to-transparent opacity-60" />
              </div>
            </div>
          </Link>

          <nav className="hidden items-center gap-6 text-[11px] font-black uppercase tracking-[0.16em] text-slate-300 lg:flex">
            <a href="#member-app" className="transition hover:text-sky-300">
              Member App
            </a>
            <a href="#in-home-training" className="transition hover:text-sky-300">
              In-Home Training
            </a>
            <a href="#pre-assessment" className="transition hover:text-sky-300">
              Pre-Assessment
            </a>
          </nav>

          <div className="w-full lg:w-auto">
            <UserMenu />
          </div>
        </div>
      </header>

      <section className="relative mx-auto grid max-w-7xl gap-10 px-5 pb-14 pt-8 sm:px-8 lg:grid-cols-[0.98fr_1.02fr] lg:items-center lg:pb-20 lg:pt-12">
        <div className="relative z-10">
          <div className="inline-flex max-w-full items-center gap-2 rounded-full border border-sky-400/30 bg-sky-500/10 px-4 py-2 text-[11px] font-black uppercase tracking-[0.15em] text-white">
            <span className="h-2 w-2 rounded-full bg-sky-400" />
            In-home coaching plus a member app
          </div>

          <h1 className="mt-7 max-w-4xl text-5xl font-black uppercase leading-[0.9] tracking-tight text-white sm:text-6xl lg:text-7xl">
            Sound Fitness{" "}
            <span className="block text-sky-400">meets you at home.</span>
          </h1>

          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
            Premium in-home strength training and assisted stretch for Seattle
            and the Eastside, supported by an app that keeps your workouts,
            progress, recovery, nutrition, and coach communication organized.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href={ROUTES.onboarding.assessment}
              className="rounded-xl bg-sky-500 px-7 py-4 text-center text-sm font-black uppercase tracking-[0.14em] text-white shadow-[0_0_35px_rgba(14,165,233,0.35)] transition hover:-translate-y-0.5 hover:bg-sky-400"
            >
              Start In-Home Pre-Assessment
            </Link>

            <a
              href="#member-app"
              className="rounded-xl border border-white/15 bg-white/[0.04] px-7 py-4 text-center text-sm font-black uppercase tracking-[0.14em] text-white transition hover:-translate-y-0.5 hover:border-amber-300/40 hover:bg-amber-300/10"
            >
              See The App
            </a>
          </div>

          <div className="mt-8 grid max-w-2xl gap-3 sm:grid-cols-3">
            {[
              ["01", "Pre-assess"],
              ["02", "Train at home"],
              ["03", "Track in app"],
            ].map(([number, label]) => (
              <div
                key={label}
                className="rounded-lg border border-white/10 bg-white/[0.035] p-4"
              >
                <div className="text-xs font-black text-sky-300">{number}</div>
                <div className="mt-2 text-sm font-black uppercase tracking-[0.12em] text-white">
                  {label}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
          <article className="overflow-hidden rounded-2xl border border-white/10 bg-slate-950/70 shadow-2xl shadow-black/30">
            <div className="relative h-64 sm:h-80 lg:h-full">
              <div
                aria-hidden="true"
                className="absolute inset-0 bg-cover bg-center opacity-85"
                style={{
                  backgroundImage:
                    "url(https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?q=80&w=1100)",
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#020713] via-[#020713]/15 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-5">
                <div className="text-[11px] font-black uppercase tracking-[0.18em] text-sky-200">
                  In-home training
                </div>
                <h2 className="mt-2 text-2xl font-black uppercase leading-none">
                  We come prepared.
                </h2>
                <p className="mt-3 text-sm leading-6 text-slate-200">
                  Your pre-assessment gives us the starting point before session
                  one.
                </p>
              </div>
            </div>
          </article>

          <article className="rounded-2xl border border-sky-400/30 bg-slate-950/75 p-5 shadow-[0_0_70px_rgba(14,165,233,0.18)] backdrop-blur">
            <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-4">
              <div>
                <div className="text-[11px] font-black uppercase tracking-[0.18em] text-sky-300">
                  Member app
                </div>
                <h2 className="mt-2 text-2xl font-black uppercase leading-none">
                  Your plan stays visible.
                </h2>
              </div>
              <Image
                src="/sound-token.png"
                alt=""
                width={56}
                height={56}
                className="h-14 w-14 object-contain"
              />
            </div>

            <div className="mt-5 space-y-3">
              {previewRows.map(([label, value]) => (
                <div
                  key={label}
                  className="grid grid-cols-[72px_1fr] gap-3 rounded-lg border border-white/10 bg-white/[0.04] px-4 py-3"
                >
                  <div className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
                    {label}
                  </div>
                  <div className="text-sm font-semibold text-slate-100">
                    {value}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-emerald-300/20 bg-emerald-300/10 p-4">
                <div className="text-2xl font-black text-emerald-200">87%</div>
                <div className="mt-1 text-xs uppercase tracking-[0.13em] text-emerald-100/80">
                  Week readiness
                </div>
              </div>
              <div className="rounded-lg border border-amber-300/20 bg-amber-300/10 p-4">
                <div className="text-2xl font-black text-amber-200">4</div>
                <div className="mt-1 text-xs uppercase tracking-[0.13em] text-amber-100/80">
                  Coach notes
                </div>
              </div>
            </div>
          </article>
        </div>
      </section>

      <section
        id="member-app"
        className="relative mx-auto max-w-7xl px-5 pb-14 sm:px-8"
      >
        <div className="grid gap-8 lg:grid-cols-[0.82fr_1.18fr] lg:items-end">
          <div>
            <div className="text-[11px] font-black uppercase tracking-[0.24em] text-sky-400">
              Member App
            </div>
            <h2 className="mt-4 max-w-2xl text-4xl font-black uppercase leading-[0.95] tracking-tight sm:text-5xl">
              The coaching does not disappear between sessions.
            </h2>
            <p className="mt-5 max-w-xl text-base leading-7 text-slate-400">
              The app gives every member a command center for the plan, the
              conversation, and the progress that makes training feel concrete.
            </p>
            <div className="mt-7">
              <Link
                href="/main-dashboard-preview"
                className="inline-flex rounded-xl border border-sky-400/35 bg-sky-500/10 px-6 py-4 text-sm font-black uppercase tracking-[0.14em] text-sky-100 transition hover:border-sky-300/60 hover:bg-sky-500/20"
              >
                Preview Member Dashboard
              </Link>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {appFeatures.map((feature) => (
              <article
                key={feature.title}
                className="rounded-lg border border-white/10 bg-white/[0.04] p-5 shadow-xl shadow-black/20"
              >
                <div className="h-1.5 w-14 rounded-full bg-gradient-to-r from-sky-400 to-amber-300" />
                <h3 className="mt-5 text-lg font-black uppercase tracking-[0.04em] text-white">
                  {feature.title}
                </h3>
                <p className="mt-3 text-sm leading-6 text-slate-400">
                  {feature.text}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section
        id="in-home-training"
        className="border-y border-white/10 bg-white/[0.025] py-14"
      >
        <div className="mx-auto grid max-w-7xl gap-8 px-5 sm:px-8 lg:grid-cols-[1fr_0.9fr] lg:items-center">
          <div className="grid gap-4 sm:grid-cols-2">
            {trainingServices.map((service) => (
              <article
                key={service.title}
                className="rounded-lg border border-white/10 bg-[#020713]/70 p-5"
              >
                <h3 className="text-lg font-black uppercase tracking-[0.04em] text-white">
                  {service.title}
                </h3>
                <p className="mt-3 text-sm leading-6 text-slate-400">
                  {service.text}
                </p>
              </article>
            ))}
          </div>

          <div
            id="pre-assessment"
            className="rounded-2xl border border-sky-400/35 bg-slate-950/75 p-6 shadow-[0_0_70px_rgba(14,165,233,0.18)] lg:p-8"
          >
            <div className="text-[11px] font-black uppercase tracking-[0.24em] text-sky-400">
              Required first step
            </div>
            <h2 className="mt-4 text-3xl font-black uppercase leading-none sm:text-4xl">
              In-home training starts with the pre-assessment.
            </h2>
            <p className="mt-5 text-base leading-7 text-slate-300">
              Before we schedule or design the first session, the form gives us
              the details that matter: goals, pain or injuries, home setup,
              equipment, schedule, and the coaching style that will help you
              stay consistent.
            </p>

            <div className="mt-6 space-y-3">
              {assessmentSteps.map((step, index) => (
                <div
                  key={step}
                  className="grid grid-cols-[40px_1fr] gap-3 rounded-lg border border-white/10 bg-white/[0.04] p-4"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-500 text-sm font-black text-white">
                    {index + 1}
                  </div>
                  <p className="self-center text-sm leading-6 text-slate-200">
                    {step}
                  </p>
                </div>
              ))}
            </div>

            <Link
              href={ROUTES.onboarding.assessment}
              className="mt-7 block rounded-xl bg-sky-500 px-7 py-4 text-center text-sm font-black uppercase tracking-[0.14em] text-white shadow-[0_0_35px_rgba(14,165,233,0.35)] transition hover:bg-sky-400"
            >
              Fill Out Pre-Assessment Form
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-14 sm:px-8">
        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div>
            <div className="text-[11px] font-black uppercase tracking-[0.24em] text-amber-300">
              Built for real life
            </div>
            <h2 className="mt-4 text-4xl font-black uppercase leading-[0.95] tracking-tight sm:text-5xl">
              Fewer barriers. More follow-through.
            </h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {[
              "No commute to the gym.",
              "A plan matched to your body and space.",
              "App support that keeps the work connected.",
            ].map((item) => (
              <div
                key={item}
                className="rounded-lg border border-white/10 bg-white/[0.04] p-5 text-sm font-semibold leading-6 text-slate-200"
              >
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 border-t border-white/10 px-5 py-8 text-xs text-slate-500 sm:px-8 md:flex-row">
        <div>Copyright 2026 Sound Fitness. All rights reserved.</div>

        <div className="flex items-center gap-4">
          <Link href={ROUTES.coach.login} className="hover:text-sky-300">
            Coach Sign In
          </Link>
          <span>/</span>
          <Link href={ROUTES.admin.login} className="hover:text-sky-300">
            Admin Sign In
          </Link>
        </div>
      </footer>
    </main>
  );
}
