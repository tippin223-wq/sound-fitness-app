const pillCss = `
  @keyframes sound-header-app-pill-urgent {
    0%,
    100% {
      border-color: rgba(56, 189, 248, 0.76);
      box-shadow:
        0 0.12rem 0 rgba(2, 24, 43, 0.98),
        0 0.24rem 0 rgba(7, 89, 133, 0.72),
        0 0.46rem 0.82rem rgba(0, 0, 0, 0.46),
        0 0 0.86rem rgba(14, 165, 233, 0.34),
        inset 0 0.08rem 0 rgba(255, 255, 255, 0.52),
        inset 0 -0.16rem 0 rgba(2, 132, 199, 0.76);
    }

    46% {
      border-color: rgba(125, 211, 252, 0.98);
      box-shadow:
        0 0.12rem 0 rgba(2, 24, 43, 1),
        0 0.24rem 0 rgba(14, 116, 144, 0.88),
        0 0.5rem 0.92rem rgba(0, 0, 0, 0.46),
        0 0 1.35rem rgba(14, 165, 233, 0.62),
        0 0 2.1rem rgba(59, 130, 246, 0.26),
        inset 0 0.08rem 0 rgba(255, 255, 255, 0.6),
        inset 0 -0.16rem 0 rgba(14, 165, 233, 0.88);
    }
  }

  @keyframes sound-header-app-pill-scan {
    0%,
    58%,
    100% {
      opacity: 0;
      transform: translateX(-130%);
    }

    70% {
      opacity: 0.5;
    }

    88% {
      opacity: 0.14;
      transform: translateX(130%);
    }
  }

  @keyframes sound-header-app-pill-dot {
    0%,
    100% {
      transform: scale(0.92);
      box-shadow:
        0 0 0 1px rgba(186, 230, 253, 0.58),
        0 0 0.34rem rgba(56, 189, 248, 0.58);
    }

    48% {
      transform: scale(1.08);
      box-shadow:
        0 0 0 1px rgba(240, 249, 255, 0.82),
        0 0 0.56rem rgba(56, 189, 248, 0.92),
        0 0 1rem rgba(14, 165, 233, 0.46);
    }
  }

  .sound-header-app-pill {
    animation: sound-header-app-pill-urgent 3.8s ease-in-out infinite !important;
    background:
      radial-gradient(circle at 15% 44%, rgba(125, 211, 252, 0.44), transparent 23%),
      linear-gradient(180deg, rgba(186, 230, 253, 0.28), rgba(14, 165, 233, 0.18) 38%, rgba(2, 6, 23, 0.62) 100%),
      linear-gradient(90deg, rgba(5, 32, 54, 1), rgba(3, 105, 161, 0.86) 50%, rgba(7, 47, 73, 0.98)) !important;
    border: 1px solid rgba(56, 189, 248, 0.8) !important;
    border-radius: 999px !important;
    clip-path: inset(0 round 999px);
    color: rgba(240, 249, 255, 0.98) !important;
    contain: paint;
    display: inline-flex;
    align-items: center;
    gap: 0.34rem;
    isolation: isolate;
    overflow: hidden;
    position: relative;
    text-shadow:
      0 1px 0 rgba(2, 6, 23, 0.9),
      0 0 0.36rem rgba(125, 211, 252, 0.7);
    transform: perspective(8rem) rotateX(9deg) translateY(-0.24rem) translateZ(0);
    transform-origin: center;
  }

  .sound-header-app-pill::before {
    animation: sound-header-app-pill-scan 4.6s ease-in-out infinite;
    background: linear-gradient(
      105deg,
      transparent 0 28%,
      rgba(255, 255, 255, 0.36) 48%,
      rgba(125, 211, 252, 0.22) 56%,
      transparent 72% 100%
    );
    border-radius: inherit;
    content: "";
    inset: 1px;
    pointer-events: none;
    position: absolute;
    z-index: 0;
  }

  .sound-header-app-pill::after {
    background:
      linear-gradient(90deg, transparent, rgba(125, 211, 252, 0.48), rgba(14, 165, 233, 0.7), transparent),
      linear-gradient(90deg, rgba(2, 24, 43, 0), rgba(2, 24, 43, 0.78), rgba(2, 24, 43, 0));
    border-radius: 999px;
    bottom: 1px;
    content: "";
    height: 2px;
    left: 0.46rem;
    opacity: 0.95;
    pointer-events: none;
    position: absolute;
    right: 0.46rem;
    z-index: 0;
  }

  .sound-header-app-pill__pulse {
    animation: sound-header-app-pill-dot 1.35s ease-in-out infinite;
    background: radial-gradient(circle, rgba(240, 249, 255, 0.98) 0 22%, rgba(125, 211, 252, 0.98) 25% 58%, rgba(14, 165, 233, 0.36) 62% 100%);
    border-radius: 999px;
    flex: 0 0 auto;
    height: 0.36rem;
    position: relative;
    width: 0.36rem;
    z-index: 1;
  }

  .sound-header-app-pill__text {
    position: relative;
    z-index: 1;
  }

  @media (prefers-reduced-motion: reduce) {
    .sound-header-app-pill,
    .sound-header-app-pill::before,
    .sound-header-app-pill__pulse {
      animation: none !important;
    }
  }
`;

export default function SoundHeaderAppPill() {
  return (
    <>
      <style>{pillCss}</style>
      <span className="sound-header-app-pill mt-0 rounded-full px-2.5 py-0.5 text-[8px] font-black uppercase leading-none tracking-[0.14em]">
        <span aria-hidden="true" className="sound-header-app-pill__pulse" />
        <span className="sound-header-app-pill__text">
          In-home training + app
        </span>
      </span>
    </>
  );
}
