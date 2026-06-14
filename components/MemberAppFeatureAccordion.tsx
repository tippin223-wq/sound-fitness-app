import { DashboardEmerald3D } from "@/components/dashboard/DashboardTornadoEmeralds3D";
import { DashboardGearIcon3D } from "@/components/dashboard/DashboardProfileActionIcons3D";
import DashboardLightningBolt3D from "@/components/dashboard/DashboardLightningBolt3D";
import DashboardMeterMenuIcon3D from "@/components/dashboard/DashboardMeterMenuIcon3D";
import {
  BarChart3,
  CalendarDays,
  ChevronDown,
  ClipboardList,
  Dumbbell,
  FileCheck2,
  Gem,
  HeartPulse,
  Library,
  MessageCircle,
  NotebookPen,
  Target,
  Trophy,
  type LucideIcon,
  Utensils,
  Video,
  WalletCards,
} from "lucide-react";

type PreviewModule = {
  eyebrow: string;
  title: string;
  text: string;
  Icon: LucideIcon;
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

export default function MemberAppFeatureAccordion() {
  return (
    <div className="mt-5 grid items-start gap-3 md:grid-cols-3">
      {featureColumns.map((column) => {
        return (
          <details
            key={column.label}
            className="member-feature-panel relative min-w-0 overflow-hidden rounded-lg border border-sky-300/14 bg-[linear-gradient(180deg,rgba(11,25,43,0.7),rgba(2,7,19,0.34))] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
            data-member-feature-panel={column.label.toLowerCase()}
            name="member-feature-panels"
            open={column.label === "Plan"}
          >
            <summary className="relative flex cursor-pointer select-none items-center gap-3 border-b border-sky-300/10 px-3 pb-3 pt-4 transition hover:bg-sky-300/5 focus:outline-none focus-visible:bg-sky-300/8 focus-visible:ring-2 focus-visible:ring-cyan-200/45">
              <span
                aria-hidden="true"
                className={`pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${column.columnAccentClass}`}
              />
              <span className="flex h-12 w-14 shrink-0 items-center justify-center">
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
    </div>
  );
}
