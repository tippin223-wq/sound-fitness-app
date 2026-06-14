import Image from "next/image";
import Link from "next/link";
import { DashboardEmerald3D } from "@/components/dashboard/DashboardTornadoEmeralds3D";
import { DashboardGearIcon3D } from "@/components/dashboard/DashboardProfileActionIcons3D";
import DashboardLightningBolt3D from "@/components/dashboard/DashboardLightningBolt3D";
import DashboardMeterMenuIcon3D from "@/components/dashboard/DashboardMeterMenuIcon3D";
import {
  ArrowRight,
  CalendarDays,
  BarChart3,
  ChevronDown,
  ClipboardCheck,
  ClipboardList,
  Dumbbell,
  FileCheck2,
  Gem,
  HeartPulse,
  Home,
  Library,
  LogIn,
  MessageCircle,
  MessagesSquare,
  NotebookPen,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Target,
  Trophy,
  type LucideIcon,
  UserPlus,
  Utensils,
  Video,
  WalletCards,
} from "lucide-react";
import MarketingAppOrbitPreview from "@/components/MarketingAppOrbitPreview";
import MemberAppPricingSelector from "@/components/MemberAppPricingSelector";
import ProfileRewardOrbit from "@/components/ProfileRewardOrbit";
import { DashboardSpinningSoundCoin3D } from "@/components/dashboard/DashboardTreasureChest3D";
import { ROUTES } from "@/lib/routes";

type IconFeature = {
  title: string;
  text: string;
  Icon: LucideIcon;
};

type PreviewModule = {
  eyebrow: string;
  title: string;
  text: string;
  Icon: LucideIcon;
};

type PreviewFeatureColumn = {
  label: string;
  detail: string;
  Icon: LucideIcon;
  glowClass: string;
  columnAccentClass: string;
  visual: "plan" | "support" | "rewards";
  modules: PreviewModule[];
};

type PreviewRow = {
  label: string;
  value: string;
  Icon: LucideIcon;
};

const previewModules: PreviewModule[] = [
  {
    eyebrow: "Plan",
    title: "Training Plan",
    text: "Workouts, phases, session notes, coach priorities, and next steps stay organized between visits.",
    Icon: ClipboardList,
  },
  {
    eyebrow: "Progress",
    title: "Metrics Snapshot",
    text: "Readiness, recent wins, soreness, strength work, mobility, and consistency trends stay visible.",
    Icon: BarChart3,
  },
  {
    eyebrow: "Coach",
    title: "Messaging",
    text: "Members can ask questions, send updates, and keep coach decisions tied to the real training week.",
    Icon: MessageCircle,
  },
  {
    eyebrow: "Recovery",
    title: "Next Best Action",
    text: "Mobility, hydration, sleep, readiness, and session feedback point members toward the next move.",
    Icon: HeartPulse,
  },
  {
    eyebrow: "Library",
    title: "Exercise Library",
    text: "Movement demos, substitutions, warm-ups, and pain-aware options help members train with clarity.",
    Icon: Library,
  },
  {
    eyebrow: "Technique",
    title: "Video + Form Checks",
    text: "Technique support can be tied to Gems, form review requests, and coach feedback loops.",
    Icon: Video,
  },
  {
    eyebrow: "Nutrition",
    title: "Meals + Hydration",
    text: "Nutrition habits, hydration, meal ideas, grocery planning, and recovery inputs can live beside training.",
    Icon: Utensils,
  },
  {
    eyebrow: "Sessions",
    title: "Calendar + Notes",
    text: "Upcoming sessions, workout history, booking context, and coach notes stay easy to find.",
    Icon: CalendarDays,
  },
  {
    eyebrow: "Check-ins",
    title: "Body Context",
    text: "Sleep, soreness, energy, pain notes, wins, and movement context help the plan adapt.",
    Icon: FileCheck2,
  },
  {
    eyebrow: "Goals",
    title: "Milestones",
    text: "Goals, streaks, achievements, habits, and training milestones give progress more shape.",
    Icon: Target,
  },
  {
    eyebrow: "Rewards",
    title: "Sparks + Gems + Tokens",
    text: "Sound Sparks, Gems, and Treasure Tokens give members a rewards layer for action and support.",
    Icon: WalletCards,
  },
  {
    eyebrow: "Profile",
    title: "Member Hub",
    text: "Profile details, preferences, equipment, limitations, and support style create a better coaching picture.",
    Icon: NotebookPen,
  },
  {
    eyebrow: "Training",
    title: "Strength Work",
    text: "Workout structure, technique cues, exercise progressions, equipment, and strength targets stay connected.",
    Icon: Dumbbell,
  },
  {
    eyebrow: "Wins",
    title: "Achievements",
    text: "Badges, consistency wins, streaks, and completion moments help members see follow-through.",
    Icon: Trophy,
  },
];

const featureColumns: PreviewFeatureColumn[] = [
  {
    label: "Plan",
    detail: "Workouts",
    Icon: ClipboardList,
    glowClass: "bg-sky-400/18 text-sky-100",
    columnAccentClass: "from-sky-300 via-cyan-300 to-sky-600",
    visual: "plan",
    modules: getPreviewModules([
      "Training Plan",
      "Exercise Library",
      "Calendar + Notes",
      "Strength Work",
    ]),
  },
  {
    label: "Support",
    detail: "Coach notes",
    Icon: MessagesSquare,
    glowClass: "bg-cyan-300/16 text-cyan-100",
    columnAccentClass: "from-cyan-200 via-teal-300 to-sky-500",
    visual: "support",
    modules: getPreviewModules([
      "Messaging",
      "Video + Form Checks",
      "Next Best Action",
      "Body Context",
      "Member Hub",
    ]),
  },
  {
    label: "Rewards",
    detail: "Sparks + gems",
    Icon: Gem,
    glowClass: "bg-amber-200/14 text-amber-100",
    columnAccentClass: "from-amber-200 via-cyan-200 to-emerald-300",
    visual: "rewards",
    modules: getPreviewModules([
      "Metrics Snapshot",
      "Meals + Hydration",
      "Milestones",
      "Achievements",
      "Sparks + Gems + Tokens",
    ]),
  },
];

function getPreviewModules(titles: string[]) {
  return titles.map((title) => {
    const matchedModule = previewModules.find((item) => item.title === title);

    if (!matchedModule) {
      throw new Error(`Missing preview module: ${title}`);
    }

    return matchedModule;
  });
}

function FeatureColumnWebGlIcon({
  visual,
}: {
  visual: PreviewFeatureColumn["visual"];
}) {
  if (visual === "plan") {
    return (
      <DashboardMeterMenuIcon3D
        active
        className="h-12 w-12 drop-shadow-[0_0_16px_rgba(56,189,248,0.32)]"
      />
    );
  }

  if (visual === "support") {
    return (
      <DashboardGearIcon3D
        active
        className="h-12 w-12 drop-shadow-[0_0_16px_rgba(103,232,249,0.34)]"
        spinSpeed={0.08}
      />
    );
  }

  return (
    <span className="relative block h-12 w-14 [perspective:760px]">
      <DashboardLightningBolt3D
        active
        className="absolute left-0 top-1 h-11 w-11 drop-shadow-[0_0_16px_rgba(56,189,248,0.34)]"
      />
      <DashboardEmerald3D
        className="absolute right-0 top-2 h-10 w-10 drop-shadow-[0_0_16px_rgba(52,211,153,0.32)]"
        tone="green"
      />
    </span>
  );
}

const previewRows: PreviewRow[] = [
  {
    label: "See the flow",
    value: "Move from profile context to plan, progress, and exercise library.",
    Icon: ArrowRight,
  },
  {
    label: "Privacy first",
    value: "Your data stays private; we only receive information you choose to share.",
    Icon: ShieldCheck,
  },
  {
    label: "Create after checkout",
    value: "Your private dashboard is built after signup and account setup.",
    Icon: UserPlus,
  },
  {
    label: "App options",
    value: "Choose App Only, Hybrid App, or Online Coaching when you are ready.",
    Icon: Smartphone,
  },
];

const goalProgressPhotos = [
  {
    label: "Jun 1 progress photo",
    src: "/sample-member-maya.jpg",
    objectPosition: "50% 30%",
    tone: "start",
    positionClass: "left-0 -translate-x-1/2",
  },
  {
    label: "Jul 15 progress photo",
    src: "/sample-member-maya.jpg",
    objectPosition: "54% 24%",
    tone: "checkin",
    positionClass: "left-1/2 -translate-x-1/2",
  },
  {
    label: "Aug 30 reveal photo",
    tone: "reveal",
    positionClass: "right-0 translate-x-1/2",
  },
] as const;

const rainbowWordartTopLetters = "START FREE".split("");
const rainbowWordartBottomLetters = "INTRO".split("");

const realLifeBenefits: IconFeature[] = [
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

export default function MemberDashboardPreviewPage() {
  return (
    <main className="min-h-screen overflow-x-clip bg-[#020713] text-white">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_16%_0%,rgba(14,165,233,0.2),transparent_32%),radial-gradient(circle_at_84%_12%,rgba(250,204,21,0.12),transparent_28%),linear-gradient(180deg,#020713_0%,#07111f_48%,#020713_100%)]" />
      <style>{`
        .member-hero-space-effects {
          background:
            linear-gradient(112deg, transparent 0%, rgba(14, 165, 233, 0.08) 38%, rgba(250, 204, 21, 0.035) 54%, transparent 76%),
            radial-gradient(ellipse at 74% 12%, rgba(56, 189, 248, 0.14), transparent 42%);
        }

        .member-hero-aura {
          animation: member-hero-aura-drift 18s ease-in-out infinite alternate;
          background:
            linear-gradient(118deg, transparent 10%, rgba(34, 211, 238, 0.08) 36%, rgba(103, 232, 249, 0.11) 47%, rgba(250, 204, 21, 0.045) 58%, transparent 78%),
            radial-gradient(ellipse at 64% 32%, rgba(14, 165, 233, 0.16), transparent 56%);
          filter: blur(18px);
          inset: -28% -18%;
          opacity: 0.62;
          position: absolute;
        }

        .member-hero-stars {
          animation: member-hero-star-drift 24s linear infinite alternate;
          background-repeat: no-repeat;
          inset: 0;
          opacity: 0.58;
          position: absolute;
        }

        .member-hero-stars--far {
          background-image:
            radial-gradient(circle at 8% 24%, rgba(226, 246, 255, 0.66) 0 1px, transparent 1.7px),
            radial-gradient(circle at 18% 68%, rgba(125, 211, 252, 0.44) 0 1px, transparent 1.7px),
            radial-gradient(circle at 32% 18%, rgba(255, 255, 255, 0.58) 0 1px, transparent 1.7px),
            radial-gradient(circle at 46% 78%, rgba(186, 230, 253, 0.52) 0 1px, transparent 1.7px),
            radial-gradient(circle at 62% 22%, rgba(255, 255, 255, 0.64) 0 1px, transparent 1.7px),
            radial-gradient(circle at 78% 64%, rgba(125, 211, 252, 0.48) 0 1px, transparent 1.7px),
            radial-gradient(circle at 91% 30%, rgba(254, 240, 138, 0.42) 0 1px, transparent 1.7px);
        }

        .member-hero-stars--near {
          animation-duration: 16s;
          background-image:
            radial-gradient(circle at 14% 42%, rgba(255, 255, 255, 0.82) 0 1.2px, transparent 2px),
            radial-gradient(circle at 26% 12%, rgba(125, 211, 252, 0.68) 0 1.2px, transparent 2px),
            radial-gradient(circle at 39% 58%, rgba(255, 255, 255, 0.74) 0 1.2px, transparent 2px),
            radial-gradient(circle at 57% 36%, rgba(186, 230, 253, 0.72) 0 1.2px, transparent 2px),
            radial-gradient(circle at 72% 16%, rgba(254, 240, 138, 0.48) 0 1.2px, transparent 2px),
            radial-gradient(circle at 86% 52%, rgba(255, 255, 255, 0.68) 0 1.2px, transparent 2px);
          opacity: 0.42;
        }

        .member-hero-meteor {
          animation: member-hero-meteor-flight 8.5s linear infinite;
          background: linear-gradient(90deg, transparent, rgba(224, 242, 254, 0.84), rgba(34, 211, 238, 0.42), transparent);
          border-radius: 999px;
          filter: drop-shadow(0 0 8px rgba(125, 211, 252, 0.42));
          height: 1px;
          opacity: 0;
          position: absolute;
          transform: rotate(-24deg);
          width: 8.5rem;
        }

        .member-hero-meteor::after {
          background: rgba(240, 249, 255, 0.9);
          border-radius: 999px;
          box-shadow: 0 0 10px rgba(125, 211, 252, 0.62);
          content: "";
          height: 3px;
          position: absolute;
          right: 20%;
          top: -1px;
          width: 3px;
        }

        .member-hero-meteor--one {
          animation-delay: 0.7s;
          left: 68%;
          top: 18%;
        }

        .member-hero-meteor--two {
          animation-delay: 4.2s;
          left: 42%;
          top: 50%;
          width: 6.5rem;
        }

        .member-hero-meteor--three {
          animation-delay: 6.8s;
          left: 88%;
          top: 36%;
          width: 7.5rem;
        }

        @keyframes member-hero-aura-drift {
          0% {
            transform: translate3d(-2%, -1%, 0) scale(1);
          }

          100% {
            transform: translate3d(2%, 1%, 0) scale(1.04);
          }
        }

        @keyframes member-hero-star-drift {
          0% {
            transform: translate3d(0, 0, 0);
          }

          100% {
            transform: translate3d(-1.1rem, 0.7rem, 0);
          }
        }

        @keyframes member-hero-meteor-flight {
          0%,
          58% {
            opacity: 0;
            transform: translate3d(0, 0, 0) rotate(-24deg);
          }

          64% {
            opacity: 0.72;
          }

          78% {
            opacity: 0;
            transform: translate3d(-18rem, 9rem, 0) rotate(-24deg);
          }

          100% {
            opacity: 0;
            transform: translate3d(-18rem, 9rem, 0) rotate(-24deg);
          }
        }

        @keyframes goal-progress-sweep {
          0% {
            transform: translateX(-120%);
          }

          100% {
            transform: translateX(220%);
          }
        }

        @keyframes goal-progress-node-pulse {
          0%,
          100% {
            box-shadow:
              0 0 0 0 rgba(254, 240, 138, 0.24),
              0 0 18px rgba(34, 211, 238, 0.38);
          }

          50% {
            box-shadow:
              0 0 0 5px rgba(254, 240, 138, 0.05),
              0 0 26px rgba(254, 240, 138, 0.34);
          }
        }

        .goal-progress-bar__sweep {
          animation: goal-progress-sweep 2.8s linear infinite;
        }

        .goal-progress-bar__active-node {
          animation: goal-progress-node-pulse 2.2s ease-in-out infinite;
        }

        .goal-progress-photo-node {
          isolation: isolate;
        }

        .goal-progress-photo-node::before {
          background:
            radial-gradient(circle at 34% 24%, rgba(255, 255, 255, 0.42), transparent 28%),
            linear-gradient(135deg, rgba(34, 211, 238, 0.7), rgba(253, 230, 138, 0.52));
          border-radius: inherit;
          content: "";
          inset: -2px;
          opacity: 0.9;
          position: absolute;
          z-index: -2;
        }

        .goal-progress-photo-node::after {
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.34), transparent 38%);
          border-radius: inherit;
          content: "";
          inset: 2px;
          opacity: 0.54;
          pointer-events: none;
          position: absolute;
          z-index: 2;
        }

        .goal-progress-photo-node--checkin::before {
          background:
            radial-gradient(circle at 36% 22%, rgba(255, 255, 255, 0.46), transparent 28%),
            linear-gradient(135deg, rgba(253, 230, 138, 0.76), rgba(34, 211, 238, 0.58));
        }

        .goal-progress-photo-node--reveal {
          background:
            radial-gradient(circle at 50% 42%, rgba(253, 230, 138, 0.24), transparent 42%),
            linear-gradient(145deg, rgba(15, 23, 42, 0.96), rgba(14, 165, 233, 0.2));
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.16),
            0 0 18px rgba(250, 204, 21, 0.15);
        }

        .goal-progress-photo-node--reveal::before {
          background:
            radial-gradient(circle at 32% 24%, rgba(255, 255, 255, 0.54), transparent 26%),
            linear-gradient(135deg, rgba(250, 204, 21, 0.85), rgba(56, 189, 248, 0.72));
        }

        @keyframes sound-rainbow-glyph-color {
          0% {
            color: #67e8f9;
            filter: drop-shadow(0 0 6px rgba(103, 232, 249, 0.38));
          }
          24% {
            color: #a78bfa;
            filter: drop-shadow(0 0 7px rgba(167, 139, 250, 0.38));
          }
          48% {
            color: #f0abfc;
            filter: drop-shadow(0 0 7px rgba(240, 171, 252, 0.36));
          }
          72% {
            color: #fde68a;
            filter: drop-shadow(0 0 8px rgba(253, 230, 138, 0.34));
          }
          100% {
            color: #67e8f9;
            filter: drop-shadow(0 0 6px rgba(103, 232, 249, 0.38));
          }
        }

        @keyframes sound-rainbow-arrow-nudge {
          0%,
          100% {
            transform: translateX(0);
          }
          50% {
            transform: translateX(2px);
          }
        }

        @keyframes sound-rainbow-letter-wave {
          0%,
          52%,
          100% {
            baseline-shift: 0;
            filter:
              brightness(1.08)
              drop-shadow(0 1px 0 rgba(2, 7, 19, 0.9));
            transform: translateY(0);
          }
          18% {
            baseline-shift: 4px;
            filter:
              brightness(1.65)
              drop-shadow(0 1px 0 rgba(2, 7, 19, 0.95))
              drop-shadow(0 0 4px rgba(255, 255, 255, 0.62));
            transform: translateY(-2.6px);
          }
          34% {
            baseline-shift: -1px;
            filter:
              brightness(1.22)
              drop-shadow(0 1px 0 rgba(2, 7, 19, 0.9));
            transform: translateY(0.9px);
          }
        }

        .sound-rainbow-cta {
          background:
            radial-gradient(circle at 18% 18%, rgba(255, 255, 255, 0.36), transparent 30%),
            linear-gradient(135deg, rgba(8, 145, 178, 0.92) 0%, rgba(37, 99, 235, 0.9) 52%, rgba(67, 56, 202, 0.88) 100%);
          box-shadow:
            0 10px 22px rgba(37, 99, 235, 0.22),
            0 0 26px rgba(125, 211, 252, 0.12),
            inset 0 1px 0 rgba(255, 255, 255, 0.38);
          isolation: isolate;
        }

        .sound-rainbow-cta::before,
        .sound-rainbow-cta::after {
          content: none !important;
          display: none !important;
        }

        .sound-rainbow-cta > * {
          position: relative;
          z-index: 2;
        }

        .sound-rainbow-cta .sound-rainbow-cta__glyph,
        .sound-rainbow-cta .sound-rainbow-cta__arrow {
          animation: sound-rainbow-glyph-color 3.8s ease-in-out infinite;
          will-change: color, filter, transform;
        }

        .sound-rainbow-cta .sound-rainbow-cta__arrow {
          animation:
            sound-rainbow-glyph-color 3.8s ease-in-out infinite reverse,
            sound-rainbow-arrow-nudge 1.9s ease-in-out infinite;
        }

        .sound-rainbow-wordart {
          filter:
            drop-shadow(0 1px 0 rgba(2, 7, 19, 0.88))
            drop-shadow(0 0 5px rgba(255, 255, 255, 0.32))
            drop-shadow(0 0 10px rgba(125, 211, 252, 0.24));
          overflow: visible;
        }

        .sound-rainbow-wordart__text {
          fill: url("#sound-rainbow-wordart-gradient");
          font-family: Arial, Helvetica, sans-serif;
          font-size: 12.8px;
          font-weight: 900;
          letter-spacing: 0.06em;
          paint-order: stroke fill;
          stroke: rgba(2, 7, 19, 0.82);
          stroke-linejoin: round;
          stroke-width: 2.15px;
          text-transform: uppercase;
        }

        .sound-rainbow-wordart__letter {
          animation: sound-rainbow-letter-wave 1.85s ease-in-out infinite;
          display: inline-block;
          transform-box: fill-box;
          transform-origin: center;
          will-change: baseline-shift, filter, transform;
        }

        .sound-rainbow-wordart__text--bottom {
          font-size: 13.6px;
          letter-spacing: 0.12em;
        }

        .sound-app-cta {
          background:
            radial-gradient(circle at 18% 18%, rgba(255, 255, 255, 0.5), transparent 25%),
            linear-gradient(120deg, #16a34a 0%, #2dd4bf 34%, #bbf7d0 62%, #22c55e 82%, #0f766e 100%);
          background-size: 140% 140%, 220% 220%;
          box-shadow:
            0 10px 22px rgba(16, 185, 129, 0.24),
            0 0 28px rgba(45, 212, 191, 0.14),
            inset 0 1px 0 rgba(255, 255, 255, 0.42);
          isolation: isolate;
        }

        .sound-app-cta > :not(.sound-app-cta__shine) {
          position: relative;
          z-index: 2;
        }

        .sound-app-cta__shine {
          position: absolute;
          z-index: 1;
        }

        @keyframes sound-app-label-sheen {
          0%,
          58%,
          100% {
            background-position: 140% 50%;
            opacity: 0.28;
          }
          72% {
            background-position: -40% 50%;
            opacity: 0.92;
          }
        }

        .sound-app-cta__label {
          color: #052e2b;
          display: inline-block;
          position: relative;
          text-shadow:
            0 1px 0 rgba(255, 255, 255, 0.28),
            0 0 10px rgba(255, 255, 255, 0.12);
        }

        .sound-app-cta__label::after {
          animation: sound-app-label-sheen 4.6s ease-in-out infinite;
          background: linear-gradient(
            105deg,
            transparent 0%,
            transparent 28%,
            rgba(255, 255, 255, 0.96) 45%,
            rgba(255, 255, 255, 0.68) 52%,
            transparent 70%,
            transparent 100%
          );
          background-clip: text;
          background-size: 240% 100%;
          color: transparent;
          content: attr(data-label);
          inset: 0;
          pointer-events: none;
          position: absolute;
          -webkit-background-clip: text;
        }

        .member-feature-panel > summary {
          list-style: none;
        }

        .member-feature-panel > summary::-webkit-details-marker {
          display: none;
        }

        .member-feature-panel[open] .member-feature-panel__chevron {
          transform: rotate(180deg);
        }

        @keyframes soft-urgency-pulse {
          0%,
          100% {
            opacity: 0.72;
            transform: scale(0.92);
            box-shadow:
              0 0 0 0 rgba(250, 204, 21, 0.24),
              0 0 8px rgba(251, 191, 36, 0.28);
          }
          48% {
            opacity: 1;
            transform: scale(1.08);
            box-shadow:
              0 0 0 5px rgba(250, 204, 21, 0.08),
              0 0 16px rgba(251, 191, 36, 0.48);
          }
        }

        .soft-urgency-dot {
          animation: soft-urgency-pulse 2.4s ease-in-out infinite;
          will-change: opacity, transform, box-shadow;
        }

        @media (prefers-reduced-motion: reduce) {
          .member-hero-aura,
          .member-hero-stars,
          .member-hero-meteor,
          .goal-progress-bar__sweep,
          .goal-progress-bar__active-node,
          .sound-rainbow-cta__glyph,
          .sound-rainbow-cta__arrow,
          .sound-rainbow-wordart__letter,
          .sound-app-cta__label::after,
          .soft-urgency-dot {
            animation: none;
          }
        }
      `}</style>

      <header className="sticky top-0 z-[80] border-b border-white/10 bg-[#020713]/78 shadow-[0_18px_50px_rgba(0,0,0,0.28)] backdrop-blur-xl">
        <div className="relative mx-auto flex w-full flex-col gap-3 px-5 py-2.5 sm:min-h-[8rem] sm:px-8 md:grid md:min-h-[7.5rem] md:grid-cols-[minmax(0,max-content)_minmax(20rem,1fr)] md:items-start md:gap-x-6">
          <Link
            href={ROUTES.public.home}
            className="group flex w-fit max-w-full min-w-0 items-center justify-center gap-2.5 self-center text-center sm:self-start sm:justify-start sm:text-left md:justify-self-start"
          >
            <Image
              src="/sound-fitness-logo.png"
              alt="Sound Fitness"
              width={56}
              height={56}
              className="h-12 w-12 shrink-0 object-contain transition duration-300 group-hover:scale-105 sm:h-14 sm:w-14"
            />

            <div className="min-w-0">
              <div className="bg-gradient-to-r from-white via-slate-200 to-sky-100 bg-clip-text text-xl font-black uppercase leading-none tracking-[0.13em] text-transparent sm:text-2xl">
                Sound Fitness
              </div>
              <div className="mt-1 text-[8px] font-black uppercase leading-none tracking-[0.18em] text-sky-300 sm:text-[9px]">
                In-home training & assisted stretch
              </div>
              <div className="mt-1.5 h-px w-full bg-gradient-to-r from-sky-400 via-amber-200 to-transparent opacity-70" />
              <div className="mt-1.5 inline-flex rounded-full border border-sky-400/25 bg-sky-500/10 px-2.5 py-0.5 text-[8px] font-black uppercase tracking-[0.14em] text-sky-100">
                In-home training + app
              </div>
            </div>
          </Link>

          <div className="flex w-full min-w-0 flex-col items-end gap-2 min-[560px]:grid min-[560px]:grid-cols-[minmax(0,1fr)_auto] min-[560px]:items-center min-[560px]:gap-x-3 min-[560px]:gap-y-0 md:pt-1">
            <div className="z-10 flex w-full min-w-0 flex-row justify-center gap-1.5 min-[560px]:justify-end min-[560px]:pr-1 md:justify-end">
              <Link
                href="#member-app-preview"
                className="sound-app-cta group relative inline-flex min-h-[40px] min-w-[8.35rem] shrink-0 items-center justify-center overflow-hidden rounded-[0.72rem] border border-emerald-100/35 px-3 py-1.5 text-center text-[9px] font-black uppercase tracking-[0.08em] text-emerald-950 transition duration-200 hover:-translate-y-0.5 hover:border-emerald-50/60 hover:brightness-110 hover:shadow-[0_14px_30px_rgba(52,211,153,0.32),0_0_32px_rgba(45,212,191,0.18),inset_0_1px_0_rgba(255,255,255,0.48)] focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-100/75 sm:min-w-[9.5rem] sm:text-[10px] sm:tracking-[0.09em]"
              >
                <span className="sound-app-cta__shine pointer-events-none absolute inset-y-0 left-0 w-1/2 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition duration-700 group-hover:translate-x-[220%]" />
                <span className="relative z-10 flex min-w-0 items-center justify-center gap-2">
                  <Smartphone
                    aria-hidden="true"
                    className="h-3.5 w-3.5 shrink-0"
                    strokeWidth={2.6}
                  />
                  <span
                    className="sound-app-cta__label min-w-0 whitespace-nowrap text-center"
                    data-label="See the app"
                  >
                    See the app
                  </span>
                </span>
              </Link>

              <Link
                aria-label="Start Free Intro"
                href={ROUTES.onboarding.assessment}
                className="sound-rainbow-cta group relative inline-flex min-h-[40px] items-center justify-center gap-1 overflow-hidden rounded-[0.72rem] border border-sky-100/35 px-2.5 py-1.5 text-center text-[9px] font-black uppercase tracking-[0.1em] text-white transition duration-200 hover:-translate-y-0.5 hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-100/75 sm:min-w-[8.5rem] sm:text-[10px] sm:tracking-[0.12em]"
              >
                <Sparkles
                  aria-hidden="true"
                  className="sound-rainbow-cta__glyph h-3.5 w-3.5 shrink-0 text-cyan-100"
                  strokeWidth={2.6}
                />
                <svg
                  aria-hidden="true"
                  className="sound-rainbow-wordart h-8 w-[5.35rem] shrink-0 sm:w-[5.65rem]"
                  role="img"
                  viewBox="0 0 112 38"
                >
                  <defs>
                    <path
                      d="M10 25 C 34 13, 78 13, 102 25"
                      id="sound-rainbow-wordart-arc-top"
                    />
                    <path
                      d="M34 33 C 45 28, 67 28, 78 33"
                      id="sound-rainbow-wordart-arc-bottom"
                    />
                    <linearGradient
                      gradientUnits="userSpaceOnUse"
                      id="sound-rainbow-wordart-gradient"
                      x1="-18"
                      x2="130"
                      y1="0"
                      y2="0"
                    >
                      <stop offset="0%" stopColor="#ffffff" />
                      <stop offset="18%" stopColor="#cffafe" />
                      <stop offset="38%" stopColor="#fde68a" />
                      <stop offset="58%" stopColor="#f9a8d4" />
                      <stop offset="78%" stopColor="#e9d5ff" />
                      <stop offset="100%" stopColor="#ffffff" />
                      <animateTransform
                        attributeName="gradientTransform"
                        dur="5.5s"
                        from="-36 0"
                        repeatCount="indefinite"
                        to="36 0"
                        type="translate"
                      />
                    </linearGradient>
                  </defs>
                  <text className="sound-rainbow-wordart__text">
                    <textPath
                      href="#sound-rainbow-wordart-arc-top"
                      lengthAdjust="spacingAndGlyphs"
                      startOffset="50%"
                      textAnchor="middle"
                      textLength="78"
                      xmlSpace="preserve"
                    >
                      {rainbowWordartTopLetters.map((letter, index) => (
                        <tspan
                          className="sound-rainbow-wordart__letter"
                          key={`${letter}-${index}`}
                          style={{ animationDelay: `${index * 0.06}s` }}
                        >
                          {letter}
                        </tspan>
                      ))}
                    </textPath>
                  </text>
                  <text className="sound-rainbow-wordart__text sound-rainbow-wordart__text--bottom">
                    <textPath
                      href="#sound-rainbow-wordart-arc-bottom"
                      lengthAdjust="spacingAndGlyphs"
                      startOffset="50%"
                      textAnchor="middle"
                      textLength="44"
                      xmlSpace="preserve"
                    >
                      {rainbowWordartBottomLetters.map((letter, index) => (
                        <tspan
                          className="sound-rainbow-wordart__letter"
                          key={`${letter}-${index}`}
                          style={{ animationDelay: `${(index + rainbowWordartTopLetters.length) * 0.06}s` }}
                        >
                          {letter}
                        </tspan>
                      ))}
                    </textPath>
                  </text>
                </svg>
                <ArrowRight
                  aria-hidden="true"
                  className="sound-rainbow-cta__arrow h-3.5 w-3.5 shrink-0"
                  strokeWidth={2.8}
                />
              </Link>
            </div>

            <Link
              href={ROUTES.auth.login}
              className="group inline-flex min-h-[32px] w-fit items-center justify-center gap-2 self-end whitespace-nowrap px-1 py-1 text-[9px] font-black uppercase tracking-[0.13em] text-slate-200 transition duration-200 hover:-translate-y-0.5 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300/60 min-[560px]:self-center min-[560px]:justify-self-end"
            >
              <span className="inline-grid h-7 w-7 shrink-0 place-items-center rounded-full border border-sky-200/25 bg-sky-300/10 text-sky-200 shadow-[0_0_16px_rgba(125,211,252,0.12),inset_0_1px_0_rgba(255,255,255,0.12)] transition duration-200 group-hover:border-sky-100/45 group-hover:bg-sky-200/15 group-hover:text-white group-hover:shadow-[0_0_20px_rgba(125,211,252,0.22),inset_0_1px_0_rgba(255,255,255,0.18)]">
                <LogIn
                  aria-hidden="true"
                  className="h-3.5 w-3.5 transition group-hover:translate-x-0.5"
                  strokeWidth={2.6}
                />
              </span>
              <span>Sign In</span>
            </Link>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden border-b border-sky-400/10">
        <div
          aria-hidden="true"
          className="member-hero-space-effects pointer-events-none absolute inset-0 overflow-hidden"
        >
          <div className="member-hero-aura" />
          <div className="member-hero-stars member-hero-stars--far" />
          <div className="member-hero-stars member-hero-stars--near" />
          <span className="member-hero-meteor member-hero-meteor--one" />
          <span className="member-hero-meteor member-hero-meteor--two" />
          <span className="member-hero-meteor member-hero-meteor--three" />
        </div>
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(6,17,31,0.76),rgba(2,7,19,0.34),rgba(2,7,19,0))]" />
        <div className="relative mx-auto max-w-7xl px-5 py-7 sm:px-8 lg:py-10">
          <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_20rem] md:items-center lg:grid-cols-[minmax(0,1fr)_24rem]">
            <div className="max-w-4xl">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex h-14 w-14 items-center justify-center [perspective:900px]">
                  <DashboardSpinningSoundCoin3D className="h-12 w-12 drop-shadow-[0_0_12px_rgba(250,204,21,0.24)]" />
                </div>
                <div className="inline-flex rounded-full border border-sky-400/30 bg-sky-500/10 px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-sky-100">
                  Early access preview
                </div>
              </div>

              <h1 className="mt-4 max-w-3xl text-4xl font-black uppercase leading-[0.9] tracking-tight sm:text-5xl lg:text-6xl">
                Preview the member dashboard experience.
              </h1>
              <div className="mt-3 h-1.5 w-28 rounded-full bg-gradient-to-r from-sky-100 via-cyan-300 to-sky-500 shadow-[0_0_20px_rgba(125,211,252,0.34)]" />
              <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg sm:leading-8">
                See sample training, progress, coach messaging, and recovery
                panels before creating an account. Sign in when you are ready
                to access a private member dashboard.
              </p>
            </div>

            <aside className="relative overflow-hidden rounded-2xl border border-sky-400/20 bg-[radial-gradient(circle_at_14%_0%,rgba(34,211,238,0.16),transparent_32%),radial-gradient(circle_at_86%_8%,rgba(250,204,21,0.10),transparent_28%),rgba(2,7,19,0.78)] p-5 shadow-[0_28px_80px_rgba(2,6,23,0.36)]">
              <Image
                aria-hidden="true"
                alt=""
                className="pointer-events-none absolute -right-24 -top-20 h-72 w-72 rotate-[-9deg] object-contain opacity-[0.18] mix-blend-screen sm:-right-28 sm:-top-24 sm:h-80 sm:w-80"
                height={768}
                src="/member-preview-kettlebell-render.png"
                width={768}
              />
      <div className="relative">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="relative h-[4.5rem] w-[4.5rem] shrink-0">
              <div className="relative z-20 h-[4.5rem] w-[4.5rem] overflow-hidden rounded-full border border-cyan-200/35 bg-slate-950 shadow-[0_0_28px_rgba(34,211,238,0.2)]">
                <Image
                  src="/sample-member-maya.jpg"
                  alt="Sound ultimate-member Maya R."
                  width={112}
                  height={112}
                  className="h-full w-full object-cover"
                />
              </div>
              <span className="pointer-events-none absolute -left-0.5 bottom-2 z-[60] flex items-baseline justify-center gap-[0.08rem] font-black leading-none tracking-[0.04em] text-white [text-shadow:0_1px_3px_rgba(2,6,23,0.95),0_0_9px_rgba(2,6,23,0.92),0_0_10px_rgba(250,204,21,0.48)]">
                <span className="absolute -inset-x-1.5 -inset-y-1 -z-10 rounded-full bg-slate-950/70 blur-md" />
                <span className="relative text-[0.5rem]">LV</span>
                <span className="relative text-[0.9rem]">12</span>
              </span>
              <div className="absolute -bottom-2.5 -right-2.5 z-40 h-10 w-10 rounded-full border border-sky-300/70 bg-slate-950/80 p-[1px] shadow-[0_0_14px_rgba(56,189,248,0.28)]">
                <Image
                  src="/sound-coach-avatar-face-centered.png"
                  alt="Sample coach"
                  width={96}
                  height={96}
                  className="h-full w-full rounded-full object-cover object-center brightness-110 contrast-105 saturate-110 drop-shadow-[0_0_14px_rgba(125,211,252,0.5)]"
                />
              </div>
              <svg
                aria-hidden="true"
                className="pointer-events-none absolute -left-2 -top-2 z-30 h-24 w-24 overflow-visible"
                viewBox="0 0 96 96"
              >
                <defs>
                  <linearGradient
                    id="memberLevelTraceGradient"
                    gradientUnits="userSpaceOnUse"
                    x1="43"
                    x2="84"
                    y1="84"
                    y2="43"
                  >
                    <stop offset="0%" stopColor="#0284c7" />
                    <stop offset="32%" stopColor="#22d3ee" />
                    <stop offset="68%" stopColor="#67e8f9" />
                    <stop offset="100%" stopColor="#fde68a" />
                  </linearGradient>
                  <filter
                    id="memberLevelTraceGlow"
                    x="-30%"
                    y="-30%"
                    width="160%"
                    height="160%"
                  >
                    <feGaussianBlur
                      in="SourceGraphic"
                      result="blur"
                      stdDeviation="2.1"
                    />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>
                <path
                  d="M 46 81.9 A 38 38 0 1 1 81.9 46"
                  fill="none"
                  stroke="rgba(2, 6, 23, 0.92)"
                  strokeLinecap="butt"
                  strokeWidth="8"
                />
                <path
                  d="M 46 81.9 A 38 38 0 1 1 81.9 46"
                  fill="none"
                  stroke="rgba(148, 163, 184, 0.34)"
                  strokeLinecap="butt"
                  strokeWidth="5.5"
                />
                <path
                  d="M 46 81.9 A 38 38 0 1 1 81.9 46"
                  fill="none"
                  opacity="0.38"
                  pathLength={100}
                  stroke="url(#memberLevelTraceGradient)"
                  strokeDasharray="84 100"
                  strokeLinecap="butt"
                  strokeWidth="7"
                  filter="url(#memberLevelTraceGlow)"
                />
                <path
                  d="M 46 81.9 A 38 38 0 1 1 81.9 46"
                  fill="none"
                  stroke="url(#memberLevelTraceGradient)"
                  pathLength={100}
                  strokeDasharray="84 100"
                  strokeLinecap="butt"
                  strokeWidth="4.25"
                />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <div className="max-w-full truncate bg-[linear-gradient(100deg,#fef3c7_0%,#facc15_36%,#fff7ed_52%,#d97706_74%,#fef08a_100%)] bg-clip-text text-[9px] font-black uppercase tracking-[0.14em] text-transparent drop-shadow-[0_0_10px_rgba(250,204,21,0.34)] [text-shadow:0_1px_8px_rgba(120,53,15,0.35)]">
                Ultimate-Member
              </div>
              <div className="mt-1 text-lg font-black uppercase leading-none tracking-[0.06em] text-white">
                Maya R.
              </div>
              <div className="ml-4 mt-2 flex max-w-full items-center gap-2 text-[9px] font-black uppercase tracking-[0.1em] text-emerald-100 drop-shadow-[0_0_8px_rgba(110,231,183,0.18)]">
                <span
                  aria-hidden="true"
                  className="h-2 w-2 shrink-0 rounded-full bg-emerald-300 shadow-[0_0_10px_rgba(110,231,183,0.42)]"
                />
                <span>Readiness</span>
                <span className="whitespace-nowrap rounded-full bg-emerald-100/12 px-1.5 py-0.5 text-[8px] tracking-[0.08em] text-emerald-50">
                  82% ready
                </span>
              </div>
            </div>
          </div>
                </div>

                <ProfileRewardOrbit />

                <div className="mt-4 overflow-hidden rounded-xl border border-white/10 bg-white/[0.035] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
                  <div className="flex items-center justify-between gap-3 border-b border-white/[0.08] px-3 py-2.5 text-sm font-bold leading-6 text-slate-300">
                    <span className="whitespace-nowrap">Current focus</span>
                    <span className="whitespace-nowrap text-right text-amber-100">
                      Strength + mobility
                    </span>
                  </div>

                  <div className="relative px-3 py-3.5">
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-x-3 top-0 h-px bg-gradient-to-r from-transparent via-cyan-200/25 to-transparent"
                    />
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-[10px] font-black uppercase tracking-[0.16em] text-cyan-200">
                          Goal track
                        </div>
                        <div className="mt-1 text-sm font-bold leading-5 text-slate-200">
                          Lose 12 lb + gain muscle
                        </div>
                        <div className="mt-1 text-[10px] font-black uppercase tracking-[0.1em] text-slate-500">
                          Target Aug 30, 2026
                        </div>
                      </div>
                      <div className="shrink-0 rounded-full border border-amber-100/18 bg-amber-100/10 px-2.5 py-1 text-right shadow-[0_0_18px_rgba(250,204,21,0.08)]">
                        <div className="text-lg font-black leading-none text-amber-100">
                          -7 lbs
                        </div>
                        <div className="mt-0.5 text-[7px] font-black uppercase tracking-[0.12em] text-amber-100/70">
                          since start
                        </div>
                      </div>
                    </div>
                    <div className="mt-3">
                      <div className="mb-0.5 flex items-center justify-between text-[8px] font-black uppercase tracking-[0.1em] text-sky-100">
                        <span>Jun 1</span>
                        <span>Jul 15</span>
                        <span>Aug 30</span>
                      </div>
                      <div className="mb-1 flex items-center justify-between text-[8px] font-black uppercase tracking-[0.12em] text-slate-500">
                        <span>Start</span>
                        <span>Check-in</span>
                        <span>Goal date</span>
                      </div>
                      <div className="relative h-3.5 overflow-visible rounded-full bg-slate-950/90 p-[2px] ring-1 ring-cyan-100/18 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_0_22px_rgba(14,165,233,0.12)]">
                        <div className="absolute inset-0 rounded-full bg-[linear-gradient(90deg,rgba(8,47,73,0.92),rgba(15,23,42,0.86)_66%,rgba(15,23,42,0.98))]" />
                        <div className="absolute inset-[2px] rounded-full bg-[repeating-linear-gradient(90deg,rgba(148,163,184,0.22)_0,rgba(148,163,184,0.22)_1px,transparent_1px,transparent_8px)] opacity-80" />
                        <div className="absolute inset-y-[2px] left-[64%] right-[2px] rounded-r-full bg-slate-900/82" />
                        <div className="absolute inset-y-[2px] left-[2px] w-[64%] overflow-hidden rounded-full bg-[linear-gradient(90deg,#22d3ee_0%,#38bdf8_36%,#99f6e4_58%,#fde68a_100%)] shadow-[0_0_20px_rgba(34,211,238,0.42),inset_0_1px_0_rgba(255,255,255,0.35)]">
                          <span className="goal-progress-bar__sweep absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-transparent via-white/55 to-transparent" />
                          <span className="absolute inset-0 bg-[repeating-linear-gradient(90deg,rgba(255,255,255,0.2)_0,rgba(255,255,255,0.2)_1px,transparent_1px,transparent_9px)] opacity-35" />
                        </div>
                        <div className="absolute inset-y-[2px] left-[64%] w-5 -translate-x-1/2 rounded-full bg-cyan-100/30 blur-md" />
                        <span className="absolute left-0 top-1/2 h-4 w-1 -translate-y-1/2 rounded-full bg-cyan-100/60 shadow-[0_0_10px_rgba(125,211,252,0.45)]" />
                        <span className="absolute left-[33%] top-1/2 h-4 w-px -translate-y-1/2 bg-white/35" />
                        <span className="absolute right-0 top-1/2 h-4 w-1 -translate-y-1/2 rounded-full bg-slate-600/80" />
                        <span className="goal-progress-bar__active-node absolute left-[64%] top-1/2 z-10 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border border-amber-100/70 bg-[radial-gradient(circle_at_35%_30%,#ffffff_0%,#fde68a_28%,#22d3ee_74%)]">
                          <span className="absolute inset-1 rounded-full bg-slate-950/55" />
                        </span>
                      </div>
                      <div className="relative mt-2 h-9 sm:h-10">
                        {goalProgressPhotos.map((checkpoint) => (
                          <span
                            key={checkpoint.label}
                            className={`absolute top-0 ${checkpoint.positionClass}`}
                          >
                            <span
                              className={`goal-progress-photo-node goal-progress-photo-node--${checkpoint.tone} relative flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-slate-950/80 shadow-[0_0_14px_rgba(34,211,238,0.12)] sm:h-9 sm:w-9`}
                              aria-label={checkpoint.label}
                            >
                              {"src" in checkpoint ? (
                                <Image
                                  src={checkpoint.src}
                                  alt=""
                                  fill
                                  sizes="36px"
                                  className="object-cover"
                                  style={{
                                    objectPosition: checkpoint.objectPosition,
                                  }}
                                />
                              ) : (
                                <span
                                  aria-hidden="true"
                                  className="relative z-10 text-xl font-black leading-none text-amber-100 drop-shadow-[0_0_8px_rgba(250,204,21,0.35)]"
                                >
                                  +
                                </span>
                              )}
                            </span>
                          </span>
                        ))}
                      </div>
                      <div className="mt-1.5 text-right text-[8px] font-black uppercase tracking-[0.14em] text-amber-100 drop-shadow-[0_0_8px_rgba(250,204,21,0.2)]">
                        5 lb to go!
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-3 border-t border-white/[0.08] px-3 py-2.5 text-sm font-bold leading-6 text-slate-300">
                    <span className="whitespace-nowrap">Next objective</span>
                    <span className="whitespace-nowrap text-right text-cyan-100">
                      Weekly check-in
                    </span>
                  </div>
                </div>
              </div>
            </aside>
          </div>

          <div className="relative isolate mt-8">
            <div className="pointer-events-none absolute -inset-x-16 -inset-y-12 -z-20 [mask-image:radial-gradient(ellipse_at_62%_52%,black_0%,black_28%,rgba(0,0,0,0.74)_46%,rgba(0,0,0,0.28)_56%,transparent_68%)] [-webkit-mask-image:radial-gradient(ellipse_at_62%_52%,black_0%,black_28%,rgba(0,0,0,0.74)_46%,rgba(0,0,0,0.28)_56%,transparent_68%)]">
              <Image
                src="/member-preview-privacy-flow-bg.png"
                alt=""
                fill
                sizes="(min-width: 1280px) 1280px, calc(100vw + 128px)"
                className="object-cover object-[72%_center] opacity-[0.42]"
              />
              <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(2,7,19,0.82)_0%,rgba(2,7,19,0.56)_48%,rgba(2,7,19,0.30)_100%),radial-gradient(circle_at_86%_8%,rgba(34,211,238,0.16),transparent_36%),linear-gradient(135deg,rgba(14,165,233,0.08),transparent_44%,rgba(250,204,21,0.05))]" />
            </div>
            <div className="grid sm:grid-cols-2">
              {previewRows.map((row) => {
                const Icon = row.Icon;

                return (
                  <div
                    key={row.label}
                    className="relative min-h-32 overflow-hidden p-4 sm:p-5"
                  >
                    <div className="relative min-w-0">
                      <div className="flex items-center gap-3">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center text-cyan-100 drop-shadow-[0_0_12px_rgba(34,211,238,0.42)]">
                          <Icon
                            aria-hidden="true"
                            className="h-6 w-6"
                            strokeWidth={2.25}
                          />
                        </span>
                        <div className="text-[10px] font-black uppercase tracking-[0.14em] text-sky-300">
                          {row.label}
                        </div>
                      </div>
                      <div className="mt-3 text-sm font-bold leading-6 text-slate-100">
                        {row.value}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section
        id="member-app-preview"
        className="mx-auto max-w-7xl scroll-mt-24 px-5 pb-14 sm:px-8"
      >
        <MarketingAppOrbitPreview />
      </section>

      <section className="mx-auto max-w-7xl px-5 pb-14 sm:px-8">
        <div className="relative">
          <div className="relative overflow-hidden border-b border-sky-300/15 pb-6">
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-cyan-300/80 via-amber-200/70 to-transparent shadow-[0_0_18px_rgba(125,211,252,0.2)]" />
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.2em] text-sky-300">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-200 shadow-[0_0_12px_rgba(251,191,36,0.45)]" />
                Member app features
              </div>
              <h2 className="mt-3 max-w-4xl bg-gradient-to-r from-white via-sky-100 to-cyan-200 bg-clip-text text-2xl font-black uppercase leading-none text-transparent sm:text-3xl">
                Everything the app keeps organized.
              </h2>
              <div className="mt-4 h-1 w-28 rounded-full bg-gradient-to-r from-amber-200 via-cyan-300 to-sky-500 shadow-[0_0_18px_rgba(125,211,252,0.28)]" />
              <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-300">
                The preview is sample data, but the member app is designed as a
                command center for training, recovery, nutrition, messaging,
                rewards, and the coaching context that keeps the work moving.
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {featureColumns.map((column) => {
              return (
                <details
                  key={column.label}
                  className="member-feature-panel relative min-w-0 overflow-hidden rounded-lg border border-sky-300/14 bg-[linear-gradient(180deg,rgba(11,25,43,0.7),rgba(2,7,19,0.34))] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
                >
                  <summary className="relative flex cursor-pointer select-none items-center gap-3 border-b border-sky-300/10 px-3 pb-3 pt-4 transition hover:bg-sky-300/5 focus:outline-none focus-visible:bg-sky-300/8 focus-visible:ring-2 focus-visible:ring-cyan-200/45">
                    <span
                      aria-hidden="true"
                      className={`pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${column.columnAccentClass}`}
                    />
                    <span className="flex h-12 w-14 shrink-0 items-center justify-center">
                      <FeatureColumnWebGlIcon visual={column.visual} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[11px] font-black uppercase tracking-[0.14em] text-white">
                        {column.label}
                      </div>
                      <div className="mt-1 truncate text-[9px] font-black uppercase tracking-[0.12em] text-slate-400">
                        {column.detail}
                      </div>
                    </div>
                    <ChevronDown
                      aria-hidden="true"
                      className="member-feature-panel__chevron h-4 w-4 shrink-0 text-cyan-100/80 transition-transform duration-200"
                      strokeWidth={2.5}
                    />
                  </summary>
                  <div className="pointer-events-none absolute -right-9 -top-9 h-24 w-24 rounded-full border border-sky-200/10 bg-cyan-200/5" />
                  <div className="member-feature-panel__body grid gap-0 px-3 pb-2">
                    {column.modules.map((module) => {
                      const Icon = module.Icon;

                      return (
                        <article
                          key={module.title}
                          className="group relative border-t border-sky-300/10 py-1.5 transition first:border-t-0"
                        >
                          <div className="flex items-start gap-2">
                            <Icon
                              aria-hidden="true"
                              className="mt-0.5 h-3.5 w-3.5 shrink-0 text-cyan-200/80"
                              strokeWidth={2.25}
                            />
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
                                <div className="text-[8px] font-black uppercase tracking-[0.14em] text-sky-300">
                                  {module.eyebrow}
                                </div>
                                <h4 className="text-[13px] font-black uppercase leading-none tracking-[0.045em] text-white">
                                  {module.title}
                                </h4>
                              </div>
                              <p className="mt-0.5 text-xs leading-5 text-slate-400">
                                {module.text}
                              </p>
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </details>
              );
            })}
            <article className="group relative pt-5 pb-3 md:col-span-3">
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-200/80 to-transparent shadow-[0_0_16px_rgba(251,191,36,0.35)]" />
              <div className="flex items-start gap-2.5">
                <Sparkles
                  aria-hidden="true"
                  className="mt-0.5 h-4 w-4 shrink-0 text-amber-200/90"
                  strokeWidth={2.35}
                />
                <div className="min-w-0">
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                    <div className="text-[9px] font-black uppercase tracking-[0.16em] text-amber-200">
                      More
                    </div>
                    <h3 className="text-sm font-black uppercase tracking-[0.05em] text-white">
                      And so much more
                    </h3>
                  </div>
                  <p className="mt-1 text-sm leading-6 text-slate-300">
                    The preview only shows the core tools. The full app can keep
                    expanding with rewards, reminders, support flows, and
                    coaching details around the way you train.
                  </p>
                </div>
              </div>
            </article>
          </div>
        </div>
      </section>

      <section
        id="member-app-pricing"
        className="relative scroll-mt-24 overflow-hidden border-y border-sky-400/10 bg-[linear-gradient(180deg,rgba(2,7,19,0.98)_0%,rgba(7,24,44,0.92)_48%,rgba(2,7,19,0.98)_100%)] py-16"
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-sky-200/60 to-transparent" />
        <div className="pointer-events-none absolute left-0 top-10 h-72 w-72 rounded-full bg-cyan-400/10 blur-3xl" />
        <div className="pointer-events-none absolute bottom-10 right-0 h-72 w-72 rounded-full bg-amber-200/10 blur-3xl" />
        <MemberAppPricingSelector />
      </section>

      <section className="relative overflow-hidden border-y border-sky-400/15 bg-[linear-gradient(135deg,rgba(2,7,19,0.98)_0%,rgba(8,28,50,0.96)_46%,rgba(2,7,19,0.98)_100%)] py-16">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-200/70 to-transparent" />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,transparent_0%,rgba(14,165,233,0.09)_52%,transparent_100%)]" />
        <Image
          src="/sound-token.png"
          alt=""
          width={260}
          height={260}
          className="pointer-events-none absolute -right-12 top-8 h-64 w-64 object-contain opacity-[0.07] sm:right-6"
        />
        <div className="relative mx-auto max-w-7xl px-5 sm:px-8">
          <div className="grid gap-10 lg:grid-cols-[0.86fr_1.14fr] lg:items-end">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-sky-400/25 bg-sky-500/10 px-4 py-2 text-[11px] font-black uppercase tracking-[0.2em] text-sky-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                <span className="soft-urgency-dot h-2 w-2 rounded-full bg-amber-200" />
                Built for real life
              </div>
              <h2 className="mt-5 max-w-2xl bg-gradient-to-r from-white via-sky-100 to-cyan-200 bg-clip-text text-4xl font-black uppercase leading-[0.95] tracking-tight text-transparent sm:text-5xl">
                Fewer barriers. More follow-through.
              </h2>
              <div className="mt-5 h-1.5 w-32 rounded-full bg-gradient-to-r from-amber-200 via-cyan-300 to-sky-500 shadow-[0_0_22px_rgba(125,211,252,0.34)]" />
              <p className="mt-5 max-w-xl text-base leading-7 text-slate-300">
                In-home sessions remove friction, while the app keeps the work
                connected after the visit ends.
              </p>
              <div className="mt-6 grid max-w-xl gap-3 sm:grid-cols-2">
                <div className="border-l-2 border-amber-200/70 pl-4">
                  <div className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-200">
                    Home-first
                  </div>
                  <div className="mt-1 text-sm font-bold leading-6 text-slate-300">
                    Coaching fits the space and schedule you already have.
                  </div>
                </div>
                <div className="border-l-2 border-cyan-300/70 pl-4">
                  <div className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-200">
                    App-backed
                  </div>
                  <div className="mt-1 text-sm font-bold leading-6 text-slate-300">
                    Plan notes and next steps stay visible between sessions.
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              {realLifeBenefits.map((benefit, index) => {
                const Icon = benefit.Icon;
                const hasPhotoBand = benefit.title === "Connected Support";

                return (
                  <article
                    key={benefit.title}
                    className={`group relative min-h-[220px] overflow-hidden rounded-2xl border border-sky-400/18 bg-[linear-gradient(180deg,rgba(15,35,60,0.86),rgba(2,7,19,0.72))] shadow-[0_24px_70px_rgba(0,0,0,0.28)] transition hover:-translate-y-1 hover:border-cyan-200/45 hover:bg-sky-500/10 ${
                      hasPhotoBand ? "p-0" : "p-5"
                    }`}
                  >
                    <div
                      className={`pointer-events-none absolute right-4 z-20 text-4xl font-black leading-none ${
                        hasPhotoBand ? "top-4 text-white/[0.08]" : "top-4 text-white/[0.04]"
                      }`}
                    >
                      0{index + 1}
                    </div>
                    {hasPhotoBand ? (
                      <div className="relative h-24 overflow-hidden border-b border-cyan-200/14">
                        <Image
                          src="/sample-member-maya.jpg"
                          alt=""
                          fill
                          sizes="(min-width: 1024px) 28vw, (min-width: 640px) 33vw, calc(100vw - 40px)"
                          className="object-cover object-[50%_34%] opacity-72 saturate-125"
                        />
                        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(2,7,19,0.78),rgba(8,47,73,0.22)_48%,rgba(2,7,19,0.7)),radial-gradient(circle_at_78%_20%,rgba(34,211,238,0.22),transparent_36%)]" />
                        <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-[#06111f] to-transparent" />
                      </div>
                    ) : null}
                    <div className={hasPhotoBand ? "relative p-5 pt-4" : "relative"}>
                      <div className="flex h-12 w-12 items-center justify-center text-sky-100 drop-shadow-[0_0_18px_rgba(125,211,252,0.34)] transition group-hover:text-white group-hover:drop-shadow-[0_0_24px_rgba(125,211,252,0.5)]">
                        <Icon
                          aria-hidden="true"
                          className="h-8 w-8"
                          strokeWidth={2.4}
                        />
                      </div>
                      <div className="mt-3 h-1.5 w-20 rounded-full bg-gradient-to-r from-amber-200 via-cyan-300 to-sky-500 shadow-[0_0_18px_rgba(125,211,252,0.34)]" />
                      <h3 className="mt-5 text-sm font-black uppercase tracking-[0.12em] text-white">
                        {benefit.title}
                      </h3>
                      <p className="mt-3 text-sm leading-6 text-slate-300">
                        {benefit.text}
                      </p>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </div>
      </section>

    </main>
  );
}
