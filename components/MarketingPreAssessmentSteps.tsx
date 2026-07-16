"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { type ComponentType, type CSSProperties, useEffect, useRef, useState } from "react";
import MarketingEnergyLine3D from "@/components/MarketingEnergyLine3D";
import DashboardStepNumber3D from "@/components/dashboard/DashboardStepNumber3D";
import {
  DashboardClipboardIcon3D,
  DashboardHomeIcon3D,
} from "@/components/dashboard/DashboardRealLifeIcons3D";
import { DashboardProgressRowIcon3D } from "@/components/dashboard/DashboardFeatureRowIcons3D";
import { ROUTES } from "@/lib/routes";

type WebGlIconComponent = ComponentType<{
  active?: boolean;
  className?: string;
  paused?: boolean;
}>;

type AssessmentStep = {
  Icon3D: WebGlIconComponent;
  image: string;
  imagePosition: string;
  label: string;
  text: string;
  video: string;
};

const assessmentSteps: AssessmentStep[] = [
  {
    Icon3D: DashboardClipboardIcon3D,
    image:
      "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?q=80&w=800",
    imagePosition: "center",
    label: "Form",
    text: "Fill out the in-home pre-assessment form.",
    video: "https://assets.mixkit.co/videos/39857/39857-360.mp4",
  },
  {
    Icon3D: DashboardProgressRowIcon3D,
    image:
      "https://images.unsplash.com/photo-1506784983877-45594efa4cbe?q=80&w=800",
    imagePosition: "center",
    label: "Review",
    text: "We review your goals, pain points, equipment, space, and schedule.",
    video:
      "https://assets.mixkit.co/active_storage/video_items/100540/1725384803/100540-video-360.mp4",
  },
  {
    Icon3D: DashboardHomeIcon3D,
    image:
      "https://images.unsplash.com/photo-1518611012118-696072aa579a?q=80&w=800",
    imagePosition: "center 35%",
    label: "Visit Plan",
    text: "You get a better first-session recommendation before we come to you.",
    video: "https://assets.mixkit.co/videos/4908/4908-360.mp4",
  },
];

export default function MarketingPreAssessmentSteps() {
  const [activeIndex, setActiveIndex] = useState(0);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const cardRefs = useRef<Array<HTMLDivElement | null>>([]);
  const videoRefs = useRef<Array<HTMLVideoElement | null>>([]);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mediaQuery.matches) return;

    const interval = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % assessmentSteps.length);
    }, 5600);

    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    const track = trackRef.current;
    const card = cardRefs.current[activeIndex];
    if (!track || !card) return;

    const trackRect = track.getBoundingClientRect();
    const cardRect = card.getBoundingClientRect();
    const targetLeft =
      track.scrollLeft +
      cardRect.left -
      trackRect.left -
      (trackRect.width - cardRect.width) / 2;

    track.scrollTo({
      behavior: "smooth",
      left: Math.max(0, targetLeft),
    });
  }, [activeIndex]);

  useEffect(() => {
    videoRefs.current.forEach((video, index) => {
      if (!video) return;

      video.muted = true;
      video.loop = true;

      if (index === activeIndex) {
        void video.play().catch(() => undefined);
      } else {
        video.pause();
        video.currentTime = 0;
      }
    });
  }, [activeIndex]);

  return (
    <div
      aria-label="Pre-assessment steps"
      className="pre-assessment-step-grid home-preassessment-scroll mt-4 flex min-w-0 snap-x snap-mandatory gap-4 overflow-x-auto pb-3"
      ref={trackRef}
    >
      {assessmentSteps.map((step, index) => {
        const Icon3D = step.Icon3D;
        const isActive = index === activeIndex;

        return (
          <div
            data-pre-assessment-active={isActive ? "true" : undefined}
            key={step.label}
            className={[
              "home-preassessment-step-card group relative min-w-[min(26rem,86vw)] max-w-[26rem] shrink-0 snap-center overflow-hidden rounded-xl border border-sky-300/18 bg-[linear-gradient(145deg,rgba(15,23,42,0.74),rgba(2,6,23,0.82)_48%,rgba(8,47,73,0.46))] shadow-[0_22px_58px_rgba(0,0,0,0.26),inset_0_1px_0_rgba(255,255,255,0.07)] transition sm:min-w-[23.5rem] lg:min-w-[25rem]",
              isActive
                ? "home-preassessment-step-card--active border-cyan-200/65 shadow-[0_26px_80px_rgba(14,165,233,0.18),0_18px_60px_rgba(0,0,0,0.34),inset_0_0_0_1px_rgba(254,240,138,0.28)]"
                : "hover:-translate-y-1 hover:border-sky-300/45 hover:bg-sky-500/10 hover:shadow-[0_26px_72px_rgba(14,165,233,0.12),0_18px_50px_rgba(0,0,0,0.28)]",
            ].join(" ")}
            onFocus={() => setActiveIndex(index)}
            ref={(node) => {
              cardRefs.current[index] = node;
            }}
          >
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_78%,rgba(34,211,238,0.14),transparent_34%),linear-gradient(115deg,transparent_0%,rgba(255,255,255,0.05)_43%,transparent_66%)] opacity-80 transition group-hover:opacity-100" />
            <div
              className="relative h-32 overflow-hidden bg-cover sm:h-36"
              style={
                {
                  "--home-preassessment-image": `url(${step.image})`,
                  backgroundImage: `linear-gradient(180deg,rgba(2,7,19,0.1),rgba(2,7,19,0.78)),url(${step.image})`,
                  backgroundPosition: step.imagePosition,
                } as CSSProperties
              }
            >
              <video
                aria-hidden="true"
                className="home-preassessment-step-card__video absolute inset-0 h-full w-full object-cover opacity-0 transition duration-500"
                loop
                muted
                playsInline
                preload="metadata"
                ref={(node) => {
                  videoRefs.current[index] = node;
                }}
                src={step.video}
              />
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(2,7,19,0.05),rgba(2,7,19,0.76)),radial-gradient(circle_at_18%_8%,rgba(254,240,138,0.12),transparent_38%)]" />
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-sky-200/70 to-transparent" />
              {isActive && (
                <div className="absolute bottom-3 left-4 rounded-full border border-amber-100/35 bg-slate-950/62 px-3 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-amber-100 shadow-[0_0_18px_rgba(250,204,21,0.18)] backdrop-blur">
                  Playing preview
                </div>
              )}
            </div>

            <div className="relative p-4 sm:p-5">
              <div className="mb-4 grid min-w-0 grid-cols-[3.75rem_minmax(0,1fr)] gap-3">
                <div className="relative h-14 w-14 overflow-visible rounded-xl bg-sky-950/30 shadow-[0_0_28px_rgba(34,211,238,0.16)]">
                  <Icon3D
                    active
                    className="pre-assessment-step-icon-3d h-14 w-14 shrink-0 drop-shadow-[0_0_22px_rgba(125,211,252,0.32)]"
                  />
                </div>
                <div className="min-w-0">
                  <div className="flex w-full min-w-0 items-center gap-2.5">
                    <span className="relative h-14 w-[5.2rem] shrink-0 overflow-visible">
                      <DashboardStepNumber3D
                        active
                        className="absolute inset-0 h-full w-full drop-shadow-[0_0_20px_rgba(34,211,238,0.38)]"
                        number={`0${index + 1}`}
                      />
                    </span>
                    <span className="relative h-10 min-w-[7rem] flex-1 overflow-visible">
                      <MarketingEnergyLine3D
                        active
                        className="absolute inset-0 h-full w-full"
                        lineKey={`pre-assessment-${index + 1}`}
                      />
                    </span>
                  </div>
                  <div className="-mt-1 text-[0.92rem] font-black uppercase leading-none tracking-[0.15em] text-white drop-shadow-[0_0_12px_rgba(125,211,252,0.22)]">
                    {step.label}
                  </div>
                </div>
              </div>
              <p className="text-[0.94rem] font-bold leading-6 text-slate-100 sm:text-base">
                {step.text}
              </p>
              {index === 0 && (
                <Link
                  href={ROUTES.onboarding.assessment}
                  className="home-hologram-button home-hologram-button--primary home-preassessment-card-cta mt-4 text-center"
                >
                  Fill Out Pre-Assessment Form
                  <ArrowRight
                    aria-hidden="true"
                    className="h-3.5 w-3.5"
                    strokeWidth={2.6}
                  />
                </Link>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
