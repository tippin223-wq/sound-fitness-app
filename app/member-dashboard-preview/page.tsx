import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import {
  ArrowRight,
  ClipboardCheck,
  Home,
  LogIn,
  Smartphone,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import MarketingAppOrbitPreview from "@/components/MarketingAppOrbitPreview";
import MarketingCtaButton3D from "@/components/MarketingCtaButton3D";
import MarketingHeaderLogo3D from "@/components/MarketingHeaderLogo3D";
import MarketingSectionHeading3D from "@/components/MarketingSectionHeading3D";
import MemberPreviewRowLabels3D from "@/components/MemberPreviewRowLabels3D";
import WebGlRenderModeToggle from "@/components/WebGlRenderModeToggle";
import HomeScrollSnapManager from "@/components/HomeScrollSnapManager";
import SoundHeaderAppPill from "@/components/SoundHeaderAppPill";
import MemberAppFeatureAccordion from "@/components/MemberAppFeatureAccordion";
import MemberAppPricingSelector from "@/components/MemberAppPricingSelector";
import ProfileRewardOrbit from "@/components/ProfileRewardOrbit";
import DashboardDumbbell3D from "@/components/dashboard/DashboardDumbbell3D";
import DashboardPhone3D from "@/components/dashboard/DashboardPhone3D";
import DashboardProfileIcon3D from "@/components/dashboard/DashboardProfileActionIcons3D";
import DashboardSparkles3D from "@/components/dashboard/DashboardSparkles3D";
import DashboardStepNumber3D from "@/components/dashboard/DashboardStepNumber3D";
import {
  DashboardChatIcon3D,
  DashboardClipboardIcon3D,
  DashboardHomeIcon3D,
  DashboardLockIcon3D,
  DashboardWaveIcon3D,
} from "@/components/dashboard/DashboardRealLifeIcons3D";
import { DashboardSpinningSoundCoin3D } from "@/components/dashboard/DashboardTreasureChest3D";
import { ROUTES } from "@/lib/routes";

type WebGlIconComponent = (props: {
  active?: boolean;
  className?: string;
  paused?: boolean;
}) => ReactNode;

type IconFeature = {
  title: string;
  text: string;
  Icon3D: WebGlIconComponent;
  photoPosition: string;
  photoSrc: string;
  photoAlt: string;
};

type PreviewRow = {
  label: string;
  value: string;
  Icon3D: WebGlIconComponent;
};

const previewRows: PreviewRow[] = [
  {
    label: "See the flow",
    value: "Move from profile context to plan, progress, and exercise library.",
    Icon3D: DashboardWaveIcon3D,
  },
  {
    label: "Privacy first",
    value: "Your data stays private; we only receive information you choose to share.",
    Icon3D: DashboardLockIcon3D,
  },
  {
    label: "Create after checkout",
    value: "Your private dashboard is built after signup and account setup.",
    Icon3D: DashboardProfileIcon3D,
  },
  {
    label: "App options",
    value: "Choose App Only, Hybrid App, or Online Coaching when you are ready.",
    Icon3D: DashboardPhone3D,
  },
];

const goalMilestones = [
  {
    label: "Baseline",
    tone: "start",
    Icon3D: DashboardHomeIcon3D,
    FallbackIcon: Home,
  },
  {
    label: "Logged",
    tone: "checkin",
    Icon3D: DashboardClipboardIcon3D,
    FallbackIcon: ClipboardCheck,
  },
  {
    label: "Reveal",
    tone: "reveal",
    Icon3D: DashboardSparkles3D,
    FallbackIcon: Sparkles,
  },
] satisfies {
  label: string;
  tone: "start" | "checkin" | "reveal";
  Icon3D: WebGlIconComponent;
  FallbackIcon: LucideIcon;
}[];

type PreviewGoalFocusId = "Strength" | "Mobility";

const previewGoalVisualStyles: Record<
  PreviewGoalFocusId,
  {
    icon: string;
    iconActive: string;
    selectedCard: string;
    signalActive: string;
    wash: string;
  }
> = {
  Strength: {
    icon: "\u{1F3CB}\uFE0F",
    iconActive:
      "border-blue-100/45 bg-blue-300/18 text-blue-50 shadow-[0_0_26px_rgba(96,165,250,0.26)]",
    selectedCard:
      "border-blue-200/70 bg-[radial-gradient(circle_at_18%_0%,rgba(59,130,246,0.28),transparent_38%),radial-gradient(circle_at_88%_10%,rgba(125,211,252,0.18),transparent_34%),rgba(15,23,42,0.62)] shadow-[0_0_34px_rgba(96,165,250,0.2)]",
    signalActive: "border-blue-100/42 bg-blue-300/18 text-blue-50",
    wash: "from-blue-400/34 via-cyan-300/18 to-transparent",
  },
  Mobility: {
    icon: "\u{1F9D8}",
    iconActive:
      "border-teal-100/45 bg-teal-300/18 text-teal-50 shadow-[0_0_26px_rgba(45,212,191,0.25)]",
    selectedCard:
      "border-teal-200/70 bg-[radial-gradient(circle_at_18%_0%,rgba(45,212,191,0.25),transparent_38%),radial-gradient(circle_at_88%_10%,rgba(74,222,128,0.18),transparent_34%),rgba(15,23,42,0.62)] shadow-[0_0_34px_rgba(45,212,191,0.2)]",
    signalActive: "border-teal-100/42 bg-teal-300/18 text-teal-50",
    wash: "from-emerald-300/30 via-teal-300/20 to-transparent",
  },
};

function PreviewGoalIconCard({
  goal,
  label = goal,
  signal,
}: {
  goal: PreviewGoalFocusId;
  label?: string;
  signal: string;
}) {
  const style = previewGoalVisualStyles[goal];

  return (
    <span
      aria-label={`${label}: ${signal}`}
      className={`relative inline-flex min-h-[2.75rem] min-w-[7.4rem] max-w-full items-center gap-2 overflow-hidden rounded-[16px] border px-2 py-1.5 text-left ${style.selectedCard}`}
    >
      <span
        aria-hidden="true"
        className={`pointer-events-none absolute inset-x-3 top-0 h-px bg-gradient-to-r ${style.wash} opacity-95`}
      />
      <span
        aria-hidden="true"
        className={`pointer-events-none absolute -right-6 -top-7 h-20 w-20 rounded-full bg-gradient-to-br ${style.wash} opacity-42 blur-2xl`}
      />
      <span
        aria-hidden="true"
        className={`relative grid h-8 w-8 shrink-0 place-items-center rounded-xl border text-base leading-none ${style.iconActive}`}
      >
        {style.icon}
      </span>
      <span className="relative min-w-0 leading-none">
        <span className="block truncate text-[9px] font-black uppercase tracking-[0.09em] text-white">
          {label}
        </span>
        <span
          className={`mt-1 inline-flex max-w-full truncate rounded-lg border px-1.5 py-0.5 text-[7px] font-black uppercase tracking-[0.09em] ${style.signalActive}`}
        >
          {signal}
        </span>
      </span>
    </span>
  );
}

const rainbowWordartTopLetters = "START FREE".split("");
const rainbowWordartBottomLetters = "INTRO".split("");

const realLifeBenefits: IconFeature[] = [
  {
    title: "No Commute",
    text: "Training happens where your week already lives.",
    Icon3D: DashboardHomeIcon3D,
    photoPosition: "50% 52%",
    photoSrc: "/member-preview-seattle-traffic.jpg",
    photoAlt: "Busy Seattle traffic during a commute",
  },
  {
    title: "Matched Plan",
    text: "Your goals, equipment, schedule, and body context shape the work.",
    Icon3D: DashboardClipboardIcon3D,
    photoPosition: "50% 45%",
    photoSrc: "/member-preview-happy-user.jpg",
    photoAlt: "Happy fitness member reviewing a plan",
  },
  {
    title: "Connected Support",
    text: "App notes and coach messaging keep follow-through visible.",
    Icon3D: DashboardChatIcon3D,
    photoPosition: "50% 42%",
    photoSrc: "/member-preview-support-team.jpg",
    photoAlt: "Support specialist helping a member",
  },
];

export default function MemberDashboardPreviewPage() {
  return (
    <main
      id="top"
      className="min-h-screen overflow-x-clip bg-[#020713] text-white"
    >
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_16%_0%,rgba(14,165,233,0.2),transparent_32%),radial-gradient(circle_at_84%_12%,rgba(250,204,21,0.12),transparent_28%),linear-gradient(180deg,#020713_0%,#07111f_48%,#020713_100%)]" />
      <HomeScrollSnapManager />
      <style>{`
        html.home-scroll-snap-enabled {
          scroll-behavior: smooth;
          scroll-padding-top: clamp(6.75rem, 10vw, 8.5rem);
          scroll-snap-type: y mandatory;
        }

        .home-snap-section {
          scroll-snap-align: center;
          scroll-snap-stop: always;
          transition:
            filter 320ms ease,
            opacity 320ms ease;
        }

        .home-snap-section--top {
          scroll-snap-align: start;
        }

        .home-snap-section--member-preview-hero {
          min-height: calc(100svh - clamp(6.75rem, 10vw, 8.5rem));
        }

        .home-snap-section--member-preview-pricing,
        .home-snap-section--member-preview-real-life {
          align-items: center;
          display: grid;
          min-height: calc(100svh - clamp(6.75rem, 10vw, 8.5rem));
        }

        html.home-scroll-snap-enabled .home-snap-section {
          filter: saturate(0.68) brightness(0.54);
          opacity: 0.5;
        }

        html.home-scroll-snap-enabled .home-snap-section[data-home-snap-active="true"],
        html.home-scroll-snap-enabled .home-snap-section:focus-within {
          filter: none;
          opacity: 1;
        }

        .member-hero-space-effects {
          background:
            radial-gradient(circle at 14% 20%, rgba(34, 211, 238, 0.1), transparent 30%),
            radial-gradient(circle at 84% 12%, rgba(59, 130, 246, 0.12), transparent 34%),
            linear-gradient(112deg, transparent 0%, rgba(14, 165, 233, 0.08) 38%, rgba(250, 204, 21, 0.035) 54%, transparent 76%),
            radial-gradient(ellipse at 74% 12%, rgba(56, 189, 248, 0.14), transparent 42%);
          isolation: isolate;
        }

        .member-hero-aura {
          animation: member-hero-aura-drift 22s ease-in-out infinite alternate;
          background:
            linear-gradient(118deg, transparent 10%, rgba(34, 211, 238, 0.08) 36%, rgba(103, 232, 249, 0.11) 47%, rgba(250, 204, 21, 0.045) 58%, transparent 78%),
            radial-gradient(ellipse at 64% 32%, rgba(14, 165, 233, 0.16), transparent 56%),
            radial-gradient(ellipse at 22% 76%, rgba(168, 85, 247, 0.08), transparent 42%);
          filter: blur(22px);
          inset: -28% -18%;
          opacity: 0.62;
          position: absolute;
        }

        .member-hero-nebula {
          animation: member-hero-nebula-drift 34s ease-in-out infinite alternate;
          background:
            radial-gradient(ellipse at 18% 46%, rgba(14, 165, 233, 0.12), transparent 48%),
            radial-gradient(ellipse at 78% 54%, rgba(34, 211, 238, 0.1), transparent 42%),
            conic-gradient(from 210deg at 58% 46%, transparent 0deg, rgba(125, 211, 252, 0.09) 42deg, rgba(250, 204, 21, 0.035) 76deg, transparent 128deg);
          filter: blur(28px);
          inset: -34% -22%;
          mix-blend-mode: screen;
          opacity: 0.46;
          position: absolute;
        }

        .member-hero-orbits {
          animation: member-hero-orbit-drift 38s ease-in-out infinite alternate;
          background:
            radial-gradient(ellipse at 70% 38%, transparent 0 41%, rgba(125, 211, 252, 0.13) 41.4% 41.9%, transparent 42.4%),
            radial-gradient(ellipse at 30% 64%, transparent 0 46%, rgba(250, 204, 21, 0.08) 46.4% 46.8%, transparent 47.3%),
            radial-gradient(ellipse at 58% 56%, transparent 0 54%, rgba(56, 189, 248, 0.08) 54.3% 54.7%, transparent 55.2%);
          inset: -26% -18%;
          opacity: 0.42;
          position: absolute;
          transform: rotate(-8deg);
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

        .member-hero-twinkles {
          animation: member-hero-twinkle 6.8s ease-in-out infinite;
          background-image:
            radial-gradient(circle at 11% 64%, rgba(255, 255, 255, 0.88) 0 1px, transparent 2px),
            radial-gradient(circle at 29% 36%, rgba(186, 230, 253, 0.86) 0 1px, transparent 2px),
            radial-gradient(circle at 52% 70%, rgba(255, 255, 255, 0.8) 0 1px, transparent 2px),
            radial-gradient(circle at 67% 30%, rgba(254, 240, 138, 0.7) 0 1px, transparent 2px),
            radial-gradient(circle at 82% 78%, rgba(125, 211, 252, 0.8) 0 1px, transparent 2px);
          inset: 0;
          opacity: 0.22;
          position: absolute;
        }

        .member-preview-heading-3d .marketing-section-heading-3d__fallback {
          align-content: center !important;
          display: grid !important;
          color: #e0f2fe;
          font-size: clamp(1.55rem, 3vw, 2.5rem) !important;
          line-height: 0.9 !important;
          max-width: 100%;
          overflow: hidden;
          text-shadow:
            1px 1px 0 #0c4a6e,
            3px 3px 0 #f97316,
            0 0 18px rgba(56, 189, 248, 0.28);
        }

        .member-preview-heading-3d .marketing-section-heading-3d__fallback > span {
          white-space: nowrap;
        }

        .member-preview-heading-3d.marketing-section-heading-3d--eyebrow .marketing-section-heading-3d__fallback {
          color: #38bdf8;
          font-size: clamp(0.68rem, 1.08vw, 0.92rem) !important;
          letter-spacing: 0.22em;
          line-height: 1 !important;
        }

        .member-preview-heading-3d.marketing-section-heading-3d--ready .marketing-section-heading-3d__canvas,
        .member-preview-heading-3d.marketing-section-heading-3d--eyebrow.marketing-section-heading-3d--ready .marketing-section-heading-3d__canvas {
          opacity: 1 !important;
        }

        .member-preview-heading-3d.marketing-section-heading-3d--ready .marketing-section-heading-3d__fallback,
        .member-preview-heading-3d.marketing-section-heading-3d--eyebrow.marketing-section-heading-3d--ready .marketing-section-heading-3d__fallback {
          opacity: 0 !important;
        }

        .member-preview-hero-heading-3d.marketing-section-heading-3d--ready .marketing-section-heading-3d__canvas {
          filter:
            drop-shadow(0 0 18px rgba(34, 211, 238, 0.24))
            drop-shadow(0 0 12px rgba(249, 115, 22, 0.16));
        }

        .member-preview-row-heading-3d {
          min-width: 0;
        }

        .member-preview-row-heading-3d.marketing-section-heading-3d--eyebrow {
          aspect-ratio: 4.8 / 1;
        }

        .member-preview-row-heading-3d.marketing-section-heading-3d--ready .marketing-section-heading-3d__canvas {
          filter:
            drop-shadow(0 0 12px rgba(34, 211, 238, 0.34))
            drop-shadow(0 0 6px rgba(250, 204, 21, 0.14));
        }

        .member-preview-row-heading-3d .marketing-section-heading-3d__fallback {
          font-size: clamp(0.7rem, 1.45vw, 0.98rem) !important;
          letter-spacing: 0.12em !important;
          text-shadow:
            0 0 12px rgba(56, 189, 248, 0.42),
            1px 1px 0 rgba(12, 74, 110, 0.78),
            2px 2px 0 rgba(249, 115, 22, 0.42);
        }

        .member-preview-row-label-fallback {
          opacity: 0.26;
          text-shadow:
            0 0 10px rgba(56, 189, 248, 0.24),
            1px 1px 0 rgba(12, 74, 110, 0.72);
        }

        .member-hero-meteor {
          animation: member-hero-meteor-flight 11.5s linear infinite;
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

        .member-hero-meteor--four {
          animation-delay: 8.9s;
          animation-duration: 14s;
          left: 58%;
          top: 74%;
          width: 5.25rem;
        }

        .member-hero-meteor--five {
          animation-delay: 11.4s;
          animation-duration: 16s;
          left: 96%;
          top: 8%;
          width: 4.75rem;
        }

        @keyframes member-hero-aura-drift {
          0% {
            transform: translate3d(-2%, -1%, 0) scale(1);
          }

          100% {
            transform: translate3d(2%, 1%, 0) scale(1.04);
          }
        }

        @keyframes member-hero-nebula-drift {
          0% {
            transform: translate3d(-1.6%, 1%, 0) scale(1) rotate(-1deg);
          }

          100% {
            transform: translate3d(1.8%, -1.4%, 0) scale(1.05) rotate(1deg);
          }
        }

        @keyframes member-hero-orbit-drift {
          0% {
            transform: translate3d(-0.7rem, 0.3rem, 0) rotate(-9deg) scale(1);
          }

          100% {
            transform: translate3d(0.8rem, -0.2rem, 0) rotate(-5deg) scale(1.02);
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

        @keyframes member-hero-twinkle {
          0%,
          100% {
            opacity: 0.18;
            transform: scale(1);
          }

          36% {
            opacity: 0.5;
            transform: scale(1.01);
          }

          64% {
            opacity: 0.28;
            transform: scale(0.995);
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

        .goal-progress-bar__current-label {
          transform-origin: 50% 0%;
          transition: none;
        }

        .goal-progress-bar:hover .goal-progress-bar__current-label,
        .goal-progress-bar:focus-within .goal-progress-bar__current-label {
          filter: none;
        }

        .goal-progress-bar__alert-dot {
          animation: soft-urgency-pulse 2s ease-in-out infinite;
        }

        @keyframes sound-divider-breathe {
          0%,
          100% {
            filter: saturate(1.22) brightness(1.1)
              drop-shadow(0 0 8px rgba(34, 211, 238, 0.38))
              drop-shadow(0 0 2px rgba(250, 204, 21, 0.28));
          }

          50% {
            filter: saturate(2.25) brightness(1.62)
              drop-shadow(0 0 16px rgba(34, 211, 238, 0.72))
              drop-shadow(0 0 16px rgba(250, 204, 21, 0.34));
          }
        }

        @keyframes sound-divider-sheen {
          0%,
          36%,
          100% {
            opacity: 0;
            transform: translateX(-98%) scaleX(0.5);
          }

          52% {
            opacity: 0.82;
            transform: translateX(18%) scaleX(0.78);
          }

          72% {
            opacity: 0.06;
            transform: translateX(104%) scaleX(0.5);
          }
        }

        @keyframes sound-divider-node {
          0%,
          36%,
          100% {
            opacity: 0;
            transform: translate3d(-115%, -50%, 0) scaleX(0.36) scaleY(0.68);
          }

          52% {
            opacity: 0.7;
            transform: translate3d(215%, -50%, 0) scaleX(0.68) scaleY(0.78);
          }

          72% {
            opacity: 0.04;
            transform: translate3d(390%, -50%, 0) scaleX(0.42) scaleY(0.7);
          }
        }

        .sound-energy-divider {
          --sound-divider-delay: 0s;
          --sound-divider-duration: 5.4s;
          animation: sound-divider-breathe 6.6s ease-in-out infinite;
          animation-delay: var(--sound-divider-delay);
          background-size: 180% 100%;
          box-shadow:
            0 0 12px rgba(34, 211, 238, 0.24),
            0 0 7px rgba(250, 204, 21, 0.14);
          contain: paint;
          isolation: isolate;
          overflow: hidden;
          position: relative;
        }

        .sound-energy-divider > * {
          position: relative;
          z-index: 2;
        }

        .sound-energy-divider::before {
          animation: sound-divider-sheen var(--sound-divider-duration) cubic-bezier(0.45, 0, 0.22, 1) infinite;
          animation-delay: var(--sound-divider-delay);
          background: linear-gradient(
            90deg,
            transparent,
            rgba(34, 211, 238, 0.08) 14%,
            rgba(125, 211, 252, 0.72) 30%,
            rgba(255, 255, 255, 0.98) 43%,
            rgba(250, 204, 21, 0.78) 54%,
            rgba(45, 212, 191, 0.78) 68%,
            rgba(14, 165, 233, 0.12) 86%,
            transparent
          );
          content: "";
          filter:
            blur(0.2px)
            drop-shadow(0 0 6px rgba(34, 211, 238, 0.42))
            drop-shadow(0 0 5px rgba(250, 204, 21, 0.2));
          inset: 0;
          mix-blend-mode: screen;
          position: absolute;
          transform: translateX(-98%) scaleX(0.5);
          z-index: 1;
        }

        .sound-energy-divider::after {
          animation: sound-divider-node var(--sound-divider-duration) cubic-bezier(0.45, 0, 0.22, 1) infinite;
          animation-delay: var(--sound-divider-delay);
          background:
            radial-gradient(ellipse at 52% 50%, rgba(255, 255, 255, 0.95) 0 18%, rgba(250, 204, 21, 0.74) 24% 38%, rgba(103, 232, 249, 0.72) 48%, rgba(14, 165, 233, 0.18) 68%, transparent 82%);
          border-radius: 9999px;
          content: "";
          filter:
            blur(0.05px)
            drop-shadow(0 0 5px rgba(250, 204, 21, 0.34))
            drop-shadow(0 0 7px rgba(34, 211, 238, 0.42));
          height: 100%;
          left: 0;
          opacity: 0;
          pointer-events: none;
          position: absolute;
          top: 50%;
          transform: translate3d(-115%, -50%, 0) scaleX(0.36) scaleY(0.68);
          width: 0.78rem;
          z-index: 3;
        }

        .sound-energy-divider--thin::after {
          height: 100%;
          width: 0.64rem;
        }

        .sound-divider-row > * .sound-energy-divider {
          contain: paint;
          overflow: hidden;
        }

        .sound-divider-row > * .sound-energy-divider::before {
          inset: 0;
        }

        .sound-divider-row > * .sound-energy-divider::after {
          animation: sound-divider-node var(--sound-divider-duration) cubic-bezier(0.45, 0, 0.22, 1) infinite;
          animation-delay: var(--sound-divider-delay);
          height: 100%;
          transform: translate3d(-115%, -50%, 0) scaleX(0.36) scaleY(0.68);
          width: 0.78rem;
        }

        .sound-divider-row {
          --sound-divider-row-delay-1: 0s;
          --sound-divider-row-delay-2: 1.8s;
          --sound-divider-row-delay-3: 3.6s;
          --sound-divider-row-delay-4: 0s;
        }

        .sound-divider-row:has(> :nth-child(4):last-child) {
          --sound-divider-row-delay-2: 1.35s;
          --sound-divider-row-delay-3: 2.7s;
          --sound-divider-row-delay-4: 4.05s;
        }

        .sound-divider-row > :nth-child(1) .sound-energy-divider {
          --sound-divider-delay: var(--sound-divider-row-delay-1);
        }

        .sound-divider-row > :nth-child(2) .sound-energy-divider {
          --sound-divider-delay: var(--sound-divider-row-delay-2);
        }

        .sound-divider-row > :nth-child(3) .sound-energy-divider {
          --sound-divider-delay: var(--sound-divider-row-delay-3);
        }

        .sound-divider-row > :nth-child(4) .sound-energy-divider {
          --sound-divider-delay: var(--sound-divider-row-delay-4);
        }

        .member-preview-card .goal-milestone-card {
          --milestone-accent: rgba(125, 211, 252, 0.96);
          --milestone-accent-soft: rgba(34, 211, 238, 0.28);
          --milestone-face: radial-gradient(circle at 34% 24%, rgba(224, 242, 254, 0.5), rgba(14, 165, 233, 0.3) 36%, rgba(14, 116, 144, 0.28) 54%, rgba(15, 23, 42, 0.88) 76%);
          --milestone-glyph: rgba(207, 250, 254, 0.98);
          isolation: isolate;
          overflow: visible !important;
          perspective: 900px;
          text-align: center;
        }

        .member-preview-card .goal-milestone-card--checkin {
          --milestone-accent: rgba(253, 224, 71, 0.96);
          --milestone-accent-soft: rgba(250, 204, 21, 0.28);
          --milestone-face: radial-gradient(circle at 34% 22%, rgba(254, 249, 195, 0.5), rgba(250, 204, 21, 0.3) 35%, rgba(20, 184, 166, 0.2) 58%, rgba(15, 23, 42, 0.9) 78%);
          --milestone-glyph: rgba(254, 252, 232, 0.98);
        }

        .member-preview-card .goal-milestone-card--reveal {
          --milestone-accent: rgba(148, 163, 184, 0.9);
          --milestone-accent-soft: rgba(148, 163, 184, 0.22);
          --milestone-face: radial-gradient(circle at 35% 24%, rgba(226, 232, 240, 0.34), rgba(100, 116, 139, 0.24) 38%, rgba(30, 41, 59, 0.74) 62%, rgba(2, 6, 23, 0.96) 80%);
          --milestone-glyph: rgba(226, 232, 240, 0.94);
        }

        .member-preview-card .goal-milestone-card::before,
        .member-preview-card .goal-milestone-card::after,
        .member-preview-card .goal-milestone-card__stone::before,
        .member-preview-card .goal-milestone-card__stone::after {
          content: none !important;
          display: none !important;
        }

        .member-preview-card .goal-milestone-card__stone {
          background: transparent !important;
          border-radius: 999px !important;
          contain: none !important;
          display: grid !important;
          filter:
            drop-shadow(0 7px 10px rgba(2, 7, 19, 0.42))
            drop-shadow(0 0 12px var(--milestone-accent-soft));
          margin-inline: auto !important;
          overflow: visible !important;
          place-items: center !important;
          position: relative !important;
          transform: translateY(0) rotateY(0deg) !important;
          transform-origin: center center !important;
          transform-style: preserve-3d !important;
          transition:
            filter 640ms cubic-bezier(0.2, 0.8, 0.2, 1),
            transform 640ms cubic-bezier(0.2, 0.8, 0.2, 1) !important;
          will-change: transform;
        }

        .member-preview-card .goal-milestone-card:hover,
        .member-preview-card .goal-milestone-card:focus-within {
          z-index: 50 !important;
        }

        .member-preview-card .goal-milestone-card:hover .goal-milestone-card__stone,
        .member-preview-card .goal-milestone-card:focus-within .goal-milestone-card__stone {
          filter:
            drop-shadow(0 10px 13px rgba(2, 7, 19, 0.5))
            drop-shadow(0 0 18px var(--milestone-accent-soft));
          transform: translateY(-2px) rotateY(180deg) !important;
        }

        .member-preview-card .goal-milestone-card__face {
          backface-visibility: hidden !important;
          border-radius: inherit;
          display: grid !important;
          inset: 0 !important;
          overflow: hidden !important;
          place-items: center !important;
          pointer-events: none;
          position: absolute !important;
          transform-style: preserve-3d !important;
        }

        .member-preview-card .goal-milestone-card__face--image {
          background: #0f172a;
          box-shadow:
            inset 0 0 0 1px rgba(255, 255, 255, 0.12),
            inset 0 -5px 8px rgba(2, 7, 19, 0.34),
            0 0 14px var(--milestone-accent-soft);
          opacity: 1 !important;
          transform: rotateY(0deg) translateZ(1px) !important;
        }

        .member-preview-card .goal-milestone-card__face--icon {
          background:
            var(--milestone-face),
            radial-gradient(circle at 48% 44%, rgba(255, 255, 255, 0.14), transparent 42%),
            linear-gradient(145deg, rgba(15, 23, 42, 0.94), rgba(2, 6, 23, 0.98));
          box-shadow:
            inset 0 0 0 2px rgba(255, 255, 255, 0.13),
            inset 0 0 0 8px rgba(2, 6, 23, 0.22),
            0 0 22px var(--milestone-accent-soft);
          opacity: 1 !important;
          transform: rotateY(180deg) translateZ(1px) !important;
        }

        .member-preview-card .goal-milestone-card__face--image .goal-milestone-card__texture,
        .member-preview-card .goal-milestone-card:hover .goal-milestone-card__face--image .goal-milestone-card__texture,
        .member-preview-card .goal-milestone-card:focus-within .goal-milestone-card__face--image .goal-milestone-card__texture {
          filter: contrast(1.08) saturate(0.9) !important;
          height: 100% !important;
          inset: 0 !important;
          max-height: none !important;
          max-width: none !important;
          mix-blend-mode: normal !important;
          object-fit: cover !important;
          opacity: 1 !important;
          position: absolute !important;
          transform: none !important;
          width: 100% !important;
          z-index: 1 !important;
        }

        .member-preview-card .goal-milestone-card__face--icon .goal-milestone-card__webgl {
          aspect-ratio: 1 / 1 !important;
          display: block !important;
          filter:
            drop-shadow(0 0 10px var(--milestone-accent-soft))
            drop-shadow(0 0 8px rgba(226, 232, 240, 0.22));
          height: 2.55rem !important;
          inset: auto !important;
          max-height: none !important;
          max-width: none !important;
          min-height: 2.55rem !important;
          min-width: 2.55rem !important;
          opacity: 1 !important;
          position: relative !important;
          transform: translateZ(14px) scale(1) !important;
          width: 2.55rem !important;
          z-index: 3 !important;
        }

        .member-preview-card .goal-milestone-card:hover .goal-milestone-card__face--icon .goal-milestone-card__webgl,
        .member-preview-card .goal-milestone-card:focus-within .goal-milestone-card__face--icon .goal-milestone-card__webgl {
          opacity: 1 !important;
          transform: translateZ(14px) scale(1) !important;
        }

        .member-preview-card .goal-milestone-card__face--icon .goal-milestone-card__webgl > canvas,
        .member-preview-card .goal-milestone-card__face--icon .goal-milestone-card__webgl > svg,
        .member-preview-card .goal-milestone-card__face--icon .goal-milestone-card__webgl > .dashboard-webgl-snapshot-layer {
          height: 100% !important;
          inset: 0 !important;
          max-height: none !important;
          max-width: none !important;
          object-fit: contain !important;
          opacity: 1 !important;
          position: absolute !important;
          transform: none !important;
          width: 100% !important;
        }

        .member-preview-card .goal-milestone-card:hover .goal-milestone-card__face--icon .goal-milestone-card__webgl > canvas,
        .member-preview-card .goal-milestone-card:hover .goal-milestone-card__face--icon .goal-milestone-card__webgl > svg,
        .member-preview-card .goal-milestone-card:hover .goal-milestone-card__face--icon .goal-milestone-card__webgl > .dashboard-webgl-snapshot-layer,
        .member-preview-card .goal-milestone-card:focus-within .goal-milestone-card__face--icon .goal-milestone-card__webgl > canvas,
        .member-preview-card .goal-milestone-card:focus-within .goal-milestone-card__face--icon .goal-milestone-card__webgl > svg,
        .member-preview-card .goal-milestone-card:focus-within .goal-milestone-card__face--icon .goal-milestone-card__webgl > .dashboard-webgl-snapshot-layer {
          opacity: 1 !important;
        }

        .member-preview-card .goal-milestone-card .goal-milestone-card__face--icon svg.goal-milestone-card__fallback-icon {
          color: var(--milestone-glyph) !important;
          filter:
            drop-shadow(0 0 0.28rem rgba(255, 255, 255, 0.34))
            drop-shadow(0 0 0.72rem var(--milestone-accent-soft)) !important;
          height: 1.65rem !important;
          left: 50% !important;
          max-height: none !important;
          max-width: none !important;
          min-height: 1.65rem !important;
          min-width: 1.65rem !important;
          opacity: 0.95 !important;
          position: absolute !important;
          stroke-width: 2.7 !important;
          top: 50% !important;
          transform: translate(-50%, -50%) translateZ(30px) !important;
          width: 1.65rem !important;
          z-index: 8 !important;
        }

        .member-profile-shadow {
          --member-profile-shadow-scale: 0.96;
          animation: member-profile-shadow-rotate 18s linear infinite;
          background:
            conic-gradient(
              from 30deg,
              rgba(34, 211, 238, 0),
              rgba(34, 211, 238, 0.42),
              rgba(250, 204, 21, 0.32),
              rgba(56, 189, 248, 0.22),
              rgba(15, 23, 42, 0.76),
              rgba(34, 211, 238, 0)
            ),
            radial-gradient(circle at 36% 30%, rgba(255, 255, 255, 0.2), transparent 20%),
            radial-gradient(circle, rgba(15, 23, 42, 0.88), rgba(2, 7, 19, 0.5) 62%, transparent 72%);
          box-shadow:
            inset 0 0 24px rgba(2, 7, 19, 0.78),
            0 0 26px rgba(34, 211, 238, 0.16);
          opacity: 0.42;
          transform: rotate(0deg) scale(var(--member-profile-shadow-scale));
          transition:
            animation-duration 260ms ease,
            opacity 260ms ease,
            filter 260ms ease;
          will-change: transform, opacity;
        }

        .member-profile-shadow::before,
        .member-profile-shadow::after {
          border-radius: inherit;
          content: "";
          position: absolute;
        }

        .member-profile-shadow::before {
          background:
            radial-gradient(circle at 50% 33%, rgba(226, 232, 240, 0.18) 0 16%, transparent 17%),
            radial-gradient(ellipse at 50% 72%, rgba(226, 232, 240, 0.16) 0 28%, transparent 29%);
          inset: 18%;
          opacity: 0.6;
        }

        .member-profile-shadow::after {
          background: radial-gradient(circle, transparent 52%, rgba(2, 7, 19, 0.62) 70%, transparent 72%);
          inset: 8%;
        }

        .member-profile-avatar:hover .member-profile-shadow {
          --member-profile-shadow-scale: 1.05;
          animation-duration: 7s;
          filter: drop-shadow(0 0 16px rgba(34, 211, 238, 0.28));
          opacity: 0.76;
        }

        .member-profile-avatar:has(.member-coach-badge:hover) .member-profile-shadow {
          --member-profile-shadow-scale: 1;
          animation-duration: 18s;
          filter: none;
          opacity: 0.42;
        }

        .member-coach-badge {
          transform: translate3d(0, 0, 0) rotate(0deg);
          transition:
            border-color 260ms ease,
            box-shadow 260ms ease,
            transform 360ms cubic-bezier(0.2, 0.8, 0.2, 1);
          will-change: transform;
        }

        .member-coach-badge::before,
        .member-coach-badge::after {
          border-radius: 9999px;
          content: "";
          inset: -0.28rem;
          opacity: 0;
          pointer-events: none;
          position: absolute;
          transition:
            opacity 260ms ease,
            transform 360ms cubic-bezier(0.2, 0.8, 0.2, 1);
        }

        .member-coach-badge::before {
          background:
            conic-gradient(
              from 0deg,
              transparent 0 18%,
              rgba(191, 219, 254, 0.94) 24%,
              rgba(34, 211, 238, 0.92) 34%,
              transparent 46% 100%
            );
          filter: drop-shadow(0 0 10px rgba(125, 211, 252, 0.55));
          z-index: -2;
        }

        .member-coach-badge::after {
          background:
            radial-gradient(circle at 45% 35%, rgba(186, 230, 253, 0.24), transparent 45%),
            radial-gradient(circle, transparent 58%, rgba(14, 165, 233, 0.38) 62%, transparent 68%);
          box-shadow:
            0 0 20px rgba(56, 189, 248, 0.36),
            inset 0 0 18px rgba(125, 211, 252, 0.18);
          z-index: -1;
        }

        .member-coach-avatar {
          transition:
            filter 260ms ease,
            transform 360ms cubic-bezier(0.2, 0.8, 0.2, 1);
          will-change: transform, filter;
        }

        .member-coach-badge:hover {
          border-color: rgba(186, 230, 253, 0.98);
          box-shadow:
            0 0 22px rgba(56, 189, 248, 0.5),
            0 0 38px rgba(125, 211, 252, 0.22),
            inset 0 0 12px rgba(186, 230, 253, 0.16);
          transform: translate3d(0.08rem, -0.12rem, 0) rotate(8deg) scale(1.08);
        }

        .member-coach-badge:hover::before {
          animation: member-coach-ring-rotate 2.8s linear infinite;
          opacity: 0.95;
        }

        .member-coach-badge:hover::after {
          opacity: 1;
          transform: scale(1.1);
        }

        .member-coach-badge:hover .member-coach-avatar {
          filter:
            brightness(1.18)
            contrast(1.08)
            saturate(1.18)
            drop-shadow(0 0 16px rgba(186, 230, 253, 0.72));
          transform: rotate(-6deg) scale(1.04);
        }

        @keyframes member-coach-ring-rotate {
          0% {
            transform: rotate(0deg) scale(1);
          }

          50% {
            transform: rotate(180deg) scale(1.08);
          }

          100% {
            transform: rotate(360deg) scale(1);
          }
        }

        @keyframes member-profile-shadow-rotate {
          0% {
            transform: rotate(0deg) scale(var(--member-profile-shadow-scale));
          }

          50% {
            transform: rotate(180deg) scale(calc(var(--member-profile-shadow-scale) + 0.025));
          }

          100% {
            transform: rotate(360deg) scale(var(--member-profile-shadow-scale));
          }
        }

        @keyframes sound-rainbow-glyph-color {
          0% {
            color: #67e8f9;
            filter: drop-shadow(0 0 6px rgba(103, 232, 249, 0.38));
          }
          31% {
            color: #bae6fd;
            filter: drop-shadow(0 0 5px rgba(125, 211, 252, 0.24));
          }
          40% {
            color: #ffffff;
            filter:
              drop-shadow(0 0 6px rgba(255, 255, 255, 0.5))
              drop-shadow(0 0 12px rgba(125, 211, 252, 0.26));
          }
          47% {
            color: #fde68a;
            filter:
              drop-shadow(0 0 7px rgba(253, 230, 138, 0.34))
              drop-shadow(0 0 14px rgba(125, 211, 252, 0.22));
          }
          53%,
          100% {
            color: #67e8f9;
            filter: drop-shadow(0 0 6px rgba(103, 232, 249, 0.38));
          }
        }

        @keyframes sound-rainbow-arrow-nudge {
          0%,
          30%,
          53%,
          100% {
            transform: translateX(0);
          }
          40% {
            transform: translateX(2px);
          }
        }

        @keyframes sound-rainbow-letter-wave {
          0%,
          25.5%,
          53%,
          100% {
            baseline-shift: 0;
            filter:
              brightness(1.12)
              drop-shadow(0 1px 0 rgba(2, 7, 19, 0.9));
            transform: translateY(0);
          }
          7.5% {
            baseline-shift: 4px;
            filter:
              brightness(1.65)
              drop-shadow(0 1px 0 rgba(2, 7, 19, 0.95))
              drop-shadow(0 0 4px rgba(255, 255, 255, 0.62));
            transform: translateY(-2.6px);
          }
          15% {
            baseline-shift: -1px;
            filter:
              brightness(1.22)
              drop-shadow(0 1px 0 rgba(2, 7, 19, 0.9));
            transform: translateY(0.9px);
          }
        }

        @keyframes sound-rainbow-button-finale {
          0%,
          44%,
          64%,
          100% {
            border-color: rgba(186, 230, 253, 0.3);
            box-shadow:
              0 10px 24px rgba(15, 23, 42, 0.36),
              0 0 18px rgba(37, 99, 235, 0.14),
              inset 0 1px 0 rgba(255, 255, 255, 0.24);
          }
          50% {
            border-color: rgba(224, 242, 254, 0.62);
            box-shadow:
              0 14px 30px rgba(14, 165, 233, 0.22),
              0 0 30px rgba(125, 211, 252, 0.2),
              0 0 42px rgba(99, 102, 241, 0.14),
              inset 0 1px 0 rgba(255, 255, 255, 0.42);
          }
          58% {
            border-color: rgba(125, 211, 252, 0.46);
            box-shadow:
              0 12px 26px rgba(15, 23, 42, 0.32),
              0 0 24px rgba(45, 212, 191, 0.14),
              0 0 34px rgba(125, 211, 252, 0.15),
              inset 0 1px 0 rgba(255, 255, 255, 0.34);
          }
        }

        @keyframes sound-rainbow-button-wash {
          0%,
          45%,
          66%,
          100% {
            opacity: 0;
            transform: scale(0.94);
          }
          52% {
            opacity: 0.28;
            transform: scale(1);
          }
          59% {
            opacity: 0.14;
            transform: scale(1.035);
          }
        }

        @keyframes sound-rainbow-button-sheen {
          0%,
          42%,
          68%,
          100% {
            opacity: 0;
            transform: translateX(-54%) skewX(-14deg);
          }
          51% {
            opacity: 0.34;
            transform: translateX(4%) skewX(-14deg);
          }
          58% {
            opacity: 0.18;
            transform: translateX(56%) skewX(-14deg);
          }
        }

        .sound-rainbow-cta {
          --sound-rainbow-cycle: 8.8s;
          animation: sound-rainbow-button-finale var(--sound-rainbow-cycle) cubic-bezier(0.42, 0, 0.2, 1) infinite;
          background:
            radial-gradient(circle at 24% 18%, rgba(255, 255, 255, 0.18), transparent 28%),
            radial-gradient(circle at 58% 42%, rgba(125, 211, 252, 0.14), transparent 44%),
            linear-gradient(120deg, rgba(15, 23, 42, 0.98) 0%, rgba(30, 64, 175, 0.92) 40%, rgba(14, 165, 233, 0.8) 52%, rgba(37, 99, 235, 0.92) 64%, rgba(30, 27, 75, 0.98) 100%);
          background-size: 100% 100%;
          box-shadow:
            0 10px 24px rgba(15, 23, 42, 0.36),
            0 0 18px rgba(37, 99, 235, 0.14),
            inset 0 1px 0 rgba(255, 255, 255, 0.24);
          isolation: isolate;
          will-change: border-color, box-shadow;
        }

        .sound-rainbow-cta::before {
          animation: sound-rainbow-button-sheen var(--sound-rainbow-cycle) cubic-bezier(0.42, 0, 0.2, 1) infinite;
          background:
            linear-gradient(
              105deg,
              transparent 0 34%,
              rgba(255, 255, 255, 0.06) 40%,
              rgba(255, 255, 255, 0.34) 48%,
              rgba(186, 230, 253, 0.22) 54%,
              transparent 64% 100%
            );
          content: "";
          inset: -42% -58%;
          opacity: 0;
          pointer-events: none;
          position: absolute;
          z-index: 1;
        }

        .sound-rainbow-cta::after {
          animation: sound-rainbow-button-wash var(--sound-rainbow-cycle) cubic-bezier(0.42, 0, 0.2, 1) infinite;
          background:
            radial-gradient(ellipse at 58% 48%, rgba(255, 255, 255, 0.2), transparent 48%),
            radial-gradient(ellipse at 50% 62%, rgba(125, 211, 252, 0.14), transparent 66%);
          border-radius: inherit;
          content: "";
          inset: 1px;
          opacity: 0;
          pointer-events: none;
          position: absolute;
          z-index: 1;
        }

        .sound-rainbow-cta > * {
          position: relative;
          z-index: 2;
        }

        .sound-rainbow-cta .sound-rainbow-cta__glyph,
        .sound-rainbow-cta .sound-rainbow-cta__arrow {
          animation: sound-rainbow-glyph-color var(--sound-rainbow-cycle) ease-in-out infinite;
          will-change: color, filter, transform;
        }

        .sound-rainbow-cta .sound-rainbow-cta__arrow {
          animation:
            sound-rainbow-glyph-color var(--sound-rainbow-cycle) ease-in-out infinite,
            sound-rainbow-arrow-nudge var(--sound-rainbow-cycle) ease-in-out infinite;
        }

        .sound-rainbow-wordart {
          filter:
            drop-shadow(0 -0.5px 0 rgba(255, 255, 255, 0.2))
            drop-shadow(0 1px 0 rgba(2, 7, 19, 0.7));
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
          animation: none;
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

        @keyframes sound-cta-hologram-float {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(0);
          }
        }

        @keyframes sound-cta-hologram-scan {
          0%, 100% {
            background-position: 120% 0, 0 0;
            opacity: 0.36;
          }
          48% {
            background-position: -20% 0, 0 6px;
            opacity: 0.72;
          }
        }

        .sound-cta-face-content {
          align-items: center;
          background:
            linear-gradient(115deg, rgba(255, 255, 255, 0.2), transparent 28%, rgba(255, 255, 255, 0.12) 52%, transparent 78%),
            var(--sound-cta-holo-bg, rgba(14, 165, 233, 0.16));
          border: 1px solid var(--sound-cta-holo-border, rgba(186, 230, 253, 0.72));
          border-radius: inherit;
          box-shadow:
            0 0 16px var(--sound-cta-holo-glow, rgba(56, 189, 248, 0.42)),
            inset 0 0 14px rgba(255, 255, 255, 0.12),
            inset 0 1px 0 rgba(255, 255, 255, 0.38);
          box-sizing: border-box;
          height: 100%;
          isolation: isolate;
          inset: 0;
          justify-content: center;
          overflow: visible;
          padding: 0 0.88rem;
          position: absolute;
          text-align: center;
          transform: translateY(0);
          transform-origin: center;
          width: 100%;
          z-index: 2;
          animation: sound-cta-hologram-float 3.2s ease-in-out infinite;
          will-change: transform;
        }

        .sound-cta-face-content::before {
          background:
            linear-gradient(90deg, transparent 0%, var(--sound-cta-holo-line, rgba(255, 255, 255, 0.48)) 50%, transparent 100%),
            repeating-linear-gradient(180deg, rgba(255, 255, 255, 0.18) 0 1px, transparent 1px 5px);
          border-radius: inherit;
          content: "";
          inset: 0;
          mix-blend-mode: screen;
          opacity: 0.4;
          pointer-events: none;
          position: absolute;
          z-index: 0;
          animation: sound-cta-hologram-scan 2.8s ease-in-out infinite;
        }

        .sound-cta-face-content::after {
          background: radial-gradient(ellipse at center, var(--sound-cta-holo-glow, rgba(56, 189, 248, 0.42)), transparent 68%);
          content: "";
          filter: blur(10px);
          inset: -0.55rem -0.8rem;
          opacity: 0.54;
          pointer-events: none;
          position: absolute;
          z-index: -1;
        }

        .sound-cta-face-content > * {
          position: relative;
          z-index: 1;
        }

        .sound-app-cta .sound-cta-face-content {
          --sound-cta-holo-bg: rgba(20, 184, 166, 0.24);
          --sound-cta-holo-border: rgba(204, 251, 241, 0.74);
          --sound-cta-holo-glow: rgba(45, 212, 191, 0.6);
          --sound-cta-holo-line: rgba(240, 253, 250, 0.58);
          color: #ecfffb;
          filter:
            drop-shadow(0 0 7px rgba(20, 184, 166, 0.55))
            drop-shadow(0 1px 0 rgba(0, 41, 38, 0.42));
        }

        .sound-rainbow-cta .sound-cta-face-content {
          --sound-cta-holo-bg: rgba(59, 130, 246, 0.24);
          --sound-cta-holo-border: rgba(191, 219, 254, 0.72);
          --sound-cta-holo-glow: rgba(96, 165, 250, 0.62);
          --sound-cta-holo-line: rgba(254, 243, 199, 0.62);
          color: #fff7d6;
          filter:
            drop-shadow(0 0 8px rgba(59, 130, 246, 0.58))
            drop-shadow(0 1px 0 rgba(2, 7, 19, 0.62));
        }

        .sound-app-cta > canvas[data-marketing-cta-renderer],
        .sound-rainbow-cta > canvas[data-marketing-cta-renderer],
        .sound-app-cta > .dashboard-webgl-snapshot-layer,
        .sound-rainbow-cta > .dashboard-webgl-snapshot-layer {
          border-radius: inherit !important;
          display: block !important;
          height: 100% !important;
          inset: 0 !important;
          min-height: 0 !important;
          min-width: 0 !important;
          object-fit: cover !important;
          pointer-events: none !important;
          position: absolute !important;
          width: 100% !important;
          z-index: 0 !important;
        }

        .sound-app-cta,
        .sound-rainbow-cta,
        .sound-app-cta:hover,
        .sound-rainbow-cta:hover,
        .sound-app-cta:focus-visible,
        .sound-rainbow-cta:focus-visible {
          background: transparent !important;
          border-color: transparent !important;
          box-shadow: none !important;
        }

        .sound-app-cta__shine,
        .sound-rainbow-cta::after {
          content: none !important;
          display: none !important;
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
          color: inherit;
          display: inline-block;
          position: relative;
          text-shadow:
            0 0 8px rgba(204, 251, 241, 0.48),
            0 1px 0 rgba(0, 35, 32, 0.4);
        }

        .sound-app-cta__label::after {
          content: none;
          display: none;
        }

        .member-feature-panel > summary {
          list-style: none;
        }

        .member-feature-panel > summary::-webkit-details-marker {
          display: none;
        }

        .member-feature-panel__timer {
          align-items: center;
          border-radius: 999px;
          display: grid;
          height: 1.28rem;
          isolation: isolate;
          justify-items: center;
          position: absolute;
          right: 0.56rem;
          top: 0.48rem;
          width: 1.28rem;
          z-index: 3;
        }

        .member-feature-panel__timer::before {
          background:
            radial-gradient(circle, rgba(255, 255, 255, 0.22), transparent 34%),
            radial-gradient(circle, rgba(34, 211, 238, 0.24), transparent 72%);
          border-radius: inherit;
          content: "";
          filter: blur(0.18rem);
          inset: -0.2rem;
          opacity: 0.34;
          position: absolute;
          transition: opacity 220ms ease;
          z-index: 0;
        }

        .member-feature-panel__timer-ring {
          height: 100%;
          overflow: visible;
          position: relative;
          transform: rotate(-90deg);
          width: 100%;
          z-index: 1;
        }

        .member-feature-panel__timer-track,
        .member-feature-panel__timer-bar {
          fill: rgba(2, 7, 19, 0.54);
          stroke-width: 3.8;
          vector-effect: non-scaling-stroke;
        }

        .member-feature-panel__timer-track {
          stroke: rgba(186, 230, 253, 0.2);
        }

        .member-feature-panel__timer-bar {
          filter:
            drop-shadow(0 0 0.24rem rgba(103, 232, 249, 0.48))
            drop-shadow(0 0 0.42rem rgba(250, 204, 21, 0.24));
          stroke: rgba(165, 243, 252, 0.92);
          stroke-dasharray: 1;
          stroke-dashoffset: 1;
          stroke-linecap: round;
          transition: stroke-dashoffset 90ms linear;
        }

        .member-feature-panel[data-member-feature-active="true"] .member-feature-panel__timer::before {
          opacity: 0.78;
        }

        .member-feature-panel[data-member-feature-active="true"] .member-feature-panel__timer-track {
          stroke: rgba(186, 230, 253, 0.32);
        }

        .member-feature-panel {
          interpolate-size: allow-keywords;
          transition:
            background 280ms ease,
            border-color 280ms ease,
            box-shadow 280ms ease,
            transform 280ms ease;
        }

        .member-feature-panel[open] {
          background:
            radial-gradient(circle at 16% 0%, rgba(34, 211, 238, 0.18), transparent 34%),
            linear-gradient(180deg, rgba(13, 38, 62, 0.86), rgba(2, 7, 19, 0.46));
          border-color: rgba(125, 211, 252, 0.32);
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.08),
            0 0 0 1px rgba(34, 211, 238, 0.08),
            0 18px 42px rgba(8, 47, 73, 0.22);
          transform: translateY(-1px);
        }

        .member-feature-panel::details-content {
          block-size: 0;
          content-visibility: hidden;
          opacity: 0;
          overflow: clip;
          transform: translateY(-10px);
          transition:
            block-size 380ms cubic-bezier(0.2, 0.9, 0.22, 1),
            content-visibility 380ms allow-discrete,
            opacity 260ms ease,
            transform 380ms cubic-bezier(0.2, 0.9, 0.22, 1);
        }

        .member-feature-panel[open]::details-content {
          block-size: auto;
          content-visibility: visible;
          opacity: 1;
          transform: translateY(0);
        }

        .member-feature-panel:not([open]) > .member-feature-panel__body {
          display: none;
        }

        .member-feature-panel__body {
          transform-origin: top center;
        }

        .member-feature-panel[open] .member-feature-panel__body {
          animation: member-feature-panel-body-reveal 320ms cubic-bezier(0.2, 0.9, 0.22, 1);
        }

        .member-feature-panel[open] .member-feature-panel__chevron {
          transform: rotate(180deg);
        }

        @keyframes member-feature-panel-body-reveal {
          0% {
            opacity: 0;
            transform: translateY(-8px) scaleY(0.98);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scaleY(1);
          }
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

        .sound-site-header-grid {
          display: grid;
          grid-template-columns: minmax(15.5rem, max-content) minmax(0, 1fr);
          align-items: start;
          column-gap: clamp(1rem, 3.4vw, 3.25rem);
          row-gap: 0.7rem;
        }

        .sound-site-header-brand {
          justify-self: start;
        }

        .sound-site-header-brand > img {
          transition:
            filter 260ms ease,
            height 260ms ease,
            transform 260ms ease,
            width 260ms ease;
        }

        .sound-site-header-brand:has(.marketing-header-logo-3d--at-top) > img {
          filter:
            drop-shadow(0 0 12px rgba(125, 211, 252, 0.22))
            drop-shadow(0 0 16px rgba(249, 115, 22, 0.12));
          height: clamp(4.25rem, 6.2vw, 4.85rem);
          transform: translateY(-0.12rem);
          width: clamp(4.25rem, 6.2vw, 4.85rem);
        }

        .sound-site-header-actions {
          display: grid;
          grid-template-columns: minmax(0, 1fr) max-content;
          grid-template-areas: "primary secondary";
          align-items: end;
          justify-content: stretch;
          justify-items: stretch;
          gap: 0.65rem 1.15rem;
          min-width: 0;
          width: 100%;
        }

        .sound-site-header-primary-actions {
          grid-area: primary;
          align-items: center;
          justify-content: center;
          justify-self: center;
        }

        .sound-site-header-signin {
          align-self: end;
          justify-self: end;
        }

        .sound-site-header-secondary-actions {
          align-self: end;
          display: flex;
          flex-direction: column;
          gap: 0.55rem;
          grid-area: secondary;
          isolation: isolate;
          min-width: max-content;
          justify-self: end;
          position: relative;
          z-index: 20;
        }

        .sound-site-header-render-toggle {
          align-self: end;
        }

        @media (max-width: 1040px) and (min-width: 760px) {
          .sound-site-header-grid {
            grid-template-columns: minmax(14.5rem, max-content) minmax(0, 1fr);
            column-gap: clamp(0.65rem, 2vw, 1.75rem);
          }

          .sound-site-header-actions {
            grid-template-columns: minmax(0, 1fr) max-content;
            grid-template-areas: "primary secondary";
            align-content: end;
            align-items: end;
            justify-items: stretch;
          }

          .sound-site-header-secondary-actions {
            align-self: end;
            gap: 0.6rem;
          }
        }

        @media (max-width: 759px) {
          .sound-site-header-grid {
            grid-template-columns: 1fr;
            justify-items: center;
          }

          .sound-site-header-brand {
            justify-self: center;
          }

          .sound-site-header-brand:has(.marketing-header-logo-3d--at-top) > img {
            height: clamp(3.2rem, 15vw, 3.6rem);
            width: clamp(3.2rem, 15vw, 3.6rem);
          }

          .sound-site-header-actions {
            width: 100%;
            grid-template-columns: 1fr;
            grid-template-areas:
              "primary"
              "secondary";
            row-gap: 0.65rem;
            justify-items: center;
          }

          .sound-site-header-primary-actions {
            width: min(100%, 32rem);
            justify-content: center;
          }

          .sound-site-header-secondary-actions {
            justify-self: end;
            margin-right: clamp(0rem, 4vw, 1.25rem);
          }

          .sound-site-header-signin {
            margin-right: 0;
          }
        }

        @media (max-width: 759px) and (min-width: 480px) {
          .sound-site-header-actions {
            align-items: end;
            gap: 0.35rem 0;
            grid-template-columns: 1fr;
            grid-template-areas:
              "primary"
              "secondary";
            justify-content: stretch;
            justify-items: center;
          }

          .sound-site-header-primary-actions {
            width: auto;
            justify-content: center;
          }

          .sound-site-header-actions .sound-app-cta,
          .sound-site-header-actions .sound-rainbow-cta {
            height: 44px;
            width: 8.9rem;
            padding-left: 0.6rem;
            padding-right: 0.6rem;
            font-size: 8px;
            transition:
              filter 260ms ease,
              height 260ms ease,
              padding 260ms ease,
              transform 260ms ease,
              width 260ms ease;
          }

          .sound-site-header-actions .sound-rainbow-wordart {
            height: 1.72rem;
            width: 4.65rem;
            transition:
              height 260ms ease,
              width 260ms ease;
          }

          .sound-site-header-actions .sound-rainbow-cta__glyph,
          .sound-site-header-actions .sound-rainbow-cta__arrow,
          .sound-site-header-actions .sound-cta-face-content > svg:not(.sound-rainbow-wordart) {
            height: 0.78rem;
            width: 0.78rem;
            transition:
              height 260ms ease,
              width 260ms ease;
          }

          .sound-site-header-brand:has(.marketing-header-logo-3d--at-top) ~ .sound-site-header-actions .sound-app-cta,
          .sound-site-header-brand:has(.marketing-header-logo-3d--at-top) ~ .sound-site-header-actions .sound-rainbow-cta {
            height: 52px;
            width: 10.15rem;
            padding-left: 0.75rem;
            padding-right: 0.75rem;
            font-size: 9px;
          }

          .sound-site-header-brand:has(.marketing-header-logo-3d--at-top) ~ .sound-site-header-actions .sound-rainbow-wordart {
            height: 2rem;
            width: 5.35rem;
          }

          .sound-site-header-brand:has(.marketing-header-logo-3d--at-top) ~ .sound-site-header-actions .sound-rainbow-cta__glyph,
          .sound-site-header-brand:has(.marketing-header-logo-3d--at-top) ~ .sound-site-header-actions .sound-rainbow-cta__arrow,
          .sound-site-header-brand:has(.marketing-header-logo-3d--at-top) ~ .sound-site-header-actions .sound-cta-face-content > svg:not(.sound-rainbow-wordart) {
            height: 0.875rem;
            width: 0.875rem;
          }

          .sound-site-header-secondary-actions {
            align-self: end;
            justify-self: end;
            margin-right: 0;
          }
        }

        @media (max-width: 759px) and (min-width: 560px) {
          .sound-site-header-actions {
            grid-template-areas:
              "primary"
              "secondary";
            min-height: 76px;
            position: relative;
          }

          .sound-site-header-brand:has(.marketing-header-logo-3d--at-top) ~ .sound-site-header-actions {
            min-height: 86px;
          }

          .sound-site-header-primary-actions {
            justify-self: center;
          }

          .sound-site-header-secondary-actions {
            position: relative;
            right: auto;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          html.home-scroll-snap-enabled {
            scroll-behavior: auto;
            scroll-snap-type: y proximity;
          }

          .home-snap-section {
            transition: none;
          }

          .member-hero-aura,
          .member-hero-nebula,
          .member-hero-orbits,
          .member-hero-stars,
          .member-hero-twinkles,
          .member-hero-meteor,
          .goal-progress-bar__sweep,
          .goal-progress-bar__active-node,
          .goal-progress-bar__alert-dot,
          .sound-rainbow-cta,
          .sound-rainbow-cta::before,
          .sound-rainbow-cta::after,
          .sound-rainbow-cta__glyph,
          .sound-rainbow-cta__arrow,
          .sound-rainbow-wordart__letter,
          .sound-app-cta__label::after,
          .member-profile-shadow,
          .sound-energy-divider,
          .sound-energy-divider::before,
          .sound-energy-divider::after,
          .soft-urgency-dot {
            animation: none;
          }
        }
      `}</style>

      <header className="sticky top-0 z-[80] border-b border-white/10 bg-[#020713]/78 shadow-[0_18px_50px_rgba(0,0,0,0.28)] backdrop-blur-xl">
        <div className="sound-site-header-grid relative mx-auto flex w-full flex-col gap-3 px-5 py-2.5 sm:min-h-[8rem] sm:px-8 lg:grid lg:min-h-[7.5rem] lg:grid-cols-[minmax(0,max-content)_minmax(31rem,1fr)] lg:items-start lg:gap-x-8">
          <Link
            href={ROUTES.public.home}
            className="sound-site-header-brand group flex w-fit max-w-full min-w-0 items-center justify-center gap-2.5 self-center text-center sm:self-start sm:justify-start sm:text-left lg:justify-self-start"
          >
            <Image
              src="/sound-fitness-logo.png"
              alt="Sound Fitness"
              width={56}
              height={56}
              className="h-12 w-12 shrink-0 object-contain transition duration-300 group-hover:scale-105 sm:h-14 sm:w-14"
            />

            <div className="min-w-0">
              <MarketingHeaderLogo3D className="w-[8.9rem] max-w-[calc(100vw-7rem)] sm:w-[9.55rem]" />
              <SoundHeaderAppPill />
            </div>
          </Link>

          <div className="sound-site-header-actions flex w-full min-w-0 flex-col items-end gap-2 min-[560px]:grid min-[560px]:grid-cols-[minmax(0,1fr)_auto] min-[560px]:items-end min-[560px]:gap-x-3 min-[560px]:gap-y-0 lg:min-w-[31rem] lg:pt-1">
            <div className="sound-site-header-primary-actions z-10 flex w-full min-w-0 flex-row justify-center gap-1.5 min-[560px]:pr-0 lg:justify-center">
              <Link
                href="#top"
                className="sound-app-cta group relative inline-flex h-[52px] w-[10.75rem] shrink-0 items-center justify-center overflow-visible rounded-[0.72rem] border border-transparent px-3 py-1.5 text-center text-[9px] font-black uppercase tracking-[0.08em] text-emerald-950 transition duration-200 hover:-translate-y-0.5 hover:border-transparent hover:brightness-110 hover:shadow-[0_14px_30px_rgba(52,211,153,0.32),0_0_32px_rgba(45,212,191,0.18),inset_0_1px_0_rgba(255,255,255,0.48)] focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-100/75 sm:text-[10px] sm:tracking-[0.09em]"
              >
                <MarketingCtaButton3D active variant="app" />
                <span className="sound-cta-face-content relative z-10 flex min-w-0 items-center justify-center gap-2">
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
                className="sound-rainbow-cta group relative inline-flex h-[52px] w-[10.75rem] shrink-0 items-center justify-center gap-1 overflow-visible rounded-[0.72rem] border border-transparent px-2.5 py-1.5 text-center text-[9px] font-black uppercase tracking-[0.1em] text-white transition duration-200 hover:-translate-y-0.5 hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-100/75 sm:text-[10px] sm:tracking-[0.12em]"
              >
                <MarketingCtaButton3D active variant="intro" />
                <span className="sound-cta-face-content relative z-10 flex min-w-0 items-center justify-center gap-1">
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
                          style={{ animationDelay: `${index * 0.08}s` }}
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
                          style={{ animationDelay: `${(index + rainbowWordartTopLetters.length) * 0.08}s` }}
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
                </span>
              </Link>
            </div>

            <div className="sound-site-header-secondary-actions">
              <Link
                href={ROUTES.auth.login}
                className="sound-site-header-signin group inline-flex min-h-[32px] w-fit items-center justify-center gap-2 self-end whitespace-nowrap px-1 py-1 text-[9px] font-black uppercase tracking-[0.13em] text-slate-200 transition duration-200 hover:-translate-y-0.5 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300/60"
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
              <WebGlRenderModeToggle className="sound-site-header-render-toggle" />
            </div>
          </div>
        </div>
      </header>

      <section
        className="home-snap-section home-snap-section--top home-snap-section--member-preview-hero relative overflow-hidden border-b border-sky-400/10"
        data-home-snap-section="top"
      >
        <div
          aria-hidden="true"
          className="member-hero-space-effects pointer-events-none absolute inset-0 overflow-hidden"
        >
          <div className="member-hero-aura" />
          <div className="member-hero-nebula" />
          <div className="member-hero-orbits" />
          <div className="member-hero-stars member-hero-stars--far" />
          <div className="member-hero-stars member-hero-stars--near" />
          <div className="member-hero-twinkles" />
          <span className="member-hero-meteor member-hero-meteor--one" />
          <span className="member-hero-meteor member-hero-meteor--two" />
          <span className="member-hero-meteor member-hero-meteor--three" />
          <span className="member-hero-meteor member-hero-meteor--four" />
          <span className="member-hero-meteor member-hero-meteor--five" />
        </div>
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(6,17,31,0.76),rgba(2,7,19,0.34),rgba(2,7,19,0))]" />
        <div className="relative mx-auto max-w-7xl px-5 py-7 sm:px-8 lg:py-10">
          <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_20rem] md:items-center lg:grid-cols-[minmax(0,1fr)_24rem]">
            <div className="max-w-4xl">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex h-14 w-14 items-center justify-center [perspective:900px]">
                  <DashboardSpinningSoundCoin3D className="h-12 w-12 drop-shadow-[0_0_12px_rgba(250,204,21,0.24)]" />
                </div>
                <div className="w-[17rem] max-w-full">
                  <MarketingSectionHeading3D
                    className="member-preview-heading-3d h-10"
                    effects="starfield"
                    label="Early access preview"
                    lines={["Early access preview"]}
                    live={false}
                    scale="eyebrow"
                    variant="cyan"
                  />
                </div>
              </div>

              <h1 className="mt-1 max-w-4xl">
                <MarketingSectionHeading3D
                  className="member-preview-heading-3d member-preview-hero-heading-3d -ml-2 -mt-6 h-[220px] max-w-[calc(100vw-2.5rem)] sm:h-[260px] sm:max-w-[44rem] lg:h-[285px]"
                  effects="full"
                  label="Preview the member dashboard experience."
                  lines={["Preview the", "member", "dashboard", "experience."]}
                  scale="hero"
                  variant="ice"
                />
              </h1>
              <div className="sound-energy-divider mt-3 h-1.5 w-28 rounded-full bg-gradient-to-r from-sky-100 via-cyan-300 to-sky-500 shadow-[0_0_20px_rgba(125,211,252,0.34)]" />
              <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg sm:leading-8">
                See sample training, progress, coach messaging, and recovery
                panels before creating an account. Sign in when you are ready
                to access a private member dashboard.
              </p>
            </div>

            <aside className="member-preview-card relative overflow-hidden rounded-2xl border border-sky-400/20 bg-[radial-gradient(circle_at_14%_0%,rgba(34,211,238,0.16),transparent_32%),radial-gradient(circle_at_86%_8%,rgba(250,204,21,0.10),transparent_28%),rgba(2,7,19,0.78)] p-5 shadow-[0_28px_80px_rgba(2,6,23,0.36)]">
              <div className="pointer-events-none absolute -right-24 -top-20 z-0 h-72 w-72 opacity-[0.23] mix-blend-screen [mask-image:radial-gradient(ellipse_at_58%_44%,black_0_42%,rgba(0,0,0,0.72)_56%,transparent_74%)] sm:-right-28 sm:-top-24 sm:h-80 sm:w-80">
                <DashboardDumbbell3D
                  active
                  className="h-full w-full rotate-[-8deg]"
                  paused
                />
              </div>
      <div className="relative">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="member-profile-avatar relative isolate h-[4.5rem] w-[4.5rem] shrink-0">
              <span
                aria-hidden="true"
                className="member-profile-shadow pointer-events-none absolute -inset-5 z-0 rounded-full"
              />
              <span
                aria-hidden="true"
                className="pointer-events-none absolute -inset-2 z-10 rounded-full bg-[radial-gradient(circle,rgba(2,7,19,0.1),rgba(2,7,19,0.72)_72%,transparent_74%)]"
              />
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
              <div className="member-coach-badge absolute -bottom-2.5 -right-2.5 z-40 h-10 w-10 rounded-full border border-sky-300/70 bg-slate-950/80 p-[1px] shadow-[0_0_14px_rgba(56,189,248,0.28)]">
                <Image
                  src="/sound-coach-avatar-face-centered.png"
                  alt="Sample coach"
                  width={96}
                  height={96}
                  className="member-coach-avatar h-full w-full rounded-full object-cover object-center brightness-110 contrast-105 saturate-110 drop-shadow-[0_0_14px_rgba(125,211,252,0.5)]"
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
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.08] px-3 py-2.5 text-sm font-bold leading-6 text-slate-300">
                    <span className="whitespace-nowrap">Current focus</span>
                    <span className="flex max-w-full flex-wrap items-center justify-end gap-1.5">
                      <PreviewGoalIconCard goal="Strength" signal="Load" />
                      <PreviewGoalIconCard goal="Mobility" signal="Range" />
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
                      <div className="shrink-0 rounded-2xl border border-amber-100/22 bg-[radial-gradient(circle_at_30%_18%,rgba(254,240,138,0.2),rgba(15,23,42,0.72)_58%,rgba(2,6,23,0.92)_100%)] px-2.5 py-1.5 text-center shadow-[0_0_18px_rgba(250,204,21,0.1)]">
                        <div className="text-[7px] font-black uppercase tracking-[0.14em] text-amber-100/68">
                          Progress
                        </div>
                        <div className="mt-0.5 whitespace-nowrap text-base font-black leading-none text-amber-100">
                          7 / 12 lb
                        </div>
                        <div className="mt-1 rounded-full border border-amber-100/20 bg-amber-100/10 px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.1em] text-amber-50">
                          5 lb to go
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
                      <div className="goal-progress-bar relative h-3.5 overflow-visible rounded-[0.22rem] bg-slate-950/90 p-[2px] ring-1 ring-cyan-100/18 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_0_22px_rgba(14,165,233,0.12)]">
                        <div className="absolute inset-0 rounded-[0.22rem] bg-[linear-gradient(90deg,rgba(8,47,73,0.92),rgba(15,23,42,0.86)_66%,rgba(15,23,42,0.98))]" />
                        <div className="absolute inset-[2px] rounded-[0.14rem] bg-[repeating-linear-gradient(90deg,rgba(148,163,184,0.22)_0,rgba(148,163,184,0.22)_1px,transparent_1px,transparent_8px)] opacity-80" />
                        <div className="absolute inset-y-[2px] left-[64%] right-[2px] rounded-r-[0.14rem] bg-slate-900/82" />
                        <div className="absolute inset-y-[2px] left-[2px] w-[64%] overflow-hidden rounded-[0.14rem] bg-[linear-gradient(90deg,#22d3ee_0%,#38bdf8_36%,#99f6e4_58%,#fde68a_100%)] shadow-[0_0_20px_rgba(34,211,238,0.42),inset_0_1px_0_rgba(255,255,255,0.35)]">
                          <span className="goal-progress-bar__sweep absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-transparent via-white/55 to-transparent" />
                          <span className="absolute inset-0 bg-[repeating-linear-gradient(90deg,rgba(255,255,255,0.2)_0,rgba(255,255,255,0.2)_1px,transparent_1px,transparent_9px)] opacity-35" />
                        </div>
                        <div className="goal-progress-bar__current-label absolute left-[64%] top-full z-20 hidden min-w-[9rem] max-w-[10rem] -translate-x-1/2 translate-y-[0.42rem] items-center gap-1.5 rounded-full border border-amber-100/36 bg-slate-950/92 px-2.5 py-1 text-left shadow-[0_0_16px_rgba(250,204,21,0.18),0_0_24px_rgba(34,211,238,0.14)] backdrop-blur sm:inline-flex">
                          <span className="goal-progress-bar__alert-dot h-1.5 w-1.5 shrink-0 rounded-full bg-amber-200 shadow-[0_0_10px_rgba(251,191,36,0.62)]" />
                          <span className="min-w-0 leading-none">
                            <span className="block text-[7px] font-black uppercase tracking-[0.14em] text-sky-100">
                              Jul 15
                            </span>
                            <span className="mt-0.5 block truncate text-[7px] font-black uppercase tracking-[0.08em] text-amber-100">
                              Weekly check-in needed
                            </span>
                          </span>
                        </div>
                        <div className="absolute inset-y-[2px] left-[64%] w-5 -translate-x-1/2 rounded-full bg-cyan-100/30 blur-md" />
                        <span className="absolute left-[2px] top-1/2 h-2.5 w-[2px] -translate-y-1/2 rounded-[1px] bg-cyan-100/60 shadow-[0_0_10px_rgba(125,211,252,0.45)]" />
                        <span className="absolute left-[33%] top-1/2 h-3 w-px -translate-y-1/2 bg-white/35" />
                        <span className="absolute right-[2px] top-1/2 h-2.5 w-[2px] -translate-y-1/2 rounded-[1px] bg-slate-500/75" />
                        <span className="goal-progress-bar__active-node absolute left-[64%] top-1/2 z-10 grid h-5 w-5 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-amber-100/80 bg-[radial-gradient(circle_at_35%_30%,#ffffff_0%,#fde68a_26%,#22d3ee_72%,#0f172a_100%)] shadow-[0_0_0_3px_rgba(34,211,238,0.14),0_0_22px_rgba(250,204,21,0.24)]">
                          <span className="absolute -inset-1 rounded-full border border-cyan-200/18" />
                          <span className="absolute inset-[3px] rounded-full bg-slate-950/58" />
                          <span className="relative h-1.5 w-1.5 rounded-full bg-amber-100 shadow-[0_0_10px_rgba(254,240,138,0.78)]" />
                        </span>
                      </div>
                      <div
                        className="mt-9 grid grid-cols-3 gap-2"
                        aria-label="Plan accomplishment milestones"
                      >
                        {goalMilestones.map((milestone) => {
                          const MilestoneIcon3D = milestone.Icon3D;
                          const MilestoneFallbackIcon = milestone.FallbackIcon;

                          return (
                            <div
                              key={milestone.label}
                              className={`goal-milestone-card goal-milestone-card--${milestone.tone} relative min-w-0 px-0.5`}
                            >
                              <span className="goal-milestone-card__stone relative mx-auto block h-10 w-10 overflow-hidden rounded-full sm:h-11 sm:w-11">
                                <span
                                  aria-hidden="true"
                                  className="goal-milestone-card__face goal-milestone-card__face--image"
                                >
                                  <Image
                                    src="/member-preview-milestone-stone.png"
                                    alt=""
                                    fill
                                    sizes="44px"
                                    className="goal-milestone-card__texture object-cover"
                                  />
                                </span>
                                <span
                                  aria-hidden="true"
                                  className="goal-milestone-card__face goal-milestone-card__face--icon"
                                >
                                  <MilestoneFallbackIcon
                                    aria-hidden="true"
                                    className="goal-milestone-card__fallback-icon"
                                    strokeWidth={2.55}
                                  />
                                  <MilestoneIcon3D
                                    active
                                    className="goal-milestone-card__webgl"
                                  />
                                </span>
                              </span>
                              <span className="mt-1 block truncate text-[7px] font-black uppercase tracking-[0.1em] text-sky-50 sm:text-[8px]">
                                {milestone.label}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/[0.08] px-3 py-2.5 text-sm font-bold leading-6 text-slate-300">
                    <span className="whitespace-nowrap">Next objective</span>
                    <PreviewGoalIconCard
                      goal="Mobility"
                      label="Mobility reset"
                      signal="Next"
                    />
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
            <div className="relative grid sm:grid-cols-2">
              <MemberPreviewRowLabels3D
                className="z-20"
                labels={previewRows.map((row) => row.label)}
              />
              {previewRows.map((row) => {
                const Icon3D = row.Icon3D;
                const isFlowRow = row.label === "See the flow";

                return (
                  <div
                    key={row.label}
                    className="relative min-h-32 overflow-hidden p-4 sm:p-5"
                  >
                    <div className="relative min-w-0">
                      <div
                        className={`flex items-center ${
                          isFlowRow ? "gap-4" : "gap-3"
                        }`}
                      >
                        <span
                          className={`dashboard-webgl-snapshot-host relative shrink-0 overflow-visible ${
                            isFlowRow ? "h-14 w-14 -ml-1" : "h-9 w-9"
                          }`}
                        >
                          <span
                            aria-hidden="true"
                            className={`absolute rounded-full bg-cyan-300/10 blur-lg ${
                              isFlowRow ? "-inset-1 opacity-90" : "inset-1"
                            }`}
                          />
                          <Icon3D
                            active
                            paused
                            className={`relative z-10 h-full w-full ${
                              isFlowRow
                                ? "drop-shadow-[0_0_22px_rgba(34,211,238,0.62)]"
                                : "drop-shadow-[0_0_14px_rgba(34,211,238,0.42)]"
                            }`}
                          />
                        </span>
                        <div className="member-preview-row-label-fallback min-w-0 flex-1 text-[10px] font-black uppercase tracking-[0.14em] text-sky-300">
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
        className="home-snap-section mx-auto max-w-7xl scroll-mt-24 px-5 pb-14 sm:px-8"
        data-home-snap-section="member-app-preview"
      >
        <MarketingAppOrbitPreview />
      </section>

      <section
        className="home-snap-section mx-auto max-w-7xl px-5 pb-14 sm:px-8"
        data-home-snap-section="member-app-features"
      >
        <div className="relative">
          <div className="relative overflow-hidden border-b border-sky-300/15 pb-6">
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-cyan-300/80 via-amber-200/70 to-transparent shadow-[0_0_18px_rgba(125,211,252,0.2)]" />
            <div className="max-w-3xl">
              <div className="w-[16rem] max-w-full">
                <MarketingSectionHeading3D
                  className="member-preview-heading-3d h-10"
                  effects="starfield"
                  label="Member app features"
                  lines={["Member app features"]}
                  live={false}
                  scale="eyebrow"
                  variant="cyan"
                />
              </div>
              <h2 className="mt-1 max-w-4xl">
                <MarketingSectionHeading3D
                  className="member-preview-heading-3d -ml-2 -mt-4 h-[170px] max-w-[calc(100vw-4rem)] sm:h-[215px] sm:max-w-[38rem]"
                  label="Everything the app keeps organized."
                  lines={["Everything the app", "keeps organized."]}
                  live={false}
                  scale="hero"
                  variant="ice"
                />
              </h2>
              <div className="sound-energy-divider sound-energy-divider--thin mt-4 h-1 w-28 rounded-full bg-gradient-to-r from-amber-200 via-cyan-300 to-sky-500 shadow-[0_0_18px_rgba(125,211,252,0.28)]" />
              <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-300">
                The preview is sample data, but the member app is designed as a
                command center for training, recovery, nutrition, messaging,
                rewards, and the coaching context that keeps the work moving.
              </p>
            </div>
          </div>

          <MemberAppFeatureAccordion />

          <article className="group relative mt-3 pb-3 pt-5">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-200/80 to-transparent shadow-[0_0_16px_rgba(251,191,36,0.35)]" />
            <div className="flex items-start gap-2.5">
              <DashboardSparkles3D
                active
                className="-ml-1 -mt-1 h-7 w-7 shrink-0 drop-shadow-[0_0_16px_rgba(250,204,21,0.32)]"
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
                  expanding with rewards, reminders, support flows, and coaching
                  details around the way you train.
                </p>
              </div>
            </div>
          </article>
        </div>
      </section>

      <section
        id="member-app-pricing"
        className="home-snap-section home-snap-section--member-preview-pricing relative scroll-mt-24 overflow-hidden border-y border-sky-400/10 bg-[linear-gradient(180deg,rgba(2,7,19,0.98)_0%,rgba(7,24,44,0.92)_48%,rgba(2,7,19,0.98)_100%)] py-16"
        data-home-snap-section="member-app-pricing"
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-sky-200/60 to-transparent" />
        <div className="pointer-events-none absolute left-0 top-10 h-72 w-72 rounded-full bg-cyan-400/10 blur-3xl" />
        <div className="pointer-events-none absolute bottom-10 right-0 h-72 w-72 rounded-full bg-amber-200/10 blur-3xl" />
        <MemberAppPricingSelector />
      </section>

      <section
        className="home-snap-section home-snap-section--member-preview-real-life relative isolate overflow-hidden border-y border-sky-400/15 bg-[linear-gradient(135deg,rgba(2,7,19,0.98)_0%,rgba(8,28,50,0.96)_46%,rgba(2,7,19,0.98)_100%)] py-16"
        data-home-snap-section="fewer-barriers"
      >
        <div className="pointer-events-none absolute inset-0 z-0">
          <Image
            src="/member-preview-seattle-bg.png"
            alt=""
            fill
            sizes="100vw"
            className="object-cover object-[center_62%] opacity-[0.3] mix-blend-screen"
          />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(2,7,19,0.78)_0%,rgba(2,7,19,0.32)_42%,rgba(2,7,19,0.9)_100%),linear-gradient(90deg,rgba(2,7,19,0.78)_0%,rgba(2,7,19,0.18)_54%,rgba(2,7,19,0.7)_100%)]" />
        </div>
        <div className="pointer-events-none absolute inset-x-0 top-0 z-[1] h-px bg-gradient-to-r from-transparent via-cyan-200/70 to-transparent" />
        <div className="pointer-events-none absolute inset-0 z-[1] bg-[linear-gradient(90deg,transparent_0%,rgba(14,165,233,0.09)_52%,transparent_100%)]" />
        <Image
          src="/sound-token.png"
          alt=""
          width={260}
          height={260}
          className="pointer-events-none absolute -right-12 top-8 z-[1] h-64 w-64 object-contain opacity-[0.05] sm:right-6"
        />
        <div className="relative z-10 mx-auto max-w-7xl px-5 sm:px-8">
          <div className="grid gap-10 lg:grid-cols-[0.86fr_1.14fr] lg:items-end">
            <div>
              <div className="w-[20rem] max-w-full">
                <MarketingSectionHeading3D
                  className="member-preview-heading-3d h-14"
                  deferMs={2500}
                  label="Built for real life"
                  lines={["Built for real life"]}
                  live={false}
                  scale="eyebrow"
                  variant="cyan"
                />
              </div>
              <h2 className="mt-2 max-w-3xl">
                <MarketingSectionHeading3D
                  className="member-preview-heading-3d -ml-2 h-[185px] max-w-[calc(100vw-4rem)] sm:h-[230px] sm:max-w-[38rem] lg:h-[250px]"
                  deferMs={2500}
                  label="Fewer barriers. More follow-through."
                  lines={["Fewer barriers.", "More follow-through."]}
                  live={false}
                  scale="hero"
                  variant="ice"
                />
              </h2>
              <div className="sound-energy-divider mt-5 h-1.5 w-32 rounded-full bg-gradient-to-r from-amber-200 via-cyan-300 to-sky-500 shadow-[0_0_22px_rgba(125,211,252,0.34)]" />
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

            <div className="sound-divider-row grid gap-4 sm:grid-cols-3">
              {realLifeBenefits.map((benefit, index) => {
                const Icon3D = benefit.Icon3D;

                return (
                  <article
                    key={benefit.title}
                    className="group relative min-h-[220px] overflow-hidden rounded-2xl border border-sky-400/18 bg-[linear-gradient(180deg,rgba(15,35,60,0.86),rgba(2,7,19,0.72))] p-0 shadow-[0_24px_70px_rgba(0,0,0,0.28)] transition hover:-translate-y-1 hover:border-cyan-200/45 hover:bg-sky-500/10"
                  >
                    <div className="pointer-events-none absolute right-3 top-3 z-20 h-14 w-[4.75rem] opacity-65 transition duration-300 group-hover:opacity-95">
                      <DashboardStepNumber3D
                        active
                        className="h-full w-full drop-shadow-[0_0_20px_rgba(34,211,238,0.24)]"
                        number={`0${index + 1}`}
                        paused
                      />
                    </div>
                    <div className="relative h-24 overflow-hidden border-b border-cyan-200/14">
                      <Image
                        src={benefit.photoSrc}
                        alt={benefit.photoAlt}
                        fill
                        sizes="(min-width: 1024px) 28vw, (min-width: 640px) 33vw, calc(100vw - 40px)"
                        className="object-cover opacity-72 saturate-125"
                        style={{ objectPosition: benefit.photoPosition }}
                      />
                      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(2,7,19,0.82),rgba(8,47,73,0.25)_48%,rgba(2,7,19,0.72)),radial-gradient(circle_at_78%_20%,rgba(34,211,238,0.22),transparent_36%)]" />
                      <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-[#06111f] to-transparent" />
                    </div>
                    <div className="relative p-5 pt-4">
                      <div className="dashboard-webgl-snapshot-host relative h-14 w-14 overflow-visible">
                        <div
                          aria-hidden="true"
                          className="absolute inset-1 rounded-full bg-cyan-300/10 blur-xl transition group-hover:bg-cyan-200/20"
                        />
                        <Icon3D
                          active
                          paused
                          className="relative z-10 h-full w-full drop-shadow-[0_0_18px_rgba(125,211,252,0.34)] transition duration-300 group-hover:scale-110 group-hover:drop-shadow-[0_0_26px_rgba(125,211,252,0.58)]"
                        />
                      </div>
                      <div className="sound-energy-divider mt-3 h-1.5 w-20 rounded-full bg-gradient-to-r from-amber-200 via-cyan-300 to-sky-500 shadow-[0_0_18px_rgba(125,211,252,0.34)]" />
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
