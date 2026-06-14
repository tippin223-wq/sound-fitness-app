import UserMenu from "@/components/UserMenu";
import { ROUTES } from "@/lib/routes";
import {
  ArrowRight,
  BarChart3,
  Check,
  ClipboardCheck,
  ClipboardList,
  Dumbbell,
  HeartPulse,
  Home,
  MapPinHouse,
  MessageCircle,
  MessagesSquare,
  SearchCheck,
  Smartphone,
  UsersRound,
  type LucideIcon,
  X,
  Zap,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";

type AppFeature = {
  title: string;
  text: string;
  Icon: LucideIcon;
};

type AssessmentStep = {
  label: string;
  text: string;
  Icon: LucideIcon;
  image: string;
  imagePosition: string;
};

type HeroJourneyStep = {
  number: string;
  title: string;
  text: string;
  Icon: LucideIcon;
};

type AppSignupOption = {
  id: string;
  title: string;
  price: string;
  cadence: string;
  note: string;
  text: string;
  bestFor: string;
  asset: string;
  assetAlt: string;
  Icon: LucideIcon;
  benefits: {
    label: string;
    included: boolean;
  }[];
  featured?: boolean;
  expanded?: boolean;
};

const appFeatures: AppFeature[] = [
  {
    title: "Training Plan",
    text: "See your workouts, phases, session notes, and next steps without losing the thread between visits.",
    Icon: ClipboardList,
  },
  {
    title: "Progress Tracking",
    text: "Keep strength, habits, wins, soreness, mobility, and check-ins organized in one place.",
    Icon: BarChart3,
  },
  {
    title: "Coach Messaging",
    text: "Ask questions, send updates, and keep coaching decisions connected to your real week.",
    Icon: MessageCircle,
  },
  {
    title: "Nutrition & Recovery",
    text: "Tie meals, hydration, readiness, and recovery habits into the plan you are actually following.",
    Icon: HeartPulse,
  },
];

const appSignupOptions: AppSignupOption[] = [
  {
    id: "app-only",
    title: "App Only",
    price: "$29",
    cadence: "/mo",
    note: "Self-guided app membership",
    text: "Dashboard access, tracking tools, plan visibility, and self-guided support.",
    bestFor: "Best for independent training",
    asset: "/sound-fitness-logo.png",
    assetAlt: "Sound Fitness logo",
    Icon: Smartphone,
    benefits: [
      { label: "Dashboard + tracking tools", included: true },
      { label: "Plan visibility and self-guided support", included: true },
      { label: "Rewards bundle", included: false },
      { label: "Remote coach programming", included: false },
    ],
  },
  {
    id: "hybrid-app",
    title: "Hybrid App",
    price: "$79",
    cadence: "/mo",
    note: "App plus rewards bundle",
    text: "App access with blue Sound Points, Gems for technique support, and Treasure Tokens for in-app purchases.",
    bestFor: "Rewards + technique support",
    asset: "/sound-coins/sound-coin-gold.png",
    assetAlt: "Treasure Token",
    Icon: Zap,
    benefits: [
      { label: "Everything in App Only", included: true },
      { label: "Blue Sound Points rewards", included: true },
      { label: "Gems for technique support", included: true },
      { label: "Ongoing online coaching", included: false },
    ],
    featured: true,
  },
  {
    id: "online-coaching",
    title: "Online Coaching",
    price: "$199",
    cadence: "/mo",
    note: "Remote coaching membership",
    text: "Remote coaching, programming, check-ins, messaging, and a larger Sound Points, Gems, and Treasure Tokens bundle in the app.",
    bestFor: "Coach-led + more rewards",
    asset: "/sound-emerald-crystals.png",
    assetAlt: "Sound Fitness gems",
    Icon: UsersRound,
    benefits: [
      { label: "Coach-led programming", included: true },
      { label: "Check-ins and app messaging", included: true },
      { label: "Dashboard + progress tracking", included: true },
      { label: "Larger Sound Points, Gems + Treasure Tokens bundle", included: true },
    ],
    expanded: true,
  },
];

const trainingServices = [
  {
    title: "In-Home Strength",
    text: "Personal coaching for strength, confidence, and technique in the space you already have.",
    image:
      "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?q=80&w=900",
  },
  {
    title: "Assisted Stretch",
    text: "Hands-on mobility and recovery sessions built around comfort, range, and better movement.",
    image:
      "https://images.unsplash.com/photo-1506126613408-eca07ce68773?q=80&w=900",
  },
  {
    title: "Mobility & Pain-Aware Training",
    text: "Programs that respect limitations while helping you rebuild capacity and consistency.",
    image:
      "https://images.unsplash.com/photo-1599901860904-17e6ed7083a0?q=80&w=900",
  },
  {
    title: "Online & Hybrid Support",
    text: "Use the app to stay coached when travel, schedule, or training location changes.",
    image:
      "https://images.unsplash.com/photo-1532029837206-abbe2b7620e3?q=80&w=900",
  },
];

const assessmentSteps: AssessmentStep[] = [
  {
    label: "Form",
    text: "Fill out the in-home pre-assessment form.",
    Icon: ClipboardList,
    image:
      "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?q=80&w=800",
    imagePosition: "center",
  },
  {
    label: "Review",
    text: "We review your goals, pain points, equipment, space, and schedule.",
    Icon: SearchCheck,
    image:
      "https://images.unsplash.com/photo-1506784983877-45594efa4cbe?q=80&w=800",
    imagePosition: "center",
  },
  {
    label: "Visit Plan",
    text: "You get a better first-session recommendation before we come to you.",
    Icon: MapPinHouse,
    image:
      "https://images.unsplash.com/photo-1518611012118-696072aa579a?q=80&w=800",
    imagePosition: "center 35%",
  },
];

const heroJourneySteps: HeroJourneyStep[] = [
  {
    number: "01",
    title: "Pre-assess",
    text: "Share goals, space, schedule, and movement needs.",
    Icon: ClipboardCheck,
  },
  {
    number: "02",
    title: "Train at home",
    text: "Get strength and stretch work in your own space.",
    Icon: Dumbbell,
  },
  {
    number: "03",
    title: "Track in app",
    text: "Keep the plan, notes, progress, and support visible.",
    Icon: Smartphone,
  },
];

const realLifeBenefits: AppFeature[] = [
  {
    title: "No Commute",
    text: "Training happens where your week already lives.",
    Icon: Home,
  },
  {
    title: "Matched Plan",
    text: "Your goals, equipment, schedule, and body context shape the work.",
    Icon: ClipboardCheck,
  },
  {
    title: "Connected Support",
    text: "App notes and coach messaging keep follow-through visible.",
    Icon: MessagesSquare,
  },
];

const heroBackgroundImage =
  "https://images.unsplash.com/photo-1594381898411-846e7d193883?q=80&w=1600";

export default function HomePage() {
  return (
    <main className="min-h-screen overflow-x-clip bg-[#020713] text-white">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_12%_4%,rgba(14,165,233,0.20),transparent_30%),radial-gradient(circle_at_86%_12%,rgba(250,204,21,0.13),transparent_26%),radial-gradient(circle_at_50%_100%,rgba(16,185,129,0.10),transparent_34%),linear-gradient(180deg,#020713_0%,#06111f_48%,#020713_100%)]" />

      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#020713]/78 shadow-[0_18px_50px_rgba(0,0,0,0.28)] backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-5 py-3 sm:px-8 md:flex-row md:items-center md:justify-between">
          <Link
            href={ROUTES.public.home}
            className="group flex min-w-0 items-center justify-center gap-3 text-center md:justify-start md:text-left"
          >
            <Image
              src="/sound-fitness-logo.png"
              alt="Sound Fitness"
              width={56}
              height={56}
              className="h-16 w-16 shrink-0 object-contain transition duration-300 group-hover:scale-105 sm:h-20 sm:w-20"
            />

            <div className="min-w-0">
              <div className="bg-gradient-to-r from-white via-slate-200 to-sky-100 bg-clip-text text-2xl font-black uppercase leading-none tracking-[0.13em] text-transparent sm:text-3xl">
                Sound Fitness
              </div>
              <div className="mt-1.5 h-px w-full bg-gradient-to-r from-sky-400 via-amber-200 to-transparent opacity-70" />
              <div className="mt-1 text-[9px] font-black uppercase leading-none tracking-[0.2em] text-sky-300 sm:text-[10px]">
                In-home training & assisted stretch
              </div>
              <div className="mt-2 inline-flex rounded-full border border-sky-400/25 bg-sky-500/10 px-3 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-sky-100">
                In-home training + app
              </div>
            </div>
          </Link>

          <div className="w-full md:w-auto">
            <UserMenu />
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden border-b border-white/10">
        <div className="pointer-events-none absolute inset-0">
          <div
            className="absolute inset-y-0 right-0 w-full bg-cover bg-center opacity-42 sm:w-[72%] lg:w-[62%]"
            style={{
              backgroundImage: `url(${heroBackgroundImage})`,
            }}
          />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,#020713_0%,rgba(2,7,19,0.98)_32%,rgba(2,7,19,0.76)_62%,rgba(2,7,19,0.94)_100%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,rgba(14,165,233,0.18),transparent_34%),radial-gradient(circle_at_70%_12%,rgba(250,204,21,0.10),transparent_24%)]" />
          <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-[#020713] to-transparent" />
        </div>

        <div className="relative mx-auto max-w-7xl px-5 pb-14 pt-8 sm:px-8 lg:pb-20 lg:pt-12">
          <div className="relative z-10 max-w-4xl">
          <div className="inline-flex max-w-full items-center gap-2 rounded-full border border-sky-400/30 bg-sky-500/10 px-4 py-2 text-[11px] font-black uppercase tracking-[0.15em] text-white">
            <span className="h-2 w-2 rounded-full bg-sky-400" />
            Seattle + Eastside home sessions
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

            <Link
              href={`${ROUTES.public.memberDashboardPreview}#member-app-preview`}
              className="rounded-xl border border-white/15 bg-white/[0.04] px-7 py-4 text-center text-sm font-black uppercase tracking-[0.14em] text-white transition hover:-translate-y-0.5 hover:border-amber-300/40 hover:bg-amber-300/10"
            >
              See The App
            </Link>
          </div>

          <div className="relative mt-9 grid max-w-3xl gap-3 sm:grid-cols-3">
            {heroJourneySteps.map((step) => {
              const Icon = step.Icon;

              return (
                <div
                  key={step.title}
                  className="group relative min-h-[190px] overflow-hidden rounded-xl border border-sky-400/18 bg-[linear-gradient(135deg,rgba(8,22,39,0.92),rgba(3,9,22,0.94))] p-4 shadow-[0_18px_50px_rgba(0,0,0,0.22)] transition hover:-translate-y-0.5 hover:border-sky-300/45 hover:bg-[linear-gradient(135deg,rgba(10,35,58,0.94),rgba(4,13,30,0.96))]"
                >
                  <Icon
                    aria-hidden="true"
                    className="pointer-events-none absolute -right-4 -top-4 h-28 w-28 text-sky-200/10 transition duration-300 group-hover:scale-105 group-hover:text-cyan-200/15"
                    strokeWidth={1.25}
                  />
                  <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-sky-400 via-amber-200 to-transparent opacity-70" />
                  <div className="pointer-events-none absolute bottom-0 left-0 h-px w-full bg-gradient-to-r from-transparent via-sky-300/20 to-transparent" />
                  <div className="relative">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full border border-sky-300/35 bg-slate-950/55 text-sm font-black text-sky-100 shadow-[0_0_26px_rgba(14,165,233,0.22)] backdrop-blur">
                      {step.number}
                    </div>
                  </div>
                  <div className="relative mt-12">
                    <div className="text-sm font-black uppercase tracking-[0.12em] text-white">
                      {step.title}
                    </div>
                    <p className="mt-3 text-sm leading-6 text-slate-300">
                      {step.text}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
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
                className="group relative min-h-[260px] overflow-hidden rounded-xl border border-sky-400/15 bg-cover bg-center shadow-[0_18px_50px_rgba(0,0,0,0.22)] transition hover:-translate-y-0.5 hover:border-sky-300/45"
                style={{
                  backgroundImage: `linear-gradient(180deg,rgba(2,7,19,0.06),rgba(2,7,19,0.22) 34%,rgba(2,7,19,0.92)),url(${service.image})`,
                }}
              >
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_16%_8%,rgba(14,165,233,0.18),transparent_34%)] opacity-90 transition group-hover:opacity-100" />
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-sky-400 via-amber-200 to-transparent opacity-80" />
                <div className="relative flex h-full min-h-[260px] flex-col justify-end p-5">
                  <div className="mb-4 inline-flex w-fit rounded-full border border-white/15 bg-black/35 px-3 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-white backdrop-blur">
                    Sound Fitness
                  </div>
                  <h3 className="max-w-sm text-lg font-black uppercase tracking-[0.04em] text-white">
                    {service.title}
                  </h3>
                  <p className="mt-3 max-w-md text-sm leading-6 text-slate-200">
                    {service.text}
                  </p>
                </div>
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

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {assessmentSteps.map((step, index) => {
                const Icon = step.Icon;

                return (
                  <div
                    key={step.label}
                    className="group overflow-hidden rounded-xl border border-white/10 bg-white/[0.04] shadow-[0_18px_45px_rgba(0,0,0,0.18)] transition hover:-translate-y-0.5 hover:border-sky-300/35 hover:bg-sky-500/10"
                  >
                    <div
                      className="relative h-24 bg-cover sm:h-28"
                      style={{
                        backgroundImage: `linear-gradient(180deg,rgba(2,7,19,0.1),rgba(2,7,19,0.78)),url(${step.image})`,
                        backgroundPosition: step.imagePosition,
                      }}
                    >
                      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-sky-200/70 to-transparent" />
                      <div className="absolute bottom-3 left-3 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-sky-200/40 bg-slate-950/55 text-sky-100 shadow-[0_0_24px_rgba(14,165,233,0.22)] backdrop-blur">
                        <Icon
                          aria-hidden="true"
                          className="h-5 w-5"
                          strokeWidth={2.5}
                        />
                      </div>
                    </div>

                    <div className="p-3">
                      <div className="mb-3 flex items-center gap-2">
                        <div className="min-w-0">
                          <div className="text-[10px] font-black uppercase leading-none tracking-[0.16em] text-sky-300">
                            0{index + 1}
                          </div>
                          <div className="mt-1 text-[10px] font-black uppercase leading-none tracking-[0.12em] text-white">
                            {step.label}
                          </div>
                        </div>
                        <div className="h-px min-w-5 flex-1 bg-gradient-to-r from-sky-300/50 to-transparent" />
                      </div>
                      <p className="text-xs font-semibold leading-5 text-slate-200">
                        {step.text}
                      </p>
                    </div>
                  </div>
                );
              })}
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

      <section
        id="member-app"
        className="relative border-y border-sky-400/10 bg-[linear-gradient(180deg,rgba(4,16,31,0.82),rgba(2,7,19,0.98))] py-14"
      >
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="grid gap-8 lg:grid-cols-[0.82fr_1.18fr] lg:items-end">
            <div>
              <div className="text-[11px] font-black uppercase tracking-[0.24em] text-sky-400">
                Member App
              </div>
              <h2 className="mt-4 max-w-2xl text-4xl font-black uppercase leading-[0.95] tracking-tight sm:text-5xl">
                Preview the app, then choose your access.
              </h2>
              <p className="mt-5 max-w-xl text-base leading-7 text-slate-400">
                See the plan, messages, progress, and movement library before
                choosing App Only, Hybrid App, or Online Coaching.
              </p>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <Link
                  href={ROUTES.public.memberDashboardPreview}
                  className="inline-flex justify-center rounded-xl border border-sky-400/35 bg-sky-500/10 px-6 py-4 text-sm font-black uppercase tracking-[0.14em] text-sky-100 transition hover:border-sky-300/60 hover:bg-sky-500/20"
                >
                  Preview Member Dashboard
                </Link>
                <Link
                  href="#member-app-pricing"
                  className="inline-flex justify-center rounded-xl bg-sky-500 px-6 py-4 text-sm font-black uppercase tracking-[0.14em] text-white transition hover:bg-sky-400"
                >
                  Choose App Access
                </Link>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {appFeatures.map((feature) => {
                const Icon = feature.Icon;

                return (
                  <article
                    key={feature.title}
                    className="rounded-xl border border-sky-400/15 bg-slate-950/55 p-5 shadow-xl shadow-black/20 transition hover:-translate-y-0.5 hover:border-sky-300/45 hover:bg-sky-500/10"
                  >
                    <div className="flex flex-col items-start gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-sky-300/35 bg-sky-400/12 text-sky-100 shadow-[0_0_28px_rgba(14,165,233,0.22)]">
                        <Icon
                          aria-hidden="true"
                          className="h-6 w-6"
                          strokeWidth={2.4}
                        />
                      </div>
                      <div className="h-1.5 w-20 rounded-full bg-gradient-to-r from-sky-100 via-cyan-300 to-sky-500 shadow-[0_0_18px_rgba(125,211,252,0.34)]" />
                    </div>
                    <h3 className="mt-5 text-lg font-black uppercase tracking-[0.04em] text-white">
                      {feature.title}
                    </h3>
                    <p className="mt-3 text-sm leading-6 text-slate-400">
                      {feature.text}
                    </p>
                  </article>
                );
              })}
            </div>
          </div>

          <div
            id="member-app-pricing"
            className="mt-10 scroll-mt-24"
          >
            <div className="text-[11px] font-black uppercase tracking-[0.22em] text-sky-200">
              Sign up for app access
            </div>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">
              Choose App Only, Hybrid App, or Online Coaching, then create your
              account after checkout.
            </p>
            <div className="mx-auto mt-5 grid w-full max-w-md gap-4 sm:max-w-none sm:grid-cols-2 lg:grid-cols-3">
              {appSignupOptions.map((option) => {
                const Icon = option.Icon;
                const isExpanded = option.expanded;

                return (
                  <Link
                    key={option.id}
                    href={`${ROUTES.onboarding.subscription}?plan=${option.id}`}
                    className={[
                      "group relative w-full overflow-hidden rounded-2xl border p-5 shadow-[0_24px_70px_rgba(0,0,0,0.26)] transition hover:-translate-y-1",
                      option.featured
                        ? "border-amber-200/45 bg-[linear-gradient(180deg,rgba(20,43,67,0.94),rgba(6,20,36,0.88))] hover:border-amber-100/70"
                        : "border-sky-400/18 bg-slate-950/70 hover:border-sky-300/45 hover:bg-sky-500/12",
                      isExpanded
                        ? "sm:col-span-2 lg:col-span-1"
                        : "",
                    ].join(" ")}
                  >
                    <Image
                      src={option.asset}
                      alt=""
                      width={150}
                      height={150}
                      className={[
                        "pointer-events-none absolute object-contain opacity-[0.09] transition group-hover:scale-110 group-hover:opacity-[0.14]",
                        isExpanded
                          ? "-right-8 top-4 h-36 w-36 sm:right-6 sm:top-1/2 sm:h-48 sm:w-48 sm:-translate-y-1/2 lg:-right-10 lg:-top-10 lg:h-36 lg:w-36 lg:translate-y-0"
                          : "-right-10 -top-10 h-36 w-36",
                      ].join(" ")}
                      style={
                        option.featured
                          ? {
                              mixBlendMode: "screen",
                              WebkitMaskImage:
                                "radial-gradient(circle at center, black 0%, black 58%, transparent 74%)",
                              maskImage:
                                "radial-gradient(circle at center, black 0%, black 58%, transparent 74%)",
                            }
                          : undefined
                      }
                    />
                    {option.featured && (
                      <div className="absolute right-4 top-4 rounded-full border border-amber-200/45 bg-amber-200/12 px-3 py-1 text-[9px] font-black uppercase tracking-[0.14em] text-amber-100">
                        Most flexible
                      </div>
                    )}
                    {isExpanded && (
                      <div className="absolute right-4 top-4 rounded-full border border-cyan-200/35 bg-cyan-300/10 px-3 py-1 text-[9px] font-black uppercase tracking-[0.14em] text-cyan-100">
                        Coach led
                      </div>
                    )}
                    <div
                      className={[
                        "relative flex h-full gap-6",
                        isExpanded
                          ? "min-h-[330px] flex-col sm:grid sm:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] sm:items-stretch lg:flex lg:min-h-[320px] lg:flex-col"
                          : "min-h-[320px] flex-col justify-between",
                      ].join(" ")}
                    >
                      <div>
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-sky-300/35 bg-sky-400/12 text-sky-100 shadow-[0_0_28px_rgba(14,165,233,0.22)] transition group-hover:border-cyan-200/60 group-hover:text-white">
                          <Icon
                            aria-hidden="true"
                            className="h-7 w-7"
                            strokeWidth={2.4}
                          />
                        </div>
                        <div className="mt-4 h-1.5 w-20 rounded-full bg-gradient-to-r from-amber-200 via-cyan-300 to-sky-500 shadow-[0_0_18px_rgba(125,211,252,0.34)]" />
                        <div className="mt-5 text-sm font-black uppercase tracking-[0.12em] text-white">
                          {option.title}
                        </div>
                        <div className="mt-4 flex flex-wrap items-end gap-x-2 gap-y-1">
                          <span className="text-5xl font-black leading-none text-sky-100">
                            {option.price}
                          </span>
                          <span className="pb-1 text-xs font-black uppercase tracking-[0.12em] text-slate-400">
                            {option.cadence}
                          </span>
                        </div>
                        <div className="mt-3 text-[10px] font-black uppercase tracking-[0.14em] text-amber-200">
                          {option.note}
                        </div>
                        <p
                          className={[
                            "text-sm leading-6",
                            isExpanded
                              ? "mt-4 rounded-xl border border-cyan-200/15 bg-cyan-300/[0.07] p-3 font-semibold text-sky-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
                              : "mt-3 text-slate-300",
                          ].join(" ")}
                        >
                          {option.text}
                        </p>
                        <div className="mt-4 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-black uppercase tracking-[0.12em] text-sky-100">
                          {option.bestFor}
                        </div>
                      </div>

                      <div
                        className={[
                          "flex flex-col justify-between gap-5",
                          isExpanded
                            ? "rounded-xl border border-sky-300/15 bg-black/[0.14] p-4 lg:border-0 lg:bg-transparent lg:p-0"
                            : "",
                        ].join(" ")}
                      >
                        {isExpanded && (
                          <ul
                            aria-label={`${option.title} benefits`}
                            className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-1"
                          >
                            {option.benefits.map((benefit) => {
                              const BenefitIcon = benefit.included ? Check : X;

                              return (
                                <li
                                  key={benefit.label}
                                  className={[
                                    "flex items-start gap-2.5 text-xs font-bold leading-5",
                                    benefit.included
                                      ? "text-slate-100"
                                      : "text-slate-500",
                                  ].join(" ")}
                                >
                                  <span
                                    className={[
                                      "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border",
                                      benefit.included
                                        ? "border-cyan-200/35 bg-cyan-300/10 text-cyan-100"
                                        : "border-rose-200/20 bg-rose-300/5 text-rose-200/70",
                                    ].join(" ")}
                                  >
                                    <BenefitIcon
                                      aria-hidden="true"
                                      className="h-3.5 w-3.5"
                                      strokeWidth={3}
                                    />
                                  </span>
                                  <span>{benefit.label}</span>
                                </li>
                              );
                            })}
                          </ul>
                        )}

                        <span className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-cyan-400 px-4 py-3 text-center text-xs font-black uppercase tracking-[0.12em] text-white shadow-[0_0_28px_rgba(14,165,233,0.26)]">
                          Sign Up
                          <ArrowRight
                            aria-hidden="true"
                            className="h-4 w-4"
                            strokeWidth={2.5}
                          />
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-sky-400/10 bg-[linear-gradient(180deg,rgba(2,7,19,0.98),rgba(6,17,31,0.9),rgba(2,7,19,0.98))] py-14">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="grid gap-8 lg:grid-cols-[0.78fr_1.22fr] lg:items-end">
            <div>
              <div className="text-[11px] font-black uppercase tracking-[0.24em] text-sky-300">
                Built for real life
              </div>
              <h2 className="mt-4 max-w-2xl text-4xl font-black uppercase leading-[0.95] tracking-tight sm:text-5xl">
                Fewer barriers. More follow-through.
              </h2>
              <p className="mt-5 max-w-xl text-base leading-7 text-slate-400">
                In-home sessions remove friction, while the app keeps the work
                connected after the visit ends.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              {realLifeBenefits.map((benefit) => {
                const Icon = benefit.Icon;

                return (
                  <article
                    key={benefit.title}
                    className="rounded-xl border border-sky-400/15 bg-slate-950/58 p-5 shadow-xl shadow-black/20 transition hover:-translate-y-0.5 hover:border-sky-300/45 hover:bg-sky-500/10"
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-sky-300/35 bg-sky-400/12 text-sky-100 shadow-[0_0_28px_rgba(14,165,233,0.22)]">
                      <Icon
                        aria-hidden="true"
                        className="h-6 w-6"
                        strokeWidth={2.4}
                      />
                    </div>
                    <div className="mt-3 h-1.5 w-20 rounded-full bg-gradient-to-r from-sky-100 via-cyan-300 to-sky-500 shadow-[0_0_18px_rgba(125,211,252,0.34)]" />
                    <h3 className="mt-5 text-sm font-black uppercase tracking-[0.12em] text-white">
                      {benefit.title}
                    </h3>
                    <p className="mt-3 text-sm leading-6 text-slate-400">
                      {benefit.text}
                    </p>
                  </article>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <footer className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 border-t border-white/10 px-5 py-8 text-xs text-slate-500 sm:px-8 md:flex-row">
        <div>Copyright 2026 Sound Fitness LLC. All rights reserved.</div>

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
