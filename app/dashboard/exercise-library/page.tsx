"use client";

import Link from "next/link";
import TrainingJourneyNavigator from "@/components/dashboard/TrainingJourneyNavigator";
import { ROUTES } from "@/lib/routes";
import ExerciseLibraryPage from "../workout-builder/exercise-library/page";

const librarySwitcher = [
  { emoji: "🏋", label: "Exercise", href: ROUTES.dashboard.exerciseLibrary },
  { emoji: "🥗", label: "Nutrition", href: ROUTES.nutrition.home },
  { emoji: "🩹", label: "Recovery", href: ROUTES.dashboard.recovery },
  { emoji: "⚡", label: "Performance", href: ROUTES.dashboard.performance },
  { emoji: "🧘", label: "Mobility", href: ROUTES.dashboard.mobility },
] as const;

export default function CanonicalExerciseLibraryPage() {
  return (
    <>
      <section className="bg-[#020617] px-3 pt-5 text-white sm:px-5 lg:px-8">
        <div className="mx-auto w-full max-w-[1440px] space-y-4">
          <TrainingJourneyNavigator currentStep="library" variant="full" />
          <div className="flex gap-2 overflow-x-auto rounded-[28px] border border-white/10 bg-slate-950/58 p-3 shadow-[0_0_44px_rgba(34,211,238,0.08)] backdrop-blur-xl">
            {librarySwitcher.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className={`shrink-0 rounded-2xl border px-4 py-3 text-xs font-black uppercase tracking-[0.12em] transition ${
                  item.label === "Exercise"
                    ? "border-cyan-300/40 bg-cyan-300/12 text-cyan-100 shadow-[0_0_24px_rgba(34,211,238,0.16)]"
                    : "border-white/10 bg-white/[0.045] text-slate-300 hover:border-cyan-300/30 hover:text-white"
                }`}
              >
                {item.emoji} {item.label}
              </Link>
            ))}
          </div>
        </div>
      </section>
      <ExerciseLibraryPage />
    </>
  );
}
