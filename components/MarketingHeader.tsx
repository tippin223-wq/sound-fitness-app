import { ROUTES } from "@/lib/routes";
import MarketingCtaButton3D from "@/components/MarketingCtaButton3D";
import MarketingHeaderLogo3D from "@/components/MarketingHeaderLogo3D";
import SoundHeaderAppPill from "@/components/SoundHeaderAppPill";
import WebGlRenderModeToggle from "@/components/WebGlRenderModeToggle";
import { ArrowRight, LogIn, Smartphone, Sparkles } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

const rainbowWordartTopLetters = "START FREE".split("");
const rainbowWordartBottomLetters = "INTRO".split("");

export default function MarketingHeader() {
  return (
    <>
      <style>{`
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
          34%,
          53%,
          100% {
            border-color: rgba(224, 242, 254, 0.35);
            box-shadow:
              0 10px 22px rgba(15, 23, 42, 0.32),
              0 0 24px rgba(37, 99, 235, 0.16),
              inset 0 1px 0 rgba(255, 255, 255, 0.28);
          }
          40% {
            border-color: rgba(186, 230, 253, 0.66);
            box-shadow:
              0 12px 28px rgba(14, 165, 233, 0.24),
              0 0 34px rgba(125, 211, 252, 0.24),
              0 0 44px rgba(255, 255, 255, 0.1),
              inset 0 1px 0 rgba(255, 255, 255, 0.46);
          }
          47% {
            border-color: rgba(254, 240, 138, 0.58);
            box-shadow:
              0 10px 24px rgba(15, 23, 42, 0.3),
              0 0 24px rgba(250, 204, 21, 0.12),
              0 0 34px rgba(125, 211, 252, 0.16),
              inset 0 1px 0 rgba(255, 255, 255, 0.36);
          }
        }

        @keyframes sound-rainbow-button-wash {
          0%,
          36%,
          53%,
          100% {
            opacity: 0;
            transform: scale(0.9);
          }
          40% {
            opacity: 0.38;
            transform: scale(1);
          }
          47% {
            opacity: 0.12;
            transform: scale(1.05);
          }
        }

        .sound-rainbow-cta {
          --sound-rainbow-cycle: 6.4s;
          animation: sound-rainbow-button-finale var(--sound-rainbow-cycle) ease-in-out infinite;
          background:
            radial-gradient(circle at 20% 18%, rgba(255, 255, 255, 0.22), transparent 28%),
            radial-gradient(circle at 50% 32%, rgba(125, 211, 252, 0.2), transparent 42%),
            linear-gradient(120deg, rgba(15, 23, 42, 0.98) 0%, rgba(37, 99, 235, 0.9) 42%, rgba(14, 165, 233, 0.84) 52%, rgba(37, 99, 235, 0.9) 62%, rgba(15, 23, 42, 0.98) 100%);
          background-size: 100% 100%;
          box-shadow:
            0 10px 22px rgba(15, 23, 42, 0.32),
            0 0 24px rgba(37, 99, 235, 0.16),
            inset 0 1px 0 rgba(255, 255, 255, 0.28);
          isolation: isolate;
          will-change: border-color, box-shadow;
        }

        .sound-rainbow-cta::before {
          content: none !important;
          display: none !important;
        }

        .sound-rainbow-cta::after {
          animation: sound-rainbow-button-wash var(--sound-rainbow-cycle) ease-in-out infinite;
          background:
            radial-gradient(ellipse at 50% 50%, rgba(255, 255, 255, 0.28), transparent 45%),
            radial-gradient(ellipse at 50% 50%, rgba(125, 211, 252, 0.18), transparent 64%);
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

        .sound-site-header-grid {
          display: grid;
          grid-template-columns: minmax(15.5rem, max-content) minmax(0, 1fr);
          align-items: start;
          column-gap: clamp(1rem, 3.4vw, 3.25rem);
          row-gap: 0.7rem;
        }

        .sound-site-header-brand {
          isolation: isolate;
          justify-self: start;
          overflow: visible;
          position: relative;
          z-index: 2;
        }

        .sound-site-header-brand > img {
          position: relative;
          transition:
            filter 260ms ease,
            height 260ms ease,
            transform 260ms ease,
            width 260ms ease;
          z-index: 30;
        }

        .sound-site-header-wordmark-stack {
          isolation: isolate;
          overflow: visible;
          position: relative;
          z-index: 10;
        }

        .sound-site-header-wordmark-stack .sound-header-app-pill {
          position: relative;
          z-index: 25;
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
          grid-template-areas: "primary signin";
          align-items: end;
          justify-content: stretch;
          justify-items: stretch;
          gap: 0.45rem 0.75rem;
          min-width: 0;
          position: relative;
          width: 100%;
          z-index: 20;
        }

        .sound-site-header-primary-actions {
          grid-area: primary;
          align-items: center;
          justify-content: center;
          justify-self: center;
        }

        .sound-site-header-signin {
          align-self: end;
          grid-area: signin;
          justify-self: end;
        }

        @media (max-width: 1040px) and (min-width: 760px) {
          .sound-site-header-grid {
            grid-template-columns: minmax(14.5rem, max-content) minmax(0, 1fr);
            column-gap: clamp(0.65rem, 2vw, 1.75rem);
          }

          .sound-site-header-actions {
            grid-template-columns: minmax(0, 1fr) max-content;
            grid-template-areas: "primary signin";
            align-content: end;
            align-items: end;
            justify-items: stretch;
          }

          .sound-site-header-signin {
            align-self: end;
            margin-top: 0;
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
              "signin";
            justify-items: center;
          }

          .sound-site-header-primary-actions {
            width: min(100%, 32rem);
            justify-content: center;
          }

          .sound-site-header-signin {
            justify-self: end;
            margin-right: clamp(0rem, 4vw, 1.25rem);
          }
        }

        @media (max-width: 759px) and (min-width: 480px) {
          .sound-site-header-actions {
            align-items: end;
            gap: 0.35rem 0;
            grid-template-columns: 1fr;
            grid-template-areas:
              "primary"
              "signin";
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

          .sound-site-header-signin {
            align-self: end;
            justify-self: end;
            margin-right: 0;
          }
        }

        @media (max-width: 759px) and (min-width: 560px) {
          .sound-site-header-actions {
            grid-template-areas: "primary";
            min-height: 44px;
            position: relative;
          }

          .sound-site-header-brand:has(.marketing-header-logo-3d--at-top) ~ .sound-site-header-actions {
            min-height: 52px;
          }

          .sound-site-header-primary-actions {
            justify-self: center;
          }

          .sound-site-header-signin {
            bottom: 0;
            position: absolute;
            right: 0;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .sound-rainbow-cta,
          .sound-rainbow-cta::after,
          .sound-rainbow-cta__glyph,
          .sound-rainbow-cta__arrow,
          .sound-rainbow-wordart__letter,
          .sound-app-cta__label::after {
            animation: none;
          }
        }
      `}</style>

      <header className="sound-marketing-header sticky top-0 z-[80] border-b border-white/10 bg-[#020713]/78 shadow-[0_18px_50px_rgba(0,0,0,0.28)] backdrop-blur-xl">
        <div className="sound-site-header-grid relative mx-auto flex w-full flex-col gap-3 px-5 py-2.5 sm:min-h-[8rem] sm:px-8 min-[860px]:grid min-[860px]:!min-h-[6.5rem] min-[860px]:grid-cols-[minmax(0,max-content)_minmax(0,1fr)] min-[860px]:items-start min-[860px]:justify-between min-[860px]:gap-x-4">
          <Link
            href={ROUTES.public.home}
            className="sound-site-header-brand group flex w-fit max-w-full min-w-0 items-center justify-center gap-2.5 self-center text-center sm:self-start sm:justify-start sm:text-left min-[860px]:justify-self-start"
          >
            <Image
              src="/sound-fitness-logo.png"
              alt="Sound Fitness"
              width={56}
              height={56}
              className="relative z-30 h-12 w-12 shrink-0 object-contain transition duration-300 group-hover:scale-105 sm:h-14 sm:w-14"
            />

            <div className="sound-site-header-wordmark-stack min-w-0">
              <MarketingHeaderLogo3D className="w-[8.9rem] max-w-[calc(100vw-7rem)] sm:w-[9.55rem]" />
              <SoundHeaderAppPill />
            </div>
          </Link>

          <div className="sound-site-header-actions flex w-full min-w-0 flex-col items-end gap-2 min-[560px]:grid min-[560px]:grid-cols-[minmax(0,1fr)_auto] min-[560px]:items-end min-[560px]:gap-x-3 min-[560px]:gap-y-0 min-[860px]:justify-self-end min-[860px]:pt-1">
            <div className="sound-site-header-primary-actions z-10 flex w-full min-w-0 flex-row justify-center gap-1.5 min-[560px]:justify-center min-[560px]:pr-0">
              <Link
                href={`${ROUTES.public.memberDashboardPreview}#top`}
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
                      id="marketing-sound-rainbow-wordart-arc-top"
                    />
                    <path
                      d="M34 33 C 45 28, 67 28, 78 33"
                      id="marketing-sound-rainbow-wordart-arc-bottom"
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
                      href="#marketing-sound-rainbow-wordart-arc-top"
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
                      href="#marketing-sound-rainbow-wordart-arc-bottom"
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
                          style={{
                            animationDelay: `${(index + rainbowWordartTopLetters.length) * 0.08}s`,
                          }}
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

            <Link
              href={ROUTES.auth.login}
              className="sound-site-header-signin group inline-flex min-h-[32px] w-fit items-center justify-center gap-2 self-end whitespace-nowrap px-1 py-1 text-[9px] font-black uppercase tracking-[0.13em] text-slate-200 transition duration-200 hover:-translate-y-0.5 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300/60 min-[560px]:self-end min-[560px]:justify-self-end"
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
            <WebGlRenderModeToggle className="self-end min-[560px]:col-start-2 min-[560px]:row-start-2 min-[560px]:justify-self-end" />
          </div>
        </div>
      </header>
    </>
  );
}
