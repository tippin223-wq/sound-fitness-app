"use client";

import {
  DashboardCheckinsRowIcon3D,
  DashboardGoalsRowIcon3D,
  DashboardLibraryRowIcon3D,
  DashboardMessagingRowIcon3D,
  DashboardNutritionRowIcon3D,
  DashboardPlanRowIcon3D,
  DashboardProfileRowIcon3D,
  DashboardProgressRowIcon3D,
  DashboardRecoveryRowIcon3D,
  DashboardRewardsRowIcon3D,
  DashboardSessionsRowIcon3D,
  DashboardStrengthRowIcon3D,
  DashboardTechniqueRowIcon3D,
  DashboardWinsRowIcon3D,
} from "@/components/dashboard/DashboardFeatureRowIcons3D";
import { DashboardGearIcon3D } from "@/components/dashboard/DashboardProfileActionIcons3D";
import DashboardMeterMenuIcon3D from "@/components/dashboard/DashboardMeterMenuIcon3D";
import { ChevronDown } from "lucide-react";
import { useEffect, useState, type ComponentType } from "react";

type FeatureRowIconComponent = ComponentType<{
  active?: boolean;
  className?: string;
  paused?: boolean;
}>;

type PreviewModule = {
  eyebrow: string;
  title: string;
  text: string;
  RowIcon: FeatureRowIconComponent;
};

type PreviewFeatureColumn = {
  label: string;
  detail: string;
  columnAccentClass: string;
  visual: "plan" | "support" | "rewards";
  modules: PreviewModule[];
};

const previewModules: PreviewModule[] = [
  {
    eyebrow: "Plan",
    title: "Training Plan",
    text: "Workouts, phases, session notes, coach priorities, and next steps stay organized between visits.",
    RowIcon: DashboardPlanRowIcon3D,
  },
  {
    eyebrow: "Progress",
    title: "Metrics Snapshot",
    text: "Readiness, recent wins, soreness, strength work, mobility, and consistency trends stay visible.",
    RowIcon: DashboardProgressRowIcon3D,
  },
  {
    eyebrow: "Coach",
    title: "Messaging",
    text: "Members can ask questions, send updates, and keep coach decisions tied to the real training week.",
    RowIcon: DashboardMessagingRowIcon3D,
  },
  {
    eyebrow: "Recovery",
    title: "Next Best Action",
    text: "Mobility, hydration, sleep, readiness, and session feedback point members toward the next move.",
    RowIcon: DashboardRecoveryRowIcon3D,
  },
  {
    eyebrow: "Library",
    title: "Exercise Library",
    text: "Movement demos, substitutions, warm-ups, and pain-aware options help members train with clarity.",
    RowIcon: DashboardLibraryRowIcon3D,
  },
  {
    eyebrow: "Technique",
    title: "Video + Form Checks",
    text: "Technique support can be tied to Gems, form review requests, and coach feedback loops.",
    RowIcon: DashboardTechniqueRowIcon3D,
  },
  {
    eyebrow: "Nutrition",
    title: "Meals + Hydration",
    text: "Nutrition habits, hydration, meal ideas, grocery planning, and recovery inputs can live beside training.",
    RowIcon: DashboardNutritionRowIcon3D,
  },
  {
    eyebrow: "Sessions",
    title: "Calendar + Notes",
    text: "Upcoming sessions, workout history, booking context, and coach notes stay easy to find.",
    RowIcon: DashboardSessionsRowIcon3D,
  },
  {
    eyebrow: "Check-ins",
    title: "Body Context",
    text: "Sleep, soreness, energy, pain notes, wins, and movement context help the plan adapt.",
    RowIcon: DashboardCheckinsRowIcon3D,
  },
  {
    eyebrow: "Goals",
    title: "Milestones",
    text: "Goals, streaks, achievements, habits, and training milestones give progress more shape.",
    RowIcon: DashboardGoalsRowIcon3D,
  },
  {
    eyebrow: "Rewards",
    title: "Sparks + Gems + Tokens",
    text: "Sound Sparks, Gems, and Treasure Tokens give members a rewards layer for action and support.",
    RowIcon: DashboardRewardsRowIcon3D,
  },
  {
    eyebrow: "Profile",
    title: "Member Hub",
    text: "Profile details, preferences, equipment, limitations, and support style create a better coaching picture.",
    RowIcon: DashboardProfileRowIcon3D,
  },
  {
    eyebrow: "Training",
    title: "Strength Work",
    text: "Workout structure, technique cues, exercise progressions, equipment, and strength targets stay connected.",
    RowIcon: DashboardStrengthRowIcon3D,
  },
  {
    eyebrow: "Wins",
    title: "Achievements",
    text: "Badges, consistency wins, streaks, and completion moments help members see follow-through.",
    RowIcon: DashboardWinsRowIcon3D,
  },
];

const featureColumns: PreviewFeatureColumn[] = [
  {
    label: "Plan",
    detail: "Workouts",
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

const FEATURE_ROTATION_MS = 7000;

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
        className="h-16 w-16 drop-shadow-[0_0_20px_rgba(56,189,248,0.4)]"
      />
    );
  }

  if (visual === "support") {
    return (
      <DashboardGearIcon3D
        active
        className="h-16 w-16 drop-shadow-[0_0_20px_rgba(103,232,249,0.42)]"
        spinSpeed={0.08}
      />
    );
  }

  return (
    <DashboardRewardsRowIcon3D
      active
      className="h-16 w-16 drop-shadow-[0_0_22px_rgba(52,211,153,0.42)]"
    />
  );
}

export default function MemberAppFeatureAccordion() {
  const [activeColumnIndex, setActiveColumnIndex] = useState(0);
  const [rotationCycle, setRotationCycle] = useState(0);
  const [rotationProgress, setRotationProgress] = useState(0);

  useEffect(() => {
    const startedAt = Date.now();

    const tick = () => {
      const now = Date.now();
      const elapsed = now - startedAt;

      if (elapsed >= FEATURE_ROTATION_MS) {
        setActiveColumnIndex((currentIndex) =>
          (currentIndex + 1) % featureColumns.length,
        );
        setRotationProgress(0);
        return;
      }

      setRotationProgress(elapsed / FEATURE_ROTATION_MS);
    };

    tick();
    const intervalId = window.setInterval(tick, 80);

    return () => window.clearInterval(intervalId);
  }, [activeColumnIndex, rotationCycle]);

  const selectColumn = (index: number) => {
    setActiveColumnIndex(index);
    setRotationCycle((currentCycle) => currentCycle + 1);
    setRotationProgress(0);
  };

  return (
    <div className="mt-5 grid items-start gap-3 md:grid-cols-3">
      {featureColumns.map((column, index) => {
        const isActive = activeColumnIndex === index;
        const timerDashOffset = isActive ? 1 - rotationProgress : 1;

        return (
          <details
            key={column.label}
            className="member-feature-panel relative min-w-0 overflow-hidden rounded-lg border border-sky-300/14 bg-[linear-gradient(180deg,rgba(11,25,43,0.7),rgba(2,7,19,0.34))] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
            data-member-feature-active={isActive ? "true" : "false"}
            data-member-feature-panel={column.label.toLowerCase()}
            name="member-feature-panels"
            open={isActive}
          >
            <summary
              aria-controls={`member-feature-panel-${column.label.toLowerCase()}`}
              aria-expanded={isActive}
              className="relative flex cursor-pointer select-none items-center gap-3 border-b border-sky-300/10 px-3 pb-3 pt-4 pr-9 transition hover:bg-sky-300/5 focus:outline-none focus-visible:bg-sky-300/8 focus-visible:ring-2 focus-visible:ring-cyan-200/45"
              onClick={(event) => {
                event.preventDefault();
                selectColumn(index);
              }}
            >
              <span
                aria-hidden="true"
                className={`pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${column.columnAccentClass}`}
              />
              <span
                aria-hidden="true"
                className="member-feature-panel__timer"
              >
                <svg
                  className="member-feature-panel__timer-ring"
                  focusable="false"
                  viewBox="0 0 32 32"
                >
                  <circle
                    className="member-feature-panel__timer-track"
                    cx="16"
                    cy="16"
                    pathLength="1"
                    r="12"
                  />
                  <circle
                    className="member-feature-panel__timer-bar"
                    cx="16"
                    cy="16"
                    pathLength="1"
                    r="12"
                    style={{
                      strokeDashoffset: timerDashOffset,
                    }}
                  />
                </svg>
              </span>
              <span className="flex h-16 w-16 shrink-0 items-center justify-center">
                <FeatureColumnWebGlIcon visual={column.visual} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[11px] font-black uppercase tracking-[0.14em] text-white">
                  {column.label}
                </span>
                <span className="mt-1 block truncate text-[9px] font-black uppercase tracking-[0.12em] text-slate-400">
                  {column.detail}
                </span>
              </span>
              <ChevronDown
                aria-hidden="true"
                className="member-feature-panel__chevron h-4 w-4 shrink-0 text-cyan-100/80 transition-transform duration-200"
                strokeWidth={2.5}
              />
            </summary>
            <div className="pointer-events-none absolute -right-9 -top-9 h-24 w-24 rounded-full border border-sky-200/10 bg-cyan-200/5" />
            <div
              className="member-feature-panel__body grid gap-0 px-3 pb-2"
              id={`member-feature-panel-${column.label.toLowerCase()}`}
            >
              {column.modules.map((module) => {
                const RowIcon = module.RowIcon;

                return (
                  <article
                    key={module.title}
                    className="group relative border-t border-sky-300/10 py-2.5 transition first:border-t-0"
                  >
                    <div className="flex items-start gap-3">
                      <span className="-ml-1 mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center">
                        <RowIcon
                          active
                          className="h-9 w-9 drop-shadow-[0_0_14px_rgba(103,232,249,0.42)]"
                        />
                      </span>
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
    </div>
  );
}
