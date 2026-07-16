"use client";

import { type CSSProperties, useCallback, useEffect, useRef, useState } from "react";
import DashboardDumbbell3D from "@/components/dashboard/DashboardDumbbell3D";
import DashboardLightningBolt3D from "@/components/dashboard/DashboardLightningBolt3D";
import DashboardPhone3D from "@/components/dashboard/DashboardPhone3D";
import DashboardStepNumber3D from "@/components/dashboard/DashboardStepNumber3D";

type HeroJourneyStep = {
  demoLabel: string;
  demoRows: string[];
  demoTitle: string;
  demoVideoSrc: string;
  number: string;
  object: "bolt" | "dumbbell" | "phone";
  text: string;
  title: string;
};

const heroJourneySteps: HeroJourneyStep[] = [
  {
    demoLabel: "Session flow",
    demoRows: [
      "Strength work matched to your space.",
      "Assisted stretch built into the session.",
      "Technique and pace adjusted in real time.",
    ],
    demoTitle: "Coach-led training",
    demoVideoSrc:
      "https://assets.mixkit.co/active_storage/video_items/100540/1725384803/100540-video-360.mp4",
    number: "01",
    object: "dumbbell",
    text: "Train strength, mobility, and recovery in the space you already have.",
    title: "Train",
  },
  {
    demoLabel: "Results view",
    demoRows: [
      "Log sets, mobility, soreness, and wins.",
      "Compare progress by phase and habit streak.",
      "See what changed since your last visit.",
    ],
    demoTitle: "Progress tracking",
    demoVideoSrc: "https://assets.mixkit.co/videos/4908/4908-360.mp4",
    number: "02",
    object: "phone",
    text: "Track strength, mobility, habits, and recovery so results stay visible.",
    title: "Track results",
  },
  {
    demoLabel: "Momentum loop",
    demoRows: [
      "Next steps stay clear between sessions.",
      "Coach guidance keeps the work consistent.",
      "Earn points, gems, and tokens for follow-through.",
    ],
    demoTitle: "Guidance and rewards",
    demoVideoSrc: "https://assets.mixkit.co/videos/39857/39857-360.mp4",
    number: "03",
    object: "bolt",
    text: "Get steady guidance and rewards that make consistency easier to keep.",
    title: "Guidance & rewards",
  },
];

const CENTER_TOLERANCE_PX = 34;
export default function MarketingJourneyOrbit() {
  const orbitRef = useRef<HTMLDivElement | null>(null);
  const cardRefs = useRef<Array<HTMLDivElement | null>>([]);
  const videoRefs = useRef<Array<HTMLVideoElement | null>>([]);
  const armedIndexRef = useRef<number | null>(null);
  const [armedIndex, setArmedIndex] = useState<number | null>(null);
  const [pinnedIndex, setPinnedIndex] = useState<number | null>(null);

  const clearPin = useCallback(() => {
    armedIndexRef.current = null;
    setArmedIndex(null);
    setPinnedIndex(null);
  }, []);

  const armCard = useCallback((index: number) => {
    armedIndexRef.current = index;
    setArmedIndex(index);
    setPinnedIndex(null);
  }, []);

  const armCardAtPoint = useCallback(
    (clientX: number, clientY: number) => {
      let nextIndex: number | null = null;
      let nextScore = Number.POSITIVE_INFINITY;

      cardRefs.current.forEach((card, index) => {
        if (!card) return;

        const rect = card.getBoundingClientRect();
        const isNearCard =
          clientX >= rect.left - 16 &&
          clientX <= rect.right + 16 &&
          clientY >= rect.top - 16 &&
          clientY <= rect.bottom + 16;

        if (!isNearCard) return;

        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const score = Math.abs(centerX - clientX) + Math.abs(centerY - clientY);

        if (score < nextScore) {
          nextIndex = index;
          nextScore = score;
        }
      });

      if (nextIndex !== null && armedIndexRef.current !== nextIndex) {
        armCard(nextIndex);
      }
    },
    [armCard],
  );

  const resumeCardVideos = useCallback(() => {
    videoRefs.current.forEach((video) => {
      if (!video || !video.paused) return;

      video.muted = true;
      video.loop = true;
      void video.play().catch(() => undefined);
    });
  }, []);

  useEffect(() => {
    const videos = videoRefs.current.filter(Boolean) as HTMLVideoElement[];
    const handlePause = () => resumeCardVideos();
    const intervalId = window.setInterval(resumeCardVideos, 2200);

    videos.forEach((video) => {
      video.addEventListener("ended", handlePause);
      video.addEventListener("pause", handlePause);
    });
    document.addEventListener("visibilitychange", resumeCardVideos);
    resumeCardVideos();

    return () => {
      window.clearInterval(intervalId);
      videos.forEach((video) => {
        video.removeEventListener("ended", handlePause);
        video.removeEventListener("pause", handlePause);
      });
      document.removeEventListener("visibilitychange", resumeCardVideos);
    };
  }, [resumeCardVideos]);

  useEffect(() => {
    let frameId = 0;

    const checkCenter = () => {
      const requestedIndex = armedIndexRef.current;
      const orbit = orbitRef.current;
      const card =
        requestedIndex === null ? null : cardRefs.current[requestedIndex];

      if (orbit && card && pinnedIndex === null) {
        const orbitRect = orbit.getBoundingClientRect();
        const cardRect = card.getBoundingClientRect();
        const orbitCenter = orbitRect.left + orbitRect.width / 2;
        const cardCenter = cardRect.left + cardRect.width / 2;
        const demo = card.querySelector(".home-journey-demo");
        const demoStyle = demo ? getComputedStyle(demo) : null;
        const demoIsVisible =
          !!demoStyle &&
          parseFloat(demoStyle.opacity) > 0.72 &&
          parseFloat(demoStyle.maxHeight) > 60;

        const isCentered =
          Math.abs(cardCenter - orbitCenter) <= CENTER_TOLERANCE_PX &&
          demoIsVisible;

        if (isCentered) {
          setPinnedIndex(requestedIndex);
        }
      }

      frameId = window.requestAnimationFrame(checkCenter);
    };

    frameId = window.requestAnimationFrame(checkCenter);

    return () => window.cancelAnimationFrame(frameId);
  }, [pinnedIndex]);

  return (
    <div
      className={[
        "home-journey-orbit relative mt-9",
        pinnedIndex !== null ? "home-journey-orbit--pinned" : "",
      ].join(" ")}
      onPointerMove={(event) => armCardAtPoint(event.clientX, event.clientY)}
      onPointerLeave={clearPin}
      ref={orbitRef}
    >
      {heroJourneySteps.map((step, index) => (
        <div
          data-home-journey-armed={armedIndex === index ? "true" : undefined}
          data-home-journey-pinned={pinnedIndex === index ? "true" : undefined}
          key={step.title}
          className={`home-journey-orbit-card home-journey-orbit-card--${step.object} group relative min-h-[190px] overflow-hidden rounded-xl border border-sky-400/18 bg-[linear-gradient(135deg,rgba(8,22,39,0.92),rgba(3,9,22,0.94))] p-4 shadow-[0_18px_50px_rgba(0,0,0,0.22)] transition hover:border-sky-300/45 hover:bg-[linear-gradient(135deg,rgba(10,35,58,0.94),rgba(4,13,30,0.96))]`}
          onPointerEnter={() => armCard(index)}
          ref={(node) => {
            cardRefs.current[index] = node;
          }}
          style={
            {
              "--home-journey-orbit-delay": `${(index - heroJourneySteps.length) * 14}s`,
            } as CSSProperties
          }
        >
          <video
            autoPlay
            className="home-journey-card-video"
            loop
            muted
            playsInline
            preload="metadata"
            ref={(node) => {
              videoRefs.current[index] = node;
            }}
            src={step.demoVideoSrc}
          />
          <div className="home-journey-card-video-shade" />
          <div className="pointer-events-none absolute -right-9 -top-8 z-[4] h-36 w-36 opacity-35 mix-blend-screen blur-[0.1px] transition duration-500 group-hover:scale-105 group-hover:opacity-48">
            {step.object === "phone" ? (
              <DashboardPhone3D
                active
                className="h-full w-full rotate-[-8deg]"
                paused
              />
            ) : step.object === "dumbbell" ? (
              <DashboardDumbbell3D
                active
                className="h-full w-full rotate-[14deg]"
                paused
              />
            ) : (
              <DashboardLightningBolt3D
                active
                className="h-full w-full rotate-[-12deg]"
                paused
              />
            )}
          </div>
          <div className="pointer-events-none absolute inset-0 z-[1] bg-[radial-gradient(circle_at_82%_8%,rgba(125,211,252,0.16),transparent_35%),linear-gradient(180deg,transparent_0%,rgba(2,7,19,0.18)_38%,rgba(2,7,19,0.62)_100%)]" />
          <div className="pointer-events-none absolute inset-x-0 top-0 z-[5] h-px bg-gradient-to-r from-sky-400 via-amber-200 to-transparent opacity-70" />
          <div className="pointer-events-none absolute bottom-0 left-0 z-[5] h-px w-full bg-gradient-to-r from-transparent via-sky-300/20 to-transparent" />
          <div
            aria-hidden="true"
            className="home-journey-step-progress relative z-[3]"
          >
            <svg
              className="home-journey-step-progress__ring"
              focusable="false"
              viewBox="0 0 100 100"
            >
              <circle
                className="home-journey-step-progress__track"
                cx="50"
                cy="50"
                pathLength="1"
                r="43"
              />
              <circle
                className="home-journey-step-progress__bar"
                cx="50"
                cy="50"
                pathLength="1"
                r="43"
              />
            </svg>
            <DashboardStepNumber3D
              active
              className="home-journey-step-progress__number h-12 w-[4.05rem] drop-shadow-[0_0_18px_rgba(34,211,238,0.3)]"
              number={step.number}
              paused
            />
          </div>
          <div className="home-journey-card-copy relative z-[3] mt-12">
            <div className="text-sm font-black uppercase tracking-[0.12em] text-white">
              {step.title}
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-300">{step.text}</p>
          </div>
          <div aria-hidden="true" className="home-journey-demo">
            <div className="home-journey-demo__screen">
              <div className="home-journey-demo__topline">
                <span>{step.demoLabel}</span>
                <span className="home-journey-demo__live">Playing</span>
              </div>
              <div className="home-journey-demo__headline">
                {step.demoTitle}
              </div>
              <div className="home-journey-demo__rows">
                {step.demoRows.map((row, rowIndex) => (
                  <div
                    className="home-journey-demo__row"
                    key={row}
                    style={
                      {
                        "--home-journey-row-index": rowIndex,
                      } as CSSProperties
                    }
                  >
                    <span className="home-journey-demo__row-dot" />
                    <span>{row}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
