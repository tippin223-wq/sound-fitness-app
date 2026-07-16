"use client";

import {
  Activity,
  ArrowRight,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Dumbbell,
  Footprints,
  HandHelping,
  HeartPulse,
  MessageCircle,
  MoveHorizontal,
  Salad,
  X,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import {
  type CSSProperties,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { ROUTES } from "@/lib/routes";

type ServiceTone =
  | "strength"
  | "flexibility"
  | "mobility"
  | "accountability"
  | "balance"
  | "conditioning"
  | "recovery"
  | "lifestyle";

type ServicePillStyle = CSSProperties &
  Record<
    | "--home-service-pill-border"
    | "--home-service-pill-from"
    | "--home-service-pill-glow"
    | "--home-service-pill-shine"
    | "--home-service-pill-text"
    | "--home-service-pill-to",
    string
  >;

type MarketingService = {
  benefit: string;
  bestFor: string;
  details: string[];
  Icon: LucideIcon;
  image: string;
  outcome: string;
  slug: string;
  text: string;
  title: string;
  tone: ServiceTone;
};

const servicePillToneStyles: Record<ServiceTone, ServicePillStyle> = {
  accountability: {
    "--home-service-pill-border": "rgba(96, 165, 250, 0.62)",
    "--home-service-pill-from": "rgba(59, 130, 246, 0.34)",
    "--home-service-pill-glow": "rgba(59, 130, 246, 0.32)",
    "--home-service-pill-shine": "rgba(219, 234, 254, 0.48)",
    "--home-service-pill-text": "#dbeafe",
    "--home-service-pill-to": "rgba(14, 165, 233, 0.18)",
  },
  balance: {
    "--home-service-pill-border": "rgba(110, 231, 183, 0.62)",
    "--home-service-pill-from": "rgba(16, 185, 129, 0.34)",
    "--home-service-pill-glow": "rgba(16, 185, 129, 0.3)",
    "--home-service-pill-shine": "rgba(209, 250, 229, 0.48)",
    "--home-service-pill-text": "#d1fae5",
    "--home-service-pill-to": "rgba(45, 212, 191, 0.18)",
  },
  conditioning: {
    "--home-service-pill-border": "rgba(217, 249, 157, 0.62)",
    "--home-service-pill-from": "rgba(132, 204, 22, 0.34)",
    "--home-service-pill-glow": "rgba(190, 242, 100, 0.28)",
    "--home-service-pill-shine": "rgba(236, 252, 203, 0.5)",
    "--home-service-pill-text": "#ecfccb",
    "--home-service-pill-to": "rgba(250, 204, 21, 0.2)",
  },
  flexibility: {
    "--home-service-pill-border": "rgba(216, 180, 254, 0.62)",
    "--home-service-pill-from": "rgba(168, 85, 247, 0.34)",
    "--home-service-pill-glow": "rgba(192, 132, 252, 0.3)",
    "--home-service-pill-shine": "rgba(243, 232, 255, 0.48)",
    "--home-service-pill-text": "#f3e8ff",
    "--home-service-pill-to": "rgba(236, 72, 153, 0.16)",
  },
  lifestyle: {
    "--home-service-pill-border": "rgba(94, 234, 212, 0.62)",
    "--home-service-pill-from": "rgba(20, 184, 166, 0.34)",
    "--home-service-pill-glow": "rgba(45, 212, 191, 0.3)",
    "--home-service-pill-shine": "rgba(204, 251, 241, 0.48)",
    "--home-service-pill-text": "#ccfbf1",
    "--home-service-pill-to": "rgba(34, 197, 94, 0.17)",
  },
  mobility: {
    "--home-service-pill-border": "rgba(125, 211, 252, 0.64)",
    "--home-service-pill-from": "rgba(14, 165, 233, 0.34)",
    "--home-service-pill-glow": "rgba(56, 189, 248, 0.32)",
    "--home-service-pill-shine": "rgba(224, 242, 254, 0.5)",
    "--home-service-pill-text": "#e0f2fe",
    "--home-service-pill-to": "rgba(34, 211, 238, 0.18)",
  },
  recovery: {
    "--home-service-pill-border": "rgba(251, 113, 133, 0.62)",
    "--home-service-pill-from": "rgba(244, 63, 94, 0.32)",
    "--home-service-pill-glow": "rgba(244, 63, 94, 0.28)",
    "--home-service-pill-shine": "rgba(255, 228, 230, 0.46)",
    "--home-service-pill-text": "#ffe4e6",
    "--home-service-pill-to": "rgba(251, 146, 60, 0.15)",
  },
  strength: {
    "--home-service-pill-border": "rgba(251, 146, 60, 0.66)",
    "--home-service-pill-from": "rgba(249, 115, 22, 0.38)",
    "--home-service-pill-glow": "rgba(249, 115, 22, 0.32)",
    "--home-service-pill-shine": "rgba(255, 237, 213, 0.5)",
    "--home-service-pill-text": "#ffedd5",
    "--home-service-pill-to": "rgba(250, 204, 21, 0.2)",
  },
};

const getServicePillStyle = (tone: ServiceTone): CSSProperties => ({
  ...servicePillToneStyles[tone],
  background:
    "linear-gradient(135deg, rgba(15, 23, 42, 0.68), rgba(15, 23, 42, 0.2)), linear-gradient(90deg, var(--home-service-pill-from), var(--home-service-pill-to))",
  borderColor: "var(--home-service-pill-border)",
  boxShadow:
    "0 0 0 1px rgba(255, 255, 255, 0.05) inset, 0 0 16px var(--home-service-pill-glow), 0 10px 22px rgba(0, 0, 0, 0.22)",
  color: "var(--home-service-pill-text)",
  textShadow: "0 0 10px var(--home-service-pill-glow)",
});

const serviceScrollViewportStyle: CSSProperties = {
  left: "50%",
  marginLeft: "-50vw",
  marginRight: "-50vw",
  overflowX: "auto",
  overflowY: "visible",
  paddingBottom: "0.75rem",
  position: "relative",
  scrollbarWidth: "none",
  width: "100vw",
};

const serviceScrollTrackStyle: CSSProperties = {
  paddingLeft: "max(1.25rem, calc((100vw - 80rem) / 2 + 2rem))",
  paddingRight: "max(1.25rem, calc((100vw - 80rem) / 2 + 2rem))",
};

const services: MarketingService[] = [
  {
    benefit: "Strength",
    bestFor: "Building strength, confidence, technique, and consistency at home.",
    details: [
      "We adapt barbell, dumbbell, kettlebell, bodyweight, and machine-style work to the equipment and space you actually have.",
      "Sessions focus on clean movement, useful progressions, and enough structure that you know what to do between visits.",
      "Your plan can include app-based notes, targets, and progress tracking so the work does not disappear after the session ends.",
    ],
    Icon: Dumbbell,
    image:
      "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?q=80&w=1200",
    outcome: "A practical strength plan that fits your home, body, schedule, and current training level.",
    slug: "in-home-strength",
    text: "Personal coaching for strength, confidence, and technique in the space you already have.",
    title: "In-Home Strength",
    tone: "strength",
  },
  {
    benefit: "Flexibility",
    bestFor: "Improving range, recovery, comfort, and movement quality.",
    details: [
      "Assisted stretch sessions use hands-on support, breathing, positioning, and controlled mobility work.",
      "The goal is better usable range, not forcing positions that your body is not ready to own.",
      "We can connect recovery notes to your training plan so strength work and mobility work support each other.",
    ],
    Icon: HandHelping,
    image:
      "https://images.unsplash.com/photo-1506126613408-eca07ce68773?q=80&w=1200",
    outcome: "More comfortable movement with a recovery plan that matches your training demands.",
    slug: "assisted-stretch",
    text: "Hands-on mobility and recovery sessions built around comfort, range, and better movement.",
    title: "Assisted Stretch",
    tone: "flexibility",
  },
  {
    benefit: "Mobility",
    bestFor: "Training around limitations, stiffness, pain history, or confidence gaps.",
    details: [
      "We start with what you can do today, then choose ranges, loads, and patterns that build capacity without guessing.",
      "Sessions can blend strength, mobility, balance, and tempo work so progress feels controlled instead of random.",
      "The app keeps notes visible, so pain-aware modifications and successful options are easy to repeat.",
    ],
    Icon: MoveHorizontal,
    image:
      "https://images.unsplash.com/photo-1599901860904-17e6ed7083a0?q=80&w=1200",
    outcome: "A calmer way to rebuild capability while respecting what your body is telling you.",
    slug: "mobility-pain-aware",
    text: "Programs that respect limitations while helping you rebuild capacity and consistency.",
    title: "Mobility & Pain-Aware Training",
    tone: "mobility",
  },
  {
    benefit: "Accountability",
    bestFor: "Staying coached between visits, during travel, or through schedule changes.",
    details: [
      "Hybrid support keeps your plan, notes, check-ins, recovery cues, and coach communication in one place.",
      "When your week changes, the app gives us a cleaner way to adjust without losing the thread.",
      "This is useful for clients who want in-person coaching plus enough structure to keep moving between sessions.",
    ],
    Icon: MessageCircle,
    image:
      "https://images.unsplash.com/photo-1532029837206-abbe2b7620e3?q=80&w=1200",
    outcome: "More continuity between sessions, with coaching decisions tied to your real week.",
    slug: "online-hybrid-support",
    text: "Use the app to stay coached when travel, schedule, or training location changes.",
    title: "Online & Hybrid Support",
    tone: "accountability",
  },
  {
    benefit: "Balance",
    bestFor: "Building confidence with stairs, uneven ground, getting up and down, and daily movement.",
    details: [
      "Sessions can blend balance drills, lower-body strength, core control, and controlled changes of direction.",
      "We keep the work practical, progressive, and matched to the spaces you move through every day.",
      "Your plan can include simple at-home practice options so confidence improves between visits.",
    ],
    Icon: Footprints,
    image:
      "https://images.unsplash.com/photo-1550345332-09e3ac987658?q=80&w=1200",
    outcome: "Stronger, steadier movement for the moments where confidence matters most.",
    slug: "balance-stability",
    text: "Build steadier movement, better control, and more confidence in everyday positions.",
    title: "Balance & Stability",
    tone: "balance",
  },
  {
    benefit: "Conditioning",
    bestFor: "Improving energy, work capacity, and consistency without needing a full gym setup.",
    details: [
      "Conditioning can use bodyweight, bands, dumbbells, kettlebells, stairs, carries, or short circuits.",
      "We match intensity to your recovery, schedule, and current baseline so the work stays repeatable.",
      "The app can track session notes, effort, and follow-up targets so conditioning has a clear path.",
    ],
    Icon: Activity,
    image:
      "https://images.unsplash.com/photo-1518611012118-696072aa579a?q=80&w=1200",
    outcome: "A conditioning plan that fits your space and builds momentum without burning you out.",
    slug: "small-space-conditioning",
    text: "Use simple equipment and smart pacing to build stamina in the space you already have.",
    title: "Small-Space Conditioning",
    tone: "conditioning",
  },
  {
    benefit: "Recovery",
    bestFor: "Clients who need training, mobility, sleep, soreness, and readiness to work together.",
    details: [
      "Recovery support can connect mobility, deloads, soreness notes, hydration, and readiness habits.",
      "We adjust training choices around what your body is showing us instead of forcing a static plan.",
      "App notes make it easier to see what helped, what flared up, and what should change next.",
    ],
    Icon: HeartPulse,
    image:
      "https://images.unsplash.com/photo-1518310383802-640c2de311b2?q=80&w=1200",
    outcome: "Better follow-through because training and recovery are managed together.",
    slug: "recovery-readiness",
    text: "Connect training choices with soreness, sleep, readiness, and recovery habits.",
    title: "Recovery & Readiness",
    tone: "recovery",
  },
  {
    benefit: "Lifestyle",
    bestFor: "Building realistic health routines around meals, hydration, movement, and busy weeks.",
    details: [
      "Habit coaching keeps the focus on practical choices you can repeat instead of extreme resets.",
      "We can tie nutrition, hydration, walking, mobility, and training reminders to your weekly rhythm.",
      "The app helps keep small wins visible so consistency has somewhere to land.",
    ],
    Icon: Salad,
    image:
      "https://images.unsplash.com/photo-1490645935967-10de6ba17061?q=80&w=1200",
    outcome: "A simpler routine for supporting training with food, hydration, and daily habits.",
    slug: "nutrition-habit-support",
    text: "Build practical nutrition, hydration, and movement habits around real life.",
    title: "Nutrition & Habit Support",
    tone: "lifestyle",
  },
];

export default function MarketingServiceExplainers() {
  const [activeSlug, setActiveSlug] = useState<string | null>(null);
  const [spotlightSlug, setSpotlightSlug] = useState<string>(services[0].slug);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const scrollViewportRef = useRef<HTMLDivElement | null>(null);
  const cardRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const activeService =
    services.find((service) => service.slug === activeSlug) ?? null;
  const spotlightService =
    services.find((service) => service.slug === spotlightSlug) ?? services[0];

  const centerServiceCard = useCallback(
    (slug: string, behavior: ScrollBehavior = "smooth") => {
      const viewport = scrollViewportRef.current;
      const card = cardRefs.current[slug];
      if (!viewport || !card) return;

      const maxScroll = Math.max(0, viewport.scrollWidth - viewport.clientWidth);
      const cardCenter = card.offsetLeft + card.offsetWidth / 2;
      const targetLeft = Math.min(
        maxScroll,
        Math.max(0, cardCenter - viewport.clientWidth / 2),
      );

      viewport.scrollTo({ left: targetLeft, behavior });
    },
    [],
  );

  const goToServiceIndex = useCallback(
    (nextIndex: number) => {
      const boundedIndex = Math.min(
        services.length - 1,
        Math.max(0, nextIndex),
      );
      const nextSlug = services[boundedIndex].slug;

      setSpotlightSlug(nextSlug);
      centerServiceCard(nextSlug, "auto");
    },
    [centerServiceCard],
  );

  const handlePreviousService = useCallback(() => {
    const currentIndex = services.findIndex(
      (service) => service.slug === spotlightSlug,
    );
    goToServiceIndex((currentIndex < 0 ? 0 : currentIndex) - 1);
  }, [goToServiceIndex, spotlightSlug]);

  const handleNextService = useCallback(() => {
    const currentIndex = services.findIndex(
      (service) => service.slug === spotlightSlug,
    );
    goToServiceIndex((currentIndex < 0 ? 0 : currentIndex) + 1);
  }, [goToServiceIndex, spotlightSlug]);

  useEffect(() => {
    if (!activeService) return;

    const frame = window.requestAnimationFrame(() => {
      panelRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [activeService]);

  useEffect(() => {
    const syncCenteredCard = () => {
      centerServiceCard(spotlightSlug, "auto");
    };

    window.addEventListener("resize", syncCenteredCard);

    return () => {
      window.removeEventListener("resize", syncCenteredCard);
    };
  }, [centerServiceCard, spotlightSlug]);

  const spotlightIndex = Math.max(
    0,
    services.findIndex((service) => service.slug === spotlightService.slug),
  );
  const canGoPreviousService = spotlightIndex > 0;
  const canGoNextService = spotlightIndex < services.length - 1;

  return (
    <div className="min-w-0 w-full overflow-visible">
      <div
        aria-label="Sound Fitness service previews"
        className="home-service-scroll-viewport"
        id="home-service-scroll-viewport"
        ref={scrollViewportRef}
        style={serviceScrollViewportStyle}
      >
        <div
          className="home-service-scroll-track flex w-max snap-x snap-mandatory gap-4"
          style={serviceScrollTrackStyle}
        >
          {services.map((service) => {
            const isActive = service.slug === activeSlug;
            const isSpotlight = service.slug === spotlightSlug;

            return (
              <button
                aria-controls="service-explainer-panel"
                aria-expanded={isActive}
                data-home-service-spotlight={isSpotlight ? "true" : undefined}
                aria-current={isSpotlight ? "true" : undefined}
                className={[
                  "home-service-card group relative min-h-[260px] w-[18.5rem] shrink-0 snap-center overflow-hidden rounded-xl border border-sky-400/15 bg-cover bg-center text-left shadow-[0_18px_50px_rgba(0,0,0,0.22)] transition sm:w-[20rem] lg:w-[21rem]",
                  isActive ? "home-service-card--active" : "",
                  isSpotlight ? "home-service-card--spotlight" : "",
                  !isSpotlight ? "home-service-card--dimmed" : "",
                ].join(" ")}
                key={service.slug}
                onClick={() => {
                  setSpotlightSlug(service.slug);
                  centerServiceCard(service.slug, "auto");
                  setActiveSlug(isActive ? null : service.slug);
                }}
                ref={(node) => {
                  cardRefs.current[service.slug] = node;
                }}
                style={{
                  ...servicePillToneStyles[service.tone],
                  borderColor: isSpotlight
                    ? "var(--home-service-pill-border)"
                    : undefined,
                  backgroundImage: `linear-gradient(180deg,rgba(2,7,19,0.06),rgba(2,7,19,0.22) 34%,rgba(2,7,19,0.92)),url(${service.image})`,
                  boxShadow: isSpotlight
                    ? "0 24px 70px rgba(0, 0, 0, 0.34), 0 0 46px var(--home-service-pill-glow), inset 0 0 0 1px var(--home-service-pill-border)"
                    : undefined,
                  filter: isSpotlight
                    ? "brightness(1.1) saturate(1.16)"
                    : undefined,
                }}
                type="button"
              >
                <div className="home-service-card__aura absolute inset-0" />
                <div className="home-service-card__edge absolute inset-x-0 top-0" />
                <div className="relative flex h-full min-h-[260px] flex-col justify-end p-5">
                  <div
                    className="home-service-pill mb-4 inline-flex w-fit rounded-full px-3 py-1 text-[9px] font-black uppercase tracking-[0.16em]"
                    style={getServicePillStyle(service.tone)}
                  >
                    {service.benefit}
                  </div>
                  <h3 className="max-w-sm text-lg font-black uppercase tracking-[0.04em] text-white">
                    {service.title}
                  </h3>
                  <p className="mt-3 max-w-md text-sm leading-6 text-slate-200">
                    {service.text}
                  </p>
                  <span className="mt-5 inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-sky-100">
                    {isActive ? "Hide details" : "Open explainer"}
                    <ChevronDown
                      aria-hidden="true"
                      className={[
                        "h-3.5 w-3.5 transition",
                        isActive ? "rotate-180" : "",
                      ].join(" ")}
                      strokeWidth={2.6}
                    />
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div
        className="home-service-scroll-meter relative left-1/2 mt-3 w-screen -translate-x-1/2 px-5 sm:px-8"
        style={servicePillToneStyles[spotlightService.tone]}
      >
        <div className="mx-auto flex max-w-7xl items-center gap-3 sm:gap-4">
          <button
            aria-label="Previous service card"
            className="home-service-scroll-arrow inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-sky-200/22 bg-slate-950/78 text-sky-100 shadow-[0_0_20px_rgba(14,165,233,0.14)] transition hover:border-sky-200/60 hover:bg-slate-900 disabled:pointer-events-none disabled:opacity-35"
            disabled={!canGoPreviousService}
            onClick={handlePreviousService}
            type="button"
          >
            <ChevronLeft aria-hidden="true" className="h-5 w-5" strokeWidth={2.8} />
          </button>
          <div
            aria-label="Service card selector"
            className="home-service-orbit relative flex min-w-0 flex-1 items-center justify-center gap-2 overflow-x-auto px-1 py-3"
            role="group"
          >
            {services.map((service, index) => {
              const isCurrentService = service.slug === spotlightSlug;
              const rawOrbitDistance = index - spotlightIndex;
              const orbitDistance = Math.min(3, Math.abs(rawOrbitDistance));
              const orbitSlot = Math.max(-3, Math.min(3, rawOrbitDistance));
              const isOrbitVisible = Math.abs(rawOrbitDistance) <= 3;
              const ServiceIcon = service.Icon;

              return (
                <button
                  aria-current={isCurrentService ? "true" : undefined}
                  aria-label={service.title}
                  className={[
                    "home-service-orbit__node group relative inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border transition",
                    isCurrentService
                      ? "home-service-orbit__node--active"
                      : "home-service-orbit__node--idle",
                  ].join(" ")}
                  data-orbit-distance={orbitDistance}
                  data-orbit-slot={orbitSlot}
                  data-orbit-visible={isOrbitVisible ? "true" : "false"}
                  key={service.slug}
                  onClick={() => {
                    setSpotlightSlug(service.slug);
                    centerServiceCard(service.slug, "auto");
                  }}
                  style={servicePillToneStyles[service.tone]}
                  title={service.title}
                  type="button"
                >
                  <ServiceIcon
                    aria-hidden="true"
                    className="relative z-10 h-5 w-5"
                    strokeWidth={2.6}
                  />
                </button>
              );
            })}
            <span aria-live="polite" className="sr-only">
              {spotlightService.title}
            </span>
          </div>
          <button
            aria-label="Next service card"
            className="home-service-scroll-arrow inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-sky-200/22 bg-slate-950/78 text-sky-100 shadow-[0_0_20px_rgba(14,165,233,0.14)] transition hover:border-sky-200/60 hover:bg-slate-900 disabled:pointer-events-none disabled:opacity-35"
            disabled={!canGoNextService}
            onClick={handleNextService}
            type="button"
          >
            <ChevronRight aria-hidden="true" className="h-5 w-5" strokeWidth={2.8} />
          </button>
        </div>
      </div>

      {activeService && (
        <div
          className="home-service-explainer mt-4 overflow-hidden rounded-2xl border border-sky-300/30 bg-slate-950/88 shadow-[0_28px_90px_rgba(0,0,0,0.32),0_0_62px_rgba(14,165,233,0.16)]"
          id="service-explainer-panel"
          ref={panelRef}
          style={servicePillToneStyles[activeService.tone]}
        >
          <div
            className="relative min-h-[68vh] overflow-hidden bg-cover bg-center"
            style={{
              backgroundImage: `linear-gradient(90deg,rgba(2,7,19,0.96),rgba(2,7,19,0.86) 47%,rgba(2,7,19,0.34)),url(${activeService.image})`,
            }}
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_16%_8%,rgba(14,165,233,0.24),transparent_34%),radial-gradient(circle_at_86%_24%,rgba(250,204,21,0.14),transparent_32%),linear-gradient(180deg,transparent,rgba(2,7,19,0.58))]" />
            <button
              aria-label="Close service explainer"
              className="absolute right-4 top-4 z-20 inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-slate-950/70 text-sky-100 shadow-[0_0_22px_rgba(14,165,233,0.22)] backdrop-blur transition hover:border-sky-200/60 hover:text-white"
              onClick={() => setActiveSlug(null)}
              type="button"
            >
              <X aria-hidden="true" className="h-4 w-4" strokeWidth={2.7} />
            </button>

            <div className="relative z-10 flex min-h-[68vh] max-w-5xl flex-col justify-end p-5 sm:p-8 lg:p-10">
              <div
                className="home-service-pill mb-5 inline-flex w-fit rounded-full px-3 py-1 text-[9px] font-black uppercase tracking-[0.16em]"
                style={getServicePillStyle(activeService.tone)}
              >
                {activeService.benefit}
              </div>
              <h3 className="max-w-3xl text-3xl font-black uppercase leading-none tracking-[0.02em] text-white sm:text-5xl">
                {activeService.title}
              </h3>
              <p className="mt-5 max-w-3xl text-base leading-7 text-slate-100 sm:text-lg sm:leading-8">
                {activeService.outcome}
              </p>

              <div className="mt-7 grid gap-4 lg:grid-cols-[1.08fr_0.92fr]">
                <div className="rounded-xl border border-white/10 bg-black/28 p-4 backdrop-blur">
                  <div className="text-[10px] font-black uppercase tracking-[0.2em] text-sky-300">
                    What this includes
                  </div>
                  <ul className="mt-4 grid gap-3">
                    {activeService.details.map((detail) => (
                      <li
                        className="flex gap-3 text-sm font-semibold leading-6 text-slate-200"
                        key={detail}
                      >
                        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-200 shadow-[0_0_12px_rgba(125,211,252,0.7)]" />
                        <span>{detail}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="flex flex-col justify-between gap-4 rounded-xl border border-cyan-200/15 bg-cyan-300/[0.07] p-4 backdrop-blur">
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-100">
                      Best for
                    </div>
                    <p className="mt-3 text-sm font-bold leading-6 text-sky-50">
                      {activeService.bestFor}
                    </p>
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
                    <Link
                      className="home-hologram-button home-hologram-button--primary justify-center px-5 py-3 text-xs"
                      href={ROUTES.onboarding.assessment}
                    >
                      Start Pre-Assessment
                      <ArrowRight
                        aria-hidden="true"
                        className="h-4 w-4"
                        strokeWidth={2.5}
                      />
                    </Link>
                    <Link
                      className="home-hologram-button home-hologram-button--secondary justify-center px-5 py-3 text-xs"
                      href={`${ROUTES.public.memberDashboardPreview}#top`}
                    >
                      See The App
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
